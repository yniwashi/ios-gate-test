# DHP CPD testing in Gate Test

Updated: 2026-09-26 18:27 +03

The Gate Test app serves `helpers/cpd_opportunities.json` from its own static origin. Its CPD screen does not read the live API while running on the Gate Test domain or the local role-test server. This keeps the 2026–2027 draft separate from live R2 data. The Backend's `cpd-opportunities` app-data route and local R2 source are prepared but not deployed.

Open the Gate Test app as Ambulance Staff and choose **CPD** under Operations, below Websites and beside Shift Schedule. Check Category 1 and 3 filters, format and provider filters, Upcoming only, Past Events, session details, source links, and registration states. The current helper has no Category 2 records, so the Category 2 filter should show an empty state. Provider staff events are visible with a provider-specific label. Other User access should not expose the tool.

Local Staff and Other User sessions can be tested with the role-test server documented in `D:\Programming\iOS\Local Test Tools\README.md`. The live Gate Test Web Clip receives changes only when the separate Gate Test repository is published with user authorization.

Before copying any approved CPD code to the production iOS source, verify the production host resolves the shared API URL and do not copy this test-only JSON helper. See the Backend `Docs/CPD/Implementation.md` for the release order and source ownership.
