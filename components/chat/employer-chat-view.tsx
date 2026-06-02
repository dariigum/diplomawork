'use client';

import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, FileText, HelpCircle, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { useChatSocket } from '@/hooks/use-chat-socket';
import { MessageBubble, type ChatMessageDTO } from '@/components/chat/message-bubble';
import { MessageInput } from '@/components/chat/message-input';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/provider';
import type { Dictionary } from '@/lib/i18n/dictionaries';

const MAX_MATCHING_SKILLS = 5;

/** UI-only display names; does not change overlap or API data. */
const SKILL_DISPLAY_MAP: Record<string, string> = {
  typescript: 'TypeScript',
  ts: 'TypeScript',
  javascript: 'JavaScript',
  js: 'JavaScript',
  html: 'HTML',
  css: 'CSS',
  'node.js': 'Node.js',
  nodejs: 'Node.js',
  node: 'Node.js',
  'next.js': 'Next.js',
  nextjs: 'Next.js',
  react: 'React',
  reactjs: 'React',
  mongodb: 'MongoDB',
  mongo: 'MongoDB',
  vue: 'Vue.js',
  vuejs: 'Vue.js',
  angular: 'Angular',
  python: 'Python',
  java: 'Java',
  kotlin: 'Kotlin',
  swift: 'Swift',
  golang: 'Go',
  go: 'Go',
  rust: 'Rust',
  php: 'PHP',
  ruby: 'Ruby',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  k8s: 'Kubernetes',
  aws: 'AWS',
  azure: 'Azure',
  gcp: 'GCP',
  graphql: 'GraphQL',
  postgresql: 'PostgreSQL',
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  redis: 'Redis',
  tensorflow: 'TensorFlow',
  pytorch: 'PyTorch',
  figma: 'Figma',
  tailwind: 'Tailwind CSS',
  tailwindcss: 'Tailwind CSS',
  express: 'Express.js',
  'express.js': 'Express.js',
  nestjs: 'NestJS',
  'c#': 'C#',
  csharp: 'C#',
  'c++': 'C++',
  cpp: 'C++',
};

function skillLookupKeys(raw: string): string[] {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  const compact = lower.replace(/\s+/g, '');
  const dotted = lower.replace(/\s+/g, '.');
  return [lower, compact, dotted];
}

