import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateCasePack, casePackDefinitions } from '../src/case-packs.js';
import { evaluateInvestigationPack } from '../src/investigation.js';
import { createWorkspace } from '../src/workspace.js';
import { renderTrialSummary, renderTrialAnalytics, renderDecision, renderReport, buildReviewPacket } from '../src/studio-views.js';
import { renderPatientDetail } from '../src/studio-patient.js';

const spec = JSON.parse(readFileSync(new URL('../case_pack_spec.json', import.meta.url)));
const evaluate = (records, id) => evaluateInvestigationPack(records, id);

test('supplied anchor-route expectations are separate from patient inputs and evaluator', () => {
  for (const pack of spec.cases.filter(p=>casePackDefinitions[p.id])) {
    const patients = generateCasePack(pack.id);
    const result = evaluate(patients,pack.id);
    for (const anchor of pack.anchors) {
      const input = patients.find(p=>p.id===anchor.id), record = result.current.records.find(p=>p.id===anchor.id);
      assert.ok(input); assert.equal(record.investigation.primaryRoute,anchor.expected_primary_review_route,anchor.id);
      assert.ok(!JSON.stringify(input).includes('expected_primary_review_route'));
      const renamed = structuredClone(input); renamed.id='RENAMED-PATIENT';
      assert.equal(evaluate([renamed],pack.id).current.records[0].investigation.primaryRoute,anchor.expected_primary_review_route);
    }
  }
});

test('HIV screening correction remains distinct from a proposed protocol revision', () => {
  const {current,proposed}=evaluate(generateCasePack('HIV'),'HIV');
  const a=current.records.find(r=>r.id==='HIV-A'), f=current.records.find(r=>r.id==='HIV-F');
  assert.equal(a.status,'excluded'); assert.equal(a.newlyEligible,false); assert.equal(a.investigation.proposedScenario.status,'REQUIRES_CONFIGURATION');
  assert.equal(f.status,'eligible'); assert.equal(f.investigation.screeningDiscrepancy,true); assert.equal(f.newlyEligible,false);
  assert.equal(proposed.available,false); assert.equal(proposed.records.length,0);
});

test('HIV unknown assessment and unassessed interaction never silently pass', () => {
  const f=generateCasePack('HIV').find(r=>r.id==='HIV-F');
  for (const field of ['viral_load_status','viral_load_collection_date','cd4_protocol_assessment','interaction_assessment','current_antiretroviral_medications']) {
    const record=structuredClone(f); record[field]=null;
    assert.equal(evaluate([record],'HIV').current.records[0].status,'indeterminate',field);
  }
  const record=structuredClone(f);record.interaction_assessment='not_assessed';
  assert.equal(evaluate([record],'HIV').current.records[0].status,'indeterminate');
});

test('independent failures and missing reasons are preserved together', () => {
  const r=generateCasePack('HIV').find(r=>r.id==='HIV-F');
  r.interaction_assessment='relevant_concern';r.independent_medical_assessment='not_satisfied';r.cd4_protocol_assessment=null;
  const result=evaluate([r],'HIV').current.records[0];
  assert.equal(result.status,'excluded');assert.equal(result.exclusionReasons.length,2);assert.equal(result.missingData.length,1);
  assert.ok(result.investigation.routes.includes('RETAIN_RESTRICTION'));assert.ok(result.investigation.routes.includes('NEEDS_INFORMATION'));
});

test('case generation is reproducible and variations preserve distinct stable person IDs', () => {
  const ids=[];
  for(const id of Object.keys(casePackDefinitions)) {
    const records=generateCasePack(id);
    assert.equal(records.length,50);assert.equal(records.filter(r=>r.provenance.type==='hand-authored-anchor').length,6);
    assert.deepEqual(records,generateCasePack(id));assert.notDeepEqual(records,generateCasePack(id,{seed:99}));
    assert.equal(new Set(records.map(r=>r.personId)).size,50);ids.push(...records.map(r=>r.id));
    assert.ok(records.every(r=>r.originalScreening.date<=r.provenance.asOfDate));
  }
  assert.equal(new Set(ids).size,ids.length);
});

