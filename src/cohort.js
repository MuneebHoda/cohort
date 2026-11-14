import { clinicalConfig } from './clinical-fixture.js';

const array = value => Array.isArray(value) ? value : [];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const scalar = value => ['string', 'number', 'boolean'].includes(typeof value) && (typeof value !== 'number' || Number.isFinite(value));
const unique = values => [...new Set(values)];
const units = { age_years: 'Age', egfr_ml_min_1_73m2: 'eGFR', ecog: 'ECOG', hepatic_status: 'Hepatic status', strong_cyp3a_inhibitor: 'Strong CYP3A inhibitor', clinically_unstable_cardiac_disease: 'Clinically unstable cardiac disease', renal_stable: 'Renal stability' };

function validPredicate(predicate, depth = 0) {
  if (!object(predicate) || depth > 5) return false;
  if (['all', 'any'].includes(predicate.operator)) return array(predicate.conditions).length > 0 && predicate.conditions.every(child => validPredicate(child, depth + 1));
  if (typeof predicate.field !== 'string' || !predicate.field || !['gte', 'lte', 'in', 'equals'].includes(predicate.operator)) return false;
  if (predicate.allowedValues !== undefined && (!Array.isArray(predicate.allowedValues) || !predicate.allowedValues.length || !predicate.allowedValues.every(scalar))) return false;
  if (['gte', 'lte'].includes(predicate.operator) && (typeof predicate.value !== 'number' || !Number.isFinite(predicate.value))) return false;
  if (predicate.operator === 'in' && (!Array.isArray(predicate.value) || !predicate.value.length || !predicate.value.every(scalar))) return false;
  if (predicate.operator === 'equals' && !scalar(predicate.value)) return false;
  for (const bound of ['min', 'max']) if (predicate[bound] !== undefined && (typeof predicate[bound] !== 'number' || !Number.isFinite(predicate[bound]))) return false;
  return predicate.min === undefined || predicate.max === undefined || predicate.min <= predicate.max;
}

function validRule(rule, criterionId) {
  return object(rule) && typeof rule.id === 'string' && rule.id.length > 0 && typeof rule.version === 'string' && rule.version.length > 0 && rule.criterionId === criterionId && validPredicate(rule);
}

export function resolveScenario(config = clinicalConfig, requested = false) {
  const selectedId = requested === true ? 'renal-revision' : typeof requested === 'string' ? requested : null;
  const scenario = array(config?.scenarios).find(item => item?.id === selectedId);
  const approvalLabels = { 'approved-demo': 'Approved demonstration rule', draft: 'Evidence-supported draft change', 'awaiting-review': 'Awaiting medical review' };
  const base = { approvalLabel: approvalLabels[scenario?.status] || (requested ? 'Change withheld' : 'Original protocol'), requested: Boolean(requested), active: false, scenarioId: selectedId, scenarioVersion: scenario?.version ?? null, status: scenario?.status ?? (requested ? 'withheld' : 'disabled'), label: scenario?.label ?? 'Original protocol', reasons: [], ruleIds: [], evidenceIds: [], revisions: [] };
  if (!requested) return base;
  if (!scenario) return { ...base, reasons: ['The requested scenario is not defined. Original rules remain active.'] };
  const reasons = [];
  if (array(config?.scenarios).filter(item => item?.id === selectedId).length !== 1) reasons.push('The scenario identifier is ambiguous.');
  if (scenario.status !== 'approved-demo') reasons.push(scenario.status === 'draft' ? 'Evidence-supported draft: not approved for the synthetic demonstration.' : 'Awaiting medical review: no demonstration approval is present.');
  if (scenario.syntheticOnly !== true) reasons.push('The scenario is not explicitly restricted to synthetic demonstration use.');
  if (typeof scenario.version !== 'string' || !scenario.version) reasons.push('A versioned scenario definition is required.');
  const revisions = array(scenario.revisions);
  if (!revisions.length) reasons.push('No explicit proposed rule is configured.');
  const seen = new Set();
  for (const revision of revisions) {
    const criterion = array(config?.protocol?.criteria).find(item => item?.id === revision?.criterionId);
    const rule = array(config?.rules).find(item => item?.id === revision?.ruleId);
    if (!criterion) { reasons.push('A proposed rule references an unknown criterion.'); continue; }
    if (array(config?.protocol?.criteria).filter(item => item?.id === criterion.id).length !== 1) reasons.push('The target criterion identifier is ambiguous.');
    if (array(config?.rules).filter(item => item?.id === revision?.ruleId).length !== 1) reasons.push(`${criterion.title}: the proposed rule identifier is ambiguous.`);
    if (seen.has(criterion.id)) reasons.push(`Conflicting proposed rules for ${criterion.id}.`);
    seen.add(criterion.id);
    if (criterion.fixed !== false) reasons.push(`${criterion.title}: fixed restrictions cannot be revised by this scenario.`);
    if (!validRule(rule, criterion.id)) { reasons.push(`${criterion.title}: the proposed rule is missing, malformed, or belongs to another criterion.`); continue; }
    const evidenceIds = array(revision.evidenceIds);
    if (!evidenceIds.length) reasons.push(`${criterion.title}: supporting evidence is missing.`);
    if (!array(rule.sourceIds).length || !array(rule.sourceIds).every(id => evidenceIds.includes(id))) reasons.push(`${criterion.title}: all evidence references required by the proposed rule must be supplied.`);
    for (const id of evidenceIds) {
      const source = array(config?.evidence).find(item => item?.id === id);
      if (array(config?.evidence).filter(item => item?.id === id).length > 1) reasons.push(`${criterion.title}: an evidence identifier has conflicting or ambiguous definitions.`);
      if (!source) reasons.push(`${criterion.title}: an evidence reference is not in the source registry.`);
      else if (source.status !== 'supporting') reasons.push(`${source.title || source.id}: evidence is ${source.status || 'missing'}, so the change is withheld.`);
      else if (source.type !== 'fictional-drug-evidence') reasons.push(`${source.title || source.id}: general guidance cannot establish drug-specific support.`);
      else if (!array(source.supportsRuleIds).includes(rule.id)) reasons.push(`${source.title || source.id}: evidence does not support the specified rule.`);
    }
  }
  if (reasons.length) return { ...base, reasons: unique(reasons) };
  return { ...base, active: true, reasons: ['Approved only for this synthetic demonstration; qualified clinical review is still required.'], ruleIds: revisions.map(item => item.ruleId), evidenceIds: unique(revisions.flatMap(item => item.evidenceIds)), revisions: revisions.map(item => ({ ...item, evidenceIds: [...item.evidenceIds] })) };
}

