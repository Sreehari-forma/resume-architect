import type { UserProfile, ResumeAnalysis } from '@/types';

export const TECHNICAL_SKILLS = [
  'React', 'Next.js', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Java', 'Go', 'Rust',
  'C++', 'C#', '.NET', 'HTML', 'CSS', 'Tailwind CSS', 'GraphQL', 'REST', 'SQL', 'PostgreSQL',
  'MySQL', 'MongoDB', 'Redis', 'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform',
  'CI/CD', 'Git', 'GitHub Actions', 'Figma', 'UX', 'UI', 'Agile', 'Scrum', 'Supabase',
  'Firebase', 'Jest', 'Playwright', 'Vitest',
];

export const KEYWORD_DICTIONARY = [
  ...TECHNICAL_SKILLS,
  'Accessibility', 'Design systems', 'System design', 'Microservices',
  'Machine learning', 'AI', 'Data analysis', 'Product strategy', 'Leadership', 'Mentoring',
  'Stakeholder management', 'Communication', 'Collaboration', 'Performance', 'Testing',
  'Jest', 'Playwright', 'Vitest', 'Analytics', 'SaaS', 'Security', 'Observability', 'APIs',
];

export function containsKeyword(text: string, keyword: string): boolean {
  const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!escaped) return false;
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, 'i').test(text);
}

export function profileSearchText(profile: UserProfile): string {
  return [profile.title, profile.summary, ...profile.skills,
    ...profile.experience.flatMap((job) => [job.role, ...job.bullets]),
    ...profile.projects.flatMap((project) => [project.description, ...project.technologies, ...project.bullets]),
    ...profile.education.flatMap((education) => [education.degree, education.field]),
    ...profile.certifications.map((certification) => certification.name),
  ].join(' ');
}

export function extractKeywords(jobDescription: string, profile: UserProfile, suggestions: string[] = []): string[] {
  const seen = new Set<string>();
  return [...suggestions, ...profile.skills, ...KEYWORD_DICTIONARY]
    .filter((keyword) => keyword.length >= 2 && keyword.length <= 64 && containsKeyword(jobDescription, keyword))
    .filter((keyword) => {
      const normalized = keyword.trim().toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    }).slice(0, 40);
}

export function analyzeMatch(profile: UserProfile, jobDescription: string, highlights: string[], suggestions: string[] = []): ResumeAnalysis {
  const keywords = extractKeywords(jobDescription, profile, suggestions);
  const profileText = profileSearchText(profile);
  const matchedKeywords = keywords.filter((keyword) => containsKeyword(profileText, keyword));
  const missingKeywords = keywords.filter((keyword) => !containsKeyword(profileText, keyword));
  return {
    matchScore: keywords.length ? Math.round(matchedKeywords.length / keywords.length * 100) : 0,
    matchedKeywords, missingKeywords,
    highlights: keywords.length ? highlights : [...highlights, 'No recognized job keywords were found; add a detailed job description.'],
  };
}
