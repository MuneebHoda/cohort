import { unifiedProtocol, unifiedStudy } from './unified-protocol.js';
import { renderUnifiedDomain, renderUnifiedTool, renderUnifiedSource, renderUnifiedProfile } from './unified-views.js';
import { renderVerifiedSource, renderCriterionInspection } from './review-views.js';
import { guidanceSources } from './guidance-sources.js';
import { investigationSources, renderCaseSource, renderCaseTool } from './investigation-views.js';
import { product, study, sources, clinicalConfig } from './data.js';
import { demoCase } from './clinical-fixture.js';
import { getReviewProfile } from './ranking.js';
import { createWorkspace, visibleRecords, evaluateDraft, datasetDefinitions, queuePageSize } from './workspace.js';
import { transitionPanel, transitionCharts } from './motion.js';
import { renderPatientCharts, renderTrialCharts } from './charts.js';
import { renderAssumptions } from './inspection.js';
import { renderPatientQueue, renderPatientDetail, renderProfileForm } from './studio-patient.js';
import { createConstellation } from './constellation.js';
import { renderContext, renderCasePeopleControls, renderSceneStory, renderTrialSummary, renderTrialAnalytics, renderDecision, renderReport, buildReviewPacket } from './studio-views.js';
import { renderStudyTool } from './study-tools.js';
import { mountPresentation, waitForPresentationView } from './presentation.js';
import { anchorPatients } from './patients.js';
import { resolveScenario } from './cohort.js';
import { getGuidanceRows } from './guidance-review.js';
import { escape as e, icon } from './ui.js';

