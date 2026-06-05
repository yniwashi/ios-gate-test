// /ambulance/infusion_data.js
// CHANGELOG (2026-06-05):
// - Match infusion drug colors to the app source palette.
// - Port the Android adult and pediatric infusion reference data.

const colors = {
  Adrenaline:"#CE93D8", Amiodarone:"#CE93D8", Fentanyl:"#81D4FA",
  Ketamine:"#FFF59D", "Magnesium Sulphate":"#AED581",
  Noradrenaline:"#CE93D8", Phenylephrine:"#FF5722",
  Salbutamol:"#AED581", GTN:"#804403"
};

const drug = (label, sections) => ({ label, color:colors[label], sections });

export const adultInfusions = [
  drug("Adrenaline", [{ title:"Adrenaline for Bradycardia & Inotropic and Vasopressor Support", dose:"0.05 - 0.3mcg/kg/min IV/IO Infusion", notes:"Mix 1mg (1:1000) in 100ml NS. Draw 50ml into 50ml syringe\nTitrate to effect" }]),
  drug("Amiodarone", [{ title:"Amiodarone for VT with a pulse", dose:"300mg IV/IO Infusion", notes:"Dilute 300mg (6ml) with 44ml 5% Dextrose in 50ml syringe\nFinal concentration of 6mg/1ml\nInfuse at 200ml/hr (20mg/min) over 15 minutes" }]),
  drug("Fentanyl", [{ title:"Fentanyl for RSI", dose:"1-10mcg/kg/hr IV/IO Infusion", notes:"Titrated to maintain sedation post RSI\nDilute 200mcg (2 x amps) Fentanyl with 16ml NS to a total\nof 20ml to give a concentration of 10mcg/1ml.\nStart infusion at desired range and titrate to effect and BP" }]),
  drug("GTN", [
    { title:"Acute Coronary Syndrome", dose:"5-20mcg/min IV/IO Infusion", notes:"Dilute to 50mg/500ml = 0.1mg/ml. Infuse at 3-12ml/hr\nIncrease/decrease dose as required by 5mcg/min\nTitrate to BP" },
    { title:"Acute Pulmonary Oedema", dose:"100mcg/min IV/IO Infusion", notes:"Dilute to 1mg/1ml. Infuse at 6ml/hr\nIncrease/decrease dose as required by 0.6ml/hr\nTitrate to BP" }
  ]),
  drug("Ketamine", [{ title:"Ketamine for RSI", dose:"0.01-0.05mg/kg/min IV/IO Infusion", notes:"Titrated to maintain sedation post RSI\nDilute 200mg (4ml) Ketamine with 16ml NS to a total of\n20ml to give a concentration of 10mg/1ml.\nStart infusion at desired range and titrate to effect" }]),
  drug("Magnesium Sulphate", [
    { title:"Magnesium Sulphate for Severe asthma/Torsade's de pointes", dose:"2g IV/IO Infusion", notes:"Infused over 10 minutes. May repeat once to a max dose of 4g." },
    { title:"Magnesium Sulphate for Pre-eclampsia/Eclampsia", dose:"4g IV/IO Infusion", notes:"Infused over 10 minutes" }
  ]),
  drug("Noradrenaline", [{ title:"Noradrenaline for Shock", dose:"0.01 - 0.3mcg/kg/min IV/IO Infusion", notes:"Increase rate by 0.05mcg/kg/min if required\nDilution: add 2 x 4mg/4ml amps into 500ml NS, creating\n8mg/500ml (16mcg/ml). Draw 50ml of Noradrenaline\nsolution into 50ml syringe and start infusion at above dose." }]),
  drug("Phenylephrine", [{ title:"Phenylephrine for Hypotension/Shock", dose:"100mcg/min IV/IO Infusion", notes:"(Infuse at 60ml/hr)\nDilution: mix 10mg into 100ml NS. Draw 50ml into 50ml syringe.\nInfuse at rate above (use special functions feature)\nReduce rate by 2.5 - 5ml/hr (4.15 - 8.3mcg/min) as required.\nIncrease rate by 5 - 10ml/hr (8.3 - 16.6mcg/min) as required.\nOnce BP has stabilised, reduce rate to 30ml/hr (50mcg/min)." }]),
  drug("Salbutamol", [{ title:"Salbutamol for Bronchoconstriction", dose:"250mcg IV/IO Infusion", notes:"Infused over 10 minutes\nDilution: 500mcg (1ml amp) mixed with 49ml NS in a 50ml syringe (10mcg/ml).\nUse syringe driver infusing at 150ml/hr." }])
];

export const pediatricInfusions = [
  drug("Adrenaline", [{ title:"Adrenaline for Inotropic and Vasopressor Support", dose:"0.05 - 0.3mcg/kg/min IV/IO Infusion", notes:"Mix 1mg (1:1000) in 100ml NS. Draw 50ml into 50ml syringe\n\nSee pediatric dosing table by pressing the View Formulary button above" }]),
  drug("Amiodarone", [{ title:"Amiodarone for VT with a pulse", dose:"5mg/kg IV/IO Infusion", notes:"Max dose of 300mg\nInfuse over 20-60 minutes\n\nSee pediatric dosing chart by pressing the View Formulary button above" }]),
  drug("Fentanyl", [{ title:"Fentanyl for RSI", dose:"1-10mcg/kg/hr IV/IO Infusion", notes:"Titrated to maintain sedation post RSI\nDilute 200mcg (2 x amps) Fentanyl with 16ml NS to a total\nof 20ml to give a concentration of 10mcg/1ml.\nStart infusion at desired range and titrate to effect and BP\n\nSee pediatric dosing chart by pressing the View Formulary button above" }]),
  drug("Ketamine", [{ title:"Ketamine for RSI", dose:"0.01-0.05mg/kg/min IV/IO Infusion", notes:"Titrated to maintain sedation post RSI\nDilute 200mg (4ml) Ketamine with 16ml NS to a total of\n20ml to give a concentration of 10mg/1ml.\nStart infusion at desired range and titrate to effect\n\nSee pediatric dosing chart by pressing the View Formulary button above" }]),
  drug("Magnesium Sulphate", [{ title:"Magnesium Sulphate for Severe asthma/Torsade's de pointes", dose:"25-50mg/kg IV/IO Infusion", notes:"(Max dose of 2g)\nInfused over 20 minutes\n\nSee pediatric dosing chart by pressing the View Formulary button above" }]),
  drug("Noradrenaline", [{ title:"Noradrenaline for Septic Shock", dose:"0.05- 0.1mcg/kg/min IV/IO Infusion", notes:"Increase rate by 0.05mcg/kg/min if required\nDilution: add 2 x 4mg/4ml amps into 500ml NS, creating\n8mg/500ml (16mcg/ml). Draw 50ml of Noradrenaline\nsolution into 50ml syringe and start infusion at above dose." }]),
  drug("Salbutamol", [{ title:"Salbutamol for Bronchoconstriction", dose:"10mcg/kg IV/IO Infusion", notes:"Infused over 10 minutes\nMaximum dose of 250mcg\nDilution: 500mcg (1ml amp) mixed with 49ml NS in a 50ml syringe (10mcg/ml).\nUse syringe driver special functions\n\nSee pediatric dosing chart by pressing the View Formulary button above" }])
];
