// /ambulance/hos_data.js
// CHANGELOG (2026-06-06):
// - Add Android-aligned HOS helper loader using iOS App config, versioned cache, and location_ref decoding.

const DEFAULT_CONFIG = {
  enabled: true,
  schema_version: "0.1",
  version: "0.1",
  url: "https://api.niwashibase.com/api/v1/ambulance/app-data/hos-sites"
};

const CACHE_KEY = "amb_hos_sites_v1";

let sites = null;
let activeConfig = null;
let freshPromise = null;

async function appConfigModule() {
  if (window.__AMBULANCE_SHARED_MODULES?.appConfigData) return window.__AMBULANCE_SHARED_MODULES.appConfigData;
  const version = encodeURIComponent(window.__AMBULANCE_ASSET_VERSION || "current");
  return import(`./app_config_data.js?ver=${version}`);
}

async function helperConfig() {
  try {
    const { getAppConfig } = await appConfigModule();
    const appConfig = await getAppConfig();
    const configured = appConfig?.hos_sites;
    if (configured?.enabled === false) return null;
    return configured?.url ? { ...DEFAULT_CONFIG, ...configured } : DEFAULT_CONFIG;
  } catch (_) {
    return DEFAULT_CONFIG;
  }
}

function decodeBase64Url(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  try {
    return atob(padded);
  } catch (_) {
    return "";
  }
}

function decodeLocationRef(ref) {
  if (!String(ref || "").startsWith("v1:")) return null;
  const decoded = decodeBase64Url(String(ref).slice(3));
  const parts = decoded.split(":");
  if (parts.length !== 2) return null;
  const latE5 = Number(parts[0]) - 73129;
  const lonE5 = Number(parts[1]) + 41857;
  if (!Number.isFinite(latE5) || !Number.isFinite(lonE5)) return null;
  const lat = latE5 / 100000;
  const lon = lonE5 / 100000;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

function normalizeSite(item) {
  if (!item || typeof item !== "object") return null;
  const hosNumber = Number(item.hos_number || item.hosNumber || 0);
  if (!Number.isFinite(hosNumber) || hosNumber <= 0) return null;
  const title = String(item.title || `HOS ${hosNumber}`).trim() || `HOS ${hosNumber}`;
  const name = String(item.name || "").trim();
  if (!name) return null;
  const enabled = item.enabled !== false;
  const status = String(item.status || "active").trim() || "active";
  const location = decodeLocationRef(String(item.location_ref || item.locationRef || ""));
  return {
    id: String(item.id || `hos_${hosNumber}`).trim() || `hos_${hosNumber}`,
    enabled,
    status,
    hosNumber,
    title,
    name,
    details: String(item.details || "").trim(),
    location,
    displayOrder: Number(item.display_order || item.displayOrder || hosNumber),
    isNavigable: enabled && status.toLowerCase() === "active" && !!location
  };
}

function validate(data, cfg) {
  if (!data || data.helper_type !== "hos_sites") throw new Error(`Unexpected HOS helper: ${data?.helper_type || "unknown"}`);
  if (String(data.schema_version) !== String(cfg.schema_version)) throw new Error("Unexpected HOS schema version");
  if (String(data.version) !== String(cfg.version)) throw new Error("Unexpected HOS helper version");
  const normalized = (Array.isArray(data.sites) ? data.sites : [])
    .map(normalizeSite)
    .filter(Boolean)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.hosNumber - b.hosNumber);
  if (!normalized.length) throw new Error("No usable HOS sites");
  return normalized;
}

function readCache(cfg, allowStale = false) {
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (!Array.isArray(saved?.sites) || !saved.sites.length) return null;
    if (!allowStale && (
      String(saved.version) !== String(cfg.version) ||
      String(saved.schemaVersion) !== String(cfg.schema_version)
    )) return null;
    return saved.sites;
  } catch (_) {
    return null;
  }
}

function writeCache(cfg, data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      version: String(cfg.version),
      schemaVersion: String(cfg.schema_version),
      sites: data
    }));
  } catch (_) {}
}

async function load() {
  const cfg = await helperConfig();
  if (!cfg) throw new Error("HOS sites are disabled");
  activeConfig = cfg;
  if (sites) return { config: cfg, sites, source: "memory" };
  const cached = readCache(cfg);
  if (cached) {
    sites = cached;
    return { config: cfg, sites, source: "cache" };
  }
  if (!freshPromise) {
    freshPromise = (async () => {
      try {
        const response = await fetch(cfg.url, { cache: "no-cache" });
        if (!response.ok) throw new Error(`Failed to load HOS sites (${response.status})`);
        const nextSites = validate(await response.json(), cfg);
        sites = nextSites;
        writeCache(cfg, nextSites);
        return { config: cfg, sites: nextSites, source: "remote" };
      } catch (error) {
        const stale = readCache(cfg, true);
        if (stale) {
          sites = stale;
          return { config: cfg, sites: stale, source: "stale-cache" };
        }
        throw error;
      }
    })().finally(() => { freshPromise = null; });
  }
  return freshPromise;
}

export async function getHosSites() {
  return load();
}

export function preloadHosSites() {
  return load().catch(() => null);
}

export function getHosConfig() {
  return activeConfig;
}
