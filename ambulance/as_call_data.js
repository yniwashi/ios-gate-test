// /ambulance/as_call_data.js
// CHANGELOG (2026-05-18):
// - Add shared AS-Call helper loader with 7-day local cache and background refresh.

const DEFAULT_CONFIG = {
  urlAsCall: "https://docs.niwashibase.com/helpers/as_call.json"
};

const CACHE_KEY = "amb_as_call_data_v1";
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

let config = { ...DEFAULT_CONFIG };
let contacts = null;
let freshPromise = null;

function classifyContact(name) {
  const value = String(name || "").toLowerCase();
  if (value.startsWith("delta")) return "Delta";
  if (value.startsWith("romeo")) return "Romeo";
  if (value.startsWith("sas")) return "SAS";
  if (value.includes("oscar")) return "Oscar";
  if (value.includes("production")) return "Production";
  if (value.includes("ncc")) return "NCC";
  if (value.includes("hcc")) return "HCC";
  if (value.includes("mdt") || value.includes("it help") || value.includes("support")) return "Support";
  if (value.includes("scheduling") || value.includes("secretary") || value.includes("hr") || value.includes("store") || value.includes("vehicle")) return "Admin";
  if (value.includes("cc ") || value.includes("retrieval") || value.includes("emergency")) return "Coordination";
  return "Other";
}

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "").trim();
}

function normalizeContact(name, phone, index) {
  const title = String(name || "").trim();
  const number = normalizePhone(phone);
  if (!title || !number) return null;
  return {
    id: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "contact"}-${index}`,
    title,
    number,
    category: classifyContact(title),
    raw: { name, phone }
  };
}

function parseAsCall(data) {
  if (Array.isArray(data?.contacts)) {
    return data.contacts
      .map((item, index) => normalizeContact(item.title || item.name || item.label, item.number || item.phone || item.tel, index))
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
    if (Date.now() - cached.savedAt > MAX_CACHE_AGE_MS) return null;
    contacts = cached.contacts;
    return contacts;
  } catch (_) {
    return null;
  }
}

function writeCache(items) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), contacts: items }));
  } catch (_) {}
}

async function fetchFresh() {
  const res = await fetch(config.urlAsCall, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load AS-Call (${res.status})`);
  const data = await res.json();
  const items = sortContacts(parseAsCall(data));
  if (!items.length) throw new Error("Empty AS-Call list");
  contacts = items;
  writeCache(items);
  return items;
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
