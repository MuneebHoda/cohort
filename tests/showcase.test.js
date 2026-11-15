import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateShowcase } from '../src/synthetic-cohort.js';
import { showcaseConfig, demographicDefinitions } from '../src/synthetic-config.js';
import { calculateComposition } from '../src/composition.js';
import { createWorkspace, visibleRecords, reviewActions, queuePageSize, evaluateDraft } from '../src/workspace.js';
import { evaluateCohort, evaluatePatient } from '../src/cohort.js';
import { clinicalConfig } from '../src/clinical-fixture.js';
import { getReviewProfile, rankCandidates } from '../src/ranking.js';
import { getMarkerLayout } from '../src/constellation.js';
import { challengeCases } from '../src/challenge-cases.js';
import { renderPatientQueue, renderPatientDetail } from '../src/studio-patient.js';
import { renderTrialAnalytics, renderReport, buildReviewPacket } from '../src/studio-views.js';
import { sources } from '../src/data.js';
import { escape, icon } from '../src/ui.js';
import { renderStudyTool } from '../src/study-tools.js';

const records = generateShowcase();
const original = evaluateCohort(records, false);
const proposed = evaluateCohort(records, true);
const clinicalFields = ['age_years', 'egfr_ml_min_1_73m2', 'ecog', 'hepatic_status', 'strong_cyp3a_inhibitor', 'clinically_unstable_cardiac_disease', 'renal_stable', 'controlled_hypertension', 'stable_type2_diabetes', 'stable_cardiac_history'];

test('showcase generation is deterministic, seed-sensitive and prefix-stable without the reference anchors', () => {
  assert.deepEqual(generateShowcase(), records);
  assert.notDeepEqual(generateShowcase({ seed: showcaseConfig.seed + 1 }), records);
  assert.deepEqual(generateShowcase({ count: 25 }), records.slice(0, 25));
  assert.equal(records.length, 500);
  assert.equal(new Set(records.map(record => record.id)).size, records.length);
  assert.ok(records.every(record => /^SYN-\d{4}$/.test(record.id)));
  assert.ok(new Set(records.map(record => JSON.stringify(clinicalFields.map(field => record[field])))).size > records.length * .95);
  assert.ok(!readFileSync(new URL('../src/synthetic-cohort.js', import.meta.url), 'utf8').includes('evaluateCohort'));
});

test('ordinary generated clinical types, units and collection status are coherent', () => {
  for (const record of records) {
    assert.equal(record.conflicts, undefined);
    assert.equal(record.units.egfr_ml_min_1_73m2, clinicalConfig.units.egfr_ml_min_1_73m2);
    assert.ok(!record.clinically_unstable_cardiac_disease || record.stable_cardiac_history !== true);
    for (const field of clinicalFields) {
      assert.ok(['recorded', 'unknown', 'not_collected'].includes(record.collection_status[field]));
      assert.equal(record[field] === null, record.collection_status[field] !== 'recorded');
      if (record[field] === null) continue;
      if (['age_years', 'egfr_ml_min_1_73m2', 'ecog'].includes(field)) assert.ok(Number.isFinite(record[field]) && record[field] >= 0);
      else if (field === 'hepatic_status') assert.ok(['normal', 'mild', 'moderate', 'severe'].includes(record[field]));
      else assert.equal(typeof record[field], 'boolean');
    }
    assert.ok(record.ecog === null || Number.isInteger(record.ecog) && record.ecog <= 5);
  }
});

