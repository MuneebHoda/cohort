import test from 'node:test';
import assert from 'node:assert/strict';
import { createRingBuffer, updateRingBuffer } from '../src/ring-geometry.js';

const bright = [.1, .7, .5], dim = [.02, .1, .1];
test('capped rounded bands retain buffers, finite vertices and unit normals at every boundary', () => {
  const b = createRingBuffer(), positions = b.positions, indices = b.indices;
  for (const span of [0, .00001, .8, Math.PI, Math.PI * 2]) for (const fraction of [0, .001, .5, .999, 1]) {
    updateRingBuffer(b, -Math.PI / 2, span, fraction, bright, dim);
    assert.equal(b.positions, positions); assert.equal(b.indices, indices);
    assert.ok([...b.positions, ...b.normals, ...b.colors].every(Number.isFinite));
    assert.ok(Math.max(...b.indices) < b.positions.length / 3);
    for (let i = 0; i < b.normals.length; i += 3) assert.ok(Math.abs(Math.hypot(...b.normals.subarray(i, i + 3)) - 1) < 1e-6);
    for (let i = 0; i < b.positions.length; i += 3) { assert.ok(Math.hypot(b.positions[i], b.positions[i + 2]) <= 4.151); assert.ok(b.positions[i + 1] >= .039 && b.positions[i + 1] <= .961); }
  }
});

test('matching fraction splits the same angular band without interpolating clinical colors', () => {
  const b = createRingBuffer(); updateRingBuffer(b, .2, 2, .3, bright, dim);
  const boundary = b.steps / 2 * b.stride * 3, next = boundary + b.stride * 3;
  assert.deepEqual([...b.positions.subarray(boundary, boundary + 3)], [...b.positions.subarray(next, next + 3)]);
  assert.ok(Math.abs(Math.atan2(b.positions[boundary + 2], b.positions[boundary]) - .8) < 1e-6);
  assert.ok(Math.abs(b.colors[boundary + 1] - .7) < 1e-6);
  assert.ok(Math.abs(b.colors[next + 1] - .1) < 1e-6);
  for (const fraction of [0, 1]) {
    updateRingBuffer(b, 0, 1, fraction, bright, dim);
    const color = fraction ? bright : dim;
    for (let i = 0; i < b.colors.length; i++) assert.ok(Math.abs(b.colors[i] - color[i % 3]) < 1e-6);
  }
});

test('band side and cap winding face their supplied outward normals', () => {
  const b = createRingBuffer(); updateRingBuffer(b, .1, 1.4, .5, bright, dim);
  let triangles = 0;
  for (let i = 0; i < b.indices.length; i += 3) {
    const [a, c, d] = b.indices.subarray(i, i + 3);
    const ab = [0, 1, 2].map(k => b.positions[c * 3 + k] - b.positions[a * 3 + k]);
    const ac = [0, 1, 2].map(k => b.positions[d * 3 + k] - b.positions[a * 3 + k]);
    const cross = [ab[1]*ac[2]-ab[2]*ac[1], ab[2]*ac[0]-ab[0]*ac[2], ab[0]*ac[1]-ab[1]*ac[0]];
    const dot = cross.reduce((n, value, k) => n + value * b.normals[a * 3 + k], 0);
    assert.ok(dot >= -1e-8, 'triangle winding must face outward');
    if (dot > 1e-8) triangles++;
  }
  assert.ok(triangles > 3000);
});
