import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspace, datasetDefinitions, visibleRecords } from '../src/workspace.js';
import { renderCasePeopleControls, buildReviewPacket } from '../src/studio-views.js';

const options = (html, id) => [...html.match(new RegExp(`<select id="${id}"[^>]*>([\\s\\S]*?)</select>`))[1].matchAll(/<option value="([^"]*)"/g)].map(match => match[1]);

test('all eight case packs expose their complete patient list and review pathways without changing the analysis', () => {
  const datasets = Object.values(datasetDefinitions).filter(dataset => dataset.casePackId);
  assert.equal(datasets.length, 8);
  for (const dataset of datasets) {
    const workspace = createWorkspace({dataset:dataset.id}), run = workspace.run, events = workspace.events;
    const html = renderCasePeopleControls(run, workspace.state);
    assert.match(html, /Choose people to inspect/);
    assert.match(html, /Show 50 people/);
    assert.deepEqual(options(html, 'case-patient-picker').filter(Boolean).sort(), run.patients.map(record => record.id).sort());
    assert.deepEqual(options(html, 'case-route-picker'), ['all', ...run.investigationSummary.routes.map(route => route.id)]);
    assert.equal(workspace.run, run);
    assert.equal(workspace.events, events);
  }
});

test('route and medical-result selections intersect and the picker, population filter and export agree', () => {
  const workspace = createWorkspace({dataset:'case-hiv'}), run = workspace.run;
  workspace.setFilters({subgroup:'PROTOCOL_REVISION_REVIEW'});
  let html = renderCasePeopleControls(run, workspace.state);
  assert.ok(options(html, 'case-patient-picker').includes('HIV-A'));
  assert.ok(!options(html, 'case-patient-picker').includes('HIV-B'));
  assert.ok(!options(html, 'case-patient-picker').includes('HIV-F'));
  workspace.setFilters({status:'excluded'});
  const ids = options(renderCasePeopleControls(run, workspace.state), 'case-patient-picker').filter(Boolean);
  assert.deepEqual(ids, visibleRecords(run, workspace.state.filters).map(record => record.id));
  assert.deepEqual(ids, buildReviewPacket(workspace).filteredPatientIds);
  assert.ok(ids.length > 0);
  assert.ok(ids.every(id => run.current.records.find(record => record.id === id).status === 'excluded'));
  assert.equal(workspace.run, run);
  assert.equal(workspace.runs.length, 1);
});

test('a selected patient outside the filters is not silently added, and an empty group has a clear recovery', () => {
  const workspace = createWorkspace({dataset:'case-hiv'});
  workspace.selectPatient('HIV-B');
  workspace.setFilters({subgroup:'PROTOCOL_REVISION_REVIEW'});
  let html = renderCasePeopleControls(workspace.run, workspace.state);
  assert.ok(!options(html, 'case-patient-picker').includes('HIV-B'));
  assert.match(html, /<option value="" selected disabled>Choose a patient in this group/);
  workspace.setFilters({query:'no-such-person'});
  html = renderCasePeopleControls(workspace.run, workspace.state);
  assert.match(html, /id="case-patient-picker"[^>]*disabled/);
  assert.match(html, /No people match these filters/);
  assert.match(html, /id="case-show-people"[^>]*disabled/);
  assert.match(html, /data-action="clear-filters"/);
});

test('linked chart selections and configured renal matches retain their exact selected people', () => {
  const workspace = createWorkspace({dataset:'case-renal'});
  workspace.setScenario('renal-revision');
  workspace.setFilters({status:'new'});
  assert.match(renderCasePeopleControls(workspace.run, workspace.state), /Show 5 people/);
  assert.ok(visibleRecords(workspace.run, workspace.state.filters).every(record => record.status === 'eligible'));
  const group = workspace.run.chartGroups.find(group => group.id.startsWith('composition:') && group.ids.length);
  workspace.setFilters({status:'all',subgroup:group.id});
  const html = renderCasePeopleControls(workspace.run, workspace.state);
  assert.ok(options(html, 'case-route-picker').includes(group.id));
  assert.deepEqual(options(html, 'case-patient-picker').filter(Boolean).sort(), [...group.ids].sort());
  for (const dataset of ['casebook','expanded']) {
    workspace.setDataset(dataset);
    assert.equal(renderCasePeopleControls(workspace.run, workspace.state), '');
  }
});
