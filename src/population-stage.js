import { motionSettings, createStageTransition } from './motion.js';
import { populationGroups, patientGroup, getMarkerLayout, getPopulationGroups, getFocusPageLayout, getFocusPage, getGroupTransfers } from './population-layout.js';
import { escape as e } from './ui.js';

export function createConstellation(container, { onSelect = () => {} } = {}) {
  const abort = new AbortController();
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const objects = new Map(), buttons = new Map(), batches = [], palette = new Map();
  let THREE, renderer, scene, camera, geometry, dummy, vector, raycaster, pointer;
  let snapshot, registry = [], groups = [], selectedId = null, hoveredKey = null, focusedPage = null;
  let width = 0, height = 0, frame = 0, frameCount = 0, signature = '', shown = true, intersecting = true, destroyed = false;
  let visibleIds = new Set(), mode = 'overview', groupId = null, pageIndex = 0, fallback = false, unavailable = '', reduced = preference.matches;
  let targets = [], moving = [], progress = 1, cameraFrom = 1, cameraTarget = 1, transferTimer, transferAnimation;
  const intersections = [];
  container.innerHTML = '<section class="constellation" aria-label="Calculated synthetic patient population"><header class="constellation-header"><div><span class="constellation-kicker">THE MODELED POPULATION</span><h3>Explore the population.</h3></div><div class="constellation-tools"><button class="constellation-mode" type="button" aria-pressed="false">2D view</button></div></header><div class="constellation-context"><span class="constellation-scenario"></span><span class="constellation-denominator"></span></div><div class="constellation-navigation"></div><div class="constellation-viewport"><div class="constellation-renderer"></div><div class="constellation-labels"></div><div class="constellation-empty" hidden></div><div class="constellation-preview" hidden></div></div><div class="constellation-pagination"></div><div class="constellation-changes" role="status" hidden></div><div class="constellation-reading"></div><footer class="constellation-foot"><span>All records remain in the patient table.</span><span>Placement is illustrative, not medical risk.</span><button class="constellation-table-link" data-action="patient-table-jump">Patient table ↑</button></footer><span class="sr-only constellation-announcement" role="status" aria-live="polite"></span></section>';
  const root = container.firstElementChild, viewport = root.querySelector('.constellation-viewport');
  const renderHost = root.querySelector('.constellation-renderer'), labelHost = root.querySelector('.constellation-labels');
  const modeButton = root.querySelector('.constellation-mode'), preview = root.querySelector('.constellation-preview');
  const token = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const canRender = () => renderer && shown && intersecting && !document.hidden && !fallback && !destroyed;
  const animation = createStageTransition(value => { progress = value; requestDraw(); }, () => {
    progress = 1; applyPositions(); root.dataset.rendering = 'settled'; requestDraw();
  });
  root.dataset.animationEngine = globalThis.Motion ? 'Motion' : 'instant';

  function announce(text) { root.querySelector('.constellation-announcement').textContent = text; }
  function settleTransfers() {
    transferAnimation?.stop(); transferAnimation = null;
    const banner = root.querySelector('.constellation-changes'); banner.style.opacity = '1'; banner.style.transform = 'none';
  }
  function patch(element, html) {
    if (element.__html === html) return;
    const active = element.contains(document.activeElement) ? document.activeElement : null;
    const key = active?.dataset.sceneControl;
    element.innerHTML = html; element.__html = html;
    if (key) {
      const controls = [...element.querySelectorAll('[data-scene-control]')];
      const target = controls.find(button => button.dataset.sceneControl === key && !button.disabled) || controls.find(button => !button.disabled) || root.querySelector('[data-scene-overview]');
      target?.focus({ preventScroll: true });
    }
  }
  function describeSelection() {
    const record = snapshot?.current.records.find(item => item.id === selectedId);
    if (!record) return '<span>Select a patient tile or a record in the table.</span>';
    const outside = !visibleIds.has(record.id), onPage = focusedPage?.records.some(item => item.id === record.id);
    const group = populationGroups.find(item => item.id === patientGroup(record));
    return '<span><strong>' + e(record.id) + '</strong> · ' + e(group.label) + (outside ? ' · outside current filters' : mode === 'focus' && patientGroup(record) !== groupId ? ' · outside focused group' : mode === 'focus' && !onPage ? ' · outside this page' : '') + '</span>'
      + (outside ? '<button data-action="clear-filters-locate">Clear filters to locate</button>' : mode === 'overview' || !onPage ? '<button data-scene-locate>Locate selected ↗</button>' : '<span class="constellation-reading-hint">Selected in the patient inspector</span>');
  }
  function renderChrome() {
    if (!snapshot) return;
    const group = groups.find(item => item.id === groupId);
    root.dataset.sceneMode = mode; root.dataset.group = groupId || '';
    root.dataset.page = String(pageIndex); root.dataset.markerCount = String(registry.length);
    root.dataset.displayedPatientCount = String(mode === 'focus' ? focusedPage.records.length : 0);
    root.dataset.capacity = String(getFocusPageLayout(width, height).capacity);
    root.dataset.runId = snapshot.id; root.dataset.filteredCount = String(visibleIds.size);
    root.classList.toggle('is-focused', mode === 'focus');
    root.querySelector('.constellation-scenario').textContent = snapshot.current.gate.active ? 'Proposed renal revision' : snapshot.current.gate.requested ? 'Revision withheld · original rules active' : 'Original protocol';
    root.querySelector('.constellation-denominator').textContent = visibleIds.size === registry.length ? registry.length + ' patients loaded' : visibleIds.size + ' of ' + registry.length + ' match filters';
    patch(root.querySelector('.constellation-navigation'), mode === 'overview'
      ? '<span>Grouped overview</span><span>Choose a tray to inspect its patients ↘</span>'
      : '<button data-scene-overview data-scene-control="back">← Population</button><span><i class="constellation-symbol ' + group.id + '"></i>' + e(group.label) + '</span><span>' + group.records.length + ' match filters / ' + group.total + ' in group</span>');
    patch(root.querySelector('.constellation-pagination'), mode === 'overview'
      ? '<span>Four complete groups. No individual patients are drawn in this overview.</span>'
      : '<button data-scene-page="' + (pageIndex - 1) + '" data-scene-control="previous" aria-label="Previous tray page"' + (pageIndex === 0 ? ' disabled' : '') + '>←</button><span><strong>' + focusedPage.start + '–' + focusedPage.end + ' of ' + focusedPage.total + '</strong> patients matching filters<small>' + (groupId === 'new' ? 'Index ↑ · ' : 'ID order · ') + 'Page ' + (pageIndex + 1) + ' / ' + focusedPage.pages + ' · ' + registry.length + ' loaded</small></span><button data-scene-page="' + (pageIndex + 1) + '" data-scene-control="next" aria-label="Next tray page"' + (pageIndex + 1 >= focusedPage.pages ? ' disabled' : '') + '>→</button>');
    patch(root.querySelector('.constellation-reading'), describeSelection());
    const empty = mode === 'focus' && !focusedPage.records.length;
    const emptyHost = root.querySelector('.constellation-empty');
    emptyHost.hidden = !empty;
    if (empty) emptyHost.innerHTML = '<strong>No patients in this view</strong><p>' + (group.total ? 'None of the ' + group.total + ' patients in this group match the current filters.' : 'No patients have this classification in the active scenario.') + '</p><div><button data-scene-overview>Back to population</button>' + (group.total ? '<button data-action="clear-filters">Clear filters</button>' : '') + '</div>';
    modeButton.textContent = fallback ? unavailable ? '2D alternative' : '3D view' : '2D view';
    modeButton.title = unavailable || (fallback ? 'Switch to 3D' : 'Switch to 2D');
    root.querySelector('.constellation-kicker').textContent = unavailable ? '2D POPULATION · 3D UNAVAILABLE' : 'THE MODELED POPULATION';
    modeButton.disabled = Boolean(unavailable); modeButton.setAttribute('aria-pressed', String(fallback));
    root.classList.toggle('is-2d', fallback); renderHost.hidden = fallback;
    syncButtons(); drawLabels();
  }
  function syncButtons() {
    const focusedKey = labelHost.contains(document.activeElement) ? document.activeElement.dataset.sceneKey : null;
    const keys = new Set(targets.map(item => item.key));
    for (const [key, button] of buttons) if (!keys.has(key)) { button.remove(); buttons.delete(key); }
    for (let index = 0; index < targets.length; index++) {
      const item = targets[index];
      let button = buttons.get(item.key);
      if (!button) {
        button = document.createElement('button'); button.type = 'button'; button.dataset.sceneKey = item.key;
        labelHost.append(button); buttons.set(item.key, button);
      }
      button.className = 'scene-object ' + item.type + ' ' + item.group + (item.patient?.id === selectedId ? ' selected' : '');
      if (item.type === 'tray') {
        button.dataset.sceneGroup = item.group;
        button.disabled = item.data.total === 0;
        button.setAttribute('aria-label', 'Inspect ' + item.data.label + ': ' + item.data.records.length + ' match filters, ' + item.data.total + ' patients in this group');
        const filtered = item.data.records.length !== item.data.total;
        const html = '<span class="tray-caption"><i class="constellation-symbol ' + item.group + '"></i>' + e(item.data.label) + '</span><strong class="tray-count">' + (filtered ? item.data.records.length + '<small> / ' + item.data.total + '</small>' : item.data.total) + '</strong><span class="tray-instruction">' + (item.data.total === 0 ? 'No patients' : filtered ? 'match filters · inspect →' : 'patients · inspect →') + '</span>';
        if (button.innerHTML !== html) button.innerHTML = html;
      } else {
        button.dataset.scenePatient = item.patient.id;
        button.setAttribute('aria-pressed', String(item.patient.id === selectedId));
        button.setAttribute('aria-label', 'Inspect ' + item.patient.id + ': ' + populationGroups.find(group => group.id === item.group).label + ', eGFR ' + (item.patient.egfr_ml_min_1_73m2 ?? 'not recorded'));
        const html = '<i class="constellation-symbol ' + item.group + '"></i><span>' + e(item.patient.id) + '</span>';
        if (button.innerHTML !== html) button.innerHTML = html;
      }
      if (labelHost.children[index] !== button) labelHost.insertBefore(button, labelHost.children[index] || null);
    }
    const focused = buttons.get(focusedKey);
    if (focused && document.activeElement !== focused) focused.focus({ preventScroll: true });
  }
  function makeTargets() {
    if (mode === 'overview') {
      const trayWidth = Math.max(100, (width - 84) / 2), trayHeight = Math.max(74, (height - 78) / 2);
      return groups.map(group => ({ key: 'group:' + group.id, type: 'tray', group: group.id, data: group, x: width * (.5 + group.x), y: height * (.5 + group.y) - 2, w: trayWidth, h: trayHeight, z: 0, tilt: -.20 }));
    }
    const dimensions = getFocusPageLayout(width, height);
    const group = groups.find(item => item.id === groupId);
    focusedPage = getFocusPage(group, dimensions, pageIndex); pageIndex = focusedPage.page;
    const columns = dimensions.columns, rowCount = Math.max(1, Math.ceil(focusedPage.records.length / columns));
    const gridWidth = columns * 80 + (columns - 1) * 12, gridHeight = rowCount * 44 + (rowCount - 1) * 12;
    return focusedPage.records.map((patient, index) => ({
      key: 'patient:' + patient.id, type: 'patient', patient, group: groupId,
      x: (width - gridWidth) / 2 + 40 + (index % columns) * 92,
      y: (height - gridHeight) / 2 + 22 + Math.floor(index / columns) * 56,
      w: 80, h: 44, z: 0, tilt: -.07, delay: Math.min(.16, Math.floor(index / columns) * .04),
    }));
  }
  function reconcile(animate = true, locateId = null) {
    if (!snapshot || !width || !height) return;
    groups = getPopulationGroups(snapshot, [...visibleIds]);
    if (mode === 'focus') {
      const group = groups.find(item => item.id === groupId);
      focusedPage = getFocusPage(group, getFocusPageLayout(width, height), pageIndex, locateId);
      pageIndex = focusedPage.page;
    }
    const nextSignature = snapshot.id + '|' + [...visibleIds].join(',') + '|' + mode + '|' + groupId + '|' + pageIndex + '|' + width + 'x' + height;
    if (signature === nextSignature) { renderChrome(); writeMatrices(); requestDraw(); return; }
    signature = nextSignature;
    animation.stop(); applyPositions();
    const origin = groupId ? objects.get('group:' + groupId) : null;
    targets = makeTargets();
    const nextKeys = new Set(targets.map(item => item.key));
    for (const [key] of objects) if (!nextKeys.has(key)) objects.delete(key);
    moving = [];
    for (const target of targets) {
      const previous = objects.get(target.key);
      const item = { ...target, fromX: previous?.x ?? origin?.x ?? width / 2, fromY: previous?.y ?? origin?.y ?? height / 2, fromW: previous?.w ?? target.w * .55, fromH: previous?.h ?? target.h * .55, fromTilt: previous?.tilt ?? -.28 };
      item.toX = target.x; item.toY = target.y; item.toW = target.w; item.toH = target.h; item.toTilt = target.tilt;
      item.x = item.fromX; item.y = item.fromY; item.w = item.fromW; item.h = item.fromH;
      objects.set(item.key, item); moving.push(item);
    }
    cameraFrom = camera?.zoom ?? 1; cameraTarget = mode === 'focus' ? 1.035 : 1;
    hoveredKey = null; preview.hidden = true; buildBatches(); renderChrome();
    root.dataset.rendering = 'transitioning';
    animation.start(motionSettings().focus, !animate || reduced || fallback || !shown || document.hidden || !intersecting);
  }
  function roundedGeometry() {
    const shape = new THREE.Shape(), x = -50, y = -30, w = 100, h = 60, r = 6;
    shape.moveTo(x + r, y); shape.lineTo(x + w - r, y); shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r); shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h); shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
    return new THREE.ExtrudeGeometry(shape, { depth: 4, bevelEnabled: true, bevelSize: 1.2, bevelThickness: 1.4, bevelSegments: 2, curveSegments: 6, steps: 1 });
  }
  function clearBatches() { for (const batch of batches) { scene.remove(batch.mesh); batch.mesh.material.dispose(); batch.mesh.dispose(); } batches.length = 0; }
  function buildBatches() {
    if (!THREE || !scene) return;
    clearBatches();
    if (!moving.length) return;
    for (const layer of ['base', 'rim', 'surface']) {
      const material = new THREE.MeshStandardMaterial({ color: token('--surface'), roughness: .62, metalness: .06 });
      const mesh = new THREE.InstancedMesh(geometry, material, moving.length); mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.userData.keys = moving.map(item => item.key);
      const batch = { mesh, layer }; batches.push(batch); scene.add(mesh);
    }
    writeMatrices();
  }
  function writeMatrices() {
    if (!dummy) return;
    for (const batch of batches) {
      for (let index = 0; index < moving.length; index++) {
        const item = moving[index], selected = item.patient?.id === selectedId;
        const lift = selected ? 4 : item.key === hoveredKey ? 3 : 0;
        const layerOffset = batch.layer === 'base' ? -9 : batch.layer === 'rim' ? -3 : 0;
        const inset = batch.layer === 'surface' ? .965 : batch.layer === 'rim' ? .995 : 1.015;
        dummy.position.set(item.x - width / 2, height / 2 - item.y + lift + layerOffset * .36, layerOffset + lift);
        dummy.rotation.set(item.tilt, 0, item.type === 'tray' ? -.018 : 0);
        dummy.scale.set(item.w / 100 * inset, item.h / 60 * inset, batch.layer === 'base' ? 1.6 : .6); dummy.updateMatrix();
        batch.mesh.setMatrixAt(index, dummy.matrix);
        const shades = palette.get(item.group);
        const color = batch.layer === 'rim' ? shades.rim : batch.layer === 'base' ? shades.base : selected ? shades.selected : item.key === hoveredKey ? shades.hover : shades.surface;
        batch.mesh.setColorAt(index, color);
      }
      batch.mesh.instanceMatrix.needsUpdate = true; batch.mesh.instanceColor.needsUpdate = true;
      batch.mesh.computeBoundingSphere(); batch.mesh.computeBoundingBox();
    }
  }
  function applyPositions() {
    for (let index = 0; index < moving.length; index++) {
      const item = moving[index], t = Math.max(0, Math.min(1, (progress - (item.delay || 0)) / (1 - (item.delay || 0))));
      item.x = item.fromX + (item.toX - item.fromX) * t; item.y = item.fromY + (item.toY - item.fromY) * t;
      item.w = item.fromW + (item.toW - item.fromW) * t; item.h = item.fromH + (item.toH - item.fromH) * t;
      item.tilt = item.fromTilt + (item.toTilt - item.fromTilt) * t;
    }
    if (camera) { camera.zoom = cameraFrom + (cameraTarget - cameraFrom) * progress; camera.updateProjectionMatrix(); }
    writeMatrices(); drawLabels();
  }
  function drawLabels() {
    for (const [key, button] of buttons) {
      const item = objects.get(key); if (!item) continue;
      const lift = item.patient?.id === selectedId ? 4 : item.key === hoveredKey ? 3 : 0;
      let x = item.x, y = item.y - lift, zoom = 1;
      if (camera && vector) { vector.set(x - width / 2, height / 2 - y, lift + 5).project(camera); x = (vector.x + 1) * width / 2; y = (1 - vector.y) * height / 2; zoom = camera.zoom; }
      const w = (item.type === 'tray' ? item.w * .92 : 80) * zoom, h = (item.type === 'tray' ? item.h * .82 : 44) * zoom;
      button.style.width = w + 'px'; button.style.height = h + 'px';
      button.style.transform = 'translate(' + (x - w / 2) + 'px,' + (y - h / 2) + 'px)';
      button.style.opacity = String(progress === 1 ? 1 : Math.max(0, Math.min(1, (progress - (item.delay || 0)) * 2)));
    }
  }
  function draw() {
    frame = 0; if (!canRender()) return;
    applyPositions(); renderer.render(scene, camera); frameCount++;
    root.dataset.drawCalls = String(renderer.info.render.calls); root.dataset.frameCount = String(frameCount);
    root.dataset.rendering = animation.running ? 'transitioning' : 'settled';
  }
  function requestDraw() { if (!frame && canRender()) frame = requestAnimationFrame(draw); }
  function resize() {
    const nextWidth = viewport.clientWidth, nextHeight = viewport.clientHeight;
    if (!nextWidth || !nextHeight) return;
    if (nextWidth === width && nextHeight === height) return;
    const anchor = focusedPage?.records.some(record => record.id === selectedId) ? selectedId : focusedPage?.records[0]?.id;
    width = nextWidth; height = nextHeight;
    if (renderer) { renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(width, height, false); camera.left = -width / 2; camera.right = width / 2; camera.top = height / 2; camera.bottom = -height / 2; camera.updateProjectionMatrix(); }
    reconcile(false, anchor);
  }
  function showOverview(restore = false) {
    const priorGroup = groupId; mode = 'overview'; groupId = null; pageIndex = 0; focusedPage = null; reconcile();
    announce('Grouped population overview. ' + registry.length + ' patients loaded.');
    if (restore) {
      const previous = buttons.get('group:' + priorGroup);
      const target = previous && !previous.disabled ? previous : [...buttons.values()].find(button => !button.disabled) || root.querySelector('h3');
      target.setAttribute('tabindex', target.tagName === 'BUTTON' ? '0' : '-1'); target.focus({ preventScroll: true });
    }
  }
  function focusGroup(id) {
    if (!groups.some(group => group.id === id && group.total)) return;
    mode = 'focus'; groupId = id; pageIndex = 0; reconcile();
    announce(groups.find(group => group.id === id).label + '. ' + focusedPage.total + ' patients match filters.');
    root.querySelector('[data-scene-overview]')?.focus({ preventScroll: true });
  }
  function focusPatient(id) {
    const record = snapshot?.current.records.find(item => item.id === id);
    if (!record || !visibleIds.has(id)) { announce('This patient is outside the current filters. Clear filters to locate it.'); return false; }
    mode = 'focus'; groupId = patientGroup(record); reconcile(true, id);
    announce('Located ' + id + ' in ' + groups.find(group => group.id === groupId).label + ', page ' + (pageIndex + 1) + ' of ' + focusedPage.pages + '.');
    return true;
  }
  function setHover(key) {
    if (hoveredKey === key) return;
    hoveredKey = key;
    const item = objects.get(key);
    preview.hidden = !item?.patient;
    if (item?.patient) {
      const patient = item.patient;
      preview.innerHTML = '<strong>' + e(patient.id) + '</strong><span>' + (patient.age_years ?? 'Unknown age') + (patient.age_years == null ? '' : ' years') + ' · eGFR ' + e(patient.egfr_ml_min_1_73m2 ?? 'not recorded') + '</span><span>' + e(populationGroups.find(group => group.id === item.group).label) + '</span>';
      const placeAbove = item.y > height * .6;
      preview.style.top = placeAbove ? '6px' : 'auto';
      preview.style.bottom = placeAbove ? 'auto' : '6px';
    }
    writeMatrices(); drawLabels(); requestDraw();
  }
  function update({ run, selectedPatientId, visibleIds: ids, reducedMotion = preference.matches }) {
    const previous = snapshot, changed = previous?.id !== run?.id;
    snapshot = run; selectedId = selectedPatientId; reduced = reducedMotion;
    visibleIds = new Set(ids ?? run.current.records.map(record => record.id));
    if (changed) {
      registry = getMarkerLayout(run.current.records);
      if (previous && previous.dataset.id !== run.dataset.id) { mode = 'overview'; groupId = null; pageIndex = 0; }
      const selected = run.current.records.find(record => record.id === selectedId);
      if (mode === 'focus' && selected && previous?.current.records.some(record => record.id === selectedId && patientGroup(record) !== patientGroup(selected))) announce(selectedId + ' is now ' + populationGroups.find(group => group.id === patientGroup(selected)).label + '. The focused group is unchanged; use Locate selected to follow this patient.');
      const transfers = getGroupTransfers(previous, run), transferHost = root.querySelector('.constellation-changes');
      settleTransfers();
      clearTimeout(transferTimer);
      transferHost.hidden = !transfers.length;
      if (transfers.length) {
        transferHost.innerHTML = '<span>Whole-cohort changes</span>' + transfers.map(transfer => '<span><strong>' + transfer.ids.length + '</strong> ' + e(populationGroups.find(group => group.id === transfer.from).label) + ' → ' + e(populationGroups.find(group => group.id === transfer.to).label) + '</span>').join('');
        transferTimer = setTimeout(() => { transferHost.hidden = true; }, 6000);
        if (!reduced && shown && !document.hidden) transferAnimation = globalThis.Motion?.animate(transferHost, { opacity: [0, 1], transform: ['translateY(4px)', 'translateY(0)'] }, { duration: motionSettings().population / 1000, ease: 'easeOut' });
      }
    }
    resize(); reconcile(Boolean(previous && changed));
    if (reduced && animation.running) animation.settle();
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button || button.disabled) return;
    if (button.dataset.sceneGroup) focusGroup(button.dataset.sceneGroup);
    if (button.dataset.scenePatient) onSelect(button.dataset.scenePatient);
    if (button.hasAttribute('data-scene-overview')) showOverview(true);
    if (button.hasAttribute('data-scene-locate')) focusPatient(selectedId);
    if (button.dataset.scenePage !== undefined) { pageIndex = Number(button.dataset.scenePage); reconcile(); announce('Showing ' + focusedPage.start + ' to ' + focusedPage.end + ' of ' + focusedPage.total + ' patients.'); }
    if (button.classList.contains('constellation-mode') && !unavailable) { fallback = !fallback; animation.settle(); renderChrome(); requestDraw(); }
  }, { signal: abort.signal });
  root.addEventListener('pointerover', event => { const button = event.target.closest('[data-scene-key]'); if (button) setHover(button.dataset.sceneKey); }, { signal: abort.signal });
  root.addEventListener('pointerleave', () => setHover(null), { signal: abort.signal });
  root.addEventListener('focusin', event => setHover(event.target.closest('[data-scene-key]')?.dataset.sceneKey || null), { signal: abort.signal });
  root.addEventListener('focusout', event => { if (!root.contains(event.relatedTarget) || !event.relatedTarget?.hasAttribute('data-scene-key')) setHover(null); }, { signal: abort.signal });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mode === 'focus') { event.preventDefault(); event.stopPropagation(); showOverview(true); return; }
    const button = event.target.closest('.scene-object.patient'); if (!button) return;
    const keys = targets.map(item => item.key), index = keys.indexOf(button.dataset.sceneKey);
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -focusedPage.columns, ArrowDown: focusedPage.columns }[event.key];
    if (step !== undefined || event.key === 'Home' || event.key === 'End') {
      event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? keys.length - 1 : Math.max(0, Math.min(keys.length - 1, index + step)); buttons.get(keys[next])?.focus({ preventScroll: true });
    }
  }, { signal: abort.signal });
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(viewport);
  const observer = new IntersectionObserver(entries => { intersecting = entries[0]?.isIntersecting ?? true; if (!intersecting) animation.settle(); else requestDraw(); }); observer.observe(container);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { animation.settle(); settleTransfers(); cancelAnimationFrame(frame); frame = 0; } else requestDraw(); }, { signal: abort.signal });
  preference.addEventListener('change', event => { reduced = event.matches; if (reduced) { animation.settle(); settleTransfers(); } }, { signal: abort.signal });
  async function initialize() {
    try {
      THREE = await import('three'); if (destroyed) return;
      const canvas = document.createElement('canvas'); canvas.dataset.cohortCanvas = 'true'; canvas.setAttribute('aria-hidden', 'true');
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' }); renderHost.append(canvas);
      renderer.setClearColor(token('--stage-background'), 0);
      scene = new THREE.Scene(); camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 2000); camera.position.set(0, 0, 1000);
      scene.add(new THREE.AmbientLight(token('--stage-text'), .9));
      const light = new THREE.DirectionalLight(token('--stage-text'), 1.7); light.position.set(-250, 400, 600); scene.add(light);
      geometry = roundedGeometry(); dummy = new THREE.Object3D(); vector = new THREE.Vector3(); raycaster = new THREE.Raycaster(); pointer = new THREE.Vector2();
      const surface = new THREE.Color(token('--stage-raised')), white = new THREE.Color(token('--stage-text'));
      for (const group of populationGroups) palette.set(group.id, { surface, base: new THREE.Color(token('--stage-border')), rim: new THREE.Color(token(group.color)).lerp(surface, .28), selected: surface.clone().lerp(white, .04), hover: surface.clone().lerp(white, .015) });
      canvas.addEventListener('click', event => {
        const bounds = canvas.getBoundingClientRect(); pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
        raycaster.setFromCamera(pointer, camera); intersections.length = 0;
        for (const batch of batches) raycaster.intersectObject(batch.mesh, false, intersections);
        intersections.sort((a, b) => a.distance - b.distance);
        const key = intersections[0]?.object.userData.keys[intersections[0]?.instanceId], item = objects.get(key);
        if (item?.patient) onSelect(item.patient.id); else if (item) focusGroup(item.group);
      }, { signal: abort.signal });
      canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); unavailable = '3D context unavailable'; fallback = true; animation.settle(); renderChrome(); }, { signal: abort.signal });
      width = 0; height = 0; signature = ''; resize(); renderChrome(); requestDraw();
    } catch { if (!destroyed) { unavailable = '3D unavailable in this browser'; fallback = true; animation.settle(); renderChrome(); } }
  }
  initialize();
  return {
    update, focusPatient, showOverview,
    getMarkerIds: () => registry.map(item => item.id),
    getDisplayedPatientIds: () => targets.filter(item => item.patient).map(item => item.patient.id),
    setVisible(value) { if (shown === value) return; shown = value; if (!shown) { animation.settle(); settleTransfers(); cancelAnimationFrame(frame); frame = 0; } else { resize(); requestDraw(); } },
    destroy() { destroyed = true; abort.abort(); animation.destroy(); settleTransfers(); clearTimeout(transferTimer); cancelAnimationFrame(frame); resizeObserver.disconnect(); observer.disconnect(); if (scene) clearBatches(); geometry?.dispose(); renderer?.dispose(); container.replaceChildren(); },
  };
}
