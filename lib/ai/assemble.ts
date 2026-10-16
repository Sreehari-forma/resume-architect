import type { TailoredResume, UserProfile } from '@/types';
import type { TailoringPlan } from '@/lib/schemas';
import { generateLatex } from '@/lib/latex';
import { analyzeMatch, containsKeyword } from '@/lib/matching';
import { validateGroundedRewrite } from '@/lib/ai/grounding';

export function summarySentences(summary: string): string[] {
  // Keep sentence text intact, including its punctuation and abbreviations.
  return summary.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
}

function ordered<T>(items: T[], indices: number[]): T[] {
  const unique = [...new Set(indices)];
  if (unique.some((index) => index < 0 || index >= items.length)) throw new Error('AI returned an unknown source index.');
  return [...unique.map((index) => items[index]), ...items.filter((_, index) => !unique.includes(index))];
}

export function assembleResume(profile: UserProfile, jobDescription: string, plan: TailoringPlan): TailoredResume {
  for (const entry of plan.experience) {
    if (!profile.experience.some((item) => item.id === entry.id)) throw new Error('AI returned an unknown experience.');
  }
  for (const entry of plan.projects) {
    if (!profile.projects.some((item) => item.id === entry.id)) throw new Error('AI returned an unknown project.');
  }
  if (new Set(plan.experience.map((item) => item.id)).size !== plan.experience.length ||
      new Set(plan.projects.map((item) => item.id)).size !== plan.projects.length) throw new Error('AI returned duplicate source IDs.');
  const sentences = summarySentences(profile.summary);
  const selected = [...new Set(plan.summarySentenceIndices)];
  if (selected.some((index) => index >= sentences.length)) throw new Error('AI returned an unknown summary sentence.');
  let rewrittenAchievements = 0;
  const jobKeywords = plan.keywords.filter((keyword) => containsKeyword(jobDescription, keyword));
  function rewriteBullets(bullets: string[], entryPlan: TailoringPlan['experience'][number] | undefined): string[] {
    const rewrites = entryPlan?.bulletRewrites ?? [];
    if (new Set(rewrites.map((rewrite) => rewrite.sourceIndex)).size !== rewrites.length) throw new Error('AI returned duplicate source rewrites.');
    const edited = [...bullets];
    for (const rewrite of rewrites) {
      const source = bullets[rewrite.sourceIndex];
      if (!source) throw new Error('AI returned an unknown source bullet.');
      edited[rewrite.sourceIndex] = validateGroundedRewrite({ source, rewrite: rewrite.text, profile, jobKeywords, preserveAllNumbers: true });
      if (edited[rewrite.sourceIndex] !== source) rewrittenAchievements += 1;
    }
    return ordered(edited, entryPlan?.bulletIndices ?? []);
  }
  let summary = selected.length ? selected.map((index) => sentences[index]).join(' ') : profile.summary;
  if (plan.summaryRewrite) {
    if (!plan.summaryRewrite.sources.length) throw new Error('AI returned an unsupported summary.');
    const sourceText = plan.summaryRewrite.sources.map((reference) => {
      let text: string | undefined;
      if (reference.section === 'summary') {
        if (reference.id !== 'summary') throw new Error('AI returned an unknown summary source.');
        text = sentences[reference.index];
      } else {
        text = profile[reference.section].find((entry) => entry.id === reference.id)?.bullets[reference.index];
      }
      if (!text) throw new Error('AI returned an unknown summary source.');
      return text;
    }).join(' ');
    summary = validateGroundedRewrite({ source: sourceText, rewrite: plan.summaryRewrite.text, profile, jobKeywords, preserveAllNumbers: false });
  }
  const tailored: UserProfile = {
    ...profile,
    summary,
    skills: ordered(profile.skills, plan.skillIndices),
    experience: profile.experience.map((entry) => ({ ...entry, bullets: rewriteBullets(entry.bullets, plan.experience.find((item) => item.id === entry.id)) })),
    projects: profile.projects.map((entry) => ({ ...entry, bullets: rewriteBullets(entry.bullets, plan.projects.find((item) => item.id === entry.id)) })),
  };
  const reorderedRoles = plan.experience.filter((entry) => {
    const source = profile.experience.find((item) => item.id === entry.id)!;
    return JSON.stringify(ordered(source.bullets, entry.bulletIndices)) !== JSON.stringify(source.bullets);
  }).length;
  const matchedSkills = tailored.skills.filter((skill) => containsKeyword(jobDescription, skill));
  const highlights = [
    rewrittenAchievements ? `Rewrote ${rewrittenAchievements} source-linked achievement${rewrittenAchievements === 1 ? '' : 's'} for clearer action and impact, retaining the recorded numbers.` : 'Preserved your original achievement wording.',
    ...(reorderedRoles ? [`Prioritized job-relevant achievements in ${reorderedRoles} role${reorderedRoles === 1 ? '' : 's'}.`] : []),
    matchedSkills.length ? `Emphasized ${matchedSkills.slice(0, 4).join(', ')} from your existing skills.` : 'Preserved your skills; missing requirements were not added.',
    tailored.summary !== profile.summary ? (plan.summaryRewrite ? 'Rewrote your summary using explicitly referenced profile evidence.' : 'Focused your summary using your original sentences.') : 'Preserved your original professional summary.',
    'Review AI wording before applying: numeric and skill checks do not verify every factual meaning.',
  ];
  return {
    id: crypto.randomUUID(), mode: 'ai', createdAt: new Date().toISOString(),
    jobTitle: jobDescription.includes(plan.jobTitle) && plan.jobTitle.trim() ? plan.jobTitle : 'Target role',
    company: jobDescription.includes(plan.company) && plan.company.trim() ? plan.company : 'Target company',
    profile: tailored, analysis: analyzeMatch(tailored, jobDescription, highlights, plan.keywords), latex: generateLatex(tailored),
  };
}
