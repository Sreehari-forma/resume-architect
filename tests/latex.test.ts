import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeLatex, generateLatex, safeExternalUrl } from '../lib/latex';
import { DEMO_PROFILE } from '../lib/demo';

test('escapes dynamic TeX metacharacters without recursive escaping', () => {
  assert.equal(escapeLatex('R&D: 25% $5 #1 a_b {x} ~ ^ \\'), 'R\\&D: 25\\% \\$5 \\#1 a\\_b \\{x\\} \\textasciitilde{} \\textasciicircum{} \\textbackslash{}');
});

test('rejects executable links and credentials', () => {
  for (const url of ['javascript:alert(1)', 'file:///etc/passwd', 'data:text/html,test', 'https://user:password@example.com']) assert.equal(safeExternalUrl(url), null);
  assert.ok(safeExternalUrl('https://example.com/work'));
  assert.equal(safeExternalUrl('https://example.com/a%20b?x=1&y=2#section'), 'https://example.com/a%20b?x=1&y=2#section');
});

test('LaTeX links retain encoded spaces, query strings, and fragment targets', () => {
  const profile = { ...DEMO_PROFILE, website: 'https://example.com/a%20b?x=1&y=2#section' };
  assert.ok(generateLatex(profile).includes(String.raw`\href{https://example.com/a\%20b?x=1\&y=2\#section}{Portfolio}`));
});

test('untrusted resume text cannot inject TeX commands', () => {
  const profile = structuredClone(DEMO_PROFILE);
  profile.fullName = String.raw`Alex }\input{/etc/passwd} %`;
  profile.experience[0].bullets[0] = String.raw`Improved 38% & saved $5,000. \write18{touch /tmp/pwned}`;
  profile.website = 'javascript:alert(1)';
  const latex = generateLatex(profile);
  assert.ok(latex.includes('38\\% \\& saved \\$5,000'));
  assert.ok(!latex.includes(String.raw`\input{/etc/passwd}`));
  assert.ok(!latex.includes(String.raw`\write18{touch`));
  assert.ok(!latex.includes('javascript:'));
  assert.ok(latex.startsWith('\\documentclass'));
  assert.ok(latex.endsWith('\\end{document}\n'));
});

test('all required standard packages and only fixed file input appear', () => {
  const latex = generateLatex(DEMO_PROFILE);
  for (const name of ['geometry', 'enumitem', 'hyperref', 'titlesec']) assert.ok(latex.includes(`{${name}}`));
  assert.equal((latex.match(/\\input\{/g) || []).length, 1);
  assert.ok(latex.includes('\\input{glyphtounicode}'));
});
