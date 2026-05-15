/**
 * One-off / periodic backfill: compute vacancy embeddings via ML service and persist on Vacancy.
 *
 * Usage (ML must be running: uvicorn in ml-service/):
 *   npm run backfill:embeddings
 *   npm run backfill:embeddings -- --dry-run
 *   npm run backfill:embeddings -- --force
 *   npm run backfill:embeddings -- --limit 50 --delay-ms 100
 */

import './bootstrap-demo-env';

import dbConnect from '../lib/db/mongoose';
import { Vacancy } from '../lib/db/schema';
import { buildVacancyEmbeddingText } from '../lib/embedding-text';
import { isValidEmbeddingVector } from '../lib/job-ingestion/embeddings/embedding-vector-guards';
import { getEmbedding } from '../lib/ml';

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

function readFlagValue(flag: string): number | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  const n = Number.parseInt(process.argv[idx + 1]!, 10);
  return Number.isFinite(n) ? n : undefined;
}

const LIMIT = readFlagValue('--limit');
const SKIP = readFlagValue('--skip') ?? 0;
const DELAY_MS = readFlagValue('--delay-ms') ?? 50;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function embeddingLength(emb: unknown): number {
  return Array.isArray(emb) ? emb.length : 0;
}

function needsEmbedding(
  emb: unknown,
  targetDim: number,
): 'missing' | 'invalid' | 'wrong_dim' | 'ok' {
  if (!Array.isArray(emb) || emb.length === 0) return 'missing';
  if (!isValidEmbeddingVector(emb)) return 'invalid';
  if (emb.length !== targetDim) return 'wrong_dim';
  return 'ok';
}

async function main() {
  console.log('[backfill:embeddings] Starting…');
  if (DRY_RUN) console.log('[backfill:embeddings] --dry-run: no writes.');
  if (FORCE) console.log('[backfill:embeddings] --force: re-embed all vacancies.');

  let targetDim: number;
  try {
    const probe = await getEmbedding('JobFlow embedding dimension probe');
    if (!isValidEmbeddingVector(probe)) {
      throw new Error('Probe returned invalid vector');
    }
    targetDim = probe.length;
    console.log(`[backfill:embeddings] ML OK · target dimension = ${targetDim}`);
  } catch (e) {
    console.error(
      '[backfill:embeddings] ML service unreachable. Start: cd ml-service && python -m uvicorn main:app --reload',
    );
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }

  await dbConnect();

  const conn = Vacancy.db;
  const dbLabel = conn.name || '(unknown)';
  const hostLabel = conn.host || conn.client?.options?.hosts?.[0]?.host || 'unknown';
  console.log(`[backfill:embeddings] MongoDB · db=${dbLabel} · host=${hostLabel}`);

  const all = await Vacancy.find({})
    .select(
      '_id title description skillsRequired requirements responsibilities embedding',
    )
    .lean();

  let withAny = 0;
  let compatible = 0;
  for (const row of all) {
    const st = needsEmbedding(row.embedding, targetDim);
    if (st !== 'missing') withAny += 1;
    if (st === 'ok') compatible += 1;
  }

  console.log(
    `[backfill:embeddings] Vacancies total=${all.length} · with embedding field=${withAny} · compatible dim=${compatible}`,
  );

  const queue = all.filter((row) => {
    if (FORCE) return true;
    return needsEmbedding(row.embedding, targetDim) !== 'ok';
  });

  const sliced = queue.slice(SKIP, LIMIT !== undefined ? SKIP + LIMIT : undefined);
  console.log(
    `[backfill:embeddings] To process: ${sliced.length} (queue ${queue.length}, skip ${SKIP}${LIMIT !== undefined ? `, limit ${LIMIT}` : ''})`,
  );

  let embedded = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of sliced) {
    const id = String(row._id);
    const title =
      typeof row.title === 'string' && row.title.trim() ? row.title.trim() : '(untitled)';

    const text = buildVacancyEmbeddingText({
      title: row.title,
      description: row.description,
      skillsRequired: row.skillsRequired,
      requirements: row.requirements as string[] | undefined,
      responsibilities: row.responsibilities as string[] | undefined,
    });

    if (!text.trim()) {
      skipped += 1;
      console.warn(`[backfill:embeddings] skip empty text · ${id} · ${title}`);
      continue;
    }

    if (!FORCE) {
      const st = needsEmbedding(row.embedding, targetDim);
      if (st === 'ok') {
        skipped += 1;
        continue;
      }
    }

    try {
      const vector = await getEmbedding(text);
      if (!isValidEmbeddingVector(vector)) {
        failed += 1;
        console.warn(`[backfill:embeddings] fail invalid vector · ${id} · ${title}`);
        continue;
      }
      if (vector.length !== targetDim) {
        failed += 1;
        console.warn(
          `[backfill:embeddings] fail dim ${vector.length} ≠ ${targetDim} · ${id} · ${title}`,
        );
        continue;
      }

      if (DRY_RUN) {
        embedded += 1;
        console.log(`[backfill:embeddings] dry-run OK · ${id} · ${title} · dim=${vector.length}`);
      } else {
        await Vacancy.updateOne({ _id: row._id }, { $set: { embedding: vector } });
        embedded += 1;
        const prevLen = embeddingLength(row.embedding);
        console.log(
          `[backfill:embeddings] saved · ${id} · ${title} · dim=${vector.length}${prevLen ? ` (was ${prevLen})` : ''}`,
        );
      }
    } catch (e) {
      failed += 1;
      console.warn(
        `[backfill:embeddings] fail · ${id} · ${title} · ${e instanceof Error ? e.message : e}`,
      );
    }

    if (DELAY_MS > 0) await sleep(DELAY_MS);
  }

  const after = await Vacancy.find({ embedding: { $exists: true, $ne: null } })
    .select('embedding')
    .lean();
  let afterCompatible = 0;
  for (const row of after) {
    if (needsEmbedding(row.embedding, targetDim) === 'ok') afterCompatible += 1;
  }

  console.log(
    `[backfill:embeddings] Done · embedded=${embedded} skipped=${skipped} failed=${failed}`,
  );
  console.log(
    `[backfill:embeddings] DB now: ${after.length} with embedding field · ${afterCompatible} compatible (${targetDim}-dim)`,
  );

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('[backfill:embeddings] Fatal:', e);
  process.exit(1);
});
