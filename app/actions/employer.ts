'use server'

import mongoose from 'mongoose';
import dbConnect from '@/lib/db/mongoose';
import { User, Vacancy } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getEmbedding } from '@/lib/ml';
import { buildVacancyEmbeddingText } from '@/lib/embedding-text';

function parseVacancyFormData(formData: FormData) {
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

  const salaryMin = parseInt(salaryMinStr, 10);
  const salaryMax = parseInt(salaryMaxStr, 10);
  if (!Number.isFinite(salaryMin) || !Number.isFinite(salaryMax)) {
    throw new Error('Salary values must be valid numbers');
  }
  if (salaryMin < 0 || salaryMax < 0) {
    throw new Error('Salary values must be non-negative');
  }
  if (salaryMin > salaryMax) {
    throw new Error('Minimum salary cannot exceed maximum salary');
  }

  const vacancyAddress = workMode === 'REMOTE' ? 'Remote' : city;

  return {
    title,
    description: description || '',
    skillsRequired: skillsRequired || '',
    salaryMin,
    salaryMax,
    employmentType,
    workMode: workMode as 'REMOTE' | 'ONSITE',
    country: country || '',
    city: city || '',
    address: vacancyAddress,
  };
}

export async function createVacancyAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYER') throw new Error('Unauthorized');

  const parsed = parseVacancyFormData(formData);

  let embedding: number[] | undefined = undefined;
  try {
    const text = buildVacancyEmbeddingText({
      title: parsed.title,
      description: parsed.description,
      skillsRequired: parsed.skillsRequired,
      requirements: [],
      responsibilities: [],
    });
    embedding = await getEmbedding(text);
  } catch (e) {
    console.warn('[JobFlow] ML service unavailable, vacancy saved without embedding.', e);
  }

  await dbConnect();
  await Vacancy.create({
    employerId: session.user.id,
    ...parsed,
    ...(embedding ? { embedding } : {}),
  });

  revalidatePath('/dashboard/employer');
  revalidatePath('/');
  redirect('/dashboard/employer?tab=profile');
}

export async function updateVacancyAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYER') throw new Error('Unauthorized');

  const vacancyId = formData.get('vacancyId') as string;
  if (!vacancyId || !mongoose.Types.ObjectId.isValid(vacancyId)) {
    throw new Error('Invalid vacancy');
  }

  const parsed = parseVacancyFormData(formData);

  let embedding: number[] | undefined = undefined;
  try {
    const text = buildVacancyEmbeddingText({
      title: parsed.title,
      description: parsed.description,
      skillsRequired: parsed.skillsRequired,
      requirements: [],
      responsibilities: [],
    });
    embedding = await getEmbedding(text);
  } catch (e) {
    console.warn('[JobFlow] ML service unavailable, vacancy updated without embedding refresh.', e);
  }

  await dbConnect();
  const updated = await Vacancy.findOneAndUpdate(
    { _id: vacancyId, employerId: session.user.id },
    {
      $set: {
        ...parsed,
        ...(embedding ? { embedding } : {}),
      },
    },
    { new: true },
  );

  if (!updated) throw new Error('Vacancy not found');

  revalidatePath('/dashboard/employer');
  revalidatePath('/');
  revalidatePath(`/jobs/${vacancyId}`);
  redirect('/dashboard/employer?tab=profile');
}

export async function updateEmployerProfileAction(
  formData: FormData,
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYER') {
    return { success: false, error: 'Unauthorized' };
  }

  const companyName = formData.get('companyName') as string;
  const location = formData.get('location') as string;
  const website = formData.get('website') as string;
  const description = formData.get('description') as string;

  if (!companyName) {
    return { success: false, error: 'Company name is required' };
  }

  try {
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

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update profile' };
  }
}
