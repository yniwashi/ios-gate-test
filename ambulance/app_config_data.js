// /ambulance/app_config_data.js
// CHANGELOG (2026-06-07):
// - Parse the App Config notices array for the bell inbox without coupling it to the index.html-managed Notice button.
//
// CHANGELOG (2026-06-05):
// - Add shared iOS App config loader with memory/cache/remote/backup fallback behavior.
// - Switch to the dedicated iOS App config endpoints and resolve app.version.

const DEFAULT_CONFIG = {
  urlAppConfig: "https://api.niwashibase.com/api/v1/ambulance/ios-app-config/testing",
  urlBackupAppConfig: "https://api.niwashibase.com/api/v1/ambulance/ios-app-config/backup",
  defaultCheckIntervalHours: 3
};

const CACHE_KEY = "amb_ios_app_config_v2";

let config = { ...DEFAULT_CONFIG };
let appConfig = null;
let freshPromise = null;

function toObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function normalizeHours(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return number;
}

function getCheckIntervalMs(data) {
  const hours = normalizeHours(
    data?.config_check_interval_hours,
    config.defaultCheckIntervalHours
  );
  return hours * 60 * 60 * 1000;
}

function validateAppConfig(data) {
  const parsed = toObject(data);
  if (!parsed) throw new Error("Invalid App config");
  if (parsed.platform !== "ios") throw new Error("Invalid App config platform");
  if (!toObject(parsed.app)) throw new Error("Missing App config");
  return parsed;
}

function readCache({ allowStale = false } = {}) {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    const data = validateAppConfig(cached?.config);
    const savedAt = Number(cached?.savedAt || 0);
    if (!savedAt) return null;
    if (!allowStale && Date.now() - savedAt > getCheckIntervalMs(data)) return null;
    appConfig = data;
    return data;
  } catch (_) {
    return null;
  }
}

function writeCache(data, source) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      source,
      configVersion: data?.config_version || "",
      iosVersion: data?.app?.version || "",
      config: data
    }));
  } catch (_) {}
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load App config (${res.status})`);
  return validateAppConfig(await res.json());
}

async function fetchFresh() {
  try {
    const data = await fetchJson(config.urlAppConfig);
    appConfig = data;
    writeCache(data, "primary");
    return data;
  } catch (primaryError) {
    if (!config.urlBackupAppConfig) throw primaryError;
    const data = await fetchJson(config.urlBackupAppConfig);
    appConfig = data;
    writeCache(data, "backup");
    return data;
  }
}

export function configureAppConfigData(nextConfig = {}) {
  config = { ...config, ...nextConfig };
}

export function preloadAppConfig(nextConfig = {}) {
  configureAppConfigData(nextConfig);
  if (appConfig) return Promise.resolve(appConfig);
  const cached = readCache();
  if (cached) return Promise.resolve(cached);
  if (!freshPromise) freshPromise = fetchFresh().finally(() => { freshPromise = null; });
  return freshPromise.catch((error) => {
    const stale = readCache({ allowStale: true });
    if (stale) return stale;
    throw error;
  });
}

export async function getAppConfig(nextConfig = {}) {
  configureAppConfigData(nextConfig);
  if (appConfig) return appConfig;
  const cached = readCache();
  if (cached) return cached;
  if (!freshPromise) freshPromise = fetchFresh().finally(() => { freshPromise = null; });
  return freshPromise.catch((error) => {
    const stale = readCache({ allowStale: true });
    if (stale) return stale;
    throw error;
  });
}

export async function getIosAppConfig(nextConfig = {}) {
  const data = await getAppConfig(nextConfig);
  return toObject(data?.app) || {};
}

export function getSharedConfigBlock(name, data = appConfig) {
  if (!name) return null;
  return toObject(data?.[name]);
}

export function resolveIosVersion(data = appConfig, fallbackVersion = "v0.3") {
  const version = String(data?.app?.version || "").trim();
  return version || fallbackVersion;
}

function normalizeNotice(value, defaultTitle = "Notice") {
  const item = toObject(value);
  if (!item) return null;
  const notice = {
    enabled: item.enabled !== false,
    id: String(item.id || "").trim(),
    title: String(item.title || defaultTitle).trim() || defaultTitle,
    message: String(item.message || "").trim(),
    buttonText: String(item.button_text || item.buttonText || "OK").trim() || "OK",
    date: String(item.date || item.published_at || "").trim()
  };
  return notice.enabled && notice.id && notice.message ? notice : null;
}

export function resolveIosNotices(data = appConfig) {
  const notices = Array.isArray(data?.notices)
    ? data.notices.map(item => normalizeNotice(item)).filter(Boolean)
    : [];
  const seen = new Set();
  return notices.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
