import { writeFile } from 'node:fs/promises';
import { generateShowcase } from '../src/synthetic-cohort.js';
import { showcaseConfig } from '../src/synthetic-config.js';
import { evaluateCohort } from '../src/cohort.js';
import { calculateComposition, calculateMissingness } from '../src/composition.js';
import { rankCandidates } from '../src/ranking.js';

const args = process.argv.slice(2);
const options = {};
let output;
for (let index = 0; index < args.length; index += 2) {
  const flag = args[index], value = args[index + 1];
  if (!value || !['--seed', '--count', '--as-of', '--output'].includes(flag)) throw new Error('Use --seed INTEGER --count INTEGER --as-of YYYY-MM-DD [--output FILE].');
  if (flag === '--seed') options.seed = Number(value);
  if (flag === '--count') options.count = Number(value);
  if (flag === '--as-of') options.asOfDate = value;
  if (flag === '--output') output = value;
}
const config = { ...showcaseConfig, ...options };
const patients = generateShowcase(options);
const original = evaluateCohort(patients, false);
const proposed = evaluateCohort(patients, true);
const counts = result => ({ matching: result.eligible, excluded: result.excluded, indeterminate: result.indeterminate, total: result.total });
const summary = { generator: config.id, version: config.version, seed: config.seed, asOfDate: config.asOfDate, count: patients.length, original: counts(original), proposed: counts(proposed), newlyMatching: proposed.newlyEligible, ranked: rankCandidates(proposed).length, composition: calculateComposition(patients, original, proposed).map(dimension => ({ field: dimension.id, categories: dimension.groups.map(({ id, screened, original, proposed }) => ({ id, screened, original, proposed })) })), missingness: calculateMissingness(patients), disclaimer: 'Synthetic showcase assumptions, not epidemiology, clinical validation or enrollment approval.' };
if (output) await writeFile(output, JSON.stringify({ summary, patients }, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