test('fixed as-of dates and the engine-selected measurements reconcile without inferred longitudinal stability', () => {
  for (const record of records) {
    assert.equal(record.provenance.asOfDate, showcaseConfig.asOfDate);
    assert.equal(record.provenance.generatorVersion, showcaseConfig.version);
    assert.equal(record.measurements.length, record.egfr_ml_min_1_73m2 === null ? 0 : 1);
    for (const measurement of record.measurements) {
      assert.ok(measurement.date <= record.provenance.asOfDate);
      assert.equal(measurement.value, record[measurement.field]);
      assert.equal(measurement.unit, record.units[measurement.field]);
      assert.equal(measurement.usedByEngine, true);
    }
  }
  assert.throws(() => generateShowcase({ asOfDate: '2026-02-30' }), /date/);
  assert.throws(() => generateShowcase({ count: -1 }), /count/);
  assert.throws(() => generateShowcase({ seed: 'random' }), /seed/);
  assert.throws(() => generateShowcase({ raceWeights: [['unsupported', 1]] }), /race categories/);
});

test('authored demographic categories and missingness are explicit and separate', () => {
  for (const record of records) {
    assert.equal(record.demographics.synthetic, true);
    for (const dimension of demographicDefinitions) {
      const entry = record.demographics[dimension.id];
      assert.ok(['recorded', 'unknown', 'not_collected'].includes(entry.status));
      assert.ok(entry.status === 'recorded' ? dimension.categories.some(([id]) => id === entry.value) : entry.value === null);
    }
    assert.equal(record.name, undefined);
    assert.equal(record.email, undefined);
    assert.equal(record.latitude, undefined);
  }
  for (const field of ['sex', 'gender', 'race', 'ethnicity', 'site']) {
    assert.ok(records.some(record => record.demographics[field].status === 'unknown'));
    assert.ok(records.some(record => record.demographics[field].status === 'not_collected'));
  }
});

test('demographic sampling changes cannot alter generated clinical observations or attention scores', () => {
  const modified = generateShowcase({ raceWeights: [['asian', 1]], ethnicityWeights: [['hispanic', 1]], demographicMissingness: [0, 0] });
  assert.deepEqual(modified.map(record => clinicalFields.map(field => record[field])), records.map(record => clinicalFields.map(field => record[field])));
  const changed = evaluateCohort(modified, true);
  assert.deepEqual(changed.records.map(record => [record.id, record.status, getReviewProfile(record).score]), proposed.records.map(record => [record.id, record.status, getReviewProfile(record).score]));
});

test('expanded classifications reconcile and every ranked record satisfies all proposed criteria', () => {
  for (const result of [original, proposed]) assert.equal(result.eligible + result.excluded + result.indeterminate, records.length);
  assert.ok(original.eligible > 0 && proposed.newlyEligible > 0 && proposed.excluded > 0 && proposed.indeterminate > 0);
  assert.ok(proposed.records.some(record => record.evaluations.filter(item => item.result === 'FAIL').length > 1));
  for (const record of proposed.records.filter(record => record.newlyEligible)) assert.ok(record.evaluations.every(item => item.result === 'PASS'));
  const ranked = rankCandidates(proposed);
  assert.ok(ranked.every(record => record.newlyEligible && record.review.score !== null));
  assert.ok(ranked.length <= proposed.newlyEligible);
  assert.ok(proposed.records.filter(record => record.status !== 'eligible').every(record => getReviewProfile(record).score === null));
});

test('composition groups reconcile screened and matching denominators with unique patient IDs', () => {
  for (const dimension of calculateComposition(records, original, proposed)) {
    assert.equal(dimension.groups.reduce((sum, group) => sum + group.screened, 0), records.length);
    assert.equal(dimension.groups.reduce((sum, group) => sum + group.original, 0), original.eligible);
    assert.equal(dimension.groups.reduce((sum, group) => sum + group.proposed, 0), proposed.eligible);
    assert.equal(new Set(dimension.groups.flatMap(group => group.ids)).size, records.length);
  }
});

