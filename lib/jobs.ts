import { HttpError, readBoundedText } from '@/lib/http';

type JobProvider = { provider: 'greenhouse' | 'lever'; apiUrl: string };

/** Never fetch user URLs. Translate recognized posting paths into fixed provider APIs. */
export function resolveJobProvider(input: string): JobProvider {
  let url: URL;
  try { url = new URL(input); } catch { throw new HttpError(400, 'Enter a valid public job posting URL, or paste the description.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) {
    throw new HttpError(400, 'Use a direct HTTPS job posting link without credentials, custom ports, or fragments.');
  }
  const parts = url.pathname.split('/').filter(Boolean);
  const slug = /^[a-zA-Z0-9_-]{1,100}$/;
  if (['boards.greenhouse.io', 'job-boards.greenhouse.io'].includes(url.hostname)) {
    if (parts.length !== 3 || !slug.test(parts[0]) || parts[1] !== 'jobs' || !/^\d{1,20}$/.test(parts[2])) {
      throw new HttpError(400, 'Use a direct Greenhouse job link, such as job-boards.greenhouse.io/company/jobs/12345.');
    }
    return { provider: 'greenhouse', apiUrl: `https://boards-api.greenhouse.io/v1/boards/${parts[0]}/jobs/${parts[2]}` };
  }
  if (['jobs.lever.co', 'jobs.eu.lever.co'].includes(url.hostname)) {
    if ((parts.length !== 2 && !(parts.length === 3 && parts[2] === 'apply')) || !slug.test(parts[0]) || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(parts[1])) {
      throw new HttpError(400, 'Use a direct Lever job posting link, or paste the description instead.');
    }
    const apiHost = url.hostname === 'jobs.eu.lever.co' ? 'api.eu.lever.co' : 'api.lever.co';
    return { provider: 'lever', apiUrl: `https://${apiHost}/v0/postings/${parts[0]}/${parts[1]}?mode=json` };
  }
  throw new HttpError(422, 'Automatic import supports public Greenhouse and Lever job links. For LinkedIn, Indeed, and other sites, paste the job description.');
}

export function htmlToText(html: string): string {
  // Decode before stripping: Greenhouse can return entity-encoded markup.
  const decode = (value: string) => value.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[a-f\d]+);/gi, (entity) => {
    const named: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ' };
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    const code = entity.toLowerCase().startsWith('&#x') ? parseInt(entity.slice(3, -1), 16) : parseInt(entity.slice(2, -1), 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  });
  return decode(decode(html))
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|ul|ol)>|<br\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '• ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\t ]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();
}

export async function extractJobDescription(input: string): Promise<string> {
  const { provider, apiUrl } = resolveJobProvider(input);
  let response: Response;
  try {
    response = await fetch(apiUrl, {
      redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(10000),
      headers: { Accept: 'application/json', 'User-Agent': 'ResumeArchitect/1.0' },
    });
  } catch { throw new HttpError(422, 'The job board did not respond. Paste the job description to continue.'); }
  if (!response.ok || response.status >= 300) throw new HttpError(422, 'The job could not be imported. It may be closed or require sign-in. Paste its description instead.');
  const raw = await readBoundedText(response, 350000);
  let data: Record<string, unknown>;
  try { data = JSON.parse(raw); if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(); }
  catch { throw new HttpError(422, 'The job board returned an unsupported format. Paste the description instead.'); }
  const string = (value: unknown) => typeof value === 'string' ? value : '';
  let text: string;
  if (provider === 'greenhouse') text = htmlToText([string(data.title), string(data.content)].join('\n\n'));
  else {
    const lists = Array.isArray(data.lists) ? data.lists.slice(0, 30).flatMap((item: unknown) => {
      if (!item || typeof item !== 'object') return [];
      const record = item as Record<string, unknown>;
      return [string(record.text), string(record.content)];
    }) : [];
    text = htmlToText([string(data.text), string(data.descriptionPlain) || string(data.description), ...lists, string(data.additionalPlain) || string(data.additional)].join('\n\n'));
  }
  if (text.length < 80) throw new HttpError(422, 'This posting has too little readable text. Paste the complete job description instead.');
  if (text.length > 24000) throw new HttpError(422, 'This posting is too long to import. Paste its key responsibilities and requirements instead.');
  return text;
}
