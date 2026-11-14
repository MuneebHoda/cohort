// All values are supplied synthetic demonstration fixtures, not clinically validated thresholds.
// Ehsan must review thresholds, category definitions, stability, units, and source sufficiency.
export const demoCase = {
  "case_version": "1.0.0",
  "disclaimer": "FICTIONAL SOFTWARE DEMONSTRATION. No real drug, study, patients or clinical safety evidence. Scores are unvalidated reviewer-attention heuristics, NOT predicted adverse-event risk or clinical enrollment decisions.",
  "study": {
    "id": "DEMO-SYN217-03",
    "title": "SYN-217 Phase 3 Oncology Eligibility Review",
    "fictional_drug": "SYN-217",
    "fictional_drug_class": "Oral targeted small-molecule inhibitor with fictional CYP3A-dependent metabolism",
    "indication": "Advanced non-small-cell lung cancer after prior systemic therapy",
    "phase": 3,
    "primary_goal": "Identify renal-impairment exclusion potentially eligible for review using fictitious drug-specific pharmacokinetic evidence",
    "study_scope": "Every synthetic record is an adult assumed to meet cancer indication, prior-treatment and consent conditions; only the modeled criteria below are assessed."
  },
  "source_registry": [
    {
      "id": "FDA-2025-REP",
      "type": "authentic_public_guidance",
      "title": "Enhancing Participation in Clinical Trials — Eligibility Criteria, Enrollment Practices, and Trial Designs",
      "date": "2025-12",
      "status": "Final, nonbinding guidance",
      "url": "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/enhancing-participation-clinical-trials-eligibility-criteria-enrollment-practices-and-trial-designs",
      "use": "High-level rationale to review unjustified exclusions; not direct proof of SYN-217 safety."
    },
    {
      "id": "FDA-2020-ORG",
      "type": "authentic_public_guidance",
      "title": "Cancer Clinical Trial Eligibility Criteria: Patients with Organ Dysfunction or Prior or Concurrent Malignancies",
      "date": "2020-07",
      "status": "Final, nonbinding guidance",
      "url": "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cancer-clinical-trial-eligibility-criteria-patients-organ-dysfunction-or-prior-or-concurrent",
      "use": "Organ-dysfunction eligibility should reflect drug- and patient-specific considerations."
    },
    {
      "id": "FDA-2026-LAB",
      "type": "authentic_public_guidance",
      "title": "Cancer Clinical Trial Eligibility Criteria: Laboratory Values",
      "date": "2026-07",
      "status": "Final, nonbinding guidance",
      "url": "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cancer-clinical-trial-eligibility-criteria-laboratory-values",
      "use": "Laboratory restrictions need a justified safety rationale and may be reconsidered as evidence accumulates."
    },
    {
      "id": "FDA-2026-PS",
      "type": "authentic_public_guidance",
      "title": "Cancer Clinical Trial Eligibility Criteria: Performance Status",
      "date": "2026-07",
      "status": "Final, nonbinding guidance",
      "url": "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cancer-clinical-trial-eligibility-criteria-performance-status",
      "use": "Review the rationale for performance-status restrictions; this demo conservatively keeps the ECOG limit unchanged."
    },
    {
      "id": "FDA-2026-DDI",
      "type": "authentic_public_guidance",
      "title": "Cancer Clinical Trial Eligibility Criteria: Washout Periods and Concomitant Medications",
      "date": "2026-07",
      "status": "Final, nonbinding guidance",
      "url": "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cancer-clinical-trial-eligibility-criteria-washout-periods-and-concomitant-medications",
      "use": "Medication restrictions should relate to relevant drug interaction evidence."
    }
  ],
  "fictional_drug_evidence": [
    {
      "id": "SYN-PK-01",
      "type": "fabricated_drug_specific_evidence",
      "fictional": true,
      "label": "SYN-217 mass-balance pilot",
      "sample_size": 12,
      "summary": "Fictional model: about 7% of a dose recovered unchanged in urine; CYP3A pathway is important.",
      "limitations": "A route-of-elimination observation alone cannot establish safety in renal impairment."
    },
    {
      "id": "SYN-PK-02",
      "type": "fabricated_drug_specific_evidence",
      "fictional": true,
      "label": "SYN-217 renal impairment PK sub-study",
      "sample_size": 36,
      "population": "Stable adult participants with eGFR 45–59 mL/min/1.73 m²",
      "summary": "Fictional modeled exposure ratio (AUC) 1.12 compared with the reference group, and no clear early exposure-related safety pattern in this small sample.",
      "limitations": "Small invented dataset; no data for eGFR <45; no conclusion that any proposed patient is safe.",
      "supports": "Only a clinician-reviewed discussion of revising the synthetic renal eligibility boundary to >=45, not a treatment or enrollment recommendation."
    },
    {
      "id": "SYN-DDI-03",
      "type": "fabricated_drug_specific_evidence",
      "fictional": true,
      "label": "SYN-217 strong CYP3A inhibitor interaction study",
      "sample_size": 12,
      "summary": "Fictional model: coadministration with a strong CYP3A inhibitor was associated with a 2.7-fold higher exposure.",
      "supports": "Retain the modeled strong CYP3A inhibitor exclusion pending drug-specific clinical review."
    },
    {
      "id": "SYN-PS-04",
      "type": "fabricated_drug_specific_evidence",
      "fictional": true,
      "label": "SYN-217 performance-status evidence inventory",
      "sample_size": 6,
      "summary": "Fictional model: limited observations in ECOG 2 patients, insufficient to establish appropriate SYN-217 eligibility rules for this group.",
      "supports": "Flag ECOG 2 for additional evidence review; retain the original ECOG 0–1 limit for the current scenario."
    },
    {
      "id": "SYN-LIV-05",
      "type": "fabricated_drug_specific_evidence",
      "fictional": true,
      "label": "SYN-217 hepatic evaluation inventory",
      "sample_size": 0,
      "summary": "Fictional model: evidence is inadequate to propose eligibility for moderate or severe hepatic impairment.",
      "supports": "Retain the current modeled hepatic exclusions; missing hepatic status causes indeterminate classification unless another criterion excludes."
    },
    {
      "id": "SYN-CARD-06",
      "type": "fabricated_drug_specific_evidence",
      "fictional": true,
      "label": "SYN-217 cardiac safety evaluation inventory",
      "sample_size": 0,
      "summary": "Fictional model: no adequate evidence to support including clinically unstable cardiac disease.",
      "supports": "Retain modeled exclusion for clinically unstable cardiac disease."
    }
  ],
  "clinical_criteria": [
    {
      "id": "RENAL",
      "original": "eGFR >=60 mL/min/1.73 m²",
      "proposed": "eGFR >=45 mL/min/1.73 m² (candidate revision for expert review)",
      "decision": "REVIEW_CANDIDATE",
      "justification": "Synthetic supporting exposure data cover only a stable eGFR 45–59 subgroup; nothing supports extension below 45.",
      "evidence_refs": [
        "SYN-PK-01",
        "SYN-PK-02"
      ],
      "regulatory_context_refs": [
        "FDA-2025-REP",
        "FDA-2020-ORG",
        "FDA-2026-LAB"
      ]
    },
    {
      "id": "ECOG",
      "original": "ECOG 0–1",
      "proposed": null,
      "decision": "NEEDS_ADDITIONAL_EVIDENCE",
      "justification": "Fictional ECOG2 sample is too small to justify changing this scenario; FDA guidance recommends evaluating narrower exclusions in real protocols.",
      "evidence_refs": [
        "SYN-PS-04"
      ],
      "regulatory_context_refs": [
        "FDA-2026-PS"
      ]
    },
    {
      "id": "DDI",
      "original": "No strong CYP3A inhibitor coadministration",
      "proposed": null,
      "decision": "RETAIN",
      "justification": "Fictional DDI evidence identifies exposure increase with flagged medication.",
      "evidence_refs": [
        "SYN-DDI-03"
      ],
      "regulatory_context_refs": [
        "FDA-2026-DDI"
      ]
    },
    {
      "id": "HEPATIC",
      "original": "Normal or mild hepatic impairment only",
      "proposed": null,
      "decision": "RETAIN_PENDING_EVIDENCE",
      "justification": "No fictional drug evidence for moderate/severe hepatic impairment.",
      "evidence_refs": [
        "SYN-LIV-05"
      ],
      "regulatory_context_refs": [
        "FDA-2020-ORG",
        "FDA-2026-LAB"
      ]
    },
    {
      "id": "CARDIAC",
      "original": "No clinically unstable cardiac disease",
      "proposed": null,
      "decision": "RETAIN_PENDING_EVIDENCE",
      "justification": "No fictional drug evidence to justify including unstable cardiac disease.",
      "evidence_refs": [
        "SYN-CARD-06"
      ],
      "regulatory_context_refs": [
        "FDA-2020-ORG"
      ]
    }
  ],
  "rule_sets": {
    "common": {
      "adult": true,
      "trial_disease_and_prior_therapy_assumed_met_for_all_synthetic_records": true,
      "ecog_max": 1,
      "allowed_hepatic_status": [
        "normal",
        "mild"
      ],
      "strong_cyp3a_inhibitor_allowed": false,
      "unstable_cardiac_disease_allowed": false
    },
    "original": {
      "id": "SCENARIO-ORIGINAL",
      "renal_egfr_min_inclusive": 60,
      "status": "fictional_original_protocol"
    },
    "proposed": {
      "id": "SCENARIO-RENAL-REVISION",
      "renal_egfr_min_inclusive": 45,
      "status": "approved_only_for_synthetic_demo_not_real_clinical_enrollment",
      "required_fictional_evidence_ids": [
        "SYN-PK-01",
        "SYN-PK-02"
      ],
      "requires_real_clinician_review": true
    },
    "renal_metric_note": "eGFR (mL/min/1.73 m²) is a lab eligibility proxy in this fictional protocol, not an individualized dosing calculation."
  }
};

