import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { Resume } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateResumeAction } from "@/app/actions/employee";
import Link from "next/link";
import { cookies } from "next/headers";
import { getDictionary } from "@/lib/i18n/dictionaries";

interface EditResumePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditResumePage({ params }: EditResumePageProps) {
  const session = await getSession();
  if (!session || session.user.role !== "EMPLOYEE") redirect("/login");

  const { id } = await params;

  await dbConnect();
  const resume = await Resume.findOne({ _id: id, userId: session.user.id }).lean() as any;
  if (!resume) notFound();

  const cookieStore = await cookies();
  const locale = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as 'en' | 'ru' | 'kk';
  const t = getDictionary(locale);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t.forms.editResume}</h1>
        <Button variant="ghost" asChild>
          <Link href="/dashboard/employee">← {t.forms.back}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.forms.resumeDetails}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateResumeAction} className="space-y-4">
            <input type="hidden" name="id" value={resume._id.toString()} />

            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">{t.forms.jobTitle}</label>
              <Input id="title" name="title" defaultValue={resume.title} required />
            </div>

            <div className="space-y-2">
              <label htmlFor="skills" className="text-sm font-medium">{t.forms.skillsComma}</label>
              <Input id="skills" name="skills" defaultValue={resume.skills} required />
            </div>

            <div className="space-y-2">
              <label htmlFor="experience" className="text-sm font-medium">{t.forms.experience}</label>
              <Input id="experience" name="experience" defaultValue={resume.experience} />
            </div>

            <div className="space-y-2">
              <label htmlFor="education" className="text-sm font-medium">{t.forms.education}</label>
              <Input id="education" name="education" defaultValue={resume.education} />
            </div>

            <div className="space-y-2">
              <label htmlFor="cvLink" className="text-sm font-medium">{t.forms.cvLink}</label>
              <Input id="cvLink" name="cvLink" defaultValue={resume.cvLink} placeholder="https://..." />
            </div>

            <div className="space-y-2">
              <label htmlFor="cvFile" className="text-sm font-medium">{t.forms.uploadCv}</label>
              <Input id="cvFile" name="cvFile" type="file" accept=".pdf" />
              {resume.cvFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t.forms.currentFile} <a href={resume.cvFile} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{t.forms.viewCurrentCv}</a>
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">{t.forms.phone}</label>
                <Input id="phone" name="phone" defaultValue={resume.phone} placeholder="+1234567890" />
              </div>
              <div className="space-y-2">
                <label htmlFor="telegram" className="text-sm font-medium">{t.forms.telegram}</label>
                <Input id="telegram" name="telegram" defaultValue={resume.telegram} placeholder="@username" />
              </div>
              <div className="space-y-2">
                <label htmlFor="linkedin" className="text-sm font-medium">{t.forms.linkedin}</label>
                <Input id="linkedin" name="linkedin" defaultValue={resume.linkedin} placeholder="https://linkedin.com/in/..." />
              </div>
              <div className="space-y-2">
                <label htmlFor="github" className="text-sm font-medium">{t.forms.github}</label>
                <Input id="github" name="github" defaultValue={resume.github} placeholder="https://github.com/..." />
              </div>
            </div>

            <Button type="submit" className="w-full">{t.forms.saveChanges}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
