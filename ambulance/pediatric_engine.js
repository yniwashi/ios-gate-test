// /ambulance/pediatric_engine.js
// CHANGELOG (2026-06-05):
// - Port Android PediatricDosingEngine, input validation, normal vitals, and volume calculation to JavaScript.

const VITAL_RANGES = [
  { months:[1,2], weight:[3,4], v:["Term-2 months","3-4","35-55","110-160","65-85","45-55","36.5","2.6-6"] },
  { months:[3,7], weight:[5,7], v:["3-7 months","5-7","35-45","110-160","70-90","50-65","36.5","4-6"] },
  { months:[8,12], weight:[8,11], v:["8-12 months","8-11","22-38","90-160","80-100","55-65","36.5","4-6"] },
  { years:[1,3], weight:[12,15], v:["1-3 years","12-15","22-30","80-150","90-105","55-70","36.5","4-6"] },
  { years:[4,5], weight:[16,21], v:["4-5 years","16-21","20-24","70-120","95-110","60-75","36.5","4-6"] },
  { years:[6,7], weight:[22,28], v:["6-7 years","22-28","20-24","70-120","95-110","60-75","36.5","4-6"] },
  { years:[8,9], weight:[29,34], v:["8-9 years","29-34","16-22","60-110","100-120","60-75","36.5","4-6"] },
  { years:[10,11], weight:[35,40], v:["10-11 years","35-40","16-22","60-110","100-120","60-75","36.5","4-6"] },
  { years:[12,13], weight:[41,45], v:["12-13 years","41-45","12-20","60-100","110-135","65-85","36.5","4-6"] },
  { years:[14,14], weight:[46,50], v:[">=14 years","46-50","12-20","60-100","110-135","65-85","36.5","4-6"] }
];

const cleanText = value => {
  const text = String(value ?? "").trim();
  return text && text.toLowerCase() !== "null" ? text : "";
};
const visibleText = value => {
  const text = cleanText(value);
  return text && text !== "-" && text !== "—";
};
const ceil2 = value => {
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 1e-9) return String(rounded);
  return String(Math.ceil((value - 1e-12) * 100) / 100).replace(/\.?0+$/, "");
};

export function medicationSummaries(helper) {
  return (helper?.medications || [])
    .filter(m => m?.enabled !== false && m?.availability?.enabled !== false && cleanText(m.id))
    .map(m => ({
      id: cleanText(m.id),
      displayName: cleanText(m.display?.name) || cleanText(m.name) || cleanText(m.id),
      backgroundColor: cleanText(m.ui?.background_color) || cleanText(m.ui?.theme_color) || "#EFF6FF",
      textColor: cleanText(m.ui?.text_color) || "#111827",
      accentColor: cleanText(m.ui?.accent_color) || cleanText(m.ui?.theme_color) || "#2563EB",
      sortOrder: Number.isFinite(Number(m.ui?.sort_order)) ? Number(m.ui.sort_order) : Number.MAX_SAFE_INTEGER
    }))
    .sort((a,b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName));
}

function conditionMatches(condition = {}, input, weightKg) {
  if (cleanText(condition.profile) && condition.profile !== input.profile) return false;
  const tests = [
    ["age_months_min", input.ageMonths, (a,b)=>a>=b],
    ["age_months_max", input.ageMonths, (a,b)=>a<=b],
    ["age_months_min_exclusive", input.ageMonths, (a,b)=>a>b],
    ["age_months_max_exclusive", input.ageMonths, (a,b)=>a<b],
    ["age_years_min", input.ageYears, (a,b)=>a>=b],
    ["age_years_max", input.ageYears, (a,b)=>a<=b],
    ["age_years_min_exclusive", input.ageYears, (a,b)=>a>b],
    ["age_years_max_exclusive", input.ageYears, (a,b)=>a<b],
    ["weight_kg_min", weightKg, (a,b)=>a>=b],
    ["weight_kg_max", weightKg, (a,b)=>a<=b],
    ["weight_kg_min_exclusive", weightKg, (a,b)=>a>b],
    ["weight_kg_max_exclusive", weightKg, (a,b)=>a<b]
  ];
  return tests.every(([key,value,test]) => !(key in condition) || (value != null && test(value, Number(condition[key]))));
}

