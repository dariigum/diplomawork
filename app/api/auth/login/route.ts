import { NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import { User } from "@/lib/db/schema"
import { setSession, comparePassword } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string }
    const identifier = (body.email || "").trim()
    const password = body.password || ""

    if (!identifier || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 })
    }

    await dbConnect()
    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { name: identifier }],
    })

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const isValid = await comparePassword(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    await setSession({ id: user.id, role: user.role, email: user.email })

    const redirectTo =
      user.role === "ADMIN"
        ? "/admin"
        : user.role === "EMPLOYER"
          ? "/dashboard/employer"
          : "/"

    return NextResponse.json({ success: true, redirectTo })
  } catch (error) {
    console.error("[auth/login POST]", error)
    return NextResponse.json({ error: "Failed to authenticate" }, { status: 500 })
  }
}
