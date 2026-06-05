// /ambulance/calculator_common.js
// CHANGELOG (2026-06-05):
// - Add dark-mode-safe calculator accent support.
// - Add shared Android-aligned calculator styling, formatting, and keyboard behavior.

export const calculatorCss = `
  .calc-page{--calc-accent:#2563eb;--calc-accent-dark:var(--calc-accent);--calc-live-accent:var(--calc-accent);max-width:620px;margin:0 auto;padding:20px 18px 30px;color:var(--text)}
  :root[data-theme="dark"] .calc-page{--calc-live-accent:var(--calc-accent-dark)}
  @media(prefers-color-scheme:dark){:root[data-theme="auto"] .calc-page{--calc-live-accent:var(--calc-accent-dark)}}
  .calc-heading{text-align:center}.calc-heading h2{margin:0;font-size:26px;font-weight:950}.calc-heading p{margin:7px auto 0;max-width:500px;color:var(--muted);font-size:14px;line-height:1.4}
  .calc-stack{display:grid;gap:16px;margin-top:16px}
  .calc-card{display:grid;gap:12px;padding:14px;border:1px solid var(--border);border-radius:8px;background:var(--surface);box-shadow:0 2px 7px rgba(15,23,42,.07)}
  .calc-card h3{margin:0;color:var(--calc-live-accent);font-size:17px;font-weight:900}
  .calc-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .calc-field{display:grid;gap:5px;min-width:0}.calc-field span{padding-left:10px;color:var(--muted);font-size:12px;font-weight:800}
  .calc-input-wrap{display:flex;align-items:center;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);overflow:hidden}
  .calc-input-wrap:focus-within{border-color:var(--calc-live-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--calc-live-accent) 18%,transparent)}
  .calc-input{box-sizing:border-box;width:100%;min-width:0;height:52px;border:0;outline:0;background:transparent;color:var(--text);padding:0 10px;font-size:17px;font-weight:800}
  .calc-suffix{flex:none;padding-right:10px;color:var(--calc-live-accent);font-size:13px;font-weight:900}
  .calc-segment{display:grid;grid-template-columns:repeat(var(--segments,2),minmax(0,1fr));gap:7px}
  .calc-segment button{min-height:40px;border:0;border-radius:14px;background:var(--surface-2);color:var(--text);font-size:13px;font-weight:900;padding:7px 4px}
  .calc-segment button.active{background:var(--calc-live-accent);color:#fff}
  .calc-button{min-height:46px;border:0;border-radius:14px;background:var(--calc-live-accent);color:#fff;font-size:17px;font-weight:900}
  .calc-result{display:grid;gap:9px;padding:16px;border:1px solid var(--border);border-radius:8px;background:var(--surface)}
  .calc-result h3{margin:0;color:var(--calc-live-accent);font-size:18px}.calc-result-main{color:#0d7d3b;font-size:30px;line-height:1.15;font-weight:950}
  .calc-result-secondary{color:#1976d2;font-size:22px;font-weight:900}.calc-result p{margin:0;white-space:pre-wrap;color:var(--text);font-size:14px;line-height:1.4}
  .calc-error{color:#d32f2f!important;font-weight:900}.calc-muted{color:var(--muted)!important}
  .calc-formula{text-align:center}.calc-formula strong{display:block;color:var(--text);font-size:24px}.calc-formula span{color:var(--muted);font-size:15px;font-weight:850}
  :root[data-theme="dark"] .calc-card,:root[data-theme="dark"] .calc-result{box-shadow:none}
  @media(prefers-color-scheme:dark){:root[data-theme="auto"] .calc-card,:root[data-theme="auto"] .calc-result{box-shadow:none}}
  @media(max-width:370px){.calc-page{padding-inline:12px}.calc-row{gap:7px}.calc-input{font-size:15px;padding-inline:8px}.calc-suffix{font-size:11px;padding-right:7px}}
`;

export function cleanDecimal(value) {
  const filtered = String(value || "").replace(/[^0-9.]/g, "");
  const dot = filtered.indexOf(".");
  return dot < 0 ? filtered : filtered.slice(0, dot + 1) + filtered.slice(dot + 1).replace(/\./g, "");
}

export function formatTrimmed(value, decimals = 3, mode = "round") {
  if (!Number.isFinite(value)) return "";
  const factor = 10 ** decimals;
  const adjusted = mode === "down"
    ? Math.floor(value * factor) / factor
    : mode === "up"
      ? Math.ceil(value * factor) / factor
      : Math.round(value * factor) / factor;
  return adjusted.toFixed(decimals).replace(/\.?0+$/, "") || "0";
}

export function installCalculatorKeyboardDismiss(root) {
  const dismiss = () => {
    const active = document.activeElement;
    if (active && root.contains(active) && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) active.blur();
  };
  root.addEventListener("touchmove", dismiss, { passive:true });
  root.addEventListener("wheel", dismiss, { passive:true });
}

export function wireDecimalInputs(root) {
  root.querySelectorAll("input[data-decimal]").forEach(input => {
    input.addEventListener("input", () => { input.value = cleanDecimal(input.value); });
  });
}
