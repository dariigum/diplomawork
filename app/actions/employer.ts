'use server'

import dbConnect from '@/lib/db/mongoose';
import { Vacancy } from '@/lib/db/schema';
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

  if (!title || !salaryMinStr || !salaryMaxStr) throw new Error('Missing fields');

  await dbConnect();
  await Vacancy.create({
    employerId: session.user.id,
    title,
    description: description || '',
    skillsRequired: skillsRequired || '',
    salaryMin: parseInt(salaryMinStr, 10),
    salaryMax: parseInt(salaryMaxStr, 10),
  });

  revalidatePath('/dashboard/employer');
  redirect('/dashboard/employer');
}
