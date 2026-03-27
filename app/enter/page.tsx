import { ArrowRight, Briefcase, Building2, MessageSquareText, ShieldCheck, Sparkles, Users } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/jobs/header';
import { Footer } from '@/components/jobs/footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import dbConnect from '@/lib/db/mongoose';
import { SavedVacancy } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';

export default async function EnterPage() {
  const session = await getSession();
  let savedJobsCount = 0;

  if (session?.user.role === 'EMPLOYEE') {
    await dbConnect();
    savedJobsCount = await SavedVacancy.countDocuments({ userId: session.user.id });
  }

  return (
    <div className="min-h-screen bg-background">
      <Header savedJobsCount={savedJobsCount} />

      <main className="container mx-auto space-y-14 px-4 py-8 lg:px-6 lg:py-12">
        <section className="overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-primary/10 via-background to-emerald-500/10">
          <div className="grid gap-10 px-6 py-12 lg:grid-cols-[1.2fr_0.8fr] lg:px-12 lg:py-16">
            <div className="space-y-6">
              <Badge variant="secondary" className="gap-2 px-3 py-1">
                <Sparkles className="h-3.5 w-3.5" />
                Welcome to JobFlow
              </Badge>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-foreground lg:text-5xl">
                  One workspace for job search, company discovery, salary insights, and direct hiring chat.
                </h1>
                <p className="max-w-2xl text-lg text-muted-foreground">
                  JobFlow combines vacancies, company profiles, saved jobs, encrypted employer messaging, and AI recommendations in one platform.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/">
                    Explore vacancies
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/companies">Browse companies</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <Card className="border-primary/20 bg-background/80 shadow-sm">
                <CardContent className="space-y-3 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">Smart vacancy flow</h2>
                  <p className="text-sm text-muted-foreground">
                    Search vacancies, save interesting options, and revisit them later from your dashboard.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-emerald-500/20 bg-background/80 shadow-sm">
                <CardContent className="space-y-3 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <MessageSquareText className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">Direct recruiter chat</h2>
                  <p className="text-sm text-muted-foreground">
                    Employees and employers can continue conversations in secure in-platform chats after a response is sent.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardContent className="space-y-3 p-6">
              <Users className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">For job seekers</h2>
              <p className="text-sm text-muted-foreground">
                Create resumes, track responses, collect saved jobs, and compare employers before you apply.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-6">
              <Building2 className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">For employers</h2>
              <p className="text-sm text-muted-foreground">
                Publish vacancies, manage candidates, and keep communication tied to each vacancy pipeline.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-6">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">For transparent hiring</h2>
              <p className="text-sm text-muted-foreground">
                Company pages, salary explorer, and dashboard tools keep the hiring process structured and visible.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
}
