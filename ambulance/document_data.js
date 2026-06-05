// /ambulance/document_data.js
// CHANGELOG (2026-06-05):
// - Add version-aware document config loading from iOS App config for Guidelines CPG/SOP/CPM/PAT.

const DEFAULT_DOCUMENTS = [
  {
    type:"CPG",
    version:"2.5",
    pdf_url:"https://docs.niwashibase.com/docs/cpg-81w9d1f.pdf",
    index_url:"https://api.niwashibase.com/api/v1/ambulance/app-data/cpg-index"
  },
  {
    type:"SOP",
    version:"4.4",
    pdf_url:"https://docs.niwashibase.com/docs/sop-101qq9f2w.pdf",
    index_url:"https://api.niwashibase.com/api/v1/ambulance/app-data/sop-index"
  },
  {
    type:"CPM",
    version:"4.0",
    pdf_url:"https://docs.niwashibase.com/docs/cpm-202e9d33q.pdf",
    index_url:"https://api.niwashibase.com/api/v1/ambulance/app-data/cpm-index"
  },
  {
    type:"PAT",
    version:"1.1",
    pdf_url:"https://docs.niwashibase.com/docs/pat-301h6j54r.pdf",
    index_url:"https://api.niwashibase.com/api/v1/ambulance/app-data/pat-index"
  }
];

let memory = null;
let pending = null;

async function appConfigModule() {
  if (window.__AMBULANCE_SHARED_MODULES?.appConfigData) {
    return window.__AMBULANCE_SHARED_MODULES.appConfigData;
  }
  const version = encodeURIComponent(window.__AMBULANCE_ASSET_VERSION || "current");
  return import(`./app_config_data.js?ver=${version}`);
}

function normalizeDocument(item) {
  const type = String(item?.type || "").trim().toUpperCase();
  const version = String(item?.version || "").trim();
  const pdfUrl = String(item?.pdf_url || item?.pdfUrl || "").trim();
  const indexUrl = String(item?.index_url || item?.indexUrl || "").trim();
  if (!["CPG", "SOP", "CPM", "PAT"].includes(type) || !version || !pdfUrl || !indexUrl) return null;
  return {
    type,
    version,
    pdfUrl,
    indexUrl,
    cacheKey:type.toLowerCase()
  };
}

function normalizeDocuments(items) {
  const normalized = (Array.isArray(items) ? items : [])
    .map(normalizeDocument)
    .filter(Boolean);
  const byType = new Map(DEFAULT_DOCUMENTS.map((item) => {
    const doc = normalizeDocument(item);
    return [doc.type, doc];
  }));
  normalized.forEach((doc) => byType.set(doc.type, doc));
  return ["CPG", "SOP", "CPM", "PAT"].map((type) => byType.get(type)).filter(Boolean);
}

export async function getDocumentConfigs() {
  if (memory) return memory;
  if (pending) return pending;
  pending = (async () => {
    try {
      const { getAppConfig } = await appConfigModule();
      const config = await getAppConfig();
      memory = normalizeDocuments(config?.documents);
      return memory;
    } catch (_) {
      memory = normalizeDocuments(DEFAULT_DOCUMENTS);
      return memory;
    }
  })().finally(() => { pending = null; });
  return pending;
}

export async function getDocumentConfig(type) {
  const wanted = String(type || "").trim().toUpperCase();
  const configs = await getDocumentConfigs();
  return configs.find((item) => item.type === wanted) || null;
}

export function preloadDocumentConfigs() {
  return getDocumentConfigs().catch(() => normalizeDocuments(DEFAULT_DOCUMENTS));
}
