// ios-ambulance-gate-test-worker.js
// CHANGELOG (2026-06-04):
// - Persist locked retry countdown across webclip closes and override locked retry TTL to two minutes for testing.
// - Restore approved registration helper wording and match phone country-code text sizing to phone inputs.
// - Simplify gate titles, split device type/model selection, and remove the gate reset test button.
// - Add required registration device model selector and use the selected model as device_label.
// - Improve gate screen spacing/support icons and remove scroll blur that dismissed the iOS keyboard while typing.
// - Improve gate API error handling so validation responses show clear messages instead of connection errors.
// - Add first-name session storage, weak iOS fingerprint hash, support view, access-granted view, and locked retry countdown.
// - Upgrade testing gate UI, add Android-aligned client validation, confirmation step, and clearer wording.
// - Strip raw GitHub CSP headers from proxied static files so app scripts can run on the test domain.
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
const TEST_LOCK_TTL_SECONDS = 120;

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
      first_name: payload.first_name || "",
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
  const body = normalizeGateApiForTest(api);
  const headers = {};
  if (body.status === "active") {
    headers["Set-Cookie"] = await makeSignedCookie(req, env.SIGNING_KEY, installId, body);
  } else if (body.status === "locked" || body.status === "revoked" || body.status === "not_found" || body.status === "error") {
    headers["Set-Cookie"] = clearCookie(req);
  }

  return json({
    ...body,
    session_active: body.status === "active"
  }, body.http_status && body.http_status >= 400 ? body.http_status : 200, headers);
}

