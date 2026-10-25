# Third-party notices

QuietBrowse uses AdGuard's open-source extension libraries and packaged filter assets. This is an independent project, not an official AdGuard extension.

- `@adguard/api-mv3`, `@adguard/tswebextension` and `@adguard/dnr-rulesets`: AdGuard Software Ltd., GPL-3.0-only. Source: https://github.com/AdguardTeam/tsurlfilter
- AdGuard Base filter, Tracking Protection filter and Spanish/Portuguese filter: AdGuard filter project. Source and attribution: https://github.com/AdguardTeam/AdguardFilters and https://github.com/AdguardTeam/FiltersRegistry
- Other npm dependencies retain their own licenses; see their package metadata in `node_modules/` and the pinned versions in `package-lock.json`.

The exact packaged filter version and checksums are generated in `dist/filters/filters-manifest.json` by `npm run build`. The extension does not fetch filters while browsing.