function resolveWeight(input) {
  if (input.directWeightKg != null) {
    const weight = Number(input.directWeightKg);
    return Number.isFinite(weight) && weight > 0 ? weight : null;
  }
  if (input.profile.endsWith("_months") && input.ageMonths != null) return input.ageMonths * 0.5 + 4;
  if (input.profile.endsWith("_years") && input.ageYears != null) {
    return input.ageYears <= 5 ? input.ageYears * 2 + 8 : input.ageYears * 3 + 7;
  }
  return null;
}

function calculated(text, factorText = null) {
  return { text, calculated:true, reason:null, factorText, unsupported:false };
}
function notCalculated(text, reason = null) {
  return { text, calculated:false, reason, factorText:null, unsupported:false };
}
function unsupported(text) {
  return { text, calculated:false, reason:null, factorText:null, unsupported:true };
}

function evaluateRule(rule, input, weightKg) {
  if (!rule) return unsupported("Unsupported dose rule");
  switch (cleanText(rule.type)) {
    case "static": return calculated(`${ceil2(Number(rule.amount))} ${cleanText(rule.unit)}`.trim());
    case "static_range": return calculated(`${ceil2(Number(rule.min))} - ${ceil2(Number(rule.max))} ${cleanText(rule.unit)}`.trim());
    case "not_indicated": return notCalculated(cleanText(rule.display) || "-", cleanText(rule.reason));
    case "display_only": return notCalculated(cleanText(rule.display) || cleanText(rule.text) || "-");
    case "weight_based_single":
    case "weight_based_with_min_max": {
      let value = weightKg * Number(rule.factor);
      if ("min" in rule) value = Math.max(value, Number(rule.min));
      if ("max" in rule) value = Math.min(value, Number(rule.max));
      return calculated(`${ceil2(value)} ${cleanText(rule.unit)}`.trim(), ceil2(Number(rule.factor)));
    }
    case "weight_based_range": {
      let min = weightKg * Number(rule.min_factor);
      let max = weightKg * Number(rule.max_factor);
      if ("max" in rule) { min = Math.min(min, Number(rule.max)); max = Math.min(max, Number(rule.max)); }
      return Math.abs(max-min) < 1e-6
        ? calculated(`${ceil2(min)} ${cleanText(rule.unit)}`.trim(), ceil2(Number(rule.min_factor)))
        : calculated(`${ceil2(min)} - ${ceil2(max)} ${cleanText(rule.unit)}`.trim(), `${ceil2(Number(rule.min_factor))}-${ceil2(Number(rule.max_factor))}`);
    }
    case "weight_based_rate_single": {
      let value = weightKg * Number(rule.factor);
      if ("min" in rule) value = Math.max(value, Number(rule.min));
      if ("max" in rule) value = Math.min(value, Number(rule.max));
      return calculated(`${ceil2(value)} ${cleanText(rule.unit)}/${cleanText(rule.time) || "min"}`, ceil2(Number(rule.factor)));
    }
    case "weight_based_rate_range":
      return calculated(
        `${ceil2(weightKg * Number(rule.min_factor))} - ${ceil2(weightKg * Number(rule.max_factor))} ${cleanText(rule.unit)}/${cleanText(rule.time) || "min"}`,
        `${ceil2(Number(rule.min_factor))}-${ceil2(Number(rule.max_factor))}`
      );
    case "conditional": {
      const match = (rule.overrides || []).find(item => conditionMatches(item.when || {}, input, weightKg));
      return evaluateRule(match?.rule || rule.default, input, weightKg);
    }
    case "age_or_weight_tier": {
      const blocked = (rule.block_when || []).find(item => conditionMatches(item, input, weightKg));
      if (blocked) return notCalculated("-", cleanText(blocked.reason) || "Not indicated");
      const tiers = input.directWeightKg != null ? (rule.weight_tiers || []) : (rule.age_tiers || []);
      const match = tiers.find(item => conditionMatches(item, input, weightKg));
      return evaluateRule(match?.rule || rule.no_matching_tier, input, weightKg);
    }
    default: return unsupported(`Unsupported dose rule type: ${cleanText(rule.type)}`);
  }
}

