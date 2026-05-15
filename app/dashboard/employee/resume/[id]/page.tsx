import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { Resume } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateResumeAction } from "@/app/actions/employee";
import { parseSafeExternalUrl } from "@/lib/vacancy-detail-display";
import Link from "next/link";

interface EditResumePageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function EditResumePage({ params }: EditResumePageProps) {
  const session = await getSession();
  if (!session || session.user.role !== "EMPLOYEE") redirect("/login");

  const { id } = await params;

  await dbConnect();
  const resume = await Resume.findOne({ _id: id, userId: session.user.id }).lean() as any;
  if (!resume) notFound();

  const cvFileLink = parseSafeExternalUrl(resume.cvFile);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edit Resume</h1>
        <Button variant="ghost" asChild>
          <Link href="/dashboard/employee">← Back</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resume Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateResumeAction} className="space-y-4">
            <input type="hidden" name="id" value={resume._id.toString()} />

            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">Job Title</label>
              <Input id="title" name="title" defaultValue={resume.title} required />
            </div>

            <div className="space-y-2">
              <label htmlFor="skills" className="text-sm font-medium">Skills (comma separated)</label>
              <Input id="skills" name="skills" defaultValue={resume.skills} required />
            </div>

            <div className="space-y-2">
              <label htmlFor="experience" className="text-sm font-medium">Experience</label>
              <Input id="experience" name="experience" defaultValue={resume.experience} />
            </div>

            <div className="space-y-2">
              <label htmlFor="education" className="text-sm font-medium">Education</label>
              <Input id="education" name="education" defaultValue={resume.education} />
            </div>

            <div className="space-y-2">
              <label htmlFor="cvLink" className="text-sm font-medium">CV Link (e.g. Google Drive)</label>
              <Input id="cvLink" name="cvLink" defaultValue={resume.cvLink} placeholder="https://..." />
            </div>

            <div className="space-y-2">
              <label htmlFor="cvFile" className="text-sm font-medium">Upload CV (PDF)</label>
              <Input id="cvFile" name="cvFile" type="file" accept=".pdf" />
              {cvFileLink ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Current file: <a href={cvFileLink.href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View current CV</a>
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">Phone</label>
                <Input id="phone" name="phone" defaultValue={resume.phone} placeholder="+1234567890" />
              </div>
              <div className="space-y-2">
                <label htmlFor="telegram" className="text-sm font-medium">Telegram</label>
                <Input id="telegram" name="telegram" defaultValue={resume.telegram} placeholder="@username" />
              </div>
              <div className="space-y-2">
                <label htmlFor="linkedin" className="text-sm font-medium">LinkedIn</label>
                <Input id="linkedin" name="linkedin" defaultValue={resume.linkedin} placeholder="https://linkedin.com/in/..." />
              </div>
              <div className="space-y-2">
                <label htmlFor="github" className="text-sm font-medium">GitHub</label>
                <Input id="github" name="github" defaultValue={resume.github} placeholder="https://github.com/..." />
              </div>
            </div>

            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
