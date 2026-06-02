import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'
import dbConnect from '@/lib/db/mongoose'
import { Resume, User } from '@/lib/db/schema'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { checkEmployerResumeAccess } from '@/lib/employer-resume-access'
import { ResumeDetailReadonly } from '@/components/resume/resume-detail-readonly'
import { Button } from '@/components/ui/button'

interface EmployerResumePageProps {
  params: Promise<{ resumeId: string }>
  searchParams: Promise<{ from?: string }>
}

export const dynamic = 'force-dynamic'

export default async function EmployerResumePage({ params, searchParams }: EmployerResumePageProps) {
  const session = await getSession()
  if (!session?.user?.id || session.user.role !== 'EMPLOYER') {
    redirect('/login')
  }

  const { resumeId } = await params
  const { from } = await searchParams
  const backHref = from
    ? decodeURIComponent(from)
    : '/dashboard/employer?tab=candidates'

  const access = await checkEmployerResumeAccess(resumeId, session.user.id)
  if (!access.authorized) {
    redirect('/dashboard/employer?resumeAccess=denied')
  }

  await dbConnect()
  const resume = (await Resume.findById(resumeId).lean()) as {
    _id: { toString(): string }
    userId: { toString(): string } | string
    title: string
    skills: string
    experience: string
    education: string
    phone?: string
    telegram?: string
    linkedin?: string
    github?: string
    cvFile?: string
    cvLink?: string
  } | null

  if (!resume) {
    notFound()
  }

  const employee = await User.findById(resume.userId).select('name').lean() as { name?: string } | null
  const candidateName = employee?.name?.trim() || t.dashboard.unknownCandidate

  const cookieStore = await cookies()
  const locale = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as 'en' | 'ru' | 'kk'
  const t = getDictionary(locale)

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backHref}>← {t.forms.back}</Link>
        </Button>
      </div>

      <ResumeDetailReadonly
        title={resume.title}
        candidateName={candidateName}
        skills={resume.skills}
        experience={resume.experience}
        education={resume.education}
        phone={resume.phone}
        telegram={resume.telegram}
        linkedin={resume.linkedin}
        github={resume.github}
        labels={{
          resumeDetails: t.forms.resumeDetails,
          skills: t.forms.skillsComma,
          experience: t.forms.experience,
          education: t.forms.education,
          contact: t.dashboard.contactSection,
          phone: t.forms.phone,
          telegram: t.forms.telegram,
          linkedin: t.forms.linkedin,
          github: t.forms.github,
        }}
      />
    </div>
  )
}