test('the archived expanded workspace is the 500-record showcase and presentation changes preserve its run', () => {
  const workspace = createWorkspace({dataset:'expanded'}); const run = workspace.run;
  assert.equal(run.current.total, records.length);
  assert.equal(workspace.state.studyId, 'DEMO-SYN217-03');
  workspace.setScenario('renal-revision'); const active = workspace.run;
  workspace.setCompositionDimension('race'); workspace.setFilters({ demographic: 'race:asian', age: 'under65' });
  workspace.setPerspective('trial'); workspace.setPerspective('decision');
  assert.equal(workspace.run, active);
  assert.ok(visibleRecords(active, workspace.state.filters).every(record => record.demographics.race.value === 'asian' && record.age_years < 65));
  assert.equal(workspace.run.current.total, records.length);
});

test('dataset changes explicitly reconcile incompatible demographic and patient-ID selections', () => {
  const workspace = createWorkspace({dataset:'expanded'}); workspace.setFilters({ demographic: 'sex:female', query: 'SYN-03' });
  workspace.setDataset('casebook');
  assert.equal(workspace.state.filters.demographic, 'all'); assert.equal(workspace.state.filters.query, '');
  assert.ok(workspace.run.patients.some(record => record.id === workspace.state.selectedPatientId));
  assert.match(workspace.events.at(-1).reason, /Cleared incompatible/);
  workspace.setFilters({ status: 'new' }); workspace.setDataset('expanded');
  assert.equal(workspace.state.selectedPatientId, null);
  assert.equal(visibleRecords(workspace.run, workspace.state.filters).length, 0);
  workspace.setFilters({ status: 'all' }); assert.ok(workspace.state.selectedPatientId);
});

test('reset restores the selected dataset baseline and preserves the other dataset working copy', () => {
  const workspace = createWorkspace({dataset:'expanded'}); const draft = { ...records.find(record => record.age_years), id: 'ADDED500' };
  workspace.addProfile(draft); assert.equal(workspace.run.current.total, 501);
  workspace.setDataset('casebook'); workspace.addProfile({ ...draft, id: 'ADDED20' });
  workspace.setDataset('expanded'); workspace.reset();
  assert.equal(workspace.state.dataset, 'expanded'); assert.equal(workspace.run.current.total, 500);
  assert.deepEqual(workspace.run.patients, records);
  workspace.setDataset('casebook'); assert.equal(workspace.run.current.total, 21);
  workspace.reset(); assert.equal(workspace.run.current.total, 20);
});

test('review actions are actual annotations scoped to dataset, run and patient, never clinical analysis changes', () => {
  const workspace = createWorkspace({dataset:'expanded'}); const run = workspace.run; const patientId = workspace.state.selectedPatientId;
  for (const [disposition] of reviewActions) workspace.recordDisposition({ patientId, disposition, reason: 'Inspect supplied synthetic evidence.' });
  assert.equal(workspace.run, run);
  const report = renderReport(workspace);
  for (const [, label] of reviewActions) assert.ok(report.includes(label));
  assert.equal(workspace.events.filter(event => event.type === 'disposition-recorded').length, reviewActions.length);
  assert.equal(workspace.state.reviewDispositions[`expanded/${run.id}/${patientId}`].disposition, 'reviewer-note');
  workspace.setScenario('renal-revision');
  assert.equal(workspace.state.reviewDispositions[`expanded/${workspace.run.id}/${patientId}`], undefined);
  assert.throws(() => workspace.recordDisposition({ patientId, disposition: 'approved', reason: 'Not a supported action' }), /disposition/);
});

