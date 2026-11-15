import { clinicalConfig } from './clinical-fixture.js';

export const unifiedStudy = {
  id:'DEMO-SYN217-03', title:'SYN-217 Unified Oncology Trial', drug:'SYN-217', phase:3,
  indication:'Advanced non-small-cell lung cancer after prior systemic therapy',
  scope:'One fictional trial. Medical, task, consent and support requirements are modeled for every patient. A modeled match is not enrollment approval.',
};
export const unifiedSettings = {id:'SYN217-UNIFIED',version:'1.0.0',seed:217,count:500,asOfDate:'2026-11-01'};
export const unifiedDomains = [
  ['CORE','Core requirements','Oncology, function and fixed restrictions'],['HIV','HIV','Infection, immune assessment and interactions'],
  ['BRAIN','Brain metastases','Treatment, stability and neurological review'],['OLDER','Age & comorbidities','Current function and controlled conditions'],
  ['ACCESS','Access','Required tasks and confirmed accommodations'],['COGNITIVE','Consent & support','Consent process and assessment method'],
  ['PRIOR','Other malignancy','Non-index cancer and interference'],['PREG','Pregnancy','Documented pregnancy assessment'],['RENAL','Renal function','Measurement, currency and stability'],
].map(([id,label,description])=>({id,label,description}));
export const unifiedThresholds = {adultMin:18,originalAgeMax:75,egfrOriginalMin:60,egfrProposedMin:45,ecogMax:1,viralLoadMaxExclusive:200,cd4Min:200,suppressionDaysMin:90,brainStabilityDaysMin:28,labMaxAgeDays:30};
const units = {...clinicalConfig.units,viral_load:'copies/mL',cd4_value:'cells/µL'};
const field = (id,label,domain,type,extra={})=>({id,label,domain,type,...extra});
const boolean = (id,label,domain)=>field(id,label,domain,'boolean');
const choice = (id,label,domain,options)=>field(id,label,domain,'select',{options});
const number = (id,label,domain,extra={})=>field(id,label,domain,'number',{min:0,...extra});
export const unifiedFields = [
  number('age_years','Age','CORE',{max:120}), choice('cancer_type','Index cancer','CORE',['nsclc','other']),choice('cancer_stage','Index cancer stage','CORE',['advanced','other']),number('prior_systemic_lines','Prior systemic treatment lines','CORE',{integer:true}),
  number('ecog','ECOG grade','CORE',{integer:true,max:5}),choice('hepatic_status','Hepatic assessment','CORE',['normal','mild','moderate','severe']),
  boolean('strong_cyp3a_inhibitor','Strong CYP3A inhibitor','CORE'),choice('medication_review','Medication interaction assessment','CORE',['no_concern','relevant_concern','pending']),boolean('clinically_unstable_cardiac_disease','Active unstable cardiac disease','CORE'),
  boolean('controlled_hypertension','Controlled hypertension','CORE'),boolean('stable_type2_diabetes','Stable type 2 diabetes','CORE'),boolean('stable_cardiac_history','Stable cardiac history','CORE'),
  choice('hiv_status','HIV status','HIV',['negative','positive']),number('viral_load','Viral load','HIV',{unit:units.viral_load,labDate:'viral_load_collection_date'}),field('viral_load_collection_date','Viral load collection date','HIV','date'),
  number('cd4_value','CD4 count','HIV',{unit:units.cd4_value,labDate:'cd4_collection_date'}),field('cd4_collection_date','CD4 collection date','HIV','date'),number('suppression_days','Documented suppression duration (days)','HIV',{integer:true}),choice('art_interaction_review','Antiretroviral interaction assessment','HIV',['no_concern','relevant_concern','pending']),
  boolean('brain_metastases_present','Brain metastases present','BRAIN'),boolean('brain_treatment_accepted','Documented accepted treatment assessment','BRAIN'),number('brain_stability_days','Documented clinical stability (days)','BRAIN',{integer:true}),boolean('neurological_symptoms_controlled','Neurological symptoms controlled / absent','BRAIN'),boolean('neurological_drug_concern','Relevant neurological drug concern','BRAIN'),
  boolean('cardiac_history','Cardiac history','OLDER'),choice('comorbidity_assessment','Current comorbidity assessment','OLDER',['none','controlled','uncontrolled']),
  boolean('access_support_needed','Task-specific access support needed','ACCESS'),boolean('tasks_independent','Required tasks satisfied independently','ACCESS'),choice('accommodation_status','Actual accommodation availability','ACCESS',['not_needed','confirmed','pending','unavailable']),boolean('tasks_supported','Required tasks satisfied with support','ACCESS'),choice('procedure_review','Required procedure review','ACCESS',['accepted','not_accepted','pending']),
  boolean('cognitive_support_needed','Communication / cognitive support needed','COGNITIVE'),choice('cognitive_support_status','Actual communication support availability','COGNITIVE',['not_needed','confirmed','pending','unavailable']),choice('consent_status','Documented consent-process review','COGNITIVE',['accepted','not_accepted','pending']),boolean('consent_independent','Consent process satisfied independently','COGNITIVE'),choice('consent_method','Reviewed consent method','COGNITIVE',['standard','assisted_reviewed','not_accepted','pending']),choice('assessment_method_review','Required assessment-method review','COGNITIVE',['accepted','not_accepted','pending']),
  boolean('other_malignancy','Prior/concurrent malignancy other than index NSCLC','PRIOR'),boolean('other_cancer_endpoint_interference','Other malignancy interferes with endpoints','PRIOR'),boolean('other_cancer_safety_concern','Relevant other-malignancy safety concern','PRIOR'),boolean('other_cancer_treatment_interaction','Relevant other-cancer treatment interaction','PRIOR'),
  choice('pregnancy_status','Recorded pregnancy assessment','PREG',['not_pregnant','pregnant','not_applicable']),boolean('pregnancy_nonapplicability_documented','Clinical non-applicability explicitly documented','PREG'),
  number('egfr_ml_min_1_73m2','eGFR','RENAL',{unit:units.egfr_ml_min_1_73m2,labDate:'egfr_collection_date'}),field('egfr_collection_date','eGFR collection date','RENAL','date'),boolean('renal_stable','Explicitly documented stable renal assessment','RENAL'),
];
const eq=(field,value)=>({field,operator:'equals',value});
const gte=(field,value)=>({field,operator:'gte',value,min:0});
const lte=(field,value)=>({field,operator:'lte',value,min:0});
const oneOf=(field,value)=>({field,operator:'in',value});
const all=(...conditions)=>({operator:'all',conditions});
const any=(...conditions)=>({operator:'any',conditions});
const t=unifiedThresholds;
const definitions = [
 ['ADULT','CORE','medical','Adult population',gte('age_years',t.adultMin),null,'Age ≥18.'],
 ['INDICATION','CORE','medical','Index oncology requirements',all(eq('cancer_type','nsclc'),eq('cancer_stage','advanced'),gte('prior_systemic_lines',1)),null,'Advanced NSCLC with at least one prior systemic treatment line.'],
 ['ECOG','CORE','medical','Performance status',lte('ecog',t.ecogMax),null,'ECOG grade 0–1.'],
 ['HEPATIC','CORE','medical','Hepatic assessment',oneOf('hepatic_status',['normal','mild']),null,'Normal or mild hepatic assessment.'],
 ['DDI','CORE','medical','Medication interactions',all(eq('strong_cyp3a_inhibitor',false),eq('medication_review','no_concern')),null,'No strong CYP3A inhibitor; completed medication review identifies no relevant concern.'],
 ['CARDIAC','CORE','medical','Cardiac stability',eq('clinically_unstable_cardiac_disease',false),null,'No active unstable cardiac disease.'],
 ['HIV','HIV','medical','HIV inclusion pathway',eq('hiv_status','negative'),any(eq('hiv_status','negative'),all(eq('hiv_status','positive'),{...lte('viral_load',t.viralLoadMaxExclusive),operator:'lt'},gte('cd4_value',t.cd4Min),gte('suppression_days',t.suppressionDaysMin),eq('art_interaction_review','no_concern'))),'Original: HIV-positive status excludes. Proposed: negative, or viral load <200 copies/mL, CD4 ≥200 cells/µL, suppression ≥90 days and no relevant ART interaction.'],
 ['BRAIN','BRAIN','medical','Brain-metastasis inclusion pathway',eq('brain_metastases_present',false),any(eq('brain_metastases_present',false),all(eq('brain_metastases_present',true),any(eq('brain_treatment_accepted',true),gte('brain_stability_days',t.brainStabilityDaysMin)),eq('neurological_symptoms_controlled',true),eq('neurological_drug_concern',false))),'Original: brain metastases exclude. Proposed: absent, or accepted treatment OR stability ≥28 days, controlled/absent neurological symptoms and no relevant concern.'],
 ['OLDER_AGE','OLDER','medical','Age policy',lte('age_years',t.originalAgeMax),gte('age_years',t.adultMin),'Original: age ≤75. Proposed: no upper age limit; the adult and functional requirements still apply.'],
 ['OLDER_HISTORY','OLDER','medical','Controlled cardiac history',eq('cardiac_history',false),any(eq('cardiac_history',false),all(eq('cardiac_history',true),eq('comorbidity_assessment','controlled'))),'Original: cardiac history excludes. Proposed: an explicitly controlled history is permitted; unstable cardiac disease still fails.'],
 ['COMORBIDITY','OLDER','medical','Current comorbidity assessment',oneOf('comorbidity_assessment',['none','controlled']),null,'Current comorbidities are explicitly absent or controlled.'],
 ['ACCESS_TASKS','ACCESS','participation','Required task completion',eq('tasks_independent',true),any(eq('tasks_independent',true),all(eq('accommodation_status','confirmed'),eq('tasks_supported',true))),'Original: required tasks satisfied independently. Proposed: independently OR with confirmed, task-specific support and documented task completion.'],
 ['ACCESS_PROCEDURE','ACCESS','participation','Required procedures',eq('procedure_review','accepted'),null,'Required procedure review is explicitly accepted. Pending review is unknown.'],
 ['CONSENT','COGNITIVE','participation','Consent process',all(eq('consent_status','accepted'),eq('consent_independent',true),eq('consent_method','standard')),all(eq('consent_status','accepted'),any(all(eq('consent_independent',true),eq('consent_method','standard')),all(eq('consent_method','assisted_reviewed'),eq('cognitive_support_status','confirmed')))),'Original: accepted independent standard consent process. Proposed: that process OR an explicitly accepted assisted method with confirmed support.'],
 ['COG_METHOD','COGNITIVE','participation','Assessment method and support',all(eq('assessment_method_review','accepted'),any(eq('cognitive_support_needed',false),eq('cognitive_support_status','confirmed'))),null,'The assessment method is accepted and any required communication support is actually confirmed.'],
 ['PRIOR','PRIOR','medical','Other-malignancy inclusion pathway',eq('other_malignancy',false),any(eq('other_malignancy',false),all(eq('other_malignancy',true),eq('other_cancer_endpoint_interference',false),eq('other_cancer_safety_concern',false),eq('other_cancer_treatment_interaction',false))),'Original: another prior/concurrent malignancy excludes. Proposed: permitted when explicit endpoint, safety and treatment assessments identify no relevant interference. Index NSCLC is not this other malignancy.'],
 ['PREG','PREG','medical','Pregnancy assessment',any(eq('pregnancy_status','not_pregnant'),all(eq('pregnancy_status','not_applicable'),eq('pregnancy_nonapplicability_documented',true))),null,'Not pregnant OR explicitly documented clinical non-applicability. Gender never determines this result. Pregnancy remains a restriction in both protocols.'],
 ['RENAL','RENAL','medical','Renal inclusion pathway',gte('egfr_ml_min_1_73m2',t.egfrOriginalMin),all(gte('egfr_ml_min_1_73m2',t.egfrProposedMin),eq('renal_stable',true)),'Original: eGFR ≥60. Proposed: eGFR ≥45 mL/min/1.73 m² with an explicitly documented stable renal assessment.'],
];
export const predicateFields = predicate => predicate.conditions ? [...new Set(predicate.conditions.flatMap(predicateFields))] : [predicate.field];
const rules = definitions.flatMap(([id,domain,scope,title,original,proposed])=>[[`unified-${id}-original-v1`,original],...(proposed?[[`unified-${id}-proposed-v1`,proposed]]:[])].map(([ruleId,predicate])=>({id:ruleId,version:'1.0.0',criterionId:id,...predicate,sourceIds:[`DEMO-POLICY-${domain}`]})));
export const unifiedProtocol = {
  syntheticOnly:true, thresholds:t, units,
  protocol:{id:'SYN217-UNIFIED-PROTOCOL',version:'1.0.0',syntheticOnly:true,wording:'Authored fictional protocol; medical and participation requirements must all pass. Not a clinically validated protocol.',criteria:definitions.map(([id,domain,scope,title,original,proposed,wording])=>({id,domain,scope,title,fixed:!proposed,kind:'inclusion',ruleId:`unified-${id}-original-v1`,original:wording,fields:[...new Set([...predicateFields(original),...(proposed?predicateFields(proposed):[])])],sourceIds:[`DEMO-POLICY-${domain}`]}))},
  rules,
  evidence:unifiedDomains.map(domain=>({id:`DEMO-POLICY-${domain.id}`,title:`SYN-217 authored ${domain.label.toLowerCase()} policy`,type:'authored-demo-assumption',status:'supporting',version:'1.0.0',fictional:true,verified:false,scope:'software simulation only',note:'Authored protocol assumptions, not empirical drug evidence, FDA criteria or clinical approval.',supportsRuleIds:rules.filter(rule=>rule.sourceIds.includes(`DEMO-POLICY-${domain.id}`)).map(rule=>rule.id)})),
  scenarios:[{id:'proposed-inclusive',label:'Proposed inclusive protocol',version:'1.0.0',status:'approved-demo',syntheticOnly:true,revisions:definitions.filter(row=>row[5]).map(([id,domain])=>({criterionId:id,ruleId:`unified-${id}-proposed-v1`,evidenceIds:[`DEMO-POLICY-${domain}`]}))}],
};
