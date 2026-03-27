'use client'

import { useEffect, useEffectEvent, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Briefcase, Heart, MessageSquareText, User2 } from 'lucide-react';
import {
  getEmployeeChatDataAction,
  markConversationReadAction,
  sendChatMessageAction,
} from '@/app/actions/chat';
import { logoutAction } from '@/app/actions/auth';
import {
  deleteEmployeeAccountAction,
  deleteResumeAction,
  updateEmployeeProfileAction,
  withdrawEmployeeResponseAction,
} from '@/app/actions/employee';
import { ChatMessagePane } from '@/components/dashboard/chat-message-pane';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { EmployeeChatPayload } from '@/lib/chat-types';
import { formatSalaryRange } from '@/lib/format-salary';
import { emitNotificationsUpdated } from '@/lib/notifications-events';
import { toast } from 'sonner';

interface EmployeeResumeCard {
  id: string;
  title: string;
  skills: string;
  cvFile: string;
}

interface EmployeeSavedVacancyCard {
  id: string;
  title: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string;
}

interface EmployeeResponseCard {
  id: string;
  status: string;
  vacancyId: string;
  vacancyTitle: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string;
  resumeTitle: string;
}

interface EmployeeDashboardClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    username: string;
  };
  resumes: EmployeeResumeCard[];
  savedVacancies: EmployeeSavedVacancyCard[];
  responses: EmployeeResponseCard[];
  initialTab: 'profile' | 'chat';
  initialResponseId: string | null;
}

