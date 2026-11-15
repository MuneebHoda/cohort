import { clinicalConfig } from './clinical-fixture.js';
import { sources } from './data.js';
import { investigationSources } from './case-packs.js';
import { guidanceSources, guidanceTopics, guidancePassages } from './guidance-sources.js';

export const medicalLabels = { eligible: 'Meets modeled rules', excluded: 'Excluded', indeterminate: 'Indeterminate' };
export const humanField = field => ({egfr_ml_min_1_73m2:'eGFR · mL/min/1.73 m²',ecog:'ECOG grade',strong_cyp3a_inhibitor:'Strong CYP3A inhibitor',cd4_value:'CD4 value',renal_stable:'Renal stability flag'}[field] || field.replaceAll('_', ' ').replace(/^./, char => char.toUpperCase()));
export const factText = value => value === null || value === undefined ? 'Unknown / not supplied' : value === true ? 'Yes' : value === false ? 'No' : Array.isArray(value) ? value.length ? value.join(', ') : 'None recorded' : typeof value === 'object' ? JSON.stringify(value) : String(value).replaceAll('_', ' ');
const routes = {
  SCREENING_CORRECTION_REVIEW: ['Screening discrepancy requires review.', 'Screening correction review'],
  PROTOCOL_REVISION_REVIEW: ['Protocol revision deserves consideration.', 'Protocol revision review'],
  RETAIN_RESTRICTION: ['Current restriction remains applicable.', 'Retain restriction'],
  NEEDS_INFORMATION: ['Required information is missing.', 'Needs information'],
  ACCOMMODATION_REVIEW: ['Accommodation assessment is needed.', 'Accommodation review'],
  SEPARATE_RESEARCH_PATHWAY: ['A separate research pathway should be considered.', 'Separate research pathway'],
  NO_CASE_SPECIFIC_ACTION: ['Modeled checks pass; full review remains.', 'Full-protocol review'],
};
const caseFields = {
  INDEPENDENT: ['independent_medical_assessment'], HIV_POLICY: ['hiv_status'], VIRAL: ['viral_load_status', 'viral_load_collection_date', 'viral_load_protocol_assessment'], CD4: ['cd4_value', 'cd4_unit', 'cd4_protocol_assessment'], INTERACTION: ['current_antiretroviral_medications', 'interaction_assessment'],
  BRAIN_POLICY: ['brain_metastases_present'], BRAIN_CONTEXT: ['prior_treatment_status', 'treatment_protocol_assessment', 'current_stability_assessment'], NEURO: ['neurological_symptoms', 'drug_specific_neurological_concern', 'assessment_date'],
  OLDER_POLICY: ['cardiac_history', 'current_cardiac_status'], CONDITION: ['current_cardiac_status', 'condition_severity_assessment'], DRUG_CONCERN: ['drug_specific_concern'], FUNCTION: ['functional_assessment'],
  PRIOR_POLICY: ['prior_cancer_history', 'current_cancer_activity'], CANCER_CONTEXT: ['recurrence_status', 'current_cancer_activity'], ENDPOINT: ['endpoint_interference_assessment'], SAFETY: ['safety_interference_assessment'], TREATMENT: ['other_cancer_treatment', 'treatment_interaction_assessment'],
  PREG_POLICY: ['pregnancy_status', 'trial_pregnancy_policy'], PREG_CONCERN: ['documented_drug_specific_concern'], RENAL_METRIC: ['renal_metric_type', 'renal_value', 'renal_unit', 'laboratory_method'], CURRENCY: ['collection_date', 'measurement_currency_assessment'],
};
const fieldRef = field => ({ kind: 'field', field });
const ruleRef = criterionId => ({ kind: 'criterion', criterionId });
const sourceRef = sourceId => ({ kind: 'source', sourceId });

