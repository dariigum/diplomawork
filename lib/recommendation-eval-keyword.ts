/**
 * Keyword baseline for offline evaluation only.
 * Skill-token Jaccard overlap — no embeddings, no production ranking changes.
 */

import { getActiveResumeLeanForUser } from "@/lib/active-resume";
import { extractSkillsFromText } from "@/lib/skill-analysis";
import { normalizeVacancySkills } from "@/lib/normalize-vacancy-skills";
import { buildEvalCandidateRows } from "@/lib/recommendation-eval-ranking";

function normalizeToken(token: string): string {
  return token.trim().toLowerCase();
}

function tokensFromDelimitedField(raw: string | undefined): Set<string> {
  const tokens = normalizeVacancySkills(raw ?? "", { lowercase: true });
  return new Set(tokens.map(normalizeToken).filter(Boolean));
}

function tokensFromRecognizedSkills(text: string): Set<string> {
  const keys = extractSkillsFromText(text);
  return new Set(keys.map(normalizeToken).filter(Boolean));
}

/** Resume + vacancy skill vocabulary for keyword matching (eval only). */
export function buildEvalSkillTokenSet(parts: string[]): Set<string> {
  const tokens = new Set<string>();
  const blob = parts.filter(Boolean).join("\n");

  for (const token of tokensFromDelimitedField(blob)) {
    tokens.add(token);
  }
  for (const token of tokensFromRecognizedSkills(blob)) {
    tokens.add(token);
  }

  return tokens;
}

/**
 * Jaccard similarity |A∩B| / |A∪B| on normalized skill tokens.
 * Matches structured job postings in this project better than raw TF-IDF on long descriptions.
 */
export function computeSkillJaccardScore(
  resumeTokens: Set<string>,
  vacancyTokens: Set<string>,
): number {
  if (resumeTokens.size === 0 || vacancyTokens.size === 0) return 0;

  let intersection = 0;
  for (const token of vacancyTokens) {
    if (resumeTokens.has(token)) intersection += 1;
  }

  const union = new Set([...resumeTokens, ...vacancyTokens]).size;
  return union > 0 ? intersection / union : 0;
}

export async function rankKeywordEvalCandidates(params: {
  userId: string;
  limit?: number;
}): Promise<Array<{ vacancyId: string; keywordScore: number }>> {
  const limit = params.limit ?? 10;
  const rows = await buildEvalCandidateRows(params.userId);
  if (!rows || rows.length === 0) return [];

  const resume = await getActiveResumeLeanForUser(params.userId);
  if (!resume) return [];

  const resumeTokens = buildEvalSkillTokenSet([
    String(resume.title ?? ""),
    String(resume.skills ?? ""),
    String(resume.experience ?? ""),
    String(resume.education ?? ""),
  ]);

  const scored = rows.map((row) => {
    const vacancyTokens = buildEvalSkillTokenSet([
      row.title,
      row.skillsRequired,
      row.description,
    ]);
    const keywordScore = computeSkillJaccardScore(resumeTokens, vacancyTokens);
    return { vacancyId: row.vacancyId, keywordScore };
  });

  scored.sort((a, b) => {
    if (b.keywordScore !== a.keywordScore)
      return b.keywordScore - a.keywordScore;
    return a.vacancyId.localeCompare(b.vacancyId);
  });

  return scored.slice(0, limit);
}