export function EmployeeDashboardClient({
  user,
  resumes,
  savedVacancies,
  responses,
  initialTab,
  initialResponseId,
}: EmployeeDashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'chat'>(initialTab);
  const [profileForm, setProfileForm] = useState({
    name: user.name,
    email: user.email,
    username: user.username,
  });
  const [chatData, setChatData] = useState<EmployeeChatPayload>({
    threads: [],
    selectedResponseId: null,
    messages: [],
  });
  const [isChatLoading, setIsChatLoading] = useState(initialTab === 'chat');
  const [isSending, setIsSending] = useState(false);
  const [hasLoadedChat, setHasLoadedChat] = useState(false);
  const [isProfilePending, startProfileTransition] = useTransition();
  const [isWithdrawPending, startWithdrawTransition] = useTransition();
  const [withdrawingResponseId, setWithdrawingResponseId] = useState<string | null>(null);

  useEffect(() => {
    setProfileForm({
      name: user.name,
      email: user.email,
      username: user.username,
    });
  }, [user.email, user.name, user.username]);

  const loadChat = useEffectEvent(async (targetResponseId?: string | null) => {
    setIsChatLoading(true);

    try {
      const payload = await getEmployeeChatDataAction(targetResponseId || undefined);
      setChatData(payload);
      setHasLoadedChat(true);

      if (payload.selectedResponseId) {
        await markConversationReadAction(payload.selectedResponseId);
        setChatData((current) => ({
          ...current,
          selectedResponseId: payload.selectedResponseId,
          threads: payload.threads.map((thread) =>
            thread.responseId === payload.selectedResponseId
              ? { ...thread, unreadCount: 0 }
              : thread
          ),
          messages: payload.messages,
        }));
        emitNotificationsUpdated();
      }
    } catch (error) {
      toast.error('Failed to load chat.');
    } finally {
      setIsChatLoading(false);
    }
  });

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (activeTab !== 'chat') return;
    if (hasLoadedChat && !initialResponseId) return;

    loadChat(initialResponseId);
  }, [activeTab, hasLoadedChat, initialResponseId, loadChat]);

  const pollActiveThread = useEffectEvent(async () => {
    if (activeTab !== 'chat') return;
    await loadChat(chatData.selectedResponseId || initialResponseId);
  });

  useEffect(() => {
    if (activeTab !== 'chat' || !hasLoadedChat) return;

    const intervalId = window.setInterval(() => {
      void pollActiveThread();
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [activeTab, hasLoadedChat, pollActiveThread]);

  const handleTabChange = (value: string) => {
    const nextTab = value === 'chat' ? 'chat' : 'profile';
    setActiveTab(nextTab);

    if (nextTab === 'chat' && !hasLoadedChat) {
      void loadChat(initialResponseId);
    }
  };

  const handleThreadSelect = async (responseId: string) => {
    await loadChat(responseId);
  };

  const handleCloseChat = () => {
    setActiveTab('profile');
    router.replace('/dashboard/employee', { scroll: false });
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

      await loadChat(chatData.selectedResponseId);
    } finally {
      setIsSending(false);
    }
  };

  const handleProfileSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startProfileTransition(async () => {
      const formData = new FormData();
      formData.append('name', profileForm.name);
      formData.append('email', profileForm.email);
      formData.append('username', profileForm.username);

      const result = await updateEmployeeProfileAction(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Profile updated.');
      router.refresh();
    });
  };

  const handleWithdrawResponse = (responseId: string) => {
    setWithdrawingResponseId(responseId);

    startWithdrawTransition(async () => {
      const formData = new FormData();
      formData.append('responseId', responseId);

      const result = await withdrawEmployeeResponseAction(formData);
      setWithdrawingResponseId(null);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      emitNotificationsUpdated();
      toast.success('Application withdrawn.');
      router.refresh();
    });
  };

  const selectedThread = chatData.threads.find(
    (thread) => thread.responseId === chatData.selectedResponseId
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employee Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage your profile, resumes, responses, and recruiter conversations.
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
                <CardTitle>My Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="employee-name" className="text-sm font-medium text-foreground">
                      Full Name
                    </label>
                    <Input
                      id="employee-name"
                      value={profileForm.name}
                      onChange={(event) =>
                        setProfileForm((current) => ({ ...current, name: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="employee-email" className="text-sm font-medium text-foreground">
                      Email
                    </label>
                    <Input
                      id="employee-email"
                      type="email"
                      value={profileForm.email}
                      onChange={(event) =>
                        setProfileForm((current) => ({ ...current, email: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="employee-username" className="text-sm font-medium text-foreground">
                      Username
                    </label>
                    <Input
                      id="employee-username"
                      value={profileForm.username}
                      onChange={(event) =>
                        setProfileForm((current) => ({ ...current, username: event.target.value }))
                      }
                      placeholder="your_username"
                    />
                    <p className="text-xs text-muted-foreground">
                      You can use this username instead of email when signing in.
                    </p>
                  </div>
                  <Button type="submit" variant="outline" disabled={isProfilePending}>
                    {isProfilePending ? 'Saving...' : 'Save Profile'}
                  </Button>
                </form>
                <form action={deleteEmployeeAccountAction}>
                  <Button variant="destructive" type="submit">
                    Delete Account
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>My Resumes</CardTitle>
                <Button size="sm" asChild>
                  <Link href="/dashboard/employee/resume/new">Add Resume</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {resumes.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">No resumes created yet.</p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {resumes.map((resume) => (
                      <li
                        key={resume.id}
                        className="flex items-center justify-between gap-3 rounded-lg border p-4"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium leading-none">{resume.title}</p>
                          <p className="mt-2 truncate text-sm text-muted-foreground">
                            {resume.skills}
                          </p>
                          {resume.cvFile && (
                            <p className="mt-2 text-xs">
                              <a
                                href={resume.cvFile}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                View CV (PDF)
                              </a>
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button variant="secondary" size="sm" asChild>
                            <Link href={`/dashboard/employee/resume/${resume.id}`}>Edit</Link>
                          </Button>
                          <form action={deleteResumeAction}>
                            <input type="hidden" name="id" value={resume.id} />
                            <Button variant="destructive" size="sm" type="submit">
                              Delete
                            </Button>
                          </form>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Saved Vacancies</CardTitle>
              </CardHeader>
              <CardContent>
                {savedVacancies.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">No saved vacancies.</p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {savedVacancies.map((vacancy) => (
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
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/jobs/${vacancy.id}`}>View</Link>
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Responses</CardTitle>
              </CardHeader>
              <CardContent>
                {responses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    You haven&apos;t applied to any jobs yet.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {responses.map((response) => (
                      <li key={response.id} className="space-y-2 rounded-lg border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{response.vacancyTitle}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatSalaryRange(
                                response.salaryMin,
                                response.salaryMax,
                                response.salaryCurrency
                              )}
                            </p>
                          </div>
                          <span className="rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                            {response.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Resume: {response.resumeTitle || 'Custom resume'}
                        </p>
                        <div className="flex items-center gap-2 pt-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/jobs/${response.vacancyId}`}>Open vacancy</Link>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            type="button"
                            disabled={isWithdrawPending && withdrawingResponseId === response.id}
                            onClick={() => handleWithdrawResponse(response.id)}
                          >
                            {isWithdrawPending && withdrawingResponseId === response.id
                              ? 'Withdrawing...'
                              : 'Withdraw'}
                          </Button>
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
            <div className="h-[calc(100dvh-11rem)] min-h-[36rem] overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:h-[calc(100dvh-13rem)]">
              <div className="grid h-full min-h-0 grid-rows-[minmax(18rem,42dvh)_1px_minmax(0,1fr)] md:grid-cols-[21rem_1px_minmax(0,1fr)] md:grid-rows-1">
                <div className="flex min-h-0 flex-col bg-card">
                  <div className="border-b border-border px-4 py-4">
                    <h2 className="font-semibold text-foreground">Applied Vacancies</h2>
                    <p className="text-sm text-muted-foreground">
                      Open a vacancy to chat with its employer.
                    </p>
                  </div>

                  <ScrollArea className="min-h-0 flex-1">
                    <div className="space-y-2 p-3">
                      {chatData.threads.length === 0 && !isChatLoading ? (
                        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                          You do not have any active job conversations yet.
                        </div>
                      ) : (
                        chatData.threads.map((thread) => {
                          const isActive = thread.responseId === chatData.selectedResponseId;

                          return (
                            <button
                              key={thread.responseId}
                              type="button"
                              onClick={() => void handleThreadSelect(thread.responseId)}
                              className={`w-full rounded-xl border p-4 text-left transition-colors ${
                                isActive
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/40 hover:bg-muted/30'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-foreground">
                                    {thread.vacancyTitle}
                                  </p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {thread.companyName}
                                  </p>
                                </div>
                                {thread.unreadCount > 0 && (
                                  <Badge className="rounded-full px-2">{thread.unreadCount}</Badge>
                                )}
                              </div>
                              <p className="mt-2 text-xs text-muted-foreground">{thread.salaryLabel}</p>
                              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                                {thread.latestMessagePreview || 'No messages yet.'}
                              </p>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </div>

              <Separator orientation="horizontal" className="md:hidden" />
              <Separator orientation="vertical" className="hidden md:block" />

              <ChatMessagePane
                conversationKey={chatData.selectedResponseId}
                currentUserId={user.id}
                header={
                  selectedThread ? (
                    <div className="space-y-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-foreground">
                              {selectedThread.vacancyTitle}
                            </h3>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {selectedThread.companyName} · {selectedThread.salaryLabel}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/jobs/${selectedThread.vacancyId}`}>Details</Link>
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{selectedThread.status}</Badge>
                        <span className="text-xs text-muted-foreground">
                          Messages are encrypted before being stored on the server.
                        </span>
                      </div>
                    </div>
                  ) : null
                }
                messages={chatData.messages}
                isLoading={isChatLoading}
                isSending={isSending}
                onSendMessage={handleSendMessage}
                emptyTitle="Choose a vacancy"
                emptyDescription="Select one of your submitted applications to start chatting with the employer."
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
