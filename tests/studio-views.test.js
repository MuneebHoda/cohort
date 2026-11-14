import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspace, visibleRecords, evaluateDraft } from '../src/workspace.js';
import { anchorPatients } from '../src/patients.js';
import { buildReviewPacket, renderReport, renderTrialSummary, renderTrialAnalytics, renderDecision } from '../src/studio-views.js';

const text = html => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const tables = html => [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/g)].map(([, table]) => [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map(([, row]) => [...row.matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/g)].map(([, cell]) => text(cell))));
const reportTimeNormalized = html => html.replace(/generated [^<]*/, 'generated [timestamp]');
const newDraft = overrides => ({ ...structuredClone(anchorPatients[1]), id: 'ADDED21', ...overrides });

test('review packet captures the exact active run, current context and AND-filtered patient IDs', () => {
  const workspace = createWorkspace();
  workspace.setScenario('renal-revision');
  workspace.selectPatient('P03');
  workspace.setFilters({ status: 'new', age: '65to74', subgroup: 'hypertension' });
  const packet = buildReviewPacket(workspace);
  assert.equal(packet.syntheticOnly, true);
  assert.equal(packet.analysis, workspace.run);
  assert.equal(packet.context.analysisRunId, workspace.run.id);
  assert.equal(packet.context.scenarioId, workspace.run.scenarioId);
  assert.equal(packet.context.selectedPatientId, 'P03');
  assert.deepEqual(packet.context.filters, workspace.state.filters);
  assert.deepEqual(packet.filteredPatientIds, ['P02', 'P03']);
  assert.deepEqual(packet.filteredPatientIds, visibleRecords(workspace.run, workspace.state.filters).map(record => record.id));
  assert.deepEqual(packet.events, workspace.events);
  assert.ok(Number.isFinite(Date.parse(packet.exportedAt)));
  assert.ok(packet.limitations.some(item => /adapter assumption/.test(item)));
  assert.ok(packet.limitations.some(item => /unvalidated/.test(item)));
});

test('rendering all perspectives and exporting never creates analyses or fabricated review actions', () => {
  const workspace = createWorkspace();
  const run = workspace.run;
  const events = workspace.events;
  const histories = workspace.runs;
  for (const perspective of ['patient', 'trial', 'decision']) {
    workspace.setPerspective(perspective);
    renderTrialSummary(workspace.run);
    renderTrialAnalytics(workspace.run, workspace.state);
    for (const step of ['source', 'criterion', 'inputs', 'outcomes', 'factors', 'action']) renderDecision(workspace, step);
    renderReport(workspace);
    buildReviewPacket(workspace);
  }
  assert.equal(workspace.run, run);
  assert.equal(workspace.events, events);
  assert.equal(workspace.runs, histories);
  assert.deepEqual(workspace.events.map(event => event.type), ['initialized']);
  assert.ok(workspace.events.every(event => event.authenticated === false && event.actor === 'Demo reviewer'));
});

test('printed report is complete and independent of perspective or selected detail tab', () => {
  const workspace = createWorkspace();
  workspace.setScenario('renal-revision');
  const expected = reportTimeNormalized(renderReport(workspace));
  for (const detailTab of ['overview', 'criteria', 'evidence', 'pathway']) {
    workspace.setDetailTab(detailTab);
    workspace.setPerspective('decision');
    assert.equal(reportTimeNormalized(renderReport(workspace)), expected);
  }
  const allTables = tables(expected);
  const criterionTable = allTables.find(table => table[0].some(cell => cell.includes('Criterion / rule version')));
  assert.equal(criterionTable.length - 1, 6);
  assert.ok(criterionTable.slice(1).every(row => row[0].includes('1.0.0') && ['PASS', 'FAIL', 'UNKNOWN'].includes(row[1])));
  assert.ok(expected.includes('SYN-PK-02'));
  assert.ok(expected.includes('Verify') || expected.includes('Confirm'));
  assert.match(expected, /39/);
});

