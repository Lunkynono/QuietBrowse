# Architecture

The MV3 service worker starts `@adguard/api-mv3` with the three packaged filter IDs and restores settings from `chrome.storage.local`. The SDK manages network DNR rules and its content script. The popup sends a small set of typed messages to query status or change global and site filtering. Changes are saved only after the engine accepts the new configuration.

`scripts/build.ts` compiles the three extension entries, packages filter assets and redirect resources, and writes the final manifest into `dist/`. Published filter metadata is converted to the compact format expected by the installed SDK; the actual DNR network rules are not rewritten. `scripts/validate-dist.ts` checks the essential paths. Browser tests exercise blocking and recovery through the packaged extension.

There is no backend, account or browsing telemetry. Host permissions cover HTTP and HTTPS sites so the content script and network filtering can work across the web. Browser internal pages are outside extension control.
