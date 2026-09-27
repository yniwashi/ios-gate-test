// DHP CPD opportunities. Gate Test uses its own static review helper until the
// shared Backend app-data route and R2 object are approved for publication.

const API_URL = "https://api.niwashibase.com/api/v1/ambulance/app-data/cpd-opportunities";
const TEST_HOST = location.hostname === "ios-gate-test.niwashibase.com"
  || location.hostname === "localhost"
  || location.hostname === "127.0.0.1"
  || (location.protocol === "http:" && location.port === "3000")
  || (location.hostname === "yniwashi.github.io" && location.pathname.startsWith("/ios-gate-test/"));
const HELPER_URL = TEST_HOST
  ? new URL("../../helpers/cpd_opportunities.json", import.meta.url).href
  : API_URL;

const FORMAT_LABELS = { online:"Online", hybrid:"Hybrid", in_person:"In person", unknown:"--" };
const FORMAT_ORDER = { online:0, hybrid:1, in_person:2, unknown:3 };
const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", { timeZone:"Asia/Qatar", day:"numeric", month:"short", year:"numeric" });
const DATE_DAY_MONTH_FORMAT = new Intl.DateTimeFormat("en-GB", { timeZone:"Asia/Qatar", day:"numeric", month:"short" });

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

async function copyLink(url) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(url); return true; }
    catch (_) {}
  }
  const input = document.createElement("textarea");
  input.value = url;
  input.setAttribute("readonly", "");
  input.style.cssText = "position:fixed;top:-1000px;left:-1000px";
  document.body.appendChild(input);
  input.select();
  input.setSelectionRange(0, input.value.length);
  let copied = false;
  try { copied = document.execCommand("copy"); }
  catch (_) {}
  input.remove();
  return copied;
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
  if (session.end_date === session.start_date) return first;
  const last = DATE_FORMAT.format(new Date(`${session.end_date}T12:00:00Z`));
  if (session.start_date.slice(0, 7) === session.end_date.slice(0, 7)) {
    return `${Number(session.start_date.slice(8))}–${last}`;
  }
  if (session.start_date.slice(0, 4) === session.end_date.slice(0, 4)) {
    return `${DATE_DAY_MONTH_FORMAT.format(new Date(`${session.start_date}T12:00:00Z`))}–${last}`;
  }
  return `${first}–${last}`;
}

function startDate(session) {
  return DATE_FORMAT.format(new Date(`${session.start_date}T12:00:00Z`));
}

