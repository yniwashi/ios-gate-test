// /ambulance/tools/ap_peds.js
// CHANGELOG (2026-06-05):
// - Replace hardcoded AP calculations with the Android-aligned shared pediatric helper UI and dosing engine.

export async function run(root, params = {}) {
  const version = encodeURIComponent(window.__AMBULANCE_ASSET_VERSION || "current");
  const { runPediatricScreen } = await import(`../pediatric_ui.js?ver=${version}`);
  return runPediatricScreen(root, {
    scope:"AP",
    initialGroup:params.initialGroup,
    accessType:params.accessType
  });
}
