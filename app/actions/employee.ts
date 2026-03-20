'use server'

import dbConnect from '@/lib/db/mongoose';
import { Resume } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createResumeAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYEE') throw new Error('Unauthorized');

  const title = formData.get('title') as string;
  const skills = formData.get('skills') as string;
  const experience = formData.get('experience') as string;
  const education = formData.get('education') as string;
  const cvLink = formData.get('cvLink') as string;
  const phone = formData.get('phone') as string;
  const telegram = formData.get('telegram') as string;
  const linkedin = formData.get('linkedin') as string;
  const github = formData.get('github') as string;

  if (!title || !skills) throw new Error('Missing required fields');

  await dbConnect();
  await Resume.create({
    userId: session.user.id,
    title,
    skills,
    experience: experience || '',
    education: education || '',
    cvLink: cvLink || '',
    phone: phone || '',
    telegram: telegram || '',
    linkedin: linkedin || '',
    github: github || '',
  });

  revalidatePath('/dashboard/employee');
  redirect('/dashboard/employee');
}
