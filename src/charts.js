import { escape as e, icon } from './ui.js';

const statuses = [
  { id: 'eligible', label: 'Meets modeled rules', short: 'Meets rules', tone: 'matching' },
  { id: 'excluded', label: 'Excluded', short: 'Excluded', tone: 'excluded' },
  { id: 'indeterminate', label: 'Indeterminate', short: 'Indeterminate', tone: 'unknown' },
];
const results = [['PASS', 'Satisfied / not applicable', 'pass'], ['FAIL', 'Exclusion applies', 'fail'], ['UNKNOWN', 'Unresolved', 'unknown'], ['NOT_IN_PROTOCOL', 'Not in snapshot', 'outside']];
const percent = (count, total) => total ? Math.round(count / total * 1000) / 10 : 0;
const labelFor = id => statuses.find(status => status.id === id)?.short || id;

export function buildChartData(run) {
  const records = run.current.records;
  const criteria = new Map();
  for (const record of records) {
    for (const evaluation of record.evaluations) {
      if (!criteria.has(evaluation.criterionId)) criteria.set(evaluation.criterionId, { id: evaluation.criterionId, label: evaluation.title, PASS: 0, FAIL: 0, UNKNOWN: 0 });
      criteria.get(evaluation.criterionId)[evaluation.result]++;
    }
  }
  const proposedAvailable = run.proposed.available !== false;
  const proposed = new Map(run.proposed.records.map(record => [record.id, record]));
  const transfers = [];
  if (proposedAvailable) {
    for (const from of statuses) for (const to of statuses) {
      const ids = run.original.records.filter(record => record.status === from.id && proposed.get(record.id)?.status === to.id).map(record => record.id);
      if (ids.length) transfers.push({ from: from.id, to: to.id, count: ids.length, ids });
    }
  }
  return {
    total: records.length, proposedAvailable, transfers,
    outcomes: statuses.map(status => ({ ...status, count: records.filter(record => record.status === status.id).length })),
    criteria: [...criteria.values()].map(row => ({ ...row, NOT_IN_PROTOCOL: records.length - row.PASS - row.FAIL - row.UNKNOWN })).sort((a, b) => b.FAIL - a.FAIL || b.UNKNOWN - a.UNKNOWN),
    multipleFailures: records.filter(record => record.evaluations.filter(item => item.result === 'FAIL').length > 1).length,
    unresolved: records.filter(record => record.evaluations.some(item => item.result === 'UNKNOWN')).length,
    readiness: ['ready_for_configured_tasks', 'pending', 'unknown', 'not_ready'].map(id => ({ id, count: records.filter(record => record.investigation?.readiness.status === id).length })),
  };
}

function chartHeading(kicker, title, annotation = '') {
  return `<header class="chart-heading"><div><span class="studio-eyebrow">${kicker}</span><h3>${title}</h3></div>${annotation ? `<span class="chart-context">${annotation}</span>` : ''}</header>`;
}

export function renderOutcomeChart(run, state, compact = false) {
  const data = buildChartData(run);
  return `<section class="insight-card outcome-chart ${compact ? 'is-compact' : ''}" data-chart-enter data-chart="outcomes" data-chart-run="${e(run.id)}">
    ${chartHeading('ACTIVE OUTCOMES', compact ? 'The cohort, at a glance.' : 'Every record accounted for.', `${data.total} records`)}
    <div class="outcome-headline"><strong>${percent(run.current.eligible, data.total)}<small>%</small></strong><div><span>meet modeled medical rules</span><small>${run.current.eligible} of ${data.total} · ${run.current.gate.active ? 'proposed scenario active' : 'current protocol'}</small></div></div>
    <div class="outcome-stack" aria-hidden="true">${data.outcomes.filter(item => item.count).map(item => `<span class="chart-tone-${item.tone}" style="--share:${percent(item.count, data.total)}%"></span>`).join('')}</div>
    <div class="outcome-legend">${data.outcomes.map(item => `<button data-status="${item.id}" aria-pressed="${state.filters.status === item.id}" aria-label="Filter ${e(item.label)}: ${item.count} of ${data.total} records"><span><i class="chart-dot chart-tone-${item.tone}" aria-hidden="true"></i>${item.short}</span><strong>${item.count}</strong></button>`).join('')}</div>
    ${!compact ? '<p class="chart-note">Select an outcome to filter the linked population and patient table. Whole-cohort counts stay fixed.</p>' : ''}
  </section>`;
}

