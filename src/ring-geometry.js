export function createRingBuffer(steps = 96, cornerSteps = 4) {
  const profile = [];
  const halfWidth = .60, halfHeight = .46, corner = .11;
  const centers = [[halfWidth - corner, halfHeight - corner], [-halfWidth + corner, halfHeight - corner], [-halfWidth + corner, -halfHeight + corner], [halfWidth - corner, -halfHeight + corner]];
  for (let side = 0; side < 4; side++) for (let step = 0; step <= cornerSteps; step++) {
    const angle = side * Math.PI / 2 + step / cornerSteps * Math.PI / 2;
    const nr = Math.cos(angle), ny = Math.sin(angle);
    profile.push([centers[side][0] + corner * nr, .5 + centers[side][1] + corner * ny, nr, ny]);
  }
  const count = profile.length, stride = count + 1, rows = steps + 2;
  const sideVertices = stride * rows;
  const vertexCount = sideVertices + (count + 1) * 2;
  const indices = [];
  for (let row = 0; row < rows - 1; row++) {
    if (row === steps / 2) continue;
    for (let point = 0; point < count; point++) {
      const a = row * stride + point, b = a + stride;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  for (let end = 0; end < 2; end++) {
    const base = sideVertices + end * (count + 1), center = base + count;
    for (let point = 0; point < count; point++) {
      const next = base + (point + 1) % count;
      if (end) indices.push(center, base + point, next);
      else indices.push(center, next, base + point);
    }
  }
  return { steps, profile, stride, rows, sideVertices, positions: new Float32Array(vertexCount * 3), normals: new Float32Array(vertexCount * 3), colors: new Float32Array(vertexCount * 3), indices: new Uint16Array(indices) };
}

export function updateRingBuffer(buffer, start, span, matchingFraction, bright, dim) {
  const half = buffer.steps / 2, count = buffer.profile.length;
  const matched = Math.max(0, Math.min(1, matchingFraction));
  for (let row = 0; row < buffer.rows; row++) {
    const first = row <= half;
    const t = first ? matched * row / half : matched + (1 - matched) * (row - half - 1) / half;
    const angle = start + span * t, cos = Math.cos(angle), sin = Math.sin(angle);
    const color = first && matched > 0 || matched === 1 ? bright : dim;
    for (let point = 0; point <= count; point++) {
      const p = buffer.profile[point % count], offset = (row * buffer.stride + point) * 3, r = 3.55 + p[0];
      buffer.positions[offset] = r * cos; buffer.positions[offset + 1] = p[1]; buffer.positions[offset + 2] = r * sin;
      buffer.normals[offset] = p[2] * cos; buffer.normals[offset + 1] = p[3]; buffer.normals[offset + 2] = p[2] * sin;
      buffer.colors[offset] = color[0]; buffer.colors[offset + 1] = color[1]; buffer.colors[offset + 2] = color[2];
    }
  }
  for (let end = 0; end < 2; end++) {
    const angle = start + span * end, cos = Math.cos(angle), sin = Math.sin(angle);
    const color = end ? matched === 1 ? bright : dim : matched > 0 ? bright : dim;
    for (let point = 0; point <= count; point++) {
      const p = point === count ? null : buffer.profile[point];
      const offset = (buffer.sideVertices + end * (count + 1) + point) * 3;
      const r = 3.55 + (p ? p[0] : 0);
      buffer.positions[offset] = r * cos; buffer.positions[offset + 1] = p ? p[1] : .5; buffer.positions[offset + 2] = r * sin;
      buffer.normals[offset] = end ? -sin : sin; buffer.normals[offset + 1] = 0; buffer.normals[offset + 2] = end ? cos : -cos;
      buffer.colors[offset] = color[0]; buffer.colors[offset + 1] = color[1]; buffer.colors[offset + 2] = color[2];
    }
  }
}
