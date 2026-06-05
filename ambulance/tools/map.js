// /ambulance/tools/map.js
// CHANGELOG (2026-06-05):
// - Match page accent color and description to the calculator source screen.
// - Replace the legacy MAP tool with the Android formula, validation, statuses, and dark-mode UI.

export async function run(root){
  const v=encodeURIComponent(window.__AMBULANCE_ASSET_VERSION||"current");
  const {calculatorCss,formatTrimmed,installCalculatorKeyboardDismiss,wireDecimalInputs}=await import(`../calculator_common.js?ver=${v}`);
  root.innerHTML=`<style>${calculatorCss}</style><div class="calc-page" style="--calc-accent:#2196F3;--calc-accent-dark:#1E78C2"><div class="calc-heading"><h2>MAP</h2><p>Mean arterial pressure calculator.</p></div><div class="calc-stack">
  <section class="calc-card"><div class="calc-row"><label class="calc-field"><span>Systolic BP</span><span class="calc-input-wrap"><input id="mapS" class="calc-input" data-decimal inputmode="decimal"><b class="calc-suffix">mmHg</b></span></label><label class="calc-field"><span>Diastolic BP</span><span class="calc-input-wrap"><input id="mapD" class="calc-input" data-decimal inputmode="decimal"><b class="calc-suffix">mmHg</b></span></label></div><button id="mapGo" class="calc-button">Calculate</button></section>
  <section class="calc-result" id="mapOut"><h3>Result</h3><p class="calc-muted">Enter blood pressure values, then tap Calculate.</p></section></div></div>`;
  installCalculatorKeyboardDismiss(root);wireDecimalInputs(root);
  root.querySelector("#mapGo").onclick=()=>{document.activeElement?.blur();const s=Number(root.querySelector("#mapS").value),d=Number(root.querySelector("#mapD").value),out=root.querySelector("#mapOut");
    if(!(s>0)||!(d>0)){out.innerHTML=`<h3>Result</h3><p class="calc-error">Please enter valid positive values.</p>`;return;}
    if(d>=s){out.innerHTML=`<h3>Result</h3><p class="calc-error">Diastolic pressure must be lower than systolic pressure.</p>`;return;}
    const map=(s+2*d)/3;const status=map<60?"Low":map<=65?"Borderline":map<=100?"Normal":"High";
    out.innerHTML=`<h3>Result</h3><div class="calc-result-main">${formatTrimmed(map,1)} mmHg</div><div class="calc-result-secondary">${status}</div><p>MAP = (SBP + 2 x DBP) / 3\n(${s} + 2 x ${d}) / 3 = ${formatTrimmed(map,1)} mmHg</p>`;
  };
}
