import {study} from './data.js';

const context = (scenario = 'proposed-inclusive', patientId = 'SYN-0001', perspective = 'patient', detailTab = 'overview') => ({dataset:'unified',studyId:study.id,scenario,patientId,perspective,detailTab});

// Holds are speaking/reading time; loading, transitions and manual pauses do not consume them.
export const defaultPresentation = {
  id:'exclusion-to-evidence', title:'Cohort — From Exclusion to Evidence', dataset:'unified',
  scenes:[
    {id:'study',title:'Introduce the study',holdMs:15000,required:true,context:context('original'),target:'population',view:{population:'overview'},
      caption:'Understand why a patient was excluded—and what would justify reconsideration.',
      notes:'Introduce the fictional SYN-217 study and the one shared 500-patient cohort. The visible counts are calculated by the application.'},
    {id:'patient',title:'Meet SYN-0001',holdMs:25000,required:true,context:context('original'),target:'original-reason',view:{brief:'original'},
      caption:'Start with the specific reason for exclusion.',
      notes:'Separate the computed original multi-domain result from a recorded screener statement. This fixture supplies no original screener quotation.'},
    {id:'evidence',title:'Inspect the evidence',holdMs:35000,required:true,context:context('original','SYN-0001','patient','criteria'),target:'evidence-passage',view:{evidenceId:'DEMO-POLICY-HIV'},
      caption:'Inspect the authored policy and its remaining evidence gaps.',
      notes:'Read the authored fictional HIV policy and its applicability limits. This is a simulation assumption, not empirical drug evidence or clinical approval.'},
    {id:'scenario',title:'Apply the proposed scenario',holdMs:20000,required:true,context:context(),target:'patient-conclusion',
      caption:'See what changes—and which restrictions remain.',
      notes:'The existing complete proposed inclusive protocol is applied. Discuss the actual classification and population transition after the animation settles.'},
    {id:'priority',title:'Explain the review priority',holdMs:25000,required:false,context:context(),target:'attention-breakdown',view:{attention:true},
      caption:'Make the review priorities explainable.',
      notes:'Discuss the existing contributing factors. Keep the index’s unvalidated, not-a-probability label in view.'},
    {id:'restriction',title:'A restriction that remains',holdMs:25000,required:true,context:context('proposed-inclusive','SYN-0002','patient','criteria'),target:'medication-rule',
      caption:'One revised criterion does not override another restriction.',
      notes:'SYN-0002 retains the independent medication-interaction failure. The presentation does not recommend changing medication.'},
    {id:'unresolved',title:'An unresolved record',holdMs:20000,required:true,context:context('proposed-inclusive','SYN-0003'),target:'remaining-limits',view:{brief:'limits'},
      caption:'Missing information remains an open question.',
      notes:'The proposed protocol leaves a required CD4 observation unresolved. Indeterminate is distinct from matching and exclusion.'},
    {id:'population',title:'The trial-wide effect',holdMs:35000,required:true,context:context('proposed-inclusive','SYN-0001','trial'),target:'eligibility-flow',view:{analysis:'eligibility',group:'flow:excluded:eligible'},
      caption:'Understand the effect on the whole candidate population.',
      notes:'Compare original and proposed results using the visible denominator. The highlighted transition contains actual patient IDs; not every changed requirement produces a full match.'},
    {id:'composition',title:'The people behind the total',holdMs:30000,required:false,context:context('proposed-inclusive','SYN-0001','trial'),target:'age-composition',view:{analysis:'composition',dimension:'age'},
      beats:[{at:.5,action:'inspect-group',group:'composition:age:75plus:proposed',target:'patient-records'}],
      caption:'Look beyond the total to the people behind it.',
      notes:'Distinguish group composition from within-group matching. The shared cohort supplies recorded Gender and a combined Race/Ethnicity view, without a reference population or diversity score.'},
    {id:'guidance',title:'Guidance alignment and open questions',holdMs:30000,required:true,context:context('proposed-inclusive','SYN-0001','decision'),target:'guidance-matrix',
      beats:[{at:1/3,action:'guidance-documented',target:'guidance-documented'},{at:2/3,action:'guidance-unresolved',target:'guidance-unresolved'}],
      caption:'See what is documented—and what still requires review.',
      notes:'Show actual documentation status separately from substantive review. Opening a topic is not a reviewer approval and creates no disposition.'},
    {id:'trace',title:'Inspect every inclusion requirement',holdMs:25000,required:true,context:context('proposed-inclusive','SYN-0001','trial'),target:'inclusion-matrix',view:{analysis:'matrix'},
      caption:'One patient is evaluated against every domain.',
      notes:'Inspect Core, HIV, BRAIN, OLDER, ACCESS, COGNITIVE, PRIOR, PREG and RENAL on the same record. Select a cell for its source observations and exact rules.'},
    {id:'report',title:'A reason you can inspect',holdMs:15000,required:true,context:context('proposed-inclusive','SYN-0001','decision'),target:'report-summary',view:{report:true},
      caption:'Every exclusion. Every proposed change. A reason you can inspect.',
      notes:'The actual report preserves recommendations, restrictions, unresolved issues and source context. Nothing is printed or downloaded automatically.'},
  ].map(scene=>({readiness:'analysis-and-target-settled',...scene})),
};

export const presentationDuration = scenes => scenes.reduce((sum,scene)=>sum+scene.holdMs,0);
export const formatPresentationDuration = milliseconds => `${Math.floor(milliseconds/60000)} min ${Math.round(milliseconds%60000/1000)} sec`;
