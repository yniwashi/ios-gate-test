// /ambulance/tools/infusions.js
// CHANGELOG (2026-06-05):
// - Add Android-aligned adult and pediatric infusion reference UI with dark mode.

export async function renderInfusions(root, scope) {
  const version=encodeURIComponent(window.__AMBULANCE_ASSET_VERSION||"current");
  const data=await import(`../infusion_data.js?ver=${version}`);
  const drugs=(scope==="pediatric"?data.pediatricInfusions:data.adultInfusions)
    .slice().sort((a,b)=>a.label.localeCompare(b.label));
  root.innerHTML=`<style>
    .inf-page{max-width:650px;margin:auto;padding:18px;color:var(--text)}
    .inf-heading{text-align:center;margin-bottom:15px}.inf-heading h2{margin:0;font-size:25px;font-weight:950}.inf-heading p{margin:5px 0;color:var(--muted);font-size:14px}
    .inf-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
    .inf-drug{min-height:54px;border:0;border-radius:8px;padding:8px 10px;background:var(--drug);color:#172033;font-size:15px;font-weight:950;box-shadow:inset 0 -2px rgba(0,0,0,.13)}
    .inf-drug.active{outline:3px solid color-mix(in srgb,var(--drug) 72%,white);outline-offset:2px}
    .inf-detail{display:none;margin-top:16px;border:1px solid var(--border);border-radius:8px;background:var(--surface);overflow:hidden}
    .inf-detail.show{display:block}.inf-detail-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 14px;background:color-mix(in srgb,var(--selected) 25%,var(--surface))}
    .inf-detail-head h3{margin:0;font-size:20px;font-weight:950}.inf-formulary{flex:none;border:0;border-radius:14px;background:#1F53D6;color:white;padding:10px 12px;font-weight:900}
    .inf-section{display:grid;gap:8px;padding:15px;border-top:1px solid var(--border)}.inf-section h4{margin:0;font-size:17px;line-height:1.3}.inf-dose{color:#0F766E;font-size:16px;font-weight:900}.inf-notes{white-space:pre-wrap;color:var(--text);font-size:14px;line-height:1.45}
    :root[data-theme="dark"] .inf-dose{color:#5EEAD4}:root[data-theme="dark"] .inf-drug{filter:saturate(.72) brightness(.82);color:#fff;text-shadow:0 1px rgba(0,0,0,.35)}
    @media(prefers-color-scheme:dark){:root[data-theme="auto"] .inf-dose{color:#5EEAD4}:root[data-theme="auto"] .inf-drug{filter:saturate(.72) brightness(.82);color:#fff;text-shadow:0 1px rgba(0,0,0,.35)}}
  </style><div class="inf-page"><div class="inf-heading"><h2>${scope==="pediatric"?"Pediatric":"Adult"} Infusions</h2><p>Select a medication to view its infusion reference.</p></div>
  <div class="inf-grid">${drugs.map((d,i)=>`<button class="inf-drug" data-index="${i}" style="--drug:${d.color}">${d.label}</button>`).join("")}</div>
  <section class="inf-detail" id="infDetail"></section></div>`;
  const detail=root.querySelector("#infDetail");
  root.addEventListener("touchmove",()=>document.activeElement?.blur(),{passive:true});
  root.querySelectorAll(".inf-drug").forEach(button=>button.onclick=()=>{
    const selected=drugs[Number(button.dataset.index)];
    root.querySelectorAll(".inf-drug").forEach(x=>x.classList.toggle("active",x===button));
    detail.style.setProperty("--selected",selected.color);
    detail.classList.add("show");
    detail.innerHTML=`<div class="inf-detail-head"><h3>${selected.label}</h3><button class="inf-formulary">View Formulary</button></div>
      ${selected.sections.map(s=>`<article class="inf-section"><h4>${s.title}</h4><div class="inf-dose">${s.dose}</div><div class="inf-notes">${s.notes}</div></article>`).join("")}`;
    detail.querySelector(".inf-formulary").onclick=async()=>{
      try{
        const {getReferenceItems}=await import(`../reference_data.js?ver=${version}`);
        const {items}=await getReferenceItems("formulary");
        const exact=items.find(x=>x.title.toLowerCase()===selected.label.toLowerCase());
        const match=exact||items.find(x=>x.title.toLowerCase().includes(selected.label.toLowerCase()));
        if(!match) throw new Error("Formulary page not found");
        window.__AMBULANCE_OPEN_DOCUMENT_PAGE?.(match.page,match.title,"cpg");
      }catch(error){alert(error.message||"Could not open formulary");}
    };
    detail.scrollIntoView({behavior:"smooth",block:"nearest"});
  });
}