export function evidenceRegistry(run) {
  const relevant = run.casePack ? [...investigationSources.filter(source => source.id === run.casePack.sourceId || source.id === 'RESEARCH-NOTE'), ...(run.casePack.id === 'RENAL' ? sources : [])] : sources;
  return [...new Map([...relevant, ...guidanceSources.map(source=>({...source,passages:guidancePassages.filter(passage=>passage.sourceId===source.id)}))].map(source => [source.id, { verified: false, ...source }])).values()];
}
function derivedRoute(record, proposal) {
  if (record.investigation) return record.investigation.primaryRoute;
  if (record.evaluations.some(item => item.result === 'FAIL' && item.fixed)) return 'RETAIN_RESTRICTION';
  if (record.evaluations.some(item => item.result === 'UNKNOWN')) return 'NEEDS_INFORMATION';
  if (record.evaluations.some(item => item.result === 'FAIL') || record.newlyEligible || proposal?.newlyEligible) return 'PROTOCOL_REVISION_REVIEW';
  return 'NO_CASE_SPECIFIC_ACTION';
}
function buildFacts(run, record, evaluations) {
  const fields = record.factProvenance ? Object.keys(record.factProvenance) : [...new Set(evaluations.flatMap(item => Object.keys(item.value || {})).concat(['renal_stable']))];
  return fields.filter(field => Object.hasOwn(record, field)).map(field => ({ field, label: humanField(field), value: structuredClone(record[field]),
    provenance: record.factProvenance?.[field]?.kind || (field === 'renal_stable' && record.inputProvenance?.renalStabilityAssumed ? 'Explicit synthetic adapter assumption; absent from source record' : 'Loaded synthetic patient record'),
    date: field === 'viral_load_status' ? record.viral_load_collection_date || null : field === 'renal_value' ? record.collection_date || null : record.factProvenance?.[field]?.date || null,
    collectionStatus: record.collection_status?.[field] || null,
  }));
}
function actionFor(route, failed, unknown, record, protocol) {
  const focus = failed.find(item => !item.criterionId.endsWith('_POLICY')) || failed[0];
  const actions = {
    SCREENING_CORRECTION_REVIEW: ['Reconcile the recorded screen with this protocol snapshot.', 'Screening reviewer', 'Original screening reason, versioned protocol and comparable patient observations', 'Whether the screen was interpreted correctly', 'A protocol amendment or other independent restrictions'],
    PROTOCOL_REVISION_REVIEW: ['Review the proposed rule and define any missing amendment parameters.', 'Clinical reviewer / protocol team', 'Drug-specific evidence, subgroup applicability and explicit proposed criteria', 'Whether a protocol change can be justified', 'Enrollment authorization or unassessed medical requirements'],
    RETAIN_RESTRICTION: [`Review the retained ${focus?.title || 'medical'} restriction.`, 'Clinical reviewer', 'The failed rule, its patient observations and relevant drug-specific evidence', 'The rationale and applicability of the retained restriction', 'Other failures, missing inputs or automatic inclusion'],
    NEEDS_INFORMATION: [`Obtain documented ${unknown.map(item => item.title).join(', ') || 'participation assessments'}.`, 'Clinical reviewer / study coordinator', 'Source observations, collection details and a documented assessment', 'The listed unresolved checks after reevaluation', 'Any independent failed criterion'],
    ACCOMMODATION_REVIEW: ['Confirm the task-specific support and outstanding procedure reviews.', 'Study coordinator / consent and methods reviewers', 'Actual support confirmation and separate consent or method assessments', 'Participation readiness for the configured tasks', 'Medical eligibility or legally sufficient consent by inference'],
    SEPARATE_RESEARCH_PATHWAY: ['Request a separately reviewed research pathway and drug-specific evidence.', 'Clinical and research-oversight reviewers', 'Pregnancy-specific evidence and an independently configured research protocol', 'What further research and oversight are appropriate', 'Inclusion in this existing trial'],
    NO_CASE_SPECIFIC_ACTION: ['Review full-protocol scope and evidence applicability.', 'Clinical reviewer', 'Complete protocol and source documentation', 'Requirements outside the modeled checks', 'Automatic enrollment'],
  };
  const [action, role, requires, resolves, doesNotResolve] = actions[route];
  return { action, role, requires, resolves, doesNotResolve, refs: [...failed.map(item => ruleRef(item.criterionId)), ...unknown.map(item => ruleRef(item.criterionId)), { kind: 'protocol', protocolId: protocol.id }] };
}

