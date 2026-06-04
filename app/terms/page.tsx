"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/jobs/header"
import { useI18n } from "@/lib/i18n/provider"

export default function TermsPage() {
  const router = useRouter()
  const { t, locale } = useI18n()

  const content = {
    en: {
      title: "Terms of Service",
      lastUpdated: "Last updated: June 4, 2026",
      sections: [
        {
          title: "1. Acceptance of Terms",
          body: "By accessing and using JobFlow, you accept and agree to be bound by the terms and conditions of this agreement. If you do not agree to these terms, please do not use our services."
        },
        {
          title: "2. Use of Services",
          body: "You agree to use our services only for lawful purposes and in accordance with these Terms. You agree not to use our services to submit false information, harass others, or engage in any activity that violates applicable laws."
        },
        {
          title: "3. User Accounts",
          body: "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account."
        },
        {
          title: "4. Job Listings",
          body: "Employers are responsible for the accuracy of their job listings. JobFlow does not guarantee the accuracy of any job posting and is not responsible for any employment decisions made based on information on our platform."
        },
        {
          title: "5. Intellectual Property",
          body: "The content, features, and functionality of JobFlow are owned by us and are protected by international copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our permission."
        },
        {
          title: "6. Limitation of Liability",
          body: "JobFlow shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use our services. Our total liability shall not exceed the amount you paid us in the past twelve months."
        },
        {
          title: "7. Termination",
          body: "We may terminate or suspend your account at any time without prior notice or liability for any reason, including if you breach these Terms. Upon termination, your right to use our services will immediately cease."
        },
        {
          title: "8. Changes to Terms",
          body: "We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through our platform. Your continued use of our services after such modifications constitutes acceptance of the updated terms."
        },
        {
          title: "9. Contact",
          body: "For questions about these Terms, please contact us at:"
        }
      ]
    },
    ru: {
      title: "Условия использования",
      lastUpdated: "Последнее обновление: 4 июня 2026 г.",
      sections: [
        {
          title: "1. Согласие с условиями",
          body: "Получая доступ к JobFlow и используя его, вы принимаете условия настоящего соглашения и соглашаетесь соблюдать их. Если вы не согласны с этими условиями, пожалуйста, не используйте наши услуги."
        },
        {
          title: "2. Использование услуг",
          body: "Вы соглашаетесь использовать наши услуги только в законных целях и в соответствии с настоящими Условиями. Вы обязуетесь не использовать наши услуги для отправки ложной информации, преследования других лиц или ведения любой деятельности, нарушающей закон."
        },
        {
          title: "3. Учетные записи",
          body: "Вы несете ответственность за сохранение конфиденциальности учетных данных вашей учетной записи и за все действия, которые происходят под вашим аккаунтом. Вы соглашаетесь немедленно уведомить нас о любом несанкционированном использовании вашего аккаунта."
        },
        {
          title: "4. Объявления о работе",
          body: "Работодатели несут ответственность за точность своих объявлений. JobFlow не гарантирует точность любой публикации вакансии и не несет ответственности за решения о приеме на работу, принятые на основе информации на нашей платформе."
        },
        {
          title: "5. Интеллектуальная собственность",
          body: "Контент, функции и функциональность JobFlow принадлежат нам и защищены международными законами об авторском праве, товарных знаках и другими законами об интеллектуальной собственности. Вы не можете воспроизводить, распространять или создавать производные работы без нашего разрешения."
        },
        {
          title: "6. Ограничение ответственности",
          body: "JobFlow не несет ответственности за любые косвенные, случайные, специальные, последующие или штрафные убытки, возникшие в результате использования или невозможности использования наших услуг. Наша общая ответственность не должна превышать сумму, уплаченную вами за последние двенадцать месяцев."
        },
        {
          title: "7. Прекращение действия",
          body: "Мы можем закрыть или приостановить действие вашей учетной записи в любое время без предварительного уведомления или ответственности по любой причине, включая нарушение вами настоящих Условий. После прекращения ваше право на использование наших услуг немедленно прекращается."
        },
        {
          title: "8. Изменение условий",
          body: "Мы оставляем за собой право изменять эти условия в любое время. Мы будем уведомлять пользователей о любых существенных изменениях по электронной почте или через нашу платформу. Ваше дальнейшее использование наших услуг после таких изменений означает принятие обновленных условий."
        },
        {
          title: "9. Контакты",
          body: "По вопросам, касающимся настоящих Условий, пожалуйста, свяжитесь с нами:"
        }
      ]
    },
    kk: {
      title: "Пайдалану шарттары",
      lastUpdated: "Соңғы жаңартылуы: 4 маусым 2026 ж.",
      sections: [
        {
          title: "1. Шарттарды қабылдау",
          body: "JobFlow қызметіне кіру және оны пайдалану арқылы сіз осы келісімнің шарттарын қабылдайсыз және оларды орындауға келісесіз. Егер сіз бұл шарттармен келіспесеңіз, біздің қызметтерімізді пайдаланбаңыз."
        },
        {
          title: "2. Қызметтерді пайдалану",
          body: "Сіз біздің қызметтерімізді тек заңды мақсаттарда және осы Шарттарға сәйкес пайдалануға келісесіз. Жалған ақпарат жіберу, басқаларды мазалау немесе заңды бұзатын кез келген әрекеттермен айналысу үшін қызметтерімізді пайдаланбауға міндеттенесіз."
        },
        {
          title: "3. Пайдаланушы тіркелгілері",
          body: "Тіркелгіңіздің құпиялылығын сақтауға және тіркелгіңіздің астында орын алатын барлық әрекеттерге сіз жауаптысыз. Тіркелгіңізді рұқсатсыз пайдалану туралы бізге дереу хабарлауға келісесіз."
        },
        {
          title: "4. Бос жұмыс орындары",
          body: "Жұмыс берушілер өздерінің бос жұмыс орындары туралы хабарландыруларының дәлдігіне жауапты. JobFlow бос жұмыс орны туралы кез келген жарияланымның дәлдігіне кепілдік бермейді және біздің платформамыздағы ақпарат негізінде қабылданған жұмысқа қабылдау шешімдеріне жауапты емес."
        },
        {
          title: "5. Интеллектуалдық меншік",
          body: "JobFlow контенті, мүмкіндіктері мен функционалдығы бізге тиесілі және халықаралық авторлық құқық, тауар белгісі және басқа да интеллектуалдық меншік заңдарымен қорғалады. Біздің рұқсатымызсыз көшіруге, таратуға немесе туынды жұмыстарды жасауға болмайды."
        },
        {
          title: "6. Жауапкершілікті шектеу",
          body: "JobFlow біздің қызметтерімізді пайдалану немесе пайдалана алмау нәтижесінде пайда болатын кез келген жанама, кездейсоқ, арнайы, салдарлық немесе айыппұл залалдары үшін жауапты емес. Біздің жалпы жауапкершілігіміз соңғы он екі айда сіз төлеген сомадан аспауы керек."
        },
        {
          title: "7. Тоқтату",
          body: "Біз кез келген уақытта алдын ала ескертусіз немесе жауапкершіліксіз тіркелгіңізді тоқтата немесе тоқтата тұра аламыз, соның ішінде осы Шарттарды бұзған жағдайда. Тоқтатылғаннан кейін қызметтерімізді пайдалану құқығыңыз дереу тоқтатылады."
        },
        {
          title: "8. Шарттарды өзгерту",
          body: "Біз кез келген уақытта осы шарттарды өзгерту құқығын өзімізде қалдырамыз. Біз пайдаланушыларға кез келген елеулі өзгерістер туралы электрондық пошта немесе платформа арқылы хабарлаймыз. Осындай өзгертулерден кейін қызметтерімізді пайдалануды жалғастыру жаңартылған шарттарды қабылдауды білдіреді."
        },
        {
          title: "9. Байланыс",
          body: "Осы Шарттарға қатысты сұрақтар бойынша бізге хабарласыңыз:"
        }
      ]
    }
  }

  const activeContent = content[locale as "en" | "ru" | "kk"] || content.en

  return (
    <div className="min-h-screen bg-background">
      <Header savedJobsCount={0} />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.back()} aria-label={t.forms.back}>
            <ChevronLeft className="size-6" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground">{t.forms.back}</span>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-8">{activeContent.title}</h1>

        <div className="prose prose-gray max-w-none space-y-6 text-muted-foreground">
          <p className="text-lg">
            {activeContent.lastUpdated}
          </p>

          {activeContent.sections.slice(0, 8).map((section, idx) => (
            <section key={idx} className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
              <p>{section.body}</p>
            </section>
          ))}

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">{activeContent.sections[8].title}</h2>
            <p>{activeContent.sections[8].body}</p>
            <p>
              Email: alimzhan.gabit@gmail.com<br />
              Phone: +77783255904<br />
              Address: Almaty, Kazakhstan
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