export function calculateMedication(helper, medicationId, input) {
  const medication = (helper?.medications || []).find(m => cleanText(m.id).toLowerCase() === String(medicationId).toLowerCase());
  if (!medication || medication.enabled === false || medication.availability?.enabled === false) return null;
  const weightKg = resolveWeight(input);
  if (weightKg == null) {
    return { medicationId, displayName:cleanText(medication.display?.name)||cleanText(medication.name), header:"Enter age or weight.", warnings:medication.warnings||[], sections:[] };
  }
  const sections = (medication.sections || [])
    .filter(s => s?.enabled !== false && (s.applies_to || []).includes(input.profile))
    .map(section => {
      const dose = evaluateRule(section.dose_rule, input, weightKg);
      const route = !dose.calculated && "route_when_not_indicated" in section
        ? cleanText(section.route_when_not_indicated) || "-"
        : dose.calculated && "route_when_calculated" in section
          ? cleanText(section.route_when_calculated) || "-"
          : cleanText(section.route) || "-";
      const rawNotes = !dose.calculated && "notes_when_not_indicated" in section
        ? cleanText(section.notes_when_not_indicated)
        : dose.calculated && "notes_template_when_calculated" in section
          ? cleanText(section.notes_template_when_calculated)
          : cleanText(section.notes_template) || cleanText(section.notes);
      const rendered = rawNotes
        .replaceAll("{weight_kg}", ceil2(weightKg))
        .replaceAll("{dose_factor}", dose.factorText || "")
        .split("\n").filter(line => !/[{}]/.test(line)).join("\n").trim();
      return {
        sectionId:cleanText(section.id),
        indication:cleanText(section.indication) || cleanText(section.display?.title),
        dose:dose.text,
        route,
        notes:dose.reason || rendered || null,
        badge:cleanText(section.ui?.badge) || null,
        doseLabel:cleanText(section.display?.dose_label) || "Dose",
        calculated:dose.calculated,
        showVolumeCalculator:section.display?.show_volume_calculator !== false,
        unsupported:dose.unsupported
      };
    })
    .filter(s => visibleText(s.indication) || visibleText(s.dose) || visibleText(s.route) || cleanText(s.notes));
  return {
    medicationId:cleanText(medication.id),
    displayName:cleanText(medication.display?.name) || cleanText(medication.name) || cleanText(medication.id),
    header:input.directWeightKg != null ? `Patient weight is ${ceil2(weightKg)} kg.` : `Patient estimated weight is ${ceil2(weightKg)} kg.`,
    warnings:(medication.warnings || []).map(w => ({ level:cleanText(w.level)||"caution", title:cleanText(w.title), message:cleanText(w.message) })),
    sections,
    weightKg,
    concentration:medication.concentration || null,
    reference:medication.formulary_reference || { type:"formulary", query:cleanText(medication.display?.name)||cleanText(medication.name) }
  };
}

export function validateInput(scope, mode, ageText, weightText = "") {
  const age = cleanText(ageText);
  const weight = cleanText(weightText);
  if (scope === "AP") {
    if (!age) return "Please enter age.";
    if (!/^\d+$/.test(age)) return "Invalid input. Please enter a valid number.";
    const n = Number(age);
    if (n <= 0) return "Please enter a value greater than 0.";
    if (mode === "months" && n > 12) return "This age exceeds 12 months. Please choose the years section in pediatric for appropriate guidance.";
    if (mode === "years" && n > 14) return "This age exceeds the pediatric range. Please refer to the CPG by pressing View Formulary button for appropriate medication guidance.";
    return null;
  }
  if (age && weight) return "Please fill only one field: Age or Weight.";
  if (!age && !weight) return "Please enter age or weight.";
  if (age && !/^\d+$/.test(age)) return "Please enter a valid whole number for age.";
  if (weight && !/^\d+$/.test(weight)) return "Please enter a valid whole number for weight.";
  const a = age ? Number(age) : null;
  const w = weight ? Number(weight) : null;
  if (a != null && a <= 0) return "Please enter a valid age.";
  if (w != null && w <= 0) return "Please enter a valid weight.";
  if (mode === "months") {
    if (a != null && a > 12) return "This age exceeds 12 months. Please choose the years section in pediatric for appropriate guidance.";
    if (w != null && w > 10) return `The weight entered (${w} kg) exceeds the estimated weight for a 12-month-old child, which is 10 kg.`;
  } else {
    if (a != null && a > 14) return "This age exceeds the pediatric range. Please refer to the CPG by pressing View Formulary button for appropriate medication guidance.";
    if (w != null && w < 10) return `The weight entered (${w} kg) is less than the estimated weight for a 1-year-old child, which is 10 kg.`;
    if (w != null && w > 49) return `The weight entered (${w} kg) exceeds the estimated weight for a 14-year-old child, which is 49 kg.`;
  }
  return null;
}

