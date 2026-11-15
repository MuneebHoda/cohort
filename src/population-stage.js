import { motionSettings, createStageTransition } from './motion.js';
import { populationGroups, patientGroup, getMarkerLayout, getPopulationGroups, getFocusPageLayout, getFocusPage, getGroupTransfers, getRingSegments } from './population-layout.js';
import { createRingBuffer, updateRingBuffer } from './ring-geometry.js';
import { escape as e } from './ui.js';

const TAU = Math.PI * 2;
const mix = (a, b, t) => a + (b - a) * t;
const shortest = (from, to) => from + ((to - from + Math.PI) % TAU + TAU) % TAU - Math.PI;

export function createConstellation(container, { onSelect = () => {} } = {}) {
  const abort = new AbortController(), preference = matchMedia('(prefers-reduced-motion: reduce)');
  const buttons = new Map(), arcs = [], orbs = new Map(), palette = new Map();
  let THREE, renderer, scene, camera, goalCamera, ring, spheres, dummy, vector, raycaster, pointer, environment;
  let snapshot, registry = [], groups = [], segments = [], selectedId = null, visibleIds = new Set(), focusedPage;
  let width = 0, height = 0, frame = 0, frameCount = 0, signature = '', mode = 'overview', groupId = null, pageIndex = 0;
  let fallback = false, unavailable = '', reduced = preference.matches, shown = true, intersecting = true, destroyed = false, progress = 1, hovered = null;
  let pose = { rotation: 0, scale: 1, lift: 0, distance: 13 }, fromPose = { ...pose }, toPose = { ...pose }, transferTimer;
  container.innerHTML = `<section class="constellation" aria-label="Calculated synthetic patient population"><header class="constellation-header"><div><span class="constellation-kicker">THE MODELED POPULATION</span><h3>A closer look at every patient.</h3></div><div class="constellation-tools"><button data-scene-overview title="Reset the presentation to the population overview">Reset view</button><button class="constellation-mode" aria-pressed="false">2D view</button></div></header><div class="constellation-context"><span class="constellation-scenario"></span><span class="constellation-denominator"></span></div><div class="constellation-navigation"></div><div class="constellation-viewport"><div class="constellation-renderer"></div><svg class="constellation-flat" aria-hidden="true"></svg><svg class="constellation-leaders" aria-hidden="true"></svg><div class="constellation-center"><strong></strong><span>synthetic patients</span></div><div class="constellation-labels"></div><div class="constellation-empty" hidden></div></div><div class="constellation-legend"></div><div class="constellation-pagination"></div><div class="constellation-changes" role="status" hidden></div><div class="constellation-reading"></div><footer class="constellation-foot"><span>Arc size = whole-cohort count · gaps contain no patients.</span><span>Placement is illustrative, not medical risk.</span></footer><span class="sr-only constellation-announcement" role="status" aria-live="polite"></span></section>`;
  const root = container.firstElementChild, viewport = root.querySelector('.constellation-viewport');
  const renderHost = root.querySelector('.constellation-renderer'), labels = root.querySelector('.constellation-labels'), legend = root.querySelector('.constellation-legend');
  const flat = root.querySelector('.constellation-flat'), leaders = root.querySelector('.constellation-leaders'), center = root.querySelector('.constellation-center');
  const modeButton = root.querySelector('.constellation-mode');
  const token = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const canDraw = () => shown && intersecting && !document.hidden && !destroyed;
  const animation = createStageTransition(value => { progress = value; requestDraw(); }, () => { progress = 1; applyPose(); root.dataset.rendering = 'settled'; requestDraw(); });
  root.dataset.animationEngine = globalThis.Motion ? 'Motion' : 'instant';

  function announce(message) { root.querySelector('.constellation-announcement').textContent = message; }
  function patch(element, html) {
    if (element.__html === html) return;
    const key = element.contains(document.activeElement) ? document.activeElement.dataset.sceneControl : null;
    element.innerHTML = html; element.__html = html;
    if (key) (element.querySelector(`[data-scene-control="${key}"]:not(:disabled)`) || root.querySelector('[data-scene-overview]'))?.focus({ preventScroll: true });
  }
  function selectionText() {
    const record = snapshot?.current.records.find(item => item.id === selectedId);
    if (!record) return '<span>Choose a group, then select a patient to inspect.</span>';
    const outside = !visibleIds.has(record.id), onPage = mode === 'focus' && focusedPage.records.some(item => item.id === record.id);
    const group = populationGroups.find(item => item.id === patientGroup(record));
    const context = outside ? 'outside current filters' : mode === 'focus' && patientGroup(record) !== groupId ? 'moved outside this group' : mode === 'focus' && !onPage ? 'outside this page' : group.label;
    return `<span><strong>${e(record.id)}</strong> · ${e(context)}</span>` + (outside ? '<button data-action="clear-filters-locate">Clear filters to locate ↗</button>' : !onPage ? '<button data-scene-locate>Locate selected ↗</button>' : '<span class="constellation-reading-hint">Selected in the patient inspector</span>');
  }
  function renderChrome() {
    if (!snapshot) return;
    const group = groups.find(item => item.id === groupId);
    Object.assign(root.dataset, { sceneMode: mode, group: groupId || '', page: String(pageIndex), markerCount: String(registry.length), displayedPatientCount: String(mode === 'focus' ? focusedPage.records.length : 0), capacity: String(getFocusPageLayout(width).capacity), runId: snapshot.id, filteredCount: String(visibleIds.size) });
    root.classList.toggle('is-focused', mode === 'focus'); root.classList.toggle('is-2d', fallback); root.classList.toggle('compact-ring', width < 760);
    root.querySelector('.constellation-scenario').textContent = snapshot.casePack && !snapshot.casePack.proposedConfigured ? 'Current medical criteria · investigation separate' : snapshot.current.gate.active ? 'Proposed renal revision' : snapshot.current.gate.requested ? 'Revision withheld · original rules active' : 'Original protocol';
    root.querySelector('.constellation-denominator').textContent = visibleIds.size === registry.length ? registry.length + ' patients loaded' : visibleIds.size + ' of ' + registry.length + ' match filters';
    patch(root.querySelector('.constellation-navigation'), mode === 'overview' ? '<span>Population overview</span><span>Select a segment to explore its patients ↘</span>' : `<button data-scene-overview data-scene-control="back">← Population</button><span><i class="constellation-symbol ${groupId}"></i>${e(group.label)}</span><span>${group.records.length} matching / ${group.total} in group</span>`);
    patch(root.querySelector('.constellation-pagination'), mode === 'overview' ? '<span>Four classifications. Every loaded record is accounted for.</span>' : `<button data-scene-page="${pageIndex - 1}" data-scene-control="previous" aria-label="Previous patient spheres" ${pageIndex === 0 ? 'disabled' : ''}>←</button><span><strong>${focusedPage.start}–${focusedPage.end} of ${focusedPage.total}</strong> patients matching filters<small>${snapshot.casePack ? 'Patient ID order · no attention model configured' : groupId === 'new' ? 'Illustrative index ↑ · ranked, then unscored' : 'Patient ID order'} · Page ${pageIndex + 1} / ${focusedPage.pages}</small></span><button data-scene-page="${pageIndex + 1}" data-scene-control="next" aria-label="Next patient spheres" ${pageIndex + 1 >= focusedPage.pages ? 'disabled' : ''}>→</button>`);
    patch(root.querySelector('.constellation-reading'), selectionText());
    const empty = mode === 'focus' && !focusedPage.records.length, host = root.querySelector('.constellation-empty');
    host.hidden = !empty;
    if (empty) host.innerHTML = `<strong>No patients in this view</strong><p>${group.total ? `None of the ${group.total} patients in this group match the filters.` : 'No patients have this classification in the active scenario.'}</p><button data-scene-overview>Back to population</button>`;
    modeButton.textContent = fallback ? unavailable ? '2D alternative' : '3D view' : '2D view';
    modeButton.disabled = Boolean(unavailable); modeButton.title = unavailable || 'Switch presentation'; modeButton.setAttribute('aria-pressed', String(fallback));
    root.querySelector('.constellation-kicker').textContent = unavailable ? '2D POPULATION · 3D UNAVAILABLE' : 'THE MODELED POPULATION';
    renderHost.hidden = fallback; flat.toggleAttribute('hidden', !fallback);
    center.querySelector('strong').textContent = registry.length.toLocaleString();
    syncButtons(); drawLabels();
  }
  function syncButtons() {
    const activeKey = root.contains(document.activeElement) ? document.activeElement.dataset.sceneKey : null;
    const patients = mode === 'focus' ? focusedPage.records : [];
    const keys = new Set(groups.map(group => 'group:' + group.id).concat(patients.map(record => 'patient:' + record.id)));
    for (const [key, button] of buttons) if (!keys.has(key)) { button.remove(); buttons.delete(key); }
    for (const group of groups) {
      const key = 'group:' + group.id;
      let button = buttons.get(key);
      if (!button) { button = document.createElement('button'); button.type = 'button'; button.dataset.sceneKey = key; button.dataset.sceneGroup = group.id; buttons.set(key, button); }
      const host = width < 760 ? legend : labels;
      if (button.parentElement !== host) host.append(button);
      button.className = 'scene-object segment ' + group.id + (groupId === group.id ? ' active' : '');
      button.setAttribute('aria-pressed', String(groupId === group.id));
      button.setAttribute('aria-label', `Inspect ${group.label}: ${group.records.length} match filters, ${group.total} patients in this group`);
      const filtered = group.total !== group.records.length;
      const html = `<i class="constellation-symbol ${group.id}"></i><span class="segment-label">${e(group.label)}<small>${filtered ? 'match filters / whole group' : group.total ? 'patients · inspect ↗' : 'no patients in this scenario'}</small></span><strong>${filtered ? group.records.length + '<small> / ' + group.total + '</small>' : group.total}</strong>`;
      if (button.innerHTML !== html) button.innerHTML = html;
    }
    for (const patient of patients) {
      const key = 'patient:' + patient.id;
      let button = buttons.get(key);
      if (!button) { button = document.createElement('button'); button.type = 'button'; button.dataset.sceneKey = key; button.dataset.scenePatient = patient.id; labels.append(button); buttons.set(key, button); }
      button.className = 'scene-object patient ' + groupId + (patient.id === selectedId ? ' selected' : '');
      button.setAttribute('aria-pressed', String(patient.id === selectedId));
      button.setAttribute('aria-label', `Inspect ${patient.id}: ${groups.find(group => group.id === groupId).label}, eGFR ${patient.egfr_ml_min_1_73m2 ?? 'not recorded'}`);
      labels.append(button);
      button.innerHTML = `<span class="sphere-alternative" aria-hidden="true"></span><span class="sphere-id">${e(patient.id)}</span>${patient.id === selectedId ? '<span class="sphere-selected">Selected</span>' : ''}`;
    }
    if (activeKey && buttons.has(activeKey) && document.activeElement !== buttons.get(activeKey)) buttons.get(activeKey).focus({ preventScroll: true });
  }
  function targetPose() {
    const aspect = width / height, fit = Math.max(10.7, 8.8 / (aspect * .63 * (width < 760 ? .91 : .76)));
    const segment = segments.find(item => item.id === groupId);
    return { rotation: mode === 'focus' && segment?.span ? shortest(pose.rotation, (segment.start + segment.end) / 2 - (Math.PI / 2 - .48)) : shortest(pose.rotation, 0), scale: mode === 'focus' ? height < 350 ? .8 : .86 : 1, lift: mode === 'focus' ? 1.25 : 0, distance: fit };
  }
  function setCamera(target, value) {
    const elevation = .58, azimuth = .48;
    target.position.set(Math.sin(azimuth) * Math.cos(elevation) * value.distance, Math.sin(elevation) * value.distance, Math.cos(azimuth) * Math.cos(elevation) * value.distance);
    target.lookAt(0, .3, 0); target.updateMatrixWorld();
  }
  function makeOrbs() {
    const patients = mode === 'focus' ? focusedPage.records : [], retained = new Set(patients.map(patient => patient.id));
    for (const id of orbs.keys()) if (!retained.has(id)) orbs.delete(id);
    if (goalCamera) setCamera(goalCamera, toPose);
    patients.forEach((patient, index) => {
      const x = width / 2 + (index - (patients.length - 1) / 2) * 100;
      const curve = height < 350 ? 6 : 12;
      const y = height - (height < 350 ? 58 : 66) - (patients.length > 1 ? Math.sin(index / (patients.length - 1) * Math.PI) * curve : curve);
      const previous = orbs.get(patient.id);
      let position, radius = 1;
      if (THREE && goalCamera) {
        const forward = new THREE.Vector3(); goalCamera.getWorldDirection(forward);
        position = new THREE.Vector3(x / width * 2 - 1, 1 - y / height * 2, .5).unproject(goalCamera).sub(goalCamera.position).normalize();
        position.multiplyScalar(8 / position.dot(forward)).add(goalCamera.position);
        radius = 22 * (2 * 8 * Math.tan(THREE.MathUtils.degToRad(35) / 2)) / height;
      }
      const item = { patient, group: groupId, x, y, radius, fromRadius: previous?.currentRadius ?? radius * .35, currentRadius: previous?.currentRadius ?? radius * .35, current: previous?.current?.clone() || (THREE ? new THREE.Vector3(0, 1.2, 0) : null), from: previous?.current?.clone() || (THREE ? new THREE.Vector3(0, 1.2, 0) : null), to: position };
      orbs.set(patient.id, item);
    });
    if (spheres) spheres.count = patients.length;
  }
  function reconcile(animate = true, locateId = null, duration = motionSettings().focus) {
    if (!snapshot || !width || !height) return;
    groups = getPopulationGroups(snapshot, [...visibleIds]); segments = getRingSegments(groups);
    if (mode === 'focus') { focusedPage = getFocusPage(groups.find(item => item.id === groupId), getFocusPageLayout(width), pageIndex, locateId); pageIndex = focusedPage.page; }
    const next = [snapshot.id, [...visibleIds].join(','), mode, groupId, pageIndex, width, height].join('|');
    if (signature === next) { renderChrome(); applyPose(); requestDraw(); return; }
    signature = next; animation.stop(); applyPose(); fromPose = { ...pose }; toPose = targetPose();
    for (let index = 0; index < arcs.length; index++) {
      const arc = arcs[index], segment = segments[index];
      arc.from = { ...arc.current }; arc.to = { start: segment.start, span: segment.span, matching: segment.matchingFraction };
    }
    makeOrbs(); hovered = null; renderChrome();
    root.dataset.rendering = 'transitioning';
    animation.start(duration, !animate || reduced || !canDraw());
  }
  function applyPose() {
    for (const key of ['rotation', 'scale', 'lift', 'distance']) pose[key] = mix(fromPose[key], toPose[key], progress);
    if (camera) setCamera(camera, pose);
    if (ring) { ring.rotation.y = pose.rotation; ring.scale.setScalar(pose.scale); ring.position.y = pose.lift; ring.updateMatrixWorld(true); }
    for (const arc of arcs) {
      for (const key of ['start', 'span', 'matching']) arc.current[key] = mix(arc.from[key], arc.to[key], progress);
      updateRingBuffer(arc.buffer, arc.current.start, arc.current.span, arc.current.matching, arc.bright, arc.dim);
      for (const name of ['position', 'normal', 'color']) arc.mesh.geometry.attributes[name].needsUpdate = true;
      arc.mesh.visible = arc.current.span > .00001;
      const active = groupId === arc.id, hover = hovered === 'group:' + arc.id;
      arc.mesh.position.y = active ? .13 : hover ? .06 : 0;
      arc.mesh.material.emissiveIntensity = active ? .10 : hover ? .065 : 0;
    }
    let index = 0;
    for (const item of orbs.values()) {
      if (item.to) item.current.lerpVectors(item.from, item.to, progress);
      item.currentRadius = mix(item.fromRadius, item.radius, progress);
      if (spheres) {
        dummy.position.copy(item.current); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(item.currentRadius * (hovered === 'patient:' + item.patient.id ? 1.08 : 1)); dummy.updateMatrix();
        spheres.setMatrixAt(index, dummy.matrix); spheres.setColorAt(index, palette.get(item.group));
      }
      index++;
    }
    if (spheres) { spheres.instanceMatrix.needsUpdate = true; if (spheres.instanceColor) spheres.instanceColor.needsUpdate = true; spheres.computeBoundingSphere(); }
    drawLabels();
  }
  function project(x, y, z) {
    vector.set(x, y, z).project(camera);
    return { x: (vector.x + 1) * width / 2, y: (1 - vector.y) * height / 2 };
  }
  function ringPoint(angle, radius = 3.55, y = .8) {
    if (!fallback && camera && ring) {
      vector.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius).applyMatrix4(ring.matrixWorld).project(camera);
      return { x: (vector.x + 1) * width / 2, y: (1 - vector.y) * height / 2 };
    }
    const radiusX = Math.min(Math.min(width * .31, 235) * pose.scale, (mode === 'focus' ? height - 140 : height - 30) / (1.1 * 4.15 / 3.55)) * radius / 3.55, radiusY = radiusX * .55;
    return { x: width / 2 + Math.cos(angle - pose.rotation) * radiusX, y: height * .46 - pose.lift * 30 + Math.sin(angle - pose.rotation) * radiusY };
  }
  function drawLabels() {
    if (!width || !snapshot) return;
    const compact = width < 760, pillWidth = 188, pillHeight = 60, limit = mode === 'focus' ? height - 155 : height - 78;
    const anchors = segments.map((segment, index) => {
      const arc = arcs[index], angle = arc ? arc.current.start + arc.current.span / 2 : (segment.start + segment.end) / 2;
      return { id: segment.id, ...ringPoint(angle), total: segment.total };
    });
    let paths = '';
    if (!compact) for (const side of [-1, 1]) {
      const column = anchors.filter(anchor => (anchor.x < width / 2 ? -1 : 1) === side).sort((a, b) => a.y - b.y);
      column.forEach((anchor, index) => {
        const x = side === -1 ? 18 : width - pillWidth - 18;
        const ideal = Math.max(12, Math.min(limit, anchor.y - 30));
        const y = Math.min(limit - (column.length - index - 1) * 72, Math.max(12 + index * 72, ideal));
        // Keep labels separate even when adjacent segments project to the same side.
        anchor.labelY = Math.max(index ? column[index - 1].labelY + 72 : 12, y);
        const button = buttons.get('group:' + anchor.id);
        if (button) { button.style.transform = `translate(${x}px,${anchor.labelY}px)`; button.style.width = pillWidth + 'px'; }
        if (anchor.total) paths += `<path d="M ${anchor.x.toFixed(1)} ${anchor.y.toFixed(1)} L ${side === -1 ? x + pillWidth + 12 : x - 12} ${(anchor.labelY + pillHeight / 2).toFixed(1)} L ${side === -1 ? x + pillWidth : x} ${(anchor.labelY + pillHeight / 2).toFixed(1)}"/><circle cx="${anchor.x.toFixed(1)}" cy="${anchor.y.toFixed(1)}" r="2.5"/>`;
      });
    }
    leaders.setAttribute('viewBox', `0 0 ${width} ${height}`); leaders.innerHTML = compact ? '' : paths;
    if (compact) for (const group of groups) { const button = buttons.get('group:' + group.id); if (button) { button.style.transform = ''; button.style.width = ''; } }
    for (const [id, item] of orbs) {
      const point = !fallback && camera && item.current ? project(item.current.x, item.current.y, item.current.z) : { x: item.x, y: item.y };
      const button = buttons.get('patient:' + id);
      if (button) { button.style.transform = `translate(${point.x - 42}px,${point.y - 30}px)`; button.style.opacity = String(Math.min(1, progress * 2)); }
    }
    const point = !fallback && camera ? project(0, pose.lift + .35, 0) : { x: width / 2, y: height * .46 - pose.lift * 30 };
    center.style.transform = `translate(${point.x}px,${point.y}px)`;
    if (fallback) drawFlat();
  }
  function drawFlat() {
    const band = (start, span, outer, inner) => {
      const points = [];
      for (let i = 0; i <= 96; i++) points.push(ringPoint(start + span * i / 96, outer));
      for (let i = 96; i >= 0; i--) points.push(ringPoint(start + span * i / 96, inner));
      return 'M' + points.map(point => point.x.toFixed(2) + ',' + point.y.toFixed(2)).join('L') + 'Z';
    };
    // The 2D ring shares exact angular proportions with the sculptural scene.
    flat.setAttribute('viewBox', `0 0 ${width} ${height}`);
    flat.innerHTML = segments.map(segment => {
      if (!segment.span) return '';
      const attr = `style="--segment-color:var(${segment.color})"`;
      return `<path class="flat-base ${segment.id}" ${attr} d="${band(segment.start, segment.span, 4.15, 2.95)}"/>` + (segment.matchingFraction ? `<path class="flat-match ${segment.id}" ${attr} d="${band(segment.start, segment.span * segment.matchingFraction, 4.15, 2.95)}"/>` : '');
    }).join('');
  }
  function draw() {
    frame = 0; if (!canDraw()) return;
    applyPose();
    if (renderer && !fallback) { renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera); root.dataset.drawCalls = String(renderer.info.render.calls); }
    frameCount++; root.dataset.frameCount = String(frameCount); root.dataset.rendering = animation.running ? 'transitioning' : 'settled';
  }
  function requestDraw() { if (!frame && canDraw()) frame = requestAnimationFrame(draw); }
  function resize() {
    const w = viewport.clientWidth, h = viewport.clientHeight;
    if (!w || !h || w === width && h === height) return;
    const anchor = focusedPage?.records.some(record => record.id === selectedId) ? selectedId : focusedPage?.records[0]?.id;
    width = w; height = h;
    if (renderer) { renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(width, height, false); camera.aspect = goalCamera.aspect = width / height; camera.updateProjectionMatrix(); goalCamera.updateProjectionMatrix(); }
    reconcile(false, anchor);
  }
  function showOverview(restore = false) {
    const previous = groupId; mode = 'overview'; groupId = null; pageIndex = 0; focusedPage = null; reconcile();
    announce(`Population overview. ${registry.length} synthetic patients in four classifications.`);
    if (restore) buttons.get('group:' + previous)?.focus({ preventScroll: true });
  }
  function focusGroup(id) {
    mode = 'focus'; groupId = id; pageIndex = 0; reconcile();
    announce(`${groups.find(group => group.id === id).label}. ${focusedPage.total} matching records. Showing ${focusedPage.start} through ${focusedPage.end}.`);
  }
  function focusPatient(id) {
    const record = snapshot?.current.records.find(item => item.id === id);
    if (!record || !visibleIds.has(id)) return false;
    mode = 'focus'; groupId = patientGroup(record); reconcile(true, id); return true;
  }
  function setTransfers(previous, current) {
    clearTimeout(transferTimer);
    const transfers = getGroupTransfers(previous, current), banner = root.querySelector('.constellation-changes');
    banner.hidden = !transfers.length;
    if (!transfers.length) return;
    banner.innerHTML = '<span>Calculated scenario changes</span>' + transfers.map(transfer => `<strong>${transfer.ids.length} ${e(populationGroups.find(group => group.id === transfer.from).label)} → ${e(populationGroups.find(group => group.id === transfer.to).label)}</strong>`).join('');
    transferTimer = setTimeout(() => { banner.hidden = true; }, 6500);
  }
  function update({ run, selectedPatientId, visibleIds: ids, reducedMotion }) {
    const previous = snapshot, datasetChanged = previous && (previous.dataset.id !== run.dataset.id || previous.datasetVersion !== run.datasetVersion);
    snapshot = run; selectedId = selectedPatientId; reduced = reducedMotion ?? preference.matches;
    registry = getMarkerLayout(run.current.records); visibleIds = new Set(ids || registry.map(item => item.id));
    if (datasetChanged) { mode = 'overview'; groupId = null; pageIndex = 0; focusedPage = null; }
    if (previous?.id !== run.id) setTransfers(previous, run);
    reconcile(true, null, previous?.id !== run.id ? motionSettings().population : motionSettings().panel);
  }
  async function initialize() {
    try {
      THREE = await import('three'); if (destroyed) return;
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      renderer.setClearColor(0, 0); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .94;
      scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(35, 1, .1, 100); goalCamera = camera.clone();
      ring = new THREE.Group(); scene.add(ring); dummy = new THREE.Object3D(); vector = new THREE.Vector3(); raycaster = new THREE.Raycaster(); pointer = new THREE.Vector2();
      const bg = new THREE.Color(token('--stage-background'));
      for (const group of populationGroups) {
        const color = new THREE.Color(token(group.color)); palette.set(group.id, color);
        const buffer = createRingBuffer(), geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(buffer.positions, 3).setUsage(THREE.DynamicDrawUsage));
        geometry.setAttribute('normal', new THREE.BufferAttribute(buffer.normals, 3).setUsage(THREE.DynamicDrawUsage));
        geometry.setAttribute('color', new THREE.BufferAttribute(buffer.colors, 3).setUsage(THREE.DynamicDrawUsage)); geometry.setIndex(new THREE.BufferAttribute(buffer.indices, 1));
        geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .5, 0), 4.4);
        geometry.boundingBox = new THREE.Box3(new THREE.Vector3(-4.3, 0, -4.3), new THREE.Vector3(4.3, 1.1, 4.3));
        const material = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .26, metalness: .08, clearcoat: .45, clearcoatRoughness: .22, emissive: color, emissiveIntensity: 0 });
        const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = mesh.receiveShadow = true; mesh.userData.group = group.id; ring.add(mesh);
        const current = { start: -Math.PI / 2, span: 0, matching: 1 };
        arcs.push({ id: group.id, buffer, mesh, current, from: { ...current }, to: { ...current }, bright: color.toArray(), dim: color.clone().lerp(bg, .82).toArray() });
      }
      const environmentScene = new THREE.Scene(); environmentScene.background = new THREE.Color(.13, .17, .19);
      const panelGeometry = new THREE.PlaneGeometry(12, 8), panelMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.4, 1.4), side: THREE.DoubleSide });
      for (const point of [[-6, 8, 3], [6, 5, -5], [1, 3, 9]]) { const panel = new THREE.Mesh(panelGeometry, panelMaterial); panel.position.set(...point); panel.lookAt(0, 0, 0); environmentScene.add(panel); }
      const pmrem = new THREE.PMREMGenerator(renderer); environment = pmrem.fromScene(environmentScene, .08, .1, 40, { size: 128 }); scene.environment = environment.texture; scene.environmentIntensity = .65; pmrem.dispose(); panelGeometry.dispose(); panelMaterial.dispose();
      scene.add(new THREE.HemisphereLight(0xffffff, token('--stage-background'), .7));
      const light = new THREE.DirectionalLight(0xffffff, 2.4); light.position.set(-4, 8, 6); light.castShadow = true; light.shadow.mapSize.set(1024, 1024); light.shadow.camera.left = light.shadow.camera.bottom = -7; light.shadow.camera.right = light.shadow.camera.top = 7; light.shadow.camera.far = 30; light.shadow.normalBias = .025; light.shadow.bias = -.0001; light.shadow.radius = 4; scene.add(light);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ color: token('--stage-shadow'), opacity: .38 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -.09; floor.receiveShadow = true; scene.add(floor);
      // Camera-aligned patient controls render after the transparent shadow floor.
      spheres = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshPhysicalMaterial({ roughness: .20, metalness: .07, clearcoat: .85, clearcoatRoughness: .18, transparent: true, opacity: 1, depthTest: false, depthWrite: false }), 6); spheres.instanceMatrix.setUsage(THREE.DynamicDrawUsage); spheres.count = 0; spheres.frustumCulled = false; spheres.renderOrder = 10; scene.add(spheres);
      renderHost.append(renderer.domElement); renderer.domElement.setAttribute('aria-hidden', 'true');
      renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); unavailable = '3D context unavailable. Use the complete 2D alternative.'; fallback = true; animation.settle(); renderChrome(); requestDraw(); }, { signal: abort.signal });
      width = 0; signature = ''; resize();
    } catch (error) {
      unavailable = '3D unavailable. The 2D view and complete patient table remain available.'; fallback = true; root.dataset.renderError = error.message;
      reconcile(false); renderChrome(); requestDraw();
    }
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.sceneGroup) focusGroup(button.dataset.sceneGroup);
    if (button.dataset.scenePatient) onSelect(button.dataset.scenePatient);
    if (button.hasAttribute('data-scene-overview')) showOverview(true);
    if (button.hasAttribute('data-scene-locate')) focusPatient(selectedId);
    if (button.dataset.scenePage !== undefined) { pageIndex = Number(button.dataset.scenePage); reconcile(true, null, motionSettings().panel); announce(`Showing ${focusedPage.start} through ${focusedPage.end} of ${focusedPage.total}.`); }
    if (button === modeButton) { fallback = !fallback; animation.settle(); renderChrome(); requestDraw(); }
  }, { signal: abort.signal });
  root.addEventListener('keydown', event => {
    const button = event.target.closest('[data-scene-key]'); if (!button || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const controls = button.dataset.scenePatient ? focusedPage.records.map(record => buttons.get('patient:' + record.id)) : groups.map(group => buttons.get('group:' + group.id));
    const index = controls.indexOf(button), next = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + controls.length) % controls.length;
    event.preventDefault(); controls[next]?.focus({ preventScroll: true });
  }, { signal: abort.signal });
  root.addEventListener('pointerover', event => { const button = event.target.closest('[data-scene-key]'); if (button && hovered !== button.dataset.sceneKey) { hovered = button.dataset.sceneKey; if (renderer) renderer.shadowMap.needsUpdate = true; requestDraw(); } }, { signal: abort.signal });
  root.addEventListener('pointerleave', () => { hovered = null; if (renderer) renderer.shadowMap.needsUpdate = true; requestDraw(); }, { signal: abort.signal });
  viewport.addEventListener('click', event => {
    if (event.target.tagName !== 'CANVAS' || !raycaster || fallback) return;
    const bounds = viewport.getBoundingClientRect(); pointer.set((event.clientX - bounds.left) / width * 2 - 1, 1 - (event.clientY - bounds.top) / height * 2); raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(arcs.filter(arc => arc.mesh.visible).map(arc => arc.mesh).concat(spheres))[0];
    if (hit?.object === spheres) { const id = [...orbs.keys()][hit.instanceId]; if (id) onSelect(id); }
    else if (hit?.object.userData.group) focusGroup(hit.object.userData.group);
  }, { signal: abort.signal });
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(viewport);
  const intersection = new IntersectionObserver(entries => { intersecting = entries[0].isIntersecting; if (!intersecting) animation.settle(); else requestDraw(); }); intersection.observe(root);
  document.addEventListener('visibilitychange', () => { if (document.hidden) animation.settle(); else requestDraw(); }, { signal: abort.signal });
  preference.addEventListener('change', () => { reduced = preference.matches; if (reduced) animation.settle(); }, { signal: abort.signal });
  resize(); initialize();
  return {
    update, focusPatient, showOverview,
    get transitioning(){return animation.running;},
    getViewState:()=>({mode,groupId,pageIndex,fallback}),
    restoreViewState(view){mode=view.mode==='focus'&&groups.some(group=>group.id===view.groupId)?'focus':'overview';groupId=mode==='focus'?view.groupId:null;pageIndex=view.pageIndex||0;fallback=Boolean(view.fallback||unavailable);signature='';reconcile(false);renderChrome();},
    getMarkerIds: () => registry.map(item => item.id),
    getDisplayedPatientIds: () => mode === 'focus' ? focusedPage.records.map(record => record.id) : [],
    setVisible(value) { shown = value; if (!shown) animation.settle(); else { resize(); requestDraw(); } },
    destroy() { destroyed = true; abort.abort(); clearTimeout(transferTimer); cancelAnimationFrame(frame); animation.destroy(); resizeObserver.disconnect(); intersection.disconnect(); scene?.traverse(object => { object.geometry?.dispose(); if (Array.isArray(object.material)) object.material.forEach(material => material.dispose()); else object.material?.dispose(); if (object.isLight) object.shadow?.dispose(); }); environment?.dispose(); spheres?.dispose(); renderer?.dispose(); container.replaceChildren(); },
  };
}
