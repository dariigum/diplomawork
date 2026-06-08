import { NextResponse } from "next/server"
import { getCompaniesList } from "@/lib/server/companies-list"

export async function GET() {
  try {
    const companies = await getCompaniesList()
    return NextResponse.json({ companies })
  } catch (error) {
    console.error("[public/companies GET]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
