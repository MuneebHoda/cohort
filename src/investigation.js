import { evaluatePatient } from './cohort.js';
import { clinicalConfig } from './clinical-fixture.js';
import { casePackDefinitions, routeDefinitions, investigationSettings } from './case-packs.js';

const assessed = value => value === 'satisfied' || value === 'none_identified' ? true : value === 'not_satisfied' || value === 'relevant_concern' ? false : null;
const check = (id, title, field, text) => ({ id, title, field, text });
const booleanRule = (caseId, c) => ({ id: `${caseId}-${c.id}-v1`, version: '1.0.0', criterionId: c.id, field: c.field, operator: 'equals', value: true, allowedValues: [true, false], sourceIds: [] });
const policyAllows = record => record.protocolContext.policy === 'individualized' ? true : record.protocolContext.policy === 'blanket' ? false : null;
const validDate = (value, asOf) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value && value <= asOf;
function assessmentConfig(record, criteria) {
  return {
    protocol: { id: record.protocolContext.id, version: record.protocolContext.version, criteria: criteria.map(c => ({ id: c.id, title: c.title, fixed: true, kind: 'inclusion', ruleId: `${record.caseId}-${c.id}-v1`, original: c.text, sourceIds: [] })) },
    rules: criteria.map(c => booleanRule(record.caseId, c)), scenarios: [], evidence: [],
  };
}
function medicalInputs(record) {
  const inputs = { ...record, independent_ok: assessed(record.independent_medical_assessment) };
  const notApplicable=[];
  const criteria = [check('INDEPENDENT', 'Independent medical requirements', 'independent_ok', 'The explicitly authored independent medical assessment must be satisfied.')];
  if (record.caseId === 'HIV') {
    const absent = record.hiv_status === 'negative', present = record.hiv_status === 'positive';
    if(absent)notApplicable.push('HIV_POLICY','VIRAL','CD4',...(record.interaction_assessment==='not_applicable'?['INTERACTION']:[]));
    inputs.hiv_policy_ok = absent ? true : present ? policyAllows(record) : null;
    inputs.viral_ok = absent ? true : present && assessed(record.viral_load_protocol_assessment) === false ? false : present && record.viral_load_status === 'suppression_documented' && validDate(record.viral_load_collection_date,record.provenance.asOfDate) ? assessed(record.viral_load_protocol_assessment) : null;
    inputs.cd4_ok = absent ? true : present ? assessed(record.cd4_protocol_assessment) : null;
    inputs.interaction_ok = record.interaction_assessment === 'relevant_concern' ? false : absent && record.interaction_assessment === 'not_applicable' ? true : Array.isArray(record.current_antiretroviral_medications) && record.current_antiretroviral_medications.length ? assessed(record.interaction_assessment) : null;
    criteria.push(check('HIV_POLICY', 'Current HIV protocol wording', 'hiv_policy_ok', record.protocolContext.wording),
      check('VIRAL', 'Protocol-specific viral assessment', 'viral_ok', 'An explicit fictional protocol-specific viral assessment and dated observation are required when HIV is present; no viral-load cutoff is inferred.'),
      check('CD4', 'Protocol-specific CD4 assessment', 'cd4_ok', 'Use a documented fictional protocol assessment; a measured CD4 value alone is insufficient because no acceptance threshold is supplied.'),
      check('INTERACTION', 'Actual medication interaction review', 'interaction_ok', 'An explicit assessment of the recorded medication context must identify no relevant concern. Not mentioned or not assessed is unknown.'));
  }
  if (record.caseId === 'BRAIN') {
    const absent=record.brain_metastases_present===false,present=record.brain_metastases_present===true;
    if(absent)notApplicable.push('BRAIN_POLICY','BRAIN_CONTEXT','NEURO');
    inputs.brain_policy_ok=absent?true:present?policyAllows(record):null;
    inputs.brain_context_ok=absent?true:!present?null:record.current_stability_assessment==='stable'||record.prior_treatment_status==='treated'&&assessed(record.treatment_protocol_assessment)===true?true:record.current_stability_assessment==='active'&&record.drug_specific_neurological_concern==='relevant_concern'?false:null;
    inputs.neuro_ok=record.drug_specific_neurological_concern==='relevant_concern'?false:absent?true:present&&typeof record.neurological_symptoms==='boolean'&&validDate(record.assessment_date,record.provenance.asOfDate)?assessed(record.drug_specific_neurological_concern):null;
    criteria.push(check('BRAIN_POLICY','Current brain-metastasis protocol wording','brain_policy_ok',record.protocolContext.wording),check('BRAIN_CONTEXT','Documented treatment or stability assessment','brain_context_ok','A separately documented accepted treatment assessment OR stable assessment satisfies this authored snapshot; no universal treatment prerequisite or stability period is invented.'),check('NEURO','Relevant neurological concern review','neuro_ok','Use the explicit fictional assessment of recorded symptoms and trial-specific concerns.'));
  }
  if (record.caseId === 'OLDER') {
    const absent=record.cardiac_history===false&&record.current_cardiac_status==='none';
    if(absent)notApplicable.push('OLDER_POLICY','CONDITION','DRUG_CONCERN');
    inputs.older_policy_ok=absent?true:record.cardiac_history===true||record.current_cardiac_status==='active'?policyAllows(record):null;
    inputs.condition_ok=absent?true:record.condition_severity_assessment==='controlled'&&record.current_cardiac_status==='historical_controlled'?true:record.condition_severity_assessment==='restriction_applies'?false:null;
    inputs.concern_ok=record.drug_specific_concern==='relevant_concern'?false:absent?true:assessed(record.drug_specific_concern);
    inputs.function_ok=assessed(record.functional_assessment);
    criteria.push(check('OLDER_POLICY','Historical versus active condition wording','older_policy_ok',record.protocolContext.wording),check('CONDITION','Current condition assessment','condition_ok','Use the authored current activity and severity assessment; neither age nor a historical code establishes current severity.'),check('DRUG_CONCERN','Explicit drug/protocol concern assessment','concern_ok','Retain the documented relevant concern; no numerical cardiac threshold is inferred.'),check('FUNCTION','Independent functional requirement','function_ok','The separately authored functional assessment must satisfy this snapshot.'));
  }
  if (record.caseId === 'PRIOR') {
    const absent=record.prior_cancer_history===false&&record.current_cancer_activity==='none',present=record.prior_cancer_history===true||record.current_cancer_activity==='active';
    if(absent)notApplicable.push('PRIOR_POLICY','CANCER_CONTEXT','ENDPOINT','SAFETY','TREATMENT');
    inputs.prior_policy_ok=absent?true:present?policyAllows(record):null;
    inputs.cancer_context_ok=absent?true:present&&(['no_recurrence','documented_active_disease'].includes(record.recurrence_status)||record.prior_cancer_history===false&&record.recurrence_status==='not_applicable')&&['not_active','active'].includes(record.current_cancer_activity)?true:null;
    inputs.endpoint_ok=assessed(record.endpoint_interference_assessment)===false?false:absent?true:assessed(record.endpoint_interference_assessment);
    inputs.safety_ok=assessed(record.safety_interference_assessment)===false?false:absent?true:assessed(record.safety_interference_assessment);
    inputs.treatment_ok=assessed(record.treatment_interaction_assessment)===false?false:absent?true:assessed(record.treatment_interaction_assessment);
    criteria.push(check('PRIOR_POLICY','Current prior/concurrent cancer wording','prior_policy_ok',record.protocolContext.wording),check('CANCER_CONTEXT','Current activity and recurrence documentation','cancer_context_ok','Activity is documented context, not a universal exclusion. Ten years is a vignette observation, not a waiting-period rule.'),check('ENDPOINT','Endpoint-interference assessment','endpoint_ok','Use the explicit endpoint-specific fictional assessment.'),check('SAFETY','Safety-interference assessment','safety_ok','Keep any explicitly assessed relevant safety concern.'),check('TREATMENT','Other-treatment interaction assessment','treatment_ok','A treatment label alone does not establish whether it interferes; actual assessment is required.'));
  }
  if (record.caseId === 'PREG') {
    if(['not_pregnant','not_applicable'].includes(record.pregnancy_status))notApplicable.push('PREG_POLICY','PREG_CONCERN');
    inputs.pregnancy_policy_ok = record.pregnancy_status === 'not_pregnant' || record.pregnancy_status === 'not_applicable' ? true : record.pregnancy_status === 'pregnant' ? false : null;
    criteria.push(check('PREG_POLICY','Current pregnancy policy','pregnancy_policy_ok','This authored protocol excludes pregnancy. No pregnancy inclusion scenario is configured.'));
    if (record.protocolContext.pregnancyConcernRestriction === true) { inputs.drug_concern_ok=record.pregnancy_status==='not_pregnant'?true:record.documented_drug_specific_concern==='present_in_authored_protocol'?false:null; criteria.push(check('PREG_CONCERN','Explicit pregnancy-related protocol concern','drug_concern_ok','The explicitly documented concern in this fictional protocol remains a restriction.')); }
  }
  let config=assessmentConfig(record,criteria);
  if (record.caseId === 'RENAL') {
    if(record.protocolContext.id!==clinicalConfig.protocol.id) throw new TypeError('Existing SYN-217 renal thresholds require the matching fictional protocol context.');
    const metric=record.renal_metric_type==='egfr'&&record.renal_unit===clinicalConfig.units.egfr_ml_min_1_73m2&&typeof record.laboratory_method==='string'&&record.laboratory_method.trim();
    inputs.egfr_ml_min_1_73m2=metric&&typeof record.renal_value==='number'&&Number.isFinite(record.renal_value)?record.renal_value:null;
    inputs.renal_metric_ok=metric?true:null;
    inputs.currency_ok=validDate(record.collection_date,record.provenance.asOfDate)&&record.measurement_currency_assessment==='current_for_authored_snapshot'?true:null;
    inputs.units={...record.units,egfr_ml_min_1_73m2:clinicalConfig.units.egfr_ml_min_1_73m2};
    criteria.push(check('RENAL_METRIC','Protocol-required renal metric and units','renal_metric_ok','Require the configured eGFR metric, method and units. Creatinine clearance is never converted or substituted.'),check('CURRENCY','Documented measurement-currency assessment','currency_ok','Require an explicit dated fictional currency assessment. No lab-expiry interval is invented.'));
    const extra=assessmentConfig(record,criteria);
    config=structuredClone(clinicalConfig);config.protocol.criteria.push(...extra.protocol.criteria);config.rules.push(...extra.rules);
  }
  return { inputs, config, notApplicable };
}
function participationReadiness(record) {
  const cognitive=record.caseId==='COGNITIVE';
  if(record.caseId!=='ACCESS'&&!cognitive)return {status:'not_assessed',components:[],reasons:['Participation readiness beyond the medical checks is not assessed for this case.']};
  const needs=cognitive?record.communication_support_needs:record.functional_support_needs;
  const noSupport=needs==='none',task=assessed(record.task_specific_ability_assessment);
  const availability=cognitive?record.support_availability:record.accommodation_availability;
  const confirmation=cognitive?record.support_confirmation:record.availability_confirmation;
  const support=noSupport?'not_applicable':availability==='confirmed'&&typeof confirmation==='string'&&confirmation.trim()?'confirmed':availability==='proposed'?'pending':'unknown';
  const components=[{label:'Task-specific assessment',status:task===true?'satisfied':task===false?'not_satisfied':'unknown'},{label:'Practical support arrangement',status:support}];
  const reasons=[];
  if(task!==true||needs===null||needs===undefined)reasons.push('The specific task and individually assessed support needs require review; diagnosis does not establish ability or inability.');
  if(!['confirmed','not_applicable'].includes(support))reasons.push('An actual support arrangement is not confirmed by documentation.');
  if(cognitive){
    const consent=record.consent_process_assessment_status==='completed_fictional_review',method=record.study_method_acceptability_review==='accepted_fictional_review';
    components.push({label:'Separate consent-process review',status:consent?'completed_fictional_assessment':'pending'},{label:'Separate assessment-method review',status:method?'accepted_fictional_assessment':'pending'});
    if(!consent)reasons.push('Practical assistance does not resolve the separate consent-process review. No legally sufficient process is inferred.');
    if(!method)reasons.push('Assisted or proxy questionnaire methods require separate scientific acceptability review.');
  }else{
    const procedure=assessed(record.procedure_validity_review);components.push({label:'Procedure acceptability',status:procedure===true?'satisfied':procedure===false?'not_satisfied':'pending'});
    if(procedure!==true)reasons.push('The proposed procedure modification has not been accepted under the authored assessment.');
  }
  return {status:task===null||needs===null||needs===undefined?'unknown':task===false?'not_ready':reasons.length?'pending':'ready_for_configured_tasks',components,reasons:reasons.length?reasons:['The configured task and support reviews are documented in this fictional record. This is not enrollment approval.']};
}
function investigate(record,current,proposed) {
  const pack=casePackDefinitions[record.caseId],routes=[],findings=[];
  const add=(route,reason)=>{if(!routes.includes(route))routes.push(route);findings.push({route,reason});};
  const targetIds=['HIV_POLICY','BRAIN_POLICY','OLDER_POLICY','PRIOR_POLICY','PREG_POLICY','RENAL'];
  const missing=current.evaluations.filter(c=>c.result==='UNKNOWN');
  const independentFails=current.evaluations.filter(c=>c.result==='FAIL'&&!targetIds.includes(c.criterionId));
  const metricDiscrepancy=record.caseId==='RENAL'&&record.originalScreening.metricUsed&&record.originalScreening.metricUsed!=='egfr';
  const screenMismatch=Boolean(metricDiscrepancy||record.originalScreening.domain==='medical'&&(record.originalScreening.decision==='rejected'&&current.status==='eligible'||record.originalScreening.decision==='accepted'&&current.status==='excluded'));
  const renalRetained=record.caseId==='RENAL'&&proposed?.evaluations.find(c=>c.criterionId==='RENAL')?.result==='FAIL';
  if(screenMismatch)add('SCREENING_CORRECTION_REVIEW',metricDiscrepancy?'The recorded screen used a different renal metric. Correct comparable data must be obtained or reviewed; current eligibility is still unresolved.':'The original recorded medical screen disagrees with the computed current-protocol result. Review screening interpretation rather than inventing a protocol amendment.');
  if(independentFails.length||renalRetained)add('RETAIN_RESTRICTION',independentFails.map(c=>`${c.title}: ${c.reason}`).join(' ')||(proposed.evaluations.find(c=>c.criterionId==='RENAL').reason));
  if(missing.length)add('NEEDS_INFORMATION',missing.map(c=>`${c.title}: ${c.reason}`).join(' '));
  const target=current.evaluations.find(c=>targetIds.includes(c.criterionId));
  const favorable=current.evaluations.filter(c=>!targetIds.includes(c.criterionId)&&!['INDEPENDENT','FUNCTION'].includes(c.criterionId)).every(c=>c.result==='PASS');
  if(['HIV','BRAIN','OLDER','PRIOR'].includes(record.caseId)&&target?.result==='FAIL'&&favorable)add('PROTOCOL_REVISION_REVIEW',`${pack.reconsideration_basis} The current blanket restriction remains in force. Proposed medical criteria require configuration.`);
  if(record.caseId==='RENAL'&&current.evaluations.find(c=>c.criterionId==='RENAL')?.result==='FAIL'&&proposed?.evaluations.find(c=>c.criterionId==='RENAL')?.result==='PASS')add('PROTOCOL_REVISION_REVIEW','The existing fictional SYN-217 renal scenario addresses this renal criterion only. Independent restrictions and unresolved measurement review remain active.');
  const readiness=participationReadiness(record);
  if(['ACCESS','COGNITIVE'].includes(record.caseId)){
    const needs=record.caseId==='COGNITIVE'?record.communication_support_needs:record.functional_support_needs;
    if(needs!=='none'||readiness.status!=='ready_for_configured_tasks')add('ACCOMMODATION_REVIEW',readiness.reasons.join(' '));
    if(['pending','unknown'].includes(readiness.status))add('NEEDS_INFORMATION','Complete the pending support, task, consent or procedure assessments listed separately under participation readiness.');
  }
  if(record.caseId==='PREG'&&record.pregnancy_status==='pregnant'){
    add('SEPARATE_RESEARCH_PATHWAY','The current pregnancy restriction remains active. General participation rationale identifies a separate evidence-development and oversight question, not inclusion in the existing trial.');
    add('NEEDS_INFORMATION','Drug-specific pregnancy evidence and an independently reviewed research protocol are unavailable.');
  }
  if(!routes.length)add('NO_CASE_SPECIFIC_ACTION','No case-specific discrepancy, review trigger or unresolved assessment was identified under this authored protocol snapshot.');
  const primary=independentFails.length||renalRetained?'RETAIN_RESTRICTION':metricDiscrepancy?'SCREENING_CORRECTION_REVIEW':missing.length||readiness.status==='unknown'?'NEEDS_INFORMATION':screenMismatch?'SCREENING_CORRECTION_REVIEW':record.caseId==='PREG'&&record.pregnancy_status==='pregnant'?'SEPARATE_RESEARCH_PATHWAY':routes[0];
  return {primaryRoute:primary,routes,findings,screeningDiscrepancy:screenMismatch,originalScreening:structuredClone(record.originalScreening),
    currentProtocol:{id:record.protocolContext.id,version:record.protocolContext.version,status:current.status,evaluations:current.evaluations},
    proposedScenario:proposed?{status:proposed.status,available:true,evaluations:proposed.evaluations,gate:proposed.gate}:{status:'REQUIRES_CONFIGURATION',available:false,missingConfiguration:[...pack.missing_configuration]},
    evidenceApplicability:{status:'not_established',sourceId:pack.sourceId,sourceStatus:'supplied secondary case summary; original research note unavailable',unresolved:[...pack.missing_configuration],primaryEvidenceVerified:false},
    readiness,sourceQuestions:[...pack.review_questions]};
}
function summarize(cohort){
  const records=cohort.records,count=predicate=>new Set(records.filter(predicate).map(r=>r.personId)).size;
  return {uniquePatients:count(()=>true),recordedRejections:count(r=>r.originalScreening.decision==='rejected'),screeningDiscrepancies:count(r=>r.investigation.screeningDiscrepancy),
    routes:routeDefinitions.map(([id,label])=>({id,label,count:count(r=>r.investigation.routes.includes(id)),ids:records.filter(r=>r.investigation.routes.includes(id)).map(r=>r.id)}))};
}
function cohort(records,gate){return {records,total:records.length,eligible:records.filter(r=>r.status==='eligible').length,excluded:records.filter(r=>r.status==='excluded').length,indeterminate:records.filter(r=>r.status==='indeterminate').length,newlyEligible:records.filter(r=>r.newlyEligible).length,changed:records.filter(r=>r.newlyEligible).length,statusChanged:records.filter(r=>r.statusChanged).length,gate};}
function explainedEvaluation(result,config,notApplicable) {
  const explain=cohort=>{
    const evaluations=cohort.evaluations.map(c=>{ const rule=config.rules.find(r=>r.id===c.ruleId); if(!rule?.field?.endsWith('_ok'))return c; const definition=config.protocol.criteria.find(d=>d.id===c.criterionId); if(notApplicable.includes(c.criterionId)&&c.result==='PASS')return {...c,applicability:'not_applicable',engineReason:c.reason,reason:`${c.title}: not applicable because the case-specific condition is explicitly absent. No extra assessment is inferred.`}; return {...c,applicability:'assessed_snapshot',engineReason:c.reason,reason:`${c.title}: ${c.result==='PASS'?'the explicitly authored assessment satisfies this snapshot':c.result==='FAIL'?'the current authored requirement is not satisfied':'required input or assessment is unresolved'}. ${definition.original}`}; });
    return {...cohort,evaluations,exclusionReasons:evaluations.filter(c=>c.result==='FAIL').map(c=>c.reason),missingData:evaluations.filter(c=>c.result==='UNKNOWN').map(c=>c.reason)};
  };
  return {...explain(result),original:explain(result.original)};
}
export function evaluateInvestigationPack(patients,caseId,scenarioId='original'){
  const pack=casePackDefinitions[caseId];if(!pack)throw new TypeError('Unknown case pack.');
  if(scenarioId!=='original'&&!(caseId==='RENAL'&&scenarioId==='renal-revision'))throw new TypeError('This case requires configuration before a proposed medical scenario can execute.');
  const seen=new Set(),originals=[],comparisons=[],protocolSnapshots={};
  const records=patients.map(patient=>{
    if(patient.caseId!==caseId||patient.protocolContext?.studyId!==pack.studyId)throw new TypeError('Case and protocol context do not match the selected study.');
    if(!patient.id||!patient.personId||seen.has(patient.id))throw new TypeError('Case records require stable unique IDs and person identities.');seen.add(patient.id);
    const {inputs,config,notApplicable}=medicalInputs(patient),baseline=explainedEvaluation(evaluatePatient(inputs,false,config),config,notApplicable),comparison=caseId==='RENAL'?explainedEvaluation(evaluatePatient(inputs,'renal-revision',config),config,notApplicable):null;
    protocolSnapshots[`${patient.protocolContext.id}@${patient.protocolContext.version}`]={...config.protocol,rules:config.rules,provenance:patient.protocolContext.provenance};
    const evaluated=scenarioId==='renal-revision'?comparison:baseline;
    const investigation=investigate(patient,baseline,comparison);
    const compose=evaluation=>({...patient,...evaluation,currentProtocolEvaluation:baseline.original,investigation,inputProvenance:{synthetic:true,assessedSnapshot:true}});
    originals.push(compose(baseline));if(comparison)comparisons.push(compose(comparison));return compose(evaluated);
  });
  const baseGate={requested:false,active:false,status:'current-protocol',scenarioVersion:null,reasons:['Current authored protocol snapshot. Investigation recommendations do not modify medical eligibility.']};
  const original=cohort(originals,originals[0]?.gate||baseGate),current=cohort(records,records[0]?.gate||baseGate);
  const proposed=caseId==='RENAL'?{...cohort(comparisons,comparisons[0]?.gate||baseGate),available:true}:{available:false,status:'REQUIRES_CONFIGURATION',records:[],total:records.length,eligible:0,excluded:0,indeterminate:0,newlyEligible:0,gate:{...baseGate,reasons:[...pack.missing_configuration]}};
  const profiles=Object.fromEntries(records.map(r=>[r.id,{score:null,components:[],dimensions:[],unrankedReason:'Not configured for this case',nextSteps:r.investigation.findings.map(f=>({title:routeDefinitions.find(([id])=>id===f.route)[1],detail:f.reason,sourceIds:[pack.sourceId]}))}]));
  return {casePack:pack,protocolSnapshots,original,current,proposed,profiles,ranked:[],investigationSummary:summarize(current),configVersions:{protocol:caseId==='RENAL'?clinicalConfig.protocol.version:'record-specific authored snapshots v1.0.0',scenarios:caseId==='RENAL'?{'renal-revision':'1.0.0'}:{},rules:'case-specific assessments v1.0.0',evidence:{[pack.sourceId]:'supplied-case-spec-1.0'},scoring:'not-configured',generator:investigationSettings.version,adapter:'case-specific-assessed-facts-v1'}};
}
