// /ambulance/pediatric_data.js
// CHANGELOG (2026-06-05):
// - Add Android-aligned AP/CCP pediatric helper loading from iOS App config with versioned local cache.

const FALLBACK = {
  ap_pediatric_dosing: {
    id:"ap_pediatric_dosing", schema_version:"0.1", version:"0.1",
    url:"https://api.niwashibase.com/api/v1/ambulance/app-data/ap-pediatric-dosing"
  },
  ccp_pediatric_dosing: {
    id:"ccp_pediatric_dosing", schema_version:"0.1", version:"0.1",
    url:"https://api.niwashibase.com/api/v1/ambulance/app-data/ccp-pediatric-dosing"
  }
};

const memory = new Map();
const pending = new Map();

async function appConfigModule() {
  if (window.__AMBULANCE_SHARED_MODULES?.appConfigData) return window.__AMBULANCE_SHARED_MODULES.appConfigData;
  const version = encodeURIComponent(window.__AMBULANCE_ASSET_VERSION || "current");
  return import(`./app_config_data.js?ver=${version}`);
}

async function helperConfig(id) {
  try {
    const { getAppConfig } = await appConfigModule();
    const appConfig = await getAppConfig();
    return appConfig?.pediatric_dosing?.enabled === false
      ? null
      : appConfig?.pediatric_dosing?.helpers?.find(item => item.id === id && item.enabled !== false) || FALLBACK[id];
  } catch (_) {
    return FALLBACK[id];
  }
}

function cacheKey(id) { return `amb_pediatric_${id}_v1`; }
function validate(data, cfg) {
  if (!data || data.helper_type !== cfg.id) throw new Error(`Unexpected pediatric helper: ${data?.helper_type || "unknown"}`);
  if (String(data.schema_version) !== String(cfg.schema_version)) throw new Error("Unexpected pediatric schema version");
  if (String(data.version) !== String(cfg.version)) throw new Error("Unexpected pediatric helper version");
  if (!Array.isArray(data.medications) || !data.medications.length) throw new Error("Pediatric helper has no medications");
  return data;
}

function readCache(cfg, allowStale = false) {
  try {
    const saved = JSON.parse(localStorage.getItem(cacheKey(cfg.id)) || "null");
    if (!saved?.data) return null;
    if (!allowStale && (saved.version !== String(cfg.version) || saved.schemaVersion !== String(cfg.schema_version))) return null;
    return validate(saved.data, cfg);
  } catch (_) { return null; }
}

function writeCache(cfg, data) {
  try {
    localStorage.setItem(cacheKey(cfg.id), JSON.stringify({
      savedAt:Date.now(), version:String(cfg.version), schemaVersion:String(cfg.schema_version), data
    }));
  } catch (_) {}
}

async function load(id) {
  if (memory.has(id)) return memory.get(id);
  if (pending.has(id)) return pending.get(id);
  const promise = (async () => {
    const cfg = await helperConfig(id);
    if (!cfg) throw new Error("Pediatric dosing is disabled");
    const cached = readCache(cfg);
    if (cached) { memory.set(id, { config:cfg, data:cached, source:"cache" }); return memory.get(id); }
    try {
      const response = await fetch(cfg.url, { cache:"no-cache" });
      if (!response.ok) throw new Error(`Failed to load pediatric helper (${response.status})`);
      const data = validate(await response.json(), cfg);
      writeCache(cfg, data);
      memory.set(id, { config:cfg, data, source:"remote" });
      return memory.get(id);
    } catch (error) {
      const stale = readCache(cfg, true);
      if (stale) { memory.set(id, { config:cfg, data:stale, source:"cache" }); return memory.get(id); }
      throw error;
    }
  })().finally(() => pending.delete(id));
  pending.set(id, promise);
  return promise;
}

export function getPediatricHelper(id) { return load(id); }
export function preloadPediatricHelpers() {
  return Promise.allSettled([load("ap_pediatric_dosing"), load("ccp_pediatric_dosing")]);
}
