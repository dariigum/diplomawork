'use server'

import mongoose from 'mongoose';
import dbConnect from '@/lib/db/mongoose';
import { Vacancy, SavedVacancy } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { formatSalaryRange } from '@/lib/format-salary';

export async function toggleSaveVacancyAction(vacancyId: string) {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYEE') return { error: 'Unauthorized' };
  if (!mongoose.Types.ObjectId.isValid(vacancyId)) return { error: 'Invalid vacancy' };

  await dbConnect();
  const objectVacancyId = new mongoose.Types.ObjectId(vacancyId);
  const existing = await SavedVacancy.findOne({ userId: session.user.id, vacancyId: objectVacancyId });
  let saved = false;

  if (existing) {
    await SavedVacancy.deleteOne({ _id: existing._id });
  } else {
    await SavedVacancy.create({
      userId: session.user.id,
      vacancyId: objectVacancyId
    });
    saved = true;
  }
  
  revalidatePath('/dashboard/employee');
  revalidatePath(`/jobs/${vacancyId}`);
  return { success: true, saved };
}

async function getEmbedding(text: string): Promise<number[]> {
  try {
    const res = await fetch(
      `http://localhost:8000/embed?text=${encodeURIComponent(text)}`,
      { cache: 'no-store' }
    )
    const data = await res.json()
    return data.embedding as number[]
  } catch {
    return []
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0)
  const na = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0))
  const nb = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0))
  if (na === 0 || nb === 0) return 0
  return dot / (na * nb)
}

export async function getHomeData(searchQuery?: string) {
  await dbConnect();

  const rawVacancies = await Vacancy.find({}).populate('employerId', 'name').lean();
  const session = await getSession();
  const viewerRole = session?.user?.role || null;
  
  let savedJobs: string[] = [];
  if (session && session.user.role === 'EMPLOYEE') {
    const saves = await SavedVacancy.find({ userId: session.user.id }).lean();
    savedJobs = saves.map(s => s.vacancyId.toString());
  }

  const jobs = (rawVacancies as any[]).map((v: any) => ({
    id: v._id.toString(),
    title: v.title,
    company: v.employerId?.name || "Unknown Company",
    companyLogo: v.employerId?.name?.slice(0, 2)?.toUpperCase() || "JC",
    location: v.workMode === 'REMOTE' ? 'Remote' : [v.city, v.country].filter(Boolean).join(', ') || v.address || "Remote",
    salary: formatSalaryRange(v.salaryMin, v.salaryMax, v.salaryCurrency),
    salaryMin: v.salaryMin ?? null,
    salaryMax: v.salaryMax ?? null,
    salaryCurrency: v.salaryCurrency || '',
    employmentType: v.employmentType || "Full-time",
    experience: v.experience || "Any experience",
    skills: v.skillsRequired ? v.skillsRequired.split(',').map((s: string) => s.trim()) : [],
    description: v.description || "No description provided.",
    postedAt: new Date(v.createdAt).toLocaleDateString(),
    isRemote: v.workMode === 'REMOTE',
    isFeatured: false,
    _embedding: (v as any).embedding || [],
  }));

  const filterOptions = {
    locations: [...new Set(jobs.map(j => j.location).filter(Boolean))].sort() as string[],
    employmentTypes: [...new Set(jobs.map(j => j.employmentType).filter(Boolean))].sort() as string[],
    experienceLevels: [...new Set(jobs.map(j => j.experience).filter(Boolean))].sort() as string[],
  };

  // Если есть поисковый запрос — семантическая сортировка через ML
  if (searchQuery && searchQuery.trim().length > 0) {
    const queryEmbedding = await getEmbedding(searchQuery)

    if (queryEmbedding.length > 0) {
      // Считаем similarity для каждой вакансии и фильтруем нерелевантные
      const scored = jobs
        .map(job => ({
          ...job,
          _score: cosineSimilarity(queryEmbedding, job._embedding)
        }))
        .filter(job => {
          console.log(job.title, job._score)
          return job._score > 0.2
        })
        .sort((a, b) => b._score - a._score)

      const result = scored.map(({ _embedding, _score, ...job }) => job)
      return { jobs: result, savedJobs, filterOptions, viewerRole }
    }

    // ML сервис недоступен — fallback на обычный поиск по тексту
    const q = searchQuery.toLowerCase()
    const fallback = jobs
      .filter(job =>
        job.title.toLowerCase().includes(q) ||
        job.skills.some((s: string) => s.toLowerCase().includes(q))
      )
      .map(({ _embedding, ...job }) => job)
    return { jobs: fallback, savedJobs, filterOptions, viewerRole }
  }

  const result = jobs.reverse().map(({ _embedding, ...job }) => job)
  return { jobs: result, savedJobs, filterOptions, viewerRole }
}

export async function getSavedVacanciesAction() {
  await dbConnect();
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYEE') return [];
  
  const saves = await SavedVacancy.find({ userId: session.user.id })
    .populate({
      path: 'vacancyId',
      populate: { path: 'employerId', select: 'name' }
    })
    .lean();

  return saves.map((s: any) => ({
    id: s.vacancyId._id.toString(),
    title: s.vacancyId.title,
    company: s.vacancyId.employerId?.name || "Unknown Company",
    salary: formatSalaryRange(
      s.vacancyId.salaryMin,
      s.vacancyId.salaryMax,
      s.vacancyId.salaryCurrency
    )
  }));
}
