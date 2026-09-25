// /ambulance/as_call_data.js
// CHANGELOG (2026-06-12):
// - Track AS-Call helper source/error state for Admin Panel diagnostics.
//
// CHANGELOG (2026-06-06):
// - Load AS-Call through iOS App config and decode Android-style number_ref helper values.
//
// CHANGELOG (2026-05-18):
// - Add shared AS-Call helper loader with 7-day local cache and background refresh.

const DEFAULT_CONFIG = {
  enabled: true,
  schema_version: "0.1",
  version: "0.1",
  url: "https://api.niwashibase.com/api/v1/ambulance/app-data/as-call"
};

const CACHE_KEY = "amb_as_call_data_v1";
const RESOURCE_ID = "helpers.as_call";

let config = { ...DEFAULT_CONFIG };
let contacts = null;
let freshPromise = null;
let resourceStatusPromise = null;

function resourceStatusModule() {
  if (!resourceStatusPromise) {
    const version = globalThis.window?.__AMBULANCE_ASSET_VERSION || "dev";
    resourceStatusPromise = import(`./resource_status.js?ver=${version}`).catch(() => null);
  }
  return resourceStatusPromise;
}

function trackResource(method, ...args) {
  resourceStatusModule().then(mod => mod?.[method]?.(...args)).catch(() => {});
}

async function appConfigModule() {
  if (window.__AMBULANCE_SHARED_MODULES?.appConfigData) return window.__AMBULANCE_SHARED_MODULES.appConfigData;
  const version = encodeURIComponent(window.__AMBULANCE_ASSET_VERSION || "current");
  return import(`./app_config_data.js?ver=${version}`);
}

async function helperConfig() {
  try {
    const { getAppConfig } = await appConfigModule();
    const appConfig = await getAppConfig();
    const configured = appConfig?.as_call;
    if (configured?.enabled === false) return null;
    return configured?.url ? { ...DEFAULT_CONFIG, ...configured } : DEFAULT_CONFIG;
  } catch (_) {
    return DEFAULT_CONFIG;
  }
}

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "").trim();
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

function isSafePhoneNumber(number) {
  const text = String(number || "").trim();
  if (!text || (text.match(/\d/g) || []).length < 3) return false;
  return /^[\d+#* ()-]+$/.test(text);
}

function decodeNumberRef(ref) {
  if (!String(ref || "").startsWith("v1:")) return "";
  const decoded = decodeBase64Url(String(ref).slice(3));
  const chars = [...decoded].reverse().map(ch => {
    if (/\d/.test(ch)) return String((Number(ch) + 3) % 10);
    if (ch === "p") return "+";
    if (ch === "s") return "*";
    if (ch === "h") return "#";
    if (ch === "_") return " ";
    if (ch === "d") return "-";
    if (ch === "l") return "(";
    if (ch === "r") return ")";
    return "";
  });
  const number = chars.join("");
  return isSafePhoneNumber(number) ? number : "";
}

function stableId(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "contact";
}

function normalizeContact(name, phone, index, id = "") {
  const title = String(name || "").trim();
  const number = normalizePhone(phone);
  if (!title || !number) return null;
  return {
    id: stableId(id || title || `contact_${index}`),
    title,
    number,
    raw: { name, phone }
  };
}

function validate(data, cfg) {
  if (!data || data.helper_type !== "as_call") throw new Error(`Unexpected AS-Call helper: ${data?.helper_type || "unknown"}`);
  if (String(data.schema_version) !== String(cfg.schema_version)) throw new Error("Unexpected AS-Call schema version");
  if (String(data.version) !== String(cfg.version)) throw new Error("Unexpected AS-Call helper version");
  const items = parseAsCall(data);
  if (!items.length) throw new Error("Empty AS-Call list");
  return sortContacts(items);
}

function parseAsCall(data) {
  if (Array.isArray(data?.contacts)) {
    return data.contacts
      .filter(item => item?.enabled !== false)
      .map((item, index) => normalizeContact(
        item.title || item.name || item.label,
        decodeNumberRef(item.number_ref) || item.number || item.phone || item.tel,
        index,
        item.id
      ))
      .filter(Boolean);
  }

  const book = data?.addressbook && typeof data.addressbook === "object" ? data.addressbook : data;
  if (!book || typeof book !== "object" || Array.isArray(book)) return [];
  return Object.entries(book)
    .map(([name, phone], index) => normalizeContact(name, phone, index))
    .filter(Boolean);
}

function sortContacts(items) {
  return [...items].sort((a, b) => String(a.title).localeCompare(String(b.title), undefined, { numeric: true }));
}

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (!cached || !Array.isArray(cached.contacts) || !cached.savedAt) return null;
    if (String(cached.version) !== String(config.version) || String(cached.schemaVersion) !== String(config.schema_version)) return null;
    contacts = cached.contacts;
    trackResource("markUsed", RESOURCE_ID, "cache", {
      active_version:String(config.version || cached.version || ""),
      active_schema_version:String(config.schema_version || cached.schemaVersion || ""),
      contact_count:contacts.length
    });
    return contacts;
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
      contacts: items
    }));
  } catch (_) {}
}

async function fetchFresh() {
  const cfg = await helperConfig();
  if (!cfg) throw new Error("AS-Call is disabled");
  config = { ...config, ...cfg };
  try {
    trackResource("markChecked", RESOURCE_ID);
    const res = await fetch(config.url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Failed to load AS-Call (${res.status})`);
    const items = validate(await res.json(), config);
    contacts = items;
    writeCache(items);
    trackResource("markDownloaded", RESOURCE_ID, "remote", {
      active_version:String(config.version || ""),
      active_schema_version:String(config.schema_version || ""),
      contact_count:items.length
    });
    return items;
  } catch (error) {
    trackResource("markError", RESOURCE_ID, error);
    throw error;
  }
}

export function configureAsCallData(nextConfig = {}) {
  config = { ...config, ...nextConfig };
}

export function preloadAsCallData(nextConfig = {}) {
  configureAsCallData(nextConfig);
  if (!contacts) readCache();
  if (!freshPromise) freshPromise = fetchFresh().finally(() => { freshPromise = null; });
  return contacts ? Promise.resolve(contacts) : freshPromise;
}

export async function getAsCallContacts(nextConfig = {}) {
  configureAsCallData(nextConfig);
  if (contacts) return contacts;
  const cached = readCache();
  if (cached) {
    preloadAsCallData().catch(() => {});
    return cached;
  }
  if (!freshPromise) freshPromise = fetchFresh().finally(() => { freshPromise = null; });
  return freshPromise;
}
