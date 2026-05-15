import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import dbConnect from '@/lib/db/mongoose';
import { getSession } from '@/lib/auth';
import { verifyAttachmentAccess } from '@/lib/chat/attachment-signing';
import { assertUserCanAccessChat, verifyApplicationOwnsChat } from '@/lib/chat/chat-service';
import { Chat } from '@/lib/db/schema';

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export async function GET(req: NextRequest) {
  const k = req.nextUrl.searchParams.get('k');
  const e = req.nextUrl.searchParams.get('e');
  const s = req.nextUrl.searchParams.get('s');
  if (!k || !e || !s) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  let storageKey: string;
  try {
    storageKey = decodeURIComponent(k);
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  if (storageKey.includes('..') || !storageKey.includes('/')) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const exp = parseInt(e, 10);
  if (!verifyAttachmentAccess(storageKey, exp, s)) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 401 });
  }

  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const chatId = storageKey.split('/')[0];
  await dbConnect();
  const role = session.user.role === 'EMPLOYER' ? 'EMPLOYER' : 'EMPLOYEE';
  await assertUserCanAccessChat({ id: session.user.id, role }, chatId);
  const full = await Chat.findById(chatId).lean();
  if (!full || !(await verifyApplicationOwnsChat(full as any))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const root = path.join(process.cwd(), 'data', 'chat-uploads');
  const abs = path.join(root, ...storageKey.split('/'));
  if (!abs.startsWith(root)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  if (!fs.existsSync(abs)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const buf = await fs.promises.readFile(abs);
  const ext = path.extname(abs).toLowerCase();
  const contentType = MIME_BY_EXT[ext] || 'application/octet-stream';

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=120',
    },
  });
}
