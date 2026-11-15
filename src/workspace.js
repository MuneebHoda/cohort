import { unifiedProtocol, unifiedSettings } from './unified-protocol.js';
import { generateUnifiedCohort, validateUnifiedProfile, evaluateUnifiedCohort } from './unified-cohort.js';
import { buildUnifiedRun } from './unified-analysis.js';
import { clinicalConfig } from './clinical-fixture.js';
import { anchorPatients } from './patients.js';
import { generateShowcase } from './synthetic-cohort.js';
import { showcaseConfig, demographicDefinitions } from './synthetic-config.js';
import { calculateComposition, calculateMissingness, demographicGroup } from './composition.js';
import { evaluateCohort, evaluatePatient } from './cohort.js';
import { getReviewProfile, rankCandidates } from './ranking.js';
import { reviewConfig } from './review-fixture.js';
import { study } from './data.js';
import { casePackDefinitions, generateCasePack, investigationSettings, routeDefinitions } from './case-packs.js';
import { evaluateInvestigationPack } from './investigation.js';
import { attachDecisionBriefs } from './decision-brief.js';
import { getGuidanceRows, guidanceReviewKey } from './guidance-review.js';
import { guidanceReviewStatuses } from './guidance-sources.js';
import { buildAnalysisGroups } from './analysis-model.js';

const booleanFields = ['strong_cyp3a_inhibitor', 'clinically_unstable_cardiac_disease', 'controlled_hypertension', 'stable_type2_diabetes', 'stable_cardiac_history', 'renal_stable'];
const ageDefinitions = [['under65', 'Under 65', age => age < 65], ['65to74', '65–74', age => age >= 65 && age < 75], ['75plus', '75+', age => age >= 75], ['unknown', 'Age not recorded', () => false]];
const filtersInitial = () => ({ status: 'all', age: 'all', subgroup: 'all', query: '', demographic: 'all' });
export const queuePageSize = 25;
export const reviewActions = [
  ['clinical-review', 'Flag for clinical review'], ['missing-information', 'Request missing information'],
  ['retain-restriction', 'Retain current restriction'], ['reviewer-note', 'Record reviewer note'],
];
export const datasetDefinitions = {
  unified:{id:'unified',unified:true,label:'SYN-217 · One unified trial',shortLabel:'Unified cohort',baselineCount:500,version:'unified-v1.0.0-seed217',initialPatientId:'SYN-0001',seed:217,asOfDate:unifiedSettings.asOfDate,configVersion:'1.0.0'},
  casebook: { id: 'casebook', label: 'Reference case — 20 synthetic patients', shortLabel: 'Reference case', baselineCount: 20, version: 'casebook-v1', initialPatientId: 'P03', seed: null, asOfDate: null, configVersion: '1.0.0' },
  expanded: { id: 'expanded', label: `Expanded cohort — ${showcaseConfig.count} synthetic patients`, shortLabel: 'Expanded cohort', baselineCount: showcaseConfig.count, version: `expanded-v${showcaseConfig.version}-seed${showcaseConfig.seed}`, initialPatientId: 'SYN-0001', seed: showcaseConfig.seed, asOfDate: showcaseConfig.asOfDate, configVersion: showcaseConfig.version },
  ...Object.fromEntries(Object.values(casePackDefinitions).map(pack => [`case-${pack.id.toLowerCase()}`, { id: `case-${pack.id.toLowerCase()}`, casePackId: pack.id, label: `${pack.id} — ${pack.title}`, shortLabel: pack.title, baselineCount: 6 + investigationSettings.variantsPerPack, version: `case-${pack.id}-v${investigationSettings.version}`, initialPatientId: `${pack.id}-A`, seed: investigationSettings.seed, asOfDate: investigationSettings.asOfDate, configVersion: investigationSettings.version }])),
};
const blank = value => value === undefined || value === null || typeof value === 'string' && (!value.trim() || ['unknown', 'not_collected'].includes(value.trim().toLowerCase()));
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

