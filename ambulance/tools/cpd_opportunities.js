// DHP CPD opportunities. Gate Test uses its own static review helper until the
// shared Backend app-data route and R2 object are approved for publication.

const API_URL = "https://api.niwashibase.com/api/v1/ambulance/app-data/cpd-opportunities";
const TEST_HOST = location.hostname === "ios-gate-test.niwashibase.com"
  || location.hostname === "localhost"
  || location.hostname === "127.0.0.1"
  || (location.hostname === "yniwashi.github.io" && location.pathname.startsWith("/ios-gate-test/"));
const HELPER_URL = TEST_HOST
  ? new URL("../../helpers/cpd_opportunities.json", import.meta.url).href
  : API_URL;

const FORMAT_LABELS = { online:"Online", hybrid:"Blended / Hybrid", in_person:"In person", unknown:"Format unknown" };
const FORMAT_ORDER = { online:0, hybrid:1, in_person:2, unknown:3 };
const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", { timeZone:"Asia/Qatar", day:"numeric", month:"short", year:"numeric" });

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch (_) { return null; }
}

function qatarNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone:"Asia/Qatar", year:"numeric", month:"2-digit", day:"2-digit",
    hour:"2-digit", minute:"2-digit", hourCycle:"h23"
  }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type)?.value || "00";
  return { date:`${part("year")}-${part("month")}-${part("day")}`, time:`${part("hour")}:${part("minute")}` };
}

function isPast(session, now) {
  return session.end_date < now.date || (session.end_date === now.date && !!session.end_time && session.end_time < now.time);
}

function formattedDate(session) {
  const first = DATE_FORMAT.format(new Date(`${session.start_date}T12:00:00Z`));
  const last = session.end_date === session.start_date ? "" : ` – ${DATE_FORMAT.format(new Date(`${session.end_date}T12:00:00Z`))}`;
  const time = session.start_time ? ` · ${session.start_time}${session.end_time ? `–${session.end_time}` : ""}` : "";
  return `${first}${last}${time}`;
}

function internalOnly(activity) {
  return /internal staff only/i.test(activity.public_notes || "");
}

function creditText(credit) {
  const amount = Number(credit.amount);
  return `Category ${credit.category}: ${amount} ${amount === 1 ? "credit" : "credits"}${credit.basis === "per_session" ? " per session" : " for the activity"}`;
}

function moneyText(option) {
  const price = option.amount == null ? "Price not published" : option.amount === 0 ? "Free" : `${option.amount} ${option.currency || "QAR"}`;
  return `${option.label}: ${price}${option.notes ? ` · ${option.notes}` : ""}`;
}

function activityRows(data) {
  return data.activities.flatMap((activity) => activity.sessions.map((session) => ({ activity, session })));
}

function validate(data) {
  if (data?.helper_type !== "cpd_opportunities" || data?.schema_version !== "1.0" || !Array.isArray(data.activities)) {
    throw new Error("The CPD helper has an unsupported format.");
  }
  for (const activity of data.activities) {
    if (!activity?.id || !activity?.title || !Array.isArray(activity.sessions) || !Array.isArray(activity.credits)) {
      throw new Error("The CPD helper has an incomplete activity.");
    }
  }
  return data;
}

