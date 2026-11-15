import {study} from './data.js';

const context = (scenario = 'renal-revision', patientId = 'P03', perspective = 'patient', detailTab = 'overview') => ({dataset:'casebook',studyId:study.id,scenario,patientId,perspective,detailTab});

// Holds are speaking/reading time; loading, transitions and manual pauses do not consume them.
export const defaultPresentation = {
  id:'exclusion-to-evidence', title:'Cohort — From Exclusion to Evidence', dataset:'casebook',
  scenes:[
    {id:'study',title:'Introduce the study',holdMs:15000,required:true,context:context('original'),target:'population',view:{population:'overview'},
      caption:'Understand why a patient was excluded—and what would justify reconsideration.',
      notes:'Introduce the fictional SYN-217 study and the reproducible reference cohort. The visible counts are calculated by the application.'},
    {id:'patient',title:'Meet P03',holdMs:25000,required:true,context:context('original'),target:'original-reason',view:{brief:'original'},
      caption:'Start with the specific reason for exclusion.',
      notes:'Separate the computed original renal result from a recorded screener statement. This fixture supplies no original screener quotation.'},
    {id:'evidence',title:'Inspect the evidence',holdMs:35000,required:true,context:context('original','P03','patient','criteria'),target:'evidence-passage',view:{evidenceId:'SYN-PK-02'},
      caption:'Connect the proposed change to supporting evidence.',
      notes:'Read the authored fictional renal PK summary and its applicability limits. A single measurement and a synthetic stability flag do not establish longitudinal stability.'},
    {id:'scenario',title:'Apply the proposed scenario',holdMs:20000,required:true,context:context(),target:'patient-conclusion',
      caption:'See what changes—and which restrictions remain.',
      notes:'The existing evidence-gated renal scenario is applied. Discuss the actual classification and population transition after the animation settles.'},
    {id:'priority',title:'Explain the review priority',holdMs:25000,required:false,context:context(),target:'attention-breakdown',view:{attention:true},
      caption:'Make the review priorities explainable.',
      notes:'Discuss the existing contributing factors. Keep the index’s unvalidated, not-a-probability label in view.'},
    {id:'restriction',title:'A restriction that remains',holdMs:25000,required:true,context:context('renal-revision','P06','patient','criteria'),target:'medication-rule',
      caption:'One revised criterion does not override another restriction.',
      notes:'P06 retains the independent medication-interaction failure. The presentation does not recommend changing medication.'},
    {id:'unresolved',title:'An unresolved record',holdMs:20000,required:true,context:context('renal-revision','P16'),target:'remaining-limits',view:{brief:'limits'},
      caption:'Missing information remains an open question.',
      notes:'The proposed renal change leaves required hepatic information unresolved. Indeterminate is distinct from matching and exclusion.'},
    {id:'population',title:'The trial-wide effect',holdMs:35000,required:true,context:context('renal-revision','P03','trial'),target:'eligibility-flow',view:{analysis:'eligibility',group:'flow:excluded:eligible'},
      caption:'Understand the effect on the whole candidate population.',
      notes:'Compare original and proposed results using the visible denominator. The highlighted transition contains actual patient IDs; not every renal failure becomes a match.'},
    {id:'composition',title:'The people behind the total',holdMs:30000,required:false,context:context('renal-revision','P03','trial'),target:'age-composition',view:{analysis:'composition',dimension:'age'},
      beats:[{at:.5,action:'inspect-group',group:'composition:age:75plus:proposed',target:'patient-records'}],
      caption:'Look beyond the total to the people behind it.',
      notes:'Distinguish group composition from within-group matching. The reference fixture supplies age, not a demographic benchmark or diversity score.'},
    {id:'guidance',title:'Guidance alignment and open questions',holdMs:30000,required:true,context:context('renal-revision','P03','decision'),target:'guidance-matrix',
      beats:[{at:1/3,action:'guidance-documented',target:'guidance-documented'},{at:2/3,action:'guidance-unresolved',target:'guidance-unresolved'}],
      caption:'See what is documented—and what still requires review.',
      notes:'Show actual documentation status separately from substantive review. Opening a topic is not a reviewer approval and creates no disposition.'},
    {id:'trace',title:'Trace the recorded decision',holdMs:25000,required:false,context:context('renal-revision','P03','decision'),target:'decision-trace',view:{trace:'source'},
      beats:[{at:.25,action:'trace',step:'criterion',target:'decision-trace'},{at:.5,action:'trace',step:'inputs',target:'decision-trace'},{at:.75,action:'trace',step:'outcomes',target:'decision-trace'}],
      caption:'Follow the decision back to its evidence.',
      notes:'Source → versioned rule → observed inputs → criterion result. This is the recorded calculation, not simulated AI thinking.'},
    {id:'report',title:'A reason you can inspect',holdMs:15000,required:true,context:context('renal-revision','P03','decision'),target:'report-summary',view:{report:true},
      caption:'Every exclusion. Every proposed change. A reason you can inspect.',
      notes:'The actual report preserves recommendations, restrictions, unresolved issues and source context. Nothing is printed or downloaded automatically.'},
  ].map(scene=>({readiness:'analysis-and-target-settled',...scene})),
};

export const presentationDuration = scenes => scenes.reduce((sum,scene)=>sum+scene.holdMs,0);
export const formatPresentationDuration = milliseconds => `${Math.floor(milliseconds/60000)} min ${Math.round(milliseconds%60000/1000)} sec`;
