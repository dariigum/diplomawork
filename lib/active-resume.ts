import mongoose from 'mongoose'
import dbConnect from '@/lib/db/mongoose'
import { Resume } from '@/lib/db/schema'

/**
 * Ensures the employee has at most one `activeForAi` resume, and exactly one when they have any resumes.
 * Migrates legacy data (no flag / all false) by activating the latest resume by `createdAt`.
 */
export async function ensureActiveResumeForUser(userId: string): Promise<void> {
  await dbConnect()
  const uid = new mongoose.Types.ObjectId(userId)

  const activeCount = await Resume.countDocuments({ userId: uid, activeForAi: true })
  if (activeCount > 1) {
    const keeper = await Resume.findOne({ userId: uid, activeForAi: true }).sort({ createdAt: -1 })
    if (!keeper) return
    await Resume.updateMany({ userId: uid, _id: { $ne: keeper._id } }, { $set: { activeForAi: false } })
    return
  }
  if (activeCount === 1) return

  const total = await Resume.countDocuments({ userId: uid })
  if (total === 0) return

  const latest = await Resume.findOne({ userId: uid }).sort({ createdAt: -1 })
  if (!latest) return

  await Resume.updateMany({ userId: uid }, { $set: { activeForAi: false } })
  await Resume.updateOne({ _id: latest._id }, { $set: { activeForAi: true } })
}

/** Active resume for AI / semantic ranking (lean). Runs `ensureActiveResumeForUser` first. */
export async function getActiveResumeLeanForUser(userId: string) {
  await ensureActiveResumeForUser(userId)
  return Resume.findOne({ userId, activeForAi: true }).lean() as Promise<Record<string, unknown> | null>
}