function toTitleCaseSkill(raw: string): string {
  return raw
    .split(/([\s,/|]+)/)
    .map((part) => {
      if (!part || /^[\s,/|]+$/.test(part)) return part;
      if (part.length <= 4 && part === part.toUpperCase()) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('');
}

function formatSkillDisplayName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  for (const key of skillLookupKeys(trimmed)) {
    const mapped = SKILL_DISPLAY_MAP[key];
    if (mapped) return mapped;
  }
  return toTitleCaseSkill(trimmed);
}

type ApplicantFitLevel = 'Strong Fit' | 'Related' | 'Exploratory';

function fitLevelLabel(level: ApplicantFitLevel, dict: Dictionary): string {
  if (level === 'Strong Fit') return dict.dashboard.matchFitStrong;
  if (level === 'Related') return dict.dashboard.matchFitRelated;
  return dict.dashboard.matchFitExploratory;
}

function fitBadgeClassName(level: ApplicantFitLevel): string {
  if (level === 'Strong Fit') return 'border-emerald-500/40 text-emerald-700 dark:text-emerald-400';
  if (level === 'Related') return 'border-amber-500/40 text-amber-800 dark:text-amber-400';
  return 'border-border text-muted-foreground';
}

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
  match?: { semanticScore: number; matchScore: number; fitLevel: ApplicantFitLevel } | null;
  overlapSkills?: string[];
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
  const [rankError, setRankError] = useState<string | null>(null);
  const [rankedApplicantsTotal, setRankedApplicantsTotal] = useState<number | null>(null);

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
    setRankError(null);
    setRankedApplicantsTotal(null);
    try {
      // Prefer AI-ranked applicants (falls back to plain applicants on errors).
      const rankedRes = await fetch(`/api/employer/vacancies/${vid}/ranked-applicants`, { credentials: 'include' });
      if (rankedRes.ok) {
        const data = await rankedRes.json();
        const rows = Array.isArray(data.candidates) ? data.candidates : [];
        const total = Number(data?.vacancy?.applicantsTotal ?? rows.length);
        setRankedApplicantsTotal(Number.isFinite(total) ? total : rows.length);
        setApplicants(
          rows.map((c: any) => ({
            applicationId: String(c.applicationId ?? ''),
            employee: {
              id: String(c.employee?.id ?? ''),
              name: String(c.employee?.name ?? ''),
              image: c.employee?.image ?? null,
            },
            resume: c.resume
              ? {
                  id: String(c.resume.id ?? ''),
                  title: String(c.resume.title ?? ''),
                  cvFile: typeof c.resume.cvFile === 'string' ? c.resume.cvFile : undefined,
                  skillsPreview: String(c.resume.skillsPreview ?? ''),
                }
              : null,
            status: String(c.status ?? ''),
            appliedAt: String(c.appliedAt ?? ''),
            chatId: c.chat?.id ? String(c.chat.id) : null,
            lastMessagePreview: String(c.chat?.lastMessagePreview ?? ''),
            unreadCount: Number(c.chat?.unreadCount ?? 0),
            match: c.match
              ? {
                  semanticScore: Number(c.match.semanticScore ?? 0),
                  matchScore: Number(c.match.matchScore ?? 0),
                  fitLevel: c.match.fitLevel as any,
                }
              : null,
            overlapSkills: Array.isArray(c.overlapSkills) ? c.overlapSkills : [],
          }))
        );
        return;
      }

      const fallback = await fetch(`/api/employer/vacancies/${vid}/applicants`, { credentials: 'include' });
      const data = await fallback.json();
      setApplicants(data.applicants || []);
      setRankError(t.chat.rankErrorUnavailable)
    } finally {
      setLoadingApp(false);
    }
  }, [t]);

  const pickVacancy = (vid: string) => {
    setVacancyId(vid);
    setRankedApplicantsTotal(null);
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

  const rankingSummary = React.useMemo(() => {
    if (rankError) return null;
    let strongFit = 0;
    let related = 0;
    let exploratory = 0;
    for (const a of applicants) {
      const level = a.match?.fitLevel;
      if (level === 'Strong Fit') strongFit += 1;
      else if (level === 'Related') related += 1;
      else if (level === 'Exploratory') exploratory += 1;
    }
    if (strongFit + related + exploratory === 0) return null;
    return {
      total: applicants.length,
      strongFit,
      related,
      exploratory,
    };
  }, [applicants, rankError]);

  const applicantsTotalForHeader =
    rankedApplicantsTotal ??
    (vacancyId ? vacancies.find((x) => x.id === vacancyId)?.applicantCount : undefined) ??
    applicants.length;

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
            <>
              <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                <p className="text-xs font-semibold leading-snug text-foreground">
                  {t.chat.aiRankedApplicants}{' '}
                  <span className="font-medium text-muted-foreground">
                    {t.chat.aiRankedApplicantsCount.replace('{count}', String(applicantsTotalForHeader))}
                  </span>
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {t.chat.rankedApplicantsDescription}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {rankError ? rankError : t.chat.aiRankedExplanation}
                </p>
                {rankingSummary ? (
                  <div className="mt-2.5 space-y-2 border-t border-border/50 pt-2.5">
                    <div className="flex items-start gap-2">
                      <p className="text-[11px] font-semibold tracking-tight text-foreground">{t.chat.aiAnalysis}</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <p>
                              {t.dashboard.matchFitStrong}: 80–100%
                            </p>
                            <p>
                              {t.dashboard.matchFitRelated}: 60–79%
                            </p>
                            <p>
                              {t.dashboard.matchFitExploratory}: 0–59%
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div>
                      <Badge variant="secondary" className="text-[10px] font-medium">
                        {t.chat.rankingSummaryApplicants}: {rankingSummary.total}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge
                        variant="outline"
                        className="border-emerald-500/40 bg-emerald-500/5 text-[10px] font-medium text-emerald-800 dark:text-emerald-400"
                      >
                        {t.chat.rankingSummaryStrongFit}: {rankingSummary.strongFit}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-amber-500/40 bg-amber-500/5 text-[10px] font-medium text-amber-900 dark:text-amber-400"
                      >
                        {t.chat.rankingSummaryRelated}: {rankingSummary.related}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-medium text-muted-foreground"
                      >
                        {t.chat.rankingSummaryExploratory}: {rankingSummary.exploratory}
                      </Badge>
                    </div>
                  </div>
                ) : null}
              </div>
              {applicants.map((a, index) => {
                const rank = index + 1;
                const matchingSkills = (a.overlapSkills ?? []).slice(0, MAX_MATCHING_SKILLS);
                const fitLevel = a.match?.fitLevel;

                return (
                  <button
                    key={a.applicationId}
                    type="button"
                    onClick={() => void openThread(a)}
                    className={cn(
                      'mb-2 block w-full rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted/60',
                      activeApplicant?.applicationId === a.applicationId
                        ? 'border-primary/50 bg-muted/50'
                        : 'border-border/60 bg-card/30'
                    )}
                  >
                    <div className="mb-1.5 flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-foreground">
                        <span className="mr-1.5 tabular-nums text-muted-foreground">#{rank}</span>
                        <span className="truncate">{a.employee.name}</span>
                      </p>
                      {a.unreadCount > 0 ? (
                        <Badge className="shrink-0 text-[10px]">{a.unreadCount}</Badge>
                      ) : null}
                    </div>

                    {a.match && fitLevel ? (
                      <div className="mb-2.5 rounded-md border border-border/50 bg-muted/35 px-2.5 py-2">
                        <p className="text-xl font-bold leading-none tracking-tight text-primary tabular-nums">
                          {a.match.matchScore}%
                          <span className="ml-1.5 text-xs font-semibold tracking-wide text-primary/75">
                            {t.chat.matchPercentLabel}
                          </span>
                        </p>
                        <Badge
                          variant="outline"
                          className={cn('mt-2 text-[10px] font-medium', fitBadgeClassName(fitLevel))}
                        >
                          {fitLevelLabel(fitLevel, t)}
                        </Badge>
                      </div>
                    ) : (
                      <div className="mb-2.5 rounded-md border border-border/30 bg-muted/25 px-2.5 py-2">
                        <p className="text-[11px] font-medium text-muted-foreground">{t.chat.notRanked}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground/90">
                          {t.chat.resumeEmbeddingUnavailable}
                        </p>
                      </div>
                    )}

                    {matchingSkills.length > 0 ? (
                      <div className="mb-2">
                        <p className="mb-1 text-[11px] font-medium text-foreground">{t.chat.matchingSkills}</p>
                        <ul className="space-y-0.5 text-[11px] text-muted-foreground">
                          {matchingSkills.map((skill) => (
                            <li key={skill} className="flex gap-1.5">
                              <span className="shrink-0 text-muted-foreground/80">•</span>
                              <span className="min-w-0 truncate">{formatSkillDisplayName(skill)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <p className="truncate border-t border-border/40 pt-1.5 text-[11px] text-muted-foreground">
                      {a.lastMessagePreview || '—'}
                    </p>
                  </button>
                );
              })}
            </>
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
            <MessageSquareText className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t.chat.selectApplicantToStartChat}</p>
          </div>
        )}
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
