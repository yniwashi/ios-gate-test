// /ambulance/tools/visual_guides.js
// CHANGELOG (2026-06-06):
// - Add editable placement tuning notes for pads and ECG leads so coordinates can be adjusted directly.
// - Tune pad and ECG lead coordinates to the shared Android PNG anatomy after confirming raw Android fractions render off-canvas in web layout.
// - Rework Visual Guides overlays to use measured pixel bounds like Android and add tap-to-enlarge placement views.
// - Match Android Visual Guides placement coordinates, fitted-image math, and staged pulse animation.
// - Use Android adult_front/adult_back/pad/pad_heart images for Visual Guides overlays.
// - Add iOS Visual Guides with Android categories, subsections, marker details, and burn %TBSA diagrams.

const zone = (id,label,x,y,w,h,value,rotate=0,oval=false) => ({id,label,x,y,w,h,value,rotate,oval});
const burnZones = {
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

const scene = (title, side, markers, zoom=1, offsetX=0, offsetY=0) => ({title, side, markers, zoom, offsetX, offsetY});
const pad = (id,image,label,description,x,y,startX,startY,width,rotation,color,group="") => ({
  id,label,description,x,y,startX,startY,width,rotation,color,group,kind:"pad",image,step:1,animate:true,labelSize:9,startLabel:""
});
const electrode = (id,label,description,x,y,step,color,width=0.05,labelSize=7.5) => ({
  id,label,description,x,y,startX:1.08,startY:0.08,width,rotation:0,color,group:"",kind:"lead",image:"",step,animate:true,labelSize,startLabel:""
});
const fixedElectrode = (id,label,description,x,y,color,width=0.05,labelSize=7.5) => ({
  id,label,description,x,y,startX:x,startY:y,width,rotation:0,color,group:"",kind:"lead",image:"",step:1,animate:false,labelSize,startLabel:""
});
const movingElectrode = (id,label,description,startX,startY,x,y,step,color,width=0.05,labelSize=7.5,startLabel="") => ({
  id,label,description,x,y,startX,startY,width,rotation:0,color,group:"",kind:"lead",image:"",step,animate:true,labelSize,startLabel,delay:900
});

const C = {
  red:"#DC2626", green:"#16A34A", blue:"#2563EB", purple:"#7C3AED",
  yellow:"#FDE047", darkBlue:"#207DDC", orange:"#F97316",
  black:"#111827", white:"#FFFFFF"
};

// Set to true only while tuning locally. This draws a faint 10% grid over the body image.
const SHOW_PLACEMENT_GRID = false;

const guideData = {
  // PLACEMENT TUNING GUIDE
  // Coordinates below use fractions of the displayed body image:
  // - x: 0.00 = left edge, 0.50 = center, 1.00 = right edge.
  // - y: 0.00 = top edge, 0.50 = middle, 1.00 = bottom edge.
  // - Increase x to move right. Decrease x to move left.
  // - Increase y to move down. Decrease y to move up.
  //
  // Pad call format:
  // pad(id, image, label, description, x, y, startX, startY, width, rotation, color, optionalGroup)
  // - x/y: final pad center location.
  // - startX/startY: where the pad starts before animation. Usually keep near bottom: 0.08, 0.90.
  // - width: pad size as fraction of image width. Example 0.16 = 16%.
  // - rotation: degrees. Negative rotates counter-clockwise, positive rotates clockwise.
  //
  // Electrode call format:
  // electrode(id, label, description, x, y, step, color, optionalWidth, optionalLabelSize)
  // - x/y: final lead center location.
  // - step: sequence order.
  // - width: lead size as fraction of image width. Default 0.05.
  //
  // Fixed electrode format:
  // fixedElectrode(id, label, description, x, y, color, optionalWidth, optionalLabelSize)
  //
  // Moving electrode format:
  // movingElectrode(id, label, description, startX, startY, x, y, step, color, width, labelSize, startLabel)
  // - Used for V4 moving to V4R.

  pads:{
    label:"Defibrillation Pads",
    color:"#DC2626",
    options:[
      { id:"ap", label:"Anterior-Posterior", title:"Anterior-Posterior", color:"#15803D", scenes:[
        // AP pads: adjust x/y only unless the pad size or rotation needs changing.
        scene("Anterior","front",[pad("adult_ap_anterior","pad_heart.png","Anterior pad","Anterior chest over the cardiac apex/precordium, between the midline and the left nipple.",0.53,0.43,0.08,0.90,0.16,0,C.green)]),
        scene("Posterior","back",[pad("adult_ap_posterior","pad.png","Posterior pad","Patient's left back, left of the spine and just below the scapula at heart level.",0.43,0.43,0.12,0.90,0.16,0,C.green)])
      ]},
      { id:"al", label:"Anterior-Lateral", title:"Anterior-Lateral", color:"#B42318", scenes:[
        scene("Anterior-Lateral","front",[
          // AL pads: upper-right pad is rotated -90; lateral/apex pad is rotated 90.
          pad("adult_al_upper_right","pad.png","Right upper chest","Patient's right upper chest, right of the sternum and just below the clavicle.",0.39,0.38,0.08,0.90,0.16,-90,C.red),
          pad("adult_al_apex","pad_heart.png","Left lateral chest","Patient's left lateral chest on the mid-axillary line, below and lateral to the left nipple. Avoid placing it too anteriorly.",0.68,0.51,0.08,0.90,0.16,90,C.red)
        ])
      ]},
      { id:"dsed", label:"DSED", title:"DSED", color:"#EA580C", scenes:[
        scene("DSED front view","front",[
          // DSED front: two AL pads plus the AP anterior pad. Group labels AL/AP drive the legend.
          pad("dsed_set1_upper_right","pad.png","AL - right upper chest","AL pad on the patient's right upper chest, right of the sternum and just below the clavicle.",0.38,0.37,0.08,0.90,0.15,-90,C.red,"AL"),
          pad("dsed_set1_apex","pad_heart.png","AL - left lateral chest","AL pad on the patient's left lateral chest on the mid-axillary line, below and lateral to the left nipple.",0.69,0.52,0.08,0.90,0.15,90,C.red,"AL"),
          pad("dsed_set2_anterior","pad_heart.png","AP - anterior chest","AP anterior pad over the cardiac apex/precordium, between the midline and the left nipple.",0.53,0.43,0.08,0.90,0.15,0,C.green,"AP")
        ]),
        // DSED back: AP posterior pad.
        scene("DSED back view","back",[pad("dsed_set2_posterior","pad.png","AP - posterior back","AP posterior pad on the patient's left back, left of the spine and just below the scapula at heart level.",0.43,0.43,0.12,0.90,0.15,0,C.green,"AP")])
      ]}
    ]
  },
  ecg:{
    label:"ECG Lead Placement",
    color:"#0F766E",
    options:[
      { id:"posterior", label:"Posterior", title:"Posterior ECG V7-V9", color:"#7C3AED", scenes:[scene("V7-V9","back",[
        // Posterior ECG: V7/V8/V9 should stay on the same horizontal line.
        electrode("v7","V7","Uses the V4 lead. Place at the posterior axillary line, same horizontal level as V6.",0.36,0.45,1,C.darkBlue,0.053),
        electrode("v8","V8","Uses the V5 lead. Place below the left scapular tip, same horizontal level as V6.",0.43,0.45,1,C.orange,0.053),
        electrode("v9","V9","Uses the V6 lead. Place in the left paraspinal area, about 2-3 cm lateral to the spine, level with V6.",0.49,0.45,1,C.purple,0.053)
      ])]},
      { id:"right", label:"Right-Sided", title:"Right-Sided ECG", color:"#0F766E", scenes:[scene("V4R","front",[
        // Right-sided ECG: fixed leads stay visible; only V4 moves from startX/startY to x/y and changes label to V4R.
        fixedElectrode("right_ra","RA","Right arm electrode. Place on the right upper limb or right shoulder area.",0.31,0.39,C.white),
        fixedElectrode("right_la","LA","Left arm electrode. Place on the left upper limb or left shoulder area.",0.69,0.39,C.black),
        fixedElectrode("right_v1","V1","Standard V1 position: 4th intercostal space at the right sternal border.",0.47,0.43,C.red),
        fixedElectrode("right_v2","V2","Standard V2 position: 4th intercostal space at the left sternal border.",0.53,0.43,C.yellow),
        fixedElectrode("right_v3","V3","Standard V3 position: midway between V2 and V4.",0.55,0.47,C.green),
        movingElectrode("v4r","V4R","Move V4 to V4R: 5th right intercostal space at the right mid-clavicular line.",0.58,0.51,0.42,0.51,1,C.darkBlue,0.05,7.5,"V4"),
        fixedElectrode("right_v5","V5","Standard V5 position: same horizontal level as V4 at the anterior axillary line.",0.64,0.51,C.orange),
        fixedElectrode("right_v6","V6","Standard V6 position: same horizontal level as V4 and V5 at the mid-axillary line.",0.70,0.50,C.purple)
      ])]},
      { id:"twelve", label:"12-Lead", title:"12-Lead ECG Placement", color:"#2563EB", sequence:true, scenes:[scene("12-Lead","front",[
        // 12-Lead: RA/LA appear first, then chest leads appear by sequence step.
        electrode("ra","RA","Right arm electrode. Place on the right upper limb or right shoulder area.",0.31,0.39,1,C.white),
        electrode("la","LA","Left arm electrode. Place on the left upper limb or left shoulder area.",0.69,0.39,2,C.black),
        electrode("v1","V1","4th intercostal space at the right sternal border.",0.47,0.43,3,C.red),
        electrode("v2","V2","4th intercostal space at the left sternal border.",0.53,0.43,4,C.yellow),
        electrode("v3","V3","Midway between V2 and V4.",0.55,0.47,5,C.green),
        electrode("v4","V4","5th intercostal space at the mid-clavicular line.",0.58,0.51,6,C.darkBlue),
        electrode("v5","V5","Same horizontal level as V4 at the anterior axillary line.",0.64,0.51,7,C.orange),
        electrode("v6","V6","Same horizontal level as V4 and V5 at the mid-axillary line.",0.70,0.50,8,C.purple)
      ])]},
      { id:"mason", label:"Mason-Likar", title:"Mason-Likar ECG Placement", color:"#B45309", sequence:true, scenes:[scene("Mason-Likar","front",[
        // Mason-Likar: limb leads are moved onto the torso; chest leads match 12-Lead positions.
        electrode("ml_ra","RA","Mason-Likar RA: right infraclavicular fossa, centered near the deltoid border below the clavicle.",0.42,0.36,1,C.white),
        electrode("ml_la","LA","Mason-Likar LA: left infraclavicular fossa, centered near the deltoid border below the clavicle.",0.58,0.36,2,C.black),
        electrode("ml_rl","RL","Mason-Likar RL: ground/reference electrode on the lower right torso, above the iliac crest.",0.43,0.63,3,C.green),
        electrode("ml_ll","LL","Mason-Likar LL: left anterior axillary line, midway between the lower rib cage and iliac crest.",0.60,0.62,4,C.orange),
        electrode("ml_v1","V1","4th intercostal space at the right sternal border.",0.47,0.43,5,C.red),
        electrode("ml_v2","V2","4th intercostal space at the left sternal border.",0.53,0.43,6,C.yellow),
        electrode("ml_v3","V3","Midway between V2 and V4.",0.55,0.47,7,C.green),
        electrode("ml_v4","V4","5th intercostal space at the mid-clavicular line.",0.58,0.51,8,C.darkBlue),
        electrode("ml_v5","V5","Same horizontal level as V4 at the anterior axillary line.",0.64,0.51,9,C.orange),
        electrode("ml_v6","V6","Same horizontal level as V4 and V5 at the mid-axillary line.",0.70,0.50,10,C.purple)
      ])]}
    ]
  },
  burns:{
    label:"Burn Surface Area",
    color:"#B7791F",
    options:[
      { id:"adult", label:"Adult", title:"Adult", color:"#B45309" },
      { id:"child", label:"Child", title:"Child", color:"#2563EB" },
      { id:"infant", label:"Infant", title:"Infant", color:"#7C3AED" }
    ]
  }
};

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
}

