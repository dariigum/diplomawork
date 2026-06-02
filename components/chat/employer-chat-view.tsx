'use client';

import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { enUS, ru as ruLocale } from 'date-fns/locale';
import { MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useChatSocket } from '@/hooks/use-chat-socket';
import { MessageBubble, type ChatMessageDTO } from '@/components/chat/message-bubble';
import { MessageInput } from '@/components/chat/message-input';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { useI18n } from '@/lib/i18n/provider';
import {
  useEmployerDashboardNav,
  type PendingApplicant,
} from '@/components/dashboard/employer-dashboard-nav';
import { EmployerCandidateCardActions } from '@/components/dashboard/employer-candidate-card-actions';

type ChatDetail = {
  id: string;
  application: {
    id: string;
    status: string;
    createdAt: string;
    resume: { id: string; title: string; cvFile?: string; skillsPreview?: string } | null;
  } | null;
  vacancy: { id: string; title: string; description: string } | null;
  employee: { id: string; name: string } | null;
};

export function EmployerChatView({ currentUserId }: { currentUserId: string }) {
  const { t, locale } = useI18n();
  const dateFnsLocale = locale === 'ru' || locale === 'kk' ? ruLocale : enUS;
  const { pendingApplicant, setPendingApplicant } = useEmployerDashboardNav();
  const { connected, joinChat, leaveChat, socketRef } = useChatSocket();
  const searchParams = useSearchParams();

  const [activeApplicant, setActiveApplicant] = useState<PendingApplicant | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ChatDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [oldestId, setOldestId] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasRestoredRef = useRef(false);

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

  const openThread = useCallback(
    async (app: PendingApplicant) => {
      setActiveApplicant(app);
      let chatId = app.chatId;
      if (!chatId) {
        const res = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ applicationId: app.applicationId }),
        });
        const data = await res.json();
        chatId = data.chatId;
      }
      if (!chatId) return;

      if (selectedChatId && selectedChatId !== chatId) leaveChat(selectedChatId);
      setSelectedChatId(chatId);
      joinChat(chatId);

      const [dRes, mRes] = await Promise.all([
        fetch(`/api/chats/${chatId}`, { credentials: 'include' }),
        fetch(`/api/chats/${chatId}/messages`, { credentials: 'include' }),
      ]);
      const d = await dRes.json();
      const m = await mRes.json();
      setDetail(dRes.ok ? d : null);
      setMessages(m.messages || []);
      setHasMore(!!m.hasMore);
      setOldestId(m.oldestId || null);

      void fetch(`/api/chats/${chatId}/read`, { method: 'POST', credentials: 'include' });
      socketRef.current?.emit('chat:read', { chatId });

      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      });
    },
    [selectedChatId, joinChat, leaveChat, socketRef],
  );

  // Keep a stable ref to openThread to avoid stale closures in the pendingApplicant effect
  const openThreadRef = useRef(openThread);
  useEffect(() => {
    openThreadRef.current = openThread;
  }, [openThread]);

  // Restore a chat thread directly from a chatId (used when returning from Resume page)
  const restoreThread = useCallback(
    async (chatId: string) => {
      try {
        const [dRes, mRes] = await Promise.all([
          fetch(`/api/chats/${chatId}`, { credentials: 'include' }),
          fetch(`/api/chats/${chatId}/messages`, { credentials: 'include' }),
        ]);
        if (!dRes.ok) return; // fallback: invalid or inaccessible chat → show empty state

        const d: ChatDetail = await dRes.json();
        const m = await mRes.json();

        setSelectedChatId(chatId);
        joinChat(chatId);
        setDetail(d);
        setMessages(m.messages || []);
        setHasMore(!!m.hasMore);
        setOldestId(m.oldestId || null);

        // Reconstruct PendingApplicant from ChatDetail so the info card renders correctly
        setActiveApplicant({
          applicationId: d.application?.id ?? '',
          employee: {
            id: d.employee?.id ?? '',
            name: d.employee?.name ?? '',
            image: null,
          },
          resume: d.application?.resume
            ? {
                id: d.application.resume.id,
                title: d.application.resume.title,
                skillsPreview: d.application.resume.skillsPreview ?? '',
                cvFile: d.application.resume.cvFile,
                cvLink: undefined,
              }
            : null,
          status: d.application?.status ?? '',
          appliedAt: d.application?.createdAt ?? new Date().toISOString(),
          unreadCount: 0,
          chatId,
          match: null,
          overlapSkills: [],
        });

        void fetch(`/api/chats/${chatId}/read`, { method: 'POST', credentials: 'include' });
        socketRef.current?.emit('chat:read', { chatId });

        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        });
      } catch {
        // Silently fail — show empty chat state
      }
    },
    [joinChat, socketRef],
  );

  // On mount: if URL contains ?chatId=, restore that conversation
  useEffect(() => {
    if (hasRestoredRef.current) return;
    const urlChatId = searchParams.get('chatId');
    if (!urlChatId) return;
    hasRestoredRef.current = true;
    void restoreThread(urlChatId);
  }, [searchParams, restoreThread]);

  // When a candidate is selected from the Candidates tab, auto-open their thread
  useEffect(() => {
    if (!pendingApplicant) return;
    const app = pendingApplicant;
    setPendingApplicant(null);
    void openThreadRef.current(app);
  }, [pendingApplicant, setPendingApplicant]);

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      if (selectedChatId) leaveChat(selectedChatId);
    };
  }, [leaveChat, selectedChatId]);

  // Socket event handlers
  useEffect(() => {
    const s = socketRef.current;
    if (!s || !connected) return;

    const onNew = (payload: { chatId: string; message: ChatMessageDTO }) => {
      if (payload.chatId !== selectedChatId) return;
      setMessages((prev) => {
        if (prev.some((x) => x.id === payload.message.id)) return prev;
        return [...prev, payload.message];
      });
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      });
    };

    const onTyping = (p: { chatId: string; typing: boolean }) => {
      if (p.chatId === selectedChatId) setTyping(!!p.typing);
    };

    const onRead = (p: { chatId: string; readerId: string }) => {
      if (p.chatId !== selectedChatId) return;
      if (p.readerId === currentUserId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === currentUserId ? { ...m, isRead: true, readAt: new Date().toISOString() } : m,
        ),
      );
    };

    s.on('chat:new_message', onNew);
    s.on('chat:typing', onTyping);
    s.on('chat:read', onRead);

    return () => {
      s.off('chat:new_message', onNew);
      s.off('chat:typing', onTyping);
      s.off('chat:read', onRead);
    };
  }, [connected, currentUserId, selectedChatId, socketRef]);

  useEffect(() => {
    setTyping(false);
  }, [selectedChatId]);

  const peerName = activeApplicant?.employee.name || detail?.employee?.name || t.common.employee;
  const peerImage = activeApplicant?.employee.image;

  return (
    <div className="flex min-h-[480px] min-w-0 flex-col rounded-xl border border-border/60 bg-card/40">
      {/* Thread header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-2">
        <span className="truncate text-sm font-medium">{peerName}</span>
      </div>

      {/* Active applicant info card */}
      {selectedChatId && activeApplicant ? (
        <Card className="mx-2 mt-2 shrink-0 rounded-lg border border-border/60 bg-muted/30 p-3 shadow-none">
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">
                  {activeApplicant.resume?.title || t.chat.application}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.chat.applied}{' '}
                  {format(new Date(activeApplicant.appliedAt), 'd MMM yyyy', { locale: dateFnsLocale })}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {activeApplicant.status === 'ACCEPTED'
                  ? t.dashboard.accepted
                  : activeApplicant.status === 'REJECTED'
                  ? t.dashboard.rejected
                  : t.dashboard.pending}
              </Badge>
            </div>
            {activeApplicant.resume?.id ? (
              <EmployerCandidateCardActions
                resumeId={activeApplicant.resume.id}
                viewResumeLabel={t.dashboard.viewResume}
                returnTo={selectedChatId
                  ? `/dashboard/employer?tab=chat&chatId=${selectedChatId}`
                  : '/dashboard/employer?tab=chat'}
                className="mt-0"
              />
            ) : null}
            <p className="line-clamp-3 text-xs text-muted-foreground">
              {activeApplicant.resume?.skillsPreview}
            </p>
            {detail?.vacancy ? (
              <Button variant="link" size="sm" className="h-auto px-0 text-xs" asChild>
                <Link
                  href={`/jobs/${detail.vacancy.id}?from=${encodeURIComponent(
                    selectedChatId
                      ? `/dashboard/employer?tab=chat&chatId=${selectedChatId}`
                      : '/dashboard/employer?tab=chat'
                  )}`}
                >
                  {t.chat.vacancyLink}
                </Link>
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3"
      >
        {selectedChatId && activeApplicant ? (
          <>
            {hasMore && oldestId ? (
              <div className="mb-3 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => selectedChatId && void loadMessages(selectedChatId, oldestId)}
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
            <TypingIndicator visible={typing} label={t.chat.applicantIsTyping} />
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <MessageSquareText className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t.chat.selectCandidateToChat}</p>
          </div>
        )}
      </div>

      <MessageInput
        chatId={selectedChatId}
        disabled={!selectedChatId}
        socketRef={socketRef}
        onSent={() => {
          /* messages arrive via socket */
        }}
      />
    </div>
  );
}