function duration(session) {
  const start = Date.parse(`${session.start_date}T12:00:00Z`);
  const end = Date.parse(`${session.end_date}T12:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const days = Math.round((end - start) / 86400000) + 1;
  return `${days} days`;
}

function displayTitle(title) {
  return String(title).replace(/\s+20\d{2}\s*[/–-]\s*(?:20)?\d{2}\s*$/u, "").trim();
}

function internalOnly(activity) {
  return /\bstaff[ -]+only\b/i.test(activity.public_notes || "");
}

function isHmcProvider(activity) {
  return /\bHMC\b|\bHamad Medical Corporation\b/i.test(activity.provider?.name || "");
}

function fact(label, value, className = "") {
  return `<span class="cpd-fact ${className}"><span class="cpd-fact-label">${escapeHtml(label)}</span><span class="cpd-fact-value">${escapeHtml(value)}</span></span>`;
}

function applicableCredits(activity, session) {
  return activity.credits.filter((credit) => credit.amount != null && (!credit.session_ids || credit.session_ids.includes(session.id)));
}

function creditFacts(activity, session) {
  return applicableCredits(activity, session).sort((a, b) => Number(a.category) - Number(b.category))
    .map((credit) => {
      const amount = Number(credit.amount);
      return fact(`Category ${credit.category}`, `${amount} CPD ${amount === 1 ? "point" : "points"}`, "cpd-fact-credit");
    }).join("");
}

function priceFacts(activity, session) {
  const all = activity.pricing_options || [];
  const matching = all.filter((option) => !option.format || option.format === session.format);
  const options = matching.length ? matching : all;
  if (!options.length || options.some((option) => option.amount == null)) return [];
  const amountText = (option) => option.amount === 0 ? "Free" : `${option.amount} ${option.currency || "QAR"}`;
  const amounts = [...new Set(options.map(amountText))];
  if (amounts.length === 1) return [fact("Price", amounts[0], "cpd-fact-price")];
  const currencies = [...new Set(options.map((option) => option.currency || "QAR"))];
  if (options.length === 2 && (options.some((option) => option.amount === 0) || currencies.length !== 1)) {
    return options.map((option) => fact(option.label || "Price", amountText(option), "cpd-fact-price"));
  }
  if (currencies.length !== 1) return [];
  const paid = options.filter((option) => option.amount > 0).map((option) => Number(option.amount));
  const hasFree = options.some((option) => option.amount === 0);
  const paidPrice = paid.length ? fact(paid.length === 1 || Math.min(...paid) === Math.max(...paid) ? hasFree ? "Paid price" : "Price" : hasFree ? "Paid range" : "Price range",
    paid.length === 1 || Math.min(...paid) === Math.max(...paid) ? `${paid[0]} ${currencies[0]}` : `${Math.min(...paid)}–${Math.max(...paid)} ${currencies[0]}`, "cpd-fact-price") : "";
  return hasFree
    ? [paidPrice, fact("Free option", "Free", "cpd-fact-price")].filter(Boolean)
    : [paidPrice];
}

function moneyText(option) {
  const price = option.amount === 0 ? "Free" : `${option.amount} ${option.currency || "QAR"}`;
  return `${option.label}: ${price}${option.audience && option.audience !== option.label ? ` · ${option.audience}` : ""}${option.notes ? ` · ${option.notes}` : ""}`;
}

function sessionTime(session) {
  return session.start_time ? `${session.start_time}${session.end_time ? `–${session.end_time}` : ""}` : "";
}

function detailItem(label, value, wide = false) {
  return value ? `<div class="cpd-detail-item${wide ? " cpd-detail-wide" : ""}"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>` : "";
}

function sharedValue(sessions, getValue) {
  const values = sessions.map(getValue);
  return values.every((value) => value === values[0]) ? values[0] : null;
}

function creditKey(activity, session) {
  return applicableCredits(activity, session).map((credit) => `${credit.category}:${credit.amount}`).join("|");
}

function activityRows(data) {
  return data.activities.flatMap((activity) => activity.sessions.map((session) => ({ activity, session })));
}

function groupRows(rows) {
  const groups = new Map();
  for (const { activity, session } of rows) {
    if (!groups.has(activity.id)) groups.set(activity.id, { activity, sessions:[] });
    groups.get(activity.id).sessions.push(session);
  }
  return [...groups.values()];
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

function renderDateList(activity, sessions, past) {
  const different = (getValue) => sessions.some((item) => getValue(item) !== getValue(sessions[0]));
  const timeVaries = different(sessionTime);
  const venueVaries = different((item) => item.venue || "");
  const formatVaries = different((item) => item.format);
  const durationVaries = different(duration);
  const creditsVary = different((item) => creditKey(activity, item));
  const detailed = timeVaries || venueVaries || formatVaries || durationVaries || creditsVary;
  const dates = sessions.map((session) => {
    const extras = [
      timeVaries && sessionTime(session) ? `Time: ${sessionTime(session)}` : "",
      venueVaries && session.venue ? `Venue: ${session.venue}` : "",
      formatVaries && session.format !== "unknown" ? `Format: ${FORMAT_LABELS[session.format]}` : "",
      durationVaries && duration(session) ? `Duration: ${duration(session)}` : "",
      creditsVary ? applicableCredits(activity, session).map((credit) => `Category ${credit.category}: ${credit.amount} CPD ${Number(credit.amount) === 1 ? "point" : "points"}`).join(" · ") : ""
    ].filter(Boolean);
    return `<li><strong>${escapeHtml(formattedDate(session))}</strong>${extras.length ? `<span class="cpd-date-extra">${extras.map((value) => `<span>${escapeHtml(value)}</span>`).join("")}</span>` : ""}</li>`;
  }).join("");
  return `<div class="cpd-date-section"><strong>${past ? "Past dates" : "Available dates"}</strong><ul class="cpd-date-list${detailed ? " cpd-date-list-detailed" : ""}">${dates}</ul></div>`;
}

function renderDetails(activity, sessions, past) {
  const session = sessions[0];
  const primarySource = safeUrl(activity.sources?.[0]?.url);
  const registrationUrl = !past && activity.registration?.status === "open" ? safeUrl(activity.registration.url) : null;
  const providerUrl = safeUrl(activity.provider?.url);
  const prices = [...new Set((activity.pricing_options || []).filter((option) => option.amount != null).map(moneyText))];
  const price = prices.length > 1
    ? `<ul>${prices.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>`
    : prices.length ? `<span>${escapeHtml(prices[0])}</span>` : "";
  const eligibility = activity.eligibility || {};
  const audience = [eligibility.allied_health === "yes" ? "Allied Health" : null,
    eligibility.paramedic === "yes" ? "Paramedics" : null].filter(Boolean).join(", ");
  const code = activity.accreditation?.activity_code;
  const reporting = activity.attendance_reporting?.status === "provider" ? "Provider reports attendance to DHP"
    : activity.attendance_reporting?.status === "practitioner" ? "Practitioner reports attendance to DHP"
    : "";
  const registration = activity.registration?.status;
  const registrationText = past ? "" : { open:"Open", not_open:"Not open", closed:"Closed", full:"Full", not_applicable:"Not applicable" }[registration] || "";
  const note = activity.public_notes && !/^(?:Internal|HMC) staff[ -]+only(?: according to the DHP activity listing)?\.$/i.test(activity.public_notes)
    ? `<p class="cpd-note">${escapeHtml(activity.public_notes)}</p>` : "";
  const detailRows = [
    sessions.length === 1 && duration(session) ? detailItem("Dates", formattedDate(session), true) : "",
    detailItem("Time", sharedValue(sessions, sessionTime)),
    detailItem("Venue", sharedValue(sessions, (item) => item.venue || "")),
    detailItem("Audience", audience),
    detailItem("DHP code", code),
    activity.accreditation?.status === "confirmed" ? detailItem("Accreditation", "Confirmed") : "",
    detailItem("Attendance reporting", reporting),
    price ? `<div class="cpd-detail-item cpd-detail-wide"><strong>Price</strong>${price}</div>` : "",
    detailItem("Registration", registrationText)
  ].filter(Boolean).join("");
  const links = [
    registrationUrl ? `<a href="${escapeHtml(registrationUrl)}" target="_blank" rel="noopener noreferrer">Register for activity</a>` : "",
    primarySource ? `<a href="${escapeHtml(primarySource)}" target="_blank" rel="noopener noreferrer">Verify activity</a>` : "",
    providerUrl && providerUrl !== primarySource ? `<a href="${escapeHtml(providerUrl)}" target="_blank" rel="noopener noreferrer">Provider</a>` : ""
  ].filter(Boolean).join("");
  return `
    <div class="cpd-detail">
      ${sessions.length > 1 ? renderDateList(activity, sessions, past) : ""}
      ${detailRows ? `<div class="cpd-detail-grid">${detailRows}</div>` : ""}
      ${note}
      ${links ? `<div class="cpd-links">${links}</div>` : ""}
    </div>`;
}

function renderCard(group, past) {
  const { activity, sessions } = group;
  const session = sessions[0];
  const internal = internalOnly(activity);
  const prices = priceFacts(activity, session);
  const span = duration(session);
  const formats = [...new Set(sessions.map((item) => item.format))];
  const format = formats.length === 1 ? FORMAT_LABELS[formats[0]] : "Multiple formats";
  const uniqueDates = new Set(sessions.map((item) => item.start_date)).size;
  const dateCountLabel = uniqueDates === sessions.length ? `${sessions.length} dates` : `${sessions.length} sessions`;
  const factCount = applicableCredits(activity, session).length + prices.length + 1 + Number(Boolean(span)) + Number(Boolean(format && format !== "--"));
  return `<details class="cpd-card">
    <summary>
      <strong class="cpd-title">${escapeHtml(displayTitle(activity.title))}</strong>
      <span class="cpd-provider"><span>Provider</span><strong>${escapeHtml(activity.provider?.name || "--")}</strong></span>
      <span class="cpd-facts cpd-facts-${factCount}">${creditFacts(activity, session)}${prices.join("")}${fact(sessions.length > 1 ? past ? "Latest date" : "Next date" : "Date", startDate(session), "cpd-fact-date")}${span ? fact("Duration", span, "cpd-fact-duration") : ""}${format && format !== "--" ? fact("Format", format, "cpd-fact-format") : ""}</span>
      ${internal ? `<span class="cpd-internal">HMC staff only</span>` : ""}
      <span class="cpd-expand"><span class="cpd-expand-main"><span class="cpd-show">View details</span><span class="cpd-hide">Hide details</span></span>${sessions.length > 1 ? `<span class="cpd-expand-count">${escapeHtml(dateCountLabel)}</span>` : ""}<span class="cpd-expand-icon" aria-hidden="true"><svg viewBox="0 0 20 20" width="20" height="20" fill="none"><path d="m4 7 6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></span>
    </summary>
    ${renderDetails(activity, sessions, past)}
  </details>`;
}

export async function run(mountEl) {
  mountEl.innerHTML = `<style>
    .cpd-wrap{max-width:800px;margin:0 auto;padding:14px 12px 28px;color:var(--text)}
    .cpd-intro,.cpd-controls,.cpd-card,.cpd-empty{background:var(--surface);border:1px solid var(--border);border-radius:15px}
    .cpd-intro{padding:15px;margin-bottom:12px}.cpd-controls{margin-bottom:12px;overflow:hidden}
    .cpd-intro h2{font-size:19px;margin:0 0 9px}.cpd-meta{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:7px}
    .cpd-intro p{font-size:13px;line-height:1.45;color:var(--muted);margin:0}.cpd-update{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:11px;font-weight:800}
    .cpd-updated{display:inline-block;padding:5px 9px;border-radius:999px;background:var(--bg);color:var(--text);font-size:11px;font-weight:800;white-space:nowrap}
    .cpd-intro .cpd-tip{margin-top:11px;padding-top:10px;border-top:1px solid var(--border);font-size:12px}
    .cpd-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-bottom:12px}
    .cpd-tabs button{min-height:44px;padding:8px;border:1px solid var(--border);border-radius:11px;background:var(--surface);color:var(--muted);font:inherit;font-size:13px;font-weight:800;cursor:pointer}
    .cpd-tabs button[aria-pressed="true"]{background:#0f766e;border-color:#0f766e;color:#fff}
    .cpd-tabs button:focus-visible{outline:2px solid #0f766e;outline-offset:2px}
    .cpd-filter-heading{padding:14px 14px 0;font-size:14px;font-weight:850;color:var(--text)}
    .cpd-filter-fields{display:grid;gap:10px;grid-template-columns:repeat(2,minmax(0,1fr));padding:12px 14px 14px}
    .cpd-controls label{display:grid;grid-template-columns:minmax(0,1fr);min-width:0;gap:5px;font-size:12px;font-weight:800;color:var(--muted)}
    .cpd-controls select,.cpd-controls input[type="date"]{box-sizing:border-box;width:100%;min-width:0;min-height:43px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);font:inherit;padding:8px}
    .cpd-controls .cpd-date-filter{display:flex;flex-direction:column;align-items:stretch}
    .cpd-controls .cpd-date-filter input[type="date"]{width:auto;max-width:100%;flex:none}
    .cpd-date-actions,.cpd-filter-error{grid-column:1/-1}
    .cpd-date-actions{display:flex;align-items:center;justify-content:space-between;gap:10px}.cpd-date-actions span{font-size:11px;color:var(--muted)}
    .cpd-date-actions button{min-height:36px;padding:6px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font:inherit;font-size:12px;font-weight:800}
    .cpd-filter-error{color:#a33a2b;font-size:12px;font-weight:750}.cpd-filter-error[hidden]{display:none}
    .cpd-switches{grid-column:1/-1;border-top:1px solid var(--border);padding-top:10px}.cpd-switches[hidden]{display:none}
    .cpd-switches label{display:flex;align-items:center;gap:9px;color:var(--text);font-size:13px;font-weight:800}
    .cpd-switches input{width:20px;height:20px;accent-color:#0f766e;flex:none}
    .cpd-section{margin:18px 2px 9px;font-size:16px}.cpd-count{font-size:12px;color:var(--muted);font-weight:700}
    .cpd-card{margin:11px 0;overflow:hidden;border-color:#d5e1e4;box-shadow:0 3px 12px rgba(15,35,50,.09)}.cpd-card>summary{list-style:none;cursor:pointer;padding:14px;display:grid;gap:6px}
    .cpd-card>summary::-webkit-details-marker{display:none}.cpd-card[open]{border-color:#80beb3;box-shadow:0 5px 18px rgba(15,35,50,.13)}
    .cpd-title{font-size:16px;line-height:1.3}.cpd-provider{display:grid;gap:3px;padding:8px 10px;border-left:3px solid #0f766e;border-radius:7px;background:var(--bg)}
    .cpd-provider span{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}.cpd-provider strong{font-size:14px;line-height:1.3;color:var(--text)}
    .cpd-facts{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin-top:4px}.cpd-fact{grid-column:span 2;display:grid;grid-template-rows:1fr auto;gap:4px;min-width:0;text-align:center}
    .cpd-facts-1>.cpd-fact{grid-column:span 6}.cpd-facts-2>.cpd-fact{grid-column:span 3}
    .cpd-facts-4>.cpd-fact:last-child,.cpd-facts-7>.cpd-fact:last-child{grid-column:span 6}
    .cpd-facts-5>.cpd-fact:nth-child(n+4),.cpd-facts-8>.cpd-fact:nth-child(n+7){grid-column:span 3}
    .cpd-fact-label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
    .cpd-fact-value{display:inline-block;box-sizing:border-box;width:100%;padding:6px 7px;border-radius:8px;background:#e1f3ef;color:#075e51;font-size:clamp(10px,2.9vw,12px);font-weight:800;line-height:1.3;white-space:nowrap}
    .cpd-fact-date .cpd-fact-value,.cpd-fact-format .cpd-fact-value{background:var(--bg);color:var(--text);border:1px solid var(--border)}
    .cpd-fact-date .cpd-fact-value{white-space:normal}.cpd-internal{display:inline-block;width:max-content;max-width:100%;padding:5px 8px;border-radius:8px;background:#fff0d6;color:#805000;font-size:12px;font-weight:800}
    .cpd-expand{display:flex;align-items:center;gap:9px;box-sizing:border-box;width:100%;min-height:50px;margin-top:7px;padding:10px 13px;border:1px solid #b8dcd5;border-radius:10px;background:#e3f4f0;color:#075e51;font-size:14px;font-weight:850}
    .cpd-expand-count{margin-left:auto;padding:4px 8px;border-radius:999px;background:#cce9e2;font-size:11px;white-space:nowrap}
    .cpd-expand-icon{display:inline-flex;align-items:center;justify-content:center;margin-left:auto;transition:transform .18s ease}.cpd-expand-count+.cpd-expand-icon{margin-left:0}
    .cpd-card>summary:focus-visible .cpd-expand{outline:2px solid #0f766e;outline-offset:2px}
    .cpd-expand .cpd-hide{display:none}.cpd-card[open]>summary .cpd-expand .cpd-show{display:none}.cpd-card[open]>summary .cpd-expand .cpd-hide{display:inline}
    .cpd-card[open]>summary .cpd-expand-icon{transform:rotate(180deg)}
    .cpd-detail{border-top:1px solid var(--border);padding:13px 14px;display:grid;gap:11px;font-size:13px;line-height:1.4}
    .cpd-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.cpd-detail-item{min-width:0;display:grid;align-content:start;gap:2px}
    .cpd-detail-item strong{font-size:11px;text-transform:uppercase;color:var(--muted)}.cpd-detail-wide{grid-column:1/-1}
    .cpd-detail ul{margin:2px 0 0;padding-left:18px}.cpd-note{margin:0;padding:10px;background:var(--bg);border-radius:9px}
    .cpd-date-section{display:grid;gap:7px}.cpd-date-section>strong{font-size:11px;text-transform:uppercase;color:var(--muted)}
    .cpd-detail .cpd-date-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:0;padding:0;list-style:none}
    .cpd-date-list li{display:grid;gap:4px;align-content:start;min-width:0;padding:8px 10px;border:1px solid var(--border);border-radius:9px;background:var(--bg)}
    .cpd-date-list li>strong{font-size:12px;color:var(--text)}.cpd-detail .cpd-date-list-detailed{grid-template-columns:1fr}
    .cpd-date-extra{display:grid;gap:2px;color:var(--muted);font-size:11px}
    .cpd-links{display:flex;flex-wrap:wrap;gap:8px}.cpd-links a{display:inline-flex;align-items:center;box-sizing:border-box;min-height:44px;padding:9px 12px;border:1px solid #0f766e;border-radius:9px;color:#0f766e;text-decoration:none;font-weight:800}
    .cpd-link-dialog{box-sizing:border-box;width:100vw;max-width:none;height:100dvh;max-height:none;margin:0;padding:18px;border:0;background:rgba(15,23,42,.58);place-items:center;z-index:10000}
    .cpd-link-dialog[open]{display:grid}.cpd-link-dialog::backdrop{background:transparent}
    .cpd-link-sheet{width:min(420px,100%);padding:20px;border:1px solid var(--border);border-radius:17px;background:var(--surface);color:var(--text);box-shadow:0 22px 54px rgba(2,6,23,.3)}
    .cpd-link-sheet h3{margin:0 0 7px;font-size:18px}.cpd-link-sheet p{margin:0 0 16px;color:var(--muted);font-size:13px;line-height:1.45}
    .cpd-link-actions{display:grid;gap:9px}.cpd-link-actions button{min-height:46px;padding:9px 12px;border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text);font:inherit;font-size:14px;font-weight:800;text-align:center}
    .cpd-link-actions .cpd-link-open{background:#0f766e;border-color:#0f766e;color:#fff}.cpd-link-actions .cpd-link-cancel{background:transparent;color:var(--muted)}
    .cpd-link-actions button:focus-visible{outline:2px solid #0f766e;outline-offset:2px}
    .cpd-link-copy-fallback[hidden]{display:none}.cpd-link-copy-fallback{margin-top:12px}.cpd-link-copy-fallback p{margin:0 0 6px}
    .cpd-link-copy-fallback input{box-sizing:border-box;width:100%;min-height:42px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font:inherit;font-size:12px}
    .cpd-link-feedback{position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:10001;max-width:min(90vw,360px);padding:10px 14px;border-radius:10px;background:#0f766e;color:#fff;font-size:13px;font-weight:800;box-shadow:0 8px 24px rgba(2,6,23,.25);text-align:center;pointer-events:none}
    .cpd-empty{padding:15px;color:var(--muted);font-size:13px;line-height:1.5}
    :root[data-theme="dark"] .cpd-fact-value{background:#193d37;color:#8ee0ce}
    :root[data-theme="dark"] .cpd-fact-date .cpd-fact-value,:root[data-theme="dark"] .cpd-fact-format .cpd-fact-value{background:var(--bg);color:var(--text)}
    :root[data-theme="dark"] .cpd-internal{background:#4b3410;color:#ffd68a}
    :root[data-theme="dark"] .cpd-card{border-color:var(--border);box-shadow:0 4px 15px rgba(0,0,0,.3)}
    :root[data-theme="dark"] .cpd-card[open]{border-color:#4c9286}
    :root[data-theme="dark"] .cpd-expand{background:#183e38;border-color:#376e64;color:#b9eee2}
    :root[data-theme="dark"] .cpd-expand-count{background:#28564d}
    :root[data-theme="dark"] .cpd-links a{border-color:#4a9e8f;color:#8ee0ce}
    @media(prefers-color-scheme:dark){:root[data-theme="auto"] .cpd-fact-value{background:#193d37;color:#8ee0ce}:root[data-theme="auto"] .cpd-fact-date .cpd-fact-value,:root[data-theme="auto"] .cpd-fact-format .cpd-fact-value{background:var(--bg);color:var(--text)}:root[data-theme="auto"] .cpd-internal{background:#4b3410;color:#ffd68a}:root[data-theme="auto"] .cpd-card{border-color:var(--border);box-shadow:0 4px 15px rgba(0,0,0,.3)}:root[data-theme="auto"] .cpd-card[open]{border-color:#4c9286}:root[data-theme="auto"] .cpd-expand{background:#183e38;border-color:#376e64;color:#b9eee2}:root[data-theme="auto"] .cpd-expand-count{background:#28564d}:root[data-theme="auto"] .cpd-links a{border-color:#4a9e8f;color:#8ee0ce}}
    @media(max-width:480px){.cpd-date-filter{grid-column:1/-1}}
    @media(max-width:390px){.cpd-wrap{padding:10px 9px 24px}.cpd-filter-fields{grid-template-columns:1fr}}
  </style>
  <div class="cpd-wrap">
    <div class="cpd-intro"><h2>Qatar CPD Opportunities</h2><div class="cpd-meta"><p id="cpdCoverage">CPD activities</p><span class="cpd-update"><span>Updated</span><span class="cpd-updated" id="cpdUpdated">--</span></span></div><p class="cpd-tip">Tip: If you press <strong>Open inside Ambulance App</strong> for a CPD link, swipe from left to right to return to CPD. Or press <strong>Copy link</strong> to paste it into another browser.</p></div>
    <div class="cpd-tabs" role="group" aria-label="CPD event period"><button id="cpdTabUpcoming" type="button" aria-pressed="true" aria-controls="cpdResults">Upcoming</button><button id="cpdTabPast" type="button" aria-pressed="false" aria-controls="cpdResults">Past Events</button></div>
    <div class="cpd-controls" id="cpdFilters"><div class="cpd-filter-heading">Filters</div><div class="cpd-filter-fields">
      <label>Category<select id="cpdCategory"><option value="all">All categories</option><option value="1">Category 1</option><option value="2">Category 2</option><option value="3">Category 3</option></select></label>
      <label>Format<select id="cpdFormat"><option value="all">All formats</option><option value="online">Online</option><option value="hybrid">Blended / Hybrid</option><option value="in_person">In person</option></select></label>
      <label style="grid-column:1/-1">Provider<select id="cpdProvider"><option value="all">All providers</option></select></label>
      <label class="cpd-date-filter">From date<input id="cpdDateFrom" type="date"></label>
      <label class="cpd-date-filter">To date<input id="cpdDateTo" type="date"></label>
      <div class="cpd-date-actions"><span>Leave either date empty for an open-ended range.</span><button id="cpdClearDates" type="button">Clear dates</button></div>
      <div class="cpd-filter-error" id="cpdFilterError" role="status" hidden></div>
      <div class="cpd-switches" id="cpdInternalControl" hidden><label><input id="cpdInternal" type="checkbox" checked> Show HMC staff-only events</label></div>
    </div></div>
    <div id="cpdResults" aria-live="polite"><div class="cpd-empty">Loading CPD activities...</div></div>
    <div id="cpdLinkDialogHost"></div>
  </div>`;
  const results = mountEl.querySelector("#cpdResults");
  const dateFrom = mountEl.querySelector("#cpdDateFrom");
  const dateTo = mountEl.querySelector("#cpdDateTo");
  const filterError = mountEl.querySelector("#cpdFilterError");
  const category = mountEl.querySelector("#cpdCategory");
  const format = mountEl.querySelector("#cpdFormat");
  const provider = mountEl.querySelector("#cpdProvider");
  const upcomingTab = mountEl.querySelector("#cpdTabUpcoming");
  const pastTab = mountEl.querySelector("#cpdTabPast");
  const includeInternal = mountEl.querySelector("#cpdInternal");
  const dialogHost = mountEl.querySelector("#cpdLinkDialogHost");
  let activePeriod = "upcoming";
  let feedbackTimer;
  let linkFeedback;
  let data;
  try {
    const response = await fetch(HELPER_URL, { cache:"no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = validate(await response.json());
  } catch (_) {
    results.innerHTML = `<div class="cpd-empty">CPD activities could not be loaded. Please try again later.</div>`;
    return;
  }
  const updatedDate = /^\d{4}-\d{2}-\d{2}/.exec(data.updated_at || "")?.[0];
  const updated = mountEl.querySelector("#cpdUpdated");
  updated.textContent = updatedDate ? DATE_FORMAT.format(new Date(`${updatedDate}T12:00:00Z`)) : "--";
  const coverageStart = /^\d{4}/.exec(data.coverage?.start_date || "")?.[0];
  const coverageEnd = /^\d{4}/.exec(data.coverage?.end_date || "")?.[0];
  mountEl.querySelector("#cpdCoverage").textContent = coverageStart && coverageEnd ? `Coverage: ${coverageStart}–${coverageEnd}` : "CPD activities";
  const visibleActivities = data.activities.filter((activity) => !internalOnly(activity) || isHmcProvider(activity));
  mountEl.querySelector("#cpdInternalControl").hidden = !visibleActivities.some((activity) => internalOnly(activity));
  const providers = [...new Set(visibleActivities.map((activity) => activity.provider?.name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  provider.innerHTML += providers.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  const rows = activityRows({ activities:visibleActivities }).filter((row) => row.activity.status !== "cancelled");
  function render() {
    const now = qatarNow();
    const invalidRange = !!(dateFrom.value && dateTo.value && dateTo.value < dateFrom.value);
    filterError.textContent = invalidRange ? "To date must be on or after From date." : "";
    filterError.hidden = !invalidRange;
    const filtered = rows.filter(({ activity, session }) =>
      !invalidRange
      && (!dateFrom.value || session.end_date >= dateFrom.value)
      && (!dateTo.value || session.start_date <= dateTo.value)
      && (category.value === "all" || activity.credits.some((credit) => String(credit.category) === category.value && (!credit.session_ids || credit.session_ids.includes(session.id))))
      && (format.value === "all" || session.format === format.value)
      && (provider.value === "all" || activity.provider?.name === provider.value)
      && (includeInternal.checked || !internalOnly(activity))
    );
    const sortRows = (items, newestFirst = false) => items.sort((a, b) =>
      (newestFirst ? b.session.start_date.localeCompare(a.session.start_date) : a.session.start_date.localeCompare(b.session.start_date))
      || (FORMAT_ORDER[a.session.format] ?? 3) - (FORMAT_ORDER[b.session.format] ?? 3)
      || a.activity.title.localeCompare(b.activity.title)
    );
    const upcoming = sortRows(filtered.filter((row) => !isPast(row.session, now)));
    const past = sortRows(filtered.filter((row) => isPast(row.session, now)), true);
    const upcomingGroups = groupRows(upcoming);
    const pastGroups = groupRows(past);
    upcomingTab.textContent = `Upcoming (${upcomingGroups.length})`;
    pastTab.textContent = `Past Events (${pastGroups.length})`;
    upcomingTab.setAttribute("aria-pressed", String(activePeriod === "upcoming"));
    pastTab.setAttribute("aria-pressed", String(activePeriod === "past"));
    const selected = activePeriod === "past" ? pastGroups : upcomingGroups;
    const sessionCount = activePeriod === "past" ? past.length : upcoming.length;
    const label = activePeriod === "past" ? "Past Events" : "Upcoming";
    results.innerHTML = `<h3 class="cpd-section">${label} <span class="cpd-count">${selected.length} activities · ${sessionCount} sessions</span></h3>
      ${selected.length ? selected.map((group) => renderCard(group, activePeriod === "past")).join("") : `<div class="cpd-empty">${invalidRange ? "Correct the date range to see activities." : `No ${activePeriod} activities match these filters.`}</div>`}`;
  }
  upcomingTab.addEventListener("click", () => { activePeriod = "upcoming"; render(); });
  pastTab.addEventListener("click", () => { activePeriod = "past"; render(); });
  for (const control of [category, format, provider, includeInternal]) control.addEventListener("change", render);
  for (const control of [dateFrom, dateTo]) control.addEventListener("change", render);
  mountEl.querySelector("#cpdClearDates").addEventListener("click", () => { dateFrom.value = ""; dateTo.value = ""; render(); });
  function showLinkFeedback(message) {
    linkFeedback?.remove();
    linkFeedback = document.createElement("div");
    linkFeedback.className = "cpd-link-feedback";
    linkFeedback.setAttribute("role", "status");
    linkFeedback.textContent = message;
    document.body.appendChild(linkFeedback);
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => { linkFeedback?.remove(); linkFeedback = null; }, 2800);
  }
  function showLinkOptions(link) {
    const url = safeUrl(link.href);
    if (!url) return;
    dialogHost.innerHTML = `<dialog class="cpd-link-dialog" aria-labelledby="cpdLinkTitle">
      <div class="cpd-link-sheet">
        <h3 id="cpdLinkTitle">${escapeHtml(link.textContent.trim())}</h3>
        <p>Choose how to use this CPD link.</p>
        <div class="cpd-link-actions">
          <button type="button" class="cpd-link-copy">Copy link</button>
          <button type="button" class="cpd-link-open">Open inside Ambulance App</button>
          <button type="button" class="cpd-link-cancel">Cancel</button>
        </div>
        <div class="cpd-link-copy-fallback" hidden><p>Automatic copy is unavailable. Touch and hold this link to copy it.</p><input type="text" readonly value="${escapeHtml(url)}" aria-label="CPD link to copy"></div>
      </div>
    </dialog>`;
    const dialog = dialogHost.querySelector("dialog");
    const close = () => {
      if (dialog?.open) dialog.close();
      dialogHost.innerHTML = "";
      link.focus();
    };
    if (typeof dialog?.showModal === "function") dialog.showModal();
    else dialog?.setAttribute("open", "");
    dialogHost.querySelector(".cpd-link-cancel")?.addEventListener("click", close);
    dialogHost.querySelector(".cpd-link-open")?.addEventListener("click", () => {
      close();
      window.open(url, "_blank", "noopener,noreferrer");
    });
    dialogHost.querySelector(".cpd-link-copy")?.addEventListener("click", async () => {
      if (await copyLink(url)) { close(); showLinkFeedback("Link copied"); }
      else {
        const fallback = dialogHost.querySelector(".cpd-link-copy-fallback");
        fallback.hidden = false;
        fallback.querySelector("input").select();
      }
    });
    dialog?.addEventListener("click", (event) => { if (event.target === dialog) close(); });
    dialog?.addEventListener("cancel", (event) => { event.preventDefault(); close(); });
  }
  results.addEventListener("click", (event) => {
    const link = event.target.closest(".cpd-links a");
    if (!link) return;
    event.preventDefault();
    showLinkOptions(link);
  });
  results.addEventListener("toggle", (event) => {
    if (!event.target.open) return;
    if (event.target.matches(".cpd-card")) {
      for (const card of results.querySelectorAll(".cpd-card[open]")) {
        if (card !== event.target) card.open = false;
      }
    }
  }, true);
  results.addEventListener("touchmove", () => { if (document.activeElement?.matches("input,select")) document.activeElement.blur(); }, { passive:true });
  results.addEventListener("wheel", () => { if (document.activeElement?.matches("input,select")) document.activeElement.blur(); }, { passive:true });
  render();
}
