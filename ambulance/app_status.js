// /ambulance/app_status.js
// CHANGELOG (2026-06-07):
// - Add Android-aligned user issue and restricted admin status JSON for the iOS Ambulance App.

const CACHE_KEYS = {
  appConfig: "amb_ios_app_config_v2",
  websites: "amb_websites_data_v1",
  asCall: "amb_as_call_data_v1",
  hosSites: "amb_hos_sites_v1",
  flowcharts: "amb_reference_flowcharts_v1",
  formulary: "amb_reference_formulary_v1",
  apPediatrics: "amb_pediatric_ap_pediatric_dosing_v1",
  ccpPediatrics: "amb_pediatric_ccp_pediatric_dosing_v1"
};

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function byteSize(value) {
  try {
    return new Blob([value == null ? "" : JSON.stringify(value)]).size;
  } catch (_) {
    return 0;
  }
}

function isoTime(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  try {
    return new Date(number).toISOString();
  } catch (_) {
    return null;
  }
}

function cacheStatus(key, options = {}) {
  const value = readJson(key);
  if (!value) return { available: false };
  const count = options.count
    ? Number(options.count(value) || 0)
    : undefined;
  const result = {
    available: true,
    saved_at: isoTime(value.savedAt),
    version: String(value.version || value.configVersion || value.iosVersion || ""),
    schema_version: String(value.schemaVersion || ""),
    size_bytes: byteSize(value)
  };
  if (Number.isFinite(count)) result.item_count = count;
  return result;
}

function storageSummary() {
  let localBytes = 0;
  let sessionBytes = 0;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i) || "";
      localBytes += key.length + String(localStorage.getItem(key) || "").length;
    }
  } catch (_) {}
  try {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i) || "";
      sessionBytes += key.length + String(sessionStorage.getItem(key) || "").length;
    }
  } catch (_) {}
  return {
    local_storage_entries: localStorage.length,
    local_storage_approx_bytes: localBytes * 2,
    session_storage_entries: sessionStorage.length,
    session_storage_approx_bytes: sessionBytes * 2
  };
}

async function permissionState(name) {
  try {
    if (!navigator.permissions?.query) return "unavailable";
    const result = await navigator.permissions.query({ name });
    return result?.state || "unknown";
  } catch (_) {
    return "unavailable";
  }
}

async function cacheStorageStatus(includeNames) {
  try {
    if (!window.caches?.keys) return { available: false };
    const names = await caches.keys();
    return {
      available: true,
      count: names.length,
      ...(includeNames ? { names } : {})
    };
  } catch (error) {
    return { available: false, error: error?.name || "CacheError" };
  }
}

function configuredBlock(config, name, includeUrls) {
  const block = config?.[name];
  if (!block || typeof block !== "object") return { configured: false };
  const result = {
    configured: true,
    enabled: block.enabled !== false,
    version: String(block.version || ""),
    schema_version: String(block.schema_version || "")
  };
  if (includeUrls && block.url) result.url = String(block.url);
  return result;
}

function documentStatus(config, includeUrls) {
  return (Array.isArray(config?.documents) ? config.documents : []).map((item) => ({
    type: String(item?.type || ""),
    version: String(item?.version || ""),
    ...(includeUrls ? {
      pdf_url: String(item?.pdf_url || ""),
      index_url: String(item?.index_url || "")
    } : {})
  }));
}

function pediatricStatus(config, includeUrls) {
  const helpers = Array.isArray(config?.pediatric_dosing?.helpers)
    ? config.pediatric_dosing.helpers
    : [];
  return {
    enabled: config?.pediatric_dosing?.enabled !== false,
    helpers: helpers.map((item) => ({
      id: String(item?.id || ""),
      enabled: item?.enabled !== false,
      version: String(item?.version || ""),
      schema_version: String(item?.schema_version || ""),
      ...(includeUrls && item?.url ? { url: String(item.url) } : {})
    })),
    cache: {
      ap: cacheStatus(CACHE_KEYS.apPediatrics, { count: value => value?.data?.medications?.length }),
      ccp: cacheStatus(CACHE_KEYS.ccpPediatrics, { count: value => value?.data?.medications?.length })
    }
  };
}

function noticeStatus(config) {
  const notices = Array.isArray(config?.notices) ? config.notices : [];
  let readIds = [];
  try {
    readIds = JSON.parse(localStorage.getItem("ambulance_ios_notice_read_ids_v1") || "[]");
  } catch (_) {}
  return {
    configured_count: notices.length,
    read_count: Array.isArray(readIds) ? readIds.length : 0
  };
}

