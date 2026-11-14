import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspace as createSharedWorkspace, visibleRecords, validateProfile, evaluateDraft } from '../src/workspace.js';
import { anchorPatients } from '../src/patients.js';
import { evaluateCohort } from '../src/cohort.js';
import { generateShowcase } from '../src/synthetic-cohort.js';

const createWorkspace = () => createSharedWorkspace({ dataset: 'casebook' });

const counts = cohort => [cohort.eligible, cohort.excluded, cohort.indeterminate];
const ids = records => records.map(record => record.id);
const completeDraft = (changes = {}) => ({ ...structuredClone(anchorPatients[1]), id: 'DEMO21', ...changes });

test('workspace calculates original/proposed totals, ranking and age groups from the same casebook', () => {
  const workspace = createWorkspace();
  assert.deepEqual(counts(workspace.run.original), [4, 15, 1]);
  assert.deepEqual(counts(workspace.run.proposed), [10, 8, 2]);
  assert.equal(workspace.state.selectedPatientId, 'P03');
  assert.equal(workspace.run.current, workspace.run.original);
  assert.deepEqual(workspace.run.ageGroups.map(group => [group.id, group.screened, group.original, group.proposed]), [['under65', 9, 3, 5], ['65to74', 9, 1, 3], ['75plus', 2, 0, 2], ['unknown', 0, 0, 0]]);
  workspace.setScenario('renal-revision');
  assert.deepEqual(ids(workspace.run.ranked), ['P13', 'P02', 'P19', 'P09', 'P03', 'P11']);
  assert.equal(workspace.run.profiles.P03.score, 39);
  assert.equal(workspace.run.current.records.find(record => record.id === 'P06').status, 'excluded');
  assert.equal(workspace.run.current.records.find(record => record.id === 'P16').status, 'indeterminate');
});

test('perspectives, filters, selections and detail tabs preserve analysis identity and do not create events', () => {
  const workspace = createWorkspace();
  const run = workspace.run;
  workspace.setFilters({ age: '65to74', query: 'p0' });
  workspace.selectPatient('P06');
  workspace.setEvidence('SYN-PK-02');
  workspace.setDetailTab('pathway');
  workspace.setPerspective('trial');
  workspace.setPerspective('decision');
  assert.equal(workspace.run, run);
  assert.equal(workspace.state.analysisRunId, run.id);
  assert.equal(workspace.state.selectedPatientId, 'P06');
  assert.equal(workspace.state.filters.age, '65to74');
  assert.equal(workspace.state.selectedEvidenceId, 'SYN-PK-02');
  assert.equal(workspace.state.detailTab, 'pathway');
  assert.equal(workspace.events.length, 1);
  assert.equal(workspace.runs.length, 1);
  workspace.setEvidence('synthetic-population');
  assert.equal(workspace.state.selectedEvidenceId, 'synthetic-population');
  assert.equal(workspace.run, run);
});

test('analysis snapshots are deeply immutable and do not freeze or mutate imported fixtures', () => {
  const before = structuredClone(anchorPatients);
  const workspace = createWorkspace();
  const originalRun = workspace.run;
  assert.ok(Object.isFrozen(originalRun));
  assert.ok(Object.isFrozen(originalRun.patients[0]));
  assert.ok(Object.isFrozen(originalRun.current.records[0].evaluations));
  assert.throws(() => { originalRun.patients[0].age_years = 20; }, TypeError);
  assert.throws(() => { workspace.state.filters.age = '75plus'; }, TypeError);
  workspace.setScenario('renal-revision');
  assert.equal(originalRun.scenarioId, 'original');
  assert.deepEqual(counts(originalRun.current), [4, 15, 1]);
  assert.deepEqual(anchorPatients, before);
  assert.equal(Object.isFrozen(anchorPatients[0]), false);
});

test('scenario changes create atomic historical runs, remain reversible and preserve patient identity', () => {
  const workspace = createWorkspace();
  workspace.selectPatient('P16');
  workspace.setScenario('renal-revision');
  const changed = workspace.events.at(-1);
  assert.equal(changed.priorScenarioId, 'original');
  assert.equal(changed.newScenarioId, 'renal-revision');
  assert.ok(changed.affectedIds.includes('P06'));
  assert.ok(changed.affectedIds.includes('P16'));
  assert.equal(changed.runId, workspace.run.id);
  workspace.setScenario('original');
  assert.deepEqual(counts(workspace.run.current), [4, 15, 1]);
  assert.equal(workspace.state.selectedPatientId, 'P16');
  assert.equal(workspace.runs.length, 3);
  workspace.setScenario('original');
  assert.equal(workspace.runs.length, 3);
});

