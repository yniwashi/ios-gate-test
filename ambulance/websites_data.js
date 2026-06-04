// /ambulance/websites_data.js
// CHANGELOG (2026-05-17):
// - Add shared websites helper loader with 7-day local cache and background refresh.
// - Add icon warmup for enabled remote website icons.
// - Sort website categories and entries alphabetically for consistent display.

const DEFAULT_CONFIG = {
  urlWebsites: "https://docs.niwashibase.com/helpers/websites.json"
};

const CACHE_KEY = "amb_websites_data_v1";
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

let config = { ...DEFAULT_CONFIG };
let websites = null;
let freshPromise = null;
let warmedIcons = false;

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

function parseWebsites(data) {
  const arr = Array.isArray(data?.websites) ? data.websites : [];
  return arr.map(normalizeWebsite).filter(Boolean);
}

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (!cached || !Array.isArray(cached.websites) || !cached.savedAt) return null;
    if (Date.now() - cached.savedAt > MAX_CACHE_AGE_MS) return null;
    websites = cached.websites;
    return websites;
  } catch (_) {
    return null;
  }
}

function writeCache(items) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), websites: items }));
  } catch (_) {}
}

async function fetchFresh() {
  const res = await fetch(config.urlWebsites, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load websites (${res.status})`);
  const data = await res.json();
  const items = parseWebsites(data);
  if (!items.length) throw new Error("Empty websites list");
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
