/**
 * One-off / periodic backfill: compute resume embeddings via ML service and persist on Resume.
 * Updates only the `embedding` field on existing documents (no create/delete, no interaction writes).
 *
 * Usage (ML must be running: uvicorn in ml-service/):
 *   npm run backfill:resume-embeddings
 *   npm run backfill:resume-embeddings -- --dry-run
 *   npm run backfill:resume-embeddings -- --force
 *   npm run backfill:resume-embeddings -- --limit 50 --delay-ms 100
 */

import './bootstrap-demo-env';

import dbConnect from '../lib/db/mongoose';
import { Resume } from '../lib/db/schema';
import { buildResumeEmbeddingText } from '../lib/embedding-text';
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
  console.log('[backfill:resume-embeddings] Starting…');
  if (DRY_RUN) console.log('[backfill:resume-embeddings] --dry-run: no writes.');
  if (FORCE) console.log('[backfill:resume-embeddings] --force: re-embed all resumes.');

  let targetDim: number;
  try {
    const probe = await getEmbedding('JobFlow embedding dimension probe');
    if (!isValidEmbeddingVector(probe)) {
      throw new Error('Probe returned invalid vector');
    }
    targetDim = probe.length;
    console.log(`[backfill:resume-embeddings] ML OK · target dimension = ${targetDim}`);
  } catch (e) {
    console.error(
      '[backfill:resume-embeddings] ML service unreachable. Start: cd ml-service && python -m uvicorn main:app --reload',
    );
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }

  await dbConnect();

  const conn = Resume.db;
  const dbLabel = conn.name || '(unknown)';
  const hostLabel = conn.host || 'unknown';
  console.log(`[backfill:resume-embeddings] MongoDB · db=${dbLabel} · host=${hostLabel}`);

  const all = await Resume.find({})
    .select('_id userId title skills experience education embedding')
    .lean();

  let withAny = 0;
  let compatible = 0;
  for (const row of all) {
    const st = needsEmbedding(row.embedding, targetDim);
    if (st !== 'missing') withAny += 1;
    if (st === 'ok') compatible += 1;
  }

  console.log(
    `[backfill:resume-embeddings] Resumes total=${all.length} · with embedding field=${withAny} · compatible dim=${compatible}`,
  );

  const queue = all.filter((row) => {
    if (FORCE) return true;
    return needsEmbedding(row.embedding, targetDim) !== 'ok';
  });

  const sliced = queue.slice(SKIP, LIMIT !== undefined ? SKIP + LIMIT : undefined);
  console.log(
    `[backfill:resume-embeddings] To process: ${sliced.length} (queue ${queue.length}, skip ${SKIP}${LIMIT !== undefined ? `, limit ${LIMIT}` : ''})`,
  );

  let embedded = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of sliced) {
    const id = String(row._id);
    const label =
      typeof row.title === 'string' && row.title.trim() ? row.title.trim() : '(untitled)';

    const text = buildResumeEmbeddingText({
      title: row.title,
      skills: row.skills,
      experience: row.experience,
      education: row.education,
    });

    if (!text.trim()) {
      skipped += 1;
      console.warn(`[backfill:resume-embeddings] skip empty text · ${id} · ${label}`);
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
        console.warn(`[backfill:resume-embeddings] fail invalid vector · ${id} · ${label}`);
        continue;
      }
      if (vector.length !== targetDim) {
        failed += 1;
        console.warn(
          `[backfill:resume-embeddings] fail dim ${vector.length} ≠ ${targetDim} · ${id} · ${label}`,
        );
        continue;
      }

      if (DRY_RUN) {
        embedded += 1;
        console.log(
          `[backfill:resume-embeddings] dry-run OK · ${id} · ${label} · dim=${vector.length}`,
        );
      } else {
        await Resume.updateOne({ _id: row._id }, { $set: { embedding: vector } });
        embedded += 1;
        const prevLen = embeddingLength(row.embedding);
        console.log(
          `[backfill:resume-embeddings] saved · ${id} · ${label} · dim=${vector.length}${prevLen ? ` (was ${prevLen})` : ''}`,
        );
      }
    } catch (e) {
      failed += 1;
      console.warn(
        `[backfill:resume-embeddings] fail · ${id} · ${label} · ${e instanceof Error ? e.message : e}`,
      );
    }

    if (DELAY_MS > 0) await sleep(DELAY_MS);
  }

  const after = await Resume.find({ embedding: { $exists: true, $ne: null } })
    .select('embedding')
    .lean();
  let afterCompatible = 0;
  for (const row of after) {
    if (needsEmbedding(row.embedding, targetDim) === 'ok') afterCompatible += 1;
  }

  console.log(
    `[backfill:resume-embeddings] Done · embedded=${embedded} skipped=${skipped} failed=${failed}`,
  );
  console.log(
    `[backfill:resume-embeddings] DB now: ${after.length} with embedding field · ${afterCompatible} compatible (${targetDim}-dim)`,
  );

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('[backfill:resume-embeddings] Fatal:', e);
  process.exit(1);
});
