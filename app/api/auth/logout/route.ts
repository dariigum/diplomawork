import { NextResponse } from "next/server"
import { clearSession } from "@/lib/auth"

export async function POST() {
  try {
    await clearSession()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[auth/logout POST]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
