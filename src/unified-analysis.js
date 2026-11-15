import { unifiedStudy, unifiedSettings, unifiedProtocol, unifiedDomains, unifiedFields } from './unified-protocol.js';
import { evaluateUnifiedCohort } from './unified-cohort.js';
import { getReviewProfile, rankCandidates } from './ranking.js';
import { calculateComposition, calculateMissingness, demographicGroup } from './composition.js';
import { demographicDefinitions } from './synthetic-config.js';
import { sources } from './data.js';
import { guidanceSources, guidanceTopics, guidancePassages } from './guidance-sources.js';

const labels={eligible:'Meets modeled rules',excluded:'Excluded',indeterminate:'Indeterminate'};
const ref=c=>({kind:'criterion',criterionId:c.criterionId});
const factRef=field=>({kind:'field',field});
export function buildUnifiedBrief(run,record){
  const original=run.original.records.find(p=>p.id===record.id),proposed=run.proposed.records.find(p=>p.id===record.id);
  const failed=record.evaluations.filter(c=>c.result==='FAIL'),unknown=record.evaluations.filter(c=>c.result==='UNKNOWN'),changed=proposed.evaluations.filter(c=>c.changed&&c.result==='PASS');
  const facts=unifiedFields.map(f=>({field:f.id,label:f.label+(f.unit?` · ${f.unit}`:''),value:record[f.id]??null,date:record.factProvenance?.[f.id]?.date||null,provenance:record.factProvenance?.[f.id]?.kind||'Authored fictional observation',collectionStatus:record.collection_status?.[f.id]||'unknown'}));
  const blockers=[...failed.map(c=>({kind:c.scope==='participation'?'participation_requirement':'failed_criterion',text:c.reason,refs:[ref(c)]})),...unknown.map(c=>({kind:'unknown_criterion',text:c.reason,refs:[ref(c)]}))];
  if(run.current.gate.requested&&!run.current.gate.active)for(const text of run.current.gate.reasons)blockers.push({kind:'scenario_gate',text,refs:[{kind:'scenario',scenarioId:run.scenarioId}]});
  const inclusion=record.status==='eligible';
  const role=record.medicalStatus==='eligible'&&record.readinessStatus!=='eligible'?'Study coordinator / consent and methods reviewers':'Clinical reviewer / protocol team';
  const action={role,action:inclusion?'Review the complete inclusion record and real evidence applicability.':`Resolve the documented ${failed.length?'failed requirements and ':''}${unknown.length?'missing assessments':'remaining restrictions'} before reconsideration.`,requires:inclusion?'Actual study-specific evidence, qualified clinical review and enrollment authorization':'The listed patient observations, study requirements and documented review of every unresolved item',resolves:'Whether the modeled requirements and source applicability have been reviewed',doesNotResolve:'Automatic enrollment, drug safety or legal consent by inference',refs:[...failed.map(ref),...unknown.map(ref)]};
  const supporting=changed.map(c=>({kind:'Authored fictional protocol',sourceId:c.sourceIds[0],use:`${c.title}: the proposed rule passes with these recorded inputs.`,refs:[ref(c),...c.fields.map(factRef)]}));
  const remainingText=failed.length||unknown.length?`${failed.length} failed and ${unknown.length} unresolved requirements remain. Medical and participation results are shown separately; neither is replaced by an index.`:'Every modeled medical and participation requirement passes. Real drug evidence, full-protocol review and actual enrollment authorization remain outside this synthetic result.';
  const originalNonPass=original.evaluations.filter(c=>c.result!=='PASS');
  const changeText=changed.length?`${changed.length} configured requirements improve to PASS under Proposed. The linked rules and recorded observations explain each change; independent restrictions remain.`:'No failed original requirement becomes a passing proposed requirement for this record.';
  return {id:`${run.id}/${record.id}/unified-brief-v1`,version:'1.0.0',patientId:record.id,runId:run.id,studyId:run.studyId,datasetId:run.dataset.id,datasetVersion:run.datasetVersion,scenarioId:run.scenarioId,versions:run.configVersions,unified:true,protocol:run.protocol,
    recordedScreening:null,originalStatus:original.status,currentProtocolStatus:original.status,activeStatus:record.status,medicalStatus:record.medicalStatus,readinessStatus:record.readinessStatus,
    proposed:{available:true,status:proposed.status,active:run.current.gate.active,evaluations:proposed.evaluations},
    conclusion:inclusion?'Meets the modeled inclusion criteria.':record.status==='excluded'?'A required trial condition is not met.':'Inclusion remains unresolved.',
    reason:inclusion?`All ${record.evaluations.length} medical and participation checks pass or are explicitly not applicable. ${record.newlyEligible?'This patient newly meets the proposed protocol.':'This patient also meets the original modeled protocol.'}`:`${failed.length?'Not met: '+failed.slice(0,2).map(c=>c.title).join(' and ')+'. ':''}${unknown.length?'Information needed: '+unknown.slice(0,2).map(c=>c.title).join(' and ')+'. ':''}${record.medicalStatus==='eligible'?'Medical requirements pass; participation requirements still need resolution.':''}`,
    reasonRefs:[...failed,...unknown].map(ref),decisiveCriterionId:failed[0]?.criterionId||unknown[0]?.criterionId||null,
    recommendation:inclusion?'Qualified inclusion review':record.medicalStatus==='eligible'?'Complete participation review':'Review all remaining requirements',
    sections:[
      {id:'original',title:'Why the original decision was made',summary:originalNonPass.length?`The original protocol has ${originalNonPass.filter(c=>c.result==='FAIL').length} failures and ${originalNonPass.filter(c=>c.result==='UNKNOWN').length} unknowns. Its exact rules and inputs are preserved below.`:'All original modeled requirements pass. No separate screener statement is supplied.',refs:original.evaluations.map(ref)},
      {id:'reconsideration',title:'Why reconsideration may be warranted',summary:changeText,refs:changed.flatMap(c=>[ref(c),...c.fields.map(factRef)])},
      {id:'limits',title:'What still limits consideration',summary:remainingText,refs:blockers.flatMap(b=>b.refs)},
      {id:'next',title:'What needs to happen next',summary:`${role}: ${action.action} Review the complete trace; changing a displayed scenario never records clinical approval or automatically enrolls the patient in a trial.`,refs:action.refs},
      {id:'change',title:'How the result could change',summary:`Original: ${labels[original.status]}. Proposed inclusive: ${labels[proposed.status]}. The same patient observations are evaluated against both complete protocols.`,refs:[{kind:'scenario',scenarioId:'proposed-inclusive',configured:true}]},
    ],facts,criteria:record.evaluations,originalCriteria:original.evaluations,currentProtocolCriteria:original.evaluations,blockers,
    evidence:{supporting,retaining:failed.map(c=>({kind:'Configured requirement',sourceId:c.sourceIds[0],use:c.reason,refs:[ref(c)]})),unresolved:[{kind:'Applicability gap',use:'The unified policy and assessments are authored simulation data. General FDA guidance and source links do not establish real SYN-217 safety or authorize enrollment.',refs:[{kind:'source',sourceId:'FDA-2025-REP'}]}]},actions:[action],
    readiness:{status:record.readinessStatus==='eligible'?'ready_for_configured_tasks':record.readinessStatus==='excluded'?'not_ready':'pending',components:record.evaluations.filter(c=>c.scope==='participation').map(c=>({label:c.title,status:c.result==='PASS'?'satisfied':c.result==='FAIL'?'not_satisfied':'pending'})),reasons:record.evaluations.filter(c=>c.scope==='participation'&&c.result!=='PASS').map(c=>c.reason)},
  };
}
export function buildUnifiedRun({id,datasetVersion,scenarioId,patients,dataset}){
  const original=evaluateUnifiedCohort(patients),proposed=evaluateUnifiedCohort(patients,'proposed-inclusive');
  proposed.available=true;
  const current=scenarioId==='original'?original:scenarioId==='proposed-inclusive'?proposed:evaluateUnifiedCohort(patients,scenarioId);
  const group=(id,label,predicate)=>{const ids=patients.filter(predicate).map(p=>p.id);return {id,label,ids,screened:ids.length,original:original.records.filter(p=>ids.includes(p.id)&&p.status==='eligible').length,proposed:proposed.records.filter(p=>ids.includes(p.id)&&p.status==='eligible').length};};
  const subgroups=[group('HIV','HIV present',p=>p.hiv_status==='positive'),group('BRAIN','Brain metastases present',p=>p.brain_metastases_present===true),group('OLDER','Age 65+ or cardiac history',p=>p.age_years>=65||p.cardiac_history===true),group('ACCESS','Access support needed',p=>p.access_support_needed===true),group('COGNITIVE','Communication / consent support',p=>p.cognitive_support_needed===true),group('PRIOR','Other malignancy recorded',p=>p.other_malignancy===true),group('PREG','Pregnancy recorded',p=>p.pregnancy_status==='pregnant'),group('RENAL','eGFR below original boundary',p=>typeof p.egfr_ml_min_1_73m2==='number'&&p.egfr_ml_min_1_73m2<60)];
  const ageGroups=[group('under65','Under 65',p=>typeof p.age_years==='number'&&p.age_years<65),group('65to74','65–74',p=>p.age_years>=65&&p.age_years<75),group('75plus','75+',p=>p.age_years>=75),group('unknown','Age not recorded',p=>p.age_years==null)];
  const name=(field,value)=>demographicDefinitions.find(d=>d.id===field).categories.find(([id])=>id===value)?.[1]||({unknown:'Unknown',not_collected:'Not collected'}[value]);
  const pairs=[...new Set(patients.map(p=>`${demographicGroup(p,'race')}~${demographicGroup(p,'ethnicity')}`))].sort();
  const demographics=calculateComposition(patients,original,proposed).filter(d=>['gender','site'].includes(d.id));
  demographics.splice(1,0,{id:'race_ethnicity',label:'Race/Ethnicity',denominator:patients.length,joint:true,groups:pairs.map(pair=>{const [race,ethnicity]=pair.split('~');return {...group(pair,`${name('race',race)} · ${name('ethnicity',ethnicity)}`,p=>`${demographicGroup(p,'race')}~${demographicGroup(p,'ethnicity')}`===pair),race,ethnicity,raceLabel:name('race',race),ethnicityLabel:name('ethnicity',ethnicity),missing:['unknown','not_collected'].includes(race)||['unknown','not_collected'].includes(ethnicity)};})});
  const run={id,createdAt:new Date().toISOString(),unified:true,study:unifiedStudy,studyId:unifiedStudy.id,protocol:unifiedProtocol.protocol,protocolConfig:unifiedProtocol,domains:unifiedDomains,datasetVersion,dataset,scenarioId,patients,original,proposed,current,ageGroups,subgroups,demographics,missingness:calculateMissingness(patients),ranked:rankCandidates(current),profiles:Object.fromEntries(current.records.map(p=>[p.id,getReviewProfile(p)])),
    configVersions:{protocol:unifiedProtocol.protocol.version,scenarios:{'proposed-inclusive':'1.0.0'},rules:Object.fromEntries(unifiedProtocol.rules.map(r=>[r.id,r.version])),evidence:Object.fromEntries(unifiedProtocol.evidence.map(s=>[s.id,s.version])),scoring:'SYN217-REVIEW-ATTENTION-1.0.0-core-only',generator:unifiedSettings.version,explanations:'unified-1.0.0',guidanceMapping:'FDA-review-topics-1.0.0'},
    evidenceRegistry:[...new Map([...sources,...unifiedProtocol.evidence,...guidanceSources.map(s=>({...s,passages:guidancePassages.filter(p=>p.sourceId===s.id)}))].map(s=>[s.id,s])).values()],guidanceTopics,
  };
  run.explanations=Object.fromEntries(current.records.map(p=>[p.id,buildUnifiedBrief(run,p)]));
  for(const record of current.records){const profile=run.profiles[record.id];profile.scope='Partial core-factor attention index; not a risk model for the added domains.';profile.nextSteps=run.explanations[record.id].actions.map(action=>({id:'unified-qualified-review',title:action.action,detail:action.requires,sourceIds:[...new Set(record.evaluations.flatMap(c=>c.sourceIds))]}));}
  run.ranked=run.ranked.map(record=>({...record,review:run.profiles[record.id]}));return run;
}

