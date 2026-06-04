// tools/ventilator_settings.js
export async function run(mountEl) {
  mountEl.innerHTML = `
  <style>
    /* ===== Shared Scoped Style ===== */
    .mc-wrap{ padding:12px }
    .mc-card{
      background:var(--surface,#fff);
      border:1px solid var(--border,#e7ecf3);
      border-radius:14px; padding:14px;
      box-shadow:0 8px 18px rgba(0,0,0,.12);
    }

    .mc-section{ margin-bottom:14px }
    .mc-label{
      margin:0 0 6px 2px;
      font-size:13px; font-weight:900; letter-spacing:.06em;
      color:#6e7b91; text-transform:uppercase;
    }

    .mc-row{ display:flex; gap:8px; align-items:center; flex-wrap:wrap }
    .mc-input{
      flex:1; min-width:160px;
      font-size:16px; font-weight:800; color:var(--text,#0c1230);
      background:var(--surface,#fff); border:1px solid var(--border,#e7ecf3);
      border-radius:12px; padding:12px; outline:none;
    }
    .mc-unit{ font-size:13px; color:#6e7b91; white-space:nowrap }

    /* ===== Radio group ===== */
    .mc-radio-row{ display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
    .mc-radio{
      display:inline-flex; align-items:center; gap:8px;
      padding:10px 14px; border-radius:999px; cursor:pointer;
      background:var(--surface,#f6f8fd); border:1px solid var(--border,#e7ecf3);
      font-weight:800; color:var(--text,#0c1230);
      transition:background .15s ease, color .15s ease, border-color .15s ease;
    }
    .mc-radio[data-active="true"]{
      background:linear-gradient(180deg,#d8ebff,#b8daff);
      border:1px solid #7cb5ff;
      color:#0b243d;
    }
    :root[data-theme="dark"] .mc-radio{ background:#12151c; border-color:#232a37; color:#eef2ff }
    :root[data-theme="dark"] .mc-radio[data-active="true"]{
      background:linear-gradient(180deg,#005ac1,#0045a1);
      border:1px solid #4b8fff;
      color:#eaf2ff;
    }

    /* ===== Result block ===== */
    .mc-result{
      margin-top:12px; padding:16px; border-radius:12px;
      background:var(--surface,#f6f8fd); border:1px solid var(--border,#e7ecf3);
      color:var(--text,#0c1230);
    }
    .mc-result h4{
      margin-top:0; font-size:17px; font-weight:900; color:var(--text,#0c1230);
    }

    /* ===== Table styling ===== */
    .vent-table{
      width:100%;
      border-collapse:collapse;
      font-weight:800; font-size:16px;
    }
    .vent-row{
      display:grid;
      grid-template-columns: 100px 1fr;
      padding:6px 0;
      align-items:center;
    }
    .vent-row:not(:last-child){
      border-bottom:2px solid color-mix(in oklab, var(--border,#b7c0d0) 60%, transparent);
    }
    .vent-label{ color:#6e7b91; padding-right:6px; }
    .vent-value{ color:var(--text,#0c1230); }

    :root[data-theme="dark"] .mc-card{ background:#151921; border-color:#232a37 }
    :root[data-theme="dark"] .mc-input{ background:#12151c; border-color:#232a37; color:#eef2ff }
    :root[data-theme="dark"] .mc-result{ background:#12151c; border-color:#232a37; color:#eef2ff }
    :root[data-theme="dark"] .vent-label{ color:#9ca3af }
    :root[data-theme="dark"] .vent-row:not(:last-child){
      border-bottom:2px solid #39445a;
    }
  </style>

  <div class="mc-wrap">
    <div class="mc-card">
      <div class="mc-section">
        <p class="mc-label">PATIENT WEIGHT</p>
        <div class="mc-row">
          <input id="pt_weight" class="mc-input" inputmode="decimal" placeholder="Enter estimated weight">
          <span class="mc-unit">kg</span>
        </div>
      </div>

      <div class="mc-section">
        <p class="mc-label">LUNG CONDITION</p>
        <div id="lung_opts" class="mc-radio-row" role="radiogroup" aria-label="Lung Condition">
          <label class="mc-radio" data-value="normal"><input type="radio" name="lung" value="normal">Normal Lungs</label>
          <label class="mc-radio" data-value="asthma"><input type="radio" name="lung" value="asthma">Asthma / COPD</label>
          <label class="mc-radio" data-value="ards"><input type="radio" name="lung" value="ards">Pulmonary Oedema / ARDS</label>
        </div>
      </div>

      <div id="vent_result" class="mc-result" aria-live="polite">
        <h4>Select a condition to view ventilator settings.</h4>
      </div>
    </div>
  </div>
  `;

  /* ===== JS Logic ===== */
  const $ = s => mountEl.querySelector(s);
  const weightInput = $('#pt_weight');
  const lungOpts = $('#lung_opts');
  const resultEl = $('#vent_result');
  let selectedType = null;

  const buildTable = (title, rows) => `
    <h4>For ${title}:</h4>
    <div>
      ${rows.map(r => `
        <div class="vent-row">
          <div class="vent-label">${r[0]}</div>
          <div class="vent-value">${r[1]}</div>
        </div>
      `).join('')}
    </div>
  `;

  function updateResults() {
    const weight = parseFloat(weightInput.value);
    if (!Number.isFinite(weight) || weight <= 0) {
      resultEl.innerHTML = `<h4>Please enter patient weight.</h4>`;
      return;
    }
    if (!selectedType) return;

    const w4 = (weight * 4).toFixed(0);
    const w6 = (weight * 6).toFixed(0);
    const w8 = (weight * 8).toFixed(0);

    let rows = [];
    let title = '';

    if (selectedType === 'normal') {
      title = 'Normal Lungs';
      rows = [
        ['RR', '(8–12 bpm)'],
        ['TV', `${w6}–${w8} ml/kg`],
        ['Pmax', '35 mbar'],
        ['Ti:Te', '1:2'],
        ['PEEP', '5 mbar'],
        ['O₂%', 'As required'],
        ['Mode', 'IPPV'],
      ];
    } else if (selectedType === 'asthma') {
      title = 'Asthma / COPD';
      rows = [
        ['RR', '(5–10 bpm)'],
        ['TV', `${w4}–${w6} ml/kg`],
        ['Pmax', '40 mbar'],
        ['Ti:Te', '1:4'],
        ['PEEP', '0–5 mbar'],
        ['O₂%', 'As required'],
        ['Mode', 'IPPV'],
      ];
    } else if (selectedType === 'ards') {
      title = 'Pulmonary Oedema / ARDS';
      rows = [
        ['RR', '(12–15 bpm)'],
        ['TV', `${w6}–${w8} ml/kg`],
        ['Pmax', '40 mbar'],
        ['Ti:Te', 'Up to 1:1'],
        ['PEEP', 'Up to 10 mbar'],
        ['O₂%', 'As required'],
        ['Mode', 'IPPV'],
      ];
    }

    resultEl.innerHTML = buildTable(title, rows);
  }

  lungOpts.addEventListener('click', e => {
    const label = e.target.closest('.mc-radio');
    if (!label) return;
    selectedType = label.dataset.value;
    lungOpts.querySelectorAll('.mc-radio').forEach(r => {
      r.dataset.active = String(r.dataset.value === selectedType);
      r.querySelector('input').checked = (r.dataset.value === selectedType);
    });
    updateResults();
  });

  weightInput.addEventListener('input', () => {
    if (selectedType) updateResults();
  });
}
