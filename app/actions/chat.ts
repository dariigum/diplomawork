'use server'

import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { decryptChatMessage, encryptChatMessage } from '@/lib/chat-crypto';
import type {
  ChatMessageView,
  ChatNotification,
  EmployeeChatPayload,
  EmployerChatPayload,
} from '@/lib/chat-types';
import dbConnect from '@/lib/db/mongoose';
import { ChatMessage, Response, Vacancy } from '@/lib/db/schema';

const MESSAGE_PREVIEW_LIMIT = 90;

function formatDate(date: unknown) {
  if (!date) return null;
  const value = date instanceof Date ? date : new Date(date as string);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

function formatSalaryLabel(min?: number, max?: number) {
  const safeMin = typeof min === 'number' ? min.toLocaleString() : '0';
  const safeMax = typeof max === 'number' ? max.toLocaleString() : '0';
  return `$${safeMin} - $${safeMax}`;
}

function buildPreview(content: string) {
  if (content.length <= MESSAGE_PREVIEW_LIMIT) return content;
  return `${content.slice(0, MESSAGE_PREVIEW_LIMIT - 1).trimEnd()}…`;
}

function safeDecryptMessage(message: {
  encryptedContent: string;
  iv: string;
  authTag: string;
}) {
  try {
    return decryptChatMessage(message);
  } catch {
    return '[Encrypted message unavailable]';
  }
}

function toObjectId(id: string) {
  return new mongoose.Types.ObjectId(id);
}

async function getResponseContext(responseId: string) {
  if (!mongoose.Types.ObjectId.isValid(responseId)) return null;

  await dbConnect();

  const response = await Response.findById(responseId)
    .populate('userId', 'name email role')
    .populate('resumeId', 'title')
    .populate({
      path: 'vacancyId',
      select: 'title salaryMin salaryMax employerId',
      populate: { path: 'employerId', select: 'name email role' },
    })
    .lean() as any;

  if (!response?.vacancyId || !response?.userId || !response?.vacancyId?.employerId) {
    return null;
  }

  return {
    responseId: response._id.toString(),
    employee: {
      id: response.userId._id.toString(),
      name: response.userId.name || 'Applicant',
      email: response.userId.email || '',
      role: 'EMPLOYEE' as const,
    },
    employer: {
      id: response.vacancyId.employerId._id.toString(),
      name: response.vacancyId.employerId.name || 'Employer',
      email: response.vacancyId.employerId.email || '',
      role: 'EMPLOYER' as const,
    },
    vacancy: {
      id: response.vacancyId._id.toString(),
      title: response.vacancyId.title || 'Untitled vacancy',
      salaryLabel: formatSalaryLabel(response.vacancyId.salaryMin, response.vacancyId.salaryMax),
    },
    resumeTitle: response.resumeId?.title || 'Resume',
    status: response.status,
  };
}

async function getConversationMessagesForResponse(
  responseId: string,
  employee: { id: string; name: string },
  employer: { id: string; name: string }
) {
  const rawMessages = await ChatMessage.find({ responseId }).sort({ createdAt: 1 }).lean();

  return rawMessages.map((message: any): ChatMessageView => {
    const senderId = message.senderId.toString();
    const senderRole = senderId === employee.id ? 'EMPLOYEE' : 'EMPLOYER';

    return {
      id: message._id.toString(),
      responseId: message.responseId.toString(),
      senderId,
      senderName: senderRole === 'EMPLOYEE' ? employee.name : employer.name,
      senderRole,
      recipientId: message.recipientId.toString(),
      content: safeDecryptMessage(message),
      createdAt: new Date(message.createdAt).toISOString(),
      readAt: formatDate(message.readAt),
    };
  });
}

async function ensureParticipant(responseId: string) {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const context = await getResponseContext(responseId);
  if (!context) return null;

  const isEmployee = context.employee.id === session.user.id;
  const isEmployer = context.employer.id === session.user.id;

  if (!isEmployee && !isEmployer) return null;

  return { session, context, isEmployee, isEmployer };
}

export async function getEmployeeChatDataAction(
  selectedResponseId?: string
): Promise<EmployeeChatPayload> {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYEE') {
    return { threads: [], selectedResponseId: null, messages: [] };
  }

  await dbConnect();

  const responses = await Response.find({ userId: session.user.id })
    .populate({
      path: 'vacancyId',
      select: 'title salaryMin salaryMax employerId',
      populate: { path: 'employerId', select: 'name' },
    })
    .sort({ createdAt: -1 })
    .lean() as any[];

  const responseIds = responses.map((response) => response._id);
  const rawMessages = responseIds.length > 0
    ? await ChatMessage.find({ responseId: { $in: responseIds } }).sort({ createdAt: -1 }).lean()
    : [];

  const metaByResponse = new Map<string, {
    latestMessagePreview: string | null;
    latestMessageAt: string | null;
    unreadCount: number;
  }>();

  for (const message of rawMessages as any[]) {
    const key = message.responseId.toString();
    const current = metaByResponse.get(key) || {
      latestMessagePreview: null,
      latestMessageAt: null,
      unreadCount: 0,
    };

    if (!current.latestMessageAt) {
      current.latestMessageAt = new Date(message.createdAt).toISOString();
      current.latestMessagePreview = buildPreview(safeDecryptMessage(message));
    }

    if (message.recipientId.toString() === session.user.id && !message.readAt) {
      current.unreadCount += 1;
    }

    metaByResponse.set(key, current);
  }

  const threads = responses
    .filter((response) => response.vacancyId && response.vacancyId.employerId)
    .map((response) => {
      const responseId = response._id.toString();
      const meta = metaByResponse.get(responseId);

      return {
        responseId,
        vacancyId: response.vacancyId._id.toString(),
        vacancyTitle: response.vacancyId.title || 'Untitled vacancy',
        salaryLabel: formatSalaryLabel(response.vacancyId.salaryMin, response.vacancyId.salaryMax),
        companyId: response.vacancyId.employerId._id.toString(),
        companyName: response.vacancyId.employerId.name || 'Employer',
        status: response.status,
        latestMessagePreview: meta?.latestMessagePreview || null,
        latestMessageAt: meta?.latestMessageAt || null,
        unreadCount: meta?.unreadCount || 0,
      };
    });

  const resolvedResponseId =
    (selectedResponseId && threads.some((thread) => thread.responseId === selectedResponseId)
      ? selectedResponseId
      : threads[0]?.responseId) || null;

  const selectedContext = resolvedResponseId
    ? await getResponseContext(resolvedResponseId)
    : null;

  const messages = selectedContext
    ? await getConversationMessagesForResponse(
        resolvedResponseId as string,
        selectedContext.employee,
        selectedContext.employer
      )
    : [];

  return {
    threads,
    selectedResponseId: resolvedResponseId,
    messages,
  };
}

