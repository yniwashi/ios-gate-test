// /ambulance/pediatric_ui.js
// CHANGELOG (2026-06-07):
// - Add spacing between medication concentration and vital-sign panels.
// - Open pediatric references in their resolved document and route AP Fluids to PAT page 12.
//
// CHANGELOG (2026-06-05):
// - Pass readable titles when CCP Pediatrics opens Dose Volume or Pediatric Infusions.
// - Use the central nested router so Pediatrics shortcuts preserve correct Back behavior.
// - Route CCP Dose Volume and Pediatric Infusions to the new Android-aligned calculator tools.
// - Align the Age and Weight labels with their input text inset.
// - Make the medication calculation sheet background full width while preserving its content padding.
// - Constrain Pediatrics sheets/dialogs and open resolved medication/reference CPG pages directly.
// - Add shared Android-aligned AP/CCP Pediatrics UI, result sheet, warnings, vitals, concentration editor, and WAAFELSS.

let dependenciesPromise = null;
async function loadDependencies() {
  if (!dependenciesPromise) {
    const version = encodeURIComponent(window.__AMBULANCE_ASSET_VERSION || "current");
    dependenciesPromise = Promise.all([
      window.__AMBULANCE_SHARED_MODULES?.pediatricData
        ? Promise.resolve(window.__AMBULANCE_SHARED_MODULES.pediatricData)
        : import(`./pediatric_data.js?ver=${version}`),
      import(`./pediatric_engine.js?ver=${version}`),
      window.__AMBULANCE_SHARED_MODULES?.searchData
        ? Promise.resolve(window.__AMBULANCE_SHARED_MODULES.searchData)
        : import(`./search_data.js?ver=${version}`)
    ]).then(([data, engine, searchData]) => ({ ...data, ...engine, ...searchData }));
  }
  return dependenciesPromise;
}

const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[ch]));
const visible = value => {
  const text = String(value ?? "").trim();
  return text && text !== "-" && text !== "—";
};
const concentrationKey = id => `amb_pediatric_concentration_${id}_v1`;

function savedConcentration(id) {
  try { return JSON.parse(localStorage.getItem(concentrationKey(id)) || "null"); } catch (_) { return null; }
}
function saveConcentration(id, value) {
  try {
    if (value) localStorage.setItem(concentrationKey(id), JSON.stringify(value));
    else localStorage.removeItem(concentrationKey(id));
  } catch (_) {}
}
function colorWithAlpha(hex, alpha) {
  const value = String(hex || "").replace("#","");
  if (!/^[0-9a-f]{6}$/i.test(value)) return `rgba(37,99,235,${alpha})`;
  const n = parseInt(value,16);
  return `rgba(${n>>16},${(n>>8)&255},${n&255},${alpha})`;
}

