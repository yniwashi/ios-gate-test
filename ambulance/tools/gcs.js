// /tools/gcs.js
// CHANGELOG (2026-01-15):
// - Preserve full URL when syncing hash state.
// GCS with horizontal "chips" per category — bigger targets, clear selected color,
// and adjustable spacing. Tweak the CSS variables below to fine-tune the look.

export async function run(root){
  root.innerHTML = "";

  // =========================
  // 🎛 TUNABLE DESIGN TOKENS
  // =========================
  // Adjust these defaults right here (live development: your index.html's Date.now cache-buster will pick it up).
  const CSS_TOKENS = `
    :root {
      /* Section spacing (space between Eye/Verbal/Motor blocks) */
      --sec-gap: 18px;                 /* try 14–24px */

      /* Row spacing (space between chips in a row) */
      --row-gap: 8px;                  /* try 6–12px */

      /* Chip size and shape */
      --chip-pad-y: 10px;              /* vertical padding inside a chip (8–12px) */
      --chip-pad-x: 12px;              /* horizontal padding (10–16px) */
      --chip-font: 14px;               /* base font size of chip text (13–16px) */
      --chip-radius: 999px;            /* 8px for more squarish, 999px for pill */

      /* Number badge size (the left number inside a chip) */
      --chip-num-size: 16px;           /* (13–16px) */

      /* Score card sizes */
      --score-pad-y: 8px;
      --score-pad-x: 12px;
      --score-min-h: 40px;
      --score-val: 20px;               /* “E4, V3, M3” font size */
      --score-sum: 20px;               /* “(Total 10)” font size */

      /* Selected chip colors */
      --chip-sel-start: #2f81f7;       /* start color for selected chip background */
      --chip-sel-end:   #1f6fff;       /* end color for selected chip background */
      --chip-sel-text:  #ffffff;       /* selected chip text color */

      /* Unselected chip */
      --chip-border: var(--border);
      --chip-bg:     var(--surface-2);
      --chip-text:   var(--text);
    }
  `;

  const style = document.createElement("style");
  style.textContent = `
  ${CSS_TOKENS}

  .gcs-wrap{padding:12px 12px 16px;max-width:760px;margin:0 auto;-webkit-text-size-adjust:100%}
  .gcs-title{margin:0 0 8px;font-size:18px;text-align:center;font-weight:900;letter-spacing:.2px}

  /* Score card (full background color) */
  .gcs-score{
    border-radius:12px;
    padding:var(--score-pad-y) var(--score-pad-x);
    display:flex; align-items:center; justify-content:center; gap:10px;
    color:#fff; min-height:var(--score-min-h); text-align:center;
    background:linear-gradient(180deg,#16a34a,#0e7a34); /* default -> will be replaced by state */
  }
  .gcs-score.neutral{ background:linear-gradient(180deg,#64748b,#475569) }
  .gcs-score.ok     { background:linear-gradient(180deg,#16a34a,#0e7a34) }
  .gcs-score.warn   { background:linear-gradient(180deg,#f59e0b,#c67b06) }
  .gcs-score.bad    { background:linear-gradient(180deg,#ef4444,#c03030) }

  .gcs-score .val{font-size:var(--score-val);font-weight:900}
  .gcs-score .sum{font-size:var(--score-sum);font-weight:700;opacity:.95}

 /* Section header + spacing + separator */
.gcs-sec {
  margin-top: var(--sec-gap);
  padding-bottom: 12px;               /* space below each section */
  border-bottom: 1px solid var(--border);
}
.gcs-sec:first-of-type {
  margin-top: 12px;
}
.gcs-sec:last-of-type {
  border-bottom: none;                /* no line after the last section */
}
.gcs-sec .hd {
  font-size:16px;
  font-weight:800;
  color:var(--muted);
  margin:0 0 8px 4px;
}

  /* Chip row */
  .chip-row{
    display:flex; flex-wrap:wrap; gap:var(--row-gap); align-items:stretch;
  }

  /* Chip (label around a hidden radio) */
  .chip{
    position:relative; display:inline-flex; align-items:center; gap:8px;
    padding:var(--chip-pad-y) var(--chip-pad-x);
    border:1px solid var(--chip-border);
    border-radius:var(--chip-radius);
    background:var(--chip-bg);
    color:var(--chip-text);
    cursor:pointer; line-height:1.1; font-weight:800; font-size:var(--chip-font);
    transition: transform .15s ease, box-shadow .15s ease, background .15s ease, border-color .15s ease, color .15s ease;
    min-height: calc(var(--chip-pad-y)*2 + 20px); /* keeps a nice tap area */
  }
  .chip:active{ transform: translateY(1px) scale(.99) }

  .chip input{ position:absolute; opacity:0; pointer-events:none }

  .chip .kv{ display:inline-flex; align-items:baseline; gap:8px; min-width:0 }
  .chip .n{ font-size:var(--chip-num-size); font-weight:900; flex:none }
  .chip .t{ white-space:nowrap }                 /* don’t wrap unless very narrow */
  @media (max-width:400px){ .chip .t{ white-space:normal } } /* allow wrap on small screens */

  /* Selected state */
  .chip.selected{
    background:linear-gradient(180deg,var(--chip-sel-start),var(--chip-sel-end));
    border-color: var(--chip-sel-end);
    color: var(--chip-sel-text);
    box-shadow:0 6px 16px rgba(0,0,0,.22);
  }
  `;
  root.appendChild(style);

  // Markup
  root.insertAdjacentHTML("afterbegin", `
    <div class="gcs-wrap">
      <h2 class="gcs-title">Glasgow Coma Scale</h2>

      <div id="scoreCard" class="gcs-score neutral">
        <div class="val" id="scoreVal">E—, V—, M—</div>
        <div class="sum" id="scoreSum"></div>
      </div>

      <section class="gcs-sec" aria-labelledby="hd-e">
        <h3 id="hd-e" class="hd">Eye (E)</h3>
        <div id="rowE" class="chip-row" role="radiogroup" aria-label="Eye response"></div>
      </section>

      <section class="gcs-sec" aria-labelledby="hd-v">
        <h3 id="hd-v" class="hd">Verbal (V)</h3>
        <div id="rowV" class="chip-row" role="radiogroup" aria-label="Verbal response"></div>
      </section>

      <section class="gcs-sec" aria-labelledby="hd-m">
        <h3 id="hd-m" class="hd">Motor (M)</h3>
        <div id="rowM" class="chip-row" role="radiogroup" aria-label="Motor response"></div>
      </section>
    </div>
  `);

  // Options (number + label)
  const E = [[4,"Spontaneous"],[3,"To speech"],[2,"To pain"],[1,"None"]];
  const V = [[5,"Oriented"],[4,"Confused"],[3,"Inappropriate"],[2,"Incomprehensible"],[1,"None"]];
  const M = [[6,"Obeys"],[5,"Localizes"],[4,"Withdraws"],[3,"Flexion"],[2,"Extension"],[1,"None"]];

  // Render a chip row
  function renderRow(sel, name, items){
    const row = root.querySelector(sel);
    row.innerHTML = "";
    items.forEach(([val, text])=>{
      const id = `${name}-${val}`;
      const el = document.createElement("label");
      el.className = "chip";
      el.setAttribute("for", id);
      el.innerHTML = `
        <input type="radio" id="${id}" name="${name}" value="${val}">
        <span class="kv"><span class="n">(${val})</span><span class="t">${text}</span></span>
      `;
      row.appendChild(el);
    });
  }
  renderRow("#rowE","e",E);
  renderRow("#rowV","v",V);
  renderRow("#rowM","m",M);

  // Score helpers
  const scoreCard = root.querySelector("#scoreCard");
  const scoreVal  = root.querySelector("#scoreVal");
  const scoreSum  = root.querySelector("#scoreSum");

  function getSelected(name){
    const el = root.querySelector(`input[name="${name}"]:checked`);
    return el ? Number(el.value) : null;
  }
  function setCardClass(cls){
    scoreCard.classList.remove("ok","warn","bad","neutral");
    scoreCard.classList.add(cls);
  }
  function classify(total){
    if (total == null){ setCardClass("neutral"); return; }
    if (total <= 8) setCardClass("bad");
    else if (total <= 12) setCardClass("warn");
    else setCardClass("ok");
  }
  function syncSelectedClass(){
    ["e","v","m"].forEach(name=>{
      root.querySelectorAll(`input[name="${name}"]`).forEach(inp=>{
        const chip = inp.closest(".chip");
        if (!chip) return;
        chip.classList.toggle("selected", !!inp.checked);
      });
    });
  }
  function updateScore(pushHash=true){
    syncSelectedClass();
    const e = getSelected("e");
    const v = getSelected("v");
    const m = getSelected("m");

    // Main readout — larger and clear
    scoreVal.textContent = `E${e!=null?e:"—"}, V${v!=null?v:"—"}, M${m!=null?m:"—"}`;
    const ready = e!=null && v!=null && m!=null;
    scoreSum.textContent = ready ? `(Total ${e+v+m})` : "";
    classify(ready ? (e+v+m) : null);

    if (pushHash){
      const p = new URLSearchParams((location.hash||"").replace(/^#/,""));
      p.set("tool","gcs");
      if (e!=null) p.set("e", String(e)); else p.delete("e");
      if (v!=null) p.set("v", String(v)); else p.delete("v");
      if (m!=null) p.set("m", String(m)); else p.delete("m");
      const hash = p.toString();
      const url = `${location.pathname}${location.search}${hash ? `#${hash}` : ""}`;
      history.replaceState(history.state, "", url);
    }
  }

  // Wire events
  root.querySelectorAll('#rowE input,#rowV input,#rowM input').forEach(inp=>{
    inp.addEventListener("change", ()=>{
      if (navigator.vibrate) { try{ navigator.vibrate(6); }catch(_){} }
      updateScore(true);
    });
  });

  // Restore from hash
  const h = new URLSearchParams((location.hash||"").replace(/^#/,""));
  [["e",E],["v",V],["m",M]].forEach(([name])=>{
    const v = h.get(name);
    if (!v) return;
    const opt = root.querySelector(`input[name="${name}"][value="${v}"]`);
    if (opt){ opt.checked = true; }
  });
  updateScore(false);
}