export async function getEmployerChatDataAction(
  selectedVacancyId?: string,
  selectedResponseId?: string
): Promise<EmployerChatPayload> {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYER') {
    return {
      vacancies: [],
      applicants: [],
      selectedVacancyId: null,
      selectedResponseId: null,
      messages: [],
    };
  }

  await dbConnect();

  const vacancies = await Vacancy.find({ employerId: session.user.id })
    .select('title salaryMin salaryMax createdAt')
    .sort({ createdAt: -1 })
    .lean() as any[];

  const vacancyIds = vacancies.map((vacancy) => vacancy._id);
  const responses = vacancyIds.length > 0
    ? await Response.find({ vacancyId: { $in: vacancyIds } })
        .populate('userId', 'name email')
        .populate('resumeId', 'title')
        .sort({ createdAt: -1 })
        .lean()
    : [];

  const responseIds = (responses as any[]).map((response) => response._id);
  const rawMessages = responseIds.length > 0
    ? await ChatMessage.find({ responseId: { $in: responseIds } }).sort({ createdAt: -1 }).lean()
    : [];

  const metaByResponse = new Map<string, {
    latestMessagePreview: string | null;
    latestMessageAt: string | null;
    unreadCount: number;
  }>();

  for (const message of rawMessages as any[]) {
    const key = message.responseId.toString();
    const current = metaByResponse.get(key) || {
      latestMessagePreview: null,
      latestMessageAt: null,
      unreadCount: 0,
    };

    if (!current.latestMessageAt) {
      current.latestMessageAt = new Date(message.createdAt).toISOString();
      current.latestMessagePreview = buildPreview(safeDecryptMessage(message));
    }

    if (message.recipientId.toString() === session.user.id && !message.readAt) {
      current.unreadCount += 1;
    }

    metaByResponse.set(key, current);
  }

  const vacancyResponseMap = new Map<string, any[]>();
  for (const response of responses as any[]) {
    const key = response.vacancyId.toString();
    const list = vacancyResponseMap.get(key) || [];
    list.push(response);
    vacancyResponseMap.set(key, list);
  }

  const vacancyViews = vacancies.map((vacancy) => {
    const applicants = vacancyResponseMap.get(vacancy._id.toString()) || [];
    const unreadCount = applicants.reduce((total, response) => {
      return total + (metaByResponse.get(response._id.toString())?.unreadCount || 0);
    }, 0);

    return {
      vacancyId: vacancy._id.toString(),
      title: vacancy.title || 'Untitled vacancy',
      salaryLabel: formatSalaryLabel(vacancy.salaryMin, vacancy.salaryMax),
      applicantsCount: applicants.length,
      unreadCount,
    };
  });

  const resolvedVacancyId =
    (selectedVacancyId && vacancyViews.some((vacancy) => vacancy.vacancyId === selectedVacancyId)
      ? selectedVacancyId
      : vacancyViews[0]?.vacancyId) || null;

  const applicants = resolvedVacancyId
    ? ((vacancyResponseMap.get(resolvedVacancyId) || []) as any[]).map((response) => {
        const meta = metaByResponse.get(response._id.toString());
        return {
          responseId: response._id.toString(),
          employeeId: response.userId?._id?.toString() || '',
          employeeName: response.userId?.name || 'Applicant',
          employeeEmail: response.userId?.email || '',
          resumeTitle: response.resumeId?.title || 'Resume',
          status: response.status,
          latestMessagePreview: meta?.latestMessagePreview || null,
          latestMessageAt: meta?.latestMessageAt || null,
          unreadCount: meta?.unreadCount || 0,
        };
      })
    : [];

  const resolvedResponseId =
    (selectedResponseId && applicants.some((applicant) => applicant.responseId === selectedResponseId)
      ? selectedResponseId
      : applicants[0]?.responseId) || null;

  const selectedContext = resolvedResponseId
    ? await getResponseContext(resolvedResponseId)
    : null;

  const messages = selectedContext
    ? await getConversationMessagesForResponse(
        resolvedResponseId as string,
        selectedContext.employee,
        selectedContext.employer
      )
    : [];

  return {
    vacancies: vacancyViews,
    applicants,
    selectedVacancyId: resolvedVacancyId,
    selectedResponseId: resolvedResponseId,
    messages,
  };
}

