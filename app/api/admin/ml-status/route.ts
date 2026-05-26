import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mlUrl = process.env.ML_SERVICE_URL;
    let mlStatus = 'offline';
    let mlLatency = 0;
    let modelVersion = 'Unknown';

    if (mlUrl) {
      try {
        const start = Date.now();
        const res = await fetch(`${mlUrl}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        });

        if (res.ok) {
          mlStatus = 'online';
          mlLatency = Date.now() - start;
          const health = (await res.json()) as { model?: string };
          if (typeof health.model === 'string' && health.model.trim()) {
            modelVersion = health.model;
          }
        }
      } catch {
        mlStatus = 'offline';
      }
    }

    return NextResponse.json({
      status: mlStatus,
      latency: mlLatency,
      modelVersion,
      lastRetraining: null,
      queue: {
        embeddings: 0,
        recommendations: 0,
      },
      qdrant: {
        status: mlStatus === 'online' ? 'online' : 'unknown',
        collections: [],
      },
      kafka: {
        status: 'online',
        topics: [],
      },
    });
  } catch (error) {
    console.error('Error fetching ML status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
