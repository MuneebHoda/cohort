import { writeFile, mkdir } from 'node:fs/promises';
import { generateUnifiedCohort, evaluateUnifiedCohort } from '../src/unified-cohort.js';
import { unifiedSettings, unifiedStudy, unifiedProtocol } from '../src/unified-protocol.js';
if(process.argv.length>2)throw new Error('This export uses the versioned unifiedSettings and unifiedProtocol data. Edit those settings, then run npm run generate.');
const patients=generateUnifiedCohort(),original=evaluateUnifiedCohort(patients),proposed=evaluateUnifiedCohort(patients,'proposed-inclusive');
const counts=c=>({meets:c.eligible,excluded:c.excluded,indeterminate:c.indeterminate,total:c.total});
const document={syntheticOnly:true,study:unifiedStudy,generator:unifiedSettings,protocol:unifiedProtocol,summary:{original:counts(original),proposed:counts(proposed),newlyMatching:proposed.newlyEligible},patients};
await mkdir('data',{recursive:true});await writeFile('data/syn217-unified.json',JSON.stringify(document,null,2)+'\n');console.log(JSON.stringify(document.summary));
