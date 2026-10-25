# Implementation status

## Done

- MV3 unpacked build, Spanish popup and locally bundled filter assets.
- AdGuard Base (2), Tracking Protection (3), Spanish/Portuguese (9).
- Persistent global and site controls connected to the filtering engine.
- Controlled Chromium test: ad and tracker requests blocked, site exception and global pause applied.
- TypeScript checks, lint, unit tests, build output validation and persistence after browser restart.

## Partial

- Cosmetic filtering is provided by the SDK but has not been verified against controlled page elements.
- Site exception changes require reloading the affected page.
- Filter metadata from the published rulesets package is converted to the format expected by the current engine during build.

## Not implemented

- Options page, exception list management UI, element picker, backup/restore.
- Dedicated annoyance, cookie and floating video controls.
- YouTube-specific safeguards and testing.

## Untested

- Installation in the user's Chrome profile and real-world websites.
- MV3 worker idle/restart behavior, Chrome's static rule quota alongside other installed blockers.
