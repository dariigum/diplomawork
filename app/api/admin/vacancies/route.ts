import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getSession } from '@/lib/auth';
import dbConnect from '@/lib/db/mongoose';
import { Vacancy, Response, User, SavedVacancy } from '@/lib/db/schema';

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

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    if (body.action !== 'cleanup') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await dbConnect();

    // Fetch only vacancies where salary is not specified (default 0 or null/missing)
    const vacancies = await Vacancy.find({
      $or: [
        { salaryMin: 0 },
        { salaryMin: null },
        { salaryMin: { $exists: false } }
      ]
    }).select('_id title description').lean();

    // Keywords logic: if neither title nor description has any of these words, it's considered an ad.
    // Includes: "ищем", "поиск", "вакансия", "требуется", "работа", "опыт", "стек", "резюме", "отклик",
    // "обязанности", "требования", "условия" and English equivalents.
    const jobKeywordsRegex = /ищ(у|ем|ут|ет)|поиск|ваканси|требу|работ|опыт|стек|резюме|отклик|обязанност|требован|услови|job|vacancy|hiring|looking|require|experience|stack|apply|responsibilit/i;

    const toDelete: mongoose.Types.ObjectId[] = [];

    for (const v of vacancies) {
      const titleMatch = jobKeywordsRegex.test(v.title || '');
      const descMatch = jobKeywordsRegex.test(v.description || '');

      if (!titleMatch && !descMatch) {
        toDelete.push(new mongoose.Types.ObjectId(String(v._id)));
      }
    }

    if (toDelete.length > 0) {
      // Perform cascade deletion to maintain database consistency
      await Promise.all([
        Response.deleteMany({ vacancyId: { $in: toDelete } }),
        SavedVacancy.deleteMany({ vacancyId: { $in: toDelete } }),
        Vacancy.deleteMany({ _id: { $in: toDelete } })
      ]);
    }

    return NextResponse.json({
      success: true,
      deletedCount: toDelete.length,
      message: `Successfully filtered vacancies. Deleted ${toDelete.length} advertisement listing(s).`
    });
  } catch (error) {
    console.error('Error cleaning up vacancies:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing vacancy ID' }, { status: 400 });
    }

    await dbConnect();

    // Perform cascade deletion to maintain database consistency
    await Promise.all([
      Response.deleteMany({ vacancyId: id }),
      SavedVacancy.deleteMany({ vacancyId: id }),
      Vacancy.deleteOne({ _id: id })
    ]);

    return NextResponse.json({
      success: true,
      message: 'Vacancy successfully deleted.'
    });
  } catch (error) {
    console.error('Error deleting vacancy:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
