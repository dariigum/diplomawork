import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { getSession } from '@/lib/auth'
import { getTopMatchingCandidatesForVacancy } from '@/lib/employer-candidate-matching'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'EMPLOYER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const vacancyId =
      typeof body === 'object' && body !== null && 'vacancyId' in body
        ? String((body as { vacancyId: unknown }).vacancyId ?? '').trim()
        : ''

    if (!vacancyId || !mongoose.Types.ObjectId.isValid(vacancyId)) {
      return NextResponse.json({ error: 'vacancyId is required' }, { status: 400 })
    }

    const candidates = await getTopMatchingCandidatesForVacancy({
      employerId: session.user.id,
      vacancyId,
    })

    return NextResponse.json({ candidates })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : ''
    if (message === 'Vacancy not found') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (message === 'Invalid vacancy id') {
      return NextResponse.json({ error: 'Invalid vacancy id' }, { status: 400 })
    }
    if (message === 'Vacancy has no embedding') {
      return NextResponse.json(
        { error: 'Vacancy embedding is not available. Save the vacancy again to generate embeddings.' },
        { status: 400 },
      )
    }
    console.error('[matching-candidates]', e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
