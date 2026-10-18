import type { UserProfile, TailoredResume } from '@/types';
import { generateLatex } from '@/lib/latex';
import { analyzeMatch, containsKeyword, extractKeywords } from '@/lib/matching';

export const EMPTY_PROFILE: UserProfile = {
  fullName: '', title: '', email: '', phone: '', linkedin: '', github: '', location: '',
  website: '', summary: '', experience: [], education: [], skills: [], projects: [], certifications: [],
};

export const DEMO_PROFILE: UserProfile = {
  fullName: 'Alex Morgan', title: 'Senior Product Engineer', email: 'alex@example.com',
  phone: '+1 (415) 555-0142', linkedin: 'https://linkedin.com/in/alex-morgan-demo',
  github: 'https://github.com', location: 'San Francisco, CA', website: 'https://example.com',
  summary: 'Product-minded engineer building thoughtful, accessible experiences for the web. Experienced in React, TypeScript, and design systems, with a focus on performance and measurable customer impact.',
  experience: [
    { id: 'exp-1', company: 'Forma', role: 'Senior Frontend Engineer', location: 'San Francisco, CA', startDate: '2022-06', endDate: '', current: true,
      bullets: ['Led the migration of a SaaS dashboard to React and TypeScript, reducing page load time by 38%.',
        'Built a design system of 45 accessible components with Figma and Tailwind CSS, adopted by 6 product teams.',
        'Partnered with product and design to improve onboarding conversion by 24%.',
        'Mentored 3 engineers and established testing practices with Jest and Playwright.'] },
    { id: 'exp-2', company: 'Layers', role: 'Frontend Engineer', location: 'Remote', startDate: '2020-01', endDate: '2022-05', current: false,
      bullets: ['Shipped responsive React interfaces serving 20,000 monthly active users.',
        'Integrated REST APIs and GraphQL endpoints with reliable loading and error states.',
        'Improved accessibility to WCAG 2.1 AA across core product workflows.'] },
  ],
  education: [{ id: 'edu-1', school: 'University of California, Davis', degree: 'B.S.', field: 'Computer Science', startDate: '2015', endDate: '2019' }],
  skills: ['React', 'TypeScript', 'Next.js', 'JavaScript', 'Tailwind CSS', 'Node.js', 'GraphQL', 'REST', 'Figma', 'Design systems', 'Accessibility', 'Jest', 'Playwright', 'Git', 'Performance'],
  projects: [{ id: 'project-1', name: 'Open Components', description: 'An accessible component library for modern web applications.', url: 'https://github.com', technologies: ['React', 'TypeScript', 'Tailwind CSS'], bullets: ['Published 18 documented components with keyboard navigation and responsive layouts.'] }],
  certifications: [],
};

export const SAMPLE_JOB_DESCRIPTION = `Senior Frontend Engineer · Linear Labs
We are building tools that help ambitious teams do their best work. Join our product engineering team to create fast, thoughtful SaaS experiences.

What you will do
• Build responsive product experiences with React, Next.js, TypeScript, and Tailwind CSS.
• Collaborate with product designers in Figma and evolve our design systems.
• Own accessibility, performance, and testing with Jest and Playwright.
• Integrate GraphQL and REST APIs and mentor other engineers.

What you bring
• Experience delivering production React applications and measurable product impact.
• Strong JavaScript, HTML, CSS, and Git fundamentals.
• Clear communication and collaboration across engineering, product, and design.
• Familiarity with PostgreSQL, AWS, and CI/CD is a plus.`;

export const SAMPLE_JOB_DESCRIPTION_PL = `Starszy inżynier frontendu · Linear Labs
Tworzymy narzędzia, które pomagają ambitnym zespołom pracować lepiej. Dołącz do zespołu produktowego i rozwijaj szybkie, przemyślane aplikacje SaaS.

Twoje zadania
• Budowanie responsywnych aplikacji z użyciem React, Next.js, TypeScript i Tailwind CSS.
• Współpraca z projektantami w Figma oraz rozwój systemu komponentów.
• Dbanie o dostępność, wydajność i testy z wykorzystaniem Jest oraz Playwright.
• Integracja GraphQL i REST API oraz wspieranie rozwoju innych inżynierów.

Nasze oczekiwania
• Doświadczenie we wdrażaniu aplikacji React i mierzalnym wpływie na produkt.
• Dobra znajomość JavaScript, HTML, CSS i Git.
• Jasna komunikacja i współpraca między zespołami technicznymi, produktowymi i projektowymi.
• Znajomość PostgreSQL, AWS oraz CI/CD będzie dodatkowym atutem.`;

export function profileCompleteness(profile: UserProfile): number {
  const checks = [Boolean(profile.fullName.trim()), Boolean(profile.title.trim()), Boolean(profile.email.trim()),
    Boolean(profile.location.trim()), Boolean(profile.summary.trim()),
    Boolean(profile.phone.trim() || profile.linkedin.trim() || profile.website.trim()),
    profile.experience.some((item) => item.company.trim() && item.role.trim() && item.bullets.some((bullet) => bullet.trim())),
    profile.education.some((item) => item.school.trim() && item.degree.trim()), profile.skills.length >= 3,
    profile.projects.some((item) => item.name.trim() && item.description.trim()) || profile.certifications.some((item) => item.name.trim()),
  ];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}

export function createDemoResume(profile: UserProfile, jobDescription: string): TailoredResume {
  const keywords = extractKeywords(jobDescription, profile);
  const relevance = (text: string) => keywords.filter((keyword) => containsKeyword(text, keyword)).length;
  const tailored: UserProfile = {
    ...profile,
    skills: [...profile.skills].sort((a, b) => Number(containsKeyword(jobDescription, b)) - Number(containsKeyword(jobDescription, a))),
    experience: profile.experience.map((job) => ({ ...job, bullets: [...job.bullets].sort((a, b) => relevance(b) - relevance(a)) })),
    projects: profile.projects.map((project) => ({ ...project, bullets: [...project.bullets].sort((a, b) => relevance(b) - relevance(a)) })),
  };
  const firstLine = jobDescription.trim().split('\n')[0]?.slice(0, 120) || 'Target role';
  const [jobTitle, company] = firstLine.split(/\s[·|]\s/);
  return {
    id: `demo-${crypto.randomUUID()}`, jobTitle: jobTitle || 'Target role', company: company || 'Target company',
    profile: tailored, latex: generateLatex(tailored), mode: 'demo', createdAt: new Date().toISOString(),
    analysis: analyzeMatch(tailored, jobDescription, [
      'Demo: local keyword matching, with no AI request or external data transfer.',
      'Moved relevant achievements and skills earlier while preserving your original facts and metrics.',
      'Generated a clean, single-column resume and escaped LaTeX from the same profile.',
    ]),
  };
}
