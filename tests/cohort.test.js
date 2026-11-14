import test from 'node:test';
import assert from 'node:assert/strict';
import { clinicalConfig } from '../src/clinical-fixture.js';
import { anchorPatients, generateCohort } from '../src/patients.js';
import { evaluatePatient, evaluateCohort, resolveScenario } from '../src/cohort.js';

const copy = (value) => structuredClone(value);
const patient = (id) => copy(anchorPatients.find((record) => record.id === id));
const complete = () => patient('P01');
const criterion = (evaluation, id) => evaluation.evaluations.find((item) => item.criterionId === id);
const counts = (result) => ({ eligible: result.eligible, excluded: result.excluded, indeterminate: result.indeterminate });
const revisedRule = (config) => config.rules.find((rule) => rule.id === 'renal-revised-v1');
const proposal = (config) => config.scenarios[0].revisions[0];
const renalPacket = (config) => config.evidence.find((source) => source.id === 'SYN-PK-02');

function assertReconciles(cohort) {
  assert.equal(cohort.eligible + cohort.excluded + cohort.indeterminate, cohort.total);
  assert.equal(cohort.records.length, cohort.total);
  for (const status of ['eligible', 'excluded', 'indeterminate']) {
    assert.equal(cohort[status], cohort.records.filter((record) => record.status === status).length);
  }
  assert.equal(cohort.newlyEligible, cohort.records.filter((record) => record.newlyEligible).length);
  assert.equal(cohort.statusChanged, cohort.records.filter((record) => record.statusChanged).length);
}

function assertWithheld(config) {
  const gate = resolveScenario(config, true);
  assert.equal(gate.active, false);
  assert.ok(gate.reasons.length, 'A withheld revision must explain why.');
  const candidate = patient('P02');
  const original = evaluatePatient(candidate, false, config);
  const requested = evaluatePatient(candidate, true, config);
  assert.equal(requested.status, original.status);
  assert.equal(criterion(requested, 'RENAL').ruleId, criterion(original, 'RENAL').ruleId);
  assert.equal(criterion(requested, 'RENAL').result, 'FAIL');
  assert.deepEqual(gate.ruleIds, []);
  assert.deepEqual(gate.evidenceIds, []);
}

test('supplied 20-patient case reconciles with the independently supplied expected outcomes', () => {
  const original = evaluateCohort(anchorPatients, false);
  const proposed = evaluateCohort(anchorPatients, true);
  assert.deepEqual(counts(original), { eligible: 4, excluded: 15, indeterminate: 1 });
  assert.deepEqual(counts(proposed), { eligible: 10, excluded: 8, indeterminate: 2 });
  assert.equal(proposed.newlyEligible, 6);
  assert.equal(proposed.changed, 6);
  assert.equal(proposed.statusChanged, 7);
  assert.deepEqual(proposed.records.filter((record) => record.newlyEligible).map((record) => record.id).sort(), ['P02', 'P03', 'P09', 'P11', 'P13', 'P19']);
  assertReconciles(original);
  assertReconciles(proposed);
});

test('an original qualifying record passes every modeled inclusion and exclusion', () => {
  const evaluation = evaluatePatient(patient('P01'));
  assert.equal(evaluation.status, 'eligible');
  assert.equal(evaluation.evaluations.length, clinicalConfig.protocol.criteria.length);
  assert.ok(evaluation.evaluations.every((item) => item.result === 'PASS'));
  assert.ok(clinicalConfig.protocol.criteria.some((item) => item.kind === 'inclusion'));
  assert.ok(clinicalConfig.protocol.criteria.some((item) => item.kind === 'exclusion'));
});

test('approved renal scenario changes the explicit renal rule and identifies supporting drug evidence', () => {
  const candidate = patient('P02');
  assert.equal(evaluatePatient(candidate, false).status, 'excluded');
  const revised = evaluatePatient(candidate, true);
  assert.equal(revised.status, 'eligible');
  const renal = criterion(revised, 'RENAL');
  assert.equal(renal.ruleId, 'renal-revised-v1');
  assert.equal(renal.originalResult, 'FAIL');
  assert.equal(renal.result, 'PASS');
  assert.equal(renal.changed, true);
  assert.ok(renal.sourceIds.includes('SYN-PK-01'));
  assert.ok(renal.sourceIds.includes('SYN-PK-02'));
  assert.ok(renal.reason.length > 10);
});