export function buildInput(scope, mode, ageText, weightText = "") {
  return {
    profile:`${scope.toLowerCase()}_${mode}`,
    ageMonths:mode === "months" && ageText ? Number(ageText) : null,
    ageYears:mode === "years" && ageText ? Number(ageText) : null,
    directWeightKg:scope === "CCP" && weightText ? Number(weightText) : null
  };
}

export function normalVitals(mode, ageText, weightText = "") {
  const value = Number(weightText || ageText);
  const key = weightText ? "weight" : mode;
  const match = VITAL_RANGES.find(item => item[key] && value >= item[key][0] && value <= item[key][1]);
  if (!match) return null;
  const [ageGroup,weight,rr,hr,sbp,dbp,temp,rbs] = match.v;
  return { ageGroup,weight,rr,hr,sbp,dbp,temp,rbs, inputLabel:weightText ? `${value} kg` : `${value} ${mode}`, showAgeGroup:Boolean(weightText) };
}

export function normalVitalsRows() {
  return VITAL_RANGES.map(item => {
    const [ageGroup,weight,rr,hr,sbp,dbp,temp,rbs] = item.v;
    return { ageGroup,weight,rr,hr,sbp,dbp,temp,rbs };
  });
}

function doseUnitToMg(value, unit) {
  if (unit === "mcg") return value / 1000;
  if (unit === "g") return value * 1000;
  return value;
}

export function concentrationGuide(helper, medicationId) {
  const medication = (helper?.medications || []).find(m => m.id === medicationId);
  if (medication?.concentration?.mode !== "user_entered") return null;
  const guide = medication.concentration.guide || {};
  return { supported:true, amount:Number(guide.amount)||null, unit:cleanText(guide.unit)||"mg", volumeMl:Number(guide.volume_ml)||null };
}

export function volumeForSection(section, concentration) {
  if (!concentration || !section?.showVolumeCalculator) return null;
  const route = cleanText(section.route).toLowerCase();
  if (!route || route.includes("infusion")) return null;
  const tokens = new Set(route.match(/[a-z]+/g) || []);
  if (![...tokens].some(t => ["iv","io","im","in"].includes(t))) return null;
  const dose = cleanText(section.dose).toLowerCase().replace(/[–—]/g,"-").replace(/\bto\b/g,"-").replace(/\s+/g," ");
  if (["/","kg","hr","hour","min","ml","j","%","drop","spray"].some(term => dose.includes(term))) return null;
  const range = dose.match(/^.*?(\d+(?:\.\d+)?)\s*(mcg|mg|g)?\s*-\s*(\d+(?:\.\d+)?)\s*(mcg|mg|g)\b.*$/);
  const single = dose.match(/^.*?(\d+(?:\.\d+)?)\s*(mcg|mg|g)\b.*$/);
  let firstMg, secondMg = null;
  if (range) {
    const secondUnit = range[4];
    firstMg = doseUnitToMg(Number(range[1]), range[2] || secondUnit);
    secondMg = doseUnitToMg(Number(range[3]), secondUnit);
  } else if (single) {
    firstMg = doseUnitToMg(Number(single[1]), single[2]);
  } else return null;
  const mgPerMl = doseUnitToMg(Number(concentration.amount), concentration.unit) / Number(concentration.volumeMl);
  if (!Number.isFinite(mgPerMl) || mgPerMl <= 0) return null;
  const first = firstMg / mgPerMl;
  const second = secondMg == null ? null : secondMg / mgPerMl;
  const text = second != null && Math.abs(second-first) > 1e-6 ? `${ceil2(first)} - ${ceil2(second)} ml` : `${ceil2(first)} ml`;
  const perMl = mgPerMl < 1 ? `${ceil2(mgPerMl*1000)} mcg/ml` : `${ceil2(mgPerMl)} mg/ml`;
  return { text, detail:`Based on ${ceil2(concentration.amount)} ${concentration.unit} / ${ceil2(concentration.volumeMl)} ml = ${perMl}` };
}

export function formatNumber(value) { return ceil2(Number(value)); }
