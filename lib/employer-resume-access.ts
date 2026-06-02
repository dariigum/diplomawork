import mongoose from 'mongoose'
import dbConnect from '@/lib/db/mongoose'
import { Response, Vacancy } from '@/lib/db/schema'
import { getTopMatchingCandidatesForVacancy } from '@/lib/employer-candidate-matching'

export type EmployerResumeAccessResult = {
  authorized: boolean
  reason?: string
}

/**
 * Employer may view a resume if the candidate applied to their vacancy (Condition A)
 * or appears in recommended matches for any of the employer's vacancies (Condition B).
 */
export async function checkEmployerResumeAccess(
  resumeId: string,
  employerId: string,
): Promise<EmployerResumeAccessResult> {
  if (!mongoose.Types.ObjectId.isValid(resumeId) || !mongoose.Types.ObjectId.isValid(employerId)) {
    return { authorized: false, reason: 'invalid_id' }
  }

  await dbConnect()

  const resumeObjectId = new mongoose.Types.ObjectId(resumeId)
  const employerObjectId = new mongoose.Types.ObjectId(employerId)

  const applied = await Response.findOne({ resumeId: resumeObjectId })
    .populate<{ vacancyId: { employerId?: mongoose.Types.ObjectId } }>({
      path: 'vacancyId',
      select: 'employerId',
    })
    .lean()

  if (applied?.vacancyId) {
    const vacancyEmployerId =
      typeof applied.vacancyId === 'object' && applied.vacancyId !== null && 'employerId' in applied.vacancyId
        ? String((applied.vacancyId as { employerId: mongoose.Types.ObjectId }).employerId)
        : null
    if (vacancyEmployerId === employerId) {
      return { authorized: true, reason: 'applied_to_vacancy' }
    }
  }

  const vacancies = await Vacancy.find({ employerId: employerObjectId })
    .select('_id embedding')
    .lean()

  for (const vacancy of vacancies) {
    const vacancyId = String(vacancy._id)
    if (!vacancy.embedding || !Array.isArray(vacancy.embedding) || vacancy.embedding.length === 0) {
      continue
    }
    try {
      const candidates = await getTopMatchingCandidatesForVacancy({
        employerId,
        vacancyId,
        limit: 50,
      })
      if (candidates.some((c) => c.resumeId === resumeId)) {
        return { authorized: true, reason: 'recommended_match' }
      }
    } catch {
      continue
    }
  }

  return { authorized: false, reason: 'not_authorized' }
}
