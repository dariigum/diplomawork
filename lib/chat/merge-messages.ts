import type { ChatMessageDTO } from '@/components/chat/message-bubble';

export function mergeChatMessages(
  existing: ChatMessageDTO[],
  incoming: ChatMessageDTO[],
): ChatMessageDTO[] {
  const map = new Map<string, ChatMessageDTO>();
  for (const m of existing) map.set(m.id, m);
  for (const m of incoming) map.set(m.id, m);
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function normalizeChatId(id: string | null | undefined): string {
  return id ? String(id) : '';
}

export function isSameChatId(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const left = normalizeChatId(a);
  const right = normalizeChatId(b);
  return left.length > 0 && left === right;
}
