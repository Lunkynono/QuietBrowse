# Implementation status (v0.2)

## Done

- MV3 build with six bundled filter rulesets: Base (2), Tracking (3), Spanish/Portuguese (9), Cookie Notices (18), Popups (19), Other Annoyances (21, intensive profile only).
- Network and SDK cosmetic filtering; global and per-site pause; service-worker settings persistence and v0.1 settings migration.
- Spanish popup/options, filter/profile toggles, site exceptions, local JSON backup/restore with validation, themes and locally generated icons.
- Site-scoped custom element picker with preview confirmation, narrow selectors, enable/delete controls and pause synchronization.
- Conservative YouTube display-ad selectors and an immediate YouTube disable switch. No player/media interception.
- Controlled Chromium checks for network blocking, cookie ruleset switching, custom cosmetic rule, YouTube fixture recovery, site/global pause and persistence.

## Partial

- Cookie and popup rules are from maintained lists, but their effectiveness and false positives on live sites are not verified.
- YouTube display cleanup is tested on a controlled page, not against live YouTube. Video ads and actual playback are untested.
- Site and filter changes may require reloading open tabs. The extension says so in its UI.
- Filter package metadata is converted at build time for the installed SDK; rerun browser tests after dependency updates.

## Not implemented

- Automatic cookie rejection, tracking-query cleanup, automatic closing of new tabs and image replacement. These need stronger safety evidence before exposing controls.
- Precise blocked-request counters: no reliable production count is available from the chosen integration.
- Floating-video cleanup, universal overlay removal or scroll restoration. Avoiding broad DOM surgery protects normal pages.
- Guaranteed pre-roll/mid-roll removal, anti-adblock bypass, VPN or system-wide filtering.

## Untested

- User's personal Chrome profile, real news/shopping/login/payment sites and live YouTube watch/Shorts/playlist playback.
- Coexistence with other installed blockers and static rule quotas in the user's own profile.
- Actual effectiveness of packaged cookie, popup and nuisance lists on the user's preferred sites.
