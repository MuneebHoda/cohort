import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspace, datasetDefinitions, visibleRecords } from '../src/workspace.js';
import { buildDecisionBrief, attachDecisionBriefs } from '../src/decision-brief.js';
import { getGuidanceRows, summarizeGuidance } from '../src/guidance-review.js';
import { guidanceSources, guidancePassages } from '../src/guidance-sources.js';
import { renderGuidanceReview, renderCriterionInspection, renderDecisionBrief, renderBriefEvidence } from '../src/review-views.js';
import { buildReviewPacket, renderReport, renderDecision } from '../src/studio-views.js';
import { renderTrialCharts } from '../src/charts.js';
import { exclusionRows, compositionComparison } from '../src/analysis-model.js';
import { generateCasePack } from '../src/case-packs.js';
import { evaluateInvestigationPack } from '../src/investigation.js';

const reference = () => createWorkspace({dataset:'casebook'});
const changedIds = ['P02','P03','P09','P11','P13','P19'];
const ids = records => records.map(record=>record.id).sort();

test('every explanation fact, rule, version and evidence reference resolves to the actual snapshot', () => {
  for (const dataset of Object.keys(datasetDefinitions)) {
    const w=createWorkspace({dataset}), run=w.run, sourceIds=new Set(run.evidenceRegistry.map(source=>source.id));
    assert.equal(Object.keys(run.explanations).length,run.current.total);
    for (const record of run.current.records) {
      const brief=run.explanations[record.id];
      assert.equal(brief.runId,run.id);assert.equal(brief.datasetVersion,run.datasetVersion);assert.equal(brief.patientId,record.id);
      assert.equal(brief.activeStatus,record.status);assert.equal(brief.scenarioId,run.scenarioId);
      for(const fact of brief.facts)assert.deepEqual(fact.value,record[fact.field],`${record.id}/${fact.field}`);
      for(const criterion of brief.criteria){const actual=record.evaluations.find(item=>item.criterionId===criterion.criterionId);for(const key of ['result','reason','ruleId','ruleVersion'])assert.deepEqual(criterion[key],actual[key]);}
      for(const item of Object.values(brief.evidence).flat())if(item.sourceId)assert.ok(sourceIds.has(item.sourceId),item.sourceId);
      for(const ref of brief.sections.flatMap(section=>section.refs)){
        if(ref.kind==='field')assert.ok(brief.facts.some(fact=>fact.field===ref.field));
        if(ref.kind==='criterion')assert.ok(brief.criteria.some(criterion=>criterion.criterionId===ref.criterionId));
        if(ref.kind==='source')assert.ok(sourceIds.has(ref.sourceId));
      }
    }
  }
});

test('decision briefs stay concise and expose five specific sections instead of a thinking sequence', () => {
  for(const dataset of Object.keys(datasetDefinitions)){
    const w=createWorkspace({dataset});
    for(const scenario of ['original',...(w.run.proposed.available!==false?['renal-revision']:[])]){
      w.setScenario(scenario);
      for(const brief of Object.values(w.run.explanations)){
        const words=[brief.conclusion,brief.reason,...brief.sections.map(section=>section.summary)].join(' ').split(/\s+/).length;
        assert.ok(words>=90&&words<=160,`${brief.patientId}/${scenario}: ${words}`);
        assert.deepEqual(brief.sections.map(section=>section.id),['original','reconsideration','limits','next','change']);
        assert.doesNotMatch(brief.sections.map(section=>section.summary).join(' '),/stop medication|change doses|AI thinking|FDA approved/i);
      }
    }
  }
});

test('the retained independent restriction drives the headline and action before and after a favorable renal comparison', () => {
  const w=reference();
  for(const scenario of ['original','renal-revision']){
    w.setScenario(scenario);const brief=w.run.explanations.P06;
    assert.equal(brief.decisiveCriterionId,'DDI');
    assert.match(brief.reason,/Strong CYP3A inhibitor: Yes/);
    assert.match(brief.actions[0].action,/Concomitant medication/);
    assert.ok(brief.reasonRefs.some(ref=>ref.kind==='field'&&ref.field==='strong_cyp3a_inhibitor'));
    const criterion=brief.criteria.find(item=>item.criterionId==='DDI');
    assert.equal(criterion.reason,w.run.current.records.find(record=>record.id==='P06').evaluations.find(item=>item.criterionId==='DDI').reason);
    const html=renderDecisionBrief(brief);
    assert.ok(html.indexOf('class="brief-next"')<html.indexOf('class="brief-five"'));
  }
});

