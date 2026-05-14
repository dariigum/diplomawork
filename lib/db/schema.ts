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
  website?: string;
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
  website: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export interface IResume extends Document {
  userId: mongoose.Types.ObjectId | IUser;
  title: string;
  skills: string;
  experience: string;
  education: string;
  embedding?: number[];
  /** Exactly one resume per user should be true — used for AI / semantic recommendations. */
  activeForAi?: boolean;
  cvLink?: string;
  cvFile?: string;
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
  embedding: { type: [Number], required: false },
  activeForAi: { type: Boolean, default: false },
  cvLink: { type: String },
  cvFile: { type: String },
  phone: { type: String },
  telegram: { type: String },
  linkedin: { type: String },
  github: { type: String },
  createdAt: { type: Date, default: Date.now }
});

ResumeSchema.index({ userId: 1, activeForAi: 1 });

export const Resume: Model<IResume> = mongoose.models.Resume || mongoose.model<IResume>('Resume', ResumeSchema);

export interface IVacancy extends Document {
  employerId: mongoose.Types.ObjectId | IUser;
  title: string;
  description: string;
  skillsRequired: string;
  embedding?: number[];
  salaryMin: number;
  salaryMax: number;
  experience?: string;
  employmentType?: string;
  workMode?: 'REMOTE' | 'ONSITE';
  country?: string;
  city?: string;
  address?: string;
  requirements?: string[];
  responsibilities?: string[];
  /** Set only for automated ingestion rows (HH, MOCK, …). Manual employer vacancies omit this. */
  source?: string;
  /** Stable id within `source` (e.g. `hh_12345`). */
  externalId?: string;
  /** Canonical listing URL from the provider. */
  sourceUrl?: string;
  createdAt: Date;
}

const VacancySchema = new Schema<IVacancy>({
  employerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  skillsRequired: { type: String, required: true },
  embedding: { type: [Number], required: false },
  salaryMin: { type: Number, required: true },
  salaryMax: { type: Number, required: true },
  experience: { type: String, default: 'Any experience' },
  employmentType: { type: String, default: 'Full-time' },
  workMode: { type: String, enum: ['REMOTE', 'ONSITE'], default: 'REMOTE' },
  country: { type: String, default: '' },
  city: { type: String, default: '' },
  address: { type: String, default: 'Remote' },
  requirements: [{ type: String }],
  responsibilities: [{ type: String }],
  source: { type: String },
  externalId: { type: String },
  sourceUrl: { type: String },
  createdAt: { type: Date, default: Date.now }
});

VacancySchema.index(
  { source: 1, externalId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      source: { $type: 'string', $ne: '' },
      externalId: { $type: 'string', $ne: '' },
    },
  }
);

export const Vacancy: Model<IVacancy> = mongoose.models.Vacancy || mongoose.model<IVacancy>('Vacancy', VacancySchema);

export interface ISavedVacancy extends Document {
  userId: mongoose.Types.ObjectId | IUser;
  vacancyId: mongoose.Types.ObjectId | IVacancy;
}

const SavedVacancySchema = new Schema<ISavedVacancy>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  vacancyId: { type: Schema.Types.ObjectId, ref: 'Vacancy', required: true }
});

SavedVacancySchema.index({ userId: 1, vacancyId: 1 }, { unique: true });

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

export const VACANCY_BEHAVIOUR_EVENT_TYPES = [
  'VACANCY_VIEWED',
  'VACANCY_SAVED',
  'VACANCY_UNSAVED',
  'VACANCY_APPLIED',
] as const;

export type VacancyBehaviourEventType = (typeof VACANCY_BEHAVIOUR_EVENT_TYPES)[number];

/** Append-only behavioural signals; does not replace SavedVacancy / Response. */
export interface IVacancyBehaviourEvent extends Document {
  userId: mongoose.Types.ObjectId | IUser;
  vacancyId: mongoose.Types.ObjectId | IVacancy;
  eventType: VacancyBehaviourEventType;
  occurredAt: Date;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VacancyBehaviourEventSchema = new Schema<IVacancyBehaviourEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vacancyId: { type: Schema.Types.ObjectId, ref: 'Vacancy', required: true, index: true },
    eventType: {
      type: String,
      enum: VACANCY_BEHAVIOUR_EVENT_TYPES,
      required: true,
      index: true,
    },
    occurredAt: { type: Date, required: true, default: Date.now, index: true },
    source: { type: String, maxlength: 64 },
  },
  { timestamps: true },
);

VacancyBehaviourEventSchema.index({ userId: 1, occurredAt: -1 });
VacancyBehaviourEventSchema.index({ vacancyId: 1, occurredAt: -1 });
VacancyBehaviourEventSchema.index({ userId: 1, vacancyId: 1, eventType: 1, occurredAt: -1 });

export const VacancyBehaviourEvent: Model<IVacancyBehaviourEvent> =
  mongoose.models.VacancyBehaviourEvent ||
  mongoose.model<IVacancyBehaviourEvent>('VacancyBehaviourEvent', VacancyBehaviourEventSchema);

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
