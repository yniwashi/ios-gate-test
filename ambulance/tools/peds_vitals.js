// /ambulance/tools/peds_vitals.js
// CHANGELOG (2026-06-05):
// - Add the Android pediatric Normal Vital Signs reference table to the iOS App.

export async function run(root) {
  const version = encodeURIComponent(window.__AMBULANCE_ASSET_VERSION || "current");
  const { normalVitalsRows } = await import(`../pediatric_engine.js?ver=${version}`);
  const rows = normalVitalsRows();
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[ch]));

  root.innerHTML = `
    <style>
      .pvs-wrap{padding:12px 12px 28px;color:var(--text)}
      .pvs-intro{margin:0 0 12px;padding:12px 14px;border:1px solid #C7D2FE;border-radius:10px;background:#EEF2FF;color:#4338CA;font-weight:800;line-height:1.4}
      .pvs-table-wrap{overflow-x:auto;border:1px solid var(--border);border-radius:12px;background:var(--surface)}
      .pvs-table{width:100%;min-width:720px;border-collapse:collapse;font-size:12px}
      .pvs-table th{position:sticky;top:0;background:#0A96FA;color:#fff;padding:10px 8px;text-align:center;font-weight:900}
      .pvs-table td{padding:10px 8px;border-top:1px solid var(--border);text-align:center;font-weight:750}
      .pvs-table td:first-child{text-align:left;font-weight:900;color:#4338CA}
      .pvs-table tr:nth-child(even) td{background:var(--surface-2)}
      :root[data-theme="dark"] .pvs-intro{background:#20243B;border-color:#4F5B93;color:#BFC8FF}
    </style>
    <div class="pvs-wrap">
      <p class="pvs-intro">Normal pediatric vital-sign ranges used by the Android Ambulance App.</p>
      <div class="pvs-table-wrap">
        <table class="pvs-table">
          <thead><tr><th>Age</th><th>Weight kg</th><th>RR /min</th><th>HR /min</th><th>SBP mmHg</th><th>DBP mmHg</th><th>Temp °C</th><th>RBS mmol/L</th></tr></thead>
          <tbody>${rows.map(row => `<tr>
            <td>${esc(row.ageGroup)}</td><td>${esc(row.weight)}</td><td>${esc(row.rr)}</td><td>${esc(row.hr)}</td>
            <td>${esc(row.sbp)}</td><td>${esc(row.dbp)}</td><td>${esc(row.temp)}</td><td>${esc(row.rbs)}</td>
          </tr>`).join("")}</tbody>
        </table>
      </div>
    </div>`;
}
