import { clinicalConfig } from './clinical-fixture.js';
import { anchorPatients, generateCohort } from './patients.js';
import { evaluateCohort, evaluatePatient } from './cohort.js';
import { getReviewProfile, rankCandidates } from './ranking.js';
import { reviewConfig } from './review-fixture.js';
import { sources } from './data.js';

const booleanFields = ['strong_cyp3a_inhibitor', 'clinically_unstable_cardiac_disease', 'controlled_hypertension', 'stable_type2_diabetes', 'stable_cardiac_history', 'renal_stable'];
const ageDefinitions = [['under65', 'Under 65', age => age < 65], ['65to74', '65–74', age => age >= 65 && age < 75], ['75plus', '75+', age => age >= 75], ['unknown', 'Age not recorded', () => false]];
const filtersInitial = () => ({ status: 'all', age: 'all', subgroup: 'all', query: '' });
const blank = value => value === undefined || value === null || typeof value === 'string' && (!value.trim() || value.trim().toLowerCase() === 'unknown');
const knownNumber = value => typeof value === 'number' && Number.isFinite(value);
const clone = value => structuredClone(value);
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
const conflict = (record, field) => Array.isArray(record.conflicts) ? record.conflicts.includes(field) : record.conflicts?.[field] === true;
const knownRenal = record => knownNumber(record.egfr_ml_min_1_73m2) && record.egfr_ml_min_1_73m2 >= 0 && !conflict(record, 'egfr_ml_min_1_73m2') && (!record.units?.egfr_ml_min_1_73m2 || record.units.egfr_ml_min_1_73m2 === clinicalConfig.units.egfr_ml_min_1_73m2);
function ageFor(record) {
  if (!knownNumber(record.age_years) || record.age_years < 0 || conflict(record, 'age_years')) return 'unknown';
  return ageDefinitions.find(([, , matches]) => matches(record.age_years))[0];
}

function groups(patients, original, proposed, definitions) {
  const originals = new Set(original.records.filter(record => record.status === 'eligible').map(record => record.id));
  const proposals = new Set(proposed.records.filter(record => record.status === 'eligible').map(record => record.id));
  return definitions.map(([id, label, matches]) => {
    const ids = patients.filter(matches).map(record => record.id);
    return { id, label, screened: ids.length, original: ids.filter(value => originals.has(value)).length, proposed: ids.filter(value => proposals.has(value)).length, ids };
  });
}

function makeRun(id, datasetVersion, scenarioId, patients) {
  const records = clone(patients);
  const original = evaluateCohort(records, false);
  const proposed = evaluateCohort(records, 'renal-revision');
  const current = scenarioId === 'original' ? original : scenarioId === 'renal-revision' ? proposed : evaluateCohort(records, scenarioId);
  const ageGroups = groups(records, original, proposed, ageDefinitions.map(([key, label]) => [key, label, record => ageFor(record) === key]));
  const subgroups = groups(records, original, proposed, [
    ['renal-window', `eGFR ${clinicalConfig.thresholds.renalProposedMin}–<${clinicalConfig.thresholds.renalOriginalMin}`, record => knownRenal(record) && record.egfr_ml_min_1_73m2 >= clinicalConfig.thresholds.renalProposedMin && record.egfr_ml_min_1_73m2 < clinicalConfig.thresholds.renalOriginalMin],
    ['mild-hepatic', 'Mild hepatic impairment', record => record.hepatic_status === 'mild' && !conflict(record, 'hepatic_status')],
    ['ecog1', 'ECOG 1', record => record.ecog === 1 && !conflict(record, 'ecog')],
    ['hypertension', 'Controlled hypertension', record => record.controlled_hypertension === true && !conflict(record, 'controlled_hypertension')],
    ['diabetes', 'Stable type 2 diabetes', record => record.stable_type2_diabetes === true && !conflict(record, 'stable_type2_diabetes')],
    ['cardiac-history', 'Stable cardiac history', record => record.stable_cardiac_history === true && !conflict(record, 'stable_cardiac_history')],
    ['unknown-renal', 'Renal assessment unresolved', record => !knownRenal(record)],
  ]);
  return freeze({ id, createdAt: new Date().toISOString(), datasetVersion, scenarioId, patients: records, original, proposed, current,
    ranked: rankCandidates(current), profiles: Object.fromEntries(current.records.map(record => [record.id, getReviewProfile(record)])), ageGroups, subgroups,
    configVersions: { protocol: clinicalConfig.protocol.version, scenarios: Object.fromEntries(clinicalConfig.scenarios.map(scenario => [scenario.id, scenario.version])), rules: Object.fromEntries(clinicalConfig.rules.map(rule => [rule.id, rule.version])), evidence: Object.fromEntries(clinicalConfig.evidence.map(source => [source.id, source.version || source.date || 'unversioned'])), scoring: reviewConfig.version, adapter: 'anchor-renal-stability-assumption-v1' },
  });
}

