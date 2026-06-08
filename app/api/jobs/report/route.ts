import { NextResponse } from "next/server"
import { getAppBaseUrl, sendAppMail } from "@/lib/mail"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      vacancyId?: string
      title?: string
      reason?: string
    }

    const vacancyId = (body.vacancyId || "").trim()
    const title = (body.title || "").trim()
    const reason = (body.reason || "").trim()

    if (!vacancyId || !title) {
      return NextResponse.json({ error: "Missing vacancy data" }, { status: 400 })
    }

    if (!reason || reason.length < 5) {
      return NextResponse.json({ error: "Reason is too short" }, { status: 400 })
    }

    if (reason.length > 2000) {
      return NextResponse.json({ error: "Reason is too long" }, { status: 400 })
    }

    const jobUrl = `${getAppBaseUrl()}/jobs/${vacancyId}`

    await sendAppMail({
      subject: `JobFlow Job Report: ${title}`,
      text: [
        "Job vacancy report",
        "",
        `Title: ${title}`,
        `Link: ${jobUrl}`,
        "",
        "Reason:",
        reason,
      ].join("\n"),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[jobs/report POST]", error)
    return NextResponse.json(
      { error: "Could not send report. Please try again later." },
      { status: 500 },
    )
  }
}
