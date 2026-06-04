"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/jobs/header"
import { useI18n } from "@/lib/i18n/provider"

export default function PrivacyPage() {
  const router = useRouter()
  const { t, locale } = useI18n()

  const content = {
    en: {
      title: "Privacy Policy",
      lastUpdated: "Last updated: June 4, 2026",
      sections: [
        {
          title: "1. Information We Collect",
          body: "We collect information you provide directly to us, such as when you create an account, submit a job application, or contact us for support. This may include your name, email address, phone number, resume, and work history."
        },
        {
          title: "2. How We Use Your Information",
          body: "We use the information we collect to provide, maintain, and improve our services, including to process job applications, match you with potential employers, and communicate with you about opportunities."
        },
        {
          title: "3. Information Sharing",
          body: "We may share your information with employers when you apply for jobs through our platform. We do not sell your personal information to third parties. We may share aggregated, non-personally identifiable information publicly."
        },
        {
          title: "4. Data Security",
          body: "We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure."
        },
        {
          title: "5. Your Rights",
          body: "You have the right to access, update, or delete your personal information at any time. You may also opt out of receiving promotional communications from us by following the instructions in those messages."
        },
        {
          title: "6. Cookies",
          body: "We use cookies and similar technologies to collect information about your browsing activities and to personalize your experience. You can manage your cookie preferences through your browser settings."
        },
        {
          title: "7. Contact Us",
          body: "If you have any questions about this Privacy Policy, please contact us at:"
        }
      ]
    },
    ru: {
      title: "Политика конфиденциальности",
      lastUpdated: "Последнее обновление: 4 июня 2026 г.",
      sections: [
        {
          title: "1. Сбор информации",
          body: "Мы собираем информацию, которую вы предоставляете нам напрямую, например, при создании учетной записи, отправке отклика на вакансию или обращении в службу поддержки. Это может быть ваше имя, адрес электронной почты, номер телефона, резюме и история работы."
        },
        {
          title: "2. Использование информации",
          body: "Мы используем собранную информацию для предоставления, поддержки и улучшения наших услуг, включая обработку откликов на вакансии, подбор подходящих работодателей и связь с вами по поводу карьерных возможностей."
        },
        {
          title: "3. Передача информации",
          body: "Мы можем делиться вашей информацией с работодателями, когда вы откликаетесь на вакансии через нашу платформу. Мы не продаем вашу личную информацию третьим лицам. Мы можем публиковать обобщенную информацию, не содержащую личных данных."
        },
        {
          title: "4. Безопасность данных",
          body: "Мы применяем соответствующие меры безопасности для защиты вашей личной информации от несанкционированного доступа, изменения, раскрытия или уничтожения. Однако ни один метод передачи данных через Интернет не является на 100% безопасным."
        },
        {
          title: "5. Ваши права",
          body: "Вы имеете право в любое время получить доступ к своей личной информации, обновить или удалить ее. Вы также можете отказаться от получения рекламных сообщений от нас, следуя инструкциям в этих сообщениях."
        },
        {
          title: "6. Файлы cookies",
          body: "Мы используем файлы cookies и аналогичные технологии для сбора информации о ваших действиях на сайте и для персонализации вашего опыта. Вы можете управлять настройками cookies в своем браузере."
        },
        {
          title: "7. Контакты",
          body: "Если у вас возникли вопросы по поводу настоящей Политики конфиденциальности, пожалуйста, свяжитесь с нами:"
        }
      ]
    },
    kk: {
      title: "Құпиялық саясаты",
      lastUpdated: "Соңғы жаңартылуы: 4 маусым 2026 ж.",
      sections: [
        {
          title: "1. Ақпаратты жинау",
          body: "Біз сіз тікелей беретін ақпаратты жинаймыз, мысалы, тіркелгіні жасағанда, бос жұмыс орнына өтінім бергенде немесе қолдау қызметіне хабарласқанда. Бұл сіздің атыңызды, электрондық поштаңызды, телефон нөміріңізді, түйіндемеңізді және жұмыс тарихыңызды қамтуы мүмкін."
        },
        {
          title: "2. Ақпаратты пайдалану",
          body: "Біз жиналған ақпаратты қызметтерімізді ұсыну, қолдау және жақсарту үшін пайдаланамыз, соның ішінде өтінімдерді өңдеу, жұмыс берушілермен сәйкестендіру және сізбен байланысу."
        },
        {
          title: "3. Ақпаратты бөлісу",
          body: "Біз сіздің ақпаратыңызды платформамыз арқылы бос жұмыс орындарына өтінім бергенде жұмыс берушілермен бөлісе аламыз. Біз сіздің жеке ақпаратыңызды үшінші тұлғаларға сатпаймыз. Біз жеке сәйкестендірілмейтін жалпы ақпаратты жариялай аламыз."
        },
        {
          title: "4. Деректер қауіпсіздігі",
          body: "Біз сіздің жеке ақпаратыңызды рұқсатсыз кіруден, өзгертуден, жариялаудан немесе жоюдан қорғау үшін тиісті қауіпсіздік шараларын қолданамыз. Дегенмен, Интернет арқылы деректерді берудің ешбір әдісі 100% қауіпсіз емес."
        },
        {
          title: "5. Сіздің құқықтарыңыз",
          body: "Сіз кез келген уақытта жеке ақпаратыңызға қол жеткізуге, оны жаңартуға немесе жоюға құқылысыз. Сондай-ақ, хабарламалардағы нұсқауларды орындай отырып, бізден жарнамалық хабарламалар алудан бас тарта аласыз."
        },
        {
          title: "6. Cookies файлдары",
          body: "Біз сіздің әрекеттеріңіз туралы ақпаратты жинау және тәжірибеңізді жекелендіру үшін cookies файлдарын және ұқсас технологияларды пайдаланамыз. Cookies параметрлерін браузер арқылы басқара аласыз."
        },
        {
          title: "7. Байланыс",
          body: "Егер сізде осы Құпиялық саясатына қатысты сұрақтарыңыз болса, бізге хабарласыңыз:"
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

          {activeContent.sections.slice(0, 6).map((section, idx) => (
            <section key={idx} className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
              <p>{section.body}</p>
            </section>
          ))}

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">{activeContent.sections[6].title}</h2>
            <p>{activeContent.sections[6].body}</p>
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