function evaluatePredicate(predicate, patient) {
  if (!validPredicate(predicate)) return { result: 'UNKNOWN', reason: 'Configured rule is invalid and requires review.', value: null };
  if (['all', 'any'].includes(predicate.operator)) {
    const children = predicate.conditions.map(child => evaluatePredicate(child, patient));
    const all = predicate.operator === 'all';
    const result = all
      ? children.some(child => child.result === 'FAIL') ? 'FAIL' : children.some(child => child.result === 'UNKNOWN') ? 'UNKNOWN' : 'PASS'
      : children.some(child => child.result === 'PASS') ? 'PASS' : children.some(child => child.result === 'UNKNOWN') ? 'UNKNOWN' : 'FAIL';
    const relevant = children.filter(child => child.result === result);
    return { result, reason: unique(relevant.map(child => child.reason)).join(all ? ' And ' : ' Or '), value: Object.assign({}, ...children.map(child => object(child.value) ? child.value : {})), unit: undefined };
  }
  const field = predicate.field;
  const label = units[field] || field;
  const value = patient[field];
  const conflict = array(patient.conflicts).includes(field) || (object(patient.conflicts) && patient.conflicts[field] === true) || (object(value) && (value.conflicting === true || value.status === 'conflicting'));
  const unknown = reason => ({ result: 'UNKNOWN', reason: `${label}: ${reason}`, value: { [field]: scalar(value) ? value : null }, unit: predicate.unit });
  if (conflict) return unknown('conflicting information requires review.');
  if (value === null || value === undefined) return unknown('required information is missing.');
  if (predicate.unit && patient.units?.[field] && patient.units[field] !== predicate.unit) return unknown('measurement unit does not match the configured rule.');
  if (!scalar(value)) return unknown('the supplied value is invalid.');
  if (predicate.allowedValues && !predicate.allowedValues.includes(value)) return unknown('the supplied value is outside the configured categories.');
  const numeric = ['gte', 'lte'].includes(predicate.operator);
  if (numeric && (typeof value !== 'number' || !Number.isFinite(value))) return unknown('a finite numeric measurement is required; values are not coerced.');
  if ((predicate.min !== undefined && (typeof value !== 'number' || value < predicate.min)) || (predicate.max !== undefined && (typeof value !== 'number' || value > predicate.max))) return unknown('the supplied value is outside the configured measurement range.');
  if (predicate.operator === 'equals' && typeof value !== typeof predicate.value) return unknown('the supplied value has the wrong type.');
  if (predicate.operator === 'in' && !predicate.value.some(option => typeof option === typeof value)) return unknown('the supplied value has the wrong type.');
  const passing = predicate.operator === 'gte' ? value >= predicate.value : predicate.operator === 'lte' ? value <= predicate.value : predicate.operator === 'in' ? predicate.value.includes(value) : value === predicate.value;
  const expected = predicate.operator === 'gte' ? `≥${predicate.value}` : predicate.operator === 'lte' ? `≤${predicate.value}` : predicate.operator === 'in' ? predicate.value.join(' or ') : String(predicate.value);
  return { result: passing ? 'PASS' : 'FAIL', reason: `${label} ${String(value)} ${passing ? 'meets' : 'does not meet'} the configured requirement (${expected}${predicate.unit ? ` ${predicate.unit}` : ''}).`, value: { [field]: value }, unit: predicate.unit };
}