test('report reconciles whole-cohort denominators while explicitly listing the filtered subset', () => {
  const workspace = createWorkspace();
  workspace.setScenario('renal-revision');
  workspace.setFilters({ status: 'new', age: '65to74', subgroup: 'hypertension' });
  const report = renderReport(workspace);
  assert.deepEqual(tables(report)[0].slice(1), [
    ['Original', '4 (20%)', '15', '1', '20'],
    ['Approved proposed comparison', '10 (50%)', '8', '2', '20'],
    ['Current analysis', '10 (50%)', '8', '2', '20'],
  ]);
  const visibleParagraph = report.match(/<p>Visible patient IDs: ([\s\S]*?)<\/p>/)?.[1];
  assert.equal(text(visibleParagraph), 'P02, P03.');
  assert.match(report, /2 of 20 records shown/);
  assert.equal(buildReviewPacket(workspace).filteredPatientIds.length, 2);
});

test('original and withheld scenario packets use their active rules while retaining the separate proposed comparison', () => {
  const workspace = createWorkspace();
  assert.equal(buildReviewPacket(workspace).analysis.current.eligible, 4);
  assert.deepEqual(buildReviewPacket(workspace).analysis.ranked, []);
  workspace.setScenario('renal-draft');
  const packet = buildReviewPacket(workspace);
  assert.equal(packet.context.scenarioId, 'renal-draft');
  assert.equal(packet.analysis.current.gate.active, false);
  assert.equal(packet.analysis.current.eligible, 4);
  assert.equal(packet.analysis.proposed.eligible, 10);
  const report = renderReport(workspace);
  assert.match(report, /requested revision withheld/);
  assert.deepEqual(tables(report)[0].at(-1), ['Current analysis', '4 (20%)', '15', '1', '20']);
});

test('trial strategy renders independently calculated age counts and filter state without changing denominators', () => {
  const workspace = createWorkspace();
  const analytics = renderTrialAnalytics(workspace.run, workspace.state);
  assert.deepEqual(tables(analytics)[0].slice(1), [['Under 65', '9', '3', '5'], ['65–74', '9', '1', '3'], ['75+', '2', '0', '2']]);
  workspace.setFilters({ age: '75plus' });
  const filteredAnalytics = renderTrialAnalytics(workspace.run, workspace.state);
  assert.deepEqual(tables(filteredAnalytics), tables(analytics));
  assert.match(filteredAnalytics, /data-age="75plus" aria-pressed="true"/);
  assert.equal(visibleRecords(workspace.run, workspace.state.filters).length, 2);
  assert.match(renderTrialSummary(workspace.run), /4 \/ 20/);
  assert.match(renderTrialSummary(workspace.run), /10 \/ 20/);
  assert.match(renderTrialSummary(workspace.run), /30 percentage points/);
});

test('scratch evaluation leaves rendered totals unchanged; explicit addition updates packet, reports and age counts', () => {
  const workspace = createWorkspace();
  workspace.setScenario('renal-revision');
  const draft = newDraft({ age_years: 80 });
  const scratch = evaluateDraft(draft, workspace.run.patients);
  assert.equal(scratch.proposed.status, 'eligible');
  assert.equal(buildReviewPacket(workspace).analysis.current.total, 20);
  assert.equal(tables(renderTrialAnalytics(workspace.run, workspace.state))[0].at(-1)[1], '2');
  workspace.addProfile(draft);
  const packet = buildReviewPacket(workspace);
  assert.equal(packet.analysis.current.total, 21);
  assert.equal(packet.analysis.current.eligible, 11);
  assert.equal(packet.context.selectedPatientId, 'ADDED21');
  assert.ok(packet.filteredPatientIds.includes('ADDED21'));
  assert.deepEqual(tables(renderTrialAnalytics(workspace.run, workspace.state))[0].at(-1), ['75+', '3', '0', '3']);
  assert.deepEqual(tables(renderReport(workspace))[0].at(-1), ['Current analysis', '11 (52.4%)', '8', '2', '21']);
  assert.match(renderTrialSummary(workspace.run), /11 \/ 21/);
});

