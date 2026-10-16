export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;
  let expected: string;
  try { expected = new URL(configuredOrigin || request.url).origin; }
  catch { throw new HttpError(503, 'The application URL is not configured correctly.'); }
  if (origin === expected) return;
  // Next's development request URL can use localhost even when the browser
  // opened 127.0.0.1. Only bridge known loopback aliases, without expanding the
  // allowed protocol or port. A configured canonical origin always stays exact.
  if (!configuredOrigin && process.env.NODE_ENV === 'development' && origin) {
    try {
      const supplied = new URL(origin);
      const canonical = new URL(expected);
      const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);
      if (supplied.origin === origin && loopback.has(supplied.hostname) && loopback.has(canonical.hostname)
          && supplied.protocol === canonical.protocol && supplied.port === canonical.port) return;
    } catch { /* Malformed Origin headers fail the same-origin check below. */ }
  }
  throw new HttpError(403, 'This request must come from the application. Refresh the page and try again.');
}

/** Check streamed bytes, rather than trusting Content-Length from a client or provider. */
export async function readBoundedText(response: Request | Response, maximum: number): Promise<string> {
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > maximum) {
    await response.body?.cancel();
    throw new HttpError(413, 'This content is too large. Paste a shorter job description.');
  }
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) {
        await reader.cancel();
        throw new HttpError(413, 'This content is too large. Paste a shorter job description.');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(bytes);
}

export async function readJson(request: Request, maximum = 120000): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'Send a JSON request.');
  const raw = await readBoundedText(request, maximum);
  try { return JSON.parse(raw); }
  catch { throw new HttpError(400, 'The request was not valid JSON.'); }
}

export function errorResponse(error: unknown): Response {
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof HttpError ? error.message : 'Something went wrong. Please try again.';
  return Response.json({ error: message }, {
    status, headers: { 'Cache-Control': 'no-store', ...(status === 429 ? { 'Retry-After': '3600' } : {}) },
  });
}
