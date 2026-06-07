// /ambulance/tools/shift_schedule.js
// CHANGELOG (2026-06-07):
// - Remove picker flex expansion so Cancel and OK sit directly below the month/date grid.
// - Improve dark-mode night-shift contrast and compact the month/date picker layout.
// - Restore the compact picker height while retaining its always-visible action footer.
// - Correct light/dark Shift Schedule colors and prevent global button styles from hiding picker actions.
// - Separate the picker content from its fixed action footer so iOS always shows Cancel and OK.
// - Keep date-picker Cancel and OK actions visible at the bottom on iPhone.
// - Add Android-aligned Team Calendar, Date Lookup, and Coverage/Swap workflows.

const MIN_YEAR = 2020;
const MAX_YEAR = 2040;
const ACCENT = "#0EA5E9";
const DAY_MS = 86400000;
const ANCHOR_DAY = Math.floor(Date.UTC(2026, 0, 1) / DAY_MS);

const STATUSES = [
  { short: "1D", full: "1st Day Shift", color: "#F59E0B", text: "#111827" },
  { short: "2D", full: "2nd Day Shift", color: "#D97706", text: "#FFFFFF" },
  { short: "1N", full: "1st Night Shift", color: "#1E3A8A", text: "#FFFFFF" },
  { short: "2N", full: "2nd Night Shift", color: "#312E81", text: "#FFFFFF" },
  { short: "1O", full: "1st Off", color: "#FFFFFF", text: "#475569", outlined: true },
  { short: "2O", full: "2nd Off", color: "#FFFFFF", text: "#475569", outlined: true },
  { short: "3O", full: "3rd Off", color: "#FFFFFF", text: "#475569", outlined: true },
  { short: "4O", full: "4th Off", color: "#FFFFFF", text: "#475569", outlined: true }
];

