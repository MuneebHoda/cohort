import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateUnifiedCohort, evaluateUnifiedCohort, prepareUnifiedPatient, validateUnifiedProfile } from '../src/unified-cohort.js';
import { unifiedProtocol, unifiedFields, unifiedSettings } from '../src/unified-protocol.js';
import { createWorkspace, visibleRecords, evaluateDraft } from '../src/workspace.js';
import { renderUnifiedMatrix, renderUnifiedPatient, renderUnifiedDomain } from '../src/unified-views.js';
import { renderCompositionComparison } from '../src/analysis-views.js';
import { buildReviewPacket, renderContext, renderReport } from '../src/studio-views.js';
import { getGuidanceRows } from '../src/guidance-review.js';
const patients=generateUnifiedCohort(),sample=()=>structuredClone(patients[0]),clean=()=>structuredClone(patients[6]);
const evaluate=(record,scenario='proposed-inclusive',config=unifiedProtocol)=>evaluateUnifiedCohort([record],scenario,config).records[0];
const check=(record,id)=>record.evaluations.find(c=>c.criterionId===id);
const counts=c=>[c.eligible,c.excluded,c.indeterminate];

test('one reproducible cohort supplies all eight domains per patient and mixed conditions coexist',()=>{
 assert.equal(patients.length,500);assert.deepEqual(generateUnifiedCohort(),patients);assert.notDeepEqual(generateUnifiedCohort({seed:218}),patients);assert.equal(new Set(patients.map(p=>p.id)).size,500);
 for(const p of patients)for(const f of unifiedFields)assert.ok(Object.hasOwn(p,f.id),`${p.id}/${f.id}`);
 const p=patients[0];assert.equal(p.hiv_status,'positive');assert.equal(p.brain_metastases_present,true);assert.ok(p.age_years>75);assert.equal(p.access_support_needed,true);assert.equal(p.other_malignancy,true);assert.equal(p.cognitive_support_needed,true);
 assert.ok(!patients.some(p=>p.caseId||p.protocolContext));assert.ok(patients.filter(p=>p.pregnancy_status==='pregnant').every(p=>p.age_years>=18&&p.age_years<=45));assert.deepEqual(generateUnifiedCohort({count:10}),patients.slice(0,10));
});
test('seven independent demonstration expectations distinguish medical and full inclusion outcomes',()=>{
 const original=evaluateUnifiedCohort(patients.slice(0,7)),proposed=evaluateUnifiedCohort(patients.slice(0,7),'proposed-inclusive');
 assert.deepEqual(original.records.map(p=>p.status),['excluded','excluded','excluded','excluded','excluded','excluded','eligible']);
 assert.deepEqual(proposed.records.map(p=>[p.status,p.medicalStatus,p.readinessStatus]),[['eligible','eligible','eligible'],['excluded','excluded','eligible'],['indeterminate','indeterminate','eligible'],['indeterminate','eligible','indeterminate'],['indeterminate','eligible','indeterminate'],['excluded','excluded','eligible'],['eligible','eligible','eligible']]);
 for(const p of proposed.records){assert.equal(p.domainResults.length,9);assert.equal(p.evaluations.length,18);}
});
test('the frozen cohort reconciles exactly, without requiring old renal-only totals',()=>{
 const original=evaluateUnifiedCohort(patients),proposed=evaluateUnifiedCohort(patients,'proposed-inclusive');
 assert.deepEqual(counts(original),[24,469,7]);assert.deepEqual(counts(proposed),[153,263,84]);assert.equal(proposed.newlyEligible,131);
 for(const c of [original,proposed])assert.equal(c.eligible+c.excluded+c.indeterminate,c.total);
 const exported=JSON.parse(readFileSync(new URL('../data/syn217-unified.json',import.meta.url)));assert.deepEqual(exported.patients,patients);assert.deepEqual(exported.protocol,unifiedProtocol);
});
test('all failures and unknowns survive simultaneously; a score cannot cancel them',()=>{
 const p=sample();p.strong_cyp3a_inhibitor=true;p.clinically_unstable_cardiac_disease=true;p.cd4_value=null;p.procedure_review='pending';
 const r=evaluate(p);assert.equal(r.status,'excluded');for(const id of ['DDI','CARDIAC'])assert.equal(check(r,id).result,'FAIL');for(const id of ['HIV','ACCESS_PROCEDURE'])assert.equal(check(r,id).result,'UNKNOWN');assert.ok(r.exclusionReasons.length>=2&&r.missingData.length>=2);
});
test('HIV uses strict viral-load and inclusive CD4/suppression boundaries',()=>{
 for(const [field,value,expected] of [['viral_load',199.9999999,'PASS'],['viral_load',200,'FAIL'],['viral_load',200.1,'FAIL'],['cd4_value',200,'PASS'],['cd4_value',199.9,'FAIL'],['suppression_days',90,'PASS'],['suppression_days',89,'FAIL']]){const p=sample();p[field]=value;assert.equal(check(evaluate(p),'HIV').result,expected,`${field}=${value}`);}
 const p=sample();p.art_interaction_review='pending';assert.equal(check(evaluate(p),'HIV').result,'UNKNOWN');p.art_interaction_review='relevant_concern';assert.equal(check(evaluate(p),'HIV').result,'FAIL');
});
test('brain treatment OR stability is honored without overriding symptoms or relevant concerns',()=>{
 const p=sample();p.brain_treatment_accepted=false;p.brain_stability_days=27;assert.equal(check(evaluate(p),'BRAIN').result,'FAIL');p.brain_stability_days=28;assert.equal(check(evaluate(p),'BRAIN').result,'PASS');
 p.brain_stability_days=null;p.brain_treatment_accepted=true;assert.equal(check(evaluate(p),'BRAIN').result,'PASS');p.neurological_drug_concern=true;assert.equal(check(evaluate(p),'BRAIN').result,'FAIL');p.neurological_drug_concern=false;p.neurological_symptoms_controlled=null;assert.equal(check(evaluate(p),'BRAIN').result,'UNKNOWN');
});
test('older adults can pass without removing adult, functional or cardiac requirements',()=>{
 const p=clean();p.age_years=75;assert.equal(check(evaluate(p,'original'),'OLDER_AGE').result,'PASS');p.age_years=76;assert.equal(check(evaluate(p,'original'),'OLDER_AGE').result,'FAIL');assert.equal(evaluate(p).status,'eligible');
 p.age_years=17;assert.equal(check(evaluate(p),'ADULT').result,'FAIL');p.age_years=18;p.ecog=2;assert.equal(check(evaluate(p),'ECOG').result,'FAIL');p.ecog=1;p.clinically_unstable_cardiac_disease=true;assert.equal(check(evaluate(p),'CARDIAC').result,'FAIL');
});
test('laboratory boundaries, units, currency and conflicting dates remain independent',()=>{
 for(const [value,scenario,result] of [[60,'original','PASS'],[59.9,'original','FAIL'],[45,'proposed-inclusive','PASS'],[44.9,'proposed-inclusive','FAIL']]){const p=clean();p.egfr_ml_min_1_73m2=value;assert.equal(check(evaluate(p,scenario),'RENAL').result,result);}
 const p=sample();p.egfr_collection_date='2026-10-02';assert.equal(check(evaluate(p),'RENAL').result,'PASS');p.egfr_collection_date='2026-10-01';assert.equal(check(evaluate(p),'RENAL').result,'UNKNOWN');p.egfr_collection_date='2026-11-02';assert.equal(check(evaluate(p),'RENAL').result,'UNKNOWN');p.egfr_collection_date='invalid';assert.equal(check(evaluate(p),'RENAL').result,'UNKNOWN');
 p.egfr_collection_date='2026-10-27';delete p.units.egfr_ml_min_1_73m2;assert.equal(check(evaluate(p),'RENAL').result,'UNKNOWN');p.units={...unifiedProtocol.units};p.conflicts=['egfr_collection_date'];assert.equal(check(evaluate(p),'RENAL').result,'UNKNOWN');
 p.conflicts=[];p.viral_load_collection_date='2026-09-01';assert.equal(check(evaluate(p),'HIV').result,'UNKNOWN');
});
test('explicit absence is not applicable while missing condition status stays unknown',()=>{
 const p=clean(),r=evaluate(p);for(const id of ['HIV','BRAIN','PRIOR','PREG'])assert.equal(check(r,id).applicability,'not_applicable');
 for(const field of ['hiv_status','brain_metastases_present','other_malignancy','pregnancy_status']){const q=clean();q[field]=null;assert.equal(evaluate(q).status,'indeterminate',field);}
});
test('accommodation, procedure and consent requirements cannot be substituted for one another',()=>{
 const p=sample();p.accommodation_status='pending';assert.equal(evaluate(p).medicalStatus,'eligible');assert.equal(evaluate(p).status,'indeterminate');p.accommodation_status='unavailable';assert.equal(evaluate(p).status,'excluded');p.accommodation_status='confirmed';p.procedure_review='pending';assert.equal(evaluate(p).status,'indeterminate');p.procedure_review='accepted';p.consent_status='pending';assert.equal(evaluate(p).status,'indeterminate');p.consent_status='accepted';p.assessment_method_review='not_accepted';assert.equal(evaluate(p).status,'excluded');
});
test('pregnancy is a fixed restriction and is never inferred from recorded gender',()=>{
 const p=clean();p.pregnancy_status='pregnant';p.demographics.gender={status:'recorded',value:'man'};assert.equal(check(evaluate(p),'PREG').result,'FAIL');
 p.pregnancy_status='not_applicable';p.pregnancy_nonapplicability_documented=null;assert.equal(check(evaluate(p),'PREG').result,'UNKNOWN');p.pregnancy_nonapplicability_documented=true;assert.equal(check(evaluate(p),'PREG').result,'PASS');
});
test('non-index cancer is assessed by interference, not a universal activity or waiting-period rule',()=>{
 const p=sample();assert.equal(check(evaluate(p),'PRIOR').result,'PASS');p.other_cancer_endpoint_interference=true;assert.equal(check(evaluate(p),'PRIOR').result,'FAIL');p.other_cancer_endpoint_interference=null;assert.equal(check(evaluate(p),'PRIOR').result,'UNKNOWN');
});
test('authored assumptions cannot bypass fixed restrictions or masquerade as real drug evidence',()=>{
 let config=structuredClone(unifiedProtocol);config.scenarios[0].revisions.push({criterionId:'DDI',ruleId:'unified-DDI-original-v1',evidenceIds:['DEMO-POLICY-CORE']});assert.equal(evaluate(sample(),'proposed-inclusive',config).gate.active,false);
 config=structuredClone(unifiedProtocol);config.syntheticOnly=false;assert.equal(evaluate(sample(),'proposed-inclusive',config).gate.active,false);
 config=structuredClone(unifiedProtocol);config.evidence.find(s=>s.id==='DEMO-POLICY-HIV').type='Official guidance';assert.equal(evaluate(sample(),'proposed-inclusive',config).gate.active,false);
 config=structuredClone(unifiedProtocol);config.rules=config.rules.filter(r=>r.id!=='unified-HIV-proposed-v1');assert.equal(evaluate(sample(),'proposed-inclusive',config).gate.active,false);
});
test('one immutable snapshot connects scenario changes, matrix, patient reasons and exports',()=>{
 const w=createWorkspace(),before=w.run,patientsBefore=structuredClone(w.run.patients);assert.equal(w.state.dataset,'unified');w.setScenario('proposed-inclusive');const run=w.run;
 assert.deepEqual(run.patients,patientsBefore);assert.equal(run.studyId,before.studyId);assert.equal(run.explanations['SYN-0001'].activeStatus,'eligible');assert.equal(run.current.records[0].status,'eligible');
 const html=renderUnifiedMatrix(run,w.state);assert.match(html,/Why this patient meets the rules/);assert.match(html,/data-inspect-domain="HIV"/);assert.match(html,/data-inspect-domain="ACCESS"/);assert.match(renderUnifiedPatient({run,state:w.state}),/Meets the modeled inclusion criteria/);assert.match(renderUnifiedDomain(run,'SYN-0001','HIV'),/420/);
 w.setFilters({status:'eligible',subgroup:'HIV'});assert.ok(visibleRecords(run,w.state.filters).every(p=>p.hiv_status==='positive'&&p.status==='eligible'));assert.deepEqual(buildReviewPacket(w).filteredPatientIds,visibleRecords(run,w.state.filters).map(p=>p.id));
 assert.match(renderReport(w),/Active participation/);assert.equal(w.run,run);w.setScenario('original');assert.deepEqual(counts(w.run.current),counts(before.current));assert.deepEqual(w.run.patients,patientsBefore);
});
test('every explanation assertion resolves to facts, rules and registered evidence for all 500 patients',()=>{
 const w=createWorkspace();w.setScenario('proposed-inclusive');const sources=new Set(w.run.evidenceRegistry.map(s=>s.id));
 for(const p of w.run.current.records){const b=w.run.explanations[p.id];assert.equal(b.activeStatus,p.status);for(const f of b.facts)assert.deepEqual(f.value,p[f.field]);for(const c of b.criteria){assert.ok(w.run.protocolConfig.rules.some(r=>r.id===c.ruleId));for(const id of c.sourceIds)assert.ok(sources.has(id));}for(const ref of b.sections.flatMap(s=>s.refs)){if(ref.kind==='field')assert.ok(b.facts.some(f=>f.field===ref.field));if(ref.kind==='criterion')assert.ok(p.evaluations.some(c=>c.criterionId===ref.criterionId));}}
});
test('gender and joint race/ethnicity preserve unique people, missing categories and denominator truth',()=>{
 const w=createWorkspace(),run=w.run;assert.deepEqual(run.demographics.map(d=>d.id),['gender','race_ethnicity','site']);for(const d of run.demographics){assert.equal(d.groups.reduce((n,g)=>n+g.screened,0),500);assert.equal(new Set(d.groups.flatMap(g=>g.ids)).size,500);}
 const html=renderCompositionComparison(run,'race_ethnicity');assert.match(html,/Race and ethnicity, together/);assert.ok(!html.includes('data-analysis-dimension="sex"'));assert.ok(!html.includes('data-analysis-dimension="race"'));assert.ok(!html.includes('data-analysis-dimension="ethnicity"'));assert.match(html,/Unknown/);assert.match(html,/Not collected/);assert.ok(!renderContext(run,w.state).includes('dataset-selector'));
});
test('identity fields do not change medical, participation or attention results',()=>{
 const p=sample(),q=sample();q.demographics={gender:{status:'recorded',value:'nonbinary'},race:{status:'recorded',value:'asian'},ethnicity:{status:'recorded',value:'hispanic'}};
 const a=evaluate(p),b=evaluate(q);assert.equal(a.status,b.status);assert.deepEqual(a.evaluations,b.evaluations);
 const w=createWorkspace();w.setScenario('proposed-inclusive');assert.ok(w.run.ranked.every(p=>p.status==='eligible'&&p.medicalStatus==='eligible'&&p.readinessStatus==='eligible'));assert.ok(!w.run.ranked.some(p=>['SYN-0002','SYN-0003','SYN-0004','SYN-0005','SYN-0006'].includes(p.id)));
});
test('review annotations keep medical and inclusion results unchanged and never approve missing evidence',()=>{
 const w=createWorkspace();w.setScenario('proposed-inclusive');w.selectPatient('SYN-0004');const run=w.run;
 const event=w.recordGuidanceReview({patientId:'SYN-0004',topicId:'accommodation',status:'reviewed',rationale:'Support is still pending in the fictional record.',evidenceNotes:'Task assessment and pending availability inspected.'});assert.equal(w.run,run);assert.equal(run.current.records[3].status,'indeterminate');assert.equal(event.after.activeMedicalStatus,'eligible');assert.ok(getGuidanceRows(run,w.state,'SYN-0004').find(r=>r.id==='accommodation').actualReview);
});
test('scratch profiles cover every domain and missing observations cannot become passing values',()=>{
 const form={...clean(),id:'EXTRA-501'};const result=validateUnifiedProfile(form,patients);assert.equal(result.valid,true);assert.equal(evaluateDraft(form,patients,true).proposed.status,'eligible');const w=createWorkspace();const id=w.addProfile({id:'MISSING-501'}).id;assert.equal(w.run.current.total,501);assert.equal(w.run.current.records.find(p=>p.id===id).status,'indeterminate');w.reset();assert.equal(w.run.current.total,500);assert.equal(validateUnifiedProfile({...form,ecog:1.2},patients).valid,false);assert.equal(validateUnifiedProfile({...form,units:{egfr_ml_min_1_73m2:'wrong-unit'}},patients).valid,false);
});


