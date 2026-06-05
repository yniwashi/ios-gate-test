// /ambulance/tools/flowcharts.js
// CHANGELOG (2026-06-05):
// - Match Android with one Flowcharts/Formulary screen, segmented mode, live search, and direct CPG pages.
// - Load versioned helper data through iOS App config and the shared reference cache.

const MODES = {
  flowcharts: {
    title:"Flowcharts",
    placeholder:"Search flowcharts...",
    loading:"Loading flowcharts...",
    error:"Unable to load flowcharts"
  },
  formulary: {
    title:"Formulary",
    placeholder:"Search formulary...",
    loading:"Loading formulary...",
    error:"Unable to load formulary"
  }
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[ch]));
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function referenceDataModule() {
  if (window.__AMBULANCE_SHARED_MODULES?.referenceData) {
    return window.__AMBULANCE_SHARED_MODULES.referenceData;
  }
  const version = encodeURIComponent(window.__AMBULANCE_ASSET_VERSION || "current");
  return import(`../reference_data.js?ver=${version}`);
}

export async function run(root, options = {}) {
  const requestedMode = String(options.initialMode || "").toLowerCase();
  let mode = requestedMode === "formulary" ? "formulary" : "flowcharts";
  let query = "";
  let loadToken = 0;
  const dataByMode = new Map();

  const hash = new URLSearchParams((location.hash || "").replace(/^#/, ""));
  if (hash.get("mode") === "formulary" || hash.get("mode") === "flowcharts") mode = hash.get("mode");
  query = hash.get("q") || "";

  root.innerHTML = `
    <style>
      .ref-app{max-width:720px;margin:0 auto;padding:12px 12px 28px;color:var(--text)}
      .ref-toggle{display:grid;grid-template-columns:1fr 1fr;gap:6px;height:46px;padding:4px;border:1px solid var(--border);border-radius:20px;background:var(--surface-2);box-sizing:border-box}
      .ref-toggle button{border:0;border-radius:16px;background:transparent;color:#3FA343;font-size:15px;font-weight:900}
      .ref-toggle button.active{background:#3FA343;color:#fff;box-shadow:0 3px 9px rgba(63,163,67,.3)}
      .ref-search{display:flex;align-items:center;gap:9px;margin-top:12px;height:48px;padding:0 10px 0 13px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2);box-sizing:border-box}
      .ref-search .material-symbols-rounded{font-size:23px;color:var(--muted)}
      .ref-search input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:var(--text);font-size:16px;font-weight:700}
      .ref-search input::placeholder{color:var(--muted);opacity:.9}
      .ref-clear{width:34px;height:34px;border:0;border-radius:50%;display:grid;place-items:center;background:transparent;color:var(--muted)}
      .ref-clear[hidden]{display:none}.ref-clear .material-symbols-rounded{font-size:20px}
      .ref-count{margin:9px 3px 7px;color:var(--muted);font-size:12px;font-weight:800;text-align:right}
      .ref-list{overflow:hidden;border:1px solid var(--border);border-radius:12px;background:var(--surface)}
      .ref-row{appearance:none;width:100%;min-height:52px;border:0;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 16px;text-align:left;background:var(--surface);color:var(--text)}
      .ref-row:nth-child(even){background:var(--surface-2)}.ref-row:last-child{border-bottom:0}
      .ref-row:active{background:color-mix(in srgb,#3FA343 13%,var(--surface))}
      .ref-name{min-width:0;font-size:16px;line-height:1.25;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ref-page{flex:none;color:var(--muted);font-size:12px;font-weight:850}
      .ref-state{padding:46px 18px;text-align:center;color:var(--muted);font-size:17px;font-weight:800}
      :root[data-theme="dark"] .ref-toggle button{color:#78C77B}
      :root[data-theme="dark"] .ref-toggle button.active{background:#347E3D;color:#fff}
      @media(prefers-color-scheme:dark){
        :root[data-theme="auto"] .ref-toggle button{color:#78C77B}
        :root[data-theme="auto"] .ref-toggle button.active{background:#347E3D;color:#fff}
      }
    </style>
    <div class="ref-app">
      <div class="ref-toggle" role="tablist" aria-label="Reference type">
        <button type="button" data-mode="flowcharts" role="tab">Flowcharts</button>
        <button type="button" data-mode="formulary" role="tab">Formulary</button>
      </div>
      <label class="ref-search">
        <span class="material-symbols-rounded" aria-hidden="true">search</span>
        <input id="refQuery" type="search" inputmode="search" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false">
        <button class="ref-clear" id="refClear" type="button" aria-label="Clear search" hidden>
          <span class="material-symbols-rounded" aria-hidden="true">close</span>
        </button>
      </label>
      <div class="ref-count" id="refCount"></div>
      <div class="ref-list" id="refList" aria-live="polite"></div>
    </div>`;

  const input = root.querySelector("#refQuery");
  const clear = root.querySelector("#refClear");
  const list = root.querySelector("#refList");
  const count = root.querySelector("#refCount");
  const toggles = [...root.querySelectorAll("[data-mode]")];

  function setPanelTitle(title) {
    const panelTitle = document.getElementById("panel-title");
    if (panelTitle) panelTitle.textContent = title;
  }

  function setHashState() {
    const params = new URLSearchParams((location.hash || "").replace(/^#/, ""));
    params.set("tool", options.compatibilityTool === "formulary" ? "formulary" : "flowcharts");
    params.set("mode", mode);
    if (query.trim()) params.set("q", query.trim());
    else params.delete("q");
    history.replaceState(history.state, "", `${location.pathname}${location.search}#${params}`);
  }

  function dismissKeyboard() {
    if (document.activeElement === input) input.blur();
  }

  function render() {
    const all = dataByMode.get(mode) || [];
    const terms = normalize(query).split(" ").filter(Boolean);
    const filtered = terms.length
      ? all.filter(item => {
          const title = normalize(item.title);
          return terms.every(term => title.includes(term));
        })
      : all;
    clear.hidden = !query;
    count.textContent = all.length ? `${filtered.length} of ${all.length}` : "";
    if (!filtered.length) {
      list.innerHTML = `<div class="ref-state">${all.length ? "Not Found" : MODES[mode].loading}</div>`;
      return;
    }
    list.innerHTML = filtered.map((item, index) => `
      <button class="ref-row" type="button" data-index="${index}">
        <span class="ref-name">${escapeHtml(item.title)}</span>
        <span class="ref-page">Page ${item.page}</span>
      </button>`).join("");
    list.__items = filtered;
  }

  async function loadMode(nextMode, { resetQuery = false } = {}) {
    mode = nextMode;
    const settings = MODES[mode];
    const token = ++loadToken;
    if (resetQuery) query = "";
    input.value = query;
    input.placeholder = settings.placeholder;
    toggles.forEach(button => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    setPanelTitle(settings.title);
    setHashState();
    if (dataByMode.has(mode)) {
      render();
      return;
    }
    count.textContent = "";
    list.innerHTML = `<div class="ref-state">${settings.loading}</div>`;
    try {
      const { getReferenceItems } = await referenceDataModule();
      const result = await getReferenceItems(mode);
      if (token !== loadToken) return;
      dataByMode.set(mode, result.items);
      render();
    } catch (error) {
      if (token !== loadToken) return;
      console.error(`${settings.title} loading failed`, error);
      list.innerHTML = `<div class="ref-state">${settings.error}</div>`;
    }
  }

  toggles.forEach(button => button.addEventListener("click", () => {
    if (button.dataset.mode === mode) return;
    dismissKeyboard();
    loadMode(button.dataset.mode, { resetQuery:true });
  }));
  input.addEventListener("input", () => {
    query = input.value;
    setHashState();
    render();
  });
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      dismissKeyboard();
    }
  });
  clear.addEventListener("click", () => {
    query = "";
    input.value = "";
    setHashState();
    render();
    input.focus();
  });
  list.addEventListener("click", event => {
    const row = event.target.closest(".ref-row");
    if (!row) return;
    dismissKeyboard();
    const item = list.__items?.[Number(row.dataset.index)];
    if (item) window.__AMBULANCE_OPEN_DOCUMENT_PAGE?.(item.page, item.title, "cpg");
  });
  list.addEventListener("touchmove", dismissKeyboard, { passive:true });
  list.addEventListener("wheel", dismissKeyboard, { passive:true });

  await loadMode(mode);
}
