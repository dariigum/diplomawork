import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to ping the ML service if URL is available
    const mlUrl = process.env.ML_SERVICE_URL;
    let mlStatus = 'offline';
    let mlLatency = 0;
    
    if (mlUrl) {
      try {
        const start = Date.now();
        // Assume the ML service has a /health or similar endpoint
        const res = await fetch(`${mlUrl}/health`, { 
          method: 'GET',
          signal: AbortSignal.timeout(3000) 
        });
        
        if (res.ok) {
          mlStatus = 'online';
          mlLatency = Date.now() - start;
        }
      } catch (e) {
        mlStatus = 'offline';
      }
    }

    return NextResponse.json({
      status: mlStatus,
      latency: mlLatency,
      modelVersion: mlStatus === 'online' ? 'JobBERT-v2.1' : 'Unknown', // Ideally fetched from ML service /info
      lastRetraining: null, // Not tracked yet
      queue: {
        embeddings: 0,
        recommendations: 0
      },
      qdrant: {
        status: mlStatus === 'online' ? 'online' : 'unknown',
        collections: [],
      },
      kafka: {
        status: 'online', // Assuming Kafka is running locally/separately
        topics: []
      }
    });

  } catch (error) {
    console.error('Error fetching ML status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
