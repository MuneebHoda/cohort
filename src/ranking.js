import { reviewConfig } from './review-fixture.js';
export { reviewConfig } from './review-fixture.js';

const list = value => Array.isArray(value) ? value : [];
const finite = value => typeof value === 'number' && Number.isFinite(value);
const conflict = (record, field) => list(record.conflicts).includes(field) || record.conflicts?.[field] === true || (record[field] !== null && typeof record[field] === 'object');
const hasValue = (record, field, allowed) => !conflict(record, field) && (allowed ? allowed.includes(record[field]) : finite(record[field]) && record[field] >= 0);
const display = value => value === null || value === undefined ? 'Not recorded' : typeof value === 'boolean' ? value ? 'Yes' : 'No' : typeof value === 'object' ? 'Conflicting / requires review' : String(value);

function rankingGuard(record) {
  if (record?.status !== 'eligible') return 'Only records meeting every proposed modeled criterion can be ranked.';
  if (record?.originalStatus === 'eligible' || record?.newlyEligible !== true) return 'This record already met the original rules; it is not newly matching.';
  if (record?.gate?.active !== true || record?.gate?.status !== 'approved-demo') return 'No approved synthetic demonstration rule is active.';
  if (!list(record.evaluations).length || !record.evaluations.every(evaluation => evaluation.result === 'PASS')) return 'Every applicable criterion must explicitly pass before ranking.';
  return null;
}

export function scoreReviewAttention(record, config = reviewConfig) {
  const candidate = record || {};
  const unrankedReason = rankingGuard(candidate);
  const missingInputs = [];
  const renal = config.renal;
  const renalKnown = hasValue(candidate, renal.field) && (!candidate.units?.[renal.field] || candidate.units[renal.field] === renal.unit);
  if (!renalKnown) missingInputs.push(renal.field);
  const egfr = candidate[renal.field];
  const renalPoints = renalKnown ? egfr >= renal.lowerInclusive && egfr < renal.upperExclusive ? renal.base + (renal.reference - egfr) : 0 : null;
  const components = [{ id: renal.id, label: renal.label, field: renal.field, points: renalPoints, description: renalKnown ? `${egfr} ${renal.unit}; ${egfr >= renal.lowerInclusive && egfr < renal.upperExclusive ? `${renal.base} + (${renal.reference} − ${egfr})` : 'outside the configured index window'}` : 'Required renal measurement is missing, invalid, conflicting, or in an unverified unit.' }];
  for (const factor of config.factors) {
    const known = hasValue(candidate, factor.field, factor.allowedValues);
    if (!known) missingInputs.push(factor.field);
    components.push({ id: factor.id, label: factor.label, field: factor.field, points: known ? candidate[factor.field] === factor.when ? factor.points : 0 : null, description: known ? `${factor.label}: ${display(candidate[factor.field])}; ${candidate[factor.field] === factor.when ? `${factor.points} fixture points` : '0 fixture points'}` : `${factor.label} is missing, conflicting, or outside the configured categories.` });
  }
  const validWeights = finite(renal.base) && finite(renal.reference) && finite(renal.lowerInclusive) && finite(renal.upperExclusive) && renal.lowerInclusive < renal.upperExclusive && components.every(component => component.points === null || finite(component.points) && component.points >= 0) && config.range?.length === 2 && finite(config.range[0]) && finite(config.range[1]) && config.range[0] >= 0 && config.range[1] >= config.range[0];
  const reason = unrankedReason || (!validWeights ? 'The illustrative index configuration requires review.' : missingInputs.length ? 'Required reviewer-attention inputs are missing or conflicting.' : null);
  const rawScore = reason ? null : components.reduce((sum, component) => sum + component.points, 0);
  return {
    eligibleForRanking: !unrankedReason, score: reason ? null : Math.min(config.range[1], Math.max(config.range[0], rawScore)), rawScore,
    components: reason ? components.map(component => ({ ...component, points: null })) : components,
    missingInputs: [...new Set(missingInputs)], disclaimer: config.disclaimer, unrankedReason: reason,
  };
}

