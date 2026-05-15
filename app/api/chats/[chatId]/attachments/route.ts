import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dbConnect from '@/lib/db/mongoose';
import { getSession } from '@/lib/auth';
import { assertUserCanAccessChat, verifyApplicationOwnsChat } from '@/lib/chat/chat-service';
import { Chat } from '@/lib/db/schema';
import {
  assertAllowedUpload,
  safeBasename,
} from '@/lib/chat/attachment-validation';
import { createSlidingWindowRateLimiter } from '@/lib/chat/rate-limit';

const uploadLimiter = createSlidingWindowRateLimiter({ windowMs: 60_000, max: 25 });

export async function POST(req: Request, ctx: { params: Promise<{ chatId: string }> }) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!uploadLimiter(session.user.id)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { chatId } = await ctx.params;
    await dbConnect();
    const role = session.user.role === 'EMPLOYER' ? 'EMPLOYER' : 'EMPLOYEE';
    await assertUserCanAccessChat({ id: session.user.id, role }, chatId);
    const full = await Chat.findById(chatId).lean();
    if (!full || !(await verifyApplicationOwnsChat(full as any))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const { mime, ext } = assertAllowedUpload(file.type || 'application/octet-stream', buf);

    const baseDir = path.join(process.cwd(), 'data', 'chat-uploads', chatId);
    await fs.promises.mkdir(baseDir, { recursive: true });

    const fileName = `${crypto.randomUUID()}${ext}`;
    const relKey = `${chatId}/${fileName}`;
    const absPath = path.join(baseDir, fileName);
    await fs.promises.writeFile(absPath, buf);

    return NextResponse.json({
      storageKey: relKey,
      fileName: safeBasename(file.name),
      mimeType: mime,
      size: buf.length,
    });
  } catch (e: any) {
    const msg = e?.message || 'Error';
    if (msg.includes('Unsupported') || msg.includes('large')) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (msg === 'Forbidden' || msg === 'Chat not found' || msg === 'Invalid chat') {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    console.error('[chat attachment upload]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
