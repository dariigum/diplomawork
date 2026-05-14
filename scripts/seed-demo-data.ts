/**
 * Demo dataset for semantic recommendations without HH/parsers.
 * Uses existing lib/ml.ts + lib/embedding-text.ts (same as app runtime).
 *
 * Defaults: clears users with emails ending @demo.jobflow.local then re-seeds.
 * Skip deletion: npm run seed:demo -- --skip-clear
 */

import './bootstrap-demo-env';

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import dbConnect from '../lib/db/mongoose';
import { buildResumeEmbeddingText, buildVacancyEmbeddingText } from '../lib/embedding-text';
import {
  DEFAULT_DEMO_EMPLOYEE_PASSWORD,
  DEFAULT_DEMO_EMPLOYER_PASSWORD,
  DEMO_EMAIL_DOMAIN,
  DEMO_EMPLOYEE_EMAIL,
  DEMO_EMPLOYER_EMAIL,
  DEMO_RESUME_SEED,
  DEMO_VACANCIES,
} from '../lib/demo/seed-fixtures';
import { getEmbedding } from '../lib/ml';
import { User, Vacancy, Resume, Response, SavedVacancy, VacancyBehaviourEvent } from '../lib/db/schema';
import { getTopRecommendations } from '../lib/recommendation';

const SKIP_CLEAR = process.argv.includes('--skip-clear');

async function clearPreviousDemoTaggedData() {
  const emailRegex = new RegExp(`@${DEMO_EMAIL_DOMAIN.replace(/\./g, '\\.')}$`);
  const demoUsers = await User.find({ email: { $regex: emailRegex } })
    .select('_id role')
    .lean();
  const demoIds = demoUsers.map((u) => u._id);

  if (demoIds.length === 0) {
    console.log(`[seed:demo] No prior demo users (${DEMO_EMAIL_DOMAIN}).`);
    return;
  }

  const employerIds = demoUsers
    .filter((u) => u.role === 'EMPLOYER')
    .map((u) => u._id);
  let vacancyIds: mongoose.Types.ObjectId[] = [];

  if (employerIds.length > 0) {
    vacancyIds = (await Vacancy.find({ employerId: { $in: employerIds } }).select('_id').lean()).map(
      (v) => v._id as mongoose.Types.ObjectId,
    );
    if (vacancyIds.length) {
      await Response.deleteMany({
        $or: [{ userId: { $in: demoIds } }, { vacancyId: { $in: vacancyIds } }],
      });
      await SavedVacancy.deleteMany({
        $or: [{ userId: { $in: demoIds } }, { vacancyId: { $in: vacancyIds } }],
      });
      await VacancyBehaviourEvent.deleteMany({
        $or: [{ userId: { $in: demoIds } }, { vacancyId: { $in: vacancyIds } }],
      });
      await Vacancy.deleteMany({ _id: { $in: vacancyIds } });
    }
  }

  await Response.deleteMany({ userId: { $in: demoIds } });
  await SavedVacancy.deleteMany({ userId: { $in: demoIds } });
  await VacancyBehaviourEvent.deleteMany({ userId: { $in: demoIds } });
  await Resume.deleteMany({ userId: { $in: demoIds } });
  await User.deleteMany({ _id: { $in: demoIds } });

  console.log(
    `[seed:demo] Removed prior demo tagged users (${demoIds.length}), vacancies removed: ${vacancyIds.length}.`,
  );
}

