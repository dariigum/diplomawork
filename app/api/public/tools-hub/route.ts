import { NextResponse } from "next/server"
import { getToolsHubContext } from "@/app/actions/tools-hub"

export async function GET() {
  try {
    const context = await getToolsHubContext()
    return NextResponse.json(context)
  } catch (error) {
    console.error("[public/tools-hub GET]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
