# Release verification

Observed November 14, 2026 on Windows, Node.js 24.

- Strict TypeScript check passed.
- Vitest: 223 tests across 16 files passed.
- Production browser journeys: 34 passed across Chromium and touch-enabled WebKit.
- GitHub Pages subdirectory journeys: 2 passed, including calculation, local offline CAS worker, scoped service worker, legal links and Axe accessibility checks.
- `npm audit`: zero reported vulnerabilities in the installed lockfile at verification time.
- Targeted staged-file scan: 123 intended files, no private-key, GitHub-token, AWS-key or credential-assignment matches. Local outputs, tool downloads, environment files and browser data are excluded.
- Desktop home/scientific and mobile legal-page screenshots inspected. Existing hardware design preserved.
- Hallmark application-scope rendered document review: 0 FAIL, 0 REFLEX, 0 WARN. Landing-page hero/word-budget rules do not describe legal documents.

A new regression test reproduced a hash-route change lost between initial render and subscription. Routing now uses React's external-store subscription, which rechecks the current hash after subscribing. The test fails with the previous implementation and passes with the fix.

The owner approved MIT for original code and publication of the legal drafts. Third-party licenses and notices are preserved separately. These legal documents are not legal advice or a compliance guarantee.

Public hosting requires a successful GitHub Actions deployment and a separate live-site check. Local test results alone do not establish that the public site is available. Physical device/speaker testing is outside this verification. Mathematical limitations are documented in README.md.
