import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import dbConnect from '@/lib/db/mongoose';
import { User, Vacancy, Response, Chat, Resume, SavedVacancy } from '@/lib/db/schema';
import { getTopRecommendations } from '@/lib/recommendation';

async function measureGoogleLatencyMs(): Promise<number | null> {
  const startedAt = performance.now();

  try {
    const res = await fetch('https://www.google.com/generate_204', {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok && res.status !== 204) return null;
    return Math.round(performance.now() - startedAt);
  } catch {
    return null;
  }
}

async function measureRecommendationResponseTimeMs(): Promise<number | null> {
  const resume = await Resume.findOne({
    activeForAi: true,
    embedding: { $exists: true, $ne: [] },
  })
    .select('userId')
    .lean() as { userId?: { toString(): string } | string } | null;

  const userId = resume?.userId?.toString();
  if (!userId) return null;

  const startedAt = performance.now();

  try {
    await getTopRecommendations({ userId, limit: 1 });
    return Math.round(performance.now() - startedAt);
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const [
      totalUsers,
      totalEmployers,
      totalEmployees,
      totalVacancies,
      totalApplications,
      totalChats,
      savedVacanciesCount,
      totalEmbeddingsGenerated,
      googleLatencyMs,
      recommendationResponseTimeMs,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'EMPLOYER' }),
      User.countDocuments({ role: 'EMPLOYEE' }),
      Vacancy.countDocuments(),
      Response.countDocuments(),
      Chat.countDocuments(),
      SavedVacancy.countDocuments(),
      (async () => {
        const resumesWithEmbedding = await Resume.countDocuments({ embedding: { $exists: true, $not: {$size: 0} } });
        const vacanciesWithEmbedding = await Vacancy.countDocuments({ embedding: { $exists: true, $not: {$size: 0} } });
        return resumesWithEmbedding + vacanciesWithEmbedding;
      })(),
      measureGoogleLatencyMs(),
      measureRecommendationResponseTimeMs(),
    ]);

    // Calculate aggregations for charts
    // Group users by month
    const usersByMonth = await User.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const applicationsByMonth = await Response.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Map month numbers to names
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Create a 12-month timeline
    const chartData = Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const userMonth = usersByMonth.find((u: any) => u._id === monthNum);
      const appMonth = applicationsByMonth.find((a: any) => a._id === monthNum);
      return {
        name: monthNames[i],
        users: userMonth ? userMonth.count : 0,
        applications: appMonth ? appMonth.count : 0,
      };
    });

    return NextResponse.json(
      {
        system: {
          totalUsers,
          totalEmployers,
          totalEmployees,
          totalVacancies,
          totalApplications,
          savedVacanciesCount,
          totalChats,
        },
        ai: {
          totalEmbeddingsGenerated,
        },
        performance: {
          googleLatencyMs,
          recommendationResponseTimeMs,
        },
        chartData
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
