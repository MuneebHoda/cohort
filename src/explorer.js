import { renderRankedReview } from './patient-review.js';

const labels = {
  eligible: 'Meets modeled criteria',
  excluded: 'Does not meet modeled criteria',
  indeterminate: 'Indeterminate / requires review',
};

const resultLabels = { PASS: 'Pass', FAIL: 'Fail', UNKNOWN: 'Requires review' };
const scenarioLabels = {
  'approved-demo': 'Approved demonstration rule',
  draft: 'Evidence-supported draft change',
  'awaiting-review': 'Awaiting medical review',
};

function isKnownNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasConflict(record, field) {
  return Array.isArray(record.conflicts) ? record.conflicts.includes(field) : record.conflicts?.[field] === true;
}

function boundaryFor(record, lower, upper, unit, minimum) {
  const value = record.egfr_ml_min_1_73m2;
  const invalidUnit = record.units?.egfr_ml_min_1_73m2 && record.units.egfr_ml_min_1_73m2 !== unit;
  if (!isKnownNumber(value) || value < minimum || hasConflict(record, 'egfr_ml_min_1_73m2') || invalidUnit) return 'missing';
  if (value < lower) return 'below';
  if (value < upper) return 'window';
  return 'above';
}

export function renderPopulation({ state, patients, baseline, selected, config, criteria, sources, escape, icon, sourceButton, linkedIds = null }) {
  const gate = selected.gate || {};
  const lower = config.thresholds.renalProposedMin;
  const upper = config.thresholds.renalOriginalMin;
  const renalUnit = config.units.egfr_ml_min_1_73m2;
  const renalMinimum = config.rules.find((rule) => rule.id === 'renal-original-v1')?.min ?? -Infinity;
  const boundary = (record) => boundaryFor(record, lower, upper, renalUnit, renalMinimum);
  const current = state.populationView === 'original' ? baseline : selected;
  const newlyEligible = selected.newlyEligible ?? selected.changed;
  const active = Boolean(gate.active);
  const scenarios = config.scenarios;
  const scenario = scenarios.find((item) => item.id === state.scenario) || scenarios[0];
  const linked = linkedIds === null ? null : new Set(linkedIds);
  const visible = current.records.filter((record) => {
    const matchesStatus = state.filter === 'new' ? record.changed : state.filter === 'excluded' ? record.status === 'excluded' : state.filter === 'indeterminate' ? record.status === 'indeterminate' : true;
    return matchesStatus && (state.boundary === 'all' || boundary(record) === state.boundary) && (!linked || linked.has(record.id));
  });
  const record = selected.records.find((item) => item.id === state.record);
  const status = (value) => `<span class="engine-status ${value}">${icon(value === 'eligible' ? 'check' : value === 'excluded' ? 'close' : 'info')} ${labels[value] || labels.indeterminate}</span>`;
  const result = (value) => `<span class="criterion-result ${value.toLowerCase()}">${value === 'PASS' ? '✓' : value === 'FAIL' ? '−' : '?'} ${resultLabels[value] || 'Requires review'}</span>`;
  const sourceLinks = (ids = []) => [...new Set(ids)].filter((id) => sources.some((source) => source.id === id)).map((id) => `<button class="rule-source" data-source="${escape(id)}">${icon('file')}${escape(id)} ${icon('external')}</button>`).join('');
  const formatValue = (value) => value === null || value === undefined ? 'Not recorded' : typeof value === 'boolean' ? value ? 'Yes' : 'No' : Array.isArray(value) ? value.join(', ') || 'None recorded' : typeof value === 'object' ? 'Conflicting / review required' : String(value);
  const formatField = (patient, field, unit = '') => {
    if (hasConflict(patient, field)) return 'Conflicting · requires review';
    if (patient.units?.[field] && config.units[field] && patient.units[field] !== config.units[field]) return 'Unverified unit · requires review';
    const value = patient[field];
    return `${formatValue(value)}${unit && isKnownNumber(value) ? ` ${unit}` : ''}`;
  };

  function renderBoundary() {
    const bins = [
      { id: 'below', title: `Below ${lower}`, note: 'Below the demo evidence boundary' },
      { id: 'window', title: `${lower} to <${upper}`, note: 'The proposed revision window' },
      { id: 'above', title: `${upper} and above`, note: 'Meets the original renal threshold' },
      { id: 'missing', title: 'Requires review', note: 'Missing, conflicting, or invalid eGFR' },
    ];
    const max = Math.max(1, ...bins.map((bin) => patients.filter((patient) => boundary(patient) === bin.id).length));
    return `<section class="boundary-panel" aria-labelledby="boundary-heading">
      <div class="explorer-panel-heading"><div><span class="eyebrow">THE ELIGIBILITY BOUNDARY</span><h3 id="boundary-heading">A threshold is only the first question.</h3><p>eGFR · ${escape(renalUnit)} · predefined fictional protocol rules</p></div><button class="text-button" data-boundary="all" aria-pressed="${state.boundary === 'all'}">Show all records ${icon('reset')}</button></div>
      <div class="boundary-bins">${bins.map((bin) => {
        const originalRecords = baseline.records.filter((item) => boundary(item) === bin.id);
        const revisedRecords = selected.records.filter((item) => boundary(item) === bin.id);
        const originalCount = originalRecords.filter((item) => item.status === 'eligible').length;
        const revisedCount = revisedRecords.filter((item) => item.status === 'eligible').length;
        const total = originalRecords.length;
        return `<button class="boundary-bin ${bin.id === 'window' ? 'revision-window' : ''} ${state.boundary === bin.id ? 'selected' : ''}" data-boundary="${bin.id}" aria-pressed="${state.boundary === bin.id}"><span class="boundary-count">${total}<small> records</small></span><span class="boundary-bar" aria-hidden="true"><i style="--bin-fill:${100 * total / max}%"></i></span><strong>${escape(bin.title)}</strong><span>${escape(bin.note)}</span><span class="boundary-outcome"><b>${originalCount}</b> ${icon('arrow')} <b>${revisedCount}</b><span>meet all modeled criteria</span></span></button>`;
      }).join('')}</div>
      <div class="boundary-foot">${icon('shield')} Renal matching does not override medication, hepatic, cardiac, performance-status, or adult restrictions.</div>
    </section>`;
  }

  function renderRecord() {
    if (!record) return `<section class="patient-inspector empty-inspector" aria-labelledby="patient-heading"><div class="inspector-empty-mark">${icon('people')}</div><div><span class="eyebrow">PATIENT-LEVEL REASONING</span><h3 id="patient-heading" tabindex="-1">Every record has a story.</h3><p>Select a dot, or open one of these deliberately difficult synthetic cases.</p><div class="case-shortcuts">${[
      ['P02', 'Renal-only change'], ['P06', 'Interaction remains'], ['P16', 'Missing hepatic data'], ['P19', 'On the boundary'], ['P20', 'Below the boundary'],
    ].filter(([id]) => patients.some((patient) => patient.id === id)).map(([id, label]) => `<button data-record="${id}"><span class="mono">${id}</span>${label}${icon('arrow')}</button>`).join('')}</div></div></section>`;
    const original = record.original || baseline.records.find((item) => item.id === record.id);
    const evaluations = record.evaluations || [];
    const changes = record.changes || [];
    const comorbidities = [...new Set([
      ...(Array.isArray(record.comorbidities) ? record.comorbidities : []),
      ...(record.controlled_hypertension ? ['Controlled hypertension'] : []),
      ...(record.stable_type2_diabetes ? ['Stable type 2 diabetes'] : []),
      ...(record.stable_cardiac_history ? ['Stable cardiac history'] : []),
    ])];
    const characteristics = [
      ['Age', formatField(record, 'age_years', config.units.age_years)],
      ['Kidney function · eGFR', formatField(record, 'egfr_ml_min_1_73m2', renalUnit)],
      ['Renal stability', formatField(record, 'renal_stable')],
      ['Performance status', `ECOG ${formatField(record, 'ecog')}`],
      ['Hepatic assessment', formatField(record, 'hepatic_status')],
      ['Strong CYP3A inhibitor', formatField(record, 'strong_cyp3a_inhibitor')],
      ['Unstable cardiac disease', formatField(record, 'clinically_unstable_cardiac_disease')],
      ['Recorded comorbidities', comorbidities.length ? comorbidities.join(' · ') : 'None recorded'],
    ];
    return `<section class="patient-inspector" aria-labelledby="patient-heading"><div class="patient-heading"><div><span class="eyebrow">SYNTHETIC PATIENT RECORD</span><h3 id="patient-heading" tabindex="-1">${escape(record.id)}<span>${record.changed ? 'Newly meets modeled criteria' : record.statusChanged ? 'Classification changed · review required' : 'All restrictions accounted for'}</span></h3></div><span class="outline-label">${config.protocol.criteria.length} CRITERIA EVALUATED</span></div>
      <div class="patient-outcomes"><div><span class="tiny-label">ORIGINAL PROTOCOL</span>${status(original?.status)}</div>${icon('arrow')}<div><span class="tiny-label">SELECTED SCENARIO</span>${status(record.status)}</div></div>
      <dl class="patient-characteristics">${characteristics.map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>
      <div class="evaluation-table-wrap"><table class="evaluation-table"><caption>Criterion-by-criterion evaluation · protocol ${escape(config.protocol.version)}</caption><thead><tr><th scope="col">Criterion</th><th scope="col">Original</th><th scope="col">Selected</th><th scope="col">Active rule & reasoning</th></tr></thead><tbody>${evaluations.map((evaluation) => {
        const before = original?.evaluations?.find((item) => item.criterionId === evaluation.criterionId);
        const criterion = config.protocol.criteria.find((item) => item.id === evaluation.criterionId);
        const changed = before && before.result !== evaluation.result;
        return `<tr class="${changed ? 'evaluation-changed' : ''}"><th scope="row"><strong>${escape(evaluation.title || criterion?.title || evaluation.criterionId)}</strong><span>${criterion?.fixed ? 'Fixed restriction' : 'Revision candidate'}</span></th><td>${result(before?.result || 'UNKNOWN')}</td><td>${result(evaluation.result)}${changed ? '<span class="row-change-label">Changed</span>' : ''}</td><td><span class="evaluation-rule mono">${escape(evaluation.ruleId)}${evaluation.ruleVersion ? ` · v${escape(evaluation.ruleVersion)}` : ''}</span><p>${escape(evaluation.reason)}</p>${sourceLinks(evaluation.sourceIds)}</td></tr>`;
      }).join('')}</tbody></table></div>
      <div class="patient-change-log"><h4>${icon('book')}${changes.length ? 'What changed, and why' : 'Why this classification holds'}</h4>${changes.length ? changes.map((change) => `<div class="change-entry"><div><span class="mono">${escape(change.criterionId)}</span>${result(change.from)}${icon('arrow')}${result(change.to)}</div><p>${escape(change.reason)}</p><span class="evaluation-rule mono">Rule ${escape(change.ruleId)}</span><div class="change-evidence">${sourceLinks(change.sourceIds || change.evidenceIds)}</div></div>`).join('') : `<p>${escape((record.reasons || []).join(' '))}</p>`}${record.status === 'excluded' && changes.length ? `<p class="unchanged-exclusion-note">${icon('shield')} A criterion changed; an independent exclusion still applies. This record does not meet all modeled criteria.</p>` : ''}${record.status === 'indeterminate' ? `<p class="unchanged-exclusion-note">${icon('info')} Missing or conflicting required information is unresolved. This record cannot count as meeting modeled criteria.</p>` : ''}</div>
    </section>`;
  }

  function renderScenario() {
    const gateStatus = gate.active ? 'Applied to the comparison' : state.revision ? 'Withheld · original rules retained' : 'No revision active';
    const reasons = gate.reasons || [];
    return `<aside class="engine-scenario-panel"><span class="eyebrow">EVIDENCE-GATED SCENARIOS</span><h3>One change.<br> Every other rule holds.</h3><p>Only predefined rules can enter the comparison. Evidence and demonstration approval are separate gates.</p>
      <div class="scenario-options">${scenarios.map((item) => `<button class="scenario-option ${state.scenario === item.id ? 'selected' : ''}" data-scenario="${escape(item.id)}" aria-pressed="${state.scenario === item.id}"><span class="scenario-state ${item.status === 'approved-demo' ? 'approved' : item.status === 'draft' ? 'draft' : 'awaiting'}">${icon(item.status === 'approved-demo' ? 'shield' : item.status === 'draft' ? 'file' : 'info')}${escape(scenarioLabels[item.status] || 'Awaiting medical review')}</span><strong>${escape(item.label || item.title || item.id)}</strong><span class="mono">${escape(item.id)} · v${escape(item.version || '1.0')}</span></button>`).join('')}</div>
      <div class="scenario-gate ${active ? 'active' : state.revision ? 'withheld' : ''}" role="status"><strong>${icon(active ? 'check' : state.revision ? 'shield' : 'info')}${gateStatus}</strong>${reasons.length ? `<ul>${reasons.map((reason) => `<li>${escape(reason)}</li>`).join('')}</ul>` : `<p>${active ? 'Supporting fictional evidence and synthetic-demo approval are present. Unchanged restrictions remain active.' : 'Choose a scenario, then request its comparison. The engine checks the evidence gate before applying a rule.'}</p>`}</div>
      <button class="button full ${state.revision ? 'included' : 'primary'}" data-action="revision" aria-pressed="${state.revision}">${icon(state.revision ? 'reset' : 'plus')}${state.revision ? 'Disable selected scenario' : 'Request scenario comparison'}</button>
      <div class="gate-evidence"><span class="tiny-label">${active ? 'EVIDENCE ATTACHED TO ACTIVE RULE' : 'CANDIDATE PROVENANCE · NOT ACTIVE'}</span>${sourceLinks(active ? gate.evidenceIds : scenario.revisions?.flatMap((item) => item.evidenceIds || []) || [])}</div>
      <div class="scenario-safety-note">${icon('info')}<p>Approved here means <strong>approved for this synthetic demonstration</strong>. It is not medical approval, a safety prediction, or permission to enroll a patient.</p></div>
    </aside>`;
  }

  function renderMap() {
    return `<div class="clinical-explorer-layout"><div class="explorer-primary"><section class="engine-cohort-panel" aria-labelledby="cohort-heading"><div class="explorer-panel-heading"><div><span class="eyebrow">THE COHORT MAP</span><h3 id="cohort-heading">A population, not a score.</h3><p>One mark per synthetic record. Select any record to inspect all criteria.</p></div><div class="segmented" aria-label="Population view"><button data-view="original" aria-pressed="${state.populationView === 'original'}" class="${state.populationView === 'original' ? 'active' : ''}">Original</button><button data-view="proposed" aria-pressed="${state.populationView === 'proposed'}" class="${state.populationView === 'proposed' ? 'active' : ''}">Selected scenario</button></div></div>
      <div class="cohort-filters" aria-label="Filter synthetic records">${[['all', 'All records', current.total], ['new', 'Newly matching', current.changed], ['excluded', 'Still excluded', current.excluded], ['indeterminate', 'Requires review', current.indeterminate]].map(([id, label, count]) => `<button data-filter="${id}" class="${state.filter === id ? 'active' : ''}" aria-pressed="${state.filter === id}">${label}<span>${count}</span></button>`).join('')}</div>
      <div class="engine-dot-grid ${state.dataset === 'casebook' ? 'casebook-grid' : ''}" aria-label="${visible.length} of ${current.total} synthetic records shown">${visible.length ? visible.map((item) => `<button class="engine-patient-dot ${item.status} ${item.changed ? 'changed' : ''} ${state.record === item.id ? 'chosen' : ''}" data-record="${escape(item.id)}" aria-label="${escape(item.id)}: ${labels[item.status]}${item.changed ? ', newly matching under selected rule' : ''}" aria-pressed="${state.record === item.id}" title="${escape(item.id)} · ${labels[item.status]}"><i></i>${state.dataset === 'casebook' ? `<span>${escape(item.id)}</span>` : ''}</button>`).join('') : `<p class="empty-cohort">No records in this combination of filters.<button class="text-button" data-filter="all">Show all classifications ${icon('arrow')}</button><button class="text-button" data-boundary="all">Clear boundary filter ${icon('reset')}</button></p>`}</div>
      <div class="engine-legend"><span><i class="legend-dot eligible"></i>Meets criteria</span><span><i class="legend-dot changed"></i>Newly matching</span><span><i class="legend-dot excluded"></i>Excluded</span><span><i class="legend-dot indeterminate"></i>Requires review</span><strong>${visible.length} of ${current.total} records shown</strong></div>
      <div class="engine-precedence">${icon('shield')} Known exclusion → otherwise unresolved information → otherwise meets all modeled criteria. Every criterion is evaluated.</div>
    </section>${renderBoundary()}${renderRecord()}</div>${renderScenario()}</div>`;
  }

  return `<div class="clinical-explorer ${state.reviewMode === 'population' ? 'map-mode' : 'ranked-mode'}"><div class="section-heading"><div><div class="eyebrow">THE EVIDENCE-GATED POPULATION EXPLORER</div><h2>${state.reviewMode === 'population' ? 'See the rules. See who changes.' : 'From exclusion to a considered review.'}</h2><p>${state.reviewMode === 'population' ? 'Every synthetic record. Every active criterion. A traceable reason for every change.' : 'Trace the evidence, compare every rule, and understand the attention each case needs.'}</p></div><button class="button secondary" data-stage="report">View review report ${icon('arrow')}</button></div>
    <div class="explorer-toolbar"><div class="review-mode-options segmented" aria-label="Population workspace"><button data-review-mode="ranked" class="${state.reviewMode !== 'population' ? 'active' : ''}" aria-pressed="${state.reviewMode !== 'population'}">Patient review</button><button data-review-mode="population" class="${state.reviewMode === 'population' ? 'active' : ''}" aria-pressed="${state.reviewMode === 'population'}">Population map</button></div><div class="dataset-options" aria-label="Synthetic dataset"><button data-dataset="expanded" class="${state.dataset === 'expanded' ? 'active' : ''}" aria-pressed="${state.dataset === 'expanded'}">Expanded cohort <span>120</span></button><button data-dataset="casebook" class="${state.dataset === 'casebook' ? 'active' : ''}" aria-pressed="${state.dataset === 'casebook'}">Clinical casebook <span>20</span></button></div><span class="explorer-version">${icon('flask')} Synthetic simulation <span>·</span> Protocol ${escape(config.protocol.version)} <span>·</span> Seed 217</span></div>
    <div class="engine-summary"><section><span class="tiny-label">ORIGINAL PROTOCOL</span><div><strong>${baseline.eligible}</strong><span>of ${baseline.total} records<br> meet all modeled criteria</span></div><small>${baseline.excluded} excluded · ${baseline.indeterminate} indeterminate</small></section><div class="summary-arrow">${icon('arrow')}</div><section class="selected-summary"><span class="tiny-label">SELECTED SCENARIO</span><div><strong>${selected.eligible}</strong><span>of ${selected.total} records<br> meet all modeled criteria</span></div><small>${selected.excluded} excluded · ${selected.indeterminate} indeterminate</small></section><section class="new-summary"><span class="tiny-label">NEWLY MATCHING</span><div><strong>+${newlyEligible}</strong></div><small>${active ? 'Identified rule + evidence for every change' : 'No approved revision currently applied'}</small></section><section class="review-summary"><span class="tiny-label">REQUIRES REVIEW</span><div><strong>${selected.indeterminate}</strong></div><small>Missing or conflicting required information</small></section></div>
    ${state.reviewMode !== 'population' ? `<div class="ranked-gate-bar"><div>${icon(active ? 'shield' : 'info')}<span><strong>${active ? 'Approved renal demonstration rule active' : state.revision ? 'Requested revision withheld · original rules retained' : 'Original protocol active'}</strong><small>${active ? 'Every unchanged restriction is preserved. Ranking follows eligibility.' : 'Apply the approved demonstration rule to compare and rank newly matching records.'}</small></span></div><details class="ranked-gate-disclosure"><summary>Scenario rules & approval states</summary>${renderScenario()}</details></div>` : ''}
    ${state.reviewMode === 'population' ? renderMap() : renderRankedReview({ state, selected, baseline, patients, config, sources, escape, icon, renderAudit: () => renderRecord() })}
    <div class="explorer-disclosure">${icon('info')} Fictional protocol and drug evidence. Synthetic records. The engine compares explicit eligibility rules; it does not predict adverse events or independently approve enrollment.</div></div>`;
}