test('HIV vertical path shares one run, source, routes and original screening in all views and exports', () => {
  const w=createWorkspace({dataset:'case-hiv'});w.selectPatient('HIV-A');
  const run=w.run;assert.equal(run.current.total,50);assert.equal(run.original.total,50);assert.equal(run.studyId,'ILLUSTRATIVE-HIV');
  for(const html of [renderPatientDetail({state:w.state,run}),renderTrialSummary(run),renderTrialAnalytics(run,w.state),renderDecision(w),renderReport(w)]) assert.ok(html.length>100);
  const packet=buildReviewPacket(w);
  assert.equal(packet.analysis,run);assert.equal(packet.scoring.status,'not-configured');assert.equal(packet.evidence[0].id,'CASE-NOTE-HIV');
  assert.equal(packet.analysis.current.records[0].originalScreening.reason,run.patients[0].originalScreening.reason);
  assert.match(renderPatientDetail({state:w.state,run}),/Exclusion Investigation/i);
  w.recordDisposition({patientId:'HIV-A',disposition:'PROTOCOL_REVISION_REVIEW',reason:'Verify this hypothetical protocol wording.'});
  assert.equal(w.run,run);assert.equal(w.events.at(-1).type,'disposition-recorded');assert.equal(w.run.current.records[0].status,'excluded');
});

test('switching between SYN-217 and investigation contexts clears incompatible state', () => {
  const w=createWorkspace({dataset:'expanded'});w.setScenario('renal-revision');w.setFilters({status:'new',subgroup:'renal-window'});w.setDataset('case-hiv');
  assert.equal(w.state.scenarioId,'original');assert.equal(w.state.filters.status,'all');assert.equal(w.state.filters.subgroup,'all');assert.equal(w.run.ranked.length,0);
  assert.throws(()=>w.setScenario('renal-revision'),/configuration/);
  w.setFilters({subgroup:'PROTOCOL_REVISION_REVIEW'});w.setDataset('casebook');
  assert.equal(w.state.filters.subgroup,'all');assert.equal(w.state.studyId,w.run.studyId);assert.equal(w.run.current.eligible,4);
  w.setScenario('renal-revision');assert.deepEqual(w.run.ranked.map(r=>r.id),['P13','P02','P19','P09','P03','P11']);
});

test('all 48 anchors retain independently authored medical and readiness results', async () => {
  const {anchorMedicalExpectations,anchorReadinessExpectations}=await import('./fixtures/investigation-expectations.js');
  assert.equal(Object.keys(casePackDefinitions).length,8);
  for(const id of Object.keys(casePackDefinitions)) {
    const result=evaluate(generateCasePack(id),id);
    for(let i=0;i<6;i++) {
      const record=result.current.records.find(r=>r.id===`${id}-${'ABCDEF'[i]}`);
      assert.equal(record.status,anchorMedicalExpectations[id][i],record.id);
      if(anchorReadinessExpectations[id])assert.equal(record.investigation.readiness.status,anchorReadinessExpectations[id][i],record.id);
      assert.equal(record.newlyEligible,false,record.id);
    }
  }
});

test('confirmed support and merely proposed support have the same medical result but different readiness', () => {
  const result=evaluate(generateCasePack('ACCESS'),'ACCESS');
  const a=result.current.records.find(r=>r.id==='ACCESS-A'),b=result.current.records.find(r=>r.id==='ACCESS-B');
  assert.equal(a.status,'eligible');assert.equal(b.status,'eligible');assert.equal(a.investigation.readiness.status,'ready_for_configured_tasks');assert.equal(b.investigation.readiness.status,'pending');
  const altered=generateCasePack('ACCESS').find(r=>r.id==='ACCESS-A');altered.availability_confirmation=null;
  assert.equal(evaluate([altered],'ACCESS').current.records[0].investigation.readiness.status,'pending');
  assert.equal(evaluate([altered],'ACCESS').current.records[0].newlyEligible,false);
});