export function buildDecisionBrief(run, record) {
  const original = run.original.records.find(item => item.id === record.id);
  const proposal = run.proposed.records.find(item => item.id === record.id);
  const current = record.currentProtocolEvaluation || original;
  const evaluations = record.evaluations;
  const failed = evaluations.filter(item => item.result === 'FAIL'), unknown = evaluations.filter(item => item.result === 'UNKNOWN');
  const protocol = record.protocolContext || { id: clinicalConfig.protocol.id, version: clinicalConfig.protocol.version, wording: 'Existing fictional SYN-217 protocol.' };
  const route = derivedRoute(record, proposal), facts = buildFacts(run, record, evaluations);
  const criteria = evaluations.map(item => ({ ...item, fields: (caseFields[item.criterionId] || (record.caseId === 'RENAL' && item.criterionId === 'RENAL' ? ['renal_value', 'renal_metric_type', 'renal_stable'] : Object.keys(item.value || {}))).filter(field => facts.some(fact => fact.field === field)) }));
  const blockers = [...failed.map(item => ({ kind: 'failed_criterion', text: item.reason, refs: [ruleRef(item.criterionId)] })), ...unknown.map(item => ({ kind: 'unknown_criterion', text: item.reason, refs: [ruleRef(item.criterionId)] }))];
  if (run.current.gate.requested && !run.current.gate.active) for (const text of run.current.gate.reasons) blockers.push({kind:'scenario_gate',text,refs:[{kind:'scenario',scenarioId:run.scenarioId}]});
  const readiness = record.investigation?.readiness;
  if (readiness && !['not_assessed', 'ready_for_configured_tasks'].includes(readiness.status)) for (const reason of readiness.reasons) blockers.push({ kind: 'participation', text: reason, refs: [{ kind: 'readiness', patientId: record.id }] });
  const missingConfiguration = record.investigation?.proposedScenario.available === false ? record.investigation.proposedScenario.missingConfiguration : [];
  for (const text of missingConfiguration) blockers.push({ kind: 'configuration', text, refs: [{ kind: 'configuration', caseId: record.caseId }] });
  const applicableIds = new Set(evaluations.flatMap(item => item.sourceIds));
  const supporting = [], retaining = [], unresolved = [];
  if (run.casePack) supporting.push({ sourceId: run.casePack.sourceId, kind: 'Secondary summary', use: 'Supports these investigation questions; does not establish drug-specific safety.', refs: [sourceRef(run.casePack.sourceId)] });
  supporting.push({ sourceId: 'FDA-2025-REP', kind: 'General FDA guidance', use: 'Context for reviewing justified exclusions; not support for a numerical cutoff.', passageId: 'rationale', refs: [sourceRef('FDA-2025-REP')] });
  for (const id of applicableIds) {
    const item = { sourceId: id, kind: 'Fictional drug evidence', use: 'Authored demonstration evidence; clinical applicability is unresolved.', refs: [sourceRef(id)] };
    if (id === 'SYN-DDI-03' && failed.some(criterion => criterion.criterionId === 'DDI')) retaining.push({ ...item, use: 'The fictional interaction finding supports retaining this modeled restriction.' });
    else if (id.startsWith('SYN-PK') && proposal?.evaluations.some(criterion => criterion.criterionId === 'RENAL' && criterion.result === 'PASS')) supporting.push(item);
    else unresolved.push(item);
  }
  for (const item of failed) retaining.push({ kind: 'Protocol requirement', criterionId: item.criterionId, use: item.reason, refs: [ruleRef(item.criterionId)] });
  for (const criterion of criteria) {
    const assessments = facts.filter(fact=>criterion.fields.includes(fact.field)&&fact.provenance.toLowerCase().includes('assessment'));
    if (!assessments.length || criterion.result === 'UNKNOWN' || criterion.applicability === 'not_applicable') continue;
    const item = {kind:'Explicit fictional clinical assessment',use:assessments.map(fact=>`${fact.label}: ${factText(fact.value)}${fact.date?` (${fact.date})`:''}`).join('; '),refs:[ruleRef(criterion.criterionId),...assessments.map(fact=>fieldRef(fact.field))]};
    if(criterion.result==='FAIL')retaining.push(item);else if(criterion.criterionId!=='INDEPENDENT')supporting.push(item);
  }
  const renalValue = record.caseId === 'RENAL' ? record.renal_metric_type === 'egfr' ? record.renal_value : null : !run.casePack ? record.egfr_ml_min_1_73m2 : null;
  if (Number.isFinite(renalValue) && renalValue >= 0 && renalValue < clinicalConfig.thresholds.renalProposedMin && evaluations.find(item=>item.criterionId==='RENAL')?.result !== 'UNKNOWN') {
    const text = `Recorded eGFR ${renalValue} is below the configured renal-revision range. The fictional renal packet supplies no support for this lower range.`;
    const refs = [fieldRef(record.caseId==='RENAL'?'renal_value':'egfr_ml_min_1_73m2'),sourceRef('SYN-PK-02')];
    blockers.push({kind:'evidence_applicability',text,refs});unresolved.push({sourceId:'SYN-PK-02',kind:'Outside supplied evidence range',use:text,refs});
  }
  if(run.current.gate.requested&&!run.current.gate.active)unresolved.push({kind:'Scenario evidence gate',use:run.current.gate.reasons.join(' '),refs:[{kind:'scenario',scenarioId:run.scenarioId}]});
  if (run.casePack) unresolved.push({ sourceId: 'RESEARCH-NOTE', kind: 'Unavailable secondary note', use: 'Original text and bibliography are unavailable; no passage is reconstructed.', refs: [sourceRef('RESEARCH-NOTE')] });
  unresolved.push({ kind: 'Applicability gap', use: run.casePack ? 'No study-specific primary evidence review has been recorded for these authored assessments.' : 'Fictional evidence and a stability flag do not establish patient-level applicability or longitudinal stability.', refs: [{ kind: 'applicability', patientId: record.id }] });
  const action = actionFor(route, failed, unknown, record, protocol);
  const [conclusion, recommendation] = routes[route];
  const reason = route === 'SCREENING_CORRECTION_REVIEW' ? (record.originalScreening?.metricUsed ? 'The recorded screen used a different renal metric; comparable protocol data remain unresolved.' : 'The recorded medical screen disagrees with the result under the applicable protocol snapshot.') : route === 'ACCOMMODATION_REVIEW' ? `Medical result: ${medicalLabels[record.status]}; participation readiness: ${factText(readiness.status)}.` : route === 'SEPARATE_RESEARCH_PATHWAY' ? 'Pregnancy remains excluded by the current protocol; a research referral does not change that result.' : unknown.length && route === 'NEEDS_INFORMATION' ? `${unknown.map(item => item.title).join(', ')} is unresolved${failed.length ? `; ${failed.length} independent exclusion${failed.length === 1 ? '' : 's'} still apply` : ''}.` : failed.length ? `${(failed.find(item => !item.criterionId.endsWith('_POLICY')) || failed[0]).title} fails under ${protocol.id} v${protocol.version}.` : record.newlyEligible ? 'The active renal revision resolves the original renal failure; all other modeled checks pass.' : 'The configured checks pass; evidence applicability and full-protocol review remain separate.';
  const favorable = criteria.filter(item => item.result === 'PASS' && item.applicability !== 'not_applicable' && !item.criterionId.endsWith('_POLICY') && item.criterionId !== 'ADULT' && item.criterionId !== 'INDEPENDENT');
  const renalComparison = original.evaluations.some(item=>item.criterionId==='RENAL'&&item.result==='FAIL') && proposal?.evaluations.some(item=>item.criterionId==='RENAL'&&item.result==='PASS');
  const relevantFact = renalComparison ? facts.find(fact=>fact.field==='renal_value'||fact.field==='egfr_ml_min_1_73m2') : favorable.flatMap(item => item.fields).map(field => facts.find(fact => fact.field === field)).find(fact => fact && fact.value !== null && fact.value !== 'not_applicable');
  const reconsider = renalComparison && relevantFact ? `${relevantFact.label}: ${factText(relevantFact.value)}${relevantFact.date ? ` (${relevantFact.date})` : ''}. The predefined renal comparison passes this check; other restrictions remain independent.` : relevantFact ? `${relevantFact.label}: ${factText(relevantFact.value)}${relevantFact.date ? ` (${relevantFact.date})` : ''}. This documented input supports review, not a rule override.` : route === 'ACCOMMODATION_REVIEW' ? `Support status: ${factText(record.accommodation_availability ?? record.support_availability)}. Confirmed and proposed arrangements remain distinct.` : run.casePack ? 'The supplied case passage identifies a review question; patient-specific drug evidence remains unresolved.' : 'Only the predefined renal comparison may replace its configured rule; other restrictions remain active.';
  const remaining = failed.length || unknown.length ? `${failed.length} failed and ${unknown.length} unresolved medical checks remain visible. ${missingConfiguration.length ? 'Proposed parameters also require configuration.' : 'A favorable review finding cannot cancel these checks.'}` : readiness && readiness.status !== 'not_assessed' ? `Medical matching is distinct from ${factText(readiness.status)} participation readiness; confirm every required support, consent and method review.` : 'Evidence applicability and the unmodeled full protocol still require documented review before inclusion can be considered.';
  const counterfactual = run.proposed.available === false ? `No proposed scenario is configured. ${unknown.length ? 'Document missing inputs and reevaluate; ' : ''}current restrictions remain until an explicitly reviewed protocol or data change is modeled.` : `The predefined renal comparison yields ${medicalLabels[proposal.status].toLowerCase()}. ${proposal.evaluations.filter(item => item.result === 'FAIL').length} failures and ${proposal.evaluations.filter(item => item.result === 'UNKNOWN').length} unknowns remain; changing the renal rule alone does not resolve them.`;
  const sections = [
    { id: 'original', title: 'Why the original decision was made', summary: record.originalScreening ? `The recorded ${record.originalScreening.domain} screen ${record.originalScreening.decision} this patient. Compare its exact wording with the evaluated rules below.` : `No original screener statement was supplied. The original engine result is ${medicalLabels[original.status].toLowerCase()}, with its own recorded criterion reasons.`, refs: record.originalScreening ? [{ kind: 'screening', field: 'originalScreening.reason' }] : original.evaluations.map(item => ruleRef(item.criterionId)) },
    { id: 'reconsideration', title: 'Why reconsideration may be warranted', summary: reconsider, refs: [...(relevantFact ? [fieldRef(relevantFact.field)] : []), ...supporting.flatMap(item => item.refs)] },
    { id: 'limits', title: 'What still limits consideration', summary: remaining, refs: blockers.flatMap(item => item.refs) },
    { id: 'next', title: 'What needs to happen next', summary: `${action.role}: ${action.action} This resolves ${action.resolves.toLowerCase()}, not ${action.doesNotResolve.toLowerCase()}.`, refs: action.refs },
    { id: 'change', title: 'How the result could change', summary: counterfactual, refs: [{ kind: 'scenario', scenarioId: run.proposed.available === false ? null : 'renal-revision', configured: run.proposed.available !== false }] },
  ];
  return { id: `${run.id}/${record.id}/brief-v1`, version: '1.0.0', patientId: record.id, runId: run.id, studyId: run.studyId, datasetId: run.dataset.id, datasetVersion: run.datasetVersion, protocol, scenarioId: run.scenarioId, versions: run.configVersions,
    recordedScreening: record.originalScreening ? structuredClone(record.originalScreening) : null, originalStatus: original.status, currentProtocolStatus: current.status, activeStatus: record.status,
    proposed: proposal ? { available: true, status: proposal.status, active: run.current.gate.active, evaluations: proposal.evaluations } : { available: false, status: 'REQUIRES_CONFIGURATION' },
    route, conclusion, recommendation, reason, sections, facts, criteria, currentProtocolCriteria: current.evaluations, originalCriteria: original.evaluations, blockers, evidence: { supporting, retaining, unresolved }, actions: [action], readiness: readiness || null,
  };
}
export function attachDecisionBriefs(run) {
  run.configVersions = {...run.configVersions, explanations:'1.0.0', guidanceMapping:'FDA-review-topics-1.0.0'};
  run.evidenceRegistry = evidenceRegistry(run);
  run.explanations = Object.fromEntries(run.current.records.map(record => [record.id, buildDecisionBrief(run, record)]));
  run.guidanceTopics = guidanceTopics;
  return run;
}
