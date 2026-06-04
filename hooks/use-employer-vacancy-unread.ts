'use client';

import { useCallback, useEffect, useState } from 'react';
import { useChatSocket } from '@/hooks/use-chat-socket';
import { CHAT_UNREAD_UPDATED_EVENT } from '@/lib/chat/chat-events';
import {
  aggregateUnreadByVacancy,
  totalUnreadFromMap,
  type EmployerChatListItem,
} from '@/lib/chat/employer-vacancy-unread';

export function useEmployerVacancyUnread() {
  const [byVacancy, setByVacancy] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const { socket, connected } = useChatSocket();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/chats', { cache: 'no-store', credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const chats = Array.isArray(data.chats) ? (data.chats as EmployerChatListItem[]) : [];
      setByVacancy(aggregateUnreadByVacancy(chats));
    } catch {
      /* keep previous counts */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpdate = () => void refresh();
    window.addEventListener(CHAT_UNREAD_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(CHAT_UNREAD_UPDATED_EVENT, onUpdate);
  }, [refresh]);

  useEffect(() => {
    if (!socket || !connected) return;
    const onUpdate = () => void refresh();
    socket.on('chat:new_message', onUpdate);
    socket.on('chat:read', onUpdate);
    socket.on('chat:meta', onUpdate);
    return () => {
      socket.off('chat:new_message', onUpdate);
      socket.off('chat:read', onUpdate);
      socket.off('chat:meta', onUpdate);
    };
  }, [socket, connected, refresh]);

  return {
    byVacancy,
    totalUnread: totalUnreadFromMap(byVacancy),
    loading,
    refresh,
  };
}