test('withheld predefined scenarios preserve original results and keep the requested identity visible', () => {
  const workspace = createWorkspace();
  workspace.setScenario('renal-draft');
  assert.equal(workspace.run.scenarioId, 'renal-draft');
  assert.equal(workspace.run.current.gate.requested, true);
  assert.equal(workspace.run.current.gate.active, false);
  assert.deepEqual(counts(workspace.run.current), [4, 15, 1]);
  assert.deepEqual(workspace.run.ranked, []);
});

test('shared filters apply status, age, clinical subgroup and case-insensitive ID search with AND semantics', () => {
  const workspace = createWorkspace();
  workspace.setScenario('renal-revision');
  const run = workspace.run;
  assert.deepEqual(ids(visibleRecords(run, { status: 'new' })), ['P13', 'P02', 'P19', 'P09', 'P03', 'P11']);
  assert.deepEqual(ids(visibleRecords(run, { status: 'new', age: '65to74', subgroup: 'hypertension', query: 'p0' })), ['P02', 'P03']);
  assert.ok(visibleRecords(run, { status: 'excluded' }).every(record => record.status === 'excluded'));
  assert.deepEqual(visibleRecords(run, { subgroup: 'nonexistent' }), []);
  assert.deepEqual(ids(visibleRecords(run, { query: ' p06 ' })), ['P06']);
  assert.equal(visibleRecords(run).length, 20);
});

test('subgroup metrics use unique patients while explicitly allowing overlapping clinical groups', () => {
  const workspace = createWorkspace();
  for (const group of workspace.run.subgroups) {
    assert.equal(group.ids.length, new Set(group.ids).size);
    assert.equal(group.screened, group.ids.length);
    assert.ok(group.original <= group.screened && group.proposed <= group.screened);
  }
  assert.ok(workspace.run.subgroups.find(group => group.id === 'mild-hepatic').ids.includes('P03'));
  assert.ok(workspace.run.subgroups.find(group => group.id === 'hypertension').ids.includes('P03'));
});

test('structured form strings normalize without imputing unknown clinical or scoring inputs', () => {
  const result = validateProfile({ id: ' NEW_21 ', age_years: '70', egfr_ml_min_1_73m2: '49.5', ecog: '1', hepatic_status: ' Mild ', strong_cyp3a_inhibitor: 'no', clinically_unstable_cardiac_disease: 'false', renal_stable: 'unknown', stable_cardiac_history: '', controlled_hypertension: 'yes', stable_type2_diabetes: 'true', note: 'discard me' });
  assert.equal(result.valid, true);
  assert.equal(result.record.id, 'NEW_21');
  assert.equal(result.record.egfr_ml_min_1_73m2, 49.5);
  assert.equal(result.record.strong_cyp3a_inhibitor, false);
  assert.equal(result.record.controlled_hypertension, true);
  assert.equal(result.record.renal_stable, null);
  assert.equal(result.record.stable_cardiac_history, null);
  assert.equal(result.record.hepatic_status, 'mild');
  assert.equal(Object.hasOwn(result.record, 'note'), false);
});

test('blank fields remain valid unknown observations and produce an indeterminate scratch result', () => {
  const result = evaluateDraft({ id: 'SCRATCH1' });
  assert.equal(result.valid, true);
  assert.equal(result.original.status, 'indeterminate');
  assert.equal(result.proposed.status, 'indeterminate');
  assert.equal(result.record.renal_stable, null);
  assert.equal(result.profile.score, null);
  assert.equal(result.proposed.evaluations.filter(evaluation => evaluation.result === 'UNKNOWN').length, 6);
});

test('profile validation rejects invalid types, negative/nonfinite measurements, unsupported enums and conflicting units', () => {
  const invalid = validateProfile(completeDraft({ age_years: -1, egfr_ml_min_1_73m2: Infinity, ecog: 1.5, hepatic_status: 'imputed-normal', strong_cyp3a_inhibitor: 0, units: { egfr_ml_min_1_73m2: 'mL/min' } }));
  assert.equal(invalid.valid, false);
  assert.deepEqual(Object.keys(invalid.errors).sort(), ['age_years', 'ecog', 'egfr_ml_min_1_73m2', 'hepatic_status', 'strong_cyp3a_inhibitor', 'units.egfr_ml_min_1_73m2'].sort());
  for (const value of [true, [], {}, '0x10', 'NaN']) assert.equal(validateProfile(completeDraft({ age_years: value })).valid, false);
  for (const value of [0, 1, 2, 3, 4, 5]) assert.equal(validateProfile(completeDraft({ ecog: value })).valid, true);
  assert.equal(validateProfile(completeDraft({ egfr_unit: 'mL/min', units: { egfr_ml_min_1_73m2: 'mL/min/1.73 m²' } })).valid, false);
});

