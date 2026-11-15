import { clinicalConfig, demoCase } from './clinical-fixture.js';
import { casePackMetadata } from './case-pack-metadata.js';

export const investigationSettings = { id: 'COHORT-INVESTIGATION', version: '1.0.0', seed: 2171, asOfDate: '2026-11-01', variantsPerPack: 44, unassessedInteractionProbability: .14, independentRestrictionProbability: .08 };
export const routeDefinitions = [
  ['SCREENING_CORRECTION_REVIEW', 'Screening correction review'], ['PROTOCOL_REVISION_REVIEW', 'Protocol revision review'],
  ['ACCOMMODATION_REVIEW', 'Accommodation review'], ['NEEDS_INFORMATION', 'Needs information'],
  ['RETAIN_RESTRICTION', 'Retain restriction'], ['SEPARATE_RESEARCH_PATHWAY', 'Separate research pathway'], ['NO_CASE_SPECIFIC_ACTION', 'No case-specific action'],
];
const noValue = 'not_applicable';
const reviewed = 'satisfied';
const concernClear = 'none_identified';
const protocol = (caseId, policy = 'blanket') => ({
  id: `DEMO-${caseId}-${policy.toUpperCase()}`, version: '1.0.0', studyId: `ILLUSTRATIVE-${caseId}`, policy,
  provenance: 'Authored hypothetical protocol snapshot; not supplied clinical guidance',
  wording: policy === 'blanket' ? 'This authored snapshot retains the case-specific blanket restriction.' : 'This separately authored snapshot accepts a documented case-specific assessment, while retaining independent restrictions.',
});
const screening = (caseId, reason, rejected = true, policy = 'blanket') => ({ decision: rejected ? 'rejected' : 'accepted', domain: 'medical', reason, date: '2026-10-25', protocolId: protocol(caseId, policy).id, protocolVersion: '1.0.0', provenance: 'Fictional original screening record' });

function hivAnchor(letter) {
  const unaffected = letter === 'D';
  const record = {
    hiv_status: unaffected ? 'negative' : 'positive', viral_load_status: unaffected ? noValue : 'suppression_documented',
    viral_load_collection_date: unaffected ? noValue : '2026-10-20', viral_load_protocol_assessment: unaffected ? noValue : reviewed,
    cd4_value: null, cd4_unit: 'cells/µL', cd4_protocol_assessment: unaffected ? noValue : reviewed,
    current_antiretroviral_medications: unaffected ? [] : ['ART-DEMO-A'],
    interaction_assessment: unaffected ? noValue : concernClear,
    independent_medical_assessment: reviewed,
    protocolContext: protocol('HIV', letter === 'F' ? 'individualized' : 'blanket'),
    originalScreening: screening('HIV', unaffected ? 'All configured requirements satisfied; no HIV criterion triggered.' : 'HIV diagnosis recorded; rejected under a blanket interpretation.', !unaffected, letter === 'F' ? 'individualized' : 'blanket'),
  };
  if (letter === 'B') record.interaction_assessment = 'relevant_concern';
  if (letter === 'C') { record.viral_load_status = null; record.viral_load_protocol_assessment = null; record.cd4_protocol_assessment = null; }
  if (letter === 'E') record.independent_medical_assessment = 'not_satisfied';
  return record;
}

