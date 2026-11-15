import { generateShowcase } from './synthetic-cohort.js';
import { evaluateCohort } from './cohort.js';
import { unifiedProtocol, unifiedSettings, unifiedFields, unifiedDomains } from './unified-protocol.js';

export const aggregateResults = evaluations => evaluations.some(item=>item.result==='FAIL')?'excluded':evaluations.some(item=>item.result==='UNKNOWN')||!evaluations.length?'indeterminate':'eligible';
const fieldNames=Object.fromEntries(unifiedFields.map(f=>[f.id,f.label+(f.unit?` (${f.unit})`:'')]));
const fieldPattern=new RegExp('\\b('+unifiedFields.map(f=>f.id).join('|')+')\\b','g');
const humanReason=reason=>reason.replace(fieldPattern,id=>fieldNames[id]).replaceAll('_',' ');
const day = 86400000;
const conflicting=(record,field)=>Array.isArray(record.conflicts)?record.conflicts.includes(field):record.conflicts?.[field]===true;
const validDate = value => typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
export function prepareUnifiedPatient(patient, config=unifiedProtocol, settings=unifiedSettings) {
  const inputs={...patient},issues={};
  for(const field of unifiedFields){
    const value=patient[field.id],conflict=conflicting(patient,field.id);
    let issue=conflict?'Conflicting observations require review.':value==null?'Observation not supplied.':null;
    if(!issue&&field.type==='number'&&(typeof value!=='number'||!Number.isFinite(value)||value<field.min||field.max!==undefined&&value>field.max||field.integer&&!Number.isInteger(value)))issue='Invalid numeric observation; no coercion is applied.';
    if(!issue&&field.type==='boolean'&&typeof value!=='boolean')issue='An explicit yes/no assessment is required.';
    if(!issue&&field.type==='select'&&!field.options.includes(value))issue='Unrecognized assessment category.';
    if(!issue&&field.type==='date'&&!validDate(value))issue='Collection date is invalid.';
    if(!issue&&value==='pending')issue='Assessment or support confirmation is pending.';
    if(!issue&&field.labDate){
      const date=patient[field.labDate];
      if(conflicting(patient,field.labDate))issue='Conflicting collection dates require review.';
      else if(patient.units?.[field.id]!==field.unit)issue=`Correct units (${field.unit}) are required; no conversion is inferred.`;
      else if(!validDate(date))issue='A valid collection date is required.';
      else {const age=(Date.parse(settings.asOfDate)-Date.parse(date))/day;if(age<0)issue='Collection is after the fixed cohort as-of date.';else if(age>config.thresholds.labMaxAgeDays)issue=`Sample is ${age} days old; the authored limit is ${config.thresholds.labMaxAgeDays} days.`;}
    }
    if(issue){inputs[field.id]=null;issues[field.id]=issue;}
  }
  return {inputs,issues};
}
const notApplicable = (id,record) => id==='HIV'&&record.hiv_status==='negative'||id==='BRAIN'&&record.brain_metastases_present===false||id==='PRIOR'&&record.other_malignancy===false||id==='OLDER_HISTORY'&&record.cardiac_history===false||id==='PREG'&&record.pregnancy_status==='not_applicable'&&record.pregnancy_nonapplicability_documented===true;
export function evaluateUnifiedCohort(patients,scenario='original',config=unifiedProtocol,settings=unifiedSettings){
  const prepared=patients.map(patient=>prepareUnifiedPatient(patient,config,settings));
  const result=evaluateCohort(prepared.map(item=>item.inputs),scenario==='original'?false:scenario,config);
  result.records=result.records.map((record,index)=>{
    const raw=patients[index],quality=prepared[index].issues;
    const decorate=evaluations=>evaluations.map(item=>{
      const criterion=config.protocol.criteria.find(c=>c.id===item.criterionId);
      const required=Object.keys(item.value||{}).filter(field=>item.result==='UNKNOWN'&&quality[field]);
      const na=item.result==='PASS'&&notApplicable(item.criterionId,raw);
      return {...item,domain:criterion.domain,scope:criterion.scope,fields:criterion.fields,applicability:na?'not_applicable':'assessed',reason:na?`${criterion.title}: explicitly absent / clinically not applicable; related assessments are not inferred.`:`${criterion.title}: ${humanReason(item.reason)}${required.length?' '+required.map(field=>`${unifiedFields.find(f=>f.id===field)?.label||field}: ${quality[field]}`).join(' '):''}`};
    });
    const evaluations=decorate(record.evaluations),originalEvaluations=decorate(record.originalEvaluations);
    const medicalStatus=aggregateResults(evaluations.filter(c=>c.scope==='medical')),readinessStatus=aggregateResults(evaluations.filter(c=>c.scope==='participation'));
    const domainResults=unifiedDomains.map(domain=>{const checks=evaluations.filter(c=>c.domain===domain.id);return {...domain,status:aggregateResults(checks),result:checks.some(c=>c.result==='FAIL')?'FAIL':checks.some(c=>c.result==='UNKNOWN')?'UNKNOWN':'PASS',notApplicable:checks.every(c=>c.applicability==='not_applicable'),checks};});
    return {...raw,...record,...Object.fromEntries(unifiedFields.map(field=>[field.id,raw[field.id]??null])),evaluations,originalEvaluations,original:{...record.original,evaluations:originalEvaluations},medicalStatus,readinessStatus,domainResults,qualityIssues:quality,
      exclusionReasons:evaluations.filter(c=>c.result==='FAIL').map(c=>c.reason),missingData:evaluations.filter(c=>c.result==='UNKNOWN').map(c=>c.reason),
      inclusionReasons:evaluations.filter(c=>c.result==='PASS').map(c=>({criterionId:c.criterionId,domain:c.domain,scope:c.scope,reason:c.reason,ruleId:c.ruleId,ruleVersion:c.ruleVersion,sourceIds:c.sourceIds,applicability:c.applicability})),
    };
  });
  return result;
}

