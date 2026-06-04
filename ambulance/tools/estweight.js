// tools/estweight.js
export async function run(mountEl){
  mountEl.innerHTML = `
    <style>
      /* ========= Estimated Weight (scoped) ========= */
      .ew-wrap{ padding:12px }
      .ew-card{
        background:var(--surface,#fff);
        border:1px solid var(--border,#e7ecf3);
        border-radius:14px; padding:14px;
        box-shadow:0 8px 18px rgba(0,0,0,.12);
      }

      .ew-head{ display:flex; align-items:center; justify-content:space-between; gap:10px }
      .ew-title{ margin:0; font-weight:900; font-size:16px; color:var(--text,#0c1230) }

      .ew-strip{ height:6px; border-radius:6px; margin:10px 0 14px 0;
        background:linear-gradient(90deg,#ef4444,#f59e0b);
      }

      .ew-row{ display:flex; gap:10px; flex-wrap:wrap }
.ew-col{
  flex:1 1 260px;
  min-width:240px;
  display:flex;
  flex-direction:column;
  justify-content:flex-start;
}
.ew-field{
  margin-bottom:10px;
  width:100%;
}
.ew-input{
  width:100%;
  box-sizing:border-box;       /* LANDMARK — keeps input full width & aligned */
}


      .ew-label{ font-size:12px; font-weight:800; color:#6e7b91; margin:0 0 6px 2px }
      .ew-input{
        width:100%; font-size:18px; font-weight:800; color:var(--text,#0c1230);
        background:var(--surface,#f3f6fb); border:1px solid var(--border,#dbe0ea);
        border-radius:12px; padding:12px 14px; outline:none;
      }

      /* bigger Months / Years chips with active highlight */
      .ew-radio{ display:flex; gap:8px; flex-wrap:wrap; margin-top:6px }
      .ew-chip{
        border-radius:999px; border:1px solid var(--border,#dbe0ea);
        background:var(--surface,#f3f6fb);
        padding:12px 16px; font-weight:900; font-size:14px; cursor:pointer;
      }
      .ew-chip[data-active="true"][data-val="Months"]{
        background:#ffe3ed; border-color:#ff8bb5; color:#6c1130;
      }
      .ew-chip[data-active="true"][data-val="Years"]{
        background:#e0f2fe; border-color:#60a5fa; color:#0b2a50;
      }

      /* Result block */
      .ew-panel{
        margin-top:12px; padding:12px; border-radius:12px;
        background:var(--surface,#f6f8fd); border:1px solid var(--border,#e7ecf3);
      }
      .ew-age { font-weight:900; color:var(--text,#0c1230); opacity:.9 }

      /* LANDMARK C — Bigger “Patient estimated weight” label with spacing */
      .ew-midlabel{
        margin-top:8px;              /* spacing below age */
        font-size:14px;              /* slightly bigger */
        font-weight:900;
        color:var(--text,#0c1230);
      }

      .ew-bigline{ display:flex; align-items:baseline; gap:10px; margin-top:4px }
      .ew-val{ font-size:42px; line-height:1; font-weight:900; color:var(--text,#0c1230) }
      .ew-unit{ font-size:18px; font-weight:800; opacity:.95; color:var(--text,#0c1230) }
      .ew-note{ margin-top:6px; font-size:12px; color:#6e7b91 }

      .ew-actions{ display:flex; gap:10px; margin-top:10px }
      .ew-btn{
        border:none; border-radius:12px; padding:10px 14px; font-weight:900; cursor:pointer;
        box-shadow:0 6px 14px rgba(0,0,0,.12); background:var(--surface,#f3f6fb);
        border:1px solid var(--border,#dbe0ea); color:var(--text,#0c1230);
      }

      /* ---------- Dark tweaks ---------- */
      :root[data-theme="dark"] .ew-card{ background:#151921; border-color:#232a37 }
      :root[data-theme="dark"] .ew-input{ background:#12151c; border-color:#232a37; color:#eef2ff }
      :root[data-theme="dark"] .ew-chip{ background:#12151c; border-color:#232a37; color:#eef2ff }
      :root[data-theme="dark"] .ew-panel{ background:#12151c; border-color:#232a37 }
      :root[data-theme="dark"] .ew-btn{ background:#12151c; border-color:#232a37; color:#eef2ff }
      :root[data-theme="dark"] .ew-note{ color:#aeb8d1 }
    </style>

    <div class="ew-wrap">
      <div class="ew-card">
        <div class="ew-head">
          <h3 class="ew-title">Estimated Weight</h3>
        </div>

        <div class="ew-strip"></div>

        <div class="ew-row">
          <div class="ew-col">
            <div class="ew-field">
              <div class="ew-label">Age</div>
              <input id="ageInput" class="ew-input" inputmode="numeric" placeholder="e.g., 8">
            </div>
          </div>

          <div class="ew-col">
            <div class="ew-label">Age Group</div>
            <div id="ageGroup" class="ew-radio">
              <button class="ew-chip" data-val="Months" data-active="true">Months</button>
              <button class="ew-chip" data-val="Years">Years</button>
            </div>
          </div>
        </div>

        <div class="ew-panel" aria-live="polite">
          <div class="ew-age" id="outAge">—</div>
          <!-- LANDMARK C — new mid label -->
          <div class="ew-midlabel" id="outMid">Patient estimated weight</div>
          <div class="ew-bigline">
            <div class="ew-val" id="outKg">—</div>
            <div class="ew-unit">kg</div>
          </div>
          <div class="ew-note" id="outNote">Enter age and pick Months or Years.</div>
        </div>

        <div class="ew-actions">
          <button id="btnClear" class="ew-btn">Clear</button>
        </div>
      </div>
    </div>
  `;

  /* ===== JS ===== */
  const $  = s => mountEl.querySelector(s);
  const $$ = s => [...mountEl.querySelectorAll(s)];

  const ageInput   = $('#ageInput');
  const ageGroupEl = $('#ageGroup');
  const outAge = $('#outAge');
  const outMid = $('#outMid');     // LANDMARK C
  const outKg  = $('#outKg');
  const outNote= $('#outNote');

  /* Helpers */
  const activeGroup = () => (ageGroupEl.querySelector('[data-active="true"]')?.dataset.val ?? 'Months');
  const setGroup = v => $$('.ew-chip').forEach(b => b.dataset.active = (b.dataset.val === v) ? 'true' : 'false');
  const fmtInt = n => String(Math.round(n));

  function fmtAgeLabel(num, grp){
    const n = Math.round(num);
    if (grp === 'Months') return n === 1 ? 'Age: 1 month' : `Age: ${n} months`;
    return n === 1 ? 'Age: 1 year' : `Age: ${n} years`;
  }

  /* LANDMARK A — alert de-dup (avoid spamming while typing) */
  let lastAlertKey = '';
  function maybeAlert(key, msg){
    if (lastAlertKey === key) return;
    lastAlertKey = key;
    alert(msg);
  }

  /* Compute on every change with caps/alerts */
  function compute(){
    const grp = activeGroup();
    const raw = (ageInput.value||'').trim();
    const n = Number(raw);

    if (!raw || !Number.isFinite(n) || n < 0){
      outAge.textContent = '—';
      outKg.textContent  = '—';
      outNote.textContent = 'Enter age and pick Months or Years.';
      lastAlertKey = ''; // reset
      return;
    }

    // LANDMARK B — bounds + alerts
    if (grp === 'Months' && n >= 13){
      maybeAlert('m13', 'Age over 12 months. Switch Age Group to Years.');
      outKg.textContent = '—';
      outAge.textContent = fmtAgeLabel(n, grp);
      outNote.textContent = 'Age exceeds months range.';
      return;
    }
    if (grp === 'Years' && n >= 15){
      maybeAlert('y15', 'Pediatric guideline cap is 14 years. For 15+ use adult references.');
      outKg.textContent = '—';
      outAge.textContent = fmtAgeLabel(n, grp);
      outNote.textContent = 'Age exceeds pediatric range.';
      return;
    }

    let kg;
    if (grp === 'Months'){
      kg = n * 0.5 + 4;
    } else {
      kg = n <= 5 ? n * 2 + 8 : n * 3 + 7;
    }

    outAge.textContent = fmtAgeLabel(n, grp);
    outMid.textContent = 'Patient estimated weight'; // LANDMARK C (always visible)
    outKg.textContent  = fmtInt(kg);
    outNote.textContent = '';
    lastAlertKey = ''; // valid value resets alert gate
  }

  function clearAll(){
    ageInput.value = '';
    outAge.textContent = '—';
    outMid.textContent = 'Patient estimated weight';
    outKg.textContent  = '—';
    outNote.textContent = 'Enter age and pick Months or Years.';
    lastAlertKey = '';
    ageInput.focus();
  }

  /* Wire up (instant) */
  ageInput.addEventListener('input', compute);
  ageGroupEl.addEventListener('click', e=>{
    const btn = e.target.closest('.ew-chip');
    if (!btn) return;
    setGroup(btn.dataset.val);
    lastAlertKey = '';
    compute();
  });
  $('#btnClear').addEventListener('click', clearAll);

  // init
  compute();
}
