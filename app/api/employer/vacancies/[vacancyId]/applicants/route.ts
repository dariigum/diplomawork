import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongoose';
import { getSession } from '@/lib/auth';
import { applicantsForVacancy } from '@/lib/chat/chat-service';

export async function GET(_req: Request, ctx: { params: Promise<{ vacancyId: string }> }) {
  try {
    const session = await getSession();
    if (!session?.user?.id || session.user.role !== 'EMPLOYER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vacancyId } = await ctx.params;
    await dbConnect();
    const applicants = await applicantsForVacancy(session.user.id, vacancyId);
    return NextResponse.json({ applicants });
  } catch (e: any) {
    if (e?.message === 'Vacancy not found') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error('[applicants]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
