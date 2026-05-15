import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongoose';
import { getSession } from '@/lib/auth';
import { assertUserCanAccessChat, markChatRead, verifyApplicationOwnsChat } from '@/lib/chat/chat-service';
import { Chat } from '@/lib/db/schema';
import { createSlidingWindowRateLimiter } from '@/lib/chat/rate-limit';
import { publishChatRead } from '@/lib/socket/io-registry';

const readLimiter = createSlidingWindowRateLimiter({ windowMs: 60_000, max: 120 });

export async function POST(_req: Request, ctx: { params: Promise<{ chatId: string }> }) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!readLimiter(session.user.id)) {
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

    await markChatRead(chatId, session.user.id);
    publishChatRead(chatId, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || 'Error';
    if (msg === 'Forbidden' || msg === 'Chat not found' || msg === 'Invalid chat') {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    console.error('[read POST]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
