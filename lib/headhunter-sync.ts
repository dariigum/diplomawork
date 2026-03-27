import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db/mongoose';
import { ChatMessage, Response, SavedVacancy, User, Vacancy } from '@/lib/db/schema';

const HEADHUNTER_API_BASE = process.env.HH_API_BASE_URL || 'https://api.hh.ru';
const HEADHUNTER_LOOKBACK_DAYS = 12;
const HEADHUNTER_VACANCY_STORAGE_LIMIT_BYTES = 400 * 1024 * 1024;
const DEFAULT_PER_PAGE = 100;

interface HeadHunterEmployer {
  id?: string;
  name?: string;
  alternate_url?: string;
}

interface HeadHunterSalary {
  from?: number | null;
  to?: number | null;
}

interface HeadHunterArea {
  id?: string;
  name?: string;
}

interface HeadHunterAddress {
  city?: string | null;
  raw?: string | null;
}

interface HeadHunterSkill {
  name?: string;
}

interface HeadHunterVacancySearchItem {
  id: string;
  name?: string;
  employer?: HeadHunterEmployer | null;
  salary?: HeadHunterSalary | null;
  area?: HeadHunterArea | null;
  published_at?: string;
  created_at?: string;
  alternate_url?: string;
}

interface HeadHunterVacancyDetail extends HeadHunterVacancySearchItem {
  description?: string;
  key_skills?: HeadHunterSkill[];
  address?: HeadHunterAddress | null;
  employment?: { name?: string } | null;
  experience?: { name?: string } | null;
  schedule?: { id?: string; name?: string } | null;
}

interface HeadHunterSearchResponse {
  items: HeadHunterVacancySearchItem[];
  pages: number;
  page: number;
  found: number;
}

interface SyncHeadHunterVacanciesOptions {
  text?: string;
  areaIds?: string[];
  perPage?: number;
  maxPages?: number;
}

interface SyncHeadHunterVacanciesResult {
  fetched: number;
  imported: number;
  updated: number;
  employersCreated: number;
  skippedWithoutSalary: number;
  deletedByAge: number;
  deletedBySize: number;
  totalPagesProcessed: number;
  totalVacancyBytes: number;
  collectionLimitBytes: number;
  lookbackDays: number;
  cutoffDate: string;
}

function getHeadHunterHeaders() {
  const headers = new Headers({
    Accept: 'application/json',
    'User-Agent': process.env.HH_USER_AGENT || 'JobFlow/1.0 (jobflow@example.com)',
  });

  if (process.env.HH_API_TOKEN) {
    headers.set('Authorization', `Bearer ${process.env.HH_API_TOKEN}`);
  }

  return headers;
}

function normalizeAreaIds(input?: string[]) {
  return (input || [])
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

function toFinitePositiveNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function htmlToPlainText(value?: string | null) {
  if (!value) return '';

  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li>/gi, '• ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
  ).trim();
}

function buildEmployerExternalId(employer: HeadHunterEmployer | null | undefined, vacancyId: string) {
  if (employer?.id?.trim()) {
    return employer.id.trim();
  }

  const companyName = employer?.name?.trim() || 'company';
  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return `fallback-${slug || 'company'}-${vacancyId}`;
}

function buildImportedEmployerEmail(externalId: string) {
  return `hh-employer-${externalId}@headhunter.import`;
}

function getLocation(detail: HeadHunterVacancyDetail, item: HeadHunterVacancySearchItem) {
  return (
    detail.address?.city ||
    detail.address?.raw ||
    detail.area?.name ||
    item.area?.name ||
    ''
  );
}

function isRemoteVacancy(detail: HeadHunterVacancyDetail, location: string) {
  const scheduleId = detail.schedule?.id?.toLowerCase() || '';
  const scheduleName = detail.schedule?.name?.toLowerCase() || '';
  const locationValue = location.toLowerCase();

  return (
    scheduleId.includes('remote') ||
    scheduleName.includes('remote') ||
    scheduleName.includes('удален') ||
    locationValue.includes('remote') ||
    locationValue.includes('удален')
  );
}

