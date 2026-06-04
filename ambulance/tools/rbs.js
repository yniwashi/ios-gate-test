// tools/rbs.js
export async function run(mountEl) {
  mountEl.innerHTML = `
    <style>
      /* ===== RBS Converter — Scoped ===== */
      .rbs-wrap{padding:12px}
      .rbs-card{
        background:#e8f5e9;                 /* light "Normal" baseline */
        border:1px solid color-mix(in oklab, var(--border, #dbe0ea) 70%, transparent);
        border-radius:14px; padding:14px; box-shadow:0 6px 18px rgba(0,0,0,.12);
        position:relative;
      }
      .rbs-title{margin:0 0 10px 0; font-weight:700; color:#6e7b91}
     /* ---------- Align input with mg/dL label ---------- */
.rbs-input-wrap{
  display:flex;
  align-items:center;          /* keeps input text and unit on the same baseline */
  gap:8px;
}

.rbs-input{
  flex:1;                      /* let input take remaining width */
  width:100%;
  font-size:20px;
  font-weight:700;
  color:var(--text,#0c1230);
  background:var(--surface,#f3f6fb);
  border:1px solid var(--border,#dbe0ea);
  border-radius:14px;
  padding:14px 12px;           /* no extra right padding now */
  outline:none;
}

.rbs-input:focus{
  box-shadow:0 0 0 3px color-mix(in oklab, var(--accent,#2f81f7) 25%, transparent);
}

.rbs-unit{
  position:static;             /* sit inline, no absolute positioning */
  font-size:14px;
  color:#6e7b91;               /* readable in light */
  white-space:nowrap;
  pointer-events:none;
}

/* Dark theme unit color for contrast */
:root[data-theme="dark"] .rbs-unit{
  color:#9aa6c3;
}


      .rbs-row{ display:flex; gap:10px; flex-wrap:wrap; margin-top:12px }
      .rbs-chip{
        border-radius:999px; border:1px solid var(--border,#dbe0ea);
        background:var(--surface,#f3f6fb); padding:8px 12px; font-weight:700;
        cursor:pointer; user-select:none;
      }
      .rbs-actions{ display:flex; gap:12px; margin-top:10px }
      .rbs-btn{
        border:none; border-radius:12px; padding:10px 14px; font-weight:800; cursor:pointer;
        box-shadow:0 6px 14px rgba(0,0,0,.15);
      }
      .rbs-btn.primary{ color:#fff; background:linear-gradient(180deg,#4a80ff,#2f66ea) }
      .rbs-btn.ghost{ color:var(--text,#0c1230); background:var(--surface,#f3f6fb); border:1px solid var(--border,#dbe0ea); }

      .rbs-strip{ height:4px; border-radius:6px; margin:14px -14px 10px -14px; background:#224; opacity:.9 }
      .rbs-result{
        display:flex; align-items:baseline; gap:8px; margin-top:8px; color:var(--text,#0c1230);
      }
      .rbs-mm{ font-size:34px; font-weight:900 }
      .rbs-unit-big{ font-size:18px; font-weight:800; opacity:.95 }
      .rbs-pill{
        display:inline-block; margin-top:10px; padding:8px 14px; border-radius:999px;
        border:1px solid rgba(0,0,0,.15); font-weight:800;
        background:#e5e7eb; color:#0c1230;
      }

      .rbs-ref-title{ margin:16px 0 6px 0; font-weight:900; }
      /* Keep reference high-contrast: black in light, white in dark */
      .rbs-ref-title, .rbs-ref{
        color:#0c1230;
      }
      @media (prefers-color-scheme: dark) {
        .rbs-ref-title, .rbs-ref { color:#fff; }
      }
      .rbs-ref{ white-space:pre-line; line-height:1.35; }

      /* ---------- Dark theme tweaks ---------- */
      :root[data-theme="dark"] .rbs-input{
        background:#12151c; border-color:#232a37; color:#eef2ff;
      }
      :root[data-theme="dark"] .rbs-card{
        background:#141a17; border-color:#223029;
      }
      :root[data-theme="dark"] .rbs-chip{
        background:#12151c; border-color:#232a37; color:#e6ebff;
      }
      :root[data-theme="dark"] .rbs-btn.ghost{
        background:#12151c; border:1px solid #232a37; color:#eef2ff;
      }
    </style>

    <div class="rbs-wrap">
      <div class="rbs-card" id="rbsCard">
        <div class="rbs-title">Random Blood Sugar</div>

        <div class="rbs-input-wrap">
          <input id="rbsMg" class="rbs-input" inputmode="decimal" placeholder="120">
          <span class="rbs-unit">mg/dL</span>
        </div>

        <div class="rbs-row" style="margin-top:12px">
          ${[50,70,100,180,250].map(v=>`<button class="rbs-chip" data-val="${v}">${v}</button>`).join("")}
        </div>

        <div class="rbs-actions">
          <button id="rbsConvert" class="rbs-btn primary">Convert</button>
          <button id="rbsClear" class="rbs-btn ghost">Clear</button>
        </div>

        <div class="rbs-strip" id="rbsStrip"></div>

        <div class="rbs-result" id="rbsResult" aria-live="polite">
          <div class="rbs-mm" id="rbsMmol">—</div>
          <div class="rbs-unit-big">mmol/L</div>
        </div>

        <div class="rbs-pill" id="rbsStatus">—</div>

        <div class="rbs-ref-title">Reference (random glucose, mg/dL)</div>
        <div class="rbs-ref" id="rbsRef">- Hypoglycemia: &lt; 70
- Normal: 70 – 120
- Hyperglycemia: &gt; 120</div>
      </div>
    </div>
  `;

  /* ===== Helpers ===== */
  const $ = (sel)=>mountEl.querySelector(sel);
  const input = $('#rbsMg');
  const card  = $('#rbsCard');
  const strip = $('#rbsStrip');
  const mmolEl= $('#rbsMmol');
  const status= $('#rbsStatus');

  // LANDMARK 1 — category color palettes (light & dark)
  const COLORS = {
    light: {
      hypo: {strip:'#E53935', card:'#FFEBEE', pillBg:'#E53935', pillFg:'#fff'},
      norm: {strip:'#43A047', card:'#E8F5E9', pillBg:'#C8E6C9', pillFg:'#0c1230'},
      hyper:{strip:'#FB8C00', card:'#FFF3E0', pillBg:'#FFE0B2', pillFg:'#0c1230'}
    },
    dark: {
      hypo: {strip:'#ef5350', card:'#3a1e1e', pillBg:'#ef5350', pillFg:'#fff'},
      norm: {strip:'#66bb6a', card:'#1b3b24', pillBg:'#66bb6a', pillFg:'#0c1230'},
      hyper:{strip:'#ffa726', card:'#402915', pillBg:'#ffa726', pillFg:'#0c1230'}
    }
  };

  // LANDMARK 2 — robust dark-mode check (matches your theme toggle)
  function isDark() {
    const manual = document.documentElement.getAttribute('data-theme');
    if (manual === 'dark') return true;
    if (manual === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // LANDMARK 3 — apply a full theme for the status
  function applyTheme(kind) {
    const mode = isDark() ? 'dark' : 'light';
    const c = COLORS[mode][kind];
    card.style.backgroundColor = c.card;
    strip.style.backgroundColor = c.strip;
    status.style.backgroundColor = c.pillBg;
    status.style.color = c.pillFg;
  }

  // LANDMARK 4 — compute category and update UI
  function convert() {
    const raw = (input.value || '').trim();
    if (!raw) { resetCard(); return; }

    const mg = Number(raw.replace(',', '.'));
    if (Number.isNaN(mg) || mg < 0) {
      mmolEl.textContent = '—';
      status.textContent = 'Invalid';
      applyTheme('hyper'); // draw attention
      return;
    }

    const mmol = Math.round((mg/18)*10)/10;
    mmolEl.textContent = mmol.toFixed(1);

    if (mg < 70) {
      status.textContent = 'Hypoglycemia';
      applyTheme('hypo');
    } else if (mg <= 120) {
      status.textContent = 'Normal';
      applyTheme('norm');
    } else {
      status.textContent = 'Hyperglycemia';
      applyTheme('hyper');
    }
  }

  // LANDMARK 5 — initial/cleared state (no fade-to-gray)
  function resetCard() {
    mmolEl.textContent = '—';
    status.textContent = '—';
    // Keep baseline backgrounds per theme
    if (isDark()) {
      card.style.backgroundColor = '#141a17';
      strip.style.backgroundColor = '#223029';
    } else {
      card.style.backgroundColor = '#e8f5e9';
      strip.style.backgroundColor = '#224';
    }
    status.style.backgroundColor = '#e5e7eb';
    status.style.color = '#0c1230';
  }

  // LANDMARK 6 — wire up controls
  mountEl.querySelectorAll('.rbs-chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{ input.value = chip.dataset.val; convert(); });
  });
  $('#rbsConvert').addEventListener('click', convert);
  $('#rbsClear').addEventListener('click', ()=>{ input.value=''; resetCard(); input.focus(); });

  // On mount
  resetCard();
}