test('a helper cannot resolve pending consent or assessment-method review', () => {
  const records=generateCasePack('COGNITIVE');
  for(const id of ['COGNITIVE-B','COGNITIVE-F']) {
    const record=evaluate([records.find(r=>r.id===id)],'COGNITIVE').current.records[0];
    assert.equal(record.status,'eligible');assert.equal(record.investigation.primaryRoute,'ACCOMMODATION_REVIEW');
    assert.equal(record.investigation.readiness.status,'pending');assert.equal(record.newlyEligible,false);
    assert.ok(record.investigation.readiness.components.some(c=>c.status==='pending'));
  }
  const unknown=structuredClone(records[0]);unknown.consent_process_assessment_status=null;
  assert.equal(evaluate([unknown],'COGNITIVE').current.records[0].investigation.readiness.status,'pending');
});

test('pregnancy research routes never become medical inclusion scenarios', () => {
  const result=evaluate(generateCasePack('PREG'),'PREG');
  assert.equal(result.current.newlyEligible,0);assert.equal(result.proposed.available,false);
  for(const record of result.current.records.filter(r=>r.pregnancy_status==='pregnant')) {
    assert.equal(record.status,'excluded');assert.ok(record.investigation.routes.includes('SEPARATE_RESEARCH_PATHWAY'));
    assert.equal(record.investigation.proposedScenario.status,'REQUIRES_CONFIGURATION');
  }
  assert.throws(()=>evaluateInvestigationPack(generateCasePack('PREG'),'PREG','renal-revision'),/configuration/);
});

test('concurrent cancer uses documented interference rather than a universal active-cancer exclusion', () => {
  const f=generateCasePack('PRIOR').find(r=>r.id==='PRIOR-F');
  assert.equal(f.current_cancer_activity,'active');assert.equal(f.other_cancer_treatment,'ongoing');
  assert.equal(evaluate([f],'PRIOR').current.records[0].status,'eligible');
  f.prior_cancer_history=false;f.recurrence_status='not_applicable';
  assert.equal(evaluate([f],'PRIOR').current.records[0].status,'eligible');
  f.endpoint_interference_assessment=null;
  assert.equal(evaluate([f],'PRIOR').current.records[0].status,'indeterminate');
  f.endpoint_interference_assessment='relevant_concern';
  assert.equal(evaluate([f],'PRIOR').current.records[0].status,'excluded');
});

test('treated or stable brain metastases are not silently converted into a universal AND rule', () => {
  const f=generateCasePack('BRAIN').find(r=>r.id==='BRAIN-F');
  assert.equal(f.prior_treatment_status,'not_treated');assert.equal(f.current_stability_assessment,'stable');
  assert.equal(evaluate([f],'BRAIN').current.records[0].status,'eligible');
  f.prior_treatment_status='treated';f.treatment_protocol_assessment='satisfied';f.current_stability_assessment=null;
  assert.equal(evaluate([f],'BRAIN').current.records[0].status,'eligible');
  f.treatment_protocol_assessment=null;
  assert.equal(evaluate([f],'BRAIN').current.records[0].status,'indeterminate');
});

test('renal metrics, units and currency are checked independently without invented expiry windows', () => {
  const a=generateCasePack('RENAL').find(r=>r.id==='RENAL-A');
  const proposal=evaluateInvestigationPack([a],'RENAL','renal-revision').current.records[0];
  assert.equal(proposal.status,'eligible');assert.equal(proposal.investigation.currentProtocol.status,'excluded');assert.equal(proposal.newlyEligible,true);
  for(const [field,value] of [['renal_metric_type','creatinine_clearance'],['renal_unit','mL/min'],['collection_date',null],['measurement_currency_assessment',null]]) {
    const changed=structuredClone(a);changed[field]=value;
    const record=evaluateInvestigationPack([changed],'RENAL','renal-revision').current.records[0];
    assert.equal(record.status,'indeterminate',field);assert.equal(record.newlyEligible,false);
  }
  const wrong=structuredClone(a);wrong.protocolContext.studyId='UNRELATED-STUDY';
  assert.throws(()=>evaluate([wrong],'RENAL'),/context/);
  const f=generateCasePack('RENAL').find(r=>r.id==='RENAL-F');
  assert.equal(evaluate([f],'RENAL').current.records[0].investigation.primaryRoute,'SCREENING_CORRECTION_REVIEW');
});

