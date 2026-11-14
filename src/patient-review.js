import { getReviewProfile, rankCandidates } from './ranking.js';

const outcomeLabels = {
  eligible: 'Meets modeled rules',
  excluded: 'Excluded',
  indeterminate: 'Indeterminate',
};
const criterionLabels = { PASS: 'Pass', FAIL: 'Exclusion applies', UNKNOWN: 'Requires review', CONTEXT: 'Recorded context' };

export function renderRiskProfile({ record, profile, escape, icon }) {
  const scored = Number.isFinite(profile.score);
  const components = profile.components || [];
  const largest = Math.max(1, ...components.map(component => Number.isFinite(component.points) ? component.points : 0));
  return `<section class="review-profile" aria-labelledby="risk-profile-heading">
    <div class="review-subheading"><div><span class="eyebrow">OBSERVED FACTORS, EXPLICIT RULES</span><h4 id="risk-profile-heading">Multidimensional risk profile</h4></div><span class="outline-label">NOT PREDICTIVE</span></div>
    <p class="profile-explainer">Clinical characteristics, modeled rule outcomes, and illustrative index contributions.</p>
    <div class="profile-dimensions">${(profile.dimensions || []).map(dimension => `<div class="profile-dimension ${String(dimension.result || 'CONTEXT').toLowerCase()}">
      <div class="dimension-topline"><span>${escape(dimension.label)}</span>${scored && Number.isFinite(dimension.points) ? `<span class="dimension-points">+${dimension.points}<small> pts</small></span>` : ''}</div>
      <strong>${escape(dimension.value)}${dimension.unit ? `<small> ${escape(dimension.unit)}</small>` : ''}</strong>
      <span class="dimension-result">${icon(dimension.result === 'PASS' ? 'check' : dimension.result === 'FAIL' ? 'close' : 'info')}${escape(criterionLabels[dimension.result] || 'Requires review')}</span>
      ${['FAIL', 'UNKNOWN'].includes(dimension.result) ? `<p>${escape(dimension.reason)}</p>` : ''}
    </div>`).join('')}</div>
    ${scored ? `<details class="score-calculation"><summary>${icon('plus')} Show the index calculation <span>${profile.score} / 100</span></summary><div class="score-component-list">${components.map(component => `<div class="score-component"><div><span>${escape(component.label)}</span><strong>${Number.isFinite(component.points) ? component.points : '—'} <small>pts</small></strong></div><div class="component-track" aria-hidden="true"><i style="--component-width:${Number.isFinite(component.points) ? Math.max(0, component.points) / largest * 100 : 0}%"></i></div><p>${escape(component.description)}</p></div>`).join('')}</div><p class="calculation-note">${profile.rawScore > profile.score ? `Raw sum ${profile.rawScore}; capped at ${profile.score}. ` : ''}Bars scale to the largest component. The fixture assigns no age points. Zero points does not establish safety.</p></details>` : `<div class="score-unavailable-note">${icon('info')}<p>${escape(profile.unrankedReason || 'This record has no reviewer-attention score. Eligibility and complete score inputs are required before ranking.')}${profile.missingInputs?.length ? `<span>Missing or conflicting score inputs: ${profile.missingInputs.map(escape).join(', ')}.</span>` : ''}</p></div>`}
  </section>`;
}

