import { motionSettings } from './motion.js';

const groups = [
  { id: 'matching', label: 'Already matching', description: 'Meets the original modeled rules', color: '--status-existing-stage', x: -3.15, y: 2.1 },
  { id: 'new', label: 'Newly matching', description: 'Newly meets the proposed modeled rules', color: '--status-newly-stage', x: 3.15, y: 2.1 },
  { id: 'excluded', label: 'Excluded', description: 'At least one modeled restriction applies', color: '--status-excluded-stage', x: -3.15, y: -1.95 },
  { id: 'indeterminate', label: 'Indeterminate', description: 'Required information is unresolved', color: '--status-indeterminate-stage', x: 3.15, y: -1.95 },
];

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const compareIds = (a, b) => String(a.id).localeCompare(String(b.id), 'en', { numeric: true }) || String(a.id).localeCompare(String(b.id), 'en');
const markerGroup = record => record.status === 'eligible' ? record.newlyEligible ? 'new' : 'matching' : record.status === 'excluded' ? 'excluded' : 'indeterminate';
const hashId = id => [...String(id)].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 217);

// The same ID owns the same slot in each group. Reclassification moves only affected records.
export function getMarkerLayout(records = []) {
  const sorted = [...records].sort(compareIds);
  if (new Set(sorted.map(record => record.id)).size !== sorted.length) throw new Error('Patient markers require unique patient IDs.');
  const columns = Math.max(3, Math.ceil(Math.sqrt(sorted.length * 1.15)));
  const rows = Math.max(1, Math.ceil(sorted.length / columns));
  const spacingX = Math.min(1.1, 4.75 / Math.max(1, columns - 1));
  const spacingY = Math.min(.85, 2.3 / Math.max(1, rows - 1));
  return sorted.map((record, index) => {
    const group = groups.find(item => item.id === markerGroup(record));
    return {
      id: record.id, status: record.status, group: group.id, label: group.description, color: group.color,
      column: index % columns, row: Math.floor(index / columns), columns, rows,
      x: group.x + (index % columns - (columns - 1) / 2) * spacingX,
      y: group.y + .65 - Math.floor(index / columns) * spacingY,
      z: (hashId(record.id) % 7 - 3) * .09,
    };
  });
}

