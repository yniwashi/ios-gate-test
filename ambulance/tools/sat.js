// tools/sat.js
export async function run(mountEl) {
  mountEl.innerHTML = `
    <style>
      /* ========= SAT Score (scoped) ========= */
      .sat-wrap{ padding:12px }
      .sat-card{
        background:var(--surface,#fff);
        border:1px solid var(--border,#e7ecf3);
        border-radius:14px; padding:14px;
        box-shadow:0 8px 18px rgba(0,0,0,.12);
      }

      .sat-head{ display:flex; align-items:center; justify-content:space-between }
      .sat-title{ margin:0; font-weight:900; font-size:16px; color:var(--text,#0c1230) }

      .sat-strip{ height:6px; border-radius:6px; margin:10px 0 14px 0;
        background:linear-gradient(90deg,#0ea5e9,#6366f1);
      }

      .sat-section{ margin-bottom:12px }

     /* LANDMARK SIZE - bigger section titles */
.sat-label{
  margin:0 0 6px 2px;
  font-size:14px;           /* was 12 */
  font-weight:900;
  letter-spacing:.08em;     /* slightly less wide */
  color:#6e7b91;
  text-transform:uppercase; /* keeps the caps look */
}

      .sat-group{ display:flex; flex-wrap:wrap; gap:8px }

      /* LANDMARK A - option "chips" behave like radios */
      .sat-chip{
        border-radius:12px; padding:10px 12px; cursor:pointer; user-select:none;
        background:var(--surface,#f6f8fd); border:1px solid var(--border,#e7ecf3);
        color:var(--text,#0c1230); font-weight:800; font-size:13px;
      }
      .sat-chip small{ display:block; font-weight:600; color:#6e7b91; font-size:11px }
      .sat-chip[data-active="true"]{
        background:#e0e7ff; border-color:#6366f1; color:#0b1a3a;
      }

      .sat-actions{ display:flex; gap:10px; margin:6px 0 4px }
      .sat-btn{
        border:none; border-radius:12px; padding:10px 14px; font-weight:900; cursor:pointer;
        box-shadow:0 6px 14px rgba(0,0,0,.12); background:var(--surface,#f3f6fb);
        border:1px solid var(--border,#dbe0ea); color:var(--text,#0c1230);
      }

      /* LANDMARK B - result block */
      .sat-result{
        margin-top:10px; padding:12px; border-radius:12px;
        background:var(--surface,#f6f8fd); border:1px solid var(--border,#e7ecf3);
      }

/* LANDMARK DM1 - keep result text high-contrast in both themes */
.sat-score, .sat-msg { color: var(--text,#0c1230); }
:root[data-theme="dark"] .sat-score,
:root[data-theme="dark"] .sat-msg { color:#eef2ff; }

/* Dark-mode result backgrounds with better contrast */
:root[data-theme="dark"] .sat-result[data-level="warn"]{ background:#4a351b; border-color:#9a6b2a; }
:root[data-theme="dark"] .sat-result[data-level="ok"]  { background:#12324d; border-color:#1f4c73; }

/* LANDMARK ALIGN — center the big numeral with the message */
.sat-scoreline{ display:flex; align-items:center; gap:10px }

      .sat-score{ font-size:42px; line-height:1; font-weight:900 }
      .sat-msg{ font-weight:800 }
/* LANDMARK NOTE — smaller note text */
#sub{
  font-size:11px;
  line-height:1.35;
  opacity:.85;
}


      /* colors by risk */
      .sat-result[data-level="warn"]{ background:#fff4e5; border-color:#ffd9a8 }
      .sat-result[data-level="ok"]{ background:#eef8ff; border-color:#cfe8ff }

      /* ---------- Dark tweaks ---------- */
      :root[data-theme="dark"] .sat-card{ background:#151921; border-color:#232a37 }
      :root[data-theme="dark"] .sat-chip,
      :root[data-theme="dark"] .sat-result,
      :root[data-theme="dark"] .sat-btn{ background:#12151c; border-color:#232a37; color:#eef2ff }
      :root[data-theme="dark"] .sat-chip[data-active="true"]{ background:#26376b; border-color:#3f5bd7; color:#e6edff }
      :root[data-theme="dark"] .sat-result[data-level="warn"]{ background:#3b2a14; border-color:#6b4a1b }
      :root[data-theme="dark"] .sat-result[data-level="ok"]{ background:#132235; border-color:#1f3a57 }
    /* LANDMARK DM2 - support Auto + system dark as well */
@media (prefers-color-scheme: dark){
  :root[data-theme="auto"] .sat-card{
    background:#151921; border-color:#232a37;
  }
  :root[data-theme="auto"] .sat-chip,
  :root[data-theme="auto"] .sat-result,
  :root[data-theme="auto"] .sat-btn{
    background:#12151c; border-color:#232a37; color:#eef2ff;
  }
  :root[data-theme="auto"] .sat-chip[data-active="true"]{
    background:#26376b; border-color:#3f5bd7; color:#e6edff;
  }
  /* high-contrast result backgrounds in dark */
  :root[data-theme="auto"] .sat-result[data-level="warn"]{ background:#3b2a14; border-color:#6b4a1b; }
  :root[data-theme="auto"] .sat-result[data-level="ok"]  { background:#132235; border-color:#1f3a57; }

  /* keep all result text bright in dark */
  :root[data-theme="auto"] .sat-score,
  :root[data-theme="auto"] .sat-msg,
  :root[data-theme="auto"] .sat-sub{ color:#eef2ff; }
}

/* Ensure subline isn’t dim in any theme */
.sat-sub{ color: var(--text,#0c1230); }
:root[data-theme="dark"] .sat-sub{ color:#eef2ff; }


</style>

    <div class="sat-wrap">
      <div class="sat-card">
        <div class="sat-head">
          <h3 class="sat-title">SAT Score</h3>
        </div>

        <div class="sat-strip"></div>

        <!-- LANDMARK 1 - Response group -->
        <section class="sat-section">
          <p class="sat-label">RESPONSE</p>
          <div id="grpResponse" class="sat-group">
            <button class="sat-chip" data-score="3">
              Combative<br><small>violent / out of control</small>
            </button>
            <button class="sat-chip" data-score="2">
              Very anxious<br><small>and restless</small>
            </button>
            <button class="sat-chip" data-score="1">
              Anxious<br><small>and restless</small>
            </button>
            <button class="sat-chip" data-score="0">
              Normal response<br><small>speaks in normal tone</small>
            </button>
            <button class="sat-chip" data-score="-1">
              Loudly to name<br><small>needs raised voice</small>
            </button>
            <button class="sat-chip" data-score="-2">
              To pain<br><small>physical stimulation</small>
            </button>
            <button class="sat-chip" data-score="-3">
              Unresponsive
            </button>
          </div>
        </section>

        <!-- LANDMARK 2 - Speech group -->
        <section class="sat-section">
          <p class="sat-label">SPEECH</p>
          <div id="grpSpeech" class="sat-group">
            <button class="sat-chip" data-score="3">
              Continual outbursts
            </button>
            <button class="sat-chip" data-score="2">
              Loud outbursts
            </button>
            <button class="sat-chip" data-score="1">
              Talkative<br><small>normal/talkative</small>
            </button>
            <button class="sat-chip" data-score="0">
              Speaks normally
            </button>
            <button class="sat-chip" data-score="-1">
              Slurred / slowed
            </button>
            <button class="sat-chip" data-score="-2">
              Few words
            </button>
            <button class="sat-chip" data-score="-3">
              No speech
            </button>
          </div>
        </section>

        <div class="sat-actions">
          <button id="btnClear" class="sat-btn">Clear</button>
        </div>

        <!-- LANDMARK 3 - Result -->
        <div id="result" class="sat-result" data-level="ok" aria-live="polite">
          <div class="sat-scoreline">
            <div id="score" class="sat-score">-</div>
            <div id="msg" class="sat-msg">Pick one option in each group.</div>
          </div>
          <div id="sub" class="sat-sub" style="margin-top:6px;opacity:.9"></div>
        </div>
      </div>
    </div>
  `;

  /* ===== Helpers ===== */
  const $ = sel => mountEl.querySelector(sel);
  const $$ = sel => [...mountEl.querySelectorAll(sel)];

  const grpResponse = $('#grpResponse');
  const grpSpeech = $('#grpSpeech');
  const resultBox = $('#result');
  const scoreEl = $('#score');
  const msgEl = $('#msg');
  const subEl = $('#sub');

  // LANDMARK TAP — handle clicks on the chip *or* its children (e.g., <small>)
  function pick(groupEl, evt) {
    const chip = evt.target.closest('.sat-chip');
    if (!chip || !groupEl.contains(chip)) return false;
    groupEl.querySelectorAll('.sat-chip').forEach(b => b.dataset.active = 'false');
    chip.dataset.active = 'true';
    return true;
  }


  function getActiveScore(groupEl) {
    const a = groupEl.querySelector('.sat-chip[data-active="true"]');
    return a ? Number(a.dataset.score) : null;
  }

  function compute() {
    const r = getActiveScore(grpResponse);
    const s = getActiveScore(grpSpeech);
    if (r == null || s == null) {
      scoreEl.textContent = '-';
      msgEl.textContent = 'Pick one option in each group.';
      subEl.textContent = '';
      resultBox.dataset.level = 'ok';
      return;
    }

    // Kotlin rule: SAT = max(responseScore, speechScore)
    const sat = Math.max(r, s);
    scoreEl.textContent = String(sat);

    if (sat >= 2) {
      msgEl.textContent = `A SAT Score of +${sat} is a good predictor of the need for sedation.`;
      subEl.textContent = 'Administer appropriate sedation and ensure that you document the SAT score on your EPCR both prior to and post sedation.';
      resultBox.dataset.level = 'warn';
    } else {
      msgEl.textContent = `SAT score is (${sat}).`;
      subEl.textContent = '';
      resultBox.dataset.level = 'ok';
    }

  }

  function clearAll() {
    $$('.sat-chip').forEach(b => b.dataset.active = 'false');
    scoreEl.textContent = '-';
    msgEl.textContent = 'Pick one option in each group.';
    subEl.textContent = '';
    resultBox.dataset.level = 'ok';
  }

  // Wire up (instant updates)
  grpResponse.addEventListener('click', e => {
    if (pick(grpResponse, e)) compute();
  });
  grpSpeech.addEventListener('click', e => {
    if (pick(grpSpeech, e)) compute();
  });



  $('#btnClear').addEventListener('click', clearAll);

  // init
  clearAll();
}
