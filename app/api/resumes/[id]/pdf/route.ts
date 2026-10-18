import { errorResponse, HttpError } from '@/lib/http';
import { resumeIdSchema, snapshotRequestSchema } from '@/lib/billing/validation';
import { billingServices, findOwnedSnapshot, hasPaidOrder, requireBillingUser } from '@/lib/billing/server';
import { renderResumePdf } from '@/lib/pdf/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireBillingUser();
    const id = resumeIdSchema.safeParse((await context.params).id);
    if (!id.success) throw new HttpError(404, 'This resume was not found.');
    const { admin } = billingServices();
    const snapshot = await findOwnedSnapshot(admin, user.id, id.data);
    if (!snapshot) throw new HttpError(404, 'This resume was not found.');
    if (!await hasPaidOrder(admin, user.id, snapshot.id)) throw new HttpError(402, 'Purchase this resume to download its watermark-free PDF.');
    const validated = snapshotRequestSchema.safeParse({ profile: snapshot.profile, locale: snapshot.locale });
    if (!validated.success) throw new HttpError(503, 'The saved resume could not be rendered. Contact support.');
    const pdf = await renderResumePdf(validated.data.profile, validated.data.locale, false);
    return new Response(Buffer.from(pdf), { headers: {
      'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="forma-cv.pdf"',
      'Cache-Control': 'private, no-store', Vary: 'Cookie', 'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) { return errorResponse(error); }
}
