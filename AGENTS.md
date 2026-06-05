<!--
CHANGELOG (2026-06-05):
- Document the iOS App config, Pediatrics, references, Calculators, and nested router migration.

CHANGELOG (2026-05-17):
- Add iOS input behavior rule: scrolling must dismiss the keyboard in searchable/input-heavy views.
- Remove obsolete TEMP README reference after confirming its docs-host notes are covered in the README Files/iOS and pdf-viewer README files.
- Document hidden ASSET_VERSION release workflow for iOS app-owned JavaScript updates.
- Add README Files/iOS documentation staging guidance for iOS repo/package README drafts.
- Replace old installed-app wording with Ambulance App wording in repository instructions.
-->

# Repository Guidelines

## Project Structure & Module Organization
- Root directory: `/mnt/e/Code Assist/Apps - Work/iOS Projects/iOS App/`.
- This folder mirrors the live GitHub Pages website files.
- Public site entry files:
  - Root landing page: `index.html`.
  - Ambulance web app shell and router: `ambulance/index.html`.
  - CPR standalone page: `cpr/index.html`.
  - Install guide/profile page: `install/index.html`.
- Tool modules live in `ambulance/tools/` as plain JavaScript modules:
  - Calculators & tools: `ap_peds.js`, `ccp_peds.js`, `meds_calculator.js`, `map.js`, `rbs.js`, `overtime.js`, `ventilator_settings.js`, `waafels.js`, `estweight.js`, `caretools.js`.
  - Scores: `gcs.js`, `apgar.js`, `sat.js`, `westley.js`.
  - Pickers + PDF viewers: `cpg_wizard.js`, `sop.js`, `formulary.js`, `flowcharts.js`.
  - Links: `websites.js`.
- Helper pages and data live in `helpers/`, including Shortcuts helpers, RSI checklist pages, manifests, and JSON data.
- Static assets live near the features that use them:
  - `ambulance/images/` and `ambulance/audio/`.
  - `cpr/` audio assets.
  - `install/images/`.
- Site configuration and static root files include `.nojekyll`, `CNAME`, `robots.txt`, and `splash.png`.
- README drafts for the iOS GitHub repo and its packages should be staged outside this app folder in `/mnt/e/Code Assist/Apps - Work/README Files/iOS/`.
- Current iOS README draft files:
  - Repo overview: `ios_repo_readme.md`.
  - Ambulance package: `ambulance_readme.md`.
  - CPR package: `cpr_readme.md`.
  - Install package: `install_readme.md`.
- Keep iOS README drafts separate from Android README files.
- Temporary/reference material should live outside this app folder in `/mnt/e/Code Assist/Apps - Work/iOS Projects/TEMP/`.
- TEMP contents:
  - `CPG Files/`: Working/reference JSON files for the current CPG release, including CPG search index data, flowchart data, formulary data, and page range mapping. Use these when preparing or checking updates to the helper JSON served by the docs site.
  - `SOP Files/`: Working/reference JSON files for the current SOP release, including the SOP search index. Use this when preparing or checking SOP helper updates.
  - `Local LAN Testing.txt`: Local testing instructions for serving this static site over the LAN with `http-server`, including the no-cache flag and iPhone testing URL pattern.
  - `ios-webclip-gate-worker.js`: Cloudflare Worker reference code for the production Ambulance App gate. It is not part of the static GitHub Pages site; it documents the edge logic for session cookies, protected app routes, install-profile download tracking, KV logging, and Notion download logging.

## Build, Test, and Development Commands
- No build or package scripts are defined in this project.
- Development workflow is direct file editing of the deployed website structure.
- For local LAN checks, prefer the command documented in `../TEMP/Local LAN Testing.txt`:
  - `cd /d "E:\Code Assist\Apps - Work\iOS Projects\iOS App"`
  - `npx --yes http-server@14 -p 3000 -a 0.0.0.0 -c-1`
  - PC route: `http://127.0.0.1:3000/ambulance/`
  - iPhone route: use the LAN IP shown by the server, for example `http://<LAN-IP>:3000/ambulance/`.
- The `-c-1` flag disables caching, which is important when checking app asset and module updates.
- Validate final behavior in iOS Safari or the iOS Ambulance App, because focus, zoom, history, and modal behavior can differ from desktop browsers.
- In searchable or input-heavy iOS views, scrolling a results/list area must dismiss the keyboard. Add explicit `blur()` handling for touch/wheel scrolling where native iOS behavior does not reliably do it.