function guideStyles() {
  return `
    .vg{max-width:760px;margin:0 auto;padding:14px;color:var(--text);--vg-accent:#0891B2}
    .vg-card{border:1px solid var(--border);border-radius:14px;background:var(--surface);box-shadow:0 8px 18px rgba(15,23,42,.10);padding:14px;margin-bottom:12px}
    .vg-title{margin:0;color:var(--text);font-size:17px;font-weight:950}.vg-muted{margin:5px 0 0;color:var(--muted);font-size:12px;font-weight:750;line-height:1.35}
    .vg-select-shell{position:relative;margin-top:10px}.vg-select{width:100%;min-height:48px;padding:8px 48px 8px 12px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2);color:var(--text);font-size:15px;font-weight:950;appearance:none}
    .vg-select-shell::after{content:"";position:absolute;right:10px;top:50%;width:30px;height:30px;transform:translateY(-50%);background:url("images/chevron-down.svg") center/30px 30px no-repeat;pointer-events:none}
    .vg-seg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.vg-seg button,.vg-chip{min-height:43px;border:1px solid var(--border);border-radius:999px;background:var(--surface-2);color:var(--text);font-weight:950}.vg-seg button.active,.vg-chip.active{border-color:var(--vg-accent);background:color-mix(in oklab,var(--vg-accent) 14%,var(--surface));color:var(--vg-accent)}
    .vg-scenes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.vg-scenes.single{grid-template-columns:1fr}
    .vg-scene{border:1px solid var(--border);border-radius:14px;background:var(--surface);padding:10px;text-align:center}.vg-scene h3{margin:0 0 8px;color:var(--text);font-size:15px;font-weight:950}
    .vg-body{position:relative;width:100%;height:220px;border-radius:12px;background:#f8fafc;overflow:hidden}
    .vg-body.grid::after{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;background-image:linear-gradient(to right,rgba(37,99,235,.20) 1px,transparent 1px),linear-gradient(to bottom,rgba(37,99,235,.20) 1px,transparent 1px);background-size:10% 10%}
    .vg-scenes.single .vg-body{height:auto;aspect-ratio:.72}.vg-modal .vg-body{height:auto;aspect-ratio:.72}
    .vg-body-img{position:absolute;left:var(--img-x,0px);top:var(--img-y,0px);display:block;width:var(--img-w,100%);height:var(--img-h,100%);object-fit:fill}
    .vg-marker{position:absolute;left:var(--mx-px,0px);top:var(--my-px,0px);width:var(--mw-px,28px);height:var(--mh-px,28px);transform:translate(-50%,-50%) scale(1);display:grid;place-items:center;border:2px solid #fff;box-shadow:0 5px 12px rgba(15,23,42,.25);z-index:4;transition:left 1100ms cubic-bezier(.2,.8,.2,1),top 1100ms cubic-bezier(.2,.8,.2,1)}
    .vg-marker::before{content:"";position:absolute;inset:0;border-radius:inherit;background:var(--c);opacity:0;transform:scale(1);z-index:-1}
    .vg-marker[data-placed="true"][data-animate="true"]{animation:vg-marker-pulse 1600ms linear infinite}.vg-marker[data-placed="true"][data-animate="true"]::before{animation:vg-marker-ring 1600ms linear infinite}
    .vg-marker.lead{border-radius:50%;background:var(--c);color:var(--tc,#fff);font-size:calc(var(--label-size,7.5) * 1px);font-weight:950}.vg-marker.pad{border:0;border-radius:8px;background:transparent;box-shadow:none}
    .vg-pad-img{display:block;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 5px 9px rgba(15,23,42,.28));transform:rotate(calc(var(--rot,0) * 1deg))}
    .vg-marker.hidden-step{opacity:.18}.vg-detail{margin-top:10px;border:1px solid color-mix(in oklab,var(--vg-accent) 30%,var(--border));border-radius:12px;background:color-mix(in oklab,var(--vg-accent) 8%,var(--surface));padding:12px}.vg-detail b{display:block;color:var(--vg-accent);font-size:15px;margin-bottom:4px}.vg-detail p{margin:0;color:var(--text);font-size:13px;font-weight:750;line-height:1.4}
    .vg-sequence{display:flex;align-items:center;justify-content:space-between;gap:10px}.vg-step{color:var(--vg-accent);font-weight:950}.vg-step-actions{display:flex;gap:8px}.vg-mini{border:1px solid var(--border);border-radius:999px;background:var(--surface-2);color:var(--text);font-weight:950;padding:8px 12px}.vg-instruction{margin:0 0 10px;color:var(--vg-accent);font-size:12px;font-weight:950;line-height:1.35}
    .vg-burn-summary{position:sticky;top:0;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid var(--border);border-radius:14px;background:var(--surface);padding:12px;box-shadow:0 5px 14px rgba(15,23,42,.10)}.vg-burn-total strong{display:block;color:var(--vg-accent);font-size:28px}.vg-burn-diagrams{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.vg-burn-stage{position:relative;width:100%;max-width:300px;margin:auto}.vg-burn-stage.adult,.vg-burn-stage.child{aspect-ratio:346/721}.vg-burn-stage.infant{aspect-ratio:475/525;max-width:350px}.vg-burn-stage img{display:block;width:100%;height:100%;object-fit:contain}.vg-burn-zone{position:absolute;border:1px dashed color-mix(in srgb,var(--vg-accent) 62%,transparent);border-radius:8px;background:color-mix(in srgb,var(--vg-accent) 8%,transparent);font-size:0}.vg-burn-zone.oval{border-radius:50%}.vg-burn-zone.selected{border:2px solid var(--vg-accent);background:color-mix(in srgb,var(--vg-accent) 45%,transparent);box-shadow:0 0 0 2px rgba(255,255,255,.75)}
    .vg-list{margin-top:12px}.vg-list ul{margin:0;padding-left:20px;line-height:1.7}.vg-footer{text-align:center;color:var(--muted);font-size:12px;font-weight:800}
    .vg-modal{position:fixed;inset:0;z-index:1200;display:grid;place-items:center;background:rgba(15,23,42,.62);padding:18px}.vg-modal-card{width:min(720px,100%);max-height:92vh;overflow:auto;border:1px solid color-mix(in oklab,var(--vg-accent) 35%,var(--border));border-radius:16px;background:var(--surface);padding:14px;box-shadow:0 18px 46px rgba(2,6,23,.35)}.vg-modal-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}.vg-modal-head h3{flex:1;margin:0;color:var(--vg-accent);font-size:16px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vg-close{width:34px;height:34px;border:0;border-radius:50%;background:var(--surface-2);color:var(--text);font-weight:950}
    :root[data-theme="dark"] .vg-card,:root[data-theme="dark"] .vg-scene{box-shadow:none}:root[data-theme="dark"] .vg-body{background:#101620}:root[data-theme="dark"] .vg-select-shell::after{filter:brightness(1.25)}
    @media(prefers-color-scheme:dark){:root[data-theme="auto"] .vg-card,:root[data-theme="auto"] .vg-scene{box-shadow:none}:root[data-theme="auto"] .vg-body{background:#101620}:root[data-theme="auto"] .vg-select-shell::after{filter:brightness(1.25)}}
    @keyframes vg-marker-pulse{0%{transform:translate(-50%,-50%) scale(1)}100%{transform:translate(-50%,-50%) scale(1.06)}}@keyframes vg-marker-ring{0%{opacity:.58;transform:scale(1)}100%{opacity:0;transform:scale(1.86)}}
    @media(max-width:340px){.vg-scenes,.vg-burn-diagrams{grid-template-columns:1fr}.vg-scenes:not(.single) .vg-body{height:240px}}@media(max-width:520px){.vg{padding:12px 10px}.vg-seg{gap:6px}.vg-seg button{font-size:12px}}
  `;
}

