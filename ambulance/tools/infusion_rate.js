// /ambulance/tools/infusion_rate.js
// CHANGELOG (2026-06-05):
// - Match page accent color and description to the calculator source screen.
// - Port Android Infusion Rate with four dose units and optional weight-based dosing.

export async function run(root) {
  const version=encodeURIComponent(window.__AMBULANCE_ASSET_VERSION||"current");
  const {calculatorCss,formatTrimmed,installCalculatorKeyboardDismiss,wireDecimalInputs}=await import(`../calculator_common.js?ver=${version}`);
  let withWeight=false, unit="mcg/min";
  const units=["mcg/min","mcg/hr","mg/min","mg/hr"];
  root.innerHTML=`<style>${calculatorCss}</style><div class="calc-page" style="--calc-accent:#5F6670;--calc-accent-dark:#737D8A">
    <div class="calc-heading"><h2>Infusion Rate</h2><p>Calculate rate from dose and concentration.</p></div>
    <div class="calc-stack"><section class="calc-card">
      <h3>Drug concentration</h3><div class="calc-row">
        <label class="calc-field"><span>Amount</span><span class="calc-input-wrap"><input id="irAmount" class="calc-input" data-decimal inputmode="decimal"><b class="calc-suffix">mg</b></span></label>
        <label class="calc-field"><span>Volume</span><span class="calc-input-wrap"><input id="irVolume" class="calc-input" data-decimal inputmode="decimal"><b class="calc-suffix">ml</b></span></label>
      </div><h3>Dose mode</h3>
      <div class="calc-segment"><button data-weight="without" class="active">Without weight</button><button data-weight="with">With weight</button></div>
      <label class="calc-field"><span>Weight</span><span class="calc-input-wrap"><input id="irWeight" class="calc-input" data-decimal inputmode="decimal" disabled><b class="calc-suffix">kg</b></span></label>
      <h3>Recommended dose</h3><div class="calc-segment" style="--segments:4">${units.map((x,i)=>`<button data-rate-unit="${x}" class="${i===0?"active":""}">${x}</button>`).join("")}</div>
      <label class="calc-field"><span id="irDoseLabel">Total dose rate</span><span class="calc-input-wrap"><input id="irDose" class="calc-input" data-decimal inputmode="decimal"><b class="calc-suffix" id="irDoseUnit">mcg/min</b></span></label>
      <p class="calc-muted" id="irHint">Use this when the ordered dose is a total dose rate.</p>
      <button class="calc-button" id="irCalculate">Calculate</button>
    </section><section class="calc-result" id="irResult"><h3>Result</h3><p class="calc-muted">Enter values above, then tap Calculate.</p></section></div></div>`;
  installCalculatorKeyboardDismiss(root);wireDecimalInputs(root);
  const weight=root.querySelector("#irWeight");
  const updateLabels=()=>{
    const label=withWeight?unit.replace("/","/kg/"):unit;
    root.querySelector("#irDoseUnit").textContent=label;
    root.querySelector("#irDoseLabel").textContent=withWeight?"Weight-based dose rate":"Total dose rate";
    root.querySelector("#irHint").textContent=withWeight?"Use this when the ordered dose is per kg.":"Use this when the ordered dose is a total dose rate.";
  };
  root.querySelectorAll("[data-weight]").forEach(button=>button.onclick=()=>{
    withWeight=button.dataset.weight==="with";
    root.querySelectorAll("[data-weight]").forEach(x=>x.classList.toggle("active",x===button));
    weight.disabled=!withWeight;if(!withWeight)weight.value="";updateLabels();
  });
  root.querySelectorAll("[data-rate-unit]").forEach(button=>button.onclick=()=>{
    unit=button.dataset.rateUnit;root.querySelectorAll("[data-rate-unit]").forEach(x=>x.classList.toggle("active",x===button));updateLabels();
  });
  root.querySelector("#irCalculate").onclick=()=>{
    document.activeElement?.blur();
    const amount=Number(root.querySelector("#irAmount").value),volume=Number(root.querySelector("#irVolume").value),dose=Number(root.querySelector("#irDose").value),kg=Number(weight.value);
    const output=root.querySelector("#irResult");
    if(!(amount>0)||!(volume>0)||!(dose>0)||(withWeight&&!(kg>0))){
      output.innerHTML=`<h3>Result</h3><p class="calc-error">${withWeight&&!(kg>0)?"Please enter a valid weight.":"Please enter valid positive values."}</p>`;return;
    }
    const concentration=amount/volume;
    const mgMin=unit==="mcg/min"?dose/1000:unit==="mcg/hr"?(dose/1000)/60:unit==="mg/hr"?dose/60:dose;
    const mlHr=mgMin*(withWeight?kg:1)*(60/concentration),mlMin=mlHr/60;
    const displayUnit=withWeight?unit.replace("/","/kg/"):unit;
    output.innerHTML=`<h3>Result</h3><div class="calc-result-main">${formatTrimmed(mlHr,3,"down")} ml/hr</div><div class="calc-result-secondary">${formatTrimmed(mlMin,3,"down")} ml/min</div>
      <p>Concentration: ${formatTrimmed(concentration,3,"down")} mg/ml\n${withWeight?"Weight-based":"Total"} dose: ${formatTrimmed(dose,3,"down")} ${displayUnit}${withWeight?`\nWeight: ${formatTrimmed(kg,3,"down")} kg`:""}</p>`;
  };
}
