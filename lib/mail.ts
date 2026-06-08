import nodemailer from "nodemailer"

export function getAppBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://yaycat.bunny-theropod.ts.net"
  return raw.replace(/\/$/, "")
}

export function getDefaultMailTo() {
  return (
    process.env.SMTP_REPORT_TO ||
    process.env.SMTP_TO ||
    "alimzhan.gabit@gmail.com"
  )
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.ethereal.email",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER || "mock_user",
      pass: process.env.SMTP_PASS || "mock_pass",
    },
  })
}

export function isSmtpConfigured() {
  const user = process.env.SMTP_USER
  return Boolean(user && user !== "mock_user")
}

export async function sendAppMail(options: {
  subject: string
  text: string
  from?: string
  replyTo?: string
  to?: string
}) {
  const mailOptions = {
    from:
      options.from ||
      process.env.SMTP_FROM ||
      `"JobFlow" <${process.env.SMTP_USER || "noreply@jobflow.local"}>`,
    to: options.to || getDefaultMailTo(),
    replyTo: options.replyTo,
    subject: options.subject,
    text: options.text,
  }

  if (!isSmtpConfigured()) {
    console.log("--- MOCK EMAIL (SMTP not configured) ---")
    console.log(mailOptions)
    console.log("----------------------------------------")
    return { mocked: true as const }
  }

  const transporter = createTransporter()
  await transporter.sendMail(mailOptions)
  return { mocked: false as const }
}