function finishRun(run) { if (!run.unified) attachDecisionBriefs(run); run.chartGroups = buildAnalysisGroups(run); return freeze(run); }
function makeRun(id, datasetVersion, scenarioId, patients, dataset) {
  const records = clone(patients);
  if (dataset.unified) return finishRun(buildUnifiedRun({id,datasetVersion,scenarioId,patients:records,dataset}));
  if (dataset.casePackId) {
    const result = evaluateInvestigationPack(records, dataset.casePackId, scenarioId);
    const ageGroups = groups(records, result.original, result.proposed, ageDefinitions.map(([key, label]) => [key, label, record => ageFor(record) === key]));
    return finishRun({ id, createdAt: new Date().toISOString(), studyId: result.casePack.studyId, datasetVersion, dataset, scenarioId, patients: records, ...result, ageGroups,
      subgroups: result.investigationSummary.routes.map(route => ({ id: route.id, label: route.label, screened: route.count, original: result.original.records.filter(r => route.ids.includes(r.id) && r.status === 'eligible').length, proposed: result.proposed.records.filter(r => route.ids.includes(r.id) && r.status === 'eligible').length, ids: route.ids })),
      demographics: calculateComposition(records, result.original, result.proposed), missingness: [],
    });
  }
  const original = evaluateCohort(records, false);
  const proposed = evaluateCohort(records, 'renal-revision');
  const current = scenarioId === 'original' ? original : scenarioId === 'renal-revision' ? proposed : evaluateCohort(records, scenarioId);
  for (const cohort of new Set([original, proposed, current])) for (const record of cohort.records) record.inputProvenance = { renalStabilityAssumed: dataset.id === 'casebook' && anchorPatients.some(anchor => anchor.id === record.id), synthetic: true };
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
  return finishRun({ id, createdAt: new Date().toISOString(), studyId: study.id, datasetVersion, dataset, scenarioId, patients: records, original, proposed, current,
    ranked: rankCandidates(current), profiles: Object.fromEntries(current.records.map(record => [record.id, getReviewProfile(record)])), ageGroups, subgroups,
    demographics: calculateComposition(records, original, proposed), missingness: calculateMissingness(records),
    configVersions: { protocol: clinicalConfig.protocol.version, scenarios: Object.fromEntries(clinicalConfig.scenarios.map(scenario => [scenario.id, scenario.version])), rules: Object.fromEntries(clinicalConfig.rules.map(rule => [rule.id, rule.version])), evidence: Object.fromEntries(clinicalConfig.evidence.map(source => [source.id, source.version || source.date || 'unversioned'])), scoring: reviewConfig.version, generator: dataset.id === 'expanded' ? showcaseConfig.version : null, adapter: dataset.id === 'casebook' ? 'anchor-renal-stability-assumption-v1' : 'authored-synthetic-profiles' },
  });
}

