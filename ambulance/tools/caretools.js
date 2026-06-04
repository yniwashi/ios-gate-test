// tools/caretools.js
export async function run(mountEl){
  mountEl.innerHTML = `
    <style>
      /* ========= Care Tools (scoped) ========= */
      .ct-wrap{ padding:12px }
      .ct-card{
        background:var(--surface,#fff);
        border:1px solid var(--border,#e7ecf3);
        border-radius:14px; padding:14px;
        box-shadow:0 8px 18px rgba(0,0,0,.12);
      }

      /* LANDMARK 1 - Title / theme */
      .ct-head{ display:flex; align-items:center; justify-content:space-between; gap:10px }
      .ct-title{ margin:0; font-weight:900; font-size:16px; color:var(--text,#0c1230) }
      .ct-strip{ height:6px; border-radius:6px; margin:10px 0 14px 0;
        background:linear-gradient(90deg,#a855f7,#ec4899);
      }

      /* Controls */
      .ct-row{ display:flex; gap:10px; flex-wrap:wrap }
      .ct-col{ flex:1 1 260px; min-width:240px }
      .ct-label{ font-size:12px; font-weight:800; color:#6e7b91; margin:0 0 6px 2px }

      /* LANDMARK 3 - Aligned input */
      .ct-input{
        width:100%;
        box-sizing:border-box;
        font-size:18px; font-weight:800; color:var(--text,#0c1230);
        background:var(--surface,#f3f6fb); border:1px solid var(--border,#dbe0ea);
        border-radius:12px; padding:12px 14px; outline:none;
        margin-left: 0; /* keep aligned with label */
      }

      /* LANDMARK 2 - group chips */
      .ct-chips{ display:flex; gap:8px; flex-wrap:wrap; margin-top:6px }
      .ct-chip{
        border-radius:999px; border:1px solid var(--border,#dbe0ea);
        background:var(--surface,#f3f6fb); padding:10px 14px;
        font-weight:900; cursor:pointer; user-select:none;
      }
      .ct-chip[data-active="true"]{
        background:#f3e8ff; border-color:#a855f7; color:#3b1670;
      }

      /* Validation / info */
      .ct-note{ margin:8px 2px 10px; font-size:12px; color:#6e7b91 }
      .ct-alert{
        display:none;
        margin:8px 2px 0; padding:10px 12px; border-radius:10px;
        background:#fff7ed; border:1px solid #fed7aa; color:#7c2d12;
        font-weight:700; font-size:13px;
      }

      /* LANDMARK 5 - Table */
      .ct-table{ display:flex; flex-direction:column; gap:8px; margin-top:12px }
      .ct-rowitem{
        display:grid; grid-template-columns: 1fr 1fr; gap:8px;
        background:var(--surface,#f6f8fd); border:1px solid var(--border,#e7ecf3);
        border-radius:12px; padding:10px 12px;
      }
      .ct-k{ font-weight:800; color:#6e7b91; }
      .ct-v{ font-weight:900; color:var(--text,#0c1230); white-space:pre-wrap }

      /* Dark theme tweaks */
      :root[data-theme="dark"] .ct-card{ background:#151921; border-color:#232a37 }
      :root[data-theme="dark"] .ct-input{ background:#12151c; border-color:#232a37; color:#eef2ff }
      :root[data-theme="dark"] .ct-chip{ background:#12151c; border-color:#232a37; color:#eef2ff }
      :root[data-theme="dark"] .ct-chip[data-active="true"]{ background:#332352; border-color:#7c3aed; color:#f3e8ff }
      :root[data-theme="dark"] .ct-rowitem{ background:#12151c; border-color:#232a37 }
      :root[data-theme="dark"] .ct-alert{ background:#3b2a14; border-color:#6b4a1b; color:#fde68a }
    </style>

    <div class="ct-wrap">
      <div class="ct-card">
        <div class="ct-head">
          <h3 class="ct-title">Care Tools</h3>
        </div>

        <div class="ct-strip"></div>

        <div class="ct-row">
          <div class="ct-col">
            <p class="ct-label">Age</p>
            <input id="ageInput" class="ct-input" inputmode="numeric" placeholder="e.g., 8">
          </div>

          <div class="ct-col">
            <p class="ct-label">Group</p>
            <div class="ct-chips" id="ageGroup">
              <button class="ct-chip" data-group="Preterm">Preterm</button>
              <button class="ct-chip" data-group="Months" data-active="true">Months</button>
              <button class="ct-chip" data-group="Years">Years</button>
            </div>
          </div>
        </div>

        <p class="ct-note">Tip: Press Preterm to get info without entering age.</p>

        <!-- LANDMARK 4 - validation messages -->
        <div id="ctAlert" class="ct-alert"></div>

        <!-- LANDMARK 5 - results table -->
        <div id="ctTable" class="ct-table" aria-live="polite"></div>
      </div>
    </div>
  `;

  /* ===== helpers ===== */
  const $  = sel => mountEl.querySelector(sel);
  const $$ = sel => [...mountEl.querySelectorAll(sel)];

  const ageInput = $('#ageInput');
  const groupWrap = $('#ageGroup');
  const alertBox = $('#ctAlert');
  const table = $('#ctTable');

  const setGroupActive = g => {
    $$('#ageGroup .ct-chip').forEach(b => b.dataset.active = (b.dataset.group === g) ? 'true' : 'false');
  };
  const activeGroup = () => {
    const a = groupWrap.querySelector('.ct-chip[data-active="true"]');
    return a ? a.dataset.group : 'Months';
  };

  const showAlert = (msg) => {
    alertBox.textContent = msg;
    alertBox.style.display = 'block';
  };
  const hideAlert = () => {
    alertBox.style.display = 'none';
    alertBox.textContent = '';
  };

  /* ===== LANDMARK 5 - render a KV table ===== */
  function renderTable(map){
    table.innerHTML = '';
    for (const [k,v] of map){
      const row = document.createElement('div');
      row.className = 'ct-rowitem';
      row.innerHTML = `<div class="ct-k">${k}</div><div class="ct-v">${v}</div>`;
      table.appendChild(row);
    }
  }

  /* ===== number helpers ===== */
  const fmt1 = v => (Math.round(v*10)/10).toFixed(1);
  const fmtInt = v => String(Math.round(v));

  /* ===== LANDMARK 6 - data engines ===== */
  function getPretermData(){
    // From your Kotlin getPretermData()
    return [
      ['Weight','2 kg'],
      ['Height','40 - 45 cm'],
      ['Adrenaline\nCardiac Arrest','0.02mg = 0.2ml'],
      ['Amiodarone\nCardiac Arrest','10mg = 2ml'],
      ['Dextrose 10%\nCardiac Arrest','4ml'],
      ['Defib\nCardiac Arrest','4j/kg = 8j'],
      ['Dextrose 10%\nHypoglycemia','4ml'],
      ['Fluids\nBolus/Burns','20ml per bolus'],
      ['Cardioversion 1st Shock','1j/kg = 2j'],
      ['Cardioversion Subsequent Shocks','2j/kg = 4j'],
      ['Heart Rate','110-170'],
      ['Respiratory Rate','40-70'],
      ['Systolic BP','55-75 mmHg'],
      ['Diastolic BP','35-45 mmHg'],
      ['Temperature','36.5 C'],
      ['RBS','2.6-6 mmol/L'],
      ['IV Canulla','24g'],
      ['IO Needle','Pink'],
      ['Suction','8 French'],
      ['LTA Size','Size 0 (<5 kg)'],
      ['ETT Size','2.5-3.0mm Uncuffed'],
      ['ETT Depth','7.5-9.0 cm (Oral)'],
      ['NG Tube','5-8 French'],
      ['Chest Wall\nDecompression','22g Venflon IV Catheter'],
      ['Tidal Volume','10-15ml'],
      ['PEEP','3-5cmH2O'],
      ['Pmax','18-25cmH2O'],
      ['IE Ratio','1:1'],
    ];
  }

  function getMonthsData(age){
    // age months → weight = age*0.5 + 4
    const weight = age*0.5 + 4;
    if (age>=1 && age<=2){
      return [
        ['Weight', `${fmt1(weight)} kg`],
        ['Height', '46-55 cm'],
        ['Adrenaline\nCardiac Arrest','0.03mg = 0.3ml'],
        ['Amiodarone\nCardiac Arrest','15mg = 0.3ml'],
        ['Dextrose 10%\nCardiac Arrest','6ml'],
        ['Defib\nCardiac Arrest','4j/kg = 15j'],
        ['Dextrose 10%\nHypoglycemia','6ml'],
        ['Fluids\nBolus/Burns','30ml per bolus'],
        ['Cardioversion 1st Shock','1j/kg = 3j'],
        ['Cardioversion Subsequent Shocks','2j/kg = 6j'],
        ['Heart Rate','110-160'],
        ['Respiratory Rate','35-55'],
        ['Systolic BP','65-85 mmHg'],
        ['Diastolic BP','45-55 mmHg'],
        ['Temperature','36.5 C'],
        ['RBS','2.6-6 mmol/L'],
        ['IV Canulla','22-24 g'],
        ['IO Needle','Pink'],
        ['Suction','8 French'],
        ['LTA Size','Size 0 (<5 kg)'],
        ['ETT Size','3-3.5mm Uncuffed'],
        ['ETT Depth','9-10.5cm (Oral)'],
        ['NG Tube','5-8 French'],
        ['Chest Wall\nDecompression','22g Venflon IV Catheter'],
        ['Tidal Volume','15-25 ml'],
        ['PEEP','3-5 cmH2O'],
        ['Pmax','18-25 cmH2O'],
        ['IE Ratio','1:1'],
      ];
    } else if (age>=3 && age<=7){
      return [
        ['Weight', `${fmt1(weight)} kg`],
        ['Height', '56-68 cm'],
        ['Adrenaline\nCardiac Arrest','0.06mg = 0.6ml'],
        ['Amiodarone\nCardiac Arrest','30mg = 0.6ml'],
        ['Dextrose 10%\nCardiac Arrest','15ml'],
        ['Defib\nCardiac Arrest','4j/kg = 20j'],
        ['Dextrose 10%\nHypoglycemia','30ml'],
        ['Fluids\nBolus/Burns','60-120ml per bolus'],
        ['Cardioversion 1st Shock','1j/kg = 6j'],
        ['Cardioversion Subsequent Shocks','2j/kg = 15j'],
        ['Heart Rate','110-160'],
        ['Respiratory Rate','30-45'],
        ['Systolic BP','70-90 mmHg'],
        ['Diastolic BP','50-65 mmHg'],
        ['Temperature','36.5 C'],
        ['RBS','4-6 mmol/L'],
        ['IV Canulla','22-24 g'],
        ['IO Needle','Pink'],
        ['Suction','8 French'],
        ['LTA Size','Size 1 (5-12 kg)'],
        ['ETT Size','3-4mm Uncuffed'],
        ['ETT Depth','9-12cm (Oral)'],
        ['NG Tube','5-8 French'],
        ['Chest Wall\nDecompression','22g Venflon IV Catheter'],
        ['Tidal Volume','35-50 ml'],
        ['PEEP','3-5 cmH2O'],
        ['Pmax','18-25 cmH2O'],
        ['IE Ratio','1:2'],
      ];
    } else if (age>=8 && age<=12){
      return [
        ['Weight', `${fmt1(weight)} kg`],
        ['Height', '69-85 cm'],
        ['Adrenaline\nCardiac Arrest','0.1mg = 1ml'],
        ['Amiodarone\nCardiac Arrest','50mg = 1ml'],
        ['Dextrose 10%\nCardiac Arrest','25ml'],
        ['Defib\nCardiac Arrest','4j/kg = 20j'],
        ['Dextrose 10%\nHypoglycemia','50ml'],
        ['Fluids\nBolus/Burns','100-200ml/bolus'],
        ['Cardioversion 1st Shock','1j/kg = 6j'],
        ['Cardioversion Subsequent Shocks','2j/kg = 15j'],
        ['Heart Rate','90-160'],
        ['Respiratory Rate','22-38'],
        ['Systolic BP','80-100 mmHg'],
        ['Diastolic BP','55-65 mmHg'],
        ['Temperature','36.5 C'],
        ['RBS','4-6 mmol/L'],
        ['IV Canulla','22-24 g'],
        ['IO Needle','Pink'],
        ['Suction','8 French'],
        ['LTA Size','Size 1 (5-12 kg)'],
        ['ETT Size','3.5-4.5mm Uncuffed'],
        ['ETT Depth','10.5-13.5cm (Oral)'],
        ['NG Tube','5-8 French'],
        ['Chest Wall\nDecompression','22g Venflon IV Catheter'],
        ['Tidal Volume','60-80 ml'],
        ['PEEP','3-5 cmH2O'],
        ['Pmax','18-25 cmH2O'],
        ['IE Ratio','1:2'],
      ];
    }
    return [['Info','Unknown age range']];
  }

  function getYearsData(age){
    // Kotlin has ranges 1..15; per your other tools we cap UI at 14.
    if (age>=1 && age<=3){
      const weight = age*2 + 8;
      return [
        ['Weight', `${fmtInt(weight)} kg`],
        ['Height','86-102 cm'],
        ['Adrenaline\nCardiac Arrest','0.15mg = 1.5ml'],
        ['Amiodarone\nCardiac Arrest','65mg = 1.3ml'],
        ['Dextrose 10%\nCardiac Arrest','30ml'],
        ['Defib\nCardiac Arrest','4j/kg = 50j'],
        ['Dextrose 10%\nHypoglycemia','65ml'],
        ['Fluids\nBolus/Burns','130-260ml/bolus'],
        ['Cardioversion 1st Shock','1j/kg = 15j'],
        ['Cardioversion Subsequent Shocks','2j/kg = 30j'],
        ['Heart Rate','80-150'],
        ['Respiratory Rate','22-30'],
        ['Systolic BP','90-105 mmHg'],
        ['Diastolic BP','55-70 mmHg'],
        ['Temperature','36.5 C'],
        ['RBS','4-6 mmol/L'],
        ['IV Canulla','20-24g'],
        ['IO Needle','Pink'],
        ['Suction','10 French'],
        ['LTA Size','Size 2 (12-25 kg)'],
        ['ETT Size','4mm Cuffed/4.5mm Uncuffed'],
        ['ETT Depth','12cm Cuffed/13.5cm Uncuffed'],
        ['NG Tube','8-10 French'],
        ['Chest Wall\nDecompression','18g Venflon IV Catheter'],
        ['Tidal Volume','80-100 ml'],
        ['PEEP','3-5 cmH2O'],
        ['Pmax','18-25 cmH2O'],
        ['IE Ratio','1:2'],
      ];
    } else if (age>=4 && age<=5){
      const weight = age*2 + 8;
      return [
        ['Weight', `${fmtInt(weight)} kg`],
        ['Height','103-118 cm'],
        ['Adrenaline\nCardiac Arrest','0.2mg = 2ml'],
        ['Amiodarone\nCardiac Arrest','90mg = 1.8ml'],
        ['Dextrose 10%\nCardiac Arrest','45ml'],
        ['Defib\nCardiac Arrest','4j/kg = 70j'],
        ['Dextrose 10%\nHypoglycemia','90ml'],
        ['Fluids\nBolus/Burns','180-360ml/bolus'],
        ['Cardioversion 1st Shock','1j/kg = 20j'],
        ['Cardioversion Subsequent Shocks','2j/kg = 40j'],
        ['Heart Rate','70-120'],
        ['Respiratory Rate','20-24'],
        ['Systolic BP','95-110 mmHg'],
        ['Diastolic BP','60-75 mmHg'],
        ['Temperature','36.5 C'],
        ['RBS','4-6 mmol/L'],
        ['IV Canulla','18-22g'],
        ['IO Needle','Pink'],
        ['Suction','10 French'],
        ['LTA Size','Size 2 (12-25 kg)'],
        ['ETT Size','4.5mm Cuffed/5mm Uncuffed'],
        ['ETT Depth','13.5cm Cuffed/15cm Uncuffed'],
        ['NG Tube','11 French'],
        ['Chest Wall\nDecompression','18g Venflon IV Catheter'],
        ['Tidal Volume','110-140 ml'],
        ['PEEP','3-5 cmH2O'],
        ['Pmax','18-25 cmH2O'],
        ['IE Ratio','1:2'],
      ];
    } else if (age>=6 && age<=7){
      const weight = age*3 + 7;
      return [
        ['Weight', `${fmtInt(weight)} kg`],
        ['Height','119-132 cm'],
        ['Adrenaline\nCardiac Arrest','0.25mg = 2.5ml'],
        ['Amiodarone\nCardiac Arrest','125mg = 2.5ml'],
        ['Dextrose 10%\nCardiac Arrest','50ml'],
        ['Defib\nCardiac Arrest','4j/kg = 100j'],
        ['Dextrose 10%\nHypoglycemia','125ml'],
        ['Fluids\nBolus/Burns','250-500ml/bolus'],
        ['Cardioversion 1st Shock','1j/kg = 20j'],
        ['Cardioversion Subsequent Shocks','2j/kg = 50j'],
        ['Heart Rate','70-120'],
        ['Respiratory Rate','20-24'],
        ['Systolic BP','95-110 mmHg'],
        ['Diastolic BP','60-75 mmHg'],
        ['Temperature','36.5 C'],
        ['RBS','4-6 mmol/L'],
        ['IV Canulla','18-22g'],
        ['IO Needle','Pink'],
        ['Suction','10 French'],
        ['LTA Size','Size 3 (< 155cm)'],
        ['ETT Size','5mm Cuffed/5.5mm Uncuffed'],
        ['ETT Depth','15cm Cuffed/16.5cm Uncuffed'],
        ['NG Tube','15-18 French'],
        ['Chest Wall\nDecompression','16g Venflon IV Catheter'],
        ['Tidal Volume','150-200 ml'],
        ['PEEP','3-5 cmH2O'],
        ['Pmax','18-25 cmH2O'],
        ['IE Ratio','1:2'],
      ];
    } else if (age>=8 && age<=9){
      const weight = age*3 + 7;
      return [
        ['Weight', `${fmtInt(weight)} kg`],
        ['Height','133-140 cm'],
        ['Adrenaline\nCardiac Arrest','0.3mg = 3ml'],
        ['Amiodarone\nCardiac Arrest','150mg = 3ml'],
        ['Dextrose 10%\nCardiac Arrest','50ml'],
        ['Defib\nCardiac Arrest','4j/kg = 130j'],
        ['Dextrose 10%\nHypoglycemia','160ml'],
        ['Fluids\nBolus/Burns','320-640ml/bolus'],
        ['Cardioversion 1st Shock','1j/kg = 30j'],
        ['Cardioversion Subsequent Shocks','2j/kg = 70j'],
        ['Heart Rate','60-110'],
        ['Respiratory Rate','16-22'],
        ['Systolic BP','100-120 mmHg'],
        ['Diastolic BP','60-75 mmHg'],
        ['Temperature','36.5 C'],
        ['RBS','4-6 mmol/L'],
        ['IV Canulla','18-20g'],
        ['IO Needle','Pink'],
        ['Suction','10-12 French'],
        ['LTA Size','Size 3 (< 155cm)'],
        ['ETT Size','5.5mm Cuffed/6mm Uncuffed'],
        ['ETT Depth','16.5cm Cuffed/18cm Uncuffed'],
        ['NG Tube','16-18 French'],
        ['Chest Wall\nDecompression','16g Venflon IV Catheter'],
        ['Tidal Volume','190-250 ml'],
        ['PEEP','3-5 cmH2O'],
        ['Pmax','18-25 cmH2O'],
        ['IE Ratio','1:2'],
      ];
    } else if (age>=10 && age<=11){
      const weight = age*3 + 7;
      return [
        ['Weight', `${fmtInt(weight)} kg`],
        ['Height','141-145 cm'],
        ['Adrenaline\nCardiac Arrest','0.4mg = 4ml'],
        ['Amiodarone\nCardiac Arrest','200mg = 4ml'],
        ['Dextrose 10%\nCardiac Arrest','50ml'],
        ['Defib\nCardiac Arrest','4j/kg = 150j'],
        ['Dextrose 10%\nHypoglycemia','190ml'],
        ['Fluids\nBolus/Burns','380-760ml/bolus'],
        ['Cardioversion 1st Shock','1j/kg = 40j'],
        ['Cardioversion Subsequent Shocks','2j/kg = 70j'],
        ['Heart Rate','60-110'],
        ['Respiratory Rate','16-22'],
        ['Systolic BP','100-120 mmHg'],
        ['Diastolic BP','60-75 mmHg'],
        ['Temperature','36.5 C'],
        ['RBS','4-6 mmol/L'],
        ['IV Canulla','18-20g'],
        ['IO Needle','Pink'],
        ['Suction','10-12 French'],
        ['LTA Size','Size 3 (< 155cm)'],
        ['ETT Size','5.5mm Cuffed/6mm Uncuffed'],
        ['ETT Depth','16.5cm Cuffed/18cm Uncuffed'],
        ['NG Tube','16-18 French'],
        ['Chest Wall\nDecompression','16g Venflon IV Catheter'],
        ['Tidal Volume','230-300 ml'],
        ['PEEP','3-5 cmH2O'],
        ['Pmax','18-25 cmH2O'],
        ['IE Ratio','1:2'],
      ];
    } else if (age>=12 && age<=13){
      const weight = age*3 + 7;
      return [
        ['Weight', `${fmtInt(weight)} kg`],
        ['Height','146-152 cm'],
        ['Adrenaline\nCardiac Arrest','0.45mg = 4.5ml'],
        ['Amiodarone\nCardiac Arrest','225mg = 4.5ml'],
        ['Dextrose 10%\nCardiac Arrest','50ml'],
        ['Defib\nCardiac Arrest','4j/kg = 175j'],
        ['Dextrose 10%\nHypoglycemia','200ml'],
        ['Fluids\nBolus/Burns','420-840ml/bolus'],
        ['Cardioversion 1st Shock','1j/kg = 40j'],
        ['Cardioversion Subsequent Shocks','2j/kg = 100j'],
        ['Heart Rate','60-110'],
        ['Respiratory Rate','12-20'],
        ['Systolic BP','110-135 mmHg'],
        ['Diastolic BP','65-85 mmHg'],
        ['Temperature','36.5 C'],
        ['RBS','4-6 mmol/L'],
        ['IV Canulla','18-20g'],
        ['IO Needle','Pink'],
        ['Suction','10-12 French'],
        ['LTA Size','Size 3 (< 155cm)'],
        ['ETT Size','6.5mm Cuffed'],
        ['ETT Depth','19.5cm Cuffed'],
        ['NG Tube','16-18 French'],
        ['Chest Wall\nDecompression','16g Venflon IV Catheter'],
        ['Tidal Volume','250-330 ml'],
        ['PEEP','3-5 cmH2O'],
        ['Pmax','18-25 cmH2O'],
        ['IE Ratio','1:2'],
      ];
    } else if (age>=14 && age<=14){
      const weight = age*3 + 7;
      return [
        ['Weight', `${fmtInt(weight)} kg`],
        ['Height','153-160 cm'],
        ['Adrenaline\nCardiac Arrest','0.5mg = 5ml'],
        ['Amiodarone\nCardiac Arrest','250mg = 5ml'],
        ['Dextrose 10%\nCardiac Arrest','50ml'],
        ['Defib\nCardiac Arrest','4j/kg = 200j'],
        ['Dextrose 10%\nHypoglycemia','240ml'],
        ['Fluids\nBolus/Burns','470-940ml/bolus'],
        ['Cardioversion 1st Shock','1j/kg = 50j'],
        ['Cardioversion Subsequent Shocks','2j/kg = 100j'],
        ['Heart Rate','60-100'],
        ['Respiratory Rate','12-20'],
        ['Systolic BP','110-135 mmHg'],
        ['Diastolic BP','65-85 mmHg'],
        ['Temperature','36.5 C'],
        ['RBS','4-6 mmol/L'],
        ['IV Canulla','18-20g'],
        ['IO Needle','Pink'],
        ['Suction','10-12 French'],
        ['LTA Size','Size 3 (< 155cm)'],
        ['ETT Size','7mm Cuffed'],
        ['ETT Depth','21cm Cuffed'],
        ['NG Tube','16-18 French'],
        ['Chest Wall\nDecompression','16g Venflon IV Catheter'],
        ['Tidal Volume','280-380 ml'],
        ['PEEP','3-5 cmH2O'],
        ['Pmax','18-25 cmH2O'],
        ['IE Ratio','1:2'],
      ];
    }
    return [['Info','Unknown age range']];
  }

  /* ===== LANDMARK 7 - wiring & live updates ===== */
  function compute(){
    hideAlert();
    const grp = activeGroup();

    if (grp === 'Preterm'){
      renderTable(getPretermData());
      return;
    }

    // numeric groups (Months / Years)
    const raw = (ageInput.value||'').trim();
    const n = Number(raw);
    if (!raw || Number.isNaN(n) || n < 0){
      renderTable([['Info','Enter a valid age']]);
      return;
    }

    if (grp === 'Months'){
      if (n > 12){
        showAlert('Age over 12 months. Switch Age Group to Years.');
        renderTable([['Info','—']]);
        return;
      }
      renderTable(getMonthsData(n));
      return;
    }

    if (grp === 'Years'){
      if (n > 14){
        showAlert('Pediatric guideline cap is 14 years. For 15+ use adult references.');
        renderTable([['Info','—']]);
        return;
      }
      renderTable(getYearsData(n));
      return;
    }
  }

  // click handlers
  groupWrap.addEventListener('click', e => {
    const chip = e.target.closest('.ct-chip');
    if (!chip) return;
    setGroupActive(chip.dataset.group);
    compute();
  });
  ageInput.addEventListener('input', compute);

  // init
  setGroupActive('Months');
  compute();
}