function accessAnchor(letter) {
  const clear = letter === 'D';
  const record = { functional_support_needs: clear ? 'none' : 'mobility and visit transport', required_study_tasks: ['Attend scheduled visits', 'Complete the configured assessment'],
    task_specific_ability_assessment: reviewed, accommodations_requested: clear ? [] : ['Accessible transport', 'Assistive device'],
    accommodation_availability: clear ? noValue : 'confirmed', availability_confirmation: clear ? noValue : 'Fictional site arrangement recorded for the required tasks',
    procedure_validity_review: reviewed, independent_medical_assessment: reviewed,
    protocolContext: protocol('ACCESS','individualized'), originalScreening: screening('ACCESS', clear ? 'No participation barrier identified; configured medical requirements satisfied.' : 'Participation rejected because independent attendance or task completion was assumed necessary.',!clear,'individualized') };
  record.originalScreening.domain = 'participation';
  if(letter==='B'){record.accommodation_availability='proposed';record.availability_confirmation=null;}
  if(letter==='C')record.task_specific_ability_assessment=null;
  if(letter==='E')record.independent_medical_assessment='not_satisfied';
  if(letter==='F')record.procedure_validity_review=null;
  return record;
}
function pregnancyAnchor(letter) {
  const comparator=letter==='D';
  const record={ pregnancy_status:comparator?'not_pregnant':'pregnant', trial_pregnancy_policy:'excludes_pregnancy',
    drug_specific_pregnancy_evidence_status:'unavailable', documented_drug_specific_concern:letter==='B'?'present_in_authored_protocol':'not_assessed',
    research_pathway_review_status:letter==='F'?'idea_only':'not_established', oversight_review_status:'not_established', independent_medical_assessment:reviewed,
    protocolContext:protocol('PREG','blanket'),originalScreening:screening('PREG',comparator?'Pregnancy restriction not triggered; other configured requirements satisfied.':'Pregnancy recorded; current authored protocol excludes pregnancy.',!comparator) };
  record.protocolContext.pregnancyConcernRestriction = letter === 'B';
  if(letter==='B') { record.protocolContext.id='DEMO-PREG-DOCUMENTED-CONCERN'; record.originalScreening.protocolId=record.protocolContext.id; record.protocolContext.wording='This authored protocol retains pregnancy exclusion and an explicitly documented pregnancy-specific concern.'; }
  if(letter==='C'){record.pregnancy_status=null;record.originalScreening.reason='Pregnancy status unresolved where the current protocol requires it.';record.originalScreening.decision='pending';}
  return record;
}
function brainAnchor(letter) {
  const absent=letter==='D';
  const r={brain_metastases_present:!absent, prior_treatment_status:absent?noValue:'treated', treatment_protocol_assessment:absent?noValue:reviewed,
    current_stability_assessment:absent?noValue:'stable', neurological_symptoms:absent?noValue:false, assessment_date:'2026-10-20',
    drug_specific_neurological_concern:absent?noValue:concernClear, independent_medical_assessment:reviewed,
    protocolContext:protocol('BRAIN',letter==='F'?'individualized':'blanket'),originalScreening:screening('BRAIN',absent?'No brain metastases; configured requirements satisfied.':'Brain metastases recorded; blanket diagnosis-based rejection.',!absent,letter==='F'?'individualized':'blanket')};
  if(letter==='B'){r.prior_treatment_status='not_treated';r.treatment_protocol_assessment=null;r.current_stability_assessment='active';r.neurological_symptoms=true;r.drug_specific_neurological_concern='relevant_concern';}
  if(letter==='C'){r.current_stability_assessment=null;r.treatment_protocol_assessment=null;}
  if(letter==='E')r.independent_medical_assessment='not_satisfied';
  if(letter==='F'){r.prior_treatment_status='not_treated';r.treatment_protocol_assessment=noValue;}
  return r;
}
function olderAnchor(letter) {
  const absent=letter==='D';
  const r={cardiac_history:!absent,current_cardiac_status:absent?'none':'historical_controlled',condition_severity_assessment:absent?noValue:'controlled',
    functional_assessment:reviewed,current_comorbidity_treatment:absent?[]:['COMORBIDITY-DEMO-A'],drug_specific_concern:absent?noValue:concernClear,independent_medical_assessment:reviewed,
    protocolContext:protocol('OLDER',letter==='F'||absent?'individualized':'blanket'),originalScreening:screening('OLDER',absent?'Older adult satisfies all configured requirements.':'Historical cardiac code interpreted as an exclusion.',!absent,letter==='F'||absent?'individualized':'blanket')};
  if(letter==='B'){r.current_cardiac_status='active';r.condition_severity_assessment='restriction_applies';r.drug_specific_concern='relevant_concern';}
  if(letter==='C'){r.current_cardiac_status=null;r.condition_severity_assessment=null;r.functional_assessment=null;}
  if(letter==='E')r.functional_assessment='not_satisfied';
  return r;
}
function cognitiveAnchor(letter) {
  const noSupport=letter==='D';
  const r={communication_support_needs:noSupport?'none':'plain-language communication and procedure support', questionnaire_completion_method:noSupport?'independent_accepted_method':'assisted_method',
    procedure_support_plan:noSupport?noValue:'Documented fictional communication and procedure-support arrangement',support_availability:noSupport?noValue:'confirmed',
    support_confirmation:noSupport?noValue:'Authored site support arrangement for the named tasks',task_specific_ability_assessment:reviewed,
    consent_process_assessment_status:'completed_fictional_review',study_method_acceptability_review:'accepted_fictional_review',independent_medical_assessment:reviewed,
    protocolContext:protocol('COGNITIVE','individualized'),originalScreening:screening('COGNITIVE',noSupport?'Required tasks completed under an accepted authored method.':'Assistance required for participation; recorded rejection without individualized support review.',!noSupport,'individualized')};
  r.originalScreening.domain='participation';
  if(letter==='B')r.consent_process_assessment_status='pending';
  if(letter==='C'){r.communication_support_needs=null;r.task_specific_ability_assessment=null;r.support_availability='unknown';r.support_confirmation=null;}
  if(letter==='E')r.independent_medical_assessment='not_satisfied';
  if(letter==='F'){r.questionnaire_completion_method='assistance_proposed';r.study_method_acceptability_review=null;}
  return r;
}
function priorAnchor(letter) {
  const absent=letter==='D';
  const r={prior_cancer_history:!absent,time_since_treatment_years:absent?noValue:10,recurrence_status:absent?noValue:'no_recurrence',current_cancer_activity:absent?'none':'not_active',
    other_cancer_treatment:absent?noValue:'completed',endpoint_interference_assessment:absent?noValue:concernClear,safety_interference_assessment:absent?noValue:concernClear,
    treatment_interaction_assessment:absent?noValue:concernClear,independent_medical_assessment:reviewed,
    protocolContext:protocol('PRIOR',letter==='F'?'individualized':'blanket'),originalScreening:screening('PRIOR',absent?'No other cancer history; all configured criteria satisfied.':'Another malignancy recorded; blanket history-based rejection.',!absent,letter==='F'?'individualized':'blanket')};
  if(letter==='A')r.prior_cancer_description='Breast cancer treated ten years ago; authored example, not a waiting-period rule';
  if(letter==='B'){r.current_cancer_activity='active';r.other_cancer_treatment='ongoing';r.recurrence_status='documented_active_disease';r.endpoint_interference_assessment='relevant_concern';r.safety_interference_assessment='relevant_concern';}
  if(letter==='C'){r.recurrence_status=null;r.endpoint_interference_assessment=null;}
  if(letter==='E')r.independent_medical_assessment='not_satisfied';
  if(letter==='F'){r.current_cancer_activity='active';r.other_cancer_treatment='ongoing';r.recurrence_status='documented_active_disease';}
  return r;
}
function renalAnchor(letter) {
  const r={renal_metric_type:'egfr',renal_value:letter==='B'?32:letter==='D'?78:52,renal_unit:'mL/min/1.73 m²',collection_date:'2026-10-20',laboratory_method:'Authored eGFR laboratory observation',
    drug_elimination_evidence:'Existing fictional SYN-217 packet; not derived from the research note',configured_protocol_limit:clinicalConfig.thresholds.renalOriginalMin,configured_proposed_limit:clinicalConfig.thresholds.renalProposedMin,
    measurement_currency_assessment:'current_for_authored_snapshot',renal_stable:true,ecog:0,hepatic_status:'normal',strong_cyp3a_inhibitor:false,clinically_unstable_cardiac_disease:false,
    controlled_hypertension:false,stable_type2_diabetes:false,stable_cardiac_history:false,independent_medical_assessment:reviewed,
    protocolContext:{id:clinicalConfig.protocol.id,version:clinicalConfig.protocol.version,studyId:demoCase.study.id,policy:'renal-original',wording:'Existing fictional SYN-217 renal rule and unchanged independent restrictions. No laboratory-expiry window is inferred from the secondary note.',provenance:'Existing SYN-217 fictional protocol configuration'},
    originalScreening:{decision:letter==='D'?'accepted':'rejected',domain:'medical',reason:letter==='D'?'Recorded eGFR meets the original fictional SYN-217 boundary.':'Recorded renal assessment below the original fictional SYN-217 boundary.',date:'2026-10-25',protocolId:clinicalConfig.protocol.id,protocolVersion:clinicalConfig.protocol.version,provenance:'Fictional original screening record'}};
  if(letter==='C'){r.renal_value=null;r.collection_date=null;r.measurement_currency_assessment=null;}
  if(letter==='E')r.strong_cyp3a_inhibitor=true;
  if(letter==='F'){r.renal_metric_type='creatinine_clearance';r.renal_unit='mL/min';r.laboratory_method='Authored creatinine-clearance observation';r.measurement_currency_assessment=null;r.originalScreening.reason='Creatinine clearance was used as though it were the protocol-required eGFR; comparable data require review.';r.originalScreening.metricUsed='creatinine_clearance';}
  return r;
}
const anchorBuilders = { HIV: hivAnchor, ACCESS: accessAnchor, PREG: pregnancyAnchor, BRAIN:brainAnchor, OLDER:olderAnchor, COGNITIVE:cognitiveAnchor, PRIOR:priorAnchor, RENAL:renalAnchor };
export const casePackDefinitions = Object.fromEntries(casePackMetadata.cases.filter(pack => anchorBuilders[pack.id]).map(pack => [pack.id, { ...pack, studyId: pack.id === 'RENAL' ? demoCase.study.id : `ILLUSTRATIVE-${pack.id}`, studyLabel: `${pack.id} · Illustrative protocol contexts`, sourceId: `CASE-NOTE-${pack.id}`, proposedConfigured: pack.id === 'RENAL' }]));
export const investigationSources = Object.values(casePackDefinitions).map(pack => ({
  id: pack.sourceId, title: pack.title, type: 'Supplied secondary case summary', status: 'provided-secondary-summary', verified: false,
  passage: pack.reconsideration_basis, passageLabel: 'Supplied case specification · reconsideration_basis',
  section: pack.title, originalNoteLines: pack.source_lines, originalNoteAvailable: false,
  note: 'The original research-note text is unavailable. The supplied specification reports these line references; they have not been checked against that original. Bibliographic details remain unresolved.',
  missingConfiguration: pack.missing_configuration,
})).concat([{id:'RESEARCH-NOTE',title:'Original research note referenced by the case specification',type:'Supplied secondary research summary · original file unavailable',status:'unavailable',verified:false,passage:null,section:'Original research note not supplied',originalNoteLines:[1,casePackMetadata.source.line_count],originalNoteAvailable:false,reportedSha256:casePackMetadata.source.sha256,missingConfiguration:['Original text and complete bibliographic references'],note:'The supplied case specification identifies a 499-line secondary research note, but the original file was not provided. Its passages and bibliography have not been verified.'}]);