function buildWaafels(scope, mode, ageText, weightText, formatNumber) {
  const age = ageText ? Number(ageText) : null;
  const weight = weightText
    ? Number(weightText)
    : mode === "months" ? age * 0.5 + 4 : age <= 5 ? age * 2 + 8 : age * 3 + 7;
  const adrenalineMl = weight / 10;
  const rosc = Math.min(weight * 2.5, 50);
  const sga = mode === "months"
    ? (weight <= 5 ? "Size 1" : "Size 1.5")
    : weight >= 10 && weight <= 24 ? "Size 2" : weight >= 25 && weight <= 35 ? "Size 2.5" : "Consider adult SGA sizes";
  const ageYears = mode === "months" ? age / 12 : age;
  const ett = ageYears < 8 ? "Not used below 8 years" : `Uncuffed ${formatNumber(Math.round((ageYears/4+4)*2)/2)}\nCuffed ${formatNumber(Math.round((ageYears/4+3.5)*2)/2)}`;
  const decompression = mode === "months" || ageYears < 2
    ? "IV Catheter 22g\n(Color: Blue | Length: 2.5cm)"
    : ageYears <= 6
      ? "IV Catheter 18g\n(Color: Green | Length: 3.2cm)"
      : ageYears <= 13
        ? "IV Catheter 16g\n(Color: Grey | Length: 4.5cm)"
        : "IV Catheter 16g\n(Color: Grey | Length: 4.5cm)\nConsider patient size\nLonger needle may be required\nARS Needle 10g or 14g";
  const energy = scope === "CCP"
    ? `${formatNumber(Math.min(weight*4,360))} J → ${formatNumber(Math.min(weight*6,360))} J → ${formatNumber(Math.min(weight*8,360))} J → ${formatNumber(Math.min(weight*10,360))} J`
    : `${formatNumber(Math.min(weight*4,360))} J`;
  return {
    medicationId:null, displayName:"WAAFELSS", header:"The WAAFELSS for your patient:", warnings:[],
    reference:{ type:"reference", query:"WAAFELSS" }, weightKg:weight, concentration:null, kv:true,
    sections:[
      ["Weight",`${formatNumber(weight)} kg`],
      ["Adrenaline",`${formatNumber(weight*0.01)} mg (${formatNumber(adrenalineMl)} ml)`,"Concentration: 1:10,000 (1 mg/10 ml)"],
      ["Amiodarone",`${formatNumber(weight*5)} mg (${formatNumber(adrenalineMl)} ml)`,"Concentration: 150 mg/3 ml (50 mg/ml)"],
      ["Fluids",`${formatNumber(weight*10)}-${formatNumber(weight*20)} ml`],
      ["SGA",sga], ["ETT",ett], ["Energy",energy],
      ["Systolic BP",`${formatNumber((mode==="months" ? age/12 : age)*2+70)} mmHg`],
      ["Dextrose 10%",`${formatNumber(rosc)} ml`],
      ["Chest Wall Decompression",decompression]
    ].map(([indication,dose,notes]) => ({ indication,dose,route:"—",notes:notes||null,doseLabel:"Dose",showVolumeCalculator:false }))
  };
}

function openTool(actionId, params = {}) {
  if (typeof window.__AMBULANCE_NAVIGATE_TOOL === "function") {
    window.__AMBULANCE_NAVIGATE_TOOL(actionId, params);
    return;
  }
  const routeDepth = Math.max(2, Number(history.state?.routeDepth || 1) + 1);
  const state = { tool:actionId, params };
  const query = new URLSearchParams({ tool:actionId, ...params });
  state.routeDepth = routeDepth;
  history.pushState(state, "", `${location.pathname}${location.search}#${query}`);
  window.dispatchEvent(new PopStateEvent("popstate", { state }));
}

function renderVitals(vitals) {
  if (!vitals) return "";
  const first = vitals.showAgeGroup ? ["Age","group",vitals.ageGroup] : ["Wt","kg",vitals.weight];
  const values = [first,["RR","/min",vitals.rr],["HR","/min",vitals.hr],["SBP","mmHg",vitals.sbp],["DBP","mmHg",vitals.dbp],["Temp","°C",vitals.temp],["RBS","mmol/L",vitals.rbs]];
  return `
    <button class="ped-vitals" type="button" data-vitals>
      <span class="ped-vitals-head"><b>Normal Vitals for ${esc(vitals.inputLabel)}</b><small>Tap to enlarge</small></span>
      <span class="ped-vitals-grid">${values.map(([a,b,c])=>`<span><b>${esc(a)}</b><small>${esc(b)}</small><strong>${esc(c)}</strong></span>`).join("")}</span>
    </button>`;
}

function renderWarnings(warnings, supportsVolume) {
  return (warnings || []).filter(w => !(supportsVolume && String(w.title).toLowerCase() === "confirm concentration")).map(w => `
    <div class="ped-warning ${String(w.level).toLowerCase()==="critical"?"critical":""}">
      ${w.title?`<b>${esc(w.title)}</b>`:""}${w.message?`<span>${esc(w.message)}</span>`:""}
    </div>`).join("");
}