const randomFor = (seed,index) => {let n=(seed^Math.imul(index+1,2654435761))>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};};
const clean = () => ({age_years:46,cancer_type:'nsclc',cancer_stage:'advanced',prior_systemic_lines:1,ecog:0,hepatic_status:'normal',strong_cyp3a_inhibitor:false,medication_review:'no_concern',clinically_unstable_cardiac_disease:false,controlled_hypertension:false,stable_type2_diabetes:false,stable_cardiac_history:false,
  hiv_status:'negative',viral_load:null,viral_load_collection_date:null,cd4_value:null,cd4_collection_date:null,suppression_days:null,art_interaction_review:null,
  brain_metastases_present:false,brain_treatment_accepted:null,brain_stability_days:null,neurological_symptoms_controlled:null,neurological_drug_concern:null,
  cardiac_history:false,comorbidity_assessment:'none',access_support_needed:false,tasks_independent:true,accommodation_status:'not_needed',tasks_supported:null,procedure_review:'accepted',
  cognitive_support_needed:false,cognitive_support_status:'not_needed',consent_status:'accepted',consent_independent:true,consent_method:'standard',assessment_method_review:'accepted',
  other_malignancy:false,other_cancer_endpoint_interference:null,other_cancer_safety_concern:null,other_cancer_treatment_interaction:null,
  pregnancy_status:'not_applicable',pregnancy_nonapplicability_documented:true,egfr_ml_min_1_73m2:80,egfr_collection_date:'2026-10-27',renal_stable:true});