function renderDetails(activity, session, past) {
  const primarySource = safeUrl(activity.sources?.[0]?.url);
  const registrationUrl = !past && activity.registration?.status === "open" ? safeUrl(activity.registration.url) : null;
  const providerUrl = safeUrl(activity.provider?.url);
  const price = activity.pricing_options?.length
    ? activity.pricing_options.map((option) => `<li>${escapeHtml(moneyText(option))}</li>`).join("")
    : "<li>Price not published</li>";
  const eligibility = activity.eligibility || {};
  const paramedic = eligibility.paramedic === "yes" ? "Paramedics listed as eligible"
    : eligibility.paramedic === "no" ? "Paramedics not listed as eligible"
    : "Paramedic eligibility not confirmed";
  const allied = eligibility.allied_health === "yes" ? "Allied Health included"
    : eligibility.allied_health === "no" ? "Allied Health not included"
    : "Allied Health eligibility not confirmed";
  const code = activity.accreditation?.activity_code || "Not published";
  const reporting = activity.attendance_reporting?.status === "provider" ? "Provider reports attendance to DHP"
    : activity.attendance_reporting?.status === "practitioner" ? "Practitioner reports attendance to DHP"
    : "DHP attendance-reporting method not confirmed";
  return `
    <div class="cpd-detail">
      <div><strong>Provider</strong><span>${escapeHtml(activity.provider?.name || "Unknown")}</span></div>
      <div><strong>Venue</strong><span>${escapeHtml(session.venue || (session.format === "online" ? "Online" : "Not published"))}</span></div>
      <div><strong>Eligibility</strong><span>${escapeHtml(allied)} · ${escapeHtml(paramedic)}${eligibility.explanation ? ` · ${escapeHtml(eligibility.explanation)}` : ""}</span></div>
      <div><strong>DHP activity code</strong><span>${escapeHtml(code)}</span></div>
      <div><strong>Accreditation</strong><span>${activity.accreditation?.status === "confirmed" ? "Confirmed by linked source" : escapeHtml(activity.accreditation?.status || "Unknown")}</span></div>
      <div><strong>Attendance reporting</strong><span>${escapeHtml(reporting)}</span></div>
      <div><strong>Price</strong><ul>${price}</ul></div>
      <div><strong>Registration</strong><span>${escapeHtml(past ? "Event has passed" : activity.registration?.status === "open" ? "Open" : activity.registration?.status === "closed" ? "Closed" : activity.registration?.status === "full" ? "Full" : "Check with provider")}</span></div>
      ${activity.public_notes ? `<p class="cpd-note">${escapeHtml(activity.public_notes)}</p>` : ""}
      <div class="cpd-links">
        ${registrationUrl ? `<a href="${escapeHtml(registrationUrl)}" target="_blank" rel="noopener noreferrer">Register</a>` : ""}
        ${primarySource ? `<a href="${escapeHtml(primarySource)}" target="_blank" rel="noopener noreferrer">Verify activity</a>` : ""}
        ${providerUrl && providerUrl !== primarySource ? `<a href="${escapeHtml(providerUrl)}" target="_blank" rel="noopener noreferrer">Provider</a>` : ""}
      </div>
    </div>`;
}

function renderCard(row, past) {
  const { activity, session } = row;
  const internal = internalOnly(activity);
  const categories = [...new Set(activity.credits.map((credit) => credit.category))].sort();
  return `<details class="cpd-card">
    <summary>
      <span class="cpd-card-top"><span class="cpd-format">${escapeHtml(FORMAT_LABELS[session.format] || FORMAT_LABELS.unknown)}</span><span class="cpd-date">${escapeHtml(formattedDate(session))}</span></span>
      <strong class="cpd-title">${escapeHtml(activity.title)}</strong>
      <span class="cpd-provider">${escapeHtml(activity.provider?.name || "")}</span>
      <span class="cpd-pills">${categories.map((category) => `<span>Category ${category}</span>`).join("")}${internal ? `<span class="cpd-internal">${escapeHtml(activity.provider?.name || "Provider")} staff only</span>` : ""}</span>
      <span class="cpd-credit">${activity.credits.map(creditText).map(escapeHtml).join(" · ")}</span>
      <span class="cpd-expand">View details</span>
    </summary>
    ${renderDetails(activity, session, past)}
  </details>`;
}

