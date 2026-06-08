/**
 * Validate vacancy sourceUrl values and remove broken or unsafe links.
 *
 * Usage:
 *   npm run prune:vacancy-sources
 *   npm run prune:vacancy-sources -- --dry-run
 */

import './bootstrap-demo-env'

import dbConnect from '../lib/db/mongoose'
import { Vacancy } from '../lib/db/schema'
import { resolveVacancySourceListing } from '../lib/vacancy-detail-display'

const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  await dbConnect()

  const vacancies = await Vacancy.find({
    sourceUrl: { $exists: true, $nin: [null, ''] },
  })
    .select({ _id: 1, sourceUrl: 1, title: 1 })
    .lean()

  let kept = 0
  let removed = 0

  for (const vacancy of vacancies) {
    const sourceListing = await resolveVacancySourceListing(vacancy.sourceUrl)
    if (sourceListing) {
      kept += 1
      continue
    }

    removed += 1
    console.log(`[prune] remove sourceUrl for ${vacancy._id} (${vacancy.title ?? 'untitled'})`)

    if (!DRY_RUN) {
      await Vacancy.updateOne({ _id: vacancy._id }, { $unset: { sourceUrl: 1 } })
    }
  }

  console.log(
    `[prune] done: checked=${vacancies.length} kept=${kept} removed=${removed}${DRY_RUN ? ' (dry-run)' : ''}`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[prune] failed:', error)
    process.exit(1)
  })
