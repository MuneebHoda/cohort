import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspace, datasetDefinitions } from '../src/workspace.js';
import { buildChartData, renderTrialCharts, renderPatientGate, renderPatientCharts } from '../src/charts.js';

test('scenario ribbons reconcile exact reference transfers independently of the active scenario', () => {
  const workspace = createWorkspace({ dataset: 'casebook' });
  const before = buildChartData(workspace.run);
  assert.deepEqual(before.transfers.map(({ from, to, count }) => [from, to, count]), [
    ['eligible', 'eligible', 4], ['excluded', 'eligible', 6], ['excluded', 'excluded', 8],
    ['excluded', 'indeterminate', 1], ['indeterminate', 'indeterminate', 1],
  ]);
  assert.deepEqual(before.transfers.find(item => item.from === 'excluded' && item.to === 'eligible').ids.sort(), ['P02', 'P03', 'P09', 'P11', 'P13', 'P19']);
  assert.deepEqual(before.outcomes.map(item => item.count), [4, 15, 1]);
  workspace.setScenario('renal-revision');
  assert.deepEqual(buildChartData(workspace.run).outcomes.map(item => item.count), [10, 8, 2]);
  assert.deepEqual(buildChartData(workspace.run).transfers, before.transfers);
  workspace.setScenario('original');
  assert.deepEqual(buildChartData(workspace.run), before);
});

test('all dataset chart partitions and every ribbon endpoint reconcile to their full immutable cohort', () => {
  for (const dataset of Object.keys(datasetDefinitions)) {
    const workspace = createWorkspace({ dataset }), run = workspace.run;
    const data = buildChartData(run);
    assert.equal(data.outcomes.reduce((sum, row) => sum + row.count, 0), run.current.total, dataset);
    for (const criterion of data.criteria) assert.equal(criterion.PASS + criterion.FAIL + criterion.UNKNOWN + criterion.NOT_IN_PROTOCOL, run.current.total, `${dataset}/${criterion.id}`);
    if (data.proposedAvailable) {
      assert.equal(new Set(data.transfers.flatMap(row => row.ids)).size, run.current.total, dataset);
      assert.equal(data.transfers.reduce((sum, row) => sum + row.count, 0), run.current.total, dataset);
      for (const status of ['eligible', 'excluded', 'indeterminate']) {
        assert.equal(data.transfers.filter(row => row.from === status).reduce((sum, row) => sum + row.count, 0), run.original[status]);
        assert.equal(data.transfers.filter(row => row.to === status).reduce((sum, row) => sum + row.count, 0), run.proposed[status]);
      }
    }
    const events = workspace.events, histories = workspace.runs;
    renderTrialCharts(run, workspace.state); renderPatientCharts(run, workspace.state);
    assert.equal(workspace.run, run); assert.equal(workspace.events, events); assert.equal(workspace.runs, histories);
  }
});

test('criterion charts retain missing assessments even when an independent failure determines exclusion', () => {
  const workspace = createWorkspace({ dataset: 'case-hiv' });
  const data = buildChartData(workspace.run);
  assert.equal(workspace.run.current.indeterminate, 0);
  assert.ok(data.unresolved > 0);
  assert.ok(data.multipleFailures > 0);
  assert.ok(data.criteria.find(item => item.id === 'CD4').UNKNOWN > 0);
  const missing = workspace.run.current.records.filter(record => record.evaluations.some(item => item.result === 'UNKNOWN'));
  assert.ok(missing.every(record => record.status === 'excluded'));
});

test('a criterion absent from another authored protocol snapshot is never drawn as a passing assessment', () => {
  const workspace = createWorkspace({ dataset: 'case-preg' }), data = buildChartData(workspace.run);
  const concern = data.criteria.find(row => row.id === 'PREG_CONCERN');
  const scopedRecords = workspace.run.patients.filter(record => record.protocolContext.pregnancyConcernRestriction === true).length;
  assert.equal(concern.PASS + concern.FAIL + concern.UNKNOWN, scopedRecords);
  assert.equal(concern.NOT_IN_PROTOCOL, 50 - scopedRecords);
  assert.equal(concern.PASS, 0);
  assert.match(renderTrialCharts(workspace.run, workspace.state), /Not in snapshot/);
});

