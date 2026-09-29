// ios/ambulance/tools/websites.js
// CHANGELOG (2026-09-29):
// - Keep Copy link feedback visible when it is mounted outside the Websites theme scope.
//
// CHANGELOG (2026-09-28):
// - Give website links the same Copy link / Open inside Ambulance App choices as CPD.
//
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
      .ws-item{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--surface,#fff);border:1px solid var(--border,#E1E7EF);border-radius:16px;padding:14px;box-shadow:0 5px 12px rgba(15,23,42,.06)}
      .ws-main{display:flex;align-items:center;gap:12px;min-width:0}
      .ws-icon{width:50px;height:50px;border-radius:14px;flex:none;background:#E6FFFB;border:0;display:flex;align-items:center;justify-content:center;overflow:hidden;color:var(--ws-accent);font-weight:950;font-size:18px}
      .ws-icon img{width:40px;height:40px;object-fit:contain;display:block}
      .ws-text{min-width:0;display:flex;flex-direction:column;gap:3px}
      .ws-name{font-size:16px;font-weight:950;color:var(--text,#0c1230);line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .ws-cat{font-size:11px;font-weight:950;color:var(--ws-accent);line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .ws-sub{font-size:13px;font-weight:750;color:#475467;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .ws-host{font-size:12px;font-weight:700;color:#98A2B3;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .ws-actions{display:flex;gap:8px;flex:none}
      .ws-open{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;background:var(--surface,#f3f6fb);border:1px solid var(--border,#dbe0ea);color:var(--text,#0c1230)}
      .ws-open:focus-visible,.ws-link-actions button:focus-visible{outline:2px solid var(--ws-accent);outline-offset:2px}
      .ws-link-dialog{box-sizing:border-box;width:100vw;max-width:none;height:100dvh;max-height:none;margin:0;padding:18px;border:0;background:rgba(15,23,42,.58);place-items:center;z-index:10000}
      .ws-link-dialog[open]{display:grid}.ws-link-dialog::backdrop{background:transparent}
      .ws-link-sheet{width:min(420px,100%);padding:20px;border:1px solid var(--border);border-radius:17px;background:var(--surface);color:var(--text);box-shadow:0 22px 54px rgba(2,6,23,.3)}
      .ws-link-sheet h3{margin:0 0 7px;font-size:18px}.ws-link-sheet p{margin:0 0 16px;color:var(--muted);font-size:13px;line-height:1.45}
      .ws-link-actions{display:grid;gap:9px}.ws-link-actions button{min-height:46px;padding:9px 12px;border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text);font:inherit;font-size:14px;font-weight:800;text-align:center}
      .ws-link-actions .ws-link-inside{background:var(--ws-accent);border-color:var(--ws-accent);color:#fff}.ws-link-actions .ws-link-cancel{background:transparent;color:var(--muted)}
      .ws-link-copy-fallback[hidden]{display:none}.ws-link-copy-fallback{margin-top:12px}.ws-link-copy-fallback p{margin:0 0 6px}
      .ws-link-copy-fallback input{box-sizing:border-box;width:100%;min-height:42px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font:inherit;font-size:12px}
      .ws-link-feedback{position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:10001;max-width:min(90vw,360px);padding:10px 14px;border-radius:10px;background:#0F766E;color:#fff;font-size:13px;font-weight:800;box-shadow:0 8px 24px rgba(2,6,23,.25);text-align:center;pointer-events:none}
      .material-symbols-rounded{font-variation-settings:'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24;font-size:20px}
      .ws-empty{background:var(--surface,#fff);border:1px dashed var(--border,#e7ecf3);border-radius:16px;padding:18px;color:var(--muted,#6e7b91);font-weight:850;line-height:1.35;text-align:center}
      :root[data-theme="dark"] .ws-card,:root[data-theme="dark"] .ws-item{box-shadow:none}
      :root[data-theme="dark"] .ws-item,:root[data-theme="dark"] .ws-empty,:root[data-theme="dark"] .ws-search,:root[data-theme="dark"] .ws-chip{background:#12151c;border-color:#232a37}
      :root[data-theme="dark"] .ws-open,:root[data-theme="dark"] .ws-icon,:root[data-theme="dark"] .ws-clear{background:#12151c;border-color:#232a37;color:#eef2ff}
      :root[data-theme="dark"] .ws-icon{background:rgba(15,118,110,.18);color:#5eead4}
      :root[data-theme="dark"] .ws-sub{color:#CBD5E1}:root[data-theme="dark"] .ws-host{color:#94A3B8}
      @media(prefers-color-scheme:dark){:root[data-theme="auto"] .ws-card,:root[data-theme="auto"] .ws-item{box-shadow:none}:root[data-theme="auto"] .ws-item,:root[data-theme="auto"] .ws-empty,:root[data-theme="auto"] .ws-search,:root[data-theme="auto"] .ws-chip{background:#12151c;border-color:#232a37}:root[data-theme="auto"] .ws-open,:root[data-theme="auto"] .ws-icon,:root[data-theme="auto"] .ws-clear{background:#12151c;border-color:#232a37;color:#eef2ff}:root[data-theme="auto"] .ws-icon{background:rgba(15,118,110,.18);color:#5eead4}:root[data-theme="auto"] .ws-sub{color:#CBD5E1}:root[data-theme="auto"] .ws-host{color:#94A3B8}}
      @media(max-width:390px){.ws-wrap{padding:12px 10px}.ws-item{padding:12px}.ws-icon{width:46px;height:46px}.ws-icon img{width:36px;height:36px}}
    </style>

    <div class="ws-wrap">
      <div class="ws-card">
        <div class="ws-head"><h3 class="ws-title">Directory</h3><div id="wsCount" class="ws-count">0 links</div></div>
        <p class="ws-note">
          Tip: If you press <strong>Open inside Ambulance App</strong> for a website link, swipe
          from left to right to return to Websites. Or press <strong>Copy link</strong> to paste
          it into another browser.
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
      <div id="wsLinkDialogHost"></div>
    </div>
  `;

  const wsList = mountEl.querySelector('#wsList');
  const wsSearch = mountEl.querySelector('#wsSearch');
  const wsClear = mountEl.querySelector('#wsClear');
  const wsFilters = mountEl.querySelector('#wsFilters');
  const wsCount = mountEl.querySelector('#wsCount');
  const dialogHost = mountEl.querySelector('#wsLinkDialogHost');
  let allSites = [];
  let activeCategory = 'All';
  let feedbackTimer;
  let linkFeedback;

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

  function safeUrl(value){
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : null;
    } catch (_) { return null; }
  }

  async function copyLink(url){
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(url); return true; }
      catch (_) {}
    }
    const input = document.createElement("textarea");
    input.value = url;
    input.setAttribute("readonly", "");
    input.style.cssText = "position:fixed;top:-1000px;left:-1000px";
    document.body.appendChild(input);
    input.select();
    input.setSelectionRange(0, input.value.length);
    let copied = false;
    try { copied = document.execCommand("copy"); }
    catch (_) {}
    input.remove();
    return copied;
  }

  function showLinkFeedback(message){
    linkFeedback?.remove();
    linkFeedback = document.createElement("div");
    linkFeedback.className = "ws-link-feedback";
    linkFeedback.setAttribute("role", "status");
    linkFeedback.textContent = message;
    document.body.appendChild(linkFeedback);
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => { linkFeedback?.remove(); linkFeedback = null; }, 2800);
  }

  function showLinkOptions(button, url, title){
    dialogHost.innerHTML = `<dialog class="ws-link-dialog" aria-labelledby="wsLinkTitle">
      <div class="ws-link-sheet">
        <h3 id="wsLinkTitle">${escapeHtml(title)}</h3>
        <p>Choose how to use this website link.</p>
        <div class="ws-link-actions">
          <button type="button" class="ws-link-copy">Copy link</button>
          <button type="button" class="ws-link-inside">Open inside Ambulance App</button>
          <button type="button" class="ws-link-cancel">Cancel</button>
        </div>
        <div class="ws-link-copy-fallback" hidden><p>Automatic copy is unavailable. Touch and hold this link to copy it.</p><input type="text" readonly value="${escapeHtml(url)}" aria-label="Website link to copy"></div>
      </div>
    </dialog>`;
    const dialog = dialogHost.querySelector("dialog");
    const close = () => {
      if (dialog?.open) dialog.close();
      dialogHost.innerHTML = "";
      button.focus();
    };
    if (typeof dialog?.showModal === "function") dialog.showModal();
    else dialog?.setAttribute("open", "");
    dialogHost.querySelector(".ws-link-cancel")?.addEventListener("click", close);
    dialogHost.querySelector(".ws-link-inside")?.addEventListener("click", () => {
      close();
      window.open(url, "_blank", "noopener,noreferrer");
    });
    dialogHost.querySelector(".ws-link-copy")?.addEventListener("click", async () => {
      if (await copyLink(url)) { close(); showLinkFeedback("Link copied"); }
      else {
        const fallback = dialogHost.querySelector(".ws-link-copy-fallback");
        fallback.hidden = false;
        fallback.querySelector("input").select();
      }
    });
    dialog?.addEventListener("click", (event) => { if (event.target === dialog) close(); });
    dialog?.addEventListener("cancel", (event) => { event.preventDefault(); close(); });
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
          <div class="ws-item" data-url="${encodeURIComponent(item.url)}">
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
              <button class="ws-open" type="button" aria-label="Open options for ${escapeHtml(item.title)}">
                <span class="material-symbols-rounded" aria-hidden="true">open_in_new</span>
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

  wsList.addEventListener('click', (e) => {
    const btn = e.target.closest('button.ws-open');
    if (!btn) return;
    const item = btn.closest('.ws-item');
    const url = safeUrl(decodeURIComponent(item?.dataset.url || ''));
    const title = item?.querySelector('.ws-name')?.textContent || 'Website';
    if (!url) return;
    showLinkOptions(btn, url, title);
  });

  try {
    allSites = await getWebsites();
    renderFilters(allSites);
    applyFilters();
  } catch (err) {
    wsList.innerHTML = `<div class="ws-empty">Could not load websites. Please try again later. (${escapeHtml(err?.message || 'Unknown error')})</div>`;
  }
}
