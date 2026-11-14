import { clinicalConfig, demoCase } from './clinical-fixture.js';
import { anchorPatients } from './patients.js';
import { generateShowcase } from './synthetic-cohort.js';
import { showcaseConfig } from './synthetic-config.js';

// Editorial copy is separate from the executable rules in clinical-fixture.js.
export const product = { name: 'Cohort', wordmark: 'cohort.', tagline: 'A clearer path to inclusion.' };
export const patients = generateShowcase();
export { anchorPatients, clinicalConfig };
export const study = {
  id: demoCase.study.id,
  title: 'SYN-217 Oncology Eligibility Review',
  phase: 'Phase III',
  indication: demoCase.study.indication,
  drug: demoCase.study.fictional_drug,
  summary: 'A fictional targeted therapy study in advanced non-small-cell lung cancer. Compare an evidence-gated renal revision while performance status, hepatic, medication, cardiac, and adult eligibility rules remain active.',
  context: demoCase.study.study_scope,
  assumptions: [
    'SYN-217, its drug evidence, and every patient are fictional. This prototype applies explicit eligibility rules; it does not predict adverse events, establish safety, or approve enrollment.',
    `The reference case preserves ${anchorPatients.length} supplied records. The separate expanded cohort contains ${showcaseConfig.count} profile-based synthetic records using seed ${showcaseConfig.seed}, fixed as-of date ${showcaseConfig.asOfDate}, and generation configuration v${showcaseConfig.version}. Its distributions are showcase assumptions, not prevalence estimates.`,
    'Numeric thresholds come from the supplied SYN-217 exercise. They are synthetic software boundaries, not clinically validated safety cutoffs. Ehsan must review or replace them.',
    'The proposed renal rule preserves the original qualifying range and permits the lower demonstration range only when renal stability is explicitly recorded. Stability of the 20 anchor cases is an explicit synthetic scope assumption.',
    'Every active criterion is evaluated. A known failed criterion makes the overall record excluded; without a failure, any missing, invalid, or conflicting required observation makes it indeterminate. Unknown results remain visible even alongside a known exclusion.',
    'Only an explicit, versioned rule with matching drug-specific supporting evidence and synthetic-demo approval may replace a revisable criterion. Draft, unsupported, missing, or conflicting evidence leaves the original rule active.',
    'Controlled hypertension, diabetes, and stable cardiac history contribute only to the supplied illustrative review-attention index for newly matching records. That index never affects eligibility, overrides an exclusion, or fills missing information.',
    'The reviewer-attention index uses arbitrary fixture coefficients. It is unvalidated, is not a probability of drug toxicity or a medical risk model, and is withheld when any required scoring context is missing or conflicting.',
    'Adult age, disease indication, prior treatment, and consent define the synthetic scope. Age is evaluated only against the configured adult inclusion rule, with no upper-age penalty.',
    'FDA guidance supplies general review context and does not endorse the fictional cutoffs. In particular, the retained ECOG restriction is an unchanged fictional protocol rule awaiting drug-specific review.',
    'Approved demonstration rule means approved only for this synthetic software scenario. It is not clinical approval; every real protocol and enrollment decision requires qualified oversight.',
  ],
};

const editorial = {
  RENAL: { id: 'renal', title: 'Renal function', disposition: 'Consider revising', tone: 'teal', missing: ['Subgroup definitions, stability assessment, and monitoring require Ehsan’s clinical review. The invented PK packet cannot establish treatment safety.'] },
  DDI: { id: 'ddi', title: 'Concomitant medication', disposition: 'Retain', tone: 'neutral', missing: ['No supported coadministration approach has been supplied for this synthetic exercise.'] },
  ECOG: { id: 'ecog', title: 'Performance status', disposition: 'More evidence needed', tone: 'amber', missing: ['Drug-specific evidence remains insufficient for the draft ECOG change. The fictional original restriction stays active; it is not an FDA-endorsed threshold.'] },
  HEPATIC: { id: 'hepatic', title: 'Hepatic function', disposition: 'More evidence needed', tone: 'amber', missing: ['Evidence for moderate or severe hepatic impairment has not been supplied.'] },
  CARDIAC: { id: 'cardiac', title: 'Cardiac stability', disposition: 'Retain', tone: 'neutral', missing: ['No evidence supports relaxing the unstable cardiac disease exclusion in this demonstration.'] },
  ADULT: { id: 'adult', title: 'Adult inclusion', disposition: 'Retain', tone: 'neutral', missing: [] },
};
export const criteria = ['RENAL', 'DDI', 'ECOG', 'HEPATIC', 'CARDIAC', 'ADULT'].map((engineId, index) => {
  const definition = clinicalConfig.protocol.criteria.find(item => item.id === engineId);
  const renal = engineId === 'RENAL';
  return {
    ...editorial[engineId], engineId, number: String(index + 1).padStart(2, '0'),
    original: definition.original,
    proposed: renal ? definition.proposed : null,
    originalHighlight: renal ? String(clinicalConfig.thresholds.renalOriginalMin) : null,
    proposedHighlight: renal ? String(clinicalConfig.thresholds.renalProposedMin) : null,
    rationale: definition.rationale,
    sourceIds: [...definition.sourceIds, ...(demoCase.clinical_criteria.find(item => item.id === engineId)?.regulatory_context_refs || [])],
    ruleId: definition.ruleId, fixed: definition.fixed,
  };
});

