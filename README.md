# Graphite

A local-first math suite with a physical 84-style calculator, a large graph workspace, Basic and Scientific calculators, and financial, algebra, calculus, statistics, matrix and number-theory tools. React, strict TypeScript, Vite, math.js, Nerdamer and SVG; no backend, accounts, telemetry or remote calculation services.

## Setup

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Vite prints the development URL. To serve the production application:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Open http://127.0.0.1:4173/. Static production files are in `dist/`; serve them through HTTP(S), not by opening `index.html` as a file. Service workers require HTTPS or localhost.

## Instruments

| Route | Instrument |
| --- | --- |
| `#/` | Nine-instrument catalog, favorites, recent instruments and Continue working |
| `#/basic`, `#/scientific` | Arithmetic, percent, functions, editable history, C/AC, Ans and angle modes |
| `#/graphing` | Original physical 84: six function slots, graph/window/zoom/trace, history, variables and secondary keys |
| `#/plot` | Large graph workspace, coordinate tables, sliders, analysis and exports |
| `#/surface` | Two-variable 3D wireframe surfaces, z bounds, zoom and rotation |
| `#/financial` | Loans/amortization, compound growth, interest-rate solving |
| `#/cas`, `#/calculus` | Simplification, expansion, factoring, solving, derivatives, antiderivatives, limits, numerical integrals and finite sums |
| `#/statistics` | Descriptive statistics, normal PDF/CDF/tails, regression and combinatorics |
| `#/matrix` | Grid/text entry, determinant, inverse, transpose, multiplication, systems and vectors |
| `#/discrete` | Exact GCD/LCM, factorization, combinations and permutations |

Specialist operations, drafts and matching completed results survive navigation and reload. Editing invalidates the displayed result and cancels obsolete calculations. Calculation workers have a six-second timeout and retryable startup errors. Clipboard actions report when access is unavailable.

## Calculator editing and keyboard

ENTER evaluates, C clears the entry, and AC resets the Basic/Scientific entry and Ans while retaining history. Held ENTER does not repeatedly evaluate. Selected text is replaced by physical-key input; DEL deletes a selection or the preceding character. Undo/Redo controls retain up to 100 session transactions; normal text fields retain native keyboard editing.

The 84 has **TI-84** and **Typing** keyboard modes and an in-app Keyboard guide. F1–F5 open Y=, WINDOW, ZOOM, TRACE and GRAPH; F6/F7 select 2nd/ALPHA. The guide contains the letter and platform mappings. Some system function-key shortcuts require Fn or may be intercepted by the operating system.

Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (or Ctrl+Y) operate instrument undo/redo outside native input fields. Escape closes modal workspaces/panels and restores focus. Reduced-motion preferences disable decorative motion and slider playback.

## Graph workspace

- Up to 12 explicit real functions, 200 coordinate rows and 24 single-letter sliders. Function and point identities remain stable through deletion, undo and file round-trips.
- Enter expressions directly or use function, root, square, fraction and parenthesis templates. Matching parentheses assist typing. KaTeX renders a mathematical preview with accessible MathML; source text remains editable.
- Point cells accept scalar expressions and registered parameters. DEG/RAD applies to both functions and coordinate cells. Unknown/unassigned variables are rejected.
- Drag to pan; scroll/pinch or use +/− to zoom. **Equal units** is on for new workspaces. Existing saved windows retain their previous proportions until it is enabled. Applying explicit window bounds disables the lock.
- Drag points to move them; optionally snap to grid ticks. A drag is one undo transaction. Use the coordinate table for precise or keyboard-based editing.
- Paste CSV/TSV coordinates directly into the table, or append them through Paste coordinate data. Optional `x,y` headers and quoted CSV fields are supported. Invalid bulk data is rejected as a whole, with a row error.
- **Inspect** selects a function or point. Curve/point edits update its coordinate readout. Set an x value or use the previous/next buttons. With the graph focused, arrow keys pan; Shift+left/right steps a curve trace.
- **Analyze** finds sampled roots, intersections and local extrema, or evaluates/shades a definite integral over a selected interval. Use visible interval copies the current x bounds. Results are numerical candidates, not a guarantee of all solutions.
- Unassigned single-letter parameters offer Add slider. Set value/range/step or play a bounded animation. Playback starts only by an explicit action and is disabled for reduced motion.
- **Window → Workspace files** saves/opens versioned JSON and exports coordinates as CSV. A valid import is undoable. **Export image** downloads self-contained SVG or 2× PNG.
- On phones, the editor sits below the graph with Functions, Points and Window tabs and collapsed/half/expanded presets. Full screen contains keyboard focus without losing pending edits.

Graph data migrates from earlier saved workspaces. History is session-only; functions, points, sliders, bounds, labels and snapping save locally after a brief debounce and flush on navigation/page exit.

## Matrices, numerics and 3D

The matrix grid supports 1–6 rows/columns, Enter navigation, atomic CSV/TSV paste and text editing. Commas, tabs, whitespace and semicolon/newline rows are supported in text mode; quote comma-containing scalar expressions such as `"log(8,2)"`.

