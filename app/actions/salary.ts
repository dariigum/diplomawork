'use server'

import dbConnect from '@/lib/db/mongoose';
import { Vacancy } from '@/lib/db/schema';

export async function getAvgSalaryForSkills(skills: string[]) {
  if (!Array.isArray(skills) || skills.length === 0) return null;
  if (skills.length > 5) skills = skills.slice(0, 5);
  
  await dbConnect();

  const cleanSkills = skills.filter(isMeaningfulSkill);
  const query =
    cleanSkills.length > 0
      ? cleanSkills.join(' ')
      : skills.join(' ');
  const queryEmbedding = await embed(query);
  if (!queryEmbedding?.length) return null;

  const allVacancies = await Vacancy.find({
    embedding: { $exists: true, $ne: [] },
  }).lean();
  if (allVacancies.length === 0) return null;

  const scored = (allVacancies as any[])
    .map((job) => ({
      ...job,
      _score: cosineSimilarity(queryEmbedding, job.embedding),
    }));

  const filteredJobs = scored.filter((j) => j._score > 0.3);
  const ranked = filteredJobs.length > 0
    ? filteredJobs.sort((a, b) => b._score - a._score)
    : scored.sort((a, b) => b._score - a._score).slice(0, Math.min(3, scored.length));

  const topK = Math.min(10, ranked.length);
  const topJobs = ranked.slice(0, topK);
  if (topJobs.length === 0) return null;
  const avgScore =
    topJobs.reduce((sum, j) => sum + j._score, 0) / topJobs.length;

  let confidence: 'Low' | 'Medium' | 'High' = 'Low';
  if (topJobs.length >= 5 && avgScore > 0.6) {
    confidence = 'High';
  } else if (topJobs.length >= 3 && avgScore > 0.4) {
    confidence = 'Medium';
  } else {
    confidence = 'Low';
  }

  const isWeakMatch = avgScore < 0.35;

  const salaries = topJobs.map((j) => (Number(j.salaryMin) + Number(j.salaryMax)) / 2);
  const avg = salaries.reduce((sum, s) => sum + s, 0) / salaries.length;
  const min = Math.min(...salaries);
  const max = Math.max(...salaries);

  return {
    minSalary: Math.round(min),
    maxSalary: Math.round(max),
    avgSalary: Math.round(avg),
    jobs: topJobs.length,
    confidence,
    avgScore,
    isWeakMatch,
    usedSkills: cleanSkills.length > 0 ? cleanSkills : skills,
  };
}

function isMeaningfulSkill(skill: string) {
  const normalized = skill.toLowerCase().trim();

  const allowedShort = [
    "ui","ux","qa","hr","ai","ml","c","r","go",
    "aws","git","sql","css","html"
  ];
  if (allowedShort.includes(normalized)) return true;

  if (normalized.length < 3) return false;
  if (/([a-z])\1{2,}/.test(normalized)) return false;

  const weakWords = [
    "lol","lolo","test","aaa","bbb","ccc","asdf","qwerty"
  ];
  if (weakWords.includes(normalized)) return false;

  return true;
}

async function embed(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(
      `http://127.0.0.1:8000/embed?text=${encodeURIComponent(text)}`,
      { cache: 'no-store' }
    );
    const data = await res.json();
    return Array.isArray(data?.embedding) ? (data.embedding as number[]) : null;
  } catch {
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
