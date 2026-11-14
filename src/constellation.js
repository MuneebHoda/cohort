const groups = [
  { id: 'matching', label: 'Already matching', description: 'Meets the original modeled rules', color: '#71B7FF', x: -3.15, y: 2.1 },
  { id: 'new', label: 'Newly matching', description: 'Newly meets the proposed modeled rules', color: '#48D7B8', x: 3.15, y: 2.1 },
  { id: 'excluded', label: 'Excluded', description: 'At least one modeled restriction applies', color: '#DF9196', x: -3.15, y: -1.95 },
  { id: 'indeterminate', label: 'Indeterminate', description: 'Required information is unresolved', color: '#F0BB65', x: 3.15, y: -1.95 },
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
  const geometryCache = new Map();
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let snapshot = null;
  let layout = [];
  let selectedId = null;
  let visibleIds = new Set();
  let reducedMotion = motionPreference.matches;
  let shown = true;
  let intersecting = true;
  let destroyed = false;
  let fallback = false;
  let unavailableReason = '';
  let THREE, renderer, scene, camera, controls, raycaster;
  let frame = 0;
  let animation = null;
  let hoveredId = null;
  let pointerStart = null;

  container.innerHTML = `<section class="constellation" aria-label="Calculated synthetic patient population">
    <header class="constellation-header"><div><span class="constellation-kicker">THE MODELED POPULATION</span><h3>Every point. A patient.</h3></div><div class="constellation-tools"><button type="button" class="constellation-reset" aria-label="Reset population camera" title="Reset camera"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/></svg></button><button type="button" class="constellation-mode" aria-pressed="false">2D view</button></div></header>
    <div class="constellation-context"><span class="constellation-scenario">Original protocol</span><span class="constellation-denominator"></span></div>
    <div class="constellation-viewport"><div class="constellation-zones" aria-hidden="true">${groups.map(group => `<div class="constellation-zone constellation-zone-${group.id}"><span class="constellation-zone-title"><i class="constellation-symbol ${group.id}"></i>${group.label}<strong data-zone-count="${group.id}">0</strong></span></div>`).join('')}</div><div class="constellation-renderer"></div><div class="constellation-labels"></div><div class="constellation-fallback" hidden></div><p class="constellation-empty" hidden>No records match these filters.<br>Clear a filter to return to the cohort.</p></div>
    <div class="constellation-reading"><span class="constellation-selection">Select a patient to follow the evidence</span><span class="constellation-interaction">Select a point · drag gently to explore</span></div>
    <footer class="constellation-foot"><span>One marker per loaded record</span><span>Spatial placement is illustrative, not medical risk.</span></footer>
  </section>`;
  const root = container.querySelector('.constellation');
  const viewport = root.querySelector('.constellation-viewport');
  const rendererHost = root.querySelector('.constellation-renderer');
  const labelHost = root.querySelector('.constellation-labels');
  const fallbackHost = root.querySelector('.constellation-fallback');
  const modeButton = root.querySelector('.constellation-mode');
  const resetButton = root.querySelector('.constellation-reset');

  const canRender = () => !destroyed && shown && intersecting && !document.hidden && !fallback && renderer;

  function updateLabels() {
    if (!camera || !THREE || fallback) return;
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    for (const [id, marker] of markers) {
      const point = marker.group.position.clone().project(camera);
      marker.label.style.transform = `translate(${(point.x + 1) / 2 * width}px,${(1 - point.y) / 2 * height}px) translate(-50%,-8px)`;
      marker.label.classList.toggle('selected', id === selectedId);
      marker.label.classList.toggle('hovered', id === hoveredId);
    }
  }

  function draw(time = performance.now()) {
    frame = 0;
    if (!canRender()) return;
    if (animation) {
      const progress = Math.min(1, Math.max(0, (time - animation.started) / animation.duration));
      const eased = 1 - Math.pow(1 - progress, 3);
      for (const marker of markers.values()) marker.group.position.lerpVectors(marker.from, marker.target, eased);
      if (progress === 1) animation = null;
    }
    renderer.render(scene, camera);
    updateLabels();
    if (animation) requestDraw();
  }

  function requestDraw() {
    if (!frame && canRender()) frame = requestAnimationFrame(draw);
  }

  function resize() {
    if (!renderer || !camera) return;
    const width = Math.max(1, viewport.clientWidth);
    const height = Math.max(1, viewport.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    const aspect = width / height;
    const halfWidth = 6.3;
    const halfHeight = halfWidth / aspect;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    syncMarkers(false);
    requestDraw();
  }

  function markerTarget(item) {
    const width = Math.max(1, viewport.clientWidth);
    const height = Math.max(1, viewport.clientHeight);
    const left = item.group === 'matching' || item.group === 'excluded';
    const top = item.group === 'matching' || item.group === 'new';
    const pixelX = width * (left ? .10 : .57) + item.column / Math.max(1, item.columns - 1) * width * .34;
    const firstY = height * (top ? .03 : .52) + 42;
    const lastY = height * (top ? .50 : 1) - 30;
    const pixelY = firstY + item.row / Math.max(1, item.rows - 1) * Math.max(0, lastY - firstY);
    return new THREE.Vector3(
      camera.left + pixelX / width * (camera.right - camera.left),
      camera.top - pixelY / height * (camera.top - camera.bottom), item.z,
    );
  }

  function applyFallback() {
    root.classList.toggle('is-2d', fallback);
    rendererHost.hidden = fallback;
    labelHost.hidden = fallback;
    root.querySelector('.constellation-zones').hidden = fallback;
    fallbackHost.hidden = !fallback;
    resetButton.hidden = fallback;
    modeButton.textContent = fallback ? unavailableReason ? '2D alternative' : '3D view' : '2D view';
    modeButton.disabled = Boolean(unavailableReason);
    modeButton.setAttribute('aria-pressed', String(fallback));
    root.querySelector('.constellation-interaction').textContent = fallback ? 'Same records · same classifications' : 'Select a point · drag gently to explore';
    if (fallback) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      renderFallback();
    } else requestDraw();
  }

  function renderFallback() {
    const focusId = fallbackHost.contains(document.activeElement) ? document.activeElement.dataset.patientId : null;
    fallbackHost.innerHTML = `${unavailableReason ? `<p class="constellation-fallback-note">${escape(unavailableReason)} This 2D view uses the same calculated records.</p>` : ''}<div class="constellation-fallback-groups">${groups.map(group => {
      const items = layout.filter(item => item.group === group.id);
      return `<section class="constellation-fallback-group"><h4><i class="constellation-symbol ${group.id}" aria-hidden="true"></i>${group.label}<span>${items.length}</span></h4><div>${items.length ? items.map(item => `<button type="button" data-patient-id="${escape(item.id)}" data-marker-group="${item.group}" class="constellation-patient ${item.group} ${selectedId === item.id ? 'selected' : ''} ${!visibleIds.has(item.id) ? 'filtered-out' : ''}" aria-label="Inspect ${escape(item.id)}: ${escape(item.label)}" aria-pressed="${selectedId === item.id}" ${!visibleIds.has(item.id) ? 'disabled' : ''}><i aria-hidden="true"></i><span>${escape(item.id)}</span></button>`).join('') : '<p class="constellation-no-group">No records</p>'}</div></section>`;
    }).join('')}</div>`;
    if (focusId) [...fallbackHost.querySelectorAll('[data-patient-id]')].find(button => button.dataset.patientId === focusId)?.focus({ preventScroll: true });
  }

  function disposeMarker(marker) {
    marker.group.traverse(object => {
      if (object.material) object.material.dispose();
    });
    scene?.remove(marker.group);
    marker.label.remove();
  }

  function geometryFor(name) {
    if (!geometryCache.has(name)) geometryCache.set(name, name === 'indeterminate' ? new THREE.TorusGeometry(.20, .043, 10, 32)
      : name === 'excluded' ? new THREE.OctahedronGeometry(.23)
      : name === 'new-ring' ? new THREE.TorusGeometry(.30, .016, 8, 36)
      : name === 'selection-ring' ? new THREE.TorusGeometry(.38, .022, 8, 40)
      : new THREE.IcosahedronGeometry(.20, 2));
    return geometryCache.get(name);
  }

  function createBody(item) {
    const material = new THREE.MeshStandardMaterial({ color: item.color, roughness: .33, metalness: .18, emissive: item.color, emissiveIntensity: .25, transparent: true });
    const body = new THREE.Mesh(geometryFor(['indeterminate', 'excluded'].includes(item.group) ? item.group : 'matching'), material);
    body.userData.patientId = item.id;
    return body;
  }

  function updateMarkerAppearance(marker, item) {
    if (marker.statusGroup !== item.group) {
      if (marker.body) { marker.group.remove(marker.body); marker.body.material.dispose(); }
      marker.body = createBody(item);
      marker.group.add(marker.body);
      marker.statusGroup = item.group;
    }
    const visible = visibleIds.has(item.id);
    marker.group.userData.filtered = !visible;
    marker.body.material.opacity = visible ? 1 : .12;
    marker.newRing.visible = item.group === 'new';
    marker.newRing.material.opacity = visible ? .9 : .12;
    marker.selection.visible = item.id === selectedId;
    marker.selection.material.opacity = visible ? 1 : .4;
    marker.label.className = `constellation-marker-label ${item.group}${visible ? '' : ' filtered-out'}${layout.length > 30 ? ' compact-label' : ''}`;
    marker.label.disabled = !visible;
    marker.label.setAttribute('aria-label', `Inspect ${item.id}: ${item.label}`);
    marker.label.setAttribute('aria-pressed', String(item.id === selectedId));
    marker.label.title = `${item.id} · ${item.label}`;
    marker.label.querySelector('span').textContent = item.id;
  }

  function syncMarkers(animate) {
    if (!THREE || !scene) return;
    const ids = new Set(layout.map(item => item.id));
    for (const [id, marker] of markers) if (!ids.has(id)) { disposeMarker(marker); markers.delete(id); }
    let moved = false;
    for (const item of layout) {
      let marker = markers.get(item.id);
      const target = markerTarget(item);
      if (!marker) {
        const group = new THREE.Group();
        group.userData.patientId = item.id;
        group.position.copy(target);
        const newRing = new THREE.Mesh(geometryFor('new-ring'), new THREE.MeshBasicMaterial({ color: groups[1].color, transparent: true }));
        newRing.userData.patientId = item.id;
        const selection = new THREE.Mesh(geometryFor('selection-ring'), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true }));
        selection.userData.patientId = item.id;
        group.add(newRing, selection);
        scene.add(group);
        const label = document.createElement('button');
        label.type = 'button';
        label.dataset.patientId = item.id;
        label.innerHTML = '<span></span>';
        labelHost.append(label);
        marker = { group, newRing, selection, label, target: group.position.clone(), from: group.position.clone(), statusGroup: null, body: null };
        markers.set(item.id, marker);
      }
      marker.from.copy(marker.group.position);
      marker.target.copy(target);
      const rowSpacing = Math.max(1, viewport.clientHeight * .48 - 72) / Math.max(1, item.rows - 1);
      marker.group.scale.setScalar(Math.min(1, Math.max(.3, rowSpacing / 34)));
      if (marker.from.distanceToSquared(marker.target) > .0001) moved = true;
      updateMarkerAppearance(marker, item);
      if (!animate) marker.group.position.copy(marker.target);
    }
    animation = animate && moved ? { started: performance.now(), duration: 700 } : null;
    requestDraw();
  }

  function update({ run, selectedPatientId, visibleIds: ids, reducedMotion: reduce = motionPreference.matches }) {
    const previousRun = snapshot?.id;
    snapshot = run;
    selectedId = selectedPatientId;
    reducedMotion = reduce;
    layout = getMarkerLayout(run?.current?.records || []);
    visibleIds = new Set(ids ?? layout.map(item => item.id));
    root.dataset.runId = run?.id || '';
    root.dataset.markerCount = String(layout.length);
    const gate = run?.current?.gate;
    root.querySelector('.constellation-scenario').textContent = gate?.active ? 'Proposed renal revision' : gate?.requested ? 'Revision withheld · original rules active' : 'Original protocol';
    root.querySelector('.constellation-denominator').textContent = `${visibleIds.size} of ${layout.length} records highlighted`;
    root.querySelector('.constellation-empty').hidden = visibleIds.size !== 0;
    const selected = layout.find(item => item.id === selectedId);
    root.querySelector('.constellation-selection').textContent = selected ? `${selected.id} · ${selected.label}${visibleIds.has(selected.id) ? '' : ' · outside active filter'}` : 'Select a patient to follow the evidence';
    for (const group of groups) {
      const wholeGroup = layout.filter(item => item.group === group.id);
      const filteredCount = wholeGroup.filter(item => visibleIds.has(item.id)).length;
      const count = root.querySelector(`[data-zone-count="${group.id}"]`);
      count.textContent = visibleIds.size === layout.length ? String(wholeGroup.length) : `${filteredCount}/${wholeGroup.length}`;
      count.title = `${filteredCount} highlighted of ${wholeGroup.length} loaded records in this group`;
    }
    syncMarkers(Boolean(previousRun && previousRun !== run?.id && !reducedMotion && shown && !document.hidden));
    if (fallback) renderFallback();
  }

  root.addEventListener('click', event => {
    const button = event.target.closest('[data-patient-id]');
    if (button && !button.disabled && visibleIds.has(button.dataset.patientId)) onSelect(button.dataset.patientId);
    if (event.target.closest('.constellation-mode') && !unavailableReason) { fallback = !fallback; applyFallback(); }
    if (event.target.closest('.constellation-reset') && controls) { controls.reset(); resize(); }
  }, { signal: abort.signal });
  labelHost.addEventListener('pointerover', event => {
    hoveredId = event.target.closest('[data-patient-id]')?.dataset.patientId || null;
    requestDraw();
  }, { signal: abort.signal });
  labelHost.addEventListener('pointerleave', () => { hoveredId = null; requestDraw(); }, { signal: abort.signal });

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(viewport);
  const intersectionObserver = new IntersectionObserver(entries => {
    intersecting = entries[0]?.isIntersecting ?? true;
    if (intersecting) requestDraw();
  });
  intersectionObserver.observe(container);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; }
    else requestDraw();
  }, { signal: abort.signal });
  motionPreference.addEventListener('change', event => {
    reducedMotion = event.matches;
    if (reducedMotion) {
      animation = null;
      for (const marker of markers.values()) marker.group.position.copy(marker.target);
      requestDraw();
    }
  }, { signal: abort.signal });

  async function initialize() {
    try {
      THREE = await import('three');
      const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
      if (destroyed) return;
      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.setAttribute('data-cohort-canvas', 'true');
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
      renderer.setClearColor(0x0b1220, 0);
      rendererHost.append(canvas);
      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-7, 7, 5, -5, .1, 100);
      camera.position.set(0, 0, 22);
      camera.lookAt(0, 0, 0);
      scene.add(new THREE.AmbientLight(0xffffff, 2));
      const light = new THREE.DirectionalLight(0xffffff, 3);
      light.position.set(3, 6, 10);
      scene.add(light);
      controls = new OrbitControls(camera, canvas);
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.enableDamping = false;
      controls.minAzimuthAngle = -.18;
      controls.maxAzimuthAngle = .18;
      controls.minPolarAngle = Math.PI / 2 - .12;
      controls.maxPolarAngle = Math.PI / 2 + .12;
      controls.addEventListener('change', requestDraw);
      controls.saveState();
      raycaster = new THREE.Raycaster();
      canvas.addEventListener('pointerdown', event => { pointerStart = { x: event.clientX, y: event.clientY }; }, { signal: abort.signal });
      canvas.addEventListener('pointerup', event => {
        if (!pointerStart || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) return;
        const bounds = canvas.getBoundingClientRect();
        raycaster.setFromCamera(new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1), camera);
        const hit = raycaster.intersectObjects([...markers.values()].filter(marker => !marker.group.userData.filtered).map(marker => marker.group), true)[0];
        if (hit?.object.userData.patientId) onSelect(hit.object.userData.patientId);
      }, { signal: abort.signal });
      canvas.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        unavailableReason = 'The 3D context is unavailable.';
        fallback = true;
        applyFallback();
      }, { signal: abort.signal });
      syncMarkers(false);
      resize();
      applyFallback();
    } catch {
      if (destroyed) return;
      unavailableReason = '3D is unavailable in this browser.';
      fallback = true;
      applyFallback();
    }
  }
  initialize();

  return {
    update,
    setVisible(visible) {
      shown = visible;
      if (!visible && frame) { cancelAnimationFrame(frame); frame = 0; }
      if (visible) { resize(); requestDraw(); }
    },
    getMarkerIds: () => layout.map(item => item.id),
    destroy() {
      destroyed = true;
      abort.abort();
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      for (const marker of markers.values()) disposeMarker(marker);
      markers.clear();
      for (const geometry of geometryCache.values()) geometry.dispose();
      geometryCache.clear();
      controls?.dispose();
      renderer?.dispose();
      container.replaceChildren();
    },
  };
}
