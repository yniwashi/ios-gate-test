// /ambulance/search_data.js
// CHANGELOG (2026-06-05):
// - Resolve document and reference helper URLs from iOS App config, with API-route defaults.
// - Add Android-aligned formulary/reference page resolution for direct CPG navigation.
// CHANGELOG (2026-05-17):
// - Load search_core through the app ASSET_VERSION cache key instead of a static import.
// CHANGELOG (2026-05-16):
// - Add shared helper-data preload and local cache for CPG, SOP, CPM, flowcharts, and formulary.
// - Provide reusable document item and global target access for the app and tool modules.

const DEFAULT_CONFIG = {
  urlIndex: "https://api.niwashibase.com/api/v1/ambulance/app-data/cpg-index",
  urlSopIndex: "https://api.niwashibase.com/api/v1/ambulance/app-data/sop-index",
  urlCpmIndex: "https://api.niwashibase.com/api/v1/ambulance/app-data/cpm-index",
  urlFlowcharts: "https://api.niwashibase.com/api/v1/ambulance/app-data/flowcharts",
  urlFormulary: "https://api.niwashibase.com/api/v1/ambulance/app-data/formulary"
};

const CACHE_KEY = "amb_search_data_v1";
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

let config = { ...DEFAULT_CONFIG };
let rawData = null;
let targets = null;
let freshPromise = null;
let searchCorePromise = null;
let searchCoreModule = null;
let appConfigApplied = false;

function assetQuery() {
  const version = window.__AMBULANCE_ASSET_VERSION || "";
  return version ? `?ver=${encodeURIComponent(version)}` : "";
}

async function getSearchCore() {
  if (searchCoreModule) return searchCoreModule;
  const shared = window.__AMBULANCE_SHARED_MODULES || {};
  if (shared.searchCore) {
    searchCoreModule = shared.searchCore;
    return searchCoreModule;
  }
  if (!searchCorePromise) {
    searchCorePromise = import(`./search_core.js${assetQuery()}`).then((mod) => {
      searchCoreModule = mod;
      return mod;
    }).finally(() => { searchCorePromise = null; });
  }
  return searchCorePromise;
}

async function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (!cached || !cached.rawData || !cached.savedAt) return null;
    if (Date.now() - cached.savedAt > MAX_CACHE_AGE_MS) return null;
    rawData = cached.rawData;
    targets = buildTargets(rawData, await getSearchCore());
    return rawData;
  } catch (_) {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), rawData: data }));
  } catch (_) {}
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
  return res.json();
}

async function applyIosAppConfig() {
  if (appConfigApplied) return;
  appConfigApplied = true;
  try {
    const version = encodeURIComponent(window.__AMBULANCE_ASSET_VERSION || "current");
    const module = window.__AMBULANCE_SHARED_MODULES?.appConfigData
      || await import(`./app_config_data.js?ver=${version}`);
    const data = await module.getAppConfig();
    const documents = Array.isArray(data?.documents) ? data.documents : [];
    const documentUrl = type => documents.find(item =>
      String(item?.type || "").toUpperCase() === type
    )?.index_url;
    config = {
      ...config,
      urlIndex: documentUrl("CPG") || config.urlIndex,
      urlSopIndex: documentUrl("SOP") || config.urlSopIndex,
      urlCpmIndex: documentUrl("CPM") || config.urlCpmIndex,
      urlFlowcharts: data?.flowcharts?.url || config.urlFlowcharts,
      urlFormulary: data?.formulary?.url || config.urlFormulary
    };
  } catch (_) {
    // API defaults remain usable when App config is temporarily unavailable.
  }
}

async function fetchFresh() {
  await applyIosAppConfig();
  const [core, cpg, sop, cpm, flowcharts, formulary] = await Promise.all([
    getSearchCore(),
    fetchJson(config.urlIndex).catch(() => []),
    fetchJson(config.urlSopIndex).catch(() => ({ items: [] })),
    fetchJson(config.urlCpmIndex).catch(() => ({ items: [] })),
    fetchJson(config.urlFlowcharts).catch(() => ({})),
    fetchJson(config.urlFormulary).catch(() => ({}))
  ]);
  rawData = { cpg, sop, cpm, flowcharts, formulary };
  targets = buildTargets(rawData, core);
  writeCache(rawData);
  return rawData;
}

function buildTargets(data, core) {
  const { buildDocumentTargets, buildSimplePageTargets } = core;
  return [
    ...buildDocumentTargets(data.cpg || [], "cpg"),
    ...buildDocumentTargets(data.sop || { items: [] }, "sop"),
    ...buildDocumentTargets(data.cpm || { items: [] }, "cpm"),
    ...buildSimplePageTargets(data.flowcharts || {}, "flowchart", { pillLabel: "Flowchart" }),
    ...buildSimplePageTargets(data.formulary || {}, "formulary", { pillLabel: "Formulary" })
  ];
}

export function configureSearchData(nextConfig = {}) {
  config = { ...config, ...nextConfig };
}

export async function preloadSearchData(nextConfig = {}) {
  configureSearchData(nextConfig);
  if (!rawData) await readCache();
  if (!freshPromise) freshPromise = fetchFresh().finally(() => { freshPromise = null; });
  return rawData || freshPromise;
}

export async function getSearchData(nextConfig = {}) {
  configureSearchData(nextConfig);
  if (rawData) return rawData;
  const cached = await readCache();
  if (cached) {
    preloadSearchData().catch(() => {});
    return cached;
  }
  if (!freshPromise) freshPromise = fetchFresh().finally(() => { freshPromise = null; });
  return freshPromise;
}

export async function getGlobalDocumentTargets(nextConfig = {}) {
  await getSearchData(nextConfig);
  return targets || [];
}

export async function getDocumentItems(type, nextConfig = {}) {
  await getSearchData(nextConfig);
  const data = rawData && rawData[type];
  const { extractItems } = await getSearchCore();
  return extractItems(data || []);
}

function normalizeLookup(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function referenceAliases(query) {
  const normalized = normalizeLookup(query);
  const aliases = {
    "adrenaline": ["Adrenaline/Epinephrine"],
    "dextrose 10": ["Dextrose"],
    "hydrocortison": ["Hydrocortisone"],
    "paracetamol": ["Paracetamol"],
    "txa": ["Tranexamic Acid"]
  };
  return [query, ...(aliases[normalized] || [])];
}

function bestTarget(items, query) {
  for (const candidate of referenceAliases(query)) {
    const normalized = normalizeLookup(candidate);
    const exact = items.find(item => normalizeLookup(item.title) === normalized);
    if (exact) return exact;
    const matched = items.find(item =>
      (item.primaryTerms || []).some(term => normalizeLookup(term) === normalized) ||
      (item.secondaryTerms || []).some(term => normalizeLookup(term) === normalized)
    );
    if (matched) return matched;
    const partial = items.find(item => {
      const title = normalizeLookup(item.title);
      return title.includes(normalized) || normalized.includes(title);
    });
    if (partial) return partial;
  }
  return null;
}

export async function resolveFormularyPage(query, nextConfig = {}) {
  await getSearchData(nextConfig);
  return bestTarget((targets || []).filter(item => item.type === "formulary"), query);
}

export async function resolveReferencePage(query, nextConfig = {}) {
  await getSearchData(nextConfig);
  for (const type of ["cpg", "formulary", "flowchart"]) {
    const item = bestTarget((targets || []).filter(target => target.type === type), query);
    if (item) return item;
  }
  return null;
}
