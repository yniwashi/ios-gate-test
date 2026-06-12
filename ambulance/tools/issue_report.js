// /ambulance/tools/issue_report.js
// CHANGELOG (2026-06-07):
// - Keep one Share Diagnostics File action and replace native alerts with an App-styled email instruction dialog.
// - Add the Android-aligned Report Issue form and user-safe diagnostic JSON sharing.

const SUPPORT_EMAIL = "support@niwashibase.com";
const PROBLEMS = [
  "App crashed",
  "Feature not working",
  "Data not loading",
  "Wrong calculation/result",
  "PDF/search problem",
  "Notification problem",
  "Other"
];
const AREAS = [
  "Pediatrics",
  "Guidelines/PDF",
  "CPR",
  "Overtime",
  "AS-Call",
  "HOS",
  "Websites",
  "Main screen",
  "Other"
];

function optionMarkup(items) {
  return items.map(item => `<option value="${item}">${item}</option>`).join("");
}

function currentValue(select, input) {
  return select.value === "Other"
    ? (input.value.trim() || "Other")
    : select.value;
}

function toast(root, message) {
  const node = root.querySelector("#issueToast");
  if (!node) return;
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("show"), 2200);
}

function showShareInstructions(root, emailCopied) {
  const host = root.querySelector("#issueDialogHost");
  if (!host) return Promise.resolve(false);
  return new Promise(resolve => {
    host.innerHTML = `
      <div class="issue-dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="issueDialogTitle">
        <div class="issue-dialog-card">
          <div class="issue-dialog-head">
            <span class="material-symbols-rounded" aria-hidden="true">support_agent</span>
            <div>
              <h3 id="issueDialogTitle">Send to App Support</h3>
              <p>Share the diagnostics file through Mail or another app.</p>
            </div>
          </div>
          <div class="issue-dialog-body">
            <p>${emailCopied
              ? "The support email address was copied. Paste it into the recipient field if needed."
              : "Copy the support email address below and use it as the recipient."}</p>
            <button class="issue-email-copy" type="button" data-copy-support-email>
              <span>${SUPPORT_EMAIL}</span>
              <span class="material-symbols-rounded" aria-hidden="true">content_copy</span>
            </button>
            <div class="issue-dialog-actions">
              <button class="issue-dialog-cancel" type="button" data-dialog-cancel>Cancel</button>
              <button class="issue-dialog-continue" type="button" data-dialog-continue>Continue</button>
            </div>
          </div>
        </div>
      </div>`;
    const finish = value => {
      host.innerHTML = "";
      resolve(value);
    };
    host.querySelector("[data-dialog-cancel]")?.addEventListener("click", () => finish(false));
    host.querySelector("[data-dialog-continue]")?.addEventListener("click", () => finish(true));
    host.querySelector("[data-copy-support-email]")?.addEventListener("click", async () => {
      const copied = await copyText(SUPPORT_EMAIL);
      toast(root, copied ? "Support email copied" : "Touch and hold the email address to copy it");
    });
  });
}

async function statusModule() {
  if (window.__AMBULANCE_SHARED_MODULES?.appStatus) {
    return window.__AMBULANCE_SHARED_MODULES.appStatus;
  }
  const version = encodeURIComponent(window.__AMBULANCE_ASSET_VERSION || "current");
  return import(`../app_status.js?ver=${version}`);
}

async function reportData(root) {
  const { buildAppStatus } = await statusModule();
  const status = await buildAppStatus({ includeAdmin: false });
  const problem = root.querySelector("#issueProblem");
  const problemOther = root.querySelector("#issueProblemOther");
  const area = root.querySelector("#issueArea");
  const areaOther = root.querySelector("#issueAreaOther");
  status.issue_report = {
    problem: currentValue(problem, problemOther),
    area: currentValue(area, areaOther),
    description: root.querySelector("#issueDescription").value.trim() || "Not provided",
    phone: root.querySelector("#issuePhone").value.trim() || "Not provided"
  };
  return status;
}

