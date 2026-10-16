import { apiContext } from '@/lib/api-context';
import { tailorRequestSchema } from '@/lib/schemas';
import { assertSameOrigin, errorResponse, HttpError, readJson } from '@/lib/http';
import { createDemoResume } from '@/lib/demo';
import { generateTailoringPlan } from '@/lib/ai/gemini';
import { assembleResume } from '@/lib/ai/assemble';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const parsed = tailorRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
    const { profile, jobDescription } = parsed.data;
    if (!profile.fullName || (!profile.experience.length && !profile.projects.length && !profile.skills.length)) {
      throw new HttpError(400, 'Add your name and at least some experience, a project, or skills to your Master Vault first.');
    }
    const context = await apiContext('tailor');
    if (context.isDemo) return Response.json({ resume: createDemoResume(profile, jobDescription) }, { headers: { 'Cache-Control': 'no-store' } });
    const plan = await generateTailoringPlan(profile, jobDescription);
    let resume;
    try { resume = assembleResume(profile, jobDescription, plan); }
    catch { throw new HttpError(502, 'The generated result could not be verified against your profile. Your facts were preserved; please retry.'); }
    const { error: saveError } = await context.supabase.from('tailored_resumes').insert({
      id: resume.id, user_id: context.user.id, data: resume,
    });
    if (saveError) throw new HttpError(503, 'The resume could not be saved. Check the Supabase migration and try again.');
    return Response.json({ resume }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
