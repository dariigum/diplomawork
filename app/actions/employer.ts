'use server'

import dbConnect from '@/lib/db/mongoose';
import { User, Vacancy } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createVacancyAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYER') throw new Error('Unauthorized');

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const skillsRequired = formData.get('skillsRequired') as string;
  const salaryMinStr = formData.get('salaryMin') as string;
  const salaryMaxStr = formData.get('salaryMax') as string;
  const employmentType = formData.get('employmentType') as string;
  const workMode = formData.get('workMode') as string;
  const country = formData.get('country') as string;
  const city = formData.get('city') as string;

  if (!title || !salaryMinStr || !salaryMaxStr) throw new Error('Missing fields');
  if (!['Full-time', 'Part-time', 'Internship'].includes(employmentType)) {
    throw new Error('Invalid employment type');
  }
  if (!['REMOTE', 'ONSITE'].includes(workMode)) {
    throw new Error('Invalid work mode');
  }
  if (workMode === 'ONSITE' && !city) {
    throw new Error('City is required for on-site vacancies');
  }

  const vacancyAddress = workMode === 'REMOTE' ? 'Remote' : city;

  await dbConnect();
  await Vacancy.create({
    employerId: session.user.id,
    title,
    description: description || '',
    skillsRequired: skillsRequired || '',
    salaryMin: parseInt(salaryMinStr, 10),
    salaryMax: parseInt(salaryMaxStr, 10),
    employmentType,
    workMode,
    country: country || '',
    city: city || '',
    address: vacancyAddress,
  });

  revalidatePath('/dashboard/employer');
  redirect('/dashboard/employer');
}

export async function updateEmployerProfileAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYER') throw new Error('Unauthorized');

  const companyName = formData.get('companyName') as string;
  const location = formData.get('location') as string;
  const website = formData.get('website') as string;
  const description = formData.get('description') as string;

  if (!companyName) throw new Error('Company name is required');

  await dbConnect();
  await User.findByIdAndUpdate(session.user.id, {
    name: companyName,
    location: location || '',
    website: website || '',
    description: description || '',
  });

  revalidatePath('/dashboard/employer');
  revalidatePath('/companies');
  revalidatePath(`/companies/${session.user.id}`);
}