test('missing demographic data is disclosed without inserting population statistics or index factors', () => {
  const workspace = createWorkspace();
  workspace.setScenario('renal-revision');
  const analytics = renderTrialAnalytics(workspace.run, workspace.state);
  assert.match(analytics, /Sex, race and ethnicity/);
  assert.match(analytics, /Sites and geographic reach/);
  assert.match(analytics, /Compatible reference population/);
  assert.equal((analytics.match(/<strong>Not supplied<\/strong>/g) || []).length, 4);
  const packet = buildReviewPacket(workspace);
  assert.ok(packet.analysis.patients.every(record => !Object.hasOwn(record, 'sex') && !Object.hasOwn(record, 'race') && !Object.hasOwn(record, 'site')));
  assert.ok(packet.analysis.ranked.every(record => record.review.components.every(component => !/sex|race|ethnicity|geography/i.test(component.id))));
});

test('decision trace and exported history include only actual recorded dispositions and escape rationale text', () => {
  const workspace = createWorkspace();
  workspace.setScenario('renal-revision');
  const event = workspace.recordDisposition({ patientId: 'P03', disposition: 'further-review', reason: 'Verify stability; <script>fakeApproval()</script>' });
  const packet = buildReviewPacket(workspace);
  assert.deepEqual(packet.events.filter(item => item.type === 'disposition-recorded'), [event]);
  assert.equal(packet.events.at(-1).patientId, 'P03');
  assert.equal(packet.events.at(-1).runId, packet.analysis.id);
  assert.equal(packet.events.at(-1).authenticated, false);
  const html = renderDecision(workspace, 'action');
  assert.ok(html.includes('Verify stability; &lt;script&gt;fakeApproval()&lt;/script&gt;'));
  assert.ok(!html.includes('<script>fakeApproval()'));
  assert.match(renderReport(workspace), /Verify stability; &lt;script&gt;/);
  assert.equal(workspace.events.filter(item => /approv|signature/i.test(item.type)).length, 0);
});

test('source assumption provenance stays explicit in the decision chain and complete packet', () => {
  const workspace = createWorkspace();
  workspace.setScenario('renal-revision');
  const before = structuredClone(anchorPatients);
  const html = renderDecision(workspace, 'inputs', 'RENAL');
  assert.match(html, /Synthetic adapter assumption/);
  assert.match(html, /absent from source record/);
  assert.match(buildReviewPacket(workspace).limitations.join(' '), /longitudinal evidence is not supplied/);
  assert.deepEqual(anchorPatients, before);
  assert.equal(workspace.run.patients.find(record => record.id === 'P03').renal_stable, true);
});

test('reset packet restores base totals and selected case while preserving actual session history', () => {
  const workspace = createWorkspace();
  workspace.setScenario('renal-revision');
  workspace.addProfile(newDraft());
  workspace.recordDisposition({ patientId: 'ADDED21', disposition: 'reviewed', reason: 'Reviewed only as a synthetic demonstration.' });
  workspace.reset();
  const packet = buildReviewPacket(workspace);
  assert.equal(packet.analysis.current.total, 20);
  assert.equal(packet.analysis.current.eligible, 4);
  assert.equal(packet.context.selectedPatientId, 'P03');
  assert.equal(packet.filteredPatientIds.length, 20);
  assert.ok(!packet.filteredPatientIds.includes('ADDED21'));
  assert.equal(packet.events.at(-1).type, 'reset');
  assert.ok(packet.events.some(event => event.type === 'profile-added'));
  assert.ok(packet.events.some(event => event.type === 'disposition-recorded'));
});
