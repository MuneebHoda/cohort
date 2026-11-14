import { product, study, criteria, sources, patients, anchorPatients, clinicalConfig } from './data.js';
import { evaluateCohort, resolveScenario } from './cohort.js';
import { renderPopulation } from './explorer.js';
import { rankCandidates, getReviewProfile } from './ranking.js';

const stages = ['protocol', 'review', 'population', 'report'];
const state = { stage: stages.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'review', criterion: 'renal', revision: false, populationView: 'proposed', record: null, scenario: 'renal-revision', dataset: 'casebook', filter: 'all', boundary: 'all', reviewMode: 'ranked', rankingGroup: 'new' };
const app = document.querySelector('#app');
const dialog = document.querySelector('#evidence-dialog');
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const paths = {
  arrow: '<path d="M4 12h15m-5-5 5 5-5 5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  book: '<path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/>',
  people: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m3 11v-3a6 6 0 0 0-2-4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  shield: '<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
  external: '<path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
  print: '<path d="M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6Z"/><path d="M17 12h.01"/>',
  flask: '<path d="M9 3h6m-5 0v6L4 19a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L14 9V3M7 15h10"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.file}</svg>`;
const badge = (criterion) => `<span class="badge ${criterion.tone}"><span class="status-mark">${criterion.tone === 'neutral' ? '✓' : criterion.tone === 'amber' ? '!' : '↗'}</span>${escape(criterion.disposition)}</span>`;
const statusLabels = { eligible: 'Meets modeled rules', excluded: 'Does not meet modeled rules', indeterminate: 'Insufficient information' };
const currentPatients = () => state.dataset === 'casebook' ? anchorPatients : patients;
const requestedScenario = () => state.revision ? state.scenario : false;
const activeGate = () => resolveScenario(clinicalConfig, requestedScenario());
let baseline = evaluateCohort(currentPatients(), false);
let potential = evaluateCohort(currentPatients(), true);
let notificationTimer;

function highlightWording(text, phrase, tag) {
  if (!phrase || !text.includes(phrase)) return escape(text);
  const start = text.indexOf(phrase);
  return `${escape(text.slice(0, start))}<${tag}>${escape(phrase)}</${tag}>${escape(text.slice(start + phrase.length))}`;
}

function notify(message) {
  const element = document.querySelector('#notification');
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(notificationTimer);
  notificationTimer = setTimeout(() => element.classList.remove('visible'), 4000);
}

function sourceButton(sourceId, compact = false) {
  const source = sources.find((item) => item.id === sourceId);
  if (!source) return '';
  return `<button class="source-row ${compact ? 'compact' : ''}" data-source="${escape(source.id)}">${icon(source.type === 'Official guidance' ? 'book' : source.type === 'Synthetic patient data' ? 'people' : 'file')}<span><span class="source-title">${escape(source.shortTitle || source.title)}</span><span class="source-meta">${escape(source.type)} <span>·</span> ${escape(source.section)}</span></span>${icon('chevron')}</button>`;
}

function miniDots() {
  return `<div class="mini-dots" aria-hidden="true">${potential.records.map((record) => `<span class="mini-dot ${record.status} ${record.changed ? 'changed' : ''}"></span>`).join('')}</div>`;
}

function populationPreview() {
  const delta = potential.eligible - baseline.eligible;
  return `<aside class="population-preview"><div class="eyebrow">CRITERION 01 · RENAL REVISION</div><div class="preview-title"><span>${delta}</span> more<br> <em>possibilities.</em></div><p>A narrower criterion could open the study to more of this synthetic population.</p>${miniDots()}<div class="preview-counts"><div><span>Original</span><strong>${baseline.eligible}<small> / ${baseline.total}</small></strong></div>${icon('arrow')}<div class="teal-text"><span>With revision</span><strong>${potential.eligible}<small> / ${baseline.total}</small></strong></div></div><div class="preview-note">${icon(activeGate().active ? 'check' : 'info')}<span>${activeGate().active ? 'Approved demo rule active' : 'Approved-rule preview · not active'}</span></div><button class="button full secondary" data-stage="population">Explore population ${icon('arrow')}</button><div class="preview-foot">${baseline.total} synthetic records. Every dot is a record.<br> Requires review: ${baseline.indeterminate} original / ${potential.indeterminate} revised.</div></aside>`;
}

function reviewPage() {
  const criterion = criteria.find((item) => item.id === state.criterion);
  return `<div class="section-heading"><div><div class="eyebrow">THE ELIGIBILITY REVIEW</div><h2>A closer look at who gets in.</h2><p>Follow the evidence. Question the exclusion. See the difference.</p></div><span class="sample-label">${icon('flask')} Prepared sample review</span></div>
    <div class="review-layout"><aside class="criteria-sidebar"><div class="sidebar-heading"><h3>Criteria in focus</h3><span>${String(criteria.length).padStart(2, '0')}</span></div><div class="criteria-list">${criteria.map((item) => `<button class="criterion-card ${state.criterion === item.id ? 'selected' : ''}" data-criterion="${item.id}" aria-pressed="${state.criterion === item.id}"><span class="criterion-top"><span class="mono">${escape(item.number)}</span>${icon(state.criterion === item.id ? 'arrow' : 'chevron')}</span><strong>${escape(item.title)}</strong>${badge(item)}</button>`).join('')}</div><div class="sidebar-note">${icon('shield')}<p>Thoughtful inclusion starts<br> with evidence.<br> <span>All findings require expert review.</span></p></div><div class="sidebar-bottom"><span class="tiny-label">THIS REVIEW</span><div>${criteria.length} criteria <span>·</span> 1 demo-approved revision</div><button class="text-button" data-stage="protocol">View study context ${icon('arrow')}</button></div></aside>
    <article class="review-document" aria-label="Selected criterion review"><div class="document-topline"><span class="eyebrow">CRITERION ${escape(criterion.number)} <span class="muted">/ ${String(criteria.length).padStart(2, '0')}</span></span>${badge(criterion)}</div><h3>${escape(criterion.title)}</h3><p class="document-deck">${criterion.id === 'renal' ? 'A broad exclusion. A more precise possibility.' : criterion.id === 'ddi' ? 'A documented interaction. A reason to retain.' : criterion.tone === 'neutral' ? 'A fixed criterion. An independent requirement.' : 'An unanswered question. A reason to look closer.'}</p>
    <div class="wording-comparison ${criterion.proposed ? '' : 'single'}"><section class="wording original"><div class="tiny-label">${icon('file')} ORIGINAL PROTOCOL</div><p>${highlightWording(criterion.original, criterion.originalHighlight, "del")}</p><span class="wording-ref">Protocol v1.0 · §${criterion.number}</span></section>${criterion.proposed ? `<section class="wording proposed"><div class="tiny-label">${icon('spark')} PROPOSED REVISION</div><p>${highlightWording(criterion.proposed, criterion.proposedHighlight, "ins")}</p><span class="wording-ref">Approved for synthetic demo only · Ehsan review required</span></section>` : `<section class="wording disposition-${criterion.tone}"><div class="tiny-label">${icon(criterion.tone === 'neutral' ? 'shield' : 'info')} REVIEW DISPOSITION</div><p>${criterion.tone === 'neutral' ? 'Retain the original restriction in the modeled scenario.' : 'Withhold a replacement until drug-specific evidence is available.'}</p><span class="wording-ref">${criterion.tone === 'neutral' ? 'Restriction remains active' : 'No revision proposed'}</span></section>`}</div>
    <section class="rationale"><h4>${icon('book')}${criterion.id === 'renal' ? 'Why reconsider this?' : criterion.tone === 'neutral' ? 'Why retain this?' : 'What do we still need?'}</h4><p>${escape(criterion.rationale)}</p></section>
    <section class="evidence-section"><div class="subsection-heading"><h4>Follow the evidence</h4><span>${criterion.sourceIds.length} SOURCE${criterion.sourceIds.length === 1 ? '' : 'S'}</span></div><div class="source-list">${criterion.sourceIds.length ? criterion.sourceIds.map((id) => sourceButton(id)).join('') : '<p class="protocol-scope-note">This original inclusion is defined by the fictional adult-study scope. No proposed drug-specific change is available.</p>'}</div></section>
    ${criterion.missing.length ? `<section class="missing-note">${icon('info')}<div><strong>${criterion.tone === 'amber' ? 'Evidence gap' : 'Before a real-world decision'}</strong><p>${criterion.missing.map(escape).join(' ')}</p></div></section>` : ''}
    <div class="document-action">${criterion.proposed ? `<div><span class="tiny-label">ONE CHANGE, MEASURABLE IMPACT</span><p>Include this revision in the comparison.</p></div><button class="button ${activeGate().active ? 'included' : 'primary'}" data-action="include-renal" aria-pressed="${activeGate().active}">${icon(activeGate().active ? 'check' : 'plus')}${activeGate().active ? 'Revision included' : 'Include approved demo rule'}</button>` : `<div><span class="tiny-label">REVIEW OUTCOME</span><p>${criterion.tone === 'neutral' ? 'This exclusion remains active in all scenarios.' : 'The original exclusion remains active pending evidence.'}</p></div>${icon(criterion.tone === 'neutral' ? 'shield' : 'info')}`}</div>
    </article>${populationPreview()}</div>
    <div class="workspace-caption"><span>${icon('info')} Prepared findings, fictional drug evidence, real questions.</span><button class="text-button" data-stage="population">Next: explore the population ${icon('arrow')}</button></div>`;
}

function protocolPage() {
  return `<div class="section-heading"><div><div class="eyebrow">THE STUDY, IN CONTEXT</div><h2>Good decisions start with the whole picture.</h2><p>A fictional protocol. ${criteria.length} explicit criteria. One evidence-gated review.</p></div><span class="sample-label">${icon('flask')} Bundled sample study</span></div>
  <div class="protocol-layout"><article class="protocol-document"><div class="document-topline"><span class="eyebrow">STUDY BRIEF</span><span class="outline-label">PHASE III · ONCOLOGY</span></div><div class="protocol-title"><div class="protocol-stamp">${icon('file')}</div><div><span class="mono">${escape(study.id)} / PROTOCOL v1.0</span><h3>${escape(study.title)}</h3></div></div><p class="protocol-summary">${escape(study.summary)}</p><p class="study-scope">${escape(study.context)}</p><div class="study-meta-grid"><div><span class="tiny-label">INVESTIGATIONAL PRODUCT</span><strong>${escape(study.drug)} <span>· Fictional</span></strong></div><div><span class="tiny-label">POPULATION</span><strong>Adults with advanced NSCLC</strong></div><div><span class="tiny-label">REVIEW SCOPE</span><strong>${criteria.length} modeled criteria · inclusion + exclusion</strong></div><div><span class="tiny-label">COHORT</span><strong>${baseline.total} synthetic records</strong></div></div><section class="protocol-criteria"><div class="subsection-heading"><h4>Criteria under review</h4><span>PROTOCOL v1.0</span></div>${criteria.map((item) => `<button class="protocol-criterion" data-criterion="${item.id}"><span class="mono">${item.number}</span><span><strong>${escape(item.title)}</strong><small>${escape(item.original)}</small></span>${icon('arrow')}</button>`).join('')}</section><div class="document-action"><p>Start with the criterion. Stay close to the evidence.</p><button class="button primary" data-stage="review">Open sample review ${icon('arrow')}</button></div></article><aside class="protocol-aside"><div class="eyebrow">YOUR SOURCE LIBRARY</div><h3>A clear line<br> back to the source.</h3><p>Guidance, drug-specific evidence, and population data each play a distinct role.</p><div class="source-library">${sources.map((source) => sourceButton(source.id)).join('')}</div><div class="method-note">${icon('info')}<div><strong>A demonstration, by design.</strong><p>The review is prepared sample content. Population results are calculated locally from versioned, evidence-gated rules. Numerical boundaries come from the supplied synthetic case and require Ehsan’s review. No live model calls or patient data.</p></div></div></aside></div>`;
}

function populationPage() {
  return renderPopulation({ state, patients: currentPatients(), baseline,
    selected: evaluateCohort(currentPatients(), requestedScenario()),
    config: clinicalConfig, criteria, sources, escape, icon, sourceButton });
}

function reportPage() {
  const selected = evaluateCohort(currentPatients(), requestedScenario());
  const gate = selected.gate;
  const ranked = rankCandidates(selected);
  const changedRecords = selected.records.filter(record => record.statusChanged);
  const selectedRecord = selected.records.find(record => record.id === state.record);
  const selectedProfile = selectedRecord ? getReviewProfile(selectedRecord) : null;
  const sourceName = id => sources.find(source => source.id === id)?.shortTitle || id;
  return `<div class="section-heading no-print">
    <div><div class="eyebrow">THE REVIEW, ON RECORD</div><h2>A considered decision. A clear paper trail.</h2><p>Protocol, evidence gate, patient changes, and assumptions in one report.</p></div>
    <button class="button primary" data-action="print">${icon('print')} Print report</button>
  </div>
  <article class="report-document">
    <div class="report-masthead"><div class="report-wordmark">${escape(product.wordmark)}<span> / RULE COMPARISON REPORT</span></div><span class="outline-label">SYNTHETIC DEMONSTRATION</span></div>
    <div class="report-intro"><div class="eyebrow">${escape(study.id)} · PROTOCOL ${escape(clinicalConfig.protocol.version)}</div><h3>${escape(study.title)}</h3><p>${state.dataset === 'casebook' ? '20 supplied anchor cases' : `${baseline.total} reproducible records · seed 217`} · ${criteria.length} independently evaluated criteria</p></div>
    <div class="report-summary"><div><span class="tiny-label">MODELED CRITERIA</span><strong>${String(criteria.length).padStart(2, '0')}</strong></div><div><span class="tiny-label">ACTIVE REVISIONS</span><strong>${String(gate.ruleIds.length).padStart(2, '0')}</strong></div><div><span class="tiny-label">ACTIVE SCENARIO</span><strong class="scenario-name">${gate.active ? 'Renal demo revision' : 'Original protocol'}</strong></div></div>
    <section><h4>01 <span>Evidence gate & rule provenance</span></h4>
      <p><strong>Requested:</strong> ${gate.requested ? escape(gate.label) : 'No revision'}${gate.scenarioVersion ? ` · v${escape(gate.scenarioVersion)}` : ''}. <strong>Result:</strong> ${gate.active ? 'Approved demonstration rule active' : gate.requested ? 'Withheld — original rules active' : 'Original protocol active'}.</p>
      <p>${gate.reasons.map(escape).join(' ') || 'No proposed rule is selected.'}</p>
      ${gate.active ? `<p class="report-proposal"><strong>Applied rule:</strong> ${gate.ruleIds.map(escape).join(', ')}. <strong>Supporting fictional evidence:</strong> ${gate.evidenceIds.map(id => `${escape(id)} (${escape(sourceName(id))})`).join('; ')}.</p>` : ''}
      <div class="report-table-wrap"><table><caption class="sr-only">Original and selected rule identifiers</caption><thead><tr><th scope="col">Criterion</th><th scope="col">Restriction</th><th scope="col">Original rule</th><th scope="col">Active rule</th></tr></thead><tbody>${clinicalConfig.protocol.criteria.map(criterion => {
        const revision = gate.revisions.find(item => item.criterionId === criterion.id);
        return `<tr><th scope="row">${escape(criterion.title)}</th><td>${criterion.fixed ? 'Fixed' : 'Revisable'}</td><td>${escape(criterion.ruleId)}</td><td>${escape(revision?.ruleId || criterion.ruleId)}</td></tr>`;
      }).join('')}</tbody></table></div>
    </section>
    <section><h4>02 <span>Findings & dispositions</span></h4>${criteria.map(item => `<div class="report-finding"><div class="report-finding-heading"><h5>${escape(item.title)}</h5>${badge(item)}</div><p><strong>Original criterion.</strong> ${escape(item.original)}</p><p><strong>Rationale.</strong> ${escape(item.rationale)}</p>${item.proposed ? `<p class="report-proposal"><strong>${gate.active ? 'Active synthetic rule.' : 'Candidate · not active.'}</strong> ${escape(item.proposed)}</p>` : ''}${item.missing.length ? `<p><strong>Review needed.</strong> ${item.missing.map(escape).join(' ')}</p>` : ''}<div class="report-references">${item.sourceIds.length ? `References: ${item.sourceIds.map(id => `${escape(id)} · ${escape(sourceName(id))}`).join('; ')}` : 'Source: configured fictional protocol scope.'}</div></div>`).join('')}</section>
    <section><h4>03 <span>Population comparison</span></h4><p>${baseline.total} synthetic records; every active criterion is evaluated. Known failure takes precedence over uncertainty. Unknown observations remain in the audit; no missing value silently passes.</p>
      <div class="report-table-wrap"><table><caption class="sr-only">Original and selected population counts</caption><thead><tr><th scope="col">Modeled outcome</th><th scope="col">Original</th><th scope="col">Selected</th><th scope="col">Change</th></tr></thead><tbody>${[['eligible', 'Meets modeled criteria'], ['excluded', 'Does not meet modeled criteria'], ['indeterminate', 'Indeterminate / requires review']].map(([key, label]) => `<tr><th scope="row">${label}</th><td>${baseline[key]}</td><td>${selected[key]}</td><td>${selected[key] - baseline[key] > 0 ? '+' : ''}${selected[key] - baseline[key]}</td></tr>`).join('')}<tr class="table-total"><th scope="row">Total</th><td>${baseline.total}</td><td>${selected.total}</td><td>0</td></tr></tbody></table></div>
      <p>${selected.changed} newly meet modeled criteria; ${selected.statusChanged} change aggregate classification. A renal change can leave another exclusion active or reveal an indeterminate result.</p>
      ${changedRecords.length ? `<div class="report-table-wrap"><table><caption class="sr-only">Every changed record and responsible rule</caption><thead><tr><th scope="col">Record</th><th scope="col">Original → selected</th><th scope="col">Responsible rule / evidence</th></tr></thead><tbody>${changedRecords.map(record => `<tr><th scope="row">${escape(record.id)}</th><td>${escape(statusLabels[record.originalStatus])} → ${escape(statusLabels[record.status])}</td><td>${record.changes.map(change => `${escape(change.ruleId)} · ${change.sourceIds.map(escape).join(', ')}`).join('; ')}</td></tr>`).join('')}</tbody></table></div>` : '<p>No record changes classification under the active rules.</p>'}
      <h5 class="report-ranking-title">Ranked newly matching records</h5><p>Ascending illustrative review-attention index; equal values use patient ID. Only newly matching records with complete review inputs are ranked. This unvalidated fixture index is not a probability of toxicity, a validated medical risk model, or enrollment approval.</p>
      ${ranked.length ? `<div class="report-table-wrap"><table><caption class="sr-only">Ranked newly matching synthetic patients</caption><thead><tr><th scope="col">Rank</th><th scope="col">Patient</th><th scope="col">Illustrative index</th><th scope="col">Fictional supporting evidence</th></tr></thead><tbody>${ranked.map(record => `<tr><th scope="row">${record.rank}</th><td>${escape(record.id)}</td><td>${record.review.score} / 100 points</td><td>${[...new Set(record.changes.flatMap(change => change.sourceIds))].map(escape).join(', ')}</td></tr>`).join('')}</tbody></table></div>` : '<p>No records qualify for ranking under the active scenario.</p>'}
    </section>
    ${selectedRecord ? `<section><h4>04 <span>Inspected record · ${escape(selectedRecord.id)}</span></h4><p>${escape(selectedRecord.note)} ${escape(selectedRecord.reasons.join(' '))}</p><p><strong>Illustrative review-attention index:</strong> ${selectedProfile.score === null ? `Unranked. ${escape(selectedProfile.unrankedReason)}` : `${selectedProfile.score} / 100 points · ${escape(selectedProfile.scoreName)} v${escape(selectedProfile.scoreVersion)}`}. ${escape(selectedProfile.disclaimer)}</p>
      <div class="report-table-wrap"><table><caption class="sr-only">Multidimensional clinical factor profile</caption><thead><tr><th scope="col">Profile dimension</th><th scope="col">Observed context</th><th scope="col">Profile state</th><th scope="col">Index points</th></tr></thead><tbody>${selectedProfile.dimensions.map(dimension => `<tr><th scope="row">${escape(dimension.label)}</th><td>${escape(dimension.value)}${dimension.unit ? ` ${escape(dimension.unit)}` : ''}</td><td>${escape(dimension.result)}</td><td>${dimension.points === null ? 'Not scored' : dimension.points}</td></tr>`).join('')}</tbody></table></div>
      ${selectedProfile.score !== null ? `<p><strong>Index calculation:</strong> ${selectedProfile.components.map(component => `${escape(component.label)} +${component.points}`).join('; ')}. Raw total ${selectedProfile.rawScore}; capped index ${selectedProfile.score} / 100. These coefficients are arbitrary demonstration values.</p>` : ''}
      <h5>Further review before inclusion could be considered</h5><ul>${selectedProfile.nextSteps.map(step => `<li><strong>${escape(step.title)}.</strong> ${escape(step.detail)}${step.sourceIds.length ? ` References: ${step.sourceIds.map(escape).join(', ')}.` : ''}</li>`).join('')}</ul><div class="report-table-wrap"><table class="report-audit-table"><caption class="sr-only">Criterion-level audit for inspected record</caption><thead><tr><th scope="col">Criterion</th><th scope="col">Original</th><th scope="col">Selected</th><th scope="col">Active rule & reason</th></tr></thead><tbody>${selectedRecord.evaluations.map(result => `<tr><th scope="row">${escape(result.title)}</th><td>${escape(result.originalResult)}</td><td>${escape(result.result)}</td><td>${escape(result.ruleId)} · v${escape(result.ruleVersion)}<br> ${escape(result.reason)}</td></tr>`).join('')}</tbody></table></div></section>` : ''}
    <section><h4>${selectedRecord ? '05' : '04'} <span>Source register</span></h4>${sources.map((source, index) => `<div class="report-source"><span class="mono">[${index + 1}]</span><div><strong>${escape(source.id)} · ${escape(source.title)}</strong><p>${escape(source.type)} · ${escape(source.section)}${source.date ? ` · ${escape(source.date)}` : ''}</p>${source.url ? `<a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">View official source ${icon('external')}</a>` : ''}</div></div>`).join('')}</section>
    <section class="report-assumptions"><h4>${selectedRecord ? '06' : '05'} <span>Demonstration assumptions</span></h4><ul>${study.assumptions.map(item => `<li>${escape(item)}</li>`).join('')}</ul></section>
    <footer class="report-footer"><span>${escape(product.name)} · ${escape(study.id)}</span><span>Synthetic records · fictional evidence · no enrollment approval</span></footer>
  </article>`;
}

function render() {
  baseline = evaluateCohort(currentPatients(), false);
  potential = evaluateCohort(currentPatients(), true);
  if (state.stage === 'population' && state.reviewMode === 'ranked' && !state.record) {
    const selected = evaluateCohort(currentPatients(), requestedScenario());
    const group = state.rankingGroup;
    state.record = group === 'new' ? rankCandidates(selected)[0]?.id || null
      : selected.records.find(record => group === 'all' || (group === 'excluded' ? record.status === 'excluded' : record.status === 'indeterminate'))?.id || null;
  }
  document.title = `${product.name} — A closer look at eligibility`;
  app.innerHTML = `<header class="topbar"><a href="#review" class="brand" aria-label="${escape(product.name)} home"><span class="brand-mark"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="16" cy="15" r="8"/><circle cx="25" cy="15" r="8"/><circle cx="20.5" cy="23" r="8"/></svg></span><span>${escape(product.wordmark)}</span></a><span class="brand-description">${escape(product.tagline)}</span><div class="topbar-right"><span class="demo-label"><i></i> Demo workspace</span><button class="reset-button" data-action="reset" aria-label="Reset demonstration">${icon('reset')}<span>Reset demo</span></button></div></header><div class="workspace"><div class="study-heading"><div><div class="eyebrow"><span class="study-id">${escape(study.id)}</span><span class="heading-separator">/</span> CLINICAL DEVELOPMENT</div><h1>${escape(study.title)}<span class="study-phase">${escape(study.phase).toUpperCase()}</span></h1><p>${escape(study.drug)} <span>·</span> Advanced NSCLC <span>·</span> Protocol ${escape(clinicalConfig.protocol.version)}</p></div><button class="button secondary" data-action="open">${icon('file')} Open sample study</button></div><nav class="stage-nav" aria-label="Review stages">${stages.map((stage, i) => `<button data-stage="${stage}" class="stage-tab ${state.stage === stage ? 'active' : ''}" ${state.stage === stage ? 'aria-current="page"' : ''}><span class="stage-number">0${i + 1}</span>${stage[0].toUpperCase() + stage.slice(1)}${stage === 'review' ? `<span class="nav-count">${criteria.length}</span>` : ''}${stage === 'report' && activeGate().active ? '<span class="nav-dot" aria-label="Revision included"></span>' : ''}</button>`).join('')}<span class="nav-meta">${icon('shield')} Evidence before assumptions</span></nav><main id="main" tabindex="-1" class="page-content">${state.stage === 'review' ? reviewPage() : state.stage === 'protocol' ? protocolPage() : state.stage === 'population' ? populationPage() : reportPage()}</main><footer class="workspace-footer"><span>Built around evidence. Designed for possibility.</span><span>FICTIONAL STUDY <span>·</span> SYNTHETIC DATA <span>·</span> EXPERT REVIEW REQUIRED</span></footer></div>`;
}

function setStage(stage, focus = true) {
  if (!stages.includes(stage)) return;
  state.stage = stage;
  history.pushState({}, '', `#${stage}`);
  render();
  if (focus) document.querySelector('#main').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function openSource(sourceId) {
  const source = sources.find((item) => item.id === sourceId);
  if (!source) return;
  dialog.innerHTML = `<div class="drawer-header"><span class="eyebrow">THE EVIDENCE DESK</span><button class="icon-button" data-action="close-evidence" aria-label="Close evidence">${icon('close')}</button></div><div class="drawer-content"><span class="source-type ${source.type === 'Official guidance' ? 'official' : ''}">${icon(source.type === 'Official guidance' ? 'book' : source.type === 'Synthetic patient data' ? 'people' : 'flask')}${escape(source.type)}</span><h2 id="evidence-title">${escape(source.title)}</h2><div class="evidence-metadata"><span>${escape(source.section)}</span>${source.date ? `<span>${escape(source.date)}</span>` : ''}${source.version ? `<span>${escape(source.version)}</span>` : ''}${source.publisher ? `<span>${escape(source.publisher)}</span>` : ''}</div><div class="eyebrow passage-label">${source.type === 'Official guidance' ? 'GUIDANCE CONTEXT · PARAPHRASE' : source.type === 'Synthetic patient data' ? 'DATASET NOTES' : 'SAMPLE EVIDENCE PASSAGE'}</div><blockquote>${escape(source.passage)}</blockquote><section class="evidence-relationship"><h3>What this tells us</h3><p>${escape(source.relationship)}</p></section>${source.note ? `<div class="missing-note">${icon('info')}<p>${escape(source.note)}</p></div>` : ''}${source.url ? `<a class="button secondary full" href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">Read the official guidance ${icon('external')}</a>` : '<p class="fixture-disclosure">This source is prepared fictional content for the demonstration.</p>'}</div><div class="drawer-footer">${icon('shield')} Keep the evidence close. Keep the distinction clear.</div>`;
  dialog.showModal();
  document.body.classList.add('dialog-open');
}

app.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.stage) { setStage(button.dataset.stage); return; }
  if (button.dataset.criterion) {
    state.criterion = button.dataset.criterion;
    if (state.stage !== 'review') setStage('review');
    else { render(); app.querySelector(`[data-criterion="${state.criterion}"]`).focus({ preventScroll: true }); }
    return;
  }
  if (button.dataset.source) { openSource(button.dataset.source); return; }
  if (button.dataset.view) {
    state.populationView = button.dataset.view;
    render(); app.querySelector(`[data-view="${state.populationView}"]`).focus({ preventScroll: true }); return;
  }
  if (button.dataset.record) {
    state.record = button.dataset.record;
    render();
    const heading = app.querySelector('#ranked-patient-heading') || app.querySelector('#patient-heading');
    heading?.focus({ preventScroll: true });
    heading?.closest('.ranked-selected-panel, .patient-inspector')?.scrollIntoView({ block: 'start', behavior: 'instant' });
    return;
  }
  if (button.dataset.scenario) {
    state.scenario = button.dataset.scenario;
    state.revision = true;
    state.populationView = 'proposed';
    render();
    app.querySelector(`[data-scenario="${state.scenario}"]`)?.focus({ preventScroll: true });
    const gate = activeGate();
    notify(gate.active ? 'Approved synthetic demonstration rule activated.' : `Revision withheld. ${gate.reasons.join(' ')}`);
    return;
  }
  for (const field of ['dataset', 'filter', 'boundary', 'reviewMode', 'rankingGroup']) {
    if (button.dataset[field]) {
      state[field] = button.dataset[field];
      if (field === 'rankingGroup') state.record = null;
      if (field === 'dataset') { state.record = null; state.filter = 'all'; state.boundary = 'all'; }
      render();
      app.querySelector(`[data-${field.replace(/[A-Z]/g, char => '-' + char.toLowerCase())}="${state[field]}"]`)?.focus({ preventScroll: true });
      return;
    }
  }
  if (['revision', 'include-renal'].includes(button.dataset.action)) {
    if (button.dataset.action === 'include-renal') {
      state.revision = !activeGate().active;
      state.scenario = 'renal-revision';
    } else state.revision = !state.revision;
    state.populationView = 'proposed';
    render();
    const actionButton = app.querySelector(`[data-action="${button.dataset.action}"]`);
    const actionFocus = actionButton?.getClientRects().length ? actionButton : app.querySelector('.ranked-patient-button[aria-pressed="true"]') || app.querySelector('#main');
    actionFocus?.focus({ preventScroll: true });
    const selected = evaluateCohort(currentPatients(), requestedScenario());
    const gate = activeGate();
    notify(`${gate.active ? 'Approved demo rule included' : gate.requested ? 'Scenario withheld; original rules active' : 'Original protocol restored'}. ${selected.eligible} of ${selected.total} meet modeled criteria; ${selected.indeterminate} require review.`);
  }
  if (button.dataset.action === 'reset') {
    Object.assign(state, { criterion: 'renal', revision: false, record: null, populationView: 'proposed', scenario: 'renal-revision', dataset: 'casebook', filter: 'all', boundary: 'all', reviewMode: 'ranked', rankingGroup: 'new' });
    setStage('protocol'); notify('Demo reset. Original rules restored; no revision selected.');
  }
  if (button.dataset.action === 'open') { setStage('protocol'); notify(`${study.id} sample study opened.`); }
  if (button.dataset.action === 'print') window.print();
});
dialog.addEventListener('click', (event) => {
  if (event.target === dialog || event.target.closest('[data-action="close-evidence"]')) dialog.close();
});
dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
window.addEventListener('popstate', () => { state.stage = stages.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'review'; render(); });
window.addEventListener('hashchange', () => { const stage = location.hash.slice(1); if (stages.includes(stage) && stage !== state.stage) { state.stage = stage; render(); } });
render();