test('zero observations remain actual values rather than blank or imputed passing inputs', () => {
  const result = evaluateDraft(completeDraft({ age_years: '0', egfr_ml_min_1_73m2: '0', ecog: '0' }));
  assert.equal(result.valid, true);
  assert.equal(result.record.age_years, 0);
  assert.equal(result.record.egfr_ml_min_1_73m2, 0);
  assert.equal(result.original.status, 'excluded');
  assert.equal(result.proposed.status, 'excluded');
  assert.equal(result.proposed.evaluations.find(v => v.criterionId === 'ADULT').result, 'FAIL');
  assert.equal(result.proposed.evaluations.find(v => v.criterionId === 'RENAL').result, 'FAIL');
  assert.equal(result.proposed.evaluations.find(v => v.criterionId === 'ECOG').result, 'PASS');
});

test('synthetic IDs are required, bounded and unique independently of letter case', () => {
  for (const id of ['', '22Patient', 'Bad ID', '<script>', 'A'.repeat(25)]) assert.equal(validateProfile(completeDraft({ id })).valid, false);
  assert.equal(validateProfile(completeDraft({ id: 'p02' }), anchorPatients).valid, false);
  assert.equal(validateProfile(completeDraft({ id: 'A_21-test' }), anchorPatients).valid, true);
});

test('scratch evaluation preserves hard restrictions and has no workspace side effects', () => {
  const workspace = createWorkspace();
  const originalRun = workspace.run;
  const result = evaluateDraft(completeDraft({ strong_cyp3a_inhibitor: true, hepatic_status: 'severe' }), workspace.run.patients);
  assert.equal(result.proposed.status, 'excluded');
  assert.equal(result.proposed.exclusionReasons.length, 2);
  assert.equal(result.profile.score, null);
  assert.equal(workspace.run, originalRun);
  assert.equal(workspace.events.length, 1);
  assert.equal(workspace.run.patients.length, 20);
  const invalid = evaluateDraft(completeDraft({ ecog: 8 }));
  assert.equal(invalid.original, null);
  assert.equal(invalid.proposed, null);
});

test('new scratch records require their own renal stability and do not inherit the anchor assumption', () => {
  const draft = completeDraft({ renal_stable: undefined });
  const result = evaluateDraft(draft);
  assert.equal(result.original.status, 'excluded');
  assert.equal(result.proposed.status, 'indeterminate');
  assert.equal(result.record.renal_stable, null);
  assert.equal(result.profile.score, null);
});

test('explicit additions version the cohort, select the new ID and update all calculated denominators', () => {
  const workspace = createWorkspace();
  workspace.setScenario('renal-revision');
  const before = workspace.run;
  const added = workspace.addProfile(completeDraft());
  assert.equal(added.id, 'DEMO21');
  assert.equal(workspace.state.selectedPatientId, 'DEMO21');
  assert.notEqual(workspace.run.datasetVersion, before.datasetVersion);
  assert.equal(workspace.run.patients.length, 21);
  assert.deepEqual(counts(workspace.run.current), [11, 8, 2]);
  assert.equal(workspace.run.ageGroups.reduce((sum, group) => sum + group.screened, 0), 21);
  assert.equal(workspace.events.at(-1).type, 'profile-added');
  assert.deepEqual(workspace.events.at(-1).affectedIds, ['DEMO21']);
  assert.equal(before.patients.length, 20);
  assert.throws(() => workspace.addProfile(completeDraft()), error => Boolean(error.errors.id));
  assert.equal(workspace.run.patients.length, 21);
});

test('newly matching records lacking score context remain visible after ranked records', () => {
  const workspace = createWorkspace();
  workspace.setScenario('renal-revision');
  workspace.addProfile(completeDraft({ controlled_hypertension: null }));
  assert.equal(workspace.run.current.newlyEligible, 7);
  assert.equal(workspace.run.ranked.length, 6);
  assert.deepEqual(ids(visibleRecords(workspace.run, { status: 'new' })), ['P13', 'P02', 'P19', 'P09', 'P03', 'P11', 'DEMO21']);
  assert.equal(workspace.run.profiles.DEMO21.score, null);
});