export function visibleRecords(run, filters = {}) {
  const { status = 'all', age = 'all', subgroup = 'all', query = '', demographic = 'all' } = filters;
  const [demographicField, demographicValue] = demographic.split(':');
  const subgroupIds = subgroup === 'all' ? null : new Set([...run.subgroups,...run.chartGroups].find(group => group.id === subgroup)?.ids || []);
  const ordered = [...run.current.records].sort((a, b) => String(a.id).localeCompare(String(b.id), 'en', { numeric: true }) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const rankedIds = new Set(run.ranked.map(record => record.id));
  const records = status === 'new' ? [...run.ranked, ...ordered.filter(record => record.newlyEligible && !rankedIds.has(record.id))] : ordered;
  return records.filter(record => (status === 'all' || status === 'new' || status === 'changed' && record.statusChanged || record.status === status)
    && (age === 'all' || ageFor(record) === age) && (!subgroupIds || subgroupIds.has(record.id))
    && (demographic === 'all' || run.demographics.find(d=>d.id===demographicField)?.groups.find(g=>g.id===demographicValue)?.ids.includes(record.id))
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
  record.collection_status = Object.fromEntries(['age_years', 'egfr_ml_min_1_73m2', 'ecog', 'hepatic_status', ...booleanFields].map(field => [field, record[field] !== null ? 'recorded' : input[field] === undefined || input[field] === '' || input[field] === 'not_collected' || input.collection_status?.[field] === 'not_collected' ? 'not_collected' : 'unknown']));
  return { valid: Object.keys(errors).length === 0, record, errors };
}

export function evaluateDraft(draft, existingRecords = [], unified = false) {
  if(unified){ const result=validateUnifiedProfile(draft,existingRecords); if(!result.valid)return {...result,original:null,proposed:null,profile:null}; const original=evaluateUnifiedCohort([result.record]).records[0],proposed=evaluateUnifiedCohort([result.record],'proposed-inclusive').records[0];return {...result,original,proposed,profile:getReviewProfile(proposed)}; }
  const result = validateProfile(draft, existingRecords);
  if (!result.valid) return { ...result, original: null, proposed: null, profile: null };
  const original = { ...result.record, ...evaluatePatient(result.record, false) };
  const proposed = { ...result.record, ...evaluatePatient(result.record, true) };
  return { ...result, original, proposed, profile: getReviewProfile(proposed) };
}

export function createWorkspace({ dataset = 'unified' } = {}) {
  if (!datasetDefinitions[dataset]) throw new TypeError('Unknown synthetic dataset.');
  const bases = {};
  const baseFor = id => bases[id] ||= id === 'unified' ? generateUnifiedCohort() : datasetDefinitions[id].casePackId ? generateCasePack(datasetDefinitions[id].casePackId) : id === 'casebook' ? clone(anchorPatients) : generateShowcase();
  const additions = Object.fromEntries(Object.keys(datasetDefinitions).map(id => [id, []]));
  const revisions = Object.fromEntries(Object.keys(datasetDefinitions).map(id => [id, 0]));
  const subscribers = new Set();
  let state = freeze({ studyId: study.id, perspective: 'patient', selectedPatientId: datasetDefinitions[dataset].initialPatientId, selectedEvidenceId: null, scenarioId: 'original', scenarioVersion: clinicalConfig.protocol.version, dataset, datasetVersion: datasetDefinitions[dataset].version, analysisRunId: '', filters: filtersInitial(), detailTab: 'overview', queuePage: 0, compositionDimension: dataset === 'unified' ? 'gender' : dataset === 'casebook' ? 'age' : 'sex', reviewDispositions: {} });
  let runs = freeze([]);
  let events = freeze([]);
  let run;
  const update = partial => { state = freeze({ ...state, ...partial }); };
  const notify = () => { for (const fn of subscribers) fn(state, run); };
  function log(type, reason, affectedIds = [], extra = {}) {
    const event = freeze({ id: `EVT-${String(events.length + 1).padStart(3, '0')}`, type, actor: 'Demo reviewer', authenticated: false, timestamp: new Date().toISOString(), reason, studyId: run.studyId, runId: run.id, datasetVersion: run.datasetVersion, scenarioId: run.scenarioId, versions: run.configVersions, affectedIds: [...affectedIds], ...extra });
    events = freeze([...events, event]);
    return event;
  }
  function analyze(type, reason, extra = {}) {
    const previous = run;
    run = makeRun(`RUN-${String(runs.length + 1).padStart(3, '0')}`, state.datasetVersion, state.scenarioId, [...baseFor(state.dataset), ...additions[state.dataset]], datasetDefinitions[state.dataset]);
    runs = freeze([...runs, run]);
    const cleared = [];
    if (state.filters.subgroup !== 'all' && ![...run.subgroups,...run.chartGroups].some(group => group.id === state.filters.subgroup)) { update({filters:{...state.filters,subgroup:'all'}}); cleared.push('analysis drill-down'); }
    if (type === 'dataset-changed') {
      const filters = { ...state.filters };
      if (filters.query && !run.patients.some(record => record.id.toLowerCase().includes(filters.query.toLowerCase()))) { filters.query = ''; cleared.push('patient-ID search'); }
      if (filters.demographic !== 'all') {
        const [field, group] = filters.demographic.split(':');
        if (!run.demographics.find(item => item.id === field)?.groups.some(item => item.id === group && item.screened)) { filters.demographic = 'all'; cleared.push('demographic filter'); }
      }
      update({ filters, selectedEvidenceId: null, detailTab: 'overview', queuePage: 0 });
    }
    const filteredRecords = visibleRecords(run, state.filters);
    const selectionCompatible = (type === 'dataset-changed' ? filteredRecords : run.patients).some(record => record.id === state.selectedPatientId);
    const initial = run.casePack && filteredRecords.some(record=>record.id===datasetDefinitions[state.dataset].initialPatientId) ? datasetDefinitions[state.dataset].initialPatientId : null;
    const selected = selectionCompatible ? state.selectedPatientId : initial || filteredRecords[0]?.id || null;
    const visible = visibleRecords(run, state.filters);
    const selectedIndex = visible.findIndex(record => record.id === selected);
    update({ studyId: run.studyId, analysisRunId: run.id, selectedPatientId: selected, queuePage: selectedIndex < 0 ? 0 : Math.floor(selectedIndex / queuePageSize), scenarioVersion: run.current.gate.scenarioVersion || run.protocol?.version || clinicalConfig.protocol.version });
    const affectedIds = previous ? run.current.records.filter(record => {
      const prior = previous.current.records.find(item => item.id === record.id);
      return !prior || prior.status !== record.status || prior.evaluations.some((evaluation, index) => evaluation.result !== record.evaluations[index]?.result);
    }).map(record => record.id).concat(previous.current.records.filter(record => !run.patients.some(item => item.id === record.id)).map(record => record.id)) : run.patients.map(record => record.id);
    const context = snapshot => snapshot ? {runId:snapshot.id,studyId:snapshot.studyId,datasetVersion:snapshot.datasetVersion,scenarioId:snapshot.scenarioId,meets:snapshot.current.eligible,excluded:snapshot.current.excluded,indeterminate:snapshot.current.indeterminate} : null;
    log(type, `${reason}${cleared.length ? ` Cleared incompatible ${cleared.join(' and ')}.` : ''}${type === 'dataset-changed' ? selected ? ` Selected ${selected}.` : ' No patient selected: no records match the retained filters.' : ''}`, [...new Set(affectedIds)], {before:context(previous),after:context(run),...extra});
  }
  analyze('initialized', `Opened ${datasetDefinitions[dataset].label} with original protocol rules.`);
  return {
    get state() { return state; }, get run() { return run; }, get events() { return events; }, get runs() { return runs; },
    subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
    setPerspective(value) { if (!['patient', 'trial', 'decision'].includes(value)) throw new TypeError('Unknown workspace perspective.'); if (value !== state.perspective) { update({ perspective: value }); notify(); } },
    selectPatient(id) { if (!run.patients.some(record => record.id === id)) throw new TypeError('Unknown patient ID.'); if (id !== state.selectedPatientId) { const index = visibleRecords(run, state.filters).findIndex(record => record.id === id); update({ selectedPatientId: id, queuePage: index < 0 ? state.queuePage : Math.floor(index / queuePageSize) }); notify(); } },
    setFilters(partial) {
      const filters = { ...state.filters };
      for (const key of Object.keys(filters)) if (Object.hasOwn(partial, key)) filters[key] = String(partial[key] ?? '');
      if (!['all', 'new', 'changed', 'eligible', 'excluded', 'indeterminate'].includes(filters.status) || !['all', ...ageDefinitions.map(([id]) => id)].includes(filters.age) || !['all', ...run.subgroups.map(group => group.id), ...run.chartGroups.map(group => group.id)].includes(filters.subgroup)) throw new TypeError('Unknown cohort filter.');
      if (filters.demographic !== 'all' && !run.demographics.some(dimension => dimension.groups.some(group => `${dimension.id}:${group.id}` === filters.demographic))) throw new TypeError('Unknown demographic filter.');
      if (Object.keys(filters).some(key => filters[key] !== state.filters[key])) { update({ filters, queuePage: 0, selectedPatientId: state.selectedPatientId || visibleRecords(run, filters)[0]?.id || null }); notify(); }
    },
    setQueuePage(page) { const maximum = Math.max(0, Math.ceil(visibleRecords(run, state.filters).length / queuePageSize) - 1); if (!Number.isInteger(page) || page < 0 || page > maximum) throw new RangeError('Unknown patient table page.'); if (page !== state.queuePage) { update({ queuePage: page }); notify(); } },
    setCompositionDimension(field) { if (field !== 'age' && !run.demographics.some(item => item.id === field)) throw new TypeError('Unknown composition dimension.'); if (field !== state.compositionDimension) { update({ compositionDimension: field }); notify(); } },
    setScenario(id, activity = {}) {
      if (run.casePack && id !== 'original' && !(run.casePack.id === 'RENAL' && id === 'renal-revision')) throw new TypeError('A proposed medical scenario requires case-specific configuration.');
      if (id !== 'original' && !(run.protocolConfig || clinicalConfig).scenarios.some(scenario => scenario.id === id)) throw new TypeError('Unknown scenario.');
      if (id === state.scenarioId) return;
      const priorScenarioId = state.scenarioId;
      update({ scenarioId: id }); analyze('scenario-changed', id === 'original' ? 'Restored original protocol rules.' : 'Requested the predefined synthetic scenario; evidence gates determine whether its rule is applied.', { priorScenarioId, newScenarioId: id, ...(activity.activity==='presentation'?{activity:'presentation',presentationSessionId:activity.presentationSessionId,actor:'Presentation playback'}:{}) }); notify();
    },
    setDataset(value, activity = {}) {
      if (!Object.hasOwn(datasetDefinitions, value)) throw new TypeError('Unknown synthetic dataset.');
      if (value === state.dataset) return;
      const caseChanged = Boolean(datasetDefinitions[value].casePackId || run.casePack || datasetDefinitions[value].unified || run.unified);
      update({ dataset: value, datasetVersion: additions[value].length ? `${datasetDefinitions[value].version}-working-${revisions[value]}` : datasetDefinitions[value].version, ...(caseChanged ? { scenarioId: 'original', filters: filtersInitial(), compositionDimension: 'age' } : {}) });
      analyze('dataset-changed', `Opened ${datasetDefinitions[value].label}.`, activity.activity==='presentation'?{activity:'presentation',presentationSessionId:activity.presentationSessionId,actor:'Presentation playback'}:{}); notify();
    },
    setDetailTab(tab) { if (!['overview', 'criteria', 'evidence', 'pathway'].includes(tab)) throw new TypeError('Unknown patient detail tab.'); if (tab !== state.detailTab) { update({ detailTab: tab }); notify(); } },
    setEvidence(idOrNull) { if (idOrNull !== null && !run.evidenceRegistry.some(source => source.id === idOrNull)) throw new TypeError('Unknown evidence ID.'); if (idOrNull !== state.selectedEvidenceId) { update({ selectedEvidenceId: idOrNull }); notify(); } },
    addProfile(draft) {
      if (run.casePack) throw new TypeError('Profile authoring is not configured for this case pack.');
      const result = run.unified ? validateUnifiedProfile(draft,run.patients) : validateProfile(draft, run.patients);
      if (!result.valid) { const error = new Error('The synthetic profile contains invalid fields.'); error.errors = result.errors; throw error; }
      additions[state.dataset].push(clone(result.record));
      revisions[state.dataset] += 1;
      update({ datasetVersion: `${datasetDefinitions[state.dataset].version}-working-${revisions[state.dataset]}`, selectedPatientId: result.record.id });
      analyze('profile-added', 'Explicitly added a structured synthetic profile to the working cohort.'); notify(); return clone(result.record);
    },
    recordDisposition({ patientId, disposition, reason }) {
      if (!run.patients.some(record => record.id === patientId)) throw new TypeError('Unknown patient ID.');
      if (![...reviewActions.map(([id]) => id), ...(run.casePack ? routeDefinitions.map(([id])=>id) : []), 'reviewed', 'further-review'].includes(disposition)) throw new TypeError('Unknown review disposition.');
      if (typeof reason !== 'string' || !reason.trim()) throw new TypeError('A review rationale is required.');
      const prior = state.reviewDispositions[`${state.dataset}/${run.id}/${patientId}`] || null;
      const activeMedicalStatus = run.current.records.find(record => record.id === patientId).medicalStatus || run.current.records.find(record => record.id === patientId).status;
      const event = log('disposition-recorded', reason.trim(), [patientId], { patientId, disposition, before: {disposition:prior?.disposition||null,activeMedicalStatus}, after: { disposition, reason: reason.trim(), activeMedicalStatus } });
      update({ reviewDispositions: { ...state.reviewDispositions, [`${state.dataset}/${run.id}/${patientId}`]: { runId: run.id, eventId: event.id, disposition, reason: event.reason, timestamp: event.timestamp } } });
      notify(); return event;
    },
    recordGuidanceReview({ patientId, topicId, status, rationale, evidenceNotes }) {
      const row = getGuidanceRows(run, state, patientId).find(item => item.id === topicId);
      if (!row || !guidanceReviewStatuses.some(([id]) => id === status)) throw new TypeError('Unknown patient, guidance topic or review status.');
      if (![rationale, evidenceNotes].every(value => typeof value === 'string' && value.trim() && value.length <= 1200)) throw new TypeError('A rationale and the evidence or information actually considered are required (up to 1200 characters each).');
      const key = guidanceReviewKey(run, patientId, topicId);
      const activeMedicalStatus = run.current.records.find(record=>record.id===patientId).medicalStatus || run.current.records.find(record=>record.id===patientId).status;
      const after = { status, rationale: rationale.trim(), evidenceNotes: evidenceNotes.trim(), documentationStatus: row.documentationStatus, activeMedicalStatus };
      const event = log('guidance-review-recorded', after.rationale, [patientId], { patientId, topicId, before: {...(row.actualReview || { status: row.reviewStatus, documentationStatus: row.documentationStatus }),activeMedicalStatus}, after });
      update({ guidanceReviews: { ...state.guidanceReviews, [key]: { ...after, actor: event.actor, authenticated: false, timestamp: event.timestamp, eventId: event.id, runId: run.id } } });
      notify(); return event;
    },
    reset() {
      additions[state.dataset] = [];
      const priorScenarioId = state.scenarioId;
      update({ selectedPatientId: datasetDefinitions[state.dataset].initialPatientId, selectedEvidenceId: null, scenarioId: 'original', datasetVersion: datasetDefinitions[state.dataset].version, filters: filtersInitial(), detailTab: 'overview', queuePage: 0 });
      analyze('reset', `Restored ${datasetDefinitions[state.dataset].label} and original protocol. Prior session history is retained.`, { priorScenarioId, newScenarioId: 'original' }); notify();
    },
  };
}