## Coding Style & Naming Conventions
- Use plain HTML, CSS, and JavaScript.
- Tool modules should keep the existing `export async function run(root)` pattern.
- Keep indentation to 2 spaces and follow the surrounding inline style.
- Use descriptive IDs and class prefixes that match the module, such as `#fmQ`, `#pvModal`, `.cw-*`, or `.sop-*`.
- Prefer structured JSON parsing and existing helper functions over ad hoc string manipulation.
- Prefer ASCII characters unless the edited file already uses Unicode for user-facing text or established comments.

## Testing Guidelines
- No automated tests are present.
- Manual checks are required for changes that touch routing, modals, search, PDF viewers, or input behavior:
  - Home to tool navigation and browser Back behavior.
  - Hash state using `#tool=...` and tool-specific query parameters.
  - PDF modal open/close behavior and Back handling.
  - Global search result opening and return-to-results behavior.
  - iOS Ambulance App input focus and zoom behavior.
  - Light/dark theme readability.
- When helper JSON changes affect PDF links, verify page numbers against the live PDF viewer.

## Configuration & Runtime Notes
- Hash state (`#tool=...`) is used for app routing and must stay consistent across modules.
- PDF viewers are embedded via iframes and rely on consistent history management for Back navigation.
- The testing Guidelines category uses the Android-aligned document viewer at `https://docs.niwashibase.com/viewer/android/`; local testing can override it with `?pdfViewerBase=http://<LAN-IP>:3001/viewer/android/`.
- CPG/SOP/formulary/flowchart modules may fetch helper JSON from `https://docs.niwashibase.com/helpers/`.
- Stable PDF filenames matter because app links depend on them.
- WAAFELS CCP energy sequence is 6 steps: weight x 4, x 4, x 4, x 6, x 8, x 10, clamped to 360 J.
- `APP_VERSION` in `ambulance/index.html` is the visible user-facing version.
- `ASSET_VERSION` in `ambulance/index.html` is the hidden cache refresh key for app-owned JavaScript. Bump it whenever deployed app code changes should force a fresh load without changing the visible app version.
- App-owned JavaScript imports should use `ASSET_VERSION`, including `ambulance/search_core.js`, `ambulance/search_data.js`, `ambulance/websites_data.js`, and `ambulance/tools/*.js`.
- `TEMP/ios-webclip-gate-worker.js` is a Cloudflare Worker reference, not a static site file. It protects `/ambulance/` and `/cpr/`, mints/verifies the `wc` cookie via `/session` and `/cookie-check`, makes `/install/` non-cacheable, and tracks `/install/dl` mobileconfig downloads. Its expected environment/bindings include `SIGNING_KEY`, `HASH_SALT`, `IOS_DOWNLOADS`, `IOS_DLLOGS`, `NOTION_TOKEN`, and `NOTION_DB_ID`.
- Do not copy the worker into the static website tree unless intentionally preparing a Worker deployment.

## Commit & Pull Request Guidelines
- Use WSL SSH host aliases for GitHub pushes instead of Windows Git credential switching or personal access tokens.
- Expected SSH remote for this iOS/GitHub Pages project:
  - `git@github-yniwashi:yniwashi/niwashibase-site.git` when pushing the public iOS site repository.
- Do not include SSH key contents or tokens in this file, session logs, README drafts, TEMP files, commits, or chat.
- Before pushing, verify `git remote -v`, `git config user.name`, and `git config user.email` match the target GitHub account.
- If commits are used, use clear imperative messages, for example `Fix PDF modal back state`.
- PRs, if used, should include:
  - A short summary of UI or behavior changes.
  - iOS Safari/Ambulance App verification notes.
  - Screenshots or screen recordings for visible UI changes.

## Session Log
- Use this section as the running change log for completed work sessions.
- Only append or update session blocks when the user explicitly says the session is ending, such as "end session" or "end of the session".
- Do not update this log after every individual app change.
- Each session block must include a timestamp, preferably in this format: `YYYY-MM-DD HH:mm TZ`.

### 2026-05-16 16:02 +03
- Reviewed current main/global search, CPG Wizard search, SOP search, and the new TEMP `cpg_index.json`, `sop_index.json`, `cpm_index.json`, plus `How search works.md`.
- Added shared weighted search modules: `ambulance/search_core.js` and `ambulance/search_data.js`.
- Updated `ambulance/index.html` to preload/cache helper search data, use the shared search engine, include CPM in main search, open CPM PDF pages via `cpm-202e9d33q.pdf`, and warm the CPM viewer.
- Updated `ambulance/tools/cpg_wizard.js` and `ambulance/tools/sop.js` to reuse warmed helper data and shared document searcher.
- Added dated changelog headers to all files changed/created during the search work.
- Updated the main search placeholder to `Search symptoms, medications, guidelines and tools` with compact placeholder styling.
- Verified JavaScript syntax for the shared modules, CPG Wizard, SOP, and the extracted app module; ran local ranking smoke tests against TEMP indexes for CPG/SOP/CPM queries.

