// /ambulance/tools/overtime.js
// CHANGELOG (2026-06-07):
// - Add salary hints, strengthen saved-salary reuse, structure full-width history records, and match Android PDF styling.
// - Rebuild Overtime with Android-aligned Add, History, Calculator, and Settings workflows.
// - Add local records, period summaries, selection/deletion, CSV/JSON/PDF export, and JSON backup restore.

const STORE = {
  salary: "ambulance_overtime_basic_salary_v2",
  records: "ambulance_overtime_records_v2",
  warningHidden: "ambulance_overtime_warning_hidden_v2",
  showSalaryPdf: "ambulance_overtime_show_salary_pdf_v2"
};

const TYPES = {
  REGULAR: { label: "Regular OT", factor: 0.0058333 },
  RAMADAN: { label: "Ramadan OT", factor: 0.009333 }
};

const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value == null ? fallback : value;
  } catch (_) {
    return fallback;
  }
}

function readNumber(key) {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function saveRecords(records) {
  localStorage.setItem(STORE.records, JSON.stringify(records));
}

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

function calculateAmount(salary, hours, factor) {
  return salary * hours * 1.25 * factor;
}

function ceilOne(value) {
  return Math.ceil(value * 10) / 10;
}

function rounded(value, digits = 2) {
  return Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: digits,
    useGrouping: false
  });
}

function oneDecimal(value) {
  return Number(value || 0).toFixed(1);
}

