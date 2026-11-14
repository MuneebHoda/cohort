import test from 'node:test';
import assert from 'node:assert/strict';
import { getMarkerLayout } from '../src/constellation.js';
import { anchorPatients } from '../src/patients.js';
import { evaluateCohort } from '../src/cohort.js';

test('the population registry retains one deterministic clinical group assignment per loaded record', () => {
  const original = getMarkerLayout(evaluateCohort(anchorPatients, false).records);
  const proposed = getMarkerLayout(evaluateCohort(anchorPatients, true).records);
  assert.equal(original.length, anchorPatients.length);
  assert.ok(original.every(marker => [-.25, .25].includes(marker.x) && [-.25, .25].includes(marker.y)));
  assert.deepEqual(original.map(marker => marker.id), anchorPatients.map(patient => patient.id));
  assert.deepEqual(proposed.map(marker => marker.id), original.map(marker => marker.id));
  assert.deepEqual(getMarkerLayout([...evaluateCohort(anchorPatients, true).records].reverse()), proposed);
  assert.equal(proposed.filter(marker => marker.group === 'matching').length, 4);
  assert.equal(proposed.filter(marker => marker.group === 'new').length, 6);
  assert.equal(proposed.filter(marker => marker.group === 'excluded').length, 8);
  assert.equal(proposed.filter(marker => marker.group === 'indeterminate').length, 2);
});

test('only reclassified records change their assigned overview group address', () => {
  const baseline = getMarkerLayout(evaluateCohort(anchorPatients, false).records);
  const proposed = getMarkerLayout(evaluateCohort(anchorPatients, true).records);
  const moved = proposed.filter(marker => {
    const before = baseline.find(item => item.id === marker.id);
    return before.x !== marker.x || before.y !== marker.y || before.z !== marker.z;
  });
  assert.deepEqual(moved.map(marker => marker.id), ['P02', 'P03', 'P09', 'P11', 'P13', 'P16', 'P19']);
  assert.equal(proposed.find(marker => marker.id === 'P06').group, 'excluded');
  assert.equal(proposed.find(marker => marker.id === 'P16').group, 'indeterminate');
  assert.deepEqual(getMarkerLayout(evaluateCohort(anchorPatients, false).records), baseline);
});

test('empty populations are supported and duplicate patient identities are rejected', () => {
  assert.deepEqual(getMarkerLayout([]), []);
  assert.throws(() => getMarkerLayout([{ id: 'P01', status: 'eligible' }, { id: 'P01', status: 'excluded' }]), /unique patient IDs/);
});
