import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Header } from "@/components/jobs/header"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header savedJobsCount={0} />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">Privacy Policy</h1>

        <div className="prose prose-gray max-w-none space-y-6 text-muted-foreground">
          <p className="text-lg">
            Last updated: March 13, 2026
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
            <p>
              We collect information you provide directly to us, such as when you create an account,
              submit a job application, or contact us for support. This may include your name, email
              address, phone number, resume, and work history.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
            <p>
              We use the information we collect to provide, maintain, and improve our services,
              including to process job applications, match you with potential employers, and
              communicate with you about opportunities.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. Information Sharing</h2>
            <p>
              We may share your information with employers when you apply for jobs through our
              platform. We do not sell your personal information to third parties. We may share
              aggregated, non-personally identifiable information publicly.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information
              against unauthorized access, alteration, disclosure, or destruction. However, no
              method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Your Rights</h2>
            <p>
              You have the right to access, update, or delete your personal information at any
              time. You may also opt out of receiving promotional communications from us by
              following the instructions in those messages.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Cookies</h2>
            <p>
              We use cookies and similar technologies to collect information about your browsing
              activities and to personalize your experience. You can manage your cookie preferences
              through your browser settings.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p>
              Email: privacy@jobflow.com<br />
              Address: 123 Tech Street, San Francisco, CA 94105
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
