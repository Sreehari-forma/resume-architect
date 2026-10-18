import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { commonTranslations } from '../lib/i18n/common';
import { builderTranslations } from '../lib/i18n/builder';
import { paymentTranslations } from '../lib/i18n/payments';
import { formatAuthResult, parseLocale, translate } from '../lib/i18n/translate';

test('only supported exact locale preferences are accepted', () => {
  assert.equal(parseLocale('en'), 'en');
  assert.equal(parseLocale('pl'), 'pl');
  for (const value of [undefined, null, 'EN', 'pl-PL', 'en; Path=/', '', 'de', {}, 1]) assert.equal(parseLocale(value), undefined);
});

test('English remains unchanged and Polish translates interface copy', () => {
  assert.equal(translate('en', 'Create account'), 'Create account');
  assert.equal(translate('pl', 'Create account'), 'Utwórz konto');
  assert.equal(translate('pl', 'Your final CV, without the watermark.'), 'Twoje finalne CV bez znaku wodnego.');
  assert.equal(translate('pl', 'Provider-specific signup error: 429'), 'Provider-specific signup error: 429');
  assert.equal(translate('pl', 'constructor'), 'constructor');
  assert.equal(translate('pl', '{toString}'), '{toString}');
});

test('interpolation preserves unknown placeholders and replaces zero values', () => {
  assert.equal(translate('en', '{count} sections for {name}: {unknown}', { count: 0, name: 'Łukasz' }), '0 sections for Łukasz: {unknown}');
});

test('all application interface translation calls have Polish dictionary entries', () => {
  const files = ['components/LandingPage.tsx', 'components/AppShell.tsx', 'components/AuthForm.tsx', 'components/AuthGateModal.tsx', 'components/LoginContent.tsx', 'components/ProfileEditor.tsx', 'components/TailorStudio.tsx', 'components/ResumePreview.tsx', 'components/LatexEditor.tsx', 'components/PaymentModal.tsx', 'components/LanguageToggle.tsx', 'lib/store.tsx', 'app/error.tsx', 'app/not-found.tsx'];
  const dictionary = { ...commonTranslations, ...builderTranslations, ...paymentTranslations };
  const missing = new Set<string>();
  let checked = 0;
  for (const file of files) {
    const source = ts.createSourceFile(file, readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function check(expression: ts.Node) {
      if (ts.isStringLiteral(expression) && expression.text) { checked++; if (!(expression.text in dictionary)) missing.add(expression.text); }
      else if (ts.isConditionalExpression(expression)) { check(expression.whenTrue); check(expression.whenFalse); }
    }
    function visit(node: ts.Node) {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't' && node.arguments[0]) check(node.arguments[0]);
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.ok(checked > 350, 'The audit must inspect landing, auth, builder, studio, payments and recovery UI.');
  assert.deepEqual([...missing], []);
});

test('server-generated highlights localize counts and preserve skill names', () => {
  assert.equal(translate('pl', 'Prioritized job-relevant achievements in 1 role.'), 'Wyróżniono osiągnięcia istotne dla oferty w następującej liczbie ról: 1.');
  assert.equal(translate('pl', 'Prioritized job-relevant achievements in 4 roles.'), 'Wyróżniono osiągnięcia istotne dla oferty w następującej liczbie ról: 4.');
  assert.equal(translate('pl', 'Emphasized React, C++, Język polski from your existing skills.'), 'Wyróżniono następujące umiejętności z Twojego profilu: React, C++, Język polski.');
  assert.match(translate('pl', 'Rewrote 2 source-linked achievements for clearer action and impact, retaining the recorded numbers.'), /Przeredagowano.*\(2\)/);
});

test('validation messages localize variable bounds without changing English', () => {
  assert.equal(translate('pl', 'String must contain at most 200 character(s)'), 'Maksymalna liczba znaków: 200.');
  assert.equal(translate('pl', 'Array must contain at least 1 element(s)'), 'Minimalna liczba elementów listy: 1.');
  assert.equal(translate('en', 'Array must contain at least 1 element(s)'), 'Array must contain at least 1 element(s)');
  assert.equal(translate('pl', 'Invalid url'), 'Nieprawidłowy adres URL');
});

test('Supabase signup errors bypass translations and interpolation exactly', () => {
  for (const error of ['Invalid email', 'String must contain at most 200 character(s)', 'Provider error with {count} and ą']) {
    assert.equal(formatAuthResult('pl', { error, rawError: true }), error);
  }
  assert.equal(formatAuthResult('pl', { error: 'Invalid email' }), 'Nieprawidłowy adres e-mail');
});

test('known server errors and profile validation messages have Polish translations', () => {
  const files = ['lib/jobs.ts', 'lib/http.ts', 'lib/ai/gemini.ts', 'lib/api-context.ts', 'app/actions/profile.ts', 'app/api/tailor/route.ts'];
  const missing = new Set<string>();
  for (const file of files) {
    const source = ts.createSourceFile(file, readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
    function check(node: ts.Node | undefined) {
      if (node && ts.isStringLiteral(node) && translate('pl', node.text) === node.text) missing.add(node.text);
    }
    function visit(node: ts.Node) {
      if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'HttpError') check(node.arguments?.[1]);
      if (file === 'app/actions/profile.ts' && ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === 'error') check(node.initializer);
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.deepEqual([...missing], []);
});
