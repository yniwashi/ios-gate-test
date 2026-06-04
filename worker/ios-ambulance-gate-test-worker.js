// ios-ambulance-gate-test-worker.js
// CHANGELOG (2026-06-04):
// - Prefer ACCESS_GATE_WORKER service binding for Access Gate calls, with public API URL fallback.
// - Add safe debug-config endpoint to verify test Worker API/static origin settings.
// - Serve the testing gate page directly from the Worker root so production root files stay untouched.
// - Add testing-only iOS Access Gate Worker draft that proxies the shared Ambulance Access Gate API.
// - Mint signed wc cookies only after active access, and protect app-owned routes on the test domain.

const DEFAULT_ACCESS_GATE_API_BASE = "https://api.niwashibase.com/api/v1/ambulance/access-gate";
const DEFAULT_STATIC_ORIGIN = "https://raw.githubusercontent.com/yniwashi/ios/main";
const COOKIE_NAME = "wc";
const COOKIE_TTL_SECONDS = 30 * 24 * 60 * 60;
const PLATFORM = "ios";

const PROTECTED_PREFIXES = [
  "/ambulance/",
  "/ambulance/tools/",
  "/cpr/"
];

const PROTECTED_EXACT = new Set([
  "/ambulance",
  "/ambulance/tools",
  "/ambulance/search_core.js",
  "/ambulance/search_data.js",
  "/ambulance/websites_data.js",
  "/ambulance/as_call_data.js",
  "/cpr",
  "/helpers/rsi_checklist_js.html",
  "/helpers/rsi_checklist.html"
]);

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const path = normalizePath(url.pathname);

    if (req.method === "OPTIONS") return corsPreflight();

    if ((path === "/" || path === "/index.html") && req.method === "GET") {
      return new Response(gatePageHtml(), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store, no-cache, must-revalidate"
        }
      });
    }

    if (path === "/gate/session-info" && req.method === "GET") {
      return sessionInfo(req, env);
    }

    if (path === "/gate/debug-config" && req.method === "GET") {
      return debugConfig(env);
    }

    if (path === "/gate/check" && req.method === "POST") {
      return gateCheck(req, env);
    }

    if (path === "/gate/register-staff" && req.method === "POST") {
      return gateRegister(req, env, "register");
    }

    if (path === "/gate/register-other" && req.method === "POST") {
      return gateRegister(req, env, "register-non-ambulance");
    }

    if (path === "/gate/logout" && req.method === "POST") {
      return json({ ok: true, status: "logged_out" }, 200, {
        "Set-Cookie": clearCookie(req)
      });
    }

    if (path === "/cookie-check" && req.method === "GET") {
      const token = parseCookies(req.headers.get("Cookie") || "")[COOKIE_NAME];
      const payload = token ? await verifySignedCookie(env.SIGNING_KEY, token) : null;
      return json({
        hasWc: Boolean(payload),
        active: Boolean(payload && payload.status === "active"),
        access_type: payload?.access_type || "",
        check_expired: payload ? Number(payload.check_exp || 0) <= nowSec() : true
      }, 200);
    }

    if (isProtectedPath(path)) {
      const pass = await authorizeProtectedRequest(req, env);
      if (!pass.ok) return redirectToGate(url);
      if (pass.setCookie) {
        const origin = await fetchStatic(req, env);
        return withHeader(origin, "Set-Cookie", pass.setCookie);
      }
      return fetchStatic(req, env);
    }

    const resp = await fetchStatic(req, env);
    if (path === "/" || path === "/index.html" || path.startsWith("/install/")) {
      return noStore(resp);
    }
    return resp;
  }
};

