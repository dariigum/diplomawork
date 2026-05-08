import Link from "next/link";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { Response, User, Resume, SavedVacancy } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteEmployeeAccountAction, deleteResumeAction } from "@/app/actions/employee";

export default async function EmployeeDashboard() {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYEE') return null;

  await dbConnect();
  const userData = await User.findById(session.user.id);
  const userResumes = await Resume.find({ userId: session.user.id });
  const savedVacanciesRecords = await SavedVacancy.find({ userId: session.user.id }).populate('vacancyId').lean() as any[];
  const userResponses = await Response.find({ userId: session.user.id })
    .populate('vacancyId', 'title salaryMin salaryMax')
    .populate('resumeId', 'title')
    .sort({ createdAt: -1 })
    .lean() as any[];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Employee Dashboard</h1>

      <Card className="border-primary/25 bg-gradient-to-r from-primary/[0.06] to-transparent overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
          <div>
            <CardTitle className="text-lg">AI job recommendations</CardTitle>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Semantic matches from your resume embedding — powered by SBERT vectors and cosine similarity.
            </p>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link href="/dashboard/employee/recommendations">Open AI matches</Link>
          </Button>
        </CardHeader>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>My Resumes</CardTitle>
            <Button size="sm" asChild><Link href="/dashboard/employee/resume/new">Add Resume</Link></Button>
          </CardHeader>
          <CardContent>
            {userResumes.length === 0 ? (
              <p className="text-muted-foreground text-sm mt-4">No resumes created yet.</p>
            ) : (
              <ul className="space-y-4 mt-4">
                {userResumes.map(r => (
                  <li key={r.id} className="border p-4 rounded-lg flex justify-between items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium leading-none truncate">{r.title}</p>
                      <p className="text-sm text-muted-foreground mt-2 truncate">{r.skills}</p>
                      {r.cvFile && (
                        <p className="mt-2 text-xs">
                          <a href={r.cvFile} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View CV (PDF)</a>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
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
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
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
                    <li key={v._id.toString()} className="border p-4 rounded-lg flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{v.title}</p>
                          <p className="text-sm text-muted-foreground">${v.salaryMin} - ${v.salaryMax}</p>
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

        <Card>
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
                    <li key={response._id.toString()} className="border p-4 rounded-lg space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{vacancy.title}</p>
                          <p className="text-sm text-muted-foreground">
                            ${vacancy.salaryMin} - ${vacancy.salaryMax}
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
    </div>
  );
}
