// /ambulance/tools/qsofa.js
// CHANGELOG (2026-06-06):
// - Add qSOFA using the shared Android-aligned score UI and Android criteria.

import { renderQsofa } from "../score_common.js";

export async function run(root, params = {}) {
  renderQsofa(root, { hash: params.embedded !== true });
}
