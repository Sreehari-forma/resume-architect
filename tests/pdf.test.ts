import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, PDFDict, PDFName, PDFNumber } from 'pdf-lib';
import { renderResumePdf } from '../lib/pdf/server';
import { DEMO_PROFILE } from '../lib/demo';
import { POST } from '../app/api/resumes/demo/route';

const polishProfile = { ...structuredClone(DEMO_PROFILE), fullName: 'Łucja Żółć', location: 'Łódź, Polska',
  summary: 'Zażółć gęślą jaźń. Inżynierka oprogramowania tworząca dostępne aplikacje internetowe.' };

function hasWatermarkOpacity(page: ReturnType<PDFDocument['getPage']>): boolean {
  const states = page.node.Resources()?.lookup(PDFName.of('ExtGState'), PDFDict);
  return states?.values().some(value => {
    const dict = page.doc.context.lookup(value, PDFDict);
    const opacity = dict.lookupMaybe(PDFName.of('ca'), PDFNumber);
    return opacity?.asNumber() === .13;
  }) ?? false;
}

test('demo PDF embeds Polish-capable fonts and a watermark on every page', async () => {
  const profile = structuredClone(polishProfile);
  profile.experience = Array.from({ length: 8 }, (_, index) => ({ ...profile.experience[0], id: `exp-${index}` }));
  const document = await PDFDocument.load(await renderResumePdf(profile, 'pl', true));
  assert.equal(document.getTitle(), 'Łucja Żółć - CV');
  assert.equal(document.getSubject(), 'Podgląd demonstracyjny');
  assert.ok(document.getPageCount() > 1);
  for (const page of document.getPages()) {
    assert.equal(page.getWidth(), 595.28);
    assert.equal(hasWatermarkOpacity(page), true);
    const fonts = page.node.Resources()?.lookup(PDFName.of('Font'), PDFDict);
    assert.ok(fonts && fonts.keys().length >= 1);
  }
});

test('clean PDF rendering has no demo watermark graphics state', async () => {
  const document = await PDFDocument.load(await renderResumePdf(polishProfile, 'pl', false));
  assert.equal(document.getSubject(), 'CV');
  assert.ok(document.getPageCount() >= 1);
  for (const page of document.getPages()) assert.equal(hasWatermarkOpacity(page), false);
});

test('public demo endpoint forces a watermark and rejects client clean-export flags', async () => {
  const previous = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  try {
    const request = (extra: Record<string, unknown> = {}) => new Request('http://localhost:3000/api/resumes/demo', {
      method: 'POST', headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
      body: JSON.stringify({ profile: polishProfile, locale: 'pl', ...extra }),
    });
    const rejected = await POST(request({ watermark: false, paid: true }));
    assert.equal(rejected.status, 400);
    const response = await POST(request());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/pdf');
    assert.match(response.headers.get('cache-control') ?? '', /no-store/);
    const document = await PDFDocument.load(await response.arrayBuffer());
    for (const page of document.getPages()) assert.equal(hasWatermarkOpacity(page), true);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL; else process.env.NEXT_PUBLIC_APP_URL = previous;
  }
});
