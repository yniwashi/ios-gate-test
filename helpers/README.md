# iOS App Helper Notes

<!--
CHANGELOG (2026-05-17):
- Add iOS helper/cache notes for shared docs helpers and ASSET_VERSION behavior.
-->

# Shortcuts Manifest
Dictionary keyed by Shortcut name. Each entry:
- `version`: semantic string (e.g., "3.3")
- `icloud`: stable install URL (will redirect to latest iCloud)
- `notes`: one-paragraph changelog
- `updated`: ISO 8601 UTC (e.g., 2025-09-11T20:30:00Z)

Update process:
1) Bump `version`, `notes`, and `updated`.
2) Commit & push.


# Shared Docs Helpers

The iOS Ambulance App no longer treats this local `helpers/` folder as the source of truth for shared helper JSON such as websites, CPG/SOP/CPM search indexes, flowcharts, or formulary.

Shared helpers used by the app are hosted at:

```text
https://docs.niwashibase.com/helpers/
```

The Websites tool loads:

```text
https://docs.niwashibase.com/helpers/websites.json
```

Website icons load from:

```text
https://docs.niwashibase.com/website-icons/
```

The app preloads shared helper data when it opens, keeps it locally for up to 7 days, and refreshes in the background.


# iOS App Code Cache Refresh

The visible app version and hidden asset version are separate in:

```text
ambulance/index.html
```

Use:

```js
const APP_VERSION = "v0.3";
const ASSET_VERSION = "asset-YYYYMMDD-N";
```

`APP_VERSION` is shown to users. Do not bump it unless you want the visible app version to change.

`ASSET_VERSION` is the hidden cache refresh key. Bump it whenever you upload app-owned JavaScript changes so the Ambulance App requests fresh module URLs.

Covered app-owned JavaScript:

```text
ambulance/search_core.js
ambulance/search_data.js
ambulance/websites_data.js
ambulance/tools/*.js
```

Deployment reminder:

1. Edit the app files.
2. Bump `ASSET_VERSION` in `ambulance/index.html`.
3. Upload `ambulance/index.html` plus every changed JavaScript file.
4. If helper JSON changed, upload the helper to `https://docs.niwashibase.com/helpers/`; the app may use cached helper data briefly and refresh in the background.
