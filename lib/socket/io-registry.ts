import type { Server } from 'socket.io';
import { publishSocketEventRemote } from '@/lib/socket/publish-remote';

const GLOBAL_KEY = '__JOBFLOW_SOCKET_IO__';

let moduleIo: Server | null = null;

function getIo(): Server | null {
  if (moduleIo) return moduleIo;
  const g = globalThis as Record<string, Server | undefined>;
  return g[GLOBAL_KEY] ?? null;
}

export function setSocketIoServer(server: Server | null) {
  moduleIo = server;
  const g = globalThis as Record<string, Server | undefined>;
  if (server) g[GLOBAL_KEY] = server;
  else delete g[GLOBAL_KEY];
}

export function emitChatEvent(chatId: string, event: string, payload: unknown) {
  getIo()?.to(`chat:${chatId}`).emit(event, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  getIo()?.to(`user:${userId}`).emit(event, payload);
}

type PublishNewMessageBody = {
  chatId: string;
  message: { receiverId: string; senderId: string };
  chatPatch: Record<string, unknown>;
  clientTempId?: string;
  notifyReceiver?: boolean;
};

export function emitNewMessageEvents(
  io: Server,
  chatId: string,
  message: { receiverId: string; senderId: string },
  chatPatch: Record<string, unknown>,
  clientTempId?: string,
  notifyReceiver = true,
) {
  const payload = { chatId, message, clientTempId };
  io.to(`chat:${chatId}`).emit('chat:new_message', payload);
  io.to(`user:${message.senderId}`).emit('chat:new_message', payload);
  if (notifyReceiver) {
    io.to(`user:${message.receiverId}`).emit('chat:new_message', payload);
  }
  io.to(`chat:${chatId}`).emit('chat:meta', { chatId, ...chatPatch });
}

export function publishNewMessage(
  chatId: string,
  message: { receiverId: string; senderId: string },
  chatPatch: Record<string, unknown>,
  clientTempId?: string,
  options?: { notifyReceiver?: boolean },
) {
  const notifyReceiver = options?.notifyReceiver !== false;
  const io = getIo();
  if (io) {
    emitNewMessageEvents(io, chatId, message, chatPatch, clientTempId, notifyReceiver);
    return;
  }

  void publishSocketEventRemote({
    type: 'new_message',
    chatId,
    message,
    chatPatch,
    clientTempId,
    notifyReceiver,
  });
}

export function publishChatRead(chatId: string, readerId: string) {
  const io = getIo();
  if (io) {
    const payload = { chatId, readerId };
    io.to(`chat:${chatId}`).emit('chat:read', payload);
    io.to(`user:${readerId}`).emit('chat:read', payload);
    return;
  }
  void publishSocketEventRemote({ type: 'read', chatId, readerId });
}
