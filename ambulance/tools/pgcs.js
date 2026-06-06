// /ambulance/tools/pgcs.js
// CHANGELOG (2026-06-06):
// - Add Pediatric Glasgow Coma Scale using the shared Android-aligned score chip UI.

import { renderChipScore, levelForGcs } from "../score_common.js";

export async function run(root, params = {}) {
  renderChipScore(root, {
    hash: params.embedded !== true,
    tool:"pgcs",
    title:"Pediatric Glasgow Coma Scale",
    initialText:"E4, V5, M6  (Total 15)",
    note:"Regularly reassess the child's level of consciousness to identify any deterioration or improvement.",
    sections:[
      { key:"e", title:"Eye (E)", defaultScore:4, maxColumns:2, options:[
        { score:4, label:"Spontaneous" },
        { score:3, label:"Reacts to speech" },
        { score:2, label:"Reacts to pain" },
        { score:1, label:"No response" }
      ]},
      { key:"v", title:"Verbal (V)", defaultScore:5, chipFont:10, maxColumns:3, rowHeight:60, options:[
        { score:5, label:"Babbles/follows objects" },
        { score:4, label:"Irritable, cries" },
        { score:3, label:"Cries to pain" },
        { score:2, label:"Moans/grunts" },
        { score:1, label:"No response" }
      ]},
      { key:"m", title:"Motor (M)", defaultScore:6, chipFont:10.5, maxColumns:3, rowHeight:60, options:[
        { score:6, label:"Spontaneous" },
        { score:5, label:"Localises to pain" },
        { score:4, label:"Withdraws from pain" },
        { score:3, label:"Flexion response" },
        { score:2, label:"Extension response" },
        { score:1, label:"No response" }
      ]}
    ],
    compute(values) {
      const total = values.e + values.v + values.m;
      return { text:`E${values.e}, V${values.v}, M${values.m}  (Total ${total})`, level:levelForGcs(total) };
    }
  });
}