function copyTextFallback(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch (_) {}
  textarea.remove();
  return copied;
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {}
  }
  return copyTextFallback(text);
}

async function shareFile(root) {
  const { jsonFile, statusFilename } = await statusModule();
  const data = await reportData(root);
  const file = jsonFile(data, statusFilename("ambulance_issue_report"));
  const shareData = { files: [file] };
  const emailCopied = await copyText(SUPPORT_EMAIL);
  if (!await showShareInstructions(root, emailCopied)) return;
  try {
    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      await navigator.share(shareData);
      return;
    }
  } catch (error) {
    if (error?.name === "AbortError") return;
  }
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast(root, `Diagnostic file downloaded. Send it to ${SUPPORT_EMAIL}.`);
}

export async function run(root) {
  root.innerHTML = `
    <style>
      .issue-screen{min-height:100%;padding:16px;background:var(--bg);box-sizing:border-box}
      .issue-wrap{width:min(100%,620px);margin:0 auto;color:var(--text)}
      .issue-note{margin:0;padding:14px;border:1px solid #bfdbfe;border-radius:8px;background:#eff6ff;color:#374151;font-size:14px;line-height:1.45}
      .issue-field{display:grid;gap:6px;margin-top:14px}.issue-field label{font-size:13px;font-weight:900;color:var(--text)}
      .issue-field select,.issue-field input,.issue-field textarea{appearance:none;box-sizing:border-box;width:100%;border:1.5px solid #93c5fd;border-radius:8px;background:var(--surface);color:var(--text);font:700 14px/1.3 system-ui;padding:0 12px;outline:none}
      .issue-field select,.issue-field input{height:50px}.issue-field select{padding-right:42px;background-image:url("images/chevron-down.svg");background-repeat:no-repeat;background-position:right 14px center;background-size:18px}
      .issue-field textarea{height:100px;padding:12px;resize:vertical}.issue-field :focus{border-color:#0d63b2;box-shadow:0 0 0 3px rgba(13,99,178,.12)}
      .issue-other[hidden]{display:none}.issue-send-title{margin:18px 0 0;font-size:14px;font-weight:950}.issue-send-copy{margin:3px 0 10px;color:var(--muted);font-size:12px;line-height:1.4}
      .issue-actions{display:grid;gap:10px}.issue-action{appearance:none;min-height:50px;border:0;border-radius:8px;background:#0d63b2;color:#fff;font:900 14px/1 system-ui;display:flex;align-items:center;justify-content:center;gap:7px;padding:8px;cursor:pointer}
      .issue-action .material-symbols-rounded{font-size:21px}.issue-action.full{grid-column:1/-1;font-size:14px}.issue-action:active{transform:scale(.985)}
      .issue-toast{position:fixed;left:50%;bottom:calc(22px + env(safe-area-inset-bottom));z-index:100001;max-width:calc(100vw - 36px);padding:10px 14px;border-radius:8px;background:#111827;color:#fff;font-size:12px;font-weight:850;opacity:0;transform:translate(-50%,10px);pointer-events:none;transition:.18s}
      .issue-toast.show{opacity:1;transform:translate(-50%,0)}
      .issue-dialog-overlay{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:20px;background:rgba(15,23,42,.58)}
      .issue-dialog-card{width:min(100%,430px);overflow:hidden;border:1px solid var(--border);border-radius:16px;background:var(--surface);color:var(--text);box-shadow:0 22px 54px rgba(2,6,23,.35)}
      .issue-dialog-head{display:flex;align-items:center;gap:12px;padding:16px;background:linear-gradient(135deg,#0d63b2,#0a96fa);color:#fff}.issue-dialog-head>.material-symbols-rounded{font-size:32px}.issue-dialog-head h3{margin:0;font-size:18px;font-weight:950}.issue-dialog-head p{margin:3px 0 0;color:#eaf5ff;font-size:12px;line-height:1.35}
      .issue-dialog-body{padding:16px}.issue-dialog-body>p{margin:0 0 12px;color:var(--muted);font-size:13px;line-height:1.45}
      .issue-email-copy{appearance:none;box-sizing:border-box;width:100%;min-height:48px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid #93c5fd;border-radius:8px;background:#eff6ff;color:#0d63b2;font:900 14px/1.2 system-ui;text-align:left;user-select:text;-webkit-user-select:text}.issue-email-copy .material-symbols-rounded{flex:none;font-size:21px}
      .issue-dialog-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}.issue-dialog-actions button{min-height:46px;border-radius:8px;font:900 14px/1 system-ui}.issue-dialog-cancel{border:1px solid var(--border);background:var(--surface-2);color:var(--text)}.issue-dialog-continue{border:0;background:#0d63b2;color:#fff}
      [data-theme="dark"] .issue-note{border-color:#315878;background:#17283a;color:#d9e8f6}
      [data-theme="dark"] .issue-field select,[data-theme="dark"] .issue-field input,[data-theme="dark"] .issue-field textarea{border-color:#416b8c;background:#171d26}
      [data-theme="dark"] .issue-email-copy{border-color:#315878;background:#17283a;color:#89c8ff}
      @media(prefers-color-scheme:dark){[data-theme="auto"] .issue-note{border-color:#315878;background:#17283a;color:#d9e8f6}[data-theme="auto"] .issue-field select,[data-theme="auto"] .issue-field input,[data-theme="auto"] .issue-field textarea{border-color:#416b8c;background:#171d26}[data-theme="auto"] .issue-email-copy{border-color:#315878;background:#17283a;color:#89c8ff}}
    </style>
    <section class="issue-screen">
      <div class="issue-wrap">
        <p class="issue-note">Tell app support what happened. Choose the problem area, add a short description, and include a contact number only if you want a reply.</p>
        <div class="issue-field">
          <label for="issueProblem">Problem</label>
          <select id="issueProblem">${optionMarkup(PROBLEMS)}</select>
          <input id="issueProblemOther" class="issue-other" type="text" placeholder="Type the problem" autocomplete="off" hidden>
        </div>
        <div class="issue-field">
          <label for="issueArea">Area</label>
          <select id="issueArea">${optionMarkup(AREAS)}</select>
          <input id="issueAreaOther" class="issue-other" type="text" placeholder="Type the area" autocomplete="off" hidden>
        </div>
        <div class="issue-field">
          <label for="issueDescription">Description</label>
          <textarea id="issueDescription" placeholder="Briefly describe what happened"></textarea>
        </div>
        <div class="issue-field">
          <label for="issuePhone">Phone / Contact Number</label>
          <input id="issuePhone" type="tel" inputmode="tel" autocomplete="tel">
        </div>
        <p class="issue-send-title">Send to App Support</p>
        <p class="issue-send-copy">Create a diagnostics file and share it with App Support through Mail or another app.</p>
        <div class="issue-actions">
          <button id="issueShareFile" class="issue-action" type="button"><span class="material-symbols-rounded">share</span>Share Diagnostics File</button>
        </div>
      </div>
      <div id="issueDialogHost"></div>
      <div id="issueToast" class="issue-toast" role="status"></div>
    </section>
  `;

  const problem = root.querySelector("#issueProblem");
  const area = root.querySelector("#issueArea");
  const bindOther = (select, input) => {
    select.addEventListener("change", () => {
      input.hidden = select.value !== "Other";
      if (!input.hidden) input.focus();
    });
  };
  bindOther(problem, root.querySelector("#issueProblemOther"));
  bindOther(area, root.querySelector("#issueAreaOther"));
  root.querySelector("#issueShareFile").addEventListener("click", () => shareFile(root));
  const dismissKeyboard = () => {
    const active = document.activeElement;
    if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) active.blur();
  };
  root.querySelector(".issue-screen").addEventListener("touchmove", dismissKeyboard, { passive: true });
  root.querySelector(".issue-screen").addEventListener("wheel", dismissKeyboard, { passive: true });
}
