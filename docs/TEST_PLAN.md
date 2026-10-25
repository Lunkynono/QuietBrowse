# Test plan and results

## Automated checks (2026-10-25)

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript, lint, unit tests, build and manifest paths | Pass | `npm run verify`; 5 unit tests |
| Ad and tracker requests | Pass | Chromium fixture requests to DoubleClick and Google Analytics failed with `ERR_BLOCKED_BY_CLIENT` |
| Block counters | Pass | Those two blocked requests increased both current-page and saved totals in the Chromium fixture |
| Redesigned UI | Pass | Popup and settings rendered and inspected in isolated Chromium; settings controls exercised in the E2E test |
| Cookie filter switch | Pass | Ruleset 18 disabled/enabled in Chromium when the switch changed |
| Intensive profile | Pass | Options enabled ruleset 21; returning to Balanced disabled it |
| Normal content | Pass | Fixture article text, login input and video element remained present |
| Personal element picker | Pass | Explicit click created a site-scoped rule and hid its fixture target |
| YouTube recovery | Pass in controlled fixture | Display-ad tag hidden while video remained visible; YouTube disable switch removed cosmetic hiding |
| Site pause | Pass | Personal rule stopped hiding its target; ad request no longer failed as blocked after reload |
| Global pause | Pass | DNR enabled rulesets became empty |
| Persistence | Pass | Global pause and site exception remained after isolated Chromium restart |

These fixtures prove wiring, not effectiveness across real websites. The YouTube test is a local response served under a YouTube URL; it does not test actual ad delivery or playback.

## Manual checks pending

- Install the unpacked extension in the user's Chrome profile: Not tested.
- Try two preferred news sites, a consent banner, shopping/login/payment flows and a legitimate external link: Not tested.
- Verify cookie and popup lists on real sites; check that no essential modal or scrolling is broken: Not tested.
- YouTube watch page, feed, Shorts, playlist, seeking, captions and full-screen: Not tested. Video ad blocking: Not tested. Playback: Not tested.
- MV3 worker idle/wake and interaction with other installed blockers: Not tested.

Temporarily disable any incumbent blocker *only with the user's knowledge* when comparing results; otherwise attribution is unreliable. Never change the user's browser profile automatically.