const guidanceContext = {
  'FDA-2025-REP': { section: 'Section II.A · Trial Practices · p. 5', passage: 'Paraphrase: Review eligibility restrictions to support representative participation while accounting for scientific and participant-safety justification.' },
  'FDA-2020-ORG': { section: 'Section III.A · Organ Dysfunction · pp. 3–5', passage: 'Paraphrase: Organ-dysfunction criteria should reflect drug-specific pharmacology, available safety data, and the trial context.' },
  'FDA-2026-LAB': { section: 'Section III.A · Laboratory Values · p. 4', passage: 'Paraphrase: Laboratory restrictions should address specific, justified concerns and evolve with accumulating drug data.' },
  'FDA-2026-PS': { section: 'Section IV.A · Performance Status · p. 5', passage: 'Paraphrase: Performance-status restrictions should have an explicit scientific or clinical rationale and be reassessed as evidence develops. This guidance does not endorse the fictional ECOG exclusion.' },
  'FDA-2026-DDI': { section: 'Section III.B · Concomitant Medications · p. 4', passage: 'Paraphrase: Concomitant-medication exclusions should relate to clinically relevant interactions and overlapping toxicities.' },
};
export const sources = [
  ...demoCase.fictional_drug_evidence.map(source => ({
    id: source.id, title: source.label, shortTitle: source.label.replace('SYN-217 ', ''),
    type: 'Fictional drug evidence', section: `Fictional packet · ${source.id}`,
    passage: source.summary, relationship: source.supports || source.limitations,
    note: `${source.limitations || ''} Invented evidence for a synthetic exercise; not clinical proof of safety.`,
  })),
  ...demoCase.source_registry.map(source => ({
    id: source.id, title: source.title, shortTitle: source.title.replace('Cancer Clinical Trial Eligibility Criteria: ', 'FDA · '),
    type: 'Official guidance', url: source.url, date: source.date, version: source.status,
    ...guidanceContext[source.id], relationship: `${source.use} General context only; not supporting evidence for the SYN-217 numerical rule.`,
    note: 'Nonbinding guidance. Passage is a paraphrase, not a quotation. Drug-specific evidence is fictional and remains separate.',
  })),
  { id: 'synthetic-population', title: 'SYN-217 · Reproducible synthetic population', shortTitle: `Reference ${anchorPatients.length} / separate synthetic ${showcaseConfig.count}`, type: 'Synthetic patient data', section: `Generator v${showcaseConfig.version} · Seed ${showcaseConfig.seed} · As of ${showcaseConfig.asOfDate}`, passage: `The ${anchorPatients.length} supplied reference cases remain unchanged. A separate seeded generator authors ${showcaseConfig.count} coherent clinical profiles and explicitly synthetic demographics. Generation configuration v${showcaseConfig.version} uses seed ${showcaseConfig.seed} and fixed as-of date ${showcaseConfig.asOfDate}. Clinical values and demographic metadata use independent random streams. All eligibility results are evaluated locally.`, relationship: 'Explains rule behavior across clinical complexity; it does not estimate real recruitment or real-world safety.', note: 'No personal or real patient data. Every numerical boundary is a synthetic fixture requiring clinical review.' },
];