export function renderCriterionChart(run, compact = false) {
  const data = buildChartData(run), rows = compact ? data.criteria.slice(0, 3) : data.criteria;
  const mixedSnapshots = rows.some(row => row.NOT_IN_PROTOCOL);
  return `<section class="insight-card criterion-chart ${compact ? 'is-compact' : ''}" data-chart-enter data-chart="criteria" data-chart-run="${e(run.id)}">
    ${chartHeading('CRITERION LANDSCAPE', compact ? 'Behind the outcomes.' : 'Where the rules apply.', compact ? '' : 'Whole cohort')}
    <div class="criterion-chart-legend">${results.filter(([result]) => result !== 'NOT_IN_PROTOCOL' || mixedSnapshots).map(([result, label, tone]) => `<span><i class="chart-dot chart-tone-${tone}" aria-hidden="true"></i>${result === 'PASS' ? 'Satisfied / N/A' : label}</span>`).join('')}</div>
    <div class="criterion-chart-rows">${rows.map(row => `<div class="criterion-chart-row" tabindex="0" role="img" aria-label="${e(row.label)}: ${row.PASS} satisfied or not applicable, ${row.FAIL} exclusion applies, ${row.UNKNOWN} unresolved, ${row.NOT_IN_PROTOCOL} not in that record's protocol snapshot, of ${data.total} records">
      <div class="criterion-chart-label"><span>${e(row.label)}</span><strong>${row.FAIL}<small> excluded</small>${row.UNKNOWN ? `<b> · ${row.UNKNOWN} unresolved</b>` : ''}</strong></div>
      <div class="criterion-chart-track" aria-hidden="true">${results.filter(([result]) => row[result]).map(([result,,tone]) => `<i class="chart-tone-${tone}" style="--share:${percent(row[result], data.total)}%"></i>`).join('')}</div>
      <span class="chart-tooltip" aria-hidden="true">${row.PASS} satisfied / N/A · ${row.FAIL} exclusion applies · ${row.UNKNOWN} unresolved${row.NOT_IN_PROTOCOL ? ` · ${row.NOT_IN_PROTOCOL} not in protocol snapshot` : ''}</span>
    </div>`).join('')}</div>
    <footer class="chart-footnote">${compact ? `<span>${data.multipleFailures} records have multiple exclusions</span><button data-perspective="trial" aria-label="Explore full trial analysis">Explore analysis ${icon('arrow')}</button>` : `<span>Independent checks overlap. Counts are per criterion; do not add them as distinct people.${mixedSnapshots ? ' Grey marks checks absent from that record’s authored protocol snapshot.' : ''}</span>`}</footer>
  </section>`;
}

export function renderPatientCharts(run, state) {
  return `<div class="patient-chart-grid">${renderOutcomeChart(run, state, true)}${renderCriterionChart(run, true)}</div>`;
}

function flowPaths(run, data) {
  const height = 168, gap = 16, top = 18, nodes = { original: {}, proposed: {} };
  for (const side of ['original', 'proposed']) {
    let y = top;
    for (const status of statuses) {
      const count = run[side].records.filter(record => record.status === status.id).length;
      nodes[side][status.id] = { y, height: data.total ? count / data.total * height : 0, cursor: y };
      y += nodes[side][status.id].height + gap;
    }
  }
  const paths = data.transfers.map(transfer => {
    const start = nodes.original[transfer.from], end = nodes.proposed[transfer.to];
    const thickness = transfer.count / data.total * height;
    const y1 = start.cursor, y2 = end.cursor;
    start.cursor += thickness; end.cursor += thickness;
    const path = `M 26 ${y1} C 225 ${y1}, 375 ${y2}, 574 ${y2} L 574 ${y2 + thickness} C 375 ${y2 + thickness}, 225 ${y1 + thickness}, 26 ${y1 + thickness} Z`;
    const tone = transfer.to === 'eligible' && transfer.from !== 'eligible' ? 'new' : statuses.find(status => status.id === transfer.to).tone;
    return `<path class="flow-ribbon chart-tone-${tone}" d="${path}" data-flow-from="${transfer.from}" data-flow-to="${transfer.to}" data-flow-count="${transfer.count}"></path>`;
  }).join('');
  return `${paths}${['original', 'proposed'].map(side => statuses.map(status => { const node = nodes[side][status.id]; return node.height ? `<rect class="flow-node chart-tone-${status.tone}" x="${side === 'original' ? 18 : 574}" y="${node.y}" width="8" height="${node.height}" rx="2"/>` : ''; }).join('')).join('')}`;
}

