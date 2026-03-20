import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: 'EMPLOYEE' | 'EMPLOYER';
  industry?: string;
  description?: string;
  location?: string;
  employees?: string;
  logoUrl?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['EMPLOYEE', 'EMPLOYER'], required: true },
  industry: { type: String },
  description: { type: String },
  location: { type: String },
  employees: { type: String },
  logoUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export interface IResume extends Document {
  userId: mongoose.Types.ObjectId | IUser;
  title: string;
  skills: string;
  experience: string;
  education: string;
  cvLink?: string;
  phone?: string;
  telegram?: string;
  linkedin?: string;
  github?: string;
  createdAt: Date;
}

const ResumeSchema = new Schema<IResume>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  skills: { type: String, required: true },
  experience: { type: String, required: true },
  education: { type: String, required: true },
  cvLink: { type: String },
  phone: { type: String },
  telegram: { type: String },
  linkedin: { type: String },
  github: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const Resume: Model<IResume> = mongoose.models.Resume || mongoose.model<IResume>('Resume', ResumeSchema);

export interface IVacancy extends Document {
  employerId: mongoose.Types.ObjectId | IUser;
  title: string;
  description: string;
  skillsRequired: string;
  salaryMin: number;
  salaryMax: number;
  experience?: string;
  employmentType?: string;
  address?: string;
  requirements?: string[];
  responsibilities?: string[];
  createdAt: Date;
}

const VacancySchema = new Schema<IVacancy>({
  employerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  skillsRequired: { type: String, required: true },
  salaryMin: { type: Number, required: true },
  salaryMax: { type: Number, required: true },
  experience: { type: String, default: 'Any experience' },
  employmentType: { type: String, default: 'Full-time' },
  address: { type: String, default: 'Remote' },
  requirements: [{ type: String }],
  responsibilities: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

export const Vacancy: Model<IVacancy> = mongoose.models.Vacancy || mongoose.model<IVacancy>('Vacancy', VacancySchema);

export interface ISavedVacancy extends Document {
  userId: mongoose.Types.ObjectId | IUser;
  vacancyId: mongoose.Types.ObjectId | IVacancy;
}

const SavedVacancySchema = new Schema<ISavedVacancy>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  vacancyId: { type: Schema.Types.ObjectId, ref: 'Vacancy', required: true }
});

export const SavedVacancy: Model<ISavedVacancy> = mongoose.models.SavedVacancy || mongoose.model<ISavedVacancy>('SavedVacancy', SavedVacancySchema);

export interface IResponse extends Document {
  userId: mongoose.Types.ObjectId | IUser;
  vacancyId: mongoose.Types.ObjectId | IVacancy;
  resumeId: mongoose.Types.ObjectId | IResume;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: Date;
}

const ResponseSchema = new Schema<IResponse>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  vacancyId: { type: Schema.Types.ObjectId, ref: 'Vacancy', required: true },
  resumeId: { type: Schema.Types.ObjectId, ref: 'Resume', required: true },
  status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED'], required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Response: Model<IResponse> = mongoose.models.Response || mongoose.model<IResponse>('Response', ResponseSchema);

export interface IArticle extends Document {
  title: string;
  summary: string;
  content: string;
  category: string;
  language: string; // 'en', 'ru', 'es'
  readTime: string;
  imageUrl?: string;
  sourceUrl?: string;
  createdAt: Date;
}

const ArticleSchema = new Schema<IArticle>({
  title: { type: String, required: true },
  summary: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, required: true },
  language: { type: String, required: true },
  readTime: { type: String, required: true },
  imageUrl: { type: String },
  sourceUrl: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const Article: Model<IArticle> = mongoose.models.Article || mongoose.model<IArticle>('Article', ArticleSchema);
