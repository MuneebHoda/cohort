import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clinicalConfig } from '../src/clinical-fixture.js';
import { anchorPatients, generateCohort } from '../src/patients.js';
import { evaluateCohort } from '../src/cohort.js';
import { reviewConfig } from '../src/review-fixture.js';
import { rankCandidates, getReviewProfile, scoreReviewAttention } from '../src/ranking.js';

const supplied = JSON.parse(readFileSync(new URL('../cohort_syn217_starter/syn217_demo_case.json', import.meta.url), 'utf8'));
const clone = value => structuredClone(value);
const rawPatient = id => clone(anchorPatients.find(record => record.id === id));
const evaluated = (id, overrides = {}, scenario = true) => evaluateCohort([{ ...rawPatient(id), ...overrides }], scenario).records[0];
const counts = cohort => ({ eligible: cohort.eligible, excluded: cohort.excluded, indeterminate: cohort.indeterminate });
const sourceIds = new Set(clinicalConfig.evidence.map(source => source.id));
const scoreExpected = supplied.expected_results.patient_results.filter(result => result.newly_meets_rules)
  .map(result => [result.patient_id, result.review_priority_index.score]);
const sumComponents = score => score.components.reduce((sum, component) => sum + component.points, 0);

function assertUnranked(record) {
  const score = scoreReviewAttention(record);
  assert.equal(score.score, null);
  assert.ok(score.unrankedReason || score.missingInputs.length);
  assert.equal(rankCandidates({ records: [record], gate: record.gate }).length, 0);
}

test('supplied patient counts and six ranked candidates match the independent JSON regression outputs', () => {
  const original = evaluateCohort(anchorPatients, false);
  const proposed = evaluateCohort(anchorPatients, true);
  assert.deepEqual(counts(original), { eligible: 4, excluded: 15, indeterminate: 1 });
  assert.deepEqual(counts(proposed), { eligible: 10, excluded: 8, indeterminate: 2 });
  assert.equal(proposed.newlyEligible, 6);
  const ranked = rankCandidates(proposed);
  assert.deepEqual(ranked.map(record => record.id), supplied.expected_results.newly_matching_ranked_ids);
  assert.deepEqual(ranked.map(record => [record.id, record.review.score]), scoreExpected.sort((a, b) => a[1] - b[1]));
  assert.deepEqual(ranked.map(record => record.rank), [1, 2, 3, 4, 5, 6]);
  assert.ok(ranked.every(record => record.newlyEligible && record.status === 'eligible' && record.evaluations.every(item => item.result === 'PASS')));
});

test('every supplied score is decomposed into contributions that reconcile with the configured cap', () => {
  for (const record of rankCandidates(evaluateCohort(anchorPatients, true))) {
    const score = scoreReviewAttention(record);
    assert.equal(score.score, record.review.score);
    assert.equal(score.score, Math.min(reviewConfig.range[1], sumComponents(score)));
    assert.ok(score.components.every(component => Number.isFinite(component.points) && component.points >= 0));
    assert.deepEqual(score.missingInputs, []);
    assert.match(score.disclaimer, /unvalidated|illustrative/i);
    assert.match(score.disclaimer, /not.*(probability|prediction|risk model)/i);
  }
});

test('the illustrative index never overrides simultaneous renal, hepatic, medication, and cardiac failures', () => {
  const record = evaluated('P04', { hepatic_status: 'severe', strong_cyp3a_inhibitor: true, clinically_unstable_cardiac_disease: true });
  for (const id of ['RENAL', 'HEPATIC', 'DDI', 'CARDIAC']) {
    assert.equal(record.evaluations.find(item => item.criterionId === id).result, 'FAIL');
  }
  assert.equal(record.status, 'excluded');
  assertUnranked(record);
});

test('renal reconsideration never ranks a record with a hard interacting-medication restriction', () => {
  for (const id of ['P06', 'P17']) {
    const record = evaluated(id);
    assert.equal(record.evaluations.find(item => item.criterionId === 'RENAL').result, 'PASS');
    assert.equal(record.evaluations.find(item => item.criterionId === 'DDI').result, 'FAIL');
    assertUnranked(record);
  }
});

