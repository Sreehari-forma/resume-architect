import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_PROFILE, EMPTY_PROFILE, SAMPLE_JOB_DESCRIPTION, createDemoResume, profileCompleteness } from '../lib/demo';
import { analyzeMatch, containsKeyword } from '../lib/matching';
import { assembleResume, summarySentences } from '../lib/ai/assemble';
import type { TailoringPlan } from '../lib/schemas';
import { validateGroundedRewrite } from '../lib/ai/grounding';

const plan = (): TailoringPlan => ({
  jobTitle: 'Senior Frontend Engineer', company: 'Linear Labs', keywords: ['React', 'Kubernetes', 'AWS'],
  summarySentenceIndices: [0], summaryRewrite: null, experience: [{ id: 'exp-1', bulletIndices: [2, 0], bulletRewrites: [] }],
  skillIndices: [1, 0], projects: [], latex: '\\input{malicious}',
});

test('demo is truthful, input-sensitive and does not mutate source data', () => {
  const original = structuredClone(DEMO_PROFILE);
  const first = createDemoResume(DEMO_PROFILE, SAMPLE_JOB_DESCRIPTION);
  const second = createDemoResume(DEMO_PROFILE, 'We are looking for an engineer with Rust, Kubernetes, Terraform, Azure, and machine learning experience.');
  assert.equal(first.mode, 'demo');
  assert.deepEqual(DEMO_PROFILE, original);
  assert.notEqual(first.analysis.matchScore, second.analysis.matchScore);
  assert.ok(first.analysis.missingKeywords.includes('AWS'));
  for (const [index, job] of first.profile.experience.entries()) assert.deepEqual([...job.bullets].sort(), [...original.experience[index].bullets].sort());
});

test('lexical matching respects token boundaries and does not invent requirements', () => {
  assert.equal(containsKeyword('Oregon and Google', 'Go'), false);
  assert.equal(containsKeyword('Build with C++ and Next.js.', 'C++'), true);
  const analysis = analyzeMatch(DEMO_PROFILE, 'React and TypeScript', [], ['AWS', 'React']);
  assert.deepEqual(analysis.matchedKeywords.sort(), ['React', 'TypeScript']);
  assert.deepEqual(analysis.missingKeywords, []);
  assert.equal(analysis.matchScore, 100);
  assert.equal(analyzeMatch(DEMO_PROFILE, 'Something unusual', []).matchScore, 0);
});

test('AI preserves structural facts and cannot inject model LaTeX into authoritative output', () => {
  const resume = assembleResume(DEMO_PROFILE, SAMPLE_JOB_DESCRIPTION, plan());
  assert.equal(resume.mode, 'ai');
  assert.equal(resume.profile.experience[0].bullets[0], DEMO_PROFILE.experience[0].bullets[2]);
  assert.equal(resume.profile.experience[0].company, DEMO_PROFILE.experience[0].company);
  assert.equal(resume.profile.summary, summarySentences(DEMO_PROFILE.summary)[0]);
  assert.equal(resume.profile.skills.length, DEMO_PROFILE.skills.length);
  assert.ok(!resume.latex.includes('malicious'));
  assert.ok(!resume.analysis.missingKeywords.includes('Kubernetes'));
  assert.ok(resume.analysis.missingKeywords.includes('AWS'));
});

test('extractive summary segmentation preserves technology names and all words', () => {
  const summary = 'I build with Next.js and Node.js. I improved conversion by 3.5%.';
  assert.deepEqual(summarySentences(summary), ['I build with Next.js and Node.js.', 'I improved conversion by 3.5%.']);
});

test('unknown source references cause generation to fail closed', () => {
  assert.throws(() => assembleResume(DEMO_PROFILE, SAMPLE_JOB_DESCRIPTION, { ...plan(), experience: [{ id: 'invented-employer', bulletIndices: [0], bulletRewrites: [] }] }), /unknown experience/);
  assert.throws(() => assembleResume(DEMO_PROFILE, SAMPLE_JOB_DESCRIPTION, { ...plan(), skillIndices: [79] }), /unknown source/);
  assert.throws(() => assembleResume(DEMO_PROFILE, SAMPLE_JOB_DESCRIPTION, { ...plan(), summarySentenceIndices: [99] }), /unknown summary/);
});