async function loadAppConfig() {
  try {
    const module = window.__AMBULANCE_SHARED_MODULES?.appConfigData;
    if (module?.getAppConfig) return await module.getAppConfig();
  } catch (_) {}
  return readJson(CACHE_KEYS.appConfig)?.config || null;
}

export async function buildAppStatus(options = {}) {
  const includeAdmin = options.includeAdmin === true;
  const config = await loadAppConfig();
  const gate = await (window.__AMBULANCE_GET_GATE_SESSION?.() || Promise.resolve(null)).catch(() => null);
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches === true
    || navigator.standalone === true;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  const root = {
    generated_at: new Date().toISOString(),
    app: {
      name: "Ambulance",
      platform: "ios",
      version: String(window.__AMBULANCE_APP_VERSION || ""),
      asset_version: String(window.__AMBULANCE_ASSET_VERSION || ""),
      access_type: String(window.__AMBULANCE_ACCESS_TYPE || "unknown"),
      theme: document.documentElement.dataset.theme || "light",
      display_mode: standalone ? "standalone" : "browser",
      online: navigator.onLine
    },
    device: {
      device_label: includeAdmin ? String(gate?.device_label || "Unavailable") : "Hidden",
      language: navigator.language || "",
      languages: Array.isArray(navigator.languages) ? navigator.languages : [],
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      screen: `${screen.width}x${screen.height}`,
      pixel_ratio: window.devicePixelRatio || 1,
      touch_points: navigator.maxTouchPoints || 0,
      user_agent: includeAdmin ? navigator.userAgent : "Hidden"
    },
    permissions: {
      geolocation: await permissionState("geolocation"),
      notifications: typeof Notification === "undefined" ? "unavailable" : Notification.permission
    },
    app_config: {
      available: !!config,
      config_version: String(config?.config_version || ""),
      app_version: String(config?.app?.version || ""),
      cached: cacheStatus(CACHE_KEYS.appConfig),
      ...(includeAdmin ? {
        platform: String(config?.platform || ""),
        check_interval_hours: Number(config?.config_check_interval_hours || 0)
      } : {})
    },
    documents: documentStatus(config, includeAdmin),
    helpers: {
      flowcharts: {
        ...configuredBlock(config, "flowcharts", includeAdmin),
        cache: cacheStatus(CACHE_KEYS.flowcharts, { count: value => value?.items?.length })
      },
      formulary: {
        ...configuredBlock(config, "formulary", includeAdmin),
        cache: cacheStatus(CACHE_KEYS.formulary, { count: value => value?.items?.length })
      }
    },
    websites: {
      ...configuredBlock(config, "websites", includeAdmin),
      cache: cacheStatus(CACHE_KEYS.websites, { count: value => value?.websites?.length })
    },
    as_call: {
      ...configuredBlock(config, "as_call", includeAdmin),
      cache: cacheStatus(CACHE_KEYS.asCall, { count: value => value?.contacts?.length })
    },
    hos_sites: {
      ...configuredBlock(config, "hos_sites", includeAdmin),
      cache: cacheStatus(CACHE_KEYS.hosSites, { count: value => value?.sites?.length })
    },
    analytics: {
      configured: !!config?.analytics,
      enabled: config?.analytics?.enabled === true,
      implementation: "Not enabled in the iOS Ambulance App"
    },
    access_gate: includeAdmin
      ? (gate || { available: false })
      : {
          available: !!gate,
          status: String(gate?.status || ""),
          access_type: String(gate?.access_type || window.__AMBULANCE_ACCESS_TYPE || "unknown"),
          expires_at: String(gate?.expires_at || "")
        },
    pediatric_dosing: pediatricStatus(config, includeAdmin),
    notices: noticeStatus(config),
    cpr: {
      available: true,
      route: includeAdmin ? "/cpr/" : "Hidden",
      local_session_status: "Managed by the standalone CPR page"
    },
    storage: storageSummary(),
    browser_cache: await cacheStorageStatus(includeAdmin)
  };

  if (connection) {
    root.device.connection = {
      effective_type: connection.effectiveType || "unknown",
      downlink_mbps: Number(connection.downlink || 0),
      save_data: connection.saveData === true
    };
  }
  if (includeAdmin) {
    root.current_location = {
      origin: location.origin,
      pathname: location.pathname,
      hash: location.hash
    };
  }
  return root;
}

export function statusFilename(prefix) {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  return `${prefix}_${stamp}.json`;
}

export function jsonFile(data, filename) {
  return new File([JSON.stringify(data, null, 2)], filename, { type: "application/json" });
}