const TEAMS = [
  { id: "A", label: "Team A", anchor: 6 },
  { id: "B", label: "Team B", anchor: 2 },
  { id: "C", label: "Team C", anchor: 0 },
  { id: "D", label: "Team D", anchor: 4 }
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(date) {
  return `${date.year}-${String(date.month + 1).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

function today() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
}

function utcDay(date) {
  return Math.floor(Date.UTC(date.year, date.month, date.day) / DAY_MS);
}

function fromUtcDay(day) {
  const date = new Date(day * DAY_MS);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate() };
}

function addDays(date, amount) {
  return fromUtcDay(utcDay(date) + amount);
}

function addMonths(date, amount) {
  const value = new Date(Date.UTC(date.year, date.month + amount, 1));
  return { year: value.getUTCFullYear(), month: value.getUTCMonth(), day: 1 };
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "UTC"
  }).format(new Date(Date.UTC(date.year, date.month, date.day)));
}

function formatMonth(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long", year: "numeric", timeZone: "UTC"
  }).format(new Date(Date.UTC(date.year, date.month, 1)));
}

function relativeLabel(date) {
  const difference = utcDay(date) - utcDay(today());
  return difference === -1 ? "Yesterday" : difference === 0 ? "Today" : difference === 1 ? "Tomorrow" : "";
}

function statusFor(team, date) {
  const offset = ((team.anchor + utcDay(date) - ANCHOR_DAY) % STATUSES.length + STATUSES.length) % STATUSES.length;
  return STATUSES[offset];
}

function isDay(status) {
  return status.short === "1D" || status.short === "2D";
}

function isNight(status) {
  return status.short === "1N" || status.short === "2N";
}

function isWorking(status) {
  return isDay(status) || isNight(status);
}

function isOff(status) {
  return status.short.endsWith("O");
}

function oppositeDayNight(first, second) {
  return (isDay(first) && isNight(second)) || (isNight(first) && isDay(second));
}

function canCover(team, date, targetShift) {
  const status = statusFor(team, date);
  if (!isWorking(targetShift)) return { eligible: false, reason: "No shift to cover" };
  if (isWorking(status)) return { eligible: false, reason: "Already working" };
  if (isDay(targetShift)) {
    if (status.short === "1O") return { eligible: false, reason: "1st Off cannot cover day" };
    if (!isOff(status)) return { eligible: false, reason: "Not off" };
    if (isNight(statusFor(team, addDays(date, -1)))) return { eligible: false, reason: "Worked night before" };
    return { eligible: true, reason: "Can cover day" };
  }
  if (isNight(targetShift)) {
    if (status.short === "4O") return { eligible: false, reason: "4th Off cannot cover night" };
    if (!isOff(status)) return { eligible: false, reason: "Not off" };
    return { eligible: true, reason: "Can cover night" };
  }
  return { eligible: false, reason: "No shift to cover" };
}

function canWorkAfterRemovingOwnShift(team, date, newShift) {
  return isDay(newShift) ? !isNight(statusFor(team, addDays(date, -1))) : isNight(newShift);
}

function coverageOptions(selectedTeam, date) {
  const target = statusFor(selectedTeam, date);
  return TEAMS.filter(team => team !== selectedTeam).map(team => {
    const result = canCover(team, date, target);
    return { team, status: statusFor(team, date), ...result };
  });
}

function swapOptions(selectedTeam, date) {
  const yourShift = statusFor(selectedTeam, date);
  if (utcDay(date) < utcDay(today()) || !isWorking(yourShift)) return [];
  const options = [];
  TEAMS.filter(team => team !== selectedTeam).forEach(otherTeam => {
    const theirShiftToday = statusFor(otherTeam, date);
    if (
      oppositeDayNight(yourShift, theirShiftToday) &&
      canWorkAfterRemovingOwnShift(selectedTeam, date, theirShiftToday) &&
      canWorkAfterRemovingOwnShift(otherTeam, date, yourShift)
    ) {
      options.push({
        team: otherTeam,
        date,
        theirShift: theirShiftToday,
        caution: "Same date: both shifts must be exchanged, not added."
      });
    }
    if (!canCover(otherTeam, date, yourShift).eligible) return;
    for (let day = 1; day <= daysInMonth(date.year, date.month); day += 1) {
      const otherDate = { year: date.year, month: date.month, day };
      if (utcDay(otherDate) < utcDay(today()) || dateKey(otherDate) === dateKey(date)) continue;
      const theirShift = statusFor(otherTeam, otherDate);
      if (isWorking(theirShift) && canCover(selectedTeam, otherDate, theirShift).eligible) {
        options.push({ team: otherTeam, date: otherDate, theirShift });
      }
    }
  });
  return options.sort((a, b) => a.date.day - b.date.day || a.team.id.localeCompare(b.team.id));
}

function pill(status, compact = false) {
  const style = `--shift-color:${status.color};--shift-text:${status.text}`;
  return `<span class="shift-pill shift-status-${status.short.toLowerCase()}${compact ? " compact" : ""}${status.outlined ? " outlined" : ""}" style="${style}">${compact ? status.short : status.full}</span>`;
}

function summaryCard(team, date, dateLookup = false) {
  const status = statusFor(team, date);
  const relative = relativeLabel(date);
  return `
    <section class="shift-card shift-summary">
      <span class="shift-round${dateLookup ? "" : ` shift-status-${status.short.toLowerCase()}`}" style="--round-color:${dateLookup ? ACCENT : status.color};--round-text:${dateLookup ? "#fff" : status.text}">${dateLookup ? date.day : team.id}</span>
      <div class="shift-summary-copy">
        <h2>${dateLookup ? "Selected Date" : team.label}</h2>
        ${relative ? `<strong>${relative}</strong>` : ""}
        <span>${formatDate(date)}</span>
      </div>
      ${dateLookup ? `<button class="shift-button primary shift-select-date" type="button">Select Date</button>` : pill(status)}
    </section>`;
}

function calendarCells(month) {
  const leading = new Date(Date.UTC(month.year, month.month, 1)).getUTCDay();
  const cells = Array(leading).fill(null);
  for (let day = 1; day <= daysInMonth(month.year, month.month); day += 1) {
    cells.push({ year: month.year, month: month.month, day });
  }
  while (cells.length % 7) cells.push(null);
  return cells;
}

function calendar(team, visibleMonth, selectedDate) {
  return `
    <section class="shift-card shift-calendar">
      <div class="shift-month-head">
        <button class="shift-circle-button" type="button" data-month-step="-1" aria-label="Previous month">‹</button>
        <button class="shift-month-title" type="button">${formatMonth(visibleMonth)}</button>
        <button class="shift-circle-button" type="button" data-month-step="1" aria-label="Next month">›</button>
      </div>
      <div class="shift-weekdays">${WEEKDAYS.map(day => `<span>${day}</span>`).join("")}</div>
      <div class="shift-calendar-grid">
        ${calendarCells(visibleMonth).map(date => {
          if (!date) return `<span class="shift-day empty"></span>`;
          const status = statusFor(team, date);
          const selected = dateKey(date) === dateKey(selectedDate);
          return `<button class="shift-day${selected ? " selected" : ""}" type="button" data-date="${dateKey(date)}">
            <span>${date.day}</span>${pill(status, true)}
          </button>`;
        }).join("")}
      </div>
    </section>`;
}

function legend() {
  const label = status => status.full.replace(/ Shift$/, "");
  return `<section class="shift-card shift-legend"><h3>Legend</h3><div class="shift-legend-grid">
    ${STATUSES.map(status => `<div>${pill(status, true)}<span>${label(status)}</span></div>`).join("")}
  </div></section>`;
}

function allTeams(date) {
  return `<section class="shift-card shift-results"><h3>All Teams</h3>
    ${TEAMS.map(team => `<div class="shift-result-row"><strong>${team.label}</strong>${pill(statusFor(team, date))}</div>`).join("")}
  </section>`;
}

function emptyResult(text) {
  return `<p class="shift-empty-result">${text}</p>`;
}

function coverageView(team, date) {
  const shift = statusFor(team, date);
  const options = coverageOptions(team, date);
  const eligible = options.filter(option => option.eligible);
  const swaps = swapOptions(team, date);
  const past = utcDay(date) < utcDay(today());
  let coverContent = "";
  let swapContent = "";
  if (past) coverContent = emptyResult("Choose today or a future date to find coverage.");
  else if (!isWorking(shift)) coverContent = emptyResult(`This date is an off day for ${team.label}. No cover is needed.`);
  else if (!eligible.length) coverContent = emptyResult("No team is eligible to cover this shift.");
  else coverContent = eligible.map(option => `
    <div class="shift-result-row"><div><strong>${option.team.label}</strong><small>${option.reason}</small></div>${pill(option.status)}</div>
  `).join("");
  if (past) swapContent = emptyResult("Choose today or a future date to find swap options.");
  else if (!isWorking(shift)) swapContent = emptyResult("Choose a working shift to find swap options.");
  else if (!swaps.length) swapContent = emptyResult("No safe swap options found in this month.");
  else swapContent = swaps.map(option => `
    <div class="shift-swap-row">
      <div class="shift-result-row"><div><strong>${option.team.label}</strong><small>${formatDate(option.date)}</small></div>${pill(option.theirShift)}</div>
      <p>You cover ${option.team.label}'s ${option.theirShift.full}. They cover your shift.</p>
      ${option.caution ? `<b>${option.caution}</b>` : ""}
    </div>`).join("");
  return `
    <section class="shift-card shift-summary shift-cover-summary">
      <span class="shift-round shift-status-${shift.short.toLowerCase()}" style="--round-color:${shift.color};--round-text:${shift.text}">${team.id}</span>
      <div class="shift-summary-copy"><h2>Find Cover or Swap</h2>${relativeLabel(date) ? `<strong>${relativeLabel(date)}</strong>` : ""}<span>${formatDate(date)}</span></div>
      <button class="shift-button primary shift-select-date" type="button">Select Date</button>
      <div class="shift-current-line"><strong>${team.label}</strong>${pill(shift)}</div>
    </section>
    <section class="shift-info"><strong>Simple Rule</strong><span>Coverage means an off team works your shift. Swap means both teams exchange shifts. The app avoids direct 24-hour runs.</span></section>
    <section class="shift-card shift-results"><h3>Coverage Options</h3>${coverContent}</section>
    <section class="shift-card shift-results"><h3>Swap Options This Month</h3>${swapContent}</section>
    ${past ? "" : `<section class="shift-card shift-results"><h3>Not Eligible</h3>
      ${options.filter(option => !option.eligible).map(option => `<div class="shift-not-eligible"><strong>${option.team.label}</strong><span>${option.reason}</span></div>`).join("")}
    </section>`}`;
}

function selector(mode, team) {
  return `
    <section class="shift-card shift-selector">
      <h3>Schedule View</h3>
      <button class="shift-segment${mode === "TEAM" ? " selected" : ""}" data-mode="TEAM" type="button">📅 Team Calendar</button>
      <div class="shift-segment-row">
        <button class="shift-segment${mode === "DATE" ? " selected" : ""}" data-mode="DATE" type="button">🔎 Date Lookup</button>
        <button class="shift-segment${mode === "COVERAGE" ? " selected" : ""}" data-mode="COVERAGE" type="button">🔁 Coverage</button>
      </div>
    </section>
    ${mode === "DATE" ? "" : `<section class="shift-card shift-team-selector"><h3>Select Team</h3><div>
      ${TEAMS.map(item => `<button class="shift-segment${item === team ? " selected" : ""}" data-team="${item.id}" type="button">${item.id}</button>`).join("")}
    </div></section>`}`;
}

function parseDate(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return { year, month: month - 1, day };
}

export async function run(root) {
  let mode = "TEAM";
  let team = TEAMS[0];
  let selectedDate = today();
  let visibleMonth = { ...selectedDate, day: 1 };

  root.innerHTML = `
    <style>
      .shift-app{max-width:760px;margin:0 auto;padding:12px;color:var(--text);background:#F4F7FB;min-height:calc(100dvh - 50px);box-sizing:border-box;--shift-accent:${ACCENT}}
      .shift-stack{display:grid;gap:10px}.shift-card{box-sizing:border-box;width:100%;padding:12px;border:1px solid #E2E8F0;border-radius:10px;background:#fff;box-shadow:0 3px 8px rgba(15,23,42,.12)}
      .shift-card h3{margin:0 0 8px;color:#0F172A;font-size:14px;font-weight:900}.shift-selector{padding:10px;display:grid;gap:8px}.shift-selector h3{margin:0}
      .shift-segment-row,.shift-team-selector>div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.shift-team-selector>div{grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
      .shift-segment{min-width:0;height:42px;border:0;border-radius:10px;background:#DCEEFF;color:#0F172A;font-size:13px;font-weight:900}.shift-segment.selected{background:var(--shift-accent);color:#fff;box-shadow:0 3px 7px rgba(14,165,233,.25)}
      .shift-summary{display:flex;align-items:center;gap:10px}.shift-round{display:grid;place-items:center;flex:none;width:32px;height:32px;border-radius:50%;background:var(--round-color);color:var(--round-text);font-size:14px;font-weight:950}
      .shift-summary-copy{min-width:0;flex:1;display:grid;gap:2px}.shift-summary-copy h2{margin:0;color:#0F172A;font-size:18px;line-height:1.15}.shift-summary-copy strong{color:var(--shift-accent);font-size:13px}.shift-summary-copy span{color:#64748B;font-size:12px;font-weight:800}
      .shift-pill{display:inline-flex;align-items:center;justify-content:center;flex:none;max-width:150px;padding:7px 11px;border-radius:14px;background:var(--shift-color);color:var(--shift-text);border:1px solid transparent;font-size:13px;font-weight:900;text-align:center}.shift-pill.compact{padding:3px 7px;border-radius:6px;font-size:10px}.shift-pill.outlined{border-color:#CBD5E1}
      .shift-month-head{display:flex;align-items:center;gap:8px}.shift-circle-button{display:grid;place-items:center;width:34px;height:34px;border:1px solid #BAE6FD;border-radius:50%;background:#E0F2FE;color:var(--shift-accent);font-size:28px;font-weight:700;line-height:1}.shift-month-title{flex:1;border:0;border-radius:10px;background:transparent;padding:8px;color:#0F172A;font-size:18px;font-weight:900}
      .shift-weekdays,.shift-calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}.shift-weekdays{margin:8px 0}.shift-weekdays span{color:#64748B;font-size:10px;font-weight:850;text-align:center}
      .shift-day{min-width:0;height:50px;padding:3px;border:2px solid transparent;border-radius:8px;background:#F8FAFC;color:#0F172A;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:11px;font-weight:900}.shift-day.selected{border-color:#D97706;background:#FFF7D6}.shift-day.empty{background:transparent}
      .shift-legend-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px 6px}.shift-legend-grid>div{min-width:0;display:flex;align-items:center;gap:4px}.shift-legend-grid>div>span:last-child{min-width:0;color:#475569;font-size:9px;font-weight:800}
      .shift-button{min-height:42px;border:0;border-radius:10px;padding:8px 12px;font-size:12px;font-weight:900}.shift-button.primary{background:var(--shift-accent);color:#fff}
      .shift-results{display:grid;gap:8px}.shift-results h3{font-size:16px;margin:0}.shift-result-row{display:flex;align-items:center;gap:10px;border-radius:9px;background:#F8FAFC;padding:9px}.shift-result-row>strong,.shift-result-row>div{min-width:0;flex:1;color:#0F172A;font-size:14px}.shift-result-row div{display:grid;gap:2px}.shift-result-row small{color:#475569;font-size:11px;font-weight:800}
      .shift-info{display:grid;gap:4px;padding:12px;border-radius:10px;background:#EFF6FF;box-shadow:0 2px 5px rgba(15,23,42,.08)}.shift-info strong{color:#075985;font-size:14px}.shift-info span{color:#334155;font-size:12px;font-weight:800;line-height:1.4}
      .shift-current-line{flex-basis:100%;display:flex;align-items:center;gap:10px;padding-top:10px}.shift-current-line>strong{flex:1}.shift-cover-summary{flex-wrap:wrap}.shift-swap-row{display:grid;gap:6px;padding:0}.shift-swap-row p{margin:0 9px;color:#334155;font-size:12px;font-weight:800}.shift-swap-row>b{margin:0 9px;color:#B45309;font-size:11px}.shift-empty-result{margin:0;border-radius:9px;background:#F8FAFC;padding:10px;color:#475569;font-size:12px;font-weight:800}
      .shift-not-eligible{display:flex;align-items:center;gap:8px;border-radius:8px;background:#FFFBEB;padding:8px;color:#92400E}.shift-not-eligible strong{flex:1;font-size:13px}.shift-not-eligible span{flex:2;text-align:right;font-size:11px;font-weight:800}
      .shift-dialog{box-sizing:border-box;width:min(500px,calc(100vw - 24px));height:fit-content!important;max-height:calc(100dvh - 32px);overflow:hidden;border:1px solid #D7E0EA;border-radius:14px;background:#FFFFFF;color:#0F172A;padding:0;box-shadow:0 18px 50px rgba(2,6,23,.35);--shift-accent:${ACCENT}}.shift-dialog[open]{display:flex;flex-direction:column}.shift-dialog::backdrop{background:rgba(15,23,42,.58)}
      .shift-picker-body{min-height:0;flex:0 1 auto;max-height:calc(100dvh - 118px);overflow-y:auto;overscroll-behavior:contain;padding:11px 12px;-webkit-overflow-scrolling:touch}
      .shift-dialog h2{margin:0 0 8px;text-align:center;font-size:18px}.shift-year-row{display:flex;align-items:center;gap:8px}.shift-year-row strong{flex:1;text-align:center;font-size:17px}.shift-picker-step{width:38px;height:36px;border:1px solid #BAE6FD;border-radius:10px;background:#E0F2FE;color:var(--shift-accent);font-size:19px;font-weight:950}
      .shift-month-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin-top:7px}.shift-day-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px;margin-top:7px}.shift-picker-option{height:31px;min-width:0;padding:0 2px;border:1px solid #CBD5E1;border-radius:8px;background:#F8FAFC;color:#0F172A;font-size:11px;font-weight:900}.shift-picker-option.selected{border-color:#D97706;background:#FBBF24;color:#111827}
      .shift-dialog-actions{flex:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:9px 12px calc(10px + env(safe-area-inset-bottom));border-top:1px solid #D7E0EA;background:#FFFFFF}.shift-dialog-actions button{appearance:none!important;-webkit-appearance:none!important;display:block!important;visibility:visible!important;opacity:1!important;height:40px!important;border:1px solid transparent!important;border-radius:10px!important;font-size:14px!important;font-weight:900!important}.shift-dialog-cancel{background:#EFF6FF!important;border-color:#BFDBFE!important;color:#0F172A!important}.shift-dialog-apply{background:#0EA5E9!important;border-color:#0284C7!important;color:#FFFFFF!important}
      :root[data-theme="dark"] .shift-app{background:#0D1118;color:#E8EDF5}:root[data-theme="dark"] .shift-card{background:#171C24;border-color:#3D4654;box-shadow:none}:root[data-theme="dark"] .shift-card h3,:root[data-theme="dark"] .shift-summary-copy h2,:root[data-theme="dark"] .shift-result-row>strong,:root[data-theme="dark"] .shift-result-row>div,:root[data-theme="dark"] .shift-current-line{color:#F1F5F9}
      :root[data-theme="dark"] .shift-summary-copy span,:root[data-theme="dark"] .shift-weekdays span{color:#AAB6C5}:root[data-theme="dark"] .shift-segment{background:#26384A;color:#D7E9F8}:root[data-theme="dark"] .shift-segment.selected{background:#087FAF;color:#FFFFFF;box-shadow:none}:root[data-theme="dark"] .shift-circle-button,:root[data-theme="dark"] .shift-picker-step{background:#19364A;border-color:#2C6480;color:#7DD3FC}
      :root[data-theme="dark"] .shift-day,:root[data-theme="dark"] .shift-result-row,:root[data-theme="dark"] .shift-empty-result{background:#202731;color:#F1F5F9}:root[data-theme="dark"] .shift-day.selected{background:#4B3C16;border-color:#D89A24}:root[data-theme="dark"] .shift-pill:not(.outlined){filter:brightness(.9) saturate(.92)}:root[data-theme="dark"] .shift-status-1n{--shift-color:#315DB8!important;--round-color:#315DB8!important}:root[data-theme="dark"] .shift-status-2n{--shift-color:#5548B8!important;--round-color:#5548B8!important}:root[data-theme="dark"] .shift-pill.outlined{background:#252C36!important;border-color:#667181!important;color:#E2E8F0!important}
      :root[data-theme="dark"] .shift-legend-grid>div>span:last-child,:root[data-theme="dark"] .shift-result-row small{color:#B7C2D0}:root[data-theme="dark"] .shift-info{background:#142B3B;box-shadow:none}:root[data-theme="dark"] .shift-info strong{color:#7DD3FC}:root[data-theme="dark"] .shift-info span{color:#D3DEE9}:root[data-theme="dark"] .shift-not-eligible{background:#352A17;color:#F4C873}:root[data-theme="dark"] .shift-swap-row p{color:#D3DEE9}:root[data-theme="dark"] .shift-swap-row>b{color:#F4C873}
      :root[data-theme="dark"] .shift-dialog{background:#171C24;color:#F1F5F9;border-color:#46505E}:root[data-theme="dark"] .shift-dialog-actions{background:#171C24;border-color:#46505E}:root[data-theme="dark"] .shift-month-title,:root[data-theme="dark"] .shift-picker-option{color:#F1F5F9}:root[data-theme="dark"] .shift-picker-option{background:#242B35;border-color:#566170}:root[data-theme="dark"] .shift-picker-option.selected{background:#C58A13;border-color:#E3A62B;color:#111827}:root[data-theme="dark"] .shift-dialog-cancel{background:#293442!important;border-color:#526173!important;color:#F1F5F9!important}:root[data-theme="dark"] .shift-dialog-apply{background:#087FAF!important;border-color:#38BDF8!important;color:#FFFFFF!important}
      @media(prefers-color-scheme:dark){:root[data-theme="auto"] .shift-app{background:#0D1118;color:#E8EDF5}:root[data-theme="auto"] .shift-card{background:#171C24;border-color:#3D4654;box-shadow:none}:root[data-theme="auto"] .shift-card h3,:root[data-theme="auto"] .shift-summary-copy h2,:root[data-theme="auto"] .shift-result-row>strong,:root[data-theme="auto"] .shift-result-row>div,:root[data-theme="auto"] .shift-current-line{color:#F1F5F9}:root[data-theme="auto"] .shift-summary-copy span,:root[data-theme="auto"] .shift-weekdays span{color:#AAB6C5}:root[data-theme="auto"] .shift-segment{background:#26384A;color:#D7E9F8}:root[data-theme="auto"] .shift-segment.selected{background:#087FAF;color:#FFFFFF;box-shadow:none}:root[data-theme="auto"] .shift-circle-button,:root[data-theme="auto"] .shift-picker-step{background:#19364A;border-color:#2C6480;color:#7DD3FC}:root[data-theme="auto"] .shift-day,:root[data-theme="auto"] .shift-result-row,:root[data-theme="auto"] .shift-empty-result{background:#202731;color:#F1F5F9}:root[data-theme="auto"] .shift-day.selected{background:#4B3C16;border-color:#D89A24}:root[data-theme="auto"] .shift-pill:not(.outlined){filter:brightness(.9) saturate(.92)}:root[data-theme="auto"] .shift-status-1n{--shift-color:#315DB8!important;--round-color:#315DB8!important}:root[data-theme="auto"] .shift-status-2n{--shift-color:#5548B8!important;--round-color:#5548B8!important}:root[data-theme="auto"] .shift-pill.outlined{background:#252C36!important;border-color:#667181!important;color:#E2E8F0!important}:root[data-theme="auto"] .shift-legend-grid>div>span:last-child,:root[data-theme="auto"] .shift-result-row small{color:#B7C2D0}:root[data-theme="auto"] .shift-info{background:#142B3B;box-shadow:none}:root[data-theme="auto"] .shift-info strong{color:#7DD3FC}:root[data-theme="auto"] .shift-info span{color:#D3DEE9}:root[data-theme="auto"] .shift-not-eligible{background:#352A17;color:#F4C873}:root[data-theme="auto"] .shift-swap-row p{color:#D3DEE9}:root[data-theme="auto"] .shift-swap-row>b{color:#F4C873}:root[data-theme="auto"] .shift-dialog{background:#171C24;color:#F1F5F9;border-color:#46505E}:root[data-theme="auto"] .shift-dialog-actions{background:#171C24;border-color:#46505E}:root[data-theme="auto"] .shift-month-title,:root[data-theme="auto"] .shift-picker-option{color:#F1F5F9}:root[data-theme="auto"] .shift-picker-option{background:#242B35;border-color:#566170}:root[data-theme="auto"] .shift-picker-option.selected{background:#C58A13;border-color:#E3A62B;color:#111827}:root[data-theme="auto"] .shift-dialog-cancel{background:#293442!important;border-color:#526173!important;color:#F1F5F9!important}:root[data-theme="auto"] .shift-dialog-apply{background:#087FAF!important;border-color:#38BDF8!important;color:#FFFFFF!important}}
      @media(max-width:380px){.shift-app{padding:10px 8px}.shift-card{padding:10px}.shift-pill:not(.compact){max-width:112px;padding:6px 8px;font-size:11px}.shift-summary-copy h2{font-size:16px}.shift-select-date{padding:7px 9px}.shift-day{height:48px}.shift-legend-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    </style>
    <main class="shift-app"><div id="shiftStack" class="shift-stack"></div></main>
    <div id="shiftDialogHost"></div>`;

  const stack = root.querySelector("#shiftStack");
  const dialogHost = root.querySelector("#shiftDialogHost");

  function render() {
    let content = selector(mode, team);
    if (mode === "TEAM") {
      content += summaryCard(team, selectedDate) + calendar(team, visibleMonth, selectedDate) + legend();
    } else if (mode === "DATE") {
      content += summaryCard(team, selectedDate, true) + allTeams(selectedDate);
    } else {
      content += coverageView(team, selectedDate);
    }
    stack.innerHTML = content;
  }

  function openPicker(kind) {
    let year = kind === "month" ? visibleMonth.year : selectedDate.year;
    let month = kind === "month" ? visibleMonth.month : selectedDate.month;
    let day = kind === "month" ? 1 : selectedDate.day;
    dialogHost.innerHTML = `<dialog class="shift-dialog">
      <div class="shift-picker-body">
        <h2>${kind === "month" ? "Choose Month" : "Select Date"}</h2>
        <div class="shift-year-row"><button class="shift-picker-step" data-year="-1" type="button">−</button><strong id="shiftPickerYear">${year}</strong><button class="shift-picker-step" data-year="1" type="button">+</button></div>
        <div id="shiftPickerMonths" class="shift-month-grid"></div>
        ${kind === "date" ? `<div id="shiftPickerDays" class="shift-day-grid"></div>` : ""}
      </div>
      <div class="shift-dialog-actions"><button class="shift-dialog-cancel" type="button">Cancel</button><button class="shift-dialog-apply" type="button">OK</button></div>
    </dialog>`;
    const dialog = dialogHost.querySelector("dialog");
    const yearText = dialog.querySelector("#shiftPickerYear");
    const monthGrid = dialog.querySelector("#shiftPickerMonths");
    const dayGrid = dialog.querySelector("#shiftPickerDays");

    function renderPicker() {
      yearText.textContent = year;
      monthGrid.innerHTML = MONTHS.map((label, index) => `<button class="shift-picker-option${index === month ? " selected" : ""}" data-picker-month="${index}" type="button">${label}</button>`).join("");
      if (dayGrid) {
        day = Math.min(day, daysInMonth(year, month));
        dayGrid.innerHTML = Array.from({ length: daysInMonth(year, month) }, (_, index) => {
          const value = index + 1;
          return `<button class="shift-picker-option${value === day ? " selected" : ""}" data-picker-day="${value}" type="button">${value}</button>`;
        }).join("");
      }
    }

    dialog.addEventListener("click", event => {
      const yearButton = event.target.closest("[data-year]");
      const monthButton = event.target.closest("[data-picker-month]");
      const dayButton = event.target.closest("[data-picker-day]");
      if (yearButton) year = Math.max(MIN_YEAR, Math.min(MAX_YEAR, year + Number(yearButton.dataset.year)));
      if (monthButton) month = Number(monthButton.dataset.pickerMonth);
      if (dayButton) day = Number(dayButton.dataset.pickerDay);
      if (yearButton || monthButton || dayButton) renderPicker();
      if (event.target.closest(".shift-dialog-cancel")) dialog.close();
      if (event.target.closest(".shift-dialog-apply")) {
        const value = { year, month, day: kind === "month" ? 1 : day };
        if (kind === "month") visibleMonth = value;
        else {
          selectedDate = value;
          visibleMonth = { ...value, day: 1 };
        }
        dialog.close();
        render();
      }
    });
    dialog.addEventListener("close", () => { dialogHost.innerHTML = ""; });
    renderPicker();
    dialog.showModal();
  }

  stack.addEventListener("click", event => {
    const modeButton = event.target.closest("[data-mode]");
    const teamButton = event.target.closest("[data-team]");
    const monthButton = event.target.closest("[data-month-step]");
    const dateButton = event.target.closest("[data-date]");
    if (modeButton) mode = modeButton.dataset.mode;
    if (teamButton) team = TEAMS.find(item => item.id === teamButton.dataset.team) || team;
    if (monthButton) visibleMonth = addMonths(visibleMonth, Number(monthButton.dataset.monthStep));
    if (dateButton) selectedDate = parseDate(dateButton.dataset.date);
    if (event.target.closest(".shift-month-title")) return openPicker("month");
    if (event.target.closest(".shift-select-date")) return openPicker("date");
    if (modeButton || teamButton || monthButton || dateButton) render();
  });

  let touchStartY = 0;
  root.addEventListener("touchstart", event => {
    touchStartY = event.touches?.[0]?.clientY || 0;
  }, { passive: true });
  root.addEventListener("touchmove", event => {
    const currentY = event.touches?.[0]?.clientY || 0;
    if (Math.abs(currentY - touchStartY) > 16) document.activeElement?.blur?.();
  }, { passive: true });
  root.addEventListener("wheel", () => document.activeElement?.blur?.(), { passive: true });

  render();
}