test('advanced renal impairment is never admitted by the narrower renal revision', () => {
  for (const id of ['P04', 'P20']) {
    const revised = evaluatePatient(patient(id), true);
    assert.equal(revised.status, 'excluded');
    assert.equal(criterion(revised, 'RENAL').result, 'FAIL');
  }
});

test('changing the renal result cannot override the independent medication exclusion', () => {
  for (const id of ['P06', 'P17']) {
    const revised = evaluatePatient(patient(id), true);
    assert.equal(criterion(revised, 'RENAL').originalResult, 'FAIL');
    assert.equal(criterion(revised, 'RENAL').result, 'PASS');
    assert.equal(criterion(revised, 'DDI').result, 'FAIL');
    assert.equal(criterion(revised, 'DDI').ruleId, 'ddi-original-v1');
    assert.equal(revised.status, 'excluded');
    const renalChange = revised.changes.find((change) => change.criterionId === 'RENAL');
    assert.equal(renalChange.from, 'FAIL');
    assert.equal(renalChange.to, 'PASS');
    assert.ok(renalChange.reason);
    assert.ok(renalChange.sourceIds.includes('SYN-PK-02'));
  }
});

test('multiple controlled comorbidities remain visible without acting as a weighted health score', () => {
  const record = { ...patient('P03'), controlled_hypertension: true, stable_type2_diabetes: true, stable_cardiac_history: true };
  const revised = evaluatePatient(record, true);
  assert.equal(revised.status, 'eligible');
  assert.equal(revised.evaluations.length, clinicalConfig.protocol.criteria.length);
  assert.equal('score' in revised, false);
  assert.equal('risk' in revised, false);
  const hardExclusion = evaluatePatient({ ...record, clinically_unstable_cardiac_disease: true }, true);
  assert.equal(hardExclusion.status, 'excluded');
  assert.equal(criterion(hardExclusion, 'CARDIAC').result, 'FAIL');
});

test('missing required renal lab is UNKNOWN in both scenarios and cannot silently pass', () => {
  for (const enabled of [false, true]) {
    const evaluation = evaluatePatient(patient('P10'), enabled);
    assert.equal(evaluation.status, 'indeterminate');
    assert.equal(criterion(evaluation, 'RENAL').result, 'UNKNOWN');
    assert.ok(evaluation.missingData.length);
  }
});

test('FAIL takes precedence over UNKNOWN while all missing results remain in the audit trail', () => {
  const record = patient('P16');
  const original = evaluatePatient(record, false);
  const proposed = evaluatePatient(record, true);
  assert.equal(original.status, 'excluded');
  assert.equal(criterion(original, 'RENAL').result, 'FAIL');
  assert.equal(criterion(original, 'HEPATIC').result, 'UNKNOWN');
  assert.ok(original.missingData.length);
  assert.equal(proposed.status, 'indeterminate');
  assert.equal(criterion(proposed, 'RENAL').result, 'PASS');
  assert.equal(criterion(proposed, 'HEPATIC').result, 'UNKNOWN');
  const cohort = evaluateCohort([record], true);
  assert.equal(cohort.newlyEligible, 0);
  assert.equal(cohort.changed, 0);
  assert.equal(cohort.statusChanged, 1);
});

test('exact configured renal boundaries are inclusive, with immediate neighbors handled correctly', () => {
  const cases = [
    [44.9, 'excluded', 'excluded'],
    [45, 'excluded', 'eligible'],
    [45.1, 'excluded', 'eligible'],
    [59.9, 'excluded', 'eligible'],
    [60, 'eligible', 'eligible'],
    [60.1, 'eligible', 'eligible'],
  ];
  for (const [egfr, originalStatus, revisedStatus] of cases) {
    const record = { ...complete(), egfr_ml_min_1_73m2: egfr };
    assert.equal(evaluatePatient(record, false).status, originalStatus, `original eGFR ${egfr}`);
    assert.equal(evaluatePatient(record, true).status, revisedStatus, `proposed eGFR ${egfr}`);
  }
});

test('adult inclusion is a fixed, inclusive rule and older age has no eligibility penalty', () => {
  for (const [age, expected] of [[17.9, 'excluded'], [18, 'eligible'], [18.1, 'eligible'], [90, 'eligible']]) {
    const evaluation = evaluatePatient({ ...complete(), age_years: age }, true);
    assert.equal(evaluation.status, expected);
    assert.equal(criterion(evaluation, 'ADULT').ruleId, 'adult-original-v1');
  }
});