export async function run(root) {
  let category = "pads";
  let optionId = "ap";
  let selectedMarker = null;
  let ecgStep = 10;
  let animationKey = 0;
  let sequenceTimer = null;
  let enlargedScene = null;
  let overlayResizeObserver = null;
  const selectedBurns = new Map();

  root.innerHTML = `<style>${guideStyles()}</style><div class="vg" id="vg"></div>`;
  const app = root.querySelector("#vg");

  function activeOption() {
    return guideData[category].options.find((item) => item.id === optionId) || guideData[category].options[0];
  }

  function clearSequenceTimer() {
    if (sequenceTimer) {
      window.clearInterval(sequenceTimer);
      sequenceTimer = null;
    }
  }

  function beginSequence() {
    const opt = activeOption();
    if (!opt.sequence) return;
    clearSequenceTimer();
    ecgStep = 1;
    animationKey += 1;
    renderContent();
    sequenceTimer = window.setInterval(() => {
      ecgStep += 1;
      animationKey += 1;
      renderContent();
      if (ecgStep >= 10) clearSequenceTimer();
    }, 650);
  }

  function render() {
    const cat = guideData[category];
    const opt = activeOption();
    app.style.setProperty("--vg-accent", opt.color || cat.color);
    app.innerHTML = `
      <section class="vg-card">
        <h2 class="vg-title">Visual Guides</h2>
        <p class="vg-muted">Review placement guides for pads, ECG leads, and burn surface area.</p>
        <div class="vg-select-shell">
          <select id="vgCategory" class="vg-select" aria-label="Visual guide category">
            ${Object.entries(guideData).map(([key,item]) => `<option value="${key}" ${key===category?"selected":""}>${esc(item.label)}</option>`).join("")}
          </select>
        </div>
      </section>
      <section class="vg-card">
        <div class="vg-seg">${cat.options.map((item) => `<button type="button" class="${item.id===optionId?"active":""}" data-option="${item.id}">${esc(item.label)}</button>`).join("")}</div>
      </section>
      <div id="vgContent"></div>`;

    app.querySelector("#vgCategory").addEventListener("change", (event) => {
      category = event.target.value;
      optionId = guideData[category].options[0].id;
      selectedMarker = null;
      selectedBurns.clear();
      clearSequenceTimer();
      ecgStep = category === "ecg" ? 1 : 10;
      animationKey += 1;
      render();
      window.setTimeout(beginSequence, 0);
    });
    app.querySelectorAll("[data-option]").forEach((button) => {
      button.addEventListener("click", () => {
        optionId = button.dataset.option;
        selectedMarker = null;
        selectedBurns.clear();
        clearSequenceTimer();
        ecgStep = guideData[category].options.find((item) => item.id === optionId)?.sequence ? 1 : 10;
        animationKey += 1;
        render();
        window.setTimeout(beginSequence, 0);
      });
    });
    renderContent();
  }

  function visibleMarkers(scene, opt) {
    if (!opt.sequence) return scene.markers;
    const visualStep = opt.id === "twelve" ? ecgVisualStep(ecgStep) : ecgStep;
    return scene.markers.filter((item) => item.step <= visualStep);
  }

  function renderContent() {
    const content = app.querySelector("#vgContent");
    const opt = activeOption();
    if (category === "burns") {
      renderBurns(content, opt.id);
      return;
    }
    const sequence = opt.sequence ? `
      <section class="vg-card vg-sequence">
        <span class="vg-step">${esc(opt.id === "mason" ? "Mason-Likar Sequence" : "12-Lead Sequence")}: ${esc(ecgStepLabel(opt.id, ecgStep))}</span>
        <span class="vg-step-actions">
          <button class="vg-mini" type="button" id="vgPrev">-</button>
          <button class="vg-mini" type="button" id="vgNext">+</button>
          <button class="vg-mini" type="button" id="vgReplay">Replay</button>
        </span>
      </section>` : "";
    content.innerHTML = `
      ${sequence}
      <p class="vg-instruction">Tap image to enlarge. Tap a ${category === "ecg" ? "lead" : "pad"} for placement details.</p>
      <section class="vg-scenes ${opt.scenes.length === 1 ? "single" : ""}">
        ${opt.scenes.map((scene, sceneIndex) => renderScene(scene, opt, sceneIndex)).join("")}
      </section>
      ${selectedMarker ? renderMarkerDetail(selectedMarker) : ""}
      <p class="vg-footer">Follow your guidelines and clinical judgment.</p>
      ${enlargedScene ? renderEnlargedModal(enlargedScene.scene, enlargedScene.index, opt) : ""}`;
    setupPlacementOverlays(content);
    content.querySelectorAll(".vg-marker").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const optNow = activeOption();
        const scene = optNow.scenes[Number(button.dataset.scene)];
        selectedMarker = scene?.markers.find((item) => item.id === button.dataset.marker) || null;
        renderContent();
      });
    });
    content.querySelectorAll(".vg-body[data-scene-index]").forEach((body) => {
      body.addEventListener("click", () => {
        const index = Number(body.dataset.sceneIndex);
        const scene = activeOption().scenes[index];
        if (!scene) return;
        enlargedScene = {scene, index};
        animationKey += 1;
        renderContent();
      });
    });
    content.querySelector("#vgModalClose")?.addEventListener("click", () => {
      enlargedScene = null;
      renderContent();
    });
    content.querySelector(".vg-modal")?.addEventListener("click", (event) => {
      if (event.target.classList.contains("vg-modal")) {
        enlargedScene = null;
        renderContent();
      }
    });
    content.querySelectorAll(".vg-marker[data-animate='true']").forEach((button) => {
      const delay = Number(button.dataset.delay || 0);
      window.setTimeout(() => {
        moveMarkerTo(button, Number(button.dataset.x), Number(button.dataset.y));
        button.dataset.placed = "true";
        if (button.dataset.finalLabel) button.textContent = button.dataset.finalLabel;
      }, delay);
    });
    content.querySelector("#vgPrev")?.addEventListener("click", () => { clearSequenceTimer(); ecgStep = Math.max(1, ecgStep - 1); animationKey += 1; renderContent(); });
    content.querySelector("#vgNext")?.addEventListener("click", () => { clearSequenceTimer(); ecgStep = Math.min(10, ecgStep + 1); animationKey += 1; renderContent(); });
    content.querySelector("#vgReplay")?.addEventListener("click", beginSequence);
  }

  function renderScene(scene, opt, sceneIndex) {
    const markers = visibleMarkers(scene, opt);
    return `<article class="vg-scene">
      <h3>${esc(scene.title)}</h3>
      <div class="vg-body vg-${scene.side}${SHOW_PLACEMENT_GRID ? " grid" : ""}" data-scene-index="${sceneIndex}" data-side="${scene.side}" data-zoom="${scene.zoom || 1}" data-offset-x="${scene.offsetX || 0}" data-offset-y="${scene.offsetY || 0}">
        <img class="vg-body-img" src="images/visual_guides/adult_${scene.side}.png" alt="${scene.side} body">
        ${markers.map((item) => renderMarker(item, sceneIndex)).join("")}
      </div>
    </article>`;
  }

  function renderMarker(item, sceneIndex) {
    const animate = item.animate !== false;
    const textColor = item.color === C.white || item.color === C.yellow ? C.black : C.white;
    const content = item.kind === "pad" && item.image
      ? `<img class="vg-pad-img" src="images/visual_guides/${esc(item.image)}" alt="">`
      : esc(item.startLabel && animate ? item.startLabel : item.label);
    const delay = item.delay ?? (260 + item.step * 120);
    const startX = animate ? item.startX : item.x;
    const startY = animate ? item.startY : item.y;
    const finalLabel = item.kind === "lead" && item.startLabel ? ` data-final-label="${esc(item.label)}"` : "";
    return `<button class="vg-marker ${item.kind}" type="button" data-scene="${sceneIndex}" data-marker="${esc(item.id)}" data-kind="${item.kind}" data-animate="${animate ? "true" : "false"}" data-delay="${delay}" data-x="${item.x}" data-y="${item.y}" data-start-x="${startX}" data-start-y="${startY}" data-width="${item.width}" data-key="${animationKey}"${finalLabel} style="--c:${item.color};--tc:${textColor};--label-size:${item.labelSize};--rot:${item.rotation}" aria-label="${esc(item.label)}">${content}</button>`;
  }

  function renderEnlargedModal(scene, sceneIndex) {
    const title = enlargedSceneTitle(scene);
    const markers = visibleMarkers(scene, activeOption());
    return `<div class="vg-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="vg-modal-card">
        <div class="vg-modal-head"><h3>${esc(title)}</h3><button class="vg-close" type="button" id="vgModalClose" aria-label="Close">X</button></div>
        <div class="vg-body vg-${scene.side}${SHOW_PLACEMENT_GRID ? " grid" : ""}" data-scene-index="${sceneIndex}" data-side="${scene.side}" data-zoom="${scene.zoom || 1}" data-offset-x="${scene.offsetX || 0}" data-offset-y="${scene.offsetY || 0}">
          <img class="vg-body-img" src="images/visual_guides/adult_${scene.side}.png" alt="${scene.side} body">
          ${markers.map((item) => renderMarker(item, sceneIndex)).join("")}
        </div>
      </div>
    </div>`;
  }

  function setupPlacementOverlays(scope) {
    overlayResizeObserver?.disconnect();
    overlayResizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver((entries) => entries.forEach((entry) => applyImageBounds(entry.target)))
      : null;
    scope.querySelectorAll(".vg-body[data-scene-index]").forEach((body) => {
      const apply = () => applyImageBounds(body);
      apply();
      overlayResizeObserver?.observe(body);
      const img = body.querySelector(".vg-body-img");
      if (img && !img.complete) img.addEventListener("load", apply, {once:true});
    });
  }

  function applyImageBounds(body) {
    const bounds = computeAdjustedBounds(body);
    const img = body.querySelector(".vg-body-img");
    if (img) {
      img.style.setProperty("--img-x", `${bounds.x}px`);
      img.style.setProperty("--img-y", `${bounds.y}px`);
      img.style.setProperty("--img-w", `${bounds.width}px`);
      img.style.setProperty("--img-h", `${bounds.height}px`);
    }
    body.querySelectorAll(".vg-marker").forEach((markerEl) => {
      const useTarget = markerEl.dataset.placed === "true" || markerEl.dataset.animate === "false";
      const startX = Number(markerEl.dataset.startX || markerEl.dataset.x || 0);
      const startY = Number(markerEl.dataset.startY || markerEl.dataset.y || 0);
      const currentX = useTarget ? Number(markerEl.dataset.x || 0) : startX;
      const currentY = useTarget ? Number(markerEl.dataset.y || 0) : startY;
      const widthPx = Number(markerEl.dataset.width || 0.05) * bounds.width;
      markerEl.style.setProperty("--mw-px", `${widthPx}px`);
      markerEl.style.setProperty("--mh-px", `${widthPx}px`);
      markerEl.dataset.boundsX = String(bounds.x);
      markerEl.dataset.boundsY = String(bounds.y);
      markerEl.dataset.boundsWidth = String(bounds.width);
      markerEl.dataset.boundsHeight = String(bounds.height);
      moveMarkerTo(markerEl, currentX, currentY);
    });
  }

  function moveMarkerTo(markerEl, x, y) {
    const bx = Number(markerEl.dataset.boundsX || 0);
    const by = Number(markerEl.dataset.boundsY || 0);
    const bw = Number(markerEl.dataset.boundsWidth || 0);
    const bh = Number(markerEl.dataset.boundsHeight || 0);
    markerEl.style.setProperty("--mx-px", `${bx + x * bw}px`);
    markerEl.style.setProperty("--my-px", `${by + y * bh}px`);
  }

  function computeFittedBounds(body) {
    const imageAspect = 1086 / 1448;
    const rect = body.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;
    if (!containerWidth || !containerHeight) return {x:0,y:0,width:0,height:0};
    const containerAspect = containerWidth / containerHeight;
    let width;
    let height;
    let x = 0;
    let y = 0;
    if (containerAspect > imageAspect) {
      height = containerHeight;
      width = height * imageAspect;
      x = (containerWidth - width) / 2;
    } else {
      width = containerWidth;
      height = width / imageAspect;
      y = (containerHeight - height) / 2;
    }
    return {x,y,width,height};
  }

  function computeAdjustedBounds(body) {
    const base = computeFittedBounds(body);
    const zoom = Number(body.dataset.zoom || 1);
    const offsetX = Number(body.dataset.offsetX || 0);
    const offsetY = Number(body.dataset.offsetY || 0);
    const zoomedWidth = base.width * zoom;
    const zoomedHeight = base.height * zoom;
    return {
      x: base.x - (zoomedWidth - base.width) / 2 + offsetX * base.width,
      y: base.y - (zoomedHeight - base.height) / 2 + offsetY * base.height,
      width: zoomedWidth,
      height: zoomedHeight
    };
  }

  function enlargedSceneTitle(scene) {
    const view = scene.side === "front" ? "Anterior" : "Posterior";
    if (scene.title.startsWith("DSED")) return `DSED - ${view}`;
    if (scene.title === "Anterior-Posterior") return `AP - ${view}`;
    if (scene.title === "Anterior-Lateral") return `AL - ${view}`;
    if (scene.title === "Mason-Likar") return "Mason-Likar";
    return `${view} - ${scene.title}`;
  }

  function ecgVisualStep(step) {
    if (step <= 2) return step;
    if (step <= 4) return 2;
    return step - 2;
  }

  function ecgStepLabel(option, step) {
    if (option === "mason") {
      return ["","RA","RA - LA","RA - LA - RL","RA - LA - RL - LL","RA - LA - RL - LL - V1","RA - LA - RL - LL - V1 - V2","RA - LA - RL - LL - V1 - V2 - V3","RA - LA - RL - LL - V1 - V2 - V3 - V4","RA - LA - RL - LL - V1 - V2 - V3 - V4 - V5","RA - LA - RL - LL - V1 - V2 - V3 - V4 - V5 - V6"][step] || `Step ${step}`;
    }
    return ["","RA","RA - LA","RA - LA - RL","RA - LA - RL - LL","RA - LA - RL - LL - V1","RA - LA - RL - LL - V1 - V2","RA - LA - RL - LL - V1 - V2 - V3","RA - LA - RL - LL - V1 - V2 - V3 - V4","RA - LA - RL - LL - V1 - V2 - V3 - V4 - V5","RA - LA - RL - LL - V1 - V2 - V3 - V4 - V5 - V6"][step] || `Step ${step}`;
  }

  function renderMarkerDetail(item) {
    return `<section class="vg-detail"><b>${esc(item.label)}</b><p>${esc(item.description)}</p></section>`;
  }

  function renderBurns(content, age) {
    const zones = burnZones[age];
    const total = [...selectedBurns.values()].reduce((sum, item) => sum + item.value, 0);
    content.innerHTML = `
      <section class="vg-burn-summary">
        <div class="vg-burn-total"><span>Total burn surface area</span><strong>${total}%</strong></div>
        <button class="vg-mini" type="button" id="vgBurnClear">Clear</button>
      </section>
      <section class="vg-burn-diagrams">
        ${["front","back"].map((side) => `<article class="vg-scene"><h3>${side[0].toUpperCase()+side.slice(1)}</h3><div class="vg-burn-stage ${age}"><img src="images/burns/burn_${age}_${side}.png" alt="${age} body ${side}">${zones[side].map((z) => `<button class="vg-burn-zone${z.oval ? " oval" : ""}${selectedBurns.has(z.id) ? " selected" : ""}" type="button" aria-label="${esc(z.label)} ${z.value} percent" data-zone="${z.id}" style="left:${(z.x-z.w/2)*100}%;top:${(z.y-z.h/2)*100}%;width:${z.w*100}%;height:${z.h*100}%;transform:rotate(${z.rotate}deg)"></button>`).join("")}</div></article>`).join("")}
      </section>
      <section class="vg-card vg-list"><h3 class="vg-title">Selected areas</h3>${selectedBurns.size ? `<ul>${[...selectedBurns.values()].map((z) => `<li>${esc(z.label)}: <b>${z.value}%</b></li>`).join("")}</ul>` : `<p class="vg-muted">Tap the body diagram to select burn areas.</p>`}</section>
      <p class="vg-footer">Tap areas to add or remove them from the estimate.</p>`;
    content.querySelectorAll(".vg-burn-zone").forEach((button) => {
      button.addEventListener("click", () => {
        const z = [...zones.front, ...zones.back].find((item) => item.id === button.dataset.zone);
        if (!z) return;
        if (selectedBurns.has(z.id)) selectedBurns.delete(z.id);
        else selectedBurns.set(z.id, z);
        renderBurns(content, age);
      });
    });
    content.querySelector("#vgBurnClear")?.addEventListener("click", () => {
      selectedBurns.clear();
      renderBurns(content, age);
    });
  }

  render();
}
