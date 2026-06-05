// /ambulance/tools/proportion.js
// CHANGELOG (2026-06-05):
// - Port the Android cross-multiplication Proportion calculator.

export async function run(root){
  const version=encodeURIComponent(window.__AMBULANCE_ASSET_VERSION||"current");
  const {calculatorCss,formatTrimmed,installCalculatorKeyboardDismiss,wireDecimalInputs}=await import(`../calculator_common.js?ver=${version}`);
  root.innerHTML=`<style>${calculatorCss}</style><div class="calc-page" style="--calc-accent:#3F51B5">
    <div class="calc-heading"><h2>Proportion</h2><p>Solve proportional values using A : B = C : X.</p></div>
    <div class="calc-stack"><section class="calc-card calc-formula"><h3>Formula</h3><strong>A : B = C : X</strong><span>X = (C x B) / A</span></section>
    <section class="calc-card"><div class="calc-row">
      <label class="calc-field"><span>A - Known 1</span><span class="calc-input-wrap"><input id="propA" class="calc-input" data-decimal inputmode="decimal"></span></label>
      <label class="calc-field"><span>B - Known 2</span><span class="calc-input-wrap"><input id="propB" class="calc-input" data-decimal inputmode="decimal"></span></label>
      <label class="calc-field"><span>C - Desired</span><span class="calc-input-wrap"><input id="propC" class="calc-input" data-decimal inputmode="decimal"></span></label>
      <div class="calc-field"><span>Result</span><div class="calc-input-wrap" style="justify-content:center;color:#3F51B5;font-size:22px;font-weight:950">X ?</div></div>
    </div><button class="calc-button" id="propCalculate">Calculate X</button></section>
    <section class="calc-result" id="propResult"><h3>Result</h3><p class="calc-muted">Enter A, B, and C, then calculate X.</p></section></div></div>`;
  installCalculatorKeyboardDismiss(root);wireDecimalInputs(root);
  root.querySelector("#propCalculate").onclick=()=>{
    document.activeElement?.blur();const a=Number(root.querySelector("#propA").value),b=Number(root.querySelector("#propB").value),c=Number(root.querySelector("#propC").value),out=root.querySelector("#propResult");
    if(!(a>0)||b<0||c<0||!Number.isFinite(b)||!Number.isFinite(c)){out.innerHTML=`<h3>Result</h3><p class="calc-error">Please enter valid positive values.</p>`;return;}
    const x=c*b/a,formatted=formatTrimmed(x,2,"up");
    out.innerHTML=`<h3>Result</h3><div class="calc-result-main">X = ${formatted}</div><p>(${c} x ${b}) / ${a} = ${formatted}</p>${x===0?`<p style="color:#B45309;font-weight:900">Result is 0. Confirm the entered values.</p>`:""}`;
  };
}
