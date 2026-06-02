import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type ResumeDetailReadonlyProps = {
  title: string
  candidateName: string
  skills: string
  experience: string
  education: string
  phone?: string
  telegram?: string
  linkedin?: string
  github?: string
  labels: {
    resumeDetails: string
    skills: string
    experience: string
    education: string
    contact: string
    phone: string
    telegram: string
    linkedin: string
    github: string
  }
}

export function ResumeDetailReadonly({
  title,
  candidateName,
  skills,
  experience,
  education,
  phone,
  telegram,
  linkedin,
  github,
  labels,
}: ResumeDetailReadonlyProps) {
  const hasContact = phone || telegram || linkedin || github

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        <p className="mt-1 text-muted-foreground">{candidateName}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{labels.resumeDetails}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-foreground">{labels.skills}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{skills || '—'}</p>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-foreground">{labels.experience}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{experience || '—'}</p>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-foreground">{labels.education}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{education || '—'}</p>
          </section>
          {hasContact ? (
            <section>
              <h2 className="text-sm font-semibold text-foreground">{labels.contact}</h2>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {phone ? (
                  <li>
                    <span className="font-medium text-foreground">{labels.phone}:</span> {phone}
                  </li>
                ) : null}
                {telegram ? (
                  <li>
                    <span className="font-medium text-foreground">{labels.telegram}:</span> {telegram}
                  </li>
                ) : null}
                {linkedin ? (
                  <li>
                    <span className="font-medium text-foreground">{labels.linkedin}:</span>{' '}
                    <a href={linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {linkedin}
                    </a>
                  </li>
                ) : null}
                {github ? (
                  <li>
                    <span className="font-medium text-foreground">{labels.github}:</span>{' '}
                    <a href={github} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {github}
                    </a>
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