async function sessionInfo(req, env) {
  const token = parseCookies(req.headers.get("Cookie") || "")[COOKIE_NAME];
  const payload = token ? await verifySignedCookie(env.SIGNING_KEY, token) : null;
  if (!payload) {
    return json({ ok: true, status: "not_found", reason_code: "registration_required", authenticated: false }, 200);
  }

  if (payload.status === "active" && Number(payload.check_exp || 0) > nowSec()) {
    return json({
      ok: true,
      status: "active",
      reason_code: "access_active",
      authenticated: true,
      access_type: payload.access_type || "",
      install_id: payload.install_id || "",
      check_expires_at: payload.check_exp || 0,
      cookie_expires_at: payload.exp || 0
    }, 200);
  }

  if (!payload.install_id) {
    return json({ ok: true, status: "not_found", reason_code: "registration_required", authenticated: false }, 200, {
      "Set-Cookie": clearCookie(req)
    });
  }

  const api = await callAccessApi(env, "check", {
    platform: PLATFORM,
    install_id: payload.install_id,
    app_version: "",
    device_label: deviceLabel(req)
  });
  return responseWithSessionCookie(req, env, api, payload.install_id);
}

async function gateCheck(req, env) {
  const body = await req.json().catch(() => ({}));
  const installId = cleanText(body.install_id, 120);
  if (!installId) return json({ ok: false, status: "error", reason_code: "missing_device" }, 400);

  const api = await callAccessApi(env, "check", iosBody(req, body, installId));
  return responseWithSessionCookie(req, env, api, installId);
}

async function gateRegister(req, env, endpoint) {
  const body = await req.json().catch(() => ({}));
  const installId = cleanText(body.install_id, 120);
  if (!installId) return json({ ok: false, status: "error", reason_code: "missing_device" }, 400);

  const api = await callAccessApi(env, endpoint, iosBody(req, body, installId));
  return responseWithSessionCookie(req, env, api, installId);
}

function iosBody(req, body, installId) {
  return {
    ...body,
    platform: PLATFORM,
    install_id: installId,
    app_version: cleanText(body.app_version, 40),
    device_label: cleanText(body.device_label, 160) || deviceLabel(req)
  };
}

async function authorizeProtectedRequest(req, env) {
  const token = parseCookies(req.headers.get("Cookie") || "")[COOKIE_NAME];
  const payload = token ? await verifySignedCookie(env.SIGNING_KEY, token) : null;
  if (!payload || payload.status !== "active" || !payload.install_id) return { ok: false };

  if (Number(payload.check_exp || 0) > nowSec()) return { ok: true };

  const api = await callAccessApi(env, "check", {
    platform: PLATFORM,
    install_id: payload.install_id,
    app_version: "",
    device_label: deviceLabel(req)
  });

  if (api.status !== "active") return { ok: false };
  return {
    ok: true,
    setCookie: await makeSignedCookie(req, env.SIGNING_KEY, payload.install_id, api)
  };
}