function concentrationSummary(value, formatNumber) {
  const mg = value.unit === "mcg" ? value.amount/1000 : value.unit === "g" ? value.amount*1000 : value.amount;
  const perMl = mg / value.volumeMl;
  return `${formatNumber(value.amount)} ${value.unit} / ${formatNumber(value.volumeMl)} ml = ${perMl<1?`${formatNumber(perMl*1000)} mcg/ml`:`${formatNumber(perMl)} mg/ml`}`;
}

function installKeyboardDismiss(root) {
  const blur = () => {
    const active = document.activeElement;
    if (active && root.contains(active) && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) active.blur();
  };
  root.addEventListener("touchmove", blur, { passive:true });
  root.addEventListener("wheel", blur, { passive:true });
}

export async function runPediatricScreen(root, { scope, initialGroup, accessType }) {
  const {
    buildInput, calculateMedication, concentrationGuide, formatNumber,
    getPediatricHelper, medicationSummaries, normalVitals, resolveFormularyPage,
    resolveReferencePage, validateInput, volumeForSection
  } = await loadDependencies();
  const mode = String(initialGroup).toLowerCase() === "years" ? "years" : "months";
  const helperId = `${scope.toLowerCase()}_pediatric_dosing`;
  root.innerHTML = `
    <style>
      .ped-app{--ped-accent:${scope==="AP"?"#0A96FA":"#667085"};padding:8px 8px 24px;color:var(--text)}
      .ped-loading,.ped-error{padding:24px;text-align:center;font-weight:800;color:var(--muted)}
      .ped-inputs{display:grid;grid-template-columns:${scope==="CCP"?"1fr auto 1fr":"1fr"};gap:8px;align-items:center;margin-bottom:12px}
      .ped-field{display:grid;gap:5px}.ped-field span{padding-left:14px;font-size:12px;font-weight:800;color:var(--muted)}
      .ped-field input{box-sizing:border-box;width:100%;min-width:0;height:54px;border:1px solid var(--border);border-radius:15px;background:var(--surface);color:var(--text);padding:0 14px;font-size:17px;font-weight:800;outline:none}
      .ped-field input:focus{border-color:var(--ped-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--ped-accent) 18%,transparent)}
      .ped-or{font-weight:900;color:var(--muted);padding-top:20px}
      .ped-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .ped-med{height:54px;border:1.5px solid var(--med-accent);border-radius:15px;background:var(--med-bg);color:var(--med-fg);font-size:12px;line-height:14px;font-weight:900;padding:5px 7px;box-shadow:0 5px 10px rgba(15,23,42,.16);overflow-wrap:anywhere}
      .ped-med:active{transform:scale(.96);box-shadow:0 1px 3px rgba(15,23,42,.16)}
      .ped-divider{grid-column:1/-1;height:1px;background:var(--border);margin:3px 0}
      .ped-special{background:#ADAEAE;color:#111827;border-color:#686868}.ped-calc{background:#1F53D6;color:#fff;border-color:#0F2F9A}.ped-infusion{background:#D9C7DD;color:#111827;border-color:#8B6E94}
      .ped-toast{position:fixed;left:50%;bottom:calc(22px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:1000002;background:#172033;color:#fff;border-radius:12px;padding:10px 14px;font-weight:800;box-shadow:0 10px 30px rgba(0,0,0,.3)}
      .ped-sheet{position:fixed;inset:0;z-index:1000000;background:rgba(0,0,0,.48);display:flex;align-items:flex-end;box-sizing:border-box}
      .ped-sheet[hidden]{display:none}.ped-sheet-card{box-sizing:border-box;width:100%;max-height:91dvh;overflow:auto;background:var(--surface);color:var(--text);border-top:1px solid var(--border);border-radius:22px 22px 0 0;padding:14px max(16px,env(safe-area-inset-right)) max(18px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));box-shadow:0 -12px 35px rgba(0,0,0,.25);overscroll-behavior:contain}
      .ped-actions{display:flex;gap:8px;margin-bottom:10px}.ped-action{min-height:42px;border:1px solid var(--border);border-radius:13px;background:var(--surface-2);color:var(--text);font-weight:850;padding:8px 12px}.ped-action:first-child{flex:1}
      .ped-title{font-size:22px;font-weight:950;color:#0368FF;margin:12px 0 8px}.ped-header{font-size:16px;font-weight:650;font-style:italic;margin:8px 0 12px}
      .ped-warning{display:grid;gap:4px;background:#FFF7ED;color:#334155;border-radius:12px;padding:12px;margin:8px 0}.ped-warning b{color:#9A3412}.ped-warning.critical{background:#FEF2F2}.ped-warning.critical b{color:#B91C1C}
      .ped-section{padding:8px 0 12px;border-bottom:1px solid var(--border)}.ped-section:last-child{border-bottom:0}.ped-label{font-size:16px;font-weight:850;margin-top:7px}.ped-indication,.ped-dose{font-size:20px;font-weight:950;white-space:pre-wrap}.ped-indication{color:#D32F2F}.ped-dose{color:#0068FA}.ped-volume{color:#0F766E;font-size:18px;font-weight:950}.ped-note,.ped-route{white-space:pre-wrap;line-height:1.45}
      .ped-vitals{width:100%;display:grid;gap:5px;margin-top:10px;border:1px solid #C7D2FE;border-radius:10px;background:#EEF2FF;color:#172033;padding:7px 8px;text-align:left}.ped-vitals-head{display:flex;justify-content:space-between;color:#4338CA;font-size:12px}.ped-vitals-head small{color:#64748B}.ped-vitals-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}.ped-vitals-grid span{display:grid;text-align:center}.ped-vitals-grid b{font-size:8px;color:#64748B}.ped-vitals-grid small{font-size:7px;color:#64748B}.ped-vitals-grid strong{font-size:9px}
      .ped-concentration{background:#FEF2F2;border-radius:14px;padding:10px;display:grid;gap:5px}.ped-concentration.saved{background:#FFF7ED}.ped-concentration b{color:#B91C1C}.ped-concentration.saved b{color:#9A3412}.ped-concentration button{justify-self:end}
      .ped-dialog{position:fixed;inset:0;z-index:1000003;background:rgba(0,0,0,.48);display:grid;place-items:center;padding:24px max(24px,env(safe-area-inset-right)) 24px max(24px,env(safe-area-inset-left));box-sizing:border-box}.ped-dialog-card{box-sizing:border-box;width:min(100%,430px);max-height:82dvh;overflow:auto;background:var(--surface);border:1px solid var(--border);border-radius:22px;padding:18px;box-shadow:0 20px 50px rgba(0,0,0,.28);overscroll-behavior:contain}.ped-dialog h3{margin:0 0 10px;color:#2563EB}.ped-dialog p{white-space:pre-wrap;background:rgba(37,99,235,.07);padding:12px;border-radius:14px;color:var(--muted);line-height:1.45}.ped-dialog-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}.ped-dialog input,.ped-dialog select{box-sizing:border-box;width:100%;height:48px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2);color:var(--text);padding:0 12px;font-size:16px}
      @media(max-width:360px){.ped-grid{gap:6px}.ped-med{font-size:10.5px;padding:4px}.ped-inputs{gap:5px}.ped-or{font-size:12px}}
      :root[data-theme="dark"] .ped-warning{background:#3B2A14;color:#E2E8F0}:root[data-theme="dark"] .ped-warning.critical{background:#3B1717}:root[data-theme="dark"] .ped-vitals{background:#20243B;border-color:#4F5B93;color:#EEF2FF}:root[data-theme="dark"] .ped-vitals-grid strong{color:#EEF2FF}:root[data-theme="dark"] .ped-concentration{background:#3B1717}:root[data-theme="dark"] .ped-concentration.saved{background:#3B2A14}
    </style>
    <div class="ped-app"><div class="ped-loading">Loading pediatric medications...</div></div>`;
  installKeyboardDismiss(root);

  let loaded;
  try { loaded = await getPediatricHelper(helperId); }
  catch (error) {
    root.querySelector(".ped-app").innerHTML = `<div class="ped-error">Pediatric medications could not be loaded.<br><small>${esc(error.message)}</small></div>`;
    return;
  }
  const helper = loaded.data;
  const meds = medicationSummaries(helper);
  const app = root.querySelector(".ped-app");
  app.innerHTML = `
    <div class="ped-inputs">
      <label class="ped-field"><span>Age (${mode})</span><input id="pedAge" inputmode="numeric" autocomplete="off"></label>
      ${scope==="CCP"?`<span class="ped-or">OR</span><label class="ped-field"><span>Weight (kg)</span><input id="pedWeight" inputmode="numeric" autocomplete="off"></label>`:""}
    </div>
    <div class="ped-grid">
      ${meds.map(m=>`<button class="ped-med" data-med="${esc(m.id)}" style="--med-bg:${esc(m.backgroundColor)};--med-fg:${esc(m.textColor)};--med-accent:${esc(m.accentColor)}">${esc(m.displayName)}</button>`).join("")}
      <div class="ped-divider"></div>
      <button class="ped-med ped-special" data-special="waafels">WAAFELSS</button>
      ${scope==="CCP"?`<button class="ped-med ped-calc" data-special="dose">Dose Volume</button><button class="ped-med ped-infusion" data-special="infusions">Infusions</button>`:""}
    </div>
    <div class="ped-sheet" id="pedSheet" hidden><div class="ped-sheet-card" id="pedSheetCard"></div></div>
    <div id="pedDialogHost"></div>`;
  const age = app.querySelector("#pedAge");
  const weight = app.querySelector("#pedWeight");
  if (weight) {
    age.addEventListener("focus",()=>{ weight.value=""; });
    weight.addEventListener("focus",()=>{ age.value=""; });
  }
  [age,weight].filter(Boolean).forEach(input => input.addEventListener("input",()=>{ input.value=input.value.replace(/[^\d]/g,"").replace(/^0+/,""); }));

  const canReference = String(accessType || window.__AMBULANCE_ACCESS_TYPE || "") !== "non_ambulance_staff";
  const dialogHost = app.querySelector("#pedDialogHost");
  const sheet = app.querySelector("#pedSheet");
  const card = app.querySelector("#pedSheetCard");

  function closeSheet(){ sheet.hidden=true; card.innerHTML=""; }
  sheet.addEventListener("click",event=>{ if(event.target===sheet) closeSheet(); });

  async function openReference(result) {
    if (!canReference) return;
    const isReference = result.reference?.type === "reference";
    const query = result.reference?.query || result.displayName;
    try {
      if (scope === "AP" && result.medicationId === "fluids") {
        closeSheet();
        window.__AMBULANCE_OPEN_DOCUMENT_PAGE?.(12, "AP Fluid Bolus", "pat");
        return;
      }
      const item = isReference
        ? await resolveReferencePage(query)
        : await resolveFormularyPage(query);
      if (!item) throw new Error(`Reference not found: ${query}`);
      const documentType = String(item.documentType || item.type || "cpg").toLowerCase();
      closeSheet();
      window.__AMBULANCE_OPEN_DOCUMENT_PAGE?.(
        item.page || item.pageStart,
        item.title || result.displayName,
        ["cpg","sop","cpm","pat"].includes(documentType) ? documentType : "cpg"
      );
    } catch (error) {
      console.error("Pediatric reference navigation failed", error);
      showDialog(
        isReference ? "Reference not found" : "Medication reference not found",
        "The CPG page could not be opened. Please try again."
      );
    }
  }

  function showDialog(title,message,actions="") {
    dialogHost.innerHTML=`<div class="ped-dialog"><div class="ped-dialog-card"><h3>${esc(title)}</h3><p>${esc(message)}</p><div class="ped-dialog-actions">${actions}<button class="ped-action" data-dialog-close>OK</button></div></div></div>`;
    dialogHost.querySelector("[data-dialog-close]").addEventListener("click",()=>{dialogHost.innerHTML="";});
  }

  function showVitalsDialog(v) {
    showDialog(`Normal Vitals for ${v.inputLabel}`,[
      `Age group: ${v.ageGroup}`,`Weight: ${v.weight} kg`,`RR: ${v.rr} /min`,`HR: ${v.hr} /min`,
      `SBP: ${v.sbp} mmHg`,`DBP: ${v.dbp} mmHg`,`Temp: ${v.temp} °C`,`RBS: ${v.rbs} mmol/L`
    ].join("\n"));
  }

  function editConcentration(result, guide, current, rerender) {
    dialogHost.innerHTML=`<div class="ped-dialog"><div class="ped-dialog-card"><h3>${esc(result.displayName)} concentration</h3>
      <p>Enter the concentration or dilution you prepared. Volume calculations will use this value.</p>
      <label class="ped-field"><span>Drug amount</span><input id="pedConcAmount" inputmode="decimal" value="${esc(current?.amount ?? guide?.amount ?? "")}"></label>
      <label class="ped-field"><span>Unit</span><select id="pedConcUnit">${["mcg","mg","g"].map(u=>`<option ${u===(current?.unit||guide?.unit||"mg")?"selected":""}>${u}</option>`).join("")}</select></label>
      <label class="ped-field"><span>Total volume (ml)</span><input id="pedConcVolume" inputmode="decimal" value="${esc(current?.volumeMl ?? guide?.volumeMl ?? "")}"></label>
      <div class="ped-dialog-actions"><button class="ped-action" data-conc-reset>Reset</button><button class="ped-action" data-conc-cancel>Cancel</button><button class="ped-action" data-conc-save>Save</button></div>
    </div></div>`;
    dialogHost.querySelector("[data-conc-cancel]").onclick=()=>dialogHost.innerHTML="";
    dialogHost.querySelector("[data-conc-reset]").onclick=()=>{ saveConcentration(result.medicationId,null); dialogHost.innerHTML=""; rerender(); };
    dialogHost.querySelector("[data-conc-save]").onclick=()=>{
      const amount=Number(dialogHost.querySelector("#pedConcAmount").value);
      const unit=dialogHost.querySelector("#pedConcUnit").value;
      const volumeMl=Number(dialogHost.querySelector("#pedConcVolume").value);
      if(!(amount>0)||!(volumeMl>0)) return;
      saveConcentration(result.medicationId,{amount,unit,volumeMl}); dialogHost.innerHTML=""; rerender();
    };
  }

  function renderResult(result) {
    const vitals = normalVitals(mode,age.value,weight?.value||"");
    const guide = result.medicationId ? concentrationGuide(helper,result.medicationId) : null;
    const concentration = result.medicationId ? savedConcentration(result.medicationId) : null;
    const supportsVolume = Boolean(guide?.supported);
    const refLabel = result.reference?.type === "reference" ? "View Reference" : "View Formulary";
    const concentrationHtml = supportsVolume ? `<div class="ped-concentration ${concentration?"saved":""}">
      <b>${concentration?"Check concentration before giving":"Concentration not set"}</b>
      <span>${concentration?`Confirm this is the prepared concentration. Volume is calculated using: ${esc(concentrationSummary(concentration,formatNumber))}`:`${esc(result.displayName)} needs the concentration or dilution you prepared before volume can be calculated.`}</span>
      ${guide?.amount&&guide?.volumeMl?`<small>Original concentration guide: ${esc(concentrationSummary(guide,formatNumber))}</small>`:""}
      <button class="ped-action" data-concentration>${concentration?"Change concentration":"Set concentration"}</button>
    </div>`:"";
    card.innerHTML=`
      <div class="ped-actions">${canReference?`<button class="ped-action" data-reference>${esc(refLabel)}</button>`:""}<button class="ped-action" data-close>Close</button></div>
      ${concentrationHtml}${renderVitals(vitals)}
      <div class="ped-title">${esc(result.displayName)}</div>
      ${renderWarnings(result.warnings,supportsVolume)}
      ${result.header?`<div class="ped-header">${esc(result.header)}</div>`:""}
      <div>${result.sections.map(section=>{
        const volume=volumeForSection(section,concentration);
        if(result.kv) return `<section class="ped-section">${visible(section.indication)?`<div class="ped-label">${esc(section.indication)}</div>`:""}${visible(section.dose)?`<div class="ped-dose">${esc(section.dose)}</div>`:""}${section.notes?`<div class="ped-note">${esc(section.notes)}</div>`:""}</section>`;
        return `<section class="ped-section">
          ${visible(section.indication)?`<div class="ped-label">Indication</div><div class="ped-indication">${esc(section.indication)}</div>`:""}
          ${visible(section.dose)?`<div class="ped-label">${esc(section.doseLabel||"Dose")}</div><div class="ped-dose">${esc(section.dose)}</div>`:""}
          ${volume?`<div class="ped-label">Volume to draw</div><div class="ped-volume">${esc(volume.text)}</div><small>${esc(volume.detail)}</small>`:""}
          ${visible(section.route)?`<div class="ped-label">Route</div><div class="ped-route">${esc(section.route)}</div>`:""}
          ${section.notes?`<div class="ped-label">Notes</div><div class="ped-note">${esc(section.notes)}</div>`:""}
        </section>`;
      }).join("")}</div>
      <div class="ped-actions">${canReference?`<button class="ped-action" data-reference>${esc(refLabel)}</button>`:""}<button class="ped-action" data-close>Close</button></div>`;
    sheet.hidden=false;
    card.scrollTop=0;
    card.querySelectorAll("[data-close]").forEach(button=>button.onclick=closeSheet);
    card.querySelector("[data-vitals]")?.addEventListener("click",()=>showVitalsDialog(vitals));
    card.querySelector("[data-concentration]")?.addEventListener("click",()=>editConcentration(result,guide,concentration,()=>renderResult(result)));
    card.querySelectorAll("[data-reference]").forEach(button=>button.onclick=()=>openReference(result));
  }

  function inputError() { return validateInput(scope,mode,age.value,weight?.value||""); }
  function handleMedication(id) {
    const error=inputError();
    if(error){ showDialog(error.toLowerCase().includes("weight")?"Check weight":"Check age",error); return; }
    try {
      const result=calculateMedication(helper,id,buildInput(scope,mode,age.value,weight?.value||""));
      if(result) renderResult(result);
      else showDialog("Medication unavailable","This medication could not be calculated from the current helper.");
    } catch (error) {
      console.error("Pediatric medication result failed", error);
      showDialog("Could not open medication","The medication result could not be displayed. Please try again.");
    }
  }
  app.querySelectorAll("[data-med]").forEach(button=>button.addEventListener("click",()=>handleMedication(button.dataset.med)));
  app.querySelector("[data-special=waafels]").onclick=()=>{
    const error=inputError(); if(error){showDialog("Check age or weight",error);return;}
    renderResult(buildWaafels(scope,mode,age.value,weight?.value||"",formatNumber));
  };
  app.querySelector("[data-special=dose]")?.addEventListener("click",()=>openTool("dose_volume",{title:"Dose Volume",parentCategory:"category_pediatrics"}));
  app.querySelector("[data-special=infusions]")?.addEventListener("click",()=>openTool("pediatric_infusions",{title:"Pediatric Infusions",parentCategory:"category_pediatrics"}));
}
