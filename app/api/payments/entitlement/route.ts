import { assertSameOrigin, errorResponse, HttpError, readJson } from '@/lib/http';
import { resumeFingerprint, snapshotRequestSchema } from '@/lib/billing/validation';
import { billingServices, databaseFailure, hasPaidOrder, privateJson, requireBillingUser } from '@/lib/billing/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user } = await requireBillingUser();
    const input = snapshotRequestSchema.safeParse(await readJson(request));
    if (!input.success) throw new HttpError(400, 'Review your resume before checking its download status.');
    const { admin } = billingServices();
    const fingerprint = resumeFingerprint(input.data.profile, input.data.locale);
    const { data, error } = await admin.from('resume_snapshots').select('id').eq('user_id', user.id).eq('fingerprint', fingerprint).maybeSingle();
    if (error) databaseFailure(error);
    if (!data || !await hasPaidOrder(admin, user.id, data.id)) return privateJson({ paid: false });
    return privateJson({ paid: true, resumeId: data.id });
  } catch (error) { return errorResponse(error); }
}
