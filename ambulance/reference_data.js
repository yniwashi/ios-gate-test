// /ambulance/reference_data.js
// CHANGELOG (2026-06-12):
// - Track Flowcharts/Formulary source/error state for Admin Panel diagnostics.
//
// CHANGELOG (2026-06-05):
// - Add version-aware Flowcharts/Formulary loading from iOS App config and API endpoints.

const DEFAULTS = {
  flowcharts: {
    enabled:true,
    schema_version:"0.1",
    version:"2.5",
    url:"https://api.niwashibase.com/api/v1/ambulance/app-data/flowcharts"
  },
  formulary: {
    enabled:true,
    schema_version:"0.1",
    version:"2.5",
    url:"https://api.niwashibase.com/api/v1/ambulance/app-data/formulary"
  }
};

const memory = new Map();
const pending = new Map();
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
  if (window.__AMBULANCE_SHARED_MODULES?.appConfigData) {
    return window.__AMBULANCE_SHARED_MODULES.appConfigData;
  }
  const version = encodeURIComponent(window.__AMBULANCE_ASSET_VERSION || "current");
  return import(`./app_config_data.js?ver=${version}`);
}

async function helperConfig(type) {
  try {
    const { getAppConfig } = await appConfigModule();
    const appConfig = await getAppConfig();
    const configured = appConfig?.[type];
    if (configured?.enabled === false) return null;
    return configured?.url ? configured : DEFAULTS[type];
  } catch (_) {
    return DEFAULTS[type];
  }
}

function cacheKey(type) {
  return `amb_reference_${type}_v1`;
}

function normalize(data, type) {
  const out = [];
  if (Array.isArray(data)) {
    data.forEach(item => {
      const title = item?.title || item?.name || item?.label;
      const page = Number(item?.page || item?.p || item?.pageNumber || item?.page_start);
      if (title && Number.isFinite(page) && page > 0) out.push({ title:String(title), page });
    });
  } else if (data && typeof data === "object") {
    const items = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data[type])
        ? data[type]
        : null;
    if (items) return normalize(items, type);
    Object.entries(data).forEach(([title, value]) => {
      if (typeof value === "number" || typeof value === "string") {
        const page = Number(value);
        if (Number.isFinite(page) && page > 0) out.push({ title, page });
        return;
      }
      if (value && typeof value === "object" && !Array.isArray(value)) {
        Object.entries(value).forEach(([childTitle, childValue]) => {
          const page = Number(childValue);
          if (Number.isFinite(page) && page > 0) {
            out.push({ title:`${title} - ${childTitle}`, page });
          }
        });
      }
    });
  }
  return out.sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity:"base" }) || a.page - b.page
  );
}

function validate(data, type) {
  const items = normalize(data, type);
  if (!items.length) throw new Error(`The ${type} helper has no usable items`);
  return items;
}

function readCache(type, cfg, allowStale = false) {
  try {
    const saved = JSON.parse(localStorage.getItem(cacheKey(type)) || "null");
    if (!Array.isArray(saved?.items) || !saved.items.length) return null;
    if (!allowStale && (
      String(saved.version) !== String(cfg.version) ||
      String(saved.schemaVersion) !== String(cfg.schema_version)
    )) return null;
    return saved.items;
  } catch (_) {
    return null;
  }
}

function writeCache(type, cfg, items) {
  try {
    localStorage.setItem(cacheKey(type), JSON.stringify({
      savedAt:Date.now(),
      version:String(cfg.version),
      schemaVersion:String(cfg.schema_version),
      items
    }));
  } catch (_) {}
}

function resourceId(type) {
  return `helpers.${type}`;
}

function details(cfg, items) {
  return {
    active_version:String(cfg?.version || ""),
    active_schema_version:String(cfg?.schema_version || ""),
    item_count:Array.isArray(items) ? items.length : 0
  };
}

async function load(type) {
  if (!DEFAULTS[type]) throw new Error(`Unknown reference helper: ${type}`);
  if (memory.has(type)) return memory.get(type);
  if (pending.has(type)) return pending.get(type);
  const promise = (async () => {
    const cfg = await helperConfig(type);
    if (!cfg) throw new Error(`${type} is disabled`);
    const cached = readCache(type, cfg);
    if (cached) {
      trackResource("markUsed", resourceId(type), "cache", details(cfg, cached));
      const result = { config:cfg, items:cached, source:"cache" };
      memory.set(type, result);
      return result;
    }
    try {
      trackResource("markChecked", resourceId(type));
      const response = await fetch(cfg.url, { cache:"no-cache" });
      if (!response.ok) throw new Error(`Failed to load ${type} (${response.status})`);
      const items = validate(await response.json(), type);
      writeCache(type, cfg, items);
      trackResource("markDownloaded", resourceId(type), "remote", details(cfg, items));
      const result = { config:cfg, items, source:"remote" };
      memory.set(type, result);
      return result;
    } catch (error) {
      const stale = readCache(type, cfg, true);
      trackResource("markError", resourceId(type), error);
      if (stale) {
        trackResource("markUsed", resourceId(type), "stale-cache", details(cfg, stale));
        const result = { config:cfg, items:stale, source:"stale-cache" };
        memory.set(type, result);
        return result;
      }
      throw error;
    }
  })().finally(() => pending.delete(type));
  pending.set(type, promise);
  return promise;
}

export function getReferenceItems(type) {
  return load(type);
}

export function preloadReferenceItems() {
  return Promise.allSettled([load("flowcharts"), load("formulary")]);
}
