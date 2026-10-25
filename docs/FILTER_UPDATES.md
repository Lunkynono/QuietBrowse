# Filter updates

The v0.1 build uses the pinned `@adguard/dnr-rulesets` package. Rule sets are copied into `dist/` during `npm run build`; the extension never fetches live filter lists. `dist/filters/filters-manifest.json` records the package version, build time, rule counts and SHA-256 checksums.

To select the latest published package, run `npm run filters:update`, then `npm install`, `npm run verify` and `npm run test:e2e`. Review the changed `package.json` and `package-lock.json` before committing. Reload QuietBrowse at `chrome://extensions` after rebuilding.

The current published rule assets use an older metadata envelope than the installed SDK expects. `scripts/filter-assets.ts` converts that envelope into compact metadata chunks while building. Browser tests must be rerun after any library or filter update; the conversion may need to change when AdGuard updates its packages.