export function visibleRecords(run, filters = {}) {
  const { status = 'all', age = 'all', subgroup = 'all', query = '' } = filters;
  const subgroupIds = subgroup === 'all' ? null : new Set(run.subgroups.find(group => group.id === subgroup)?.ids || []);
  const ordered = [...run.current.records].sort((a, b) => String(a.id).localeCompare(String(b.id), 'en', { numeric: true }) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const rankedIds = new Set(run.ranked.map(record => record.id));
  const records = status === 'new' ? [...run.ranked, ...ordered.filter(record => record.newlyEligible && !rankedIds.has(record.id))] : ordered;
  return records.filter(record => (status === 'all' || status === 'new' || record.status === status)
    && (age === 'all' || ageFor(record) === age) && (!subgroupIds || subgroupIds.has(record.id))
    && String(record.id).toLowerCase().includes(String(query).trim().toLowerCase()));
}

export function validateProfile(draft, existingRecords = []) {
  const input = draft && typeof draft === 'object' && !Array.isArray(draft) ? draft : {};
  const errors = {};
  const record = { id: typeof input.id === 'string' ? input.id.trim() : '' };
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,23}$/.test(record.id)) errors.id = 'Use a synthetic ID beginning with a letter and containing up to 24 letters, numbers, underscores or hyphens.';
  else if (existingRecords.some(item => String(item.id).toLowerCase() === record.id.toLowerCase())) errors.id = 'That patient ID already exists in the working cohort.';
  for (const field of ['age_years', 'egfr_ml_min_1_73m2', 'ecog']) {
    let value = input[field];
    if (blank(value)) value = null;
    else if (typeof value === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim())) value = Number(value);
    record[field] = value;
    if (value !== null && (!knownNumber(value) || (field === 'ecog' ? !Number.isInteger(value) || value < 0 || value > 5 : value < 0))) errors[field] = field === 'ecog' ? 'ECOG must be an integer from 0 to 5, or unknown.' : 'Enter a finite nonnegative measurement, or leave it unknown.';
  }
  record.hepatic_status = blank(input.hepatic_status) ? null : typeof input.hepatic_status === 'string' ? input.hepatic_status.trim().toLowerCase() : input.hepatic_status;
  if (record.hepatic_status !== null && !['normal', 'mild', 'moderate', 'severe'].includes(record.hepatic_status)) errors.hepatic_status = 'Choose normal, mild, moderate, severe, or unknown.';
  for (const field of booleanFields) {
    let value = input[field];
    if (blank(value)) value = null;
    else if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['yes', 'true'].includes(normalized)) value = true;
      else if (['no', 'false'].includes(normalized)) value = false;
    }
    record[field] = value;
    if (![true, false, null].includes(value)) errors[field] = 'Choose yes, no, or unknown.';
  }
  if (input.units !== undefined && (!input.units || typeof input.units !== 'object' || Array.isArray(input.units))) errors.units = 'Units must be a field-to-unit object.';
  record.units = { ...clinicalConfig.units };
  for (const [field, expected] of Object.entries(clinicalConfig.units)) {
    const supplied = input.units?.[field] ?? (field === 'egfr_ml_min_1_73m2' ? input.egfr_unit : undefined);
    if (supplied !== undefined && supplied !== expected) errors[`units.${field}`] = `Use ${expected}; automatic unit conversion is unavailable.`;
  }
  if (input.egfr_unit !== undefined && input.egfr_unit !== clinicalConfig.units.egfr_ml_min_1_73m2) errors['units.egfr_ml_min_1_73m2'] = `Use ${clinicalConfig.units.egfr_ml_min_1_73m2}; automatic unit conversion is unavailable.`;
  return { valid: Object.keys(errors).length === 0, record, errors };
}

