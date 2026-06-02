"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, Phone, MapPin, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/jobs/header"
import { useI18n } from "@/lib/i18n/provider"
import { sendContactMessageAction } from "@/app/actions/contact"
import { toast } from "sonner"

export default function ContactPage() {
  const { t } = useI18n()
  const [isPending, setIsPending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    const formData = new FormData(e.currentTarget)

    try {
      await sendContactMessageAction(formData)
      setIsSuccess(true)
      toast.success(t.contact.successToast)
    } catch (error) {
      toast.error(t.contact.errorToast)
      console.error(error)
    } finally {
      setIsPending(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <Header savedJobsCount={0} />
        <main className="container mx-auto px-4 py-32 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Send className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">{t.contact.messageSent}</h1>
            <p className="text-muted-foreground">{t.contact.messageSentDesc}</p>
            <Button asChild className="mt-6">
              <Link href="/">{t.contact.backToHome}</Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header savedJobsCount={0} />

      <main className="container mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {t.contact.backToJobs}
        </Link>

        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-2">{t.contact.title}</h1>
          <p className="text-muted-foreground mb-8">{t.contact.subtitle}</p>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium text-foreground">
                          {t.contact.yourName}
                        </label>
                        <Input
                          id="name"
                          name="name"
                          placeholder={t.contact.namePlaceholder}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-foreground">
                          {t.contact.emailAddress}
                        </label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder={t.contact.emailPlaceholder}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="subject" className="text-sm font-medium text-foreground">
                        {t.contact.subject}
                      </label>
                      <Input
                        id="subject"
                        name="subject"
                        placeholder={t.contact.subjectPlaceholder}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="message" className="text-sm font-medium text-foreground">
                        {t.contact.message}
                      </label>
                      <Textarea
                        id="message"
                        name="message"
                        placeholder={t.contact.messagePlaceholder}
                        rows={6}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>
                      <Send className="h-4 w-4 mr-2" />
                      {isPending ? t.contact.sending : t.contact.sendMessage}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t.contact.getInTouch}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{t.contact.email}</h3>
                      <p className="text-sm text-muted-foreground">support@jobflow.com</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{t.contact.phone}</h3>
                      <p className="text-sm text-muted-foreground">+7 (700) 123-4567</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{t.contact.address}</h3>
                      <p className="text-sm text-muted-foreground">
                        Almaty, Kazakhstan
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/50">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-2">{t.contact.officeHours}</h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>{t.contact.officeHours1}</p>
                    <p>{t.contact.officeHours2}</p>
                    <p>{t.contact.officeHours3}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
