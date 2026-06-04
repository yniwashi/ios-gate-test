// tools/westley.js
export async function run(mountEl) {
  mountEl.innerHTML = `
    <style>
      /* ========= Westley Score (scoped) ========= */
      .wes-wrap{ padding:12px }
      .wes-card{
        background:var(--surface,#fff);
        border:1px solid var(--border,#e7ecf3);
        border-radius:14px; padding:14px;
        box-shadow:0 8px 18px rgba(0,0,0,.12);
      }

      .wes-head{ display:flex; align-items:center; justify-content:space-between }
      .wes-title{ margin:0; font-weight:900; font-size:16px; color:var(--text,#0c1230) }

      .wes-strip{ height:6px; border-radius:6px; margin:10px 0 14px 0;
        background:linear-gradient(90deg,#0ea5e9,#6366f1);
      }

      .wes-section{ margin-bottom:12px }

      /* Section titles */
      .wes-label{
        margin:0 0 6px 2px;
        font-size:14px;
        font-weight:900;
        letter-spacing:.08em;
        color:#6e7b91;
        text-transform:uppercase;
      }

      .wes-group{ display:flex; flex-wrap:wrap; gap:8px }

      /* Chips: slightly bigger + better selected colors for light/dark */
      .wes-chip{
        border-radius:14px; padding:12px 14px; cursor:pointer; user-select:none;
        background:var(--surface,#f6f8fd); border:1px solid var(--border,#e7ecf3);
        color:var(--text,#0c1230); font-weight:800; font-size:14px;
      }
      .wes-chip small{ display:block; font-weight:600; color:#6e7b91; font-size:12px }
      /* Selected — neutral bluish that works across themes */
      .wes-chip[data-active="true"]{
        background:#dbe7ff; border-color:#4a80ff; color:#0c1230;
      }

      /* Result block */
      .wes-result{
        margin-top:10px; padding:12px; border-radius:12px;
        background:var(--surface,#f6f8fd); border:1px solid var(--border,#e7ecf3);
      }
      .wes-scoreline{ display:flex; align-items:center; gap:10px }
      .wes-score{ font-size:42px; line-height:1; font-weight:900; color:var(--text,#0c1230) }
      .wes-msg{ font-weight:900; color:var(--text,#0c1230) }

      /* Description below score — bigger per request */
      .wes-sub{
        font-size:14px;              /* was 11 */
        line-height:1.45;
        margin-top:8px;
        color:var(--text,#0c1230);
      }

      /* Light severity backgrounds */
      .wes-result[data-level="mild"]     { background:#eef8ff; border-color:#cfe8ff }
      .wes-result[data-level="moderate"] { background:#fff4e5; border-color:#ffd9a8 }
      .wes-result[data-level="severe"]   { background:#ffe5e5; border-color:#ffb3b3 }

      /* ---------- Dark tweaks ---------- */
      :root[data-theme="dark"] .wes-card{ background:#151921; border-color:#232a37 }
      :root[data-theme="dark"] .wes-chip,
      :root[data-theme="dark"] .wes-result{ background:#12151c; border-color:#232a37; color:#eef2ff }
      /* Dark selected chip */
      :root[data-theme="dark"] .wes-chip[data-active="true"]{
        background:#2a3654; border-color:#6f8dff; color:#eaf0ff;
      }

      :root[data-theme="dark"] .wes-result[data-level="mild"]    { background:#132235; border-color:#1f3a57 }
      :root[data-theme="dark"] .wes-result[data-level="moderate"]{ background:#3b2a14; border-color:#6b4a1b }
      :root[data-theme="dark"] .wes-result[data-level="severe"]  { background:#3a1e1e; border-color:#6b2a2a }

      /* Auto + system dark support */
      @media (prefers-color-scheme: dark){
        :root[data-theme="auto"] .wes-card{ background:#151921; border-color:#232a37 }
        :root[data-theme="auto"] .wes-chip,
        :root[data-theme="auto"] .wes-result{ background:#12151c; border-color:#232a37; color:#eef2ff }
        :root[data-theme="auto"] .wes-chip[data-active="true"]{
          background:#2a3654; border-color:#6f8dff; color:#eaf0ff;
        }
        :root[data-theme="auto"] .wes-result[data-level="mild"]    { background:#132235; border-color:#1f3a57 }
        :root[data-theme="auto"] .wes-result[data-level="moderate"]{ background:#3b2a14; border-color:#6b4a1b }
        :root[data-theme="auto"] .wes-result[data-level="severe"]  { background:#3a1e1e; border-color:#6b2a2a }
      }
    </style>

    <div class="wes-wrap">
      <div class="wes-card">
        <div class="wes-head">
          <h3 class="wes-title">Westley Score (Croup)</h3>
        </div>

        <div class="wes-strip"></div>

        <!-- Inspiratory Stridor -->
        <section class="wes-section">
          <p class="wes-label">INSPIRATORY STRIDOR</p>
          <div id="grpInspiratory" class="wes-group">
            <button class="wes-chip" data-score="0">None</button>
            <button class="wes-chip" data-score="1">When agitated</button>
            <button class="wes-chip" data-score="2">At rest</button>
          </div>
        </section>

        <!-- Intercostal Retractions -->
        <section class="wes-section">
          <p class="wes-label">INTERCOSTAL RETRACTIONS</p>
          <div id="grpIntercostal" class="wes-group">
            <button class="wes-chip" data-score="0">None</button>
            <button class="wes-chip" data-score="1">Mild</button>
            <button class="wes-chip" data-score="2">Moderate</button>
            <button class="wes-chip" data-score="3">Severe</button>
          </div>
        </section>

        <!-- Air Entry -->
        <section class="wes-section">
          <p class="wes-label">AIR ENTRY</p>
          <div id="grpAir" class="wes-group">
            <button class="wes-chip" data-score="0">Normal</button>
            <button class="wes-chip" data-score="1">Mildly decreased</button>
            <button class="wes-chip" data-score="2">Markedly decreased</button>
          </div>
        </section>

        <!-- Cyanosis -->
        <section class="wes-section">
          <p class="wes-label">CYANOSIS</p>
          <div id="grpCyanosis" class="wes-group">
            <button class="wes-chip" data-score="0">None</button>
            <button class="wes-chip" data-score="4">With agitation/activity</button>
            <button class="wes-chip" data-score="5">At rest</button>
          </div>
        </section>

        <!-- Level of Consciousness -->
        <section class="wes-section">
          <p class="wes-label">LEVEL OF CONSCIOUSNESS</p>
          <div id="grpLoc" class="wes-group">
            <button class="wes-chip" data-score="0">Awake</button>
            <button class="wes-chip" data-score="5">Altered</button>
          </div>
        </section>

        <!-- Result -->
        <div id="result" class="wes-result" data-level="mild" aria-live="polite">
          <div class="wes-scoreline">
            <div id="score" class="wes-score">-</div>
            <div id="msg" class="wes-msg">Pick one option in each group.</div>
          </div>
          <div id="sub" class="wes-sub"></div>
        </div>
      </div>
    </div>
  `;

  /* ===== Helpers ===== */
  const $  = sel => mountEl.querySelector(sel);

  // Groups
  const grpInspiratory = $('#grpInspiratory');
  const grpIntercostal = $('#grpIntercostal');
  const grpAir        = $('#grpAir');
  const grpCyanosis   = $('#grpCyanosis');
  const grpLoc        = $('#grpLoc');

  // Result elements
  const resultBox = $('#result');
  const scoreEl   = $('#score');
  const msgEl     = $('#msg');
  const subEl     = $('#sub');

  function pick(groupEl, evt){
    const chip = evt.target.closest('.wes-chip');
    if (!chip || !groupEl.contains(chip)) return false;
    groupEl.querySelectorAll('.wes-chip').forEach(b => b.dataset.active = 'false');
    chip.dataset.active = 'true';
    return true;
  }

  function getActiveScore(groupEl){
    const a = groupEl.querySelector('.wes-chip[data-active="true"]');
    return a ? Number(a.dataset.score) : null;
  }

  function compute(){
    const i = getActiveScore(grpInspiratory);
    const r = getActiveScore(grpIntercostal);
    const a = getActiveScore(grpAir);
    const c = getActiveScore(grpCyanosis);
    const l = getActiveScore(grpLoc);

    if ([i,r,a,c,l].some(v => v == null)){
      scoreEl.textContent = '-';
      msgEl.textContent   = 'Pick one option in each group.';
      subEl.textContent   = '';
      resultBox.dataset.level = 'mild';
      return;
    }

    const westley = i + r + a + c + l; // Kotlin parity
    scoreEl.textContent = String(westley);

    if (westley <= 2){
      msgEl.textContent = `Westley Score ${westley}`;
      subEl.textContent = 'Patient has mild Croup';
      resultBox.dataset.level = 'mild';
    } else if (westley >= 3 && westley <= 7){
      msgEl.textContent = `Westley Score ${westley}`;
      subEl.textContent = 'Patient has moderate Croup';
      resultBox.dataset.level = 'moderate';
    } else {
      msgEl.textContent = `Westley Score ${westley}`;
      subEl.textContent = 'Patient has severe Croup';
      resultBox.dataset.level = 'severe';
    }
  }

  // Wire up (instant updates)
  grpInspiratory.addEventListener('click', e => { if (pick(grpInspiratory, e)) compute(); });
  grpIntercostal.addEventListener('click', e => { if (pick(grpIntercostal, e)) compute(); });
  grpAir       .addEventListener('click', e => { if (pick(grpAir,        e)) compute(); });
  grpCyanosis  .addEventListener('click', e => { if (pick(grpCyanosis,   e)) compute(); });
  grpLoc       .addEventListener('click', e => { if (pick(grpLoc,        e)) compute(); });

  // init
  scoreEl.textContent = '-';
  msgEl.textContent   = 'Pick one option in each group.';
  subEl.textContent   = '';
  resultBox.dataset.level = 'mild';
}