### 2026-05-17 19:54 +03
- Reviewed docs-site `websites.json`/icon path requirements and updated the Websites tool to load shared website data from `https://docs.niwashibase.com/helpers/websites.json`.
- Added shared Websites data loading/cache module `ambulance/websites_data.js`, warmed Websites data/icons from the app shell, and kept the helper refresh window at 7 days.
- Updated `ambulance/tools/websites.js` with smaller icons, URL-only share/copy behavior, category filters, search bar, flat alphabetical sorting, and the approved Ambulance App tip copy.
- Created iOS README drafts in `/mnt/e/Code Assist/Apps - Work/README Files/iOS/` for the repo, Ambulance package, CPR package, and Install package.
- Updated `AGENTS.md` with iOS README staging guidance, Android README separation, dated file changelog, and Ambulance App wording.

### 2026-05-18 01:23 +03
- Updated CPG/SOP search UI: shorter placeholders, old descriptive hints below the search boxes, live CPG results without Smart Search, removed score pills, moved Clear buttons below hints, and matched CPG/SOP version pills to tool colors.
- Updated the main search UI with larger icon/text, `Search...` placeholder, hint below the box, and improved keyboard dismissal behavior.
- Renamed the home `CPG Wizard` button to `CPG`, kept `CPG Wizard` as the Shortcut payload, made Stay Connected App-mode only, and aligned CPG/SOP home icons.
- Added custom home-screen pull-down refresh for the Ambulance App.
- Added AS-Call App-mode support with shared helper loader/cache `ambulance/as_call_data.js`, new tool `ambulance/tools/as_call.js`, startup preload, search, filters, copy feedback, and `tel:` call buttons.
- Updated `AGENTS.md` with the iOS input behavior rule that scrolling search/input-heavy views should dismiss the keyboard.
- Bumped `ASSET_VERSION` through the deployment refreshes, ending at `asset-20260518-4`.

### 2026-06-05 09:56 +03
- Added the first testing App config loader draft in `ambulance/app_config_data.js` and wired it into `ambulance/index.html` without changing `ASSET_VERSION`.
- Confirmed the shared testing app-config endpoint returned `ios_app.version`, then changed direction to separate iOS-only app config files.
- Created iOS-only testing, production, and backup config drafts in TEMP with Android-style shared helper blocks and iOS-specific `app`/`assets` metadata.
- Updated the project TODO to continue from the iOS-only config route/upload step.
- No files were pushed to GitHub.

### 2026-06-05 17:12 +03
- Connected the testing Ambulance App to the dedicated iOS App config endpoint and made the displayed app version resolve from `app.version`.
- Added version-aware API/cache loaders for Pediatrics, Flowcharts, Formulary, and shared reference data.
- Rebuilt AP and CCP Pediatrics around the Android dosing engine and helper data, including medication calculations, warnings, concentration handling, vital signs, WAAFELSS, result sheets, and direct CPG reference navigation.
- Combined Flowcharts and Formulary into the Android-aligned segmented reference screen.
- Ported the Android Infusions & Calculations screen, including Adult/Pediatric Infusions, Burn Surface Area, Infusion Rate, Dose Volume, Proportion, MAP, and RBS with light/dark themes.
- Copied the Android adult, child, and infant burn assets and zone mappings into the testing App.
- Fixed asynchronous route races that could display the wrong calculator, and corrected nested Back behavior so child screens return to their parent while first-level screens return Home.
- Preserved CPR and RSI as standalone URL destinations rather than tool modules.
- Bumped `ASSET_VERSION` to `asset-20260605-gate-test-1` for the GitHub testing deployment; remaining production-readiness checks are documented in the project TODO.

### 2026-06-05 19:24 +03
- Defaulted new users to Light theme while preserving any saved user theme preference.
- Matched Calculator menu colors, icons, and descriptions more closely to the Android app and fixed AP/CCP Pediatrics nested page titles for Dose Volume and Pediatric Infusions.
- Added version-aware document config loading in `ambulance/document_data.js` and included PAT in global document search/cache handling.
- Rebuilt the testing Guidelines category as Android-style CPG/SOP/CPM/PAT tabs using app-config document versions and PDFs.
- Removed the extra Guidelines header/status rows, fixed Guidelines Back behavior, and prevented tab switches from trapping Back navigation.
- Copied the Android custom PDF.js viewer bundle into the shared `pdf-viewer` repo under `viewer/android/` and pointed testing Guidelines to that viewer path.
- Added local PDF viewer override support through `?pdfViewerBase=...` for testing shared viewer changes before uploading docs-host files.
- Verified the updated testing App module, search/document modules, and Android-aligned viewer inline script with syntax checks.
