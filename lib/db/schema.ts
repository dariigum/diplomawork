import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  username?: string;
  passwordHash: string;
  name: string;
  role: 'EMPLOYEE' | 'EMPLOYER' | 'ADMIN';
  source?: 'LOCAL' | 'HEADHUNTER';
  externalId?: string;
  industry?: string;
  description?: string;
  location?: string;
  employees?: string;
  logoUrl?: string;
  website?: string;
  importedAt?: Date;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['EMPLOYEE', 'EMPLOYER', 'ADMIN'], required: true },
  source: { type: String, enum: ['LOCAL', 'HEADHUNTER'], default: 'LOCAL' },
  externalId: { type: String, trim: true },
  industry: { type: String },
  description: { type: String },
  location: { type: String },
  employees: { type: String },
  logoUrl: { type: String },
  website: { type: String },
  importedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

UserSchema.index(
  { source: 1, externalId: 1 },
  { unique: true, partialFilterExpression: { externalId: { $type: 'string' } } }
);

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export interface IResume extends Document {
  userId: mongoose.Types.ObjectId | IUser;
  title: string;
  skills: string;
  experience: string;
  education: string;
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
  cvLink: { type: String },
  cvFile: { type: String },
  phone: { type: String },
  telegram: { type: String },
  linkedin: { type: String },
  github: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const Resume: Model<IResume> = mongoose.models.Resume || mongoose.model<IResume>('Resume', ResumeSchema);

export interface IVacancy extends Document {
  employerId: mongoose.Types.ObjectId | IUser;
  source?: 'LOCAL' | 'HEADHUNTER';
  externalId?: string;
  title: string;
  description: string;
  skillsRequired: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string;
  experience?: string;
  employmentType?: string;
  workFormat?: string;
  workMode?: 'REMOTE' | 'ONSITE';
  country?: string;
  city?: string;
  address?: string;
  sourceUrl?: string;
  externalPublishedAt?: Date;
  importedAt?: Date;
  requirements?: string[];
  responsibilities?: string[];
  createdAt: Date;
}

const VacancySchema = new Schema<IVacancy>({
  employerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  source: { type: String, enum: ['LOCAL', 'HEADHUNTER'], default: 'LOCAL' },
  externalId: { type: String, trim: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  skillsRequired: { type: String, required: true },
  salaryMin: { type: Number, default: null },
  salaryMax: { type: Number, default: null },
  salaryCurrency: { type: String, default: 'KZT' },
  experience: { type: String, default: 'Any experience' },
  employmentType: { type: String, default: 'Full-time' },
  workFormat: { type: String, default: '' },
  workMode: { type: String, enum: ['REMOTE', 'ONSITE'], default: 'REMOTE' },
  country: { type: String, default: '' },
  city: { type: String, default: '' },
  address: { type: String, default: 'Remote' },
  sourceUrl: { type: String, default: '' },
  externalPublishedAt: { type: Date },
  importedAt: { type: Date },
  requirements: [{ type: String }],
  responsibilities: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

VacancySchema.index(
  { source: 1, externalId: 1 },
  { unique: true, partialFilterExpression: { externalId: { $type: 'string' } } }
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

export interface IArticle extends Document {
  title: string;
  summary: string;
  content: string;
  category: string;
  language: string; // 'en', 'ru'
  readTime: string;
  imageUrl?: string;
  sourceUrl?: string;
  sourceSite?: string;
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
  sourceSite: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const Article: Model<IArticle> = mongoose.models.Article || mongoose.model<IArticle>('Article', ArticleSchema);

export interface IChatMessage extends Document {
  responseId: mongoose.Types.ObjectId | IResponse;
  vacancyId: mongoose.Types.ObjectId | IVacancy;
  employerId: mongoose.Types.ObjectId | IUser;
  employeeId: mongoose.Types.ObjectId | IUser;
  senderId: mongoose.Types.ObjectId | IUser;
  recipientId: mongoose.Types.ObjectId | IUser;
  encryptedContent: string;
  iv: string;
  authTag: string;
  createdAt: Date;
  readAt?: Date | null;
}

const ChatMessageSchema = new Schema<IChatMessage>({
  responseId: { type: Schema.Types.ObjectId, ref: 'Response', required: true },
  vacancyId: { type: Schema.Types.ObjectId, ref: 'Vacancy', required: true },
  employerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  encryptedContent: { type: String, required: true },
  iv: { type: String, required: true },
  authTag: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  readAt: { type: Date, default: null },
});

ChatMessageSchema.index({ responseId: 1, createdAt: 1 });
ChatMessageSchema.index({ recipientId: 1, readAt: 1, createdAt: -1 });
ChatMessageSchema.index({ vacancyId: 1, responseId: 1, createdAt: -1 });

export const ChatMessage: Model<IChatMessage> =
  mongoose.models.ChatMessage || mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);

export interface IHeadHunterImportLogEntry {
  timestamp: Date;
  level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  message: string;
}

export interface IHeadHunterImportJob extends Document {
  key: string;
  status: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt?: Date | null;
  finishedAt?: Date | null;
  limitBytes: number;
  totalBytes: number;
  progressPercent: number;
  downloadedCount: number;
  processedCount: number;
  readyCount: number;
  importedCount: number;
  updatedCount: number;
  employersCreatedCount: number;
  skippedWithoutSalaryCount: number;
  deletedByAgeCount: number;
  deletedBySizeCount: number;
  errorCount: number;
  currentQuery?: string;
  currentPage?: number;
  stopReason?: string;
  lastError?: string;
  searchTerms: string[];
  logs: IHeadHunterImportLogEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const HeadHunterImportLogEntrySchema = new Schema<IHeadHunterImportLogEntry>(
  {
    timestamp: { type: Date, required: true },
    level: { type: String, enum: ['INFO', 'SUCCESS', 'WARNING', 'ERROR'], required: true },
    message: { type: String, required: true },
  },
  { _id: false }
);

const HeadHunterImportJobSchema = new Schema<IHeadHunterImportJob>(
  {
    key: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['IDLE', 'RUNNING', 'COMPLETED', 'FAILED'],
      default: 'IDLE',
      required: true,
    },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    limitBytes: { type: Number, required: true, default: 0 },
    totalBytes: { type: Number, required: true, default: 0 },
    progressPercent: { type: Number, required: true, default: 0 },
    downloadedCount: { type: Number, required: true, default: 0 },
    processedCount: { type: Number, required: true, default: 0 },
    readyCount: { type: Number, required: true, default: 0 },
    importedCount: { type: Number, required: true, default: 0 },
    updatedCount: { type: Number, required: true, default: 0 },
    employersCreatedCount: { type: Number, required: true, default: 0 },
    skippedWithoutSalaryCount: { type: Number, required: true, default: 0 },
    deletedByAgeCount: { type: Number, required: true, default: 0 },
    deletedBySizeCount: { type: Number, required: true, default: 0 },
    errorCount: { type: Number, required: true, default: 0 },
    currentQuery: { type: String, default: '' },
    currentPage: { type: Number, default: 0 },
    stopReason: { type: String, default: '' },
    lastError: { type: String, default: '' },
    searchTerms: [{ type: String }],
    logs: { type: [HeadHunterImportLogEntrySchema], default: [] },
  },
  { timestamps: true }
);

export const HeadHunterImportJob: Model<IHeadHunterImportJob> =
  mongoose.models.HeadHunterImportJob ||
  mongoose.model<IHeadHunterImportJob>('HeadHunterImportJob', HeadHunterImportJobSchema);
