# Third-party notices

Graphite’s original application code is MIT licensed. Dependencies, fonts and adapted code retain their own notices; this document does not relicense them. Complete license texts and required notices are distributed in [public/legal/notices.txt](public/legal/notices.txt).

`src/suite/normalTail.ts` adapts math.js’s Apache-2.0 erf approximation to expose complementary tails; that file records the modification. Inter and IBM Plex Mono are unmodified SIL OFL fonts. Original SVG backgrounds and Graphite icons are project-created; no Texas Instruments logos, firmware or reference photograph are distributed. KaTeX emits native MathML; its optional HTML font assets are not shipped. Workbox runtime/generated service-worker components and Vite’s generated helper are included in the notices.

| Package | Version | License |
| --- | --- | --- |
| @babel/runtime | 7.29.14 | MIT |
| @fontsource-variable/inter | 5.3.0 | OFL-1.1 |
| @fontsource/ibm-plex-mono | 5.3.0 | OFL-1.1 |
| animejs | 4.5.0 | MIT |
| commander | 15.1.0 | MIT |
| complex.js | 2.4.3 | MIT |
| decimal.js | 10.6.0 | MIT |
| escape-latex | 1.2.0 | MIT |
| fraction.js | 5.3.4 | MIT |
| javascript-natural-sort | 0.7.1 | MIT |
| katex | 0.19.1 | MIT |
| mathjs | 15.2.0 | Apache-2.0 |
| nerdamer | 2.0.1 | Apache-2.0 |
| react | 19.3.1 | MIT |
| react-dom | 19.3.1 | MIT |
| scheduler | 0.28.0 | MIT |
| seedrandom | 3.0.5 | MIT |
| tiny-emitter | 2.1.0 | MIT |
| typed-function | 4.2.2 | MIT |
| vite | 7.3.8 | MIT |
| workbox-background-sync | 7.4.1 | MIT |
| workbox-broadcast-update | 7.4.1 | MIT |
| workbox-build | 7.4.1 | MIT |
| workbox-cacheable-response | 7.4.1 | MIT |
| workbox-core | 7.4.1 | MIT |
| workbox-expiration | 7.4.1 | MIT |
| workbox-google-analytics | 7.4.1 | MIT |
| workbox-navigation-preload | 7.4.1 | MIT |
| workbox-precaching | 7.4.1 | MIT |
| workbox-range-requests | 7.4.1 | MIT |
| workbox-recipes | 7.4.1 | MIT |
| workbox-routing | 7.4.1 | MIT |
| workbox-strategies | 7.4.1 | MIT |
| workbox-streams | 7.4.1 | MIT |
| workbox-sw | 7.4.1 | MIT |
| workbox-window | 7.4.1 | MIT |

Regenerate with `npm run notices` after `npm ci` or dependency updates. Build/test-only dependencies remain subject to their upstream licenses; see the lockfile and each installed package.