export function mountStudio() {
  const workspace = createWorkspace();
  const app = document.querySelector('#app');
  const evidenceDialog = document.querySelector('#evidence-dialog');
  const toolDialog = document.querySelector('#tool-dialog');
  const profileDialog = document.querySelector('#profile-dialog');
  const queueDialog = document.querySelector('#patient-queue-dialog');
  let queueRestoreFocus = true;
  let queueOpenerId = 'patients-toggle';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let tool = null;
  let toolCriterion = 'renal';
  let traceStep = 'source';
  let analysisView = 'matrix';
  let analysisDimension = 'age';
  let traceCriterion = 'RENAL';
  let evidenceView = null;
  let presentationNavigation = false;
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
  const guidanceDrafts = new Map();
  const toolState = { populationView: 'proposed', boundary: 'all' };
  document.body.classList.add('studio-body');
  document.title = 'Cohort — Live Trial Review Studio';
  document.querySelector('meta[name="theme-color"]').content = getComputedStyle(document.documentElement).getPropertyValue('--app-background').trim();
  app.innerHTML = `<header class="studio-header"><a class="studio-brand" href="#patient" aria-label="Cohort patient review"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="16" cy="15" r="8"/><circle cx="25" cy="15" r="8"/><circle cx="20.5" cy="23" r="8"/></svg><span>${e(product.wordmark)}</span></a><div class="studio-study" id="active-study"><span>CLINICAL DEVELOPMENT / ${e(study.phase).toUpperCase()}</span><h1>${e(study.drug)} <span>${e(study.title.replace(study.drug, '').trim())}</span></h1></div><span class="synthetic-pill">${icon('flask')} Synthetic demonstration</span><div class="studio-header-actions"><button id="presentation-launch" class="studio-button presentation-launch" aria-haspopup="dialog" aria-expanded="false">${icon('play')}<span>Presentation</span></button><button id="patients-toggle" class="studio-button patients-toggle" data-action="open-queue" aria-haspopup="dialog" aria-controls="patient-queue-dialog">${icon('people')}<span>Patients</span><strong></strong></button><button class="studio-icon-button" data-action="guide" aria-label="Open demonstration guide" title="Demonstration guide">${icon('book')}</button><button class="studio-reset" data-action="reset">${icon('reset')}<span>Reset dataset</span></button></div></header>
    <div class="studio-navigation"><nav aria-label="Workspace perspectives" id="perspective-tabs"></nav><div id="scenario-controls"></div><details class="study-tools-menu"><summary>${icon('file')}<span>Study tools</span>${icon('chevron')}</summary><div><button data-tool="protocol">Study protocol</button><button data-tool="criteria">Criterion review desk</button><button data-tool="population">Full trial requirements</button><button data-action="report">Current review packet</button><button data-action="guide">Demonstration guide</button></div></details></div>
    <div id="workspace-context" class="workspace-context"></div>
    <main id="main" tabindex="-1" class="studio-main"><section id="patient-perspective" aria-label="Patient Review"><button class="mobile-population-jump studio-button" data-action="population-jump">Explore population ↘</button><div class="patient-studio-layout"><div class="population-stage-column"><div id="patient-people-slot"></div><div id="patient-scene-slot"></div><div id="cohort-charts" aria-label="Cohort visual insights"></div><section id="scene-story" class="scene-story"></section><div class="stage-reading-note">${icon('shield')} Explicit rules. Traceable evidence. Expert review required.</div></div><div class="patient-detail-region"><button class="mobile-back" data-action="back-to-queue">← Back to patient queue</button><div id="patient-detail"></div></div></div></section>
    <section id="trial-perspective" aria-label="Trial Strategy" hidden><div id="trial-summary"></div><div id="trial-people-slot"></div><div id="trial-charts" aria-label="Trial visual analysis"></div><details class="analysis-secondary" id="trial-context-details"><summary>Population, composition source data & study context</summary><div class="trial-studio-layout"><div class="trial-population-column"><div id="trial-scene-slot"></div><section class="trial-linked-selection studio-sheet"><span class="studio-eyebrow">ONE CONNECTED ANALYSIS</span><h3>The same patients, in context.</h3><p>Age and clinical subgroup selections filter the population and patient table together. Whole-cohort counts remain explicit.</p><div id="trial-selection"></div><button class="studio-button" data-action="patient-table-jump">${icon('people')} Open synchronized patient table ${icon('arrow')}</button></section></div><div id="trial-analytics"></div></div></details></section>
    <section id="decision-perspective" aria-label="Decision Review" hidden><div id="decision-people-slot"></div><div id="decision-content"></div></section></main>
    <footer class="studio-footer"><span>FICTIONAL STUDY · SYNTHETIC RECORDS · LOCAL CALCULATIONS</span><span>The index is unvalidated. Modeled matching is not enrollment approval.</span></footer>`;
  queueDialog.innerHTML = `<header class="queue-drawer-header"><div><span class="studio-eyebrow">SYNTHETIC RECORDS</span><h2 id="queue-title">Patient explorer</h2></div><button class="studio-icon-button" data-action="close-queue" aria-label="Close patient explorer">${icon('close')}</button></header><div id="patient-queue" class="patient-queue-region"></div>`;
  const peopleHost = document.createElement('div');
  peopleHost.id = 'case-people-controls';
  document.getElementById('patient-people-slot').append(peopleHost);
  const sceneHost = document.createElement('div');
  sceneHost.id = 'population-visual';
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
    if (animate === 'charts') transitionCharts(region);
    else if (animate) transitionPanel(region);
  }

  function render() {
    const { state, run } = workspace;
    const patientChanged = previousPatient !== state.selectedPatientId;
    const runChanged = lastRunId !== run.id;
    if (evidenceDialog.open && (runChanged && lastRunId || patientChanged && evidenceDialog.querySelector('.criterion-result'))) evidenceDialog.close();
    app.dataset.runId = run.id;
    app.dataset.datasetVersion = run.datasetVersion;
    app.dataset.scenario = state.scenarioId;
    app.dataset.selectedPatient = state.selectedPatientId || '';
    app.dataset.perspective = state.perspective;
    app.classList.toggle('mobile-detail-open', mobileDetailOpen);
    document.querySelector('.mobile-back').textContent = mobileReturnToStage ? '← Back to population' : '← Back to patient queue';
    patch('perspective-tabs', [['patient', 'people', 'Patient Review'], ['trial', 'chart', 'Trial Strategy'], ['decision', 'shield', 'Decision Review']].map(([id, symbol, label]) => `<button data-perspective="${id}" ${state.perspective === id ? 'aria-current="page"' : ''} class="perspective-tab ${state.perspective === id ? 'active' : ''}">${icon(symbol)}<span>${label}</span></button>`).join(''));
    patch('active-study', run.unified ? `<span>ONE ONCOLOGY TRIAL / AUTHORED SYNTHETIC PROTOCOL</span><h1>SYN-217 <span>Every patient. Every requirement.</span></h1>` : run.casePack ? `<span>EXCLUSION INVESTIGATION / AUTHORED PROTOCOL SNAPSHOTS</span><h1>${e(run.casePack.id)} <span>${e(run.casePack.title)}</span></h1>` : `<span>CLINICAL DEVELOPMENT / ${e(study.phase).toUpperCase()}</span><h1>${e(study.drug)} <span>${e(study.title.replace(study.drug, '').trim())}</span></h1>`);
    if(run.unified) patch('scenario-controls', `<div class="scenario-segmented" aria-label="Active protocol scenario"><button data-scenario="original" aria-pressed="${state.scenarioId==='original'}" class="${state.scenarioId==='original'?'active':''}">Original</button><button data-scenario="proposed-inclusive" aria-pressed="${state.scenarioId==='proposed-inclusive'}" class="${state.scenarioId==='proposed-inclusive'?'active proposed':''}">Proposed inclusive</button></div><span class="unified-demo-badge">Authored demo protocol</span>${run.current.gate.requested&&!run.current.gate.active?`<details class="scenario-advanced"><summary>Withheld · Original retained</summary><div><strong>Proposed changes were not applied</strong><p>${e(run.current.gate.reasons.join(' '))}</p></div></details>`:''}`);
    else if (run.casePack && !run.casePack.proposedConfigured) patch('scenario-controls', '<span class="case-scenario-note">Current protocol snapshots</span><button class="studio-button" data-action="assumptions">Proposed criteria: requires configuration</button>');
    else patch('scenario-controls', `<div class="scenario-segmented" aria-label="Active protocol scenario"><button data-scenario="original" aria-pressed="${state.scenarioId === 'original'}" class="${state.scenarioId === 'original' ? 'active' : ''}">Original</button><button data-scenario="renal-revision" aria-pressed="${state.scenarioId === 'renal-revision'}" class="${state.scenarioId === 'renal-revision' ? 'active proposed' : ''}">Proposed <span>renal</span></button></div><details class="scenario-advanced"><summary aria-label="Inspect evidence-gated scenario options" title="Scenario options">${icon('layers')}</summary><div><label for="scenario-options">Predefined scenario</label><select id="scenario-options"><option value="original" ${state.scenarioId === 'original' ? 'selected' : ''}>Original protocol</option>${clinicalConfig.scenarios.filter(s=>!run.casePack || s.id==='renal-revision').map(s => `<option value="${e(s.id)}" ${state.scenarioId === s.id ? 'selected' : ''}>${e(s.label)} · ${e(s.status)}</option>`).join('')}</select><strong>${e(run.current.gate.active ? 'Applied to synthetic comparison' : run.current.gate.requested ? 'Withheld · original rules retained' : 'Original rules active')}</strong><p>${e(run.current.gate.reasons.join(' ') || 'No revision is currently applied. Proposed rules require explicit registered support and synthetic-demonstration approval.')}</p><small>Approval here applies only to this synthetic demo.</small></div></details>`);
    patch('workspace-context', renderContext(run, state) + (run.casePack ? `<details class="case-context-summary"><summary>${icon('info')} Case context & source</summary><p><strong>Original concern:</strong> ${e(run.casePack.original_concern)}</p><p><strong>Review basis:</strong> ${run.casePack.source_category.map(e).join(' · ')}</p><p><strong>Investigate:</strong> ${e(run.casePack.reconsideration_basis)}</p><p><strong>Missing configuration:</strong> ${run.casePack.missing_configuration.map(e).join('; ')}.</p><button class="studio-source-link" data-source="${e(run.casePack.sourceId)}">Supplied case passage ↗</button><div class="case-anchor-links">${run.patients.filter(p=>p.provenance.type==='hand-authored-anchor').map(p=>`<button class="studio-button" data-patient="${e(p.id)}">${e(p.id)}</button>`).join('')}</div></details>` : ''));
    for (const name of ['patient', 'trial', 'decision']) document.getElementById(`${name}-perspective`).hidden = state.perspective !== name;
    document.querySelector('#patients-toggle strong').textContent = run.current.total;
    document.querySelector('#patients-toggle').setAttribute('aria-label', `Open patient explorer, ${run.current.total} synthetic records`);
    patch('patient-queue', renderPatientQueue({ state, run, escape: e, icon }));
    const visible = visibleRecords(run, state.filters);
    const selectedIndex = visible.findIndex(r => r.id === state.selectedPatientId);
    patch('patient-detail', `<div class="patient-stepper"><span>${selectedIndex < 0 ? 'Selected record is outside current filters' : `${selectedIndex + 1} of ${visible.length} shown`}</span><div><button data-action="previous-patient" aria-label="Previous visible patient" ${selectedIndex <= 0 ? 'disabled' : ''}>←</button><button data-action="next-patient" aria-label="Next visible patient" ${selectedIndex < 0 || selectedIndex >= visible.length - 1 ? 'disabled' : ''}>→</button></div></div>${renderPatientDetail({ state, run, sources:run.evidenceRegistry, config: run.protocolConfig || clinicalConfig, escape: e, icon })}`, patientChanged || runChanged);
    if (patientChanged || previousDetailTab !== state.detailTab) document.querySelector('#patient-detail-content')?.scrollTo({ top: 0, behavior: 'instant' });
    patch('case-people-controls', renderCasePeopleControls(run, state));
    peopleHost.hidden = !run.casePack && !run.unified;
    const peopleDestination = document.getElementById(`${state.perspective}-people-slot`);
    if (peopleHost.parentElement !== peopleDestination) peopleDestination.append(peopleHost);
    patch('cohort-charts', renderPatientCharts(run, state), runChanged ? 'charts' : false);
    patch('trial-charts', renderTrialCharts(run, state, analysisView, analysisDimension), runChanged ? 'charts' : false);
    patch('scene-story', renderSceneStory(run), runChanged);
    patch('trial-summary', renderTrialSummary(run), runChanged);
    patch('trial-analytics', renderTrialAnalytics(run, state));
    patch('trial-selection', `<strong>${visibleRecords(run, state.filters).length} of ${run.current.total} records highlighted</strong><span>Selected: ${e(state.selectedPatientId)} · ${e(run.id)}</span>${state.filters.age !== 'all' || state.filters.subgroup !== 'all' ? '<button data-action="clear-filters">Clear linked filters ×</button>' : ''}`);
    patch('decision-content', renderDecision(workspace, traceStep, traceCriterion));
    for (const form of document.querySelectorAll('[data-guidance-form]')) {
      const draft = guidanceDrafts.get(`${run.id}/${state.selectedPatientId}/${form.dataset.guidanceForm}`);
      if (draft) for (const [name,value] of Object.entries(draft)) form.elements.namedItem(name).value = value;
    }
    const dispositionDraft = dispositionDrafts.get(`${run.id}/${state.selectedPatientId}`);
    if (dispositionDraft) {
      for (const form of document.querySelectorAll('[data-review-form]')) {
        form.querySelector('[name="reason"]').value = dispositionDraft.reason;
        form.querySelector('[name="disposition"]').value = dispositionDraft.disposition;
      }
    }
    const destination = document.getElementById(state.perspective === 'trial' ? 'trial-scene-slot' : 'patient-scene-slot');
    if (sceneHost.parentElement !== destination) destination.append(sceneHost);
    scene.setVisible(state.perspective !== 'decision' && (state.perspective !== 'trial' || document.getElementById('trial-context-details').open) && !(mobileDetailOpen && matchMedia('(max-width: 900px)').matches));
    scene.update({ run, selectedPatientId: state.selectedPatientId, visibleIds: visibleRecords(run, state.filters).map(r => r.id), reducedMotion: motion.matches });
    if (patientChanged && state.perspective === 'patient' && !mobileDetailOpen && !presentationNavigation) requestAnimationFrame(() => {
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
    const caseContext = document.querySelector('.case-context-summary');
    if (caseContext) caseContext.open = false;
    const fromQueue = queueDialog.open;
    closeQueue(false);
    if (fromQueue && workspace.state.perspective !== 'patient') navigate('patient');
    scene.focusPatient(id);
    const unchanged = workspace.state.selectedPatientId === id;
    if (compactViewport.matches && workspace.state.perspective === 'patient') { mobileDetailOpen = true; if (origin !== 'detail') mobileReturnToStage = origin === 'scene'; }
    workspace.selectPatient(id);
    // The same selected patient can still open the compact-screen detail.
    if (unchanged) render();
    if (origin!=='presentation' && (fromQueue || mobileDetailOpen && workspace.state.perspective === 'patient')) requestAnimationFrame(() => {
      document.querySelector('#selected-patient-heading')?.focus({ preventScroll: true });
      if (mobileDetailOpen) document.querySelector('.patient-detail-region')?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  }

  function openQueue(opener = document.activeElement) {
    queueOpenerId = opener?.id || 'patients-toggle';
    queueRestoreFocus = true;
    if (!queueDialog.open) queueDialog.showModal();
    transitionPanel(queueDialog, 'drawer');
    document.querySelector('#patient-search')?.focus({ preventScroll: true });
  }

  function closeQueue(restore = true) {
    if (!queueDialog.open) return;
    queueRestoreFocus = restore; queueDialog.close();
  }

  function navigate(perspective, updateUrl = true) {
    closeQueue(false);
    const changed = workspace.state.perspective !== perspective;
    mobileDetailOpen = false;
    workspace.setPerspective(perspective);
    render();
    if (updateUrl && location.hash !== `#${perspective}`) history.pushState({}, '', `#${perspective}`);
    document.getElementById('main').focus({ preventScroll: true });
    if (changed) transitionPanel(document.getElementById(`${perspective}-perspective`));
  }

  function changeDataset(id, activity = {}) {
    if (id === workspace.state.dataset) return;
    closeQueue(false);
    mobileDetailOpen = false;
    workspace.setDataset(id,activity);
    if(activity.activity!=='presentation')announce(`${workspace.run.casePack?.id || workspace.run.dataset.shortLabel} loaded · ${workspace.run.current.total} synthetic records · ${workspace.run.id}.`);
  }

  function changeScenario(id, activity = {}) {
    const prior = workspace.run.id;
    workspace.setScenario(id,activity);
    if (workspace.run.id !== prior && activity.activity!=='presentation') {
      const { current } = workspace.run;
      announce(`${current.gate.active ? 'Proposed scenario active' : current.gate.requested ? 'Revision withheld; original rules retained' : 'Original protocol restored'}. ${current.eligible}/${current.total} meet modeled rules · ${current.excluded} excluded · ${current.indeterminate} indeterminate · ${current.newlyEligible} newly matching.`);
    }
  }

  function toolHeader(title, actions = '') {
    return `<header class="tool-header"><div><span class="studio-eyebrow">COHORT / STUDY TOOLS</span><h2 id="tool-title">${title}</h2></div><div>${actions}<button class="studio-icon-button" data-action="close-tool" aria-label="Close study tool">${icon('close')}</button></div></header>`;
  }

  function renderTool() {
    const label = workspace.run.unified && tool==='population' ? 'Full trial requirements' : { protocol: 'Study protocol', criteria: 'Criterion review desk', population: 'Boundary explorer', report: 'Current review packet', assumptions: 'Dataset assumptions & provenance' }[tool] || 'Demonstration guide';
    const actions = tool === 'report' ? `<button class="studio-button" data-action="export">${icon('download')} Export JSON</button><button class="studio-button primary" data-action="print">${icon('print')} Print / PDF</button>` : '';
    patch(toolDialog, `${toolHeader(label, actions)}<div class="tool-content">${tool === 'report' ? renderReport(workspace) : workspace.run.unified ? renderUnifiedTool(workspace.run,tool) : workspace.run.casePack ? renderCaseTool(workspace.run) : tool === 'assumptions' ? renderAssumptions(workspace.run) : renderStudyTool(tool, { state: { ...workspace.state, ...toolState, criterion: toolCriterion }, run: workspace.run })}</div>`);
  }

  function showTool(name) {
    closeQueue(false);
    tool = name;
    document.querySelector('.study-tools-menu').open = false;
    renderTool();
    if (!toolDialog.open) toolDialog.showModal();
    transitionPanel(toolDialog);
  }

  function openEvidence(id, passageId = null) {
    const authored=workspace.run.unified && workspace.run.evidenceRegistry.find(source=>source.id===id&&source.type==='authored-demo-assumption');
    if(authored){workspace.setEvidence(id);evidenceView={kind:'source',id,passageId};evidenceDialog.innerHTML=renderUnifiedSource(authored,workspace.run);if(!evidenceDialog.open)evidenceDialog.showModal();transitionPanel(evidenceDialog,'drawer');return;}
    evidenceView = {kind:'source',id,passageId};
    if (guidanceSources.some(source => source.id === id)) { workspace.setEvidence(id); evidenceDialog.innerHTML = renderVerifiedSource(id,passageId,workspace.run.id); if (!evidenceDialog.open) evidenceDialog.showModal(); transitionPanel(evidenceDialog,'drawer'); return; }
    const caseSource = investigationSources.find(source=>source.id===id);
    if (caseSource) { workspace.setEvidence(id); evidenceDialog.innerHTML = renderCaseSource(caseSource,workspace.run.id); if (!evidenceDialog.open) evidenceDialog.showModal(); transitionPanel(evidenceDialog,'drawer'); return; }
    const source = sources.find(s => s.id === id);
    if (!source) return;
    workspace.setEvidence(id);
    const registered = clinicalConfig.evidence.find(s => s.id === id);
    const official = source.type === 'Official guidance';
    const synthetic = source.type === 'Synthetic patient data';
    evidenceDialog.innerHTML = `<div class="drawer-header"><span class="studio-eyebrow">EVIDENCE / ${official ? 'GUIDANCE CONTEXT' : synthetic ? 'DATASET PROVENANCE' : 'FICTIONAL DRUG EVIDENCE'}</span><button class="studio-icon-button" data-action="close-evidence" aria-label="Close evidence">${icon('close')}</button></div><div class="drawer-content"><span class="source-type ${official ? 'official' : ''}">${icon(official ? 'book' : 'flask')}${e(source.type)}</span><h2 id="evidence-title">${e(source.title)}</h2><dl class="source-provenance"><div><dt>Source ID</dt><dd>${e(id)}</dd></div><div><dt>Document date</dt><dd>${e(registered?.date || 'Not supplied')}</dd></div><div><dt>Document version</dt><dd>${e(registered?.version || 'Not supplied')}</dd></div><div><dt>Fixture container</dt><dd>SYN-217 case v${e(demoCase.case_version)} · ${e(workspace.run.id)}</dd></div><div><dt>Passage reference</dt><dd>${e(id)} / ${official ? 'source registry summary' : synthetic ? 'dataset notes' : 'fictional summary'}<small>No original document passage identifier supplied.</small></dd></div></dl><span class="studio-eyebrow passage-label">${official ? 'REGISTRY SUMMARY · PARAPHRASE, NOT A QUOTATION' : synthetic ? 'SYNTHETIC DATASET NOTES' : 'AUTHORED FICTIONAL SUMMARY'}</span><blockquote data-presentation-target="evidence-passage">${e(official ? registered?.use || registered?.summary || 'A source excerpt was not supplied.' : registered?.passage || registered?.summary || source.passage || 'A source excerpt was not supplied.')}</blockquote><section class="evidence-relationship"><h3>Relationship to this finding</h3><p>${e(source.relationship)}</p></section><div class="source-applicability"><strong>${official ? 'Context does not establish SYN-217 safety.' : synthetic ? 'Synthetic provenance, not a real patient cohort.' : 'Applicability requires qualified review.'}</strong><p>${official ? 'This prototype includes a registry description, not a verified verbatim excerpt. Check the original source and its current status before making regulatory claims.' : id.startsWith('SYN-PK') ? `The fictional renal packet covers a stable eGFR ${e(clinicalConfig.thresholds.renalProposedMin)}–<${e(clinicalConfig.thresholds.renalOriginalMin)} subgroup. ${workspace.state.dataset === 'casebook' ? 'The 20-record reference case has no longitudinal renal series; its stability flag is a synthetic adapter assumption.' : 'Generated and draft renal-stability flags are authored synthetic values. A single dated measurement does not establish longitudinal stability.'} No supplied evidence supports extension below ${e(clinicalConfig.thresholds.renalProposedMin)}.` : 'The supplied summary is fictional and cannot establish safety or enrollment approval for a real patient.'}</p></div>${source.note ? `<p class="source-note">${e(source.note)}</p>` : ''}${source.url ? `<a class="studio-button full" href="${e(source.url)}" target="_blank" rel="noopener noreferrer">Read official source ${icon('external')}</a>` : '<p class="fixture-disclosure">Prepared fictional content for this software demonstration.</p>'}</div><div class="drawer-footer">${icon('shield')} Evidence applicability and modeled rule matching are separate.</div>`;
    if (!evidenceDialog.open) evidenceDialog.showModal();
    transitionPanel(evidenceDialog, 'drawer');
  }

  function renderScratch(feedbackOnly = false) {
    const errors = draftEvaluation?.errors || {};
    const html = workspace.run.unified ? renderUnifiedProfile(profileDraft,draftEvaluation,errors) : renderProfileForm({ draft: profileDraft, evaluation: draftEvaluation, errors, datasetLabel: `${workspace.run.dataset.shortLabel} · ${workspace.run.current.total} loaded records`, escape: e, icon });
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
    draftEvaluation = evaluateDraft(profileDraft, workspace.run.patients, workspace.run.unified);
    renderScratch(true);
  }

  function showProfile() {
    if (workspace.run.casePack) { announce('Profile authoring is not configured for this case pack.'); return; }
    closeQueue(false);
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
    if(workspace.run.unified){closeQueue(false);tool='guide';toolDialog.innerHTML=`<header class="tool-header"><span class="studio-eyebrow">ONE TRIAL · DEMONSTRATION GUIDE</span><button class="studio-icon-button" data-action="close-tool" aria-label="Close guide">${icon('close')}</button></header><div class="tool-content"><article class="unified-protocol-tool"><h2>One cohort. Eight connected domains.</h2><ol><li>Inspect SYN-0001: HIV, brain metastases, age, support needs, another malignancy and renal function coexist on the same patient.</li><li>Apply Proposed inclusive. Every medical and participation requirement must pass.</li><li>Open Trial Strategy → Patient × Criterion. Select any domain cell for its checks and observations.</li><li>Inspect SYN-0002 for a retained interaction, SYN-0003 for a missing lab, SYN-0004 for pending support and SYN-0005 for pending consent.</li><li>Use Gender and the combined Race/Ethnicity panel to inspect composition; neither changes eligibility.</li><li>Record an actual review annotation and export the shared review packet.</li></ol><p>The policies, patients and assessments are authored fiction. A matching record is a modeled review candidate, not an enrollment authorization.</p></article></div>`;if(!toolDialog.open)toolDialog.showModal();return;}
    closeQueue(false);
    tool = 'guide';
    renderedHtml.delete(toolDialog);
    document.querySelector('.study-tools-menu').open = false;
    const example = workspace.run.proposed.records.find(record => record.id === 'P03');
    const exampleProfile = example ? getReviewProfile(example) : null;
    const exampleSum = exampleProfile?.components?.filter(component => component.points).map(component => component.points).join(' + ');
    toolDialog.innerHTML = `${toolHeader('A three-minute demonstration')}<div class="tool-content demo-guide"><p>Reference-case walkthrough. Starting a step switches to the unchanged 20-record reference dataset.</p><ol><li><strong>Start with the individual.</strong><p>Select P03 and inspect the original renal exclusion. ${exampleProfile?.score !== null && exampleProfile?.score !== undefined ? `Its proposed index is ${exampleSum} = ${exampleProfile.score}, an illustrative attention measure.` : 'Its proposed index is available only when the configured eligibility and scoring requirements are met.'}</p><button data-guide="patient">Open P03 in the reference case ${icon('arrow')}</button></li><li><strong>Follow the evidence.</strong><p>Read the fictional renal PK summary and the missing stability-evidence limitation.</p><button data-source="SYN-PK-02">Inspect the fictional source ${icon('arrow')}</button></li><li><strong>Compare the proposed scenario.</strong><p>Apply the configured rule and watch the calculated patient groups change.</p><button data-guide="scenario">Apply proposed demonstration rule ${icon('arrow')}</button></li><li><strong>Keep restrictions visible.</strong><p>P06 remains excluded by its medication restriction. P16 becomes indeterminate because hepatic information is missing.</p><button data-guide="restriction">Inspect P06 ${icon('arrow')}</button></li><li><strong>Inspect population composition.</strong><p>Compare explicit denominators and click a linked age group.</p><button data-guide="trial">Open Trial Strategy ${icon('arrow')}</button></li><li><strong>Review the trail.</strong><p>Trace actual sources and rule outcomes, record a demonstration disposition, then export the current packet.</p><button data-guide="decision">Open Decision Review ${icon('arrow')}</button></li></ol></div>`;
    toolDialog.showModal();
  }

  function openGuidanceTopic(id) {
    const row=document.querySelector(`#decision-content [data-guidance-topic="${id}"]`);
    if(!row)throw new Error('The guidance topic is unavailable.');
    row.open=true;row.scrollIntoView({block:'start',behavior:motion.matches?'instant':'smooth'});row.querySelector('summary').focus({preventScroll:true});
  }

  function inspectAnalysisGroup(id, quiet = false) {
    workspace.setFilters({status:'all',age:'all',subgroup:id,query:'',demographic:'all'});
    navigate('patient',!quiet);const records=visibleRecords(workspace.run,workspace.state.filters);if(records.length)workspace.selectPatient(records[0].id);
    openQueue(document.querySelector('#patients-toggle'));
    if(!quiet)announce(`Opened ${records.length} exact records from this analysis. Active scenario unchanged.`);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button, a.studio-brand, [data-analysis-group]');
    if (!button) {
      const row = event.target.closest('[data-patient-row]');
      if (row) selectPatient(row.dataset.patientRow);
      return;
    }
    try {
      if (button.closest('#profile-form') && button.type === 'submit') { event.preventDefault(); evaluateScratch(); return; }
      if (button.matches('a.studio-brand')) { event.preventDefault(); navigate('patient'); return; }
      if (button.dataset.analysisView) { analysisView = button.dataset.analysisView; render(); transitionPanel(document.getElementById('trial-charts')); return; }
      if (button.dataset.analysisDimension) { analysisDimension = button.dataset.analysisDimension; render(); transitionPanel(document.getElementById('trial-charts')); return; }
      if (button.dataset.guidanceOpen) { openGuidanceTopic(button.dataset.guidanceOpen); return; }
      if (button.dataset.analysisGroup) { inspectAnalysisGroup(button.dataset.analysisGroup); return; }
      if(button.dataset.inspectDomain){const patientId=button.dataset.criterionPatient||workspace.state.selectedPatientId;if(patientId!==workspace.state.selectedPatientId)workspace.selectPatient(patientId);evidenceView={kind:'domain',patientId,domainId:button.dataset.inspectDomain};evidenceDialog.innerHTML=renderUnifiedDomain(workspace.run,patientId,button.dataset.inspectDomain);if(!evidenceDialog.open)evidenceDialog.showModal();transitionPanel(evidenceDialog,'drawer');return;}
      if(button.hasAttribute('data-open-matrix')){analysisView='matrix';navigate('trial');return;}
      if(button.dataset.openInclusion){navigate('patient');selectPatient(button.dataset.openInclusion,'picker');return;}
      if (button.dataset.source) { openEvidence(button.dataset.source, button.dataset.passage); return; }
      if (button.dataset.perspective) { if (toolDialog.open) toolDialog.close(); navigate(button.dataset.perspective); return; }
      if (button.dataset.scenario) { changeScenario(button.dataset.scenario); return; }
      if (button.dataset.inspectStatus) { workspace.setFilters({ status: button.dataset.inspectStatus, age: 'all', subgroup: 'all', query: '', demographic: 'all' }); const records = visibleRecords(workspace.run, workspace.state.filters); if (records.length) workspace.selectPatient(records[0].id); navigate('patient'); openQueue(document.querySelector('#patients-toggle')); announce('Opened whole-cohort records; other filters cleared.'); return; }
      if (button.dataset.queuePage !== undefined) { workspace.setQueuePage(Number(button.dataset.queuePage)); document.querySelector('.sp-queue-scroll')?.scrollTo({ top: 0 }); document.querySelector('.sp-queue-pagination button:not(:disabled)')?.focus({ preventScroll: true }); return; }
      if (button.dataset.composition) { workspace.setCompositionDimension(button.dataset.composition); transitionPanel(document.querySelector('.composition-rows')); return; }
      if (button.dataset.demographic) { workspace.setFilters({ demographic: workspace.state.filters.demographic === button.dataset.demographic ? 'all' : button.dataset.demographic }); return; }
      if (button.dataset.clearFilter) { workspace.setFilters({ [button.dataset.clearFilter]: button.dataset.clearFilter === 'query' ? '' : 'all' }); return; }
      if (button.dataset.view) { toolState.populationView = button.dataset.view; renderTool(); return; }
      if (button.dataset.boundary) { toolState.boundary = button.dataset.boundary; renderTool(); return; }
      if (button.dataset.filter) { workspace.setFilters({ status: button.dataset.filter }); return; }
      if (button.dataset.dataset) { changeDataset(button.dataset.dataset); return; }
      if (button.dataset.reviewMode) { if (button.dataset.reviewMode === 'ranked') { toolDialog.close(); navigate('patient'); openQueue(document.querySelector('#patients-toggle')); } return; }
      if (button.dataset.patient || button.dataset.record) { selectPatient(button.dataset.patient || button.dataset.record); return; }
      if (button.dataset.status) { workspace.setFilters({ status: button.dataset.status }); return; }
      if (button.dataset.age) { workspace.setFilters({ age: workspace.state.filters.age === button.dataset.age ? 'all' : button.dataset.age }); return; }
      if (button.dataset.subgroup) { workspace.setFilters({ subgroup: workspace.state.filters.subgroup === button.dataset.subgroup ? 'all' : button.dataset.subgroup }); return; }
      if (button.dataset.detailTab) { workspace.setDetailTab(button.dataset.detailTab); return; }
      if (button.dataset.inspectCriterion) {
        const patientId = button.dataset.criterionPatient || workspace.state.selectedPatientId;
        evidenceView={kind:'criterion',patientId,criterionId:button.dataset.inspectCriterion,phase:button.dataset.criterionPhase};
        workspace.selectPatient(patientId); workspace.setEvidence(null);
        evidenceDialog.innerHTML = renderCriterionInspection(workspace.run,patientId,button.dataset.inspectCriterion,button.dataset.criterionPhase);
        if (!evidenceDialog.open) evidenceDialog.showModal(); transitionPanel(evidenceDialog,'drawer'); return;
      }
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
      if (action === 'open-queue') openQueue(button);
      if (action === 'close-queue') closeQueue();
      if (action === 'clear-filters') workspace.setFilters({ status: 'all', age: 'all', subgroup: 'all', query: '', demographic: 'all' });
      if (action === 'clear-filters-locate') { workspace.setFilters({ status: 'all', age: 'all', subgroup: 'all', query: '', demographic: 'all' }); scene.focusPatient(workspace.state.selectedPatientId); }
      if (action === 'dataset') changeDataset(workspace.state.dataset === 'casebook' ? 'expanded' : 'casebook');
      if (action === 'assumptions') showTool('assumptions');
      if (action === 'inspect-filtered') { const records = visibleRecords(workspace.run, workspace.state.filters); if (records.length && !records.some(record => record.id === workspace.state.selectedPatientId)) workspace.selectPatient(records[0].id); navigate('patient'); openQueue(document.querySelector('#patients-toggle')); }
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
        mobileDetailOpen = false; navigate('patient'); openQueue(document.querySelector('#patients-toggle'));
      }
      if (action === 'back-to-queue') {
        mobileDetailOpen = false; render();
        if (mobileReturnToStage) {
          const target = document.querySelector('.constellation'); target.scrollIntoView({ block: 'start', behavior: 'instant' });
          const selected = document.querySelector(`[data-scene-patient="${workspace.state.selectedPatientId}"]`);
          selected?.focus({ preventScroll: true }); selected?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
        } else { openQueue(document.querySelector('#patients-toggle')); document.querySelector(`#patient-queue [data-patient="${workspace.state.selectedPatientId}"]`)?.focus({ preventScroll: true }); }
      }
      if (['previous-patient', 'next-patient', 'previous', 'next'].includes(action)) {
        const records = visibleRecords(workspace.run, workspace.state.filters);
        const index = records.findIndex(r => r.id === workspace.state.selectedPatientId);
        const target = records[index + (action.includes('previous') ? -1 : 1)];
        if (target) selectPatient(target.id, 'detail');
      }
      if (action === 'reset') {
        clearTimeout(profileTimer); profileDraft = {}; draftEvaluation = null; mobileDetailOpen = false;
        closeQueue(false);
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
        const blob = new Blob([JSON.stringify(buildReviewPacket(workspace), null, workspace.run.unified ? 0 : 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = `cohort-${workspace.run.id}-${workspace.run.datasetVersion}.json`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        announce('Current analysis, filters, evidence, and local events exported as JSON.');
      }
    } catch (error) { announce(error.message); }
  });

  document.addEventListener('input', event => {
    const guidanceForm = event.target.closest('[data-guidance-form]');
    if (guidanceForm) { event.target.setCustomValidity(''); guidanceDrafts.set(`${workspace.run.id}/${workspace.state.selectedPatientId}/${guidanceForm.dataset.guidanceForm}`,Object.fromEntries(new FormData(guidanceForm))); }
    if (event.target.matches('[data-filter-query]')) workspace.setFilters({ query: event.target.value });
    if (event.target.closest('#profile-form')) { captureDraft(); clearTimeout(profileTimer); }
    if (event.target.closest('[data-review-form]')) dispositionDrafts.set(`${workspace.run.id}/${workspace.state.selectedPatientId}`, Object.fromEntries(new FormData(event.target.closest('form'))));
    if (event.target.matches('[data-review-form] [name="reason"]')) event.target.setCustomValidity('');
  });
  document.addEventListener('change', event => {
    const guidanceForm = event.target.closest('[data-guidance-form]');
    if (guidanceForm) guidanceDrafts.set(`${workspace.run.id}/${workspace.state.selectedPatientId}/${guidanceForm.dataset.guidanceForm}`,Object.fromEntries(new FormData(guidanceForm)));
    if (event.target.matches('[data-case-status]')) workspace.setFilters({status:event.target.value});
    if (event.target.matches('[data-case-patient]') && event.target.value) selectPatient(event.target.value, 'picker');
    if (event.target.matches('[data-filter-route]')) workspace.setFilters({subgroup:event.target.value});
    if (event.target.id === 'scenario-options') changeScenario(event.target.value);
    if (event.target.id === 'dataset-selector') changeDataset(event.target.value);
    if (event.target.id === 'trace-criterion') { traceCriterion = event.target.value; render(); }
    if (event.target.closest('#profile-form')) evaluateScratch();
    if (event.target.closest('[data-review-form]')) dispositionDrafts.set(`${workspace.run.id}/${workspace.state.selectedPatientId}`, Object.fromEntries(new FormData(event.target.closest('form'))));
  });
  document.addEventListener('submit', event => {
    if (event.target.matches('[data-guidance-form]')) {
      event.preventDefault(); const form = event.target, data = new FormData(form);
      for (const name of ['rationale','evidenceNotes']) if (!String(data.get(name)||'').trim()) { const field=form.elements.namedItem(name);field.setCustomValidity('Document the specific rationale and information considered.');field.reportValidity();return; }
      guidanceDrafts.delete(`${workspace.run.id}/${workspace.state.selectedPatientId}/${form.dataset.guidanceForm}`);
      workspace.recordGuidanceReview({patientId:workspace.state.selectedPatientId,topicId:form.dataset.guidanceForm,status:data.get('status'),rationale:data.get('rationale'),evidenceNotes:data.get('evidenceNotes')});
      announce('Review rationale recorded for this patient and run. Medical eligibility is unchanged.'); return;
    }
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
    if (event.key === 'Escape') app.classList.add('chart-tooltips-dismissed');
    if (event.target.matches('[data-analysis-group][role=button]') && ['Enter',' '].includes(event.key)) { event.preventDefault(); event.target.dispatchEvent(new MouseEvent('click',{bubbles:true})); return; }
    if (event.target.matches('[role="tab"][data-detail-tab]') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      const tabs = ['overview', 'criteria', 'evidence', 'pathway'];
      const index = tabs.indexOf(event.target.dataset.detailTab);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      event.preventDefault(); workspace.setDetailTab(tabs[next]);
      document.getElementById(`patient-tab-${tabs[next]}`)?.focus({ preventScroll: true });
      return;
    }
    const patientButton = event.target.closest('#patient-queue [data-patient]');
    if (!patientButton || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const records = visibleRecords(workspace.run, workspace.state.filters);
    const index = records.findIndex(r => r.id === patientButton.dataset.patient);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? records.length - 1 : Math.max(0, Math.min(records.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
    if (records[next]) {
      event.preventDefault(); workspace.setQueuePage(Math.floor(next / queuePageSize));
      const target = document.querySelector(`#patient-queue [data-patient="${records[next].id}"]`);
      target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  });
  document.addEventListener('focusin', () => app.classList.remove('chart-tooltips-dismissed'));
  document.addEventListener('pointerover', event => {
    const control = event.target.closest('.criterion-chart-row, .patient-gate-cells>button');
    if (control && !control.contains(event.relatedTarget)) app.classList.remove('chart-tooltips-dismissed');
  });
  for (const dialog of [evidenceDialog, toolDialog, profileDialog]) dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  queueDialog.addEventListener('click', event => { if (event.target === queueDialog) closeQueue(); });
  queueDialog.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); closeQueue(); } });
  queueDialog.addEventListener('close', () => { if (queueRestoreFocus) document.getElementById(queueOpenerId)?.focus({ preventScroll: true }); });
  evidenceDialog.addEventListener('close', () => { if(!evidenceDialog.open){evidenceView=null;workspace.setEvidence(null);} });
  profileDialog.addEventListener('close', () => clearTimeout(profileTimer));
  motion.addEventListener('change', () => {
    if (motion.matches) for (const id of ['cohort-charts', 'trial-charts']) transitionCharts(document.getElementById(id));
    render();
  });
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
  document.getElementById('trial-context-details').addEventListener('toggle', render);
  let presentationOwnedGroup=null,documentedTopic=null,unresolvedTopic=null;
  const presentationTargets={
    population:['#population-visual .constellation','patient-perspective'],
    'original-reason':['#patient-detail [data-brief-section="original"] .brief-rule','patient-detail'],
    'evidence-passage':['#evidence-dialog .verified-passage','evidence-dialog'],
    'patient-conclusion':['#patient-detail .brief-lead','patient-detail'],
    'inclusion-matrix':['#trial-charts .unified-matrix','trial-charts'],
    'attention-breakdown':['#patient-detail .unified-attention','patient-detail'],
    'medication-rule':['#patient-detail [data-inspect-criterion="DDI"]','patient-detail'],
    'remaining-limits':['#patient-detail [data-brief-section="limits"]','patient-detail'],
    'eligibility-flow':['#trial-charts [data-chart="flow"] figure','trial-charts'],
    'age-composition':['#trial-charts [data-composition-group="75plus"]','trial-charts'],
    'patient-records':['#patient-queue .sp-queue-scroll','patient-queue'],
    'guidance-matrix':['#decision-content .guidance-matrix','decision-content'],
    'guidance-documented':[()=>`#decision-content [data-guidance-topic="${documentedTopic}"]`,'decision-content'],
    'guidance-unresolved':[()=>`#decision-content [data-guidance-topic="${unresolvedTopic}"]`,'decision-content'],
    'decision-trace':['#decision-content .trace-inspector','decision-content'],
    'report-summary':['#tool-dialog .unified-coverage','tool-dialog'],
  };
  const resolvePresentationTarget=id=>{const selector=presentationTargets[id]?.[0];return selector?document.querySelector(typeof selector==='function'?selector():selector):null;};
  function presentationGuidanceTopic(run,state,documented){
    const rows=getGuidanceRows(run,state,state.selectedPatientId);
    return documented?rows.find(row=>row.documentationStatus==='Evidence linked'):rows.find(row=>row.documentationStatus==='Documentation missing'||row.reviewStatus==='applicability_unresolved');
  }
  function closePresentationViews(){
    closeQueue(false);
    if(profileDialog.open)captureDraft();
    for(const dialog of [evidenceDialog,toolDialog,profileDialog])if(dialog.open)dialog.close();
    document.querySelector('.study-tools-menu').open=false;
    document.querySelector('.scenario-advanced')?.removeAttribute('open');
  }
  async function focusPresentationTarget(id,signal){
    const runId=workspace.run.id,patientId=workspace.state.selectedPatientId;
    let target;
    await waitForPresentationView(()=>{
      target=resolvePresentationTarget(id);
      return workspace.run.id===runId&&workspace.state.selectedPatientId===patientId&&app.dataset.runId===runId&&target?.getClientRects().length&&!scene.transitioning&&![...target.getAnimations({subtree:true})].some(animation=>animation.playState==='running');
    },signal,`“${id}” is unavailable or did not finish loading. Retry this scene or exit.`);
    signal.throwIfAborted();
    if(!target.isConnected||resolvePresentationTarget(id)!==target)throw new Error(`“${id}” became unavailable. Retry this scene or exit.`);
    const scrollTarget=id==='eligibility-flow'?target.closest('[data-chart="flow"]'):target;
    const scrollParents=[];for(let parent=scrollTarget.parentElement;parent;parent=parent.parentElement)if(parent.scrollHeight>parent.clientHeight||parent.scrollWidth>parent.clientWidth)scrollParents.push(parent);
    const stopScrolling=()=>{for(const parent of scrollParents)parent.scrollTo({top:parent.scrollTop,left:parent.scrollLeft,behavior:'instant'});};
    signal.addEventListener('abort',stopScrolling,{once:true});
    try{
      scrollTarget.scrollIntoView({block:scrollTarget.getBoundingClientRect().height>innerHeight*.55?'start':'center',inline:'nearest',behavior:motion.matches?'instant':'smooth'});
      let previous=null,stable=0;
      await waitForPresentationView(()=>{if(!target.isConnected||resolvePresentationTarget(id)!==target||app.dataset.runId!==runId)return false;const rect=target.getBoundingClientRect();const position=`${Math.round(rect.top)},${Math.round(rect.left)}`;stable=position===previous?stable+1:0;previous=position;return stable>=4;},signal,`“${id}” is unavailable or could not finish positioning. Retry this scene or exit.`);
    }finally{signal.removeEventListener('abort',stopScrolling);}
    signal.throwIfAborted();
    const focus=target.matches('button,input,select,textarea')?target.closest('section')||target.parentElement:target;
    if(!focus.hasAttribute('tabindex'))focus.setAttribute('tabindex','-1');focus.focus({preventScroll:true});
  }
  function capturePresentationView(){
    const state=workspace.state;
    return {dataset:state.dataset,scenario:state.scenarioId,patientId:state.selectedPatientId,perspective:state.perspective,filters:{...state.filters},detailTab:state.detailTab,queuePage:state.queuePage,compositionDimension:state.compositionDimension,
      analysisView,analysisDimension,traceStep,traceCriterion,toolCriterion,toolState:{...toolState},population:scene.getViewState(),mobileDetailOpen,mobileReturnToStage,hash:location.hash,
      evidence:evidenceDialog.open?structuredClone(evidenceView):null,tool:toolDialog.open?tool:null,queue:queueDialog.open,profile:profileDialog.open,
      scrolls:['#main','#patient-detail-content','#patient-queue .sp-queue-scroll'].map(selector=>({selector,top:document.querySelector(selector)?.scrollTop||0,left:document.querySelector(selector)?.scrollLeft||0})),
      briefOpen:[...document.querySelectorAll('#patient-detail [data-brief-section][open]')].map(node=>node.dataset.briefSection),
    };
  }
  async function restorePresentationView(view,context){
    if(!view)return;presentationNavigation=true;
    try{
      closePresentationViews();changeDataset(view.dataset,context.activity);changeScenario(view.scenario,context.activity);
      try{workspace.setFilters(view.filters);}catch{workspace.setFilters({status:'all',age:'all',subgroup:'all',query:'',demographic:'all'});}
      if(workspace.run.patients.some(record=>record.id===view.patientId))workspace.selectPatient(view.patientId);
      workspace.setDetailTab(view.detailTab);workspace.setCompositionDimension(view.compositionDimension);
      analysisView=view.analysisView;analysisDimension=view.analysisDimension;traceStep=view.traceStep;traceCriterion=view.traceCriterion;toolCriterion=view.toolCriterion;Object.assign(toolState,view.toolState);
      navigate(view.perspective,false);mobileDetailOpen=view.mobileDetailOpen;mobileReturnToStage=view.mobileReturnToStage;render();scene.restoreViewState(view.population);
      workspace.setQueuePage(Math.min(view.queuePage,Math.max(0,Math.ceil(visibleRecords(workspace.run,workspace.state.filters).length/queuePageSize)-1)));
      for(const id of view.briefOpen)document.querySelector(`#patient-detail [data-brief-section="${id}"]`)?.setAttribute('open','');
      if(view.tool)showTool(view.tool);
      if(view.evidence?.kind==='source'&&workspace.run.evidenceRegistry.some(source=>source.id===view.evidence.id))openEvidence(view.evidence.id,view.evidence.passageId);
      if(view.evidence?.kind==='domain'){evidenceView=view.evidence;evidenceDialog.innerHTML=renderUnifiedDomain(workspace.run,view.evidence.patientId,view.evidence.domainId);evidenceDialog.showModal();}
      if(view.evidence?.kind==='criterion'&&workspace.run.explanations[view.evidence.patientId]){
        evidenceView=view.evidence;evidenceDialog.innerHTML=renderCriterionInspection(workspace.run,view.evidence.patientId,view.evidence.criterionId,view.evidence.phase);evidenceDialog.showModal();
      }
      if(view.queue)openQueue(document.querySelector('#patients-toggle'));if(view.profile)showProfile();
      history.replaceState({},'',view.hash||location.pathname);
      await new Promise(requestAnimationFrame);
      for(const scroll of view.scrolls)document.querySelector(scroll.selector)?.scrollTo({top:scroll.top,left:scroll.left,behavior:'instant'});
    }finally{presentationNavigation=false;}
  }
  const presentation=mountPresentation({
    studyLabel:unifiedStudy.title,datasetLabel:'One shared cohort · 500 synthetic patients',resolveTarget:resolvePresentationTarget,
    validate(definitions){
      const blockers=[],omitted=[],available=[];
      if(!datasetDefinitions.unified)blockers.push('The shared cohort is unavailable.');
      for(const id of ['SYN-0001','SYN-0002','SYN-0003'])if(!workspace.run.patients.some(patient=>patient.id===id))blockers.push(`Required reference patient ${id} is unavailable.`);
      if(!resolveScenario(unifiedProtocol,'proposed-inclusive').active)blockers.push('The proposed inclusive protocol is not executable.');
      if(!workspace.run.evidenceRegistry.some(source=>source.id==='DEMO-POLICY-HIV'))blockers.push('The authored HIV policy is unavailable.');
      if(blockers.length)return {blockers,omitted,scenes:definitions};
      const preview=createWorkspace({dataset:'unified'}),seen=new Set();
      const priority=preview.run.profiles['SYN-0001'];
      for(const definition of definitions){
        const ids=[definition.target,...(definition.beats||[]).map(beat=>beat.target)];
        if(seen.has(definition.id)||!Number.isFinite(definition.holdMs)||definition.holdMs<=0){blockers.push('Scene IDs must be unique and hold durations must be positive.');continue;}seen.add(definition.id);
        if(definition.readiness!=='analysis-and-target-settled'||definition.context.studyId!==preview.run.studyId){blockers.push(`${definition.title}: its readiness policy or study context is unavailable.`);continue;}
        let missing=ids.find(id=>!presentationTargets[id]||!document.getElementById(presentationTargets[id][1]));
        if(!missing){
          if(!preview.run.patients.some(patient=>patient.id===definition.context.patientId)){blockers.push(`${definition.title}: the required patient is unavailable.`);continue;}
          preview.setScenario(definition.context.scenario);preview.selectPatient(definition.context.patientId);preview.setDetailTab(definition.context.detailTab);
          const probe=document.createElement('template');
          const patientHtml=renderPatientDetail({state:preview.state,run:preview.run,sources,config:clinicalConfig,escape:e,icon});
          probe.innerHTML=`<div id="patient-detail">${patientHtml}</div><div id="trial-charts">${renderTrialCharts(preview.run,preview.state,definition.view?.analysis||'eligibility',definition.view?.dimension||'age')}</div><div id="decision-content">${renderDecision(preview)}</div><div id="patient-queue">${renderPatientQueue({state:preview.state,run:preview.run,escape:e,icon})}</div><div id="tool-dialog">${definition.view?.report?renderReport(preview):''}</div>`;
          missing=ids.find(id=>!['population','evidence-passage','guidance-documented','guidance-unresolved'].includes(id)&&!probe.content.querySelector(presentationTargets[id][0]));
          if(!missing)missing=ids.find(id=>id==='guidance-documented'&&!presentationGuidanceTopic(preview.run,preview.state,true)||id==='guidance-unresolved'&&!presentationGuidanceTopic(preview.run,preview.state,false));
        }
        const reason=missing?`View target ${missing} is unavailable.`:definition.id==='priority'&&!Number.isFinite(preview.run.profiles[definition.context.patientId]?.score)?'No configured attention index is available.':null;
        if(reason){if(definition.required)blockers.push(`${definition.title}: ${reason}`);else omitted.push({id:definition.id,title:definition.title,reason});}else available.push(definition);
      }
      return {blockers,omitted,scenes:available};
    },
    capture:capturePresentationView,restore:restorePresentationView,
    cleanup(){if(presentationOwnedGroup&&workspace.state.filters.subgroup===presentationOwnedGroup)workspace.setFilters({subgroup:'all'});presentationOwnedGroup=null;},
    async enter(definition,{signal,activity}){
      signal.throwIfAborted();presentationNavigation=true;
      try{
        closePresentationViews();changeDataset(definition.context.dataset,activity);changeScenario(definition.context.scenario,activity);
        workspace.setFilters({status:'all',age:'all',subgroup:'all',query:'',demographic:'all'});
        navigate(definition.context.perspective,false);selectPatient(definition.context.patientId,'presentation');workspace.setDetailTab(definition.context.detailTab);
        analysisView=definition.view?.analysis||'matrix';analysisDimension=definition.view?.dimension||'age';
        mobileDetailOpen=compactViewport.matches&&definition.context.perspective==='patient'&&definition.target!=='population';render();
        for(const part of document.querySelectorAll('#patient-detail [data-brief-section]'))part.open=part.dataset.briefSection===definition.view?.brief;
        const underlying=document.querySelector('#patient-detail .brief-underlying');if(underlying)underlying.open=Boolean(definition.view?.attention);
        if(definition.view?.population==='overview')scene.showOverview();
        if(definition.view?.evidenceId)openEvidence(definition.view.evidenceId);
        if(definition.view?.group){workspace.setFilters({subgroup:definition.view.group});presentationOwnedGroup=definition.view.group;}
        for(const row of document.querySelectorAll('#decision-content .guidance-row'))row.open=false;
        const trace=document.querySelector('#decision-content .decision-trace');if(trace)trace.open=Boolean(definition.view?.trace);
        if(definition.view?.trace){traceStep=definition.view.trace;traceCriterion='HIV';render();document.querySelector('#decision-content .decision-trace').open=true;}
        if(definition.view?.report)showTool('report');
      }finally{presentationNavigation=false;}
      await focusPresentationTarget(definition.target,signal);
    },
    async beat(definition,beat,{signal}){
      signal.throwIfAborted();presentationNavigation=true;
      try{
        if(beat.action==='inspect-group'){inspectAnalysisGroup(beat.group,true);presentationOwnedGroup=beat.group;}
        if(beat.action==='trace'){traceStep=beat.step;traceCriterion='HIV';render();document.querySelector('#decision-content .decision-trace').open=true;}
        if(beat.action.startsWith('guidance-')){
          const row=presentationGuidanceTopic(workspace.run,workspace.state,beat.action==='guidance-documented');
          if(!row)throw new Error('No applicable documented/open topic is available for this scene.');
          if(beat.action==='guidance-documented')documentedTopic=row.id;else unresolvedTopic=row.id;
          for(const entry of document.querySelectorAll('#decision-content .guidance-row'))entry.open=entry.dataset.guidanceTopic===row.id;
        }
      }finally{presentationNavigation=false;}
      await focusPresentationTarget(beat.target,signal);
    },
  });

  workspace.subscribe(render);
  render();
  route();
  return { workspace, scene, presentation: presentation.controller };
}
