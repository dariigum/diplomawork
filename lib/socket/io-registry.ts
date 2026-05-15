import type { Server } from 'socket.io';

let io: Server | null = null;

export function setSocketIoServer(server: Server | null) {
  io = server;
}

export function emitChatEvent(chatId: string, event: string, payload: unknown) {
  io?.to(`chat:${chatId}`).emit(event, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function publishNewMessage(
  chatId: string,
  message: { receiverId: string },
  chatPatch: Record<string, unknown>,
  clientTempId?: string
) {
  emitChatEvent(chatId, 'chat:new_message', { chatId, message, clientTempId });
  emitToUser(message.receiverId, 'chat:new_message', { chatId, message, clientTempId });
  emitChatEvent(chatId, 'chat:meta', { chatId, ...chatPatch });
}

export function publishChatRead(chatId: string, readerId: string) {
  emitChatEvent(chatId, 'chat:read', { chatId, readerId });
}