test('briefs retain actual measurement dates and do not invent dates for unmatched observations', () => {
  const w=createWorkspace(),record=w.run.current.records.find(item=>item.measurements?.length);
  assert.equal(w.run.explanations[record.id].facts.find(fact=>fact.field==='egfr_ml_min_1_73m2').date,record.measurements[0].date);
  const changed=structuredClone(record);changed.measurements[0].value+=1;
  assert.equal(buildDecisionBrief(w.run,changed).facts.find(fact=>fact.field==='egfr_ml_min_1_73m2').date,null);
  assert.equal(reference().run.explanations.P03.facts.find(fact=>fact.field==='egfr_ml_min_1_73m2').date,null);
});

test('a retained authored interaction finding cites the assessment rather than the medication label alone', () => {
  const w=createWorkspace({dataset:'case-hiv'}),brief=w.run.explanations['HIV-B'];
  assert.equal(brief.decisiveCriterionId,'INTERACTION');
  assert.match(brief.reason,/Interaction assessment: relevant concern/);
  const html=renderBriefEvidence(brief);
  assert.match(html,/data-inspect-criterion="INTERACTION"/);
  assert.match(html,/Interaction assessment/);
  assert.equal(brief.criteria.find(item=>item.criterionId==='INTERACTION').result,'FAIL');
});

test('a recorded screening statement remains separate from computed exclusion reasons', () => {
  const w=createWorkspace({dataset:'case-hiv'}), b=w.run.explanations['HIV-F'];
  assert.equal(b.recordedScreening.reason,w.run.patients.find(record=>record.id==='HIV-F').originalScreening.reason);
  assert.equal(b.route,'SCREENING_CORRECTION_REVIEW');assert.equal(b.activeStatus,'eligible');assert.equal(b.recordedScreening.decision,'rejected');
  assert.equal(w.run.explanations['HIV-A'].route,'PROTOCOL_REVISION_REVIEW');
  assert.equal(reference().run.explanations.P03.recordedScreening,null);
});

test('renal reconsideration cites the actual renal observation and preserves original versus active rules', () => {
  const w=reference();let brief=w.run.explanations.P03;
  assert.match(brief.sections.find(section=>section.id==='reconsideration').summary,/49/);
  assert.equal(brief.activeStatus,'excluded');assert.equal(brief.proposed.status,'eligible');
  w.setScenario('renal-revision');brief=w.run.explanations.P03;
  assert.equal(brief.activeStatus,'eligible');assert.equal(brief.currentProtocolStatus,'excluded');
  assert.equal(brief.criteria.find(item=>item.criterionId==='RENAL').result,'PASS');
  assert.equal(brief.originalCriteria.find(item=>item.criterionId==='RENAL').result,'FAIL');
  assert.ok(!brief.blockers.some(item=>item.kind==='failed_criterion'));
  assert.match(renderCriterionInspection(w.run,'P03','RENAL','original'),/eGFR 49 does not meet/);
  assert.match(renderCriterionInspection(w.run,'P03','RENAL'),/PASS/);
  assert.ok(getGuidanceRows(w.run,w.state,'P03').find(row=>row.id==='rationale').criterionRefs.some(ref=>ref.criterionId==='RENAL'&&ref.phase==='original'));
});

test('hard restrictions and their fictional supporting evidence survive favorable proposed review', () => {
  const w=reference();w.setScenario('renal-revision');const brief=w.run.explanations.P06;
  assert.equal(brief.activeStatus,'excluded');assert.equal(brief.route,'RETAIN_RESTRICTION');
  assert.ok(brief.evidence.retaining.some(item=>item.sourceId==='SYN-DDI-03'));
  assert.ok(brief.blockers.some(item=>item.refs.some(ref=>ref.criterionId==='DDI')));
  assert.ok(!w.run.ranked.some(record=>record.id==='P06'));
});

