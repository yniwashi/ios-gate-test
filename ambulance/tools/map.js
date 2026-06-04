// tools/map.js
export async function run(mountEl){
  mountEl.innerHTML = `
    <style>
      /* ========= MAP Calculator (scoped) ========= */
      .map-wrap{ padding:12px }
      .map-card{
        background:var(--surface,#fff);
        border:1px solid var(--border,#e7ecf3);
        border-radius:14px; padding:14px;
        box-shadow:0 8px 18px rgba(0,0,0,.12);
      }

      .map-head{ display:flex; align-items:center; justify-content:space-between }
      .map-title{ margin:0; font-weight:900; font-size:16px; color:var(--text,#0c1230) }

      .map-strip{ height:6px; border-radius:6px; margin:10px 0 14px 0;
        background:linear-gradient(90deg,#2196f3,#4f46e5);
      }

  
      .map-label{ font-size:12px; font-weight:800; color:#6e7b91; margin:0 0 6px 2px }
.map-row{ display:flex; gap:10px; flex-wrap:wrap }

.map-col{
  flex:1 1 220px;
  min-width:200px;
  display:flex;              /* LANDMARK: align like Age */
  flex-direction:column;
  justify-content:flex-start;
}

.map-field{
  margin-bottom:10px;
  width:100%;                /* LANDMARK: make the field span the column */
}

.map-input{
  width:100%;
  box-sizing:border-box;     /* LANDMARK: prevents right-shift / overflow */
  font-size:18px; font-weight:800; color:var(--text,#0c1230);
  background:var(--surface,#f3f6fb); border:1px solid var(--border,#dbe0ea);
  border-radius:12px; padding:12px 14px; outline:none;
}



      .map-chips{ display:flex; flex-wrap:wrap; gap:10px; margin-top:8px }
      .map-chip{
        border-radius:999px; border:1px solid var(--border,#dbe0ea);
        background:var(--surface,#f3f6fb); padding:8px 12px; font-weight:800;
        cursor:pointer; user-select:none;
      }

      /* LANDMARK A — only Clear now (no Calculate) */
      .map-actions{ display:flex; gap:12px; margin-top:10px }
      .map-btn{
        border:none; border-radius:12px; padding:10px 14px; font-weight:900; cursor:pointer;
        box-shadow:0 6px 14px rgba(0,0,0,.12);
      }
      .map-btn.ghost{ color:var(--text,#0c1230); background:var(--surface,#f3f6fb); border:1px solid var(--border,#dbe0ea); }

      .map-strip-2{ height:4px; border-radius:6px; margin:14px -14px 10px -14px; background:#244; opacity:.9 }
      .map-result{ display:flex; align-items:baseline; gap:8px; margin-top:6px; color:var(--text,#0c1230) }
      .map-val{ font-size:34px; font-weight:900 }
      .map-unit{ font-size:18px; font-weight:800; opacity:.95 }
      .map-pill{
        display:inline-block; margin-top:10px; padding:8px 14px; border-radius:999px;
        border:1px solid rgba(0,0,0,.15); font-weight:800; background:#e5e7eb; color:#0c1230;
      }

      .map-ref-title{ margin:16px 0 6px 0; font-weight:900 }
      .map-ref{ white-space:pre-line; line-height:1.35; color:var(--text,#0c1230) }

      /* ---------- Dark theme tweaks ---------- */
      :root[data-theme="dark"] .map-card{ background:#151921; border-color:#232a37 }
      :root[data-theme="dark"] .map-input{ background:#12151c; border-color:#232a37; color:#eef2ff }
      :root[data-theme="dark"] .map-chip{ background:#12151c; border-color:#232a37; color:#eef2ff }
      :root[data-theme="dark"] .map-btn.ghost{ background:#12151c; border:1px solid #232a37; color:#eef2ff }
    </style>

    <div class="map-wrap">
      <div class="map-card" id="mapCard">
        <div class="map-head">
          <h3 class="map-title">MAP Calculator</h3>
        </div>

        <div class="map-strip"></div>

        <div class="map-row">
          <div class="map-col">
            <div class="map-field">
              <div class="map-label">Systolic BP (SBP)</div>
              <input id="sbp" class="map-input" inputmode="numeric" placeholder="e.g., 120">
            </div>
          </div>
          <div class="map-col">
            <div class="map-field">
              <div class="map-label">Diastolic BP (DBP)</div>
              <input id="dbp" class="map-input" inputmode="numeric" placeholder="e.g., 70">
            </div>
          </div>
        </div>

        <div class="map-chips">
          ${[[80,50],[90,60],[110,70],[140,90],[160,100]].map(([s,d]) =>
            `<button class="map-chip" data-s="${s}" data-d="${d}">${s}/${d}</button>`
          ).join("")}
        </div>

        <!-- LANDMARK B — only Clear remains -->
        <div class="map-actions">
          <button id="btnClear" class="map-btn ghost">Clear</button>
        </div>

        <div class="map-strip-2" id="strip"></div>

        <div class="map-result">
          <div class="map-val" id="mapVal">—</div>
          <div class="map-unit">mmHg</div>
        </div>

        <div class="map-pill" id="mapStatus">—</div>

        <div class="map-ref-title">Reference (adult MAP, mmHg)</div>
        <div class="map-ref">• Too low: &lt; 60
• Borderline: 60–65
• Normal: 65–100
• High: &gt; 100</div>
      </div>
    </div>
  `;

  /* ===== JS ===== */
  const $ = s => mountEl.querySelector(s);
  const $$= s => [...mountEl.querySelectorAll(s)];

  const sbp     = $('#sbp');
  const dbp     = $('#dbp');
  const card    = $('#mapCard');
  const strip   = $('#strip');
  const val     = $('#mapVal');
  const status  = $('#mapStatus');

  // LANDMARK C — palettes per category for light/dark
  const COLORS = {
    light: {
      low:   {strip:'#E53935', card:'#FFEBEE', pillBg:'#E53935', pillFg:'#fff'},
      bord:  {strip:'#FB8C00', card:'#FFF3E0', pillBg:'#FFE0B2', pillFg:'#0c1230'},
      norm:  {strip:'#43A047', card:'#E8F5E9', pillBg:'#C8E6C9', pillFg:'#0c1230'},
      high:  {strip:'#E53935', card:'#FFEBEE', pillBg:'#E53935', pillFg:'#fff'}
    },
    dark: {
      low:   {strip:'#ef5350', card:'#3a1e1e', pillBg:'#ef5350', pillFg:'#fff'},
      bord:  {strip:'#ffa726', card:'#402915', pillBg:'#ffa726', pillFg:'#0c1230'},
      norm:  {strip:'#66bb6a', card:'#1b3b24', pillBg:'#66bb6a', pillFg:'#0c1230'},
      high:  {strip:'#ef5350', card:'#3a1e1e', pillBg:'#ef5350', pillFg:'#fff'}
    }
  };

  let lastKind = null; // LANDMARK D — remember last category for theme re-apply

  function isDark(){
    const m = document.documentElement.getAttribute('data-theme');
    if (m === 'dark') return true;
    if (m === 'light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  }
  function applyTheme(kind){
    const c = COLORS[isDark()?'dark':'light'][kind];
    card.style.backgroundColor = c.card;
    strip.style.backgroundColor = c.strip;
    status.style.backgroundColor = c.pillBg;
    status.style.color = c.pillFg;
    lastKind = kind;
  }

  const fmt = n => {
    const x = Math.round(n * 10) / 10;
    return (x % 1 === 0) ? String(x.toFixed(0)) : x.toFixed(1);
  };

  function compute(){
    const s = Number((sbp.value||'').replace(',','.'));
    const d = Number((dbp.value||'').replace(',','.'));
    if (!Number.isFinite(s) || !Number.isFinite(d) || s<=0 || d<=0){
      resetCard(); return;
    }
    const map = (s + 2*d) / 3;
    val.textContent = fmt(map);

    let kind, label, note;
    if (map < 60){
      kind = 'low';  label = 'Too low'; note='Critical: risk of organ ischemia';
    } else if (map <= 65){
      kind = 'bord'; label = 'Borderline'; note='Minimum threshold — monitor closely';
    } else if (map <= 100){
      kind = 'norm'; label = 'Normal'; note='Adequate perfusion';
    } else {
      kind = 'high'; label = 'High'; note='Possible hypertension or excessive pressure';
    }
    status.textContent = `${label} — ${note}`;
    applyTheme(kind);
  }

  function resetCard(){
    val.textContent = '—';
    status.textContent = '—';
    lastKind = null;
    // baseline backgrounds follow theme
    if (isDark()){
      card.style.backgroundColor = '#151921';
      strip.style.backgroundColor = '#1f4c73';
    } else {
      card.style.backgroundColor = '#fff';
      strip.style.backgroundColor = '#244';
    }
    status.style.backgroundColor = '#e5e7eb';
    status.style.color = '#0c1230';
  }

  // Chips set sample values and compute instantly
  $$('.map-chip').forEach(ch=>{
    ch.addEventListener('click', ()=>{
      sbp.value = ch.dataset.s;
      dbp.value = ch.dataset.d;
      compute();
    });
  });

  // LANDMARK E — removed Calculate; compute on input
  sbp.addEventListener('input', compute);
  dbp.addEventListener('input', compute);

  $('#btnClear').addEventListener('click', ()=>{
    sbp.value = ''; dbp.value=''; resetCard(); sbp.focus();
  });

  // LANDMARK F — react to theme changes (Auto or manual toggle)
  // 1) CSS prefers-color-scheme changes (system switch)
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener?.('change', () => {
    if (lastKind) applyTheme(lastKind); else resetCard();
  });
  // 2) Your app’s data-theme attribute changes (Theme select)
  const obs = new MutationObserver(() => {
    if (lastKind) applyTheme(lastKind); else resetCard();
  });
  obs.observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] });

  // init
  resetCard();
}