test('overlapping renal, hepatic, medication and cardiac exclusions each retain an explanation, counted once', () => {
  const record = { ...patient('P04'), hepatic_status: 'severe', strong_cyp3a_inhibitor: true, clinically_unstable_cardiac_disease: true };
  for (const enabled of [false, true]) {
    const evaluation = evaluatePatient(record, enabled);
    assert.equal(evaluation.status, 'excluded');
    for (const id of ['RENAL', 'HEPATIC', 'DDI', 'CARDIAC']) assert.equal(criterion(evaluation, id).result, 'FAIL');
    const cohort = evaluateCohort([record], enabled);
    assert.equal(cohort.excluded, 1);
    assert.equal(cohort.total, 1);
    assertReconciles(cohort);
  }
});

test('all unchanged hard restrictions remain active under the approved scenario', () => {
  const cases = [
    ['P05', 'ECOG'], ['P07', 'HEPATIC'], ['P08', 'CARDIAC'], ['P12', 'ECOG'], ['P17', 'DDI'],
  ];
  for (const [id, failedCriterion] of cases) {
    const original = evaluatePatient(patient(id), false);
    const proposed = evaluatePatient(patient(id), true);
    assert.equal(proposed.status, 'excluded');
    assert.equal(criterion(proposed, failedCriterion).result, 'FAIL');
    assert.equal(criterion(proposed, failedCriterion).ruleId, criterion(original, failedCriterion).ruleId);
  }
});

test('unknown, invalid and contradictory clinical measurements are never coerced into a passing result', () => {
  const invalidByField = {
    age_years: [null, undefined, '62', -1, NaN, Infinity],
    egfr_ml_min_1_73m2: [null, undefined, '60', -1, NaN, Infinity, { value: 88, conflicting: true }],
    ecog: [null, undefined, '1', -1, 1.5, NaN, Infinity],
    hepatic_status: [null, undefined, 'unknown', 'NORMAL'],
    strong_cyp3a_inhibitor: [null, undefined, 'false', 0],
    clinically_unstable_cardiac_disease: [null, undefined, 'false', 0],
  };
  for (const [field, values] of Object.entries(invalidByField)) {
    for (const value of values) {
      assert.equal(evaluatePatient({ ...complete(), [field]: value }, true).status, 'indeterminate', `${field}=${String(value)}`);
    }
  }
  const contradictory = { ...complete(), conflicts: ['egfr_ml_min_1_73m2'] };
  assert.equal(evaluatePatient(contradictory, true).status, 'indeterminate');
  assert.equal(criterion(evaluatePatient(contradictory, true), 'RENAL').result, 'UNKNOWN');
});

test('a laboratory measurement in a conflicting unit requires review instead of conversion or passing', () => {
  const record = { ...complete(), units: { egfr_ml_min_1_73m2: 'mL/min' } };
  const evaluation = evaluatePatient(record, true);
  assert.equal(evaluation.status, 'indeterminate');
  assert.equal(criterion(evaluation, 'RENAL').result, 'UNKNOWN');
  assert.match(criterion(evaluation, 'RENAL').reason, /unit/i);
  const correctlyLabeled = { ...record, units: { egfr_ml_min_1_73m2: clinicalConfig.units.egfr_ml_min_1_73m2 } };
  assert.equal(evaluatePatient(correctlyLabeled, true).status, 'eligible');
});

test('stability is required only for the newly permitted renal subgroup', () => {
  const candidate = { ...patient('P02'), renal_stable: false };
  assert.equal(evaluatePatient(candidate, true).status, 'excluded');
  assert.equal(evaluatePatient({ ...candidate, renal_stable: null }, true).status, 'indeterminate');
  assert.equal(evaluatePatient({ ...candidate, egfr_ml_min_1_73m2: 88 }, true).status, 'eligible');
});

test('a missing explicit revision rule withholds the scenario', () => {
  const config = copy(clinicalConfig);
  config.rules = config.rules.filter((rule) => rule.id !== proposal(config).ruleId);
  assertWithheld(config);
});

