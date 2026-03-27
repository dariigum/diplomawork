'use server'

import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import dbConnect from '@/lib/db/mongoose';
import { Article, ChatMessage, Response, Resume, SavedVacancy, User, Vacancy } from '@/lib/db/schema';

type AdminDeleteType =
  | 'employee'
  | 'employer'
  | 'vacancy'
  | 'resume'
  | 'response'
  | 'saved-vacancy'
  | 'article';

const ADMIN_REVALIDATE_PATHS = [
  '/dashboard/admin',
  '/dashboard/admin/employees',
  '/dashboard/admin/employers',
  '/dashboard/admin/resumes',
  '/dashboard/admin/vacancies',
  '/dashboard/admin/responses',
  '/dashboard/admin/saved-vacancies',
  '/dashboard/admin/articles',
  '/dashboard/employee',
  '/dashboard/employer',
  '/',
  '/companies',
];

async function requireAdminSession() {
  const session = await getSession();
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  return session;
}

async function deleteResponseCascade(responseIds: mongoose.Types.ObjectId[]) {
  if (responseIds.length === 0) return;

  await ChatMessage.deleteMany({ responseId: { $in: responseIds } });
  await Response.deleteMany({ _id: { $in: responseIds } });
}

export async function deleteAdminEntityAction(formData: FormData) {
  await requireAdminSession();

  const type = ((formData.get('type') as string) || '').trim() as AdminDeleteType;
  const id = ((formData.get('id') as string) || '').trim();

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid entity id');
  }

  await dbConnect();

  switch (type) {
    case 'employee': {
      const employee = await User.findOne({ _id: id, role: 'EMPLOYEE' }).select('_id');
      if (!employee) throw new Error('Employee not found');

      const responses = await Response.find({ userId: id }).select('_id').lean();
      const responseIds = responses.map((response) => response._id);

      await deleteResponseCascade(responseIds);
      await SavedVacancy.deleteMany({ userId: id });
      await Resume.deleteMany({ userId: id });
      await ChatMessage.deleteMany({ employeeId: id });
      await User.deleteOne({ _id: id, role: 'EMPLOYEE' });
      break;
    }

    case 'employer': {
      const employer = await User.findOne({ _id: id, role: 'EMPLOYER' }).select('_id');
      if (!employer) throw new Error('Employer not found');

      const vacancies = await Vacancy.find({ employerId: id }).select('_id').lean();
      const vacancyIds = vacancies.map((vacancy) => vacancy._id);

      const responses = vacancyIds.length
        ? await Response.find({ vacancyId: { $in: vacancyIds } }).select('_id').lean()
        : [];
      const responseIds = responses.map((response) => response._id);

      await deleteResponseCascade(responseIds);

      if (vacancyIds.length > 0) {
        await SavedVacancy.deleteMany({ vacancyId: { $in: vacancyIds } });
        await ChatMessage.deleteMany({
          $or: [{ employerId: id }, { vacancyId: { $in: vacancyIds } }],
        });
        await Vacancy.deleteMany({ _id: { $in: vacancyIds } });
      } else {
        await ChatMessage.deleteMany({ employerId: id });
      }

      await User.deleteOne({ _id: id, role: 'EMPLOYER' });
      break;
    }

    case 'vacancy': {
      const responses = await Response.find({ vacancyId: id }).select('_id').lean();
      const responseIds = responses.map((response) => response._id);

      await deleteResponseCascade(responseIds);
      await SavedVacancy.deleteMany({ vacancyId: id });
      await ChatMessage.deleteMany({ vacancyId: id });
      await Vacancy.findByIdAndDelete(id);
      break;
    }

    case 'resume': {
      const responses = await Response.find({ resumeId: id }).select('_id').lean();
      const responseIds = responses.map((response) => response._id);

      await deleteResponseCascade(responseIds);
      await Resume.findByIdAndDelete(id);
      break;
    }

    case 'response': {
      await ChatMessage.deleteMany({ responseId: id });
      await Response.findByIdAndDelete(id);
      break;
    }

    case 'saved-vacancy': {
      await SavedVacancy.findByIdAndDelete(id);
      break;
    }

    case 'article': {
      await Article.findByIdAndDelete(id);
      break;
    }

    default:
      throw new Error('Unsupported entity type');
  }

  for (const path of ADMIN_REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}
