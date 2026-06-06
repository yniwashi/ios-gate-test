// /ambulance/tools/sat.js
// CHANGELOG (2026-06-06):
// - Rebuild with the shared Android-aligned score chip UI and Android SAT scoring/notes.

import { renderChipScore } from "../score_common.js";

export async function run(root, params = {}) {
  renderChipScore(root, {
    hash: params.embedded !== true,
    tool:"sat",
    title:"Sedation Assessment Tool",
    initialText:"SAT -3",
    note:"Use responsiveness and speech to determine SAT score.\n\nUse the highest-ranking value (+3 to -3).\n\nSAT +2 or +3 is a good predictor of the need for sedation. Request CCP assistance.",
    sections:[
      { key:"response", title:"Responsiveness", defaultScore:-3, chipFont:10, maxColumns:2, rowHeight:60, options:[
        { score:3, label:"Combative/violent" },
        { score:2, label:"Very anxious/restless" },
        { score:1, label:"Anxious/restless" },
        { score:0, label:"Responds to name" },
        { score:-1, label:"Name called loudly" },
        { score:-2, label:"Physical stimulation" },
        { score:-3, label:"No response" }
      ]},
      { key:"speech", title:"Speech", defaultScore:-3, chipFont:10, maxColumns:2, rowHeight:60, options:[
        { score:3, label:"Continual loud outbursts" },
        { score:2, label:"Loud outbursts" },
        { score:1, label:"Normal" },
        { score:0, label:"Normal" },
        { score:-1, label:"Slurring/slowing" },
        { score:-2, label:"Few recognizable words" },
        { score:-3, label:"Nil" }
      ]}
    ],
    compute(values) {
      const sat = Math.max(values.response, values.speech);
      const satText = sat > 0 ? `+${sat}` : `${sat}`;
      if (sat >= 2) return { text:`SAT ${satText} - Sedation need predictor`, level:"bad" };
      return { text:`SAT ${satText}`, level:"neutral" };
    }
  });
}