test('normalized exports preserve every phase and resolve explanation references without duplicating snapshots',()=>{
 const w=createWorkspace();w.setScenario('proposed-inclusive');const p=buildReviewPacket(w);assert.equal(p.schemaVersion,'2.0.0');assert.equal(p.analysis.original.records.length,500);assert.equal(p.analysis.proposed.records.length,500);assert.equal(p.analysis.current.records.length,500);assert.equal(p.analysis.patients.length,500);
 for(const [id,brief] of Object.entries(p.analysis.explanations)){assert.ok(p.analysis.patients.some(patient=>patient.id===brief.factsRef.patientId));const result=p.analysis[brief.criteriaRef.collection].records.find(patient=>patient.id===brief.criteriaRef.patientId);assert.equal(result.status,brief.activeStatus);for(const blocker of brief.blockers){if(blocker.textRef){const canonical=p.analysis[blocker.textRef.collection].records.find(r=>r.id===blocker.textRef.patientId).evaluations.find(c=>c.criterionId===blocker.textRef.criterionId);assert.ok(w.run.explanations[id].blockers.some(b=>b.text===canonical.reason));}}assert.deepEqual(result.evaluations,w.run.current.records.find(record=>record.id===id).evaluations.map(c=>Object.fromEntries(['criterionId','result','reason','ruleId','ruleVersion','value','sourceIds','applicability'].map(key=>[key,c[key]]))));}
 assert.deepEqual(p.decisionBrief,w.run.explanations[w.state.selectedPatientId]);assert.ok(Buffer.byteLength(JSON.stringify(p))<15000000);
});
