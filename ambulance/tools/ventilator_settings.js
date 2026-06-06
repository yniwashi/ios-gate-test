// tools/ventilator_settings.js
// CHANGELOG (2026-06-06):
// - Match Android ventilator settings content with adult weight validation, added rows, notes, and iOS keyboard dismissal.
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
    .vent-pill{
      display:inline-flex;align-items:center;width:max-content;
      margin:0 0 13px;padding:6px 11px;border-radius:999px;
      background:#e0f2fe;border:1px solid rgba(56,189,248,.55);
      color:#0369a1;font-size:11px;line-height:13px;font-weight:950;
    }
    .mc-help{margin:7px 0 0 2px;color:#7a8798;font-size:12px;font-weight:750;line-height:1.35}

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
    .mc-empty{
      border-color:color-mix(in oklab,var(--vent-accent,#0284c7) 24%,var(--border,#e7ecf3));
      background:color-mix(in oklab,var(--vent-accent,#0284c7) 8%,var(--surface,#f6f8fd));
    }
    .mc-result h4{
      margin-top:0; font-size:17px; font-weight:900; color:var(--text,#0c1230);
    }
    .mc-result h4.vent-accent{color:var(--vent-accent,#0284c7)}
    .mc-result p{margin:6px 0 0;color:#667085;font-size:14px;font-weight:750;line-height:1.4}

    /* ===== Table styling ===== */
    .vent-table{
      width:100%;
      border-collapse:collapse;
      font-weight:800; font-size:16px;
    }
    .vent-row{
      display:grid;
      grid-template-columns: 100px 1fr;
      padding:8px 0;
      align-items:start;
    }
    .vent-row:not(:last-child){
      border-bottom:2px solid color-mix(in oklab, var(--border,#b7c0d0) 60%, transparent);
    }
    .vent-label{ color:#6e7b91; padding-right:6px; }
    .vent-value{ color:var(--text,#0c1230); white-space:pre-line; line-height:1.35; }
    .vent-notes{
      margin-top:14px;padding:14px;border-radius:14px;
      background:var(--surface,#fff);border:1px solid var(--border,#e7ecf3);
      box-shadow:0 8px 18px rgba(0,0,0,.10);
    }
    .vent-notes h4{margin:0 0 9px;color:var(--text,#0c1230);font-size:15px;font-weight:950}
    .vent-note{display:flex;gap:8px;margin:7px 0;color:#475569;font-size:12px;line-height:1.35;font-weight:750}
    .vent-note::before{content:"*";color:#0284c7;font-weight:950;flex:0 0 auto}

    :root[data-theme="dark"] .mc-card{ background:#151921; border-color:#232a37 }
    :root[data-theme="dark"] .mc-input{ background:#12151c; border-color:#232a37; color:#eef2ff }
    :root[data-theme="dark"] .mc-result{ background:#12151c; border-color:#232a37; color:#eef2ff }
    :root[data-theme="dark"] .mc-empty{background:color-mix(in oklab,var(--vent-accent,#38bdf8) 12%,#12151c);border-color:color-mix(in oklab,var(--vent-accent,#38bdf8) 34%,#232a37)}
    :root[data-theme="dark"] .mc-result p{color:#aab5c4}
    :root[data-theme="dark"] .vent-pill{background:rgba(56,189,248,.15);border-color:rgba(56,189,248,.38);color:#7dd3fc}
    :root[data-theme="dark"] .vent-label{ color:#9ca3af }
    :root[data-theme="dark"] .vent-notes{background:#151921;border-color:#232a37}
    :root[data-theme="dark"] .vent-note{color:#cbd5e1}
    :root[data-theme="dark"] .vent-row:not(:last-child){
      border-bottom:2px solid #39445a;
    }
    @media(prefers-color-scheme:dark){
      :root[data-theme="auto"] .mc-card{ background:#151921; border-color:#232a37 }
      :root[data-theme="auto"] .mc-input{ background:#12151c; border-color:#232a37; color:#eef2ff }
      :root[data-theme="auto"] .mc-result{ background:#12151c; border-color:#232a37; color:#eef2ff }
      :root[data-theme="auto"] .mc-empty{background:color-mix(in oklab,var(--vent-accent,#38bdf8) 12%,#12151c);border-color:color-mix(in oklab,var(--vent-accent,#38bdf8) 34%,#232a37)}
      :root[data-theme="auto"] .mc-result p{color:#aab5c4}
      :root[data-theme="auto"] .vent-pill{background:rgba(56,189,248,.15);border-color:rgba(56,189,248,.38);color:#7dd3fc}
      :root[data-theme="auto"] .vent-label{ color:#9ca3af }
      :root[data-theme="auto"] .vent-notes{background:#151921;border-color:#232a37}
      :root[data-theme="auto"] .vent-note{color:#cbd5e1}
      :root[data-theme="auto"] .vent-row:not(:last-child){border-bottom:2px solid #39445a}
    }
  </style>

  <div class="mc-wrap">
    <div class="mc-card">
      <div class="vent-pill">Adult settings for common conditions</div>
      <div class="mc-section">
        <p class="mc-label">PATIENT WEIGHT</p>
        <div class="mc-row">
          <input id="pt_weight" class="mc-input" inputmode="decimal" placeholder="Enter estimated weight">
          <span class="mc-unit">kg</span>
        </div>
        <p class="mc-help">Valid adult weight range: 30-250 kg.</p>
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
        <h4>Select a condition</h4>
        <p>Choose a lung condition to view settings.</p>
      </div>
    </div>
    <div class="vent-notes">
      <h4>Notes</h4>
      <div class="vent-note">Respiratory rate should be adjusted according to age for paediatric patients.</div>
      <div class="vent-note">Tidal volume can be increased up to 10 ml/kg if required.</div>
      <div class="vent-note">FiO2 generally does not need to be adjusted from 1.0 in the acute phase, but may be applicable in some cases. During interfacility transfers, FiO2 should be matched to the existing ventilator settings and adjusted as required.</div>
    </div>
  </div>
  `;

  /* ===== JS Logic ===== */
  const $ = s => mountEl.querySelector(s);
  const weightInput = $('#pt_weight');
  const lungOpts = $('#lung_opts');
  const resultEl = $('#vent_result');
  let selectedType = null;

  const CONDITION_META = {
    normal: { title:'Normal Lungs', accent:'#0284C7' },
    asthma: { title:'Asthma / COPD', accent:'#0F766E' },
    ards: { title:'Pulmonary Oedema / ARDS', accent:'#F97316' }
  };

  const buildTable = (title, accent, rows) => `
    <h4 class="vent-accent" style="--vent-accent:${accent}">${title}</h4>
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
    const meta = CONDITION_META[selectedType] || CONDITION_META.normal;

    if (!selectedType) {
      resultEl.className = 'mc-result mc-empty';
      resultEl.style.setProperty('--vent-accent', '#0284C7');
      resultEl.innerHTML = `<h4 class="vent-accent">Select a condition</h4><p>Choose a lung condition to view settings.</p>`;
      return;
    }

    resultEl.style.setProperty('--vent-accent', meta.accent);

    if (!Number.isFinite(weight) || weight <= 0) {
      resultEl.className = 'mc-result mc-empty';
      resultEl.innerHTML = `<h4 class="vent-accent">Enter patient weight</h4><p>Weight is needed for the tidal volume range.</p>`;
      return;
    }
    if (weight < 30 || weight > 250) {
      resultEl.className = 'mc-result mc-empty';
      resultEl.innerHTML = `<h4 class="vent-accent">Enter a valid adult weight</h4><p>The settings table will appear after a valid adult weight is entered.</p>`;
      return;
    }

    const w4 = (weight * 4).toFixed(0);
    const w6 = (weight * 6).toFixed(0);
    const w8 = (weight * 8).toFixed(0);

    let rows = [];
    let title = '';

    if (selectedType === 'normal') {
      title = 'Normal Lungs';
      rows = [
        ['Mode', 'IPPV'],
        ['RR', '12-14 breaths/min'],
        ['TV', `${w6}-${w8} ml (6-8 ml/kg)`],
        ['Pmax', '35-40 mbar'],
        ['I:E Ratio', '1:2'],
        ['PEEP', '3-5 mbar'],
        ['Pressure Support', 'N/A'],
        ['Trigger', '3 L/min'],
        ['FiO2', '1.0'],
      ];
    } else if (selectedType === 'asthma') {
      title = 'Asthma / COPD';
      rows = [
        ['Mode', 'IPPV'],
        ['RR', '5-10 breaths/min'],
        ['TV', `${w4}-${w6} ml (4-6 ml/kg)`],
        ['Pmax', '40-45 mbar'],
        ['I:E Ratio', '1:4-1:5'],
        ['PEEP', '0-5 mbar'],
        ['Pressure Support', 'N/A'],
        ['Trigger', '3 L/min'],
        ['FiO2', '1.0'],
      ];
    } else if (selectedType === 'ards') {
      title = 'Pulmonary Oedema / ARDS';
      rows = [
        ['Mode', 'IPPV or NIV'],
        ['RR', '12-16 breaths/min'],
        ['TV', `${w6}-${w8} ml (6-8 ml/kg)`],
        ['Pmax', '40-45 mbar'],
        ['I:E Ratio', '1:1-1:2'],
        ['PEEP', 'Up to 10 mbar'],
        ['Pressure Support', 'CPAP: Up to 10 mbar\nBiPAP: Up to 20 mbar'],
        ['Trigger', '3 L/min'],
        ['FiO2', '1.0'],
      ];
    }

    resultEl.className = 'mc-result';
    resultEl.innerHTML = buildTable(title, meta.accent, rows);
  }

  lungOpts.addEventListener('click', e => {
    const label = e.target.closest('.mc-radio');
    if (!label) return;
    weightInput.blur();
    selectedType = label.dataset.value;
    lungOpts.querySelectorAll('.mc-radio').forEach(r => {
      r.dataset.active = String(r.dataset.value === selectedType);
      r.querySelector('input').checked = (r.dataset.value === selectedType);
    });
    updateResults();
  });

  weightInput.addEventListener('input', () => {
    const cleaned = weightInput.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 6);
    if (weightInput.value !== cleaned) weightInput.value = cleaned;
    if (selectedType) updateResults();
  });

  const blurActiveInput = () => {
    if (document.activeElement === weightInput) weightInput.blur();
  };
  mountEl.addEventListener('touchmove', blurActiveInput, { passive:true });
  mountEl.addEventListener('wheel', blurActiveInput, { passive:true });
}
