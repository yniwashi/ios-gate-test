// tools/waafels.js
export async function run(mountEl) {
  mountEl.innerHTML = `
    <style>
      /* ========= WAAFELLS (scoped) ========= */
      .waaf-wrap{ padding:12px }
      .waaf-card{
        background:var(--waaf-bg, var(--surface,#ffffff));
        border:1px solid var(--waaf-bd, var(--border,#e7ecf3));
        border-radius:14px; padding:14px;
        box-shadow:0 8px 18px rgba(0,0,0,.12);
      }
      .waaf-head{
        display:flex; align-items:center; justify-content:space-between; gap:10px;
        margin-bottom:10px;
      }
      .waaf-title{ margin:0; font-weight:900; font-size:16px; color:var(--text,#0c1230) }

      .waaf-pill{
        display:none;
        padding:6px 10px; border-radius:999px; font-weight:800;
        background:#ffd2e1; color:#6c1130; border:1px solid rgba(0,0,0,.08);
      }

      .waaf-strip{ height:6px; border-radius:6px; margin:-4px 0 12px 0;
        background:linear-gradient(90deg,#fa3473,#ff6ea9);
      }

      /* LANDMARK F — align columns bottoms so input aligns with chips */
      .waaf-row{ display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end; }
      .waaf-col{ flex:1 1 260px; min-width:240px; display:flex; flex-direction:column; justify-content:flex-end; }
      .waaf-field{ margin-bottom:10px }

      .waaf-label{ font-size:12px; font-weight:700; color:#6e7b91; margin:0 0 4px 2px }
      .waaf-input-wrap{ position:relative }
     /* LANDMARK H — make input width obey its box and align flush */
.waaf-input{
  width:100%;
  box-sizing:border-box;         /* <-- add this */
  -webkit-appearance:none;       /* iOS tidy */
  display:block;                 /* avoids inline quirks */

  font-size:18px; font-weight:800; color:var(--text,#0c1230);
  background:var(--surface,#f3f6fb); border:1px solid var(--border,#dbe0ea);
  border-radius:12px; padding:12px 14px; outline:none;
}

      /* LANDMARK G — inline hint for validation (caps) */
      .waaf-hint{
        display:none; margin-top:6px; font-size:12px; font-weight:800;
        padding:8px 10px; border-radius:10px;
        background:#fff4f6; color:#8a1736; border:1px solid #ffd1dc;
      }
      :root[data-theme="dark"] .waaf-hint{
        background:#3a1e2a; color:#ffd7e2; border-color:#6b2a42;
      }

      .waaf-radio{ display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
      .waaf-chip{
        border-radius:999px; border:1px solid var(--border,#dbe0ea);
        background:var(--surface,#f3f6fb);
        padding:12px 16px; font-weight:900; font-size:14px; cursor:pointer;
      }
      .waaf-chip[data-active="true"]{
        background:#ffe3ed; border-color:#ff8bb5; color:#6c1130;
      }

      .waaf-actions-wrap{ margin-top:12px }
      .waaf-actions-title{
        margin:0 0 6px 2px; font-weight:900; font-size:12px; color:#6e7b91;
        text-transform:uppercase; letter-spacing:.12em;
      }
      .waaf-actions{ display:flex; gap:10px; }

      /* AP/CCP toggle look */
      .waaf-btn{
        border:none; border-radius:12px; padding:10px 14px; font-weight:900; cursor:pointer;
        box-shadow:0 6px 14px rgba(0,0,0,.12); transition:filter .15s ease;
      }
      .waaf-btn.push-right{ margin-left:auto }
      .waaf-btn:hover{ filter:brightness(1.02) }
      .waaf-btn.mode{ color:var(--text,#0c1230); background:var(--surface,#f3f6fb); border:1px solid var(--border,#dbe0ea); }
      .waaf-btn.mode[data-active="true"]{ color:#fff; background:linear-gradient(180deg,#ff4f8d,#fa3473); border:none; }

      .waaf-results{ display:flex; flex-direction:column; gap:8px; margin-top:12px; }
      .waaf-rowitem{
        background:var(--surface,#f6f8fd); border:1px solid var(--border,#e7ecf3);
        border-radius:12px; padding:10px 12px; display:flex; align-items:baseline; gap:8px;
      }
      .waaf-k{ font-size:12px; font-weight:800; color:#6e7b91; min-width:150px }
      .waaf-v{ font-size:16px; font-weight:900; color:var(--text,#0c1230); word-break:break-word }

      /* Dark tweaks */
      :root[data-theme="dark"] .waaf-card{ --waaf-bg:#151921; --waaf-bd:#232a37; }
      :root[data-theme="dark"] .waaf-input{ background:#12151c; border-color:#232a37; color:#eef2ff; }
      :root[data-theme="dark"] .waaf-chip{ background:#12151c; border-color:#232a37; color:#eef2ff; }
      :root[data-theme="dark"] .waaf-chip[data-active="true"]{ background:#4c1329; border-color:#8b2146; color:#ffd7e6; }
      :root[data-theme="dark"] .waaf-rowitem{ background:#12151c; border-color:#232a37; }
      :root[data-theme="dark"] .waaf-btn.mode{ background:#12151c; border:1px solid #232a37; color:#eef2ff; }
      :root[data-theme="dark"] .waaf-btn.mode[data-active="true"]{ color:#fff; background:linear-gradient(180deg,#ff4f8d,#fa3473); border:none; }
    </style>

    <div class="waaf-wrap">
      <div class="waaf-card">
        <div class="waaf-head">
          <h3 class="waaf-title">WAAFELLS</h3>
          <div id="waafModePill" class="waaf-pill"></div>
        </div>

        <div class="waaf-strip"></div>

        <div class="waaf-row">
          <div class="waaf-col">
            <div class="waaf-field">
              <div class="waaf-label">Age</div>
              <div class="waaf-input-wrap">
                <input id="ageInput" class="waaf-input" inputmode="numeric" placeholder="e.g., 8">
              </div>
              <!-- LANDMARK G — inline validation hint -->
              <div id="waafHint" class="waaf-hint"></div>
            </div>
          </div>

          <div class="waaf-col">
            <div class="waaf-label">Age Group</div>
            <div class="waaf-radio" id="ageGroup">
              <button class="waaf-chip" data-val="Months" data-active="true">Months</button>
              <button class="waaf-chip" data-val="Years">Years</button>
            </div>
          </div>
        </div>

        <div class="waaf-actions-wrap">
          <div class="waaf-actions-title">Calculate WAAFELLS for</div>
          <div class="waaf-actions">
            <button id="btnAP"  class="waaf-btn mode" data-active="false">AP</button>
            <button id="btnCCP" class="waaf-btn mode" data-active="false">CCP</button>
            <button id="btnClear" class="waaf-btn mode push-right" data-active="false">Clear</button>
          </div>
        </div>

        <div class="waaf-results">
          <div class="waaf-rowitem"><div class="waaf-k">Age</div><div id="valAge" class="waaf-v">—</div></div>
          <div class="waaf-rowitem"><div class="waaf-k">Weight</div><div id="valWeight" class="waaf-v">—</div></div>
          <div class="waaf-rowitem"><div class="waaf-k">Adrenaline</div><div id="valAdr" class="waaf-v">—</div></div>
          <div class="waaf-rowitem"><div class="waaf-k">Amiodarone</div><div id="valAmi" class="waaf-v">—</div></div>
          <div class="waaf-rowitem"><div class="waaf-k">Fluids (10–20 mL/kg)</div><div id="valFluids" class="waaf-v">—</div></div>
          <div class="waaf-rowitem"><div class="waaf-k">SGA Size</div><div id="valTube" class="waaf-v">—</div></div>
          <div class="waaf-rowitem"><div class="waaf-k">Energy</div><div id="valEnergy" class="waaf-v">—</div></div>
          <div class="waaf-rowitem"><div class="waaf-k">SBP (mmHg)</div><div id="valSbp" class="waaf-v">—</div></div>
          <div class="waaf-rowitem"><div class="waaf-k">Dextrose 10% (ROSC)</div><div id="valDex" class="waaf-v">—</div></div>
          <div class="waaf-rowitem"><div class="waaf-k">Chest Wall Decompression</div><div id="valNeedle" class="waaf-v">—</div></div>
        </div>
      </div>
    </div>
  `;

  /* ====== Helpers ====== */
  const $ = sel => mountEl.querySelector(sel);
  const $$ = sel => [...mountEl.querySelectorAll(sel)];

  const ageInput    = $('#ageInput');
  const ageChipWrap = $('#ageGroup');
  const modePill    = $('#waafModePill');
  const hint        = $('#waafHint');
  const btnAP       = $('#btnAP');
  const btnCCP      = $('#btnCCP');

  const out = {
    age: $('#valAge'),
    weight: $('#valWeight'),
    adr: $('#valAdr'),
    ami: $('#valAmi'),
    fluids: $('#valFluids'),
    tube: $('#valTube'),
    energy: $('#valEnergy'),
    sbp: $('#valSbp'),
    dex: $('#valDex'),
    needle: $('#valNeedle'),
  };

  let currentMode = null; // 'AP' | 'CCP' | null

  function activeAgeGroup(){
    const btn = ageChipWrap.querySelector('[data-active="true"]');
    return btn ? btn.dataset.val : 'Months';
  }
  function setAgeGroup(val){
    $$('.waaf-chip').forEach(b => b.dataset.active = (b.dataset.val === val));
  }

  const EPS = 1e-9;
function fmtSmart(v) {
  if (!Number.isFinite(v)) return '—';

  // Truncate to 2 decimals (NO rounding)
  const t = Math.trunc(v * 100) / 100;

  // If integer → no decimals
  if (Math.abs(t - Math.round(t)) < EPS) {
    return String(Math.round(t));
  }

  // If has 1 or 2 decimals → show naturally (no forced trailing zero)
  return String(t);
}

  const clamp = (v,max) => (v > max ? max : v);
  const fmtAgeLabel = (age, grp) => {
    const n = Math.round(age);
    return grp === 'Months'
      ? (n === 1 ? '1 month' : `${n} months`)
      : (n === 1 ? '1 year'  : `${n} years`);
  };

  /* LANDMARK G — validation + inline hint */
  function showHint(msg){
    hint.textContent = msg || '';
    hint.style.display = msg ? 'block' : 'none';
  }
  function clearOutputsKeepMode(){
    Object.values(out).forEach(el => el.textContent = '—');
  }
  function validateAge(){
    const grp = activeAgeGroup();
    const raw = (ageInput.value||'').trim();
    const age = Number(raw);
    if (!raw || Number.isNaN(age) || age < 0){
      showHint('');
      clearOutputsKeepMode();
      return { ok:false, age:null, grp };
    }
    if (grp === 'Months' && age > 12){
      showHint('Age over 12 months. Switch Age Group to Years.');
      clearOutputsKeepMode();
      return { ok:false, age, grp };
    }
    if (grp === 'Years' && age > 14){
      showHint('Pediatric guideline cap is 14 years. For 15+ use adult references.');
      clearOutputsKeepMode();
      return { ok:false, age, grp };
    }
    showHint('');
    return { ok:true, age, grp };
  }

  function clearAll(){
    clearOutputsKeepMode();
    modePill.textContent = '';
    modePill.style.display = 'none';
    ageInput.value = '';
    currentMode = null;
    btnAP.dataset.active  = 'false';
    btnCCP.dataset.active = 'false';
    showHint('');
  }

  // ===== Core calc
  function calc(mode){  // mode: 'AP' | 'CCP'
    const v = validateAge();
    if (!v.ok){ return; }
    const { age, grp } = v;

    // ensure mode pill & button highlight
    currentMode = mode;
    btnAP.dataset.active  = (mode === 'AP')  ? 'true' : 'false';
    btnCCP.dataset.active = (mode === 'CCP') ? 'true' : 'false';
    modePill.textContent = mode;
    modePill.style.display = 'inline-block';

    // Age row
    out.age.textContent = fmtAgeLabel(age, grp);

    let weight, adrMg, adrMl, amiMg, minFl, maxFl, energy, energySeq, dex, sBP, tube, needle;

    if (grp === 'Months'){
      weight = age * 0.5 + 4;
      adrMg = weight * 0.01;
      adrMl = weight / 10;
      amiMg = weight * 5;
      minFl = weight * 10;
      maxFl = weight * 20;
      dex   = clamp(weight * 2.5, 50);
      sBP   = ((age / 12) * 2) + 70;
      tube  = (weight <= 5) ? 'Size 1' : 'Size 1.5';
      needle = 'IV Catheter 22g\n(Color: Blue | Length: 2.5cm)';

      if (mode === 'AP'){
        energy = clamp(weight * 4, 360);
        energySeq = null;
      } else {
        const s1 = clamp(weight * 4, 360);
        const s2 = clamp(weight * 4, 360);
        const s3 = clamp(weight * 4, 360);
        const s4 = clamp(weight * 6, 360);
        const s5 = clamp(weight * 8, 360);
        const s6 = clamp(weight * 10, 360);
        energySeq = `${fmtSmart(s1)} J → ${fmtSmart(s2)} J → ${fmtSmart(s3)} J → ${fmtSmart(s4)} J → ${fmtSmart(s5)} J → ${fmtSmart(s6)} J`;
      }

    } else { // Years
      if (age <= 5){
        weight = age * 2 + 8;
        adrMg = weight * 0.01;
        adrMl = weight / 10;
        amiMg = weight * 5;
        minFl = weight * 10;
        maxFl = weight * 20;
        dex   = clamp(weight * 2.5, 50);
        sBP   = age * 2 + 70;
        tube  = (weight >= 10 && weight <= 24) ? 'Size 2'
             : (weight >= 25 && weight <= 35) ? 'Size 2.5'
             : '';
        needle = (age < 2)
          ? 'IV Catheter 22g\n(Color: Blue | Length: 2.5cm)'
          : 'IV Catheter 18g\n(Color: Green | Length: 3.2cm)';

        if (mode === 'AP'){
          energy = clamp(weight * 4, 360);
          energySeq = null;
        } else {
          const s1 = clamp(weight * 4, 360);
          const s2 = clamp(weight * 4, 360);
          const s3 = clamp(weight * 4, 360);
          const s4 = clamp(weight * 6, 360);
          const s5 = clamp(weight * 8, 360);
          const s6 = clamp(weight * 10, 360);
          energySeq = `${fmtSmart(s1)} J → ${fmtSmart(s2)} J → ${fmtSmart(s3)} J → ${fmtSmart(s4)} J → ${fmtSmart(s5)} J → ${fmtSmart(s6)} J`;
        }

      } else {
        weight = age * 3 + 7;
        adrMg = weight * 0.01;
        adrMl = weight / 10;
        amiMg = weight * 5;
        minFl = weight * 10;
        maxFl = weight * 20;
        dex   = clamp(weight * 2.5, 50);
        sBP   = age * 2 + 70;
        tube  = (weight >= 25 && weight <= 35) ? 'Size 2.5'
             : (weight > 35) ? 'Consider adult SGA sizes'
             : '';
        if (age === 6){
          needle = 'IV Catheter 18g\n(Color: Green | Length: 3.2cm)';
        } else if (age >= 7 && age <= 13){
          needle = 'IV Catheter 16g\n(Color: Grey | Length: 4.5cm)';
        } else {
          needle = 'IV Catheter 16g\n(Color: Grey | Length: 4.5cm)\nConsider patient size\nLonger needle may be required\nARS Needle 10g or 14g';
        }

        if (mode === 'AP'){
          energy = clamp(weight * 4, 360);
          energySeq = null;
        } else {
          const s1 = clamp(weight * 4, 360);
          const s2 = clamp(weight * 4, 360);
          const s3 = clamp(weight * 4, 360);
          const s4 = clamp(weight * 6, 360);
          const s5 = clamp(weight * 8, 360);
          const s6 = clamp(weight * 10, 360);
          energySeq = `${fmtSmart(s1)} J → ${fmtSmart(s2)} J → ${fmtSmart(s3)} J → ${fmtSmart(s4)} J → ${fmtSmart(s5)} J → ${fmtSmart(s6)} J`;
        }
      }
    }

    // Outputs with smart formatting
    out.weight.textContent = `${fmtSmart(weight)} kg`;
    out.adr.textContent    = `${fmtSmart(adrMg)} mg (${fmtSmart(adrMl)} mL)`;
    out.ami.textContent    = `${fmtSmart(amiMg)} mg (${fmtSmart(adrMl)} mL)`;
    out.fluids.textContent = `${Math.round(minFl)} – ${Math.round(maxFl)} mL`;
    out.tube.textContent   = tube || '—';
    out.energy.textContent = energySeq ? energySeq : `${fmtSmart(energy)} J`;
    out.sbp.textContent    = `${Math.round(sBP)} mmHg`;
    out.dex.textContent    = `${fmtSmart(dex)} mL`;
    out.needle.textContent = needle;
  }

  /* ===== Wiring ===== */

  function setMode(mode){
    currentMode = mode;
    btnAP.dataset.active  = (mode === 'AP')  ? 'true' : 'false';
    btnCCP.dataset.active = (mode === 'CCP') ? 'true' : 'false';
    modePill.textContent = mode;
    modePill.style.display = 'inline-block';
    // Only calc when within caps
    if (validateAge().ok) calc(mode);
  }

  $$('.waaf-chip').forEach(ch => ch.addEventListener('click', () => {
    setAgeGroup(ch.dataset.val);
    // Re-validate and calc if a mode is selected
    if (currentMode && validateAge().ok) calc(currentMode);
  }));

  btnAP.addEventListener('click',  () => setMode('AP'));
  btnCCP.addEventListener('click', () => setMode('CCP'));

  // Live validate & calc while typing
  ageInput.addEventListener('input', () => {
    const v = validateAge();
    if (currentMode && v.ok) calc(currentMode);
  });

  $('#btnClear').addEventListener('click', () => clearAll());

  clearAll();
}
