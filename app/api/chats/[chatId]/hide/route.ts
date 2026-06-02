import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongoose';
import { getSession } from '@/lib/auth';
import { hideChatForEmployee } from '@/lib/chat/chat-service';

export async function POST(_req: Request, ctx: { params: Promise<{ chatId: string }> }) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Only employees can hide chats' }, { status: 403 });
    }

    const { chatId } = await ctx.params;
    await dbConnect();
    await hideChatForEmployee({ id: session.user.id, role: 'EMPLOYEE' }, chatId);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    if (msg === 'Chat not found' || msg === 'Invalid chat') {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    if (msg === 'Forbidden') {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    console.error('[chat hide POST]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
