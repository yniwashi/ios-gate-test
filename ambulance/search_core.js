// /ambulance/search_core.js
// CHANGELOG (2026-05-16):
// - Add shared weighted search engine for document and feature search.
// - Add document-number intent, primary/secondary term scoring, query expansion, and fuzzy matching.
// Shared weighted search engine for Ambulance document and feature search.
// Keep this file dependency-free so CPG, SOP, CPM, and global search can reuse it.

export function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/(\d)[:_\-](\d)/g, "$1.$2")
    .replace(/[^a-z0-9+%/ .:-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeDocNumber(value) {
  return normalizeSearchText(value).replace(/[^0-9.]/g, "").replace(/\.+/g, ".").replace(/^\.|\.$/g, "");
}

const STOP = new Set([
  "the","a","an","of","and","or","to","in","for","with","on","is","are","what","how","which","that","this","these","those","do","does","did","be","been","being","at","by","from","as","about","into","over","under","than","then","it","its","if","when","where","who","whom","why","using","use"
]);

function uniq(values) {
  const seen = new Set();
  const out = [];
  values.flat(Infinity).forEach((value) => {
    const raw = String(value || "").trim();
    const norm = normalizeSearchText(raw);
    if (!norm || seen.has(norm)) return;
    seen.add(norm);
    out.push(raw);
  });
  return out;
}

function normList(values) {
  return uniq(values).map((v) => normalizeSearchText(v)).filter(Boolean);
}

function expansionMap(raw) {
  const out = Object.create(null);
  Object.keys(raw).forEach((key) => {
    const nk = normalizeSearchText(key);
    const vals = Array.isArray(raw[key]) ? raw[key] : [raw[key]];
    out[nk] = normList(vals);
  });
  return out;
}

function bidirectional(groups) {
  const out = Object.create(null);
  groups.forEach((group) => {
    const vals = normList(group);
    vals.forEach((v) => {
      out[v] = uniq([...(out[v] || []), ...vals.filter((x) => x !== v)]).map(normalizeSearchText);
    });
  });
  return out;
}

const ABBR = expansionMap({
  sob: ["shortness of breath", "dyspnea", "breathless"],
  cp: ["chest pain", "chest tightness", "chest pressure"],
  acs: ["acute coronary syndrome", "stemi", "nstemi", "ischemic chest pain"],
  mi: ["myocardial infarction", "heart attack"],
  htn: ["hypertension", "high blood pressure"],
  bp: ["blood pressure"],
  bgl: ["blood glucose", "blood sugar", "glucose check"],
  rbs: ["random blood sugar", "blood glucose", "blood sugar"],
  spo2: ["oxygen saturation", "pulse oximetry"],
  ams: ["altered mental status", "confusion"],
  dm: ["diabetes", "hyperglycaemia", "hypoglycaemia"],
  tachy: ["tachycardia", "tachyarrhythmia"],
  brady: ["bradycardia", "slow heart rate"],
  paeds: ["paediatric", "pediatric", "child", "infant"],
  peds: ["paediatric", "pediatric", "child", "infant"],
  txa: ["tranexamic acid", "major haemorrhage", "hemorrhage control"],
  tca: ["tricyclic antidepressants", "tricyclic antidepressant"],
  od: ["overdose", "toxicity", "poisoning"],
  io: ["intraosseous access", "io access"],
  iv: ["intravenous"],
  im: ["intramuscular"],
  po: ["oral medication", "per os"],
  neb: ["nebulized therapy", "nebuliser", "nebulizer"],
  af: ["atrial fibrillation", "a-fib"],
  svt: ["supraventricular tachycardia", "narrow complex tachycardia"],
  vt: ["ventricular tachycardia", "wide complex tachycardia"],
  vf: ["ventricular fibrillation", "v-fib"],
  pea: ["pulseless electrical activity"],
  rosc: ["post rosc", "return of spontaneous circulation", "post cardiac arrest care"],
  cva: ["stroke", "acute stroke"],
  fast: ["be-fast", "be fast", "stroke screen", "stroke"],
  tbi: ["head injury", "traumatic brain injury"],
  apo: ["acute pulmonary oedema", "pulmonary edema", "pulmonary oedema"],
  pe: ["pulmonary embolism"],
  dka: ["diabetic ketoacidosis"],
  hhs: ["hyperosmolar", "hyperosmolar hyperglycemic state"],
  abd: ["acute behavioural disturbance", "excited delirium"],
  mci: ["multiple casualty incidents"],
  hazmat: ["chemical exposure", "decontamination"],
  fbao: ["foreign body airway obstruction", "choking"],
  rsi: ["rapid sequence induction", "intubation", "induction"],
  dsi: ["delayed sequence induction"],
  etco2: ["capnography", "end tidal co2"],
  ecg: ["ekg", "12 lead", "twelve lead", "electrocardiogram"],
  ekg: ["ecg", "12 lead", "twelve lead", "electrocardiogram"],
  aed: ["defibrillator", "automated external defibrillator"],
  bvm: ["bag valve mask", "bag-mask ventilation"],
  o2: ["oxygen", "supplemental oxygen"],
  lvo: ["large vessel occlusion", "stroke"],
  etoh: ["alcohol intoxication", "ethanol"],
  gtn: ["nitroglycerin", "glyceryl trinitrate"],
  epi: ["adrenaline", "epinephrine"],
  gcs: ["glasgow coma scale", "consciousness status assessment"],
  avpu: ["consciousness status assessment", "level of consciousness"],
  dsed: ["double sequential external defibrillation", "pad placement", "defibrillation"]
});

const VARIANTS = expansionMap({
  oedema: ["edema"], edema: ["oedema"],
  haemorrhage: ["hemorrhage", "bleeding", "major bleed"], hemorrhage: ["haemorrhage", "bleeding", "major bleed"],
  hypoxaemia: ["hypoxemia", "hypoxia", "low oxygen"], hypoxemia: ["hypoxaemia", "hypoxia", "low oxygen"],
  paediatric: ["pediatric", "peds", "child"], pediatric: ["paediatric", "peds", "child"],
  nebuliser: ["nebulizer", "neb"], nebulizer: ["nebuliser", "neb"],
  labour: ["labor"], labor: ["labour"], behaviour: ["behavior"], behavioral: ["behavioural"], behavioural: ["behavioral"],
  manoeuvre: ["maneuver"], maneuver: ["manoeuvre"], immobilisation: ["immobilization"], immobilization: ["immobilisation"],
  haematology: ["hematology"], anaemia: ["anemia"], caesarean: ["cesarean"], sulphate: ["sulfate"], sulfate: ["sulphate"],
  centre: ["center"], litre: ["liter"], paediatrics: ["pediatrics"]
});

const SYMPTOMS = expansionMap({
  wheeze: ["asthma", "bronchospasm", "salbutamol", "ipratropium"], wheezing: ["asthma", "bronchospasm", "salbutamol", "ipratropium"],
  stridor: ["croup", "epiglottitis", "airway"], drooling: ["epiglottitis", "airway"], choking: ["foreign body airway obstruction", "magill", "fbao"],
  "chest pain": ["acute coronary syndrome", "stemi", "nstemi", "12 lead ecg"], "chest tightness": ["asthma", "acute coronary syndrome", "gtn"],
  "jaw pain": ["acute coronary syndrome"], "left arm pain": ["acute coronary syndrome"],
  breathless: ["copd", "asthma", "pulmonary embolism", "acute pulmonary oedema"], "shortness of breath": ["copd", "asthma", "pulmonary embolism", "acute pulmonary oedema"], dyspnea: ["copd", "asthma", "pulmonary embolism", "acute pulmonary oedema"],
  "low spo2": ["respiratory distress", "hypoxaemia", "severe respiratory infection"], hypoxia: ["respiratory distress", "hypoxaemia", "severe respiratory infection"],
  palpitations: ["tachyarrhythmias", "svt", "af", "vt"], syncope: ["pulmonary embolism", "tachyarrhythmias", "bradyarrhythmias", "stroke", "cardiac arrest"], collapse: ["cardiac arrest", "syncope", "shock"],
  seizure: ["seizures", "status epilepticus", "midazolam"], convulsion: ["seizures", "status epilepticus"], agitated: ["acute behavioural disturbance", "sedation"],
  "slurred speech": ["stroke", "fast", "be-fast"], "facial droop": ["stroke", "fast", "be-fast"], "one sided weakness": ["stroke", "fast", "be-fast"], numbness: ["stroke", "fast", "be-fast"],
  hypotension: ["non-traumatic shock", "sepsis", "cardiogenic shock", "anaphylaxis"], shock: ["non-traumatic shock", "sepsis", "cardiogenic shock", "anaphylaxis"], fever: ["sepsis", "infection"],
  hives: ["anaphylaxis", "adrenaline", "diphenhydramine"], rash: ["anaphylaxis", "allergic reaction"], "tongue swelling": ["anaphylaxis"], "throat tightness": ["anaphylaxis"],
  "low sugar": ["hypoglycaemia", "hypoglycemia", "dextrose", "glucagon"], hypoglycemia: ["hypoglycaemia", "dextrose", "glucagon"], "high sugar": ["hyperglycaemia", "dka", "hhs"],
  "head injury": ["traumatic brain injury", "gcs"], headache: ["stroke", "hypertension"], nausea: ["nausea and vomiting", "ondansetron"], vomiting: ["nausea and vomiting", "ondansetron"],
  bleeding: ["major haemorrhage", "txa", "trauma"], tourniquet: ["major haemorrhage", "txa"], burn: ["burns"], burns: ["burns"],
  overdose: ["toxicity", "poisoning", "naloxone"], poisoning: ["toxicity", "overdose"], drowning: ["submersion incident"], triage: ["multiple casualty incidents"],
  "12 lead": ["ecg", "ekg", "lead placement"], "lead placement": ["ecg", "12 lead", "right sided ecg", "posterior leads"], pads: ["pad placement", "defibrillation", "dsed"], "right sided ecg": ["12 lead", "ecg"], "posterior leads": ["12 lead", "ecg"]
});

const BRANDS = bidirectional([
  ["Ventolin", "salbutamol", "albuterol"], ["Atrovent", "ipratropium"], ["Lasix", "furosemide"], ["Zofran", "ondansetron"],
  ["Reglan", "Maxolon", "metoclopramide"], ["Versed", "Dormicum", "midazolam"], ["Narcan", "naloxone"],
  ["Levophed", "noradrenaline", "norepinephrine"], ["Decadron", "dexamethasone"], ["Pulmicort", "budesonide"],
  ["Brufen", "Nurofen", "Advil", "Motrin", "ibuprofen"], ["Panadol", "Tylenol", "paracetamol", "acetaminophen"],
  ["Voltaren", "Cataflam", "diclofenac"], ["Plavix", "clopidogrel"], ["Disprin", "ASA", "aspirin"],
  ["Toradol", "ketorolac"], ["Ketalar", "ketamine"], ["Penthrox", "methoxyflurane"], ["Adenocard", "adenosine"],
  ["Anectine", "succinylcholine", "suxamethonium"], ["Esmeron", "rocuronium"], ["Norcuron", "vecuronium"],
  ["EpiPen", "adrenaline", "epinephrine"], ["AtroPen", "atropine"], ["Nitrostat", "Nitrolingual", "gtn", "nitroglycerin", "glyceryl trinitrate"]
]);

export function extractItems(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

function documentPrefix(type) {
  return String(type || "").toUpperCase();
}

function documentFields(type) {
  return {
    numberField: `${type}_number`,
    sectionField: `${type}_section`
  };
}

function inferDocumentNumber(type, item, aliases, domains) {
  const fields = [`${type}_number`, "document_number", "number"];
  for (const field of fields) {
    const n = normalizeDocNumber(item[field] || "");
    if (n) return n;
  }
  const prefix = documentPrefix(type).toLowerCase();
  const haystack = [item.title, aliases, item.keywords || [], domains].flat(Infinity).join(" ").toLowerCase();
  const prefixed = haystack.match(new RegExp(`\b${prefix}\s*([0-9]+(?:[.\-_:][0-9]+)*)\b`));
  if (prefixed) return normalizeDocNumber(prefixed[1]);
  const numberedAlias = aliases.map((a) => normalizeSearchText(a)).find((a) => /^\d+(?:\.\d+)+$/.test(a));
  return numberedAlias ? normalizeDocNumber(numberedAlias) : "";
}

function pageRange(a, b) {
  const s = Number(a), e = Number(b);
  if (Number.isFinite(s) && Number.isFinite(e) && e > s) return `${s}-${e}`;
  if (Number.isFinite(s)) return String(s);
  return "";
}

export function buildDocumentTargets(items, type, extra = {}) {
  const prefix = documentPrefix(type);
  const fields = { ...documentFields(type), ...extra };
  return extractItems(items).map((item) => {
    const title = String(item.title || item.name || item.label || "").trim();
    const pageStart = Number(item.page_start || item.page || item.p || item.pageNumber || 0);
    if (!title || !Number.isFinite(pageStart) || pageStart <= 0) return null;
    const aliases = Array.isArray(item.aliases) ? item.aliases : [];
    const keywords = Array.isArray(item.keywords) ? item.keywords : [];
    const domains = Array.isArray(item.domains) ? item.domains : [];
    const number = inferDocumentNumber(type, item, aliases, domains);
    const section = item[fields.sectionField] || item.section || "";
    const numberTerms = number ? [number, `${prefix} ${number}`, `${prefix}${number}`, `${number} ${title}`, `${prefix} ${number} ${title}`] : [];
    const ages = Array.isArray(item.age_groups) ? item.age_groups : [];
    const pageEnd = Number(item.page_end || pageStart);
    const range = pageRange(pageStart, pageEnd);
    const subtitle = [section, range ? `Page ${range}` : ""].filter(Boolean).join(" · ");
    const pillLabel = number ? `${prefix} ${number}` : prefix;
    const target = {
      id: item.id || `${type}:${title}:${pageStart}`,
      title,
      subtitle,
      pillLabel,
      type,
      documentType: type,
      documentNumber: number,
      page: pageStart,
      pageStart,
      pageEnd: Number.isFinite(pageEnd) ? pageEnd : pageStart,
      page_start: pageStart,
      page_end: Number.isFinite(pageEnd) ? pageEnd : pageStart,
      itemType: item.type || "",
      section,
      domains,
      age_groups: ages,
      sop_number: item.sop_number,
      sop_section: item.sop_section,
      cpm_number: item.cpm_number,
      cpm_section: item.cpm_section,
      primaryTerms: uniq([title, ...numberTerms, ...aliases]),
      secondaryTerms: uniq([keywords, item.type, section, domains, ages]),
      raw: item
    };
    prepareTarget(target);
    return target;
  }).filter(Boolean);
}

export function buildFeatureTargets(buttons, extraTerms = {}) {
  return buttons.map((btn) => {
    const target = {
      id: `feature:${btn.text}`,
      title: btn.text,
      subtitle: "Open feature",
      pillLabel: "Feature",
      type: "tool",
      documentType: "feature",
      actionId: btn.actionId,
      href: btn.href,
      primaryTerms: uniq([btn.text]),
      secondaryTerms: uniq(extraTerms[btn.text] || []),
      raw: btn
    };
    prepareTarget(target);
    return target;
  });
}

export function buildSimplePageTargets(data, type, opts = {}) {
  const items = extractItems(data);
  if (items.length) {
    return items.map((item) => {
      const title = String(item.title || item.name || item.label || "").trim();
      const page = Number(String(item.page || item.p || item.pageNumber || item.page_start || "").replace(/[^\d]/g, ""));
      if (!title || !page) return null;
      const target = {
        id: `${type}:${title}:${page}`,
        title,
        subtitle: opts.subtitle || (page ? `Page ${page}` : ""),
        pillLabel: opts.pillLabel || (type === "flowchart" ? "Flowchart" : "Formulary"),
        type,
        documentType: type,
        page,
        pageStart: page,
        pageEnd: page,
        page_start: page,
        page_end: page,
        primaryTerms: uniq([title, item.aliases || []]),
        secondaryTerms: uniq([item.keywords || [], item.type, item.domains || [], item.age_groups || []]),
        raw: item
      };
      prepareTarget(target);
      return target;
    }).filter(Boolean);
  }

  const out = [];
  if (data && typeof data === "object") {
    Object.keys(data).forEach((key) => {
      const value = data[key];
      if (typeof value === "number" || typeof value === "string") {
        const page = Number(String(value).replace(/[^\d]/g, ""));
        if (!page) return;
        const target = { id: `${type}:${key}:${page}`, title: key, subtitle: `Page ${page}`, pillLabel: opts.pillLabel || type, type, documentType: type, page, pageStart: page, pageEnd: page, page_start: page, page_end: page, primaryTerms: uniq([key]), secondaryTerms: [] };
        prepareTarget(target); out.push(target);
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        Object.keys(value).forEach((childKey) => {
          const page = Number(String(value[childKey]).replace(/[^\d]/g, ""));
          if (!page) return;
          const target = { id: `${type}:${key}:${childKey}:${page}`, title: childKey, subtitle: `${key} · Page ${page}`, pillLabel: opts.pillLabel || type, type, documentType: type, page, pageStart: page, pageEnd: page, page_start: page, page_end: page, primaryTerms: uniq([childKey]), secondaryTerms: uniq([key]) };
          prepareTarget(target); out.push(target);
        });
      }
    });
  }
  return out;
}

function prepareTarget(target) {
  target._title = normalizeSearchText(target.title);
  target._subtitle = normalizeSearchText(target.subtitle);
  target._pill = normalizeSearchText(target.pillLabel);
  target._primary = normList(target.primaryTerms || []);
  target._secondary = normList(target.secondaryTerms || []);
  target._all = normalizeSearchText([target.title, target.subtitle, target.pillLabel, ...(target.primaryTerms || []), ...(target.secondaryTerms || [])].join(" "));
  target.searchText = target._all;
  return target;
}

function buildTerms(query) {
  const q = normalizeSearchText(query);
  const base = q.split(" ").filter((w) => w && (!STOP.has(w) || /\d/.test(w)));
  const terms = [];
  const add = (term, weight, kind) => {
    const t = normalizeSearchText(term);
    if (!t) return;
    const existing = terms.find((x) => x.term === t);
    if (existing) existing.weight = Math.max(existing.weight, weight);
    else terms.push({ term: t, weight, kind });
  };
  add(q, 1.35, "query");
  base.forEach((t) => add(t, 1, "base"));
  for (let span = 2; span <= 3; span++) {
    for (let i = 0; i <= base.length - span; i++) add(base.slice(i, i + span).join(" "), 1.18, "phrase");
  }
  const initial = terms.slice();
  initial.forEach(({ term }) => {
    [...(ABBR[term] || []), ...(VARIANTS[term] || []), ...(BRANDS[term] || [])].forEach((x) => add(x, 0.88, "expanded"));
    [...(SYMPTOMS[term] || [])].forEach((x) => add(x, 0.62, "symptom"));
  });
  return { q, base, terms };
}

function detectDocumentIntent(q) {
  const match = q.match(/\b(cpg|sop|cpm|pat)\s*[-:]?\s*(\d+(?:[.\-_:]\d+)*)\b/);
  if (match) return { documentType: match[1], documentNumber: normalizeDocNumber(match[2]) };
  const typeOnly = q.match(/\b(cpg|sop|cpm|pat)\b/);
  const numOnly = q.match(/\b\d+(?:[.\-_:]\d+)+\b/);
  return {
    documentType: typeOnly ? typeOnly[1] : "",
    documentNumber: numOnly ? normalizeDocNumber(numOnly[0]) : ""
  };
}

function scoreTextList(list, term, exact, starts, contains) {
  let best = 0;
  for (const text of list) {
    if (!text) continue;
    if (text === term) best = Math.max(best, exact);
    else if (text.startsWith(term)) best = Math.max(best, starts);
    else if (text.includes(term)) best = Math.max(best, contains);
  }
  return best;
}

function lev(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

function fuzzyScore(target, term) {
  if (term.length < 4 || term.length > 18 || term.includes(" ")) return 0;
  const primary = [target._title, ...(target._primary || [])].filter((x) => x.length >= 4 && x.length <= 40);
  let best = 99;
  primary.forEach((x) => { best = Math.min(best, lev(x, term)); });
  if (best === 1) return 38;
  if (best === 2 && term.length >= 6) return 28;
  const secondary = (target._secondary || []).filter((x) => x.length >= 4 && x.length <= 32);
  secondary.forEach((x) => { best = Math.min(best, lev(x, term)); });
  if (best === 1) return 18;
  if (best === 2 && term.length >= 7) return 12;
  return 0;
}

function scoreTerm(target, term) {
  if (!term) return 0;
  let best = 0;
  best = Math.max(best, scoreTextList([target._title], term, 150, 118, 96));
  best = Math.max(best, scoreTextList(target._primary || [], term, 138, 110, 88));
  best = Math.max(best, scoreTextList([target._pill], term, 112, 90, 68));
  best = Math.max(best, scoreTextList([target._subtitle], term, 64, 46, 34));
  best = Math.max(best, scoreTextList(target._secondary || [], term, 58, 40, 26));
  if (!best && target._all && target._all.includes(term)) best = term.includes(" ") ? 32 : 14;
  if (!best) best = fuzzyScore(target, term);
  return best;
}

function scoreIntent(target, intent) {
  let s = 0;
  if (intent.documentType) {
    if (target.documentType === intent.documentType) s += 42;
    else if (["cpg", "sop", "cpm", "pat"].includes(target.documentType)) s -= 36;
  }
  if (intent.documentNumber && target.documentNumber) {
    if (target.documentNumber === intent.documentNumber) s += 280;
    else if (target.documentNumber.startsWith(intent.documentNumber)) s += 72;
    else if (intent.documentType && target.documentType === intent.documentType) s -= 80;
  }
  return s;
}

function specialBoost(target, q, expandedTerms) {
  const all = new Set([q, ...expandedTerms.map((x) => x.term)]);
  const hasAny = (words) => words.some((w) => all.has(w) || q.includes(w));
  let s = 0;
  const t = `${target.itemType || ""} ${target._all}`;
  if (hasAny(["drug", "dose", "mg", "mcg", "ml", "iv", "im", "io", "po", "neb", "infusion", "bolus"])) {
    if (target.type === "formulary" || /drug|formulary|medication/.test(t)) s += 28;
  }
  if (hasAny(["cpr", "defib", "shock", "rosc", "vf", "vt", "pea", "asystole", "arrest"]) && /arrest|resuscitation|defib|shock/.test(t)) s += 22;
  if (hasAny(["peds", "pediatric", "paediatric", "child", "infant", "kid"]) && /peds|pediatric|paediatric|child|infant/.test(t)) s += 18;
  if (hasAny(["lead", "leads", "12 lead", "ecg", "ekg", "pads", "pad placement", "dsed", "right sided ecg", "posterior leads"]) && /visual guides|ecg|ekg|lead|pad|defib/.test(t)) s += 14;
  return s;
}

function scoreCoverage(target, baseTokens) {
  if (!baseTokens.length) return 0;
  let matched = 0;
  baseTokens.forEach((token) => { if (scoreTerm(target, token) > 0) matched++; });
  const ratio = matched / baseTokens.length;
  if (ratio === 1) return 42;
  if (ratio >= 0.67) return 20;
  if (ratio < 0.5 && baseTokens.length >= 2) return -24;
  return 0;
}

function colorFromPercent(pct, isTop, gap) {
  if (pct >= 85 || (isTop && pct >= 75 && gap >= 25)) return "green";
  if (pct >= 60) return "amber";
  if (pct >= 35) return "red";
  return "gray";
}

export function searchTargets(targets, query, options = {}) {
  const maxResults = Number(options.maxResults || 40);
  const { q, base, terms } = buildTerms(query);
  if (!q) return [];
  const intent = detectDocumentIntent(q);
  const scored = [];
  targets.forEach((target) => {
    let score = scoreIntent(target, intent);
    terms.forEach(({ term, weight }) => { score += scoreTerm(target, term) * weight; });
    score += scoreCoverage(target, base);
    score += specialBoost(target, q, terms);
    if (target.type === "tool") score += 6;
    if (score > 20) scored.push({ ...target, score });
  });
  scored.sort((a, b) => b.score - a.score || String(a.title).localeCompare(String(b.title)));
  const top = scored[0]?.score || 0;
  const next = scored[1]?.score || 0;
  return scored.slice(0, maxResults).map((item, index) => {
    const pct = Math.max(0, Math.min(100, Math.round((item.score / Math.max(180, top || 180)) * 100)));
    return {
      ...item,
      score_pct: pct,
      score_color: colorFromPercent(pct, index === 0, top - next),
      had_results: true
    };
  });
}

export function buildDocumentSearcher(type, items, options = {}) {
  const targets = buildDocumentTargets(items, type, options);
  return {
    search(query, searchOptions = {}) {
      const results = searchTargets(targets, query, { maxResults: searchOptions.maxResults || 10 });
      return {
        query,
        had_results: results.length > 0,
        results: results.map((r) => ({
          id: r.id,
          title: r.title,
          page_start: r.pageStart,
          page_end: r.pageEnd,
          type: r.itemType,
          domains: r.domains || [],
          age_groups: r.age_groups || [],
          sop_number: r.sop_number,
          sop_section: r.sop_section,
          cpm_number: r.cpm_number,
          cpm_section: r.cpm_section,
          score: r.score,
          score_pct: r.score_pct,
          score_color: r.score_color
        })),
        suggestion: null
      };
    }
  };
}
