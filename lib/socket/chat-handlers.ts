import type { Server, Socket } from 'socket.io';
import cookie from 'cookie';
import dbConnect from '@/lib/db/mongoose';
import { Chat } from '@/lib/db/schema';
import { verifySessionJwt } from '@/lib/socket/verify-session';
import {
  assertUserCanAccessChat,
  markChatRead,
  sendMessageFromUser,
  verifyApplicationOwnsChat,
} from '@/lib/chat/chat-service';
import { publishChatRead, publishNewMessage } from '@/lib/socket/io-registry';
import { createSlidingWindowRateLimiter } from '@/lib/chat/rate-limit';

const msgLimit = createSlidingWindowRateLimiter({ windowMs: 60_000, max: 45 });
const typingLimit = createSlidingWindowRateLimiter({ windowMs: 10_000, max: 80 });

export function attachChatSocketHandlers(io: Server) {
  io.use(async (socket, next) => {
    try {
      const raw = socket.handshake.headers.cookie;
      const parsed = cookie.parse(raw || '');
      let tok = parsed.session;
      const authToken = socket.handshake.auth?.token;
      if (!tok && typeof authToken === 'string') {
        tok = authToken;
      }
      if (!tok) return next(new Error('Unauthorized'));
      tok = tok.trim();
      const sess = await verifySessionJwt(tok);
      if (!sess?.user) return next(new Error('Unauthorized'));
      (socket.data as any).userId = sess.user.id;
      (socket.data as any).role = sess.user.role;
      (socket.data as any).chatRooms = new Set<string>();
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const uid = (socket.data as any).userId as string;
    const role = (socket.data as any).role as 'EMPLOYEE' | 'EMPLOYER';
    const rooms = (socket.data as any).chatRooms as Set<string>;

    socket.join(`user:${uid}`);

    socket.on(
      'chat:join',
      async (payload: { chatId: string }, cb?: (r: { ok: boolean; error?: string }) => void) => {
        try {
          const chatId = payload?.chatId;
          if (!chatId) throw new Error('bad_request');
          await dbConnect();
          await assertUserCanAccessChat({ id: uid, role }, chatId);
          const full = await Chat.findById(chatId).lean();
          if (!full) throw new Error('forbidden');
          socket.join(`chat:${chatId}`);
          rooms.add(chatId);
          socket.to(`chat:${chatId}`).emit('chat:presence', { chatId, state: 'online' });
          cb?.({ ok: true });
        } catch (e: any) {
          cb?.({ ok: false, error: e?.message || 'error' });
        }
      }
    );

    socket.on('chat:leave', (payload: { chatId: string }) => {
      const chatId = payload?.chatId;
      if (!chatId) return;
      socket.leave(`chat:${chatId}`);
      rooms.delete(chatId);
      socket.to(`chat:${chatId}`).emit('chat:presence', { chatId, state: 'offline' });
    });

    socket.on('chat:typing', (payload: { chatId: string; typing: boolean }) => {
      if (!typingLimit(uid)) return;
      const chatId = payload?.chatId;
      if (!chatId) return;
      socket.to(`chat:${chatId}`).emit('chat:typing', { chatId, typing: !!payload?.typing });
    });

    socket.on(
      'chat:send',
      async (
        payload: {
          chatId: string;
          text?: string;
          attachments?: { storageKey: string; fileName: string; mimeType: string; size: number }[];
          clientTempId?: string;
        },
        cb?: (r: { ok: boolean; error?: string; message?: unknown }) => void
      ) => {
        try {
          if (!msgLimit(uid)) {
            cb?.({ ok: false, error: 'rate_limited' });
            return;
          }
          const chatId = payload?.chatId;
          if (!chatId) {
            cb?.({ ok: false, error: 'bad_request' });
            return;
          }
          await dbConnect();
          const { message, chatPatch, notifyReceiver } = await sendMessageFromUser({
            user: { id: uid, role },
            chatId,
            text: typeof payload.text === 'string' ? payload.text : '',
            attachments: payload.attachments,
          });
          publishNewMessage(chatId, message, chatPatch, payload.clientTempId, { notifyReceiver });
          cb?.({ ok: true, message });
        } catch (e: any) {
          cb?.({ ok: false, error: e?.message || 'error' });
        }
      }
    );

    socket.on('chat:read', async (payload: { chatId: string }, cb?: (r: { ok: boolean; error?: string }) => void) => {
      try {
        const chatId = payload?.chatId;
        if (!chatId) throw new Error('bad_request');
        await dbConnect();
        await assertUserCanAccessChat({ id: uid, role }, chatId);
        const full = await Chat.findById(chatId).lean();
        if (!full) throw new Error('forbidden');
        await markChatRead(chatId, uid);
        publishChatRead(chatId, uid);
        cb?.({ ok: true });
      } catch (e: any) {
        cb?.({ ok: false, error: e?.message || 'error' });
      }
    });

    socket.on('disconnect', () => {
      for (const chatId of rooms) {
        socket.to(`chat:${chatId}`).emit('chat:presence', { chatId, state: 'offline' });
      }
    });
  });
}
