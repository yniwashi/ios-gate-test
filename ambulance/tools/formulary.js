// /ambulance/tools/formulary.js
// CHANGELOG (2026-06-05):
// - Keep the legacy Formulary route while opening the combined Android-aligned reference screen.

export async function run(root, options = {}) {
  const version = encodeURIComponent(window.__AMBULANCE_ASSET_VERSION || "current");
  const combined = await import(`./flowcharts.js?ver=${version}`);
  return combined.run(root, {
    ...options,
    initialMode:"formulary",
    compatibilityTool:"formulary"
  });
}
