import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import dbConnect from '@/lib/db/mongoose';
import { User, Resume, Vacancy, Response } from '@/lib/db/schema';

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    await dbConnect();

    const query: any = {};
    if (role) {
      query.role = role;
    }
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-passwordHash')
      .lean();

    // Fetch related counts
    const usersWithStats = await Promise.all(
      users.map(async (user: any) => {
        let applicationsCount = 0;
        let vacanciesCount = 0;

        if (user.role === 'EMPLOYEE') {
          applicationsCount = await Response.countDocuments({ userId: user._id });
        } else if (user.role === 'EMPLOYER') {
          vacanciesCount = await Vacancy.countDocuments({ employerId: user._id });
        }

        return {
          ...user,
          applicationsCount,
          vacanciesCount
        };
      })
    );

    return NextResponse.json({
      users: usersWithStats,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
