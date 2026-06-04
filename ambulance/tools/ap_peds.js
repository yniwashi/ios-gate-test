// tools/ap_peds.js
export async function run(mountEl){
  mountEl.innerHTML = `
    <style>
      /* ========= AP Pediatrics (scoped) ========= */
      .ap-wrap{ padding:12px }
      .ap-card{
        background:var(--surface,#fff);
        border:1px solid var(--border,#e7ecf3);
        border-radius:14px; padding:14px;
        box-shadow:0 8px 18px rgba(0,0,0,.12);
      }

      .ap-head{ display:flex; align-items:center; justify-content:space-between; gap:10px }
      .ap-title{ margin:0; font-weight:900; font-size:16px; color:var(--text,#0c1230) }

      .ap-strip{ height:6px; border-radius:6px; margin:10px 0 14px 0;
        background:linear-gradient(90deg,#0d63b2,#58a6ff);
      }

      .ap-row{ display:flex; gap:10px; flex-wrap:wrap }
      .ap-col{ flex:1 1 260px; min-width:240px }
      .ap-label{ font-size:12px; font-weight:800; color:#6e7b91; margin:0 0 6px 2px; letter-spacing:.08em }

      /* Aligned numeric input */
      .ap-input{
        width:100%;
        box-sizing:border-box;
        font-size:18px; font-weight:800; color:var(--text,#0c1230);
        background:var(--surface,#f3f6fb); border:1px solid var(--border,#dbe0ea);
        border-radius:12px; padding:12px 14px; outline:none;
        margin-left:0;
      }

      /* Bigger chips */
      .ap-chips{ display:flex; gap:10px; flex-wrap:wrap; margin-top:6px }
      .ap-chip{
        border-radius:999px; border:1px solid var(--border,#dbe0ea);
        background:var(--surface,#f3f6fb);
        padding:14px 20px; font-weight:900; cursor:pointer; user-select:none;
        font-size:15px;
        color:var(--text,#0c1230);
      }
      .ap-chip[data-active="true"]{ background:#e0edff; border-color:#58a6ff; color:#0b1a3a }

      /* Medication label */
      .ap-med-label{ margin:14px 2px 8px; font-weight:900; font-size:12px; color:#6e7b91; letter-spacing:.12em; text-transform:uppercase }

      /* Medication buttons (bigger) */
      .ap-drugs{
        display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:10px;
      }
      .ap-btn{
        border:1px solid var(--border,#e7ecf3);
        border-radius:14px; padding:14px 16px;
        font-weight:900; cursor:pointer; text-align:left;
        background:var(--surface,#f6f8fd);
        font-size:15px;
        transition:transform .06s ease, box-shadow .06s ease, border-color .06s ease, color .06s ease;
        color:var(--text,#0c1230); /* default BLACK */
      }
      .ap-btn[data-active="true"]{
        box-shadow:0 8px 18px rgba(0,0,0,.14);
        transform:translateY(-1px);
        border-color:currentColor; /* takes the per-med color when active */
      }

      /* Result block */
      .ap-result{
        margin-top:12px; padding:14px; border-radius:12px;
        background:var(--surface,#f6f8fd); border:1px solid var(--border,#e7ecf3);
      }
      .ap-selected{
        font-weight:900; margin-bottom:8px;
        font-size:20px;           /* bigger title */
        line-height:1.1;
      }
      .ap-age-line{
        font-weight:900; color:#6e7b91; margin-bottom:6px; font-size:13px;
      }
      .ap-dose{ white-space:pre-wrap; line-height:1.5; font-weight:800; color:var(--text,#0c1230) }

      /* ===== Shared section header colors (used for ALL medications) ===== */
      .ap-sec{ display:inline-block; font-weight:1000; letter-spacing:.04em; margin:10px 0 2px }
      .ap-sec.--anaphylaxis{ color:#0ea5e9 }         /* cyan-blue */
      .ap-sec.--brady{ color:#f59e0b }               /* amber */
      .ap-sec.--cardiac-arrest{ color:#6366f1 }      /* indigo */
      .ap-sec.--rosc{ color:#6366f1 }                /* indigo */
      .ap-sec.--hypoglycemia{ color:#10b981 }        /* emerald */
      .ap-sec.--upper-airway{ color:#a855f7 }        /* violet */
      .ap-sec.--asthma-severe{ color:#ef4444 }       /* red */
      .ap-sec.--asthma-moderate{ color:#fb923c }     /* orange */
      .ap-sec.--asthma-mild{ color:#22c55e }         /* green */
      .ap-sec.--special-notes{ color:#64748b }       /* slate */
      .ap-sec.--fluids-anaphylaxis{ color:#0ea5e9 }  /* align with ANAPHYLAXIS */
      .ap-sec.--hemo-shock{ color:#ef4444 }          /* red */
      .ap-sec.--hypovolemia{ color:#22c55e }         /* green */
      .ap-sec.--cardiogenic{ color:#f59e0b }         /* amber */

      /* Alerts */
      .ap-alert{
        display:none;
        margin:8px 2px 10px; padding:10px 12px; border-radius:10px;
        background:#fff7ed; border:1px solid #fed7aa; color:#7c2d12;
        font-weight:700; font-size:13px;
      }

      /* Dark tweaks */
      :root[data-theme="dark"] .ap-card{ background:#151921; border-color:#232a37 }
      :root[data-theme="dark"] .ap-input{ background:#12151c; border-color:#232a37; color:#eef2ff }
      :root[data-theme="dark"] .ap-chip{ background:#12151c; border-color:#232a37; color:#eef2ff }
      :root[data-theme="dark"] .ap-chip[data-active="true"]{ background:#1f3350; border-color:#3b82f6; color:#e6edff }
      :root[data-theme="dark"] .ap-btn{ background:#12151c; border-color:#232a37; color:#eef2ff }
      :root[data-theme="dark"] .ap-result{ background:#12151c; border-color:#232a37 }
      :root[data-theme="dark"] .ap-dose{ color:#eef2ff }
      :root[data-theme="dark"] .ap-alert{ background:#3b2a14; border-color:#6b4a1b; color:#fde68a }
    </style>

    <div class="ap-wrap">
      <div class="ap-card">
        <div class="ap-head">
          <h3 class="ap-title">AP Pediatrics</h3>
        </div>

        <div class="ap-strip"></div>

        <div class="ap-row">
          <div class="ap-col">
            <p class="ap-label">Age</p>
            <input id="ageInput" class="ap-input" inputmode="numeric" placeholder="e.g., 8">
          </div>

          <div class="ap-col">
            <p class="ap-label">Age Group</p>
            <div class="ap-chips" id="ageGroup">
              <button class="ap-chip" data-group="Months" data-active="true">Months</button>
              <button class="ap-chip" data-group="Years">Years</button>
            </div>
          </div>
        </div>

        <div id="apAlert" class="ap-alert"></div>

        <p class="ap-med-label">Medication</p>
        <div class="ap-drugs" id="medGrid">
          <button class="ap-btn" data-drug="adrenaline">Adrenaline</button>
          <button class="ap-btn" data-drug="amiodarone">Amiodarone (CCP)</button>
          <button class="ap-btn" data-drug="defib">Defibrillation</button>
          <button class="ap-btn" data-drug="dextrose">Dextrose 10%</button>
          <button class="ap-btn" data-drug="fluids">Fluids</button>
          <button class="ap-btn" data-drug="ipratropium">Ipratropium Bromide</button>
          <button class="ap-btn" data-drug="paracetamol">Paracetamol</button>
          <button class="ap-btn" data-drug="salbutamol">Salbutamol</button>
          <button class="ap-btn" data-drug="waafels">WAAFELLS</button>
        </div>

        <div id="apResult" class="ap-result" aria-live="polite">
          <div id="apSelected" class="ap-selected" style="color:var(--text,#0c1230)">-</div>
          <div id="apAgeLine" class="ap-age-line"></div>
          <div id="apDose" class="ap-dose">Pick a medication.</div>
        </div>
      </div>
    </div>
  `;

  /* ---------- Helpers & State ---------- */
  const $  = sel => mountEl.querySelector(sel);
  const $$ = sel => [...mountEl.querySelectorAll(sel)];

  const ageInput   = $('#ageInput');
  const groupWrap  = $('#ageGroup');
  const medGrid    = $('#medGrid');
  const alertBox   = $('#apAlert');
  const selectedEl = $('#apSelected');
  const ageLineEl  = $('#apAgeLine');
  const doseEl     = $('#apDose');

  // Medication color palette (swap hexes to match Android if needed)
  const PALETTE = {
    adrenaline : '#e91e63', // pink
    amiodarone : '#7c3aed', // violet
    defib      : '#f59e0b', // amber
    dextrose   : '#10b981', // emerald
    fluids     : '#0ea5e9', // sky
    ipratropium: '#14b8a6', // teal
    paracetamol: '#8bc34a', // light green
    salbutamol : '#06b6d4', // cyan
    waafels    : '#f43f5e', // rose
  };

  // Section key → CSS class (shared across all meds)
  const SEC = {
    'ANAPHYLAXIS': '--anaphylaxis',
    'BRADYCARDIA': '--brady',
    'CARDIAC ARREST': '--cardiac-arrest',
    'ROSC': '--rosc',
    'HYPOGLYCEMIA': '--hypoglycemia',
    'UPPER AIRWAY SWELLING': '--upper-airway',
    'ASTHMA (SEVERE)': '--asthma-severe',
    'ASTHMA (MODERATE)': '--asthma-moderate',
    'ASTHMA (MILD)': '--asthma-mild',
    'SPECIAL NOTES': '--special-notes',
    // Fluids groups:
    'ANAPHYLAXIS': '--fluids-anaphylaxis',
    'HEMORRHAGIC SHOCK': '--hemo-shock',
    'HYPOVOLAEMIA': '--hypovolemia',
    'CARDIOGENIC SHOCK': '--cardiogenic',
  };

  let currentDrug = null;

  const setGroupActive = g => {
    $$('#ageGroup .ap-chip').forEach(b => b.dataset.active = (b.dataset.group === g) ? 'true' : 'false');
  };
  const activeGroup = () => groupWrap.querySelector('.ap-chip[data-active="true"]')?.dataset.group || 'Months';

  const showAlert = msg => { alertBox.textContent = msg; alertBox.style.display = 'block'; };
  const hideAlert = () => { alertBox.style.display = 'none'; alertBox.textContent = ''; };

  const clean = n => {
    const v = Math.round(n * 10) / 10;
    return (Math.abs(v - Math.round(v)) < 1e-9) ? String(Math.round(v)) : v.toFixed(1);
  };
  const ceilInt = n => String(Math.ceil(n));
  const fmtAge = (n, grp) => {
    const k = Math.round(n);
    if (grp === 'Months') return `Age: ${k} ${k===1?'month':'months'}`;
    return `Age: ${k} ${k===1?'year':'years'}`;
  };

  function weightForMonths(ageM){ return ageM * 0.5 + 4; }
  function weightForYears(ageY){ return (ageY <= 5) ? (ageY * 2 + 8) : (ageY * 3 + 7); }

  function getValidAge(){
    const grp = activeGroup();
    const raw = (ageInput.value||'').trim();
    const n = Number(raw);
    if (!raw || Number.isNaN(n) || n <= 0) return { ok:false, msg:'Enter a valid age', grp };
    if (grp === 'Months' && n > 12) return { ok:false, msg:'Age over 12 months. Switch Age Group to Years.', grp };
    if (grp === 'Years' && n > 14)  return { ok:false, msg:'Pediatric guideline cap is 14 years. For 15+ use adult references.', grp };
    return { ok:true, grp, n };
  }

  function applyMedColor(drug){
    const col = PALETTE[drug] || 'var(--text,#0c1230)';
    selectedEl.style.color = col;
    // reset all to black, then color the active
    $$('.ap-btn').forEach(b => {
      if (b.dataset.drug === drug){
        b.style.color = col;
        b.dataset.active = 'true';
      } else {
        b.style.color = 'var(--text,#0c1230)'; // default black
        b.dataset.active = 'false';
      }
    });
  }

  function setSelectedTitle(text, drug){
    selectedEl.textContent = text;
    applyMedColor(drug);
  }

  function setAgeLine(grp, n){
    ageLineEl.textContent = fmtAge(n, grp);
  }

  const H = (key) => `<span class="ap-sec ${SEC[key]||''}">${key}</span>`;

  /* ---------- Calculations ---------- */
  function doAdrenaline(grp, n){
    currentDrug = 'adrenaline';
    setSelectedTitle('Adrenaline', 'adrenaline');

    const { ok, msg } = getValidAge();
    if (!ok){ doseEl.textContent = msg; return showAlert(msg); }
    hideAlert();
    setAgeLine(grp, n);

    const weight = (grp==='Months') ? weightForMonths(n) : weightForYears(n);
    const dose1 = weight * 0.01;
    const neb   = weight * 0.5;

    doseEl.innerHTML =
`Patient estimated weight is ${clean(weight)}kg.

${H('CARDIAC ARREST')}
Adrenaline dose ${clean(dose1)}mg. IV or IO repeat every 4 minutes.
Ref.Dose Calculation: ${clean(weight)}kg x 0.01

${H('BRADYCARDIA')}
Adrenaline dose is ${clean(dose1)}mg IV or IO with MAX dose 0.5mg.
Ref.Dose Calculation: ${clean(weight)}kg x 0.01

${H('ANAPHYLAXIS')}
First line medications
Adrenaline dose is ${clean(dose1)}mg IM. (Max dose 0.5mg) repeat after 5 minutes if required
Age<6years: Adrenalin dose 0.15mg(0.15ml).
Ref.Dose Calculation: ${clean(weight)}kg x 0.01

${H('UPPER AIRWAY SWELLING')}
Adrenaline dose is ${clean(neb)}mg nebulized (Max dose 5mg).
Ref.Dose Calculation: ${clean(weight)}kg x 0.5`;
  }

  function doAmiodarone(grp, n){
    currentDrug = 'amiodarone';
    setSelectedTitle('Amiodarone (CCP)', 'amiodarone');

    const { ok, msg } = getValidAge();
    if (!ok){ doseEl.textContent = msg; return showAlert(msg); }
    hideAlert();
    setAgeLine(grp, n);

    const weight = (grp==='Months') ? weightForMonths(n) : weightForYears(n);
    const dose = weight * 5;

    doseEl.innerHTML =
`Patient estimated weight is ${clean(weight)}kg.

${H('CARDIAC ARREST')}
This is only for CCP
Amiodarone Dose is ${clean(dose)}mg IV or IO repeat twice up to 15mg per kg.
MAX Dose is 300mg (Up to a total of 3 doses).

Ref. Dose Calculation: ${clean(weight)}kg x 5`;
  }

  function doDefib(grp, n){
    currentDrug = 'defib';
    setSelectedTitle('Defibrillation', 'defib');

    const { ok, msg } = getValidAge();
    if (!ok){ doseEl.textContent = msg; return showAlert(msg); }
    hideAlert();
    setAgeLine(grp, n);

    const weight = (grp==='Months') ? weightForMonths(n) : weightForYears(n);
    let dose = weight * 4;
    if (dose > 360) dose = 360;

    doseEl.innerHTML =
`Patient estimated weight is ${clean(weight)}kg.

${H('CARDIAC ARREST')}
Patient Defibrillation Energy is ${clean(dose)} Joules.
Ref. For Calculation: ${clean(weight)}kg x 4`;
  }

  function doDextrose(grp, n){
    currentDrug = 'dextrose';
    setSelectedTitle('Dextrose 10%', 'dextrose');

    const { ok, msg } = getValidAge();
    if (!ok){ doseEl.textContent = msg; return showAlert(msg); }
    hideAlert();
    setAgeLine(grp, n);

    const weight = (grp==='Months') ? weightForMonths(n) : weightForYears(n);
    let rosc = weight * 2.5; if (rosc > 50) rosc = 50;
    const hypo = weight * 5;

    doseEl.innerHTML =
`Patient estimated weight is ${clean(weight)}kg.

${H('HYPOGLYCEMIA')}
IV/IO Dextrose dose is ${clean(hypo)}ml (IV or IO).
Ref. Dose Calculation: ${clean(weight)}kg x 5

${H('ROSC')}
For hypoglycemia in cardiac arrest or ROSC the IV/IO Dextrose dose is ${clean(rosc)}ml.
Ref. Dose Calculation: ${clean(weight)}kg x 2.5${grp==='Years' ? ' - MAX Dose is 50ml':''}`;
  }

  function doFluids(grp, n){
    currentDrug = 'fluids';
    setSelectedTitle('Fluids', 'fluids');

    const { ok, msg } = getValidAge();
    if (!ok){ doseEl.textContent = msg; return showAlert(msg); }
    hideAlert();
    setAgeLine(grp, n);

    const weight = (grp==='Months') ? weightForMonths(n) : weightForYears(n);
    const dose5  = ceilInt(weight * 5);
    const dose10 = ceilInt(weight * 10);
    const dose20 = ceilInt(weight * 20);

    doseEl.innerHTML =
`Patient estimated weight is ${clean(weight)}kg.

${H('ANAPHYLAXIS')}
Fluid Bolus is ${dose10} - ${dose20}ml.
Ref. Dose Calculation: ${clean(weight)}kg x 10 - ${clean(weight)}kg x 20

${H('HEMORRHAGIC SHOCK')}
Fluid Bolus is ${dose10} - ${dose20}ml boluses, (MAX 2 boluses OR 1L)
Ref. Dose Calculation: ${clean(weight)}kg x 10 - ${clean(weight)}kg x 20

${H('HYPOVOLAEMIA')}
The amount of fluid bolus that can be given to the patient is ${dose10}ml, repeat if required.
Ref. Dose Calculation: ${clean(weight)}kg x 10

${H('CARDIOGENIC SHOCK')}
Treat very cautiously and transport promptly: Consider ${dose5}ml fluid bolus with close monitoring.
Ref. Dose Calculation: ${clean(weight)}kg x 5`;
  }

  function doIpratropium(grp, n){
    currentDrug = 'ipratropium';
    setSelectedTitle('Ipratropium Bromide', 'ipratropium');

    const { ok, msg } = getValidAge();
    if (!ok){ doseEl.textContent = msg; return showAlert(msg); }
    hideAlert();
    setAgeLine(grp, n);

    doseEl.innerHTML =
`${H('ANAPHYLAXIS')}
Ipratropium Bromide dose 0.25mg nebulized.

${H('ASTHMA (SEVERE)')}
Ipratropium Bromide dose 0.25mg nebulized.
Agitated and unable to vocalise, Confusion, Low SpO2, Silent Chest

${H('ASTHMA (MODERATE)')}
Ipratropium Bromide dose 0.25mg nebulized.
Wheezing or dry cough, Alert but agitated

${H('ASTHMA (MILD)')}
Ipratropium Bromide dose 0.25mg nebulized.
Wheeze or dry cough, Talks/ vocalise normally, Alert.

${H('SPECIAL NOTES')}
• Neb should be mixed to a volume of 5ml
• Ipratropium Bromide must always be administered together with Salbutamol in the same nebuliser - never on its own.
• Ipratropium Bromide is a single dose. If additional doses are required, request CCP assistance. CCP is required for a second dose; maximum 2 doses may be given 20 minutes apart.`;
  }

  function doParacetamol(grp, n){
    currentDrug = 'paracetamol';
    setSelectedTitle('Paracetamol', 'paracetamol');

    const { ok, msg } = getValidAge();
    if (!ok){ doseEl.textContent = msg; return showAlert(msg); }
    hideAlert();
    setAgeLine(grp, n);

    if (grp === 'Months'){
      const w = weightForMonths(n);
      const byMonth = {2:'3ml',3:'3ml',4:'3.5ml',5:'4ml',6:'4ml',7:'5ml',8:'5ml',9:'5.5ml',10:'5.5ml',11:'5.5ml',12:'5.5ml'};
      const key = Math.max(2, Math.min(12, Math.round(n)));
      const dose = byMonth[key] || '-';
      doseEl.innerHTML =
`Patient estimated weight is ${clean(w)}kg.

${H('SPECIAL NOTES')}
If the patient is alert and can swallow - the Paracetamol dose volume is ${dose} from (120mg in 5ml syrup).

Ref. Dose Calculation: Paracetamol Bottle`;
      return;
    }

    // Years version
    if (n <= 2){
      const w = weightForYears(n);
      doseEl.innerHTML =
`Patient estimated weight is ${clean(w)}kg.

${H('SPECIAL NOTES')}
If the patient is alert and can swallow - the Paracetamol dose volume is 6ml from (120mg in 5ml syrup).

Ref. Dose Calculation: Paracetamol Bottle`;
    } else if (n === 3){
      const w = weightForYears(3);
      doseEl.innerHTML =
`Patient estimated weight is ${clean(w)}kg.

${H('SPECIAL NOTES')}
If the patient is alert and can swallow - the Paracetamol dose volume is 7.5ml from (120mg in 5ml syrup).

Ref. Dose Calculation: Paracetamol Bottle`;
    } else if (n === 4){
      const w = weightForYears(4);
      doseEl.innerHTML =
`Patient estimated weight is ${clean(w)}kg.

${H('SPECIAL NOTES')}
If the patient is alert and can swallow - the Paracetamol dose volume is 8.5ml from (120mg in 5ml syrup).

Ref. Dose Calculation: Paracetamol Bottle`;
    } else if (n === 5){
      const w = weightForYears(5);
      doseEl.innerHTML =
`Patient estimated weight is ${clean(w)}kg.

${H('SPECIAL NOTES')}
If the patient is alert and can swallow - the Paracetamol dose volume is 10ml from (120mg in 5ml syrup).

Ref. Dose Calculation: Paracetamol Bottle`;
    } else {
      const w = weightForYears(n);
      doseEl.innerHTML =
`Patient estimated weight is ${clean(w)}kg.

${H('SPECIAL NOTES')}
The HMCAS Paracetamol bottle is Infant syrup which is for patients ≤ 5 years`;
    }
  }

  function doSalbutamol(grp, n){
    currentDrug = 'salbutamol';
    setSelectedTitle('Salbutamol', 'salbutamol');

    const { ok, msg } = getValidAge();
    if (!ok){ doseEl.textContent = msg; return showAlert(msg); }
    hideAlert();
    setAgeLine(grp, n);

    doseEl.innerHTML =
`${H('ANAPHYLAXIS')}
Salbutamol dose 5mg nebulized.

${H('ASTHMA (SEVERE)')}
Salbutamol dose 2.5 - 5mg nebulized.
Agitated and unable to vocalise, Confusion, Low SpO2
HR >140 (2-5yrs) or >125 (>5yrs)
RR >40 (2-5yrs) or >30 (>5yrs)
Silent Chest

${H('ASTHMA (MODERATE)')}
Salbutamol dose 2.5 - 5mg nebulized.
Wheezing or dry cough, Alert but agitated
HR 120-140
RR >30

${H('ASTHMA (MILD)')}
Salbutamol dose 2.5 - 5mg nebulized.
Wheeze or dry cough, Talks/ vocalise normally, Alert.
RR < 30`;
  }

  function doWaafels(grp, n){
    currentDrug = 'waafels';
    setSelectedTitle('WAAFELLS', 'waafels');

    const { ok, msg } = getValidAge();
    if (!ok){ doseEl.textContent = msg; return showAlert(msg); }
    hideAlert();
    setAgeLine(grp, n);

    if (grp === 'Months'){
      const weight = weightForMonths(n);
      const adrMg = weight * 0.01;
      const adrMl = weight / 10;
      const ami   = weight * 5;
      const minFl = weight * 10;
      const maxFl = weight * 20;
      let energy  = weight * 4; if (energy > 360) energy = 360;
      let dexRosc = weight * 2.5; if (dexRosc > 50) dexRosc = 50;
      const sBP   = ((n/12) * 2) + 70;
      const tube  = (weight <= 5) ? 'Size 1' : 'Size 1.5';
      const needle = 'IV Catheter 22g\n(Color: Blue | Length: 2.5cm)';

      doseEl.textContent =
`The WAAFELLS for your patient :

• Weight - ${clean(weight)} kg
• Adrenaline - ${clean(adrMg)} mg (${clean(adrMl)} ml)
• Amiodarone - ${clean(ami)} mg (${clean(adrMl)} ml)
• Fluids  ${ceilInt(minFl)}-${ceilInt(maxFl)} ml
• SGA - ${tube}
• Energy - ${clean(energy)} J
• Systolic BP - ${clean(sBP)} mmHg
• Dextrose 10% - ${clean(dexRosc)}ml
• Chest Wall Decompression - ${needle}`;
      return;
    }

    // Years
    const weight = weightForYears(n);
    const adrMg = weight * 0.01;
    const adrMl = weight / 10;
    const ami   = weight * 5;
    const minFl = weight * 10;
    const maxFl = weight * 20;
    let dexRosc = weight * 2.5; if (dexRosc > 50) dexRosc = 50;
    const sBP   = n * 2 + 70;

    let tube = '';
    if (n <= 5){
      if (weight >= 10 && weight <= 24) tube = 'Size 2';
      else if (weight >= 25 && weight <= 35) tube = 'Size 2.5';
    } else {
      tube = (weight >= 25 && weight <= 35) ? 'Size 2.5' : 'Consider adult SGA sizes';
    }

    const needle =
      (n < 2) ? 'IV Catheter 22g\n(Color: Blue | Length: 2.5cm)' :
      (n >= 2 && n <= 5) ? 'IV Catheter 18g\n(Color: Green | Length: 3.2cm)' :
      (n === 6) ? 'IV Catheter 18g\n(Color: Green | Length: 3.2cm)' :
      (n >= 7 && n <= 13) ? 'IV Catheter 16g\n(Color: Grey | Length: 4.5cm)' :
      'IV Catheter 16g\n(Color: Grey | Length: 4.5cm)\nConsider patient size\nLonger needle may be required\nARS Needle 10g or 14g';

    const energy = clean(weight * 4);

    doseEl.textContent =
`The WAAFELLS for your patient :

• Weight - ${clean(weight)} kg
• Adrenaline - ${clean(adrMg)} mg (${clean(adrMl)} ml)
• Amiodarone - ${clean(ami)} mg (${clean(adrMl)} ml)
• Fluids  ${ceilInt(minFl)}-${ceilInt(maxFl)} ml
• SGA - ${tube}
• Energy - ${energy} J
• Systolic BP - ${clean(sBP)} mmHg
• Dextrose 10% - ${clean(dexRosc)}ml
• Chest Wall Decompression - ${needle}`;
  }

  /* ---------- Recompute helper ---------- */
  function recompute(){
    if (!currentDrug) return;
    const v = getValidAge();
    const grp = v.grp;
    const n   = v.n ?? 0;

    switch (currentDrug){
      case 'adrenaline':  doAdrenaline(grp,n);  break;
      case 'amiodarone':  doAmiodarone(grp,n);  break;
      case 'defib':       doDefib(grp,n);       break;
      case 'dextrose':    doDextrose(grp,n);    break;
      case 'fluids':      doFluids(grp,n);      break;
      case 'ipratropium': doIpratropium(grp,n); break;
      case 'paracetamol': doParacetamol(grp,n); break;
      case 'salbutamol':  doSalbutamol(grp,n);  break;
      case 'waafels':     doWaafels(grp,n);     break;
    }
  }

  /* ---------- Wiring ---------- */
  groupWrap.addEventListener('click', e => {
    const chip = e.target.closest('.ap-chip');
    if (!chip) return;
    setGroupActive(chip.dataset.group);
    hideAlert();
    recompute(); // update result when switching Months/Years
  });

  medGrid.addEventListener('click', e => {
    const btn = e.target.closest('.ap-btn');
    if (!btn) return;
    const drug = btn.dataset.drug;
    const v = getValidAge();
    const grp = v.grp;
    const n   = v.n ?? 0;

    switch (drug){
      case 'adrenaline':  doAdrenaline(grp,n);  break;
      case 'amiodarone':  doAmiodarone(grp,n);  break;
      case 'defib':       doDefib(grp,n);       break;
      case 'dextrose':    doDextrose(grp,n);    break;
      case 'fluids':      doFluids(grp,n);      break;
      case 'ipratropium': doIpratropium(grp,n); break;
      case 'paracetamol': doParacetamol(grp,n); break;
      case 'salbutamol':  doSalbutamol(grp,n);  break;
      case 'waafels':     doWaafels(grp,n);     break;
    }
  });

  ageInput.addEventListener('input', () => {
    hideAlert();
    recompute();
  });

  // init
  setGroupActive('Months');
  selectedEl.textContent = '-';
  ageLineEl.textContent = '';
  doseEl.textContent = 'Pick a medication.';
}
