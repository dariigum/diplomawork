"use client"

import { useState } from "react"
import { Upload, CheckCircle2, FileText } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { Job } from "@/lib/job-data"

interface ApplyModalProps {
  job: Job | null
  isOpen: boolean
  onClose: () => void
}

export function ApplyModal({ job, isOpen, onClose }: ApplyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [resumeFile, setResumeFile] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    
    setIsSubmitting(false)
    setIsSubmitted(true)
    
    // Auto close after success
    setTimeout(() => {
      onClose()
      setIsSubmitted(false)
      setResumeFile(null)
    }, 2000)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0])
    }
  }

  if (!job) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        {isSubmitted ? (
          <div className="py-12 text-center">
            <div className="mx-auto w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Application Submitted!
            </h3>
            <p className="text-muted-foreground">
              Your application for {job.title} at {job.company} has been sent.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Apply for {job.title}</DialogTitle>
              <DialogDescription>
                {job.company} • {job.location}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="John" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Doe" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              {/* Resume Upload */}
              <div className="space-y-2">
                <Label>Resume</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <input
                    type="file"
                    id="resume"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="resume" className="cursor-pointer">
                    {resumeFile ? (
                      <div className="flex items-center justify-center gap-2 text-foreground">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="font-medium">{resumeFile.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          <span className="text-primary font-medium">Click to upload</span> or drag
                          and drop
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF, DOC, DOCX (max 5MB)
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
                <Textarea
                  id="coverLetter"
                  placeholder="Tell us why you're a great fit for this role..."
                  rows={4}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
