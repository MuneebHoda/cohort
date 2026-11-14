// Twenty supplied cases anchor the simulation. Stability is an explicit synthetic assumption.
export const anchorPatients = [
  {
    "id": "P01",
    "age_years": 62,
    "egfr_ml_min_1_73m2": 88,
    "ecog": 0,
    "hepatic_status": "normal",
    "strong_cyp3a_inhibitor": false,
    "clinically_unstable_cardiac_disease": false,
    "controlled_hypertension": false,
    "stable_type2_diabetes": false,
    "stable_cardiac_history": false,
    "note": "Originally eligible comparator",
    "renal_stable": true
  },
  {
    "id": "P02",
    "age_years": 68,
    "egfr_ml_min_1_73m2": 56,
    "ecog": 1,
    "hepatic_status": "normal",
    "strong_cyp3a_inhibitor": false,
    "clinically_unstable_cardiac_disease": false,
    "controlled_hypertension": true,
    "stable_type2_diabetes": false,
    "stable_cardiac_history": false,
    "note": "Controlled hypertension; proposed renal revision candidate",
    "renal_stable": true
  },
  {
    "id": "P03",
    "age_years": 74,
    "egfr_ml_min_1_73m2": 49,
    "ecog": 1,
    "hepatic_status": "mild",
    "strong_cyp3a_inhibitor": false,
    "clinically_unstable_cardiac_disease": false,
    "controlled_hypertension": true,
    "stable_type2_diabetes": false,
    "stable_cardiac_history": false,
    "note": "Mild hepatic impairment and stable hypertension",
    "renal_stable": true
  },
  {
    "id": "P04",
    "age_years": 59,
    "egfr_ml_min_1_73m2": 44,
    "ecog": 1,
    "hepatic_status": "normal",
    "strong_cyp3a_inhibitor": false,
    "clinically_unstable_cardiac_disease": false,
    "controlled_hypertension": false,
    "stable_type2_diabetes": false,
    "stable_cardiac_history": false,
    "note": "Outside the fictional renal sub-study boundary",
    "renal_stable": true
  },
  {
    "id": "P05",
    "age_years": 71,
    "egfr_ml_min_1_73m2": 53,
    "ecog": 2,
    "hepatic_status": "normal",
    "strong_cyp3a_inhibitor": false,
    "clinically_unstable_cardiac_disease": false,
    "controlled_hypertension": false,
    "stable_type2_diabetes": true,
    "stable_cardiac_history": false,
    "note": "Renal criterion changes but ECOG 2 still excludes",
    "renal_stable": true
  },
  {
    "id": "P06",
    "age_years": 66,
    "egfr_ml_min_1_73m2": 55,
    "ecog": 1,
    "hepatic_status": "normal",
    "strong_cyp3a_inhibitor": true,
    "clinically_unstable_cardiac_disease": false,
    "controlled_hypertension": false,
    "stable_type2_diabetes": false,
    "stable_cardiac_history": false,
    "note": "Strong CYP3A inhibitor exclusion remains",
    "renal_stable": true
  },
  {
    "id": "P07",
    "age_years": 58,
    "egfr_ml_min_1_73m2": 72,
    "ecog": 1,
    "hepatic_status": "severe",
    "strong_cyp3a_inhibitor": false,
    "clinically_unstable_cardiac_disease": false,
    "controlled_hypertension": false,
    "stable_type2_diabetes": false,
    "stable_cardiac_history": false,
    "note": "Severe hepatic impairment remains excluded",
    "renal_stable": true
  },
  {
    "id": "P08",
    "age_years": 61,
    "egfr_ml_min_1_73m2": 63,
    "ecog": 1,
    "hepatic_status": "normal",
    "strong_cyp3a_inhibitor": false,
    "clinically_unstable_cardiac_disease": true,
    "controlled_hypertension": false,
    "stable_type2_diabetes": false,
    "stable_cardiac_history": false,
    "note": "Clinically unstable cardiac disease remains excluded",
    "renal_stable": true
  },
  {
    "id": "P09",
    "age_years": 79,
    "egfr_ml_min_1_73m2": 46,
    "ecog": 1,
    "hepatic_status": "normal",
    "strong_cyp3a_inhibitor": false,
    "clinically_unstable_cardiac_disease": false,
    "controlled_hypertension": false,
    "stable_type2_diabetes": true,
    "stable_cardiac_history": false,
    "note": "Older adult with stable type 2 diabetes; no age-based penalty",
    "renal_stable": true
  },
  {
    "id": "P10",
    "age_years": 65,
    "egfr_ml_min_1_73m2": null,
    "ecog": 1,
    "hepatic_status": "normal",
    "strong_cyp3a_inhibitor": false,
    "clinically_unstable_cardiac_disease": false,
    "controlled_hypertension": false,
    "stable_type2_diabetes": false,
    "stable_cardiac_history": false,
    "note": "Renal laboratory value missing",
    "renal_stable": true
  },
  {
    "id": "P11",
    "age_years": 62,
    "egfr_ml_min_1_73m2": 45,
    "ecog": 1,
    "hepatic_status": "mild",
    "strong_cyp3a_inhibitor": false,
    "clinically_unstable_cardiac_disease": false,
    "controlled_hypertension": true,
    "stable_type2_diabetes": false,
    "stable_cardiac_history": false,
    "note": "At the inclusive proposed renal threshold",
    "renal_stable": true
  },
  {
    "id": "P12",
    "age_years": 68,
    "egfr_ml_min_1_73m2": 65,
    "ecog": 2,
    "hepatic_status": "normal",
    "strong_cyp3a_inhibitor": false,
    "clinically_unstable_cardiac_disease": false,
    "controlled_hypertension": false,
    "stable_type2_diabetes": false,
    "stable_cardiac_history": false,
    "note": "ECOG 2 evidence gap; excluded in both scenarios",
    "renal_stable": true
  },
  {
    "id": "P13",
    "age_years": 80,
    "egfr_ml_min_1_73m2": 58,
    "ecog": 0,
    "hepatic_status": "normal",
    "strong_cyp3a_inhibitor": false,
    "clinically_unstable_cardiac_disease": false,
    "controlled_hypertension": false,
    "stable_type2_diabetes": false,
    "stable_cardiac_history": false,
    "note": "Older adult with mildly reduced renal function; no age penalty",
    "renal_stable": true
  },
  {
    "id": "P14",
    "age_years": 52,
    "egfr_ml_min_1_73m2": 62,
    "ecog": 0,
    "hepatic_status": "normal",
    "strong_cyp3a_inhibitor": false,
    "clinically_unstable_cardiac_disease": false,
    "controlled_hypertension": false,
    "stable_type2_diabetes": true,
    "stable_cardiac_history": false,
    "note": "Originally eligible with controlled diabetes",
    "renal_stable": true
  },
  {
    "id": "P15",
    "age_years": 57,
    "egfr_ml_min_1_73m2": 61,
    "ecog": 1,
    "hepatic_status": "mild",
    "strong_cyp3a_inhibitor": false,
    "clinically_unstable_cardiac_disease": false,
    "controlled_hypertension": false,
    "stable_type2_diabetes": false,
    "stable_cardiac_history": true,
    "note": "Originally eligible with stable cardiac history and mild hepatic impairment",
    "renal_stable": true
  },
  {
    "id": "P16",
    "age_years": 65,
    "egfr_ml_min_1_73m2": 50,
    "ecog": 1,
    "hepatic_status": null,
    "strong_cyp3a_inhibitor": false,
    "clinically_unstable_cardiac_disease": false,
    "controlled_hypertension": false,
    "stable_type2_diabetes": false,
    "stable_cardiac_history": false,
    "note": "Hepatic status missing; becomes indeterminate under revised scenario",
    "renal_stable": true
  },
  {
    "id": "P17",
    "age_years": 45,
    "egfr_ml_min_1_73m2": 59,
    "ecog": 1,
    "hepatic_status": "normal",
    "strong_cyp3a_inhibitor": true,
    "clinically_unstable_cardiac_disease": false,
    "controlled_hypertension": true,
    "stable_type2_diabetes": false,
    "stable_cardiac_history": false,
    "note": "Interaction exclusion takes precedence over renal revision",
    "renal_stable": true
  },
  {
    "id": "P18",
    "age_years": 65,
    "egfr_ml_min_1_73m2": 60,
    "ecog": 1,
    "hepatic_status": "normal",
    "strong_cyp3a_inhibitor": false,
    "clinically_unstable_cardiac_disease": false,
    "controlled_hypertension": false,
    "stable_type2_diabetes": false,
    "stable_cardiac_history": false,
    "note": "Exactly at original renal threshold",
    "renal_stable": true
  },
  {
    "id": "P19",
    "age_years": 60,
    "egfr_ml_min_1_73m2": 45,
    "ecog": 0,
    "hepatic_status": "normal",
    "strong_cyp3a_inhibitor": false,
    "clinically_unstable_cardiac_disease": false,
    "controlled_hypertension": false,
    "stable_type2_diabetes": false,
    "stable_cardiac_history": false,
    "note": "Exactly at proposed renal threshold",
    "renal_stable": true
  },
  {
    "id": "P20",
    "age_years": 70,
    "egfr_ml_min_1_73m2": 44.9,
    "ecog": 0,
    "hepatic_status": "normal",
    "strong_cyp3a_inhibitor": false,
    "clinically_unstable_cardiac_disease": false,
    "controlled_hypertension": false,
    "stable_type2_diabetes": false,
    "stable_cardiac_history": false,
    "note": "Just below proposed boundary; remains excluded",
    "renal_stable": true
  }
];

