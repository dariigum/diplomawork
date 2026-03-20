import Link from "next/link";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { User, Resume, SavedVacancy } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function EmployeeDashboard() {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYEE') return null;

  await dbConnect();
  const userData = await User.findById(session.user.id);
  const userResumes = await Resume.find({ userId: session.user.id });
  const savedVacanciesRecords = await SavedVacancy.find({ userId: session.user.id }).populate('vacancyId').lean() as any[];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Employee Dashboard</h1>
      
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
                  <li key={r.id} className="border p-4 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-medium leading-none">{r.title}</p>
                      <p className="text-sm text-muted-foreground mt-2">{r.skills}</p>
                    </div>
                    <Button variant="secondary" size="sm">Edit</Button>
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
            <p className="text-muted-foreground text-sm">You haven't applied to any jobs yet.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