test('valid source-linked achievement and summary rephrasing survives validation', () => {
  const rewritten = plan();
  rewritten.experience[0].bulletRewrites = [{ sourceIndex: 0, text: 'Reduced page load time by 38% by leading a SaaS dashboard migration to React and TypeScript.' }];
  rewritten.summaryRewrite = { text: 'Product-minded engineer creating accessible web experiences.', sources: [{ section: 'summary', id: 'summary', index: 0 }] };
  const resume = assembleResume(DEMO_PROFILE, SAMPLE_JOB_DESCRIPTION, rewritten);
  assert.ok(resume.profile.experience[0].bullets.includes(rewritten.experience[0].bulletRewrites[0].text));
  assert.equal(resume.profile.summary, rewritten.summaryRewrite.text);
  assert.equal(resume.profile.experience[0].role, DEMO_PROFILE.experience[0].role);
  assert.equal(resume.profile.experience[0].startDate, DEMO_PROFILE.experience[0].startDate);
  assert.ok(resume.analysis.highlights.some((highlight) => highlight.includes('Rewrote 1 source-linked achievement')));
  assert.ok(resume.analysis.highlights.some((highlight) => highlight.includes('Review AI wording')));
});

test('invented, inflated, removed and changed-unit numerical claims are rejected', () => {
  for (const text of [
    'Reduced page load time by 80% by leading a React migration.',
    'Reduced page load time by 38% and increased revenue by $5,000.',
    'Led a React migration that reduced page load time.',
    'Reduced page load time by 38 seconds through a React migration.',
  ]) {
    const rewritten = plan();
    rewritten.experience[0].bulletRewrites = [{ sourceIndex: 0, text }];
    assert.throws(() => assembleResume(DEMO_PROFILE, SAMPLE_JOB_DESCRIPTION, rewritten), /numeric fact/);
  }
});

test('new skill claims and moving technologies between source achievements are rejected', () => {
  const unsupported = plan();
  unsupported.experience[0].bulletRewrites = [{ sourceIndex: 0, text: 'Led a React, TypeScript and Kubernetes migration that reduced load time by 38%.' }];
  assert.throws(() => assembleResume(DEMO_PROFILE, SAMPLE_JOB_DESCRIPTION, unsupported), /unsupported skill/);
  unsupported.experience[0].bulletRewrites[0].text = 'Led a React, TypeScript and Node.js migration that reduced load time by 38%.';
  assert.throws(() => assembleResume(DEMO_PROFILE, SAMPLE_JOB_DESCRIPTION, unsupported), /unsupported source/);
});

test('numeric units cannot be changed from milliseconds to seconds', () => {
  assert.throws(() => validateGroundedRewrite({ source: 'Reduced response time by 38 milliseconds.', rewrite: 'Reduced response time by 38 seconds.', profile: DEMO_PROFILE, jobKeywords: [], preserveAllNumbers: true }), /numeric fact/);
});

test('summary evidence can cite original achievements but cannot infer duration or use unknown sources', () => {
  const rewritten = plan();
  rewritten.summaryRewrite = { text: 'Engineer delivering React and TypeScript migrations with measurable impact.', sources: [{ section: 'experience', id: 'exp-1', index: 0 }] };
  assert.equal(assembleResume(DEMO_PROFILE, SAMPLE_JOB_DESCRIPTION, rewritten).profile.summary, rewritten.summaryRewrite.text);
  rewritten.summaryRewrite.text = 'Engineer with 10 years of React and TypeScript experience.';
  assert.throws(() => assembleResume(DEMO_PROFILE, SAMPLE_JOB_DESCRIPTION, rewritten), /numeric fact/);
  rewritten.summaryRewrite.sources[0].id = 'unknown';
  assert.throws(() => assembleResume(DEMO_PROFILE, SAMPLE_JOB_DESCRIPTION, rewritten), /unknown summary source/);
});

test('unknown rewrite indices and newly introduced month dates are rejected', () => {
  const rewritten = plan();
  rewritten.experience[0].bulletRewrites = [{ sourceIndex: 19, text: 'Shipped a product.' }];
  assert.throws(() => assembleResume(DEMO_PROFILE, SAMPLE_JOB_DESCRIPTION, rewritten), /unknown source bullet/);
  rewritten.experience[0].bulletRewrites = [{ sourceIndex: 0, text: 'Led a React and TypeScript migration in June, reducing page load time by 38%.' }];
  assert.throws(() => assembleResume(DEMO_PROFILE, SAMPLE_JOB_DESCRIPTION, rewritten), /unsupported date/);
});

test('completeness reflects actual profile data', () => {
  assert.equal(profileCompleteness(EMPTY_PROFILE), 0);
  assert.equal(profileCompleteness(DEMO_PROFILE), 100);
});
