// /tools/cpg_wizard.js
// CHANGELOG (2026-06-07):
// - Close the CPG viewer directly so PDF.js iframe history cannot consume the first Back press.
// - Prevent repeated CPG result taps from stacking duplicate PDF overlay history entries.
// - Consume the PDF overlay history entry on Back instead of duplicating the CPG parent screen.
//
// CHANGELOG (2026-05-18):
// - Add the search icon inside the CPG search box.
// - Move the Clear button below the search hint.
// - Place the old descriptive search hint directly below the search box and match version pill to the CPG Wizard button color.
// CHANGELOG (2026-05-17):
// - Shorten search placeholder, remove Smart Search button, show live results, remove accuracy score pill, and restyle version pill.
// - Load shared search modules through the app ASSET_VERSION cache key.
// CHANGELOG (2026-05-16):
// - Reuse shared warmed CPG helper data when available.
// - Use the shared weighted document searcher for CPG Wizard matching.
// CHANGELOG (2026-05-02):
// - Show CPG version badge beside the module title.
// CHANGELOG (2026-05-01):
// - Accept both urlIndex and urlindexJson config keys for CPG index helper URL.
// - Only restore query hash state when the active tool is cpg_wizard.
// - Dismiss the keyboard from Enter and result-list scrolling.
// CHANGELOG (2026-01-15):
// - Make PDF modal back close without extra blank layer; keep hash/state stable.
// - Preserve hash updates with full URL while editing search state.
// CPG Wizard:
// - Live search over cpg_index.json.
// - Buttons:
//   1) Open CPG (page 12)
//   2) Search CPG (open PDF viewer with #search=<term>)
//   3) Open CPG at page (user enters page number)
// - Ambulance App-safe: opens viewer inside a modal (Back + centered title), attached to document.body

function assetQuery() {
  const version = window.__AMBULANCE_ASSET_VERSION || "";
  return version ? `?ver=${encodeURIComponent(version)}` : "";
}

async function loadSharedSearchModules() {
  const shared = window.__AMBULANCE_SHARED_MODULES || {};
  const [searchData, searchCore] = await Promise.all([
    shared.searchData || import(`../search_data.js${assetQuery()}`),
    shared.searchCore || import(`../search_core.js${assetQuery()}`)
  ]);
  return { searchData, searchCore };
}

