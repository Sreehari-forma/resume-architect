import test from 'node:test';
import assert from 'node:assert/strict';
import { EnvironmentError, parseAppOrigin, parseEnvironmentUrl } from '../lib/env/validation';

const canonical = 'https://resume-architect-seven.vercel.app';

test('the deployed application URL normalizes harmless whitespace and trailing root slashes', () => {
  for (const input of [canonical, `${canonical}/`, `${canonical}////`, `  ${canonical}/  `, `\n\t${canonical}/\r\n`]) {
    assert.equal(parseAppOrigin(input), canonical);
  }
  assert.equal(parseAppOrigin(' HTTPS://RESUME-ARCHITECT-SEVEN.VERCEL.APP:443/// '), canonical);
  assert.equal(parseEnvironmentUrl('\n https://project.supabase.co/ \n', 'NEXT_PUBLIC_SUPABASE_URL'), 'https://project.supabase.co');
});

test('origin-only configuration rejects raw paths even when URL normalization would erase them', () => {
  for (const suffix of ['/studio', '/studio/..', '/studio/../', '/./', '/../', '/%2e/', '/%2e%2e/', '/%2f', '/?query=1', '/#anchor', '?', '#']) {
    assert.throws(() => parseAppOrigin(`${canonical}${suffix}`), /NEXT_PUBLIC_APP_URL.*origin/);
  }
});

test('embedded controls, zero-width characters and literal backslash escapes fail without exposing the value', () => {
  const invalid = [
    'https://resume-\narchitect-seven.vercel.app',
    'https://resume-\rarchitect-seven.vercel.app',
    'https://resume-\tarchitect-seven.vercel.app',
    'https://resume-\u200barchitect-seven.vercel.app',
    'https://resume-\u2060architect-seven.vercel.app',
    'https://resume-\ufeffarchitect-seven.vercel.app',
    `${canonical}\u0000`,
    `${canonical}\u007f`,
    String.raw`https://resume-architect-seven.vercel.app\n`,
    String.raw`https:\\resume-architect-seven.vercel.app`,
  ];
  for (const value of invalid) {
    assert.throws(() => parseAppOrigin(value), (error: unknown) =>
      error instanceof EnvironmentError && error.message.includes('NEXT_PUBLIC_APP_URL') && !error.message.includes(value));
  }
});

test('literal quotation marks are invalid configuration content after dotenv parsing', () => {
  const quotePairs = [['"', '"'], ["'", "'"], ['`', '`'], ['“', '”'], ['‘', '’']];
  for (const [start, end] of quotePairs) {
    assert.throws(() => parseAppOrigin(`${start}${canonical}${end}`), /NEXT_PUBLIC_APP_URL.*quote/);
  }
  assert.throws(() => parseEnvironmentUrl('https://project.supabase.co/"', 'NEXT_PUBLIC_SUPABASE_URL'), /NEXT_PUBLIC_SUPABASE_URL.*quote/);
});

test('scheme separators and empty credential syntax cannot be silently repaired into an origin', () => {
  for (const value of ['https:resume-architect-seven.vercel.app', 'https:/resume-architect-seven.vercel.app', 'https:///resume-architect-seven.vercel.app', 'https://@resume-architect-seven.vercel.app']) {
    assert.throws(() => parseAppOrigin(value), /NEXT_PUBLIC_APP_URL/);
  }
});

test('local HTTP loopback and missing settings retain their existing behavior', () => {
  for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000']) {
    assert.equal(parseAppOrigin(`${origin}///`), origin);
  }
  for (const missing of [undefined, '', ' \n\t ']) assert.equal(parseAppOrigin(missing), undefined);
  assert.throws(() => parseAppOrigin('http://resume-architect-seven.vercel.app'), /HTTPS/);
});