test('expanded dataset switching preserves the shared selection and each working dataset version', () => {
  const workspace = createWorkspace();
  workspace.addProfile(completeDraft());
  const workingVersion = workspace.state.datasetVersion;
  workspace.selectPatient('P06');
  workspace.setDataset('expanded');
  assert.equal(workspace.run.patients.length, 500);
  assert.ok(workspace.state.selectedPatientId.startsWith('SYN-'));
  assert.deepEqual(counts(workspace.run.original), counts(evaluateCohort(generateShowcase(), false)));
  workspace.setDataset('casebook');
  assert.equal(workspace.run.patients.length, 21);
  assert.equal(workspace.state.datasetVersion, workingVersion);
  assert.equal(workspace.events.at(-1).type, 'dataset-changed');
});

test('reset restores the original twenty records while retaining session history and unique working versions', () => {
  const workspace = createWorkspace();
  workspace.addProfile(completeDraft());
  const previousVersion = workspace.state.datasetVersion;
  workspace.setScenario('renal-revision');
  workspace.setFilters({ status: 'new', age: '65to74' });
  const beforeEvents = workspace.events.length;
  workspace.reset();
  assert.deepEqual(workspace.run.patients, anchorPatients);
  assert.deepEqual(counts(workspace.run.current), [4, 15, 1]);
  assert.equal(workspace.state.selectedPatientId, 'P03');
  assert.equal(workspace.state.datasetVersion, 'casebook-v1');
  assert.deepEqual(workspace.state.filters, { status: 'all', age: 'all', subgroup: 'all', query: '', demographic: 'all' });
  assert.equal(workspace.events.length, beforeEvents + 1);
  assert.equal(workspace.events.at(-1).type, 'reset');
  workspace.addProfile(completeDraft({ id: 'DIFFERENT21' }));
  assert.notEqual(workspace.state.datasetVersion, previousVersion);
});

test('review dispositions require a rationale, reference the exact run and never change clinical results', () => {
  const workspace = createWorkspace();
  workspace.setScenario('renal-revision');
  const run = workspace.run;
  assert.throws(() => workspace.recordDisposition({ patientId: 'P03', disposition: 'reviewed', reason: ' ' }), /rationale/);
  assert.throws(() => workspace.recordDisposition({ patientId: 'P03', disposition: 'approved', reason: 'Approval is unsupported.' }), /disposition/);
  const event = workspace.recordDisposition({ patientId: 'P03', disposition: 'further-review', reason: ' Verify renal stability evidence. ' });
  assert.equal(event.runId, run.id);
  assert.equal(event.patientId, 'P03');
  assert.equal(event.disposition, 'further-review');
  assert.equal(event.reason, 'Verify renal stability evidence.');
  assert.equal(workspace.run, run);
  assert.deepEqual(ids(workspace.run.ranked), ['P13', 'P02', 'P19', 'P09', 'P03', 'P11']);
});

test('events use actual UTC timestamps, explicit demo identity and immutable version provenance', () => {
  const start = Date.now();
  const workspace = createWorkspace();
  workspace.setScenario('renal-revision');
  const end = Date.now();
  for (const event of workspace.events) {
    assert.equal(event.actor, 'Demo reviewer');
    assert.equal(event.authenticated, false);
    assert.match(event.timestamp, /Z$/);
    assert.ok(Date.parse(event.timestamp) >= start && Date.parse(event.timestamp) <= end);
    assert.equal(event.versions.scoring, '1.0.0');
    assert.ok(Object.isFrozen(event.versions.rules));
    assert.ok(workspace.runs.some(run => run.id === event.runId));
  }
  assert.equal(new Set(workspace.events.map(event => event.id)).size, workspace.events.length);
});

test('subscribers receive committed state/results once and can unsubscribe', () => {
  const workspace = createWorkspace();
  const notifications = [];
  const unsubscribe = workspace.subscribe((state, run) => notifications.push([state.analysisRunId, run.id]));
  workspace.setScenario('renal-revision');
  workspace.setPerspective('trial');
  assert.equal(notifications.length, 2);
  assert.ok(notifications.every(([stateId, runId]) => stateId === runId));
  unsubscribe();
  workspace.selectPatient('P13');
  assert.equal(notifications.length, 2);
});
