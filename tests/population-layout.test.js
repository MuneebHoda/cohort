import test from 'node:test';
import assert from 'node:assert/strict';
import { getPopulationGroups, getFocusPageLayout, getFocusPage, getGroupTransfers, getRingSegments } from '../src/population-layout.js';
import { createWorkspace, visibleRecords } from '../src/workspace.js';

const workspace = createWorkspace({dataset:'expanded'});
const before = workspace.run;
workspace.setScenario('renal-revision');
const run = workspace.run;
const dimensions = getFocusPageLayout(645, 320);

test('grouped overview represents all 500 unique patients in four disjoint clinical groups', () => {
  const groups = getPopulationGroups(run);
  assert.equal(groups.length, 4);
  assert.equal(groups.reduce((sum, group) => sum + group.total, 0), 500);
  assert.equal(new Set(groups.flatMap(group => group.records.map(record => record.id))).size, 500);
  assert.equal(groups.find(group => group.id === 'matching').total, run.original.eligible);
  assert.equal(groups.find(group => group.id === 'new').total, run.current.newlyEligible);
});

test('focused pages fit accessible sphere controls at desktop, laptop and phone sizes', () => {
  assert.equal(dimensions.capacity, 6);
  assert.equal(getFocusPageLayout(589, 270).capacity, 5);
  assert.equal(getFocusPageLayout(587, 270).capacity, 5);
  assert.equal(getFocusPageLayout(343, 370).capacity, 3);
  for (const width of [110, 260, 343, 420, 589, 645]) {
    const layout = getFocusPageLayout(width, 270);
    assert.ok(layout.columns * layout.targetWidth + (layout.columns - 1) * layout.gap <= width);
    assert.ok(layout.targetHeight >= 44);
  }
});

test('paging covers zero, exact, partial and multiple windows without duplicate or missing IDs', () => {
  for (const count of [0, 1, 3, 6, 7, 12, 13, 500]) {
    const group = { records: Array.from({ length: count }, (_, index) => ({ id: 'ID-' + index })) };
    const ids = [];
    for (let index = 0; index < Math.max(1, Math.ceil(count / dimensions.capacity)); index++) {
      const page = getFocusPage(group, dimensions, index);
      ids.push(...page.records.map(record => record.id));
      assert.equal(page.end - page.start + (page.records.length ? 1 : 0), page.records.length);
      assert.ok(page.records.length <= dimensions.capacity);
    }
    assert.deepEqual(ids, group.records.map(record => record.id));
    assert.ok(getFocusPage(group, dimensions, 999).page < Math.max(1, Math.ceil(count / dimensions.capacity)));
  }
});

test('new matching segment uses the established ranking followed by unscored matching patients', () => {
  const group = getPopulationGroups(run).find(group => group.id === 'new');
  assert.deepEqual(group.records.slice(0, run.ranked.length).map(record => record.id), run.ranked.map(record => record.id));
  assert.ok(group.records.slice(run.ranked.length).every(record => run.profiles[record.id].score === null));
  for (const other of getPopulationGroups(run).filter(group => group.id !== 'new')) {
    assert.deepEqual(other.records.map(record => record.id), [...other.records.map(record => record.id)].sort((a, b) => a.localeCompare(b, 'en', { numeric: true })));
  }
});

test('shared filters intersect each segment without redefining whole-group or loaded counts', () => {
  const ids = visibleRecords(run, { demographic: 'race:asian', status: 'excluded' }).map(record => record.id);
  const groups = getPopulationGroups(run, ids);
  assert.equal(groups.reduce((sum, group) => sum + group.records.length, 0), ids.length);
  assert.equal(groups.reduce((sum, group) => sum + group.total, 0), 500);
  assert.ok(groups.find(group => group.id === 'excluded').records.every(record => ids.includes(record.id)));
  assert.equal(getFocusPage(getPopulationGroups(run, [])[0], dimensions, 7).records.length, 0);
});

test('locating patients and responsive resizing preserve exact identity on a valid page', () => {
  for (const group of getPopulationGroups(run)) for (const record of group.records) {
    const desktop = getFocusPage(group, dimensions, 0, record.id);
    const phone = getFocusPage(group, getFocusPageLayout(343, 370), desktop.page, record.id);
    assert.ok(desktop.records.some(item => item.id === record.id));
    assert.ok(phone.records.some(item => item.id === record.id));
  }
});

test('scenario transfers describe actual classification movements and reverse exactly', () => {
  const forward = getGroupTransfers(before, run), reverse = getGroupTransfers(run, before);
  assert.equal(forward.reduce((sum, transfer) => sum + transfer.ids.length, 0), run.current.statusChanged);
  for (const transfer of forward) assert.deepEqual(reverse.find(item => item.from === transfer.to && item.to === transfer.from).ids, transfer.ids);
  assert.deepEqual(getGroupTransfers(run, run), []);
  assert.deepEqual(getGroupTransfers(null, run), []);
  assert.deepEqual(getGroupTransfers(before, { ...run, datasetVersion: 'different' }), []);
});


test('ring uses whole-cohort proportions; filtered fractions never resize the population', () => {
  const complete = getRingSegments(getPopulationGroups(run));
  const filtered = getRingSegments(getPopulationGroups(run, complete.map(s => s.records[0].id)));
  assert.deepEqual(complete.map(s => s.total), [153, 80, 212, 55]);
  const available = Math.PI * 2 - 4 * Math.PI / 72;
  for (let i = 0; i < complete.length; i++) {
    assert.equal(complete[i].fraction, complete[i].total / 500);
    assert.equal(complete[i].span, available * complete[i].total / 500);
    assert.equal(filtered[i].span, complete[i].span);
    assert.equal(filtered[i].start, complete[i].start);
    assert.equal(filtered[i].matchingFraction, filtered[i].records.length / filtered[i].total);
  }
  assert.equal(filtered.reduce((n, s) => n + s.records.length, 0), 4);
});

test('reference ring reconciles exact counts and filtered matching fractions', () => {
  const w = createWorkspace({dataset:'expanded'}); w.setDataset('casebook');
  assert.deepEqual(getRingSegments(getPopulationGroups(w.run)).map(s => s.total), [4, 0, 15, 1]);
  w.setScenario('renal-revision');
  const full = getRingSegments(getPopulationGroups(w.run));
  const filtered = getRingSegments(getPopulationGroups(w.run, ['P01', 'P03', 'P06', 'P16']));
  assert.deepEqual(full.map(s => s.total), [4, 6, 8, 2]);
  assert.deepEqual(full.map(s => s.fraction), [.2, .3, .4, .1]);
  assert.deepEqual(filtered.map(s => s.matchingFraction), [1/4, 1/6, 1/8, 1/2]);
});

test('zero and tiny segments remain honest, finite and do not acquire artificial minimum arcs', () => {
  const model = counts => getRingSegments(counts.map((total, id) => ({ id, total, records: [] })));
  const empty = model([0, 0, 0, 0]);
  assert.ok(empty.every(s => s.span === 0 && s.matchingFraction === 0 && Number.isFinite(s.start)));
  const single = model([0, 500, 0, 0]);
  assert.equal(single[1].span, Math.PI * 2); assert.equal(single[1].gap, 0);
  assert.ok(single.filter(s => !s.total).every(s => s.span === 0 && s.gap === 0));
  const tiny = model([499, 1, 0, 0]);
  assert.ok(Math.abs(tiny[0].span / tiny[1].span - 499) < 1e-10);
  assert.ok(Math.abs(tiny.reduce((n, s) => n + s.span + s.gap, 0) - Math.PI * 2) < 1e-10);
});
