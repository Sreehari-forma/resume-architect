import { z } from 'zod';
import { assertSameOrigin, errorResponse, HttpError, readJson } from '@/lib/http';
import { profileSchema } from '@/lib/schemas';
import { renderResumePdf } from '@/lib/pdf/server';

export const runtime = 'nodejs';
export const maxDuration = 30;
const input = z.object({ profile: profileSchema, locale: z.enum(['en', 'pl']).default('en') }).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const parsed = input.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
    // The public endpoint never accepts a watermark flag or a paid claim.
    const bytes = await renderResumePdf(parsed.data.profile, parsed.data.locale, true);
    return new Response(new Uint8Array(bytes), { headers: {
      'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="forma-demo.pdf"',
      'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) { return errorResponse(error); }
}
