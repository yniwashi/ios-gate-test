// /ambulance/resource_status.js
// CHANGELOG (2026-06-12):
// - Add Android-aligned local resource status tracking for iOS Admin Panel diagnostics.

const STORE_KEY = "amb_resource_status_v1";

function nowIso() {
  return new Date().toISOString();
}

function readStore() {
  try {
    const data = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch (_) {
    return {};
  }
}

function writeStore(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch (_) {}
}

function sourceLabel(source) {
  switch (String(source || "").toLowerCase()) {
    case "remote":
    case "primary":
    case "main":
      return "live";
    case "backup":
      return "backup";
    case "cache":
    case "cached":
    case "stale-cache":
      return "cache";
    case "memory":
      return "memory";
    case "disabled":
      return "disabled";
    case "fallback":
    case "bundled":
      return "fallback";
    default:
      return "not_loaded";
  }
}

function update(resourceId, patch = {}) {
  if (!resourceId) return;
  const store = readStore();
  const current = store[resourceId] && typeof store[resourceId] === "object"
    ? store[resourceId]
    : { resource_id: resourceId };
  const next = { ...current, resource_id: resourceId, ...patch };
  if (next.active_source) next.using_source = sourceLabel(next.active_source);
  store[resourceId] = next;
  writeStore(store);
}

export function markChecked(resourceId) {
  update(resourceId, { last_checked_at: nowIso() });
}

export function markUsed(resourceId, source, details = {}) {
  update(resourceId, {
    active_source: source,
    last_used_at: nowIso(),
    last_error_at: null,
    last_error: null,
    ...details
  });
}

export function markDownloaded(resourceId, source = "remote", details = {}) {
  update(resourceId, {
    active_source: source,
    last_downloaded_at: nowIso(),
    last_used_at: nowIso(),
    last_error_at: null,
    last_error: null,
    ...details
  });
}

export function markError(resourceId, error, details = {}) {
  const name = error?.name || "Error";
  const message = String(error?.message || "").slice(0, 180);
  update(resourceId, {
    last_error_at: nowIso(),
    last_error: message ? `${name}: ${message}` : name,
    ...details
  });
}

export function statusFor(resourceId) {
  return readStore()[resourceId] || { resource_id: resourceId, using_source: "not_loaded" };
}

export function allStatuses() {
  return readStore();
}

export function normalizeSource(source) {
  return sourceLabel(source);
}
