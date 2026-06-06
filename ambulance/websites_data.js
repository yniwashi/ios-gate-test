// /ambulance/websites_data.js
// CHANGELOG (2026-06-06):
// - Load Websites through iOS App config with versioned cache and Android-style helper validation.
//
// CHANGELOG (2026-05-17):
// - Add shared websites helper loader with 7-day local cache and background refresh.
// - Add icon warmup for enabled remote website icons.
// - Sort website categories and entries alphabetically for consistent display.

const DEFAULT_CONFIG = {
  enabled: true,
  schema_version: "0.1",
  version: "0.1",
  url: "https://api.niwashibase.com/api/v1/ambulance/app-data/websites"
};

const CACHE_KEY = "amb_websites_data_v1";

let config = { ...DEFAULT_CONFIG };
let websites = null;
let freshPromise = null;
let warmedIcons = false;

async function appConfigModule() {
  if (window.__AMBULANCE_SHARED_MODULES?.appConfigData) return window.__AMBULANCE_SHARED_MODULES.appConfigData;
  const version = encodeURIComponent(window.__AMBULANCE_ASSET_VERSION || "current");
  return import(`./app_config_data.js?ver=${version}`);
}

async function helperConfig() {
  try {
    const { getAppConfig } = await appConfigModule();
    const appConfig = await getAppConfig();
    const configured = appConfig?.websites;
    if (configured?.enabled === false) return null;
    return configured?.url ? { ...DEFAULT_CONFIG, ...configured } : DEFAULT_CONFIG;
  } catch (_) {
    return DEFAULT_CONFIG;
  }
}

function normalizeWebsite(item) {
  if (!item || typeof item !== "object") return null;
  if (item.enabled === false) return null;
  const title = String(item.title || "").trim();
  const url = String(item.url || "").trim();
  if (!title || !url) return null;
  return {
    id: String(item.id || title).trim(),
    title,
    category: String(item.category || "Other").trim() || "Other",
    subtitle: String(item.subtitle || "").trim(),
    url,
    icon_url: String(item.icon_url || "").trim(),
    raw: item
  };
}

function isSafeWebsiteUrl(url) {
  try {
    const parsed = new URL(String(url || "").trim());
    return parsed.protocol === "https:" && !!parsed.hostname;
  } catch (_) {
    return false;
  }
}

function parseWebsites(data) {
  const arr = Array.isArray(data?.websites) ? data.websites : [];
  return arr.map(normalizeWebsite).filter(item => item && isSafeWebsiteUrl(item.url));
}

function validate(data, cfg) {
  if (!data || data.helper_type !== "websites") throw new Error(`Unexpected websites helper: ${data?.helper_type || "unknown"}`);
  if (String(data.schema_version) !== String(cfg.schema_version)) throw new Error("Unexpected websites schema version");
  if (String(data.version) !== String(cfg.version)) throw new Error("Unexpected websites helper version");
  const items = parseWebsites(data).sort((a, b) => String(a.title).localeCompare(String(b.title), undefined, { sensitivity:"base" }));
  if (!items.length) throw new Error("Empty websites list");
  return items;
}

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (!cached || !Array.isArray(cached.websites) || !cached.savedAt) return null;
    if (String(cached.version) !== String(config.version) || String(cached.schemaVersion) !== String(config.schema_version)) return null;
    websites = cached.websites;
    return websites;
  } catch (_) {
    return null;
  }
}

function writeCache(items) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      version: String(config.version),
      schemaVersion: String(config.schema_version),
      websites: items
    }));
  } catch (_) {}
}

async function fetchFresh() {
  const cfg = await helperConfig();
  if (!cfg) throw new Error("Websites are disabled");
  config = { ...config, ...cfg };
  const res = await fetch(config.url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load websites (${res.status})`);
  const items = validate(await res.json(), config);
  websites = items;
  writeCache(items);
  warmWebsiteIcons(items);
  return items;
}

export function configureWebsitesData(nextConfig = {}) {
  config = { ...config, ...nextConfig };
}

export function preloadWebsitesData(nextConfig = {}) {
  configureWebsitesData(nextConfig);
  if (!websites) readCache();
  if (websites) warmWebsiteIcons(websites);
  if (!freshPromise) freshPromise = fetchFresh().finally(() => { freshPromise = null; });
  return websites ? Promise.resolve(websites) : freshPromise;
}

export async function getWebsites(nextConfig = {}) {
  configureWebsitesData(nextConfig);
  if (websites) return websites;
  const cached = readCache();
  if (cached) {
    warmWebsiteIcons(cached);
    preloadWebsitesData().catch(() => {});
    return cached;
  }
  if (!freshPromise) freshPromise = fetchFresh().finally(() => { freshPromise = null; });
  return freshPromise;
}

export function groupWebsites(items) {
  const groups = [];
  const map = new Map();
  [...items].sort((a, b) => String(a.title).localeCompare(String(b.title))).forEach((item) => {
    const category = item.category || "Other";
    if (!map.has(category)) {
      const group = { category, items: [] };
      map.set(category, group);
      groups.push(group);
    }
    map.get(category).items.push(item);
  });
  return groups.sort((a, b) => String(a.category).localeCompare(String(b.category)));
}

export function warmWebsiteIcons(items = websites || []) {
  if (warmedIcons) return;
  warmedIcons = true;
  const urls = Array.from(new Set(items.map((item) => item.icon_url).filter(Boolean)));
  urls.slice(0, 80).forEach((url, index) => {
    setTimeout(() => {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
    }, index * 40);
  });
}