export async function getConversationMessagesAction(responseId: string) {
  const participant = await ensureParticipant(responseId);
  if (!participant) return { messages: [] as ChatMessageView[] };

  const messages = await getConversationMessagesForResponse(
    responseId,
    participant.context.employee,
    participant.context.employer
  );

  return { messages };
}

export async function sendChatMessageAction(responseId: string, content: string) {
  const participant = await ensureParticipant(responseId);
  if (!participant) {
    return { error: 'Conversation not found.' };
  }

  const trimmedContent = content.trim();
  if (!trimmedContent) {
    return { error: 'Message cannot be empty.' };
  }

  const senderId = participant.session.user.id;
  const recipientId = participant.isEmployee
    ? participant.context.employer.id
    : participant.context.employee.id;

  const encryptedPayload = encryptChatMessage(trimmedContent);

  await ChatMessage.create({
    responseId: toObjectId(participant.context.responseId),
    vacancyId: toObjectId(participant.context.vacancy.id),
    employerId: toObjectId(participant.context.employer.id),
    employeeId: toObjectId(participant.context.employee.id),
    senderId: toObjectId(senderId),
    recipientId: toObjectId(recipientId),
    ...encryptedPayload,
  });

  revalidatePath('/dashboard/employee');
  revalidatePath('/dashboard/employer');

  return { success: true };
}

export async function markConversationReadAction(responseId: string) {
  const participant = await ensureParticipant(responseId);
  if (!participant) return { success: false };

  await ChatMessage.updateMany(
    {
      responseId: toObjectId(responseId),
      recipientId: toObjectId(participant.session.user.id),
      readAt: null,
    },
    { $set: { readAt: new Date() } }
  );

  return { success: true };
}

export async function getUnreadChatNotificationsAction(): Promise<ChatNotification[]> {
  const session = await getSession();
  if (!session?.user?.id) return [];

  await dbConnect();

  const unreadMessages = await ChatMessage.find({
    recipientId: session.user.id,
    readAt: null,
  })
    .sort({ createdAt: -1 })
    .lean();

  if (unreadMessages.length === 0) return [];

  const responseIds = [...new Set(unreadMessages.map((message: any) => message.responseId.toString()))];
  const responses = await Response.find({ _id: { $in: responseIds } })
    .populate('userId', 'name')
    .populate({
      path: 'vacancyId',
      select: 'title employerId',
      populate: { path: 'employerId', select: 'name' },
    })
    .lean() as any[];

  const responseMap = new Map<string, any>();
  for (const response of responses) {
    responseMap.set(response._id.toString(), response);
  }

  const notifications = new Map<string, ChatNotification>();

  for (const message of unreadMessages as any[]) {
    const responseId = message.responseId.toString();
    if (notifications.has(responseId)) {
      const existing = notifications.get(responseId)!;
      existing.unreadCount += 1;
      continue;
    }

    const response = responseMap.get(responseId);
    if (!response?.vacancyId) continue;

    const isEmployee = session.user.role === 'EMPLOYEE';
    const vacancyId = response.vacancyId._id.toString();
    const counterpartyName = isEmployee
      ? response.vacancyId.employerId?.name || 'Employer'
      : response.userId?.name || 'Applicant';

    notifications.set(responseId, {
      responseId,
      vacancyId,
      vacancyTitle: response.vacancyId.title || 'Untitled vacancy',
      counterpartyName,
      unreadCount: 1,
      latestMessagePreview: buildPreview(safeDecryptMessage(message)),
      latestMessageAt: new Date(message.createdAt).toISOString(),
      dashboardHref: isEmployee
        ? `/dashboard/employee?tab=chat&responseId=${responseId}`
        : `/dashboard/employer?tab=chat&vacancyId=${vacancyId}&responseId=${responseId}`,
    });
  }

  return Array.from(notifications.values()).sort((a, b) => {
    return new Date(b.latestMessageAt).getTime() - new Date(a.latestMessageAt).getTime();
  });
}