test('unconfigured case proposals have no ribbons or fabricated zero-match comparison', () => {
  for (const dataset of ['case-hiv', 'case-brain', 'case-older', 'case-access', 'case-cognitive', 'case-prior', 'case-preg']) {
    const workspace = createWorkspace({ dataset }), data = buildChartData(workspace.run);
    assert.equal(data.proposedAvailable, false); assert.deepEqual(data.transfers, []);
    const html = renderTrialCharts(workspace.run, workspace.state);
    assert.doesNotMatch(html, /data-chart="flow"/);
    assert.match(html, /data-chart="outcomes"/);
    assert.match(html, /data-chart="criteria"/);
  }
});

test('readiness chart includes the complete pack and keeps medically excluded people in its denominator', () => {
  for (const dataset of ['case-access', 'case-cognitive']) {
    const workspace = createWorkspace({ dataset }), data = buildChartData(workspace.run);
    assert.equal(data.readiness.reduce((sum, item) => sum + item.count, 0), 50);
    const medicallyExcluded = workspace.run.current.records.find(record => record.id.endsWith('-E'));
    assert.equal(medicallyExcluded.status, 'excluded');
    assert.equal(medicallyExcluded.investigation.readiness.status, 'ready_for_configured_tasks');
    assert.match(renderTrialCharts(workspace.run, workspace.state), /Includes medically excluded records/);
    assert.equal(workspace.run.current.newlyEligible, 0);
  }
});

test('patient medical map follows the explicitly labelled current protocol for an active renal comparison', () => {
  const workspace = createWorkspace({ dataset: 'case-renal' }); workspace.setScenario('renal-revision');
  const record = workspace.run.current.records.find(record => record.id === 'RENAL-A');
  assert.equal(record.status, 'eligible');
  assert.equal(record.investigation.currentProtocol.status, 'excluded');
  assert.match(renderPatientGate(record), /CURRENT MEDICAL CHECKS/);
  assert.match(renderPatientGate(record), /Inspect Renal function: FAIL/);
  assert.match(renderPatientGate(record), /1 exclusion/);
});

test('empty and hostile display data remain safe, with no invalid chart geometry', () => {
  const workspace = createWorkspace({ dataset: 'casebook' }), run = structuredClone(workspace.run);
  for (const cohort of [run.original, run.current, run.proposed]) Object.assign(cohort, { records: [], total: 0, eligible: 0, excluded: 0, indeterminate: 0, newlyEligible: 0 });
  assert.equal(buildChartData(run).total, 0);
  assert.doesNotMatch(renderTrialCharts(run, workspace.state), /NaN|Infinity/);
  const hostile = structuredClone(workspace.run);
  hostile.current.records[0].evaluations[0].title = '<img src=x onerror=alert(1)>';
  const html = renderTrialCharts(hostile, workspace.state);
  assert.doesNotMatch(html, /<img/); assert.match(html, /&lt;img/);
});

test('linked chart filters preserve whole-cohort values and run identity', () => {
  const workspace = createWorkspace({ dataset: 'expanded' }); workspace.setScenario('renal-revision');
  const run = workspace.run, data = buildChartData(run);
  workspace.setFilters({ status: 'excluded', age: '75plus' });
  assert.equal(workspace.run, run); assert.deepEqual(buildChartData(workspace.run), data);
  assert.match(renderPatientCharts(run, workspace.state), /data-status="excluded" aria-pressed="true"/);
  assert.match(renderTrialCharts(run, workspace.state), new RegExp(`data-chart-run="${run.id}"`));
});