export function createConstellation(container, { onSelect = () => {} } = {}) {
  const abort = new AbortController();
  const markers = new Map();
  const batches = [];
  const geometries = new Map();
  const labels = new Map();
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let THREE, renderer, scene, camera, controls, raycaster, dummy, vector, pointer, selectionRing;
  let snapshot, layout = [], visibleIds = new Set(), selectedId = null, hoveredId = null;
  let width = 0, height = 0, shown = true, intersecting = true, destroyed = false, reduced = preference.matches;
  let frame = 0, frameCount = 0, animation = null, fallback = false, unavailable = '', pointerStart = null, pendingPointer = null;
  let fallbackHtml = '';
  const intersections = [];
  const token = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const colors = new Map();
  container.innerHTML = `<section class="constellation" aria-label="Calculated synthetic patient population"><header class="constellation-header"><div><span class="constellation-kicker">THE MODELED POPULATION</span><h3>Every point. A patient.</h3></div><div class="constellation-tools"><button class="constellation-reset" type="button" aria-label="Reset population camera"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/></svg></button><button class="constellation-mode" type="button" aria-pressed="false">2D view</button></div></header><div class="constellation-context"><span class="constellation-scenario"></span><span class="constellation-denominator"></span></div><div class="constellation-viewport"><div class="constellation-zones" aria-hidden="true">${groups.map(group => `<div class="constellation-zone constellation-zone-${group.id}"><span class="constellation-zone-title"><i class="constellation-symbol ${group.id}"></i>${group.label}<strong data-zone-count="${group.id}"></strong></span></div>`).join('')}</div><div class="constellation-renderer"></div><div class="constellation-labels"></div><div class="constellation-fallback" hidden></div><p class="constellation-empty" hidden>No records match the current filters.<br>Clear a filter to explore this cohort.</p></div><div class="constellation-reading"><span class="constellation-selection"></span><span class="constellation-interaction">Select a point · use the table for precise or keyboard selection</span></div><footer class="constellation-foot"><span>One marker per loaded record · no sampling</span><span>Placement is illustrative, not medical risk.</span></footer></section>`;
  const root = container.firstElementChild;
  const viewport = root.querySelector('.constellation-viewport');
  const renderHost = root.querySelector('.constellation-renderer');
  const labelHost = root.querySelector('.constellation-labels');
  const fallbackHost = root.querySelector('.constellation-fallback');
  const modeButton = root.querySelector('.constellation-mode');
  const canRender = () => renderer && shown && intersecting && !document.hidden && !fallback && !destroyed;

  function targetFor(item, output) {
    const left = item.group === 'matching' || item.group === 'excluded';
    const top = item.group === 'matching' || item.group === 'new';
    const x = width * (left ? .09 : .56) + item.column / Math.max(1, item.columns - 1) * width * .35;
    const firstY = height * (top ? .025 : .52) + 43;
    const lastY = height * (top ? .50 : 1) - 24;
    const y = firstY + item.row / Math.max(1, item.rows - 1) * Math.max(0, lastY - firstY);
    output.set(camera.left + x / width * (camera.right - camera.left), camera.top - y / height * (camera.top - camera.bottom), item.z);
  }
  function markerScale(item) {
    const xSpacing = width * .35 / Math.max(1, item.columns - 1);
    const ySpacing = Math.max(1, height * .48 - 68) / Math.max(1, item.rows - 1);
    const radiusPx = Math.min(9, xSpacing * .30, ySpacing * .30);
    return Math.max(.035, radiusPx / (.20 * width / (camera.right - camera.left)));
  }
  function geometry(name) {
    if (!geometries.has(name)) geometries.set(name, name === 'excluded' ? new THREE.OctahedronGeometry(.23) : name === 'unknown' ? new THREE.TorusGeometry(.20, .043, 6, 18) : name === 'new-ring' ? new THREE.TorusGeometry(.30, .020, 6, 22) : new THREE.IcosahedronGeometry(.20, 1));
    return geometries.get(name);
  }
  function clearBatches() {
    for (const batch of batches) { scene.remove(batch.mesh); batch.mesh.material.dispose(); batch.mesh.dispose(); }
    batches.length = 0;
  }
  function buildBatches() {
    clearBatches();
    for (const [name, matches] of [['body', item => ['matching', 'new'].includes(item.group)], ['excluded', item => item.group === 'excluded'], ['unknown', item => item.group === 'indeterminate'], ['new-ring', item => item.group === 'new']]) {
      const items = layout.filter(matches);
      if (!items.length) continue;
      const ring = name === 'new-ring' || name === 'unknown';
      const material = ring ? new THREE.MeshBasicMaterial({ color: token('--stage-text') }) : new THREE.MeshStandardMaterial({ color: token('--surface'), roughness: .42, metalness: .10 });
      const mesh = new THREE.InstancedMesh(geometry(name), material, items.length);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.userData.patientIds = items.map(item => item.id);
      mesh.userData.selectable = name !== 'new-ring';
      const batch = { mesh, items, name };
      batches.push(batch); scene.add(mesh);
    }
    updateColors(); writeMatrices();
  }
  function updateColors() {
    if (!THREE) return;
    const background = new THREE.Color(token('--stage-background'));
    for (const batch of batches) {
      for (let i = 0; i < batch.items.length; i++) {
        const item = batch.items[i];
        const color = colors.get(item.group).clone();
        if (!visibleIds.has(item.id)) color.lerp(background, .84);
        batch.mesh.setColorAt(i, color);
      }
      if (batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true;
    }
  }
  function writeMatrices() {
    if (!dummy) return;
    for (const batch of batches) {
      for (let i = 0; i < batch.items.length; i++) {
        const marker = markers.get(batch.items[i].id);
        dummy.position.copy(marker.position); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(marker.scale); dummy.updateMatrix();
        batch.mesh.setMatrixAt(i, dummy.matrix);
      }
      batch.mesh.instanceMatrix.needsUpdate = true;
      batch.mesh.boundingSphere = null;
      if (!animation) batch.mesh.computeBoundingSphere();
    }
  }
  function syncLabels() {
    const wanted = layout.length <= 30 ? layout.map(item => item.id) : [...new Set([selectedId, hoveredId].filter(id => markers.has(id)))];
    for (const [id, label] of labels) if (!wanted.includes(id)) { label.remove(); labels.delete(id); }
    for (const id of wanted) {
      const marker = markers.get(id); if (!marker) continue;
      let label = labels.get(id);
      if (!label) { label = document.createElement('button'); label.type = 'button'; label.dataset.patientId = id; label.innerHTML = `<span>${escape(id)}</span>`; labelHost.append(label); labels.set(id, label); }
      label.className = `constellation-marker-label ${marker.item.group}${id === selectedId ? ' selected' : ''}${visibleIds.has(id) ? '' : ' filtered-out'}`;
      label.disabled = !visibleIds.has(id); label.setAttribute('aria-label', `Inspect ${id}: ${marker.item.label}`); label.setAttribute('aria-pressed', String(id === selectedId));
    }
  }
  function drawLabels() {
    for (const [id, label] of labels) {
      const marker = markers.get(id); if (!marker) continue;
      vector.copy(marker.position).project(camera);
      label.style.transform = `translate(${(vector.x + 1) * width / 2}px,${(1 - vector.y) * height / 2}px) translate(-50%,-8px)`;
    }
    if (selectionRing) {
      const marker = markers.get(selectedId); selectionRing.visible = Boolean(marker);
      if (marker) { selectionRing.position.copy(marker.position); selectionRing.scale.setScalar(Math.max(marker.scale, .6)); }
    }
  }
  function pick(clientX, clientY) {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.set((clientX - bounds.left) / bounds.width * 2 - 1, -(clientY - bounds.top) / bounds.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera); intersections.length = 0;
    for (const batch of batches) if (batch.mesh.userData.selectable) raycaster.intersectObject(batch.mesh, false, intersections);
    intersections.sort((a, b) => a.distance - b.distance);
    for (const hit of intersections) {
      const id = hit.object.userData.patientIds[hit.instanceId];
      if (id && visibleIds.has(id)) return id;
    }
    return null;
  }
  function draw(now) {
    frame = 0; if (!canRender()) return;
    if (animation) {
      const t = Math.min(1, (now - animation.start) / animation.duration);
      const eased = 1 - (1 - t) ** 3;
      for (const marker of markers.values()) marker.position.lerpVectors(marker.from, marker.target, eased);
      if (t === 1) animation = null;
      writeMatrices();
    }
    if (pendingPointer) { hoveredId = pick(pendingPointer.x, pendingPointer.y); pendingPointer = null; syncLabels(); }
    drawLabels(); renderer.render(scene, camera); frameCount++;
    root.dataset.drawCalls = String(renderer.info.render.calls); root.dataset.frameCount = String(frameCount); root.dataset.rendering = animation ? 'transitioning' : 'settled';
    if (animation) requestDraw();
  }
  function requestDraw() { if (!frame && canRender()) frame = requestAnimationFrame(draw); }
  function reposition(animate) {
    if (!camera || !width || !height) return;
    const oldIds = new Set(markers.keys()); let moved = false;
    for (const item of layout) {
      oldIds.delete(item.id); let marker = markers.get(item.id);
      if (!marker) { const start = new THREE.Vector3(); targetFor(item, start); marker = { item, position: start.clone(), from: start.clone(), target: start.clone(), scale: 1 }; markers.set(item.id, marker); }
      marker.item = item; marker.from.copy(marker.position); targetFor(item, marker.target); marker.scale = markerScale(item);
      moved ||= marker.from.distanceToSquared(marker.target) > .00001;
      if (!animate) marker.position.copy(marker.target);
    }
    for (const id of oldIds) markers.delete(id);
    animation = animate && moved ? { start: performance.now(), duration: motionSettings().population } : null;
    buildBatches(); syncLabels(); requestDraw();
  }
  function resize() {
    if (!renderer || !camera) return;
    const nextWidth = Math.max(1, viewport.clientWidth), nextHeight = Math.max(1, viewport.clientHeight);
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth; height = nextHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(width, height, false);
    camera.left = -6.3; camera.right = 6.3; camera.top = 6.3 * height / width; camera.bottom = -camera.top; camera.updateProjectionMatrix();
    reposition(false);
  }
  function renderFallback() {
    const focusedId = fallbackHost.contains(document.activeElement) ? document.activeElement.dataset.patientId : null;
    const scrollTop = fallbackHost.scrollTop;
    const html = `${unavailable ? `<p class="constellation-fallback-note">${escape(unavailable)} This is the same complete dataset.</p>` : ''}<div class="constellation-fallback-groups">${groups.map(group => {
      const items = layout.filter(item => item.group === group.id);
      return `<section class="constellation-fallback-group"><h4><i class="constellation-symbol ${group.id}"></i>${group.label}<span>${items.length}</span></h4><div>${items.map(item => `<button type="button" data-patient-id="${escape(item.id)}" class="constellation-patient ${item.group} ${item.id === selectedId ? 'selected' : ''}" aria-label="Inspect ${escape(item.id)}: ${escape(item.label)}" aria-pressed="${item.id === selectedId}" ${visibleIds.has(item.id) ? '' : 'disabled'}><i></i><span>${escape(item.id)}</span></button>`).join('') || '<p>No records in this group</p>'}</div></section>`;
    }).join('')}</div>`;
    if (fallbackHtml !== html) {
      fallbackHost.innerHTML = html; fallbackHtml = html;
      if (focusedId) [...fallbackHost.querySelectorAll('[data-patient-id]')].find(button => button.dataset.patientId === focusedId && !button.disabled)?.focus({ preventScroll: true });
      fallbackHost.scrollTop = scrollTop;
    }
  }
  function applyFallback() {
    root.classList.toggle('is-2d', fallback); renderHost.hidden = fallback; labelHost.hidden = fallback; root.querySelector('.constellation-zones').hidden = fallback; fallbackHost.hidden = !fallback;
    root.querySelector('.constellation-reset').hidden = fallback; modeButton.textContent = fallback ? unavailable ? '2D alternative' : '3D view' : '2D view'; modeButton.disabled = Boolean(unavailable); modeButton.setAttribute('aria-pressed', String(fallback));
    if (fallback) { cancelAnimationFrame(frame); frame = 0; renderFallback(); } else requestDraw();
  }
  function update({ run, selectedPatientId, visibleIds: ids, reducedMotion = preference.matches }) {
    const changed = snapshot?.id !== run?.id; const previousRun = snapshot; snapshot = run; selectedId = selectedPatientId; reduced = reducedMotion;
    if (changed) layout = getMarkerLayout(run?.current.records || []);
    const nextIds = new Set(ids ?? layout.map(item => item.id));
    const filterChanged = visibleIds.size !== nextIds.size || [...nextIds].some(id => !visibleIds.has(id)); visibleIds = nextIds;
    if (hoveredId && !visibleIds.has(hoveredId)) hoveredId = null;
    root.classList.toggle('dense', layout.length > 30);
    root.dataset.runId = run?.id || ''; root.dataset.markerCount = String(layout.length);
    root.querySelector('.constellation-scenario').textContent = run?.current.gate.active ? 'Proposed renal revision' : run?.current.gate.requested ? 'Revision withheld · original rules active' : 'Original protocol';
    root.querySelector('.constellation-denominator').textContent = `${visibleIds.size} of ${layout.length} highlighted`;
    root.querySelector('.constellation-empty').hidden = visibleIds.size !== 0;
    const selected = layout.find(item => item.id === selectedId);
    root.querySelector('.constellation-selection').textContent = selected ? `${selected.id} · ${selected.label}${visibleIds.has(selected.id) ? '' : ' · outside filter'}` : 'Select a record in the scene or patient table';
    for (const group of groups) { const items = layout.filter(item => item.group === group.id); const matching = items.filter(item => visibleIds.has(item.id)).length; root.querySelector(`[data-zone-count="${group.id}"]`).textContent = visibleIds.size === layout.length ? String(items.length) : `${matching}/${items.length}`; }
    if (THREE && camera) {
      if (changed) reposition(Boolean(previousRun && !reduced && shown && !document.hidden));
      else { if (filterChanged) updateColors(); syncLabels(); requestDraw(); }
    }
    if (fallback) renderFallback();
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-patient-id]'); if (button && !button.disabled && visibleIds.has(button.dataset.patientId)) onSelect(button.dataset.patientId);
    if (event.target.closest('.constellation-mode') && !unavailable) { fallback = !fallback; applyFallback(); }
    if (event.target.closest('.constellation-reset')) controls?.reset();
  }, { signal: abort.signal });
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(viewport);
  const observer = new IntersectionObserver(entries => { intersecting = entries[0]?.isIntersecting ?? true; if (intersecting) requestDraw(); }); observer.observe(container);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else requestDraw(); }, { signal: abort.signal });
  preference.addEventListener('change', event => { reduced = event.matches; if (reduced && animation) { animation = null; for (const marker of markers.values()) marker.position.copy(marker.target); writeMatrices(); requestDraw(); } }, { signal: abort.signal });
  async function initialize() {
    try {
      THREE = await import('three'); const { OrbitControls } = await import('three/addons/controls/OrbitControls.js'); if (destroyed) return;
      for (const group of groups) colors.set(group.id, new THREE.Color(token(group.color)));
      const canvas = document.createElement('canvas'); canvas.dataset.cohortCanvas = 'true'; canvas.setAttribute('aria-hidden', 'true');
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' }); renderer.setClearColor(token('--stage-background'), 0); renderHost.append(canvas);
      scene = new THREE.Scene(); camera = new THREE.OrthographicCamera(-6.3, 6.3, 5, -5, .1, 100); camera.position.set(0, 0, 22);
      scene.add(new THREE.AmbientLight(token('--stage-text'), 2)); const light = new THREE.DirectionalLight(token('--stage-text'), 2.5); light.position.set(3, 6, 10); scene.add(light);
      dummy = new THREE.Object3D(); vector = new THREE.Vector3(); pointer = new THREE.Vector2(); raycaster = new THREE.Raycaster();
      selectionRing = new THREE.Mesh(new THREE.TorusGeometry(.38, .025, 6, 32), new THREE.MeshBasicMaterial({ color: token('--stage-text') })); selectionRing.visible = false; scene.add(selectionRing);
      controls = new OrbitControls(camera, canvas); controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = false; controls.minAzimuthAngle = -.15; controls.maxAzimuthAngle = .15; controls.minPolarAngle = Math.PI / 2 - .10; controls.maxPolarAngle = Math.PI / 2 + .10; controls.saveState(); controls.addEventListener('change', requestDraw);
      canvas.addEventListener('pointerdown', event => { pointerStart = { x: event.clientX, y: event.clientY }; }, { signal: abort.signal });
      canvas.addEventListener('pointerup', event => { if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) < 5) { const id = pick(event.clientX, event.clientY); if (id) onSelect(id); } pointerStart = null; }, { signal: abort.signal });
      canvas.addEventListener('pointermove', event => { pendingPointer = { x: event.clientX, y: event.clientY }; requestDraw(); }, { signal: abort.signal });
      canvas.addEventListener('pointerleave', () => { hoveredId = null; pendingPointer = null; syncLabels(); requestDraw(); }, { signal: abort.signal });
      canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); unavailable = 'The 3D context is unavailable.'; fallback = true; applyFallback(); }, { signal: abort.signal });
      resize(); applyFallback();
    } catch { if (!destroyed) { unavailable = '3D is unavailable in this browser.'; fallback = true; applyFallback(); } }
  }
  initialize();
  return { update, getMarkerIds: () => layout.map(item => item.id),
    setVisible(value) { if (shown === value) return; shown = value; if (!shown) { cancelAnimationFrame(frame); frame = 0; } else { resize(); requestDraw(); } },
    destroy() { destroyed = true; abort.abort(); cancelAnimationFrame(frame); resizeObserver.disconnect(); observer.disconnect(); if (scene) clearBatches(); for (const item of geometries.values()) item.dispose(); selectionRing?.geometry.dispose(); selectionRing?.material.dispose(); controls?.dispose(); renderer?.dispose(); container.replaceChildren(); },
  };
}
