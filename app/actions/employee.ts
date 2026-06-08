'use server'

import dbConnect from '@/lib/db/mongoose';
import mongoose from 'mongoose';
import { Response, Resume, SavedVacancy, User, Vacancy, Chat, Message } from '@/lib/db/schema';
import { clearSession, getSession } from '@/lib/auth';
import { toObjectId } from '@/lib/db/object-id';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getEmbedding } from '@/lib/ml';
import { buildResumeEmbeddingText } from '@/lib/embedding-text';
import { ensureActiveResumeForUser } from '@/lib/active-resume';
import fs from 'fs';
import path from 'path';

function isUploadableFile(value: FormDataEntryValue | null): value is File {
  return (
    value != null &&
    typeof value === 'object' &&
    'arrayBuffer' in value &&
    typeof (value as File).arrayBuffer === 'function' &&
    (value as File).size > 0
  );
}

async function saveFile(file: File): Promise<string | null> {
  if (!isUploadableFile(file)) return null;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'resumes');
    const uploadPath = path.join(uploadDir, fileName);
    await fs.promises.mkdir(uploadDir, { recursive: true });
    await fs.promises.writeFile(uploadPath, buffer);
    return `/uploads/resumes/${fileName}`;
  } catch (error) {
    console.error('[JobFlow] Failed to save resume upload.', error);
    return null;
  }
}

export async function createResumeAction(
  formData: FormData,
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYEE') {
    return { success: false, error: 'Unauthorized' };
  }

  const title = (formData.get('title') as string)?.trim();
  const skills = (formData.get('skills') as string)?.trim();
  const experience = (formData.get('experience') as string)?.trim() ?? '';
  const education = (formData.get('education') as string)?.trim() ?? '';
  const cvLink = (formData.get('cvLink') as string)?.trim() ?? '';
  const cvFile = formData.get('cvFile');
  const phone = (formData.get('phone') as string)?.trim() ?? '';
  const telegram = (formData.get('telegram') as string)?.trim() ?? '';
  const linkedin = (formData.get('linkedin') as string)?.trim() ?? '';
  const github = (formData.get('github') as string)?.trim() ?? '';

  if (!title || !skills) {
    return { success: false, error: 'Missing required fields' };
  }

  try {
    let cvFilePath: string | null = null;
    if (isUploadableFile(cvFile)) {
      cvFilePath = await saveFile(cvFile);
      if (!cvFilePath) {
        return { success: false, error: 'Could not save uploaded CV file' };
      }
    }

    let embedding: number[] | undefined = undefined;
    try {
      const text = buildResumeEmbeddingText({ title, skills, experience, education });
      embedding = await getEmbedding(text);
    } catch (e) {
      console.warn('[JobFlow] ML service unavailable, resume saved without embedding.', e);
    }

    await dbConnect();
    const existingCount = await Resume.countDocuments({ userId: session.user.id });
    const activeForAi = existingCount === 0;

    await Resume.create({
      userId: toObjectId(session.user.id),
      title,
      skills,
      experience,
      education,
      activeForAi,
      ...(embedding ? { embedding } : {}),
      cvLink,
      cvFile: cvFilePath || '',
      phone,
      telegram,
      linkedin,
      github,
    });

    revalidatePath('/dashboard/employee');
    revalidatePath('/dashboard/employee/recommendations');
    return { success: true };
  } catch (error) {
    console.error('[JobFlow] createResumeAction failed.', error);
    return { success: false, error: 'Failed to create resume' };
  }
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

  try {
    const text = buildResumeEmbeddingText({ title, skills, experience, education });
    updateData.embedding = await getEmbedding(text);
  } catch (e) {
    console.warn('[JobFlow] ML service unavailable, resume updated without embedding refresh.', e);
  }

  if (cvFilePath) {
    updateData.cvFile = cvFilePath;
  }

  await Resume.findOneAndUpdate(
    { _id: id, userId: session.user.id },
    updateData
  );

  revalidatePath('/dashboard/employee');
  revalidatePath('/dashboard/employee/recommendations');
  redirect('/dashboard/employee');
}

export async function deleteResumeAction(
  formData: FormData,
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYEE') {
    return { success: false, error: 'Unauthorized' };
  }

  const id = formData.get('id') as string;
  if (!id) {
    return { success: false, error: 'Missing resume id' };
  }

  try {
    await dbConnect();
    const toDelete = await Resume.findOne({ _id: id, userId: session.user.id }).select('activeForAi').lean() as {
      activeForAi?: boolean
    } | null

    if (!toDelete) {
      return { success: false, error: 'Resume not found' };
    }

    await Resume.findOneAndDelete({ _id: id, userId: session.user.id });
    if (toDelete.activeForAi) {
      await ensureActiveResumeForUser(session.user.id);
    }

    revalidatePath('/dashboard/employee');
    revalidatePath('/dashboard/employee/recommendations');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete resume' };
  }
}

