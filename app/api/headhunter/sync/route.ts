import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getLatestHeadHunterImportJobSnapshot,
  startHeadHunterSyncJob,
} from '@/lib/headhunter-sync-job';

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
    const response = await startHeadHunterSyncJob({
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

    return NextResponse.json(response, { status: response.alreadyRunning ? 200 : 202 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to sync HeadHunter vacancies',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!isSyncAuthorized(request, session?.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const job = await getLatestHeadHunterImportJobSnapshot();
    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to read HeadHunter sync status',
      },
      { status: 500 }
    );
  }
}
