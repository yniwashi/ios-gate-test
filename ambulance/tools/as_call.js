// /tools/as_call.js
// CHANGELOG (2026-05-18):
// - Restore dark-mode call button green and replace yellow dark header with neutral dark styling.
// - Adjust AS-Call dark-mode palette from brown amber to muted yellow.
// - Apply muted amber styling when the app is in auto dark mode and always show copy feedback on tap.
// - Soften AS-Call dark-mode yellow, dismiss keyboard on scroll, and show copied-number feedback.
// - Add in-app AS-Call directory loaded from the shared docs helper with search, filters, call, and copy actions.

function assetQuery() {
  const version = window.__AMBULANCE_ASSET_VERSION || "";
  return version ? `?ver=${encodeURIComponent(version)}` : "";
}

async function loadAsCallModule() {
  const shared = window.__AMBULANCE_SHARED_MODULES || {};
  return shared.asCallData || import(`../as_call_data.js${assetQuery()}`);
}

export async function run(root) {
  const { getAsCallContacts } = await loadAsCallModule();
  root.innerHTML = `
    <style>
      .as-wrap{padding:12px}
      .as-shell{display:flex;flex-direction:column;gap:12px}
      .as-hero{color:#161000;border:1px solid rgba(245,158,11,.35);border-radius:16px;background:linear-gradient(135deg,#fff7b8 0%,#ffdb00 45%,#f59e0b 100%);box-shadow:0 12px 28px rgba(245,158,11,.22);padding:14px}
      .as-hero-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
      .as-title{margin:0;font-size:20px;font-weight:950;letter-spacing:0;line-height:1.05}
      .as-count{flex:none;background:rgba(255,255,255,.52);border:1px solid rgba(255,255,255,.58);border-radius:999px;padding:6px 9px;font-size:12px;font-weight:950}
      .as-note{margin:7px 0 0;font-size:12px;font-weight:800;line-height:1.35;color:rgba(22,16,0,.74)}
      .as-controls{background:var(--surface,#fff);border:1px solid var(--border,#e7ecf3);border-radius:14px;padding:10px;box-shadow:0 8px 18px rgba(0,0,0,.10);display:flex;flex-direction:column;gap:9px}
      .as-search{display:flex;align-items:center;gap:9px;background:var(--surface,#f6f8fd);border:1px solid var(--border,#e7ecf3);border-radius:12px;padding:0 10px;min-height:44px}
      .as-search .material-symbols-rounded{font-size:22px;color:var(--muted,#6e7b91)}
      .as-search input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:var(--text,#0c1230);font:800 16px/1.2 system-ui;appearance:none}
      .as-search input::placeholder{color:var(--muted,#6e7b91);font-weight:650;font-size:14px}
      .as-clear{display:none;border:0;background:var(--surface,#f3f6fb);color:var(--muted,#6e7b91);width:28px;height:28px;border-radius:999px;font:900 16px/1 system-ui;align-items:center;justify-content:center}
      .as-clear.show{display:flex}
      .as-copy-note{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 18px);z-index:100000;transform:translate(-50%,14px);opacity:0;pointer-events:none;background:#111827;color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:9px 13px;font:900 13px/1 system-ui;box-shadow:0 12px 28px rgba(0,0,0,.28);transition:opacity .18s ease,transform .18s ease}
      .as-copy-note.show{opacity:1;transform:translate(-50%,0)}
      .as-filters{display:flex;gap:8px;overflow-x:auto;padding-bottom:1px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
      .as-filters::-webkit-scrollbar{display:none}
      .as-chip{flex:none;border:1px solid var(--border,#e7ecf3);background:var(--surface,#f6f8fd);color:var(--text,#0c1230);border-radius:999px;padding:7px 10px;font-size:12px;font-weight:950;white-space:nowrap}
      .as-chip[data-active="true"]{background:linear-gradient(180deg,#ffea94,#ffdb00);border-color:rgba(245,158,11,.48);color:#161000}
      .as-list{display:flex;flex-direction:column;gap:8px}
      .as-card{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--surface,#fff);border:1px solid var(--border,#e7ecf3);border-radius:14px;padding:11px;box-shadow:0 6px 14px rgba(0,0,0,.08)}
      .as-main{display:flex;align-items:center;gap:10px;min-width:0}
      .as-avatar{flex:none;width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#ffea94,#ffdb00);color:#161000;border:1px solid rgba(245,158,11,.35);font-weight:950;font-size:13px}
      .as-text{min-width:0;display:flex;flex-direction:column;gap:4px}
      .as-name{font-size:15px;font-weight:950;color:var(--text,#0c1230);line-height:1.15;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .as-number{font-size:13px;font-weight:850;color:var(--muted,#6e7b91);line-height:1.2}
      .as-actions{display:flex;gap:8px;flex:none}
      .as-btn{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:12px;border:1px solid var(--border,#dbe0ea);background:var(--surface,#f3f6fb);color:var(--text,#0c1230);text-decoration:none;cursor:pointer}
      .as-btn.call{background:linear-gradient(180deg,#16a34a,#15803d);border-color:transparent;color:#fff;box-shadow:0 8px 18px rgba(22,163,74,.26)}
      .as-btn .material-symbols-rounded{font-size:22px}
      .as-empty{background:var(--surface,#fff);border:1px dashed var(--border,#e7ecf3);border-radius:14px;padding:14px;color:var(--muted,#6e7b91);font-weight:850;line-height:1.35}
      :root[data-theme="dark"] .as-hero{color:#eef2ff;border-color:#232a37;background:linear-gradient(135deg,#171a21 0%,#151921 62%,#191d25 100%);box-shadow:0 12px 28px rgba(0,0,0,.24)}
      :root[data-theme="dark"] .as-title{color:#facc15}
      :root[data-theme="dark"] .as-note{color:#aab4cd}
      :root[data-theme="dark"] .as-count{background:rgba(0,0,0,.24);border-color:rgba(255,255,255,.16)}
      :root[data-theme="dark"] .as-controls,:root[data-theme="dark"] .as-card,:root[data-theme="dark"] .as-empty{background:#151921;border-color:#232a37}
      :root[data-theme="dark"] .as-search,:root[data-theme="dark"] .as-chip,:root[data-theme="dark"] .as-btn{background:#12151c;border-color:#232a37;color:#eef2ff}
      :root[data-theme="dark"] .as-avatar{background:rgba(250,204,21,.14);color:#fde68a;border-color:rgba(250,204,21,.24)}
      :root[data-theme="dark"] .as-chip[data-active="true"]{background:rgba(250,204,21,.16);color:#fde68a;border-color:rgba(250,204,21,.32)}
      :root[data-theme="dark"] .as-btn.call{background:linear-gradient(180deg,#16a34a,#15803d);border-color:transparent;color:#fff;box-shadow:0 8px 18px rgba(22,163,74,.26)}
      @media (prefers-color-scheme: dark){
        :root[data-theme="auto"] .as-hero{color:#eef2ff;border-color:#232a37;background:linear-gradient(135deg,#171a21 0%,#151921 62%,#191d25 100%);box-shadow:0 12px 28px rgba(0,0,0,.24)}
        :root[data-theme="auto"] .as-title{color:#facc15}
        :root[data-theme="auto"] .as-note{color:#aab4cd}
        :root[data-theme="auto"] .as-count{background:rgba(0,0,0,.24);border-color:rgba(255,255,255,.16)}
        :root[data-theme="auto"] .as-controls,:root[data-theme="auto"] .as-card,:root[data-theme="auto"] .as-empty{background:#151921;border-color:#232a37}
        :root[data-theme="auto"] .as-search,:root[data-theme="auto"] .as-chip,:root[data-theme="auto"] .as-btn{background:#12151c;border-color:#232a37;color:#eef2ff}
        :root[data-theme="auto"] .as-avatar{background:rgba(250,204,21,.14);color:#fde68a;border-color:rgba(250,204,21,.24)}
        :root[data-theme="auto"] .as-chip[data-active="true"]{background:rgba(250,204,21,.16);color:#fde68a;border-color:rgba(250,204,21,.32)}
        :root[data-theme="auto"] .as-btn.call{background:linear-gradient(180deg,#16a34a,#15803d);border-color:transparent;color:#fff;box-shadow:0 8px 18px rgba(22,163,74,.26)}
      }
    </style>
    <div class="as-wrap">
      <div class="as-shell">
        <section class="as-hero">
          <div class="as-hero-top">
            <h2 class="as-title">AS-Call</h2>
            <div class="as-count" id="asCount">Loading</div>
          </div>
          <p class="as-note">Tap the green phone button to call. iPhone will ask you to confirm before placing the call.</p>
        </section>
        <section class="as-controls">
          <label class="as-search" for="asSearch">
            <span class="material-symbols-rounded" aria-hidden="true">search</span>
            <input id="asSearch" type="search" inputmode="search" placeholder="Search name or number" autocomplete="off">
            <button id="asClear" class="as-clear" type="button" aria-label="Clear search">x</button>
          </label>
          <div id="asFilters" class="as-filters" aria-label="AS-Call categories"></div>
        </section>
        <section id="asList" class="as-list"><div class="as-empty">Loading AS-Call contacts...</div></section>
        <div id="asCopyNote" class="as-copy-note" role="status" aria-live="polite">Phone number copied</div>
      </div>
    </div>
  `;

  const listEl = root.querySelector("#asList");
  const searchEl = root.querySelector("#asSearch");
  const clearEl = root.querySelector("#asClear");
  const filtersEl = root.querySelector("#asFilters");
  const countEl = root.querySelector("#asCount");
  const copyNoteEl = root.querySelector("#asCopyNote");
  let contacts = [];
  let activeCategory = "All";
  let copyNoteTimer = 0;

  function escapeHtml(value) {
    return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  }

  function norm(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function initials(title) {
    return String(title || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
  }

  function displayNumber(number) {
    const raw = String(number || "");
    if (raw.length === 8) return `${raw.slice(0, 4)} ${raw.slice(4)}`;
    if (raw.length === 7) return `${raw.slice(0, 3)} ${raw.slice(3)}`;
    return raw;
  }

  function telUrl(number) {
    return `tel:${String(number || "").replace(/[^\d+]/g, "")}`;
  }

  function dismissKeyboard() {
    if (document.activeElement === searchEl) searchEl.blur();
  }

  function showCopyNote(message = "Phone number copied") {
    clearTimeout(copyNoteTimer);
    copyNoteEl.textContent = message;
    copyNoteEl.classList.add("show");
    copyNoteTimer = setTimeout(() => {
      copyNoteEl.classList.remove("show");
    }, 1500);
  }

  function renderFilters(items) {
    const categories = ["All", ...Array.from(new Set(items.map((item) => item.category || "Other"))).sort((a, b) => String(a).localeCompare(String(b)))];
    if (!categories.includes(activeCategory)) activeCategory = "All";
    filtersEl.innerHTML = categories.map((category) => `
      <button class="as-chip" type="button" data-category="${escapeHtml(category)}" data-active="${category === activeCategory ? "true" : "false"}">${escapeHtml(category)}</button>
    `).join("");
  }

  function render(items, query = "") {
    countEl.textContent = `${items.length} ${items.length === 1 ? "contact" : "contacts"}`;
    if (!items.length) {
      listEl.innerHTML = `<div class="as-empty">${query || activeCategory !== "All" ? "No contacts match your filters." : "No AS-Call contacts are available right now."}</div>`;
      return;
    }
    listEl.innerHTML = items.map((item) => `
      <article class="as-card">
        <div class="as-main">
          <div class="as-avatar" aria-hidden="true">${escapeHtml(initials(item.title))}</div>
          <div class="as-text">
            <div class="as-name">${escapeHtml(item.title)}</div>
            <div class="as-number">${escapeHtml(displayNumber(item.number))}</div>
          </div>
        </div>
        <div class="as-actions">
          <button class="as-btn" type="button" data-copy="${escapeHtml(item.number)}" aria-label="Copy ${escapeHtml(item.title)} number">
            <span class="material-symbols-rounded" aria-hidden="true">content_copy</span>
          </button>
          <a class="as-btn call" href="${escapeHtml(telUrl(item.number))}" aria-label="Call ${escapeHtml(item.title)}">
            <span class="material-symbols-rounded" aria-hidden="true">call</span>
          </a>
        </div>
      </article>
    `).join("");
  }

  function applyFilters() {
    const q = norm(searchEl.value);
    clearEl.classList.toggle("show", !!q);
    let filtered = contacts;
    if (activeCategory !== "All") filtered = filtered.filter((item) => (item.category || "Other") === activeCategory);
    if (q) filtered = filtered.filter((item) => norm(`${item.title} ${item.number} ${displayNumber(item.number)} ${item.category}`).includes(q));
    render(filtered, q);
  }

  searchEl.addEventListener("input", applyFilters);
  searchEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchEl.blur();
    }
  });
  listEl.addEventListener("touchstart", dismissKeyboard, { passive: true });
  listEl.addEventListener("wheel", dismissKeyboard, { passive: true });
  filtersEl.addEventListener("touchstart", dismissKeyboard, { passive: true });
  filtersEl.addEventListener("wheel", dismissKeyboard, { passive: true });
  clearEl.addEventListener("click", () => {
    searchEl.value = "";
    applyFilters();
    searchEl.focus();
  });
  filtersEl.addEventListener("click", (e) => {
    const chip = e.target.closest(".as-chip");
    if (!chip) return;
    activeCategory = chip.dataset.category || "All";
    renderFilters(contacts);
    applyFilters();
  });
  listEl.addEventListener("click", async (e) => {
    const copyBtn = e.target.closest("[data-copy]");
    if (!copyBtn) return;
    e.preventDefault();
    const number = copyBtn.dataset.copy || "";
    showCopyNote("Phone number copied");
    copyBtn.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">check</span>`;
    setTimeout(() => {
      copyBtn.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">content_copy</span>`;
    }, 1100);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(number);
      }
    } catch (_) {
      console.debug("Could not copy phone number:", number);
    }
  });

  try {
    contacts = await getAsCallContacts();
    renderFilters(contacts);
    applyFilters();
  } catch (err) {
    countEl.textContent = "Unavailable";
    listEl.innerHTML = `<div class="as-empty">Could not load AS-Call contacts. Please try again later. (${escapeHtml(err?.message || "Unknown error")})</div>`;
  }
}