test('missing required information is neither imputed nor removed from the explanation', () => {
  const w=reference();w.setScenario('renal-revision');const b=w.run.explanations.P16;
  assert.equal(b.activeStatus,'indeterminate');assert.ok(b.blockers.some(item=>item.kind==='unknown_criterion'));
  assert.ok(b.facts.some(fact=>fact.field==='hepatic_status'&&fact.value===null));
  assert.match(b.sections.find(section=>section.id==='change').summary,/1 unknown remain.*Hepatic impairment/);
});

test('an unmentioned interaction is not explained as a completed negative assessment', () => {
  const w=createWorkspace({dataset:'case-hiv'}), records=generateCasePack('HIV');
  records.find(record=>record.id==='HIV-F').interaction_assessment='not_mentioned';
  const run={...w.run,...evaluateInvestigationPack(records,'HIV')};attachDecisionBriefs(run);
  const b=run.explanations['HIV-F'];
  assert.equal(b.activeStatus,'indeterminate');assert.equal(b.criteria.find(item=>item.criterionId==='INTERACTION').result,'UNKNOWN');
  assert.equal(b.facts.find(fact=>fact.field==='interaction_assessment').value,'not_mentioned');
});

test('accommodation annotations do not confirm pending support or settle separate consent review', () => {
  for(const [dataset,patientId] of [['case-access','ACCESS-B'],['case-cognitive','COGNITIVE-F']]){
    const w=createWorkspace({dataset}), run=w.run;
    assert.equal(run.explanations[patientId].activeStatus,'eligible');assert.equal(run.explanations[patientId].readiness.status,'pending');
    w.recordGuidanceReview({patientId,topicId:'accommodation',status:'reviewed',rationale:'Reviewed the recorded support gap; confirmation is still outstanding.',evidenceNotes:'The authored support record and separate task assessments.'});
    assert.equal(w.run,run);assert.equal(w.run.explanations[patientId].readiness.status,'pending');assert.equal(w.run.current.newlyEligible,0);
    assert.ok(w.run.explanations[patientId].blockers.some(item=>item.kind==='participation'));
  }
});

test('pregnancy referrals and unconfigured proposals never become a passing scenario', () => {
  const w=createWorkspace({dataset:'case-preg'}),b=w.run.explanations['PREG-A'];
  assert.equal(b.route,'SEPARATE_RESEARCH_PATHWAY');assert.equal(b.activeStatus,'excluded');assert.equal(b.proposed.available,false);
  assert.equal(w.run.current.newlyEligible,0);assert.match(b.sections.at(-1).summary,/No proposed scenario is configured/);
  assert.equal(w.run.chartGroups.filter(group=>group.kind==='flow').length,0);
});

test('a withheld requested scenario preserves its gate reasons among remaining blockers', () => {
  const w=reference();w.setScenario('renal-draft');
  assert.ok(w.run.explanations.P03.blockers.some(item=>item.kind==='scenario_gate'));
  assert.equal(w.run.current.eligible,4);assert.equal(w.run.ranked.length,0);
});

test('out-of-range renal evidence and authored clinical assessments retain distinct provenance', () => {
  const w=createWorkspace({dataset:'case-renal'}),b=w.run.explanations['RENAL-B'];
  assert.ok(b.evidence.unresolved.some(item=>item.kind==='Outside supplied evidence range'&&item.sourceId==='SYN-PK-02'));
  assert.equal(b.activeStatus,'excluded');
  const malformed=generateCasePack('RENAL');malformed.find(record=>record.id==='RENAL-B').renal_value=-1;
  const malformedRun={...w.run,...evaluateInvestigationPack(malformed,'RENAL')};attachDecisionBriefs(malformedRun);
  assert.equal(malformedRun.explanations['RENAL-B'].activeStatus,'indeterminate');
  assert.ok(!malformedRun.explanations['RENAL-B'].evidence.unresolved.some(item=>item.kind==='Outside supplied evidence range'));
  w.setDataset('case-hiv');const retained=w.run.explanations['HIV-B'].evidence.retaining;
  assert.ok(retained.some(item=>item.kind==='Explicit fictional clinical assessment'));
  assert.ok(retained.some(item=>item.kind==='Protocol requirement'));
});

