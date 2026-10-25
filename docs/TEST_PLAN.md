# Test plan and results

## Automated checks (2026-10-25)

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript, lint, unit tests and build validation | Pass | `npm run verify` |
| Ad request blocked | Pass | Chromium fixture requests `ad.doubleclick.net`; `ERR_BLOCKED_BY_CLIENT` |
| Tracker request blocked | Pass | Chromium fixture requests `www.google-analytics.com`; `ERR_BLOCKED_BY_CLIENT` |
| Normal fixture content | Pass | Local page heading and text remained visible |
| Site exception | Pass | After adding `127.0.0.1` and reloading, the ad request was no longer blocked by QuietBrowse |
| Global pause | Pass | DNR enabled rulesets became empty |
| Persistence | Pass | Global pause and site exception remained after closing and reopening isolated Chromium |

The browser test uses a temporary profile and a local page. It does not prove behavior on every live site.

## Manual checks pending

- Install the unpacked extension in personal Chrome: Not tested.
- News sites, shopping, login and payment pages: Not tested.
- Cosmetic hiding and annoyance removal: Not tested.
- YouTube ads and normal playback: Not tested.
- Service worker idle and wake cycle: Not tested.
- Static rule quota when other blockers are installed: Not tested.
