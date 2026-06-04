// /tools/formulary.js
// CHANGELOG (2026-01-15):
// - Fix PDF modal back to avoid blank viewer layer; preserve hash/state.
// - Prevent iOS zoom on search and isolate hash query per tool.
// Formulary picker for the PDF viewer:
// - Loads formulary.json
// - Search + fast jump
// - Opens PDF.js viewer in an in-app modal (WebClip-safe) with Back + centered title
// - Persists state in hash: #tool=formulary&q=...

export async function run(root) {
  root.innerHTML = "";

  // =========================
  // 🎛 TUNABLE DESIGN TOKENS
  // =========================
  const CSS_TOKENS = `
    :root{
      --pad: 12px;

      --title-size: 18px;
      --title-weight: 900;

      --search-h: 44px;
      --search-radius: 12px;

      --row-gap: 10px;

      --card-radius: 14px;
      --card-pad-y: 12px;
      --card-pad-x: 12px;

      --badge-radius: 999px;
      --badge-pad-y: 6px;
      --badge-pad-x: 10px;
      --badge-font: 12px;

      --item-title: 15px;

      --btn-radius: 12px;
      --btn-h: 44px;
    }
  `;

  const style = document.createElement("style");
  style.textContent = `
  ${CSS_TOKENS}

  .fm-wrap{padding:var(--pad);max-width:900px;margin:0 auto;-webkit-text-size-adjust:100%}
  .fm-title{margin:0 0 10px;font-size:var(--title-size);text-align:center;font-weight:var(--title-weight);letter-spacing:.2px}

  .fm-top{
    display:flex; flex-direction:column; gap:10px;
    margin: 10px 0 12px;
  }

  .fm-search{
    display:flex; align-items:center; gap:10px;
    border:1px solid var(--border);
    background:var(--surface-2);
    border-radius:var(--search-radius);
    padding: 0 12px;
    min-height: var(--search-h);
  }
  .fm-search input{
    width:100%; border:none; outline:none; background:transparent;
    color:var(--text); font-weight:800; font-size:16px; line-height:1.2;
    -webkit-appearance:none; appearance:none;
  }
  .fm-search input::placeholder{ font-size:16px; }
  .fm-search .meta{
    flex:none; font-size:12px; color:var(--muted); font-weight:800;
  }

  .fm-actions{ display:flex; gap:10px; flex-wrap:wrap; }
  .fm-btn{
    border:1px solid var(--border);
    background:var(--surface-2);
    color:var(--text);
    border-radius:var(--btn-radius);
    padding: 10px 12px;
    min-height: var(--btn-h);
    font-weight:900;
    cursor:pointer;
    transition: transform .15s ease, box-shadow .15s ease, background .15s ease, border-color .15s ease;
  }
  .fm-btn:active{ transform: translateY(1px) scale(.99) }

  .fm-grid{
    display:grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--row-gap);
  }
  @media (max-width:700px){
    .fm-grid{ grid-template-columns: 1fr; }
  }

  .fm-card{
    border:1px solid var(--border);
    background: var(--surface-2);
    border-radius: var(--card-radius);
    padding: var(--card-pad-y) var(--card-pad-x);
    display:flex; align-items:center; justify-content:space-between; gap:10px; /* centered vertically */
    cursor:pointer;
    transition: transform .15s ease, box-shadow .15s ease, background .15s ease, border-color .15s ease;
  }
  .fm-card:hover{ box-shadow: 0 10px 24px rgba(0,0,0,.12) }
  .fm-card:active{ transform: translateY(1px) scale(.99) }

  .fm-card .left{ min-width:0 }
  .fm-card .name{
    font-size: var(--item-title);
    font-weight: 950;
    line-height: 1.2;
    color: var(--text);
    word-break: break-word;
  }

  .fm-badge{
    flex:none;
    border:1px solid var(--border);
    background: var(--surface);
    border-radius: var(--badge-radius);
    padding: var(--badge-pad-y) var(--badge-pad-x);
    font-size: var(--badge-font);
    font-weight: 950;
    color: var(--text);
    white-space:nowrap;
  }

  .fm-empty{
    border:1px dashed var(--border);
    background: transparent;
    border-radius: 14px;
    padding: 14px;
    color: var(--muted);
    font-weight: 900;
    text-align:center;
  }

  /* Stronger card contrast in light mode */
  @media (prefers-color-scheme: light){
    .fm-card{
      background:#ffffff;
      border-color: rgba(0,0,0,.12);
      box-shadow: 0 10px 22px rgba(0,0,0,.08);
    }
    .fm-badge{
      background: rgba(0,0,0,.04);
      border-color: rgba(0,0,0,.10);
    }
  }
  `;
  root.appendChild(style);

  // =========================
  // CONFIG RESOLUTION
  // =========================
  const FALLBACK = {
    urlFormulary: "https://docs.niwashibase.com/helpers/formulary.json",
    urlPageBase:
      "https://docs.niwashibase.com/viewer/web/?file=/docs/cpg-81w9d1f.pdf#page="
  };

  function getCfg() {
    const cfg =
      (window.APP_CONFIG && window.APP_CONFIG.pdfViewer && window.APP_CONFIG.pdfViewer.helpers) ||
      (window.CONFIG && window.CONFIG.pdfViewer && window.CONFIG.pdfViewer.helpers) ||
      (window.__CONFIG && window.__CONFIG.pdfViewer && window.__CONFIG.pdfViewer.helpers) ||
      null;

    const urlFormulary = (cfg && cfg.urlFormulary) ? String(cfg.urlFormulary) : FALLBACK.urlFormulary;
    const urlPage = (cfg && cfg.urlPage) ? String(cfg.urlPage) : FALLBACK.urlPageBase;

    const urlPageBase = urlPage.includes("#page=") ? urlPage : (urlPage.replace(/#.*$/, "") + "#page=");

    return { urlFormulary, urlPageBase };
  }

  const CFG = getCfg();

  // =========================
  // MODAL VIEWER (WebClip-safe)
  // Back + centered title
  // =========================
  function ensureViewerModal() {
    let modal = document.getElementById("pvModal");
    if (modal) return modal;

    if (!document.getElementById("pvModalStyle")) {
      const st = document.createElement("style");
      st.id = "pvModalStyle";
      st.textContent = `
        .pv-modal{
          position:fixed; inset:0; z-index:999999;
          background: rgba(0,0,0,.55);
          display:none;
          padding: env(safe-area-inset-top) env(safe-area-inset-right)
                   env(safe-area-inset-bottom) env(safe-area-inset-left);
        }
        .pv-modal.show{ display:block; }

        .pv-sheet{
          position:absolute; inset:0;
          background: var(--surface);
          display:flex; flex-direction:column;
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
        }

        .pv-bar{
          position: relative;
          flex:none;
          height: 48px;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
          display:flex;
          align-items:center;
          padding: 0 12px;
        }

        .pv-back{
          z-index:2;
          border:1px solid var(--border);
          background: var(--surface-2);
          color: var(--text);
          border-radius: 12px;
          padding: 10px 14px;
          font-weight:950;
          cursor:pointer;
        }

        .pv-title{
          position:absolute;
          left:50%;
          transform:translateX(-50%);
          font-weight:950;
          font-size:14px;
          color:var(--text);
          max-width:60%;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          pointer-events:none;
        }

        .pv-iframe{
          flex:1;
          width:100%;
          border:none;
          background:#fff;
        }
      `;
      document.head.appendChild(st);
    }

    modal = document.createElement("div");
    modal.id = "pvModal";
    modal.className = "pv-modal";
    modal.innerHTML = `
      <div class="pv-sheet" role="dialog" aria-modal="true">
        <div class="pv-bar">
          <button class="pv-back" id="pvBack" type="button">Back</button>
          <div class="pv-title" id="pvTitle">Formulary</div>
        </div>
        <iframe class="pv-iframe" id="pvFrame" src="about:blank"></iframe>
      </div>
    `;
    document.body.appendChild(modal);

    const frame = modal.querySelector("#pvFrame");
    const backBtn = modal.querySelector("#pvBack");
    const titleEl = modal.querySelector("#pvTitle");

    function buildOverlayUrl(overlayToken) {
      const p = new URLSearchParams((location.hash || "").replace(/^#/, ""));
      p.set("tool", "formulary");
      p.set("overlay", "pv");
      if (overlayToken) p.set("pv", overlayToken);
      else p.delete("pv");
      const hash = p.toString();
      return `${location.pathname}${location.search}${hash ? `#${hash}` : ""}`;
    }
    function buildOverlayState(overlayToken) {
      const baseState = (history.state && history.state.tool) ? history.state : { tool: "formulary", params: {} };
      const next = { ...baseState, overlay: "pv" };
      if (overlayToken) next.overlayToken = overlayToken;
      return next;
    }

    function closeModal(fromPop = false) {
      modal.__openToken = (modal.__openToken || 0) + 1;
      modal.classList.remove("show");
      modal.style.display = "none";
      frame.src = "about:blank";
      if (modal.__popHandler) {
        window.removeEventListener("popstate", modal.__popHandler);
        modal.__popHandler = null;
      }
      if (modal.__historyActive) {
        modal.__historyActive = false;
        if (fromPop) window.__modalPopHandled = true;
      }
    }

    backBtn.addEventListener("click", () => {
      if (modal.__historyActive) {
        closeModal();
        if (modal.__baseUrl) {
          history.replaceState(modal.__baseState || history.state, "", modal.__baseUrl);
        }
        modal.__historyActive = false;
      } else {
        closeModal();
      }
    });

    modal.__open = (url, title, overlayToken) => {
      titleEl.textContent = title || "Formulary";
      frame.src = url;
      modal.style.display = "block";
      if (!modal.__popHandler) {
        modal.__popHandler = () => {
          if (!modal.__historyActive) return;
          closeModal(true);
        };
        window.addEventListener("popstate", modal.__popHandler);
      }
      modal.__baseUrl = `${location.pathname}${location.search}${location.hash || ""}`;
      modal.__baseState = history.state;
      modal.__historyActive = true;
      history.pushState(buildOverlayState(overlayToken), "", buildOverlayUrl(overlayToken));
      modal.__openToken = (modal.__openToken || 0) + 1;
      const token = modal.__openToken;
      requestAnimationFrame(() => {
        if (modal.__openToken !== token) return;
        modal.classList.add("show");
      });
    };

    return modal;
  }

  // =========================
  // MARKUP
  // =========================
  root.insertAdjacentHTML("afterbegin", `
    <div class="fm-wrap">
      <h2 class="fm-title">Formulary</h2>

      <div class="fm-top">
        <div class="fm-search">
          <input id="fmQ" type="search" inputmode="search" placeholder="Search medication..." autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" name="fm-search" />
          <div class="meta" id="fmCount">—</div>
        </div>

        <div class="fm-actions">
          <button class="fm-btn" id="fmClear" type="button">Clear</button>
        </div>
      </div>

      <div id="fmList" class="fm-grid" aria-live="polite"></div>
    </div>
  `);

  const $q = root.querySelector("#fmQ");
  const $count = root.querySelector("#fmCount");
  const $list = root.querySelector("#fmList");
  const $clear = root.querySelector("#fmClear");

  // =========================
  // HELPERS
  // =========================
  function safeVibrate(ms) {
    if (!navigator.vibrate) return;
    try { navigator.vibrate(ms); } catch (_) {}
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function setHashState(q) {
    const p = new URLSearchParams((location.hash || "").replace(/^#/, ""));
    p.set("tool", "formulary");
    if (q && String(q).trim()) p.set("q", String(q).trim());
    else p.delete("q");
    const hash = p.toString();
    const url = `${location.pathname}${location.search}${hash ? `#${hash}` : ""}`;
    history.replaceState(history.state, "", url);
  }

  function getHashState() {
    const p = new URLSearchParams((location.hash || "").replace(/^#/, ""));
    if (p.get("tool") !== "formulary") return { q: "" };
    return { q: p.get("q") || "" };
  }

  function normalizeFormularyJson(data) {
    // Accept:
    // 1) { "Drug": 123, "Other": "45", ... }
    // 2) [ {title/name/label:"Drug", page:123}, ... ]
    // 3) { items:[...] } / { formulary:[...] }
    // 4) { "Category": { "Drug": 12, ... }, ... }  -> flatten as "Category — Drug"
    const out = [];

    if (Array.isArray(data)) {
      data.forEach((x) => {
        if (!x) return;
        const title = x.title || x.name || x.label;
        const page = x.page || x.p || x.pageNumber;
        if (!title || page == null) return;
        const n = Number(page);
        if (!Number.isFinite(n) || n <= 0) return;
        out.push({ title: String(title), page: n });
      });
      return out;
    }

    if (data && typeof data === "object") {
      const items =
        (Array.isArray(data.items) && data.items) ||
        (Array.isArray(data.formulary) && data.formulary) ||
        null;

      if (items) {
        items.forEach((x) => {
          if (!x) return;
          const title = x.title || x.name || x.label;
          const page = x.page || x.p || x.pageNumber;
          if (!title || page == null) return;
          const n = Number(page);
          if (!Number.isFinite(n) || n <= 0) return;
          out.push({ title: String(title), page: n });
        });
        return out;
      }

      const topKeys = Object.keys(data);
      topKeys.forEach((k) => {
        const v = data[k];

        if (typeof v === "number" || typeof v === "string") {
          const n = Number(v);
          if (!Number.isFinite(n) || n <= 0) return;
          out.push({ title: String(k), page: n });
          return;
        }

        if (v && typeof v === "object" && !Array.isArray(v)) {
          Object.keys(v).forEach((kk) => {
            const vv = v[kk];
            const n = Number(vv);
            if (!Number.isFinite(n) || n <= 0) return;
            out.push({ title: `${String(k)} — ${String(kk)}`, page: n });
          });
        }
      });
    }

    return out;
  }

  function sortItems(items) {
    return items.slice().sort((a, b) => {
      const an = a.title.toLowerCase();
      const bn = b.title.toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return (a.page || 0) - (b.page || 0);
    });
  }

  function render(items, q) {
    const qq = (q || "").trim().toLowerCase();
    const filtered = qq
      ? items.filter((x) => x.title.toLowerCase().includes(qq))
      : items;

    $count.textContent = `${filtered.length}/${items.length}`;

    $list.innerHTML = "";
    if (!filtered.length) {
      $list.innerHTML = `<div class="fm-empty">No results.</div>`;
      return;
    }

    filtered.forEach((x) => {
      const card = document.createElement("div");
      card.className = "fm-card";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `Open ${x.title} (page ${x.page})`);

      card.innerHTML = `
        <div class="left">
          <div class="name">${escapeHtml(x.title)}</div>
        </div>
        <div class="fm-badge">Page ${x.page}</div>
      `;

      function open() {
        safeVibrate(6);
        setHashState($q.value || "");
        const url = CFG.urlPageBase + String(x.page);
        const modal = ensureViewerModal();
        modal.__open(url, x.title, `page:${x.page}`);
      }

      card.addEventListener("click", open);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });

      $list.appendChild(card);
    });
  }

  async function loadFormulary() {
    const res = await fetch(CFG.urlFormulary, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load formulary.json (${res.status})`);
    const data = await res.json();
    const items = normalizeFormularyJson(data);
    return sortItems(items);
  }

  // =========================
  // INIT
  // =========================
  let ALL = [];

  // Restore from hash
  const hs = getHashState();
  if (hs.q) $q.value = hs.q;
  else { $q.value = ""; $q.setAttribute("value", ""); }

  // Clear
  $clear.addEventListener("click", () => {
    safeVibrate(6);
    $q.value = "";
    setHashState("");
    render(ALL, "");
    $q.focus();
  });

  // Search
  let t = null;
  $q.addEventListener("input", () => {
    const q = $q.value || "";
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      setHashState(q);
      render(ALL, q);
    }, 60);
  });

  // Load + render
  try {
    $count.textContent = "Loading…";
    ALL = await loadFormulary();
    render(ALL, $q.value || "");
    setHashState($q.value || "");
  } catch (err) {
    $count.textContent = "—";
    $list.innerHTML = `<div class="fm-empty">${escapeHtml(err && err.message ? err.message : "Failed to load.")}</div>`;
  }
}