test('source verification has complete metadata while secondary notes remain unverified', () => {
  const w=createWorkspace({dataset:'case-hiv'});
  for(const source of guidanceSources){for(const field of ['issuingOrganization','title','documentType','status','date','section','url','verifiedAt','applicability'])assert.ok(source[field]);assert.ok(Number.isFinite(Date.parse(source.verifiedAt)));}
  for(const passage of guidancePassages){assert.ok(guidanceSources.some(source=>source.id===passage.sourceId));assert.ok(passage.page&&passage.pdfPage&&passage.summary);}
  const note=w.run.evidenceRegistry.find(source=>source.id==='RESEARCH-NOTE');assert.equal(note.verified,false);assert.equal(note.passage,null);
  assert.equal(w.run.evidenceRegistry.find(source=>source.id==='CASE-NOTE-HIV').verified,false);
  assert.equal(w.run.evidenceRegistry.find(source=>source.id==='FDA-2025-REP').passages.length,6);
});

test('documentation linkage cannot automatically perform substantive review or clinical approval', () => {
  const w=createWorkspace({dataset:'case-hiv'}), run=w.run, rows=getGuidanceRows(run,w.state,'HIV-A');
  assert.equal(rows.length,6);assert.ok(rows.some(row=>row.documentationStatus==='Evidence linked'));
  assert.ok(rows.every(row=>!row.actualReview));assert.ok(!rows.some(row=>row.reviewStatus==='reviewed'));
  const drug=rows.find(row=>row.id==='drug');assert.equal(drug.documentationStatus,'Documentation missing');assert.equal(drug.reviewStatus,'applicability_unresolved');
  assert.match(renderGuidanceReview(w),/not a finding of no medical justification/);
  assert.equal(w.run.current.records.find(record=>record.id==='HIV-A').status,'excluded');
});

test('topic mappings use relevant rules and never mistake a laboratory method for participation support', () => {
  const w=createWorkspace({dataset:'case-renal'}),rows=getGuidanceRows(w.run,w.state,'RENAL-A');
  assert.ok(rows.find(row=>row.id==='organ').criterionIds.includes('RENAL'));
  assert.deepEqual(rows.find(row=>row.id==='accommodation').factFields,[]);
  assert.deepEqual(rows.find(row=>row.id==='population').criterionIds,[]);
  assert.equal(rows.find(row=>row.id==='accommodation').documentationStatus,'Documentation missing');
  const hiv=createWorkspace({dataset:'case-hiv'}),drug=getGuidanceRows(hiv.run,hiv.state,'HIV-A').find(row=>row.id==='drug');
  assert.ok(drug.factFields.includes('current_antiretroviral_medications'));assert.ok(drug.factFields.includes('interaction_assessment'));
});

test('source-verification-pending rows withhold the passage without altering eligibility or review status', () => {
  const w=createWorkspace({dataset:'case-hiv'}),run={...w.run,evidenceRegistry:w.run.evidenceRegistry.map(source=>({...source,verified:false}))};
  const row=getGuidanceRows(run,w.state,'HIV-A').find(item=>item.id==='broad');
  assert.equal(row.sourceVerified,false);assert.equal(row.reviewStatus,'not_reviewed');
  const html=renderGuidanceReview({run,state:w.state});
  assert.match(html,/Source passage verification pending/);
  assert.doesNotMatch(html,/Commonly reused restrictions can exclude groups/);
  assert.equal(run.explanations['HIV-A'].activeStatus,'excluded');
});

test('open-question navigation retains the actual recorded question and independent documentation gap', () => {
  const w=createWorkspace({dataset:'case-hiv'});
  w.recordGuidanceReview({patientId:'HIV-A',topicId:'drug',status:'questions_open',rationale:'Does the primary evidence cover this ART regimen?',evidenceNotes:'Only the secondary summary was supplied.'});
  const row=getGuidanceRows(w.run,w.state,'HIV-A').find(item=>item.id==='drug');
  assert.equal(row.openQuestion,'Does the primary evidence cover this ART regimen?');
  assert.equal(row.documentationStatus,'Documentation missing');
  assert.match(renderGuidanceReview(w),/data-guidance-open="drug"/);
  assert.match(renderGuidanceReview(w),/Does the primary evidence cover this ART regimen/);
});

