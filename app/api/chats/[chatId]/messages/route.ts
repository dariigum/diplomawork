import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongoose';
import { getSession } from '@/lib/auth';
import { getMessagesAfter, getMessagesBefore, sendMessageFromUser } from '@/lib/chat/chat-service';
import { createSlidingWindowRateLimiter } from '@/lib/chat/rate-limit';
import type { IAttachment } from '@/lib/db/schema';
import { publishNewMessage } from '@/lib/socket/io-registry';

const postLimiter = createSlidingWindowRateLimiter({ windowMs: 60_000, max: 45 });

export async function GET(req: Request, ctx: { params: Promise<{ chatId: string }> }) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await ctx.params;
    const url = new URL(req.url);
    const before = url.searchParams.get('before') || undefined;
    const after = url.searchParams.get('after') || undefined;
    const limit = Math.min(80, Math.max(1, parseInt(url.searchParams.get('limit') || '40', 10) || 40));

    await dbConnect();
    const role = session.user.role === 'EMPLOYER' ? 'EMPLOYER' : 'EMPLOYEE';
    const user = { id: session.user.id, role };

    if (after) {
      const { messages } = await getMessagesAfter(chatId, user, after, limit);
      return NextResponse.json({ messages, oldestId: null, hasMore: false });
    }

    const { messages, oldestId, hasMore } = await getMessagesBefore(chatId, user, before, limit);

    return NextResponse.json({ messages, oldestId, hasMore });
  } catch (e: any) {
    const msg = e?.message || 'Error';
    if (msg === 'Forbidden' || msg === 'Chat not found' || msg === 'Invalid chat') {
      return NextResponse.json({ error: msg }, { status: msg === 'Chat not found' ? 404 : 403 });
    }
    console.error('[messages GET]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ chatId: string }> }) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!postLimiter(session.user.id)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { chatId } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const text = typeof body.text === 'string' ? body.text : '';
    const attachments = Array.isArray(body.attachments) ? (body.attachments as IAttachment[]) : [];
    const clientTempId = typeof body.clientTempId === 'string' ? body.clientTempId : undefined;

    for (const a of attachments) {
      if (!a?.storageKey || typeof a.storageKey !== 'string' || a.storageKey.includes('..')) {
        return NextResponse.json({ error: 'Invalid attachment' }, { status: 400 });
      }
      if (!a.fileName || !a.mimeType || typeof a.size !== 'number') {
        return NextResponse.json({ error: 'Invalid attachment' }, { status: 400 });
      }
    }

    await dbConnect();
    const role = session.user.role === 'EMPLOYER' ? 'EMPLOYER' : 'EMPLOYEE';
    const { message, chatPatch, notifyReceiver } = await sendMessageFromUser({
      user: { id: session.user.id, role },
      chatId,
      text,
      attachments,
    });

    publishNewMessage(chatId, message, chatPatch, clientTempId, { notifyReceiver });

    return NextResponse.json({ message, clientTempId });
  } catch (e: any) {
    const msg = e?.message || 'Error';
    if (msg === 'Forbidden' || msg === 'Chat not found' || msg === 'Invalid chat') {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    if (msg === 'Empty message') {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error('[messages POST]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