// Seeded values vary clinical characteristics; they are invented records, never estimated prevalence.
export function generateCohort(count = 120, seed = 217) {
  if (!Number.isInteger(count) || count < 0 || count > 10000) throw new RangeError('Cohort count must be an integer from 0 to 10000.');
  if (!Number.isInteger(seed)) throw new TypeError('Cohort seed must be an integer.');
  let value = seed >>> 0;
  const random = () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
  const pick = (values) => values[Math.floor(random() * values.length)];
  const records = anchorPatients.slice(0, count).map(patient => ({ ...patient }));
  while (records.length < count) {
    const patient = {
      id: `SYN-${String(records.length + 1).padStart(3, '0')}`,
      age_years: 35 + Math.floor(random() * 51),
      egfr_ml_min_1_73m2: pick([29, 38, 44.9, 45, 45.1, 49, 53, 58, 59.9, 60, 60.1, 74, 88, 102]),
      ecog: pick([0, 0, 1, 1, 1, 2, 3]),
      hepatic_status: pick(['normal', 'normal', 'normal', 'mild', 'mild', 'moderate', 'severe']),
      strong_cyp3a_inhibitor: random() < .16,
      clinically_unstable_cardiac_disease: random() < .1,
      renal_stable: random() >= .12,
      controlled_hypertension: random() < .4,
      stable_type2_diabetes: random() < .3,
      stable_cardiac_history: random() < .2,
      note: 'Seeded synthetic record; multiple conditions may coexist.',
    };
    const position = records.length;
    if (position % 19 === 0) patient.egfr_ml_min_1_73m2 = null;
    if (position % 23 === 0) patient.hepatic_status = null;
    if (position % 29 === 0) patient.conflicts = ['egfr_ml_min_1_73m2'];
    records.push(patient);
  }
  return records;
}
