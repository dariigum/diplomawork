'use server'

import mongoose from 'mongoose';
import dbConnect from '@/lib/db/mongoose';
import { Vacancy, SavedVacancy } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { recordVacancyBehaviourEvent } from '@/lib/vacancy-behaviour-events'
import { formatVacancySalary } from '@/lib/format-vacancy-salary'
import { normalizeVacancySkills } from '@/lib/normalize-vacancy-skills'

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
    await recordVacancyBehaviourEvent({
      userId: session.user.id,
      vacancyId,
      eventType: 'VACANCY_UNSAVED',
      source: 'toggle_save_vacancy',
    });
  } else {
    await SavedVacancy.create({
      userId: session.user.id,
      vacancyId: objectVacancyId
    });
    saved = true;
    await recordVacancyBehaviourEvent({
      userId: session.user.id,
      vacancyId,
      eventType: 'VACANCY_SAVED',
      source: 'toggle_save_vacancy',
    });
  }
  
  revalidatePath('/dashboard/employee');
  revalidatePath(`/jobs/${vacancyId}`);
  return { success: true, saved };
}

export async function getHomeData() {
  await dbConnect();
  // Populate the employerId to get the company name
  const rawVacancies = await Vacancy.find({}).populate('employerId', 'name').lean();
  const session = await getSession();
  const viewerRole = session?.user?.role || null;
  
  let savedJobs: string[] = [];
  if (session && session.user.role === 'EMPLOYEE') {
    const saves = await SavedVacancy.find({ userId: session.user.id }).lean();
    savedJobs = saves.map(s => s.vacancyId.toString());
  }

  const jobs = rawVacancies.map((v: any) => ({
    id: v._id.toString(),
    title: v.title,
    company: v.employerId?.name || "Unknown Company",
    companyLogo: v.employerId?.name?.slice(0, 2)?.toUpperCase() || "JC",
    location: v.workMode === 'REMOTE' ? 'Remote' : [v.city, v.country].filter(Boolean).join(', ') || v.address || "Remote",
    salary: formatVacancySalary(v.salaryMin, v.salaryMax),
    employmentType: v.employmentType || "Full-time",
    experience: v.experience || "Any experience",
    skills: normalizeVacancySkills(v.skillsRequired),
    description: v.description || "No description provided.",
    postedAt: new Date(v.createdAt).toLocaleDateString(),
    isRemote: v.workMode === 'REMOTE',
    isFeatured: false,
  }));

  // Compute dynamic filter options from actual vacancy data
  const filterOptions = {
    locations: [...new Set(jobs.map(j => j.location).filter(Boolean))].sort(),
    employmentTypes: [...new Set(jobs.map(j => j.employmentType).filter(Boolean))].sort(),
    experienceLevels: [...new Set(jobs.map(j => j.experience).filter(Boolean))].sort(),
  };

  return { jobs: jobs.reverse(), savedJobs, filterOptions, viewerRole }; // Show newest first
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
    salary: formatVacancySalary(s.vacancyId.salaryMin, s.vacancyId.salaryMax),
  }));
}
