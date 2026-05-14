import Link from "next/link";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { User, Vacancy } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateEmployerProfileAction } from "@/app/actions/employer";

export const dynamic = "force-dynamic";

export default async function EmployerDashboard() {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYER') return null;

  await dbConnect();
  const userData = await User.findById(session.user.id);
  const employerVacancies = await Vacancy.find({ employerId: session.user.id });

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Employer Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Company Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={updateEmployerProfileAction} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="companyName" className="text-sm font-medium">Company Name</label>
                <Input id="companyName" name="companyName" defaultValue={userData?.name || ""} required />
              </div>
              <div className="space-y-2">
                <label htmlFor="location" className="text-sm font-medium">Company Location</label>
                <Input id="location" name="location" defaultValue={userData?.location || ""} placeholder="Almaty, Kazakhstan" />
              </div>
              <div className="space-y-2">
                <label htmlFor="website" className="text-sm font-medium">Website</label>
                <Input id="website" name="website" type="url" defaultValue={userData?.website || ""} placeholder="https://company.com" />
              </div>
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">Company Description</label>
                <Textarea
                  id="description"
                  name="description"
                  rows={5}
                  defaultValue={userData?.description || ""}
                  placeholder="Describe what your company does and what kind of work it offers."
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{userData?.email}</p>
              </div>
              <Button type="submit" variant="outline">Save Profile</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>My Vacancies</CardTitle>
            <Button size="sm" asChild><Link href="/dashboard/employer/vacancy/new">Post Vacancy</Link></Button>
          </CardHeader>
          <CardContent>
            {employerVacancies.length === 0 ? (
              <p className="text-muted-foreground text-sm mt-4">No vacancies posted yet.</p>
            ) : (
              <ul className="space-y-4 mt-4">
                {employerVacancies.map(v => (
                  <li key={v.id} className="border p-4 rounded-lg flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{v.title}</p>
                        <p className="text-sm text-muted-foreground">${v.salaryMin} - ${v.salaryMax}</p>
                      </div>
                      <Button variant="secondary" size="sm">Edit</Button>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t">
                      <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                        0 Responses
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
