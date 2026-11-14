// Editable showcase assumptions, not epidemiological estimates or reviewed clinical distributions.
export const showcaseConfig = {
  id: 'SYN217-SHOWCASE', version: '2.0.0', seed: 217, count: 500, asOfDate: '2026-11-01',
  clinicalProfiles: [
    { id: 'preserved-function', label: 'Preserved function', weight: 24, age: [38, 77], egfr: [65, 108], ecog: [[0, 5], [1, 5]], hepatic: [['normal', 9], ['mild', 1]], hypertension: .19, diabetes: .10, cardiacHistory: .07, interaction: .04, unstableCardiac: .015, stableRenal: .98 },
    { id: 'controlled-metabolic', label: 'Controlled metabolic conditions', weight: 24, age: [52, 86], egfr: [48, 83], ecog: [[0, 2], [1, 7], [2, 1]], hepatic: [['normal', 7], ['mild', 3]], hypertension: .86, diabetes: .62, cardiacHistory: .20, interaction: .08, unstableCardiac: .025, stableRenal: .91 },
    { id: 'renal-review', label: 'Renal subgroup for review', weight: 20, age: [46, 85], egfr: [45, 59.8], ecog: [[0, 3], [1, 6], [2, 1]], hepatic: [['normal', 8], ['mild', 2]], hypertension: .64, diabetes: .38, cardiacHistory: .13, interaction: .07, unstableCardiac: .025, stableRenal: .91 },
    { id: 'complex-organ', label: 'Multiple organ and functional concerns', weight: 17, age: [61, 89], egfr: [24, 64], ecog: [[1, 3], [2, 5], [3, 2]], hepatic: [['normal', 3], ['mild', 3], ['moderate', 3], ['severe', 1]], hypertension: .78, diabetes: .57, cardiacHistory: .30, interaction: .18, unstableCardiac: .18, stableRenal: .64 },
    { id: 'functional-review', label: 'Functional restriction', weight: 8, age: [48, 83], egfr: [62, 95], ecog: [[2, 8], [3, 2]], hepatic: [['normal', 8], ['mild', 2]], hypertension: .32, diabetes: .18, cardiacHistory: .14, interaction: .06, unstableCardiac: .04, stableRenal: .95 },
    { id: 'interaction-review', label: 'Medication interaction restriction', weight: 7, age: [44, 82], egfr: [46, 91], ecog: [[0, 2], [1, 7], [2, 1]], hepatic: [['normal', 8], ['mild', 2]], hypertension: .48, diabetes: .29, cardiacHistory: .17, interaction: 1, unstableCardiac: .04, stableRenal: .90 },
  ],
  missingness: {
    age_years: [.006, .004], egfr_ml_min_1_73m2: [.035, .018], ecog: [.012, .008], hepatic_status: [.035, .020],
    renal_stable: [.025, .015], strong_cyp3a_inhibitor: [.012, .008], clinically_unstable_cardiac_disease: [.012, .008],
    controlled_hypertension: [.012, .008], stable_type2_diabetes: [.012, .008], stable_cardiac_history: [.012, .008],
  },
  demographicMissingness: [.035, .045],
  sexGenderPairs: [['female', 'woman', 43], ['male', 'man', 43], ['female', 'man', 2], ['male', 'woman', 2], ['female', 'nonbinary', 3], ['male', 'nonbinary', 3], ['intersex', 'nonbinary', 2], ['intersex', 'another', 2]],
  raceWeights: [['white', 36], ['black', 24], ['asian', 18], ['multiple', 12], ['aian', 6], ['nhpi', 4]],
  ethnicityWeights: [['hispanic', 24], ['not-hispanic', 76]],
  siteWeights: [['DEMO-A', 27], ['DEMO-B', 24], ['DEMO-C', 20], ['DEMO-D', 17], ['DEMO-E', 12]],
};

export const demographicDefinitions = [
  { id: 'sex', label: 'Sex as recorded', categories: [['female', 'Female'], ['male', 'Male'], ['intersex', 'Intersex']] },
  { id: 'gender', label: 'Gender as recorded', categories: [['woman', 'Woman'], ['man', 'Man'], ['nonbinary', 'Non-binary'], ['another', 'Another recorded gender']] },
  { id: 'race', label: 'Race as recorded', categories: [['white', 'White'], ['black', 'Black or African American'], ['asian', 'Asian'], ['multiple', 'Multiple recorded groups'], ['aian', 'American Indian or Alaska Native'], ['nhpi', 'Native Hawaiian or Other Pacific Islander']] },
  { id: 'ethnicity', label: 'Ethnicity as recorded', categories: [['hispanic', 'Hispanic or Latino'], ['not-hispanic', 'Not Hispanic or Latino']] },
  { id: 'site', label: 'Fictional study site', categories: ['DEMO-A', 'DEMO-B', 'DEMO-C', 'DEMO-D', 'DEMO-E'].map(id => [id, id]) },
];
