export const CHAT_UNREAD_UPDATED_EVENT = 'chat-unread-updated';

export type ChatUnreadUpdatedDetail = {
  chatId?: string;
};

export function dispatchChatUnreadUpdated(chatId?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<ChatUnreadUpdatedDetail>(CHAT_UNREAD_UPDATED_EVENT, {
      detail: { chatId },
    }),
  );
}
