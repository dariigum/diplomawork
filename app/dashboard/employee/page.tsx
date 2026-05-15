import Link from "next/link";
import { Sparkles, BrainCircuit } from "lucide-react";
import { getSession } from "@/lib/auth";
import { formatVacancySalary } from "@/lib/format-vacancy-salary";
import { parseSafeExternalUrl } from "@/lib/vacancy-detail-display";
import dbConnect from "@/lib/db/mongoose";
import { Response, User, Resume, SavedVacancy } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmployeeDashboardAiPreview } from "@/components/recommendations/employee-dashboard-ai-preview";
import { EmployeeBehaviourAnalyticsDashboard } from "@/components/recommendations/employee-behaviour-analytics-dashboard";
import { deleteEmployeeAccountAction, deleteResumeAction, setActiveResumeForAiAction } from "@/app/actions/employee";
import { ensureActiveResumeForUser, getActiveResumeLeanForUser } from "@/lib/active-resume";
import { buildBehaviourAnalytics } from "@/lib/behaviour-analytics";

export const dynamic = "force-dynamic";

export default async function EmployeeDashboard() {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYEE') return null;

  await dbConnect();
  await ensureActiveResumeForUser(session.user.id);
  const userData = await User.findById(session.user.id);
  const userResumes = await Resume.find({ userId: session.user.id }).sort({ activeForAi: -1, createdAt: -1 });
  const savedVacanciesRecords = await SavedVacancy.find({ userId: session.user.id }).populate('vacancyId').lean() as any[];
  const userResponses = await Response.find({ userId: session.user.id })
    .populate('vacancyId', 'title salaryMin salaryMax')
    .populate('resumeId', 'title')
    .sort({ createdAt: -1 })
    .lean() as any[];

  const activeResumeLean = (await getActiveResumeLeanForUser(session.user.id)) as { embedding?: number[] } | null;

  const hasResume = !!activeResumeLean;
  const embeddingIndexed =
    !!activeResumeLean?.embedding &&
    Array.isArray(activeResumeLean.embedding) &&
    activeResumeLean.embedding.length > 0;

  const behaviourAnalytics = await buildBehaviourAnalytics(session.user.id);

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-10 px-4 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              AI-powered workspace
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Career workspace</h1>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Semantic job matching sits up front; manage your profile, resumes, and applications below.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          asChild
          className="shrink-0 rounded-full border-primary/25 bg-gradient-to-br from-background to-primary/[0.04] shadow-sm hover:shadow-md transition-shadow"
        >
          <Link href="/dashboard/employee/recommendations">Open full match list</Link>
        </Button>
      </div>

      <section className="space-y-3" aria-labelledby="dash-ai-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="dash-ai-heading" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Semantic matches
          </h2>
        </div>
        <EmployeeDashboardAiPreview serverHints={{ hasResume, embeddingIndexed }} />
      </section>

      <section className="space-y-3 pt-2 border-t border-border/60" aria-labelledby="dash-behaviour-analytics-heading">
        <h2 id="dash-behaviour-analytics-heading" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Behaviour analytics
        </h2>
        <EmployeeBehaviourAnalyticsDashboard snapshot={behaviourAnalytics} variant="full" />
      </section>

      <section className="space-y-4 pt-4 border-t border-border/60">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile & resumes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <Card className="border-border/70 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{userData?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{userData?.email}</p>
            </div>
            {/* Profile editor component will be added later */}
            <Button variant="outline">Edit Profile</Button>
            <form action={deleteEmployeeAccountAction}>
              <Button variant="destructive" type="submit">Delete Account</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>My Resumes</CardTitle>
            <Button size="sm" asChild><Link href="/dashboard/employee/resume/new">Add Resume</Link></Button>
          </CardHeader>
          <CardContent>
            {userResumes.length === 0 ? (
              <p className="text-muted-foreground text-sm mt-4">No resumes created yet.</p>
            ) : (
              <ul className="space-y-4 mt-4">
                {userResumes.map((r) => {
                  const isAiActive = !!(r as { activeForAi?: boolean }).activeForAi;
                  const cvFileLink = parseSafeExternalUrl(r.cvFile);
                  return (
                  <li key={r.id} className="border border-border/60 p-4 rounded-xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 transition-colors duration-200 hover:border-primary/20 hover:bg-muted/20">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 gap-y-1">
                        <p className="font-medium leading-none truncate">{r.title}</p>
                        {isAiActive ? (
                          <Badge className="rounded-full shrink-0 gap-1 border-primary/30 bg-primary/15 text-primary text-[0.65rem]">
                            <BrainCircuit className="h-3 w-3" />
                            AI profile active
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 truncate">{r.skills}</p>
                      {!isAiActive ? (
                        <p className="text-xs text-muted-foreground mt-1.5">Not used for semantic job matching until you activate it.</p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1.5">Currently used for AI recommendations and embeddings.</p>
                      )}
                      {cvFileLink ? (
                        <p className="mt-2 text-xs">
                          <a href={cvFileLink.href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View CV (PDF)</a>
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {!isAiActive ? (
                        <form action={setActiveResumeForAiAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <Button type="submit" variant="secondary" size="sm" className="rounded-full text-xs h-8">
                            Use for AI matching
                          </Button>
                        </form>
                      ) : null}
                      <Button variant="secondary" size="sm" asChild>
                        <Link href={`/dashboard/employee/resume/${r.id}`}>Edit</Link>
                      </Button>
                      <form action={deleteResumeAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <Button
                          variant="destructive"
                          size="sm"
                          type="submit"
                          onClick={undefined}
                        >
                          Delete
                        </Button>
                      </form>
                    </div>
                  </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        </div>
      </section>

      <section className="space-y-4 pt-2 border-t border-border/60">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saved & applications</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <Card className="border-border/70 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle>Saved Vacancies</CardTitle>
          </CardHeader>
          <CardContent>
            {savedVacanciesRecords.length === 0 ? (
              <p className="text-muted-foreground text-sm mt-4">No saved vacancies.</p>
            ) : (
              <ul className="space-y-4 mt-4">
                {savedVacanciesRecords.map(record => {
                  const v = record.vacancyId;
                  if (!v) return null;
                  return (
                    <li key={v._id.toString()} className="border border-border/60 p-4 rounded-xl flex flex-col gap-2 transition-colors duration-200 hover:border-primary/20 hover:bg-muted/20">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{v.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatVacancySalary(v.salaryMin, v.salaryMax)}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/jobs/${v._id.toString()}`}>View</Link>
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle>My Responses</CardTitle>
          </CardHeader>
          <CardContent>
            {userResponses.length === 0 ? (
              <p className="text-muted-foreground text-sm">You haven't applied to any jobs yet.</p>
            ) : (
              <ul className="space-y-4 mt-4">
                {userResponses.map((response) => {
                  const vacancy = response.vacancyId;
                  if (!vacancy) return null;

                  return (
                    <li key={response._id.toString()} className="border border-border/60 p-4 rounded-xl space-y-2 transition-colors duration-200 hover:border-primary/20 hover:bg-muted/20">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{vacancy.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatVacancySalary(vacancy.salaryMin, vacancy.salaryMax)}
                          </p>
                        </div>
                        <span className="text-xs rounded-full bg-secondary px-2 py-1 text-secondary-foreground">
                          {response.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Resume: {response.resumeId?.title || 'Custom resume'}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        </div>
      </section>
    </div>
  );
}
