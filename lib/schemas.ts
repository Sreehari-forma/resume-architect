import { z } from 'zod';

const short = z.string().trim().max(200);
const url = z.string().trim().max(500).refine((value) => {
  if (!value) return true;
  try { const parsed = new URL(value); return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password; } catch { return false; }
}, 'Use a complete http:// or https:// link.');
const id = z.string().min(1).max(100);
const date = z.string().max(30);
const bullets = z.array(z.string().trim().max(1200)).max(20);

export const profileSchema = z.object({
  fullName: short, title: short, email: z.string().trim().max(254).refine((value) => !value || z.string().email().safeParse(value).success, 'Enter a valid email.'),
  phone: z.string().trim().max(50), linkedin: url, github: url, location: short, website: url,
  summary: z.string().trim().max(3000),
  experience: z.array(z.object({ id, company: short, role: short, location: short, startDate: date, endDate: date, current: z.boolean(), bullets }).strict()).max(25),
  education: z.array(z.object({ id, school: short, degree: short, field: short, startDate: date, endDate: date }).strict()).max(12),
  skills: z.array(z.string().trim().min(1).max(80)).max(80),
  projects: z.array(z.object({ id, name: short, description: z.string().trim().max(2000), url, technologies: z.array(short).max(25), bullets }).strict()).max(20),
  certifications: z.array(z.object({ id, name: short, issuer: short, date, url }).strict()).max(30),
}).strict().superRefine((profile, context) => {
  for (const section of ['experience', 'education', 'projects', 'certifications'] as const) {
    const ids = profile[section].map((item) => item.id);
    if (new Set(ids).size !== ids.length) context.addIssue({ code: 'custom', path: [section], message: 'Entries must have unique IDs.' });
  }
  if (JSON.stringify(profile).length > 80000) context.addIssue({ code: 'custom', message: 'Profile is too large. Shorten older experience entries.' });
});

export const tailorRequestSchema = z.object({
  profile: profileSchema,
  jobDescription: z.string().trim().min(80, 'Paste at least 80 characters from the job description.').max(24000, 'Job descriptions must be under 24,000 characters.'),
}).strict();

export const extractRequestSchema = z.object({ url: z.string().trim().url().max(2000) }).strict();

export const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8, 'Use a password with at least 8 characters.').max(128),
});

const bulletRewriteSchema = z.object({
  sourceIndex: z.number().int().min(0).max(19),
  text: z.string().trim().min(1).max(1200),
}).strict();

const entryPlanSchema = z.object({
  id: z.string().min(1).max(100),
  bulletIndices: z.array(z.number().int().min(0).max(19)).max(20),
  bulletRewrites: z.array(bulletRewriteSchema).max(20),
}).strict();

// Edits carry source references. The assembler validates identifiers, numerical
// facts and recognized skill claims; the user still reviews semantic fidelity.
export const tailoringPlanSchema = z.object({
  jobTitle: z.string().max(160), company: z.string().max(160),
  keywords: z.array(z.string().min(2).max(64)).max(40),
  summarySentenceIndices: z.array(z.number().int().min(0).max(100)).max(6),
  summaryRewrite: z.object({
    text: z.string().trim().min(1).max(3000),
    sources: z.array(z.object({
      section: z.enum(['summary', 'experience', 'projects']),
      id: z.string().min(1).max(100),
      index: z.number().int().min(0).max(100),
    }).strict()).min(1).max(8),
  }).strict().nullable(),
  experience: z.array(entryPlanSchema).max(25),
  skillIndices: z.array(z.number().int().min(0).max(79)).max(80),
  projects: z.array(entryPlanSchema).max(20),
  latex: z.string().max(50000),
}).strict();

export type TailoringPlan = z.infer<typeof tailoringPlanSchema>;
