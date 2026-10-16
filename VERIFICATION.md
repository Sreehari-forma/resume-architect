# Verification

Build and all 52 tests revalidated on October 15, 2026 after switching the AI provider to Gemini. Production HTTP smoke checks were also completed on October 15. Detailed browser checks and sample LaTeX compilation were completed on September 30, 2026.

- Next.js optimized production build completed successfully, including TypeScript validation.
- 52 tests pass, including nested cases: Gemini endpoint/key/model selection, structured JSON parsing, malformed/truncated responses, refusals, missing credentials, provider errors without retries, Supabase missing/partial/whitespace configuration, schema boundaries, LaTeX escaping/injection, encoded URLs, same-origin policy, loopback aliases, job provider allowlists, response limits, actual keyword scoring, and guarded AI rewrites.
- Gemini tests use mocked HTTP responses with a dummy key; they exercise the actual SDK and parser without contacting a live provider. They verify that OpenAI environment settings cannot redirect the request or substitute credentials.
- The built production server returned HTTP 200 with the expected demo/setup content on `/login`, `/dashboard`, and `/studio` with service credentials disabled. A same-origin `POST /api/tailor` returned a demo resume and deterministic LaTeX with `Cache-Control: no-store`.
- Browser-verified local demo: profile save and reload, certification add/save/remove, sample job input, resume generation, LaTeX tab and copy, configuration-aware login, and unsupported job URL feedback.
- Inspected landing, Master Vault and studio layouts at mobile and desktop sizes. The 3D view has a CSS fallback and reduced-motion handling.
- Generated the fictional sample profile with the actual LaTeX renderer. It compiled successfully in the desktop editor's XeTeX-based compiler after guarding the pdfTeX-specific glyph configuration. `artifacts/sample-resume.tex` is the tested output. Native compiler diagnostics do not export a PDF. A separate `pdflatex` process was not run.

Not verified against live external services: Supabase signup/sign-in, execution of the SQL migration/RLS policies, account-specific database quotas, live job-board responses, and Gemini generation/model access. These implementations require your project configuration. Tests mock provider responses and validate the source/output boundaries; semantic accuracy of AI edits still requires review.

The application is local and has not been publicly deployed. There is no payment service or PDF-generation endpoint.
