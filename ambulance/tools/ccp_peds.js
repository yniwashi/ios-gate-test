// tools/ccp_peds.js
// Changelog (2026-05-01):
// - Update hardcoded formulary page links for the new CPG page numbering.
// Changelog (2026-01-15):
// - Fix PDF modal back to avoid blank viewer layer; preserve hash/state.
// - Align age/weight logic, cap Dexamethasone at 12 mg, and clear invalid weight outputs.
export async function run(mountEl){
  mountEl.innerHTML = `
    <style>
      :root{
        --bg: #ffffff;
        --card: #ffffff;
        --text: #0c1230;
        --muted:#6e7b91;
        --border:#e7ecf3;
        --strip:#c3a8abba;
        --chip:#f3f6fb;
        --result:#f6f8fd;
        --shadow: rgba(0,0,0,.12);
        --btn-shadow: rgba(0,0,0,.14);
      }
      @media (prefers-color-scheme: dark){
        :root{
          --bg:#0b0f1a;
          --card:#0f1524;
          --text:#f2f4f9;
          --muted:#a7b1c6;
          --border:#263149;
          --strip:#41506d;
          --chip:#152039;
          --result:#0f1629;
          --shadow: rgba(0,0,0,.35);
          --btn-shadow: rgba(0,0,0,.45);
        }
      }
      [data-theme="dark"]{
        --bg:#0b0f1a;
        --card:#0f1524;
        --text:#f2f4f9;
        --muted:#a7b1c6;
        --border:#263149;
        --strip:#41506d;
        --chip:#152039;
        --result:#0f1629;
        --shadow: rgba(0,0,0,.35);
        --btn-shadow: rgba(0,0,0,.45);
      }

      .ccp-wrap{padding:12px; background:var(--bg)}
      .ccp-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px;box-shadow:0 8px 18px var(--shadow)}
      .ccp-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
      .ccp-title{margin:0;font-weight:900;font-size:16px;color:var(--text)}
      .ccp-strip{height:6px;border-radius:6px;margin:10px 0 14px;background:linear-gradient(90deg,#6b7aa1,var(--strip))}
      .row{display:flex;gap:10px;flex-wrap:wrap}
      .col{flex:1 1 260px;min-width:240px}
      .label{font-size:12px;font-weight:800;color:var(--muted);margin:0 0 6px 2px;letter-spacing:.08em}
      .input{width:100%;box-sizing:border-box;font-size:18px;font-weight:800;color:var(--text);background:var(--chip);border:1px solid var(--border);border-radius:12px;padding:12px 14px;outline:none}
      .chips{display:flex;gap:10px;align-items:center}
      .or{font-weight:900;color:var(--muted)}

      .context{margin:2px 0 8px;font-weight:800;color:var(--muted)}


      /* Age Group toggle */
      .seg{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .seg-label{font-size:12px;font-weight:900;color:var(--muted);letter-spacing:.08em;text-transform:uppercase}
      .seg button{
        appearance:none;border:1px solid var(--border);border-radius:12px;
        height:48px;min-width:120px;padding:0 14px;font-weight:900;cursor:pointer;
        background:var(--chip);color:var(--text);font-size:14px;
        display:flex;align-items:center;justify-content:center;transition:all .12s ease
      }
      .seg button[data-active="true"]{
        border-color:#5468ff;background:rgba(84,104,255,.12);color:#5468ff;box-shadow:0 6px 14px var(--btn-shadow);transform:translateY(-1px)
      }

      /* Medication grid (auto-fit for 3→2→1) */
      .grid{
        display:grid;
        grid-template-columns:repeat(auto-fit, minmax(120px, 1fr));
        gap:8px;
        margin-top:12px
      }

      /* Colored buttons always (not only active) */
      .grid button.btn{
        appearance:none;box-sizing:border-box;
        height:45px !important;min-height:40px !important;
        padding:0 8px !important;line-height:40px !important;white-space:nowrap;
        border:1px solid var(--border);border-radius:10px;
        font-size:12px;font-weight:900;text-align:center;display:flex;align-items:center;justify-content:center;
        cursor:pointer;transition:transform .06s ease,box-shadow .06s ease,filter .06s ease;
        color:var(--btnFg,#0c1230);background:var(--btnBg,#f6f8fd);
      }
      .grid button.btn:hover{ filter:brightness(1.03) }
      .grid button.btn[data-active="true"]{ box-shadow:0 4px 10px var(--btn-shadow); transform:translateY(-1px); }

      .result{margin-top:12px;padding:14px;border-radius:12px;background:var(--result);border:1px solid var(--border)}
      .title{font-weight:900;margin-bottom:8px;font-size:20px;line-height:1.1;color:var(--text)}
      .title-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:space-between}
      .view-btn{
        appearance:none;
        border:1px solid transparent;
        background:linear-gradient(180deg,#2563eb,#1d4ed8);
        color:#fff;
        border-radius:10px;
        padding:8px 14px;
        font-weight:900;
        font-size:12px;
        min-height:34px;
        cursor:pointer;
        box-shadow:0 6px 16px rgba(37,99,235,.35);
        transition:transform .1s ease, box-shadow .1s ease, opacity .1s ease;
      }
      .view-btn:focus-visible{outline:2px solid #93c5fd;outline-offset:2px}
      .view-btn:active{transform:translateY(1px) scale(.99);box-shadow:0 4px 10px rgba(37,99,235,.4)}
      .view-btn[disabled]{opacity:.35;cursor:not-allowed;box-shadow:none}
      .header{font-size:14px;font-style:italic;font-weight:700;color:var(--text);opacity:.85;margin-bottom:8px;white-space:pre-wrap}
      .sec-h{font-size:12px;font-weight:900;color:#64748b;margin:8px 0 4px;letter-spacing:.08em;text-transform:uppercase}
      .sec-k{font-size:20px;font-weight:1000;color:var(--text)}
      .kv{display:grid;grid-template-columns:160px 1fr;gap:8px;align-items:start}
      .hr{height:1px;background:var(--border);margin:10px 0}
      .note{white-space:pre-wrap;color:var(--text)}
      .alert{display:none;margin:8px 2px 10px;padding:10px 12px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;color:#7c2d12;font-weight:700;font-size:13px}
      [data-theme="dark"] .alert{ background:#2b1d14;border-color:#5a3a1d;color:#ffd2b3 }
      .muted{color:var(--muted)}
    </style>

    <div class="ccp-wrap">
      <div class="ccp-card">
        <div class="ccp-head">
          <h3 class="ccp-title">CCP Pediatrics</h3>
          <div class="seg" role="tablist" aria-label="Age Group">
            <span class="seg-label">Age Group</span>
            <button id="modeMonths" role="tab" aria-selected="true" data-active="true">Months</button>
            <button id="modeYears" role="tab" aria-selected="false">Years</button>
          </div>
        </div>

        <div class="ccp-strip"></div>

        <div class="row">
          <div class="col">
            <p id="ageLbl" class="label">Age (months)</p>
            <input id="age" class="input" inputmode="numeric" placeholder="e.g., 6">
          </div>
          <div class="col chips" style="align-items:flex-end">
            <span class="or">OR</span>
          </div>
          <div class="col">
            <p class="label">Weight (kg)</p>
            <input id="wt" class="input" inputmode="decimal" placeholder="e.g., 7">
          </div>
        </div>

        <div id="alert" class="alert"></div>
        <p class="label" style="margin-top:8px">Medications</p>

        <div class="grid" id="grid"></div>

        <div class="result" aria-live="polite">
          <div class="title-row">
            <div id="rTitle" class="title">—</div>
            <button id="viewFormularyBtn" class="view-btn" type="button" disabled>View Formulary</button>
          </div>
          <div id="rContext" class="context"></div>
          <div id="rHeader" class="header"></div>
          <div id="rBody"></div>
        </div>
      </div>
    </div>
  `;

  const FALLBACK = {
    urlPageBase: "https://docs.niwashibase.com/viewer/web/?file=/docs/cpg-81w9d1f.pdf#page="
  };

  function getCfg() {
    const cfg =
      (window.APP_CONFIG && window.APP_CONFIG.pdfViewer && window.APP_CONFIG.pdfViewer.helpers) ||
      (window.CONFIG && window.CONFIG.pdfViewer && window.CONFIG.pdfViewer.helpers) ||
      (window.__CONFIG && window.__CONFIG.pdfViewer && window.__CONFIG.pdfViewer.helpers) ||
      null;

    const urlPage = (cfg && cfg.urlPage) ? String(cfg.urlPage) : FALLBACK.urlPageBase;
    const urlPageBase = urlPage.includes("#page=") ? urlPage : (urlPage.replace(/#.*$/, "") + "#page=");
    return { urlPageBase };
  }

  const CFG = getCfg();

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
      p.set("tool", "ccp_peds");
      p.set("overlay", "pv");
      if (overlayToken) p.set("pv", overlayToken);
      else p.delete("pv");
      const hash = p.toString();
      return `${location.pathname}${location.search}${hash ? `#${hash}` : ""}`;
    }
    function buildOverlayState(overlayToken) {
      const baseState = (history.state && history.state.tool) ? history.state : { tool: "ccp_peds", params: {} };
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

  function openAtPage(page, title) {
    const modal = ensureViewerModal();
    modal.__open(CFG.urlPageBase + String(page), title || "Formulary", `page:${page}`);
  }

  const $  = s => mountEl.querySelector(s);
  const $$ = s => [...mountEl.querySelectorAll(s)];

  /* ====== elements ====== */
  const ageEl = $('#age');
  const ageLbl= $('#ageLbl');
  const wtEl  = $('#wt');
  const alertEl = $('#alert');
  const rTitle = $('#rTitle');
  const rContext = $('#rContext');
  const rHeader = $('#rHeader');
  const rBody   = $('#rBody');
  const viewBtn = $('#viewFormularyBtn');
  const grid    = $('#grid');
  const btnMonths = $('#modeMonths');
  const btnYears  = $('#modeYears');

  // Keep only one field active — clear the other automatically
  ageEl.addEventListener('focus', ()=>{
    if (wtEl.value){
      wtEl.value = '';
      recompute();
    }
  });

  wtEl.addEventListener('focus', ()=>{
    if (ageEl.value){
      ageEl.value = '';
      recompute();
    }
  });


  /* ====== helpers ====== */
  const hexToRgba = (hex, a)=>{
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if(!m) return `rgba(12,18,48,${a})`;
    const r = parseInt(m[1],16), g = parseInt(m[2],16), b = parseInt(m[3],16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };
  const fmtCeil = x=>{
    if (!Number.isFinite(x)) return String(x);
    const isInt = Math.abs(x - Math.round(x)) < 1e-9;
    if (isInt) return String(Math.round(x));
    const m = 100;
    return (Math.ceil(x*m)/m).toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');
  };
  const fmt = fmtCeil;

  const textColorFor = (hex)=>{
    // simple luminance check, return #fff for dark bg
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if(!m) return '#0c1230';
    const r = parseInt(m[1],16), g = parseInt(m[2],16), b = parseInt(m[3],16);
    const L = (0.299*r + 0.587*g + 0.114*b)/255;
    return L < 0.5 ? '#ffffff' : '#0c1230';
  };

  function getContextLine(){
    const a = ageEl.value.trim();
    const w = wtEl.value.trim();
    if (a){
      return (mode==='months')
        ? `Age ${a} months`
        : `Age is ${a} years`;
    }
    return '';
  }

  function headerLooksLikeError(h){
    if (!h) return false;
    const needles = [
      'Please enter Age or Weight.',
      'Please fill only one field',
      'exceeds the estimated weight',
      'exceeds the pediatric range',
      'Invalid input'
    ];
    return needles.some(t => h.includes(t));
  }



  /* ====== labels (short display) ====== */
  const LABELS = {
    'Magnesium Sulphate': 'Magnesium',
    'Ipratropium Bromide': 'Ipratropium'
  };

   /* ====== palette (from your Kotlin colors.xml) ====== */
  const COLORS = {
    // meds
    Adenosine:           '#B39DDB',
    Adrenaline:          '#CE93D8',
    Amiodarone:          '#CE93D8',
    Atropine:            '#B39DDB',    // "atropin" -> Atropine
    Dexamethasone:       '#8D6E63',    // "dexa"
    'Dextrose 10%':      '#A5D6A7',    // "dextrose"
    Diphenhydramine:     '#26A69A',    // "diphen"
    Droperidol:          '#FFA726',
    Fentanyl:            '#81D4FA',
    Glucagon:            '#B39DDB',    // "glucagone"
    Hydrocortison:       '#8D6E63',    // "hydro"
    'Ipratropium Bromide':'#AED581',   // "atrovent"
    Ketamine:            '#FFF59D',
    'Magnesium Sulphate':'#AED581',    // "mag"
    Midazolam:           '#FFA726',    // "midaz"
    Naloxone:            '#26A69A',
    Ondansetron:         '#AED581',
    Paracetamol:         '#A5D6A7',
    Rocuronium:          '#EF5350',    // "roc"
    Salbutamol:          '#AED581',
    TXA:                 '#B39DDB',
    WAAFELSS:            '#ADAEAE',

    // (WAAFELSS helpers if you later want chips/badges)
    _fluids:             '#FF5722',
    _defib:              '#05B64C',
    _phenylephrine:      '#FF5722',
    _noradrenaline:      '#D808DF',
    _gtn:                '#804403'
  };


  const DRUGS = [
    'Adenosine','Adrenaline','Amiodarone','Atropine','Dexamethasone','Dextrose 10%',
    'Diphenhydramine','Droperidol','Fentanyl','Glucagon','Hydrocortison','Ipratropium Bromide',
    'Ketamine','Magnesium Sulphate','Midazolam','Naloxone','Ondansetron','Paracetamol',
    'Rocuronium','Salbutamol','TXA','WAAFELSS'
  ];

  const FORMULARY_PAGES = {
    Adenosine: 281,
    Adrenaline: 284,
    Amiodarone: 288,
    Atropine: 293,
    Dexamethasone: 302,
    'Dextrose 10%': 305,
    Diphenhydramine: 310,
    Droperidol: 313,
    Fentanyl: 316,
    Glucagon: 322,
    Hydrocortison: 327,
    'Ipratropium Bromide': 333,
    Ketamine: 336,
    'Magnesium Sulphate': 344,
    Midazolam: 351,
    Naloxone: 354,
    Ondansetron: 359,
    Paracetamol: 362,
    Rocuronium: 369,
    Salbutamol: 372,
    TXA: 377
  };

  /* ====== MODE ====== */
  // 'months' or 'years'
  let mode = 'months';

  /* ====== MONTHS-specific ====== */
  const estW_M = m => m*0.5 + 4; // 1..12 only
  const MAX_W_12M = estW_M(12);  // 10 kg

  function getInputsMonths(){
    const a = ageEl.value.trim();
    const w = wtEl.value.trim();
    if (a && w) return {err:"Please fill only one field: Age or Weight."};
    if (!a && !w) return {err:"Please enter Age or Weight."};
    if (a){
      if (!/^\d+$/.test(a)) return {err:"Invalid input. Please enter a valid number."};
      const m = parseInt(a,10);
      if (m<1 || m>12) return {err:"This age exceeds 12 months. Please choose the years section in pediatrics for appropriate guidance."};
      const wEst = estW_M(m);
      return {mode:'age', m, w:wEst, header:`Patient estimated weight is ${fmt(wEst)} kg.`};
    } else {
      const wn = Number(w.replace(',','.'));
      if (!Number.isFinite(wn) || wn<=0) return {err:"Invalid input. Please enter a valid number."};
      if (wn > MAX_W_12M) return {err:`The weight entered (${fmt(wn)} kg) exceeds the estimated weight for a 12-month-old child, which is ${fmt(MAX_W_12M)} kg.`};
      const mEst = Math.round((wn - 4) / 0.5);
      const m = Math.max(1, Math.min(12, mEst));
      return {mode:'weight', m, w:wn, header:`Patient weight is ${fmt(wn)} kg.`};
    }
  }

  /* ====== YEARS-specific (ported from Kotlin) ====== */
  function estimateAgeFromWeight(w){
    if (!Number.isFinite(w)) return null;
    if (w <= 24){
      const approx = Math.floor((w - 8) / 2);
      return Math.max(1, Math.min(5, approx));
    }
    const approx = Math.floor((w - 7) / 3);
    return Math.max(6, Math.min(14, approx));
  }

  function resolveYears(ageText, weightText){
    if (ageText){
      const age = parseInt(ageText,10);
      if (isNaN(age)) return null;
      if (age<=5){
        const w = age*2 + 8;
        return {w, header:`Patient estimated weight is ${w} kg.`, age};
      } else if (age>=6 && age<=14){
        const w = age*3 + 7;
        return {w, header:`Patient estimated weight is ${w} kg.`, age};
      }
      return null;
    } else if (weightText){
      const parsed = Number(String(weightText).replace(',','.'));
      if (!Number.isFinite(parsed)) return null;
      const w = parsed;
      const derivedAge = estimateAgeFromWeight(w);
      const minW = 10, maxW = 49;
      if (w < minW){
        return {err:`The weight entered (${w} kg) is less than the estimated weight for a 1-year-old child, which is ${minW} kg.`, age: derivedAge};
      }
      if (w > maxW){
        return {err:`The weight entered (${w} kg) exceeds the estimated weight for a 14-year-old child, which is ${maxW} kg.`, age: derivedAge};
      }
      return {w, header:`Patient weight is ${w} kg.`, age: derivedAge};
    }
    return null;
  }

  function getInputsYears(){
    const a = ageEl.value.trim();
    const w = wtEl.value.trim();
    if (a && w) return {err:"Please fill only one field: Age or Weight."};
    if (!a && !w) return {err:"Please enter Age or Weight."};
    const r = resolveYears(a, w);
    if (r && r.err) return {err:r.err};
    if (!r) return {err:"This age exceeds the pediatric range. Please refer to the CPG formulary section for appropriate medication guidance."};
    const actualAge = a ? parseInt(a,10) : null;
    const ageResolved = (typeof r.age === 'number' && Number.isFinite(r.age)) ? r.age : actualAge;
    return {
      mode: a? 'age':'weight',
      a: actualAge,
      w: r.w,
      header: r.header,
      rawAge: a,
      rawW: w,
      ageResolved
    };
  }

  /* ====== shared UI helpers ====== */
  function showAlert(msg){ alertEl.textContent = msg; alertEl.style.display = 'block'; }
  function hideAlert(){ alertEl.style.display = 'none'; alertEl.textContent=''; }

  function updateFormularyButton(name){
    const page = name ? FORMULARY_PAGES[name] : null;
    viewBtn.dataset.title = name || '';
    if (page){
      viewBtn.disabled = false;
      viewBtn.dataset.page = String(page);
    } else {
      viewBtn.disabled = true;
      viewBtn.removeAttribute('data-page');
    }
  }

  function setTitle(name){
    rTitle.textContent = name;
    $$('.btn').forEach(b=>{
      const isActive = (b.dataset.name === name);
      b.dataset.active = isActive ? 'true' : 'false';
    });
    rTitle.style.color = COLORS[name] || 'var(--text)';
    updateFormularyButton(name);
  }

  function renderSections(sections, kvMode=false){
    const parts = [];
    sections.forEach((s,idx)=>{
      if (kvMode){
        if (s.indication && s.indication!=='—') parts.push(`<div class="sec-h">${s.indication}</div>`);
        if (s.dose && s.dose!=='—') parts.push(`<div class="sec-k">${s.dose}</div>`);
        if (s.notes) parts.push(`<div class="note">${s.notes}</div>`);
      }else{
        if (s.indication && s.indication!=='—'){
          parts.push(`<div class="sec-h">Indication</div>`);
          parts.push(`<div class="sec-k" style="color:#ef4444">${s.indication}</div>`);
        }
        if (s.dose && s.dose!=='—'){
          parts.push(`<div class="sec-h">Dose</div>`);
          parts.push(`<div class="sec-k">${s.dose}</div>`);
        }
        if (s.route && s.route!=='—'){
          parts.push(`<div class="sec-h">Route</div>`);
          parts.push(`<div class="note">${s.route}</div>`);
        }
        if (s.notes){
          parts.push(`<div class="sec-h">Notes</div>`);
          parts.push(`<div class="note">${s.notes}</div>`);
        }
      }
      if (idx !== sections.length-1) parts.push(`<div class="hr"></div>`);
    });
    rBody.innerHTML = parts.join('');
  }

  const S = (indication,dose,route,notes=null)=>({indication,dose,route,notes});

  /* ====== MONTHS BUILDERS (your existing ones) ====== */
  // (unchanged — pasted from your current months file)
  // For brevity, only the function signatures are shown here in this comment.
  // Below are the actual definitions copied from your provided file.

  function bAdenosine_M(){ const g=getInputsMonths(); if(g.err) return errOut(g.err); const w=g.w,h=g.header; const d1=fmt(w*0.1), d2=fmt(w*0.2);
    return {header:h,sections:[ S('SVT – First Dose',`${d1} mg`,'IV/IO',`MAX dose of 6mg (Undiluted 6mg per 2ml).\nRef.Dose Calculation: ${fmt(w)}kg x 0.1mg`),
                               S('SVT – Second Dose',`${d2} mg`,'IV/IO',`MAX dose of 12mg (Undiluted 6mg per 2ml).\nRef.Dose Calculation: ${fmt(w)}kg x 0.2mg`) ]};}
  function bAdrenaline_M(){ const g=getInputsMonths(); if(g.err) return errOut(g.err); const w=g.w,h=g.header;
    const cardiacMg=fmt(w*0.01), bradyMcg=fmt(w*1.0), inoMin=fmt(w*0.05), inoMax=fmt(w*0.3), croupNeb=fmt(w*0.5), anaphIM=fmt(w*0.01), anaphIV=fmt(w*1.0);
    return {header:h,sections:[
      S('Cardiac Arrest',`${cardiacMg} mg`,'IV/IO',`Repeat every 4 minutes\nRef.Dose Calculation: ${fmt(w)}kg x 0.01mg`),
      S('Bradycardia',`${bradyMcg} mcg`,'IV/IO',`MAX Dose 50 mcg.\nRepeat PRN every 2-4 minutes.\nRef.Dose Calculation: ${fmt(w)}kg x 1mcg`),
      S('Inotrope/Vasopressor',`${inoMin} - ${inoMax} mcg/min`,'IV/IO infusion',`Mix 1mg (1:1000) in 100ml NS. Draw 50ml into 50ml syringe\nRef.Dose Calculation: ${fmt(w)}kg x 0.05mcg - ${fmt(w)}kg x 0.3mcg`),
      S('Severe Bronchoconstriction (IM)',`${cardiacMg} mg (MAX 0.5 mg)`,'IM',`Repeat PRN every 5 minutes.\nRef.Dose Calculation: ${fmt(w)}kg x 0.01mg`),
      S('Severe Bronchoconstriction (IV/IO)',`${bradyMcg} mcg`,'IV/IO',`MAX Single Dose 50 mcg.\nRepeat PRN every 1-10 minutes.\nRef.Dose Calculation: ${fmt(w)}kg x 1mcg`),
      S('Croup & Upper Airway Swelling',`${croupNeb} mg`,'NEB',`MAX dose of 5mg\nRepeat PRN every 5 minutes\nRef.Dose Calculation: ${fmt(w)}kg x 0.5mg`),
      S('Anaphylaxis (IM)',`${anaphIM} mg`,'IM',`MAX dose is 0.5mg\nRepeat PRN every 5 minutes\nRef.Dose Calculation: ${fmt(w)}kg x 0.01mg`),
      S('Anaphylaxis (IV/IO)',`${anaphIV} mcg`,'IV/IO',`MAX single dose is 50mcg. Repeat every 1-10 mins\nRef.Dose Calculation: ${fmt(w)}kg x 1mcg`)
    ]};}
  function bAmiodarone_M(){ const g=getInputsMonths(); if(g.err) return errOut(g.err); const w=g.w,h=g.header; const d=fmt(w*5);
    return {header:h,sections:[
      S('Cardiac Arrest',`${d} mg`,'IV/IO',`After 3rd shock. Repeat twice up to 15mg per kg\nMAX Dose is 300mg (Up to a total of 3 doses).\nRef. Dose Calculation: ${fmt(w)}kg x 5mg`),
      S('VT with a pulse',`${d} mg`,'IV/IO infusion',`Over 20 to 60 minutes\nMAX dose of 300mg.\nRef. Dose Calculation: ${fmt(w)}kg x 5mg`)
    ]};}
  function bAtropine_M(){ const g=getInputsMonths(); if(g.err) return errOut(g.err); const w=g.w,h=g.header; const months=Number.isFinite(g.m)? g.m : null;
    const under7ByAge = months!==null && months<=7; const bradyDose = (under7ByAge || (wtEl.value && w<=7.0)) ? '0.1' : fmt(w*0.02); const organo=fmt(w*0.05);
    return {header:h,sections:[
      S('Bradycardia',`${bradyDose} mg`,'IV/IO',`MIN single dose is 0.1 mg and MAX single dose 0.5 mg. Repeat once if required.\nRef. Dose Calculation: ${fmt(w)}kg x 0.02mg`),
      S('Organophosphate Toxicity',`${organo} mg`,'IV/IO or IM',`MAX dose is 2 mg. Repeat PRN every 5 minutes, until clinical condition improves.\nRef. Dose Calculation: ${fmt(w)}kg x 0.05mg`)
    ]};}
  function bDexamethasone_M(){ const g=getInputsMonths(); if(g.err) return errOut(g.err); const w=g.w,h=g.header;
    const d = (w >= 22) ? '12' : fmt(w*0.6);
    return {header:h,sections:[ S('Croup',`${d} mg`,'PO/IM/IV',`Max dose 12 mg\nSingle dose\nRef. Dose Calculation: ${fmt(w)} kg x 0.6mg`) ]};}
  function bDextrose10_M(){ const g=getInputsMonths(); if(g.err) return errOut(g.err); const w=g.w,h=g.header;
    if (Number.isFinite(g.m)){ const m=g.m;
      if (m<=1){ const nb=fmt(w*2), rosc=fmt(Math.min(w*2.5,50)); return {header:h,sections:[ S('Newborn Hypoglycemia',`${nb} ml`,'IV/IO',`Repeat if patient still hypoglycemic.\nRef. Dose Calculation: ${fmt(w)} kg x 2ml`), S('Newborn Hypoglycemia (Cardiac Arrest or ROSC)',`${rosc} ml`,'IV/IO',`Repeat if patient still hypoglycemic.\nRef. Dose Calculation: ${fmt(w)} kg x 2.5ml`)]}; }
      else if (m===2){ const inf=fmt(w*2), rosc=fmt(Math.min(w*2.5,50)); return {header:h,sections:[ S('Infant Hypoglycemia',`${inf} ml`,'IV/IO',`Repeat if patient still hypoglycemic.\nRef. Dose Calculation: ${fmt(w)} kg x 2ml`), S('Infant Hypoglycemia (Cardiac Arrest or ROSC)',`${rosc} ml`,'IV/IO',`Repeat if patient still hypoglycemic.\nRef. Dose Calculation: ${fmt(w)} kg x 2.5ml`)]}; }
      else { const inf=fmt(w*5), rosc=fmt(Math.min(w*2.5,50)); return {header:h,sections:[ S('Infant Hypoglycemia',`${inf} ml`,'IV/IO',`Repeat if patient still hypoglycemic.\nRef. Dose Calculation: ${fmt(w)} kg x 5ml`), S('Infant Hypoglycemia (Cardiac Arrest or ROSC)',`${rosc} ml`,'IV/IO',`Repeat if patient still hypoglycemic.\nRef. Dose Calculation: ${fmt(w)} kg x 2.5ml`)]}; } }
    else { if (w<=4.0){ const nb=fmt(w*2), rosc=fmt(Math.min(w*2.5,50)); return {header:h,sections:[ S('Newborn Hypoglycemia',`${nb} ml`,'IV/IO',`Repeat if patient still hypoglycemic.\nRef. Dose Calculation: ${fmt(w)} kg x 2ml`), S('Newborn Hypoglycemia (Cardiac Arrest or ROSC)',`${rosc} ml`,'IV/IO',`Repeat if patient still hypoglycemic.\nRef. Dose Calculation: ${fmt(w)} kg x 2.5ml`)]}; }
      else { const inf=fmt(w*5), rosc=fmt(Math.min(w*2.5,50)); return {header:h,sections:[ S('Infant Hypoglycemia',`${inf} ml`,'IV/IO',`Repeat if patient still hypoglycemic.\nRef. Dose Calculation: ${fmt(w)} kg x 5ml`), S('Infant Hypoglycemia (Cardiac Arrest or ROSC)',`${rosc} ml`,'IV/IO',`Repeat if patient still hypoglycemic.\nRef. Dose Calculation: ${fmt(w)} kg x 2.5ml`)]}; } } }
  function bDiphenhydramine_M(){ const g=getInputsMonths(); if(g.err) return errOut(g.err); const w=g.w,h=g.header; const months=Number.isFinite(g.m)? g.m : null; const dose=(months!==null && months<=7)||(wtEl.value && w<=7.0) ? '5' : fmt(w*1.0); return {header:h,sections:[ S('Anaphylaxis/Allergic reaction',`${dose} mg`,'IV/IO/IM',`MAX dose is 50 mg.\nRef. Dose Calculation: ${fmt(w)} kg x 1mg`) ]};}
  function bDroperidol_M(){ const g=getInputsMonths(); if(g.err) return errOut(g.err); const base=`${g.header}\n\nNot for use in patients < 8 years old (< 30 kg)`; return {header:base,sections:[S('—','—','—')]};}
  function bFentanyl_M(){ const g=getInputsMonths(); if(g.err) return errOut(g.err); const w=g.w,h=g.header; const iv=fmt(w*1.0), ivMax=fmt(w*2.0), intranasal=fmt(w*2.0), postRsi=fmt(w*0.5);
    return {header:h,sections:[
      S('Analgesia (IV/IO)',`${iv} mcg`,'IV/IO',`(MAX Total Dose ${ivMax} mcg)\nRef. Dose Calculation: ${fmt(w)}kg x 1mcg`),
      S('Analgesia (IN)',`${intranasal} mcg`,'IN',`MAX dose per nostril is 0.3 to 0.5ml.\nRef. Dose Calculation: ${fmt(w)}kg x 2mcg`),
      S('Post RSI',`${postRsi} mcg`,'IV/IO',`Ref. Dose Calculation: ${fmt(w)}kg x 0.5mcg`),
      S('RSI','—','—','Not indicated in this age group for intubation'),
      S('Fentanyl IV/IO Infusion','1-10mcg/kg/hr','IV/IO infusion','Titrated to maintain sedation post RSI\nDilute 200mcg (2 amps) Fentanyl with 16ml NS to a total of 20ml to give a concentration of 10mcg/1ml.\nStart infusion at desired range and titrate to effect and monitor BP')
    ]};}
  function bGlucagon_M(){ const g=getInputsMonths(); if(g.err) return errOut(g.err); const w=g.w,h=g.header; const months=Number.isFinite(g.m)? g.m : null; const neonateAge=months!==null && months>=1 && months<=2; const neonateWt=wtEl.value && w<=4.0;
    if (neonateAge || neonateWt) return {header:h,sections:[ S('Symptomatic Hypoglycaemia','Not for use in neonates','—','—') ]};
    return {header:h,sections:[ S('Symptomatic Hypoglycaemia','0.5 mg','IM','If no IV access or dextrose ineffective\nReconstituted: 1 mg/1 ml\n\nRef. Dose: Patient weight ≤ 20 kg (age < 6 years) = 0.5 mg IM = 0.5 ml') ]};}
  function bHydrocortison_M(){ const g=getInputsMonths(); if(g.err) return errOut(g.err); const w=g.w,h=g.header; const d=fmt(w*5); return {header:h,sections:[ S('Asthma/Anaphylaxis/Allergic reaction',`${d} mg`,'IV/IO',`MAX dose is 200mg\nSingle dose\nRef. Dose Calculation: ${fmt(w)}kg x 5mg`) ]};}
  function bIprat_M(){ const g=getInputsMonths(); if(g.err) return errOut(g.err); return {header:g.header,sections:[ S('Bronchoconstriction - Neb','0.25mg','NEB','Neb should be mixed to a volume of 5ml\n\n• Ipratropium Bromide must always be administered together with Salbutamol in the same nebuliser — never on its own.\n• Ipratropium Bromide is a single dose. If additional doses are required, request CCP assistance. CCP is required for a second dose; maximum 2 doses may be given 20 minutes apart.\n\nRef. Dose Calculation: 0.25mg for Age < 6 years') ]};}
  function bKetamine_M(){ const g=getInputsMonths(); if(g.err) return errOut(g.err); if (Number.isFinite(g.m)){ const m=g.m; if (m<3) return {header:'Ketamine Not For Use For Patients Less Than 3 Months Old', sections:[S('—','—','—')]}; }
    const w=g.w,h=g.header; const d025=fmt(w*0.25), d05=fmt(w*0.5), d1=fmt(w*1.0), d2=fmt(w*2.0);
    return {header:h,sections:[
      S('Analgesia (IV/IO)',`${d025} – ${d05} mg`,'IV/IO',`Ref. IV/IO Dose Calculation:\n${fmt(w)}kg x 0.25mg – ${fmt(w)}kg x 0.5mg`),
      S('Analgesia (IM/IN)',`${d05} – ${d1} mg`,'IM/IN',`Ref. IM/IN Dose Calculation:\n${fmt(w)}kg x 0.5mg – ${fmt(w)}kg x 1mg`),
      S('Conscious / Procedural sedation (Light) IV/IO',`${d05} mg`,'IV/IO',`Ref. IV/IO Dose Calculation:\n${fmt(w)}kg x 0.5mg`),
      S('Conscious / Procedural sedation (Light) IM/IN',`${d1} mg`,'IM/IN',`Ref. IM/IN Dose Calculation:\n${fmt(w)}kg x 1mg`),
      S('Conscious / Procedural sedation (Deep) IV/IO',`${d1} mg`,'IV/IO',`Ref. IV/IO Dose Calculation: ${fmt(w)}kg x 1mg`),
      S('Conscious / Procedural sedation (Deep) IM/IN',`${d2} mg`,'IM/IN',`Ref. IM/IN Dose Calculation: ${fmt(w)}kg x 2mg`),
      S('Post RSI (IV/IO)',`${d05} mg`,'IV/IO',`Ref. Dose Calculation: ${fmt(w)}kg x 0.5mg`),
      S('Ketamine IV/IO Infusion','0.01 – 0.05 mg/kg/min','IV/IO infusion','Titrated to maintain sedation post RSI\nDilute 200mg (4ml) Ketamine with 16ml NS to a total of 20ml (10mg/ml).\nStart infusion at desired range and titrate to effect.')
    ]};}
  function bMagSulph_M(){ const g=getInputsMonths(); if(g.err) return errOut(g.err); const w=g.w,h=g.header; const d25=fmt(w*25), d50=fmt(w*50);
    return {header:h,sections:[
      S('Bronchoconstriction',`${d25} – ${d50} mg`,'IV/IO',`MAX dose is 2g\nInfused over 20 minutes\nRef. Dose Calculation: ${fmt(w)}kg x 25mg - ${fmt(w)}kg x 50mg`),
      S('Torsades de Pointes',`${d25} – ${d50} mg`,'IV/IO',`MAX dose is 2g\nInfused over 20 minutes\nRef. Dose Calculation: ${fmt(w)}kg x 25mg - ${fmt(w)}kg x 50mg`)
    ]};}
  function bMidazolam_M(){ const g=getInputsMonths(); if(g.err) return errOut(g.err); const w=g.w,h=g.header; const d01=fmt(w*0.1), d02=fmt(w*0.2);
    return {header:h,sections:[
      S('Seizure (IV/IO)',`${d01} mg`,'IV/IO',`MAX single dose 5mg to MAX total dose 10mg\nRepeat PRN after 5 minutes\nRef. Dose Calculation: ${fmt(w)}kg x 0.1mg`),
      S('Seizure (IM)',`${d02} mg`,'IM',`Max single dose of 10mg\nRepeat PRN after 15 minutes\nRef. Dose Calculation: ${fmt(w)}kg x 0.2mg`),
      S('Seizure (IN/Buccal)',`${d02} mg`,'IN/Buccal',`MAX of 1ml per nostril/dose\nRef. Dose Calculation: ${fmt(w)}kg x 0.2mg`)
    ]};}
  function bNaloxone_M(){ const g=getInputsMonths(); if(g.err) return errOut(g.err); const w=g.w,h=g.header; const d=fmt(w*0.01);
    return {header:h,sections:[ S('Opioid Overdose',`${d} mg`,'IV/IO/IM',`MAX single dose is 0.4mg\nMAX total dose 2mg\nRepeat PRN every 2-3 minutes\n\nRef. Dose Calculation: ${fmt(w)}kg x 0.01mg`) ]};}
  function bOndansetron_M(){ const g=getInputsMonths(); if(g.err) return errOut(g.err); const w=g.w,h=g.header; const d=fmt(w*0.1);
    return {header:h, sections:[ S('Nausea & Vomiting',`${d} mg`,'IV/IM',`MAX dose is 4mg. Given Slowly
Dilution: 4mg(2ml) + 8ml NaCl = 4mg/10ml = 0.4mg/1ml

Ref. Dose Calculation: ${fmt(w)}kg x 0.1mg`)]};}
  function bParacetamol_M(){ const g=getInputsMonths(); if(g.err) return errOut(g.err);
    if (Number.isFinite(g.m)){ const m=g.m; const w=g.w; const h=g.header;
      if (m<=2){ const iv=fmt(w*7.5); return {header:h,sections:[
        S('Pain and/or fever (Oral)','—','—','Not recommended for < 2 months old'),
        S('Moderate Pain (IV)',`${iv} mg`,'IV',`MAX dose is 20mg/kg.
Undiluted: 1000mg/100ml = 10mg/1ml

Ref. Dose Calculation: ${fmt(w)}kg x 7.5mg`) ]}; }
      else { const oral=fmt(w*15), iv=fmt(w*7.5); return {header:h,sections:[
        S('Pain and/or fever (Oral)',`${oral} mg`,'PO',`Paracetamol syrup: 120mg/5ml

Ref. Dose Calculation: ${fmt(w)}kg x 15mg`),
        S('Moderate Pain (IV)',`${iv} mg`,'IV',`MAX dose is 20mg/kg.
Undiluted: 1000mg/100ml = 10mg/1ml

Ref. Dose Calculation: ${fmt(w)}kg x 7.5mg`) ]}; }
    } else { const w=g.w,h=g.header;
      if (w<=4.0){ const iv=fmt(w*7.5); return {header:h,sections:[
        S('Pain and/or fever (Oral)','—','—','Not recommended for < 2 months old'),
        S('Moderate Pain (IV)',`${iv} mg`,'IV',`MAX dose is 20mg/kg.
Undiluted: 1000mg/100ml = 10mg/1ml

Ref. Dose Calculation: ${fmt(w)}kg x 7.5mg`) ]}; }
      else { const oral=fmt(w*15), iv=fmt(w*7.5); return {header:h,sections:[
        S('Pain and/or fever (Oral)',`${oral} mg`,'PO',`Paracetamol syrup: 120mg/5ml

Ref. Dose Calculation: ${fmt(w)}kg x 15mg`),
        S('Moderate Pain (IV)',`${iv} mg`,'IV',`MAX dose is 20mg/kg.
Undiluted: 1000mg/100ml = 10mg/1ml

Ref. Dose Calculation: ${fmt(w)}kg x 7.5mg`) ]}; } } }
  function bRocuronium_M(){ const g=getInputsMonths(); if(g.err) return errOut(g.err); const w=g.w,h=g.header; const d=fmt(w*0.25);
    return {header:h,sections:[
      S('PRE Intubation Paralytic','—','—','Rocuronium Not Indicated in this age group for PRE Intubation.'),
      S('POST Intubation Paralytic',`${d} mg`,'IV',`IV dose - Repeat PRN every 30 - 45 minutes.

Ref. Dose Calculation: ${fmt(w)}kg x 0.25mg`)
    ]};}
  function bSalbutamol_M(){ const g=getInputsMonths(); if(g.err) return errOut(g.err); const w=g.w,h=g.header; const inf=fmt(w*10);
    return {header:h,sections:[
      S('Bronchoconstriction (Neb)','2.5mg','NEB','2.5mg/3ml nebule - Neb should be mixed to a volume of 5ml\nCan be given with Ipratropium Bromide'),
      S('Bronchoconstriction (IV/IO)',`${inf} mcg`,'IV/IO Infusion',`MAX dose is 250mcg\nInfused over 10 minutes

Ref. Dose Calculation: ${fmt(w)}kg x 10mcg`)
    ]};}
  function bTXA_M(){ const g=getInputsMonths(); if(g.err) return errOut(g.err); const w=g.w,h=g.header; const d=fmt(w*15);
    return {header:h,sections:[ S('Major Haemorrhage (CCP Only)',`${d} mg`,'IV/IO',`Paediatric (<14 years old) with (major trauma < 3 hours old) with suspected or confirmed (major haemorrhage)
Infused over 10 minutes
MAX of 1g)

Ref. Dose Calculation: ${fmt(w)}kg x 15mg`) ]};}
  function bWAAFELSS_M(){ const g=getInputsMonths(); if(g.err) return errOut(g.err); const w=g.w; const m=Number.isFinite(g.m)? g.m : null;
    const sbp = (m!==null) ? `${(m/12)*2 + 70} mmHg` : null;
    const adrMg=fmt(w*0.01), adrMl=fmt(w/10), ami=fmt(w*5.0), flMin=fmt(w*10), flMax=fmt(w*20);
    const cap=v=> v>360?360:v; const s1=fmt(cap(w*4)), s2=fmt(cap(w*6)), s3=fmt(cap(w*8)), s4=fmt(cap(w*10));
    let rosc=w*2.5; if (rosc>50) rosc=50; const roscStr=fmt(rosc);
    const tube = (w<=5.0) ? 'Size 1' : 'Size 1.5';
    const deco = 'IV Catheter 22g\n(Color:Blue | Length:2.5cm)';
    const sections=[ S('Weight',`${fmt(w)} kg`,'—'), S('Adrenaline',`${adrMg} mg (${adrMl} ml)`,'—'), S('Amiodarone',`${ami} mg (${adrMl} ml)`,'—'), S('Fluids',`${flMin}–${flMax} ml`,'—'), S('SGA',tube,'—'), S('Energy Escalation',`${s1} J → ${s2} J → ${s3} J → ${s4} J`,'—'), ...(sbp? [S('Systolic BP',sbp,'—')] : []), S('Dextrose 10% in CA',`${roscStr} ml`,'—'), S('Chest Wall Decompression',deco,'—') ];
    return {header:'The WAAFELSS for your patient:\n', sections, kv:true};
  }

  const MONTH_BUILDERS = {
    'Adenosine': bAdenosine_M,
    'Adrenaline': bAdrenaline_M,
    'Amiodarone': bAmiodarone_M,
    'Atropine': bAtropine_M,
    'Dexamethasone': bDexamethasone_M,
    'Dextrose 10%': bDextrose10_M,
    'Diphenhydramine': bDiphenhydramine_M,
    'Droperidol': bDroperidol_M,
    'Fentanyl': bFentanyl_M,
    'Glucagon': bGlucagon_M,
    'Hydrocortison': bHydrocortison_M,
    'Ipratropium Bromide': bIprat_M,
    'Ketamine': bKetamine_M,
    'Magnesium Sulphate': bMagSulph_M,
    'Midazolam': bMidazolam_M,
    'Naloxone': bNaloxone_M,
    'Ondansetron': bOndansetron_M,
    'Paracetamol': bParacetamol_M,
    'Rocuronium': bRocuronium_M,
    'Salbutamol': bSalbutamol_M,
    'TXA': bTXA_M,
    'WAAFELSS': bWAAFELSS_M
  };

  function errOut(msg){ return {header:msg, sections:[S('—','—','—')]}; }

  /* ====== YEARS BUILDERS (ported from your Kotlin Part 2) ====== */
  const Y = { };

  Y.Adenosine = ()=>{ const g=getInputsYears(); if(g.err) return errOut(g.err); const w=g.w,h=g.header;
    // weight bounds already handled in getInputsYears()
    const d1=w*0.1, d2=w*0.2;
    return {header:h,sections:[
      S('SVT – First Dose',`${fmt(d1)} mg`,'IV/IO',`MAX dose of 6mg (Undiluted 6mg per 2ml).\nRef.Dose Calculation: ${w}kg x 0.1mg`),
      S('SVT – Second Dose',`${fmt(d2)} mg`,'IV/IO',`MAX dose of 12mg (Undiluted 6mg per 2ml).\nRef.Dose Calculation: ${w}kg x 0.2mg`)
    ]}; };

  Y.Adrenaline = ()=>{ const g=getInputsYears(); if(g.err) return errOut(g.err); const w=g.w,h=g.header;
    const cardiac=fmt(w*0.01), brady=fmt(w*1.0), inoMin=fmt(w*0.05), inoMax=fmt(w*0.3);
    const croupNeb='5', anaphIM=fmt(w*0.01), anaphIV=fmt(w*1.0);
    return {header:h,sections:[
      S('Cardiac Arrest',`${cardiac} mg`,'IV/IO',`Repeat every 4 minutes\nRef.Dose Calculation: ${w}kg x 0.01mg`),
      S('Bradycardia',`${brady} mcg`,'IV/IO',`MAX Dose 50 mcg.\nRepeat PRN every 2-4 minutes.\nRef.Dose Calculation: ${w}kg x 1mcg`),
      S('Inotrope/Vasopressor',`${inoMin} - ${inoMax} mcg/min`,'IV/IO infusion',`Mix 1mg (1:1000) in 100ml NS. Draw 50ml into 50ml syringe\nRef.Dose Calculation: ${w}kg x 0.05mcg - ${w}kg x 0.3mcg`),
      S('Severe Bronchoconstriction (IM)',`${cardiac} mg (MAX 0.5 mg)`,'IM',`Repeat PRN every 5 minutes.\nRef.Dose Calculation: ${w}kg x 0.01mg`),
      S('Severe Bronchoconstriction (IV/IO)',`${brady} mcg`,'IV/IO',`MAX Single Dose 50 mcg.\nRepeat PRN every 1-10 minutes.\nRef.Dose Calculation: ${w}kg x 1mcg`),
      S('Croup & Upper Airway Swelling',`${croupNeb} mg`,'NEB',`MAX dose of 5mg\nRepeat PRN every 5 minutes\nRef.Dose Calculation: ${w}kg x 0.5mg`),
      S('Anaphylaxis (IM)',`${anaphIM} mg`,'IM',`MAX dose is 0.5mg\nRepeat PRN every 5 minutes\nRef.Dose Calculation: ${w}kg x 0.01mg`),
      S('Anaphylaxis (IV/IO)',`${anaphIV} mcg`,'IV/IO',`MAX single dose is 50mcg. Repeat every 1-10 mins\nRef.Dose Calculation: ${w}kg x 1mcg`)
    ]}; };

  Y.Amiodarone = ()=>{ const g=getInputsYears(); if(g.err) return errOut(g.err); const w=g.w,h=g.header; const d=fmt(w*5.0);
    return {header:h,sections:[
      S('Cardiac Arrest',`${d} mg`,'IV/IO',`After 3rd shock. Repeat twice up to 15mg per kg\nMAX Dose is 300mg (Up to a total of 3 doses).\nRef. Dose Calculation: ${w}kg x 5mg`),
      S('VT with a pulse',`${d} mg`,'IV/IO infusion',`Over 20 to 60 minutes\nMAX dose of 300mg.\nRef. Dose Calculation: ${w}kg x 5mg`)
    ]}; };

  Y.Atropine = ()=>{ const g=getInputsYears(); if(g.err) return errOut(g.err); const w=g.w,h=g.header;
    const age = g.ageResolved ?? g.a ?? null;
    let brady, orga;
    if (age !== null){
      if (age<=5){ brady=fmt(w*0.02); orga=fmt(w*0.05); }
      else if (age>=6 && age<=11){ brady='0.5'; orga=fmt(w*0.05); }
      else if (age>=12 && age<=14){ brady='0.5'; orga='2'; }
      else { brady=fmt(w*0.02); orga=fmt(w*0.05); }
    } else {
      if (w<22){ brady=fmt(w*0.02); orga=fmt(w*0.05); }
      else if (w>=22 && w<=34){ brady='0.5'; orga=fmt(w*0.05); }
      else { brady='0.5'; orga='2'; }
    }
    return {header:h,sections:[
      S('Bradycardia',`${brady} mg`,'IV/IO',`MIN single dose is 0.1 mg and MAX single dose 0.5 mg. Repeat once if required.\nRef. Dose Calculation: ${w}kg x 0.02mg`),
      S('Organophosphate Toxicity',`${orga} mg`,'IV/IO or IM',`MAX dose is 2 mg. Repeat PRN every 5 minutes, until clinical condition improves.\nRef. Dose Calculation: ${w}kg x 0.05mg`)
    ]}; };

  Y.Dexamethasone = ()=>{ const g=getInputsYears(); if(g.err) return errOut(g.err); const w=g.w,h=g.header;
    const age = g.ageResolved ?? g.a ?? null;
    let dose;
    if (age !== null){
      if (age>=6 && age<=14) dose = '12';
      else if (w >= 22) dose = '12';
      else dose = fmt(w*0.6);
    } else {
      dose = (w >= 22) ? '12' : fmt(w*0.6);
    }
    return {header:h,sections:[ S('Croup',`${dose} mg`,'PO/IM/IV',`Max dose 12 mg\nSingle dose\nRef. Dose Calculation: ${w} kg x 0.6mg`) ]}; };

  Y['Dextrose 10%'] = ()=>{ const g=getInputsYears(); if(g.err) return errOut(g.err); const w=g.w,h=g.header;
    const hyp = `${w*5} ml`;
    const age = g.ageResolved ?? g.a ?? null;
    let rosc;
    if (age !== null){
      if (age<=5){ rosc = fmt(Math.min(w*2.5,50)); }
      else if (age>=6 && age<=14){ rosc='50'; }
      else { rosc = fmt(Math.min(w*2.5,50)); }
    } else { rosc = fmt(w<=21? w*2.5 : 50); }
    return {header:h,sections:[
      S('Hypoglycemia',hyp,'IV/IO',`Ref. Dose Calculation: ${w}kg x 5ml`),
      S('Hypoglycemia in cardiac arrest or ROSC',`${rosc} ml`,'IV/IO',`Ref. Dose Calculation: ${w}kg x 2.5ml`)
    ]}; };

  Y.Diphenhydramine = ()=>{ const g=getInputsYears(); if(g.err) return errOut(g.err); const w=g.w,h=g.header; const dose = Math.min(w*1,50);
    return {header:h,sections:[ S('Anaphylaxis/Allergic reaction',`${dose} mg`,'IV/IO/IM',`MAX dose is 50mg.\n\nRef. Dose Calculation: ${w}kg x 1mg`) ]}; };

  Y.Droperidol = ()=>{ const g=getInputsYears(); if(g.err) return errOut(g.err); const w=g.w; let header=g.header;
    const age = g.ageResolved ?? g.a ?? null;
    if (age !== null && age>=1 && age<=7) return {header: `${header}\n\nNot for use in patients < 8 years old (< 30 kg)`, sections:[S('—','—','—')]};
    const min=w*0.1, max=w*0.2;
    return {header,sections:[ S('Acute Behavioural Disturbance - Sedation',`${fmt(min)} mg – ${fmt(max)} mg`,'IV/IM',`Single MAXIMUM dose of 10 mg\nDose may be repeated once after 15 minutes if required\n\nTotal MAXIMUM dose 20 mg\n\nRef. Dose Calculation: ${w} kg x 0.1mg – ${w} kg x 0.2mg`) ]}; };

  Y.Fentanyl = ()=>{ const g=getInputsYears(); if(g.err) return errOut(g.err); const w=g.w,h=g.header;
    const iv=fmt(w*1.0), ivMax=fmt(w*2.0), inDose=fmt(w*2.0), postRSI=fmt(w*0.5);
    const age = g.ageResolved ?? g.a ?? null;
    const sections=[
      S('Analgesia (IV/IO)',`${iv} mcg`,'IV/IO',`MAX Total Dose ${ivMax} mcg\nRef. Dose Calculation: ${w} kg x 1mcg`),
      S('Analgesia (IN)',`${inDose} mcg`,'IN',`MAX dose per nostril is 0.3 to 0.5 ml.\nRef. Dose Calculation: ${w} kg x 2mcg`)
    ];
    const rsiAllowed = age !== null ? (age>=8 && age<=14) : (w>28);
    sections.push( rsiAllowed
      ? S('Rapid Sequence Intubation (RSI)', `${fmt(w*1.0)} mcg`, 'IV/IO', `Ref. Dose Calculation: ${w} kg x 1mcg`)
      : S('Rapid Sequence Intubation (RSI)','—','—','Not indicated in this age group for intubation')
    );
    sections.push(S('Post RSI',`${postRSI} mcg`,'IV/IO',`Ref. Dose Calculation: ${w} kg x 0.5mcg`));
    sections.push(S('Fentanyl IV/IO Infusion','1–10 mcg/kg/hr','IV/IO infusion','Titrated to maintain sedation post RSI.\nDilute 200 mcg (2 amps) Fentanyl with 16 ml NS to a total of 20 ml to give a concentration of 10 mcg/1 ml.\nStart infusion at desired range and titrate to effect and monitor BP.'));
    return {header:h,sections};
  };

  Y.Glucagon = ()=>{ const g=getInputsYears(); if(g.err) return errOut(g.err); const w=g.w,h=g.header;
    const dose = w<=20 ? 0.5 : 1.0; const ref = w<=20 ? 'Patient weight <= 20 kg (age < 6 years old) = 0.5 mg IM = 0.5 ml' : 'Patient weight > 20 kg (age >= 6 years old) = 1 mg IM = 1 ml';
    return {header:h,sections:[ S('Symptomatic Hypoglycaemia',`${fmt(dose)} mg`,'IM','If no IV access or Dextrose ineffective\n\nReconstituted: 1 mg/1 ml\n\nRef. Dose: '+ref) ]}; };

  Y.Hydrocortison = ()=>{ const g=getInputsYears(); if(g.err) return errOut(g.err); const w=g.w,h=g.header; const dose=Math.min(w*5,200);
    return {header:h,sections:[ S('Asthma/Anaphylaxis/Allergic reaction',`${fmt(dose)} mg`,'IV/IO',`MAX dose is 200 mg\nSingle dose\nRef. Dose Calculation: ${w} kg x 5mg`) ]}; };

  Y['Ipratropium Bromide'] = ()=>{ const g=getInputsYears(); if(g.err) return errOut(g.err); const w=g.w; const header=g.header;
    const age = g.ageResolved ?? g.a ?? null;
    if (age !== null){
      if (age<=6) return {header,sections:[ S('Bronchoconstriction - Neb :','0.25 mg','NEB',`Neb should be mixed to a volume of 5 ml

• Ipratropium Bromide must always be administered together with Salbutamol in the same nebuliser — never on its own.
• Ipratropium Bromide is a single dose. If additional doses are required, request CCP assistance. CCP is required for a second dose; maximum 2 doses may be given 20 minutes apart.

Ref. Dose Calculation: 0.25 mg for Age < 6 years`) ]};
      if (age>=7 && age<=14) return {header,sections:[ S('Bronchoconstriction - Neb :','0.25 mg - 0.5 mg','NEB',`Neb should be mixed to a volume of 5 ml

• Ipratropium Bromide must always be administered together with Salbutamol in the same nebuliser — never on its own.
• Ipratropium Bromide is a single dose. If additional doses are required, request CCP assistance. CCP is required for a second dose; maximum 2 doses may be given 20 minutes apart.

Ref. Dose Calculation: 0.25 mg - 0.5 mg for Age > 6 years`) ]};
      return errOut('This age exceeds the pediatric range. Please refer to the CPG formulary section for appropriate medication guidance.');
    }
    const doseStr = w<=21 ? '0.25 mg' : '0.25 mg - 0.5 mg';
    const refStr  = w<=21 ? '0.25 mg for Weight ≤ 21 kg' : '0.25 mg - 0.5 mg for Weight > 21 kg';
    return {header,sections:[ S('Bronchoconstriction - Neb :',doseStr,'NEB',`Neb should be mixed to a volume of 5 ml

• Ipratropium Bromide must always be administered together with Salbutamol in the same nebuliser — never on its own.
• Ipratropium Bromide is a single dose. If additional doses are required, request CCP assistance. CCP is required for a second dose; maximum 2 doses may be given 20 minutes apart.

Ref. Dose Calculation: ${refStr}`) ]};
  };

  Y.Ketamine = ()=>{ const g=getInputsYears(); if(g.err) return errOut(g.err); const w=g.w, h=g.header;
    const d1=fmt(w*0.25), d2=fmt(w*0.5), d3=fmt(w*1.0), d4=fmt(w*2.0);
    const age = g.ageResolved ?? g.a ?? null;
    if (age !== null){
      if (age<=7){
        return {header:h,sections:[
          S('Analgesia (IV/IO)',`${d1} – ${d2} mg`,'IV/IO',`Ref. IV/IO Dose Calculation:\n${w} kg x 0.25mg – ${w} kg x 0.5mg`),
          S('Analgesia (IM/IN)',`${d2} – ${d3} mg`,'IM/IN',`Ref. IM/IN Dose Calculation:\n${w} kg x 0.5mg – ${w} kg x 1mg`),
          S('Conscious / Procedural sedation (Light) IV/IO',`${d2} mg`,'IV/IO',`Ref. IV/IO Dose Calculation:\n${w} kg x 0.5mg`),
          S('Conscious / Procedural sedation (Light) IM/IN',`${d3} mg`,'IM/IN',`Ref. IM/IN Dose Calculation:\n${w} kg x 1mg`),
          S('Deep Sedation (IV/IO)',`${d3} mg`,'IV/IO',`Ref. IV/IO Dose Calculation: ${w} kg x 1mg`),
          S('Deep Sedation (IM/IN)',`${d4} mg`,'IM/IN',`Ref. IM/IN Dose Calculation: ${w} kg x 2mg`),
          S('Post RSI (IV/IO)',`${d2} mg`,'IV/IO',`Ref. Dose Calculation: ${w} kg x 0.5mg`),
          S('Rapid Sequence Intubation','—','—','Not indicated in this age group for intubation'),
          S('Ketamine IV/IO Infusion','0.01 – 0.05 mg/kg/min','IV/IO infusion','Titrated to maintain sedation post RSI\nDilute 200 mg (4 ml) Ketamine with 16 ml NS to a total of 20 ml to give a concentration of 10 mg/ml.\nStart infusion at desired range and titrate to effect.')
        ]};
      }
      if (age>=8 && age<=14){
        return {header:h,sections:[
          S('Analgesia (IV/IO)',`${d1} – ${d2} mg`,'IV/IO',`Ref. IV/IO Dose Calculation:\n${w} kg x 0.25 – ${w} kg x 0.5mg`),
          S('Analgesia (IM/IN)',`${d2} – ${d3} mg`,'IM/IN',`Ref. IM/IN Dose Calculation:\n${w} kg x 0.5 – ${w} kg x 1mg`),
          S('Conscious / Procedural sedation (Light) IV/IO',`${d2} mg`,'IV/IO',`Ref. IV/IO Dose Calculation:\n${w} kg x 0.5mg`),
          S('Conscious / Procedural sedation (Light) IM/IN',`${d3} mg`,'IM/IN',`Ref. IM/IN Dose Calculation:\n${w} kg x 1mg`),
          S('Deep Sedation (IV/IO)',`${d3} mg`,'IV/IO',`Ref. IV/IO Dose Calculation: ${w} kg x 1mg`),
          S('Deep Sedation (IM/IN)',`${d4} mg`,'IM/IN',`Ref. IM/IN Dose Calculation: ${w} kg x 2mg`),
          S('Rapid Sequence Intubation – Unstable Patient',`${fmt(w*1.0)} mg`,'IV/IO',`Ref. Dose Calculation: ${w} kg x 1mg`),
          S('Rapid Sequence Intubation – Stable Patient',`${fmt(w*2.0)} mg`,'IV/IO',`Ref. Dose Calculation: ${w} kg x 2mg`),
          S('Post RSI (IV/IO)',`${d2} mg`,'IV/IO',`Ref. Dose Calculation: ${w} kg x 0.5mg`),
          S('Ketamine IV/IO Infusion','0.01 – 0.05 mg/kg/min','IV/IO infusion','Titrated to maintain sedation post RSI\nDilute 200 mg (4 ml) Ketamine with 16 ml NS to a total of 20 ml to give a concentration of 10 mg/ml.\nStart infusion at desired range and titrate to effect.')
        ]};
      }
      return errOut('This age exceeds the pediatric range. Please refer to the CPG formulary section for appropriate medication guidance.');
    }
    // weight path
    const rsiUnstable = (w<=28)? S('Rapid Sequence Intubation – Unstable Patient','—','—','Not indicated in this age group for intubation')
                                : S('Rapid Sequence Intubation – Unstable Patient',`${fmt(w*1.0)} mg`,'IV/IO',`Ref. Dose Calculation: ${w} kg x 1mg`);
    const rsiStable   = (w<=28)? S('Rapid Sequence Intubation – Stable Patient','—','—','Not indicated in this age group for intubation')
                                : S('Rapid Sequence Intubation – Stable Patient',`${fmt(w*2.0)} mg`,'IV/IO',`Ref. Dose Calculation: ${w} kg x 2mg`);
    return {header:h,sections:[
      S('Analgesia (IV/IO)',`${d1} – ${d2} mg`,'IV/IO',`Ref. IV/IO Dose Calculation:\n${w} kg x 0.25mg – ${w} kg x 0.5mg`),
      S('Analgesia (IM/IN)',`${d2} – ${d3} mg`,'IM/IN',`Ref. IM/IN Dose Calculation:\n${w} kg x 0.5mg – ${w} kg x 1mg`),
      S('Conscious/Procedural sedation (Light) IV/IO',`${d2} mg`,'IV/IO',`Ref. IV/IO Dose Calculation:\n${w} kg x 0.5mg`),
      S('Conscious/Procedural sedation (Light) IM/IN',`${d3} mg`,'IM/IN',`Ref. IM/IN Dose Calculation:\n${w} kg x 1mg`),
      S('Deep Sedation (IV/IO)',`${d3} mg`,'IV/IO',`Ref. IV/IO Dose Calculation: ${w} kg x 1mg`),
      S('Deep Sedation (IM/IN)',`${d4} mg`,'IM/IN',`Ref. IM/IN Dose Calculation: ${w} kg x 2mg`),
      rsiUnstable, rsiStable,
      S('Post RSI (IV/IO)',`${d2} mg`,'IV/IO',`Ref. Dose Calculation: ${w} kg x 0.5mg`),
      S('Ketamine IV/IO Infusion','0.01 – 0.05 mg/kg/min','IV/IO infusion','Titrated to maintain sedation post RSI\nDilute 200 mg (4 ml) Ketamine with 16 ml NS to a total of 20 ml to give a concentration of 10 mg/ml.\nStart infusion at desired range and titrate to effect.')
    ]};
  };

  Y['Magnesium Sulphate'] = ()=>{ const g=getInputsYears(); if(g.err) return errOut(g.err); const w=g.w,h=g.header;
    const min=w*25;
    const max = Math.min(w*50, 2000); // enforce 2 g ceiling even when weight is entered directly
    const doseText = `${fmt(min)} mg - ${fmt(max)} mg`;
    return {header:h,sections:[
      S('Bronchoconstriction', doseText, 'IV/IO', `MAX dose is 2g\nInfused over 20 minutes\nRef. Dose Calculation: ${w} kg x 25mg - ${w} kg x 50mg`),
      S('Torsades de Pointes', doseText, 'IV/IO', `MAX dose is 2g\nInfused over 20 minutes\nRef. Dose Calculation: ${w} kg x 25mg - ${w} kg x 50mg`)
    ]};
  };

  Y.Midazolam = ()=>{ const g=getInputsYears(); if(g.err) return errOut(g.err); const w=g.w,h=g.header;
    const d01 = fmt(w*0.1), d02 = fmt(w*0.2);
    return {header:h,sections:[
      S('Seizure (IV/IO)', `${d01} mg`, 'IV/IO', `MAX single dose 5mg to MAX total dose 10mg\nRepeat PRN after 5 minutes\nRef. Dose Calculation: ${w} kg x 0.1mg`),
      S('Seizure (IM)', `${d02} mg`, 'IM', `Max single dose of 10mg\nRepeat PRN after 15 minutes\nRef. Dose Calculation: ${w} kg x 0.2mg`),
      S('Seizure (IN/Buccal)', `${d02} mg`, 'IN/Buccal', `MAX of 1ml per nostril/dose\nRef. Dose Calculation: ${w} kg x 0.2mg`)
    ]};
  };

  Y.Naloxone = ()=>{ const g=getInputsYears(); if(g.err) return errOut(g.err); const w=g.w,h=g.header;
    const age = g.ageResolved ?? g.a ?? null;
    let dose, ref;
    if (age !== null){
      if (age>=10 && age<=14){
        dose = 0.4;
        ref = `Ref. Dose Calculation: ${w} kg x 0.01mg but MAX dose is 0.4 mg`;
      } else {
        dose = w*0.01;
        ref = `Ref. Dose Calculation: ${w} kg x 0.01mg`;
      }
    } else {
      if (w<=34){
        dose = w*0.01;
        ref = `Ref. Dose Calculation: ${w} kg x 0.01mg`;
      } else {
        dose = 0.4;
        ref = `Ref. Dose Calculation: ${w} kg x 0.01mg but MAX dose is 0.4 mg`;
      }
    }
    return {header:h,sections:[
      S('Opioid Overdose', `${fmt(dose)} mg`, 'IV/IO/IM', `MAX single dose is 0.4mg\nMAX total dose 2mg\nRepeat PRN every 2-3 minutes\n\n${ref}`)
    ]};
  };

  Y.Ondansetron = ()=>{ const g=getInputsYears(); if(g.err) return errOut(g.err); const w=g.w,h=g.header;
    const age = g.ageResolved ?? g.a ?? null;
    let dose, ref;
    if (age !== null){
      if (age>=12 && age<=14){
        dose = 4.0;
        ref = `Ref. Dose Calculation: ${w} kg x 0.1mg but MAX dose is 4 mg`;
      } else {
        dose = w*0.1;
        ref = `Ref. Dose Calculation: ${w} kg x 0.1mg`;
      }
    } else {
      if (w<=40){
        dose = w*0.1;
        ref = `Ref. Dose Calculation: ${w} kg x 0.1mg`;
      } else {
        dose = 4.0;
        ref = `Ref. Dose Calculation: ${w} kg x 0.1mg but MAX dose is 4 mg`;
      }
    }
    return {header:h,sections:[
      S('Nausea & Vomiting', `${fmt(dose)} mg`, 'IV/IM', `MAX dose is 4 mg. Given Slowly.\nDilution: 4 mg (2 ml) + 8 ml NaCl = 4 mg/10 ml = 0.4 mg/1 ml\n\n${ref}`)
    ]};
  };

  Y.Paracetamol = ()=>{ const g=getInputsYears(); if(g.err) return errOut(g.err);
    const w=g.w, h=g.header;
    const age = g.ageResolved ?? g.a ?? null;
    const oral = w*15.0;
    let iv, ivRef;
    if (age !== null){
      if (age===1){
        iv = w*7.5;
        ivRef = `Ref. Dose Calculation: ${w} kg x 7.5mg`;
      } else {
        iv = w*15.0;
        ivRef = `Ref. Dose Calculation: ${w} kg x 15mg`;
      }
    } else {
      if (w<=11){
        iv = w*7.5;
        ivRef = `Ref. Dose Calculation: ${w} kg x 7.5mg`;
      } else {
        iv = w*15.0;
        ivRef = `Ref. Dose Calculation: ${w} kg x 15mg`;
      }
    }
    const oralRef = `Ref. Dose Calculation: ${w} kg x 15mg`;
    return {header:h,sections:[
      S('Pain and/or fever (Oral)', `${fmt(oral)} mg`, 'PO', `Paracetamol syrup: 120 mg/5 ml\n\n${oralRef}`),
      S('Moderate Pain (IV)', `${fmt(iv)} mg`, 'IV', `MAX dose is 20 mg/kg.\nUndiluted: 1000 mg/100 ml = 10 mg/1 ml\n\n${ivRef}`)
    ]};
  };

  Y.Rocuronium = ()=>{ const g=getInputsYears(); if(g.err) return errOut(g.err); const w=g.w, h=g.header;
    const dosePost = w*0.25, dosePre = w*1.5;
    const age = g.ageResolved ?? g.a ?? null;
    let sections;
    if (age !== null){
      if (age<=7){
        sections = [
          S('PRE Intubation Paralytic','—','—','Rocuronium not indicated in this age group for PRE intubation.'),
          S('POST Intubation Paralytic', `${fmt(dosePost)} mg`, 'IV', `Repeat PRN every 30–45 minutes.\n\nRef. Dose Calculation: ${w} kg x 0.25mg`)
        ];
      } else if (age>=8 && age<=14){
        sections = [
          S('PRE Intubation Paralytic', `${fmt(dosePre)} mg`, 'IV', `NOTE: RSI PRIMARY PARALYTIC AGENT ONLY FOR: MEDICAL and TRAUMA PATIENTS ≥ 8 YEARS.\nUndiluted: 10 mg/1 ml.\nRef. Dose Calculation: ${w} kg x 1.5mg`),
          S('POST Intubation Paralytic', `10 mg`, 'IV', `Repeat PRN every 30–45 minutes.\n\nRef. Dose Calculation: ${w} kg x 0.25`)
        ];
      } else {
        return errOut('This age exceeds the pediatric range. Please refer to the CPG formulary section for appropriate medication guidance.');
      }
    } else {
      if (w<=28){
        sections = [
          S('PRE Intubation Paralytic','—','—','Rocuronium not indicated in this age group for PRE intubation.'),
          S('POST Intubation Paralytic', `${fmt(dosePost)} mg`, 'IV', `Repeat PRN every 30–45 minutes.\n\nRef. Dose Calculation: ${w} kg x 0.25mg`)
        ];
      } else {
        sections = [
          S('PRE Intubation Paralytic', `${fmt(dosePre)} mg`, 'IV', `NOTE: RSI PRIMARY PARALYTIC AGENT ONLY FOR: MEDICAL and TRAUMA PATIENTS ≥ 8 YEARS.\nUndiluted: 10 mg/1 ml.\nRef. Dose Calculation: ${w} kg x 1.5mg`),
          S('POST Intubation Paralytic', `10 mg`, 'IV', `Repeat PRN every 30–45 minutes.\n\nRef. Dose Calculation: ${w} kg x 0.25mg`)
        ];
      }
    }
    return {header:h,sections};
  };

  Y.Salbutamol = ()=>{ const g=getInputsYears(); if(g.err) return errOut(g.err);
    const w=g.w, h=g.header;
    const age = g.ageResolved ?? g.a ?? null;
    let sections;
    if (age !== null && age<=5){
      const neb='2.5', inf=fmt(w*10.0);
      sections = [
        S('Bronchoconstriction (Neb)', `${neb} mg`, 'NEB', '2.5mg/3ml nebule - Neb should be mixed to a volume of 5ml\nCan be given with Ipratropium Bromide'),
        S('Bronchoconstriction (IV/IO)', `${inf} mcg`, 'IV/IO infusion', `MAX dose is 250mcg\nInfused over 10 minutes\n\nRef. Dose Calculation: ${w} kg x 10mcg`)
      ];
    } else if (age !== null && age>=6 && age<=14){
      sections = [
        S('Bronchoconstriction (Neb)', `2.5 – 5 mg`, 'NEB', '2.5mg/3ml nebule - Neb should be mixed to a volume of 5ml\nCan be given with Ipratropium Bromide'),
        S('Bronchoconstriction (IV/IO)', `250 mcg`, 'IV/IO infusion', `MAX dose is 250mcg\nInfused over 10 minutes\n\nRef. Dose Calculation: ${w} kg x 10mcg`)
      ];
    } else {
      if (w<=21){
        const neb='2.5', inf=fmt(w*10.0);
        sections = [
          S('Bronchoconstriction (Neb)', `${neb} mg`, 'NEB', '2.5mg/3ml nebule - Neb should be mixed to a volume of 5ml\nCan be given with Ipratropium Bromide'),
          S('Bronchoconstriction (IV/IO)', `${inf} mcg`, 'IV/IO infusion', `MAX dose is 250mcg\nInfused over 10 minutes\n\nRef. Dose Calculation: ${w} kg x 10mcg`)
        ];
      } else {
        sections = [
          S('Bronchoconstriction (Neb)', `2.5 – 5 mg`, 'NEB', '2.5mg/3ml nebule - Neb should be mixed to a volume of 5ml\nCan be given with Ipratropium Bromide'),
          S('Bronchoconstriction (IV/IO)', `250 mcg`, 'IV/IO infusion', `MAX dose is 250mcg\nInfused over 10 minutes\n\nRef. Dose Calculation: ${w} kg x 10mcg`)
        ];
      }
    }
    return {header:h,sections};
  };

  Y.TXA = ()=>{ const g=getInputsYears(); if(g.err) return errOut(g.err); const w=g.w,h=g.header;
    const d = fmt(w*15.0);
    return {header:h,sections:[
      S('Major Haemorrhage (CCP Only)', `${d} mg`, 'IV/IO', `Paediatric (<14 years old) with (major trauma < 3 hours old) with suspected or confirmed (major haemorrhage)\nInfused over 10 minutes\nMAX of 1g)\n\nRef. Dose Calculation: ${w} kg x 15mg`)
    ]};
  };

  Y.WAAFELSS = ()=>{ const g=getInputsYears(); if(g.err) return errOut(g.err);
    const w=g.w;
    const age = g.ageResolved ?? g.a ?? null;
    const actualAge = g.a ?? null;
    const header = 'The WAAFELSS for your patient:\n';
    const adrMg=fmt(w*0.01), adrMl=fmt(w/10.0);
    const amiMg=fmt(w*5.0),  amiMl=adrMl;
    const flMin=fmt(w*10.0), flMax=fmt(w*20.0);
    let j1=w*4, j2=w*6, j3=w*8, j4=w*10;
    if (age !== null){
      if (age<=5){ j1=Math.min(j1,360); j2=Math.min(j2,360); j3=Math.min(j3,360); j4=Math.min(j4,360); }
      else if (age>=6 && age<=14){ j3=Math.min(j3,360); j4=Math.min(j4,360); }
    } else { j3=Math.min(j3,360); j4=Math.min(j4,360); }
    const rosc = fmt(Math.min(w*2.5,50.0));
    const sga = (age !== null)
      ? (age<=5 ? (w>=10 && w<=24 ? 'Size 2' : (w>=25 && w<=35 ? 'Size 2.5' : '—'))
                : (age>=6 && age<=14 ? (w>=25 && w<=35 ? 'Size 2.5' : 'Consider adult SGA sizes') : '—'))
      : (w>=10 && w<=24 ? 'Size 2' : (w>=25 && w<=35 ? 'Size 2.5' : 'Consider adult SGA sizes'));
    // Chest wall decompression
    let cwdDose, cwdNotes;
    if (age !== null){
      if (age<=5){
        if (age<2){ cwdDose='IV Catheter 22 g'; cwdNotes='(Color: Blue | Length: 2.5 cm)'; }
        else   { cwdDose='IV Catheter 18 g'; cwdNotes='(Color: Green | Length: 3.2 cm)'; }
      } else if (age===6){
        cwdDose='IV Catheter 18 g'; cwdNotes='(Color: Green | Length: 3.2 cm)';
      } else if (age>=7 && age<=13){
        cwdDose='IV Catheter 16 g'; cwdNotes='(Color: Grey | Length: 4.5 cm)';
      } else {
        cwdDose='IV Catheter 16 g'; cwdNotes='(Color: Grey | Length: 4.5 cm)\nConsider patient size\nLonger needle maybe required\nARS Needle 10 g or 14 g)';
      }
    } else {
      if (w>=10 && w<=11){ cwdDose='IV Catheter 22 g'; cwdNotes='(Color: Blue | Length: 2.5 cm)'; }
      else if (w>=12 && w<=27){ cwdDose='IV Catheter 18 g'; cwdNotes='(Color: Green | Length: 3.2 cm)'; }
      else if (w>=28 && w<=48){ cwdDose='IV Catheter 16 g'; cwdNotes='(Color: Grey | Length: 4.5 cm)'; }
      else { cwdDose='IV Catheter 16 g'; cwdNotes='(Color: Grey | Length: 4.5 cm)\nConsider patient size\nLonger needle maybe required\nARS Needle 10 g or 14 g'; }
    }
    const sections = [
      S('Weight', `${w} kg`, '—'),
      S('Adrenaline', `${adrMg} mg (${adrMl} ml)`, 'IV/IO'),
      S('Amiodarone', `${amiMg} mg (${amiMl} ml)`, 'IV/IO'),
      S('Fluids', `${flMin}–${flMax} ml`, 'IV'),
      S('SGA', sga || '—', 'Airway'),
      S('Energy Escalation', `${fmt(j1)} J → ${fmt(j2)} J → ${fmt(j3)} J → ${fmt(j4)} J`, 'Defibrillation'),
      ...((g.mode==='age' && actualAge!==null) ? [S('Systolic BP', `${actualAge*2 + 70} mmHg`, '—')] : []),
      S('Dextrose 10%', `${rosc} ml`, 'IV/IO'),
      S('Chest Wall Decompression', cwdDose, '—', cwdNotes)
    ];
    return {header:header, sections, kv:true};
  };

  /* ====== builder dispatch ====== */
  function buildContent(name){
    const isMonths = (mode==='months');
    if (isMonths){
      const fn = MONTH_BUILDERS[name];
      return fn ? fn() : errOut('Not implemented');
    } else {
      const fn = Y[name];
      return fn ? fn() : errOut('Not implemented');
    }
  }

  /* ====== grid rendering & interactions ====== */
  function renderGrid(){
    grid.innerHTML = '';
    DRUGS.forEach(name=>{
      const bg = COLORS[name] || '#f6f8fd';
      const fg = textColorFor(bg);
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.dataset.name = name;
      btn.style.setProperty('--btnBg', bg);
      btn.style.setProperty('--btnFg', fg);
      btn.setAttribute('aria-label', name);
      btn.textContent = LABELS[name] || name;
      btn.addEventListener('click', ()=> onDrugClick(name));
      grid.appendChild(btn);
    });
  }

  function onDrugClick(name){
    hideAlert();
    setTitle(name);
    rContext.textContent = getContextLine(); 
    const out = buildContent(name);

    if (out && out.header){
      rHeader.textContent = out.header;
      if (headerLooksLikeError(out.header)){
        showAlert(out.header);        // NEW: mirror the header into the orange box
      } else {
        hideAlert();
      }
    } else {
      rHeader.textContent = '';
      hideAlert();
    }

    if (out.header) rHeader.textContent = out.header; else rHeader.textContent = '';
    renderSections(out.sections, !!out.kv);
  }

  viewBtn.addEventListener('click', ()=>{
    const page = Number(viewBtn.dataset.page);
    if (!Number.isFinite(page)) return;
    const title = viewBtn.dataset.title || rTitle.textContent || 'Formulary';
    openAtPage(page, `${title} - Formulary`);
  });

  /* ====== mode switching ====== */
  function setMode(m){
  mode = m;

    // toggle visual state + labels
    if (m==='months'){
      btnMonths.dataset.active = 'true';
      btnYears.dataset.active  = 'false';
      ageLbl.textContent = 'Age (months)';
      ageEl.placeholder  = 'e.g., 6';
    } else {
      btnMonths.dataset.active = 'false';
      btnYears.dataset.active  = 'true';
      ageLbl.textContent = 'Age (years)';
      ageEl.placeholder  = 'e.g., 7';
    }

    // DO NOT clear age/weight — keep user’s values
    // Update the context line to reflect the current interpretation
    rContext.textContent = getContextLine();

    // If a medication is already selected, rebuild the result for the new mode
    const activeBtn = $$('.btn').find(b => b.dataset.active === 'true');
    if (activeBtn){
      onDrugClick(activeBtn.dataset.name);
    }
  }

  btnMonths.addEventListener('click', ()=> setMode('months'));
  btnYears .addEventListener('click', ()=> setMode('years'));

  /* ====== bootstrap ====== */
  renderGrid();
  setMode('months'); // default landing mode
}
