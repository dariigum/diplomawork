import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import dbConnect from '@/lib/db/mongoose';
import { Vacancy, Response, User } from '@/lib/db/schema';

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');

    await dbConnect();

    const query: any = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Vacancy.countDocuments(query);
    const vacancies = await Vacancy.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('employerId', 'name email')
      .lean();

    // Fetch related counts
    const vacanciesWithStats = await Promise.all(
      vacancies.map(async (vacancy: any) => {
        const applicationsCount = await Response.countDocuments({ vacancyId: vacancy._id });
        return {
          ...vacancy,
          applicationsCount,
          employerName: vacancy.employerId?.name || 'Unknown',
          employerEmail: vacancy.employerId?.email || 'Unknown',
        };
      })
    );

    return NextResponse.json({
      vacancies: vacanciesWithStats,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching admin vacancies:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
