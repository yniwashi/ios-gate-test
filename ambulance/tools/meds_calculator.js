// tools/meds_calculator.js
export async function run(mountEl) {
  mountEl.innerHTML = `
    <style>
      /* ========= Meds Calculator (scoped) ========= */
      .mc-wrap{ padding:12px }
      .mc-card{
        background:var(--surface,#fff);
        border:1px solid var(--border,#e7ecf3);
        border-radius:14px; padding:14px;
        box-shadow:0 8px 18px rgba(0,0,0,.12);
      }

      /* ===== Tabs (teal active; high contrast in dark) ===== */
      .mc-tabs{
        display:flex; gap:8px; margin-bottom:12px;
        background:color-mix(in oklab, var(--surface,#f6f8fd) 85%, transparent);
        border:1px solid color-mix(in oklab, var(--border,#e7ecf3) 85%, transparent);
        padding:6px; border-radius:12px;
      }
      .mc-tab{
        flex:1; border:none; cursor:pointer; user-select:none;
        border-radius:12px;
        padding:14px 18px;
        font-weight:900; font-size:16px;
        background:transparent; color:var(--text,#0c1230);
        position:relative;
        transition:background .15s ease, color .15s ease, box-shadow .15s ease, border-color .15s ease;
      }
      .mc-tab[data-active="true"]{
        background:linear-gradient(180deg,#d8fbf0,#bdf3e3); /* light teal */
        border:1px solid #85e3c9;
        color:#083c32;
        box-shadow:inset 0 0 0 1px rgba(255,255,255,.35), 0 1px 0 rgba(0,0,0,.06);
      }
      .mc-tab[data-active="true"]::after{
        content:"";
        position:absolute; left:12px; right:12px; bottom:6px;
        height:3px; border-radius:3px;
        background:linear-gradient(90deg,#10b981,#06b6d4); /* emerald -> cyan underline */
        opacity:.95;
      }

      /* ---- Dark theme tabs ---- */
      :root[data-theme="dark"] .mc-tabs{
        background:#0f141c; border-color:#232a37;
      }
      :root[data-theme="dark"] .mc-tab{ color:#cfd8ff; }
      :root[data-theme="dark"] .mc-tab[data-active="true"]{
        background:linear-gradient(180deg,#0ea67a,#0b8c69); /* strong teal */
        border:1px solid #36d1b1;
        color:#eafff9;
        box-shadow:0 0 0 1px rgba(6,14,40,.55), 0 8px 18px rgba(0,0,0,.35);
      }
      @media (prefers-color-scheme: dark){
        :root[data-theme="auto"] .mc-tabs{
          background:#0f141c; border-color:#232a37;
        }
        :root[data-theme="auto"] .mc-tab{ color:#cfd8ff; }
        :root[data-theme="auto"] .mc-tab[data-active="true"]{
          background:linear-gradient(180deg,#0ea67a,#0b8c69);
          border:1px solid #36d1b1;
          color:#eafff9;
          box-shadow:0 0 0 1px rgba(6,14,40,.55), 0 8px 18px rgba(0,0,0,.35);
        }
      }

      .mc-strip{ height:6px; border-radius:6px; margin:10px 0 14px 0;
        background:linear-gradient(90deg,#0ea5e9,#6366f1);
      }

      .mc-section{ margin-bottom:12px }
      .mc-label{
        margin:0 0 6px 2px;
        font-size:13px; font-weight:900; letter-spacing:.06em;
        color:#6e7b91; text-transform:uppercase;
      }
      .mc-subtle{
        margin:0 0 6px 2px;
        font-size:12px; font-weight:800; letter-spacing:.02em;
        color:#6e7b91;
      }

      .mc-row{ display:flex; gap:8px; align-items:center; flex-wrap:wrap }
      .mc-input{
        flex:1; min-width:160px;
        font-size:16px; font-weight:800; color:var(--text,#0c1230);
        background:var(--surface,#fff); border:1px solid var(--border,#e7ecf3);
        border-radius:12px; padding:12px; outline:none;
      }
      .mc-unit{ font-size:13px; color:#6e7b91; white-space:nowrap }

      .mc-radio-row{ display:flex; gap:8px; flex-wrap:wrap }
      .mc-radio{
        display:inline-flex; align-items:center; gap:8px;
        padding:8px 12px; border-radius:999px; cursor:pointer;
        background:var(--surface,#f6f8fd); border:1px solid var(--border,#e7ecf3);
        font-weight:800; color:var(--text,#0c1230);
      }
      .mc-radio input{ accent-color:#10b981; } /* emerald tick */

      .mc-actions{ display:flex; gap:10px; margin:8px 0 6px }
      .mc-btn{
        border:none;
        border-radius:12px;
        padding:14px 18px;
        font-size:16px;
        font-weight:900;
        cursor:pointer;
        box-shadow:0 6px 14px rgba(0,0,0,.12);
        background:var(--surface,#f3f6fb);
        border:1px solid var(--border,#dbe0ea);
        color:#var(--text,#0c1230);
        color:var(--text,#0c1230);
      }

      .is-hidden{ display:none !important; }

      .mc-result{
        margin-top:10px; padding:12px; border-radius:12px;
        background:var(--surface,#f6f8fd); border:1px solid var(--border,#e7ecf3);
        white-space:pre-line; color:var(--text,#0c1230); font-weight:800;
      }

      .mc-hint{
        margin-top:6px;
        font-size:12px;
        line-height:1.35;
        color:#6e7b91;
        font-weight:800;
      }
      :root[data-theme="dark"] .mc-hint{ color:#c2cbe5; }

      .mc-toast{
        position:fixed; left:50%; transform:translateX(-50%); bottom:18px;
        background:#1f2937; color:#fff; padding:10px 14px; border-radius:12px;
        box-shadow:0 10px 24px rgba(0,0,0,.25); font-weight:800;
        opacity:0; pointer-events:none; transition:opacity .2s ease, transform .2s ease; z-index:9999;
      }
      .mc-toast.show{ opacity:1; transform:translateX(-50%) translateY(-4px); }

      /* Dark containers */
      :root[data-theme="dark"] .mc-card{ background:#151921; border-color:#232a37 }
      :root[data-theme="dark"] .mc-input{ background:#12151c; border-color:#232a37; color:#eef2ff }
      :root[data-theme="dark"] .mc-radio{ background:#12151c; border-color:#232a37; color:#eef2ff }
      :root[data-theme="dark"] .mc-btn{ background:#12151c; border-color:#232a37; color:#eef2ff }
      :root[data-theme="dark"] .mc-result{ background:#12151c; border-color:#232a37; color:#eef2ff }
    </style>

    <div class="mc-wrap">
      <div class="mc-card">
        <!-- Tabs -->
        <div class="mc-tabs" role="tablist" aria-label="Medication Calculators">
          <button id="tabDose" class="mc-tab" role="tab" aria-controls="paneDose" aria-selected="true" data-active="true">Dose Volume</button>
          <button id="tabInfusion" class="mc-tab" role="tab" aria-controls="paneInfusion" aria-selected="false" data-active="false">Infusion Rate</button>
        </div>

        <div class="mc-strip"></div>

        <!-- ===== Panel: Dose Volume ===== -->
        <section id="paneDose" role="tabpanel" aria-labelledby="tabDose">
          <div class="mc-section">
            <p class="mc-subtle">Choose concentration unit written on the vial/ampule</p>
            <div id="dv_units" class="mc-radio-row" role="radiogroup" aria-label="Dose Unit">
              <!-- Order: mcg, mg, g -->
              <label class="mc-radio"><input type="radio" name="dv_unit" value="mcg"> mcg</label>
              <label class="mc-radio"><input type="radio" name="dv_unit" value="mg" checked> mg</label>
              <label class="mc-radio"><input type="radio" name="dv_unit" value="g"> g</label>
            </div>
          </div>

          <div class="mc-section">
            <p class="mc-label">DRUG CONCENTRATION</p>
            <div class="mc-row">
              <input id="dv_mg" class="mc-input" inputmode="numeric" placeholder="">
              <span class="mc-unit">in</span>
              <input id="dv_ml" class="mc-input" inputmode="numeric" placeholder="ml">
              <span class="mc-unit">ml solution</span>
            </div>
            <div id="dv_unit_hint" class="mc-hint">Unit on the vial/ampule: —</div>
          </div>

          <div class="mc-section">
            <p class="mc-label">DOSE</p>
            <div class="mc-row">
              <input id="dv_dose" class="mc-input" inputmode="decimal" placeholder="Dose">
              <span class="mc-unit">amount</span>
            </div>
          </div>

          <div class="mc-actions">
            <button id="dv_calc" class="mc-btn">Calculate</button>
          </div>

          <div id="dv_result" class="mc-result" aria-live="polite"></div>
        </section>

        <!-- ===== Panel: Infusion Rate ===== -->
        <section id="paneInfusion" class="is-hidden" role="tabpanel" aria-labelledby="tabInfusion">
          <div class="mc-section">
            <p class="mc-label">CONCENTRATION</p>
            <div class="mc-row">
              <input id="ir_mg" class="mc-input" inputmode="decimal" placeholder="mg">
              <span class="mc-unit">in</span>
              <input id="ir_ml" class="mc-input" inputmode="decimal" placeholder="ml">
              <span class="mc-unit">ml solution</span>
            </div>
          </div>

          <div class="mc-section">
            <p class="mc-label">DOSE RATE UNIT</p>
            <div id="ir_units" class="mc-radio-row" role="radiogroup" aria-label="Rate Unit">
              <label class="mc-radio"><input type="radio" name="ir_unit" value="mcg/min"> mcg/min</label>
              <label class="mc-radio"><input type="radio" name="ir_unit" value="mg/min" checked> mg/min</label>
            </div>
          </div>

          <div class="mc-section">
            <p class="mc-label">DOSE</p>
            <div class="mc-row">
              <input id="ir_dose" class="mc-input" inputmode="decimal" placeholder="Dose">
            </div>
          </div>

          <div class="mc-section">
            <p class="mc-label">WEIGHT MODE</p>
            <div id="ir_weight_mode" class="mc-radio-row" role="radiogroup" aria-label="Weight Mode">
              <label class="mc-radio"><input type="radio" name="ir_wmode" value="with"> With weight</label>
              <label class="mc-radio"><input type="radio" name="ir_wmode" value="without" checked> Without weight</label>
            </div>
            <div class="mc-row" style="margin-top:6px">
              <input id="ir_weight" class="mc-input" inputmode="decimal" placeholder="Without weight" disabled>
              <span class="mc-unit">kg</span>
            </div>
          </div>

          <div class="mc-actions">
            <button id="ir_calc" class="mc-btn">Calculate</button>
          </div>

          <div id="ir_result" class="mc-result" aria-live="polite"></div>
        </section>
      </div>
    </div>

    <div id="mc_toast" class="mc-toast">Please Enter Values</div>
  `;

  /* ===== Helpers ===== */
  const $ = sel => mountEl.querySelector(sel);

  // Sanitizers
  function cleanIntStr(v){
    return String(v || '').replace(/[^\d]/g,'').slice(0,12);
  }
  function cleanDecStr(v){
    let s = String(v || '').replace(/[^0-9.]/g,'');
    const i = s.indexOf('.');
    if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g,'');
    return s;
  }
  function floor3(x){
    return Number.isFinite(x) ? Math.floor(x * 1000) / 1000 : NaN;
  }

  // Toast
  const toastEl = $('#mc_toast');
  let toastTimer = null;
  function toast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }

  /* ===== Tabs logic ===== */
  const tabDose  = $('#tabDose');
  const tabInf   = $('#tabInfusion');
  const paneDose = $('#paneDose');
  const paneInf  = $('#paneInfusion');

  function setMode(mode){
    const isDose = mode === 'dose';
    tabDose.setAttribute('aria-selected', String(isDose));
    tabInf .setAttribute('aria-selected', String(!isDose));
    tabDose.dataset.active = String(isDose);
    tabInf .dataset.active = String(!isDose);
    paneDose.classList.toggle('is-hidden', !isDose);
    paneInf .classList.toggle('is-hidden', isDose);
    try { localStorage.setItem('meds_calc_mode', mode); } catch {}
  }
  tabDose.addEventListener('click', () => setMode('dose'));
  tabInf .addEventListener('click', () => setMode('infusion'));
  (function initMode(){
    const url = new URL(window.location.href);
    const hashMode = (url.hash || '').replace('#','');
    const qMode = url.searchParams.get('mode');
    let saved = null; try { saved = localStorage.getItem('meds_calc_mode'); } catch {}
    const mode = (hashMode==='dose'||hashMode==='infusion') ? hashMode
               : (qMode==='dose'||qMode==='infusion') ? qMode
               : (saved==='dose'||saved==='infusion') ? saved
               : 'dose';
    setMode(mode);
  })();

  /* ===== Dose Volume (Kotlin Calculator parity) ===== */
  const dv_units     = $('#dv_units');
  const dv_mg        = $('#dv_mg');
  const dv_ml        = $('#dv_ml');
  const dv_dose      = $('#dv_dose');
  const dv_calc      = $('#dv_calc');
  const dv_result    = $('#dv_result');
  const dv_unit_hint = $('#dv_unit_hint');

  function dv_getUnit(){
    const checked = dv_units.querySelector('input[name="dv_unit"]:checked');
    return checked ? checked.value : 'mg';
  }

  function updateDvUnitHint(){
    const n = dv_mg.value.trim().replace(/[^\d.]/g,'');
    const u = dv_getUnit();
    dv_unit_hint.textContent = n
      ? `Unit on the vial/ampule: ${n} ${u}`
      : 'Unit on the vial/ampule: —';
  }

  dv_mg  .addEventListener('input', () => { dv_mg.value = cleanIntStr(dv_mg.value); updateDvUnitHint(); });
  dv_ml  .addEventListener('input', () => { dv_ml.value = cleanIntStr(dv_ml.value); });
  dv_dose.addEventListener('input', () => { dv_dose.value = cleanDecStr(dv_dose.value); });
  dv_units.addEventListener('change', updateDvUnitHint);

  function dv_compute(){
    try{
      const unit = dv_getUnit(); // "mcg" | "mg" | "g"
      const drugConcentrationMg = parseInt(dv_mg.value, 10);
      const drugConcentrationMl = parseInt(dv_ml.value, 10);
      const drugDose = parseFloat(dv_dose.value);

      if (!Number.isFinite(drugConcentrationMg) || !Number.isFinite(drugConcentrationMl) || !Number.isFinite(drugDose)){
        toast('Please Enter Values');
        return;
      }

      let vialConcentrationNotF;
      let volume;
      let resultText;

      if (unit === 'g'){
        const drugConcentrationG = drugConcentrationMg * 1000; // grams → mg
        vialConcentrationNotF = drugConcentrationG / drugConcentrationMl;
        const vol1 = drugDose * drugConcentrationMl;
        volume = vol1 / drugConcentrationG;
        resultText = `You should draw ${volume}ml
Calculation Ref:
The medication concentration is ${vialConcentrationNotF}mg/ml
To draw ${drugDose}mg = Dose/Concentration =
${drugDose}/${vialConcentrationNotF} = ${volume}ml.`;
      } else if (unit === 'mcg'){
        const drugConcentrationMcg = drugConcentrationMg; // using field as mcg
        vialConcentrationNotF = drugConcentrationMg / drugConcentrationMl;
        const vol1 = drugDose * drugConcentrationMl;
        volume = vol1 / drugConcentrationMcg;
        resultText = `You should draw ${volume}ml
Calculation Ref:
The medication concentration is ${vialConcentrationNotF}mcg/ml
To draw ${drugDose}${unit} = Dose/Concentration =
${drugDose}/${vialConcentrationNotF} = ${volume}ml.`;
      } else {
        vialConcentrationNotF = drugConcentrationMg / drugConcentrationMl; // mg/ml
        const vol1 = drugDose * drugConcentrationMl;
        volume = vol1 / drugConcentrationMg;
        resultText = `You should draw ${volume}ml
Calculation Ref:
The medication concentration is ${vialConcentrationNotF}mg/ml
To draw ${drugDose}${unit} = Dose/Concentration =
${drugDose}/${vialConcentrationNotF} = ${volume}ml.`;
      }

      dv_result.textContent = resultText;
    } catch {
      toast('Please Enter Values');
    }
  }
  dv_calc.addEventListener('click', dv_compute);
  updateDvUnitHint();

  /* ===== Infusion Rate (Kotlin InfusionActivity parity) ===== */
  const ir_mg     = $('#ir_mg');
  const ir_ml     = $('#ir_ml');
  const ir_dose   = $('#ir_dose');
  const ir_units  = $('#ir_units');
  const ir_calc   = $('#ir_calc');
  const ir_result = $('#ir_result');
  const ir_wmode  = $('#ir_weight_mode');
  const ir_weight = $('#ir_weight');

  ir_mg.addEventListener('input',    () => { ir_mg.value    = cleanDecStr(ir_mg.value); });
  ir_ml.addEventListener('input',    () => { ir_ml.value    = cleanDecStr(ir_ml.value); });
  ir_dose.addEventListener('input',  () => { ir_dose.value  = cleanDecStr(ir_dose.value); });
  ir_weight.addEventListener('input',() => { ir_weight.value= cleanDecStr(ir_weight.value); });

  function ir_getUnit(){
    const checked = ir_units.querySelector('input[name="ir_unit"]:checked');
    return checked ? checked.value : 'mg/min';
  }
  function ir_getWeightMode(){
    const checked = ir_wmode.querySelector('input[name="ir_wmode"]:checked');
    return checked ? checked.value : 'without';
  }
  ir_wmode.addEventListener('change', ()=>{
    const mode = ir_getWeightMode();
    if (mode === 'with'){
      ir_weight.disabled = false;
      ir_weight.placeholder = 'Enter weight';
    } else {
      ir_weight.disabled = true;
      ir_weight.value = '';
      ir_weight.placeholder = 'Without weight';
    }
  });

  function ir_compute(){
    try{
      const unit = ir_getUnit(); // "mcg/min" or "mg/min"
      const drugConcentrationMg = parseFloat(ir_mg.value);
      const drugConcentrationMl = parseFloat(ir_ml.value);
      const drugDose = parseFloat(ir_dose.value);

      if (!Number.isFinite(drugConcentrationMg) || !Number.isFinite(drugConcentrationMl) || !Number.isFinite(drugDose)){
        toast('Please Enter Values');
        return;
      }

      const concentration = drugConcentrationMg / drugConcentrationMl; // mg/ml
      const dose = (unit === 'mcg/min') ? (drugDose / 1000) : drugDose; // mcg→mg

      let mlPerHr;
      if (ir_getWeightMode() === 'with'){
        const wStr = ir_weight.value.trim();
        if (!wStr){ toast('Please Enter Weight'); return; }
        const weight = parseFloat(wStr);
        if (!Number.isFinite(weight)){ toast('Please Enter Weight'); return; }
        mlPerHr = dose * weight * (60 / concentration);
      } else {
        mlPerHr = dose * (60 / concentration);
      }
      const mlPerMin = mlPerHr / 60;

      const mlPerHr1  = floor3(mlPerHr);
      const mlPerMin1 = floor3(mlPerMin);

      ir_result.textContent = `The infusion rate is
${mlPerHr1} ml/hr or ${mlPerMin1} ml/min`;
    } catch {
      toast('Please Enter Values');
    }
  }
  ir_calc.addEventListener('click', ir_compute);
}