export async function run(root) {
  const { searchData, searchCore } = await loadSharedSearchModules();
  const { getDocumentItems } = searchData;
  const { buildDocumentSearcher } = searchCore;
  root.innerHTML = "";

  // =========================
  // 🎛 TUNABLE DESIGN TOKENS
  // =========================
  const CSS_TOKENS = `
    :root{
      --pad: 12px;

      --title-size: 18px;
      --title-weight: 900;

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

      --inp-h: 44px;
      --inp-radius: 12px;
    }
  `;

  const style = document.createElement("style");
  style.textContent = `
  ${CSS_TOKENS}

  .cw-wrap{padding:var(--pad);max-width:980px;margin:0 auto;-webkit-text-size-adjust:100%}
  .cw-title-row{position:relative;display:flex;align-items:center;justify-content:center;margin:0 0 10px;min-height:28px}
  .cw-title{margin:0;font-size:var(--title-size);text-align:center;font-weight:var(--title-weight);letter-spacing:.2px}
  .cw-version{position:absolute;right:0;top:50%;transform:translateY(-50%);font-size:11px;font-weight:950;color:#026802;border:1px solid rgba(2,194,2,.28);background:linear-gradient(180deg,rgba(122,235,122,.26),rgba(2,194,2,.16));border-radius:999px;padding:4px 8px;white-space:nowrap}
  @media (max-width:420px){
    .cw-title-row{justify-content:space-between;gap:8px}
    .cw-title{text-align:left}
    .cw-version{position:static;transform:none;flex:none}
  }

  .cw-panel{
    border:1px solid var(--border);
    background: var(--surface-2);
    border-radius: 14px;
    padding: 12px;
    display:flex;
    flex-direction:column;
    gap: 10px;
    margin: 10px 0 12px;
  }

  .cw-actions{
    display:flex; gap:10px; flex-wrap:wrap;
  }
  .cw-btn{
    border:1px solid var(--border);
    background:var(--surface);
    color:var(--text);
    border-radius:var(--btn-radius);
    padding: 10px 12px;
    min-height: var(--btn-h);
    font-weight:950;
    cursor:pointer;
    transition: transform .15s ease, box-shadow .15s ease, background .15s ease, border-color .15s ease;
  }
  .cw-btn:active{ transform: translateY(1px) scale(.99) }
  .cw-clear-btn{
    align-self:flex-start;
    min-width:96px;
    margin-top:2px;
  }
  .cw-btn-primary{
    background: linear-gradient(180deg,#2563eb,#1d4ed8);
    color:#fff;
    border-color: transparent;
    box-shadow: 0 10px 24px rgba(37,99,235,.35);
  }
  .cw-btn-primary:focus-visible{
    outline:2px solid #93c5fd;
    outline-offset:2px;
  }
  .cw-btn-primary:active{
    transform: translateY(1px) scale(.98);
    box-shadow: 0 6px 18px rgba(37,99,235,.4);
  }

  .cw-row{ display:flex; gap:10px; flex-wrap:wrap; }
  .cw-search-wrap{flex:2 1 320px;display:flex;flex-direction:column;gap:4px;min-width:0}

  .cw-input{
    display:flex; align-items:center; gap:10px;
    border:1px solid var(--border);
    background:var(--surface);
    border-radius: var(--inp-radius);
    padding: 0 12px;
    min-height: var(--inp-h);
  }
  .cw-input .cw-search-icon{
    flex:none;
    color:var(--muted);
    font-size:22px;
    line-height:1;
  }
  .cw-input input{
    width:100%;
    min-width:0;
    border:none; outline:none; background:transparent;
    color:var(--text); font-weight:800; font-size:16px;
  }
  .cw-input input::placeholder{
    font-size:13px;
    color:var(--muted);
  }
  .cw-input .meta{
    flex:none; font-size:12px; color:var(--muted); font-weight:900; white-space:nowrap;
  }

  .cw-hint{
    font-size: 11px;
    color: var(--muted);
    font-weight: 750;
    margin-top: 2px;
    line-height: 1.35;
  }

  .cw-results-hd{
    display:flex; align-items:center; justify-content:space-between; gap:10px;
    margin: 12px 0 8px;
  }
  .cw-results-hd .left{ font-weight:950; color: var(--text); }
  .cw-results-hd .right{ font-size:12px; font-weight:900; color: var(--muted); }

  .cw-grid{
    display:grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--row-gap);
  }
  @media (max-width:800px){ .cw-grid{ grid-template-columns: 1fr; } }

  .cw-card{
    border:1px solid var(--border);
    background: var(--surface-2);
    border-radius: var(--card-radius);
    padding: var(--card-pad-y) var(--card-pad-x);
    display:flex; align-items:center; justify-content:space-between; gap:10px;
    cursor:pointer;
    transition: transform .15s ease, box-shadow .15s ease, background .15s ease, border-color .15s ease;
  }
  .cw-card:hover{ box-shadow: 0 10px 24px rgba(0,0,0,.12) }
  .cw-card:active{ transform: translateY(1px) scale(.99) }

  .cw-card .left{ min-width:0 }
  .cw-card .name{
    font-size: var(--item-title);
    font-weight: 950;
    line-height: 1.2;
    color: var(--text);
    word-break: break-word;
  }
  .cw-card .sub{
    margin-top: 6px;
    font-size: 12px;
    font-weight: 850;
    color: var(--muted);
    display:flex; gap:10px; flex-wrap:wrap;
  }
  .cw-pill{
    border:1px solid rgba(255,255,255,.15);
    background: rgba(255,255,255,.08);
    border-radius: var(--badge-radius);
    padding: 2px 8px;
    font-size: 10px;
    font-weight: 800;
    color: var(--muted);
    letter-spacing:.03em;
    text-transform:uppercase;
    white-space:nowrap;
  }

  /* Right-side stack: Page range */
  .cw-right{
    flex:none;
    display:flex;
    flex-direction:column;
    align-items:flex-end;
    gap:8px;
  }

  .cw-badge{
    border:1px solid var(--border);
    background: var(--surface);
    border-radius: var(--badge-radius);
    padding: var(--badge-pad-y) var(--badge-pad-x);
    font-size: var(--badge-font);
    font-weight: 950;
    color: var(--text);
    white-space:nowrap;
  }

  .cw-empty{
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
    .cw-panel{ background:#ffffff; border-color: rgba(0,0,0,.12); box-shadow: 0 10px 22px rgba(0,0,0,.06); }
    .cw-card{ background:#ffffff; border-color: rgba(0,0,0,.12); box-shadow: 0 10px 22px rgba(0,0,0,.08); }
    .cw-badge,.cw-pill{ background: rgba(0,0,0,.04); border-color: rgba(0,0,0,.10); color: #111; }
    .cw-btn{ background:#ffffff; }
    .cw-btn-primary{
      background: linear-gradient(180deg,#2563eb,#1d4ed8);
      color:#fff;
      border-color: transparent;
      box-shadow: 0 10px 24px rgba(37,99,235,.35);
    }
    .cw-input{ background:#ffffff; }
  }
  @media (prefers-color-scheme: dark){
    .cw-version{color:#bbf7d0;border-color:rgba(122,235,122,.34);background:linear-gradient(180deg,rgba(122,235,122,.18),rgba(2,194,2,.14))}
  }
  `;
  root.appendChild(style);

  // =========================
  // CONFIG RESOLUTION
  // =========================
  const FALLBACK = {
    urlIndex: "https://docs.niwashibase.com/helpers/cpg_index.json",
    urlPageBase: "https://docs.niwashibase.com/viewer/web/?file=/docs/cpg-81w9d1f.pdf#page=",
    urlSearchBase: "https://docs.niwashibase.com/viewer/web/?file=/docs/cpg-81w9d1f.pdf#search="
  };

  function getCfg() {
    const cfg =
      (window.APP_CONFIG && window.APP_CONFIG.pdfViewer && window.APP_CONFIG.pdfViewer.helpers) ||
      (window.CONFIG && window.CONFIG.pdfViewer && window.CONFIG.pdfViewer.helpers) ||
      (window.__CONFIG && window.__CONFIG.pdfViewer && window.__CONFIG.pdfViewer.helpers) ||
      null;

    const urlIndex = (cfg && (cfg.urlIndex || cfg.urlindexJson)) ? String(cfg.urlIndex || cfg.urlindexJson) : FALLBACK.urlIndex;
    const urlPage = (cfg && cfg.urlPage) ? String(cfg.urlPage) : FALLBACK.urlPageBase;
    const urlKeyword = (cfg && cfg.urlKeyword) ? String(cfg.urlKeyword) : FALLBACK.urlSearchBase;

    const urlPageBase = urlPage.includes("#page=") ? urlPage : (urlPage.replace(/#.*$/, "") + "#page=");
    const urlSearchBase = urlKeyword.includes("#search=") ? urlKeyword : (urlKeyword.replace(/#.*$/, "") + "#search=");

    return { urlIndex, urlPageBase, urlSearchBase };
  }

  const CFG = getCfg();

  // =========================
  // MODAL VIEWER (shared style id)
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
          <div class="pv-title" id="pvTitle">CPG</div>
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
      p.set("tool", "cpg_wizard");
      p.set("overlay", "pv");
      if (overlayToken) p.set("pv", overlayToken);
      else p.delete("pv");
      const hash = p.toString();
      return `${location.pathname}${location.search}${hash ? `#${hash}` : ""}`;
    }
    function buildOverlayState(overlayToken) {
      const baseState = (history.state && history.state.tool) ? history.state : { tool: "cpg_wizard", params: {} };
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
        window.removeEventListener("popstate", modal.__popHandler, true);
        modal.__popHandler = null;
      }
      if (modal.__historyActive) {
        modal.__historyActive = false;
        if (fromPop) window.__modalPopHandled = true;
      }
    }

    backBtn.addEventListener("click", () => closeModal());

    modal.__open = (url, title, overlayToken) => {
      titleEl.textContent = title || "CPG";
      frame.src = url;
      modal.style.display = "block";
      modal.__historyActive = false;
      modal.__overlayToken = overlayToken || "";
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
    <div class="cw-wrap">
      <div class="cw-title-row">
        <h2 class="cw-title">CPG Wizard</h2>
        <div class="cw-version">CPG v2.5 2026</div>
      </div>

      <div class="cw-panel">
        <div class="cw-row">
          <div class="cw-search-wrap">
            <div class="cw-input">
              <span class="material-symbols-rounded cw-search-icon" aria-hidden="true">search</span>
              <input id="cwQuery" type="search" inputmode="search" placeholder="Search CPG" autocomplete="off" />
              <div class="meta" id="cwStatus">—</div>
            </div>
            <div class="cw-hint" id="cwHint">Search symptoms, drugs, abbreviations</div>
            <button class="cw-btn cw-clear-btn" id="cwClear" type="button">Clear</button>
          </div>
        </div>

        <div class="cw-actions">
          <button class="cw-btn" id="cwOpenCpg" type="button">Open CPG</button>
          <button class="cw-btn" id="cwSearchCpg" type="button">Search CPG</button>
          <button class="cw-btn" id="cwOpenPage" type="button">Open Page</button>
        </div>
      </div>

      <div class="cw-results-hd">
        <div class="left" id="cwResTitle">Results</div>
        <div class="right" id="cwResMeta">—</div>
      </div>

      <div id="cwList" class="cw-grid" aria-live="polite"></div>
    </div>
  `);

  const $query = root.querySelector("#cwQuery");
  const $status = root.querySelector("#cwStatus");
  const $hint = root.querySelector("#cwHint");

  const $clear = root.querySelector("#cwClear");

  const $openCpg = root.querySelector("#cwOpenCpg");
  const $searchCpg = root.querySelector("#cwSearchCpg");
  const $openPage = root.querySelector("#cwOpenPage");

  const $resTitle = root.querySelector("#cwResTitle");
  const $resMeta = root.querySelector("#cwResMeta");
  const $list = root.querySelector("#cwList");
  const SEARCH_HINT = "Search symptoms, drugs, abbreviations";

  // =========================
  // HASH STATE
  // =========================
  function setHashState(state) {
    const p = new URLSearchParams((location.hash || "").replace(/^#/, ""));
    p.set("tool", "cpg_wizard");
    if (state.q && String(state.q).trim()) p.set("q", String(state.q).trim());
    else p.delete("q");
    const hash = p.toString();
    const url = `${location.pathname}${location.search}${hash ? `#${hash}` : ""}`;
    history.replaceState(history.state, "", url);
  }
  function getHashState() {
    const p = new URLSearchParams((location.hash || "").replace(/^#/, ""));
    if (p.get("tool") !== "cpg_wizard") return { q: "" };
    return { q: p.get("q") || "" };
  }

  // =========================
  // BASIC HELPERS
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

  function promptText(title, value) {
    try {
      const v = window.prompt(title, value || "");
      if (v == null) return null;
      const out = String(v).trim();
      return out ? out : null;
    } catch (_) {
      return null;
    }
  }

  function promptNumber(title, value) {
    const v = promptText(title, value || "");
    if (v == null) return null;
    const n = Number(String(v).replace(/[^\d]/g, ""));
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }

  // =========================
  // OPEN VIEWER HELPERS
  // =========================
  function openAtPage(page, title) {
    const modal = ensureViewerModal();
    modal.__open(CFG.urlPageBase + String(page), title || "CPG", `page:${page}`);
  }
  function openSearch(term, title) {
    const modal = ensureViewerModal();
    const clean = String(term || "").trim();
    modal.__open(CFG.urlSearchBase + encodeURIComponent(clean), title || "Search", clean ? `search:${clean}` : "search");
  }

  // =========================
  // LOAD INDEX (cpg_index.json)
  // =========================
  async function loadIndex() {
    const res = await fetch(CFG.urlIndex, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load cpg_index.json (${res.status})`);
    const data = await res.json();
    const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : null);
    if (!Array.isArray(items)) throw new Error("cpg_index.json has no items array.");
    return items;
  }

  // =========================
  // SMART SEARCH (ported from Shortcuts JS)
  // =========================
  function buildSearcher(cpg_items) {
    if (!Array.isArray(cpg_items)) throw new Error("cpg_items must be an array.");

    function norm(s) {
      return String(s || "")
        .toLowerCase()
        .replace(/[^a-z0-9+%/ .:-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    const STOP = {
      "the":1,"a":1,"an":1,"of":1,"and":1,"or":1,"to":1,"in":1,"for":1,"with":1,"on":1,"is":1,"are":1,"what":1,"how":1,"which":1,"that":1,"this":1,"these":1,"those":1,"do":1,"does":1,"did":1,"be":1,"been":1,"being":1,"at":1,"by":1,"from":1,"as":1,"about":1,"into":1,"over":1,"under":1,"than":1,"then":1,"it":1,"its":1,"if":1,"when":1,"where":1,"who":1,"whom":1,"why":1
    };

    function buildExpansionMap(raw) {
      const out = Object.create(null);
      Object.keys(raw).forEach((key) => {
        const nk = norm(key);
        if (!nk) return;
        const val = raw[key];
        const arr = Array.isArray(val) ? val : [val];
        const normed = arr.map((v) => norm(v)).filter(Boolean);
        if (normed.length) out[nk] = Array.from(new Set(normed));
      });
      return out;
    }

    function buildBidirectionalMap(groups) {
      const map = Object.create(null);
      groups.forEach((group) => {
        const normed = group.map((term) => norm(term)).filter(Boolean);
        normed.forEach((term) => {
          const others = normed.filter((t) => t !== term);
          if (!others.length) return;
          if (!map[term]) map[term] = [];
          map[term].push(...others);
        });
      });
      Object.keys(map).forEach((k) => {
        map[k] = Array.from(new Set(map[k]));
      });
      return map;
    }

    const ABBREVIATION_MAP = buildExpansionMap({
      "sob": ["shortness of breath", "dyspnea", "breathless"],
      "cp": ["chest pain", "chest tightness", "chest pressure"],
      "acs": ["acute coronary syndrome", "stemi", "nstemi", "ischemic chest pain"],
      "mi": ["myocardial infarction", "heart attack"],
      "htn": ["hypertension", "high blood pressure"],
      "bp": ["blood pressure"],
      "bgl": ["blood glucose", "blood sugar", "glucose check"],
      "spo2": ["oxygen saturation", "pulse oximetry"],
      "ams": ["altered mental status", "confusion"],
      "dm": ["diabetes", "hyperglycaemia", "hypoglycaemia"],
      "tachy": ["tachycardia", "tachyarrhythmia"],
      "brady": ["bradycardia", "slow heart rate"],
      "paeds": ["paediatric", "pediatric", "child"],
      "peds": ["paediatric", "pediatric", "child"],
      "txa": ["tranexamic acid", "major haemorrhage", "hemorrhage control"],
      "bb": ["beta blocker", "beta-blocker"],
      "ccb": ["calcium channel blocker"],
      "tca": ["tricyclic antidepressants", "tricyclic antidepressant"],
      "od": ["overdose", "toxicity", "poisoning"],
      "io": ["intraosseous access", "io access"],
      "iv": ["intravenous"],
      "im": ["intramuscular"],
      "po": ["oral medication", "per os"],
      "neb": ["nebulized therapy", "nebuliser"],
      "af": ["atrial fibrillation", "a-fib"],
      "svt": ["supraventricular tachycardia", "narrow complex tachycardia"],
      "vt": ["ventricular tachycardia", "wide complex tachycardia"],
      "vf": ["ventricular fibrillation", "v-fib"],
      "pea": ["pulseless electrical activity"],
      "rosc": ["post rosc", "return of spontaneous circulation", "post cardiac arrest care"],
      "cva": ["stroke", "acute stroke"],
      "fast": ["be-fast", "stroke screen", "be fast"],
      "tbi": ["head injury", "traumatic brain injury"],
      "apo": ["acute pulmonary oedema", "pulmonary edema", "pulmonary oedema"],
      "pe": ["pulmonary embolism"],
      "dka": ["diabetic ketoacidosis"],
      "hhs": ["hyperosmolar", "hyperosmolar hyperglycemic state"],
      "abd": ["acute behavioural disturbance", "excited delirium"],
      "mci": ["multiple casualty incidents"],
      "hazmat": ["chemical exposure", "decontamination"],
      "fbao": ["foreign body airway obstruction", "choking"],
      "rsi": ["rapid sequence induction", "intubation", "induction"],
      "etco2": ["capnography", "end tidal co2"],
      "ekg": ["ecg", "12 lead"],
      "aed": ["defibrillator", "automated external defibrillator"],
      "bvm": ["bag valve mask", "bag-mask ventilation"],
      "o2": ["oxygen", "supplemental oxygen"],
      "lvo": ["large vessel occlusion", "stroke"],
      "etoh": ["alcohol intoxication", "ethanol"],
      "gtN": ["nitroglycerin", "glyceryl trinitrate"],
      "epi": ["adrenaline", "epinephrine"],
      "gcs": ["consciousness status assessment"],
      "avpu": ["consciousness status assessment"],
      "mi protocol": ["acute coronary syndrome"],
      "rosC": ["return of spontaneous circulation"]
    });

    const VARIANT_MAP = buildExpansionMap({
      "oedema": ["edema"],
      "edema": ["oedema"],
      "haemorrhage": ["hemorrhage", "bleeding", "major bleed"],
      "hemorrhage": ["haemorrhage", "bleeding", "major bleed"],
      "hypoxaemia": ["hypoxemia", "hypoxia", "low oxygen"],
      "hypoxemia": ["hypoxaemia", "hypoxia", "low oxygen"],
      "paediatric": ["pediatric", "peds", "child"],
      "pediatric": ["paediatric", "peds", "child"],
      "nebuliser": ["nebulizer", "neb"],
      "nebulizer": ["nebuliser", "neb"],
      "labour": ["labor"],
      "behaviour": ["behavior"],
      "behavioural": ["behavioral"],
      "haematology": ["hematology"],
      "haemostasis": ["hemostasis"],
      "anaemia": ["anemia"],
      "caesarean": ["cesarean"],
      "sulphate": ["sulfate"],
      "sulfate": ["sulphate"],
      "centre": ["center"],
      "litre": ["liter"],
      "organise": ["organize"],
      "paediatrics": ["pediatrics"],
      "fibre": ["fiber"]
    });

    const SYMPTOM_MAP = buildExpansionMap({
      "wheeze": ["asthma", "bronchospasm", "salbutamol", "ipratropium"],
      "wheezing": ["asthma", "bronchospasm", "salbutamol", "ipratropium"],
      "stridor": ["croup", "epiglottitis", "airway"],
      "drooling": ["epiglottitis", "airway"],
      "choking": ["foreign body airway obstruction", "magill", "fbao"],
      "chest tightness": ["asthma", "acute coronary syndrome", "gtn"],
      "chest heaviness": ["acute coronary syndrome", "cardiac arrest - special circumstances"],
      "jaw pain": ["acute coronary syndrome"],
      "left arm pain": ["acute coronary syndrome"],
      "arm numbness": ["stroke", "acute coronary syndrome"],
      "leg swelling": ["pulmonary embolism"],
      "calf pain": ["pulmonary embolism"],
      "hemoptysis": ["pulmonary embolism"],
      "bloody sputum": ["pulmonary embolism"],
      "pleuritic pain": ["pulmonary embolism"],
      "breathless": ["copd", "asthma", "pulmonary embolism", "acute pulmonary oedema"],
      "shortness of breath": ["copd", "asthma", "pulmonary embolism", "acute pulmonary oedema"],
      "dyspnea": ["copd", "asthma", "pulmonary embolism", "acute pulmonary oedema"],
      "low spo2": ["respiratory distress", "covid hypoxaemia", "severe respiratory infection", "pulmonary embolism"],
      "hypoxia": ["respiratory distress", "covid hypoxaemia", "severe respiratory infection", "pulmonary embolism"],
      "dry cough": ["respiratory distress", "covid hypoxaemia", "severe respiratory infection"],
      "productive cough": ["respiratory distress", "severe respiratory infection"],
      "loss of taste": ["respiratory distress/hypoxaemia in suspected/confirmed covid-19 patients"],
      "loss of smell": ["respiratory distress/hypoxaemia in suspected/confirmed covid-19 patients"],
      "palpitations": ["tachyarrhythmias", "svt", "af", "vt"],
      "racing heart": ["tachyarrhythmias", "svt", "af", "vt"],
      "slow heart": ["bradyarrhythmias", "atropine", "tcp"],
      "syncope": ["pulmonary embolism", "tachyarrhythmias", "bradyarrhythmias", "stroke", "cardiac arrest"],
      "collapse": ["pulmonary embolism", "tachyarrhythmias", "bradyarrhythmias", "stroke", "cardiac arrest"],
      "seizure": ["seizures", "status epilepticus", "midazolam"],
      "convulsion": ["seizures", "status epilepticus", "midazolam"],
      "status": ["status epilepticus", "seizures"],
      "agitated": ["acute behavioural disturbance", "abd", "droperidol"],
      "violence": ["acute behavioural disturbance", "sedation"],
      "post ictal": ["seizures"],
      "panic attack": ["hyperventilation"],
      "anxiety": ["hyperventilation"],
      "tingling": ["stroke", "fast", "be-fast"],
      "numbness": ["stroke", "fast", "be-fast"],
      "slurred speech": ["stroke", "fast", "be-fast"],
      "facial droop": ["stroke", "fast", "be-fast"],
      "one sided weakness": ["stroke", "fast", "be-fast"],
      "vision loss": ["stroke", "be-fast", "cardiac arrest - special circumstances"],
      "blurred vision": ["stroke", "be-fast"],
      "double vision": ["stroke", "be-fast"],
      "hypotension": ["non-traumatic shock", "sepsis", "cardiogenic shock", "anaphylaxis"],
      "shock": ["non-traumatic shock", "sepsis", "cardiogenic shock", "anaphylaxis"],
      "fever": ["sepsis", "infection"],
      "rigors": ["sepsis"],
      "chills": ["sepsis"],
      "sweating": ["non-traumatic shock", "cardiogenic shock"],
      "hives": ["anaphylaxis", "adrenaline", "diphenhydramine", "hydrocortisone"],
      "rash": ["anaphylaxis", "diphenhydramine"],
      "tongue swelling": ["anaphylaxis"],
      "throat tightness": ["anaphylaxis"],
      "bee sting": ["anaphylaxis", "adrenaline", "diphenhydramine", "hydrocortisone"],
      "wasp sting": ["anaphylaxis", "adrenaline"],
      "low sugar": ["hypoglycaemia and hyperglycaemia", "dextrose", "glucagon"],
      "hypoglycemia": ["hypoglycaemia and hyperglycaemia", "dextrose", "glucagon"],
      "high sugar": ["hypoglycaemia and hyperglycaemia", "dka", "hhs"],
      "hyperglycemia": ["hypoglycaemia and hyperglycaemia", "dka", "hhs"],
      "head injury": ["traumatic brain injury", "gcs"],
      "headache": ["stroke", "subarachnoid", "hypertension"],
      "dizziness": ["syncope", "bradyarrhythmias", "tachyarrhythmias"],
      "nausea": ["nausea and vomiting", "ondansetron", "metoclopramide"],
      "vomiting": ["nausea and vomiting", "ondansetron", "metoclopramide"],
      "vomiting blood": ["abdominal emergencies (non-traumatic)"],
      "coffee ground emesis": ["abdominal emergencies (non-traumatic)"],
      "abdominal pain": ["abdominal emergencies (non-traumatic)", "ectopic pregnancy", "appendicitis"],
      "back pain": ["spinal trauma", "abdominal emergencies (non-traumatic)"],
      "flank pain": ["renal", "abdominal emergencies (non-traumatic)"],
      "diarrhea": ["severe respiratory infection", "non-traumatic shock"],
      "constipation": ["abdominal emergencies (non-traumatic)"],
      "bleeding": ["major haemorrhage and haemorrhagic shock", "txa", "trauma arrest"],
      "tourniquet": ["major haemorrhage and haemorrhagic shock", "txa", "trauma arrest"],
      "burn": ["burns"],
      "burns": ["burns"],
      "crush": ["crush injury", "hyperkalaemia", "calcium", "bicarbonate"],
      "smoke inhalation": ["carbon monoxide", "cyanide", "burns"],
      "fire exposure": ["burns", "smoke inhalation"],
      "chemical exposure": ["hazmat incident", "organophosphates", "cyanide"],
      "pregnant bleeding": ["placenta praevia", "abruption", "miscarriage", "ectopic pregnancy"],
      "vaginal bleeding": ["placenta praevia", "abruption", "miscarriage"],
      "seizure in pregnancy": ["pre-eclampsia and eclampsia", "magnesium sulphate"],
      "postpartum bleeding": ["post delivery (or 3rd stage) complications", "pph"],
      "contractions": ["imminent delivery", "pre-term labour"],
      "ruptured membranes": ["imminent delivery", "pre-term labour"],
      "cord presenting": ["umbilical cord prolapse"],
      "breech baby": ["breech presentation"],
      "reduced fetal movement": ["pre-eclampsia and eclampsia"],
      "overdose": ["opioids", "naloxone", "psychostimulants", "tca", "benzodiazepine", "organophosphates", "carbon monoxide", "cyanide"],
      "poisoning": ["opioids", "naloxone", "psychostimulants", "tca", "benzodiazepine", "organophosphates", "carbon monoxide", "cyanide"],
      "snakebite": ["envenomation"],
      "scorpion sting": ["envenomation"],
      "heat stroke": ["heat-related disorders"],
      "heat exhaustion": ["heat-related disorders"],
      "cold exposure": ["cold-related disorders"],
      "frostbite": ["cold-related disorders"],
      "hypothermia": ["cold-related disorders"],
      "drowning": ["submersion incident"],
      "near drowning": ["submersion incident"],
      "water inhalation": ["submersion incident"],
      "dehydration": ["non-traumatic shock", "severe respiratory infection"],
      "dialysis patient": ["patients receiving renal dialysis"],
      "frail": ["elderly patients (>65 years old)"],
      "obese": ["bariatric patients"],
      "multiple patients": ["multiple casualty incidents"],
      "triage": ["multiple casualty incidents"],
      "panic": ["hyperventilation"],
      "anaphylactic": ["anaphylaxis and allergic reactions"],
      "air hunger": ["respiratory distress", "severe respiratory infection"],
      "bruise swelling": ["major haemorrhage and haemorrhagic shock"]
    });

    const BRAND_MAP = buildBidirectionalMap([
      ["Ventolin", "salbutamol", "albuterol", "ProAir", "Proventil", "AccuNeb"],
      ["Atrovent", "ipratropium"],
      ["Lasix", "furosemide"],
      ["Zofran", "ondansetron"],
      ["Reglan", "Maxolon", "metoclopramide"],
      ["Versed", "Dormicum", "midazolam"],
      ["Narcan", "naloxone"],
      ["Levophed", "noradrenaline", "norepinephrine"],
      ["Decadron", "dexamethasone"],
      ["Pulmicort", "budesonide"],
      ["Brufen", "Nurofen", "Advil", "Motrin", "ibuprofen"],
      ["Panadol", "Tylenol", "paracetamol", "acetaminophen"],
      ["Voltaren", "Cataflam", "diclofenac"],
      ["Plavix", "clopidogrel"],
      ["Disprin", "ASA", "aspirin"],
      ["Toradol", "ketorolac"],
      ["Ketalar", "ketamine"],
      ["Penthrox", "Green Whistle", "methoxyflurane"],
      ["Adenocard", "adenosine"],
      ["Anectine", "succinylcholine", "suxamethonium"],
      ["Esmeron", "rocuronium"],
      ["Norcuron", "vecuronium"],
      ["EpiPen", "Auvi-Q", "adrenaline", "epinephrine"],
      ["AtroPen", "atropine"],
      ["Bayer", "Ecotrin", "aspirin", "asa"],
      ["Nitrostat", "Nitrolingual", "Nitro-Bid", "gtn", "nitroglycerin", "glyceryl trinitrate"]
    ]);

    const PREPARED_ITEMS = cpg_items.map((item) => {
      const title = norm(item.title);
      const aliases = (item.aliases || []).map(norm).filter(Boolean);
      const keywords = (item.keywords || []).map(norm).filter(Boolean);
      const haystack = [title, ...aliases, ...keywords].join(" ").trim();
      const domains = (item.domains || []).map((d) => String(d).toLowerCase());
      const ages = (item.age_groups || []).map((a) => String(a).toLowerCase());
      const type = String(item.type || "").toLowerCase();
      const kwText = keywords.join(" ");
      const arrestDrug = type === "drug" && /adrenaline|amiodarone/.test(title);
      return {
        item,
        search: {
          title,
          aliases,
          keywords,
          haystack,
          type,
          domains,
          ages,
          hasDoseKeyword: /\b\d+(\.\d+)?\s?(mg|mcg|g|ml|units)\b/.test(kwText) || /\b(iv|im|io|po|in|neb|infusion|bolus|dose)\b/.test(kwText),
          isArrestDomain: domains.some((d) => d.toLowerCase().includes("cardiac arrest")),
          isArrestDrug: arrestDrug,
          isObGyn: domains.some((d) => d.toLowerCase().includes("obstetrics") || d.toLowerCase().includes("gyn")),
          hasPedsAge: ages.some((a) => a.includes("peds") || a.includes("paed") || a.includes("pediatric")),
          hasNeonatalAge: ages.some((a) => a.includes("neonatal"))
        }
      };
    });

    function tokenize(q) {
      const qn = norm(q);
      if (!qn) return [];
      const words = qn.split(" ").filter(Boolean);
      if (!words.length) return [];
      const baseSet = new Set(words);
      for (let span = 2; span <= 3; span++) {
        for (let i = 0; i <= words.length - span; i++) {
          const phrase = words.slice(i, i + span).join(" ");
          if (!phrase) continue;
          if (words.slice(i, i + span).some((w) => !STOP[w] || /\d/.test(w))) {
            baseSet.add(phrase);
          }
        }
      }

      const tokens = new Set(baseSet);
      const queue = [...baseSet];

      function addTerm(term) {
        const t = norm(term);
        if (!t || tokens.has(t)) return;
        tokens.add(t);
        queue.push(t);
        if (t.includes(" ")) {
          t.split(" ").forEach((part) => {
            const p = part.trim();
            if (!p) return;
            if (!tokens.has(p)) {
              tokens.add(p);
              queue.push(p);
            }
          });
        }
      }

      while (queue.length) {
        const term = queue.shift();
        if (!term) continue;
        const expanded = [
          ...(ABBREVIATION_MAP[term] || []),
          ...(VARIANT_MAP[term] || []),
          ...(SYMPTOM_MAP[term] || []),
          ...(BRAND_MAP[term] || [])
        ];
        expanded.forEach(addTerm);
      }

      return Array.from(tokens);
    }

    function lev(a, b) {
      a = a || ""; b = b || "";
      if (a === b) return 0;
      const m = a.length, n = b.length;
      if (!m) return n; if (!n) return m;
      const dp = new Array(n + 1);
      for (let j = 0; j <= n; j++) dp[j] = j;
      for (let i = 1; i <= m; i++) {
        let prev = dp[0]; dp[0] = i;
        for (let j = 1; j <= n; j++) {
          const tmp = dp[j];
          const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
          dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
          prev = tmp;
        }
      }
      return dp[n];
    }

    function detectIntent(tokens, rawQuery) {
      const tokenSet = new Set(tokens);
      const q = rawQuery || "";
      const intents = {
        drug: false,
        arrest: false,
        pregnancy: false,
        peds: false,
        neonatal: false
      };

      const drugPattern = /\b(\d+(\.\d+)?)\s?(mg|mcg|g|ml|units)\b/;
      const drugRoutes = /\b(iv|im|io|po|in|neb|infusion|bolus|dose|vial|ampule|tablet)\b/;
      if (drugPattern.test(q) || drugRoutes.test(q)) intents.drug = true;
      const drugWords = ["drug","drugs","dose","mg","mcg","ml","units","iv","im","io","po","in","neb","infusion","bolus","tablet","ampule","vial","g"];
      if (!intents.drug) intents.drug = drugWords.some((w) => tokenSet.has(w));

      const arrestWords = ["cpr","defib","shock","rosc","vf","vt","pea","asystole","arrest"];
      if (arrestWords.some((w) => tokenSet.has(w))) intents.arrest = true;

      const pregnancyWords = ["pregnant","pregnancy","postpartum","pph","eclampsia","preeclampsia","labour","labor","delivery","breech","cord","miscarriage"];
      if (pregnancyWords.some((w) => tokenSet.has(w))) intents.pregnancy = true;

      const pedsWords = ["peds","pediatric","paediatric","child","infant","kid"];
      if (pedsWords.some((w) => tokenSet.has(w))) intents.peds = true;

      const neonatalWords = ["neonate","neonatal","newborn","apgar","nls"];
      if (neonatalWords.some((w) => tokenSet.has(w))) intents.neonatal = true;

      return intents;
    }

    function fuzzyScore(searchMeta, token) {
      const len = token.length;
      if (len < 3 || len > 15) return 0;
      const distances = [lev(searchMeta.title, token)];
      if (searchMeta.aliases.length) distances.push(...searchMeta.aliases.map((a) => lev(a, token)));
      if (searchMeta.keywords.length) distances.push(...searchMeta.keywords.map((k) => lev(k, token)));
      const best = Math.min(...distances);
      if (!Number.isFinite(best)) return 0;
      if (best === 1) return 68;
      if (best === 2 && len >= 5) return 58;
      if (best === 3 && len >= 6) return 48;
      return 0;
    }

    function scoreItemForToken(entry, qtok) {
      if (!qtok) return 0;
      const meta = entry.search;
      const { title, aliases, keywords, haystack } = meta;
      const isPhrase = qtok.indexOf(" ") !== -1;
      let best = 0;

      if (qtok === title) best = 130;
      if (aliases.indexOf(qtok) !== -1) best = Math.max(best, 124);
      if (keywords.indexOf(qtok) !== -1) best = Math.max(best, 118);

      if (!best) {
        if (isPhrase && title.indexOf(qtok) !== -1) best = Math.max(best, 112);
        if (!isPhrase && title.indexOf(qtok) === 0) best = Math.max(best, 106);
        else if (!isPhrase && title.indexOf(qtok) > -1) best = Math.max(best, 100);
      }

      if (best < 118) {
        for (let i = 0; i < aliases.length; i++) {
          const a = aliases[i];
          if (isPhrase && a.indexOf(qtok) !== -1) { best = Math.max(best, 104); break; }
          if (!isPhrase && a.indexOf(qtok) === 0) { best = Math.max(best, 96); break; }
          if (!isPhrase && a.indexOf(qtok) > -1) { best = Math.max(best, 92); break; }
        }
      }

      if (best < 110) {
        for (let j = 0; j < keywords.length; j++) {
          const k = keywords[j];
          if (isPhrase && k.indexOf(qtok) !== -1) { best = Math.max(best, 98); break; }
          if (!isPhrase && k.indexOf(qtok) === 0) { best = Math.max(best, 92); break; }
          if (!isPhrase && k.indexOf(qtok) > -1) { best = Math.max(best, 86); break; }
        }
      }

      if (best <= 0 && haystack.indexOf(qtok) !== -1) {
        best = isPhrase ? 92 : 74;
      }

      if (best <= 0) {
        best = fuzzyScore(meta, qtok);
      }

      if (best > 0 && isPhrase) best += 6;
      return best;
    }

    function aggregateScore(entry, tokens) {
      const seen = {};
      let total = 0;
      let matchedTokens = 0;
      let shortHits = 0;
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (!t || seen[t]) continue;
        seen[t] = 1;
        const s = scoreItemForToken(entry, t);
        if (s > 0) {
          total += s;
          matchedTokens++;
          if (t.length <= 3 && t.indexOf(" ") === -1) shortHits++;
        }
      }
      if (!matchedTokens) return -999;
      total += Math.min(20, Math.max(0, matchedTokens - 1) * 4);
      if (shortHits && matchedTokens <= 1) total -= shortHits * 6;
      return total;
    }

    function applyIntentBoost(baseScore, entry, intents, hasTokens) {
      let s = hasTokens ? baseScore : 0;
      const meta = entry.search;

      if (intents.drug && meta.type === "drug") {
        s += 18;
        if (meta.hasDoseKeyword) s += 6;
      }

      if (intents.arrest) {
        if (meta.isArrestDomain) s += 15;
        else if (meta.isArrestDrug) s += 10;
      }

      if (intents.pregnancy && meta.isObGyn) s += 12;
      if (intents.peds && meta.hasPedsAge) s += 10;
      if (intents.neonatal && meta.hasNeonatalAge) s += 10;

      return hasTokens ? s : baseScore;
    }

    function colorFromPercent(pct, gap, isTop) {
      if (pct == null) return "gray";
      if (pct >= 85) return "green";
      if (isTop && pct >= 75 && gap >= 15) return "green";
      if (pct >= 60) return "amber";
      if (pct >= 35) return "red";
      return "gray";
    }

    function search(user_query, search_options) {
      search_options = search_options && typeof search_options === "object" ? search_options : {};
      const MAX_RESULTS = typeof search_options.maxResults === "number" ? search_options.maxResults : 10;

      const wantType = search_options.type ? String(search_options.type).toLowerCase() : null;
      const wantDomains = Array.isArray(search_options.domains) ? search_options.domains.map((d) => String(d).toLowerCase()) : [];
      const wantAges = Array.isArray(search_options.age_groups) ? search_options.age_groups.map((a) => String(a).toLowerCase()) : [];

      function passesFilters(entry) {
        const item = entry.item;
        if (wantType && String(item.type || "").toLowerCase() !== wantType) return false;

        if (wantDomains.length) {
          const itsDomains = entry.search.domains;
          const domHit = wantDomains.some((d) => itsDomains.indexOf(d) !== -1);
          if (!domHit) return false;
        }

        if (wantAges.length) {
          const itsAges = entry.search.ages;
          const ageHit = wantAges.some((a) => itsAges.indexOf(a) !== -1);
          if (!ageHit) return false;
        }

        return true;
      }

      const qTokens = tokenize(user_query);
      const qNorm = norm(user_query);
      const intents = detectIntent(qTokens, qNorm);
      const hasTokens = qTokens.length > 0;

      const results = [];
      for (let i = 0; i < PREPARED_ITEMS.length; i++) {
        const entry = PREPARED_ITEMS[i];
        if (!passesFilters(entry)) continue;

        const baseScore = hasTokens ? aggregateScore(entry, qTokens) : 0;
        if (hasTokens && baseScore <= -999) continue;

        const boostedScore = applyIntentBoost(baseScore, entry, intents, hasTokens);

        results.push({
          id: entry.item.id,
          title: entry.item.title,
          page_start: entry.item.page_start,
          page_end: entry.item.page_end,
          type: entry.item.type,
          domains: entry.item.domains || [],
          age_groups: entry.item.age_groups || [],
          score: boostedScore
        });
      }

      results.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return String(a.title || "").localeCompare(String(b.title || ""));
      });

      let suggestion = null;

      if (!results.length) {
        if (qTokens.length <= 1) {
          let bestItem = null;
          let bestDist = 99;

          for (let j = 0; j < PREPARED_ITEMS.length; j++) {
            const entry = PREPARED_ITEMS[j];
            if (!passesFilters(entry)) continue;

            const t = entry.search.title;
            const al = entry.search.aliases;
            const kw = entry.search.keywords;

            const d = Math.min(
              lev(t, qNorm),
              al.length ? Math.min(...al.map((a) => lev(a, qNorm))) : 99,
              kw.length ? Math.min(...kw.map((k) => lev(k, qNorm))) : 99
            );
            if (d < bestDist) { bestDist = d; bestItem = entry.item; }
          }

          if (bestItem && bestDist <= 2) {
            suggestion = {
              id: bestItem.id,
              title: bestItem.title,
              page_start: bestItem.page_start,
              page_end: bestItem.page_end,
              type: bestItem.type,
              distance: bestDist,
              reason: "suggestion:fuzzy"
            };
          }
        } else {
          let bestItem = null;
          let bestAvg = 99;

          for (let k = 0; k < PREPARED_ITEMS.length; k++) {
            const entry = PREPARED_ITEMS[k];
            if (!passesFilters(entry)) continue;

            const T = entry.search.title;
            const AL = entry.search.aliases;
            const KW = entry.search.keywords;

            let sum = 0;
            let cnt = 0;
            let abort = false;

            for (let ti = 0; ti < qTokens.length; ti++) {
              const qt = qTokens[ti];
              if (!qt) continue;

              const dd = Math.min(
                lev(T, qt),
                AL.length ? Math.min(...AL.map((a) => lev(a, qt))) : 99,
                KW.length ? Math.min(...KW.map((k2) => lev(k2, qt))) : 99
              );
              sum += dd; cnt++;
              if (sum / cnt > 2.0) { abort = true; break; }
            }

            if (!cnt || abort) continue;

            const avg = sum / cnt;
            if (avg < bestAvg) { bestAvg = avg; bestItem = entry.item; }
          }

          if (bestItem && bestAvg <= 2.0) {
            suggestion = {
              id: bestItem.id,
              title: bestItem.title,
              page_start: bestItem.page_start,
              page_end: bestItem.page_end,
              type: bestItem.type,
              distance: Number(bestAvg.toFixed(2)),
              reason: "suggestion:fuzzy-avg"
            };
          }
        }
      }

      const topScore = results.length ? results[0].score : 0;
      const nextScore = results.length > 1 ? results[1].score : 0;
      const gap = topScore - nextScore;

      const outResults = results.slice(0, MAX_RESULTS).map((r, idx) => {
        const basePct = scoreToPercent(r.score);
        const pct = idx === 0 && basePct != null && gap > 0
          ? clamp(basePct + Math.min(10, Math.round(gap / 2)), 0, 100)
          : basePct;
        const color = colorFromPercent(pct, idx === 0 ? gap : 0, idx === 0);
        return {
          id: r.id,
          title: r.title,
          page_start: r.page_start,
          page_end: r.page_end,
          type: r.type,
          domains: r.domains,
          age_groups: r.age_groups,
          score: r.score,
          score_pct: pct,
          score_color: color
        };
      });

      return {
        query: user_query,
        had_results: outResults.length > 0,
        results: outResults,
        suggestion: outResults.length ? null : suggestion
      };
    }

    return { search };
  }

  // =========================
  // SCORE -> % + COLOR
  // =========================
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  // Scores can exceed 100 with multi-token + intent boosts.
  // This maps typical strong hits near/above ~120 to 100%.
  const SCORE_MAX = 160;

  function scoreToPercent(score) {
    if (!Number.isFinite(score)) return null;
    const p = Math.round((score / SCORE_MAX) * 100);
    return clamp(p, 0, 100);
  }

  function percentClass(color) {
    switch (color) {
      case "green": return "ok";
      case "amber": return "warn";
      case "red": return "bad";
      default: return "neutral";
    }
  }

  // =========================
  // RENDER RESULTS
  // =========================
  function formatRange(a, b) {
    const s = Number(a), e = Number(b);
    if (Number.isFinite(s) && Number.isFinite(e) && e >= s) return `${s}–${e}`;
    if (Number.isFinite(s)) return `${s}`;
    return "";
  }

  function renderResults(payload) {
    const res = (payload && payload.results) ? payload.results : [];
    const sug = payload && payload.suggestion ? payload.suggestion : null;

    $list.innerHTML = "";

    if (res.length) {
      $resTitle.textContent = "Results";
      $resMeta.textContent = `${res.length} shown`;

      res.forEach((x) => {
        const card = document.createElement("div");
        card.className = "cw-card";
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");

        const range = formatRange(x.page_start, x.page_end);
        const metaChunks = [];
        function addTag(label) {
          if (!label || metaChunks.length >= 4) return;
          metaChunks.push(`<span class="cw-pill">${escapeHtml(label)}</span>`);
        }
        const firstWord = (str) => {
          if (!str) return "";
          const word = String(str).trim().split(/\s+/)[0];
          return word || "";
        };
        const typeTag = firstWord(x.type);
        if (typeTag) addTag(typeTag);
        if (Array.isArray(x.domains) && x.domains.length) {
          for (let i = 0; i < x.domains.length && metaChunks.length < 4; i++) {
            let domainTag = firstWord(x.domains[i]);
            if (domainTag.toUpperCase().startsWith("CPG")) {
              domainTag = domainTag.replace(/[^\w.]/g, "");
            } else {
              domainTag = domainTag.replace(/[^\w]/g, "");
            }
            if (domainTag) addTag(domainTag);
          }
        }
        if (Array.isArray(x.age_groups)) {
          for (let i = 0; i < x.age_groups.length && metaChunks.length < 4; i++) {
            const ageTag = firstWord(x.age_groups[i]);
            if (ageTag) addTag(ageTag);
          }
        }

        card.innerHTML = `
          <div class="left">
            <div class="name">${escapeHtml(x.title || "")}</div>
            ${metaChunks.length ? `<div class="sub">${metaChunks.join("")}</div>` : ``}
          </div>

          <div class="cw-right">
            <div class="cw-badge">${range ? `Page ${escapeHtml(range)}` : `Open`}</div>
          </div>
        `;

        function open() {
          safeVibrate(6);
          const p = Number(x.page_start);
          openAtPage(Number.isFinite(p) && p > 0 ? p : 12, x.title || "CPG");
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
      return;
    }

    if (sug) {
      $resTitle.textContent = "No exact results";
      $resMeta.textContent = "Suggestion";

      const card = document.createElement("div");
      card.className = "cw-card";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");

      const range = formatRange(sug.page_start, sug.page_end);

      card.innerHTML = `
        <div class="left">
          <div class="name">${escapeHtml(sug.title || "")}</div>
          <div class="sub">
            <span class="cw-pill">${escapeHtml(sug.reason || "suggestion")}</span>
            <span class="cw-pill">distance ${escapeHtml(String(sug.distance))}</span>
          </div>
        </div>

        <div class="cw-right">
          <div class="cw-badge">${range ? `Page ${escapeHtml(range)}` : `Open`}</div>
        </div>
      `;

      function open() {
        safeVibrate(6);
        const p = Number(sug.page_start);
        openAtPage(Number.isFinite(p) && p > 0 ? p : 12, sug.title || "CPG");
      }

      card.addEventListener("click", open);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });

      $list.appendChild(card);
      return;
    }

    $resTitle.textContent = "Results";
    $resMeta.textContent = "—";
    $list.innerHTML = `<div class="cw-empty">Type to search CPG.</div>`;
  }

  // =========================
  // INIT + EVENTS
  // =========================
  let INDEX_ITEMS = [];
  let SEARCHER = null;

  function setStatus(text) { $status.textContent = text || "—"; }

  async function ensureIndexLoaded() {
    if (INDEX_ITEMS.length && SEARCHER) return;
    setStatus("Loading…");
    INDEX_ITEMS = await getDocumentItems("cpg", { urlIndex: CFG.urlIndex });
    if (!INDEX_ITEMS.length) INDEX_ITEMS = await loadIndex();
    SEARCHER = buildDocumentSearcher("cpg", INDEX_ITEMS);
    setStatus(`${INDEX_ITEMS.length} items`);
  }

  async function doSmartSearch() {
    const q = String($query.value || "").trim();
    if (!q) {
      setStatus("—");
      renderResults({ results: [], suggestion: null });
      return;
    }

    await ensureIndexLoaded();

    setHashState({ q });
    setStatus("Searching…");

    const out = SEARCHER.search(q, { maxResults: 10 });

    setStatus(out.had_results ? `Found ${out.results.length}` : "No results");
    renderResults(out);
  }

  let searchTimer = 0;
  function scheduleSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      try { await doSmartSearch(); }
      catch (e) {
        setStatus("Error");
        $list.innerHTML = `<div class="cw-empty">${escapeHtml(e && e.message ? e.message : "Search failed.")}</div>`;
      }
    }, 120);
  }

  // Wire UI
  $query.addEventListener("input", scheduleSearch);
  $query.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      $query.blur();
      safeVibrate(6);
    }
  });
  $list.addEventListener("touchstart", () => $query.blur(), { passive: true });
  $list.addEventListener("wheel", () => $query.blur(), { passive: true });

  $clear.addEventListener("click", () => {
    safeVibrate(6);
    $query.value = "";
    setHashState({ q: "" });
    setStatus("—");
    $hint.textContent = SEARCH_HINT;
    renderResults({ results: [], suggestion: null });
    $query.focus();
  });

  // Buttons:
  $openCpg.addEventListener("click", () => {
    safeVibrate(6);
    openAtPage(12, "CPG");
  });

  $searchCpg.addEventListener("click", () => {
    safeVibrate(6);
    const term = promptText("Search CPG", $query.value || "");
    if (!term) return;
    openSearch(term, `Search: ${term}`);
  });

  $openPage.addEventListener("click", () => {
    safeVibrate(6);
    const n = promptNumber("Open CPG at page number", "12");
    if (!n) return;
    openAtPage(n, `Page ${n}`);
  });

  // Restore query from hash
  const hs = getHashState();
  if (hs.q) {
    $query.value = hs.q;
    scheduleSearch();
  } else {
    renderResults({ results: [], suggestion: null });
  }

  // Prefetch index quietly
  requestAnimationFrame(() => {
    ensureIndexLoaded().catch(() => {});
  });
}
