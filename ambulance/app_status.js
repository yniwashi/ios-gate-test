// /ambulance/app_status.js
// CHANGELOG (2026-06-12):
// - Add privacy-safe CPR settings, active-state, saved-record count, and Wake Lock diagnostics.
// - Expand Admin Panel diagnostics with gate timing, resource source status, search cache, document grouping, and web runtime details.
// - Keep Report Issue sanitized while preserving useful cache/source state.
//
// CHANGELOG (2026-06-07):
// - Add Android-aligned user issue and restricted admin status JSON for the iOS Ambulance App.

const CACHE_KEYS = {
  appConfig: "amb_ios_app_config_v2",
  search: "amb_search_data_v2",
  websites: "amb_websites_data_v1",
  asCall: "amb_as_call_data_v1",
  hosSites: "amb_hos_sites_v1",
  flowcharts: "amb_reference_flowcharts_v1",
  formulary: "amb_reference_formulary_v1",
  apPediatrics: "amb_pediatric_ap_pediatric_dosing_v1",
  ccpPediatrics: "amb_pediatric_ccp_pediatric_dosing_v1"
};

const APP_CONFIG_ENDPOINTS = {
  production: "https://api.niwashibase.com/api/v1/ambulance/ios-app-config/production",
  backup: "https://api.niwashibase.com/api/v1/ambulance/ios-app-config/backup"
};

const CPR_KEYS = {
  settings: "cpr_android_parity_settings_v1",
  sessions: "cpr_android_parity_sessions_v1",
  active: "cpr_android_parity_active_v1"
};

const CPR_DEFAULTS = {
  interruptionSeconds: 5,
  cycleSeconds: 120,
  adrenalineSeconds: 240,
  pauseResetThresholdSeconds: 30,
  bpm: 120,
  useWaafles: true,
  playAudioCues: true,
  playCycleNinetySecondCue: true,
  audioCueVoice: "female",
  confirmAdrenalineBeforeLogging: false,
  adrenalineAutoLogDelaySeconds: 5,
  adrenalineConfirmationDelaySeconds: 15,
  resumeAlertSeconds: 10
};

let resourceStatusPromise = null;

function normalizeSourceLocal(source) {
  switch (String(source || "").toLowerCase()) {
    case "remote":
    case "primary":
    case "main":
      return "live";
    case "backup":
      return "backup";
    case "cache":
    case "cached":
    case "stale-cache":
      return "cache";
    case "memory":
      return "memory";
    case "disabled":
      return "disabled";
    case "fallback":
    case "bundled":
      return "fallback";
    default:
      return "not_loaded";
  }
}

function fallbackResourceStatus() {
  return {
    statusFor: resourceId => ({ resource_id: resourceId, using_source: "not_loaded" }),
    allStatuses: () => ({}),
    normalizeSource: normalizeSourceLocal
  };
}

function resourceStatusModule() {
  if (!resourceStatusPromise) {
    const version = globalThis.window?.__AMBULANCE_ASSET_VERSION || "dev";
    resourceStatusPromise = import(`./resource_status.js?ver=${version}`).catch(() => fallbackResourceStatus());
  }
  return resourceStatusPromise;
}

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
  if (value.source) result.cache_source = String(value.source);
  if (Number.isFinite(count)) result.item_count = count;
  return result;
}

function unixSecondsIso(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return isoTime(seconds * 1000);
}

function secondsUntilUnix(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.max(0, Math.round(seconds - Date.now() / 1000));
}

function mergeResource(resourceApi, resourceId, includeAdmin, extra = {}) {
  const api = resourceApi || fallbackResourceStatus();
  const status = api.statusFor(resourceId);
  const out = {
    resource_id: resourceId,
    active_source: String(status.active_source || ""),
    using_source: String(status.using_source || api.normalizeSource(status.active_source)),
    last_checked_at: status.last_checked_at || null,
    last_downloaded_at: status.last_downloaded_at || null,
    last_used_at: status.last_used_at || null,
    active_version: status.active_version || null,
    active_schema_version: status.active_schema_version || null,
    ...extra
  };
  if (includeAdmin) {
    out.last_error_at = status.last_error_at || null;
    out.last_error = status.last_error || null;
    Object.keys(status).forEach((key) => {
      if (!(key in out)) out[key] = status[key];
    });
  }
  return out;
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

function isSafeHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" || url.protocol === "http:";
  } catch (_) {
    return false;
  }
}

function documentStatus(config, includeUrls) {
  const result = {};
  const htmlHelpers = {};
  const documents = Array.isArray(config?.documents) ? config.documents : [];
  documents.forEach((item) => {
    const type = String(item?.type || "").trim().toUpperCase();
    const version = String(item?.version || "").trim();
    const pdfUrl = String(item?.pdf_url || "").trim();
    const indexUrl = String(item?.index_url || "").trim();
    if (["CPG", "SOP", "CPM", "PAT"].includes(type)) {
      result[type] = {
        configured_version: version || null,
        pdf: {
          configured: !!pdfUrl,
          ...(includeUrls && pdfUrl ? { url: pdfUrl } : {})
        },
        index: {
          configured: !!indexUrl,
          ...(includeUrls && indexUrl ? { url: indexUrl } : {})
        }
      };
      return;
    }
    const id = String(item?.id || type || "html_helper").trim().toLowerCase();
    htmlHelpers[id] = {
      type: String(item?.type || ""),
      version: version || null,
      configured: isSafeHttpUrl(item?.url),
      ...(includeUrls && item?.url ? { url: String(item.url) } : {})
    };
  });
  return { documents: result, html_helpers: htmlHelpers };
}

