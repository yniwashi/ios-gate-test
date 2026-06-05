// /ambulance/tools/dose_volume.js
// CHANGELOG (2026-06-05):
// - Match page accent color and description to the calculator source screen.
// - Port the Android Dose Volume calculator UI, validation, formula, and result detail.

export async function run(root) {
  const version = encodeURIComponent(window.__AMBULANCE_ASSET_VERSION || "current");
  const { calculatorCss, formatTrimmed, installCalculatorKeyboardDismiss, wireDecimalInputs } =
    await import(`../calculator_common.js?ver=${version}`);
  let unit = "mg";
  root.innerHTML = `<style>${calculatorCss}</style>
    <div class="calc-page" style="--calc-accent:#0068FA;--calc-accent-dark:#1D5FCC">
      <div class="calc-heading"><h2>Dose Volume</h2><p>Calculate volume from ordered dose.</p></div>
      <div class="calc-stack">
        <section class="calc-card">
          <h3>Concentration unit written on vial/ampule</h3>
          <div class="calc-segment" style="--segments:3">${["mcg","mg","g"].map(x=>`<button data-unit="${x}" class="${x==="mg"?"active":""}">${x}</button>`).join("")}</div>
          <div class="calc-row">
            <label class="calc-field"><span>Amount</span><span class="calc-input-wrap"><input id="dvAmount" class="calc-input" data-decimal inputmode="decimal"><b class="calc-suffix" id="dvAmountUnit">mg</b></span></label>
            <label class="calc-field"><span>Volume</span><span class="calc-input-wrap"><input id="dvVolume" class="calc-input" data-decimal inputmode="decimal"><b class="calc-suffix">ml</b></span></label>
          </div>
          <label class="calc-field"><span>Dose to draw</span><span class="calc-input-wrap"><input id="dvDose" class="calc-input" data-decimal inputmode="decimal"><b class="calc-suffix" id="dvDoseUnit">mg</b></span></label>
          <button class="calc-button" id="dvCalculate">Calculate</button>
        </section>
        <section class="calc-result" id="dvResult"><h3>Result</h3><p class="calc-muted">Enter values above, then tap Calculate.</p></section>
      </div>
    </div>`;
  installCalculatorKeyboardDismiss(root); wireDecimalInputs(root);
  const result = root.querySelector("#dvResult");
  root.querySelectorAll("[data-unit]").forEach(button => button.onclick=()=>{
    unit=button.dataset.unit;
    root.querySelectorAll("[data-unit]").forEach(x=>x.classList.toggle("active",x===button));
    root.querySelector("#dvAmountUnit").textContent=unit;
    root.querySelector("#dvDoseUnit").textContent=unit;
  });
  root.querySelector("#dvCalculate").onclick=()=>{
    document.activeElement?.blur();
    const amount=Number(root.querySelector("#dvAmount").value);
    const volume=Number(root.querySelector("#dvVolume").value);
    const dose=Number(root.querySelector("#dvDose").value);
    if(!(amount>0)||!(volume>0)||!(dose>0)){
      result.innerHTML=`<h3>Result</h3><p class="calc-error">Please enter valid positive values.</p>`; return;
    }
    const concentration=amount/volume;
    const draw=dose/concentration;
    result.innerHTML=`<h3>Result</h3><div class="calc-result-main">${formatTrimmed(draw)} ml</div>
      <p><b>You should draw ${formatTrimmed(draw)} ml.</b></p>
      <p>Calculation Ref:\nThe medication concentration is ${formatTrimmed(concentration)} ${unit}/ml.\nTo draw ${formatTrimmed(dose)} ${unit} = Dose / Concentration =\n${formatTrimmed(dose)} / ${formatTrimmed(concentration)} = ${formatTrimmed(draw)} ml.</p>`;
  };
}
