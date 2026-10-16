import type { UserProfile } from '@/types';
import { containsKeyword, KEYWORD_DICTIONARY, profileSearchText, TECHNICAL_SKILLS } from '@/lib/matching';

/** Surface-level checks complement the grounding prompt; they are not a semantic proof. */
export function numericFacts(text: string): string[] {
  const matches = text.match(/(?:[$€£¥]\s*)?[+−-]?\p{N}+(?:[.,]\p{N}+)*(?:\s*(?:%|percentage points\b|percent\b|[kmb]\b|million\b|billion\b|thousand\b|milliseconds?\b|ms\b|seconds?\b|minutes?\b|hours?\b|days?\b|weeks?\b|months?\b|years?\b|dollars?\b|usd\b|eur\b|gbp\b))?/giu) ?? [];
  const spelled = text.match(/\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|first|second|third|fourth|fifth)\b/gi) ?? [];
  return [...matches.map((value) => value.toLowerCase().replace(/,/g, '').replace(/percent\b/g, '%').replace(/\s/g, '')), ...spelled.map((value) => `word:${value.toLowerCase()}`)].sort();
}

function months(text: string): string[] {
  return (text.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/gi) ?? []).map((month) => month.toLowerCase());
}

export function validateGroundedRewrite({ source, rewrite, profile, jobKeywords, preserveAllNumbers }: {
  source: string;
  rewrite: string;
  profile: UserProfile;
  jobKeywords: string[];
  preserveAllNumbers: boolean;
}): string {
  const text = rewrite.trim();
  if (!text) throw new Error('AI returned an empty rewrite.');
  const sourceNumbers = numericFacts(source);
  const rewrittenNumbers = numericFacts(text);
  // A bullet must retain every original numerical fact. A summary may omit a
  // metric, but cannot introduce a new one or infer years of experience.
  if (preserveAllNumbers
    ? JSON.stringify(sourceNumbers) !== JSON.stringify(rewrittenNumbers)
    : rewrittenNumbers.some((number) => !sourceNumbers.includes(number))) {
    throw new Error('AI changed or invented a numeric fact.');
  }
  if (months(text).some((month) => !months(source).includes(month))) throw new Error('AI introduced an unsupported date.');

  const profileText = profileSearchText(profile);
  const candidates = [...new Set([...KEYWORD_DICTIONARY, ...profile.skills, ...jobKeywords])];
  if (candidates.some((skill) => containsKeyword(text, skill) && !containsKeyword(profileText, skill))) {
    throw new Error('AI introduced an unsupported skill.');
  }
  // A technology used elsewhere in the profile must not migrate into an
  // unrelated employer's achievement during paraphrasing.
  if (TECHNICAL_SKILLS.some((skill) => containsKeyword(text, skill) && !containsKeyword(source, skill))) {
    throw new Error('AI moved a technical skill into an unsupported source.');
  }
  return text;
}
