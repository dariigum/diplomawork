import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { Response, User, Resume, SavedVacancy } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { EmployeeDashboardAiPreview } from "@/components/recommendations/employee-dashboard-ai-preview";
import { EmployeeBehaviourAnalyticsDashboard } from "@/components/recommendations/employee-behaviour-analytics-dashboard";
import { ProfileChatDashboardShell } from "@/components/dashboard/profile-chat-dashboard-shell";
import { EmployeeProfileSection } from "./employee-profile-section";
import { EmployeeChatView } from "@/components/chat/employee-chat-view";
import { ensureActiveResumeForUser, getActiveResumeLeanForUser } from "@/lib/active-resume";
import { buildBehaviourAnalytics } from "@/lib/behaviour-analytics";
import { cookies } from "next/headers";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

export default async function EmployeeDashboard() {
  const session = await getSession();
  if (!session || session.user.role !== "EMPLOYEE") return null;

  await dbConnect();
  await ensureActiveResumeForUser(session.user.id);

  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const t = getDictionary(locale as "en" | "ru" | "kz");

  const userData = await User.findById(session.user.id);
  const userResumes = await Resume.find({ userId: session.user.id });
  const savedVacanciesRecords = (await SavedVacancy.find({ userId: session.user.id })
    .populate("vacancyId")
    .lean()) as Array<{ vacancyId?: { _id: { toString(): string }; title: string; salaryMin: number; salaryMax: number } | null }>;
  const userResponses = (await Response.find({ userId: session.user.id })
    .populate("vacancyId", "title salaryMin salaryMax")
    .populate("resumeId", "title")
    .sort({ createdAt: -1 })
    .lean()) as Array<{
    _id: { toString(): string };
    status: string;
    vacancyId?: { title: string; salaryMin: number; salaryMax: number } | null;
    resumeId?: { title?: string } | null;
  }>;

  const activeResumeLean = (await getActiveResumeLeanForUser(session.user.id)) as { embedding?: number[] } | null;
  const hasResume = !!activeResumeLean;
  const embeddingIndexed =
    !!activeResumeLean?.embedding &&
    Array.isArray(activeResumeLean.embedding) &&
    activeResumeLean.embedding.length > 0;
  const behaviourAnalytics = await buildBehaviourAnalytics(session.user.id);

  const resumes = userResumes.map((r) => ({
    id: r.id,
    title: r.title,
    skills: r.skills,
    cvFile: r.cvFile || undefined,
  }));

  const savedVacancies = savedVacanciesRecords
    .map((record) => {
      const v = record.vacancyId;
      if (!v) return null;
      return {
        id: v._id.toString(),
        title: v.title,
        salaryMin: v.salaryMin,
        salaryMax: v.salaryMax,
      };
    })
    .filter(Boolean) as { id: string; title: string; salaryMin: number; salaryMax: number }[];

  const responses = userResponses
    .map((response) => {
      const vacancy = response.vacancyId;
      if (!vacancy) return null;
      return {
        id: response._id.toString(),
        status: response.status,
        vacancyTitle: vacancy.title,
        salaryMin: vacancy.salaryMin,
        salaryMax: vacancy.salaryMax,
        resumeTitle: response.resumeId?.title ?? null,
      };
    })
    .filter(Boolean) as {
    id: string;
    status: string;
    vacancyTitle: string;
    salaryMin: number;
    salaryMax: number;
    resumeTitle: string | null;
  }[];

  return (
    <ProfileChatDashboardShell
      profileTitle={`${t.common.employee} Dashboard`}
      subtitle={`${t.common.employer} / ${t.common.employee} Dashboard`}
      profile={
        <div className="space-y-10">
          <section className="space-y-3" aria-labelledby="dash-ai-heading">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    AI-powered workspace
                  </span>
                </div>
                <h2 id="dash-ai-heading" className="text-lg font-semibold tracking-tight">
                  Semantic matches
                </h2>
              </div>
              <Button variant="outline" size="sm" asChild className="shrink-0 rounded-full">
                <Link href="/dashboard/employee/recommendations">Open full match list</Link>
              </Button>
            </div>
            <EmployeeDashboardAiPreview serverHints={{ hasResume, embeddingIndexed }} />
          </section>

          <section className="space-y-3 border-t border-border/60 pt-6" aria-labelledby="dash-behaviour-analytics-heading">
            <h2
              id="dash-behaviour-analytics-heading"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Behaviour analytics
            </h2>
            <EmployeeBehaviourAnalyticsDashboard snapshot={behaviourAnalytics} variant="full" />
          </section>

          <section className="space-y-4 border-t border-border/60 pt-6">
            <EmployeeProfileSection
              userName={userData?.name || ""}
              userEmail={userData?.email || ""}
              resumes={resumes}
              savedVacancies={savedVacancies}
              responses={responses}
            />
          </section>
        </div>
      }
      chat={<EmployeeChatView currentUserId={session.user.id} />}
    />
  );
}
