import { product, study, sources, clinicalConfig } from './data.js';
import { demoCase } from './clinical-fixture.js';
import { getReviewProfile } from './ranking.js';
import { createWorkspace, visibleRecords, evaluateDraft, datasetDefinitions } from './workspace.js';
import { transitionPanel } from './motion.js';
import { renderAssumptions } from './inspection.js';
import { renderPatientQueue, renderPatientDetail, renderProfileForm } from './studio-patient.js';
import { createConstellation } from './constellation.js';
import { renderContext, renderSceneStory, renderTrialSummary, renderTrialAnalytics, renderDecision, renderReport, buildReviewPacket } from './studio-views.js';
import { renderStudyTool } from './study-tools.js';
import { escape as e, icon } from './ui.js';

export function mountStudio() {
  const workspace = createWorkspace();
  const app = document.querySelector('#app');
  const evidenceDialog = document.querySelector('#evidence-dialog');
  const toolDialog = document.querySelector('#tool-dialog');
  const profileDialog = document.querySelector('#profile-dialog');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let tool = null;
  let toolCriterion = 'renal';
  let traceStep = 'source';
  let traceCriterion = 'RENAL';
  let profileDraft = {};
  let draftEvaluation = null;
  let profileTimer;
  let notificationTimer;
  let mobileDetailOpen = false;
  let mobileReturnToStage = false;
  const compactViewport = matchMedia('(max-width: 900px)');
  let lastRunId = null;
  let previousPatient = null;
  let previousDetailTab = null;
  const renderedHtml = new WeakMap();
  const dispositionDrafts = new Map();
  const toolState = { populationView: 'proposed', boundary: 'all' };
  document.body.classList.add('studio-body');
  document.title = 'Cohort — Live Trial Review Studio';
  document.querySelector('meta[name="theme-color"]').content = getComputedStyle(document.documentElement).getPropertyValue('--app-background').trim();
  app.innerHTML = `<header class="studio-header"><a class="studio-brand" href="#patient" aria-label="Cohort patient review"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="16" cy="15" r="8"/><circle cx="25" cy="15" r="8"/><circle cx="20.5" cy="23" r="8"/></svg><span>${e(product.wordmark)}</span></a><div class="studio-study"><span>CLINICAL DEVELOPMENT / ${e(study.phase).toUpperCase()}</span><h1>${e(study.drug)} <span>${e(study.title.replace(study.drug, '').trim())}</span></h1></div><span class="synthetic-pill">${icon('flask')} Synthetic demonstration</span><div class="studio-header-actions"><button class="studio-icon-button" data-action="guide" aria-label="Open demonstration guide" title="Demonstration guide">${icon('book')}</button><button class="studio-reset" data-action="reset">${icon('reset')}<span>Reset dataset</span></button></div></header>
    <div class="studio-navigation"><nav aria-label="Workspace perspectives" id="perspective-tabs"></nav><div id="scenario-controls"></div><details class="study-tools-menu"><summary>${icon('file')}<span>Study tools</span>${icon('chevron')}</summary><div><button data-tool="protocol">Study protocol</button><button data-tool="criteria">Criterion review desk</button><button data-tool="population">Boundary explorer</button><button data-action="report">Current review packet</button><button data-action="guide">Demonstration guide</button></div></details></div>
    <div id="workspace-context" class="workspace-context"></div>
    <main id="main" tabindex="-1" class="studio-main"><section id="patient-perspective" aria-label="Patient Review"><button class="mobile-population-jump studio-button" data-action="population-jump">Explore population ↘</button><div class="patient-studio-layout"><aside id="patient-queue" class="patient-queue-region"></aside><div class="population-stage-column"><div id="patient-scene-slot"></div><section id="scene-story" class="scene-story"></section><div class="stage-reading-note">${icon('shield')} Explicit rules. Traceable evidence. Expert review required.</div></div><div class="patient-detail-region"><button class="mobile-back" data-action="back-to-queue">← Back to patient queue</button><div id="patient-detail"></div></div></div></section>
    <section id="trial-perspective" aria-label="Trial Strategy" hidden><div id="trial-summary"></div><div class="trial-studio-layout"><div class="trial-population-column"><div id="trial-scene-slot"></div><section class="trial-linked-selection studio-sheet"><span class="studio-eyebrow">ONE CONNECTED ANALYSIS</span><h3>The same patients, in context.</h3><p>Age and clinical subgroup selections filter the population and patient table together. Whole-cohort counts remain explicit.</p><div id="trial-selection"></div><button class="studio-button" data-perspective="patient">${icon('people')} Open synchronized patient table ${icon('arrow')}</button></section></div><div id="trial-analytics"></div></div></section>
    <section id="decision-perspective" aria-label="Decision Review" hidden><div id="decision-content"></div></section></main>
    <footer class="studio-footer"><span>FICTIONAL STUDY · SYNTHETIC RECORDS · LOCAL CALCULATIONS</span><span>The index is unvalidated. Modeled matching is not enrollment approval.</span></footer>`;
  const sceneHost = document.createElement('div');
  sceneHost.className = 'constellation-host';
  document.querySelector('#patient-scene-slot').append(sceneHost);
  const scene = createConstellation(sceneHost, { onSelect: id => selectPatient(id, 'scene') });

  function announce(message) {
    const notice = document.querySelector('#notification');
    notice.textContent = message;
    notice.classList.add('visible');
    clearTimeout(notificationTimer);
    notificationTimer = setTimeout(() => notice.classList.remove('visible'), 4500);
  }

  function focusKey(element) {
    if (!element || element === document.body) return null;
    if (element.id) return { id: element.id };
    const button = element.closest('button');
    if (button) return { data: { ...button.dataset }, text: button.textContent.trim() };
    return element.name ? { name: element.name } : null;
  }

  function restoreFocus(region, key, selection) {
    if (!key) return;
    const target = key.id ? [...region.querySelectorAll('[id]')].find(el => el.id === key.id) : key.name ? [...region.querySelectorAll('[name]')].find(el => el.name === key.name) : [...region.querySelectorAll('button')].find(el => Object.entries(key.data).every(([k, v]) => el.dataset[k] === v) && el.textContent.trim() === key.text);
    target?.focus({ preventScroll: true });
    if (selection && typeof target?.setSelectionRange === 'function') {
      try { target.setSelectionRange(...selection); } catch { /* Number and select inputs have no text selection. */ }
    }
  }

  function patch(id, html, animate = false) {
    const region = typeof id === 'string' ? document.getElementById(id) : id;
    if (!region || renderedHtml.get(region) === html) return;
    const active = region.contains(document.activeElement) ? document.activeElement : null;
    const key = focusKey(active);
    const selection = active && typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null;
    const scrolls = [...region.querySelectorAll('*')].filter(el => el.scrollTop || el.scrollLeft).map(el => ({ cls: el.className, top: el.scrollTop, left: el.scrollLeft }));
    const openDetails = [...region.querySelectorAll('details')].map((el, i) => el.open ? i : -1);
    const scrollTop = region.scrollTop;
    region.innerHTML = html;
    renderedHtml.set(region, html);
    region.scrollTop = scrollTop;
    for (const item of scrolls) {
      const el = [...region.querySelectorAll('*')].find(node => node.className === item.cls);
      if (el) { el.scrollTop = item.top; el.scrollLeft = item.left; }
    }
    [...region.querySelectorAll('details')].forEach((el, i) => { if (openDetails.includes(i)) el.open = true; });
    restoreFocus(region, key, selection);
    if (animate) transitionPanel(region);
  }

  function render() {
    const { state, run } = workspace;
    const patientChanged = previousPatient !== state.selectedPatientId;
    const runChanged = lastRunId !== run.id;
    app.dataset.runId = run.id;
    app.dataset.datasetVersion = run.datasetVersion;
    app.dataset.scenario = state.scenarioId;
    app.dataset.selectedPatient = state.selectedPatientId || '';
    app.dataset.perspective = state.perspective;
    app.classList.toggle('mobile-detail-open', mobileDetailOpen);
    document.querySelector('.mobile-back').textContent = mobileReturnToStage ? '← Back to population' : '← Back to patient queue';
    patch('perspective-tabs', [['patient', 'people', 'Patient Review'], ['trial', 'chart', 'Trial Strategy'], ['decision', 'shield', 'Decision Review']].map(([id, symbol, label]) => `<button data-perspective="${id}" ${state.perspective === id ? 'aria-current="page"' : ''} class="perspective-tab ${state.perspective === id ? 'active' : ''}">${icon(symbol)}<span>${label}</span></button>`).join(''));
    patch('scenario-controls', `<div class="scenario-segmented" aria-label="Active protocol scenario"><button data-scenario="original" aria-pressed="${state.scenarioId === 'original'}" class="${state.scenarioId === 'original' ? 'active' : ''}">Original</button><button data-scenario="renal-revision" aria-pressed="${state.scenarioId === 'renal-revision'}" class="${state.scenarioId === 'renal-revision' ? 'active proposed' : ''}">Proposed <span>renal</span></button></div><details class="scenario-advanced"><summary aria-label="Inspect evidence-gated scenario options" title="Scenario options">${icon('layers')}</summary><div><label for="scenario-options">Predefined scenario</label><select id="scenario-options"><option value="original" ${state.scenarioId === 'original' ? 'selected' : ''}>Original protocol</option>${clinicalConfig.scenarios.map(s => `<option value="${e(s.id)}" ${state.scenarioId === s.id ? 'selected' : ''}>${e(s.label)} · ${e(s.status)}</option>`).join('')}</select><strong>${e(run.current.gate.active ? 'Applied to synthetic comparison' : run.current.gate.requested ? 'Withheld · original rules retained' : 'Original rules active')}</strong><p>${e(run.current.gate.reasons.join(' ') || 'No revision is currently applied. Proposed rules require explicit registered support and synthetic-demonstration approval.')}</p><small>Approval here applies only to this synthetic demo.</small></div></details>`);
    patch('workspace-context', renderContext(run, state));
    for (const name of ['patient', 'trial', 'decision']) document.getElementById(`${name}-perspective`).hidden = state.perspective !== name;
    patch('patient-queue', renderPatientQueue({ state, run, escape: e, icon }));
    const visible = visibleRecords(run, state.filters);
    const selectedIndex = visible.findIndex(r => r.id === state.selectedPatientId);
    patch('patient-detail', `<div class="patient-stepper"><span>${selectedIndex < 0 ? 'Selected record is outside current filters' : `${selectedIndex + 1} of ${visible.length} shown`}</span><div><button data-action="previous-patient" aria-label="Previous visible patient" ${selectedIndex <= 0 ? 'disabled' : ''}>←</button><button data-action="next-patient" aria-label="Next visible patient" ${selectedIndex < 0 || selectedIndex >= visible.length - 1 ? 'disabled' : ''}>→</button></div></div>${renderPatientDetail({ state, run, sources, config: clinicalConfig, escape: e, icon })}`, patientChanged || runChanged);
    if (patientChanged || previousDetailTab !== state.detailTab) document.querySelector('#patient-detail-content')?.scrollTo({ top: 0, behavior: 'instant' });
    patch('scene-story', renderSceneStory(run), runChanged);
    patch('trial-summary', renderTrialSummary(run), runChanged);
    patch('trial-analytics', renderTrialAnalytics(run, state));
    patch('trial-selection', `<strong>${visibleRecords(run, state.filters).length} of ${run.current.total} records highlighted</strong><span>Selected: ${e(state.selectedPatientId)} · ${e(run.id)}</span>${state.filters.age !== 'all' || state.filters.subgroup !== 'all' ? '<button data-action="clear-filters">Clear linked filters ×</button>' : ''}`);
    patch('decision-content', renderDecision(workspace, traceStep, traceCriterion));
    const dispositionDraft = dispositionDrafts.get(`${run.id}/${state.selectedPatientId}`);
    if (dispositionDraft) {
      for (const form of document.querySelectorAll('[data-review-form]')) {
        form.querySelector('[name="reason"]').value = dispositionDraft.reason;
        form.querySelector('[name="disposition"]').value = dispositionDraft.disposition;
      }
    }
    const destination = document.getElementById(state.perspective === 'trial' ? 'trial-scene-slot' : 'patient-scene-slot');
    if (sceneHost.parentElement !== destination) destination.append(sceneHost);
    scene.setVisible(state.perspective !== 'decision' && !(mobileDetailOpen && matchMedia('(max-width: 900px)').matches));
    scene.update({ run, selectedPatientId: state.selectedPatientId, visibleIds: visibleRecords(run, state.filters).map(r => r.id), reducedMotion: motion.matches });
    if (patientChanged && state.perspective === 'patient' && !mobileDetailOpen) requestAnimationFrame(() => {
      if (workspace.state.selectedPatientId !== state.selectedPatientId) return;
      const queue = document.querySelector('.sp-queue-scroll');
      const row = [...document.querySelectorAll('[data-patient-row]')].find(item => item.dataset.patientRow === state.selectedPatientId);
      if (queue && row && queue.scrollHeight > queue.clientHeight) {
        const bounds = queue.getBoundingClientRect(), position = row.getBoundingClientRect();
        const top = queue.querySelector('thead').getBoundingClientRect().bottom + 6;
        if (position.top < top) queue.scrollTop += position.top - top;
        else if (position.bottom > bounds.bottom - 6) queue.scrollTop += position.bottom - bounds.bottom + 6;
      }
    });
    if (toolDialog.open && tool !== 'guide') renderTool();
    previousPatient = state.selectedPatientId;
    previousDetailTab = state.detailTab;
    lastRunId = run.id;
  }

  function selectPatient(id, origin = 'table') {
    scene.focusPatient(id);
    const unchanged = workspace.state.selectedPatientId === id;
    if (compactViewport.matches && workspace.state.perspective === 'patient') { mobileDetailOpen = true; mobileReturnToStage = origin === 'scene'; }
    workspace.selectPatient(id);
    // The same selected patient can still open the compact-screen detail.
    if (unchanged) render();
    if (mobileDetailOpen && workspace.state.perspective === 'patient') document.querySelector('#patient-detail h2, #patient-detail h3')?.focus({ preventScroll: true });
  }

  function navigate(perspective, updateUrl = true) {
    const changed = workspace.state.perspective !== perspective;
    mobileDetailOpen = false;
    workspace.setPerspective(perspective);
    render();
    if (updateUrl && location.hash !== `#${perspective}`) history.pushState({}, '', `#${perspective}`);
    document.getElementById('main').focus({ preventScroll: true });
    if (changed) transitionPanel(document.getElementById(`${perspective}-perspective`));
  }

  function changeDataset(id) {
    if (id === workspace.state.dataset) return;
    mobileDetailOpen = false;
    workspace.setDataset(id);
    announce(`${workspace.events.at(-1).reason} ${workspace.run.current.total} loaded records; ${workspace.run.id}.`);
  }

  function changeScenario(id) {
    const prior = workspace.run.id;
    workspace.setScenario(id);
    if (workspace.run.id !== prior) {
      const { current } = workspace.run;
      announce(`${current.gate.active ? 'Proposed demonstration rule active' : current.gate.requested ? 'Revision withheld; original rules retained' : 'Original protocol restored'}. ${current.eligible} of ${current.total} meet modeled rules, ${current.excluded} excluded, ${current.indeterminate} indeterminate. ${current.newlyEligible} newly matching.`);
    }
  }

  function toolHeader(title, actions = '') {
    return `<header class="tool-header"><div><span class="studio-eyebrow">COHORT / STUDY TOOLS</span><h2 id="tool-title">${title}</h2></div><div>${actions}<button class="studio-icon-button" data-action="close-tool" aria-label="Close study tool">${icon('close')}</button></div></header>`;
  }

  function renderTool() {
    const label = { protocol: 'Study protocol', criteria: 'Criterion review desk', population: 'Boundary explorer', report: 'Current review packet', assumptions: 'Dataset assumptions & provenance' }[tool] || 'Demonstration guide';
    const actions = tool === 'report' ? `<button class="studio-button" data-action="export">${icon('download')} Export JSON</button><button class="studio-button primary" data-action="print">${icon('print')} Print / PDF</button>` : '';
    patch(toolDialog, `${toolHeader(label, actions)}<div class="tool-content">${tool === 'report' ? renderReport(workspace) : tool === 'assumptions' ? renderAssumptions(workspace.run) : renderStudyTool(tool, { state: { ...workspace.state, ...toolState, criterion: toolCriterion }, run: workspace.run })}</div>`);
  }

  function showTool(name) {
    tool = name;
    document.querySelector('.study-tools-menu').open = false;
    renderTool();
    if (!toolDialog.open) toolDialog.showModal();
    transitionPanel(toolDialog);
  }

  function openEvidence(id) {
    const source = sources.find(s => s.id === id);
    if (!source) return;
    workspace.setEvidence(id);
    const registered = clinicalConfig.evidence.find(s => s.id === id);
    const official = source.type === 'Official guidance';
    const synthetic = source.type === 'Synthetic patient data';
    evidenceDialog.innerHTML = `<div class="drawer-header"><span class="studio-eyebrow">EVIDENCE / ${official ? 'GUIDANCE CONTEXT' : synthetic ? 'DATASET PROVENANCE' : 'FICTIONAL DRUG EVIDENCE'}</span><button class="studio-icon-button" data-action="close-evidence" aria-label="Close evidence">${icon('close')}</button></div><div class="drawer-content"><span class="source-type ${official ? 'official' : ''}">${icon(official ? 'book' : 'flask')}${e(source.type)}</span><h2 id="evidence-title">${e(source.title)}</h2><dl class="source-provenance"><div><dt>Source ID</dt><dd>${e(id)}</dd></div><div><dt>Document date</dt><dd>${e(registered?.date || 'Not supplied')}</dd></div><div><dt>Document version</dt><dd>${e(registered?.version || 'Not supplied')}</dd></div><div><dt>Fixture container</dt><dd>SYN-217 case v${e(demoCase.case_version)} · ${e(workspace.run.id)}</dd></div><div><dt>Passage reference</dt><dd>${e(id)} / ${official ? 'source registry summary' : synthetic ? 'dataset notes' : 'fictional summary'}<small>No original document passage identifier supplied.</small></dd></div></dl><span class="studio-eyebrow passage-label">${official ? 'REGISTRY SUMMARY · PARAPHRASE, NOT A QUOTATION' : synthetic ? 'SYNTHETIC DATASET NOTES' : 'AUTHORED FICTIONAL SUMMARY'}</span><blockquote>${e(official ? registered?.use || registered?.summary || 'A source excerpt was not supplied.' : registered?.passage || registered?.summary || source.passage || 'A source excerpt was not supplied.')}</blockquote><section class="evidence-relationship"><h3>Relationship to this finding</h3><p>${e(source.relationship)}</p></section><div class="source-applicability"><strong>${official ? 'Context does not establish SYN-217 safety.' : synthetic ? 'Synthetic provenance, not a real patient cohort.' : 'Applicability requires qualified review.'}</strong><p>${official ? 'This prototype includes a registry description, not a verified verbatim excerpt. Check the original source and its current status before making regulatory claims.' : id.startsWith('SYN-PK') ? `The fictional renal packet covers a stable eGFR ${e(clinicalConfig.thresholds.renalProposedMin)}–<${e(clinicalConfig.thresholds.renalOriginalMin)} subgroup. ${workspace.state.dataset === 'casebook' ? 'The 20-record reference case has no longitudinal renal series; its stability flag is a synthetic adapter assumption.' : 'Generated and draft renal-stability flags are authored synthetic values. A single dated measurement does not establish longitudinal stability.'} No supplied evidence supports extension below ${e(clinicalConfig.thresholds.renalProposedMin)}.` : 'The supplied summary is fictional and cannot establish safety or enrollment approval for a real patient.'}</p></div>${source.note ? `<p class="source-note">${e(source.note)}</p>` : ''}${source.url ? `<a class="studio-button full" href="${e(source.url)}" target="_blank" rel="noopener noreferrer">Read official source ${icon('external')}</a>` : '<p class="fixture-disclosure">Prepared fictional content for this software demonstration.</p>'}</div><div class="drawer-footer">${icon('shield')} Evidence applicability and modeled rule matching are separate.</div>`;
    if (!evidenceDialog.open) evidenceDialog.showModal();
    transitionPanel(evidenceDialog, 'drawer');
  }

  function renderScratch(feedbackOnly = false) {
    const errors = draftEvaluation?.errors || {};
    const html = renderProfileForm({ draft: profileDraft, evaluation: draftEvaluation, errors, datasetLabel: `${workspace.run.dataset.shortLabel} · ${workspace.run.current.total} loaded records`, escape: e, icon });
    if (!feedbackOnly) { renderedHtml.delete(profileDialog); patch(profileDialog, html); return; }
    // Keep the live form mounted: replacing a focused form on blur can cause a native navigation.
    const template = document.createElement('template');
    template.innerHTML = html;
    patch('profile-feedback', template.content.querySelector('#profile-feedback').innerHTML);
    for (const input of profileDialog.querySelectorAll('#profile-form input, #profile-form select')) {
      input.closest('label')?.querySelector('.sp-field-error')?.remove();
      input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby');
      if (errors[input.name]) {
        const error = document.createElement('span');
        error.className = 'sp-field-error'; error.id = `error-${input.name}`; error.textContent = errors[input.name];
        input.closest('label').append(error);
        input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', error.id);
      }
    }
  }

  function captureDraft() {
    const form = document.querySelector('#profile-form');
    if (form) profileDraft = Object.fromEntries(new FormData(form));
  }

  function evaluateScratch() {
    clearTimeout(profileTimer);
    captureDraft();
    draftEvaluation = evaluateDraft(profileDraft, workspace.run.patients);
    renderScratch(true);
  }

  function showProfile() {
    if (!profileDraft.id) {
      let index = 1;
      while (workspace.run.patients.some(r => r.id === `S${String(index).padStart(2, '0')}`)) index++;
      profileDraft = { id: `S${String(index).padStart(2, '0')}` };
    }
    renderScratch();
    profileDialog.showModal();
    transitionPanel(profileDialog);
  }

  function showGuide() {
    tool = 'guide';
    renderedHtml.delete(toolDialog);
    document.querySelector('.study-tools-menu').open = false;
    const example = workspace.run.proposed.records.find(record => record.id === 'P03');
    const exampleProfile = example ? getReviewProfile(example) : null;
    const exampleSum = exampleProfile?.components?.filter(component => component.points).map(component => component.points).join(' + ');
    toolDialog.innerHTML = `${toolHeader('A three-minute demonstration')}<div class="tool-content demo-guide"><p>Reference-case walkthrough. Starting a step switches to the unchanged 20-record reference dataset.</p><ol><li><strong>Start with the individual.</strong><p>Select P03 and inspect the original renal exclusion. ${exampleProfile?.score !== null && exampleProfile?.score !== undefined ? `Its proposed index is ${exampleSum} = ${exampleProfile.score}, an illustrative attention measure.` : 'Its proposed index is available only when the configured eligibility and scoring requirements are met.'}</p><button data-guide="patient">Open P03 in the reference case ${icon('arrow')}</button></li><li><strong>Follow the evidence.</strong><p>Read the fictional renal PK summary and the missing stability-evidence limitation.</p><button data-source="SYN-PK-02">Inspect the fictional source ${icon('arrow')}</button></li><li><strong>Compare the proposed scenario.</strong><p>Apply the configured rule and watch the calculated patient groups change.</p><button data-guide="scenario">Apply proposed demonstration rule ${icon('arrow')}</button></li><li><strong>Keep restrictions visible.</strong><p>P06 remains excluded by its medication restriction. P16 becomes indeterminate because hepatic information is missing.</p><button data-guide="restriction">Inspect P06 ${icon('arrow')}</button></li><li><strong>Inspect population composition.</strong><p>Compare explicit denominators and click a linked age group.</p><button data-guide="trial">Open Trial Strategy ${icon('arrow')}</button></li><li><strong>Review the trail.</strong><p>Trace actual sources and rule outcomes, record a demonstration disposition, then export the current packet.</p><button data-guide="decision">Open Decision Review ${icon('arrow')}</button></li></ol></div>`;
    toolDialog.showModal();
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button, a.studio-brand');
    if (!button) {
      const row = event.target.closest('[data-patient-row]');
      if (row) selectPatient(row.dataset.patientRow);
      return;
    }
    try {
      if (button.closest('#profile-form') && button.type === 'submit') { event.preventDefault(); evaluateScratch(); return; }
      if (button.matches('a.studio-brand')) { event.preventDefault(); navigate('patient'); return; }
      if (button.dataset.source) { openEvidence(button.dataset.source); return; }
      if (button.dataset.perspective) { if (toolDialog.open) toolDialog.close(); navigate(button.dataset.perspective); return; }
      if (button.dataset.scenario) { changeScenario(button.dataset.scenario); return; }
      if (button.dataset.inspectStatus) { workspace.setFilters({ status: button.dataset.inspectStatus, age: 'all', subgroup: 'all', query: '', demographic: 'all' }); const records = visibleRecords(workspace.run, workspace.state.filters); if (records.length) workspace.selectPatient(records[0].id); navigate('patient'); announce('Opened whole-cohort records; other filters cleared.'); return; }
      if (button.dataset.queuePage !== undefined) { workspace.setQueuePage(Number(button.dataset.queuePage)); document.querySelector('.sp-queue-scroll')?.scrollTo({ top: 0 }); document.querySelector('.sp-queue-pagination button:not(:disabled)')?.focus({ preventScroll: true }); return; }
      if (button.dataset.composition) { workspace.setCompositionDimension(button.dataset.composition); transitionPanel(document.querySelector('.composition-rows')); return; }
      if (button.dataset.demographic) { workspace.setFilters({ demographic: workspace.state.filters.demographic === button.dataset.demographic ? 'all' : button.dataset.demographic }); return; }
      if (button.dataset.clearFilter) { workspace.setFilters({ [button.dataset.clearFilter]: button.dataset.clearFilter === 'query' ? '' : 'all' }); return; }
      if (button.dataset.view) { toolState.populationView = button.dataset.view; renderTool(); return; }
      if (button.dataset.boundary) { toolState.boundary = button.dataset.boundary; renderTool(); return; }
      if (button.dataset.filter) { workspace.setFilters({ status: button.dataset.filter }); return; }
      if (button.dataset.dataset) { changeDataset(button.dataset.dataset); return; }
      if (button.dataset.reviewMode) { if (button.dataset.reviewMode === 'ranked') { toolDialog.close(); navigate('patient'); } return; }
      if (button.dataset.patient || button.dataset.record) { selectPatient(button.dataset.patient || button.dataset.record); return; }
      if (button.dataset.status) { workspace.setFilters({ status: button.dataset.status }); return; }
      if (button.dataset.age) { workspace.setFilters({ age: workspace.state.filters.age === button.dataset.age ? 'all' : button.dataset.age }); return; }
      if (button.dataset.subgroup) { workspace.setFilters({ subgroup: workspace.state.filters.subgroup === button.dataset.subgroup ? 'all' : button.dataset.subgroup }); return; }
      if (button.dataset.detailTab) { workspace.setDetailTab(button.dataset.detailTab); return; }
      if (button.dataset.factor) {
        const context = button.dataset.factor === 'CONTEXT';
        workspace.setDetailTab(context ? 'overview' : 'criteria');
        requestAnimationFrame(() => {
          const target = document.getElementById(context ? 'attention-heading' : `criterion-${button.dataset.factor}`);
          target?.scrollIntoView({ block: 'nearest', behavior: motion.matches ? 'instant' : 'smooth' });
          if (!context) target?.focus({ preventScroll: true });
        });
        return;
      }
      if (button.dataset.trace) { traceStep = button.dataset.trace; render(); return; }
      if (button.dataset.tool) { showTool(button.dataset.tool); return; }
      if (button.dataset.criterion) { toolCriterion = button.dataset.criterion; showTool('criteria'); return; }
      if (button.dataset.stage) { const stage = button.dataset.stage; if (stage === 'population') { toolDialog.close(); navigate('patient'); } else showTool(stage === 'review' ? 'criteria' : stage); return; }
      if (button.dataset.guide) {
        const step = button.dataset.guide; toolDialog.close();
        if (workspace.state.dataset !== 'casebook') changeDataset('casebook');
        if (step === 'scenario') { changeScenario('renal-revision'); navigate('patient'); }
        else if (step === 'trial') navigate('trial');
        else if (step === 'decision') { workspace.selectPatient('P16'); navigate('decision'); }
        else { workspace.selectPatient(step === 'restriction' ? 'P06' : 'P03'); navigate('patient'); }
        return;
      }
      const action = button.dataset.action;
      if (action === 'clear-filters') workspace.setFilters({ status: 'all', age: 'all', subgroup: 'all', query: '', demographic: 'all' });
      if (action === 'clear-filters-locate') { workspace.setFilters({ status: 'all', age: 'all', subgroup: 'all', query: '', demographic: 'all' }); scene.focusPatient(workspace.state.selectedPatientId); }
      if (action === 'dataset') changeDataset(workspace.state.dataset === 'casebook' ? 'expanded' : 'casebook');
      if (action === 'assumptions') showTool('assumptions');
      if (action === 'inspect-filtered') { const records = visibleRecords(workspace.run, workspace.state.filters); if (records.length && !records.some(record => record.id === workspace.state.selectedPatientId)) workspace.selectPatient(records[0].id); navigate('patient'); }
      if (action === 'profile') showProfile();
      if (action === 'close-profile') profileDialog.close();
      if (action === 'close-tool') toolDialog.close();
      if (action === 'close-evidence') evidenceDialog.close();
      if (action === 'report') showTool('report');
      if (action === 'guide') showGuide();
      if (action === 'population-jump') {
        const target = document.querySelector('.constellation'); target.scrollIntoView({ block: 'start', behavior: 'instant' });
        const heading = target.querySelector('h3'); heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true });
      }
      if (action === 'patient-table-jump') {
        mobileDetailOpen = false; navigate('patient'); document.getElementById('patient-queue').scrollIntoView({ block: 'start', behavior: 'instant' });
        document.querySelector('#patient-search')?.focus({ preventScroll: true });
      }
      if (action === 'back-to-queue') {
        mobileDetailOpen = false; render();
        if (mobileReturnToStage) {
          const target = document.querySelector('.constellation'); target.scrollIntoView({ block: 'start', behavior: 'instant' });
          document.querySelector(`[data-scene-patient="${workspace.state.selectedPatientId}"]`)?.focus({ preventScroll: true });
        } else document.querySelector(`[data-patient="${workspace.state.selectedPatientId}"]`)?.focus({ preventScroll: true });
      }
      if (['previous-patient', 'next-patient', 'previous', 'next'].includes(action)) {
        const records = visibleRecords(workspace.run, workspace.state.filters);
        const index = records.findIndex(r => r.id === workspace.state.selectedPatientId);
        const target = records[index + (action.includes('previous') ? -1 : 1)];
        if (target) selectPatient(target.id);
      }
      if (action === 'reset') {
        clearTimeout(profileTimer); profileDraft = {}; draftEvaluation = null; mobileDetailOpen = false;
        for (const dialog of [evidenceDialog, toolDialog, profileDialog]) if (dialog.open) dialog.close();
        workspace.reset(); scene.showOverview(); history.replaceState({}, '', `#${workspace.state.perspective}`); announce(`Restored ${datasetDefinitions[workspace.state.dataset].shortLabel}: ${workspace.run.current.total} synthetic records and original protocol. Session history retained.`);
      }
      if (action === 'include-renal') changeScenario(workspace.state.scenarioId === 'renal-revision' ? 'original' : 'renal-revision');
      if (action === 'revision') changeScenario(workspace.state.scenarioId === 'original' ? 'renal-revision' : 'original');
      if (action === 'add-profile') {
        evaluateScratch();
        if (draftEvaluation.valid) {
          const added = workspace.addProfile(profileDraft);
          scene.focusPatient(added.id);
          profileDialog.close(); profileDraft = {}; draftEvaluation = null;
          announce(`${added.id} added explicitly. ${workspace.run.current.total} synthetic records in ${workspace.run.datasetVersion}.`);
        }
      }
      if (action === 'print') {
        document.getElementById('print-root').innerHTML = renderReport(workspace);
        requestAnimationFrame(() => window.print());
      }
      if (action === 'export') {
        const blob = new Blob([JSON.stringify(buildReviewPacket(workspace), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = `cohort-${workspace.run.id}-${workspace.run.datasetVersion}.json`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        announce('Current analysis, filters, evidence, and local events exported as JSON.');
      }
    } catch (error) { announce(error.message); }
  });

  document.addEventListener('input', event => {
    if (event.target.matches('[data-filter-query]')) workspace.setFilters({ query: event.target.value });
    if (event.target.closest('#profile-form')) { captureDraft(); clearTimeout(profileTimer); }
    if (event.target.closest('[data-review-form]')) dispositionDrafts.set(`${workspace.run.id}/${workspace.state.selectedPatientId}`, Object.fromEntries(new FormData(event.target.closest('form'))));
    if (event.target.matches('[data-review-form] [name="reason"]')) event.target.setCustomValidity('');
  });
  document.addEventListener('change', event => {
    if (event.target.id === 'scenario-options') changeScenario(event.target.value);
    if (event.target.id === 'dataset-selector') changeDataset(event.target.value);
    if (event.target.id === 'trace-criterion') { traceCriterion = event.target.value; render(); }
    if (event.target.closest('#profile-form')) evaluateScratch();
    if (event.target.closest('[data-review-form]')) dispositionDrafts.set(`${workspace.run.id}/${workspace.state.selectedPatientId}`, Object.fromEntries(new FormData(event.target.closest('form'))));
  });
  document.addEventListener('submit', event => {
    if (event.target.id === 'profile-form') { event.preventDefault(); evaluateScratch(); }
    if (event.target.matches('[data-review-form]')) {
      event.preventDefault(); const data = new FormData(event.target);
      if (!String(data.get('reason') || '').trim()) { const field = event.target.querySelector('[name="reason"]'); field.setCustomValidity('Enter a review finding or question.'); field.reportValidity(); return; }
      dispositionDrafts.delete(`${workspace.run.id}/${workspace.state.selectedPatientId}`);
      workspace.recordDisposition({ patientId: workspace.state.selectedPatientId, disposition: data.get('disposition'), reason: data.get('reason') });
      announce(`Demonstration disposition recorded for ${workspace.state.selectedPatientId}; eligibility is unchanged.`);
    }
  });
  document.addEventListener('keydown', event => {
    if (event.target.matches('[role="tab"][data-detail-tab]') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      const tabs = ['overview', 'criteria', 'evidence', 'pathway'];
      const index = tabs.indexOf(event.target.dataset.detailTab);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      event.preventDefault(); workspace.setDetailTab(tabs[next]);
      document.getElementById(`patient-tab-${tabs[next]}`)?.focus({ preventScroll: true });
      return;
    }
    if (!event.target.closest('#patient-queue') || event.target.matches('input,select,textarea') || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const records = visibleRecords(workspace.run, workspace.state.filters);
    const index = records.findIndex(r => r.id === workspace.state.selectedPatientId);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? records.length - 1 : Math.max(0, Math.min(records.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
    if (records[next]) { event.preventDefault(); selectPatient(records[next].id); document.querySelector(`#patient-queue [data-patient="${records[next].id}"]`)?.focus({ preventScroll: true }); }
  });
  for (const dialog of [evidenceDialog, toolDialog, profileDialog]) dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  evidenceDialog.addEventListener('close', () => workspace.setEvidence(null));
  profileDialog.addEventListener('close', () => clearTimeout(profileTimer));
  motion.addEventListener('change', render);
  compactViewport.addEventListener('change', render);
  const route = () => {
    const hash = location.hash.slice(1);
    if (['patient', 'trial', 'decision'].includes(hash)) navigate(hash, false);
    else if (['protocol', 'review', 'report', 'population'].includes(hash)) {
      if (hash === 'population') navigate('patient', false);
      else showTool(hash === 'review' ? 'criteria' : hash);
    }
  };
  window.addEventListener('popstate', route);
  window.addEventListener('hashchange', route);
  window.addEventListener('beforeprint', () => { document.getElementById('print-root').innerHTML = renderReport(workspace); });
  workspace.subscribe(render);
  render();
  route();
  return { workspace, scene };
}
