import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongoose';
import { getSession } from '@/lib/auth';
import { employerVacanciesWithApplicants, applicantsForVacancy } from '@/lib/chat/chat-service';

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id || session.user.role !== 'EMPLOYER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const vacancies = await employerVacanciesWithApplicants(session.user.id);
    return NextResponse.json({ vacancies });
  } catch (e) {
    console.error('[vacancies-summary]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
