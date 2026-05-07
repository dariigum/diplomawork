import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db/mongoose'
import { getSession } from '@/lib/auth'
import { Resume } from '@/lib/db/schema'
import { getTopRecommendations } from '@/lib/recommendation'

export async function GET() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'EMPLOYEE') {
    return NextResponse.json({ error: 'Only employees can get recommendations' }, { status: 403 })
  }

  await dbConnect()

  const resume = await Resume.findOne({ userId: session.user.id }).sort({ createdAt: -1 }).lean()
  if (!resume) {
    return NextResponse.json({ error: 'No resume found. Create a resume to get recommendations.' }, { status: 404 })
  }

  // If embedding is missing we return empty list (graceful response).
  if (!Array.isArray((resume as any).embedding) || (resume as any).embedding.length === 0) {
    return NextResponse.json([], { status: 200 })
  }

  try {
    const recs = await getTopRecommendations({ userId: session.user.id, limit: 10 })
    return NextResponse.json(recs, { status: 200 })
  } catch (e) {
    console.warn('[JobFlow] Recommendations generation failed.', e)
    return NextResponse.json([], { status: 200 })
  }
}