export function renderFlowChart(run) {
  const data = buildChartData(run);
  if (!data.proposedAvailable) return '';
  const newly = run.proposed.newlyEligible;
  const uncertain = run.proposed.records.filter(record => record.statusChanged && record.status === 'indeterminate').length;
  return `<section class="insight-card eligibility-flow" data-chart-enter data-chart="flow" data-chart-run="${e(run.id)}">
    ${chartHeading('SCENARIO COMPARISON', 'Follow the change.', run.current.gate.active ? 'Proposed active' : 'Comparison preview')}
    <div class="flow-metrics"><div><strong>+${newly}</strong><span>newly meet modeled rules</span></div><div><strong>${uncertain}</strong><span>become indeterminate</span></div></div>
    <figure><div class="flow-axis"><span>Original protocol</span><span>Proposed renal</span></div><svg viewBox="0 0 600 220" preserveAspectRatio="none" class="flow-svg" aria-hidden="true">${data.total ? flowPaths(run, data) : ''}</svg>
    <figcaption class="flow-caption">${statuses.map(status => `<div><span><i class="chart-dot chart-tone-${status.tone}" aria-hidden="true"></i>${status.short}</span><strong>${run.original.records.filter(record => record.status === status.id).length}<i aria-hidden="true">→</i>${run.proposed.records.filter(record => record.status === status.id).length}</strong></div>`).join('')}</figcaption></figure>
    <details class="chart-data-details"><summary>Inspect exact transfers ${icon('chevron')}</summary><dl>${data.transfers.map(transfer => `<div><dt>${labelFor(transfer.from)} → ${labelFor(transfer.to)}</dt><dd>${transfer.count} records</dd></div>`).join('')}</dl></details>
    <p class="chart-note">${data.total} synthetic records in each scenario. Ribbon width represents people. Proposed matching remains separate from enrollment and evidence applicability.</p>
  </section>`;
}

function renderReadinessChart(run) {
  if (!['ACCESS', 'COGNITIVE'].includes(run.casePack?.id)) return '';
  const data = buildChartData(run);
  const labels = { ready_for_configured_tasks: 'Configured tasks ready', pending: 'Review pending', unknown: 'Information missing', not_ready: 'Tasks not satisfied' };
  return `<section class="insight-card readiness-chart" data-chart-enter data-chart="readiness" data-chart-run="${e(run.id)}">${chartHeading('PARTICIPATION READINESS', 'Support is a separate decision.', `All ${data.total} records`)}<div class="readiness-bars">${data.readiness.map((item, index) => `<div><span><i class="chart-dot chart-category-${index + 1}" aria-hidden="true"></i>${labels[item.id]}</span><div class="readiness-track" aria-hidden="true"><i class="chart-category-${index + 1}" style="--share:${percent(item.count, data.total)}%"></i></div><strong>${item.count}</strong></div>`).join('')}</div><p class="chart-note">Includes medically excluded records. Support, consent and method review do not change the medical outcome.</p></section>`;
}

export function renderTrialCharts(run, state) {
  return `<div class="trial-chart-grid">${run.proposed.available !== false ? renderFlowChart(run) : renderOutcomeChart(run, state)}${renderCriterionChart(run)}</div>${renderReadinessChart(run)}`;
}

export function renderPatientGate(record) {
  const evaluations = record.investigation?.currentProtocol.evaluations || record.evaluations;
  const failed = evaluations.filter(item => item.result === 'FAIL').length, unknown = evaluations.filter(item => item.result === 'UNKNOWN').length;
  return `<section class="patient-gate-map" aria-label="Medical requirement map"><header><span class="sp-kicker">${record.investigation ? 'CURRENT MEDICAL CHECKS' : 'ACTIVE MEDICAL CHECKS'}</span><button data-detail-tab="criteria">Inspect ${evaluations.length} checks ${icon('arrow')}</button></header><div class="patient-gate-cells" style="--check-columns:${Math.min(evaluations.length, 6) || 1}">${evaluations.map(item => `<button class="chart-tone-${item.result.toLowerCase()}" data-factor="${e(item.criterionId)}" aria-label="Inspect ${e(item.title)}: ${item.applicability === 'not_applicable' ? 'not applicable' : item.result}">${icon(item.result === 'PASS' ? 'check' : item.result === 'FAIL' ? 'close' : 'info')}<span class="chart-tooltip" aria-hidden="true">${e(item.title)} · ${item.applicability === 'not_applicable' ? 'Not applicable' : item.result}</span></button>`).join('')}</div><p>${failed} exclusion${failed === 1 ? '' : 's'} · ${unknown} unresolved · ${evaluations.length - failed - unknown} satisfied / not applicable</p></section>`;
}
