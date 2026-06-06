// /ambulance/tools/as_call.js
// CHANGELOG (2026-06-07):
// - Mount the call confirmation overlay at document level so it stays viewport-centered after scrolling.
//
// CHANGELOG (2026-06-06):
// - Rebuild AS-Call to match Android: search-only directory, contact rows, keyboard dismissal, and call confirmation dialog.
//
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

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
}

function norm(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function displayNumber(number) {
  return String(number || "").trim();
}

function telUrl(number) {
  return `tel:${String(number || "").replace(/[^\d+#*+]/g, "")}`;
}

export async function run(root) {
  const { getAsCallContacts } = await loadAsCallModule();
  let contacts = [];
  let visibleContacts = [];
  let selectedContact = null;

  root.innerHTML = `
    <style>
      .as-wrap{max-width:760px;margin:0 auto;padding:14px;color:var(--text);--as-yellow:#FFDB00;--as-dark:#241A00;--as-accent:#8A6500}
      .as-card{border:1px solid var(--border);border-radius:16px;background:var(--surface);box-shadow:0 8px 18px rgba(15,23,42,.10);padding:14px;margin-bottom:14px}
      .as-search-shell{position:relative}
      .as-search-icon{position:absolute;left:13px;top:50%;transform:translateY(-50%);font-size:22px;color:var(--as-accent)}
      .as-search{box-sizing:border-box;width:100%;min-height:54px;border:1px solid #C7D0DD;border-radius:14px;background:var(--surface);color:var(--text);font-size:15px;font-weight:850;outline:none;padding:12px 44px}
      .as-search::placeholder{color:#667085;font-weight:700}.as-search:focus{border-color:var(--as-accent);box-shadow:0 0 0 3px rgba(255,219,0,.22)}
      .as-clear{position:absolute;right:9px;top:50%;transform:translateY(-50%);display:none;width:30px;height:30px;border:0;border-radius:50%;background:var(--surface-2);color:var(--muted);font-size:16px;font-weight:950}.as-clear.show{display:block}
      .as-dir-row{display:flex;align-items:center;gap:10px;margin:14px 0 10px}.as-dir-title{flex:1;color:var(--text);font-size:17px;font-weight:950}.as-count{color:var(--as-accent);font-size:12px;font-weight:950}
      .as-list{display:grid;gap:8px}.as-contact{display:flex;align-items:center;gap:12px;width:100%;min-height:62px;border:1px solid var(--border);border-radius:14px;background:var(--surface);box-shadow:0 5px 12px rgba(15,23,42,.08);padding:10px 14px;text-align:left;color:var(--text)}
      .as-contact:active{transform:translateY(1px)}.as-copy{flex:1;min-width:0}.as-name{display:block;color:var(--text);font-size:15px;font-weight:950;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.as-number{display:block;margin-top:6px;color:#667085;font-size:13px;font-weight:750}
      .as-phone-badge{display:grid;place-items:center;flex:0 0 36px;width:36px;height:36px;border-radius:12px;background:linear-gradient(180deg,#fff6bd,#ffdb00);border:1px solid rgba(138,101,0,.20);color:var(--as-accent)}.as-phone-badge .material-symbols-rounded{font-size:22px}
      .as-empty{display:none;margin-top:18px;text-align:center;color:var(--muted);font-size:15px;font-weight:850}.as-empty.show{display:block}
      .as-modal{position:fixed;inset:0;z-index:1300;display:grid;place-items:center;background:rgba(15,23,42,.58);padding:18px}.as-dialog{width:min(420px,100%);overflow:hidden;border-radius:18px;background:var(--surface);box-shadow:0 22px 54px rgba(2,6,23,.36);border:1px solid var(--border)}
      .as-dialog-head{display:flex;align-items:center;gap:14px;background:linear-gradient(180deg,#fff3a6,#ffdb00);padding:18px}.as-dialog-badge{display:grid;place-items:center;flex:0 0 52px;width:52px;height:52px;border-radius:15px;background:rgba(255,255,255,.45);border:1px solid rgba(138,101,0,.18);color:var(--as-accent)}.as-dialog-badge .material-symbols-rounded{font-size:29px}
      .as-dialog-title{margin:0;color:var(--as-dark);font-size:21px;font-weight:950;line-height:1.15}.as-dialog-subtitle{margin:5px 0 0;color:#6D4B00;font-size:13px;font-weight:750}.as-dialog-body{padding:18px}
      .as-dialog-number{border-radius:14px;background:var(--surface-2);border:1px solid var(--border);padding:14px;text-align:center;color:var(--text);font-size:18px;font-weight:950}.as-dialog-actions{display:grid;gap:10px;margin-top:16px}.as-confirm,.as-cancel{height:48px;border:0;border-radius:14px;font-size:14px;font-weight:950}.as-confirm{background:linear-gradient(180deg,#fff0a0,#ffdb00);color:var(--as-dark)}.as-cancel{background:var(--surface-2);border:1px solid var(--border);color:var(--text)}
      :root[data-theme="dark"] .as-card,:root[data-theme="dark"] .as-contact{box-shadow:none}:root[data-theme="dark"] .as-contact{background:#151921;border-color:#232a37}:root[data-theme="dark"] .as-number{color:#aab4cd}:root[data-theme="dark"] .as-phone-badge{background:rgba(250,204,21,.14);color:#fde68a;border-color:rgba(250,204,21,.24)}:root[data-theme="dark"] .as-dialog-head{background:linear-gradient(180deg,#2b2614,#1f1b10)}:root[data-theme="dark"] .as-dialog-title{color:#fde68a}:root[data-theme="dark"] .as-dialog-subtitle{color:#d6c177}:root[data-theme="dark"] .as-confirm{background:linear-gradient(180deg,#facc15,#d9a80f)}
      @media(prefers-color-scheme:dark){:root[data-theme="auto"] .as-card,:root[data-theme="auto"] .as-contact{box-shadow:none}:root[data-theme="auto"] .as-contact{background:#151921;border-color:#232a37}:root[data-theme="auto"] .as-number{color:#aab4cd}:root[data-theme="auto"] .as-phone-badge{background:rgba(250,204,21,.14);color:#fde68a;border-color:rgba(250,204,21,.24)}:root[data-theme="auto"] .as-dialog-head{background:linear-gradient(180deg,#2b2614,#1f1b10)}:root[data-theme="auto"] .as-dialog-title{color:#fde68a}:root[data-theme="auto"] .as-dialog-subtitle{color:#d6c177}:root[data-theme="auto"] .as-confirm{background:linear-gradient(180deg,#facc15,#d9a80f)}}
      @media(max-width:380px){.as-wrap{padding:12px 10px}.as-contact{padding:10px 12px}.as-dialog-head{padding:16px}.as-dialog-body{padding:16px}}
    </style>
    <section class="as-wrap">
      <section class="as-card">
        <label class="as-search-shell" for="asSearch">
          <span class="material-symbols-rounded as-search-icon" aria-hidden="true">search</span>
          <input id="asSearch" class="as-search" type="search" inputmode="search" placeholder="Search name or number" autocomplete="off">
          <button id="asClear" class="as-clear" type="button" aria-label="Clear search">x</button>
        </label>
      </section>
      <div class="as-dir-row">
        <div class="as-dir-title">Directory</div>
        <div id="asCount" class="as-count">0 contacts</div>
      </div>
      <section id="asList" class="as-list"></section>
      <div id="asEmpty" class="as-empty">No contacts found</div>
    </section>
  `;

  const searchEl = root.querySelector("#asSearch");
  const clearEl = root.querySelector("#asClear");
  const countEl = root.querySelector("#asCount");
  const listEl = root.querySelector("#asList");
  const emptyEl = root.querySelector("#asEmpty");
  document.querySelector("[data-as-call-modal-host]")?.remove();
  const modalHost = document.createElement("div");
  modalHost.dataset.asCallModalHost = "";
  document.body.appendChild(modalHost);

  function dismissKeyboard() {
    if (document.activeElement === searchEl) searchEl.blur();
  }

  function updateCount(count) {
    countEl.textContent = `${count} contacts`;
  }

  function filterContacts(query) {
    const q = norm(query);
    visibleContacts = q
      ? contacts.filter(contact => norm(contact.title).includes(q) || norm(contact.number).includes(q))
      : contacts;
    renderContacts();
  }

  function renderContacts() {
    updateCount(visibleContacts.length);
    clearEl.classList.toggle("show", !!searchEl.value.trim());
    emptyEl.textContent = contacts.length ? "No contacts found" : "Unable to load contacts";
    emptyEl.classList.toggle("show", !visibleContacts.length);
    listEl.innerHTML = visibleContacts.map(contact => `
      <button class="as-contact" type="button" data-contact="${esc(contact.id)}">
        <span class="as-copy">
          <span class="as-name">${esc(contact.title)}</span>
          <span class="as-number">${esc(displayNumber(contact.number))}</span>
        </span>
        <span class="as-phone-badge" aria-hidden="true"><span class="material-symbols-rounded">call</span></span>
      </button>
    `).join("");
  }

  function closeDialog() {
    selectedContact = null;
    modalHost.innerHTML = "";
    document.body.style.overflow = "";
  }

  function showCallConfirmation(contact) {
    dismissKeyboard();
    selectedContact = contact;
    document.body.style.overflow = "hidden";
    modalHost.innerHTML = `
      <div class="as-modal" role="dialog" aria-modal="true" aria-label="Confirm AS-Call">
        <div class="as-dialog">
          <div class="as-dialog-head">
            <div class="as-dialog-badge" aria-hidden="true"><span class="material-symbols-rounded">call</span></div>
            <div>
              <h3 class="as-dialog-title">Call ${esc(contact.title)}?</h3>
              <p class="as-dialog-subtitle">Confirm before opening the dialer</p>
            </div>
          </div>
          <div class="as-dialog-body">
            <div class="as-dialog-number">${esc(displayNumber(contact.number))}</div>
            <div class="as-dialog-actions">
              <button id="asConfirmCall" class="as-confirm" type="button">Call</button>
              <button id="asCancelCall" class="as-cancel" type="button">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    `;
    modalHost.querySelector("#asConfirmCall")?.addEventListener("click", () => {
      const target = selectedContact;
      closeDialog();
      if (target) window.location.href = telUrl(target.number);
    });
    modalHost.querySelector("#asCancelCall")?.addEventListener("click", closeDialog);
    modalHost.querySelector(".as-modal")?.addEventListener("click", event => {
      if (event.target.classList.contains("as-modal")) closeDialog();
    });
  }

  window.addEventListener("hashchange", closeDialog, { once: true });

  searchEl.addEventListener("input", () => filterContacts(searchEl.value));
  searchEl.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      dismissKeyboard();
    }
  });
  clearEl.addEventListener("click", () => {
    searchEl.value = "";
    filterContacts("");
    searchEl.focus();
  });
  listEl.addEventListener("click", event => {
    const button = event.target.closest(".as-contact");
    if (!button) return;
    const contact = contacts.find(item => item.id === button.dataset.contact);
    if (contact) showCallConfirmation(contact);
  });
  listEl.addEventListener("touchstart", dismissKeyboard, { passive: true });
  listEl.addEventListener("wheel", dismissKeyboard, { passive: true });
  root.addEventListener("touchmove", dismissKeyboard, { passive: true });

  try {
    contacts = await getAsCallContacts();
    visibleContacts = contacts;
    renderContacts();
  } catch (_) {
    contacts = [];
    visibleContacts = [];
    updateCount(0);
    emptyEl.textContent = "Unable to load contacts";
    emptyEl.classList.add("show");
  }
}