test('missing renal data and unknown hepatic status cannot receive an index or ranking', () => {
  for (const id of ['P10', 'P16']) {
    const record = evaluated(id);
    assert.equal(record.status, 'indeterminate');
    assert.ok(record.missingData.length);
    assertUnranked(record);
  }
  const failAndUnknown = evaluated('P02', { hepatic_status: null, strong_cyp3a_inhibitor: true });
  assert.equal(failAndUnknown.status, 'excluded');
  assert.ok(failAndUnknown.missingData.length);
  assertUnranked(failAndUnknown);
});

test('inclusive renal boundaries and immediate neighbors produce the appropriate candidate set and index', () => {
  const cases = [
    [44.9, 'excluded', null], [45, 'eligible', 27], [45.1, 'eligible', 26.9],
    [59.9, 'eligible', 12.1], [60, 'eligible', null], [60.1, 'eligible', null],
  ];
  for (const [egfr, expectedStatus, expectedScore] of cases) {
    const record = evaluated('P13', { egfr_ml_min_1_73m2: egfr });
    const score = scoreReviewAttention(record).score;
    assert.equal(record.status, expectedStatus, `eGFR ${egfr}`);
    if (expectedScore === null) assert.equal(score, null, `eGFR ${egfr} is not newly qualifying`);
    else assert.ok(Math.abs(score - expectedScore) < 1e-9, `eGFR ${egfr} score ${score}`);
  }
});

test('original, disabled, draft, and awaiting-review scenarios never produce a ranked candidate list', () => {
  for (const requested of [false, 'renal-draft', 'ecog-awaiting-review']) {
    const cohort = evaluateCohort(anchorPatients, requested);
    assert.equal(rankCandidates(cohort).length, 0);
    for (const record of cohort.records) assert.equal(scoreReviewAttention(record).score, null);
  }
  const on = evaluateCohort(anchorPatients, true);
  assert.equal(rankCandidates(on).length, 6);
  assert.deepEqual(rankCandidates(evaluateCohort(anchorPatients, false)), []);
  assert.deepEqual(counts(evaluateCohort(anchorPatients, false)), { eligible: 4, excluded: 15, indeterminate: 1 });
});

test('patients already meeting the original protocol remain unranked under the renal scenario', () => {
  for (const id of ['P01', 'P14', 'P15', 'P18']) {
    const record = evaluated(id);
    assert.equal(record.status, 'eligible');
    assert.equal(record.newlyEligible, false);
    assertUnranked(record);
  }
});

test('equal-score ties use natural patient-ID order independently of input order', () => {
  const records = ['P10', 'P2', 'P1'].map(id => ({ ...rawPatient('P13'), id }));
  const forward = rankCandidates(evaluateCohort(records, true));
  const reverse = rankCandidates(evaluateCohort([...records].reverse(), true));
  assert.deepEqual(forward.map(record => record.id), ['P1', 'P2', 'P10']);
  assert.deepEqual(reverse.map(record => [record.id, record.rank, record.review.score]), forward.map(record => [record.id, record.rank, record.review.score]));
});

test('age makes no score contribution or upper-age ranking penalty', () => {
  const scores = [18, 62, 95].map(age => scoreReviewAttention(evaluated('P13', { age_years: age })).score);
  assert.deepEqual(scores, [14, 14, 14]);
  const underage = evaluated('P13', { age_years: 17.9 });
  assert.equal(underage.status, 'excluded');
  assertUnranked(underage);
});

test('missing or invalid contextual scoring flags withhold the index without changing eligibility', () => {
  for (const field of ['controlled_hypertension', 'stable_type2_diabetes', 'stable_cardiac_history']) {
    for (const value of [null, undefined, 'false', 0, {}]) {
      const record = evaluated('P13', { [field]: value });
      assert.equal(record.status, 'eligible');
      const profile = getReviewProfile(record);
      assert.equal(profile.score, null, `${field}=${String(value)}`);
      assert.ok(profile.missingInputs.length);
      assert.equal(rankCandidates({ records: [record], gate: record.gate }).length, 0);
    }
  }
});

test('conflicting contextual scoring observations are not silently interpreted as absent', () => {
  for (const conflicts of [['controlled_hypertension'], { controlled_hypertension: true }]) {
    const record = evaluated('P13', { controlled_hypertension: true, conflicts });
    assert.equal(record.status, 'eligible');
    const profile = getReviewProfile(record);
    assert.equal(profile.score, null);
    assert.ok(profile.missingInputs.length);
    assert.equal(rankCandidates({ records: [record], gate: record.gate }).length, 0);
  }
});

