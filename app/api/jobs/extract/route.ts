import { extractRequestSchema } from '@/lib/schemas';
import { apiContext } from '@/lib/api-context';
import { assertSameOrigin, errorResponse, HttpError, readJson } from '@/lib/http';
import { extractJobDescription } from '@/lib/jobs';

export const runtime = 'nodejs';
export const maxDuration = 20;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const parsed = extractRequestSchema.safeParse(await readJson(request, 4000));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
    await apiContext('extract');
    const text = await extractJobDescription(parsed.data.url);
    return Response.json({ text }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