export async function run(mountEl) {
  mountEl.innerHTML = `<style>
    .cpd-wrap{max-width:800px;margin:0 auto;padding:14px 12px 28px;color:var(--text)}
    .cpd-intro,.cpd-controls,.cpd-card,.cpd-empty{background:var(--surface);border:1px solid var(--border);border-radius:15px}
    .cpd-intro,.cpd-controls{padding:15px;margin-bottom:12px}
    .cpd-intro h2{font-size:19px;margin:0 0 5px}.cpd-intro p{font-size:13px;line-height:1.45;color:var(--muted);margin:0}
    .cpd-version{display:block;margin-top:8px;font-size:11px;color:var(--muted)}
    .cpd-controls{display:grid;gap:10px;grid-template-columns:repeat(2,minmax(0,1fr))}
    .cpd-controls label{display:grid;gap:5px;font-size:12px;font-weight:800;color:var(--muted)}
    .cpd-controls select{width:100%;min-height:43px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);font:inherit;padding:8px}
    .cpd-switches{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:10px 18px}
    .cpd-switches label{display:flex;align-items:center;gap:7px;color:var(--text);font-size:13px}
    .cpd-switches input{width:18px;height:18px;accent-color:#0f766e}
    .cpd-section{margin:18px 2px 9px;font-size:16px}.cpd-count{font-size:12px;color:var(--muted);font-weight:700}
    .cpd-card{margin:9px 0;overflow:hidden}.cpd-card summary{list-style:none;cursor:pointer;padding:14px;display:grid;gap:6px}
    .cpd-card summary::-webkit-details-marker{display:none}.cpd-card[open]{border-color:#0f766e}
    .cpd-card-top{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px;font-size:12px;font-weight:800}
    .cpd-format{color:#0f766e}.cpd-date{color:var(--muted)}.cpd-title{font-size:16px;line-height:1.3}.cpd-provider{color:var(--muted);font-size:13px}
    .cpd-pills{display:flex;flex-wrap:wrap;gap:5px}.cpd-pills span{padding:3px 7px;border-radius:7px;background:#e1f3ef;color:#075e51;font-size:11px;font-weight:800}
    .cpd-pills .cpd-internal{background:#fff0d6;color:#805000}.cpd-credit{font-size:12px;line-height:1.4}
    .cpd-expand{font-size:12px;font-weight:850;color:#0f766e}.cpd-card[open] .cpd-expand{display:none}
    .cpd-detail{border-top:1px solid var(--border);padding:13px 14px;display:grid;gap:11px;font-size:13px;line-height:1.4}
    .cpd-detail>div:not(.cpd-links){display:grid;gap:2px}.cpd-detail strong{font-size:11px;text-transform:uppercase;color:var(--muted)}
    .cpd-detail ul{margin:2px 0 0;padding-left:18px}.cpd-note{margin:0;padding:10px;background:var(--bg);border-radius:9px}
    .cpd-links{display:flex;flex-wrap:wrap;gap:8px}.cpd-links a{padding:9px 12px;border:1px solid #0f766e;border-radius:9px;color:#0f766e;text-decoration:none;font-weight:800}
    .cpd-empty{padding:15px;color:var(--muted);font-size:13px;line-height:1.5}
    :root[data-theme="dark"] .cpd-pills span{background:#193d37;color:#8ee0ce}
    :root[data-theme="dark"] .cpd-pills .cpd-internal{background:#4b3410;color:#ffd68a}
    @media(prefers-color-scheme:dark){:root[data-theme="auto"] .cpd-pills span{background:#193d37;color:#8ee0ce}:root[data-theme="auto"] .cpd-pills .cpd-internal{background:#4b3410;color:#ffd68a}}
    @media(max-width:390px){.cpd-wrap{padding:10px 9px 24px}.cpd-controls{grid-template-columns:1fr}}
  </style>
  <div class="cpd-wrap">
    <div class="cpd-intro"><h2>DHP CPD Opportunities</h2><p>Qatar activities in the 2026–2027 collection. Check the linked source before registering; dates and availability may change.</p><span class="cpd-version" id="cpdVersion"></span></div>
    <div class="cpd-controls">
      <label>Category<select id="cpdCategory"><option value="all">All categories</option><option value="1">Category 1</option><option value="2">Category 2</option><option value="3">Category 3</option></select></label>
      <label>Format<select id="cpdFormat"><option value="all">All formats</option><option value="online">Online</option><option value="hybrid">Blended / Hybrid</option><option value="in_person">In person</option></select></label>
      <label style="grid-column:1/-1">Provider<select id="cpdProvider"><option value="all">All providers</option></select></label>
      <div class="cpd-switches"><label><input id="cpdUpcomingOnly" type="checkbox" checked> Upcoming only</label><label><input id="cpdInternal" type="checkbox" checked> Include provider staff events</label></div>
    </div>
    <div id="cpdResults" aria-live="polite"><div class="cpd-empty">Loading CPD activities...</div></div>
  </div>`;
  const results = mountEl.querySelector("#cpdResults");
  const category = mountEl.querySelector("#cpdCategory");
  const format = mountEl.querySelector("#cpdFormat");
  const provider = mountEl.querySelector("#cpdProvider");
  const upcomingOnly = mountEl.querySelector("#cpdUpcomingOnly");
  const includeInternal = mountEl.querySelector("#cpdInternal");
  let data;
  try {
    const response = await fetch(HELPER_URL, { cache:"no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = validate(await response.json());
  } catch (_) {
    results.innerHTML = `<div class="cpd-empty">CPD activities could not be loaded. Please try again later.</div>`;
    return;
  }
  mountEl.querySelector("#cpdVersion").textContent = `Data version ${data.version || "unknown"} · Times shown in Qatar time`;
  const providers = [...new Set(data.activities.map((activity) => activity.provider?.name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  provider.innerHTML += providers.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  const rows = activityRows(data).filter((row) => row.activity.status !== "cancelled");
  function render() {
    const now = qatarNow();
    const filtered = rows.filter(({ activity, session }) =>
      (category.value === "all" || activity.credits.some((credit) => String(credit.category) === category.value))
      && (format.value === "all" || session.format === format.value)
      && (provider.value === "all" || activity.provider?.name === provider.value)
      && (includeInternal.checked || !internalOnly(activity))
    );
    const sortRows = (items, newestFirst = false) => items.sort((a, b) =>
      (FORMAT_ORDER[a.session.format] ?? 3) - (FORMAT_ORDER[b.session.format] ?? 3)
      || (newestFirst ? b.session.start_date.localeCompare(a.session.start_date) : a.session.start_date.localeCompare(b.session.start_date))
      || a.activity.title.localeCompare(b.activity.title)
    );
    const upcoming = sortRows(filtered.filter((row) => !isPast(row.session, now)));
    const past = sortRows(filtered.filter((row) => isPast(row.session, now)), true);
    results.innerHTML = `<h3 class="cpd-section">Upcoming <span class="cpd-count">${upcoming.length} sessions</span></h3>
      ${upcoming.length ? upcoming.map((row) => renderCard(row, false)).join("") : `<div class="cpd-empty">No upcoming sessions match these filters.</div>`}
      ${upcomingOnly.checked ? "" : `<h3 class="cpd-section">Past Events <span class="cpd-count">${past.length} sessions</span></h3>${past.length ? past.map((row) => renderCard(row, true)).join("") : `<div class="cpd-empty">No past sessions match these filters.</div>`}`}`;
  }
  for (const control of [category, format, provider, upcomingOnly, includeInternal]) control.addEventListener("change", render);
  results.addEventListener("touchmove", () => { if (document.activeElement?.matches("input,select")) document.activeElement.blur(); }, { passive:true });
  results.addEventListener("wheel", () => { if (document.activeElement?.matches("input,select")) document.activeElement.blur(); }, { passive:true });
  render();
}