export const thresholds = { adultAgeMin: 18, renalOriginalMin: 60, renalProposedMin: 45, ecogMax: 1, ecogDraftMax: 2 };

export const clinicalConfig = {
  thresholds,
  units: { age_years: 'years', egfr_ml_min_1_73m2: 'mL/min/1.73 m²', ecog: 'ECOG grade' },
  assumptions: [
    demoCase.study.study_scope,
    'Anchor records assume stable renal assessment solely for this synthetic demonstration. Generated records explicitly vary stability.',
    'Known failure takes precedence over unknown information. Unknown fields remain listed and can never count as passing.',
    'Controlled hypertension, stable diabetes, and stable cardiac history are recorded context, not blanket exclusions or weighted penalties.',
    'All numerical thresholds and category definitions are demonstration fixtures requiring Ehsan’s review; none establishes medical safety.',
  ],
  protocol: {
    id: 'SYN217-PROTOCOL', version: '1.0.0',
    criteria: [
      { id: 'ADULT', title: 'Adult study population', kind: 'inclusion', fixed: true, ruleId: 'adult-original-v1', sourceIds: [], original: 'Adults only (age ≥18 years in this demo).', proposed: null, rationale: 'The supplied study scope assumes an adult population. Age is not used as a health score.' },
      { id: 'RENAL', title: 'Renal function', kind: 'inclusion', fixed: false, ruleId: 'renal-original-v1', sourceIds: ['SYN-PK-01', 'SYN-PK-02'], original: 'eGFR ≥60 mL/min/1.73 m².', proposed: 'eGFR ≥60, or stable renal assessment with eGFR ≥45 mL/min/1.73 m².', rationale: 'The supplied fictional PK packet covers a stable 45–59 subgroup. It supports only discussion of a narrower synthetic criterion, with no extension below the supplied boundary.' },
      { id: 'ECOG', title: 'Performance status', kind: 'inclusion', fixed: true, ruleId: 'ecog-original-v1', sourceIds: ['SYN-PS-04'], original: 'ECOG performance status 0–1.', proposed: null, rationale: 'Insufficient fictional evidence in ECOG 2. Retain the supplied original restriction.' },
      { id: 'HEPATIC', title: 'Hepatic impairment', kind: 'inclusion', fixed: true, ruleId: 'hepatic-original-v1', sourceIds: ['SYN-LIV-05'], original: 'Normal or mild hepatic impairment only.', proposed: null, rationale: 'The supplied evidence inventory does not support moderate or severe hepatic impairment; unknown hepatic status requires review.' },
      { id: 'DDI', title: 'Concomitant medication', kind: 'exclusion', fixed: true, ruleId: 'ddi-original-v1', sourceIds: ['SYN-DDI-03'], original: 'No strong CYP3A inhibitor coadministration.', proposed: null, rationale: 'The fictional interaction packet identifies an exposure concern. This hard restriction remains active in every approved scenario.' },
      { id: 'CARDIAC', title: 'Cardiac stability', kind: 'exclusion', fixed: true, ruleId: 'cardiac-original-v1', sourceIds: ['SYN-CARD-06'], original: 'No clinically unstable cardiac disease.', proposed: null, rationale: 'There is no supplied evidence to relax the unstable-cardiac-disease exclusion. Stable cardiac history is recorded separately.' },
    ],
  },
  rules: [
    { id: 'adult-original-v1', version: '1.0.0', criterionId: 'ADULT', field: 'age_years', operator: 'gte', value: thresholds.adultAgeMin, min: 0, unit: 'years', sourceIds: [] },
    { id: 'renal-original-v1', version: '1.0.0', criterionId: 'RENAL', field: 'egfr_ml_min_1_73m2', operator: 'gte', value: thresholds.renalOriginalMin, min: 0, unit: 'mL/min/1.73 m²', sourceIds: ['SYN-PK-01', 'SYN-PK-02'] },
    { id: 'renal-revised-v1', version: '1.0.0', criterionId: 'RENAL', operator: 'any', sourceIds: ['SYN-PK-01', 'SYN-PK-02'], conditions: [
      { field: 'egfr_ml_min_1_73m2', operator: 'gte', value: thresholds.renalOriginalMin, min: 0, unit: 'mL/min/1.73 m²' },
      { operator: 'all', conditions: [
        { field: 'egfr_ml_min_1_73m2', operator: 'gte', value: thresholds.renalProposedMin, min: 0, unit: 'mL/min/1.73 m²' },
        { field: 'renal_stable', operator: 'equals', value: true, allowedValues: [false, true] },
      ] },
    ] },
    { id: 'ecog-original-v1', version: '1.0.0', criterionId: 'ECOG', field: 'ecog', operator: 'lte', value: thresholds.ecogMax, allowedValues: [0, 1, 2, 3, 4, 5], unit: 'ECOG grade', sourceIds: ['SYN-PS-04'] },
    { id: 'ecog-draft-v1', version: '1.0.0', criterionId: 'ECOG', field: 'ecog', operator: 'lte', value: thresholds.ecogDraftMax, allowedValues: [0, 1, 2, 3, 4, 5], unit: 'ECOG grade', sourceIds: ['SYN-PS-04'] },
    { id: 'hepatic-original-v1', version: '1.0.0', criterionId: 'HEPATIC', field: 'hepatic_status', operator: 'in', value: ['normal', 'mild'], allowedValues: ['normal', 'mild', 'moderate', 'severe'], sourceIds: ['SYN-LIV-05'] },
    { id: 'ddi-original-v1', version: '1.0.0', criterionId: 'DDI', field: 'strong_cyp3a_inhibitor', operator: 'equals', value: false, allowedValues: [false, true], sourceIds: ['SYN-DDI-03'] },
    { id: 'cardiac-original-v1', version: '1.0.0', criterionId: 'CARDIAC', field: 'clinically_unstable_cardiac_disease', operator: 'equals', value: false, allowedValues: [false, true], sourceIds: ['SYN-CARD-06'] },
  ],
  evidence: [
    ...demoCase.fictional_drug_evidence.map(source => ({
      ...source, title: source.label, fictional: true, type: 'fictional-drug-evidence',
      status: ['SYN-PK-01', 'SYN-PK-02', 'SYN-DDI-03'].includes(source.id) ? 'supporting' : 'insufficient',
      supportsRuleIds: ['SYN-PK-01', 'SYN-PK-02'].includes(source.id) ? ['renal-revised-v1'] : [],
      passage: source.summary,
    })),
    ...demoCase.source_registry.map(source => ({ ...source, fictional: false, type: 'official-guidance', status: 'context-only', supportsRuleIds: [], summary: source.use, passage: source.use })),
  ],
  scenarios: [
    { id: 'renal-revision', label: 'Stable renal subgroup', version: '1.0.0', status: 'approved-demo', syntheticOnly: true, requiresClinicalReview: true, revisions: [{ criterionId: 'RENAL', ruleId: 'renal-revised-v1', evidenceIds: ['SYN-PK-01', 'SYN-PK-02'] }] },
    { id: 'renal-draft', label: 'Renal revision · evidence-supported draft', version: '1.0.0', status: 'draft', syntheticOnly: true, revisions: [{ criterionId: 'RENAL', ruleId: 'renal-revised-v1', evidenceIds: ['SYN-PK-01', 'SYN-PK-02'] }] },
    { id: 'ecog-awaiting-review', label: 'ECOG 2 · awaiting medical review', version: '1.0.0', status: 'awaiting-review', syntheticOnly: true, revisions: [{ criterionId: 'ECOG', ruleId: 'ecog-draft-v1', evidenceIds: ['SYN-PS-04'] }] },
  ],
};