function evaluateRules(patient, config, gate) {
  const evaluations = array(config?.protocol?.criteria).map(criterion => {
    const revision = gate.active ? gate.revisions.find(item => item.criterionId === criterion.id) : null;
    const ruleId = revision?.ruleId || criterion.ruleId;
    const rule = array(config?.rules).find(item => item?.id === ruleId);
    const evaluation = validRule(rule, criterion.id) ? evaluatePredicate(rule, patient) : { result: 'UNKNOWN', reason: 'The versioned rule is missing or invalid; review is required.', value: null };
    const sourceIds = unique(revision ? revision.evidenceIds : array(rule?.sourceIds).concat(array(criterion.sourceIds))).filter(id => array(config?.evidence).some(source => source?.id === id));
    return { criterionId: criterion.id, title: criterion.title, kind: criterion.kind, fixed: criterion.fixed, ruleId, ruleVersion: rule?.version ?? null, ...evaluation, sourceIds };
  });
  const exclusionReasons = evaluations.filter(item => item.result === 'FAIL').map(item => item.reason);
  const missingData = evaluations.filter(item => item.result === 'UNKNOWN').map(item => item.reason);
  const status = exclusionReasons.length ? 'excluded' : missingData.length || !evaluations.length ? 'indeterminate' : 'eligible';
  return { status, evaluations, exclusionReasons, missingData, reasons: !evaluations.length ? ['No applicable criteria are configured; review is required.'] : exclusionReasons.concat(missingData).length ? exclusionReasons.concat(missingData) : ['All applicable modeled criteria are met.'] };
}

export function evaluatePatient(patient, requested = false, config = clinicalConfig) {
  const record = object(patient) ? patient : {};
  const gate = resolveScenario(config, requested);
  const original = evaluateRules(record, config, resolveScenario(config, false));
  const current = gate.active ? evaluateRules(record, config, gate) : evaluateRules(record, config, resolveScenario(config, false));
  const evaluations = current.evaluations.map(evaluation => {
    const previous = original.evaluations.find(item => item.criterionId === evaluation.criterionId);
    return { ...evaluation, originalResult: previous.result, changed: previous.result !== evaluation.result };
  });
  const changes = evaluations.filter(item => item.changed).map(item => ({
    criterionId: item.criterionId, from: item.originalResult, to: item.result, ruleId: item.ruleId,
    originalRuleId: original.evaluations.find(previous => previous.criterionId === item.criterionId).ruleId,
    sourceIds: [...item.sourceIds], reason: `${item.title}: ${item.originalResult} → ${item.result}. ${item.reason}`,
  }));
  const newlyEligible = original.status !== 'eligible' && current.status === 'eligible';
  return { ...current, evaluations, original, originalStatus: original.status, originalEvaluations: original.evaluations, changes, newlyEligible, changed: newlyEligible, statusChanged: original.status !== current.status, gate };
}

export function evaluateCohort(patients, requested = false, config = clinicalConfig) {
  const result = { records: [], eligible: 0, excluded: 0, indeterminate: 0, changed: 0, newlyEligible: 0, statusChanged: 0, total: array(patients).length, gate: resolveScenario(config, requested) };
  for (const patient of array(patients)) {
    const evaluation = evaluatePatient(patient, requested, config);
    result.records.push({ ...patient, ...evaluation });
    result[evaluation.status] += 1;
    if (evaluation.newlyEligible) { result.changed += 1; result.newlyEligible += 1; }
    if (evaluation.statusChanged) result.statusChanged += 1;
  }
  return result;
}
