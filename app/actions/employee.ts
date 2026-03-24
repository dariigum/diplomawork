'use server'

import dbConnect from '@/lib/db/mongoose';
import mongoose from 'mongoose';
import { Response, Resume, SavedVacancy, User, Vacancy } from '@/lib/db/schema';
import { clearSession, getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import fs from 'fs';
import path from 'path';

async function saveFile(file: File) {
  if (!file || file.size === 0) return null;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
  const uploadPath = path.join(process.cwd(), 'public/uploads/resumes', fileName);
  await fs.promises.writeFile(uploadPath, buffer);
  return `/uploads/resumes/${fileName}`;
}

export async function createResumeAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYEE') throw new Error('Unauthorized');

  const title = formData.get('title') as string;
  const skills = formData.get('skills') as string;
  const experience = formData.get('experience') as string;
  const education = formData.get('education') as string;
  const cvLink = formData.get('cvLink') as string;
  const cvFile = formData.get('cvFile') as File | null;
  const phone = formData.get('phone') as string;
  const telegram = formData.get('telegram') as string;
  const linkedin = formData.get('linkedin') as string;
  const github = formData.get('github') as string;

  if (!title || !skills) throw new Error('Missing required fields');

  let cvFilePath = null;
  if (cvFile) {
    cvFilePath = await saveFile(cvFile);
  }

  await dbConnect();
  await Resume.create({
    userId: session.user.id,
    title,
    skills,
    experience: experience || '',
    education: education || '',
    cvLink: cvLink || '',
    cvFile: cvFilePath || '',
    phone: phone || '',
    telegram: telegram || '',
    linkedin: linkedin || '',
    github: github || '',
  });

  revalidatePath('/dashboard/employee');
  redirect('/dashboard/employee');
}

export async function updateResumeAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYEE') throw new Error('Unauthorized');

  const id = formData.get('id') as string;
  const title = formData.get('title') as string;
  const skills = formData.get('skills') as string;
  const experience = formData.get('experience') as string;
  const education = formData.get('education') as string;
  const cvLink = formData.get('cvLink') as string;
  const cvFile = formData.get('cvFile') as File | null;
  const phone = formData.get('phone') as string;
  const telegram = formData.get('telegram') as string;
  const linkedin = formData.get('linkedin') as string;
  const github = formData.get('github') as string;

  if (!id || !title || !skills) throw new Error('Missing required fields');

  let cvFilePath = null;
  if (cvFile && cvFile.size > 0) {
    cvFilePath = await saveFile(cvFile);
  }

  await dbConnect();
  const updateData: any = { 
    title, 
    skills, 
    experience: experience || '', 
    education: education || '', 
    cvLink: cvLink || '', 
    phone: phone || '', 
    telegram: telegram || '', 
    linkedin: linkedin || '', 
    github: github || '' 
  };
  
  if (cvFilePath) {
    updateData.cvFile = cvFilePath;
  }

  await Resume.findOneAndUpdate(
    { _id: id, userId: session.user.id },
    updateData
  );

  revalidatePath('/dashboard/employee');
  redirect('/dashboard/employee');
}

export async function deleteResumeAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYEE') throw new Error('Unauthorized');

  const id = formData.get('id') as string;
  if (!id) throw new Error('Missing resume id');

  await dbConnect();
  await Resume.findOneAndDelete({ _id: id, userId: session.user.id });

  revalidatePath('/dashboard/employee');
}

export async function deleteEmployeeAccountAction() {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYEE') throw new Error('Unauthorized');

  await dbConnect();
  await Response.deleteMany({ userId: session.user.id });
  await SavedVacancy.deleteMany({ userId: session.user.id });
  await Resume.deleteMany({ userId: session.user.id });
  await User.findByIdAndDelete(session.user.id);

  await clearSession();
  redirect('/signup');
}

export async function getEmployeeResumesAction() {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYEE') return [];

  await dbConnect();
  const resumes = await Resume.find({ userId: session.user.id }).sort({ createdAt: -1 }).lean();

  return resumes.map((resume: any) => ({
    id: resume._id.toString(),
    title: resume.title,
    skills: resume.skills,
    createdAt: resume.createdAt instanceof Date ? resume.createdAt.toISOString() : new Date(resume.createdAt).toISOString(),
  }));
}

export async function submitVacancyResponseAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYEE') {
    return { error: 'Only employees can apply for vacancies.' };
  }

  const vacancyId = formData.get('vacancyId') as string;
  const mode = formData.get('mode') as 'existing' | 'custom';

  if (!vacancyId || !mongoose.Types.ObjectId.isValid(vacancyId)) {
    return { error: 'Vacancy not found.' };
  }

  await dbConnect();

  const vacancy = await Vacancy.findById(vacancyId).lean();
  if (!vacancy) {
    return { error: 'Vacancy not found.' };
  }

  const existingResponse = await Response.findOne({
    userId: session.user.id,
    vacancyId,
  }).lean();

  if (existingResponse) {
    return { error: 'You have already applied for this vacancy.' };
  }

  let resumeId: string | null = null;

  if (mode === 'existing') {
    const selectedResumeId = formData.get('resumeId') as string;

    if (!selectedResumeId || !mongoose.Types.ObjectId.isValid(selectedResumeId)) {
      return { error: 'Choose one of your resumes.' };
    }

    const resume = await Resume.findOne({
      _id: selectedResumeId,
      userId: session.user.id,
    }).lean();

    if (!resume) {
      return { error: 'Selected resume was not found.' };
    }

    resumeId = selectedResumeId;
  } else {
    const title = formData.get('title') as string;
    const skills = formData.get('skills') as string;
    const experience = formData.get('experience') as string;
    const education = formData.get('education') as string;
    const cvLink = formData.get('cvLink') as string;
    const cvFile = formData.get('cvFile') as File | null;
    const phone = formData.get('phone') as string;
    const telegram = formData.get('telegram') as string;
    const linkedin = formData.get('linkedin') as string;
    const github = formData.get('github') as string;

    if (!title || !skills) {
      return { error: 'Title and skills are required for a new resume.' };
    }

    let cvFilePath = '';
    if (cvFile && cvFile.size > 0) {
      const savedPath = await saveFile(cvFile);
      cvFilePath = savedPath || '';
    }

    const createdResume = await Resume.create({
      userId: session.user.id,
      title,
      skills,
      experience: experience || '',
      education: education || '',
      cvLink: cvLink || '',
      cvFile: cvFilePath,
      phone: phone || '',
      telegram: telegram || '',
      linkedin: linkedin || '',
      github: github || '',
    });

    resumeId = createdResume._id.toString();
  }

  await Response.create({
    userId: new mongoose.Types.ObjectId(session.user.id),
    vacancyId: new mongoose.Types.ObjectId(vacancyId),
    resumeId: new mongoose.Types.ObjectId(resumeId),
    status: 'PENDING',
  });

  revalidatePath('/dashboard/employee');
  revalidatePath(`/jobs/${vacancyId}`);

  return { success: true };
}
