import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: 'EMPLOYEE' | 'EMPLOYER' | 'ADMIN';
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
  role: { type: String, enum: ['EMPLOYEE', 'EMPLOYER', 'ADMIN'], required: true },
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

export interface IChat extends Document {
  employerId: mongoose.Types.ObjectId | IUser;
  employeeId: mongoose.Types.ObjectId | IUser;
  vacancyId: mongoose.Types.ObjectId | IVacancy;
  applicationId?: mongoose.Types.ObjectId | IResponse;
  lastMessage?: mongoose.Types.ObjectId | IMessage;
  lastMessagePreview?: string;
  lastMessageAt?: Date;
  unreadCountEmployer: number;
  unreadCountEmployee: number;
  /** When true, chat is hidden from the employee UI; messages are still stored for the employer. */
  hiddenForEmployee?: boolean;
  hiddenForEmployeeAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema = new Schema<IChat>({
  employerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  vacancyId: { type: Schema.Types.ObjectId, ref: 'Vacancy', required: true },
  applicationId: { type: Schema.Types.ObjectId, ref: 'Response' },
  lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  lastMessagePreview: { type: String, default: '' },
  lastMessageAt: { type: Date },
  unreadCountEmployer: { type: Number, default: 0 },
  unreadCountEmployee: { type: Number, default: 0 },
  hiddenForEmployee: { type: Boolean, default: false },
  hiddenForEmployeeAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ChatSchema.index({ employeeId: 1, vacancyId: 1 }, { unique: true });
ChatSchema.index({ employerId: 1, updatedAt: -1 });
ChatSchema.index({ employeeId: 1, updatedAt: -1 });
ChatSchema.index({ vacancyId: 1 });

export const Chat: Model<IChat> = mongoose.models.Chat || mongoose.model<IChat>('Chat', ChatSchema);

export interface IAttachment {
  fileName: string;
  mimeType: string;
  size: number;
  /** Legacy direct URL; prefer storageKey + signed download */
  url?: string;
  storageKey?: string;
}

export interface IMessage extends Document {
  chatId: mongoose.Types.ObjectId | IChat;
  senderId: mongoose.Types.ObjectId | IUser;
  receiverId: mongoose.Types.ObjectId | IUser;
  /** Stored plaintext or `enc:v1:...` when CHAT_MESSAGE_KEY is set */
  text: string;
  attachments: IAttachment[];
  isRead: boolean;
  readAt?: Date;
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '' },
  attachments: [
    {
      fileName: String,
      mimeType: String,
      size: Number,
      url: { type: String, required: false },
      storageKey: { type: String, required: false },
    },
  ],
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  editedAt: { type: Date },
  deletedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

MessageSchema.index({ chatId: 1, createdAt: -1 });
MessageSchema.index({ chatId: 1, isRead: 1 });
MessageSchema.index({ receiverId: 1, isRead: 1 });

export const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

export interface ISkillImprovementReport extends Document {
  resumeId: mongoose.Types.ObjectId | IResume;
  userId: mongoose.Types.ObjectId | IUser;
  individualProgram: string;
  topRecommendations: string;
  careerDirections: string;
  learningPath: string;
  nextSteps: string;
  translations?: Record<string, {
    individualProgram: string;
    topRecommendations: string;
    careerDirections: string;
    learningPath: string;
    nextSteps: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const SkillImprovementReportSchema = new Schema<ISkillImprovementReport>(
  {
    resumeId: { type: Schema.Types.ObjectId, ref: 'Resume', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    individualProgram: { type: String, required: true },
    topRecommendations: { type: String, required: true },
    careerDirections: { type: String, required: true },
    learningPath: { type: String, required: true },
    nextSteps: { type: String, required: true },
    translations: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

SkillImprovementReportSchema.index({ resumeId: 1 }, { unique: true });

export const SkillImprovementReport: Model<ISkillImprovementReport> =
  mongoose.models.SkillImprovementReport ||
  mongoose.model<ISkillImprovementReport>('SkillImprovementReport', SkillImprovementReportSchema);

