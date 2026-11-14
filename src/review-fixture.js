// Transcribed from syn217_demo_case.json.review_attention_index. These are not clinical weights.
export const reviewConfig = {
  id: 'SYN217-REVIEW-ATTENTION', version: '1.0.0',
  name: 'Illustrative review-attention index', range: [0, 100],
  disclaimer: 'Unvalidated reviewer-attention index, not a probability of toxicity, a validated medical risk model, or an enrollment decision.',
  interpretation: 'Lower values mean fewer predefined review-attention flags in this fictional exercise. Age contributes no points.',
  renal: { id: 'renal', label: 'Renal function', field: 'egfr_ml_min_1_73m2', lowerInclusive: 45, upperExclusive: 60, base: 12, reference: 60, unit: 'mL/min/1.73 m²' },
  factors: [
    { id: 'performance_status', label: 'ECOG 1', field: 'ecog', when: 1, points: 5, allowedValues: [0, 1, 2, 3, 4, 5] },
    { id: 'mild_hepatic_impairment', label: 'Mild hepatic impairment', field: 'hepatic_status', when: 'mild', points: 8, allowedValues: ['normal', 'mild', 'moderate', 'severe'] },
    { id: 'controlled_hypertension', label: 'Controlled hypertension', field: 'controlled_hypertension', when: true, points: 3, allowedValues: [false, true] },
    { id: 'stable_type2_diabetes', label: 'Stable type 2 diabetes', field: 'stable_type2_diabetes', when: true, points: 5, allowedValues: [false, true] },
    { id: 'stable_cardiac_history', label: 'Stable cardiac history', field: 'stable_cardiac_history', when: true, points: 10, allowedValues: [false, true] },
  ],
  dimensions: [
    { id: 'renal', label: 'Renal function', criterionId: 'RENAL', field: 'egfr_ml_min_1_73m2', unit: 'mL/min/1.73 m²', componentIds: ['renal'] },
    { id: 'performance', label: 'Functional status', criterionId: 'ECOG', field: 'ecog', unit: 'ECOG grade', componentIds: ['performance_status'] },
    { id: 'hepatic', label: 'Hepatic function', criterionId: 'HEPATIC', field: 'hepatic_status', componentIds: ['mild_hepatic_impairment'] },
    { id: 'interaction', label: 'Medication interaction', criterionId: 'DDI', field: 'strong_cyp3a_inhibitor', componentIds: [] },
    { id: 'cardiac', label: 'Cardiac profile', criterionId: 'CARDIAC', field: 'clinically_unstable_cardiac_disease', componentIds: ['stable_cardiac_history'] },
    { id: 'comorbidity', label: 'Comorbidity context', fields: ['controlled_hypertension', 'stable_type2_diabetes'], componentIds: ['controlled_hypertension', 'stable_type2_diabetes'] },
  ],
  reviewSteps: {
    evidence: { id: 'review-evidence', title: 'Review the drug-specific evidence', detail: 'Ehsan must assess subgroup definitions and evidence sufficiency. The supplied SYN-217 PK packet is invented; it cannot establish safety for a real patient.', sourceIds: ['SYN-PK-01', 'SYN-PK-02'] },
    stability: { id: 'verify-renal-stability', title: 'Confirm the renal assessment and stability', detail: 'Confirm the relevant measurement, standard units, renal-stability definition, and applicable subgroup before considering a real protocol revision.', sourceIds: ['SYN-PK-02'] },
    oversight: { id: 'qualified-review', title: 'Complete qualified protocol and clinical review', detail: 'Define monitoring and unresolved review conditions, verify the full protocol beyond this modeled subset, and retain qualified enrollment oversight. A modeled match is not enrollment approval.', sourceIds: [] },
    missing: { id: 'resolve-missing-data', title: 'Resolve missing or conflicting clinical information', detail: 'Verify the unresolved observations listed in the criterion audit. Missing information cannot be treated as passing or replaced by a numerical score.', sourceIds: [] },
    scoreContext: { id: 'complete-review-context', title: 'Complete the reviewer-attention inputs', detail: 'Resolve the listed missing or conflicting context fields before calculating an index. This does not change the independently evaluated eligibility classification.', sourceIds: [] },
    unchanged: {
      ECOG: { id: 'review-performance', title: 'Keep the performance-status restriction active', detail: 'Drug-specific evidence remains insufficient for the proposed ECOG group. Review the scientific rationale and obtain appropriate evidence; the current fictional rule is unchanged.', sourceIds: ['SYN-PS-04'] },
      HEPATIC: { id: 'review-hepatic', title: 'Resolve the hepatic restriction', detail: 'The supplied packet does not support a change for moderate or severe impairment. Keep the original rule active pending qualified evidence review.', sourceIds: ['SYN-LIV-05'] },
      DDI: { id: 'review-interaction', title: 'Retain the interaction restriction', detail: 'The flagged medication restriction remains active. The fictional exposure concern cannot be canceled by a renal revision or a favorable attention index.', sourceIds: ['SYN-DDI-03'] },
      CARDIAC: { id: 'review-cardiac', title: 'Retain the cardiac restriction', detail: 'The packet supplies no adequate basis for revising the unstable-cardiac-disease restriction. Qualified clinical review and relevant evidence remain necessary.', sourceIds: ['SYN-CARD-06'] },
      RENAL: { id: 'review-renal-boundary', title: 'Keep the renal boundary in force', detail: 'The fictional supporting subgroup does not extend below the supplied boundary or to an unconfirmed stability subgroup. No eligibility expansion is supported for that record by this scenario.', sourceIds: ['SYN-PK-02'] },
      ADULT: { id: 'review-study-scope', title: 'Confirm the study population scope', detail: 'This synthetic protocol models an adult population. Other study populations require a separately reviewed protocol and evidence basis.', sourceIds: [] },
    },
  },
};