export function renderRankedReview({ state, selected, baseline, patients, config, sources, escape, icon, renderAudit }) {
  const ranked = rankCandidates(selected);
  const ranks = new Map(ranked.map(record => [record.id, record]));
  const group = ['new', 'excluded', 'indeterminate', 'all'].includes(state.rankingGroup) ? state.rankingGroup : 'new';
  const unscored = selected.records.filter(record => record.newlyEligible && !ranks.has(record.id));
  const records = group === 'new' ? ranked : selected.records.filter(record => group === 'all' || record.status === group);
  const record = selected.records.find(item => item.id === state.record) || ranked[0] || null;
  const profile = record ? getReviewProfile(record) : null;
  const knownSources = new Map(sources.map(source => [source.id, source]));
  const sourceButtons = (ids = []) => [...new Set(ids)].filter(id => knownSources.has(id)).map(id => {
    const source = knownSources.get(id);
    return `<button class="ranked-source" data-source="${escape(id)}">${icon(source.type === 'Official guidance' ? 'book' : 'file')}<span><strong>${escape(id)}</strong><small>${escape(source.shortTitle || source.title)}</small></span>${icon('chevron')}</button>`;
  }).join('');
  const status = (value) => `<span class="ranked-outcome ${value}">${icon(value === 'eligible' ? 'check' : value === 'excluded' ? 'close' : 'info')}${escape(outcomeLabels[value] || 'Indeterminate')}</span>`;
  const display = value => value === null || value === undefined ? '—' : String(value);
  const candidateCount = selected.records.filter(item => item.newlyEligible).length;
  const groups = [['new', 'Newly matching', candidateCount], ['excluded', 'Excluded', selected.excluded], ['indeterminate', 'Indeterminate', selected.indeterminate], ['all', 'All records', selected.total]];

  function renderTable() {
    return `<section class="ranked-table-panel" aria-labelledby="ranking-heading"><div class="ranked-table-heading"><div><span class="eyebrow">PATIENT REVIEW QUEUE</span><h3 id="ranking-heading">${group === 'new' ? 'A considered order.' : group === 'excluded' ? 'Exclusions stay visible.' : group === 'indeterminate' ? 'Questions before qualification.' : 'Every record, accounted for.'}</h3></div><span class="ranked-table-count">${records.length}<small> ${group === 'new' ? 'ranked' : 'records'}</small></span></div>
      <p class="ranking-caption">${group === 'new' ? 'Newly matching records, ordered by the illustrative review-attention index.' : 'These records are available for inspection. An exclusion or unknown required criterion cannot be overridden by a score.'}</p>
      <div class="ranking-groups" aria-label="Patient review groups">${groups.map(([id, label, count]) => `<button data-ranking-group="${id}" class="${group === id ? 'active' : ''}" aria-pressed="${group === id}">${label}<span>${count}</span></button>`).join('')}</div>
      ${records.length ? `<div class="ranked-table-wrap"><table class="ranked-candidate-table"><caption class="sr-only">${group === 'new' ? 'Newly matching patients ordered by illustrative review-attention index' : 'Unranked synthetic patient records'}</caption><thead><tr><th scope="col">${group === 'new' ? 'Rank' : 'Rule status'}</th><th scope="col">Patient</th><th scope="col">eGFR<small>mL/min/1.73 m²</small></th><th scope="col" ${group === 'new' ? 'aria-sort="ascending"' : ''}>Review index</th></tr></thead><tbody>${records.map(item => {
        const candidate = ranks.get(item.id);
        const itemProfile = candidate?.review || getReviewProfile(item);
        const score = Number.isFinite(itemProfile.score) ? itemProfile.score : null;
        return `<tr data-ranked-id="${escape(item.id)}" class="${record?.id === item.id ? 'selected' : ''}"><td><span class="queue-rank ${item.status}">${group === 'new' ? String(candidate.rank).padStart(2, '0') : icon(item.status === 'eligible' ? 'check' : item.status === 'excluded' ? 'close' : 'info')}</span></td><th scope="row"><button class="ranked-patient-button" data-record="${escape(item.id)}" aria-pressed="${record?.id === item.id}" aria-label="Inspect ${escape(item.id)}${candidate ? `, rank ${candidate.rank}, review-attention index ${score}` : `, ${outcomeLabels[item.status]}`}"><span>${escape(item.id)}${icon('arrow')}</span><small>ECOG ${escape(display(item.ecog))} <span>·</span> Age ${escape(display(item.age_years))}</small></button></th><td class="queue-egfr">${escape(display(item.egfr_ml_min_1_73m2))}</td><td class="queue-index">${score !== null ? `<strong class="attention-score">${score}<small> / 100</small></strong><span class="queue-score-bar" aria-hidden="true"><i style="--queue-score:${Math.min(100, Math.max(0, score))}%"></i></span>` : '<span class="unranked-label">Unranked</span>'}</td></tr>`;
      }).join('')}</tbody></table></div>` : `<div class="ranking-empty">${icon(selected.gate.active ? 'info' : 'shield')}<h4>${selected.gate.active ? 'No ranked records in this group.' : 'The original protocol is active.'}</h4><p>${selected.gate.active ? 'Only newly matching records with complete index inputs enter this queue. You can still inspect every excluded or indeterminate record.' : selected.gate.requested ? 'The requested revision was withheld. The original restrictions remain active and the ranking is empty.' : 'Apply the predefined renal revision to compare criteria and review newly matching synthetic records.'}</p>${!selected.gate.active ? `<button class="button primary" data-action="include-renal">Compare approved demo rule ${icon('arrow')}</button>` : ''}</div>`}
      ${unscored.length && group === 'new' ? `<div class="unscored-records">${icon('info')}<div><strong>${unscored.length} newly matching record${unscored.length === 1 ? '' : 's'} still need score inputs</strong><p>Eligibility is unchanged. No index is assigned until the score inputs are complete.</p><div>${unscored.map(item => `<button data-record="${escape(item.id)}">Inspect ${escape(item.id)} ${icon('arrow')}</button>`).join('')}</div></div></div>` : ''}
      <footer class="ranking-table-foot">${icon('info')} Unvalidated review-attention index. Lower values indicate fewer fixture-defined review flags, not lower predicted toxicity. Equal indices use patient ID order.</footer>
    </section>`;
  }

  function renderDetail() {
    if (!record) return `<aside class="ranked-selected-panel ranking-detail-empty"><div class="empty-review-symbol">${icon('people')}</div><span class="eyebrow">THE PATIENT, IN CONTEXT</span><h3 id="ranked-patient-heading" tabindex="-1">A clearer path<br> to the next question.</h3><p>Select a record to connect the original exclusion, proposed rule, evidence, clinical profile, and remaining review steps.</p><div class="review-question-list"><span>01 <strong>Original exclusion</strong></span><span>02 <strong>Evidence for reconsideration</strong></span><span>03 <strong>All proposed rules</strong></span><span>04 <strong>Clinical profile & index</strong></span><span>05 <strong>Next expert review</strong></span></div></aside>`;
    const candidate = ranks.get(record.id);
    const original = record.original || baseline.records.find(item => item.id === record.id);
    const originalReasons = original?.exclusionReasons || [];
    const changes = record.changes || [];
    const changedSources = changes.flatMap(change => change.sourceIds || []);
    const barrierSources = original?.evaluations?.filter(evaluation => evaluation.result === 'FAIL').flatMap(evaluation => evaluation.sourceIds || []) || [];
    return `<article class="ranked-selected-panel" aria-labelledby="ranked-patient-heading"><div class="ranked-detail-heading"><div><span class="eyebrow">SELECTED SYNTHETIC RECORD</span><h3 id="ranked-patient-heading" tabindex="-1">${escape(record.id)}<span>${candidate ? `Candidate ${String(candidate.rank).padStart(2, '0')} of ${ranked.length}` : 'Unranked record'}</span></h3><p>${escape(originalReasons.length ? `Original barrier: ${originalReasons.join(' ')}` : record.note || 'Synthetic clinical case')}</p></div><div class="attention-index-card"><span>ILLUSTRATIVE REVIEW-ATTENTION INDEX</span>${Number.isFinite(profile.score) ? `<strong>${profile.score}<small>/100</small></strong>` : '<strong class="unranked-index">—<small>Unranked</small></strong>'}<small>Unvalidated · not a safety prediction</small></div></div>
      <div class="ranked-scenario-comparison"><div><span class="tiny-label">ORIGINAL PROTOCOL</span>${status(original?.status)}</div>${icon('arrow')}<div><span class="tiny-label">SELECTED SCENARIO</span>${status(record.status)}</div></div>
      ${renderRiskProfile({ record, profile, escape, icon })}
      <section class="review-pathway" aria-labelledby="pathway-heading"><div class="review-subheading"><div><span class="eyebrow">AN EXPLAINABLE REVIEW PATHWAY</span><h4 id="pathway-heading">Why this record is here.</h4></div>${icon('book')}</div>
        <div class="pathway-step"><span class="pathway-number">01</span><div><h5>Why was this patient originally excluded?</h5>${originalReasons.length ? `<ul>${originalReasons.map(reason => `<li>${escape(reason)}</li>`).join('')}</ul>` : `<p>${original?.status === 'eligible' ? 'This record met the original modeled rules. It is not a newly matching candidate and receives no ranking.' : 'Unresolved required information prevented a complete original assessment.'}</p>`}</div></div>
        <div class="pathway-step"><span class="pathway-number">02</span><div><h5>What supports reconsideration?</h5><p>${changes.length ? changes.map(change => escape(change.reason)).join(' ') : selected.gate.active ? 'No criterion changed for this record. The original restriction or unresolved information remains relevant.' : 'No proposed change is active. Evidence references below describe the original barrier; they do not override it.'}</p>${changes.length ? `<div class="pathway-rule-ids">${changes.map(change => `<span class="mono">${escape(change.originalRuleId)} ${icon('arrow')} ${escape(change.ruleId)}</span>`).join('')}</div>` : ''}<div class="ranked-evidence-list">${sourceButtons(changes.length ? changedSources : barrierSources)}</div></div></div>
        <div class="pathway-step"><span class="pathway-number">03</span><div><h5>Does the patient meet every proposed rule?</h5><p>${record.status === 'eligible' ? 'All applicable modeled criteria pass under the active scenario. This result is a rule comparison, not approval to enroll.' : record.status === 'excluded' ? `No. ${escape((record.exclusionReasons || []).join(' '))}` : `The result is indeterminate. ${escape((record.missingData || record.reasons || []).join(' '))}`}</p></div></div>
      </section>
      ${renderAudit ? `<div class="ranked-audit">${renderAudit(record)}</div>` : ''}
      <section class="next-review-steps" aria-labelledby="next-review-heading"><div class="review-subheading"><div><span class="eyebrow">BEFORE INCLUSION COULD BE CONSIDERED</span><h4 id="next-review-heading">The next clinical questions.</h4></div>${icon('shield')}</div><ol>${(profile.nextSteps || []).map(step => `<li><div><strong>${escape(step.title)}</strong><p>${escape(step.detail)}</p>${step.sourceIds?.length ? `<div class="step-source-links">${sourceButtons(step.sourceIds)}</div>` : ''}</div></li>`).join('')}</ol></section>
      <div class="ranked-profile-disclaimer">${icon('info')}<p>${escape(profile.disclaimer)}</p></div>
    </article>`;
  }

  return `<div class="ranked-review-workspace">${renderTable()}${renderDetail()}</div>`;
}