function normalizeGateApiForTest(api) {
  if (!api || api.status !== "locked") return api || {};
  return {
    ...api,
    cache_ttl_sec: TEST_LOCK_TTL_SECONDS,
    retry_after_seconds: TEST_LOCK_TTL_SECONDS,
    test_lock_ttl_override_sec: TEST_LOCK_TTL_SECONDS
  };
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
    first_name: cleanText(api.first_name || "", 80),
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
  headers.delete("content-security-policy");
  headers.delete("x-frame-options");
  headers.delete("x-content-type-options");
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
    *{box-sizing:border-box}html,body{min-height:100%;margin:0}body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:linear-gradient(180deg,var(--bg),color-mix(in oklab,var(--bg) 88%,#0d5bb5));color:var(--text);padding:calc(env(safe-area-inset-top) + 12px) 14px calc(env(safe-area-inset-bottom) + 18px)}
    .shell{width:min(560px,100%);min-height:calc(100vh - 30px);margin:0 auto;display:flex;align-items:flex-start;justify-content:center}.card{width:100%;background:var(--card);border:1px solid var(--border);border-radius:22px;box-shadow:var(--shadow);padding:24px 20px 20px;display:flex;flex-direction:column;gap:18px;position:relative;overflow:hidden}.card:before{content:"";position:absolute;inset:0 0 auto;height:8px;background:linear-gradient(90deg,#0d63b2,#1283d6,#0d63b2)}section:not(.hidden){display:flex;flex-direction:column;gap:14px}.brand{display:flex;align-items:center;gap:13px;padding-top:2px}.logo{width:58px;height:58px;border-radius:16px;object-fit:cover;border:1px solid color-mix(in oklab,var(--accent) 22%,var(--border));background:#fff;box-shadow:0 8px 18px rgba(13,99,178,.18)}h1{margin:0;font-size:25px;line-height:1.08;font-weight:950}h2{margin:0;font-size:21px;line-height:1.16;font-weight:950}p{margin:0;color:var(--muted);font-size:14px;line-height:1.5;font-weight:650}.message{background:color-mix(in oklab,var(--accent) 8%,var(--card));border:1px solid color-mix(in oklab,var(--accent) 20%,var(--border));border-radius:15px;padding:13px 14px;color:color-mix(in oklab,var(--text) 82%,var(--muted));font-weight:750}.status{display:flex;align-items:center;gap:10px;background:color-mix(in oklab,var(--accent) 10%,var(--card));border:1px solid color-mix(in oklab,var(--accent) 24%,var(--border));border-radius:14px;padding:13px;color:var(--text);font-weight:850}.spinner{width:18px;height:18px;border:3px solid color-mix(in oklab,var(--accent) 25%,transparent);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite;flex:none}@keyframes spin{to{transform:rotate(360deg)}}.choice-grid{display:grid;gap:12px}.choice,.support-card{appearance:none;border:1px solid var(--border);background:linear-gradient(180deg,color-mix(in oklab,var(--card) 96%,var(--accent)),color-mix(in oklab,var(--card) 88%,var(--accent)));color:var(--text);border-radius:16px;padding:16px;text-align:left;display:flex;align-items:center;justify-content:space-between;gap:13px;cursor:pointer;box-shadow:0 8px 18px rgba(15,23,42,.08);text-decoration:none}.choice strong,.support-card strong{display:block;font-size:16px;font-weight:950;margin-bottom:0}.choice.primary{background:linear-gradient(180deg,#1283d6,#0d63b2);border-color:transparent;color:#fff}form{display:flex;flex-direction:column;gap:14px}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media (max-width:420px){.row{grid-template-columns:1fr}}label{display:flex;flex-direction:column;gap:7px;font-size:12px;font-weight:900;color:var(--muted)}label small{font-size:11px;font-weight:800;color:color-mix(in oklab,var(--muted) 82%,var(--text))}input,select{width:100%;min-height:50px;border:1px solid var(--border);border-radius:13px;background:color-mix(in oklab,var(--card) 92%,var(--bg));color:var(--text);padding:11px 12px;font:800 16px/1.2 system-ui;outline:none}input:focus,select:focus{border-color:color-mix(in oklab,var(--accent) 72%,var(--border));box-shadow:0 0 0 3px color-mix(in oklab,var(--accent) 16%,transparent)}.phone-field{display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:13px;background:color-mix(in oklab,var(--card) 92%,var(--bg));padding:0 12px}.phone-field:focus-within{border-color:color-mix(in oklab,var(--accent) 72%,var(--border));box-shadow:0 0 0 3px color-mix(in oklab,var(--accent) 16%,transparent)}.phone-field span{color:var(--accent);font:800 16px/1.2 system-ui}.phone-field input{border:0;box-shadow:none;background:transparent;padding-left:0}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:2px}.btn{appearance:none;border:1px solid var(--border);background:color-mix(in oklab,var(--card) 92%,var(--bg));color:var(--text);border-radius:13px;padding:12px 14px;font:950 14px/1 system-ui;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;flex:1}.btn.primary{background:linear-gradient(180deg,#1283d6,#0d63b2);border-color:transparent;color:#fff;box-shadow:0 12px 24px rgba(13,91,181,.26)}.btn.danger{color:var(--danger);flex:0 1 auto}.btn:disabled{opacity:.58;cursor:wait}.error{display:none;border:1px solid color-mix(in oklab,var(--danger) 35%,var(--border));background:color-mix(in oklab,var(--danger) 10%,var(--card));color:var(--danger);border-radius:13px;padding:11px 12px;font-size:13px;font-weight:850;line-height:1.35}.error.show{display:block}.support-list{display:grid;gap:10px}.support-icon{width:38px;height:38px;border-radius:11px;object-fit:contain;flex:none;background:#fff;padding:5px;border:1px solid color-mix(in oklab,var(--accent) 16%,var(--border))}.support-copy{flex:1;min-width:0}.support-copy span{display:block;font-size:12px;color:var(--muted);font-weight:750;line-height:1.38}.confirm-list{border:1px solid var(--border);border-radius:15px;overflow:hidden}.confirm-row{display:flex;justify-content:space-between;gap:12px;padding:11px 12px;border-top:1px solid var(--border);font-size:13px}.confirm-row:first-child{border-top:0}.confirm-row b{color:var(--muted);font-weight:850}.confirm-row span{text-align:right;font-weight:900}.locked-icon,.granted-icon{width:62px;height:62px;border-radius:20px;display:grid;place-items:center;border:1px solid color-mix(in oklab,var(--danger) 28%,var(--border));font:950 30px/1 system-ui;margin:0 auto}.locked-icon{background:color-mix(in oklab,var(--danger) 12%,var(--card));color:var(--danger)}.granted-icon{background:color-mix(in oklab,#1283d6 12%,var(--card));border-color:color-mix(in oklab,#1283d6 30%,var(--border));color:var(--accent)}.retry-panel{border:1px solid color-mix(in oklab,var(--accent) 22%,var(--border));background:color-mix(in oklab,var(--accent) 8%,var(--card));border-radius:15px;padding:12px;text-align:center}.retry-panel b{display:block;color:var(--accent);font-size:26px;margin-top:4px}.hidden{display:none!important}
  </style>
</head>
<body>
<main class="shell"><section class="card">
  <div class="brand"><img class="logo" src="/ambulance/images/logo.png" alt="Ambulance"><div><h1 id="pageTitle">Ambulance Access</h1></div></div>
  <div id="loadingView" class="status"><span class="spinner" aria-hidden="true"></span><span id="loadingText">Checking access...</span></div>
  <section id="choiceView" class="hidden"><p class="message">Choose the access type that applies to you. Protected ambulance documents and internal resources are available to ambulance staff only.</p><div class="choice-grid"><button class="choice primary" id="staffChoice" type="button"><span><strong>Ambulance Staff</strong></span><b>&gt;</b></button><button class="choice" id="otherChoice" type="button"><span><strong>Other User</strong></span><b>&gt;</b></button></div><div class="actions"><button class="btn" type="button" data-support>Contact Support</button></div></section>
  <section id="staffView" class="hidden"><p class="message">Please complete staff access registration to continue. Your details are used to manage app access for this device.</p><form id="staffForm" novalidate><label>HMCAS Email<input name="email" type="email" autocomplete="email" autocapitalize="none" required></label><div class="row"><label>First Name<input name="first_name" autocomplete="given-name" autocapitalize="words" maxlength="60" required></label><label>Last Name<input name="last_name" autocomplete="family-name" autocapitalize="words" maxlength="60" required></label></div><div class="row"><label>Device Type<select name="device_type" required><option>iPhone</option><option>iPad</option></select></label><label>Device Model<select name="device_model" required><option value="">Select model</option></select></label></div><div class="row"><label>Corporation Number<input name="corp_number" inputmode="numeric" pattern="[0-9]*" required></label><label>Role<select name="role" required><option>AP</option><option>CCA</option><option>CCP</option><option>Supervisor</option><option>Other</option></select></label></div><label>Phone Number<div class="phone-field"><span>+974</span><input name="phone" inputmode="tel" autocomplete="tel" placeholder="Optional"></div></label><div class="error" id="staffError"></div><div class="actions"><button class="btn primary" type="submit">Continue</button><button class="btn" type="button" data-back>Back</button><button class="btn" type="button" data-support>Support</button></div></form></section>
  <section id="otherView" class="hidden"><p class="message">Register for limited access to app tools. Protected ambulance documents and internal resources are not available with this access type.</p><form id="otherForm" novalidate><label>Email<input name="email" type="email" autocomplete="email" autocapitalize="none" required></label><div class="row"><label>First Name<input name="first_name" autocomplete="given-name" autocapitalize="words" maxlength="60" required></label><label>Last Name<input name="last_name" autocomplete="family-name" autocapitalize="words" maxlength="60" required></label></div><div class="row"><label>Device Type<select name="device_type" required><option>iPhone</option><option>iPad</option></select></label><label>Device Model<select name="device_model" required><option value="">Select model</option></select></label></div><label>Profession<select name="profession_select" id="professionSelect" required><option>Doctor</option><option>EMT</option><option>Medical Student</option><option>Nurse</option><option>Paramedic</option><option>Physician Assistant</option><option>Respiratory Therapist</option><option>Student</option><option>Other</option></select></label><label id="otherProfessionLabel" class="hidden">Profession Details<input name="profession_other" maxlength="40" placeholder="Enter profession"></label><label>Phone Number<div class="phone-field"><span>+974</span><input name="phone" inputmode="tel" autocomplete="tel" placeholder="Optional"></div></label><div class="error" id="otherError"></div><div class="actions"><button class="btn primary" type="submit">Continue</button><button class="btn" type="button" data-back>Back</button><button class="btn" type="button" data-support>Support</button></div></form></section>
  <section id="confirmView" class="hidden"><p class="message" id="confirmMessage">Review your details before continuing.</p><div class="confirm-list" id="confirmList"></div><div class="error" id="confirmError"></div><div class="actions"><button class="btn primary" id="confirmSubmitBtn" type="button">Confirm and Continue</button><button class="btn" id="confirmEditBtn" type="button">Edit</button></div></section>
  <section id="grantedView" class="hidden"><div class="granted-icon">✓</div><p class="message" id="grantedMessage">Your Ambulance access is ready. You can now continue to the App.</p><div class="actions"><button class="btn primary" id="openAppBtn" type="button">Continue</button></div></section>
  <section id="lockedView" class="hidden"><div class="locked-icon">!</div><p id="lockedMessage">Access for this device is currently locked.</p><div class="retry-panel" id="retryPanel"><span id="retryLabel">Try again available in</span><b id="retryValue">--:--</b></div><div class="actions"><button class="btn primary" id="tryAgainBtn" type="button">Try Again</button><button class="btn" type="button" data-support>Contact Support</button></div></section>
  <section id="supportView" class="hidden"><p class="message">Contact app support if staff access is locked or registration is not working. Email goes directly to Ambulance App Support; Telegram and Discord use the current support community channels.</p><div class="support-list"><a class="support-card" href="mailto:support@niwashibase.com?subject=Ambulance%20App%20Access%20Support"><img class="support-icon" src="/ambulance/images/email.png" alt=""><span class="support-copy"><strong>Email Support</strong><span>Send your access request by email.</span></span><b>&gt;</b></a><a class="support-card" href="https://t.me/+EAcWKnoaRq05YzY0" target="_blank" rel="noopener"><img class="support-icon" src="/ambulance/images/telegram.png" alt=""><span class="support-copy"><strong>Telegram Channel</strong><span>Send your access request through Telegram.</span></span><b>&gt;</b></a><a class="support-card" href="https://discord.gg/qc8fK3yd92" target="_blank" rel="noopener"><img class="support-icon" src="/ambulance/images/discord.png" alt=""><span class="support-copy"><strong>Discord Server</strong><span>Send your access request through Discord.</span></span><b>&gt;</b></a></div><div class="actions"><button class="btn" id="supportBackBtn" type="button">Back</button></div></section>
</section></main>
<script>
(() => {
  const APP_VERSION = "v0.3";
  const INSTALL_ID_KEY = "ambulance_ios_install_id";
  const FIRST_NAME_KEY = "ambulance_ios_first_name";
  const FINGERPRINT_KEY = "ambulance_ios_fp_v1";
  const LOCK_RETRY_UNTIL_KEY = "ambulance_ios_lock_retry_until";
  const LOCK_RETRY_SIG_KEY = "ambulance_ios_lock_retry_sig";
  const views = ["loadingView", "choiceView", "staffView", "otherView", "confirmView", "grantedView", "lockedView", "supportView"];
  const launchMessages = ["Preparing Ambulance...", "Checking access...", "Loading your dashboard...", "Getting things ready..."];
  const roles = ["AP", "CCA", "CCP", "Supervisor", "Other"];
  const professions = ["Doctor", "EMT", "Medical Student", "Nurse", "Paramedic", "Physician Assistant", "Respiratory Therapist", "Student", "Other"];
  const deviceModelGroups = {
    iPhone: ["iPhone 17 Pro Max", "iPhone 17 Pro", "iPhone 17", "iPhone 17e", "iPhone Air", "iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16 Plus", "iPhone 16", "iPhone 16e", "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15", "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14", "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13 mini", "iPhone 13", "iPhone SE (3rd generation)", "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12 mini", "iPhone 12", "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11", "iPhone SE (2nd generation)", "iPhone XS Max", "iPhone XS", "iPhone XR", "iPhone X", "iPhone 8 Plus", "iPhone 8", "iPhone 7 Plus", "iPhone 7", "Other iPhone"],
    iPad: ["iPad Pro 13-in. (M5)", "iPad Pro 11-in. (M5)", "iPad Air 13-in. (M4)", "iPad Air 11-in. (M4)", "iPad (A16)", "iPad mini (A17 Pro)", "iPad Pro 13-in. (M4)", "iPad Pro 11-in. (M4)", "iPad Air 13-in. (M3)", "iPad Air 11-in. (M3)", "iPad Air 13-in. (M2)", "iPad Air 11-in. (M2)", "iPad Pro 12.9-in. (6th generation)", "iPad Pro 11-in. (4th generation)", "iPad Pro 12.9-in. (5th generation)", "iPad Pro 11-in. (3rd generation)", "iPad Air (5th generation)", "iPad mini (6th generation)", "iPad (10th generation)", "iPad (9th generation)", "iPad Pro 12.9-in. (4th generation)", "iPad Pro 11-in. (2nd generation)", "iPad Air (4th generation)", "iPad (8th generation)", "iPad (7th generation)", "iPad mini (5th generation)", "iPad Air (3rd generation)", "iPad Pro 12.9-in. (3rd generation)", "iPad Pro 11-in. (1st generation)", "iPad (6th generation)", "iPad Pro 10.5-in.", "iPad Pro 12.9-in. (2nd generation)", "iPad (5th generation)", "iPad Pro 9.7-in.", "iPad Pro 12.9-in. (1st generation)", "iPad mini 4", "iPad mini 3", "iPad mini 2", "iPad Air 2", "iPad Air (1st generation)", "Other iPad"]
  };
  const deviceTypes = Object.keys(deviceModelGroups);
  const pageTitle = document.getElementById("pageTitle");
  const loadingText = document.getElementById("loadingText");
  const staffError = document.getElementById("staffError");
  const otherError = document.getElementById("otherError");
  const confirmError = document.getElementById("confirmError");
  const tryAgainBtn = document.getElementById("tryAgainBtn");
  const professionSelect = document.getElementById("professionSelect");
  const otherProfessionLabel = document.getElementById("otherProfessionLabel");
  let pendingRegistration = null;
  let supportReturnView = "choiceView";
  let currentLockedData = null;
  let retryTimer = null;
  function setTitle(text) { pageTitle.textContent = text; }
  function populateDeviceModel(form, preserveValue = "") {
    const typeSelect = form.querySelector('select[name="device_type"]');
    const modelSelect = form.querySelector('select[name="device_model"]');
    const type = deviceTypes.includes(typeSelect.value) ? typeSelect.value : "iPhone";
    const models = deviceModelGroups[type] || [];
    modelSelect.innerHTML = '<option value="">Select model</option>' + models.map((model) => '<option>' + model + '</option>').join("");
    modelSelect.value = models.includes(preserveValue) ? preserveValue : "";
  }
  document.querySelectorAll("form").forEach((form) => {
    const typeSelect = form.querySelector('select[name="device_type"]');
    if (!typeSelect) return;
    populateDeviceModel(form);
    typeSelect.addEventListener("change", () => populateDeviceModel(form));
  });
  let launchTimer = null;
  let launchIndex = 0;
  const show = (id) => {
    views.forEach((v) => document.getElementById(v).classList.toggle("hidden", v !== id));
    if (id !== "lockedView") stopRetryCountdown();
  };
  const installId = () => {
    let id = localStorage.getItem(INSTALL_ID_KEY);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : "ios-" + Date.now() + "-" + Math.random().toString(16).slice(2);
      localStorage.setItem(INSTALL_ID_KEY, id);
    }
    return id;
  };
  const deviceLabel = () => /iPad/i.test(navigator.userAgent) ? "iPad Ambulance App" : /iPhone/i.test(navigator.userAgent) ? "iPhone Ambulance App" : "iOS Ambulance App";
  async function sha256Hex(text) {
    const bytes = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  async function deviceFingerprintHash() {
    const cached = localStorage.getItem(FINGERPRINT_KEY);
    if (cached) return cached;
    const tz = Intl.DateTimeFormat?.().resolvedOptions?.().timeZone || "";
    const source = [
      "ios-web-v1",
      navigator.userAgent || "",
      navigator.platform || "",
      navigator.language || "",
      String(screen.width || ""),
      String(screen.height || ""),
      String(screen.colorDepth || ""),
      String(window.devicePixelRatio || ""),
      String(navigator.hardwareConcurrency || ""),
      tz
    ].join("|");
    const hash = await sha256Hex(source);
    localStorage.setItem(FINGERPRINT_KEY, hash);
    return hash;
  }
  async function payload(extra = {}) {
    return { platform: "ios", install_id: installId(), app_version: APP_VERSION, device_label: deviceLabel(), ...extra, device_fingerprint_hash: await deviceFingerprintHash() };
  }
  const validEmail = (email) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) && email.length <= 254;
  const cleanName = (value) => String(value || "").replace(/[\\x00-\\x1f\\x7f]+/g, " ").replace(/\\s+/g, " ").replace(/[^\\p{L}\\p{M} .'-]/gu, "").replace(/\\s+/g, " ").trim().slice(0, 60).trim();
  const cleanProfession = (value) => String(value || "").replace(/[\\r\\n\\t]+/g, " ").replace(/\\s+/g, " ").replace(/[^a-zA-Z0-9 .\\/&()\\-]/g, "").trim().slice(0, 40);
  const normalizeCorpNumber = (value) => {
    const digits = String(value || "").replace(/\\D+/g, "");
    if (digits.length === 6 && digits.startsWith("0")) return digits;
    if (digits.length === 5) return "0" + digits;
    return "";
  };
  const normalizeQatarPhone = (value) => {
    const digits = String(value || "").replace(/\\D+/g, "");
    let local = "";
    if (digits.length === 8) local = digits;
    else if (digits.length === 11 && digits.startsWith("974")) local = digits.slice(3);
    else if (digits.length === 13 && digits.startsWith("00974")) local = digits.slice(5);
    return local.length === 8 ? "+974" + local : "";
  };
  async function postJson(url, body) {
    const res = await fetch(url, { method: "POST", credentials: "include", cache: "no-store", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const text = await res.text().catch(() => "");
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (_) {
      data = { ok: false, status: "error", reason_code: "invalid_server_response" };
    }
    if (!res.ok && !data.reason_code && !data.error_code && !data.error) {
      data.reason_code = "http_" + res.status;
    }
    data.http_status = res.status;
    return data;
  }
  function startLaunchMessages() {
    stopLaunchMessages();
    launchIndex = 0;
    loadingText.textContent = launchMessages[launchIndex];
    launchTimer = setInterval(() => {
      launchIndex = (launchIndex + 1) % launchMessages.length;
      loadingText.textContent = launchMessages[launchIndex];
    }, 650);
  }
  function stopLaunchMessages() {
    if (launchTimer) clearInterval(launchTimer);
    launchTimer = null;
  }
  function launchApp() { stopLaunchMessages(); setTitle("Opening the Ambulance App"); show("loadingView"); loadingText.textContent = "Opening app..."; setTimeout(() => location.replace("/ambulance/"), 320); }
  function showGranted(data) {
    clearLockedRetry();
    const firstName = String(data?.first_name || "").trim();
    if (firstName) localStorage.setItem(FIRST_NAME_KEY, firstName);
    const limited = data?.access_type === "non_ambulance_staff";
    document.getElementById("grantedMessage").textContent = limited
      ? "Your Ambulance access is ready. You can now continue with limited access. Protected ambulance documents and internal resources will not be available."
      : "Your Ambulance access is ready. You can now continue to the App.";
    setTitle("Access Granted");
    show("grantedView");
  }
  function showChoice() { clearLockedRetry(); setTitle("Choose Access Type"); show("choiceView"); }
  function showRegistrationView(view) {
    if (view === "staffView") setTitle("Ambulance Staff Registration");
    else if (view === "otherView") setTitle("Other User Registration");
    else if (view === "choiceView") setTitle("Choose Access Type");
    show(view);
  }
  function reasonMessage(reasonCode) {
    if (reasonCode === "multiple_email_attempts" || reasonCode === "too_many_email_attempts") return "Access is temporarily locked because multiple work emails were used on this device.\\n\\nPlease contact app support for assistance.";
    if (reasonCode === "access_revoked" || reasonCode === "revoked") return "Access for this device has been revoked by app support.\\n\\nPlease contact app support if you believe this needs review.";
    if (reasonCode === "locked_by_support") return "Access is currently locked by app support.\\n\\nPlease contact app support for assistance.";
    if (reasonCode === "verification_required") return "Internet access is required to verify this device before continuing.\\n\\nPlease connect to the internet and try again.";
    return "Access for this device is currently locked.\\n\\nPlease contact app support for assistance.";
  }
  function showLocked(data) {
    currentLockedData = data || {};
    const reason = data?.reason_code || "";
    const revoked = reason === "access_revoked" || reason === "revoked" || data?.status === "revoked";
    setTitle(revoked ? "Access Revoked" : "Access Locked");
    document.getElementById("lockedMessage").textContent = reasonMessage(reason);
    tryAgainBtn.classList.toggle("hidden", revoked);
    document.getElementById("retryPanel").classList.toggle("hidden", revoked);
    if (revoked) clearLockedRetry();
    else startRetryCountdown(data);
    show("lockedView");
  }
  function lockedRetrySignature(data) {
    return [installId(), data?.status || "", data?.reason_code || ""].join("|");
  }
  function lockedRetryAvailableAt(data) {
    const signature = lockedRetrySignature(data);
    const savedSignature = localStorage.getItem(LOCK_RETRY_SIG_KEY) || "";
    const savedUntil = Number(localStorage.getItem(LOCK_RETRY_UNTIL_KEY) || 0);
    if (savedSignature === signature && savedUntil > Date.now()) return savedUntil;
    const retryAfterSeconds = Number(data?.retry_after_seconds || data?.cache_ttl_sec || 0);
    const cooldown = Math.max(0, Math.floor(retryAfterSeconds / 2));
    const availableAt = Date.now() + cooldown * 1000;
    localStorage.setItem(LOCK_RETRY_SIG_KEY, signature);
    localStorage.setItem(LOCK_RETRY_UNTIL_KEY, String(availableAt));
    return availableAt;
  }
  function clearLockedRetry() {
    localStorage.removeItem(LOCK_RETRY_SIG_KEY);
    localStorage.removeItem(LOCK_RETRY_UNTIL_KEY);
  }
  function startRetryCountdown(data) {
    stopRetryCountdown();
    const availableAt = lockedRetryAvailableAt(data);
    const label = document.getElementById("retryLabel");
    const value = document.getElementById("retryValue");
    function tick() {
      const remaining = Math.max(0, Math.ceil((availableAt - Date.now()) / 1000));
      if (remaining <= 0) {
        label.textContent = "Try again is available";
        value.textContent = "Now";
        tryAgainBtn.disabled = false;
        stopRetryCountdown();
        return;
      }
      label.textContent = "Try again available in";
      value.textContent = formatDuration(remaining);
      tryAgainBtn.disabled = true;
    }
    tick();
    retryTimer = setInterval(tick, 1000);
  }
  function stopRetryCountdown() {
    if (retryTimer) clearInterval(retryTimer);
    retryTimer = null;
  }
  function formatDuration(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return hours > 0 ? hours + ":" + String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0") : String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  }
  function handle(data, options = {}) {
    if (data?.status === "active") {
      const firstName = String(data?.first_name || "").trim();
      if (firstName) localStorage.setItem(FIRST_NAME_KEY, firstName);
      return options.directOpen ? launchApp() : showGranted(data);
    }
    if (data?.status === "locked" || data?.status === "revoked") showLocked(data);
    else showChoice();
  }
  async function checkAccess() {
    const savedName = localStorage.getItem(FIRST_NAME_KEY) || "";
    setTitle(savedName ? "Welcome, " + savedName : "Ambulance Access");
    show("loadingView");
    startLaunchMessages();
    try {
      const session = await fetch("/gate/session-info", { credentials: "include", cache: "no-store" }).then((r) => r.json());
      if (session.first_name) localStorage.setItem(FIRST_NAME_KEY, session.first_name);
      if (session.status === "active" && session.authenticated) return launchApp();
    } catch (_) {}
    try {
      const data = await postJson("/gate/check", await payload());
      if (data?.status === "error" || data?.ok === false) {
        stopLaunchMessages();
        setTitle("Could Not Check Access");
        loadingText.textContent = friendly(data);
        return;
      }
      handle(data, { directOpen: true });
    } catch (_) {
      stopLaunchMessages();
      setTitle("Could Not Check Access");
      loadingText.textContent = "Check your connection and try again.";
    }
  }
  function formObject(form) { return Object.fromEntries(new FormData(form).entries()); }
  function error(el, message) { el.textContent = message; el.classList.add("show"); }
  function clearError(el) { el.textContent = ""; el.classList.remove("show"); }
  function setButtonBusy(button, busy) {
    if (!button) return;
    button.disabled = busy;
    if (!button.dataset.originalText) button.dataset.originalText = button.textContent;
    button.textContent = busy ? "Checking..." : button.dataset.originalText;
  }
  function friendly(data) {
    const r = data?.reason_code || data?.error_code || data?.error;
    if (r === "invalid_email_domain") return "Enter a valid HMCAS work email.";
    if (r === "invalid_email_username") return "Use your personal Hamad email username, not a numeric-only email.";
    if (r === "invalid_role") return "Select a valid role.";
    if (r === "missing_required_fields") return "Complete the required registration details.";
    if (r === "missing_device") return "Device registration could not be prepared. Restart the App and try again.";
    if (r === "invalid_email") return "Enter a valid email address.";
    if (r === "registration_required" || r === "not_found") return "This device is not registered yet. Choose an access type to continue.";
    if (r === "invalid_server_response") return "The access server returned an unreadable response. Try again in a moment.";
    if (r === "endpoint_not_found" || r === "http_404") return "The access service endpoint is not available. Contact app support if this continues.";
    if (r === "rate_limited" || r === "http_429") return "Too many attempts. Wait a moment, then try again.";
    if (r === "unauthorized" || r === "http_401" || r === "http_403") return "The access request was not authorized. Contact app support if this continues.";
    if (r === "http_500" || r === "http_502" || r === "http_503" || r === "http_504") return "The access service is temporarily unavailable. Try again in a moment.";
    return "Access could not be completed. Check your details and try again.";
  }
  function confirmRows(rows) {
    document.getElementById("confirmList").innerHTML = rows.map(([label, value]) => '<div class="confirm-row"><b>' + label + '</b><span>' + String(value || "Not provided").replace(/[<>&]/g, (c) => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;" }[c])) + '</span></div>').join("");
  }
  function showConfirmation(kind, endpoint, body, rows) {
    pendingRegistration = { kind, endpoint, body, backView: kind === "staff" ? "staffView" : "otherView" };
    clearError(confirmError);
    document.getElementById("confirmMessage").textContent = kind === "staff"
      ? "Review your staff details before continuing."
      : "Review your details before continuing with limited access.";
    confirmRows(rows);
    setTitle(kind === "staff" ? "Confirm Staff Details" : "Confirm Access Details");
    show("confirmView");
  }
  function staffInput(form) {
    const raw = formObject(form);
    const email = String(raw.email || "").trim().toLowerCase();
    const username = email.split("@")[0] || "";
    const firstName = cleanName(raw.first_name);
    const lastName = cleanName(raw.last_name);
    const selectedDeviceType = String(raw.device_type || "").trim();
    const selectedDevice = String(raw.device_model || "").trim();
    const corpNumber = normalizeCorpNumber(raw.corp_number);
    const role = String(raw.role || "").trim();
    const phone = normalizeQatarPhone(raw.phone);
    form.first_name.value = firstName;
    form.last_name.value = lastName;
    form.corp_number.value = corpNumber || String(raw.corp_number || "").trim();
    form.phone.value = phone ? phone.replace(/^\\+974/, "") : String(raw.phone || "").trim();
    if (!email.endsWith("@hamad.qa") || username.length < 3 || /^\\d+$/.test(username)) return { error: "Enter a valid HMCAS work email." };
    if (!firstName || !lastName) return { error: "Enter your first and last name." };
    if (!deviceTypes.includes(selectedDeviceType) || !deviceModelGroups[selectedDeviceType].includes(selectedDevice)) return { error: "Select your device model." };
    if (!corpNumber) return { error: "Enter a valid HMC corporation number." };
    if (!roles.includes(role)) return { error: "Select a valid role." };
    return {
      body: { email, first_name: firstName, last_name: lastName, device_label: selectedDevice, corp_number: corpNumber, role, phone },
      rows: [["Name", firstName + " " + lastName], ["Email", email], ["Device", selectedDevice], ["Corporation Number", corpNumber], ["Role", role], ["Phone", phone || "Not provided"]]
    };
  }
  function otherInput(form) {
    const raw = formObject(form);
    const email = String(raw.email || "").trim().toLowerCase();
    const firstName = cleanName(raw.first_name);
    const lastName = cleanName(raw.last_name);
    const selectedDeviceType = String(raw.device_type || "").trim();
    const selectedDevice = String(raw.device_model || "").trim();
    const selected = String(raw.profession_select || "").trim();
    const profession = selected === "Other" ? cleanProfession(raw.profession_other) : selected;
    const phone = normalizeQatarPhone(raw.phone);
    form.first_name.value = firstName;
    form.last_name.value = lastName;
    form.phone.value = phone ? phone.replace(/^\\+974/, "") : String(raw.phone || "").trim();
    if (!validEmail(email)) return { error: "Enter a valid email address." };
    if (!firstName || !lastName) return { error: "Enter your first and last name." };
    if (!deviceTypes.includes(selectedDeviceType) || !deviceModelGroups[selectedDeviceType].includes(selectedDevice)) return { error: "Select your device model." };
    if (!professions.includes(selected) || !profession) return { error: "Select your profession." };
    return {
      body: { email, first_name: firstName, last_name: lastName, device_label: selectedDevice, profession, phone },
      rows: [["Name", firstName + " " + lastName], ["Email", email], ["Device", selectedDevice], ["Access", "Limited"], ["Profession", profession], ["Phone", phone || "Not provided"]]
    };
  }
  async function submitPending() {
    if (!pendingRegistration) return;
    clearError(confirmError);
    const btn = document.getElementById("confirmSubmitBtn");
    setButtonBusy(btn, true);
    try {
      const data = await postJson(pendingRegistration.endpoint, await payload(pendingRegistration.body));
      if (["active","locked","revoked"].includes(data.status)) handle(data);
      else error(confirmError, friendly(data));
    } catch (_) {
      error(confirmError, "Could not register. Check your connection and try again.");
    } finally {
      setButtonBusy(btn, false);
    }
  }
  document.getElementById("staffChoice").addEventListener("click", () => { clearError(staffError); setTitle("Ambulance Staff Registration"); show("staffView"); });
  document.getElementById("otherChoice").addEventListener("click", () => { clearError(otherError); setTitle("Other User Registration"); show("otherView"); });
  document.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", showChoice));
  document.querySelectorAll("[data-support]").forEach((b) => b.addEventListener("click", () => { supportReturnView = views.find((v) => !document.getElementById(v).classList.contains("hidden")) || "choiceView"; setTitle("Access Support"); show("supportView"); }));
  document.getElementById("supportBackBtn").addEventListener("click", () => {
    if (supportReturnView === "lockedView" && currentLockedData) showLocked(currentLockedData);
    else showRegistrationView(supportReturnView || "choiceView");
  });
  professionSelect.addEventListener("change", () => otherProfessionLabel.classList.toggle("hidden", professionSelect.value !== "Other"));
  document.getElementById("staffForm").addEventListener("submit", (e) => {
    e.preventDefault();
    clearError(staffError);
    const result = staffInput(e.currentTarget);
    if (result.error) return error(staffError, result.error);
    showConfirmation("staff", "/gate/register-staff", result.body, result.rows);
  });
  document.getElementById("otherForm").addEventListener("submit", (e) => {
    e.preventDefault();
    clearError(otherError);
    const result = otherInput(e.currentTarget);
    if (result.error) return error(otherError, result.error);
    showConfirmation("other", "/gate/register-other", result.body, result.rows);
  });
  document.getElementById("confirmEditBtn").addEventListener("click", () => showRegistrationView(pendingRegistration?.backView || "choiceView"));
  document.getElementById("confirmSubmitBtn").addEventListener("click", submitPending);
  document.getElementById("openAppBtn").addEventListener("click", launchApp);
  tryAgainBtn.addEventListener("click", checkAccess);
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