export async function deleteEmployeeAccountAction() {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYEE') throw new Error('Unauthorized');

  const userId = session.user.id;
  const userObjectId = new mongoose.Types.ObjectId(userId);

  await dbConnect();

  const resumes = await Resume.find({ userId }).lean();
  for (const r of resumes) {
    const cv = (r as { cvFile?: string }).cvFile;
    if (cv && cv.startsWith('/uploads/')) {
      try {
        const fp = path.join(process.cwd(), 'public', cv);
        await fs.promises.unlink(fp);
      } catch {
        /* ignore missing file */
      }
    }
  }

  const chats = await Chat.find({ employeeId: userObjectId }).select('_id').lean();
  const chatIds = chats.map((c) => c._id);
  if (chatIds.length > 0) {
    await Message.deleteMany({ chatId: { $in: chatIds } });
    for (const cid of chatIds) {
      const dir = path.join(process.cwd(), 'data', 'chat-uploads', cid.toString());
      try {
        await fs.promises.rm(dir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
    await Chat.deleteMany({ _id: { $in: chatIds } });
  }

  await Response.deleteMany({ userId: userId });
  await SavedVacancy.deleteMany({ userId: userId });
  await Resume.deleteMany({ userId: userId });
  await User.findByIdAndDelete(userId);

  await clearSession();
  redirect('/signup');
}

export async function updateEmployeeProfileAction(
  formData: FormData,
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYEE') {
    return { success: false, error: 'Unauthorized' };
  }

  const firstName = (formData.get('firstName') as string)?.trim();
  const lastName = (formData.get('lastName') as string)?.trim();
  const location = (formData.get('location') as string)?.trim();

  if (!firstName || !lastName) {
    return { success: false, error: 'First and last name are required' };
  }

  const name = `${firstName} ${lastName}`.trim();

  try {
    await dbConnect();
    await User.findByIdAndUpdate(session.user.id, {
      name,
      location: location || '',
    });

    revalidatePath('/dashboard/employee');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update profile' };
  }
}

export async function getEmployeeResumesAction() {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYEE') return [];

  await dbConnect();
  await ensureActiveResumeForUser(session.user.id);
  const resumes = await Resume.find({ userId: session.user.id })
    .sort({ activeForAi: -1, createdAt: -1 })
    .lean();

  return resumes.map((resume: any) => ({
    id: resume._id.toString(),
    title: resume.title,
    skills: resume.skills,
    activeForAi: !!resume.activeForAi,
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
  const coverLetter = formData.get('coverLetter') as string;

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

    let embedding: number[] | undefined = undefined;
    try {
      const text = buildResumeEmbeddingText({ title, skills, experience, education });
      embedding = await getEmbedding(text);
    } catch (e) {
      console.warn('[JobFlow] ML service unavailable, resume saved without embedding.', e);
    }

    const existingCount = await Resume.countDocuments({ userId: session.user.id });
    const activeForAi = existingCount === 0;

    const createdResume = await Resume.create({
      userId: toObjectId(session.user.id),
      title,
      skills,
      experience: experience || '',
      education: education || '',
      activeForAi,
      ...(embedding ? { embedding } : {}),
      cvLink: cvLink || '',
      cvFile: cvFilePath,
      phone: phone || '',
      telegram: telegram || '',
      linkedin: linkedin || '',
      github: github || '',
    });

    resumeId = String(createdResume._id);
  }

  if (!resumeId) {
    return { error: 'Resume is required to apply.' };
  }

  const createdResponse = await Response.create({
    userId: toObjectId(session.user.id),
    vacancyId: toObjectId(vacancyId),
    resumeId: toObjectId(resumeId),
    status: 'PENDING',
  });

  const { ensureChatForResponseId, persistMessage } = await import('@/lib/chat/chat-service');
  await ensureChatForResponseId(createdResponse._id.toString());

  if (coverLetter && coverLetter.trim()) {
    const chat = await Chat.findOne({
      employeeId: new mongoose.Types.ObjectId(session.user.id),
      vacancyId: new mongoose.Types.ObjectId(vacancyId),
    }).lean();

    if (chat && chat.employerId) {
      await persistMessage({
        chatId: chat._id.toString(),
        senderId: session.user.id,
        receiverId: chat.employerId.toString(),
        text: coverLetter.trim(),
      });
    }
  }

  revalidatePath('/dashboard/employee');
  revalidatePath('/dashboard/employee/recommendations');
  revalidatePath(`/jobs/${vacancyId}`);

  return { success: true };
}

export async function setActiveResumeForAiAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYEE') throw new Error('Unauthorized');

  const id = formData.get('id') as string;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid resume');

  await dbConnect();
  const doc = await Resume.findOne({ _id: id, userId: session.user.id });
  if (!doc) throw new Error('Resume not found');

  await Resume.updateMany({ userId: session.user.id }, { $set: { activeForAi: false } });
  await Resume.updateOne({ _id: id, userId: session.user.id }, { $set: { activeForAi: true } });

  revalidatePath('/dashboard/employee');
  revalidatePath('/dashboard/employee/recommendations');
}