test('review and not-applicable dispositions require both a rationale and information actually considered', () => {
  const w=createWorkspace({dataset:'case-hiv'});
  const input={patientId:'HIV-A',topicId:'drug',status:'reviewed',rationale:'Specific review.',evidenceNotes:'Specified source.'};
  for(const override of [{rationale:''},{evidenceNotes:''},{status:'not_applicable',rationale:' '},{topicId:'invented'},{status:'approved'},{patientId:'P03'}])assert.throws(()=>w.recordGuidanceReview({...input,...override}));
  assert.equal(w.events.length,1);
});

test('actual guidance actions retain before/after context without rewriting the clinical snapshot', () => {
  const w=createWorkspace({dataset:'case-hiv'}),run=w.run;
  const event=w.recordGuidanceReview({patientId:'HIV-A',topicId:'drug',status:'questions_open',rationale:'Drug-specific evidence is missing.',evidenceNotes:'Inspected supplied case summary; no primary drug study supplied.'});
  assert.equal(w.run,run);assert.equal(event.actor,'Demo reviewer');assert.equal(event.authenticated,false);assert.ok(Number.isFinite(Date.parse(event.timestamp)));
  assert.equal(event.runId,run.id);assert.equal(event.studyId,run.studyId);assert.equal(event.datasetVersion,run.datasetVersion);assert.equal(event.versions,run.configVersions);
  assert.equal(event.before.activeMedicalStatus,event.after.activeMedicalStatus);assert.equal(event.after.activeMedicalStatus,'excluded');
  const row=getGuidanceRows(run,w.state,'HIV-A').find(row=>row.id==='drug');assert.equal(row.reviewStatus,'questions_open');assert.equal(row.documentationStatus,'Documentation missing');
});

test('workflow progress counts each topic once and keeps missing documentation separate from reviewed annotation', () => {
  const w=createWorkspace({dataset:'case-hiv'});
  w.recordGuidanceReview({patientId:'HIV-A',topicId:'drug',status:'reviewed',rationale:'Reviewed the evidence gap; it remains unresolved.',evidenceNotes:'Supplied secondary case specification only.'});
  const summary=summarizeGuidance(getGuidanceRows(w.run,w.state,'HIV-A'));
  assert.equal(summary.groups.reduce((sum,group)=>sum+group.count,0),6);assert.ok(summary.groups.find(group=>group.id==='missing').count>0);
  const row=getGuidanceRows(w.run,w.state,'HIV-A').find(row=>row.id==='drug');assert.equal(row.statusLabel,'Reviewed with rationale');assert.equal(row.documentationStatus,'Documentation missing');
});

test('scenario and pack changes invalidate patient-specific review status and evidence context', () => {
  const w=reference();w.recordGuidanceReview({patientId:'P03',topicId:'rationale',status:'reviewed',rationale:'Reviewed the original snapshot.',evidenceNotes:'Original rule and fixture observation.'});
  const old=w.run.explanations.P03.id;w.setScenario('renal-revision');assert.notEqual(w.run.explanations.P03.id,old);assert.equal(getGuidanceRows(w.run,w.state,'P03').find(row=>row.id==='rationale').actualReview,null);
  w.setEvidence('FDA-2024-ERECORDS');w.setFilters({subgroup:'flow:excluded:eligible'});w.setDataset('case-preg');
  assert.equal(w.state.selectedEvidenceId,null);assert.equal(w.state.filters.subgroup,'all');assert.equal(w.state.selectedPatientId,'PREG-A');
});