function pediatricStatus(config, includeUrls, resourceApi) {
  const helpers = Array.isArray(config?.pediatric_dosing?.helpers)
    ? config.pediatric_dosing.helpers
    : [];
  return {
    enabled: config?.pediatric_dosing?.enabled !== false,
    helpers: helpers.map((item) => {
      const id = String(item?.id || "");
      const shortId = id.replace(/_pediatric_dosing$/, "");
      return {
        id,
        enabled: item?.enabled !== false,
        version: String(item?.version || ""),
        schema_version: String(item?.schema_version || ""),
        status: mergeResource(resourceApi, `pediatric.${shortId}_dosing`, includeUrls),
        ...(includeUrls && item?.url ? { url: String(item.url) } : {})
      };
    }),
    cache: {
      ap: {
        ...cacheStatus(CACHE_KEYS.apPediatrics, { count: value => value?.data?.medications?.length }),
        status: mergeResource(resourceApi, "pediatric.ap_dosing", includeUrls)
      },
      ccp: {
        ...cacheStatus(CACHE_KEYS.ccpPediatrics, { count: value => value?.data?.medications?.length }),
        status: mergeResource(resourceApi, "pediatric.ccp_dosing", includeUrls)
      }
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

function searchStatus(includeAdmin, resourceApi) {
  const raw = readJson(CACHE_KEYS.search);
  const rawData = raw?.rawData || {};
  const count = value => Array.isArray(value)
    ? value.length
    : Array.isArray(value?.items)
      ? value.items.length
      : value && typeof value === "object"
        ? Object.keys(value).length
        : 0;
  return {
    cache: cacheStatus(CACHE_KEYS.search),
    status: mergeResource(resourceApi, "helpers.search", includeAdmin, {
      cpg_items: count(rawData.cpg),
      sop_items: count(rawData.sop),
      cpm_items: count(rawData.cpm),
      pat_items: count(rawData.pat),
      flowchart_items: count(rawData.flowcharts),
      formulary_items: count(rawData.formulary)
    })
  };
}

function gateStatus(gate, includeAdmin) {
  const checkSeconds = Number(gate?.check_expires_at || 0);
  const cookieSeconds = Number(gate?.cookie_expires_at || 0);
  const summary = {
    available: !!gate,
    status: String(gate?.status || ""),
    authenticated: gate?.authenticated === true,
    access_type: String(gate?.access_type || window.__AMBULANCE_ACCESS_TYPE || "unknown"),
    reason_code: String(gate?.reason_code || ""),
    next_status_check_at_utc: unixSecondsIso(checkSeconds),
    seconds_until_status_check: secondsUntilUnix(checkSeconds),
    status_check_due: Number.isFinite(checkSeconds) && checkSeconds > 0
      ? checkSeconds <= Date.now() / 1000
      : null,
    cookie_expires_at_utc: unixSecondsIso(cookieSeconds),
    seconds_until_cookie_expiry: secondsUntilUnix(cookieSeconds)
  };
  if (!includeAdmin) return summary;
  return {
    ...summary,
    raw: gate || null
  };
}

function cprStatus(includeAdmin) {
  const savedSettings = readJson(CPR_KEYS.settings) || {};
  const sessions = readJson(CPR_KEYS.sessions);
  const active = readJson(CPR_KEYS.active);
  const snapshot = active?.activeTimerSnapshot;
  const stopped = Array.isArray(active?.events)
    && active.events.some(event => event?.type === "CPR_STOPPED");
  const activeSessionExists = !!active
    && !active.endedAtMillis
    && !stopped
    && !!snapshot?.sessionId
    && (snapshot.isRunning === true || snapshot.isAwaitingSave === true);
  const settings = Object.fromEntries(
    Object.keys(CPR_DEFAULTS).map(key => [key, savedSettings[key] ?? CPR_DEFAULTS[key]])
  );

  return {
    available: true,
    route: includeAdmin ? "/cpr/" : "Hidden",
    active_session_exists: activeSessionExists,
    saved_record_count: Array.isArray(sessions) ? sessions.length : 0,
    screen_wake_lock_supported: !!navigator.wakeLock?.request,
    settings: {
      interruption_seconds: Number(settings.interruptionSeconds),
      cycle_seconds: Number(settings.cycleSeconds),
      adrenaline_seconds: Number(settings.adrenalineSeconds),
      pause_reset_threshold_seconds: Number(settings.pauseResetThresholdSeconds),
      bpm: Number(settings.bpm),
      use_waafels: settings.useWaafles === true,
      audio_cues: settings.playAudioCues === true,
      cycle_90_second_cue: settings.playCycleNinetySecondCue === true,
      audio_cue_voice: String(settings.audioCueVoice),
      confirm_adrenaline_before_logging: settings.confirmAdrenalineBeforeLogging === true,
      adrenaline_auto_log_delay_seconds: Number(settings.adrenalineAutoLogDelaySeconds),
      adrenaline_confirmation_delay_seconds: Number(settings.adrenalineConfirmationDelaySeconds),
      return_alert_seconds: Number(settings.resumeAlertSeconds)
    }
  };
}

function webRuntimeStatus() {
  let localStorageAvailable = false;
  let sessionStorageAvailable = false;
  try {
    const key = "__amb_ls_test";
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    localStorageAvailable = true;
  } catch (_) {}
  try {
    const key = "__amb_ss_test";
    sessionStorage.setItem(key, "1");
    sessionStorage.removeItem(key);
    sessionStorageAvailable = true;
  } catch (_) {}
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches === true
    || navigator.standalone === true;
  return {
    standalone,
    navigator_standalone: navigator.standalone === true,
    display_mode_standalone: window.matchMedia?.("(display-mode: standalone)")?.matches === true,
    cookie_enabled: navigator.cookieEnabled === true,
    local_storage_available: localStorageAvailable,
    session_storage_available: sessionStorageAvailable,
    cache_storage_available: !!window.caches,
    service_worker_available: "serviceWorker" in navigator,
    service_worker_controlled: !!navigator.serviceWorker?.controller,
    indexeddb_available: "indexedDB" in window,
    clipboard_supported: !!navigator.clipboard?.writeText,
    share_supported: !!navigator.share,
    share_files_supported: !!navigator.canShare,
    file_constructor_supported: typeof File !== "undefined"
  };
}

export async function buildAppStatus(options = {}) {
  const includeAdmin = options.includeAdmin === true;
  const config = await loadAppConfig();
  const gate = await (window.__AMBULANCE_GET_GATE_SESSION?.() || Promise.resolve(null)).catch(() => null);
  const resourceApi = await resourceStatusModule();
  const runtime = webRuntimeStatus();
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const docStatus = documentStatus(config, includeAdmin);

  const root = {
    generated_at: new Date().toISOString(),
    app: {
      name: "Ambulance",
      platform: "ios",
      version: String(window.__AMBULANCE_APP_VERSION || ""),
      asset_version: String(window.__AMBULANCE_ASSET_VERSION || ""),
      access_type: String(window.__AMBULANCE_ACCESS_TYPE || "unknown"),
      theme: document.documentElement.dataset.theme || "light",
      display_mode: runtime.standalone ? "standalone" : "browser",
      online: navigator.onLine
    },
    web_runtime: runtime,
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
      status: mergeResource(resourceApi, "app_config", includeAdmin),
      ...(includeAdmin ? {
        platform: String(config?.platform || ""),
        check_interval_hours: Number(config?.config_check_interval_hours || 0),
        endpoints: APP_CONFIG_ENDPOINTS
      } : {})
    },
    documents: docStatus.documents,
    html_helpers: docStatus.html_helpers,
    search: searchStatus(includeAdmin, resourceApi),
    helpers: {
      flowcharts: {
        ...configuredBlock(config, "flowcharts", includeAdmin),
        cache: cacheStatus(CACHE_KEYS.flowcharts, { count: value => value?.items?.length }),
        status: mergeResource(resourceApi, "helpers.flowcharts", includeAdmin)
      },
      formulary: {
        ...configuredBlock(config, "formulary", includeAdmin),
        cache: cacheStatus(CACHE_KEYS.formulary, { count: value => value?.items?.length }),
        status: mergeResource(resourceApi, "helpers.formulary", includeAdmin)
      }
    },
    websites: {
      ...configuredBlock(config, "websites", includeAdmin),
      cache: cacheStatus(CACHE_KEYS.websites, { count: value => value?.websites?.length }),
      status: mergeResource(resourceApi, "helpers.websites", includeAdmin)
    },
    as_call: {
      ...configuredBlock(config, "as_call", includeAdmin),
      cache: cacheStatus(CACHE_KEYS.asCall, { count: value => value?.contacts?.length }),
      status: mergeResource(resourceApi, "helpers.as_call", includeAdmin)
    },
    hos_sites: {
      ...configuredBlock(config, "hos_sites", includeAdmin),
      cache: cacheStatus(CACHE_KEYS.hosSites, { count: value => value?.sites?.length }),
      status: mergeResource(resourceApi, "helpers.hos_sites", includeAdmin)
    },
    analytics: {
      configured: !!config?.analytics,
      enabled: config?.analytics?.enabled === true,
      implementation: "Not enabled in the iOS Ambulance App"
    },
    access_gate: gateStatus(gate, includeAdmin),
    pediatric_dosing: pediatricStatus(config, includeAdmin, resourceApi),
    notices: noticeStatus(config),
    cpr: cprStatus(includeAdmin),
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
    root.resource_status = resourceApi.allStatuses();
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