export function evaluateDraft(draft, existingRecords = []) {
  const result = validateProfile(draft, existingRecords);
  if (!result.valid) return { ...result, original: null, proposed: null, profile: null };
  const original = { ...result.record, ...evaluatePatient(result.record, false) };
  const proposed = { ...result.record, ...evaluatePatient(result.record, true) };
  return { ...result, original, proposed, profile: getReviewProfile(proposed) };
}

export function createWorkspace() {
  const bases = { casebook: clone(anchorPatients), expanded: generateCohort(120, 217) };
  const additions = { casebook: [], expanded: [] };
  const revisions = { casebook: 0, expanded: 0 };
  const subscribers = new Set();
  let state = freeze({ perspective: 'patient', selectedPatientId: 'P03', selectedEvidenceId: null, scenarioId: 'original', dataset: 'casebook', datasetVersion: 'casebook-v1', analysisRunId: '', filters: filtersInitial(), detailTab: 'overview' });
  let runs = freeze([]);
  let events = freeze([]);
  let run;
  const update = partial => { state = freeze({ ...state, ...partial }); };
  const notify = () => { for (const fn of subscribers) fn(state, run); };
  function log(type, reason, affectedIds = [], extra = {}) {
    const event = freeze({ id: `EVT-${String(events.length + 1).padStart(3, '0')}`, type, actor: 'Demo reviewer', authenticated: false, timestamp: new Date().toISOString(), reason, runId: run.id, datasetVersion: run.datasetVersion, scenarioId: run.scenarioId, versions: run.configVersions, affectedIds: [...affectedIds], ...extra });
    events = freeze([...events, event]);
    return event;
  }
  function analyze(type, reason, extra = {}) {
    const previous = run;
    run = makeRun(`RUN-${String(runs.length + 1).padStart(3, '0')}`, state.datasetVersion, state.scenarioId, [...bases[state.dataset], ...additions[state.dataset]]);
    runs = freeze([...runs, run]);
    update({ analysisRunId: run.id, selectedPatientId: run.patients.some(record => record.id === state.selectedPatientId) ? state.selectedPatientId : run.patients.find(record => record.id === 'P03')?.id || run.patients[0]?.id || null });
    const affectedIds = previous ? run.current.records.filter(record => {
      const prior = previous.current.records.find(item => item.id === record.id);
      return !prior || prior.status !== record.status || prior.evaluations.some((evaluation, index) => evaluation.result !== record.evaluations[index]?.result);
    }).map(record => record.id).concat(previous.current.records.filter(record => !run.patients.some(item => item.id === record.id)).map(record => record.id)) : run.patients.map(record => record.id);
    log(type, reason, [...new Set(affectedIds)], extra);
  }
  analyze('initialized', 'Opened the supplied synthetic casebook with original protocol rules.');
  return {
    get state() { return state; }, get run() { return run; }, get events() { return events; }, get runs() { return runs; },
    subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
    setPerspective(value) { if (!['patient', 'trial', 'decision'].includes(value)) throw new TypeError('Unknown workspace perspective.'); if (value !== state.perspective) { update({ perspective: value }); notify(); } },
    selectPatient(id) { if (!run.patients.some(record => record.id === id)) throw new TypeError('Unknown patient ID.'); if (id !== state.selectedPatientId) { update({ selectedPatientId: id }); notify(); } },
    setFilters(partial) {
      const filters = { ...state.filters };
      for (const key of Object.keys(filters)) if (Object.hasOwn(partial, key)) filters[key] = String(partial[key] ?? '');
      if (!['all', 'new', 'eligible', 'excluded', 'indeterminate'].includes(filters.status) || !['all', ...ageDefinitions.map(([id]) => id)].includes(filters.age) || !['all', ...run.subgroups.map(group => group.id)].includes(filters.subgroup)) throw new TypeError('Unknown cohort filter.');
      if (Object.keys(filters).some(key => filters[key] !== state.filters[key])) { update({ filters }); notify(); }
    },
    setScenario(id) {
      if (id !== 'original' && !clinicalConfig.scenarios.some(scenario => scenario.id === id)) throw new TypeError('Unknown scenario.');
      if (id === state.scenarioId) return;
      const priorScenarioId = state.scenarioId;
      update({ scenarioId: id }); analyze('scenario-changed', id === 'original' ? 'Restored original protocol rules.' : 'Requested the predefined synthetic scenario; evidence gates determine whether its rule is applied.', { priorScenarioId, newScenarioId: id }); notify();
    },
    setDataset(value) {
      if (!Object.hasOwn(bases, value)) throw new TypeError('Unknown synthetic dataset.');
      if (value === state.dataset) return;
      update({ dataset: value, datasetVersion: additions[value].length ? `${value}-working-${revisions[value]}` : `${value}-v1` });
      analyze('dataset-changed', `Opened the ${value} synthetic dataset.`); notify();
    },
    setDetailTab(tab) { if (!['overview', 'criteria', 'evidence', 'pathway'].includes(tab)) throw new TypeError('Unknown patient detail tab.'); if (tab !== state.detailTab) { update({ detailTab: tab }); notify(); } },
    setEvidence(idOrNull) { if (idOrNull !== null && !sources.some(source => source.id === idOrNull)) throw new TypeError('Unknown evidence ID.'); if (idOrNull !== state.selectedEvidenceId) { update({ selectedEvidenceId: idOrNull }); notify(); } },
    addProfile(draft) {
      const result = validateProfile(draft, run.patients);
      if (!result.valid) { const error = new Error('The synthetic profile contains invalid fields.'); error.errors = result.errors; throw error; }
      additions[state.dataset].push(clone(result.record));
      revisions[state.dataset] += 1;
      update({ datasetVersion: `${state.dataset}-working-${revisions[state.dataset]}`, selectedPatientId: result.record.id });
      analyze('profile-added', 'Explicitly added a structured synthetic profile to the working cohort.'); notify(); return clone(result.record);
    },
    recordDisposition({ patientId, disposition, reason }) {
      if (!run.patients.some(record => record.id === patientId)) throw new TypeError('Unknown patient ID.');
      if (!['reviewed', 'further-review'].includes(disposition)) throw new TypeError('Unknown review disposition.');
      if (typeof reason !== 'string' || !reason.trim()) throw new TypeError('A review rationale is required.');
      const event = log('disposition-recorded', reason.trim(), [patientId], { patientId, disposition }); notify(); return event;
    },
    reset() {
      additions.casebook = []; additions.expanded = [];
      const priorScenarioId = state.scenarioId;
      update({ perspective: 'patient', selectedPatientId: 'P03', selectedEvidenceId: null, scenarioId: 'original', dataset: 'casebook', datasetVersion: 'casebook-v1', filters: filtersInitial(), detailTab: 'overview' });
      analyze('reset', 'Restored the unchanged 20-record casebook and original protocol. Prior session history is retained.', { priorScenarioId, newScenarioId: 'original' }); notify();
    },
  };
}