export function getReviewProfile(record, config = reviewConfig) {
  const candidate = record || {};
  const score = scoreReviewAttention(candidate, config);
  const evaluations = list(candidate.evaluations);
  const originalExclusions = list(candidate.original?.evaluations).filter(evaluation => evaluation.result === 'FAIL');
  const dimensions = config.dimensions.map(dimension => {
    const evaluation = evaluations.find(item => item.criterionId === dimension.criterionId);
    const componentValues = score.components.filter(component => dimension.componentIds.includes(component.id));
    const missingContextFields = componentValues.filter(component => score.missingInputs.includes(component.field)).map(component => component.field);
    const missingContext = missingContextFields.length > 0;
    let value;
    if (dimension.id === 'comorbidity') {
      value = dimension.fields.map(field => `${config.factors.find(factor => factor.field === field)?.label || field}: ${conflict(candidate, field) ? 'Conflicting' : display(candidate[field])}`).join(' · ');
    } else {
      value = conflict(candidate, dimension.field) ? 'Conflicting / requires review' : display(candidate[dimension.field]);
      if (dimension.id === 'cardiac') value = `Unstable disease: ${value} · Stable history: ${conflict(candidate, 'stable_cardiac_history') ? 'Conflicting' : display(candidate.stable_cardiac_history)}`;
      if (dimension.id === 'interaction') value = `Strong CYP3A inhibitor: ${value}`;
    }
    const wrongUnit = dimension.unit && candidate.units?.[dimension.field] && candidate.units[dimension.field] !== dimension.unit;
    if (wrongUnit) value = 'Unverified unit / requires review';
    return {
      id: dimension.id, label: dimension.label, value, ...(dimension.unit ? { unit: dimension.unit } : {}),
      result: wrongUnit || missingContext ? 'UNKNOWN' : evaluation?.result || 'CONTEXT',
      criterionResult: evaluation?.result || 'CONTEXT',
      points: score.score === null ? null : componentValues.reduce((sum, component) => sum + component.points, 0),
      reason: wrongUnit ? `Profile measurement unit requires review; the supplied unit does not match ${dimension.unit}. ${evaluation?.reason || ''}` : missingContext ? `Criterion ${evaluation?.result || 'context only'}; reviewer-attention context is missing or conflicting: ${missingContextFields.join(', ')}. Complete it before calculating an index.` : evaluation?.reason || 'Recorded context contributes only to the illustrative attention index and never overrides a criterion.',
      sourceIds: evaluation?.sourceIds || [],
    };
  });
  const nextSteps = [];
  const add = step => { if (step && !nextSteps.some(item => item.id === step.id)) nextSteps.push({ ...step, sourceIds: [...step.sourceIds] }); };
  for (const evaluation of evaluations.filter(item => item.result === 'FAIL')) add(config.reviewSteps.unchanged[evaluation.criterionId]);
  const unknown = evaluations.filter(item => item.result === 'UNKNOWN');
  if (unknown.length) add({ ...config.reviewSteps.missing,
    detail: `${config.reviewSteps.missing.detail} Unresolved: ${unknown.map(item => `${item.title}: ${item.reason}`).join(' ')}`,
    sourceIds: [...new Set(unknown.flatMap(item => item.sourceIds || []))],
  });
  if (candidate.status === 'eligible' && candidate.newlyEligible) {
    add(config.reviewSteps.evidence); add(config.reviewSteps.stability);
    if (score.missingInputs.length) add(config.reviewSteps.scoreContext);
  }
  add(config.reviewSteps.oversight);
  return { ...score, dimensions, nextSteps, originalExclusions, interpretation: config.interpretation, scoreVersion: config.version, scoreName: config.name };
}

// Numeric ID chunks avoid locale-dependent sorting and give P2 precedence over P10 on ties.
function compareIds(left, right) {
  const a = String(left).match(/\d+|\D+/g) || [];
  const b = String(right).match(/\d+|\D+/g) || [];
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    if (a[index] === b[index]) continue;
    if (/^\d+$/.test(a[index]) && /^\d+$/.test(b[index])) {
      const difference = Number(a[index]) - Number(b[index]);
      if (difference) return difference;
    } else return a[index] < b[index] ? -1 : 1;
  }
  if (a.length !== b.length) return a.length - b.length;
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}

export function rankCandidates(cohort, config = reviewConfig) {
  return list(cohort?.records).map(record => ({ ...record, review: getReviewProfile(record, config) }))
    .filter(record => record.review.eligibleForRanking && record.review.score !== null)
    .sort((a, b) => a.review.score - b.review.score || compareIds(a.id, b.id))
    .map((record, index) => ({ ...record, rank: index + 1 }));
}