test('renal expansion preserves the hard medication restriction and all simultaneous reasons', () => {
  const e=generateCasePack('RENAL').find(r=>r.id==='RENAL-E');e.hepatic_status='severe';
  const record=evaluateInvestigationPack([e],'RENAL','renal-revision').current.records[0];
  assert.equal(record.status,'excluded');assert.equal(record.newlyEligible,false);
  assert.equal(record.evaluations.find(c=>c.criterionId==='RENAL').result,'PASS');
  assert.equal(record.evaluations.find(c=>c.criterionId==='DDI').result,'FAIL');
  assert.equal(record.evaluations.find(c=>c.criterionId==='HEPATIC').result,'FAIL');
});

test('demographic and disability labels create no score or automatic medical penalties', () => {
  for(const id of ['HIV','OLDER','ACCESS','COGNITIVE']) {
    const patient=generateCasePack(id).find(r=>r.id===`${id}-D`);
    const before=evaluate([patient],id);
    patient.age_years=89;patient.disability_label='Fictional mobility or sensory label';patient.demographics.sex={status:'recorded',value:'intersex'};
    const after=evaluate([patient],id);
    assert.equal(after.current.records[0].status,before.current.records[0].status);
    assert.equal(after.profiles[patient.id].score,null);assert.equal(after.ranked.length,0);
  }
});

test('overlapping findings count unique people and retain all route reasons', () => {
  for(const id of Object.keys(casePackDefinitions)) {
    const result=evaluate(generateCasePack(id),id);
    assert.equal(result.investigationSummary.uniquePatients,50);
    for(const route of result.investigationSummary.routes) {
      const unique=new Set(result.current.records.filter(r=>r.investigation.routes.includes(route.id)).map(r=>r.personId));
      assert.equal(route.count,unique.size);assert.ok(route.count<=50);
    }
    assert.equal(result.current.eligible+result.current.excluded+result.current.indeterminate,50);
  }
  const [patient]=generateCasePack('HIV');patient.independent_medical_assessment='not_satisfied';patient.cd4_protocol_assessment=null;
  const duplicate=structuredClone(patient);duplicate.id='HIV-SAME-PERSON-SECOND-SNAPSHOT';
  const result=evaluate([patient,duplicate],'HIV');
  assert.equal(result.investigationSummary.uniquePatients,1);
  assert.equal(result.investigationSummary.routes.find(r=>r.id==='RETAIN_RESTRICTION').count,1);
  assert.equal(result.investigationSummary.routes.find(r=>r.id==='NEEDS_INFORMATION').count,1);
});

test('all eight packs total 400 distinct people, no expected classifications are embedded in inputs', () => {
  const records=Object.keys(casePackDefinitions).flatMap(id=>generateCasePack(id));
  assert.equal(records.length,400);assert.equal(new Set(records.map(r=>r.id)).size,400);assert.equal(new Set(records.map(r=>r.personId)).size,400);
  assert.equal(records.filter(r=>r.provenance.type==='hand-authored-anchor').length,48);
  for(const record of records){assert.ok(!Object.hasOwn(record,'expected'));assert.ok(!Object.hasOwn(record,'status'));assert.ok(!Object.hasOwn(record,'primaryRoute'));}
});

