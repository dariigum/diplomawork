"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { Briefcase, CheckCircle2, FileText, PlusCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getAuthSession } from "@/app/actions/auth"
import { getEmployeeResumesAction, submitVacancyResponseAction } from "@/app/actions/employee"
import { useI18n } from "@/lib/i18n/provider"
import { toast } from "sonner"

interface ApplyTarget {
  id: string
  title: string
  company: string
  location: string
}

interface ResumeOption {
  id: string
  title: string
  skills: string
  createdAt: string
}

interface ApplyModalProps {
  job: ApplyTarget | null
  isOpen: boolean
  onClose: () => void
}

export function ApplyModal({ job, isOpen, onClose }: ApplyModalProps) {
  const { t } = useI18n()
  const [mode, setMode] = useState<"custom" | "existing">("custom")
  const [selectedResumeId, setSelectedResumeId] = useState("")
  const [resumes, setResumes] = useState<ResumeOption[]>([])
  const [access, setAccess] = useState<"loading" | "guest" | "employee" | "other">("loading")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()

  const hasResumes = resumes.length > 0

  useEffect(() => {
    if (!isOpen) return

    setIsSubmitted(false)
    setSelectedResumeId("")

    startTransition(async () => {
      const session = await getAuthSession()

      if (!session?.user) {
        setAccess("guest")
        setResumes([])
        return
      }

      if (session.user.role !== "EMPLOYEE") {
        setAccess("other")
        setResumes([])
        return
      }

      setAccess("employee")
      const nextResumes = await getEmployeeResumesAction()
      setResumes(nextResumes)
      if (nextResumes.length > 0) {
        setSelectedResumeId(nextResumes[0].id)
      }
    })
  }, [isOpen])

  useEffect(() => {
    if (!hasResumes && mode === "existing") {
      setMode("custom")
    }
  }, [hasResumes, mode])

  const submitLabel = useMemo(() => {
    if (isPending) return t.applyModal.submitting
    return mode === "existing" ? t.applyModal.applyWithSelected : t.applyModal.createAndApply
  }, [isPending, mode, t])

  const handleSubmit = (formData: FormData) => {
    if (!job) return

    formData.set("vacancyId", job.id)
    formData.set("mode", mode)
    if (mode === "existing") {
      formData.set("resumeId", selectedResumeId)
    }

    startTransition(async () => {
      const result = await submitVacancyResponseAction(formData)
      if (result?.error) {
        toast.error(result.error)
        return
      }

      setIsSubmitted(true)
      toast.success(t.applyModal.successToast)
    })
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setMode("custom")
      setSelectedResumeId("")
      setIsSubmitted(false)
      onClose()
    }
  }

  if (!job) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {isSubmitted ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <CheckCircle2 className="h-8 w-8 text-accent" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-foreground">
              {t.applyModal.applicationSubmitted}
            </h3>
            <p className="text-muted-foreground">
              {t.applyModal.responseInReview
                .replace('{title}', job.title)
                .replace('{company}', job.company)}
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">{t.applyModal.applyFor} {job.title}</DialogTitle>
              <DialogDescription>
                {job.company} • {job.location}
              </DialogDescription>
            </DialogHeader>

            {access === "loading" && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {t.applyModal.loadingProfile}
              </div>
            )}

            {access === "guest" && (
              <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-6 text-center">
                <Briefcase className="mx-auto h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold text-foreground">{t.applyModal.signInToApply}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t.applyModal.needEmployeeAccount}
                  </p>
                </div>
                <Button asChild>
                  <Link href="/login">{t.applyModal.goToLogin}</Link>
                </Button>
              </div>
            )}

            {access === "other" && (
              <div className="rounded-xl border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                {t.applyModal.onlyEmployeeAccounts}
              </div>
            )}

            {access === "employee" && (
              <form action={handleSubmit} className="space-y-5">
                <Tabs value={mode} onValueChange={(value) => setMode(value as "custom" | "existing")} className="w-full">
                  <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl p-1">
                    <TabsTrigger value="custom" className="rounded-lg">
                      {t.applyModal.fillResumeTab}
                    </TabsTrigger>
                    <TabsTrigger value="existing" className="rounded-lg" disabled={!hasResumes}>
                      {t.applyModal.chooseExistingTab}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="custom" className="space-y-4 rounded-xl border border-border p-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="title">{t.applyModal.resumeTitle}</Label>
                        <Input id="title" name="title" placeholder={job.title} required={mode === "custom"} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="skills">{t.applyModal.skills}</Label>
                        <Input
                          id="skills"
                          name="skills"
                          placeholder={t.applyModal.skillsPlaceholder}
                          required={mode === "custom"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="experience">{t.applyModal.experience}</Label>
                        <Input id="experience" name="experience" placeholder={t.applyModal.experiencePlaceholder} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="education">{t.applyModal.education}</Label>
                        <Input id="education" name="education" placeholder={t.applyModal.educationPlaceholder} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvLink">{t.applyModal.cvLink}</Label>
                        <Input id="cvLink" name="cvLink" placeholder="https://..." />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvFile">{t.applyModal.cvFile}</Label>
                        <Input id="cvFile" name="cvFile" type="file" accept=".pdf" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t.applyModal.phone}</Label>
                        <Input id="phone" name="phone" placeholder="+7 700 000 00 00" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telegram">{t.forms.telegram}</Label>
                        <Input id="telegram" name="telegram" placeholder="@username" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="linkedin">{t.forms.linkedin}</Label>
                        <Input id="linkedin" name="linkedin" placeholder="https://linkedin.com/in/username" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="github">{t.forms.github}</Label>
                        <Input id="github" name="github" placeholder="https://github.com/username" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="coverLetterCustom">{t.applyModal.coverLetter}</Label>
                        <Textarea id="coverLetterCustom" name="coverLetter" placeholder={t.applyModal.coverLetterPlaceholder} rows={4} />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="existing" className="space-y-4 rounded-xl border border-border p-5">
                    {hasResumes ? (
                      <div className="space-y-3">
                        {resumes.map((resume) => {
                          const isSelected = resume.id === selectedResumeId
                          return (
                            <button
                              key={resume.id}
                              type="button"
                              onClick={() => setSelectedResumeId(resume.id)}
                              className={`w-full rounded-xl border p-4 text-left transition-colors ${
                                isSelected
                                  ? "border-primary bg-primary/5 shadow-sm"
                                  : "border-border hover:border-primary/40 hover:bg-muted/30"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground">{resume.title}</p>
                                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                    {resume.skills}
                                  </p>
                                </div>
                                <FileText className={`h-5 w-5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                              </div>
                              <p className="mt-3 text-xs text-muted-foreground">
                                {t.applyModal.created} {new Date(resume.createdAt).toLocaleDateString()}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
                        <PlusCircle className="mx-auto h-8 w-8 text-muted-foreground" />
                        <p className="mt-3 font-medium text-foreground">{t.applyModal.noSavedResumes}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t.applyModal.createResumeHint}
                        </p>
                        <Button asChild variant="outline" className="mt-4">
                          <Link href="/dashboard/employee/resume/new">{t.applyModal.createResume}</Link>
                        </Button>
                      </div>
                    )}

                    {hasResumes && (
                      <div className="space-y-2 mt-4">
                        <Label htmlFor="coverLetterExisting">{t.applyModal.coverLetter}</Label>
                        <Textarea id="coverLetterExisting" name="coverLetter" placeholder={t.applyModal.coverLetterPlaceholder} rows={4} />
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                    {t.common.cancel}
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isPending || (mode === "existing" && !selectedResumeId)}
                  >
                    {submitLabel}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
