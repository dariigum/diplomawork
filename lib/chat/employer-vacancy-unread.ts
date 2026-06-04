export type EmployerChatListItem = {
  unreadCount?: number;
  vacancy?: { id?: string | null } | null;
};

/** Sum unread employer chat messages per vacancy (same source as header notifications). */
export function aggregateUnreadByVacancy(
  chats: EmployerChatListItem[],
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const chat of chats) {
    const vacancyId = chat.vacancy?.id;
    const unread = Number(chat.unreadCount ?? 0);
    if (!vacancyId || unread <= 0) continue;
    map[vacancyId] = (map[vacancyId] ?? 0) + unread;
  }
  return map;
}

export function totalUnreadFromMap(byVacancy: Record<string, number>): number {
  return Object.values(byVacancy).reduce((sum, n) => sum + n, 0);
}