test('missing, insufficient, conflicting and unsupported evidence each withhold the revision', async (t) => {
  for (const status of ['missing', 'insufficient', 'conflicting']) {
    await t.test(status, () => {
      const config = copy(clinicalConfig);
      renalPacket(config).status = status;
      assertWithheld(config);
    });
  }
  await t.test('unregistered reference', () => {
    const config = copy(clinicalConfig);
    proposal(config).evidenceIds.push('NO-SUCH-EVIDENCE');
    assertWithheld(config);
  });
  await t.test('source absent from registry', () => {
    const config = copy(clinicalConfig);
    config.evidence = config.evidence.filter((source) => source.id !== 'SYN-PK-02');
    assertWithheld(config);
  });
  await t.test('empty evidence references', () => {
    const config = copy(clinicalConfig);
    proposal(config).evidenceIds = [];
    assertWithheld(config);
  });
});

test('an evidence source must support this exact rule, and general guidance cannot replace drug evidence', () => {
  const unrelated = copy(clinicalConfig);
  renalPacket(unrelated).supportsRuleIds = ['different-rule-v1'];
  assertWithheld(unrelated);
  const guidanceOnly = copy(clinicalConfig);
  for (const source of guidanceOnly.evidence.filter((item) => proposal(guidanceOnly).evidenceIds.includes(item.id))) source.type = 'official-guidance';
  assertWithheld(guidanceOnly);
});

test('draft and awaiting-review scenarios cannot execute, with distinct approval labels', () => {
  const labels = new Set([resolveScenario(clinicalConfig, true).approvalLabel]);
  for (const status of ['draft', 'awaiting-review']) {
    const config = copy(clinicalConfig);
    config.scenarios[0].status = status;
    assertWithheld(config);
    labels.add(resolveScenario(config, true).approvalLabel);
  }
  assert.equal(labels.size, 3);
});

test('a proposed revision cannot target a fixed restriction or a rule for another criterion', () => {
  const fixed = copy(clinicalConfig);
  proposal(fixed).criterionId = 'DDI';
  assertWithheld(fixed);
  const wrongScope = copy(clinicalConfig);
  revisedRule(wrongScope).criterionId = 'HEPATIC';
  assertWithheld(wrongScope);
});

test('approval must be explicitly limited to the synthetic demonstration', () => {
  for (const approval of [false, undefined]) {
    const config = copy(clinicalConfig);
    config.scenarios[0].syntheticOnly = approval;
    assertWithheld(config);
  }
});

test('one invalid revision withholds the whole scenario instead of executing a partial proposal', () => {
  const config = copy(clinicalConfig);
  config.scenarios[0].revisions.push({ criterionId: 'DDI', ruleId: 'ddi-original-v1', evidenceIds: ['SYN-PK-01'] });
  assertWithheld(config);
});

test('unsupported operators and non-finite boundaries cannot execute eligibility logic', () => {
  const unsupported = copy(clinicalConfig);
  revisedRule(unsupported).operator = 'javascript';
  assertWithheld(unsupported);
  const malformed = copy(clinicalConfig);
  const renalBoundary = revisedRule(malformed).conditions[1].conditions.find((rule) => rule.operator === 'gte');
  renalBoundary.value = NaN;
  assertWithheld(malformed);
});

test('unversioned rules and ambiguous evidence or rule IDs withhold proposed execution', () => {
  const unversioned = copy(clinicalConfig);
  revisedRule(unversioned).version = '';
  assertWithheld(unversioned);
  const ambiguousEvidence = copy(clinicalConfig);
  ambiguousEvidence.evidence.push({ ...renalPacket(ambiguousEvidence), status: 'conflicting' });
  assertWithheld(ambiguousEvidence);
  const ambiguousRule = copy(clinicalConfig);
  ambiguousRule.rules.push(copy(revisedRule(ambiguousRule)));
  assertWithheld(ambiguousRule);
});

test('every criterion has a versioned active rule, reason and resolvable source references', () => {
  const ruleIds = new Set(clinicalConfig.rules.map((rule) => rule.id));
  const sourceIds = new Set(clinicalConfig.evidence.map((source) => source.id));
  for (const record of evaluateCohort(anchorPatients, true).records) {
    assert.equal(record.evaluations.length, clinicalConfig.protocol.criteria.length);
    assert.equal(new Set(record.evaluations.map((item) => item.criterionId)).size, clinicalConfig.protocol.criteria.length);
    for (const evaluation of record.evaluations) {
      assert.ok(ruleIds.has(evaluation.ruleId));
      assert.ok(evaluation.ruleVersion);
      assert.ok(evaluation.reason);
      assert.ok(evaluation.sourceIds.every((id) => sourceIds.has(id)));
    }
    if (record.statusChanged) {
      const changes = record.evaluations.filter((evaluation) => evaluation.changed);
      assert.ok(changes.length > 0);
      for (const change of changes) {
        assert.equal(change.criterionId, 'RENAL');
        assert.equal(change.ruleId, 'renal-revised-v1');
        assert.ok(change.sourceIds.includes('SYN-PK-02'));
      }
    }
  }
});

