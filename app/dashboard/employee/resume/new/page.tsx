import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResumeCvFileUpload } from "@/components/forms/resume-cv-file-upload";
import { createResumeAction } from "@/app/actions/employee";
import { cookies } from "next/headers";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function NewResumePage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as 'en' | 'ru' | 'kk';
  const t = getDictionary(locale);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="shrink-0" asChild>
          <Link href="/dashboard/employee" aria-label={t.forms.back}>
            <ChevronLeft className="size-6" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">{t.forms.addNewResume}</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{t.forms.resumeDetails}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createResumeAction} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">{t.forms.jobTitle}</label>
              <Input id="title" name="title" placeholder={t.forms.jobTitlePlaceholder} required />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="skills" className="text-sm font-medium">{t.forms.skillsComma}</label>
              <Input id="skills" name="skills" placeholder={t.forms.skillsPlaceholder} required />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="experience" className="text-sm font-medium">{t.forms.experience}</label>
              <Input id="experience" name="experience" placeholder={t.forms.experiencePlaceholder} />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="education" className="text-sm font-medium">{t.forms.education}</label>
              <Input id="education" name="education" placeholder={t.forms.educationPlaceholder} />
            </div>

            <div className="space-y-2">
              <label htmlFor="cvLink" className="text-sm font-medium">{t.forms.cvLink}</label>
              <Input id="cvLink" name="cvLink" placeholder="https://..." />
            </div>

            <div className="space-y-2">
              <label htmlFor="cvFile" className="text-sm font-medium">
                {t.forms.uploadCv}
              </label>
              <ResumeCvFileUpload chooseLabel={t.forms.uploadCv} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">{t.forms.phone}</label>
                <Input id="phone" name="phone" placeholder="+1234567890" />
              </div>
              <div className="space-y-2">
                <label htmlFor="telegram" className="text-sm font-medium">{t.forms.telegram}</label>
                <Input id="telegram" name="telegram" placeholder="@username" />
              </div>
              <div className="space-y-2">
                <label htmlFor="linkedin" className="text-sm font-medium">{t.forms.linkedin}</label>
                <Input id="linkedin" name="linkedin" placeholder="https://linkedin.com/in/username" />
              </div>
              <div className="space-y-2">
                <label htmlFor="github" className="text-sm font-medium">{t.forms.github}</label>
                <Input id="github" name="github" placeholder="https://github.com/username" />
              </div>
            </div>

            <Button type="submit" className="w-full">{t.forms.createResume}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
