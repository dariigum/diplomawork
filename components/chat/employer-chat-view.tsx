'use client';

import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, FileText, User } from 'lucide-react';
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

type VacancyRow = {
  id: string;
  title: string;
  salaryMin: number;
  salaryMax: number;
  applicantCount: number;
  active: boolean;
};

type ApplicantRow = {
  applicationId: string;
  employee: { id: string; name: string; image?: string | null };
  resume: { id: string; title: string; cvFile?: string; skillsPreview: string } | null;
  status: string;
  appliedAt: string;
  chatId: string | null;
  lastMessagePreview: string;
  unreadCount: number;
};

type ChatDetail = {
  id: string;
  application: { id: string; status: string; createdAt: string; resume: { title: string; cvFile?: string } | null } | null;
  vacancy: { id: string; title: string; description: string } | null;
  employee: { id: string; name: string } | null;
};

export function EmployerChatView({ currentUserId }: { currentUserId: string }) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const { connected, joinChat, leaveChat, socketRef } = useChatSocket();

  const [vacancies, setVacancies] = useState<VacancyRow[]>([]);
  const [loadingVac, setLoadingVac] = useState(true);
  const [vacancyId, setVacancyId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<ApplicantRow[]>([]);
  const [loadingApp, setLoadingApp] = useState(false);

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [activeApplicant, setActiveApplicant] = useState<ApplicantRow | null>(null);
  const [detail, setDetail] = useState<ChatDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [oldestId, setOldestId] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadVacancies = useCallback(async () => {
    setLoadingVac(true);
    try {
      const res = await fetch('/api/employer/vacancies-summary', { credentials: 'include' });
      const data = await res.json();
      setVacancies(data.vacancies || []);
    } finally {
      setLoadingVac(false);
    }
  }, []);

  useEffect(() => {
    void loadVacancies();
  }, [loadVacancies]);

  const loadApplicants = useCallback(async (vid: string) => {
    setLoadingApp(true);
    try {
      const res = await fetch(`/api/employer/vacancies/${vid}/applicants`, { credentials: 'include' });
      const data = await res.json();
      setApplicants(data.applicants || []);
    } finally {
      setLoadingApp(false);
    }
  }, []);

  const pickVacancy = (vid: string) => {
    setVacancyId(vid);
    void loadApplicants(vid);
    if (isMobile) setStep(1);
  };

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
    async (app: ApplicantRow) => {
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
        if (vacancyId) void loadApplicants(vacancyId);
      }
      if (!chatId) return;

      if (selectedChatId && selectedChatId !== chatId) leaveChat(selectedChatId);
      setSelectedChatId(chatId);
      joinChat(chatId);
      if (isMobile) setStep(2);

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
    [isMobile, joinChat, leaveChat, loadApplicants, selectedChatId, socketRef, vacancyId]
  );

  useEffect(() => {
    return () => {
      if (selectedChatId) leaveChat(selectedChatId);
    };
  }, [leaveChat, selectedChatId]);

  useEffect(() => {
    const s = socketRef.current;
    if (!s || !connected) return;

    const onNew = (payload: { chatId: string; message: ChatMessageDTO }) => {
      if (payload.chatId !== selectedChatId) {
        void loadVacancies();
        if (vacancyId) void loadApplicants(vacancyId);
        return;
      }
      setMessages((prev) => {
        if (prev.some((x) => x.id === payload.message.id)) return prev;
        return [...prev, payload.message];
      });
      void loadVacancies();
      if (vacancyId) void loadApplicants(vacancyId);
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
          m.senderId === currentUserId ? { ...m, isRead: true, readAt: new Date().toISOString() } : m
        )
      );
    };

    const onMeta = () => {
      void loadVacancies();
      if (vacancyId) void loadApplicants(vacancyId);
    };

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
  }, [connected, currentUserId, loadApplicants, loadVacancies, selectedChatId, socketRef, vacancyId]);

  useEffect(() => {
    setTyping(false);
  }, [selectedChatId]);

  const peerName = activeApplicant?.employee.name || detail?.employee?.name || t.common.employee;
  const peerImage = activeApplicant?.employee.image;

  const colVacancies = (
    <div className="flex h-full min-w-0 min-h-0 flex-col rounded-xl border border-border/60 bg-card/40">
      <div className="border-b border-border/60 px-3 py-2 text-sm font-medium">{t.chat.vacancies}</div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">
          {loadingVac ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          ) : vacancies.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">{t.dashboard.noVacanciesYet}</p>
          ) : (
            vacancies.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => pickVacancy(v.id)}
                className={cn(
                  'mb-2 block w-full rounded-lg border px-3 py-2 text-left hover:bg-muted/60 overflow-hidden',
                  vacancyId === v.id ? 'border-primary/50 bg-muted/50' : 'border-transparent'
                )}
              >
                <p className="truncate w-full font-medium mb-1">{v.title}</p>
                <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {v.applicantCount} {v.applicantCount === 1 ? t.dashboard.applicant : t.dashboard.applicants}
                  </span>
                  {v.active ? <Badge variant="outline">{t.chat.active}</Badge> : null}
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const colApplicants = (
    <div className="flex h-full min-w-0 min-h-0 flex-col rounded-xl border border-border/60 bg-card/40">
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-2 py-2">
        {isMobile ? (
          <Button variant="ghost" size="icon" type="button" onClick={() => setStep(0)}>
            <ArrowLeft className="size-4" />
          </Button>
        ) : null}
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-sm font-medium">{t.chat.applicants}</p>
          <p className="truncate text-xs text-muted-foreground">
            {vacancies.find((x) => x.id === vacancyId)?.title || t.chat.selectVacancy}
          </p>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">
          {!vacancyId ? (
            <p className="p-4 text-center text-sm text-muted-foreground">{t.chat.chooseVacancy}</p>
          ) : loadingApp ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : applicants.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">{t.chat.noApplicationsYet}</p>
          ) : (
            applicants.map((a) => (
              <button
                key={a.applicationId}
                type="button"
                onClick={() => void openThread(a)}
                className={cn(
                  'mb-2 block w-full rounded-lg border px-3 py-2 text-left hover:bg-muted/60 overflow-hidden',
                  activeApplicant?.applicationId === a.applicationId ? 'border-primary/50 bg-muted/50' : 'border-transparent'
                )}
              >
                <div className="flex w-full items-start justify-between gap-2 mb-1">
                  <span className="flex min-w-0 items-center gap-2 truncate font-medium">
                    <User className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{a.employee.name}</span>
                  </span>
                  {a.unreadCount > 0 ? (
                    <Badge className="shrink-0 text-[10px]">{a.unreadCount}</Badge>
                  ) : null}
                </div>
                <p className="truncate text-xs text-muted-foreground mb-1">{a.resume?.title || t.dashboard.resume}</p>
                <p className="truncate text-xs">{a.lastMessagePreview || '—'}</p>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const colThread = (
    <div className="flex h-full min-w-0 min-h-0 flex-col rounded-xl border border-border/60 bg-card/40">
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-2 py-2">
        {isMobile ? (
          <Button variant="ghost" size="icon" type="button" onClick={() => setStep(1)}>
            <ArrowLeft className="size-4" />
          </Button>
        ) : null}
        <span className="truncate text-sm font-medium">{peerName}</span>
      </div>

      {selectedChatId && activeApplicant ? (
        <Card className="mx-2 mt-2 shrink-0 rounded-lg border border-border/60 bg-muted/30 p-3 shadow-none">
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{activeApplicant.resume?.title || t.chat.application}</p>
                <p className="text-xs text-muted-foreground">
                  {t.chat.applied} {format(new Date(activeApplicant.appliedAt), 'MMM d, yyyy')}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {activeApplicant.status}
              </Badge>
            </div>
            {activeApplicant.resume?.cvFile ? (
              <Button variant="outline" size="sm" className="w-fit gap-2" asChild>
                <a href={activeApplicant.resume.cvFile} target="_blank" rel="noopener noreferrer">
                  <FileText className="size-3.5" />
                  {t.dashboard.resume}
                </a>
              </Button>
            ) : null}
            <p className="line-clamp-3 text-xs text-muted-foreground">{activeApplicant.resume?.skillsPreview}</p>
            {detail?.vacancy ? (
              <Button variant="link" size="sm" className="h-auto px-0 text-xs" asChild>
                <Link href={`/jobs/${detail.vacancy.id}`}>{t.chat.vacancyLink}</Link>
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
        {selectedChatId && hasMore && oldestId ? (
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
      </div>

      <MessageInput
        chatId={selectedChatId}
        disabled={!selectedChatId}
        socketRef={socketRef}
        onSent={() => {
          void loadVacancies();
          if (vacancyId) void loadApplicants(vacancyId);
        }}
      />
    </div>
  );

  if (isMobile) {
    return (
      <div className="h-full min-h-[420px] min-w-0">
        {step === 0 ? colVacancies : null}
        {step === 1 ? colApplicants : null}
        {step === 2 ? colThread : null}
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-[420px] min-w-0 grid-cols-[350px_minmax(220px,280px)_1fr] gap-2 md:gap-3">
      {colVacancies}
      {colApplicants}
      {colThread}
    </div>
  );
}
