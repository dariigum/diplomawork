'use client'

import { useEffect, useEffectEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, MessageSquareText, User2, Users } from 'lucide-react';
import {
  getEmployerChatDataAction,
  markConversationReadAction,
  sendChatMessageAction,
} from '@/app/actions/chat';
import { logoutAction } from '@/app/actions/auth';
import { updateEmployerProfileAction } from '@/app/actions/employer';
import { ChatMessagePane } from '@/components/dashboard/chat-message-pane';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { EmployerChatPayload } from '@/lib/chat-types';
import { formatSalaryRange } from '@/lib/format-salary';
import { emitNotificationsUpdated } from '@/lib/notifications-events';
import { toast } from 'sonner';

interface EmployerVacancyCard {
  id: string;
  title: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string;
  responsesCount: number;
}

interface EmployerDashboardClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    location: string;
    website: string;
    description: string;
  };
  vacancies: EmployerVacancyCard[];
  initialTab: 'profile' | 'chat';
  initialVacancyId: string | null;
  initialResponseId: string | null;
  viewerRole: 'EMPLOYEE' | 'EMPLOYER' | 'ADMIN';
}

function applicantMatchPercentClass(percent: number): string {
  if (percent > 75) return 'text-green-600';
  if (percent >= 50) return 'text-amber-600';
  return 'text-red-600';
}

