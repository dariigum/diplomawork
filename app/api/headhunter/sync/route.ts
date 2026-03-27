import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { syncHeadHunterVacancies } from '@/lib/headhunter-sync';

export const runtime = 'nodejs';

function isSyncAuthorized(request: NextRequest, sessionRole?: string) {
  const syncSecret = process.env.HH_SYNC_SECRET;
  const requestSecret = request.headers.get('x-hh-sync-secret');

  if (syncSecret && requestSecret === syncSecret) {
    return true;
  }

  return sessionRole === 'ADMIN';
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!isSyncAuthorized(request, session?.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const result = await syncHeadHunterVacancies({
      text: typeof body.text === 'string' ? body.text : undefined,
      areaIds: Array.isArray(body.areaIds)
        ? body.areaIds.filter((value): value is string => typeof value === 'string')
        : typeof body.areaIds === 'string'
          ? [body.areaIds]
          : undefined,
      perPage:
        typeof body.perPage === 'number'
          ? body.perPage
          : typeof body.perPage === 'string'
            ? Number(body.perPage)
            : undefined,
      maxPages:
        typeof body.maxPages === 'number'
          ? body.maxPages
          : typeof body.maxPages === 'string'
            ? Number(body.maxPages)
            : undefined,
    });

    revalidatePath('/');
    revalidatePath('/companies');
    revalidatePath('/dashboard/employer');
    revalidatePath('/dashboard/admin');

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to sync HeadHunter vacancies',
      },
      { status: 500 }
    );
  }
}
