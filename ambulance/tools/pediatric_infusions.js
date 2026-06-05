// /ambulance/tools/pediatric_infusions.js
// CHANGELOG (2026-06-05):
// - Add the Pediatric Infusions route.
export async function run(root){const v=encodeURIComponent(window.__AMBULANCE_ASSET_VERSION||"current");const {renderInfusions}=await import(`./infusions.js?ver=${v}`);return renderInfusions(root,"pediatric");}