async function seedDemo() {
  console.log('[seed:demo] Starting…');

  await dbConnect();

  if (!SKIP_CLEAR) {
    await clearPreviousDemoTaggedData();
  } else {
    console.log('[seed:demo] --skip-clear: not removing existing @demo.jobflow.local rows.');
  }

  const employerPassword =
    process.env.JOBFLOW_DEMO_EMPLOYER_PASSWORD ?? DEFAULT_DEMO_EMPLOYER_PASSWORD;
  const employeePassword =
    process.env.JOBFLOW_DEMO_EMPLOYEE_PASSWORD ?? DEFAULT_DEMO_EMPLOYEE_PASSWORD;

  const demoEmployer = await User.findOne({ email: DEMO_EMPLOYER_EMAIL });
  const demoEmployee = await User.findOne({ email: DEMO_EMPLOYEE_EMAIL });

  let employer = demoEmployer;
  let seeker = demoEmployee;

  if (!employer) {
    employer = await User.create({
      email: DEMO_EMPLOYER_EMAIL,
      passwordHash: await bcrypt.hash(employerPassword, 10),
      name: 'JobFlow Demo Technologies',
      role: 'EMPLOYER',
      industry: 'Technology',
      description: 'Synthetic IT employer account for demos and QA (no HH dependency).',
      location: 'Remote',
      logoUrl: 'JF',
    });
    console.log(`[seed:demo] Created demo employer: ${DEMO_EMPLOYER_EMAIL}`);
  } else {
    console.log(`[seed:demo] Reusing demo employer: ${DEMO_EMPLOYER_EMAIL}`);
    if (!(await bcrypt.compare(employerPassword, employer.passwordHash))) {
      employer.passwordHash = await bcrypt.hash(employerPassword, 10);
      await employer.save();
      console.log('[seed:demo] Updated demo employer password hash to match env/default.');
    }
  }

  if (!seeker) {
    seeker = await User.create({
      email: DEMO_EMPLOYEE_EMAIL,
      passwordHash: await bcrypt.hash(employeePassword, 10),
      name: 'Demo Job Seeker',
      role: 'EMPLOYEE',
    });
    console.log(`[seed:demo] Created demo employee: ${DEMO_EMPLOYEE_EMAIL}`);
  } else {
    console.log(`[seed:demo] Reusing demo employee: ${DEMO_EMPLOYEE_EMAIL}`);
    if (!(await bcrypt.compare(employeePassword, seeker.passwordHash))) {
      seeker.passwordHash = await bcrypt.hash(employeePassword, 10);
      await seeker.save();
      console.log('[seed:demo] Updated demo employee password hash to match env/default.');
    }
  }

  await Vacancy.deleteMany({ employerId: employer._id });
  console.log('[seed:demo] Cleared existing vacancies for demo employer.');

  let embeddedOk = 0;
  let embeddedFail = 0;

  for (const row of DEMO_VACANCIES) {
    let embedding: number[] | undefined;

    try {
      const text = buildVacancyEmbeddingText({
        title: row.title,
        description: row.description,
        skillsRequired: row.skillsRequired,
        requirements: row.requirements,
        responsibilities: row.responsibilities,
      });
      embedding = await getEmbedding(text);
      embeddedOk++;
      console.log(`[seed:demo] Embedding OK → ${row.title}`);
    } catch (e) {
      embeddedFail++;
      console.warn(
        `[seed:demo] Embedding skipped (ML service unreachable?) → ${row.title}` +
          `\n           Run FastAPI embedding service so vacancies get vectors for recommendations.`,
      );
      console.warn(String(e instanceof Error ? e.message : e));
    }

    await Vacancy.create({
      employerId: employer._id,
      ...row,
      ...(embedding && embedding.length > 0 ? { embedding } : {}),
    });
  }

  console.log(`[seed:demo] Inserted vacancies: ${DEMO_VACANCIES.length}`);
  console.log(`[seed:demo] Embeddings succeeded: ${embeddedOk}, skipped/failed: ${embeddedFail}`);

  await Resume.deleteMany({ userId: seeker._id });

  let resumeEmbedding: number[] | undefined;
  try {
    const resumeText = buildResumeEmbeddingText(DEMO_RESUME_SEED);
    resumeEmbedding = await getEmbedding(resumeText);
    console.log('[seed:demo] Resume embedding OK.');
  } catch (e) {
    console.warn('[seed:demo] Resume embedding skipped/failed:', e instanceof Error ? e.message : e);
  }

  await Resume.create({
    userId: seeker._id,
    title: DEMO_RESUME_SEED.title,
    skills: DEMO_RESUME_SEED.skills,
    experience: DEMO_RESUME_SEED.experience,
    education: DEMO_RESUME_SEED.education,
    activeForAi: true,
    ...(resumeEmbedding && resumeEmbedding.length > 0 ? { embedding: resumeEmbedding } : {}),
  });

  const withVacEmb = await Vacancy.countDocuments({
    embedding: { $exists: true, $ne: null },
  });

  console.log('[seed:demo] ── Verification ──');
  console.log(`[seed:demo] Vacancies total in DB: ${await Vacancy.countDocuments({})}`);
  console.log(`[seed:demo] Vacancies with non-null embedding array: ${withVacEmb}`);

  try {
    const recs = await getTopRecommendations({ userId: seeker._id.toString(), limit: 10 });
    console.log(
      `[seed:demo] Semantic API check (getTopRecommendations): returned ${recs.length} recommendation(s).`,
    );
    if (recs.length > 0) {
      const r0 = recs[0] as { title: string; score: number; semanticScore?: number; finalScore?: number }
      const sem = typeof r0.semanticScore === 'number' ? r0.semanticScore : r0.score
      const fin = typeof r0.finalScore === 'number' ? r0.finalScore : r0.score
      console.log(
        `[seed:demo] Top match: "${r0.title}" hybrid=${Number(fin).toFixed(4)} semantic=${Number(sem).toFixed(4)}`,
      )
    }
  } catch (e) {
    console.warn('[seed:demo] Recommendation verification failed:', e instanceof Error ? e.message : e);
  }

  console.log('[seed:demo] Done.');
}

seedDemo()
  .catch((e) => {
    console.error('[seed:demo] Fatal:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
