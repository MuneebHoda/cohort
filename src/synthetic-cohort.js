import { showcaseConfig, demographicDefinitions } from './synthetic-config.js';
import { clinicalConfig } from './clinical-fixture.js';

function randomStream(seed, index, salt) {
  let value = (seed ^ Math.imul(index + 1, 0x9e3779b9) ^ salt) >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}
const weighted = (rows, random, weightIndex = 1) => {
  let target = random() * rows.reduce((sum, row) => sum + row[weightIndex], 0);
  return rows.find(row => (target -= row[weightIndex]) < 0) || rows.at(-1);
};
const integer = (range, random) => range[0] + Math.floor(random() * (range[1] - range[0] + 1));
const decimal = (range, random) => Math.round((range[0] + random() * (range[1] - range[0])) * 10) / 10;
const collectionStatus = (rates, random) => { const value = random(); return value < rates[0] ? 'unknown' : value < rates[0] + rates[1] ? 'not_collected' : 'recorded'; };

export function generateShowcase(overrides = {}) {
  const config = { ...showcaseConfig, ...overrides };
  if (!Number.isInteger(config.count) || config.count < 0 || config.count > 10000) throw new RangeError('Synthetic count must be an integer from 0 to 10000.');
  if (!Number.isInteger(config.seed)) throw new TypeError('A fixed integer seed is required.');
  const asOf = new Date(`${config.asOfDate}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(config.asOfDate) || !Number.isFinite(+asOf) || asOf.toISOString().slice(0, 10) !== config.asOfDate) throw new TypeError('Use a valid fixed as-of date in YYYY-MM-DD format.');
  if (!config.clinicalProfiles.length || config.clinicalProfiles.some(p => !Number.isFinite(p.weight) || p.weight <= 0)) throw new TypeError('Clinical profiles require positive authored weights.');
  const category = (field, value) => demographicDefinitions.find(item => item.id === field).categories.some(([id]) => id === value);
  for (const [field, rows] of [['race', config.raceWeights], ['ethnicity', config.ethnicityWeights], ['site', config.siteWeights]]) {
    if (!rows.length || rows.some(([value, weight]) => !category(field, value) || !Number.isFinite(weight) || weight <= 0)) throw new TypeError(`Invalid ${field} categories or weights in generation configuration.`);
  }
  if (!config.sexGenderPairs.length || config.sexGenderPairs.some(([sex, gender, weight]) => !category('sex', sex) || !category('gender', gender) || !Number.isFinite(weight) || weight <= 0)) throw new TypeError('Invalid sex/gender categories or weights in generation configuration.');
  return Array.from({ length: config.count }, (_, index) => {
    const clinical = randomStream(config.seed, index, 0x217);
    const metadata = randomStream(config.seed, index, 0xd3a0);
    const profile = weighted(config.clinicalProfiles.map(p => [p, p.weight]), clinical)[0];
    const unstable = clinical() < profile.unstableCardiac;
    const record = {
      id: `SYN-${String(index + 1).padStart(4, '0')}`, age_years: integer(profile.age, clinical), egfr_ml_min_1_73m2: decimal(profile.egfr, clinical),
      ecog: weighted(profile.ecog, clinical)[0], hepatic_status: weighted(profile.hepatic, clinical)[0],
      strong_cyp3a_inhibitor: clinical() < profile.interaction, clinically_unstable_cardiac_disease: unstable,
      renal_stable: clinical() < profile.stableRenal, controlled_hypertension: clinical() < profile.hypertension,
      stable_type2_diabetes: clinical() < profile.diabetes, stable_cardiac_history: !unstable && clinical() < profile.cardiacHistory,
      units: { ...clinicalConfig.units }, collection_status: {},
      note: profile.label,
      provenance: { synthetic: true, type: 'generated', profileId: profile.id, generatorId: config.id, generatorVersion: config.version, seed: config.seed, asOfDate: config.asOfDate, renalStability: 'Authored synthetic flag; no longitudinal stability inference.' },
    };
    for (const [field, rates] of Object.entries(config.missingness)) {
      const status = collectionStatus(rates, clinical); record.collection_status[field] = status;
      if (status !== 'recorded') record[field] = null;
    }
    const measured = new Date(+asOf - integer([3, 28], clinical) * 86400000).toISOString().slice(0, 10);
    record.measurements = record.egfr_ml_min_1_73m2 === null ? [] : [{ field: 'egfr_ml_min_1_73m2', value: record.egfr_ml_min_1_73m2, unit: clinicalConfig.units.egfr_ml_min_1_73m2, date: measured, usedByEngine: true }];
    const pair = weighted(config.sexGenderPairs, metadata, 2);
    const values = { sex: pair[0], gender: pair[1], race: weighted(config.raceWeights, metadata)[0], ethnicity: weighted(config.ethnicityWeights, metadata)[0], site: weighted(config.siteWeights, metadata)[0] };
    record.demographics = { synthetic: true, provenance: 'explicit_seeded_showcase_assumptions', configurationVersion: config.version };
    for (const [field, value] of Object.entries(values)) {
      const status = collectionStatus(config.demographicMissingness, metadata);
      record.demographics[field] = { status, value: status === 'recorded' ? value : null };
    }
    return record;
  });
}