const mixed = () => ({...clean(),age_years:76,ecog:1,hepatic_status:'mild',controlled_hypertension:true,stable_cardiac_history:true,cardiac_history:true,comorbidity_assessment:'controlled',
  hiv_status:'positive',viral_load:80,viral_load_collection_date:'2026-10-27',cd4_value:420,cd4_collection_date:'2026-10-27',suppression_days:120,art_interaction_review:'no_concern',
  brain_metastases_present:true,brain_treatment_accepted:false,brain_stability_days:42,neurological_symptoms_controlled:true,neurological_drug_concern:false,
  access_support_needed:true,tasks_independent:false,accommodation_status:'confirmed',tasks_supported:true,cognitive_support_needed:true,cognitive_support_status:'confirmed',consent_independent:false,consent_method:'assisted_reviewed',
  other_malignancy:true,other_cancer_endpoint_interference:false,other_cancer_safety_concern:false,other_cancer_treatment_interaction:false,egfr_ml_min_1_73m2:52});
const anchors = [mixed,{...mixed(),strong_cyp3a_inhibitor:true},{...mixed(),cd4_value:null},{...mixed(),accommodation_status:'pending',tasks_supported:null},{...mixed(),consent_status:'pending'},{...mixed(),age_years:34,pregnancy_status:'pregnant',pregnancy_nonapplicability_documented:false},clean];
export function generateUnifiedCohort(overrides={}){
  const settings={...unifiedSettings,...overrides};
  if(!Number.isInteger(settings.count)||settings.count<0||settings.count>10000||!Number.isInteger(settings.seed)||!validDate(settings.asOfDate))throw new TypeError('Use an integer count (0–10000), seed and valid fixed as-of date.');
  const bases=generateShowcase({count:settings.count,seed:settings.seed,asOfDate:settings.asOfDate});
  const date=new Date(Date.parse(settings.asOfDate)-5*day).toISOString().slice(0,10);
  return bases.map((base,index)=>{
    const r=randomFor(settings.seed,index);let p={...base,...clean(),...Object.fromEntries(['age_years','egfr_ml_min_1_73m2','ecog','hepatic_status','strong_cyp3a_inhibitor','clinically_unstable_cardiac_disease','controlled_hypertension','stable_type2_diabetes','stable_cardiac_history','renal_stable'].map(key=>[key,base[key]]))};
    p.cardiac_history=base.stable_cardiac_history;p.comorbidity_assessment=base.clinically_unstable_cardiac_disease===true?'uncontrolled':base.stable_cardiac_history||base.controlled_hypertension||base.stable_type2_diabetes?'controlled':'none';
    p.medication_review=r()<.04?'pending':'no_concern';
    if(r()<.23)Object.assign(p,{hiv_status:'positive',viral_load:r()<.82?Math.round(r()*150):400,viral_load_collection_date:date,cd4_value:r()<.85?200+Math.floor(r()*500):130,cd4_collection_date:date,suppression_days:r()<.85?90+Math.floor(r()*300):40,art_interaction_review:r()<.9?'no_concern':'pending'});
    if(r()<.27)Object.assign(p,{brain_metastases_present:true,brain_treatment_accepted:r()<.5,brain_stability_days:r()<.82?28+Math.floor(r()*140):14,neurological_symptoms_controlled:r()<.93,neurological_drug_concern:r()<.04});
    if(r()<.32)Object.assign(p,{access_support_needed:true,tasks_independent:false,accommodation_status:r()<.82?'confirmed':'pending',tasks_supported:true});
    if(r()<.18)Object.assign(p,{cognitive_support_needed:true,cognitive_support_status:r()<.86?'confirmed':'pending',consent_independent:false,consent_method:'assisted_reviewed'});
    if(r()<.23)Object.assign(p,{other_malignancy:true,other_cancer_endpoint_interference:r()<.05,other_cancer_safety_concern:r()<.05,other_cancer_treatment_interaction:r()<.05});
    if(r()<.25)Object.assign(p,{pregnancy_status:(r()<.07&&p.age_years<=45)?'pregnant':'not_pregnant',pregnancy_nonapplicability_documented:false});
    p.egfr_collection_date=date;
    if(r()<.035)p.cd4_value=null;if(r()<.025)p.egfr_collection_date=new Date(Date.parse(settings.asOfDate)-40*day).toISOString().slice(0,10);
    if(index<anchors.length)p={...base,...(typeof anchors[index]==='function'?anchors[index]():anchors[index])};
    for(const f of unifiedFields)if(f.type==='date'&&p[f.id]!=null&&(index<anchors.length||p[f.id]==='2026-10-27'))p[f.id]=date;
    p.id=`SYN-${String(index+1).padStart(4,'0')}`;p.note=index<7?['Multiple inclusion pathways','Retained interaction restriction','Missing CD4 observation','Accommodation confirmation pending','Consent review pending','Pregnancy restriction','All original requirements satisfied'][index]:'Mixed-domain synthetic record';
    p.units={...unifiedProtocol.units};p.measurements=unifiedFields.filter(f=>f.labDate&&p[f.id]!=null).map(f=>({field:f.id,value:p[f.id],unit:f.unit,date:p[f.labDate],kind:'authored-synthetic-observation'}));p.demographics={...base.demographics};delete p.demographics.sex;
    p.provenance={type:index<7?'hand-authored-anchor':'seeded-mixed-profile',synthetic:true,version:settings.version,seed:settings.seed,asOfDate:settings.asOfDate};
    p.factProvenance=Object.fromEntries(unifiedFields.map(f=>[f.id,{kind:f.type==='boolean'||f.type==='select'?'Explicit fictional observation / assessment':'Authored synthetic observation',date:f.labDate?p[f.labDate]:settings.asOfDate}]));
    p.collection_status=Object.fromEntries(unifiedFields.map(f=>[f.id,p[f.id]==null?'unknown':'recorded']));
    return p;
  });
}
export function validateUnifiedProfile(draft,existing=[]){
  const errors={},record={id:typeof draft.id==='string'?draft.id.trim():''};
  if(!/^[A-Za-z][A-Za-z0-9_-]{0,23}$/.test(record.id)||existing.some(p=>p.id.toLowerCase()===record.id.toLowerCase()))errors.id='Use a unique synthetic ID (up to 24 letters, numbers, underscores or hyphens).';
  for(const f of unifiedFields){let value=draft[f.id];if(value==null||value===''||value==='unknown'||value==='not_collected')value=null;else if(f.type==='number'&&typeof value==='string'&&/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))value=Number(value);else if(f.type==='boolean'&&['true','false'].includes(value))value=value==='true';record[f.id]=value;
    if(value!=null&&(f.type==='number'&&(typeof value!=='number'||!Number.isFinite(value)||value<0||f.max!==undefined&&value>f.max||f.integer&&!Number.isInteger(value))||f.type==='boolean'&&typeof value!=='boolean'||f.type==='select'&&!f.options.includes(value)||f.type==='date'&&!validDate(value)))errors[f.id]='Supply a valid value or leave this observation unknown.';
  }
  if(draft.units!==undefined&&(!draft.units||typeof draft.units!=='object'||Array.isArray(draft.units)))errors.units='Supply a field-to-unit object.';
  for(const f of unifiedFields.filter(f=>f.unit))if(draft.units?.[f.id]!==undefined&&draft.units[f.id]!==f.unit)errors[f.id]=`Use ${f.unit}; no unit conversion is inferred.`;
  record.units={...unifiedProtocol.units};record.note='Explicitly entered fictional profile';record.demographics={};record.provenance={type:'user-authored-synthetic-profile',synthetic:true,asOfDate:unifiedSettings.asOfDate};
  record.factProvenance=Object.fromEntries(unifiedFields.map(f=>[f.id,{kind:'Explicitly entered fictional observation / assessment',date:f.labDate?record[f.labDate]:unifiedSettings.asOfDate}]));
  return {valid:!Object.keys(errors).length,record,errors};
}