async function callAccessApi(env, endpoint, body) {
  if (env.ACCESS_GATE_WORKER?.fetch) {
    const upstreamReq = new Request(`https://access-gate.internal/${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const res = await env.ACCESS_GATE_WORKER.fetch(upstreamReq);
    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      http_status: res.status,
      ...data
    };
  }

  const base = String(env.ACCESS_GATE_API_BASE || DEFAULT_ACCESS_GATE_API_BASE).replace(/\/+$/, "");
  const res = await fetch(`${base}/${endpoint}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return {
    ok: res.ok,
    http_status: res.status,
    ...data
  };
}

async function debugConfig(env) {
  const apiBase = String(env.ACCESS_GATE_API_BASE || DEFAULT_ACCESS_GATE_API_BASE).replace(/\/+$/, "");
  const staticOrigin = String(env.STATIC_ORIGIN || DEFAULT_STATIC_ORIGIN).replace(/\/+$/, "");
  let ping = { ok: false };
  try {
    const res = env.ACCESS_GATE_WORKER?.fetch
      ? await env.ACCESS_GATE_WORKER.fetch(new Request("https://access-gate.internal/ping", { method: "GET" }))
      : await fetch(`${apiBase}/ping`, { method: "GET" });
    ping = {
      ok: res.ok,
      status: res.status,
      body_start: (await res.text()).slice(0, 160)
    };
  } catch (err) {
    ping = {
      ok: false,
      error: String(err?.message || err).slice(0, 160)
    };
  }

  return json({
    ok: true,
    access_gate_api_base: apiBase,
    static_origin: staticOrigin,
    has_signing_key: Boolean(env.SIGNING_KEY),
    has_access_gate_worker_binding: Boolean(env.ACCESS_GATE_WORKER?.fetch),
    ping
  }, 200);
}

async function responseWithSessionCookie(req, env, api, installId) {
  const headers = {};
  if (api.status === "active") {
    headers["Set-Cookie"] = await makeSignedCookie(req, env.SIGNING_KEY, installId, api);
  } else if (api.status === "locked" || api.status === "revoked" || api.status === "not_found" || api.status === "error") {
    headers["Set-Cookie"] = clearCookie(req);
  }

  return json({
    ...api,
    session_active: api.status === "active"
  }, api.http_status && api.http_status >= 400 ? api.http_status : 200, headers);
}

async function makeSignedCookie(req, signingKey, installId, api) {
  const ttl = COOKIE_TTL_SECONDS;
  const exp = nowSec() + ttl;
  const checkTtl = clampTtl(Number(api.cache_ttl_sec || api.retry_after_seconds || 3600));
  const payload = {
    platform: PLATFORM,
    install_id: installId,
    status: api.status || "active",
    access_type: cleanText(api.access_type || "non_ambulance_staff", 60),
    reason_code: cleanText(api.reason_code || "", 80),
    check_exp: nowSec() + checkTtl,
    exp
  };
  const payloadB64 = strToB64Url(JSON.stringify(payload));
  const sig = await hmacB64Url(signingKey, payloadB64);
  const value = `${payloadB64}.${sig}`;
  const expDate = new Date(exp * 1000).toUTCString();
  return [
    `${COOKIE_NAME}=${value}`,
    "Path=/",
    `Domain=${new URL(req.url).hostname}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${ttl}`,
    `Expires=${expDate}`
  ].join("; ");
}

async function verifySignedCookie(signingKey, cookieVal) {
  const [payloadB64, sig] = String(cookieVal || "").split(".");
  if (!payloadB64 || !sig || !signingKey) return null;
  const expected = await hmacB64Url(signingKey, payloadB64);
  if (!timingSafeEq(sig, expected)) return null;
  try {
    const payload = JSON.parse(b64UrlToStr(payloadB64));
    if (Number(payload.exp || 0) <= nowSec()) return null;
    return payload;
  } catch (_) {
    return null;
  }
}

function clearCookie(req) {
  return [
    `${COOKIE_NAME}=`,
    "Path=/",
    `Domain=${new URL(req.url).hostname}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT"
  ].join("; ");
}

async function fetchStatic(req, env) {
  const incoming = new URL(req.url);
  const target = staticTargetUrl(incoming, env);
  const init = {
    method: req.method,
    headers: req.headers,
    redirect: "follow"
  };
  if (!["GET", "HEAD"].includes(req.method)) init.body = req.body;

  const originResp = await fetch(target, init);
  const headers = new Headers(originResp.headers);
  const contentType = contentTypeForPath(new URL(target).pathname);
  if (contentType) headers.set("content-type", contentType);
  headers.delete("x-frame-options");
  return new Response(originResp.body, {
    status: originResp.status,
    statusText: originResp.statusText,
    headers
  });
}

function staticTargetUrl(incoming, env) {
  const origin = String(env.STATIC_ORIGIN || DEFAULT_STATIC_ORIGIN).replace(/\/+$/, "");
  let path = incoming.pathname;
  if (path === "/") path = "/index.html";
  if (path.endsWith("/")) path += "index.html";
  const target = new URL(origin + path);
  target.search = incoming.search;
  return target.toString();
}

function isProtectedPath(path) {
  if (PROTECTED_EXACT.has(path)) return true;
  return PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function redirectToGate(url) {
  const target = new URL("/", url.origin);
  target.searchParams.set("gate", "required");
  return Response.redirect(target.toString(), 302);
}

function noStore(resp) {
  const headers = new Headers(resp.headers);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers });
}

function withHeader(resp, name, value) {
  const headers = new Headers(resp.headers);
  headers.append(name, value);
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers });
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...extraHeaders
    }
  });
}

function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
      "cache-control": "no-store"
    }
  });
}

function parseCookies(raw) {
  return raw.split(";").reduce((out, part) => {
    const idx = part.indexOf("=");
    if (idx < 0) return out;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = value;
    return out;
  }, {});
}

function cleanText(value, max = 120) {
  return String(value || "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function deviceLabel(req) {
  const ua = cleanText(req.headers.get("user-agent") || "", 180);
  if (!ua) return "iOS Ambulance App";
  if (/iphone/i.test(ua)) return "iPhone Ambulance App";
  if (/ipad/i.test(ua)) return "iPad Ambulance App";
  return "iOS Ambulance App";
}

function clampTtl(ttl) {
  if (!Number.isFinite(ttl) || ttl <= 0) return 3600;
  return Math.max(60, Math.min(ttl, 7 * 24 * 60 * 60));
}

function normalizePath(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function contentTypeForPath(pathname) {
  const path = pathname.toLowerCase();
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".webmanifest")) return "application/manifest+json";
  if (path.endsWith(".mobileconfig")) return "application/x-apple-aspen-config";
  if (path.endsWith(".pdf")) return "application/pdf";
  if (path.endsWith(".mp3")) return "audio/mpeg";
  if (path.endsWith(".wav")) return "audio/wav";
  return "";
}

function gatePageHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Ambulance Access</title>
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="theme-color" content="#f7f9fc">
  <style>
    :root{color-scheme:light dark;--bg:#f7f9fc;--card:#fff;--text:#0c1230;--muted:#647089;--border:#e1e7f0;--accent:#0d5bb5;--danger:#b42318;--shadow:0 16px 44px rgba(15,23,42,.14)}
    @media (prefers-color-scheme:dark){:root{--bg:#0f1115;--card:#171a21;--text:#eef2ff;--muted:#9aa6c3;--border:#232a37;--accent:#2f81f7;--danger:#f87171;--shadow:0 18px 48px rgba(0,0,0,.36)}}
    *{box-sizing:border-box}html,body{min-height:100%;margin:0}body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:linear-gradient(180deg,var(--bg),color-mix(in oklab,var(--bg) 88%,#0d5bb5));color:var(--text);padding:calc(env(safe-area-inset-top) + 16px) 16px calc(env(safe-area-inset-bottom) + 18px)}
    .shell{width:min(560px,100%);min-height:calc(100vh - 34px);margin:0 auto;display:flex;align-items:center;justify-content:center}.card{width:100%;background:var(--card);border:1px solid var(--border);border-radius:22px;box-shadow:var(--shadow);padding:22px;display:flex;flex-direction:column;gap:16px}.brand{display:flex;align-items:center;gap:12px}.logo{width:54px;height:54px;border-radius:16px;object-fit:cover;border:1px solid var(--border);background:#fff}h1{margin:0;font-size:25px;line-height:1.08;font-weight:950}h2{margin:0;font-size:19px;line-height:1.16;font-weight:950}p{margin:0;color:var(--muted);font-size:14px;line-height:1.45;font-weight:650}.status{display:flex;align-items:center;gap:10px;background:color-mix(in oklab,var(--accent) 10%,var(--card));border:1px solid color-mix(in oklab,var(--accent) 24%,var(--border));border-radius:14px;padding:12px;color:var(--text);font-weight:850}.spinner{width:18px;height:18px;border:3px solid color-mix(in oklab,var(--accent) 25%,transparent);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite;flex:none}@keyframes spin{to{transform:rotate(360deg)}}.choice-grid{display:grid;gap:10px}.choice{appearance:none;border:1px solid var(--border);background:color-mix(in oklab,var(--card) 90%,var(--accent));color:var(--text);border-radius:16px;padding:14px;text-align:left;display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer}.choice strong{display:block;font-size:16px;font-weight:950;margin-bottom:2px}.choice span span{display:block;font-size:12px;color:var(--muted);font-weight:750;line-height:1.35}.choice.primary{background:linear-gradient(180deg,#0d5bb5,#0d3ab5);border-color:transparent;color:#fff}.choice.primary span span{color:rgba(255,255,255,.78)}form{display:flex;flex-direction:column;gap:10px}.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media (max-width:420px){.row{grid-template-columns:1fr}}label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:900;color:var(--muted)}input,select{width:100%;min-height:46px;border:1px solid var(--border);border-radius:13px;background:color-mix(in oklab,var(--card) 92%,var(--bg));color:var(--text);padding:10px 12px;font:800 16px/1.2 system-ui;outline:none}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:4px}.btn{appearance:none;border:1px solid var(--border);background:color-mix(in oklab,var(--card) 92%,var(--bg));color:var(--text);border-radius:13px;padding:11px 13px;font:950 14px/1 system-ui;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px}.btn.primary{background:linear-gradient(180deg,var(--accent),#0d3ab5);border-color:transparent;color:#fff;box-shadow:0 12px 24px rgba(13,91,181,.26)}.btn.danger{color:var(--danger)}.btn:disabled{opacity:.58;cursor:wait}.error{display:none;border:1px solid color-mix(in oklab,var(--danger) 35%,var(--border));background:color-mix(in oklab,var(--danger) 10%,var(--card));color:var(--danger);border-radius:13px;padding:11px;font-size:13px;font-weight:850;line-height:1.35}.error.show{display:block}.support{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.support a{border-radius:13px;padding:10px;text-align:center;text-decoration:none;color:#fff;font-size:12px;font-weight:950}.discord{background:#5865f2}.telegram{background:#24a1de}.whatsapp{background:#128c7e}.hidden{display:none!important}
  </style>
</head>
<body>
<main class="shell"><section class="card">
  <div class="brand"><img class="logo" src="/ambulance/images/logo.png" alt="Ambulance"><div><h1>Ambulance Access</h1><p id="subtitle">Checking your access...</p></div></div>
  <div id="loadingView" class="status"><span class="spinner" aria-hidden="true"></span><span id="loadingText">Checking access...</span></div>
  <section id="choiceView" class="hidden"><h2>Choose access type</h2><p>Register this iPhone to continue to the Ambulance App.</p><div class="choice-grid" style="margin-top:12px"><button class="choice primary" id="staffChoice" type="button"><span><strong>Ambulance Staff</strong><span>Use your Hamad email and corporation number.</span></span><b>&gt;</b></button><button class="choice" id="otherChoice" type="button"><span><strong>Other User</strong><span>Limited access without protected ambulance documents.</span></span><b>&gt;</b></button></div></section>
  <section id="staffView" class="hidden"><h2>Ambulance Staff</h2><p>Use your Hamad email. Only the username is stored by the Access Gate.</p><form id="staffForm"><div class="row"><label>First name<input name="first_name" required></label><label>Last name<input name="last_name" required></label></div><label>Hamad email<input name="email" type="email" placeholder="name@hamad.qa" required></label><div class="row"><label>Corporation number<input name="corp_number" inputmode="numeric" required></label><label>Role<select name="role" required><option value="">Select role</option><option>AP</option><option>CCA</option><option>CCP</option><option>Supervisor</option><option>Other</option></select></label></div><label>Phone optional<input name="phone" inputmode="tel"></label><div class="error" id="staffError"></div><div class="actions"><button class="btn primary" type="submit">Continue</button><button class="btn" type="button" data-back>Back</button></div></form></section>
  <section id="otherView" class="hidden"><h2>Other User</h2><p>Other User access can use general tools but cannot open protected ambulance documents or internal resources.</p><form id="otherForm"><div class="row"><label>First name<input name="first_name" required></label><label>Last name<input name="last_name" required></label></div><label>Email<input name="email" type="email" required></label><label>Profession / background<input name="profession" required></label><label>Phone optional<input name="phone" inputmode="tel"></label><div class="error" id="otherError"></div><div class="actions"><button class="btn primary" type="submit">Continue</button><button class="btn" type="button" data-back>Back</button></div></form></section>
  <section id="lockedView" class="hidden"><h2 id="lockedTitle">Access Locked</h2><p id="lockedMessage">Access for this device is currently locked.</p><div class="support" style="margin-top:12px"><a class="discord" href="https://discord.gg/qc8fK3yd92" target="_blank" rel="noopener">Discord</a><a class="telegram" href="https://t.me/+EAcWKnoaRq05YzY0" target="_blank" rel="noopener">Telegram</a><a class="whatsapp" href="https://whatsapp.com/channel/0029VadgCTH0QeamMlpEvX0x" target="_blank" rel="noopener">WhatsApp</a></div><div class="actions"><button class="btn primary" id="tryAgainBtn" type="button">Try Again</button></div></section>
  <div class="actions"><button class="btn danger" id="resetBtn" type="button">Reset Test Registration</button></div>
</section></main>
<script>
(() => {
  const APP_VERSION = "v0.3";
  const INSTALL_ID_KEY = "ambulance_ios_install_id";
  const views = ["loadingView", "choiceView", "staffView", "otherView", "lockedView"];
  const subtitle = document.getElementById("subtitle");
  const loadingText = document.getElementById("loadingText");
  const staffError = document.getElementById("staffError");
  const otherError = document.getElementById("otherError");
  const tryAgainBtn = document.getElementById("tryAgainBtn");
  const show = (id) => views.forEach((v) => document.getElementById(v).classList.toggle("hidden", v !== id));
  const installId = () => {
    let id = localStorage.getItem(INSTALL_ID_KEY);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : "ios-" + Date.now() + "-" + Math.random().toString(16).slice(2);
      localStorage.setItem(INSTALL_ID_KEY, id);
    }
    return id;
  };
  const deviceLabel = () => /iPad/i.test(navigator.userAgent) ? "iPad Ambulance App" : /iPhone/i.test(navigator.userAgent) ? "iPhone Ambulance App" : "iOS Ambulance App";
  const payload = (extra = {}) => ({ ...extra, platform: "ios", install_id: installId(), app_version: APP_VERSION, device_label: deviceLabel() });
  async function postJson(url, body) {
    const res = await fetch(url, { method: "POST", credentials: "include", cache: "no-store", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return res.json().catch(() => ({}));
  }
  function launchApp() { subtitle.textContent = "Opening the Ambulance App..."; show("loadingView"); loadingText.textContent = "Opening app..."; setTimeout(() => location.replace("/ambulance/"), 220); }
  function showChoice() { subtitle.textContent = "Registration required"; show("choiceView"); }
  function reasonMessage(reasonCode) {
    if (reasonCode === "multiple_email_attempts") return "Access is temporarily locked because multiple work emails were used on this device.\\n\\nPlease contact app support for assistance.";
    if (reasonCode === "access_revoked" || reasonCode === "revoked") return "Access for this device has been revoked by app support.\\n\\nPlease contact app support if you believe this needs review.";
    if (reasonCode === "locked_by_support") return "Access is currently locked by app support.\\n\\nPlease contact app support for assistance.";
    return "Access for this device is currently locked.\\n\\nPlease contact app support for assistance.";
  }
  function showLocked(data) {
    const reason = data?.reason_code || "";
    const revoked = reason === "access_revoked" || reason === "revoked" || data?.status === "revoked";
    document.getElementById("lockedTitle").textContent = revoked ? "Access Revoked" : "Access Locked";
    document.getElementById("lockedMessage").textContent = reasonMessage(reason);
    tryAgainBtn.classList.toggle("hidden", revoked);
    subtitle.textContent = revoked ? "Access revoked" : "Access locked";
    show("lockedView");
  }
  function handle(data) { if (data?.status === "active") launchApp(); else if (data?.status === "locked" || data?.status === "revoked") showLocked(data); else showChoice(); }
  async function checkAccess() {
    subtitle.textContent = "Checking your access..."; loadingText.textContent = "Checking access..."; show("loadingView");
    try { const session = await fetch("/gate/session-info", { credentials: "include", cache: "no-store" }).then((r) => r.json()); if (session.status === "active" && session.authenticated) return launchApp(); } catch (_) {}
    try { handle(await postJson("/gate/check", payload())); } catch (_) { subtitle.textContent = "Could not check access"; loadingText.textContent = "Check your connection and try again."; }
  }
  function formObject(form) { return Object.fromEntries(new FormData(form).entries()); }
  function error(el, message) { el.textContent = message; el.classList.add("show"); }
  function clearError(el) { el.textContent = ""; el.classList.remove("show"); }
  function friendly(data) {
    const r = data?.reason_code || data?.error_code || data?.error;
    if (r === "invalid_email_domain") return "Use your Hamad email address ending in @hamad.qa.";
    if (r === "invalid_email_username") return "Use your personal Hamad email username, not a numeric-only email.";
    if (r === "invalid_role") return "Select a valid role.";
    if (r === "missing_required_fields") return "Fill in all required fields.";
    if (r === "invalid_email") return "Enter a valid email address.";
    return "Registration could not be completed. Please check the details and try again.";
  }
  document.getElementById("staffChoice").addEventListener("click", () => { clearError(staffError); subtitle.textContent = "Ambulance Staff registration"; show("staffView"); });
  document.getElementById("otherChoice").addEventListener("click", () => { clearError(otherError); subtitle.textContent = "Other User registration"; show("otherView"); });
  document.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", showChoice));
  document.getElementById("staffForm").addEventListener("submit", async (e) => { e.preventDefault(); clearError(staffError); const btn = e.submitter; btn.disabled = true; try { const data = await postJson("/gate/register-staff", payload(formObject(e.currentTarget))); if (["active","locked","revoked"].includes(data.status)) handle(data); else error(staffError, friendly(data)); } catch (_) { error(staffError, "Could not register. Check your connection and try again."); } finally { btn.disabled = false; } });
  document.getElementById("otherForm").addEventListener("submit", async (e) => { e.preventDefault(); clearError(otherError); const btn = e.submitter; btn.disabled = true; try { const data = await postJson("/gate/register-other", payload(formObject(e.currentTarget))); if (["active","locked","revoked"].includes(data.status)) handle(data); else error(otherError, friendly(data)); } catch (_) { error(otherError, "Could not register. Check your connection and try again."); } finally { btn.disabled = false; } });
  tryAgainBtn.addEventListener("click", checkAccess);
  document.getElementById("resetBtn").addEventListener("click", async () => { localStorage.removeItem(INSTALL_ID_KEY); await fetch("/gate/logout", { method: "POST", credentials: "include", cache: "no-store" }).catch(() => {}); showChoice(); });
  checkAccess();
})();
</script>
</body>
</html>`;
}

async function hmacB64Url(keyStr, dataStr) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(keyStr),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(dataStr));
  return bufToB64Url(new Uint8Array(sig));
}

function timingSafeEq(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function bufToB64Url(buf) {
  let s = "";
  for (const b of buf) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function strToB64Url(str) {
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64UrlToStr(b64) {
  const x = b64.replace(/-/g, "+").replace(/_/g, "/");
  const pad = x.length % 4 ? "=".repeat(4 - (x.length % 4)) : "";
  return decodeURIComponent(escape(atob(x + pad)));
}
