// /ambulance/tools/burn_surface_area.js
// CHANGELOG (2026-06-05):
// - Port the Android adult, child, and infant burn diagrams and Rule of Nines zones.

const zone = (id,label,x,y,w,h,value,rotate=0,oval=false) => ({id,label,x,y,w,h,value,rotate,oval});
const zones = {
  adult:{
    front:[zone("afh","Front head",.51,.120,.20,.152,4.5,0,true),zone("aft","Front trunk",.50,.348,.37,.29,18),zone("afr","Front right arm",.235,.415,.12,.37,4.5,10),zone("afl","Front left arm",.775,.415,.12,.37,4.5,-10),zone("afrl","Front right leg",.405,.730,.16,.43,9,3),zone("afll","Front left leg",.600,.730,.16,.43,9,-3),zone("afp","Perineum",.50,.535,.13,.065,1)],
    back:[zone("abh","Back head",.50,.120,.20,.152,4.5,0,true),zone("abt","Back trunk",.50,.342,.37,.29,18),zone("abr","Back right arm",.235,.415,.12,.37,4.5,10),zone("abl","Back left arm",.775,.415,.12,.37,4.5,-10),zone("abrl","Back right leg",.405,.730,.16,.43,9,3),zone("abll","Back left leg",.595,.730,.16,.43,9,-3)]
  },
  child:{
    front:[zone("cfh","Front head",.5,.128,.34,.185,9,0,true),zone("cft","Front trunk",.50,.362,.37,.25,18),zone("cfr","Front right arm",.235,.415,.12,.34,4.5,10),zone("cfl","Front left arm",.765,.415,.12,.34,4.5,-14),zone("cfrl","Front right leg",.389,.730,.16,.43,7,2),zone("cfll","Front left leg",.615,.730,.16,.43,7,-2),zone("cfp","Perineum",.50,.535,.13,.065,1)],
    back:[zone("cbh","Back head",.5,.128,.34,.185,9,0,true),zone("cbt","Back trunk",.50,.362,.37,.25,18),zone("cbr","Back right arm",.235,.415,.12,.34,4.5,10),zone("cbl","Back left arm",.765,.415,.12,.34,4.5,-10),zone("cbrl","Back right leg",.389,.730,.16,.43,7,2),zone("cbll","Back left leg",.615,.730,.16,.43,7,-2)]
  },
  infant:{
    front:[zone("ifh","Front head",.495,.185,.24,.255,9,0,true),zone("ift","Front trunk",.50,.445,.26,.27,18),zone("ifr","Front right arm",.295,.468,.085,.30,4.5,26),zone("ifl","Front left arm",.698,.465,.085,.30,4.5,-26),zone("ifrl","Front right leg",.395,.755,.13,.30,6.5),zone("ifll","Front left leg",.595,.755,.13,.30,6.5),zone("ifp","Perineum",.50,.629,.13,.075,1)],
    back:[zone("ibh","Back head",.504,.185,.24,.255,9,0,true),zone("ibt","Back trunk",.50,.458,.26,.27,18),zone("ibr","Back right arm",.295,.468,.085,.30,4.5,26),zone("ibl","Back left arm",.698,.465,.085,.30,4.5,-26),zone("ibrl","Back right leg",.395,.755,.13,.30,6.5),zone("ibll","Back left leg",.595,.755,.13,.30,6.5)]
  }
};

