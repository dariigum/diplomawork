'use server'

import mongoose from 'mongoose';
import dbConnect from '@/lib/db/mongoose';
import { Vacancy, SavedVacancy } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function toggleSaveVacancyAction(vacancyId: string) {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYEE') return { error: 'Unauthorized' };

  await dbConnect();
  const existing = await SavedVacancy.findOne({ userId: session.user.id, vacancyId });

  if (existing) {
    await SavedVacancy.deleteOne({ _id: existing._id });
  } else {
    await SavedVacancy.create({
      userId: session.user.id,
      vacancyId: new mongoose.Types.ObjectId(vacancyId)
    });
  }
  
  revalidatePath('/dashboard/employee');
  return { success: true };
}

export async function getHomeData() {
  await dbConnect();
  // Populate the employerId to get the company name
  const rawVacancies = await Vacancy.find({}).populate('employerId', 'name').lean();
  const session = await getSession();
  
  let savedJobs: string[] = [];
  if (session && session.user.role === 'EMPLOYEE') {
    const saves = await SavedVacancy.find({ userId: session.user.id }).lean();
    savedJobs = saves.map(s => s.vacancyId.toString());
  }

  const jobs = rawVacancies.map((v: any) => ({
    id: v._id.toString(),
    title: v.title,
    company: v.employerId?.name || "Unknown Company",
    location: "Remote",
    salary: `$${v.salaryMin.toLocaleString()} - ${v.salaryMax.toLocaleString()}`,
    employmentType: "Full-time",
    experience: "Any experience",
    skills: v.skillsRequired ? v.skillsRequired.split(',').map((s: string) => s.trim()) : [],
    isRemote: true
  }));

  return { jobs: jobs.reverse(), savedJobs }; // Show newest first
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
    salary: `$${s.vacancyId.salaryMin.toLocaleString()} - $${s.vacancyId.salaryMax.toLocaleString()}`
  }));
}
