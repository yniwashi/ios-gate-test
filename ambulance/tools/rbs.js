// /ambulance/tools/rbs.js
// CHANGELOG (2026-06-05):
// - Replace the legacy RBS converter with Android validation, ranges, and dark-mode UI.

export async function run(root){
  const v=encodeURIComponent(window.__AMBULANCE_ASSET_VERSION||"current");
  const {calculatorCss,formatTrimmed,installCalculatorKeyboardDismiss,wireDecimalInputs}=await import(`../calculator_common.js?ver=${v}`);
  root.innerHTML=`<style>${calculatorCss}</style><div class="calc-page" style="--calc-accent:#B59A00"><div class="calc-heading"><h2>RBS Converter</h2><p>Convert blood glucose from mg/dL to mmol/L.</p></div><div class="calc-stack">
  <section class="calc-card"><label class="calc-field"><span>Random blood sugar</span><span class="calc-input-wrap"><input id="rbsValue" class="calc-input" data-decimal inputmode="decimal"><b class="calc-suffix">mg/dL</b></span></label><button id="rbsGo" class="calc-button">Convert</button></section>
  <section class="calc-result" id="rbsOut"><h3>Result</h3><p class="calc-muted">Enter a glucose value, then tap Convert.</p></section></div></div>`;
  installCalculatorKeyboardDismiss(root);wireDecimalInputs(root);
  root.querySelector("#rbsGo").onclick=()=>{document.activeElement?.blur();const mg=Number(root.querySelector("#rbsValue").value),out=root.querySelector("#rbsOut");
    if(!(mg>0)){out.innerHTML=`<h3>Result</h3><p class="calc-error">Please enter a valid positive value.</p>`;return;}
    const mmol=mg/18,status=mg<70?"Hypoglycemia":mg<=120?"Normal":"Hyperglycemia";
    out.innerHTML=`<h3>Result</h3><div class="calc-result-main">${mmol.toFixed(1)} mmol/L</div><div class="calc-result-secondary">${status}</div><p>${formatTrimmed(mg,1)} mg/dL / 18 = ${mmol.toFixed(1)} mmol/L</p>`;
  };
}
