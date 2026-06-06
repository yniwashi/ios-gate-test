// /ambulance/score_common.js
// CHANGELOG (2026-06-06):
// - Add shared Android-aligned score chip UI for GCS, Pediatric GCS, APGAR, SAT, Westley, and qSOFA.

const SCORE_STYLE_ID = "ambulance-score-common-style";

function ensureScoreStyles() {
  if (document.getElementById(SCORE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = SCORE_STYLE_ID;
  style.textContent = `
    .score-wrap{padding:12px 12px 16px;max-width:760px;margin:0 auto;-webkit-text-size-adjust:100%}
    .score-title{margin:0;text-align:center;color:#111827;font-size:18px;line-height:28px;font-weight:950}
    .score-card{
      margin-top:8px;min-height:46px;border-radius:12px;padding:9px 12px;
      display:flex;align-items:center;justify-content:center;text-align:center;
      color:#fff;font-size:19px;font-weight:950;line-height:1.25;
      background:linear-gradient(180deg,#64748b,#475569);
      box-shadow:0 8px 18px rgba(15,23,42,.14);
    }
    .score-card[data-level="neutral"]{background:linear-gradient(180deg,#64748b,#475569)}
    .score-card[data-level="ok"]{background:linear-gradient(180deg,#16a34a,#0e7a34)}
    .score-card[data-level="warn"]{background:linear-gradient(180deg,#f59e0b,#c67b06)}
    .score-card[data-level="bad"]{background:linear-gradient(180deg,#ef4444,#c03030)}
    .score-scroll{margin-top:8px}
    .score-section{margin-top:10px}
    .score-section-title{margin:0 0 7px;color:#475569;font-size:15px;font-weight:950;line-height:22px}
    .score-chip-grid{display:grid;gap:6px}
    .score-chip-grid.cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}
    .score-chip-grid.cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}
    .score-chip{
      appearance:none;border:1px solid #d7e0ec;border-radius:12px;
      min-height:var(--score-chip-height,52px);padding:4px;
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
      background:linear-gradient(180deg,#ffffff,#f4f8fc);color:#111827;
      font-weight:900;text-align:center;line-height:1.1;cursor:pointer;
      box-shadow:0 1px 2px rgba(15,23,42,.06);
    }
    .score-chip:active{transform:translateY(1px)}
    .score-chip[data-active="true"]{
      color:#fff;border-color:#0369a1;background:linear-gradient(180deg,#0284c7,#0369a1);
      box-shadow:0 7px 16px rgba(2,132,199,.26);
    }
    .score-chip-num{font-size:calc(var(--score-chip-font,13px) * 1.5);font-weight:950}
    .score-chip-text{font-size:var(--score-chip-font,13px);font-weight:900}
    .score-note{
      margin-top:12px;padding:10px 12px;border-radius:12px;border:1px solid #bfdbfe;
      background:#eff6ff;color:#475569;font-size:13px;line-height:1.35;font-weight:750;white-space:pre-line;
    }
    .score-reset{
      display:block;width:160px;height:34px;margin:12px auto 0;border:1px solid #cbd5e1;border-radius:999px;
      background:#f1f5f9;color:#475569;font-size:12px;font-weight:950;
    }
    .qsofa-card{
      margin-top:10px;padding:12px;border-radius:12px;border:1px solid #cbd5e1;
      background:#fff;box-shadow:0 1px 2px rgba(15,23,42,.05);
    }
    .qsofa-title{margin:0;color:#0f172a;font-size:18px;font-weight:950;line-height:1.25}
    .qsofa-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}
    .qsofa-btn{
      min-height:48px;border:1px solid #cbd5e1;border-radius:14px;
      background:linear-gradient(180deg,#f1f5f9,#e2e8f0);color:#0f172a;
      font-size:17px;font-weight:950;
    }
    .qsofa-btn[data-active="true"]{
      border-color:#0369a1;background:linear-gradient(180deg,#0284c7,#0369a1);color:#fff;
    }
    :root[data-theme="dark"] .score-title{color:#eef2ff}
    :root[data-theme="dark"] .score-section-title{color:#aab5c4}
    :root[data-theme="dark"] .score-chip{background:linear-gradient(180deg,#151b26,#101620);border-color:#2b3546;color:#eef2ff}
    :root[data-theme="dark"] .score-chip[data-active="true"]{background:linear-gradient(180deg,#0ea5e9,#0369a1);border-color:#38bdf8}
    :root[data-theme="dark"] .score-note{background:#132235;border-color:#1f3a57;color:#cbd5e1}
    :root[data-theme="dark"] .score-reset{background:#151b26;border-color:#2b3546;color:#cbd5e1}
    :root[data-theme="dark"] .qsofa-card{background:#151b26;border-color:#2b3546}
    :root[data-theme="dark"] .qsofa-title{color:#eef2ff}
    :root[data-theme="dark"] .qsofa-btn{background:linear-gradient(180deg,#151b26,#101620);border-color:#2b3546;color:#eef2ff}
    @media(prefers-color-scheme:dark){
      :root[data-theme="auto"] .score-title{color:#eef2ff}
      :root[data-theme="auto"] .score-section-title{color:#aab5c4}
      :root[data-theme="auto"] .score-chip{background:linear-gradient(180deg,#151b26,#101620);border-color:#2b3546;color:#eef2ff}
      :root[data-theme="auto"] .score-chip[data-active="true"]{background:linear-gradient(180deg,#0ea5e9,#0369a1);border-color:#38bdf8}
      :root[data-theme="auto"] .score-note{background:#132235;border-color:#1f3a57;color:#cbd5e1}
      :root[data-theme="auto"] .score-reset{background:#151b26;border-color:#2b3546;color:#cbd5e1}
      :root[data-theme="auto"] .qsofa-card{background:#151b26;border-color:#2b3546}
      :root[data-theme="auto"] .qsofa-title{color:#eef2ff}
      :root[data-theme="auto"] .qsofa-btn{background:linear-gradient(180deg,#151b26,#101620);border-color:#2b3546;color:#eef2ff}
    }
    @media(max-width:360px){
      .score-wrap{padding-left:10px;padding-right:10px}
      .score-chip-text{font-size:calc(var(--score-chip-font,13px) - 1px)}
    }
  `;
  document.head.appendChild(style);
}

function levelForGcs(total) {
  if (total <= 8) return "bad";
  if (total <= 12) return "warn";
  return "ok";
}

function setHashState(tool, values) {
  const params = new URLSearchParams((location.hash || "").replace(/^#/, ""));
  params.set("tool", tool);
  Object.entries(values).forEach(([key, value]) => params.set(key, String(value)));
  history.replaceState(history.state, "", `${location.pathname}${location.search}#${params.toString()}`);
}

function readHashValue(key, fallback) {
  const params = new URLSearchParams((location.hash || "").replace(/^#/, ""));
  const raw = params.get(key);
  if (raw == null) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function renderChipScore(root, config) {
  ensureScoreStyles();
  const sections = config.sections.map((section) => ({
    ...section,
    value: readHashValue(section.key, section.defaultScore)
  }));

  root.innerHTML = `
    <div class="score-wrap">
      <h2 class="score-title">${config.title}</h2>
      <div id="scoreCard" class="score-card" data-level="neutral">${config.initialText || ""}</div>
      <div class="score-scroll">
        ${sections.map((section) => `
          <section class="score-section">
            <h3 class="score-section-title">${section.title}</h3>
            <div class="score-chip-grid cols-${section.maxColumns || 3}" style="--score-chip-height:${section.rowHeight || 52}px;--score-chip-font:${section.chipFont || 13}px">
              ${section.options.map((option) => `
                <button class="score-chip" type="button" data-key="${section.key}" data-score="${option.score}" data-active="${Number(option.score) === Number(section.value)}">
                  <span class="score-chip-num">${option.score}</span>
                  <span class="score-chip-text">${option.label}</span>
                </button>
              `).join("")}
            </div>
          </section>
        `).join("")}
        ${config.note ? `<div class="score-note">${config.note}</div>` : ""}
      </div>
      <button id="scoreReset" class="score-reset" type="button">Reset</button>
    </div>
  `;

  const card = root.querySelector("#scoreCard");
  const getValues = () => Object.fromEntries(sections.map((section) => [section.key, section.value]));

  function update(pushHash = true) {
    root.querySelectorAll(".score-chip").forEach((chip) => {
      const section = sections.find((item) => item.key === chip.dataset.key);
      chip.dataset.active = String(section && Number(section.value) === Number(chip.dataset.score));
    });
    const result = config.compute(getValues());
    card.textContent = result.text;
    card.dataset.level = result.level || "neutral";
    if (pushHash && config.hash !== false) setHashState(config.tool, getValues());
  }

  root.querySelectorAll(".score-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const section = sections.find((item) => item.key === chip.dataset.key);
      if (!section) return;
      section.value = Number(chip.dataset.score);
      update(true);
    });
  });

  root.querySelector("#scoreReset")?.addEventListener("click", () => {
    sections.forEach((section) => { section.value = section.defaultScore; });
    update(true);
  });

  update(false);
}

export function renderQsofa(root, options = {}) {
  ensureScoreStyles();
  const criteria = [
    { key:"mental", title:"Altered mental status (GCS < 15)" },
    { key:"sbp", title:"SBP <= 100 mmHg" },
    { key:"rr", title:"RR >= 22 breaths/min" }
  ].map((item) => ({ ...item, selected: readHashValue(item.key, 0) === 1 }));

  root.innerHTML = `
    <div class="score-wrap">
      <h2 class="score-title">qSOFA</h2>
      <div id="scoreCard" class="score-card" data-level="ok">qSOFA 0/3 - Lower risk</div>
      <div class="score-scroll">
        ${criteria.map((item) => `
          <section class="qsofa-card" data-key="${item.key}">
            <h3 class="qsofa-title">${item.title}</h3>
            <div class="qsofa-row">
              <button class="qsofa-btn" type="button" data-value="1">Yes</button>
              <button class="qsofa-btn" type="button" data-value="0">No</button>
            </div>
          </section>
        `).join("")}
        <div class="score-note">Use qSOFA as a predictor of severity/mortality in suspected sepsis.</div>
      </div>
      <button id="scoreReset" class="score-reset" type="button">Reset</button>
    </div>
  `;

  const card = root.querySelector("#scoreCard");

  function update(pushHash = true) {
    criteria.forEach((criterion) => {
      const section = root.querySelector(`.qsofa-card[data-key="${criterion.key}"]`);
      section?.querySelectorAll(".qsofa-btn").forEach((button) => {
        button.dataset.active = String((button.dataset.value === "1") === criterion.selected);
      });
    });
    const total = criteria.filter((criterion) => criterion.selected).length;
    card.textContent = total >= 2 ? `qSOFA ${total}/3 - Higher risk` : `qSOFA ${total}/3 - Lower risk`;
    card.dataset.level = total >= 2 ? "bad" : "ok";
    if (pushHash && options.hash !== false) setHashState("qsofa", Object.fromEntries(criteria.map((item) => [item.key, item.selected ? 1 : 0])));
  }

  root.querySelectorAll(".qsofa-card").forEach((section) => {
    section.querySelectorAll(".qsofa-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const criterion = criteria.find((item) => item.key === section.dataset.key);
        if (!criterion) return;
        criterion.selected = button.dataset.value === "1";
        update(true);
      });
    });
  });

  root.querySelector("#scoreReset")?.addEventListener("click", () => {
    criteria.forEach((criterion) => { criterion.selected = false; });
    update(true);
  });

  update(false);
}

export { levelForGcs };
