// ios/ambulance/tools/websites.js
// CHANGELOG (2026-06-06):
// - Dismiss the Websites search keyboard when the list or page scrolls.
// - Align Websites UI with Android directory/search/card layout while preserving iOS Open and Share actions.
//
// CHANGELOG (2026-05-17):
// - Load Websites from the shared docs helper instead of local JSON fallbacks.
// - Group website rows by category and render remote icons with graceful fallback.
// - Fit website icons inside smaller artwork bounds and share/copy only the URL.
// - Add website search field and category filter chips.
// - Sort category filters alphabetically.
// - Restore full Ambulance App navigation tip copy.
// - Show a single alphabetical list while keeping category chips as filters.
// - Load shared Websites module through the app ASSET_VERSION cache key.

function assetQuery() {
  const version = window.__AMBULANCE_ASSET_VERSION || "";
  return version ? `?ver=${encodeURIComponent(version)}` : "";
}

async function loadWebsitesModule() {
  const shared = window.__AMBULANCE_SHARED_MODULES || {};
  return shared.websitesData || import(`../websites_data.js${assetQuery()}`);
}

export async function run(mountEl){
  const { getWebsites } = await loadWebsitesModule();
  mountEl.innerHTML = `
    <style>
      .ws-wrap{max-width:760px;margin:0 auto;padding:14px;color:var(--text);--ws-accent:#0F766E}
      .ws-card{background:var(--surface,#fff);border:1px solid var(--border,#e7ecf3);border-radius:16px;padding:14px;box-shadow:0 8px 18px rgba(15,23,42,.10);margin-bottom:12px}
      .ws-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
      .ws-title{margin:0;font-weight:950;font-size:18px;color:var(--text,#0c1230)}
      .ws-count{color:var(--ws-accent);font-size:12px;font-weight:950}
      .ws-note{margin:8px 0 0;font-size:12px;line-height:1.45;color:var(--muted,#6e7b91);font-weight:750}
      .ws-controls{display:flex;flex-direction:column;gap:10px;margin-bottom:12px}
      .ws-search{display:flex;align-items:center;gap:8px;background:var(--surface,#fff);border:1px solid var(--border,#C7D0DD);border-radius:10px;padding:0 11px;min-height:54px}
      .ws-search .material-symbols-rounded{font-size:21px;color:var(--ws-accent)}
      .ws-search input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:var(--text,#0c1230);font:800 16px/1.2 system-ui;appearance:none}
      .ws-search input::placeholder{color:#667085;font-weight:650;font-size:14px}
      .ws-clear{display:none;border:0;background:var(--surface,#f3f6fb);color:var(--muted,#6e7b91);width:28px;height:28px;border-radius:999px;font:900 16px/1 system-ui;align-items:center;justify-content:center}
      .ws-clear.show{display:flex}
      .ws-filters{display:flex;gap:8px;overflow-x:auto;padding:2px 0 3px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
      .ws-filters::-webkit-scrollbar{display:none}
      .ws-chip{flex:none;border:1px solid var(--border,#e7ecf3);background:var(--surface,#fff);color:var(--text,#0c1230);border-radius:14px;padding:8px 11px;font-size:12px;font-weight:950;white-space:nowrap}
      .ws-chip[data-active="true"]{background:var(--ws-accent);border-color:transparent;color:#fff}
      .ws-list{display:flex;flex-direction:column;gap:8px}
      .ws-item{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--surface,#fff);border:1px solid var(--border,#E1E7EF);border-radius:16px;padding:14px;cursor:pointer;box-shadow:0 5px 12px rgba(15,23,42,.06)}
      .ws-main{display:flex;align-items:center;gap:12px;min-width:0}
      .ws-icon{width:50px;height:50px;border-radius:14px;flex:none;background:#E6FFFB;border:0;display:flex;align-items:center;justify-content:center;overflow:hidden;color:var(--ws-accent);font-weight:950;font-size:18px}
      .ws-icon img{width:40px;height:40px;object-fit:contain;display:block}
      .ws-text{min-width:0;display:flex;flex-direction:column;gap:3px}
      .ws-name{font-size:16px;font-weight:950;color:var(--text,#0c1230);line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .ws-cat{font-size:11px;font-weight:950;color:var(--ws-accent);line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .ws-sub{font-size:13px;font-weight:750;color:#475467;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .ws-host{font-size:12px;font-weight:700;color:#98A2B3;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .ws-actions{display:flex;gap:8px;flex:none}
      .ws-open{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:12px;background:var(--surface,#f3f6fb);border:1px solid var(--border,#dbe0ea);color:var(--text,#0c1230)}
      .material-symbols-rounded{font-variation-settings:'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24;font-size:20px}
      .ws-empty{background:var(--surface,#fff);border:1px dashed var(--border,#e7ecf3);border-radius:16px;padding:18px;color:var(--muted,#6e7b91);font-weight:850;line-height:1.35;text-align:center}
      :root[data-theme="dark"] .ws-card,:root[data-theme="dark"] .ws-item{box-shadow:none}
      :root[data-theme="dark"] .ws-item,:root[data-theme="dark"] .ws-empty,:root[data-theme="dark"] .ws-search,:root[data-theme="dark"] .ws-chip{background:#12151c;border-color:#232a37}
      :root[data-theme="dark"] .ws-open,:root[data-theme="dark"] .ws-icon,:root[data-theme="dark"] .ws-clear{background:#12151c;border-color:#232a37;color:#eef2ff}
      :root[data-theme="dark"] .ws-icon{background:rgba(15,118,110,.18);color:#5eead4}
      :root[data-theme="dark"] .ws-sub{color:#CBD5E1}:root[data-theme="dark"] .ws-host{color:#94A3B8}
      @media(prefers-color-scheme:dark){:root[data-theme="auto"] .ws-card,:root[data-theme="auto"] .ws-item{box-shadow:none}:root[data-theme="auto"] .ws-item,:root[data-theme="auto"] .ws-empty,:root[data-theme="auto"] .ws-search,:root[data-theme="auto"] .ws-chip{background:#12151c;border-color:#232a37}:root[data-theme="auto"] .ws-open,:root[data-theme="auto"] .ws-icon,:root[data-theme="auto"] .ws-clear{background:#12151c;border-color:#232a37;color:#eef2ff}:root[data-theme="auto"] .ws-icon{background:rgba(15,118,110,.18);color:#5eead4}:root[data-theme="auto"] .ws-sub{color:#CBD5E1}:root[data-theme="auto"] .ws-host{color:#94A3B8}}
      @media(max-width:390px){.ws-wrap{padding:12px 10px}.ws-item{padding:12px}.ws-icon{width:46px;height:46px}.ws-icon img{width:36px;height:36px}.ws-actions{gap:6px}.ws-open{width:36px;height:36px}}
    </style>

    <div class="ws-wrap">
      <div class="ws-card">
        <div class="ws-head"><h3 class="ws-title">Directory</h3><div id="wsCount" class="ws-count">0 links</div></div>
        <p class="ws-note">
          Tip: If you choose to open a site inside the Ambulance App, you can swipe from
          left to right to go back. Or use the <strong>Share</strong> button to open the link
          in Safari or copy it to another browser.
        </p>
      </div>
      <div class="ws-card">
        <div class="ws-controls">
          <label class="ws-search" for="wsSearch">
            <span class="material-symbols-rounded" aria-hidden="true">search</span>
            <input id="wsSearch" type="search" inputmode="search" placeholder="Search websites" autocomplete="off">
            <button id="wsClear" class="ws-clear" type="button" aria-label="Clear search">x</button>
          </label>
          <div id="wsFilters" class="ws-filters" aria-label="Website categories"></div>
        </div>
        <div id="wsList" class="ws-list"><div class="ws-empty">Loading websites...</div></div>
      </div>
    </div>
  `;

  const wsList = mountEl.querySelector('#wsList');
  const wsSearch = mountEl.querySelector('#wsSearch');
  const wsClear = mountEl.querySelector('#wsClear');
  const wsFilters = mountEl.querySelector('#wsFilters');
  const wsCount = mountEl.querySelector('#wsCount');
  let allSites = [];
  let activeCategory = 'All';

  function escapeHtml(value){
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function fallbackLetter(title){
    const c = String(title || "?").trim().charAt(0).toUpperCase();
    return c || "?";
  }

  function norm(value){
    return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function hostOf(url){
    try { return new URL(url).hostname.replace(/^www\./, ""); }
    catch (_) { return ""; }
  }

  function renderFilters(items){
    const categories = ["All", ...Array.from(new Set(items.map((item) => item.category || "Other"))).sort((a, b) => String(a).localeCompare(String(b)))];
    if (!categories.includes(activeCategory)) activeCategory = "All";
    wsFilters.innerHTML = categories.map((category) => `
      <button class="ws-chip" type="button" data-category="${escapeHtml(category)}" data-active="${category === activeCategory ? "true" : "false"}">${escapeHtml(category)}</button>
    `).join("");
  }

  function applyFilters(){
    const q = norm(wsSearch.value);
    wsClear.classList.toggle("show", !!q);
    let filtered = allSites;
    if (activeCategory !== "All") filtered = filtered.filter((item) => (item.category || "Other") === activeCategory);
    if (q) {
      filtered = filtered.filter((item) => norm([item.title, item.subtitle, item.category, item.url].join(" ")).includes(q));
    }
    render(filtered, q);
  }

  function render(items, query = ""){
    wsCount.textContent = `${items.length} ${items.length === 1 ? "link" : "links"}`;
    if (!items.length) {
      wsList.innerHTML = `<div class="ws-empty">${query || activeCategory !== "All" ? "No websites match your filters." : "No websites are available right now."}</div>`;
      return;
    }

    wsList.innerHTML = [...items].sort((a, b) => String(a.title).localeCompare(String(b.title))).map((item) => `
          <div class="ws-item" data-url="${encodeURIComponent(item.url)}" data-title="${escapeHtml(item.title)}">
            <div class="ws-main">
              <div class="ws-icon" aria-hidden="true">
                ${item.icon_url ? `<img src="${escapeHtml(item.icon_url)}" alt="" loading="lazy" decoding="async" onerror="this.remove();this.parentElement.textContent='${escapeHtml(fallbackLetter(item.title))}'">` : escapeHtml(fallbackLetter(item.title))}
              </div>
              <div class="ws-text">
                <div class="ws-name">${escapeHtml(item.title)}</div>
                <div class="ws-cat">${escapeHtml(item.category || "Websites")}</div>
                ${item.subtitle ? `<div class="ws-sub">${escapeHtml(item.subtitle)}</div>` : ``}
                ${hostOf(item.url) ? `<div class="ws-host">${escapeHtml(hostOf(item.url))}</div>` : ``}
              </div>
            </div>
            <div class="ws-actions">
              <button class="ws-open" data-action="open" aria-label="Open ${escapeHtml(item.title)}">
                <span class="material-symbols-rounded" aria-hidden="true">open_in_new</span>
              </button>
              <button class="ws-open" data-action="share" aria-label="Share ${escapeHtml(item.title)}">
                <span class="material-symbols-rounded" aria-hidden="true">ios_share</span>
              </button>
            </div>
          </div>
    `).join('');
  }

  wsSearch.addEventListener("input", applyFilters);
  wsSearch.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      wsSearch.blur();
    }
  });
  mountEl.addEventListener("touchmove", () => {
    if (document.activeElement === wsSearch) wsSearch.blur();
  }, { passive: true });
  mountEl.addEventListener("wheel", () => {
    if (document.activeElement === wsSearch) wsSearch.blur();
  }, { passive: true });
  wsClear.addEventListener("click", () => {
    wsSearch.value = "";
    applyFilters();
    wsSearch.focus();
  });
  wsFilters.addEventListener("click", (e) => {
    const chip = e.target.closest(".ws-chip");
    if (!chip) return;
    activeCategory = chip.dataset.category || "All";
    renderFilters(allSites);
    applyFilters();
  });

  wsList.addEventListener('click', async (e) => {
    const btn = e.target.closest('button.ws-open');
    if (!btn) return;
    const item = btn.closest('.ws-item');
    const url = decodeURIComponent(item?.dataset.url || '');
    const title = item?.dataset.title || 'Website';
    if (!url) return;

    if (btn.dataset.action === 'open') {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({ url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        alert('Link copied. Paste into Safari to open.');
      } else {
        location.href = url;
      }
    } catch (err) {
      console.debug('Share cancelled:', err);
    }
  });

  try {
    allSites = await getWebsites();
    renderFilters(allSites);
    applyFilters();
  } catch (err) {
    wsList.innerHTML = `<div class="ws-empty">Could not load websites. Please try again later. (${escapeHtml(err?.message || 'Unknown error')})</div>`;
  }
}
