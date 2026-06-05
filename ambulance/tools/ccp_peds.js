// /ambulance/tools/ccp_peds.js
// CHANGELOG (2026-06-05):
// - Replace hardcoded CCP calculations with the Android-aligned shared pediatric helper UI and dosing engine.
// - Preserve Other User protection for formulary/reference actions.

export async function run(root, params = {}) {
  const version = encodeURIComponent(window.__AMBULANCE_ASSET_VERSION || "current");
  const { runPediatricScreen } = await import(`../pediatric_ui.js?ver=${version}`);
  return runPediatricScreen(root, {
    scope:"CCP",
    initialGroup:params.initialGroup,
    accessType:params.accessType
  });
}
