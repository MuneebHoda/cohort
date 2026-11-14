import { demographicDefinitions } from './synthetic-config.js';

export function demographicGroup(record, field) {
  const entry = record.demographics?.[field];
  if (!entry || entry.status === 'not_collected') return 'not_collected';
  if (entry.status !== 'recorded' || entry.value === null) return 'unknown';
  return demographicDefinitions.find(item => item.id === field)?.categories.some(([id]) => id === entry.value) ? entry.value : 'unknown';
}

export function calculateComposition(patients, original, proposed) {
  const originalIds = new Set(original.records.filter(record => record.status === 'eligible').map(record => record.id));
  const proposedIds = new Set(proposed.records.filter(record => record.status === 'eligible').map(record => record.id));
  return demographicDefinitions.map(definition => ({ ...definition, denominator: patients.length,
    groups: [...definition.categories, ['unknown', 'Unknown'], ['not_collected', 'Not collected']].map(([id, label], index) => {
      const ids = patients.filter(record => demographicGroup(record, definition.id) === id).map(record => record.id);
      return { id, label, ids, screened: ids.length, original: ids.filter(id => originalIds.has(id)).length, proposed: ids.filter(id => proposedIds.has(id)).length, missing: ['unknown', 'not_collected'].includes(id), colorToken: ['unknown', 'not_collected'].includes(id) ? '--category-missing' : `--category-${index % 6 + 1}` };
    }),
  }));
}

export function calculateMissingness(patients) {
  return ['age_years', 'egfr_ml_min_1_73m2', 'ecog', 'hepatic_status', 'renal_stable', 'strong_cyp3a_inhibitor', 'clinically_unstable_cardiac_disease', 'controlled_hypertension', 'stable_type2_diabetes', 'stable_cardiac_history'].map(field => {
    const unknown = patients.filter(record => record[field] === null || record[field] === undefined);
    const notCollected = unknown.filter(record => record.collection_status?.[field] === 'not_collected').length;
    return { field, label: field.replaceAll('_', ' '), unknown: unknown.length - notCollected, notCollected, total: unknown.length, denominator: patients.length };
  });
}
