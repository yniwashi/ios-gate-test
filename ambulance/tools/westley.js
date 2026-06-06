// /ambulance/tools/westley.js
// CHANGELOG (2026-06-06):
// - Rebuild with the shared Android-aligned score chip UI and Android Westley scoring/notes.

import { renderChipScore } from "../score_common.js";

export async function run(root, params = {}) {
  renderChipScore(root, {
    hash: params.embedded !== true,
    tool:"westley",
    title:"Westley Score",
    initialText:"Westley 0 - Mild Croup",
    note:"Total possible score: 0-17.\nMild croup <=2 | Moderate croup 3-7 | Severe croup >=8",
    sections:[
      { key:"inspiratory", title:"Inspiratory Stridor", defaultScore:0, chipFont:12, options:[
        { score:0, label:"None" },
        { score:1, label:"When agitated" },
        { score:2, label:"At rest" }
      ]},
      { key:"intercostal", title:"Intercostal Recession", defaultScore:0, chipFont:12, maxColumns:2, options:[
        { score:0, label:"None" },
        { score:1, label:"Mild" },
        { score:2, label:"Moderate" },
        { score:3, label:"Severe" }
      ]},
      { key:"air", title:"Air Entry", defaultScore:0, chipFont:11, rowHeight:58, options:[
        { score:0, label:"Normal" },
        { score:1, label:"Mildly decreased" },
        { score:2, label:"Severely decreased" }
      ]},
      { key:"cyanosis", title:"Cyanosis", defaultScore:0, chipFont:10, rowHeight:60, options:[
        { score:0, label:"None" },
        { score:4, label:"With agitation/activity" },
        { score:5, label:"At rest" }
      ]},
      { key:"loc", title:"LOC", defaultScore:0, maxColumns:2, options:[
        { score:0, label:"Awake" },
        { score:5, label:"Altered" }
      ]}
    ],
    compute(values) {
      const total = Object.values(values).reduce((sum, value) => sum + value, 0);
      if (total <= 2) return { text:`Westley ${total} - Mild Croup`, level:"ok" };
      if (total <= 7) return { text:`Westley ${total} - Moderate Croup`, level:"warn" };
      return { text:`Westley ${total} - Severe Croup`, level:"bad" };
    }
  });
}