test('disabling a revision exactly restores baseline, with deterministic evaluation and no input mutation', () => {
  const recordsBefore = copy(anchorPatients);
  const configBefore = copy(clinicalConfig);
  const original = evaluateCohort(anchorPatients, false);
  const proposed = evaluateCohort(anchorPatients, true);
  assert.deepEqual(evaluateCohort(anchorPatients, true), proposed);
  assert.deepEqual(evaluateCohort(anchorPatients, false), original);
  assert.deepEqual(anchorPatients, recordsBefore);
  assert.deepEqual(clinicalConfig, configBefore);
});

test('seeded generator retains supplied anchors and reproduces a varied 120-record cohort', () => {
  const records = generateCohort(120, 217);
  assert.equal(records.length, 120);
  assert.equal(new Set(records.map((record) => record.id)).size, 120);
  assert.deepEqual(records.slice(0, anchorPatients.length), anchorPatients);
  assert.deepEqual(generateCohort(120, 217), records);
  assert.notDeepEqual(generateCohort(120, 218), records);
  assert.ok(records.some((record) => record.hepatic_status === 'moderate'));
  assert.ok(records.some((record) => record.hepatic_status === 'severe'));
  assert.ok(records.some((record) => record.clinically_unstable_cardiac_disease));
  assert.ok(records.some((record) => record.stable_cardiac_history && !record.clinically_unstable_cardiac_disease));
  assert.ok(records.some((record) => record.controlled_hypertension && record.stable_type2_diabetes));
  assert.ok(records.some((record) => record.egfr_ml_min_1_73m2 === null));
  assertReconciles(evaluateCohort(records, false));
  assertReconciles(evaluateCohort(records, true));
});

test('empty and shortened cohorts reconcile without invented records', () => {
  for (const enabled of [false, true]) {
    const empty = evaluateCohort([], enabled);
    assert.equal(empty.total, 0);
    assert.equal(empty.newlyEligible, 0);
    assertReconciles(empty);
  }
  assert.equal(generateCohort(3, 217).length, 3);
  assert.equal(generateCohort(0, 217).length, 0);
});

test('exhaustive combinations preserve every fixed restriction, missing-data handling and monotonic expansion', () => {
  let cases = 0;
  for (const egfr of [44.9, 45, 45.1, 59.9, 60, 60.1, null]) {
    for (const medication of [false, true, null]) {
      for (const hepatic of ['normal', 'mild', 'moderate', 'severe', null]) {
        for (const cardiac of [false, true, null]) {
          for (const ecog of [0, 1, 2, null]) {
            const record = { ...complete(), egfr_ml_min_1_73m2: egfr, strong_cyp3a_inhibitor: medication, hepatic_status: hepatic, clinically_unstable_cardiac_disease: cardiac, ecog };
            const original = evaluatePatient(record, false);
            const proposed = evaluatePatient(record, true);
            const fixedFails = medication === true || ['moderate', 'severe'].includes(hepatic) || cardiac === true || ecog === 2;
            if (fixedFails) assert.equal(proposed.status, 'excluded');
            if (proposed.status === 'eligible') {
              assert.ok(egfr !== null && egfr >= 45);
              assert.equal(medication, false);
              assert.ok(['normal', 'mild'].includes(hepatic));
              assert.equal(cardiac, false);
              assert.ok([0, 1].includes(ecog));
            }
            if (original.status === 'eligible') assert.equal(proposed.status, 'eligible');
            for (const id of ['ADULT', 'ECOG', 'HEPATIC', 'DDI', 'CARDIAC']) {
              assert.equal(criterion(original, id).ruleId, criterion(proposed, id).ruleId);
              assert.equal(criterion(original, id).result, criterion(proposed, id).result);
            }
            if (!fixedFails && [egfr, medication, hepatic, cardiac, ecog].includes(null) && (egfr === null || egfr >= 45)) assert.equal(proposed.status, 'indeterminate');
            cases += 1;
          }
        }
      }
    }
  }
  assert.equal(cases, 1260);
});