export function exportUnifiedAnalysis(run){
  const select=(value,keys)=>Object.fromEntries(keys.map(key=>[key,value[key]]));
  const evaluation=criterion=>select(criterion,['criterionId','result','reason','ruleId','ruleVersion','value','sourceIds','applicability']);
  const phase=cohort=>({...select(cohort,['total','eligible','excluded','indeterminate','newlyEligible','statusChanged','gate']),records:cohort.records.map(record=>({...select(record,['id','status','medicalStatus','readinessStatus','newlyEligible']),evaluations:record.evaluations.map(evaluation)}))});
  const explanation=brief=>({...select(brief,['id','version','patientId','runId','scenarioId','originalStatus','activeStatus','medicalStatus','readinessStatus','conclusion','reason','recommendation','sections','actions','readiness']),
    blockers:brief.blockers.map(blocker=>{const criterion=blocker.refs.find(ref=>ref.kind==='criterion');return criterion?{kind:blocker.kind,refs:blocker.refs,textRef:{collection:run.current.gate.active?'proposed':'original',patientId:brief.patientId,criterionId:criterion.criterionId}}:blocker;}),
    evidence:{...brief.evidence,retaining:brief.evidence.retaining.map(item=>{const criterion=item.refs.find(ref=>ref.kind==='criterion');return {...select(item,['kind','sourceId','refs']),useRef:{collection:run.current.gate.active?'proposed':'original',patientId:brief.patientId,criterionId:criterion.criterionId}};})},
    factsRef:{collection:'patients',patientId:brief.patientId},criteriaRef:{collection:run.current.gate.active?'proposed':'original',patientId:brief.patientId},proposed:{available:true,status:brief.proposed.status,active:brief.proposed.active}});
  return {...select(run,['id','createdAt','unified','study','studyId','protocol','protocolConfig','domains','dataset','datasetVersion','scenarioId','configVersions','patients','ageGroups','subgroups','demographics','missingness','chartGroups','evidenceRegistry','guidanceTopics']),
    fieldDefinitions:unifiedFields,original:phase(run.original),proposed:phase(run.proposed),
    current:{...select(run.current,['total','eligible','excluded','indeterminate','newlyEligible','statusChanged','gate']),evaluationsFrom:run.current.gate.active?'proposed':'original',records:run.current.records.map(record=>({...select(record,['id','status','medicalStatus','readinessStatus','newlyEligible','qualityIssues']),domainResults:record.domainResults.map(domain=>select(domain,['id','status','result','notApplicable']))}))},
    explanations:Object.fromEntries(Object.entries(run.explanations).map(([id,brief])=>[id,explanation(brief)])),
    profiles:Object.fromEntries(Object.entries(run.profiles).map(([id,profile])=>[id,{...select(profile,['score','rawScore','unrankedReason','missingInputs','scope']),components:profile.components.map(component=>select(component,['id','points']))}])),
    ranked:run.ranked.map(record=>({id:record.id,rank:record.rank,score:record.review.score})),
  };
}
