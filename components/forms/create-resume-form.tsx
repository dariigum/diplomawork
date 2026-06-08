'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ResumeCvFileUpload } from '@/components/forms/resume-cv-file-upload'
import { createResumeAction } from '@/app/actions/employee'
import { useI18n } from '@/lib/i18n/provider'

export function CreateResumeForm() {
  const { t } = useI18n()
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await createResumeAction(formData)
      if (!result.success) {
        toast.error(
          result.error === 'Missing required fields'
            ? t.forms.resumeCreateFailed
            : result.error === 'Could not save uploaded CV file'
              ? t.forms.resumeUploadFailed
              : t.forms.resumeCreateFailed,
        )
        return
      }

      toast.success(t.forms.resumeCreated)
      window.location.assign('/dashboard/employee')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          {t.forms.jobTitle}
        </label>
        <Input id="title" name="title" placeholder={t.forms.jobTitlePlaceholder} required />
      </div>

      <div className="space-y-2">
        <label htmlFor="skills" className="text-sm font-medium">
          {t.forms.skillsComma}
        </label>
        <Input id="skills" name="skills" placeholder={t.forms.skillsPlaceholder} required />
      </div>

      <div className="space-y-2">
        <label htmlFor="experience" className="text-sm font-medium">
          {t.forms.experience}
        </label>
        <Input id="experience" name="experience" placeholder={t.forms.experiencePlaceholder} />
      </div>

      <div className="space-y-2">
        <label htmlFor="education" className="text-sm font-medium">
          {t.forms.education}
        </label>
        <Input id="education" name="education" placeholder={t.forms.educationPlaceholder} />
      </div>

      <div className="space-y-2">
        <label htmlFor="cvLink" className="text-sm font-medium">
          {t.forms.cvLink}
        </label>
        <Input id="cvLink" name="cvLink" placeholder="https://..." />
      </div>

      <div className="space-y-2">
        <label htmlFor="cvFile" className="text-sm font-medium">
          {t.forms.uploadCv}
        </label>
        <ResumeCvFileUpload chooseLabel={t.forms.uploadCv} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium">
            {t.forms.phone}
          </label>
          <Input id="phone" name="phone" placeholder="+1234567890" />
        </div>
        <div className="space-y-2">
          <label htmlFor="telegram" className="text-sm font-medium">
            {t.forms.telegram}
          </label>
          <Input id="telegram" name="telegram" placeholder="@username" />
        </div>
        <div className="space-y-2">
          <label htmlFor="linkedin" className="text-sm font-medium">
            {t.forms.linkedin}
          </label>
          <Input id="linkedin" name="linkedin" placeholder="https://linkedin.com/in/username" />
        </div>
        <div className="space-y-2">
          <label htmlFor="github" className="text-sm font-medium">
            {t.forms.github}
          </label>
          <Input id="github" name="github" placeholder="https://github.com/username" />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? t.forms.creatingResume : t.forms.createResume}
      </Button>
    </form>
  )
}
