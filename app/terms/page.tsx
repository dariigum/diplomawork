import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Header } from "@/components/jobs/header"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header savedJobsCount={0} />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">Terms of Service</h1>

        <div className="prose prose-gray max-w-none space-y-6 text-muted-foreground">
          <p className="text-lg">
            Last updated: March 13, 2026
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing and using JobFlow, you accept and agree to be bound by the terms and
              conditions of this agreement. If you do not agree to these terms, please do not use
              our services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Use of Services</h2>
            <p>
              You agree to use our services only for lawful purposes and in accordance with these
              Terms. You agree not to use our services to submit false information, harass others,
              or engage in any activity that violates applicable laws.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials
              and for all activities that occur under your account. You agree to notify us
              immediately of any unauthorized use of your account.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. Job Listings</h2>
            <p>
              Employers are responsible for the accuracy of their job listings. JobFlow does not
              guarantee the accuracy of any job posting and is not responsible for any employment
              decisions made based on information on our platform.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Intellectual Property</h2>
            <p>
              The content, features, and functionality of JobFlow are owned by us and are protected
              by international copyright, trademark, and other intellectual property laws. You may
              not reproduce, distribute, or create derivative works without our permission.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Limitation of Liability</h2>
            <p>
              JobFlow shall not be liable for any indirect, incidental, special, consequential, or
              punitive damages resulting from your use of or inability to use our services. Our
              total liability shall not exceed the amount you paid us in the past twelve months.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Termination</h2>
            <p>
              We may terminate or suspend your account at any time without prior notice or liability
              for any reason, including if you breach these Terms. Upon termination, your right to
              use our services will immediately cease.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">8. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will notify users of any
              material changes via email or through our platform. Your continued use of our services
              after such modifications constitutes acceptance of the updated terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">9. Contact</h2>
            <p>
              For questions about these Terms, please contact us at:
            </p>
            <p>
              Email: legal@jobflow.com<br />
              Address: 123 Tech Street, San Francisco, CA 94105
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
