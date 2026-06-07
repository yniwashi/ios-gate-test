// /ambulance/tools/issue_report.js
// CHANGELOG (2026-06-07):
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

async function shareFile(root, emailMode) {
  const { jsonFile, statusFilename } = await statusModule();
  const data = await reportData(root);
  const file = jsonFile(data, statusFilename("ambulance_issue_report"));
  const shareData = {
    title: "Ambulance App Issue Report",
    text: emailMode
      ? `Please send this diagnostic file to ${SUPPORT_EMAIL}.`
      : "Ambulance App issue report attached.",
    files: [file]
  };
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

async function emailText(root) {
  const data = await reportData(root);
  const text = `Ambulance App Issue Report\n\n${JSON.stringify(data, null, 2)}`;
  try {
    await navigator.clipboard.writeText(text);
    toast(root, "Report copied. Opening email...");
  } catch (_) {}
  const concise = [
    "Ambulance App Issue Report",
    "",
    `Problem: ${data.issue_report.problem}`,
    `Area: ${data.issue_report.area}`,
    `Description: ${data.issue_report.description}`,
    `Phone: ${data.issue_report.phone}`,
    "",
    "The full diagnostic report was copied. Paste it below if needed."
  ].join("\n");
  location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Ambulance App Issue Report")}&body=${encodeURIComponent(concise)}`;
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
      .issue-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.issue-action{appearance:none;min-height:50px;border:0;border-radius:8px;background:#0d63b2;color:#fff;font:900 13px/1 system-ui;display:flex;align-items:center;justify-content:center;gap:7px;padding:8px;cursor:pointer}
      .issue-action .material-symbols-rounded{font-size:21px}.issue-action.full{grid-column:1/-1;font-size:14px}.issue-action:active{transform:scale(.985)}
      .issue-toast{position:fixed;left:50%;bottom:calc(22px + env(safe-area-inset-bottom));z-index:100001;max-width:calc(100vw - 36px);padding:10px 14px;border-radius:8px;background:#111827;color:#fff;font-size:12px;font-weight:850;opacity:0;transform:translate(-50%,10px);pointer-events:none;transition:.18s}
      .issue-toast.show{opacity:1;transform:translate(-50%,0)}
      [data-theme="dark"] .issue-note{border-color:#315878;background:#17283a;color:#d9e8f6}
      [data-theme="dark"] .issue-field select,[data-theme="dark"] .issue-field input,[data-theme="dark"] .issue-field textarea{border-color:#416b8c;background:#171d26}
      @media(prefers-color-scheme:dark){[data-theme="auto"] .issue-note{border-color:#315878;background:#17283a;color:#d9e8f6}[data-theme="auto"] .issue-field select,[data-theme="auto"] .issue-field input,[data-theme="auto"] .issue-field textarea{border-color:#416b8c;background:#171d26}}
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
        <p class="issue-send-copy">Email File or Email Text sends the report directly to app support. Use Share File if you are part of the Discord server or Telegram channel, or if you know the support phone number.</p>
        <div class="issue-actions">
          <button id="issueEmailFile" class="issue-action" type="button"><span class="material-symbols-rounded">mail</span>Email File</button>
          <button id="issueShareFile" class="issue-action" type="button"><span class="material-symbols-rounded">share</span>Share File</button>
          <button id="issueEmailText" class="issue-action full" type="button"><span class="material-symbols-rounded">mail</span>Email Text Report</button>
        </div>
      </div>
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
  root.querySelector("#issueEmailFile").addEventListener("click", () => shareFile(root, true));
  root.querySelector("#issueShareFile").addEventListener("click", () => shareFile(root, false));
  root.querySelector("#issueEmailText").addEventListener("click", () => emailText(root));
  const dismissKeyboard = () => {
    const active = document.activeElement;
    if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) active.blur();
  };
  root.querySelector(".issue-screen").addEventListener("touchmove", dismissKeyboard, { passive: true });
  root.querySelector(".issue-screen").addEventListener("wheel", dismissKeyboard, { passive: true });
}
