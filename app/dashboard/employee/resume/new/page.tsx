import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateResumeForm } from "@/components/forms/create-resume-form";
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
          <CreateResumeForm />
        </CardContent>
      </Card>
    </div>
  );
}