Matrices use row-scaled LU factorization with pivoting. Singular systems report errors; ill-conditioned results include warnings. Linear systems are solved directly rather than through an explicit inverse. Numerical integrals use adaptive 7/15 Gauss–Kronrod rules with initial subdivision, bounded evaluations and estimated error. Normal tails are computed directly using Cody-style complementary-error-function approximations.

3D surfaces expose x/y range and ordered z bounds (initially −10…10). Drag or use arrow keys to rotate, use zoom buttons or +/−, and Reset view to restore the camera. Values outside z bounds are clipped; empty visible surfaces are identified.

## Appearance and offline use

**Appearance** consolidates 15 saved finishes, background previews, sound volume and Plastic / Muted Mechanical / Typewriter profiles. Sound starts off. Calculator keys activate on press with matching release feedback and a single optional audio impulse. Appearance is shared across instruments.

Production builds precache the application, lazy instrument modules, calculation workers, local fonts, backgrounds and icons. After the initial cache completes, instruments work offline. Supported browsers offer Install app. An available new version exposes Update app; drafts flush before the user-triggered reload. Install prompts and service-worker behavior depend on the browser. No update is forced during work.

## Verification

```sh
npm run check
npm test
npx playwright install chromium webkit
npm run build
npm run test:e2e
# or all application checks in sequence:
npm run test:release
```

Browser tests serve `dist/` on port 4180 and cover Chromium plus touch-enabled WebKit. CI installs browser dependencies and runs the release checks. Tests cover numerical regressions, editing, migration, undo, imports/exports, sliders, graph analysis, focus containment, accessibility, offline workers and application updates. See the output verification report for actual counts and observed limitations.

## Limits

Calculations use JavaScript double precision, generally displayed to 12 significant digits. Finite sampling can miss very narrow or rapidly oscillating graph features. Numerical error estimates are estimates; integrals can reject singularities/nonconvergence, and sampled Fit/analysis is not an analytic extrema or all-roots solver. Analysis caps candidates at 50. Graphing supports explicit y=f(x) and coordinate tables; implicit relations, inequalities and parametric/polar graphing are not implemented.

The 84 is inspired by calculator hardware and does not run TI firmware or TI-BASIC. Its PRGM menu explains that limit. Matrix size is at most 6×6; datasets at most 1,000 values; regression at most 500 pairs. Factorization is bounded at 10^12, GCD/LCM at 100 digits and combinatorics at n≤500. Financial tools model fixed-rate end-of-period payments without taxes or fees. Original domain restrictions still apply after symbolic simplification, and Nerdamer may report that it cannot find a closed form.

Mobile/touch checks use browser emulation, not physical phones. Automated accessibility checks supplement keyboard and visual inspection. Audio synthesis was instrumented; perceived sound was not assessed on physical speakers. Local storage can be unavailable or cleared by browser settings, so workspace file export is available for backups.

## Public hosting and release

The production target is [GitHub Pages](https://isaacisacoder.github.io/graphite-instruments/) from the [source repository](https://github.com/isaacisacoder/graphite-instruments). The repository uses hash routes so direct instrument links work on static hosting.

```sh
npm run build:pages
npm run test:pages
```

The Pages build uses `/graphite-instruments/`. Root-hosted builds use `npm run build`; for a different subdirectory set `GRAPHITE_BASE_PATH=/your-path/` and run `npm run build`. Always include both slashes. Keep the manifest, service worker, fonts, CSS assets and worker chunks under the same base path.

`.github/workflows/verify.yml` runs strict TypeScript, unit tests, production builds, Chromium/WebKit journeys and a separate Pages-path/offline check. Pull requests are tested without deployment. Main-branch pushes and manual main-branch runs deploy only after verification succeeds. Enable GitHub Pages with **GitHub Actions** as the source. Review changes before merging to main; repository approval rules are an owner setting. Do not commit `dist`, browser profiles, `.env` files, credentials, local outputs or tool downloads.

For a public release, check the workflow and then open the HTTPS site, an instrument route and all legal links. A successful local build alone does not establish a live deployment. GitHub Pages does not host a backend; this application has none.

## Privacy, attribution and licensing

The application performs math locally and includes no analytics or advertising. GitHub Pages, as hosting provider, logs visitor IP addresses for security. Browser-local work and offline assets can be cleared in browser site settings. The footer links the [privacy policy](public/legal/privacy.html), [terms](public/legal/terms.html), [calculator disclaimer](public/legal/disclaimer.html) and [about/licensing page](public/legal/about.html). Legal text is an owner-review draft, not a compliance guarantee or professional legal advice.

Original code is MIT licensed, copyright 2026 isaacisacoder, with owner approval. Third-party code and fonts retain their own licenses. See [LICENSE](LICENSE), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and the complete distributed [notices](public/legal/notices.txt). `npm run notices` regenerates notices from the lockfile and installed packages; builds run it automatically. After updating dependencies, review and commit regenerated notices. No TI firmware, Texas Instruments logo or reference photograph is distributed. Graphite is not affiliated with Texas Instruments or Desmos.