test('all case screens, tables, composition, decision trace and reports use their active immutable snapshot', () => {
  const w=createWorkspace({dataset:'expanded'});
  for(const id of Object.keys(casePackDefinitions)) {
    w.setDataset(`case-${id.toLowerCase()}`);const run=w.run,events=w.events;
    assert.equal(w.state.selectedPatientId,`${id}-A`);
    for(const tab of ['overview','criteria','evidence','pathway']){w.setDetailTab(tab);assert.match(renderPatientDetail({state:w.state,run}),new RegExp(`${id}-A`));}
    for(const step of ['source','criterion','inputs','outcomes','factors','action']) assert.match(renderDecision(w,step),new RegExp(run.id));
    assert.equal(w.run,run);assert.equal(w.events,events);
    const packet=buildReviewPacket(w);assert.equal(packet.analysis,run);assert.equal(packet.context.studyId,run.studyId);assert.equal(packet.filteredPatientIds.length,50);
    assert.match(renderReport(w),new RegExp(run.id));assert.equal(packet.scoring.status,'not-configured');
    if(id!=='RENAL')assert.equal(run.proposed.available,false);
    w.setFilters({subgroup:'RETAIN_RESTRICTION'});
  }
});

test('unconfigured assessment tokens cannot be replaced by impressive measurements or omitted interaction wording', () => {
  const f=generateCasePack('HIV').find(r=>r.id==='HIV-F');f.cd4_value=9999;f.cd4_protocol_assessment=null;
  assert.equal(evaluate([f],'HIV').current.records[0].status,'indeterminate');
  f.cd4_protocol_assessment='satisfied';f.interaction_assessment='not_mentioned';
  assert.equal(evaluate([f],'HIV').current.records[0].status,'indeterminate');
  f.interaction_assessment='relevant_concern';f.hiv_status='negative';
  assert.equal(evaluate([f],'HIV').current.records[0].status,'excluded');
});

test('malformed generation settings stay outside the generated analytics', () => {
  for(const options of [{seed:1.1},{variantsPerPack:-1},{asOfDate:'2026-02-31'},{unassessedInteractionProbability:2},{independentRestrictionProbability:NaN}])assert.throws(()=>generateCasePack('HIV',options));
  const invalid=generateCasePack('RENAL').find(r=>r.id==='RENAL-A');invalid.renal_value='52';
  assert.equal(evaluateInvestigationPack([invalid],'RENAL','renal-revision').current.records[0].status,'indeterminate');
  invalid.renal_value=52;invalid.collection_date='2026-11-02';
  assert.equal(evaluateInvestigationPack([invalid],'RENAL','renal-revision').current.records[0].status,'indeterminate');
});

test('source gaps are exported explicitly and case-specific actions remain scoped', () => {
  const w=createWorkspace({dataset:'case-preg'}),run=w.run;
  const packet=buildReviewPacket(w),note=packet.evidence.find(s=>s.id==='RESEARCH-NOTE');
  assert.equal(note.status,'unavailable');assert.equal(note.verified,false);assert.equal(note.passage,null);
  w.recordDisposition({patientId:'PREG-A',disposition:'SEPARATE_RESEARCH_PATHWAY',reason:'A research question; not enrollment authorization.'});
  assert.equal(w.run,run);assert.equal(w.events.at(-1).studyId,run.studyId);assert.equal(w.run.current.records[0].status,'excluded');
  w.setDataset('casebook');assert.throws(()=>w.recordDisposition({patientId:w.state.selectedPatientId,disposition:'SEPARATE_RESEARCH_PATHWAY',reason:'Wrong context.'}),/disposition/);
});

test('explicitly absent conditions preserve not-applicable provenance instead of claiming a completed review', () => {
  for(const id of ['HIV','BRAIN','OLDER','PRIOR','PREG']) {
    const d=generateCasePack(id).find(r=>r.id===`${id}-D`),record=evaluate([d],id).current.records[0];
    const notApplicable=record.evaluations.filter(c=>c.applicability==='not_applicable');
    assert.ok(notApplicable.length>0,id);assert.ok(notApplicable.every(c=>c.result==='PASS'&&c.reason.includes('No extra assessment is inferred')));
  }
});
