# Infrastructure Overview – niwashibase.com

**Last updated:** 2025-12-26  
**Maintainer:** Yazan

This document describes the DNS, hosting, security, and Cloudflare Worker architecture for `niwashibase.com`.  
It exists to prevent accidental misconfiguration and to document architectural decisions clearly.

---

## 🌐 Domain Overview

**Primary Domain:** `niwashibase.com`  
**DNS Provider:** Cloudflare  
**SSL Provider:** Cloudflare  
**Hosting Providers Used:**
- GitHub Pages
- Cloudflare Workers
- Google Sites

---

## 🧭 Subdomain Map

| Subdomain | Purpose | Hosting | Proxy |
|----------|---------|---------|--------|
| `ios.niwashibase.com` | Main app + gated content | GitHub Pages + Cloudflare Worker | 🟠 Proxied |
| `shortcuts.niwashibase.com` | Static shortcuts site | GitHub Pages | 🟠 Proxied |
| `demo.niwashibase.com` | Demo content | GitHub Pages | ⚪ DNS only |
| `docs.niwashibase.com` | Documentation | GitHub Pages | ⚪ DNS only |
| `auth.niwashibase.com` | Auth service | Firebase (`web.app`) | ⚪ DNS only |
| `www.niwashibase.com` | Marketing / landing page | Google Sites | ⚪ DNS only |
| `ambulance-gate.niwashibase.com` | Worker gateway | Cloudflare Worker | 🟠 Proxied |
| `update.niwashibase.com` | Update service | Cloudflare Worker | 🟠 Proxied |

---

## 🧠 Traffic Flow Overview

### ios.niwashibase.com
Browser → Cloudflare (Proxy ON)
→ Worker (auth / gating / logging)
→ GitHub Pages (origin)


### Other static subdomains
Browser → Cloudflare (DNS only) → GitHub Pages / Google Sites


---

## 🔐 SSL / HTTPS Configuration

### SSL Mode
- **Mode:** `Full`
- **Do NOT use:** `Full (strict)`

**Reason:**  
GitHub Pages does not reliably support strict TLS validation when proxied through Cloudflare.  
Using `Full` maintains encryption without breaking availability.

---

### HTTPS Enforcement
- **Always Use HTTPS:** ✅ Enabled
- **HSTS:** ❌ Disabled intentionally

#### Why HSTS is disabled
- Multiple subdomains on different providers
- Prevents accidental permanent lockouts
- Safer for mixed hosting environments

---

## 🍪 Authentication & Security Model

### Cookie-Based Gate
- Signed HMAC cookie (`wc`)
- Set by Cloudflare Worker
- Used to protect gated routes such as:
  - `/ambulance/`
  - `/cpr/`

### Cookie Properties
- `Secure`
- `HttpOnly`
- `SameSite=Lax`
- Time-limited expiry
- Domain-scoped

This provides strong access control without Cloudflare Zero Trust.

---

## 🧠 Worker Responsibilities

Workers handle:
- Authentication & session gating
- Download tracking
- Redirect control
- Request logging
- Notion event logging
- Controlled access to protected content

---

## ⚠️ Critical Rules (DO NOT BREAK)

❌ Do NOT enable **Full (strict)**  
❌ Do NOT enable **HSTS with subdomains**  
❌ Do NOT proxy GitHub Pages unless intentional  
❌ Do NOT remove Worker routes without updating routing logic  

Violating these may cause:
- Error 526
- Broken SSL
- Infinite redirects
- Inaccessible site

---

## ✅ Safe Changes

You MAY safely:
- Update Worker logic
- Add new subdomains (with care)
- Add new Worker routes
- Modify GitHub Pages content
- Enable "Always Use HTTPS"

---

## 🛠️ Recovery Checklist (If Something Breaks)

1. Cloudflare → SSL/TLS → set to **Full**
2. Confirm `ios.niwashibase.com` is proxied 🟠
3. Verify GitHub Pages custom domain is active
4. Clear Cloudflare cache (optional)
5. Verify Worker routes are still attached

---

## 📡 DNS Records (Current)

| Type | Name | Target | Proxy | TTL |
|------|------|--------|-------|-----|
| CNAME | auth | ambulance-58b2c.web.app | DNS only | Auto |
| CNAME | demo | yniwash.github.io | DNS only | Auto |
| CNAME | docs | yniwash.github.io | DNS only | Auto |
| CNAME | ios | yniwash.github.io | 🟠 Proxied | Auto |
| CNAME | niwashibase.com | domain-placeholder.cloudflare.com | 🟠 Proxied | Auto |
| CNAME | shortcuts | yniwash.github.io | 🟠 Proxied | Auto |
| CNAME | www | ghs.googlehosted.com | DNS only | Auto |
| MX | niwashibase.com | mx3.zoho.com | DNS only | Auto |
| MX | niwashibase.com | mx2.zoho.com | DNS only | Auto |
| MX | niwashibase.com | mx.zoho.com | DNS only | Auto |
| TXT | _cf-custom-hostname | Cloudflare validation | DNS only | Auto |
| TXT | _dmarc | DMARC policy | DNS only | Auto |
| TXT | niwashibase.com | SPF record | DNS only | Auto |
| TXT | zoho_domainkey | DKIM | DNS only | Auto |
| TXT | google-site-verification | Google | DNS only | 1h |
| Worker | ambulance-gate | Cloudflare Worker | 🟠 Proxied | Auto |
| Worker | update | Cloudflare Worker | 🟠 Proxied | Auto |

---

## 🧭 Summary

This setup prioritizes:
- Reliability
- Predictable behavior
- Compatibility with GitHub Pages
- Secure but flexible access control

**If something breaks, check SSL mode first.**

---

_End of document_


