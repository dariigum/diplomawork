import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongoose';
import { getSession } from '@/lib/auth';
import { getChatDetailForUser } from '@/lib/chat/chat-service';

export async function GET(_req: Request, ctx: { params: Promise<{ chatId: string }> }) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await ctx.params;
    await dbConnect();
    const role = session.user.role === 'EMPLOYER' ? 'EMPLOYER' : 'EMPLOYEE';
    const detail = await getChatDetailForUser({ id: session.user.id, role }, chatId);
    return NextResponse.json(detail);
  } catch (e: any) {
    const msg = e?.message || 'Error';
    if (msg === 'Forbidden' || msg === 'Chat not found') {
      return NextResponse.json({ error: msg }, { status: msg === 'Chat not found' ? 404 : 403 });
    }
    console.error('[chat detail]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