export async function run(root){
  let age="adult";const selected=new Map();
  root.innerHTML=`<style>
    .burn-page{max-width:760px;margin:auto;padding:18px;color:var(--text)}.burn-head{text-align:center}.burn-head h2{margin:0;font-size:25px;font-weight:950}.burn-head p{margin:6px;color:var(--muted)}
    .burn-types{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:16px 0}.burn-types button{min-height:44px;border:0;border-radius:14px;background:var(--surface-2);color:var(--text);font-weight:900}.burn-types button.active{background:#EF4444;color:#fff}
    .burn-summary{position:sticky;top:0;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 15px;border:1px solid var(--border);border-radius:8px;background:var(--surface);box-shadow:0 3px 10px rgba(0,0,0,.1)}
    .burn-total strong{display:block;color:#EF4444;font-size:28px}.burn-clear{border:0;border-radius:14px;padding:10px 14px;background:var(--surface-2);color:var(--text);font-weight:900}
    .burn-diagrams{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}.burn-card{padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);text-align:center}.burn-card h3{margin:0 0 8px;font-size:17px}
    .burn-stage{position:relative;width:100%;max-width:300px;margin:auto}.burn-stage.adult,.burn-stage.child{aspect-ratio:346/721}.burn-stage.infant{aspect-ratio:475/525;max-width:350px}.burn-stage img{display:block;width:100%;height:100%;object-fit:contain}
    .burn-zone{position:absolute;border:1px dashed rgba(239,68,68,.48);border-radius:8px;background:rgba(239,68,68,.06);font-size:0}.burn-zone.oval{border-radius:50%}.burn-zone.selected{border:2px solid #DC2626;background:rgba(239,68,68,.48);box-shadow:0 0 0 2px rgba(255,255,255,.75)}
    .burn-list{margin-top:14px;padding:14px;border:1px solid var(--border);border-radius:8px;background:var(--surface)}.burn-list h3{margin:0 0 8px}.burn-list p{margin:0;color:var(--muted)}.burn-list ul{margin:0;padding-left:22px;line-height:1.7}
    :root[data-theme="dark"] .burn-zone{border-color:rgba(248,113,113,.7);background:rgba(127,29,29,.12)}:root[data-theme="dark"] .burn-zone.selected{background:rgba(220,38,38,.55)}
    @media(max-width:500px){.burn-page{padding:14px 10px}.burn-diagrams{gap:7px}.burn-card{padding:7px}.burn-card h3{font-size:14px}}
  </style><div class="burn-page"><div class="burn-head"><h2>Burn Surface Area</h2><p>Tap each affected body area to calculate total body surface area.</p></div>
  <div class="burn-types">${["adult","child","infant"].map(x=>`<button data-age="${x}" class="${x===age?"active":""}">${x[0].toUpperCase()+x.slice(1)}</button>`).join("")}</div>
  <div class="burn-summary"><div class="burn-total"><span>Total burn surface area</span><strong id="burnTotal">0%</strong></div><button class="burn-clear">Clear</button></div>
  <div class="burn-diagrams" id="burnDiagrams"></div><section class="burn-list"><h3>Selected areas</h3><div id="burnList"><p>No areas selected.</p></div></section></div>`;
  const diagrams=root.querySelector("#burnDiagrams"),list=root.querySelector("#burnList"),total=root.querySelector("#burnTotal");
  const update=()=>{
    const entries=[...selected.values()];total.textContent=`${entries.reduce((sum,x)=>sum+x.value,0)}%`;
    list.innerHTML=entries.length?`<ul>${entries.map(x=>`<li>${x.label}: <b>${x.value}%</b></li>`).join("")}</ul>`:`<p>No areas selected.</p>`;
  };
  const render=()=>{
    selected.clear();update();
    diagrams.innerHTML=["front","back"].map(side=>`<section class="burn-card"><h3>${side[0].toUpperCase()+side.slice(1)}</h3><div class="burn-stage ${age}"><img src="images/burns/burn_${age}_${side}.png" alt="${age} body ${side}">${zones[age][side].map(z=>`<button class="burn-zone${z.oval?" oval":""}" aria-label="${z.label} ${z.value} percent" data-zone="${z.id}" style="left:${(z.x-z.w/2)*100}%;top:${(z.y-z.h/2)*100}%;width:${z.w*100}%;height:${z.h*100}%;transform:rotate(${z.rotate}deg)"></button>`).join("")}</div></section>`).join("");
    diagrams.querySelectorAll(".burn-zone").forEach(button=>button.onclick=()=>{const z=[...zones[age].front,...zones[age].back].find(x=>x.id===button.dataset.zone);button.classList.toggle("selected");if(selected.has(z.id))selected.delete(z.id);else selected.set(z.id,z);update();});
  };
  root.querySelectorAll("[data-age]").forEach(button=>button.onclick=()=>{age=button.dataset.age;root.querySelectorAll("[data-age]").forEach(x=>x.classList.toggle("active",x===button));render();});
  root.querySelector(".burn-clear").onclick=render;render();
}