test('flow drill-down opens the exact six proposed matches while preserving original active classification', () => {
  const w=reference(),run=w.run;w.setFilters({subgroup:'flow:excluded:eligible'});
  assert.deepEqual(ids(visibleRecords(run,w.state.filters)),changedIds);assert.equal(w.run,run);assert.equal(w.state.scenarioId,'original');
  assert.ok(visibleRecords(run,w.state.filters).every(record=>record.status==='excluded'));
  assert.deepEqual(buildReviewPacket(w).filteredPatientIds.sort(),changedIds);
});

test('every configured flow contributes exactly one transition for each actual patient', () => {
  for(const dataset of ['casebook','expanded','case-renal']){
    const w=createWorkspace({dataset}),run=w.run,flows=run.chartGroups.filter(group=>group.kind==='flow');
    assert.equal(flows.reduce((sum,group)=>sum+group.ids.length,0),run.current.total);assert.equal(new Set(flows.flatMap(group=>group.ids)).size,run.current.total);
    for(const flow of flows){const [,from,to]=flow.id.split(':');for(const id of flow.ids){assert.equal(run.original.records.find(record=>record.id===id).status,from);assert.equal(run.proposed.records.find(record=>record.id===id).status,to);}}
  }
});

test('flow counts are visible and provide the same exact patient links as their ribbons', () => {
  const w=reference(),html=renderTrialCharts(w.run,w.state);
  assert.match(html,/class="flow-counts"/);
  assert.match(html,/data-analysis-group="flow:excluded:eligible"[^>]*>6<\/button>/);
  assert.match(html,/role="group" aria-label="Eligibility transitions/);
  assert.deepEqual([...w.run.chartGroups.find(group=>group.id==='flow:excluded:eligible').ids].sort(),changedIds);
});

test('overlapping exclusion bars keep unique IDs per criterion and never admit every renal failure', () => {
  const w=reference(), rows=exclusionRows(w.run), renal=rows.find(row=>row.id==='RENAL'),ddi=rows.find(row=>row.id==='DDI');
  assert.ok(renal.affected.includes('P06')&&ddi.affected.includes('P06'));assert.ok(rows.reduce((sum,row)=>sum+row.affected.length,0)>w.run.current.excluded);
  assert.equal(new Set(renal.affected).size,renal.affected.length);assert.deepEqual([...renal.newlyMatching].sort(),changedIds);assert.ok(!renal.newlyMatching.includes('P06')&&!renal.newlyMatching.includes('P16'));
  w.setFilters({subgroup:'criterion:DDI'});assert.deepEqual(ids(visibleRecords(w.run,w.state.filters)),[...ddi.affected].sort());
});

test('composition and within-group matching use their distinct, independently expected denominators', () => {
  const w=reference(), model=compositionComparison(w.run,'age'),under=model.rows.find(row=>row.id==='under65'),older=model.rows.find(row=>row.id==='75plus');
  assert.deepEqual(under.originalComposition,{numerator:3,denominator:4,percent:75});assert.deepEqual(under.proposedComposition,{numerator:5,denominator:10,percent:50});
  assert.deepEqual(under.originalWithin,{numerator:3,denominator:9,percent:33.3});assert.deepEqual(under.proposedWithin,{numerator:5,denominator:9,percent:55.6});
  assert.equal(older.proposedComposition.percent,20);assert.equal(older.proposedWithin.percent,100);
  assert.equal(model.rows.find(row=>row.id==='unknown').originalWithin.percent,null);
  w.setFilters({subgroup:older.proposedGroupId});assert.deepEqual(ids(visibleRecords(w.run,w.state.filters)),[...older.proposedIds].sort());
});

test('absent demographics and unconfigured comparison rates remain explicit instead of inferred', () => {
  const w=reference(),sex=compositionComparison(w.run,'sex'),missing=sex.rows.find(row=>row.id==='not_collected');
  assert.equal(missing.screened,20);assert.equal(missing.originalComposition.numerator,4);assert.ok(sex.rows.filter(row=>row.id!=='not_collected').every(row=>row.screened===0));
  w.setDataset('case-hiv');const model=compositionComparison(w.run,'age');assert.equal(model.proposedAvailable,false);assert.ok(model.rows.every(row=>row.proposedComposition===null&&row.proposedWithin===null));
});

test('each case has a clinical composition partition built only from its recorded field', () => {
  for(const [dataset,field] of [['case-hiv','hiv_status'],['case-brain','current_stability_assessment'],['case-older','current_cardiac_status'],['case-access','functional_support_needs'],['case-cognitive','communication_support_needs'],['case-prior','current_cancer_activity'],['case-preg','pregnancy_status'],['case-renal','renal_stable']]){
    const w=createWorkspace({dataset}),model=compositionComparison(w.run,'clinical');
    assert.equal(model.overlapping,false);assert.equal(model.rows.reduce((sum,row)=>sum+row.screened,0),50);
    for(const row of model.rows){
      const screened=w.run.current.records.filter(record=>record[field]==null?row.id==='unknown':String(record[field])===row.id);
      assert.equal(row.screened,screened.length);
      assert.equal(row.originalWithin.denominator,screened.length);
      assert.equal(row.originalComposition.denominator,w.run.original.eligible);
      w.setFilters({subgroup:row.originalGroupId});
      assert.deepEqual(ids(visibleRecords(w.run,w.state.filters)),screened.filter(record=>record.currentProtocolEvaluation.status==='eligible').map(record=>record.id).sort());
    }
  }
});

test('patient criterion matrix uses actual active results and opens absent checks as unconfigured', () => {
  const w=reference();w.setScenario('renal-revision');assert.match(renderTrialCharts(w.run,w.state,'matrix'),/Inspect P03 Renal function: PASS/);
  w.setDataset('case-preg');assert.match(renderTrialCharts(w.run,w.state,'matrix'),/Not configured/);
  assert.match(renderCriterionInspection(w.run,'PREG-A','PREG_CONCERN'),/Not configured in this record/);
});

test('criterion matrix labels explicitly absent conditions without implying a completed assessment', () => {
  const w=createWorkspace({dataset:'case-hiv'}),html=renderTrialCharts(w.run,w.state,'matrix');
  assert.match(html,/Inspect HIV-D Current HIV protocol wording: Not applicable \(engine PASS\)/);
  assert.equal(w.run.explanations['HIV-D'].criteria.find(item=>item.criterionId==='HIV_POLICY').result,'PASS');
});

test('primary analytical views use at most two charts and keep deeper analysis behind explicit controls', () => {
  for(const dataset of ['expanded','case-access','case-preg']){
    const w=createWorkspace({dataset});const primary=renderTrialCharts(w.run,w.state).split('<details class="analysis-secondary">')[0];assert.equal((primary.match(/data-chart="/g)||[]).length,2);
    assert.equal((renderTrialCharts(w.run,w.state,'composition').split('<details class="analysis-secondary">')[0].match(/data-chart="/g)||[]).length,1);
  }
});

test('reports preserve the exact explanation, open questions, actual annotations and current filtered IDs', () => {
  const w=reference();w.setScenario('renal-revision');w.setFilters({subgroup:'resolved:RENAL'});w.selectPatient('P03');
  w.recordGuidanceReview({patientId:'P03',topicId:'drug',status:'questions_open',rationale:'The fictional PK evidence cannot establish actual patient applicability.',evidenceNotes:'SYN-PK-01 and SYN-PK-02; actual drug evidence still required.'});
  const packet=buildReviewPacket(w);assert.equal(packet.analysis,w.run);assert.equal(packet.decisionBrief,w.run.explanations.P03);assert.deepEqual(packet.filteredPatientIds.sort(),changedIds);
  assert.deepEqual(packet.guidanceReview.rows,getGuidanceRows(w.run,w.state,'P03'));assert.match(renderReport(w),/questions open/i);assert.match(renderReport(w),/SYN-PK-02/);assert.match(renderReport(w),/Filtered review scope/);
  assert.match(renderDecision(w),/FDA Guidance Alignment/);assert.equal(w.run.ranked.length,6);
  const html=renderReport(w);
  for(const source of guidanceSources){assert.ok(html.includes(source.verifiedAt));assert.ok(html.includes(source.url));assert.ok(html.includes(source.documentType));}
  assert.match(html,/Versions & recorded before \/ after values/);
  assert.match(html,/activeMedicalStatus/);
});
