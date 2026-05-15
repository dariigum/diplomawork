import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import dbConnect from '@/lib/db/mongoose';
import { User, Vacancy, Response, Chat, Resume, SavedVacancy } from '@/lib/db/schema';

export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Fetch actual counts
    const [
      totalUsers,
      totalEmployers,
      totalEmployees,
      totalVacancies,
      totalApplications,
      totalChats,
      savedVacanciesCount,
      totalEmbeddingsGenerated,
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
      })()
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

    return NextResponse.json({
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
        recommendationRequestsCount: 0, // Not tracked in DB
        averageMatchScore: 0, // Not tracked directly in DB
        recommendationSuccessRate: 0, // Not tracked
      },
      performance: {
        apiLatency: 0, 
        recommendationResponseTime: 0,
        cacheHitRate: 0,
        activeUsers: 0, 
        concurrentSessions: 0,
      },
      chartData
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
