// /ambulance/tools/apgar.js
// CHANGELOG (2026-06-06):
// - Rebuild with the shared Android-aligned score chip UI and Android APGAR defaults/notes.

import { renderChipScore } from "../score_common.js";

export async function run(root, params = {}) {
  renderChipScore(root, {
    hash: params.embedded !== true,
    tool:"apgar",
    title:"APGAR Score",
    initialText:"APGAR 10 - Normal",
    note:"Calculate at 1 minute and 5 minutes after delivery.\n\n0-3 severe distress | 4-7 moderate distress | 7-10 no distress (normal)",
    sections:[
      { key:"appearance", title:"Appearance", defaultScore:2, chipFont:10.5, rowHeight:60, options:[
        { score:0, label:"Blue/pale" },
        { score:1, label:"Pink, extremities blue" },
        { score:2, label:"All pink" }
      ]},
      { key:"pulse", title:"Pulse", defaultScore:2, options:[
        { score:0, label:"Absent" },
        { score:1, label:"<100" },
        { score:2, label:">100" }
      ]},
      { key:"grimace", title:"Grimace", defaultScore:2, chipFont:10.5, rowHeight:60, options:[
        { score:0, label:"No response" },
        { score:1, label:"Grimace" },
        { score:2, label:"Vigorous cough/cry" }
      ]},
      { key:"activity", title:"Activity", defaultScore:2, chipFont:10, rowHeight:60, options:[
        { score:0, label:"Limp" },
        { score:1, label:"Some flexion/extension" },
        { score:2, label:"Active motion" }
      ]},
      { key:"respiration", title:"Respiration", defaultScore:2, chipFont:11, rowHeight:58, options:[
        { score:0, label:"Absent" },
        { score:1, label:"Slow/irregular" },
        { score:2, label:"Good cry" }
      ]}
    ],
    compute(values) {
      const total = Object.values(values).reduce((sum, value) => sum + value, 0);
      if (total <= 3) return { text:`APGAR ${total} - Severely Depressed`, level:"bad" };
      if (total <= 6) return { text:`APGAR ${total} - Moderately Depressed`, level:"warn" };
      return { text:`APGAR ${total} - Normal`, level:"ok" };
    }
  });
}