function dateInputValue(millis = Date.now()) {
  const date = new Date(millis);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function shortDate(millis) {
  const date = new Date(millis);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shortDateTime(millis) {
  const date = new Date(millis);
  return `${shortDate(millis)} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function displayDateTime(millis) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).format(new Date(millis));
}

function startOfDay(millis) {
  const date = new Date(millis);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function endOfDay(millis) {
  const date = new Date(millis);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

function startOfMonth() {
  const date = new Date();
  date.setDate(1);
  return startOfDay(date.getTime());
}

function dateOnlyValue(millis) {
  return shortDate(millis);
}

function summary(records) {
  return {
    totalHours: records.reduce((sum, record) => sum + record.hours, 0),
    regularHours: records.filter(record => record.type === "REGULAR").reduce((sum, record) => sum + record.hours, 0),
    ramadanHours: records.filter(record => record.type === "RAMADAN").reduce((sum, record) => sum + record.hours, 0),
    totalQar: records.reduce((sum, record) => sum + record.amountQar, 0),
    count: records.length
  };
}

function periodBounds(filter, customStart, customEnd) {
  const now = new Date();
  if (filter === "ALL") return [-Infinity, Infinity];
  if (filter === "THIS_MONTH") return [startOfMonth(), endOfDay(Date.now())];
  if (filter === "LAST_MONTH") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return [startOfDay(start.getTime()), endOfDay(end.getTime())];
  }
  if (filter === "THIS_YEAR") {
    return [new Date(now.getFullYear(), 0, 1).getTime(), endOfDay(Date.now())];
  }
  return [Math.min(customStart, customEnd), Math.max(customStart, customEnd)];
}

function periodLabel(filter, customStart, customEnd) {
  const labels = {
    ALL: "All", THIS_MONTH: "This Month", LAST_MONTH: "Last Month", THIS_YEAR: "This Year"
  };
  return filter === "CUSTOM" ? `${shortDate(customStart)} - ${shortDate(customEnd)}` : labels[filter];
}

function normalizeRecord(item) {
  if (!item || typeof item !== "object") return null;
  const factor = Number(item.factor ?? item.f ?? 0);
  const rawType = String(item.type ?? item.c ?? "").toUpperCase();
  const type = rawType.includes("RAMADAN") || Math.abs(factor - TYPES.RAMADAN.factor) < 0.0000001
    ? "RAMADAN"
    : rawType.includes("REGULAR") || Math.abs(factor - TYPES.REGULAR.factor) < 0.0000001
      ? "REGULAR"
      : null;
  const id = String(item.id ?? item.a ?? "").trim();
  const dateTimeMillis = Number(item.dateTimeMillis ?? item.b ?? 0);
  const hours = Number(item.hours ?? item.d ?? 0);
  const basicSalary = Number(item.basicSalary ?? item.e ?? 0);
  if (!id || !type || dateTimeMillis <= 0 || hours <= 0 || basicSalary <= 0) return null;
  const safeFactor = factor > 0 ? factor : TYPES[type].factor;
  const amount = Number(item.amountQar ?? item.g ?? 0);
  return {
    id,
    dateTimeMillis,
    type,
    hours,
    basicSalary,
    factor: safeFactor,
    amountQar: amount > 0 ? amount : calculateAmount(basicSalary, hours, safeFactor),
    notes: String(item.notes ?? item.h ?? ""),
    createdAtMillis: Number(item.createdAtMillis ?? item.i ?? dateTimeMillis)
  };
}

function csvEscape(value) {
  const text = String(value ?? "").replaceAll('"', '""');
  return /[",\n]/.test(text) ? `"${text}"` : text;
}

function buildCsv(records, totals, label) {
  const lines = [
    "Ambulance Overtime Report",
    `Period,${csvEscape(label)}`,
    `Total Hours,${rounded(totals.totalHours)}`,
    `Regular Hours,${rounded(totals.regularHours)}`,
    `Ramadan Hours,${rounded(totals.ramadanHours)}`,
    `Total Earnings,${rounded(totals.totalQar, 1)}`,
    "",
    "Date,Type,Hours,Basic Salary,Factor,Amount QAR,Notes"
  ];
  records.forEach(record => {
    lines.push([
      shortDateTime(record.dateTimeMillis),
      TYPES[record.type].label,
      rounded(record.hours),
      rounded(record.basicSalary),
      record.factor,
      rounded(record.amountQar, 1),
      record.notes
    ].map(csvEscape).join(","));
  });
  return lines.join("\n");
}

function pdfEscape(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function buildPdf(records, totals, label, showSalary) {
  const PAGE_HEIGHT = 842;
  const rgb = hex => {
    const value = hex.replace("#", "");
    return [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16) / 255)
      .map(value => value.toFixed(4)).join(" ");
  };
  const estimateWidth = (text, size) => String(text).length * size * 0.52;
  const pages = [];
  let commands = [];
  let topY = 42;

  function text(value, x, baselineTop, size, color, bold = false, align = "left") {
    const safe = pdfEscape(value);
    const adjustedX = align === "center" ? x - estimateWidth(safe, size) / 2 : x;
    commands.push(`${rgb(color)} rg BT /${bold ? "F2" : "F1"} ${size} Tf ${adjustedX.toFixed(2)} ${(PAGE_HEIGHT - baselineTop).toFixed(2)} Td (${safe}) Tj ET`);
  }

  function fillRect(left, top, right, bottom, color) {
    commands.push(`${rgb(color)} rg ${left} ${PAGE_HEIGHT - bottom} ${right - left} ${bottom - top} re f`);
  }

  function strokeRect(left, top, right, bottom, color, width = 1) {
    commands.push(`${rgb(color)} RG ${width} w ${left} ${PAGE_HEIGHT - bottom} ${right - left} ${bottom - top} re S`);
  }

  function line(x1, y1, x2, y2, color, width = 1) {
    commands.push(`${rgb(color)} RG ${width} w ${x1} ${PAGE_HEIGHT - y1} m ${x2} ${PAGE_HEIGHT - y2} l S`);
  }

  function finishPage() {
    text("Ambulance App", 28, 822, 9, "#AFB4BD", true);
    pages.push(commands.join("\n"));
    commands = [];
  }

  function newPage() {
    finishPage();
    topY = 42;
  }

  function drawLine(value, size, color, bold, x, gap) {
    if (topY > 800) newPage();
    text(value, x, topY, size, color, bold);
    topY += gap;
  }

  function drawSummaryTable() {
    if (topY > 770) newPage();
    const headerBottom = topY + 24;
    const rowBottom = topY + 54;
    fillRect(28, topY, 567, headerBottom, "#2F6FED");
    const headers = ["Period", "Total", "Regular", "Ramadan", "Earnings", "Records"];
    const xs = [72, 176, 262, 348, 445, 535];
    headers.forEach((header, index) => text(header, xs[index], topY + 16, 11, "#FFFFFF", true, "center"));
    strokeRect(28, headerBottom, 567, rowBottom, "#D1D9E6");
    const values = [
      label.slice(0, 18),
      rounded(totals.totalHours),
      rounded(totals.regularHours),
      rounded(totals.ramadanHours),
      `${rounded(totals.totalQar, 1)} QAR`,
      String(totals.count)
    ];
    values.forEach((value, index) => text(value, xs[index], headerBottom + 19, 10.5, "#1F2937", true, "center"));
    topY = rowBottom;
  }

  function drawTableHeader() {
    if (topY > 770) newPage();
    const bottom = topY + 24;
    fillRect(28, topY, 567, bottom, "#2F6FED");
    const headers = showSalary
      ? ["Date", "Type", "Hours", "Salary", "Earnings", "Notes"]
      : ["Date", "Type", "Hours", "Earnings", "Notes"];
    const xs = showSalary
      ? [34, 126, 232, 282, 358, 438]
      : [34, 136, 244, 320, 420];
    headers.forEach((header, index) => text(header, xs[index], topY + 16, 11.5, "#FFFFFF", true));
    topY = bottom;
  }

  function drawTableRow(record) {
    if (topY > 790) {
      newPage();
      drawTableHeader();
    }
    const bottom = topY + 30;
    strokeRect(28, topY, 567, bottom, "#D1D9E6");
    text(shortDateTime(record.dateTimeMillis), 34, topY + 18, 10, "#1F2937", true);
    const type = TYPES[record.type].label.replace(" OT", "");
    if (showSalary) {
      text(type, 126, topY + 18, 10, "#1F2937", true);
      text(rounded(record.hours), 232, topY + 18, 10, "#1F2937", true);
      text(rounded(record.basicSalary), 282, topY + 18, 10, "#1F2937", true);
      text(rounded(record.amountQar, 1), 358, topY + 18, 10, "#1F2937", true);
      text(record.notes.replace(/\s+/g, " ").slice(0, 28), 438, topY + 18, 10, "#1F2937", true);
    } else {
      text(type, 136, topY + 18, 10, "#1F2937", true);
      text(rounded(record.hours), 244, topY + 18, 10, "#1F2937", true);
      text(rounded(record.amountQar, 1), 320, topY + 18, 10, "#1F2937", true);
      text(record.notes.replace(/\s+/g, " ").slice(0, 34), 420, topY + 18, 10, "#1F2937", true);
    }
    topY = bottom;
  }

  drawLine("Ambulance Overtime Report", 24, "#111827", true, 36, 24);
  drawLine(`Overtime on ${label}`, 18, "#2F6FED", true, 36, 22);
  drawLine(`Total overtime for this period: ${rounded(totals.totalQar, 1)} QAR`, 17, "#1F2937", true, 36, 24);
  drawSummaryTable();
  topY += 18;
  line(28, topY, 567, topY, "#D1D9E6", 2);
  topY += 22;
  drawLine("Records", 18, "#2F6FED", true, 36, 16);
  drawTableHeader();
  records.forEach(drawTableRow);
  finishPage();

  const objects = [];
  const addObject = body => {
    objects.push(body);
    return objects.length;
  };
  const catalogId = addObject("");
  const pagesId = addObject("");
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const boldFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds = [];

  pages.forEach(stream => {
    const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(output.length);
    output += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = output.length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => {
    output += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  output += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([output], { type: "application/pdf" });
}

async function shareOrDownload(blob, filename, title = "Export Overtime") {
  const file = new File([blob], filename, { type: blob.type });
  try {
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title, files: [file] });
      return;
    }
  } catch (error) {
    if (error?.name === "AbortError") return;
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function stamp() {
  const date = new Date();
  return `${shortDate(date.getTime()).replaceAll("-", "")}_${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}`;
}

export async function run(root) {
  const storedRecords = readJson(STORE.records, []);
  let records = (Array.isArray(storedRecords) ? storedRecords : []).map(normalizeRecord).filter(Boolean);
  let salary = readNumber(STORE.salary);
  let activeTab = "ADD";
  let period = "THIS_MONTH";
  let customStart = startOfMonth();
  let customEnd = endOfDay(Date.now());
  let selectedIds = new Set();
  let warningHidden = localStorage.getItem(STORE.warningHidden) === "1";
  let showSalaryPdf = localStorage.getItem(STORE.showSalaryPdf) !== "0";
  let addType = "REGULAR";
  let calculatorType = null;
  let calculatorAmount = null;

  root.innerHTML = `
    <style>
      .ot{max-width:760px;margin:0 auto;color:var(--text);--ot-blue:#2F6FED;--ot-dark-blue:#1D4ED8;--ot-red:#D92D20;--ot-green:#059669}
      .ot-tabs{position:sticky;top:0;z-index:3;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:var(--surface);border-bottom:1px solid var(--border)}
      .ot-tab{min-width:0;height:54px;border:0;border-bottom:3px solid transparent;background:transparent;color:var(--muted);font-size:13px;font-weight:900;white-space:nowrap}.ot-tab.active{border-bottom-color:var(--ot-blue);color:var(--ot-blue)}
      .ot-tab .material-symbols-rounded{font-size:23px;vertical-align:middle}.ot-view{padding:16px;display:grid;gap:12px}
      .ot-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:14px;box-shadow:0 4px 12px rgba(15,23,42,.08)}.ot-card h3{margin:0 0 10px;font-size:17px}.ot-muted{color:var(--muted);font-size:13px;line-height:1.4}
      .ot-summary{background:var(--ot-dark-blue);color:#fff;border:0;border-radius:18px;padding:16px;box-shadow:0 5px 14px rgba(29,78,216,.22)}.ot-summary h3{margin:0 0 14px;font-size:18px}.ot-summary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.ot-summary-label{color:#DCEBFF;font-size:12px;font-weight:800}.ot-summary-value{font-size:24px;font-weight:950}.ot-summary-suffix{font-size:11px;color:#DCEBFF;margin-left:4px}
      .ot-warning{background:#FFF4E5;border-color:#FFD599;color:#8A4B00}.ot-warning-head{display:flex;align-items:center;gap:8px}.ot-warning-head strong{flex:1}.ot-warning p{margin:5px 0 0;font-size:13px;line-height:1.4}.ot-link{border:0;background:transparent;color:inherit;font-weight:900;padding:7px}
      .ot-field{display:grid;gap:6px;margin-top:10px}.ot-field label{font-size:12px;color:var(--muted);font-weight:850}.ot-input,.ot-textarea,.ot-date{box-sizing:border-box;width:100%;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);font:750 16px/1.2 system-ui;padding:13px;outline:none}.ot-input:focus,.ot-textarea:focus,.ot-date:focus{border-color:var(--ot-blue);box-shadow:0 0 0 3px color-mix(in oklab,var(--ot-blue) 16%,transparent)}.ot-input:disabled{background:var(--surface-2);color:var(--muted)}.ot-textarea{min-height:78px;resize:vertical}
      .ot-row{display:flex;gap:8px;align-items:center}.ot-row>*{min-width:0}.ot-grow{flex:1}.ot-chips{display:flex;gap:8px;overflow-x:auto;padding:2px 0;scrollbar-width:none}.ot-chips::-webkit-scrollbar{display:none}.ot-chip{flex:none;border:1px solid var(--border);border-radius:14px;background:var(--surface);color:var(--text);padding:9px 12px;font-size:12px;font-weight:900}.ot-chip.active{background:var(--ot-blue);border-color:var(--ot-blue);color:#fff}
      .ot-btn{min-height:44px;border:0;border-radius:14px;padding:10px 14px;font-size:13px;font-weight:950}.ot-btn.primary{background:var(--ot-blue);color:#fff}.ot-btn.green{background:var(--ot-green);color:#fff}.ot-btn.outline{background:var(--surface);border:1px solid var(--border);color:var(--text)}.ot-btn.danger{background:transparent;color:var(--ot-red)}.ot-btn:disabled{opacity:.45}.ot-wide{width:100%}
      .ot-result-strip{height:4px;border-radius:4px;background:var(--ot-blue);margin-bottom:14px}.ot-result-amount{font-size:36px;font-weight:950}.ot-result-note{margin-top:8px}.ot-formula{margin-top:10px;border-radius:12px;background:#F3F7FF;padding:12px;color:#101828;font-size:10px;font-weight:850;white-space:nowrap;overflow:hidden}
      .ot-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.ot-metric{background:#F3F7FF;border-radius:12px;padding:10px;text-align:center}.ot-metric-label{color:#667085;font-size:11px;font-weight:850}.ot-metric-value{color:var(--ot-dark-blue);font-size:16px;font-weight:950;margin-top:3px}
      .ot-export{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.ot-export .ot-btn{background:transparent}.ot-export-pdf{border:1px solid #DC2626;color:#DC2626}.ot-export-csv{border:1px solid #059669;color:#059669}.ot-export-json{border:1px solid #2563EB;color:#2563EB}
      .ot-record-head{display:flex;align-items:center;gap:4px}.ot-record-head h3{flex:1;margin:0}#otRecords{display:grid;gap:10px;width:100%}.ot-record{box-sizing:border-box;display:flex;width:100%;gap:12px;align-items:flex-start;padding:12px;text-align:left;font:inherit;color:var(--text)}.ot-record.selected{background:#EAF2FF;border-color:var(--ot-blue)}.ot-record input{flex:none;margin:4px 0 0;width:20px;height:20px}.ot-record-main{display:block;min-width:0;flex:1}.ot-record-top{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap}.ot-record-type{display:block;color:var(--ot-dark-blue);font-size:14px;font-weight:950}.ot-record-type.ramadan{color:#B42318}.ot-record-date{display:block;color:var(--muted);font-size:12px}.ot-record-amount{display:block;margin-top:7px;font-size:18px;font-weight:950;line-height:1.25}.ot-record-notes{margin-top:5px;color:var(--muted);font-size:13px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.ot-record-salary{display:block;margin-top:6px;color:var(--muted);font-size:11px}
      .ot-empty{height:120px;display:grid;place-items:center;color:var(--muted);font-weight:850}.ot-switch-row{display:flex;align-items:center;gap:12px}.ot-switch-copy{flex:1}.ot-switch{width:48px;height:28px;appearance:none;border-radius:999px;background:#CBD5E1;position:relative;transition:.2s}.ot-switch:before{content:"";position:absolute;width:22px;height:22px;left:3px;top:3px;border-radius:50%;background:#fff;transition:.2s}.ot-switch:checked{background:var(--ot-blue)}.ot-switch:checked:before{transform:translateX(20px)}
      .ot-toast{position:fixed;z-index:12000;left:50%;bottom:calc(env(safe-area-inset-bottom) + 22px);transform:translate(-50%,12px);background:#1F2937;color:#fff;padding:10px 14px;border-radius:12px;font-size:13px;font-weight:850;opacity:0;pointer-events:none;transition:.2s;white-space:nowrap}.ot-toast.show{opacity:1;transform:translate(-50%,0)}
      .ot-dialog{box-sizing:border-box;width:min(420px,calc(100vw - 32px));border:1px solid var(--border);border-radius:18px;background:var(--surface);color:var(--text);padding:0;box-shadow:0 22px 54px rgba(2,6,23,.35)}.ot-dialog::backdrop{background:rgba(15,23,42,.58)}.ot-dialog-body{padding:18px}.ot-dialog h3{margin:0 0 10px}.ot-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px;flex-wrap:wrap}
      .ot-hidden{display:none!important}
      :root[data-theme="dark"] .ot-card{box-shadow:none}:root[data-theme="dark"] .ot-warning{background:#2A2114;border-color:#5D4720;color:#F5C978}:root[data-theme="dark"] .ot-formula,:root[data-theme="dark"] .ot-metric{background:#172033;color:#E5EDFF}:root[data-theme="dark"] .ot-metric-label{color:#AAB7D0}:root[data-theme="dark"] .ot-metric-value{color:#8DB6FF}:root[data-theme="dark"] .ot-record.selected{background:#17233A}:root[data-theme="dark"] .ot-date{color-scheme:dark}
      @media(prefers-color-scheme:dark){:root[data-theme="auto"] .ot-card{box-shadow:none}:root[data-theme="auto"] .ot-warning{background:#2A2114;border-color:#5D4720;color:#F5C978}:root[data-theme="auto"] .ot-formula,:root[data-theme="auto"] .ot-metric{background:#172033;color:#E5EDFF}:root[data-theme="auto"] .ot-metric-label{color:#AAB7D0}:root[data-theme="auto"] .ot-metric-value{color:#8DB6FF}:root[data-theme="auto"] .ot-record.selected{background:#17233A}:root[data-theme="auto"] .ot-date{color-scheme:dark}}
      @media(max-width:360px){.ot-view{padding:12px 10px}.ot-tab{font-size:11px}.ot-summary-value{font-size:21px}.ot-btn{padding:9px 10px}.ot-record-head{flex-wrap:wrap}}
    </style>
    <section class="ot">
      <nav class="ot-tabs" aria-label="Overtime sections">
        <button class="ot-tab active" data-tab="ADD">Add</button>
        <button class="ot-tab" data-tab="HISTORY">History</button>
        <button class="ot-tab" data-tab="CALCULATOR" aria-label="Calculator"><span class="material-symbols-rounded">calculate</span></button>
        <button class="ot-tab" data-tab="SETTINGS">Settings</button>
      </nav>
      <div id="otView" class="ot-view"></div>
    </section>
    <div id="otToast" class="ot-toast" role="status"></div>
    <div id="otDialogHost"></div>
    <input id="otRestoreFile" type="file" accept="application/json,.json" hidden>
  `;

  const view = root.querySelector("#otView");
  const toast = root.querySelector("#otToast");
  const dialogHost = root.querySelector("#otDialogHost");
  const restoreInput = root.querySelector("#otRestoreFile");
  let toastTimer = null;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1900);
  }

  function closeDialog() {
    const dialog = dialogHost.querySelector("dialog");
    if (dialog?.open) dialog.close();
    dialogHost.innerHTML = "";
  }

  function showDialog({ title, message, actions }) {
    dialogHost.innerHTML = `
      <dialog class="ot-dialog">
        <div class="ot-dialog-body">
          <h3>${esc(title)}</h3>
          <div class="ot-muted">${esc(message)}</div>
          <div class="ot-dialog-actions">
            ${actions.map((action, index) => `<button class="ot-btn ${action.className || "outline"}" data-dialog-action="${index}">${esc(action.label)}</button>`).join("")}
          </div>
        </div>
      </dialog>
    `;
    const dialog = dialogHost.querySelector("dialog");
    dialog.showModal();
    actions.forEach((action, index) => {
      dialogHost.querySelector(`[data-dialog-action="${index}"]`)?.addEventListener("click", () => {
        closeDialog();
        action.run?.();
      });
    });
    dialog.addEventListener("cancel", event => {
      event.preventDefault();
      closeDialog();
    });
  }

  function warningCard() {
    if (warningHidden) return "";
    return `
      <section class="ot-card ot-warning">
        <div class="ot-warning-head"><strong>Data warning</strong><button class="ot-link" data-action="dismiss-warning">Dismiss</button></div>
        <p>Overtime records are saved on this device. If you remove the Ambulance App or clear app data, saved Overtime will be lost. Use Settings &gt; Backup &gt; Save Backup if you need a restorable copy.</p>
      </section>
    `;
  }

  function renderSummary(title, leftLabel, leftValue, rightLabel, rightValue, suffix = "") {
    return `
      <section class="ot-summary">
        <h3>${esc(title)}</h3>
        <div class="ot-summary-grid">
          <div><div class="ot-summary-label">${esc(leftLabel)}</div><div class="ot-summary-value">${esc(leftValue)}</div></div>
          <div><div class="ot-summary-label">${esc(rightLabel)}</div><div><span class="ot-summary-value">${esc(rightValue)}</span>${suffix ? `<span class="ot-summary-suffix">${esc(suffix)}</span>` : ""}</div></div>
        </div>
      </section>
    `;
  }

  function renderAdd() {
    const editing = salary <= 0;
    view.innerHTML = `
      ${warningCard()}
      <div id="otAddSummary">${renderSummary("New OT Amount", "Hours", "0", "Estimated Earnings", "0", "QAR")}</div>
      <section class="ot-card">
        <h3>Basic Salary</h3>
        <div class="ot-field"><label for="otAddSalary">Basic salary in QAR</label><input id="otAddSalary" class="ot-input" inputmode="decimal" placeholder="Enter basic salary in QAR" value="${salary > 0 ? esc(rounded(salary)) : ""}" ${editing ? "" : "disabled"}></div>
        <div class="ot-muted" style="margin-top:7px">Saved on this device and reused in Add and Calculator until you change it.</div>
        <div class="ot-row" style="margin-top:10px">
          <button id="otSalaryAction" class="ot-btn primary">${editing ? "Save Salary" : "Edit Salary"}</button>
          <button class="ot-btn outline" data-tab-link="SETTINGS">Settings</button>
        </div>
      </section>
      <section class="ot-card">
        <h3>Overtime Details</h3>
        <div class="ot-chips">
          ${Object.entries(TYPES).map(([key, type]) => `<button class="ot-chip ${addType === key ? "active" : ""}" data-add-type="${key}">${type.label}</button>`).join("")}
        </div>
        <div class="ot-field"><label for="otAddDate">OT date and time</label><input id="otAddDate" class="ot-date" type="datetime-local"></div>
        <div class="ot-field"><label for="otAddHours">Hours</label><input id="otAddHours" class="ot-input" inputmode="decimal"></div>
        <div class="ot-field"><label for="otAddNotes">Notes</label><textarea id="otAddNotes" class="ot-textarea" maxlength="1000"></textarea></div>
        <button id="otSaveRecord" class="ot-btn primary ot-wide" style="margin-top:14px">Save Overtime</button>
      </section>
      <div style="height:70px"></div>
    `;
    wireWarning();
    wireKeyboardDismiss();
    const salaryInput = view.querySelector("#otAddSalary");
    const hoursInput = view.querySelector("#otAddHours");
    const dateInput = view.querySelector("#otAddDate");
    const notesInput = view.querySelector("#otAddNotes");

    view.querySelector("#otSalaryAction").addEventListener("click", event => {
      if (salaryInput.disabled) {
        salaryInput.disabled = false;
        event.currentTarget.textContent = "Save Salary";
        salaryInput.focus();
        return;
      }
      const value = Number(salaryInput.value);
      if (!(value > 0)) return showToast("Enter a valid salary.");
      salary = value;
      localStorage.setItem(STORE.salary, String(salary));
      salaryInput.disabled = true;
      event.currentTarget.textContent = "Edit Salary";
      updateAddSummary();
      showToast("Basic salary saved.");
    });
    view.querySelector("[data-tab-link='SETTINGS']").addEventListener("click", () => switchTab("SETTINGS"));
    view.querySelectorAll("[data-add-type]").forEach(button => {
      button.addEventListener("click", () => {
        addType = button.dataset.addType;
        view.querySelectorAll("[data-add-type]").forEach(item => item.classList.toggle("active", item === button));
        updateAddSummary();
      });
    });
    [salaryInput, hoursInput].forEach(input => {
      input.addEventListener("input", () => {
        input.value = input.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
        updateAddSummary();
      });
    });
    function updateAddSummary() {
      const hours = Number(hoursInput.value) || 0;
      const currentSalary = Number(salaryInput.value) || 0;
      view.querySelector("#otAddSummary").innerHTML = renderSummary(
        "New OT Amount", "Hours", rounded(hours), "Estimated Earnings",
        rounded(calculateAmount(currentSalary, hours, TYPES[addType].factor), 1), "QAR"
      );
    }
    view.querySelector("#otSaveRecord").addEventListener("click", () => {
      const validSalary = Number(salaryInput.value);
      const validHours = Number(hoursInput.value);
      const validDate = new Date(dateInput.value).getTime();
      if (!(validSalary > 0)) return showToast("Save or enter a valid basic salary.");
      if (!(validHours > 0)) return showToast("Enter valid OT hours.");
      if (!Number.isFinite(validDate)) return showToast("Select OT date and time.");
      const type = TYPES[addType];
      records.push({
        id: uuid(),
        dateTimeMillis: validDate,
        type: addType,
        hours: validHours,
        basicSalary: validSalary,
        factor: type.factor,
        amountQar: calculateAmount(validSalary, validHours, type.factor),
        notes: notesInput.value.trim(),
        createdAtMillis: Date.now()
      });
      saveRecords(records);
      hoursInput.value = "";
      notesInput.value = "";
      updateAddSummary();
      showToast("Overtime saved.");
    });
  }

  function renderCalculator() {
    view.innerHTML = `
      <section class="ot-card">
        <h3>Overtime Calculator</h3>
        <div class="ot-field"><label for="otCalcSalary">Basic Salary</label><input id="otCalcSalary" class="ot-input" inputmode="numeric" maxlength="9" placeholder="Enter basic salary in QAR" value="${salary > 0 ? esc(rounded(salary)) : ""}"></div>
        <div class="ot-muted" style="margin-top:7px">${salary > 0 ? "Using your saved basic salary." : "Save your salary in Add or Settings to reuse it automatically."}</div>
        <div class="ot-field"><label>Default Hours</label><div class="ot-chips">${[1,12,36,48,60,72,84,90].map(value => `<button class="ot-chip" data-hour="${value}">${value}</button>`).join("")}</div></div>
        <div class="ot-field"><label for="otCalcHours">Overtime Hours</label><input id="otCalcHours" class="ot-input" inputmode="numeric" maxlength="5"></div>
      </section>
      <section class="ot-card">
        <div class="ot-row"><button class="ot-btn primary ot-grow" data-calc="REGULAR">Normal OT</button><button class="ot-btn primary ot-grow" data-calc="RAMADAN">Ramadan OT</button></div>
        <button id="otCalcClear" class="ot-btn outline ot-wide" style="margin-top:8px">Clear</button>
      </section>
      <section class="ot-card">
        <div class="ot-result-strip"></div>
        <div id="otCalcResult"></div>
      </section>
      <div style="height:60px"></div>
    `;
    const salaryInput = view.querySelector("#otCalcSalary");
    const hoursInput = view.querySelector("#otCalcHours");
    function renderResult() {
      const type = calculatorType ? TYPES[calculatorType] : null;
      view.querySelector("#otCalcResult").innerHTML = calculatorAmount == null
        ? `<div class="ot-result-amount" style="font-size:20px;color:var(--muted)">No result yet</div><div class="ot-muted ot-result-note">Enter salary and hours, then choose Normal or Ramadan.</div><div class="ot-formula">Formula: Earnings = Basic x Hours x 1.25 x Factor<br><br>Factor: -</div>`
        : `<div><span class="ot-result-amount">${oneDecimal(calculatorAmount)}</span> <strong>QAR</strong></div><div class="ot-muted ot-result-note">${type.label} earnings calculated at 1.25x multiplier.</div><div class="ot-formula">Formula: Earnings = Basic x Hours x 1.25 x Factor<br><br>Factor: ${type.label} = ${type.factor}</div>`;
    }
    renderResult();
    view.querySelectorAll("[data-hour]").forEach(button => {
      button.addEventListener("click", () => {
        hoursInput.value = button.dataset.hour;
        calculatorAmount = null;
        calculatorType = null;
        view.querySelectorAll("[data-hour]").forEach(item => item.classList.toggle("active", item === button));
        renderResult();
      });
    });
    view.querySelectorAll("[data-calc]").forEach(button => {
      button.addEventListener("click", () => {
        const currentSalary = Number(salaryInput.value);
        const hours = Number(hoursInput.value);
        if (!(currentSalary > 0) || !(hours > 0)) return showToast("Enter salary and OT hours.");
        calculatorType = button.dataset.calc;
        calculatorAmount = ceilOne(calculateAmount(currentSalary, hours, TYPES[calculatorType].factor));
        renderResult();
        document.activeElement?.blur?.();
      });
    });
    view.querySelector("#otCalcClear").addEventListener("click", () => {
      salaryInput.value = salary > 0 ? rounded(salary) : "";
      hoursInput.value = "";
      calculatorAmount = null;
      calculatorType = null;
      view.querySelectorAll("[data-hour]").forEach(item => item.classList.remove("active"));
      renderResult();
    });
    [salaryInput, hoursInput].forEach(input => input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "");
    }));
    wireKeyboardDismiss();
  }

  function filteredRecords() {
    const [start, end] = periodBounds(period, customStart, customEnd);
    return records.filter(record => record.dateTimeMillis >= start && record.dateTimeMillis <= end)
      .sort((a, b) => b.dateTimeMillis - a.dateTimeMillis);
  }

  function renderHistory() {
    const filtered = filteredRecords();
    const totals = summary(filtered);
    const label = periodLabel(period, customStart, customEnd);
    view.innerHTML = `
      ${renderSummary(label, "Total Hours", rounded(totals.totalHours), "Total Earnings", rounded(totals.totalQar, 1), "QAR")}
      <section class="ot-card">
        <h3>Period</h3>
        <div class="ot-chips">
          ${[["ALL","All"],["THIS_MONTH","This Month"],["LAST_MONTH","Last Month"],["THIS_YEAR","This Year"]].map(([key,labelText]) => `<button class="ot-chip ${period === key ? "active" : ""}" data-period="${key}">${labelText}</button>`).join("")}
        </div>
        <button class="ot-chip ${period === "CUSTOM" ? "active" : ""}" data-period="CUSTOM" style="margin-top:8px">Custom Range</button>
        <div id="otCustomDates" class="${period === "CUSTOM" ? "ot-row" : "ot-hidden"}" style="margin-top:10px">
          <input id="otCustomStart" class="ot-date ot-grow" type="date" value="${dateOnlyValue(customStart)}">
          <input id="otCustomEnd" class="ot-date ot-grow" type="date" value="${dateOnlyValue(customEnd)}">
        </div>
      </section>
      <section class="ot-card"><div class="ot-metrics">
        <div class="ot-metric"><div class="ot-metric-label">Records</div><div class="ot-metric-value">${totals.count}</div></div>
        <div class="ot-metric"><div class="ot-metric-label">Regular</div><div class="ot-metric-value">${rounded(totals.regularHours)}</div></div>
        <div class="ot-metric"><div class="ot-metric-label">Ramadan</div><div class="ot-metric-value">${rounded(totals.ramadanHours)}</div></div>
      </div></section>
      <section class="ot-card"><h3>Export</h3><div class="ot-export">
        <button class="ot-btn ot-export-pdf" data-export="PDF">PDF</button>
        <button class="ot-btn ot-export-csv" data-export="CSV">CSV</button>
        <button class="ot-btn ot-export-json" data-export="JSON">JSON</button>
      </div></section>
      <div class="ot-record-head">
        <h3>Records</h3>
        ${filtered.length ? `<button class="ot-btn outline" data-action="select-all">${selectedIds.size === filtered.length ? "Clear" : "Select"}</button><button class="ot-btn danger" data-action="delete-selected" ${selectedIds.size ? "" : "disabled"}>Delete</button>` : ""}
        <button class="ot-btn danger" data-action="delete-all">Delete All</button>
      </div>
      <div id="otRecords">
        ${filtered.length ? filtered.map(record => `
          <button class="ot-card ot-record ${selectedIds.has(record.id) ? "selected" : ""}" data-record="${esc(record.id)}">
            <input type="checkbox" ${selectedIds.has(record.id) ? "checked" : ""} tabindex="-1">
            <span class="ot-record-main">
              <span class="ot-record-top"><span class="ot-record-type ${record.type === "RAMADAN" ? "ramadan" : ""}">${TYPES[record.type].label}</span><span class="ot-record-date">${shortDateTime(record.dateTimeMillis)}</span></span>
              <span class="ot-record-amount">${rounded(record.hours)} hrs &nbsp;·&nbsp; ${rounded(record.amountQar, 1)} QAR</span>
              ${record.notes ? `<span class="ot-record-notes">${esc(record.notes)}</span>` : ""}
              <span class="ot-record-salary">Salary used: ${rounded(record.basicSalary)} QAR</span>
            </span>
          </button>
        `).join("") : `<section class="ot-card ot-empty">No overtime records for this period.</section>`}
      </div>
    `;
    view.querySelectorAll("[data-period]").forEach(button => {
      button.addEventListener("click", () => {
        period = button.dataset.period;
        selectedIds.clear();
        renderHistory();
      });
    });
    const startInput = view.querySelector("#otCustomStart");
    const endInput = view.querySelector("#otCustomEnd");
    startInput?.addEventListener("change", () => {
      customStart = startOfDay(new Date(`${startInput.value}T00:00`).getTime());
      renderHistory();
    });
    endInput?.addEventListener("change", () => {
      customEnd = endOfDay(new Date(`${endInput.value}T00:00`).getTime());
      renderHistory();
    });
    view.querySelectorAll("[data-record]").forEach(button => {
      button.addEventListener("click", () => {
        const id = button.dataset.record;
        if (selectedIds.has(id)) selectedIds.delete(id);
        else selectedIds.add(id);
        renderHistory();
      });
    });
    view.querySelector("[data-action='select-all']")?.addEventListener("click", () => {
      selectedIds = selectedIds.size === filtered.length ? new Set() : new Set(filtered.map(record => record.id));
      renderHistory();
    });
    view.querySelector("[data-action='delete-selected']")?.addEventListener("click", () => {
      confirmDelete("SELECTED");
    });
    view.querySelector("[data-action='delete-all']")?.addEventListener("click", () => {
      confirmDelete("ALL");
    });
    view.querySelectorAll("[data-export]").forEach(button => {
      button.addEventListener("click", () => exportRecords(button.dataset.export, filtered, totals, label));
    });
  }

  function confirmDelete(mode) {
    const selected = mode === "SELECTED";
    showDialog({
      title: selected ? "Delete selected records?" : "Delete all records?",
      message: selected
        ? `This will permanently delete ${selectedIds.size} selected overtime record(s).`
        : "This will permanently delete every saved overtime record. Export first if you need a copy.",
      actions: [
        { label: "Cancel" },
        { label: "Delete", className: "danger", run: () => {
          records = selected ? records.filter(record => !selectedIds.has(record.id)) : [];
          selectedIds.clear();
          saveRecords(records);
          renderHistory();
        }}
      ]
    });
  }

  async function exportRecords(type, filtered, totals, label) {
    if (!filtered.length) return showToast("No records to export for this period.");
    const filename = `overtime_${stamp()}.${type.toLowerCase()}`;
    if (type === "CSV") {
      return shareOrDownload(new Blob([buildCsv(filtered, totals, label)], { type: "text/csv" }), filename);
    }
    if (type === "JSON") {
      const text = JSON.stringify(filtered, null, 2);
      if (new Blob([text]).size > MAX_BACKUP_BYTES) return showBackupLimit("This JSON export is larger than 5 MB and cannot be restored. Export a smaller period, then try again.");
      return shareOrDownload(new Blob([text], { type: "application/json" }), filename);
    }
    return shareOrDownload(buildPdf(filtered, totals, label, showSalaryPdf), filename);
  }

  function renderSettings() {
    const editing = salary <= 0;
    view.innerHTML = `
      ${warningCard() || `<button class="ot-btn outline ot-wide" data-action="show-warning">Show Overtime data warning</button>`}
      <section class="ot-card">
        <h3>Basic Salary</h3>
        <div class="ot-field"><label for="otSettingsSalary">Basic salary in QAR</label><input id="otSettingsSalary" class="ot-input" inputmode="decimal" placeholder="Enter basic salary in QAR" value="${salary > 0 ? esc(rounded(salary)) : ""}" ${editing ? "" : "disabled"}></div>
        <div class="ot-muted" style="margin-top:7px">This salary is saved on this device and automatically used in Add and Calculator.</div>
        <button id="otSettingsSalaryAction" class="ot-btn primary ot-wide" style="margin-top:12px">${editing ? "Save Basic Salary" : "Edit Basic Salary"}</button>
      </section>
      <section class="ot-card ot-switch-row">
        <div class="ot-switch-copy"><h3 style="margin-bottom:4px">Show Salary in PDF</h3><div class="ot-muted">Include basic salary values in overtime PDF exports.</div></div>
        <input id="otShowSalaryPdf" class="ot-switch" type="checkbox" ${showSalaryPdf ? "checked" : ""}>
      </section>
      <section class="ot-card">
        <h3>Backup</h3>
        <div class="ot-muted">Saved records: ${records.length}. Export JSON if you want a restorable copy before removing the Ambulance App or clearing app data.</div>
        <button class="ot-btn primary ot-wide" data-action="save-backup" style="margin-top:12px">Save Backup</button>
        <button class="ot-btn green ot-wide" data-action="restore-backup" style="margin-top:8px">Restore Backup</button>
      </section>
    `;
    wireWarning();
    view.querySelector("[data-action='show-warning']")?.addEventListener("click", () => {
      warningHidden = false;
      localStorage.setItem(STORE.warningHidden, "0");
      renderSettings();
    });
    const salaryInput = view.querySelector("#otSettingsSalary");
    view.querySelector("#otSettingsSalaryAction").addEventListener("click", event => {
      if (salaryInput.disabled) {
        salaryInput.disabled = false;
        event.currentTarget.textContent = "Save Basic Salary";
        salaryInput.focus();
        return;
      }
      const value = Number(salaryInput.value);
      if (!(value > 0)) return showToast("Enter a valid salary.");
      salary = value;
      localStorage.setItem(STORE.salary, String(salary));
      salaryInput.disabled = true;
      event.currentTarget.textContent = "Edit Basic Salary";
      showToast("Basic salary saved.");
    });
    view.querySelector("#otShowSalaryPdf").addEventListener("change", event => {
      showSalaryPdf = event.target.checked;
      localStorage.setItem(STORE.showSalaryPdf, showSalaryPdf ? "1" : "0");
    });
    view.querySelector("[data-action='save-backup']").addEventListener("click", async () => {
      if (!records.length) return showToast("No overtime records to save.");
      const text = JSON.stringify([...records].sort((a, b) => b.dateTimeMillis - a.dateTimeMillis), null, 2);
      if (new Blob([text]).size > MAX_BACKUP_BYTES) return showBackupLimit("This JSON backup is larger than 5 MB and cannot be restored. Delete old records or export a smaller backup, then try again.");
      await shareOrDownload(new Blob([text], { type: "application/json" }), `overtime_backup_${stamp()}.json`, "Overtime Backup");
    });
    view.querySelector("[data-action='restore-backup']").addEventListener("click", () => {
      restoreInput.value = "";
      restoreInput.click();
    });
    wireKeyboardDismiss();
  }

  function showBackupLimit(message) {
    showDialog({
      title: "Backup Too Large",
      message,
      actions: [{ label: "OK", className: "primary" }]
    });
  }

  function wireWarning() {
    view.querySelector("[data-action='dismiss-warning']")?.addEventListener("click", () => {
      warningHidden = true;
      localStorage.setItem(STORE.warningHidden, "1");
      renderActive();
    });
  }

  function wireKeyboardDismiss() {
    view.addEventListener("touchmove", () => document.activeElement?.blur?.(), { passive: true });
    view.addEventListener("wheel", () => document.activeElement?.blur?.(), { passive: true });
  }

  function renderActive() {
    if (activeTab === "ADD") renderAdd();
    else if (activeTab === "HISTORY") renderHistory();
    else if (activeTab === "CALCULATOR") renderCalculator();
    else renderSettings();
  }

  function switchTab(tab) {
    activeTab = tab;
    root.querySelectorAll(".ot-tab").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
    selectedIds.clear();
    renderActive();
    root.closest("#panel-card")?.scrollTo({ top: 0, behavior: "instant" });
  }

  root.querySelectorAll(".ot-tab").forEach(button => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  restoreInput.addEventListener("change", async () => {
    const file = restoreInput.files?.[0];
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) return showBackupLimit("The selected JSON backup is larger than 5 MB and cannot be restored. Select a smaller Ambulance backup file.");
    try {
      const parsed = JSON.parse(await file.text());
      const list = Array.isArray(parsed) ? parsed : parsed?.records;
      if (!Array.isArray(list)) throw new Error("Unsupported backup");
      const restored = list.map(normalizeRecord).filter(Boolean).sort((a, b) => b.dateTimeMillis - a.dateTimeMillis);
      if (!restored.length && list.length) throw new Error("No valid records");
      if (!records.length) {
        records = restored;
        saveRecords(records);
        showToast(`Restored ${records.length} ${records.length === 1 ? "record" : "records"}.`);
        renderSettings();
        return;
      }
      showDialog({
        title: "Restore JSON backup?",
        message: `You already have ${records.length} overtime record(s). The backup contains ${restored.length} record(s). Do you want to add them to current records or overwrite current records?`,
        actions: [
          { label: "Cancel" },
          { label: "Overwrite", className: "danger", run: () => {
            records = restored;
            saveRecords(records);
            showToast(`Restored ${records.length} ${records.length === 1 ? "record" : "records"}.`);
            renderSettings();
          }},
          { label: "Add", className: "primary", run: () => {
            const before = records.length;
            const merged = new Map([...records, ...restored].map(record => [record.id, record]));
            records = [...merged.values()].sort((a, b) => b.dateTimeMillis - a.dateTimeMillis);
            saveRecords(records);
            showToast(`Added ${records.length - before} ${records.length - before === 1 ? "record" : "records"}.`);
            renderSettings();
          }}
        ]
      });
    } catch (_) {
      showToast("Unable to restore JSON backup.");
    }
  });

  window.addEventListener("hashchange", closeDialog, { once: true });
  renderAdd();
}