function stream(seed) { let state = seed >>> 0; return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; }; }
const isoDate = (asOfDate, days) => new Date(Date.parse(`${asOfDate}T00:00:00Z`) - days * 86400000).toISOString().slice(0, 10);
const assessmentFields = new Set(['viral_load_protocol_assessment', 'cd4_protocol_assessment', 'interaction_assessment', 'independent_medical_assessment', 'task_specific_ability_assessment', 'procedure_validity_review', 'documented_drug_specific_concern','current_stability_assessment','treatment_protocol_assessment','drug_specific_neurological_concern','condition_severity_assessment','functional_assessment','drug_specific_concern','consent_process_assessment_status','study_method_acceptability_review','endpoint_interference_assessment','safety_interference_assessment','treatment_interaction_assessment','measurement_currency_assessment']);
function makeRecord(caseId, letter, index, config, random, anchor) {
  const values = anchorBuilders[caseId](letter);
  const date = isoDate(config.asOfDate, anchor ? 8 : 3 + Math.floor(random() * 12));
  const id = anchor ? `${caseId}-${letter}` : `${caseId}-${String(index + 1).padStart(3, '0')}`;
  const record = { id, personId: `${config.id}-${caseId}-PERSON-${String(index + 1).padStart(3, '0')}`, caseId,
    age_years: anchor ? (caseId === 'OLDER' ? [82,76,79,84,81,77] : [48,55,64,41,68,53])[index] : caseId === 'OLDER' ? 65 + Math.floor(random()*25) : 28 + Math.floor(random() * 58), ...values,
    note: anchor ? `${caseId} anchor ${letter}` : `${caseId} authored clinical variation`,
    provenance: { synthetic: true, type: anchor ? 'hand-authored-anchor' : 'seeded-variant', generatorId: config.id, generatorVersion: config.version, seed: config.seed, asOfDate: config.asOfDate },
  };
  record.originalScreening.date = isoDate(config.asOfDate, 1);
  if (record.viral_load_collection_date && record.viral_load_collection_date !== noValue) record.viral_load_collection_date = date;
  if (!anchor && record.hiv_status === 'positive') {
    record.current_antiretroviral_medications = random() < .5 ? ['ART-DEMO-A'] : ['ART-DEMO-B', 'ART-DEMO-C'];
    record.cd4_value = record.cd4_protocol_assessment === reviewed && random() < .5 ? 300 + Math.floor(random() * 450) : null;
    // Numerical observations never substitute for the explicitly authored protocol assessment.
    if (random() < config.unassessedInteractionProbability) record.interaction_assessment = 'not_assessed';
  }
  if (!anchor && caseId === 'ACCESS' && record.functional_support_needs !== 'none') { record.required_study_tasks = random() < .5 ? ['Attend site assessments', 'Complete an accessible questionnaire'] : ['Attend scheduled visits', 'Complete imaging procedure']; record.accommodations_requested = random() < .5 ? ['Accessible transport', 'Mobility assistance'] : ['Communication support', 'Assistive device']; }
  for(const field of ['assessment_date','collection_date']) if(record[field] && record[field]!==noValue) record[field]=date;
  if(!anchor) {
    if(random()<config.independentRestrictionProbability) record.independent_medical_assessment='not_satisfied';
    if(caseId==='PRIOR' && record.time_since_treatment_years!==noValue) record.time_since_treatment_years=2+Math.floor(random()*18);
    if(caseId==='RENAL' && record.renal_value!==null) record.renal_value=Math.round((record.renal_value+(random()-.5)*8)*10)/10;
    if(caseId==='COGNITIVE' && record.communication_support_needs && record.communication_support_needs!=='none') record.procedure_support_plan=random()<.5?'Documented plain-language and communication support':'Documented scheduling and procedure assistance';
  }
  record.factProvenance = Object.fromEntries(Object.keys(values).filter(key => !['protocolContext', 'originalScreening'].includes(key)).map(field => [field, {
    kind: ['trial_pregnancy_policy','configured_protocol_limit','configured_proposed_limit'].includes(field) ? 'Hypothetical protocol setting' : field==='drug_elimination_evidence' ? 'Existing fictional SYN-217 evidence reference' : assessmentFields.has(field) ? 'Explicit fictional clinical assessment' : 'Fictional patient observation',
    date, assessor: assessmentFields.has(field) ? 'Authored demo assessment; no real clinician approval' : 'Synthetic record',
  }]));
  record.factProvenance.age_years={kind:'Fictional patient observation',date,assessor:'Synthetic record'};
  if (caseId==='RENAL') record.units={age_years:'years',ecog:'ECOG grade'};
  record.demographics = Object.fromEntries(['sex', 'gender', 'race', 'ethnicity', 'site'].map(field => [field, { status: 'not_collected', value: null }]));
  return record;
}
export function generateCasePack(caseId, overrides = {}) {
  if (!casePackDefinitions[caseId]) throw new TypeError('Unknown investigation case pack.');
  const config = { ...investigationSettings, ...overrides };
  if (!Number.isInteger(config.seed)) throw new TypeError('A fixed integer seed is required.');
  for (const field of ['unassessedInteractionProbability','independentRestrictionProbability']) if (!Number.isFinite(config[field]) || config[field] < 0 || config[field] > 1) throw new TypeError('Authored generation probabilities must be between zero and one.');
  if (!Number.isInteger(config.variantsPerPack) || config.variantsPerPack < 0 || config.variantsPerPack > 10000) throw new RangeError('Invalid variant count.');
  const date = new Date(`${config.asOfDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(config.asOfDate) || !Number.isFinite(+date) || date.toISOString().slice(0, 10) !== config.asOfDate) throw new TypeError('A valid fixed as-of date is required.');
  const salt = [...caseId].reduce((sum, c) => Math.imul(sum, 31) + c.charCodeAt(0), 0);
  const random = stream(config.seed ^ salt);
  const records = 'ABCDEF'.split('').map((letter, index) => makeRecord(caseId, letter, index, config, random, true));
  for (let i = 0; i < config.variantsPerPack; i++) records.push(makeRecord(caseId, 'ABCDEF'[Math.floor(random() * 6)], i + 6, config, random, false));
  return records;
}
