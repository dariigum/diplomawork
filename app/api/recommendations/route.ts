import dbConnect from '@/lib/db/mongoose';
import { getSession } from '@/lib/auth';
import { Resume, SavedVacancy, Vacancy } from '@/lib/db/schema';
import { NextResponse } from 'next/server';

async function fetchEmbedding(text: string) {
  try {
    const res = await fetch(
      `http://127.0.0.1:8000/embed?text=${encodeURIComponent(text)}`
    );
    const data = await res.json();
    return data.embedding;
  } catch (e) {
    console.error("ML error:", e);
    return null;
  }
}

function cosineSimilarity(a: number[], b: number[]) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function averageVectors(vectors: number[][]) {
  const valid = vectors.filter((v) => Array.isArray(v) && v.length > 0);
  if (valid.length === 0) return null;
  const dim = valid[0].length;
  if (!valid.every((v) => v.length === dim)) return null;
  const avg = new Array(dim).fill(0);
  for (const v of valid) for (let i = 0; i < dim; i++) avg[i] += v[i];
  for (let i = 0; i < dim; i++) avg[i] /= valid.length;
  return avg;
}

export async function GET() {
  await dbConnect();

  const session = await getSession();
  const userId = session?.user?.id ?? null;

  const vacancies = await Vacancy.find({
    embedding: { $exists: true, $ne: [] },
  })
    .lean();

  const savedVacancies = userId
    ? await SavedVacancy.find({ userId }).populate('vacancyId').lean()
    : [];

  const resumes = userId ? await Resume.find({ userId }).lean() : [];
  const resumesText = resumes
    .map((r: any) =>
      [r.title, r.skills, r.experience, r.education, r.phone, r.telegram, r.linkedin, r.github]
        .filter(Boolean)
        .join('\n')
    )
    .filter(Boolean)
    .join('\n\n');

  const savedEmbeddings = savedVacancies
    .map((s: any) => s?.vacancyId?.embedding)
    .filter((e: any) => Array.isArray(e) && e.length > 0) as number[][];

  const resumeEmbedding =
    resumesText && resumesText.length > 0
      ? await fetchEmbedding(resumesText)
      : null;

  const behaviorVector = averageVectors(savedEmbeddings);
  const hasResume = Array.isArray(resumeEmbedding) && resumeEmbedding.length > 0;
  const hasBehavior = Array.isArray(behaviorVector) && behaviorVector.length > 0;

  const activityScore = savedVacancies.length;
  const alpha = activityScore > 3 ? 0.7 : 0.3;

  const recommendedVacancies = hasResume || hasBehavior
    ? (vacancies as any[])
        .map((v) => {
          const resumeScore = hasResume && v.embedding
            ? cosineSimilarity(resumeEmbedding as number[], v.embedding)
            : 0;
          const behaviorScore = hasBehavior && v.embedding
            ? cosineSimilarity(behaviorVector as number[], v.embedding)
            : 0;

          const finalScore = !hasBehavior
            ? resumeScore
            : !hasResume
              ? behaviorScore
              : alpha * behaviorScore + (1 - alpha) * resumeScore;

          return {
            ...v,
            _score: finalScore,
          };
        })
        .sort((a, b) => b._score - a._score)
        .slice(0, 10)
        .map(({ _score, ...rest }) => rest)
    : [];

  return NextResponse.json({ recommendedVacancies });
}

