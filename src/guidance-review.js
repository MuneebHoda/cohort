import { guidancePassages, guidanceReviewStatuses } from './guidance-sources.js';

export const guidanceReviewKey = (run, patientId, topicId) => `${run.dataset.id}/${run.id}/${patientId}/${topicId}`;
export function getGuidanceRows(run, state, patientId) {
  const brief = run.explanations[patientId];
  if (!brief) return [];
  const facts = brief.facts, fields = facts.map(fact => fact.field);
  return run.guidanceTopics.map(topic => {
    const passage = guidancePassages.find(item => item.id === topic.passageId);
    const source = run.evidenceRegistry.find(item => item.id === passage?.sourceId);
    let factFields = [], documentation = [], gap = '', documentationStatus = 'Partially documented', initialStatus = 'not_reviewed';
    if (topic.id === 'rationale') {
      documentation = [brief.recordedScreening ? `Exact recorded ${brief.recordedScreening.domain} screening reason retained.` : 'Original engine result retained; original screener statement not supplied.', `${brief.criteria.length} versioned active-scenario checks are linked.`];
      documentationStatus = brief.recordedScreening ? 'Evidence linked' : 'Partially documented';
      gap = 'A documented rule or rejection does not establish its clinical justification. Review the patient-specific rationale and supporting evidence.';
    } else if (topic.id === 'broad') {
      factFields = fields.filter(field => /hiv_status|brain_metastases_present|cardiac_history|prior_cancer_history|pregnancy_status/.test(field));
      documentation = [brief.protocol.wording || 'Current protocol and unchanged restrictions are available.'];
      gap = run.casePack?.id === 'PREG' ? 'Pregnancy remains a separate research question; this general source cannot define inclusion conditions.' : 'Determine whether the actual restriction is scientifically justified. A diagnosis label or source link alone does not decide this.';
    } else if (topic.id === 'drug') {
      const drug = [...brief.evidence.supporting, ...brief.evidence.retaining, ...brief.evidence.unresolved].filter(item => item.kind === 'Fictional drug evidence');
      const drugFields = new Set(brief.criteria.filter(item=>item.sourceIds.length&&(!run.unified||item.scope==='medical')).flatMap(item=>item.fields));
      factFields = fields.filter(field=>drugFields.has(field) || /medication|antiretroviral|interaction|drug_specific|drug_elimination|other_cancer_treatment/.test(field));
      documentation = drug.length ? [...new Set(drug.map(item => item.sourceId))].map(id => `${id}: fictional study evidence, applicability unreviewed.`) : [];
      documentationStatus = drug.length ? 'Partially documented' : 'Documentation missing';
      gap = 'Real drug-specific evidence, subgroup coverage and proposed-rule sufficiency are not established by these fictional or secondary sources.';
      initialStatus = 'applicability_unresolved';
    } else if (topic.id === 'organ') {
      factFields = fields.filter(field => /renal|egfr|hepatic|cardiac|condition_severity|functional_assessment/.test(field));
      documentation = factFields.length ? ['Relevant observations and authored assessments are linked to the current checks.'] : [];
      documentationStatus = factFields.length ? 'Partially documented' : 'Documentation missing';
      gap = factFields.length ? 'Confirm metric, timing, severity, drug relevance and evidence applicability. No additional medical cutoff is inferred.' : 'No organ-specific assessment is modeled in this pack. A reviewer must document whether this topic applies.';
      if (!factFields.length) initialStatus = 'applicability_unresolved';
    } else if (topic.id === 'accommodation') {
      factFields = ['ACCESS','COGNITIVE'].includes(run.casePack?.id) ? fields.filter(field => /support|accommodation|consent|method|procedure|required_study_tasks|task_specific|availability_confirmation/.test(field)) : [];
      documentation = brief.readiness?.components.map(item => `${item.label}: ${item.status.replaceAll('_', ' ')}.`) || [];
      documentationStatus = documentation.length ? 'Partially documented' : 'Documentation missing';
      gap = documentation.length ? 'Confirm actual resources and separately document procedure, consent and method acceptability. Medical eligibility remains independent.' : 'Participation support was not assessed in this case. Applicability needs an explicit reviewer explanation.';
      if (!documentation.length) initialStatus = 'applicability_unresolved';
    } else {
      documentation = [`Age composition is calculated from ${run.current.total} screened records.`, 'Unknown and not-collected demographic categories are retained.'];
      documentationStatus = 'Evidence linked';
      gap = 'No compatible reference population or observed enrollment data is supplied. Composition does not establish representativeness.';
    }
    const saved = state.guidanceReviews?.[guidanceReviewKey(run, patientId, topic.id)] || null;
    const relevantCriteria = brief.criteria.filter(item => topic.id === 'rationale' ? item.result !== 'PASS' : topic.id === 'broad' ? (item.criterionId.endsWith('_POLICY') || run.unified && ['HIV','BRAIN','OLDER','PRIOR'].includes(item.domain)) : topic.id === 'drug' ? item.sourceIds.length&&(!run.unified||item.scope==='medical') : topic.id === 'organ' ? item.fields.some(field=>factFields.includes(field)) : topic.id==='accommodation' && run.unified ? item.scope==='participation' : false);
    const criterionRefs = [...(topic.id==='rationale'?brief.originalCriteria.filter(item=>item.result!=='PASS').map(item=>({criterionId:item.criterionId,phase:'original'})):[]),...relevantCriteria.map(item=>({criterionId:item.criterionId,phase:'active'}))];
    const sourceVerified = source?.verified === true && Boolean(passage);
    return { ...topic, patientId, runId: run.id, passage, sourceVerified, sourceMetadata: source || null, factFields, protocolId: brief.protocol.id, criterionRefs, criterionIds: [...new Set(criterionRefs.map(ref=>ref.criterionId))],
      documentation, documentationStatus, remainingGap: gap, reviewStatus: saved?.status || initialStatus, actualReview: saved,
      openQuestion: saved && ['questions_open','applicability_unresolved'].includes(saved.status) ? saved.rationale : gap,
      statusLabel: guidanceReviewStatuses.find(([id]) => id === (saved?.status || initialStatus))[1],
      sourceApplicability: 'Guidance topic mapped; patient/study-specific applicability requires substantive review.',
    };
  });
}
export function summarizeGuidance(rows) {
  const groups = [
    { id: 'reviewed', label: 'Reviewed topics', count: 0 }, { id: 'open', label: 'Open questions / awaiting review', count: 0 },
    { id: 'missing', label: 'Missing documentation', count: 0 }, { id: 'applicability', label: 'Unresolved applicability', count: 0 },
  ];
  for (const row of rows) {
    const group = row.documentationStatus === 'Documentation missing' ? 'missing' : row.reviewStatus === 'applicability_unresolved' ? 'applicability' : ['reviewed', 'not_applicable'].includes(row.reviewStatus) && row.actualReview ? 'reviewed' : 'open';
    groups.find(item => item.id === group).count++;
  }
  return { total: rows.length, groups, rule: 'Each topic is counted once: missing documentation, then unresolved applicability, then an actual documented review, otherwise open. Documentation and review status remain separate in every row.' };
}
