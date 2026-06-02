import Link from 'next/link'
import { cookies } from 'next/headers'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { Button } from '@/components/ui/button'

export default async function EmployerResumeNotFound() {
  const cookieStore = await cookies()
  const locale = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as 'en' | 'ru' | 'kk'
  const t = getDictionary(locale)

  return (
    <div className="mx-auto max-w-lg space-y-4 p-6 text-center">
      <h1 className="text-xl font-semibold">{t.dashboard.resumeNotFound}</h1>
      <Button asChild variant="outline">
        <Link href="/dashboard/employer?tab=candidates">{t.forms.back}</Link>
      </Button>
    </div>
  )
}