export function EmployerDashboardClient({
  user,
  vacancies,
  initialTab,
  initialVacancyId,
  initialResponseId,
  viewerRole,
}: EmployerDashboardClientProps) {
  const isEmployer = viewerRole === 'EMPLOYER';
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'chat'>(initialTab);
  const [chatData, setChatData] = useState<EmployerChatPayload>({
    vacancies: [],
    applicants: [],
    selectedVacancyId: null,
    selectedResponseId: null,
    messages: [],
  });
  const [isChatLoading, setIsChatLoading] = useState(initialTab === 'chat');
  const [isSending, setIsSending] = useState(false);
  const [hasLoadedChat, setHasLoadedChat] = useState(false);

  const loadChat = useEffectEvent(async (vacancyId?: string | null, responseId?: string | null) => {
    setIsChatLoading(true);

    try {
      const payload = await getEmployerChatDataAction(
        vacancyId || undefined,
        responseId || undefined
      );

      setChatData(payload);
      setHasLoadedChat(true);

      if (payload.selectedResponseId) {
        await markConversationReadAction(payload.selectedResponseId);
        setChatData((current) => ({
          ...current,
          selectedVacancyId: payload.selectedVacancyId,
          selectedResponseId: payload.selectedResponseId,
          vacancies: payload.vacancies,
          applicants: payload.applicants.map((applicant) =>
            applicant.responseId === payload.selectedResponseId
              ? { ...applicant, unreadCount: 0 }
              : applicant
          ),
          messages: payload.messages,
        }));
        emitNotificationsUpdated();
      }
    } catch (error) {
      toast.error('Failed to load recruiter chat.');
    } finally {
      setIsChatLoading(false);
    }
  });

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (activeTab !== 'chat') return;
    if (hasLoadedChat && !initialVacancyId && !initialResponseId) return;

    loadChat(initialVacancyId, initialResponseId);
  }, [activeTab, hasLoadedChat, initialResponseId, initialVacancyId, loadChat]);

  const pollSelectedConversation = useEffectEvent(async () => {
    if (activeTab !== 'chat') return;
    await loadChat(chatData.selectedVacancyId, chatData.selectedResponseId);
  });

  useEffect(() => {
    if (activeTab !== 'chat' || !hasLoadedChat) return;

    const intervalId = window.setInterval(() => {
      void pollSelectedConversation();
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [activeTab, hasLoadedChat, pollSelectedConversation]);

  const handleTabChange = (value: string) => {
    const nextTab = value === 'chat' ? 'chat' : 'profile';
    setActiveTab(nextTab);

    if (nextTab === 'chat' && !hasLoadedChat) {
      void loadChat(initialVacancyId, initialResponseId);
    }
  };

  const handleVacancySelect = async (vacancyId: string) => {
    await loadChat(vacancyId, null);
  };

  const handleApplicantSelect = async (responseId: string) => {
    await loadChat(chatData.selectedVacancyId, responseId);
  };

  const handleCloseChat = () => {
    setActiveTab('profile');
    router.replace('/dashboard/employer', { scroll: false });
  };

  const handleSendMessage = async (content: string) => {
    if (!chatData.selectedResponseId) return;

    setIsSending(true);
    try {
      const result = await sendChatMessageAction(chatData.selectedResponseId, content);
      if (result?.error) {
        toast.error(result.error);
        throw new Error(result.error);
      }

      await loadChat(chatData.selectedVacancyId, chatData.selectedResponseId);
    } finally {
      setIsSending(false);
    }
  };

  const selectedVacancy = chatData.vacancies.find(
    (vacancy) => vacancy.vacancyId === chatData.selectedVacancyId
  );
  const selectedApplicant = chatData.applicants.find(
    (applicant) => applicant.responseId === chatData.selectedResponseId
  );

  const sortedApplicants = [...chatData.applicants].sort(
    (a, b) => b.matchPercent - a.matchPercent
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employer Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Update your company profile, manage vacancies, and message applicants.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="h-11 rounded-xl p-1">
          <TabsTrigger value="profile" className="gap-2 rounded-lg px-4">
            <User2 className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2 rounded-lg px-4">
            <MessageSquareText className="h-4 w-4" />
            Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Company Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form action={updateEmployerProfileAction} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="companyName" className="text-sm font-medium">
                      Company Name
                    </label>
                    <Input id="companyName" name="companyName" defaultValue={user.name} required />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="location" className="text-sm font-medium">
                      Company Location
                    </label>
                    <Input
                      id="location"
                      name="location"
                      defaultValue={user.location}
                      placeholder="Almaty, Kazakhstan"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="website" className="text-sm font-medium">
                      Website
                    </label>
                    <Input
                      id="website"
                      name="website"
                      type="url"
                      defaultValue={user.website}
                      placeholder="https://company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="description" className="text-sm font-medium">
                      Company Description
                    </label>
                    <Textarea
                      id="description"
                      name="description"
                      rows={5}
                      defaultValue={user.description}
                      placeholder="Describe what your company does and what kind of work it offers."
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                  <Button type="submit" variant="outline">
                    Save Profile
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>My Vacancies</CardTitle>
                <Button size="sm" asChild>
                  <Link href="/dashboard/employer/vacancy/new">Post Vacancy</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {vacancies.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">No vacancies posted yet.</p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {vacancies.map((vacancy) => (
                      <li key={vacancy.id} className="flex flex-col gap-2 rounded-lg border p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{vacancy.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatSalaryRange(
                                vacancy.salaryMin,
                                vacancy.salaryMax,
                                vacancy.salaryCurrency
                              )}
                            </p>
                          </div>
                          <Button variant="secondary" size="sm" disabled>
                            Edit
                          </Button>
                        </div>
                        <div className="mt-2 flex items-center justify-between border-t pt-2">
                          <span className="rounded bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                            {vacancy.responsesCount} responses
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end border-t border-border pt-6">
            <form action={logoutAction}>
              <Button variant="outline" type="submit">
                Logout
              </Button>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="chat" className="mt-0">
          <div className="w-full max-w-none">
            <div className="h-[calc(100dvh-11rem)] min-h-[40rem] overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:h-[calc(100dvh-13rem)]">
              <div className="grid h-full min-h-0 grid-rows-[minmax(22rem,46dvh)_1px_minmax(0,1fr)] md:grid-cols-[18rem_1px_20rem_1px_minmax(0,1fr)] md:grid-rows-1">
                <div className="grid min-h-0 grid-cols-1 sm:grid-cols-2 md:contents">
                  <div className="flex min-h-0 flex-col bg-card">
                    <div className="border-b border-border px-4 py-4">
                      <h2 className="font-semibold text-foreground">Vacancies</h2>
                      <p className="text-sm text-muted-foreground">
                        Choose one of your vacancies to review applicants.
                      </p>
                    </div>

                    <ScrollArea className="min-h-0 flex-1">
                      <div className="space-y-2 p-3">
                        {chatData.vacancies.length === 0 && !isChatLoading ? (
                          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                            No vacancy conversations yet.
                          </div>
                        ) : (
                          chatData.vacancies.map((vacancy) => {
                            const isActive = vacancy.vacancyId === chatData.selectedVacancyId;

                            return (
                              <button
                                key={vacancy.vacancyId}
                                type="button"
                                onClick={() => void handleVacancySelect(vacancy.vacancyId)}
                                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                                  isActive
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/40 hover:bg-muted/30'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate font-medium text-foreground">
                                      {vacancy.title}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {vacancy.salaryLabel}
                                    </p>
                                  </div>
                                  {vacancy.unreadCount > 0 && (
                                    <Badge className="rounded-full px-2">{vacancy.unreadCount}</Badge>
                                  )}
                                </div>
                                <p className="mt-3 text-sm text-muted-foreground">
                                  {vacancy.applicantsCount} applicants
                                </p>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  <Separator orientation="vertical" className="hidden md:block" />

                  <div className="flex min-h-0 flex-col border-t border-border bg-card sm:border-l sm:border-t-0 md:border-l-0">
                    <div className="border-b border-border px-4 py-4">
                      <h2 className="font-semibold text-foreground">Applicants</h2>
                      <p className="text-sm text-muted-foreground">
                        Open a candidate to continue the conversation.
                      </p>
                    </div>

                    <ScrollArea className="min-h-0 flex-1">
                      <div className="space-y-2 p-3">
                        {sortedApplicants.length === 0 && !isChatLoading ? (
                          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                            No applicants for this vacancy yet.
                          </div>
                        ) : (
                          sortedApplicants.map((applicant) => {
                            const isActive = applicant.responseId === chatData.selectedResponseId;

                            return (
                              <button
                                key={applicant.responseId}
                                type="button"
                                onClick={() => void handleApplicantSelect(applicant.responseId)}
                                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                                  isActive
                                    ? 'border-primary bg-primary/5 hover:bg-primary/10'
                                    : 'border-border hover:border-primary/40 hover:bg-muted/40'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                      <p className="truncate font-medium text-foreground">
                                        {applicant.employeeName}
                                      </p>
                                      {isEmployer && applicant.matchPercent >= 80 && (
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded shrink-0">
                                          ⭐ Top match
                                        </span>
                                      )}
                                    </div>
                                    {isEmployer && (
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-sm text-muted-foreground">Match:</span>
                                        <span
                                          className={`text-lg font-semibold ${applicantMatchPercentClass(
                                            applicant.matchPercent
                                          )}`}
                                        >
                                          {applicant.matchPercent}%
                                        </span>
                                        <span className="text-xs text-muted-foreground">(AI)</span>
                                      </div>
                                    )}
                                    {isEmployer && applicant.matchedSkills?.length > 0 && (
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        Matches: {applicant.matchedSkills.join(', ')}
                                      </p>
                                    )}
                                    {isEmployer && (applicant.matchedSkills?.length ?? 0) === 0 && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Limited skill match
                                      </p>
                                    )}
                                    <p className="mt-1 truncate text-xs text-muted-foreground">
                                      {applicant.employeeEmail}
                                    </p>
                                  </div>
                                  {applicant.unreadCount > 0 && (
                                    <Badge className="rounded-full px-2">{applicant.unreadCount}</Badge>
                                  )}
                                </div>
                                <p className="mt-3 text-sm text-muted-foreground">
                                  {applicant.resumeTitle}
                                </p>
                                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                                  {applicant.latestMessagePreview || 'No messages yet.'}
                                </p>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>

                <Separator orientation="horizontal" className="md:hidden" />
                <Separator orientation="vertical" className="hidden md:block" />

                <ChatMessagePane
                conversationKey={chatData.selectedResponseId}
                currentUserId={user.id}
                header={
                  selectedVacancy && selectedApplicant ? (
                    <div className="space-y-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-foreground">
                              {selectedVacancy.title}
                            </h3>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {selectedVacancy.salaryLabel}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/jobs/${selectedVacancy.vacancyId}`}>Details</Link>
                        </Button>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/20 p-3 transition-colors hover:bg-muted/40">
                        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                          <Users className="h-4 w-4 shrink-0 text-primary" />
                          <span>{selectedApplicant.employeeName}</span>
                          {isEmployer && selectedApplicant.matchPercent >= 80 && (
                            <span className="text-xs font-normal bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              ⭐ Top match
                            </span>
                          )}
                        </div>
                        {isEmployer && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-muted-foreground">Match:</span>
                            <span
                              className={`text-lg font-semibold ${applicantMatchPercentClass(
                                selectedApplicant.matchPercent
                              )}`}
                            >
                              {selectedApplicant.matchPercent}%
                            </span>
                            <span className="text-xs text-muted-foreground">(AI)</span>
                          </div>
                        )}
                        {isEmployer && selectedApplicant.matchedSkills?.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Matches: {selectedApplicant.matchedSkills.join(', ')}
                          </p>
                        )}
                        {isEmployer && (selectedApplicant.matchedSkills?.length ?? 0) === 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Limited skill match
                          </p>
                        )}
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedApplicant.employeeEmail}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{selectedApplicant.resumeTitle}</Badge>
                          <Badge variant="outline">{selectedApplicant.status}</Badge>
                        </div>
                      </div>
                    </div>
                  ) : null
                }
                messages={chatData.messages}
                isLoading={isChatLoading}
                isSending={isSending}
                onSendMessage={handleSendMessage}
                emptyTitle="Choose a vacancy and applicant"
                emptyDescription="Select one of your vacancies and an applicant from the list to open the encrypted chat."
                onClose={handleCloseChat}
              />
            </div>
          </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