test('editable score coefficients change review ordering without changing any eligibility result', () => {
  const cohort = evaluateCohort(anchorPatients, true);
  const before = clone(cohort);
  const config = clone(reviewConfig);
  config.factors.find(factor => factor.field === 'controlled_hypertension').points = 100;
  const custom = rankCandidates(cohort, config);
  assert.notDeepEqual(custom.map(record => record.id), rankCandidates(cohort).map(record => record.id));
  assert.deepEqual(cohort, before);
  assert.ok(custom.every(record => record.status === 'eligible' && record.newlyEligible));
});

test('the configured cap is applied after transparent contributions, never to eligibility', () => {
  const config = clone(reviewConfig);
  config.renal.base = 200;
  const record = evaluated('P03');
  const score = scoreReviewAttention(record, config);
  assert.equal(score.score, config.range[1]);
  assert.ok(sumComponents(score) > config.range[1]);
  assert.equal(record.status, 'eligible');
  assertUnranked(evaluated('P06'));
});

test('a multidimensional profile preserves clinical facts, criterion failures, and valid evidence references', () => {
  const record = evaluated('P06');
  const profile = getReviewProfile(record);
  assert.ok(profile.dimensions.length >= 6);
  assert.ok(profile.dimensions.every(dimension => dimension.id && dimension.label && dimension.reason));
  assert.ok(profile.dimensions.some(dimension => dimension.result === 'FAIL' && /medication|interaction|CYP3A/i.test(dimension.label)));
  for (const dimension of profile.dimensions) {
    assert.ok((dimension.sourceIds || []).every(id => sourceIds.has(id)));
  }
});

test('next review steps are patient-specific and linked only to registered evidence', () => {
  const cases = [
    ['P02', /renal|stability|subgroup/i], ['P06', /interaction|medication|CYP3A/i],
    ['P16', /hepatic/i], ['P10', /renal|eGFR|laboratory|kidney/i], ['P08', /cardiac/i],
  ];
  for (const [id, relevant] of cases) {
    const profile = getReviewProfile(evaluated(id));
    assert.ok(profile.nextSteps.length, id);
    const copy = profile.nextSteps.map(step => `${step.title} ${step.detail}`).join(' ');
    assert.match(copy, relevant, id);
    assert.ok(profile.nextSteps.every(step => step.id && step.title && step.detail));
    assert.ok(profile.nextSteps.flatMap(step => step.sourceIds || []).every(id => sourceIds.has(id)));
  }
});

test('ranking is deterministic, does not mutate records or configuration, and reconciles expanded cohort counts', () => {
  const cohort = evaluateCohort(generateCohort(120, 217), true);
  const before = clone(cohort);
  const configBefore = clone(reviewConfig);
  const first = rankCandidates(cohort);
  assert.deepEqual(rankCandidates(cohort), first);
  assert.deepEqual(cohort, before);
  assert.deepEqual(reviewConfig, configBefore);
  assert.equal(cohort.eligible + cohort.excluded + cohort.indeterminate, cohort.total);
  assert.equal(cohort.total, 120);
  assert.equal(first.length, cohort.records.filter(record => record.newlyEligible && Number.isFinite(getReviewProfile(record).score)).length);
  assert.ok(first.every(record => record.evaluations.every(criterion => criterion.result === 'PASS')));
  assert.deepEqual(rankCandidates(evaluateCohort([], true)), []);
});

test('unknown attention context does not mask a passing independent cardiac criterion', () => {
  for (const id of ['P02', 'P13']) {
    const record = evaluated(id, { stable_cardiac_history: null });
    const cardiacCriterion = record.evaluations.find(item => item.criterionId === 'CARDIAC');
    const profile = getReviewProfile(record);
    const cardiacDimension = profile.dimensions.find(dimension => dimension.id === 'cardiac');
    assert.equal(record.status, 'eligible');
    assert.equal(record.newlyEligible, true);
    assert.equal(cardiacCriterion.result, 'PASS');
    assert.equal(cardiacDimension.criterionResult, 'PASS');
    assert.equal(cardiacDimension.result, 'UNKNOWN');
    assert.match(cardiacDimension.reason, /stable_cardiac_history/);
    assert.equal(profile.score, null);
    assert.ok(profile.missingInputs.includes('stable_cardiac_history'));
    assert.equal(rankCandidates({ records: [record], gate: record.gate }).length, 0);
  }
});