test('precise patient table pagination retains all 500 records and scene selection locates the correct page', () => {
  const workspace = createWorkspace({dataset:'expanded'}); const all = visibleRecords(workspace.run, workspace.state.filters); const seen = [];
  for (let page = 0; page < Math.ceil(all.length / queuePageSize); page++) {
    workspace.setQueuePage(page);
    const html = renderPatientQueue({ state: workspace.state, run: workspace.run, escape, icon });
    seen.push(...[...html.matchAll(/data-patient-row="([^"]+)"/g)].map(match => match[1]));
  }
  assert.deepEqual(seen, all.map(record => record.id));
  workspace.selectPatient(all[249].id); assert.equal(workspace.state.queuePage, Math.floor(249 / queuePageSize));
});

test('500 scene markers remain unique, stable and reversible across clinical regrouping', () => {
  const before = getMarkerLayout(original.records), after = getMarkerLayout(proposed.records);
  assert.equal(before.length, 500); assert.equal(new Set(before.map(item => item.id)).size, 500);
  const positions = new Map(before.map(item => [item.id, item]));
  for (const item of after) if (item.group === positions.get(item.id).group) assert.deepEqual(item, positions.get(item.id));
  assert.deepEqual(getMarkerLayout(original.records), before);
});

test('scratch profiles and every chart/report use the correct active dataset without demographic penalties', () => {
  const workspace = createWorkspace({dataset:'expanded'}); const run = workspace.run;
  evaluateDraft({ id: 'DRAFT500', age_years: 65 }); assert.equal(workspace.run, run);
  workspace.setScenario('renal-revision'); workspace.setFilters({ demographic: 'ethnicity:hispanic' });
  const packet = buildReviewPacket(workspace);
  assert.equal(packet.analysis.current.total, 500);
  assert.deepEqual(packet.filteredPatientIds, visibleRecords(workspace.run, workspace.state.filters).map(record => record.id));
  const html = renderTrialAnalytics(workspace.run, workspace.state); const report = renderReport(workspace);
  assert.match(html, /500 screened records/); assert.match(report, /Cohort composition/);
  assert.match(report, /Active filters: Ethnicity as recorded: Hispanic or Latino/);
  assert.doesNotMatch(report, /Active filters: None/);
  assert.ok(workspace.run.ranked.every(record => !record.review.components.some(component => /race|sex|gender|ethnicity|site/.test(component.id))));
});

test('retained boundary explorer honors matching and classification-change filters', () => {
  const workspace = createWorkspace({dataset:'expanded'}); workspace.setScenario('renal-revision');
  for (const status of ['eligible', 'changed']) {
    workspace.setFilters({ status });
    const expected = visibleRecords(workspace.run, workspace.state.filters).length;
    const html = renderStudyTool('population', workspace);
    assert.match(html, new RegExp(`aria-label="${expected} of 500 synthetic records shown"`));
    assert.equal([...html.matchAll(/data-record="/g)].length, expected);
  }
});

test('custom profile IDs cannot acquire the reference-case renal assumption by resembling an anchor', () => {
  const workspace = createWorkspace({dataset:'expanded'}); workspace.addProfile({ ...records[0], id: 'P03' });
  const record = workspace.run.current.records.find(item => item.id === 'P03');
  assert.equal(record.inputProvenance.renalStabilityAssumed, false);
  const html = renderPatientDetail({ state: workspace.state, run: workspace.run, sources, config: clinicalConfig, escape, icon });
  assert.doesNotMatch(html, /Renal stability is assumed for this baseline fixture/);
});

test('challenge cases stay outside normal analytics and exercise failure, unknown and evidence gates', () => {
  assert.ok(challengeCases.every(item => !records.some(record => record.id === item.patient.id)));
  for (const item of challengeCases) {
    const config = structuredClone(clinicalConfig);
    if (item.removeEvidenceId) config.evidence = config.evidence.filter(source => source.id !== item.removeEvidenceId);
    const result = evaluatePatient(item.patient, true, config);
    if (item.id === 'inclusive-boundary') assert.equal(result.status, 'eligible');
    if (['missing-lab', 'conflicting-lab', 'invalid-unit'].includes(item.id)) assert.equal(result.status, 'indeterminate');
    if (['below-boundary', 'multiple-exclusions', 'hard-interaction'].includes(item.id)) assert.equal(result.status, 'excluded');
    if (item.removeEvidenceId) assert.equal(result.gate.active, false);
  }
});
