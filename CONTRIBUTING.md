# Contributing

Use Node.js 24 and `npm ci`. Keep changes focused and preserve keyboard, touch and offline behavior. Add regression tests for mathematical or editing bugs; include reproducible inputs and expected results without private data.

Before opening a pull request, run `npm run test:release`, then `npm run build:pages` and `npm run test:pages`. Install the test browsers with `npx playwright install chromium webkit` first. Linux may need `npx playwright install --with-deps chromium webkit`.

Use strict TypeScript and existing CSS tokens. Never execute user expressions through JavaScript eval or Function. Keep calculations and workspace data local. Do not add analytics, advertising, remote APIs or dependencies without discussing the change. Preserve upstream notices and run `npm run notices` after dependency updates.

Pull requests run verification only. Deployment follows a successful main-branch run. The maintainer reviews and merges contributions.