async function fetchHeadHunterJson<T>(path: string, searchParams?: URLSearchParams) {
  const url = new URL(path, HEADHUNTER_API_BASE);
  if (searchParams) {
    url.search = searchParams.toString();
  }

  const response = await fetch(url.toString(), {
    headers: getHeadHunterHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HeadHunter request failed (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<T>;
}

async function findOrCreateHeadHunterEmployer(
  employer: HeadHunterEmployer | null | undefined,
  fallbackLocation: string,
  vacancyId: string,
  placeholderPasswordHash: string
) {
  const externalId = buildEmployerExternalId(employer, vacancyId);
  const existingEmployer = await User.findOne({
    source: 'HEADHUNTER',
    externalId,
  });

  if (existingEmployer) {
    const nextName = employer?.name?.trim() || existingEmployer.name;
    const nextLocation = fallbackLocation || existingEmployer.location || '';
    const nextWebsite = employer?.alternate_url || existingEmployer.website || '';

    if (
      existingEmployer.name !== nextName ||
      (existingEmployer.location || '') !== nextLocation ||
      (existingEmployer.website || '') !== nextWebsite
    ) {
      existingEmployer.name = nextName;
      existingEmployer.location = nextLocation;
      existingEmployer.website = nextWebsite;
      existingEmployer.importedAt = new Date();
      await existingEmployer.save();
    }

    return { employer: existingEmployer, created: false };
  }

  const companyName = employer?.name?.trim() || 'HeadHunter Employer';
  const newEmployer = await User.create({
    email: buildImportedEmployerEmail(externalId),
    passwordHash: placeholderPasswordHash,
    name: companyName,
    role: 'EMPLOYER',
    source: 'HEADHUNTER',
    externalId,
    location: fallbackLocation,
    website: employer?.alternate_url || '',
    logoUrl: companyName.slice(0, 2).toUpperCase(),
    importedAt: new Date(),
  });

  return { employer: newEmployer, created: true };
}

async function deleteVacancyIdsCascade(vacancyIds: mongoose.Types.ObjectId[]) {
  if (vacancyIds.length === 0) return 0;

  const vacancies = await Vacancy.find({ _id: { $in: vacancyIds } })
    .select('_id employerId source')
    .lean();
  const employerIds = vacancies
    .filter((vacancy) => vacancy.source === 'HEADHUNTER')
    .map((vacancy) => vacancy.employerId?.toString())
    .filter(Boolean) as string[];

  const responses = await Response.find({ vacancyId: { $in: vacancyIds } }).select('_id').lean();
  const responseIds = responses.map((response) => response._id);

  if (responseIds.length > 0) {
    await ChatMessage.deleteMany({ responseId: { $in: responseIds } });
    await Response.deleteMany({ _id: { $in: responseIds } });
  }

  await SavedVacancy.deleteMany({ vacancyId: { $in: vacancyIds } });
  await ChatMessage.deleteMany({ vacancyId: { $in: vacancyIds } });
  await Vacancy.deleteMany({ _id: { $in: vacancyIds } });

  if (employerIds.length > 0) {
    const uniqueEmployerIds = [...new Set(employerIds)].map((id) => new mongoose.Types.ObjectId(id));
    const remainingVacancies = await Vacancy.aggregate<{ _id: mongoose.Types.ObjectId }>([
      { $match: { employerId: { $in: uniqueEmployerIds } } },
      { $group: { _id: '$employerId' } },
    ]);
    const remainingSet = new Set(remainingVacancies.map((entry) => entry._id.toString()));

    const orphanEmployerIds = uniqueEmployerIds.filter((id) => !remainingSet.has(id.toString()));
    if (orphanEmployerIds.length > 0) {
      await User.deleteMany({
        _id: { $in: orphanEmployerIds },
        role: 'EMPLOYER',
        source: 'HEADHUNTER',
      });
    }
  }

  return vacancyIds.length;
}

async function pruneHeadHunterVacanciesOlderThan(cutoffDate: Date) {
  let deleted = 0;

  while (true) {
    const staleVacancies = await Vacancy.find({
      source: 'HEADHUNTER',
      $or: [
        { externalPublishedAt: { $lt: cutoffDate } },
        { externalPublishedAt: { $exists: false }, createdAt: { $lt: cutoffDate } },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(250)
      .select('_id')
      .lean();

    if (staleVacancies.length === 0) {
      break;
    }

    deleted += await deleteVacancyIdsCascade(staleVacancies.map((vacancy) => vacancy._id));
  }

  return deleted;
}

async function getVacancyCollectionBytes() {
  try {
    const stats = await Vacancy.aggregate<{ totalBytes: number }>([
      {
        $group: {
          _id: null,
          totalBytes: { $sum: { $bsonSize: '$$ROOT' } },
        },
      },
    ]);

    return stats[0]?.totalBytes || 0;
  } catch {
    const documents = await Vacancy.find({}).lean();
    return documents.reduce((total, document) => {
      return total + Buffer.byteLength(JSON.stringify(document), 'utf8');
    }, 0);
  }
}

async function pruneHeadHunterVacanciesToSizeLimit(limitBytes: number) {
  let totalBytes = await getVacancyCollectionBytes();
  let deleted = 0;

  while (totalBytes > limitBytes) {
    const oldestVacancies = await Vacancy.find({ source: 'HEADHUNTER' })
      .sort({ createdAt: 1 })
      .limit(250)
      .select('_id')
      .lean();

    if (oldestVacancies.length === 0) {
      break;
    }

    deleted += await deleteVacancyIdsCascade(oldestVacancies.map((vacancy) => vacancy._id));
    totalBytes = await getVacancyCollectionBytes();
  }

  return { deleted, totalBytes };
}

export async function syncHeadHunterVacancies(
  options: SyncHeadHunterVacanciesOptions = {}
): Promise<SyncHeadHunterVacanciesResult> {
  await dbConnect();

  const cutoffDate = new Date(Date.now() - HEADHUNTER_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const normalizedAreaIds = normalizeAreaIds(
    options.areaIds && options.areaIds.length > 0
      ? options.areaIds
      : process.env.HH_IMPORT_AREA_IDS
        ? process.env.HH_IMPORT_AREA_IDS.split(',')
        : []
  );
  const configuredPerPage = toFinitePositiveNumber(options.perPage ?? null);
  const perPage = Math.max(1, Math.min(configuredPerPage || DEFAULT_PER_PAGE, 100));
  const configuredMaxPages =
    toFinitePositiveNumber(options.maxPages ?? null) ||
    toFinitePositiveNumber(
      process.env.HH_IMPORT_MAX_PAGES ? Number(process.env.HH_IMPORT_MAX_PAGES) : null
    );
  const text = options.text?.trim() || process.env.HH_IMPORT_TEXT || '';
  const now = new Date();
  const placeholderPasswordHash = await bcrypt.hash(
    process.env.HH_IMPORTED_EMPLOYER_PASSWORD || 'headhunter-imported-employer'
  , 10);

  const deletedByAge = await pruneHeadHunterVacanciesOlderThan(cutoffDate);

  let page = 0;
  let pages = 1;
  let fetched = 0;
  let imported = 0;
  let updated = 0;
  let employersCreated = 0;
  let skippedWithoutSalary = 0;

  while (page < pages && (configuredMaxPages === null || page < configuredMaxPages)) {
    const searchParams = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      order_by: 'publication_time',
      date_from: cutoffDate.toISOString(),
      date_to: now.toISOString(),
    });

    if (text) {
      searchParams.set('text', text);
    }

    for (const areaId of normalizedAreaIds) {
      searchParams.append('area', areaId);
    }

    const searchResponse = await fetchHeadHunterJson<HeadHunterSearchResponse>(
      '/vacancies',
      searchParams
    );

    pages = searchResponse.pages || 0;

    for (const item of searchResponse.items) {
      const detail = await fetchHeadHunterJson<HeadHunterVacancyDetail>(`/vacancies/${item.id}`);
      const salaryFrom = detail.salary?.from ?? item.salary?.from ?? detail.salary?.to ?? item.salary?.to;
      const salaryTo = detail.salary?.to ?? item.salary?.to ?? detail.salary?.from ?? item.salary?.from;

      if (salaryFrom == null && salaryTo == null) {
        skippedWithoutSalary += 1;
        continue;
      }

      const location = getLocation(detail, item);
      const remote = isRemoteVacancy(detail, location);
      const skills = (detail.key_skills || [])
        .map((skill) => skill.name?.trim())
        .filter(Boolean) as string[];
      const description = htmlToPlainText(detail.description);
      const createdAtValue =
        detail.created_at || item.created_at || detail.published_at || item.published_at || now.toISOString();
      const publishedAtValue =
        detail.published_at || item.published_at || detail.created_at || item.created_at || createdAtValue;

      const createdDate = parseDate(createdAtValue) || now;
      const publishedDate = parseDate(publishedAtValue) || createdDate;
      if (publishedDate < cutoffDate) {
        continue;
      }

      const { employer, created } = await findOrCreateHeadHunterEmployer(
        detail.employer,
        location,
        item.id,
        placeholderPasswordHash
      );

      if (created) {
        employersCreated += 1;
      }

      const existingVacancy = await Vacancy.findOne({
        source: 'HEADHUNTER',
        externalId: item.id,
      }).select('_id');

      await Vacancy.findOneAndUpdate(
        { source: 'HEADHUNTER', externalId: item.id },
        {
          $set: {
            employerId: employer._id,
            source: 'HEADHUNTER',
            externalId: item.id,
            title: detail.name?.trim() || item.name?.trim() || 'Untitled vacancy',
            description,
            skillsRequired: skills.join(', '),
            salaryMin: salaryFrom ?? salaryTo ?? 0,
            salaryMax: salaryTo ?? salaryFrom ?? 0,
            experience: detail.experience?.name || 'Not specified',
            employmentType: detail.employment?.name || 'Full-time',
            workMode: remote ? 'REMOTE' : 'ONSITE',
            country: '',
            city: location,
            address: location || (remote ? 'Remote' : ''),
            sourceUrl: detail.alternate_url || item.alternate_url || '',
            externalPublishedAt: publishedDate,
            importedAt: new Date(),
            createdAt: createdDate,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (existingVacancy) {
        updated += 1;
      } else {
        imported += 1;
      }

      fetched += 1;
    }

    page += 1;
  }

  const sizePruneResult = await pruneHeadHunterVacanciesToSizeLimit(
    HEADHUNTER_VACANCY_STORAGE_LIMIT_BYTES
  );

  return {
    fetched,
    imported,
    updated,
    employersCreated,
    skippedWithoutSalary,
    deletedByAge,
    deletedBySize: sizePruneResult.deleted,
    totalPagesProcessed: page,
    totalVacancyBytes: sizePruneResult.totalBytes,
    collectionLimitBytes: HEADHUNTER_VACANCY_STORAGE_LIMIT_BYTES,
    lookbackDays: HEADHUNTER_LOOKBACK_DAYS,
    cutoffDate: cutoffDate.toISOString(),
  };
}
