'use client';

import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Briefcase, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { useChatSocket } from '@/hooks/use-chat-socket';
import { MessageBubble, type ChatMessageDTO } from '@/components/chat/message-bubble';
import { MessageInput } from '@/components/chat/message-input';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/provider';

type ChatListItem = {
  id: string;
  vacancy: { id: string; title: string; salaryMin?: number; salaryMax?: number };
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
  otherUser: { id: string; name: string; image?: string | null };
};

type ChatDetail = {
  id: string;
  application: { id: string; status: string; createdAt: string; resume: { title: string; cvFile?: string } | null } | null;
  vacancy: { id: string; title: string; description: string } | null;
  employer: { id: string; name: string; logoUrl?: string } | null;
};

export function EmployeeChatView({ currentUserId }: { currentUserId: string }) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [mobile, setMobile] = useState<'list' | 'thread'>('list');
  const { connected, joinChat, leaveChat, socketRef } = useChatSocket();

  const [loadingList, setLoadingList] = useState(true);
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ChatDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [oldestId, setOldestId] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadChats = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/chats', { credentials: 'include' });
      const data = await res.json();
      setChats(data.chats || []);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  const loadMessages = useCallback(async (chatId: string, before?: string) => {
    const qs = before ? `?before=${encodeURIComponent(before)}` : '';
    const res = await fetch(`/api/chats/${chatId}/messages${qs}`, { credentials: 'include' });
    const data = await res.json();
    if (before) {
      setMessages((prev) => [...(data.messages || []), ...prev]);
    } else {
      setMessages(data.messages || []);
    }
    setHasMore(!!data.hasMore);
    setOldestId(data.oldestId || null);
  }, []);

  const selectChat = useCallback(
    async (id: string) => {
      if (selectedId && selectedId !== id) leaveChat(selectedId);
      setSelectedId(id);
      joinChat(id);
      if (isMobile) setMobile('thread');
      const [dRes, mRes] = await Promise.all([
        fetch(`/api/chats/${id}`, { credentials: 'include' }),
        fetch(`/api/chats/${id}/messages`, { credentials: 'include' }),
      ]);
      const d = await dRes.json();
      const m = await mRes.json();
      setDetail(dRes.ok ? d : null);
      setMessages(m.messages || []);
      setHasMore(!!m.hasMore);
      setOldestId(m.oldestId || null);
      void fetch(`/api/chats/${id}/read`, { method: 'POST', credentials: 'include' });
      void socketRef.current?.emit('chat:read', { chatId: id });
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      });
    },
    [isMobile, joinChat, leaveChat, selectedId, socketRef]
  );

  useEffect(() => {
    return () => {
      if (selectedId) leaveChat(selectedId);
    };
  }, [leaveChat, selectedId]);

  useEffect(() => {
    const s = socketRef.current;
    if (!s || !connected) return;

    const onNew = (payload: { chatId: string; message: ChatMessageDTO }) => {
      if (payload.chatId !== selectedId) {
        void loadChats();
        return;
      }
      setMessages((prev) => {
        if (prev.some((x) => x.id === payload.message.id)) return prev;
        return [...prev, payload.message];
      });
      void loadChats();
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      });
    };

    const onTyping = (p: { chatId: string; typing: boolean }) => {
      if (p.chatId === selectedId) setTyping(!!p.typing);
    };

    const onRead = (p: { chatId: string; readerId: string }) => {
      if (p.chatId !== selectedId) return;
      if (p.readerId === currentUserId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === currentUserId ? { ...m, isRead: true, readAt: new Date().toISOString() } : m
        )
      );
    };

    const onMeta = () => void loadChats();

    s.on('chat:new_message', onNew);
    s.on('chat:typing', onTyping);
    s.on('chat:read', onRead);
    s.on('chat:meta', onMeta);

    return () => {
      s.off('chat:new_message', onNew);
      s.off('chat:typing', onTyping);
      s.off('chat:read', onRead);
      s.off('chat:meta', onMeta);
    };
  }, [connected, currentUserId, loadChats, selectedId, socketRef]);

  useEffect(() => {
    if (!selectedId) return;
    setTyping(false);
  }, [selectedId]);

  const peerName = detail?.employer?.name || t.common.employer;
  const peerImage = detail?.employer?.logoUrl;

  const listColumn = (
    <div className="flex h-full min-w-0 min-h-0 flex-col rounded-xl border border-border/60 bg-card/40">
      <div className="border-b border-border/60 px-3 py-2 text-sm font-medium">{t.chat.employers}</div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">
          {loadingList ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : chats.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <MessageSquare className="mx-auto mb-2 size-8 opacity-40" />
              {t.chat.noConversationsYet}
            </div>
          ) : (
            chats.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => void selectChat(c.id)}
                className={cn(
                  'mb-2 block w-full rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted/60 overflow-hidden',
                  selectedId === c.id ? 'border-primary/50 bg-muted/50' : 'border-transparent'
                )}
              >
                <div className="flex w-full items-start justify-between gap-2 mb-1">
                  <span className="truncate font-medium">{c.otherUser.name || t.common.employer}</span>
                  {c.unreadCount > 0 ? (
                    <Badge variant="default" className="shrink-0 text-[10px]">
                      {c.unreadCount}
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-xs text-muted-foreground mb-1">{c.vacancy.title}</p>
                <p className="truncate text-xs mb-1">{c.lastMessagePreview || '—'}</p>
                <p className="text-[10px] text-muted-foreground">
                  {c.lastMessageAt
                    ? formatDistanceToNow(new Date(c.lastMessageAt), { addSuffix: true })
                    : ''}
                </p>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const threadColumn = (
    <div className="flex h-full min-w-0 min-h-0 flex-col rounded-xl border border-border/60 bg-card/40">
      {isMobile ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-2 py-2">
          <Button variant="ghost" size="icon" type="button" onClick={() => setMobile('list')}>
            <ArrowLeft className="size-4" />
          </Button>
          <span className="truncate text-sm font-medium">{peerName}</span>
        </div>
      ) : null}

      {selectedId && detail ? (
        <Card className="mx-2 mt-2 shrink-0 rounded-lg border border-border/60 bg-muted/30 p-3 shadow-none">
          <div className="flex items-start gap-3">
            <Briefcase className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm font-semibold">{detail.vacancy?.title}</p>
              <p className="text-xs text-muted-foreground">{detail.employer?.name || t.common.employer}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {detail.application?.status && detail.application.status !== 'PENDING' ? (
                  <Badge variant="secondary" className="text-[10px]">
                    {detail.application.status}
                  </Badge>
                ) : null}
                {detail.vacancy ? (
                  <Button variant="link" size="sm" className="h-auto px-0 text-xs" asChild>
                    <Link href={`/jobs/${detail.vacancy.id}`}>{t.chat.openVacancy}</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
        {selectedId && hasMore && oldestId ? (
          <div className="mb-3 flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadMessages(selectedId, oldestId)}
            >
              {t.chat.loadOlder}
            </Button>
          </div>
        ) : null}
        <div className="flex flex-col gap-3">
          {messages.map((m, idx) => {
            const prev = messages[idx - 1];
            const showAvatar = !prev || prev.senderId !== m.senderId;
            return (
              <MessageBubble
                key={m.id}
                message={m}
                isSelf={m.senderId === currentUserId}
                showAvatar={showAvatar}
                peerName={peerName}
                peerImage={peerImage}
              />
            );
          })}
        </div>
        <TypingIndicator visible={typing} label={t.chat.employerIsTyping} />
      </div>

      <MessageInput
        chatId={selectedId}
        disabled={false}
        socketRef={socketRef}
        onSent={() => void loadChats()}
      />
    </div>
  );

  if (isMobile) {
    return (
      <div className="h-full min-h-[420px] min-w-0">
        {mobile === 'list' ? (
          <div className="h-full min-w-0">{listColumn}</div>
        ) : (
          <div className="h-full min-w-0">{threadColumn}</div>
        )}
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-[420px] min-w-0 grid-cols-[350px_1fr] gap-3">
      {listColumn}
      {threadColumn}
    </div>
  );
}
