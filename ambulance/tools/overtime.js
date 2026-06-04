// tools/overtime.js
export async function run(mountEl) {
  mountEl.innerHTML = `
    <style>
      /* ===== Overtime Calculator — Scoped ===== */
      .ot-wrap{ padding:12px }
      .ot-card{
        background:var(--surface,#f3f6fb);
        border:1px solid color-mix(in oklab, var(--border,#dbe0ea) 70%, transparent);
        border-radius:14px; padding:14px; box-shadow:0 6px 18px rgba(0,0,0,.12);
        position:relative;
      }
      .ot-title{ margin:0 0 12px; font-weight:800; color:#6e7b91 }

      .ot-grid{ display:grid; grid-template-columns:1fr; gap:14px; }
      @media (min-width:520px){ .ot-grid{ grid-template-columns:1fr 1fr; } }

      .ot-field{ display:block; }
      .ot-label{
        display:block; font-size:12px; font-weight:800; color:#76829a; letter-spacing:.02em;
        margin: 4px 2px 6px;
      }
      .ot-input-wrap{
        display:flex; align-items:center; gap:8px;
        padding:6px 0;   /* padding to ensure label doesn't visually touch input */
      }
      .ot-unit{ font-size:14px; color:#6e7b91; white-space:nowrap; pointer-events:none; }
      .ot-input{
        flex:1; width:100%; font-size:18px; font-weight:700;
        color:var(--text,#0c1230); background:var(--surface,#fff);
        border:1px solid var(--border,#dbe0ea); border-radius:14px; padding:12px;
        outline:none;
      }
      .ot-input:focus{
        box-shadow:0 0 0 3px color-mix(in oklab, var(--accent,#2f81f7) 25%, transparent);
      }

      .ot-chips{ display:flex; flex-wrap:wrap; gap:8px; margin-top:6px; }
      .ot-chip{
        border-radius:999px; border:1px solid var(--border,#dbe0ea);
        background:var(--surface,#f3f6fb); padding:8px 12px; font-weight:700;
        cursor:pointer; user-select:none;
      }

      .ot-actions{
        display:flex; flex-wrap:wrap; gap:12px; margin-top:14px; align-items:center;
      }
      .ot-btn{
        border:none; border-radius:14px; padding:12px 18px; font-weight:900; cursor:pointer;
        box-shadow:0 6px 14px rgba(0,0,0,.15); font-size:16px; letter-spacing:.2px;
      }
      .ot-btn.primary-green{ color:#fff; background:linear-gradient(180deg,#25c26e,#0fa958); }
      .ot-btn.primary-orange{ color:#fff; background:linear-gradient(180deg,#ffa43a,#ff7f0a); }
      .ot-btn.ghost{ color:var(--text,#0c1230); background:var(--surface,#f3f6fb); border:1px solid var(--border,#dbe0ea); }

      /* Result Card */
      .ot-result-card{
        margin-top:16px;
        border-radius:16px;
        padding:14px;
        border:1px solid color-mix(in oklab, var(--border,#dbe0ea) 75%, transparent);
        background:color-mix(in oklab, var(--surface,#ffffff) 85%, transparent);
      }
      .ot-strip{ height:4px; border-radius:6px; margin:2px 0 12px; background:#224; opacity:.9 }
      .ot-result{
        display:flex; align-items:baseline; gap:10px; color:var(--text,#0c1230);
      }
      .ot-amount{ font-size:36px; font-weight:900 }
      .ot-currency{ font-size:18px; font-weight:800; opacity:.95 }
      .ot-sub{ margin-top:8px; font-size:12px; color:#6e7b91; line-height:1.35 }
      .ot-formula{
        margin-top:10px; padding:10px 12px; border-radius:12px;
        background:color-mix(in oklab, var(--surface,#f3f6fb) 88%, transparent);
        border:1px solid color-mix(in oklab, var(--border,#dbe0ea) 70%, transparent);
        font-size:12px; color:var(--text,#0c1230);
      }
      .ot-formula code{
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        font-size:12px; padding:2px 6px; border-radius:8px;
        background:color-mix(in oklab, var(--surface,#f3f6fb) 94%, transparent);
        border:1px solid color-mix(in oklab, var(--border,#dbe0ea) 50%, transparent);
        display:inline-block;
      }

      /* Toast */
      .ot-toast{
        position:fixed; left:50%; transform:translateX(-50%);
        bottom:18px; background:#1f2937; color:#fff; padding:10px 14px; border-radius:12px;
        box-shadow:0 10px 24px rgba(0,0,0,.25); font-weight:700; opacity:0; pointer-events:none;
        transition:opacity .2s ease, transform .2s ease; z-index:9999;
      }
      .ot-toast.show{ opacity:1; transform:translateX(-50%) translateY(-4px); }

      /* Dark mode */
      :root[data-theme="dark"] .ot-card{ background:#12151c; border-color:#232a37; }
      :root[data-theme="dark"] .ot-chip{ background:#141923; border-color:#232a37; color:#e6ebff; }
      :root[data-theme="dark"] .ot-btn.ghost{ background:#141923; border:1px solid #232a37; color:#eef2ff; }
      :root[data-theme="dark"] .ot-input{ background:#12151c; border-color:#232a37; color:#eef2ff; }
      :root[data-theme="dark"] .ot-label{ color:#9aa6c3; }
      :root[data-theme="dark"] .ot-unit{ color:#9aa6c3; }

      :root[data-theme="dark"] .ot-result-card{
        background:#0f141c; border-color:#253046;
      }
      :root[data-theme="dark"] .ot-strip{ background:#253046; }
      :root[data-theme="dark"] .ot-sub{ color:#9aa6c3; }
      :root[data-theme="dark"] .ot-formula{
        background:#121a25; border-color:#26344b; color:#dfe7ff;
      }
      :root[data-theme="dark"] .ot-formula code{
        background:#0e1520; border-color:#26344b;
        color:#dfe7ff;
      }
    </style>

    <div class="ot-wrap">
      <div class="ot-card" id="otCard">
        <div class="ot-title">Overtime Calculator</div>

        <div class="ot-grid">
          <div class="ot-field">
            <label class="ot-label" for="otBasic">Basic Salary (QR)</label>
            <div class="ot-input-wrap">
              <input id="otBasic" class="ot-input" inputmode="numeric" placeholder="7500" autocomplete="off">
              <span class="ot-unit">QR</span>
            </div>
          </div>

          <div class="ot-field">
            <label class="ot-label" for="otHours">Overtime Hours</label>
            <div class="ot-input-wrap">
              <input id="otHours" class="ot-input" inputmode="numeric" placeholder="8" autocomplete="off">
              <span class="ot-unit">hrs</span>
            </div>
            <div class="ot-chips" id="otHourChips">
              ${[1,12,36,48,60,72,84,90].map(v=>`<button class="ot-chip" data-val="${v}">${v}</button>`).join("")}
            </div>
          </div>
        </div>

        <div class="ot-actions">
          <button id="otNormal"  class="ot-btn primary-green">Normal OT</button>
          <button id="otRamadan" class="ot-btn primary-orange">Ramadan OT</button>
          <button id="otClear"   class="ot-btn ghost">Clear</button>
        </div>

        <div class="ot-result-card">
          <div class="ot-strip" id="otStrip"></div>
          <div class="ot-result" id="otResult" aria-live="polite">
            <div class="ot-amount" id="otAmount">—</div>
            <div class="ot-currency">QR</div>
          </div>
          <div class="ot-sub" id="otNote">Enter salary and hours, then choose Normal or Ramadan.</div>
          <div class="ot-formula" id="otFormula">
            <div><strong>Formula:</strong><code>Earnings = Basic × Hours × 1.25 × Factor</code></div>
            <div style="margin-top:6px" id="otFactorLine"><em>Factor:</em> —</div>
          </div>
        </div>
      </div>
    </div>

    <div class="ot-toast" id="otToast">Please enter Basic Salary &amp; OT Hours</div>
  `;

  /* ===== Helpers ===== */
  const $ = (sel) => mountEl.querySelector(sel);

  const amount  = $('#otAmount');
  const noteEl  = $('#otNote');
  const toastEl = $('#otToast');
  const factorLine = $('#otFactorLine');

  const basicEl = $('#otBasic');
  const hoursEl = $('#otHours');

  // LANDMARK 1 — numeric sanitizers
  function cleanInt(val){
    const s = String(val||'').replace(/[^\d]/g,'').slice(0,9);
    return s;
  }
  basicEl.addEventListener('input', ()=>{ basicEl.value = cleanInt(basicEl.value); });
  hoursEl.addEventListener('input', ()=>{ hoursEl.value = cleanInt(hoursEl.value); });

  // LANDMARK 2 — CEILING to 1 decimal
  function ceil1(x){
    if (!Number.isFinite(x)) return NaN;
    return Math.ceil(x * 10) / 10;
  }

  // LANDMARK 3 — factors and compute
  const FACTOR = {
    normal: 0.0058333,
    ramadan:0.009333
  };
  function compute(mode){
    const b = parseInt(basicEl.value, 10);
    const h = parseInt(hoursEl.value, 10);
    if (!Number.isFinite(b) || !Number.isFinite(h)){
      showToast("Please enter Basic Salary & OT Hours");
      return { ok:false };
    }
    const factor = mode==='ramadan' ? FACTOR.ramadan : FACTOR.normal;
    const earnings = b * h * 1.25 * factor;
    const rounded  = ceil1(earnings);
    return { ok:true, rounded, factor };
  }

  // LANDMARK 4 — toast
  let toastTimer = null;
  function showToast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> toastEl.classList.remove('show'), 1800);
  }

   // LANDMARK 5 — actions
  function runNormal(){
    const res = compute('normal');
    if (!res.ok) return;
    amount.textContent = res.rounded.toFixed(1);
    noteEl.textContent = 'Your Normal OT earnings calculated at 1.25× multiplier.';
    factorLine.innerHTML = `<em>Factor:</em> Normal OT = ${FACTOR.normal}`;
  }
  function runRamadan(){
    const res = compute('ramadan');
    if (!res.ok) return;
    amount.textContent = res.rounded.toFixed(1);
    noteEl.textContent = 'Your Ramadan OT earnings calculated at 1.25× multiplier.';
    factorLine.innerHTML = `<em>Factor:</em> Ramadan OT = ${FACTOR.ramadan}`;
  }

  function clearAll(){
    basicEl.value = '';
    hoursEl.value = '';
    amount.textContent = '—';
    noteEl.textContent = 'Enter salary and hours, then choose Normal or Ramadan.';
    factorLine.innerHTML = '<em>Factor:</em> —';
    basicEl.focus();
  }

  // LANDMARK 6 — wire up
  $('#otNormal').addEventListener('click', runNormal);
  $('#otRamadan').addEventListener('click', runRamadan);
  $('#otClear').addEventListener('click', clearAll);

  mountEl.querySelectorAll('#otHourChips .ot-chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{ hoursEl.value = chip.dataset.val; });
  });

  // init
  factorLine.innerHTML = '<em>Factor:</em> —';
}
