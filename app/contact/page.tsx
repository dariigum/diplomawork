"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, Phone, MapPin, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/jobs/header"

import { sendContactMessageAction } from "@/app/actions/contact"
import { toast } from "sonner"

export default function ContactPage() {
  const [isPending, setIsPending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    const formData = new FormData(e.currentTarget)
    
    try {
      await sendContactMessageAction(formData)
      setIsSuccess(true)
      toast.success("Message sent successfully!")
    } catch (error) {
      toast.error("Failed to send message. Please try again.")
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
            <h1 className="text-3xl font-bold">Message Sent!</h1>
            <p className="text-muted-foreground">
              Thank you for reaching out. We&apos;ve received your message and will get back to you at alimzhan.gabit@gmail.com soon.
            </p>
            <Button asChild className="mt-6">
              <Link href="/">Back to Home</Link>
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
          Back to Jobs
        </Link>

        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-2">Contact Us</h1>
          <p className="text-muted-foreground mb-8">
            Have questions? We&apos;d love to hear from you. Send us a message and we&apos;ll respond as soon as possible.
          </p>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium text-foreground">
                          Your Name
                        </label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="John Doe"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-foreground">
                          Email Address
                        </label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="john@example.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="subject" className="text-sm font-medium text-foreground">
                        Subject
                      </label>
                      <Input
                        id="subject"
                        name="subject"
                        placeholder="How can we help?"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="message" className="text-sm font-medium text-foreground">
                        Message
                      </label>
                      <Textarea
                        id="message"
                        name="message"
                        placeholder="Tell us more about your inquiry..."
                        rows={6}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>
                      <Send className="h-4 w-4 mr-2" />
                      {isPending ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Contact Info */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Get in Touch</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Email</h3>
                      <p className="text-sm text-muted-foreground">support@jobflow.com</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Phone</h3>
                      <p className="text-sm text-muted-foreground">+1 (555) 123-4567</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Address</h3>
                      <p className="text-sm text-muted-foreground">
                        123 Tech Street<br />
                        San Francisco, CA 94105
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/50">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-2">Office Hours</h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Monday - Friday: 9AM - 6PM PST</p>
                    <p>Saturday: 10AM - 4PM PST</p>
                    <p>Sunday: Closed</p>
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
