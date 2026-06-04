'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { ChatMessageDTO } from '@/components/chat/message-bubble';
import { mergeChatMessages } from '@/lib/chat/merge-messages';

type UseChatLiveSyncOptions = {
  chatId: string | null;
  enabled: boolean;
  messages: ChatMessageDTO[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessageDTO[]>>;
  onPeerActivity?: () => void;
  /** Faster when socket is down; slower backup when socket is up */
  socketConnected?: boolean;
};

/**
 * Polls for messages newer than the latest in state — guarantees live UI even if Socket.IO misses an event.
 */
export function useChatLiveSync({
  chatId,
  enabled,
  messages,
  setMessages,
  onPeerActivity,
  socketConnected = false,
}: UseChatLiveSyncOptions) {
  const lastMessageIdRef = useRef<string | null>(null);
  const onPeerRef = useRef(onPeerActivity);
  onPeerRef.current = onPeerActivity;

  useEffect(() => {
    const last = messages.length > 0 ? messages[messages.length - 1]?.id : null;
    lastMessageIdRef.current = last ?? null;
  }, [messages]);

  const pollNewMessages = useCallback(async () => {
    if (!chatId || !enabled) return;
    const after = lastMessageIdRef.current;
    if (!after) return;

    try {
      const res = await fetch(
        `/api/chats/${chatId}/messages?after=${encodeURIComponent(after)}`,
        { credentials: 'include', cache: 'no-store' },
      );
      if (!res.ok) return;
      const data = await res.json();
      const incoming = (data.messages || []) as ChatMessageDTO[];
      if (incoming.length === 0) return;

      setMessages((prev) => mergeChatMessages(prev, incoming));
      lastMessageIdRef.current = incoming[incoming.length - 1]?.id ?? after;
      onPeerRef.current?.();
    } catch {
      /* ignore transient network errors */
    }
  }, [chatId, enabled, setMessages]);

  useEffect(() => {
    if (!chatId || !enabled) return;

    const intervalMs = socketConnected ? 4000 : 1500;
    const id = window.setInterval(() => void pollNewMessages(), intervalMs);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void pollNewMessages();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [chatId, enabled, pollNewMessages, socketConnected]);

  return { pollNow: pollNewMessages };
}
