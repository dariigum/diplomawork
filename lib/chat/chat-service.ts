import mongoose from 'mongoose';
import { Chat, Message, Response, Vacancy, type IChat, type IMessage } from '@/lib/db/schema';
import type { IAttachment } from '@/lib/db/schema';
import { sanitizeChatMessageText } from '@/lib/chat/sanitize';
import { decryptMessageTextFromStorage, encryptMessageTextForStorage } from '@/lib/chat/crypto-message';
import { buildSignedAttachmentUrl } from '@/lib/chat/attachment-signing';

export type SessionUser = { id: string; role: 'EMPLOYEE' | 'EMPLOYER'; email?: string };

function preview(text: string, max = 140): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export async function ensureChatForResponseId(responseId: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(responseId)) return;
  const response = await Response.findById(responseId).populate('vacancyId').lean() as any;
  if (!response?.vacancyId) return;
  const vacancy = response.vacancyId;
  const employerId = vacancy.employerId?.toString?.() ?? vacancy.employerId;
  const employeeId = response.userId?.toString?.() ?? response.userId;
  const vacancyId = vacancy._id?.toString?.() ?? vacancy._id;
  if (!employerId || !employeeId || !vacancyId) return;

  await Chat.findOneAndUpdate(
    {
      employeeId: new mongoose.Types.ObjectId(employeeId),
      vacancyId: new mongoose.Types.ObjectId(vacancyId),
    },
    {
      $set: {
        employerId: new mongoose.Types.ObjectId(employerId),
        applicationId: new mongoose.Types.ObjectId(responseId),
        updatedAt: new Date(),
      },
      $setOnInsert: {
        unreadCountEmployer: 0,
        unreadCountEmployee: 0,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
}

export async function assertUserCanAccessChat(user: SessionUser, chatId: string): Promise<IChat> {
  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    throw new Error('Invalid chat');
  }
  const chat = (await Chat.findById(chatId).lean()) as IChat | null;
  if (!chat) throw new Error('Chat not found');
  const uid = user.id;
  const emp = chat.employeeId?._id?.toString() ?? chat.employeeId?.toString();
  const er = chat.employerId?._id?.toString() ?? chat.employerId?.toString();
  if (user.role === 'EMPLOYEE' && emp !== uid) throw new Error('Forbidden');
  if (user.role === 'EMPLOYER' && er !== uid) throw new Error('Forbidden');
  return chat as IChat;
}

export async function backfillChatApplicationIfMissing(chat: any): Promise<boolean> {
  if (chat.applicationId) return true;
  const empId = chat.employeeId?._id ?? chat.employeeId;
  const vacId = chat.vacancyId?._id ?? chat.vacancyId;
  if (!empId || !vacId || !chat._id) return false;
  const r = await Response.findOne({ userId: empId, vacancyId: vacId }).sort({ createdAt: -1 }).lean();
  if (!r) return false;
  await Chat.updateOne({ _id: chat._id }, { $set: { applicationId: r._id, updatedAt: new Date() } });
  chat.applicationId = r._id;
  return true;
}

export async function verifyApplicationOwnsChat(chat: IChat | Record<string, any>): Promise<boolean> {
  await backfillChatApplicationIfMissing(chat);
  if (!chat.applicationId) return false;
  const app = await Response.findById(chat.applicationId).lean();
  if (!app) return false;
  const emp = chat.employeeId?._id?.toString() ?? chat.employeeId?.toString();
  const vac = chat.vacancyId?._id?.toString() ?? chat.vacancyId?.toString();
  return app.userId.toString() === emp && app.vacancyId.toString() === vac;
}

export async function listChatsSerialized(user: SessionUser) {
  const uid = user.id;
  const q = user.role === 'EMPLOYER' ? { employerId: uid } : { employeeId: uid };

  const chats = await Chat.find(q)
    .populate('employeeId', 'name logoUrl')
    .populate('employerId', 'name logoUrl')
    .populate('vacancyId', 'title salaryMin salaryMax')
    .populate({
      path: 'lastMessage',
      select: 'text createdAt senderId isRead readAt',
    })
    .sort({ updatedAt: -1 })
    .lean();

  const out = [];
  for (const c of chats as any[]) {
    const last = c.lastMessage;
    let lastPreview = c.lastMessagePreview || '';
    if (last?.text) {
      lastPreview = preview(decryptMessageTextFromStorage(last.text));
    }
    const unread =
      user.role === 'EMPLOYER' ? c.unreadCountEmployer ?? 0 : c.unreadCountEmployee ?? 0;

    const other =
      user.role === 'EMPLOYER'
        ? {
            id: (c.employeeId as any)?._id?.toString(),
            name: (c.employeeId as any)?.name,
            image: (c.employeeId as any)?.logoUrl,
          }
        : {
            id: (c.employerId as any)?._id?.toString(),
            name: (c.employerId as any)?.name,
            image: (c.employerId as any)?.logoUrl,
          };

    out.push({
      id: c._id.toString(),
      vacancy: {
        id: (c.vacancyId as any)?._id?.toString(),
        title: (c.vacancyId as any)?.title,
        salaryMin: (c.vacancyId as any)?.salaryMin,
        salaryMax: (c.vacancyId as any)?.salaryMax,
      },
      applicationId: c.applicationId?.toString(),
      lastMessagePreview: lastPreview,
      lastMessageAt: c.lastMessageAt || c.updatedAt,
      unreadCount: unread,
      otherUser: other,
    });
  }
  return out;
}

export async function getChatDetailForUser(user: SessionUser, chatId: string) {
  await assertUserCanAccessChat(user, chatId);
  const populated = await Chat.findById(chatId)
    .populate('employeeId', 'name logoUrl email')
    .populate('employerId', 'name logoUrl website location description')
    .populate('vacancyId')
    .populate({
      path: 'applicationId',
      populate: { path: 'resumeId', select: 'title cvFile skills experience education' },
    })
    .lean() as any;

  if (!populated) throw new Error('Chat not found');

  const application = populated.applicationId;
  const vacancy = populated.vacancyId;
  const resume = application?.resumeId;

  return {
    id: populated._id.toString(),
    application: application
      ? {
          id: application._id.toString(),
          status: application.status,
          createdAt: application.createdAt,
          resume: resume
            ? {
                id: resume._id.toString(),
                title: resume.title,
                cvFile: resume.cvFile,
                skillsPreview: (resume.skills || '').slice(0, 200),
              }
            : null,
        }
      : null,
    vacancy: vacancy
      ? {
          id: vacancy._id.toString(),
          title: vacancy.title,
          description: (vacancy.description || '').slice(0, 400),
        }
      : null,
    employer: populated.employerId
      ? {
          id: populated.employerId._id.toString(),
          name: populated.employerId.name,
          logoUrl: populated.employerId.logoUrl,
        }
      : null,
    employee: populated.employeeId
      ? {
          id: populated.employeeId._id.toString(),
          name: populated.employeeId.name,
        }
      : null,
  };
}

export function serializeMessage(m: IMessage | Record<string, unknown>) {
  const doc = m as any;
  const rawText = decryptMessageTextFromStorage(doc.text || '');
  return {
    id: doc._id.toString(),
    chatId: doc.chatId?.toString?.() ?? doc.chatId,
    senderId: doc.senderId?.toString?.() ?? doc.senderId,
    receiverId: doc.receiverId?.toString?.() ?? doc.receiverId,
    text: doc.deletedAt ? '' : rawText,
    attachments: (doc.attachments || []).map((a: IAttachment) => ({
      fileName: a.fileName,
      mimeType: a.mimeType,
      size: a.size,
      url: a.storageKey ? buildSignedAttachmentUrl(a.storageKey) : a.url,
    })),
    isRead: !!doc.isRead,
    readAt: doc.readAt || null,
    editedAt: doc.editedAt || null,
    deletedAt: doc.deletedAt || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function getMessagesBefore(
  chatId: string,
  user: SessionUser,
  beforeId: string | undefined,
  limit = 40
) {
  await assertUserCanAccessChat(user, chatId);
  const chat = (await Chat.findById(chatId).lean()) as IChat | null;
  if (!chat) throw new Error('Forbidden');

  const q: Record<string, unknown> = { chatId: new mongoose.Types.ObjectId(chatId) };
  if (beforeId && mongoose.Types.ObjectId.isValid(beforeId)) {
    q._id = { $lt: new mongoose.Types.ObjectId(beforeId) };
  }

  const rows = await Message.find(q).sort({ _id: -1 }).limit(limit).lean();
  const ordered = [...rows].reverse();
  const messages = ordered.map((m) => serializeMessage(m));
  const oldestId = rows.length > 0 ? rows[rows.length - 1]._id.toString() : null;
  const hasMore = rows.length === limit;
  return { messages, oldestId, hasMore };
}

export async function persistMessage(params: {
  chatId: string;
  senderId: string;
  receiverId: string;
  text: string;
  attachments?: IAttachment[];
}): Promise<{ message: ReturnType<typeof serializeMessage>; chatPatch: Record<string, unknown> }> {
  const hasAtt = (params.attachments?.length ?? 0) > 0;
  const sanitized = sanitizeChatMessageText(params.text);
  if (!sanitized && !hasAtt) {
    throw new Error('Empty message');
  }
  const storedText = encryptMessageTextForStorage(sanitized);

  const chatRow = await Chat.findById(params.chatId).lean() as any;
  if (!chatRow) throw new Error('Chat not found');

  const msg = await Message.create({
    chatId: new mongoose.Types.ObjectId(params.chatId),
    senderId: new mongoose.Types.ObjectId(params.senderId),
    receiverId: new mongoose.Types.ObjectId(params.receiverId),
    text: storedText,
    attachments: (params.attachments ?? []).map((a) => ({
      fileName: a.fileName,
      mimeType: a.mimeType,
      size: a.size,
      storageKey: a.storageKey,
    })),
    isRead: false,
  });

  const receiverIsEmployer = params.receiverId === chatRow.employerId.toString();
  const inc = receiverIsEmployer ? { unreadCountEmployer: 1 } : { unreadCountEmployee: 1 };

  const previewText = preview(sanitized || (params.attachments?.length ? '[Attachment]' : ''));

  await Chat.findByIdAndUpdate(params.chatId, {
    $set: {
      lastMessage: msg._id,
      lastMessagePreview: previewText,
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    },
    $inc: inc,
  });

  const serialized = serializeMessage(msg.toObject());
  return {
    message: serialized,
    chatPatch: {
      lastMessagePreview: previewText,
      lastMessageAt: serialized.createdAt,
    },
  };
}

export async function sendMessageFromUser(params: {
  user: SessionUser;
  chatId: string;
  text: string;
  attachments?: IAttachment[];
}) {
  await assertUserCanAccessChat(params.user, params.chatId);
  const full = (await Chat.findById(params.chatId).lean()) as any;
  if (!full) {
    throw new Error('Forbidden');
  }

  const senderId = params.user.id;
  const receiverId =
    full.employerId.toString() === senderId ? full.employeeId.toString() : full.employerId.toString();

  const normalizedAttachments = (params.attachments ?? []).map((a) => {
    if (!a.storageKey || !a.storageKey.startsWith(`${params.chatId}/`)) {
      throw new Error('Invalid attachment');
    }
    return {
      fileName: a.fileName,
      mimeType: a.mimeType,
      size: a.size,
      storageKey: a.storageKey,
    };
  });

  return persistMessage({
    chatId: params.chatId,
    senderId,
    receiverId,
    text: params.text,
    attachments: normalizedAttachments,
  });
}

export async function markChatRead(chatId: string, readerId: string) {
  const chat = (await Chat.findById(chatId).lean()) as IChat | null;
  if (!chat) return;
  const isEmployer = chat.employerId.toString() === readerId;
  const isEmployee = chat.employeeId.toString() === readerId;
  if (!isEmployer && !isEmployee) return;

  await Message.updateMany(
    { chatId: chat._id, receiverId: new mongoose.Types.ObjectId(readerId), isRead: false },
    { $set: { isRead: true, readAt: new Date(), updatedAt: new Date() } }
  );

  const reset = isEmployer ? { unreadCountEmployer: 0 } : { unreadCountEmployee: 0 };
  await Chat.findByIdAndUpdate(chatId, { $set: { ...reset, updatedAt: new Date() } });
}

export async function employerVacanciesWithApplicants(employerId: string) {
  const vacancies = await Vacancy.find({ employerId }).sort({ createdAt: -1 }).lean();
  const ids = vacancies.map((v) => v._id);
  const counts = await Response.aggregate([
    { $match: { vacancyId: { $in: ids } } },
    { $group: { _id: '$vacancyId', c: { $sum: 1 } } },
  ]);
  const map = new Map(counts.map((x) => [x._id.toString(), x.c]));
  return vacancies.map((v) => ({
    id: v._id.toString(),
    title: v.title,
    salaryMin: v.salaryMin,
    salaryMax: v.salaryMax,
    applicantCount: map.get(v._id.toString()) ?? 0,
    active: true,
  }));
}

export async function applicantsForVacancy(employerId: string, vacancyId: string) {
  const v = await Vacancy.findOne({ _id: vacancyId, employerId }).lean();
  if (!v) throw new Error('Vacancy not found');

  const responses = (await Response.find({ vacancyId })
    .populate('userId', 'name logoUrl')
    .populate('resumeId', 'title cvFile skills')
    .sort({ createdAt: -1 })
    .lean()) as any[];

  const out = [];
  for (const r of responses) {
    await ensureChatForResponseId(r._id.toString());
    const chat = (await Chat.findOne({
      employeeId: r.userId._id,
      vacancyId: v._id,
    })
      .populate('lastMessage', 'text createdAt')
      .lean()) as any;

    let lastPreview = '';
    let unread = 0;
    if (chat) {
      unread = chat.unreadCountEmployer ?? 0;
      if (chat.lastMessage?.text) {
        lastPreview = preview(decryptMessageTextFromStorage(chat.lastMessage.text));
      } else {
        lastPreview = chat.lastMessagePreview || '';
      }
    }

    out.push({
      applicationId: r._id.toString(),
      employee: {
        id: r.userId._id.toString(),
        name: r.userId.name,
        image: r.userId.logoUrl,
      },
      resume: r.resumeId
        ? {
            id: r.resumeId._id.toString(),
            title: r.resumeId.title,
            cvFile: r.resumeId.cvFile,
            skillsPreview: (r.resumeId.skills || '').slice(0, 160),
          }
        : null,
      status: r.status,
      appliedAt: r.createdAt,
      chatId: chat?._id?.toString() ?? null,
      lastMessagePreview: lastPreview,
      unreadCount: unread,
    });
  }
  return out;
}
