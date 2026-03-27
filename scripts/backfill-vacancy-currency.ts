import * as dotenv from 'dotenv'
import path from 'path'
import mongoose from 'mongoose'

import { Vacancy } from '../lib/db/schema'
import { DEFAULT_SALARY_CURRENCY, normalizeCurrencyCode } from '../lib/format-salary'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/diplomawork'
const HEADHUNTER_API_BASE = process.env.HH_API_BASE_URL || 'https://api.hh.ru'
const DEFAULT_HH_CONTACT_EMAIL = process.env.HH_CONTACT_EMAIL || 'alimzhan.gabit@gmail.com'
const DEFAULT_HH_APP_NAME = process.env.HH_APP_NAME || 'JobFlow'

type HeadHunterVacancyResponse = {
  salary?: {
    currency?: string | null
  } | null
}

function getHeadHunterHeaders() {
  const configuredUserAgent = process.env.HH_USER_AGENT?.trim()
  const userAgent =
    configuredUserAgent || `${DEFAULT_HH_APP_NAME}/1.0 (${DEFAULT_HH_CONTACT_EMAIL})`

  if (!userAgent || /example\.com/i.test(userAgent) || !/@/.test(userAgent)) {
    throw new Error(
      'Invalid HH User-Agent. Set HH_USER_AGENT like "JobFlow/1.0 (your-email@example.com)" or configure HH_CONTACT_EMAIL.'
    )
  }

  const headers = new Headers({
    Accept: 'application/json',
    'User-Agent': userAgent,
  })

  if (process.env.HH_API_TOKEN) {
    headers.set('Authorization', `Bearer ${process.env.HH_API_TOKEN}`)
  }

  return headers
}

async function fetchHeadHunterCurrency(externalId: string) {
  const response = await fetch(`${HEADHUNTER_API_BASE}/vacancies/${externalId}`, {
    headers: getHeadHunterHeaders(),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`HH request failed for vacancy ${externalId}: ${response.status}`)
  }

  const data = (await response.json()) as HeadHunterVacancyResponse
  return normalizeCurrencyCode(data.salary?.currency || '')
}

async function main() {
  await mongoose.connect(MONGODB_URI)

  const vacancies = (await Vacancy.find({
    $or: [
      { source: 'HEADHUNTER' },
      { salaryCurrency: { $exists: false } },
      { salaryCurrency: '' },
      { salaryCurrency: null },
    ],
  })
    .select('_id title source externalId salaryCurrency')
    .lean()) as Array<{
    _id: mongoose.Types.ObjectId
    title: string
    source?: 'LOCAL' | 'HEADHUNTER'
    externalId?: string
    salaryCurrency?: string | null
  }>

  let updated = 0
  let hhResolved = 0
  let defaulted = 0
  let normalized = 0
  let errors = 0

  for (const vacancy of vacancies) {
    const currentCurrency = normalizeCurrencyCode(vacancy.salaryCurrency || '')
    let nextCurrency = currentCurrency

    if (vacancy.source === 'HEADHUNTER' && vacancy.externalId) {
      try {
        const hhCurrency = await fetchHeadHunterCurrency(vacancy.externalId)
        if (hhCurrency) {
          nextCurrency = hhCurrency
          hhResolved += 1
        }
      } catch (error) {
        errors += 1
        console.error(
          `[HH] ${vacancy.externalId} ${vacancy.title}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        )
      }
    }

    if (!nextCurrency) {
      nextCurrency = DEFAULT_SALARY_CURRENCY
      defaulted += 1
    } else if (nextCurrency !== (vacancy.salaryCurrency || '')) {
      normalized += 1
    }

    if (nextCurrency !== (vacancy.salaryCurrency || '')) {
      await Vacancy.updateOne({ _id: vacancy._id }, { $set: { salaryCurrency: nextCurrency } })
      updated += 1
      console.log(`[updated] ${vacancy.title} -> ${nextCurrency}`)
    }
  }

  console.log(
    JSON.stringify(
      {
        checked: vacancies.length,
        updated,
        hhResolved,
        defaulted,
        normalized,
        errors,
      },
      null,
      2
    )
  )

  await mongoose.disconnect()
}

main().catch(async (error) => {
  console.error('Vacancy currency backfill failed:', error)
  await mongoose.disconnect().catch(() => undefined)
  process.exit(1)
})
