# Cohort — evidence-gated eligibility review

A frontend-only protocol-review prototype. A pure deterministic engine applies versioned criteria to synthetic records; the interface shows which explicit rule changed a result, the supporting fictional evidence, and every unchanged restriction.

## Run

Node.js 18 or newer; no dependencies, installation, API keys, or backend.

```sh
npm run dev
# http://localhost:5173
npm run check
npm test
npm run build
```

`dist/` is the static build. Serve it at a site's root. The existing local preview reads source files; refresh after edits. State is local to the page, survives stage navigation, and resets on refresh or Reset demo.

## Two-minute demonstration

1. Open the sample study, then the review. Inspect the renal criterion and fictional PK packet. Official FDA context stays separately labeled. The supplied 20-patient casebook is now the default.
2. Include the **approved demonstration rule**. Open Population → **Patient review** to see the ranked newly matching candidates.
3. Review the ascending illustrative index: P13 (14), P02 (24), P19 (27), P09 (36), P03 (39), P11 (43). Select a row for the factor profile, original exclusion, evidence pathway, full criterion comparison, and remaining expert-review tasks. The index is unvalidated and never changes eligibility.
4. Inspect P02 (newly meets modeled criteria), P06 (medication exclusion remains active), P16 (becomes indeterminate), P19 (inclusive boundary), and P20 (immediately below it).
5. Select an evidence-supported draft or the ECOG candidate awaiting review. The gate withholds the change, explains why, and keeps all original rules active.
6. Switch to **Population map** to retain the dot visualization and predefined boundary explorer. Both views support the 20 supplied cases and the seeded 120-record expanded cohort. Counts are calculated locally, not hardcoded in the interface.
7. Open Report. It includes the current cohort, gate outcome, rule versions, changed records, source references, and assumptions. Print report opens the browser print flow for Save as PDF.

The two cohort results, written as meets / excluded / indeterminate:

| Cohort | Original | Approved renal scenario | Newly meets | Classification changes |
|---|---|---|---:|---:|
| Supplied 20 | 4 / 15 / 1 | 10 / 8 / 2 | 6 | 7 |
| Expanded 120, seed 217 | 22 / 88 / 10 | 37 / 72 / 11 | 15 | 16 |

The extra classification change is a record becoming indeterminate, not eligible. Eligibility expansion never cancels another failed criterion.

## Architecture and main functions

- `src/clinical-fixture.js`: `clinicalConfig` and the reduced supplied `demoCase`; all executable thresholds, units, criterion definitions, rule versions, evidence references, and scenario approval states.
- `src/cohort.js`: pure `resolveScenario(config, requested)`, `evaluatePatient(patient, requested, config)`, and `evaluateCohort(patients, requested, config)`. `requested` is `false`, `true` (approved renal scenario), or an explicit predefined scenario ID.
- `src/patients.js`: `anchorPatients` preserves the 20 supplied cases, adding an explicit synthetic renal-stability assumption. `generateCohort(count=120, seed=217)` adds reproducible clinical variation.
- `src/data.js`: editable product/study narrative, review copy, and source-display metadata. It adapts the structured fixtures for the existing workspace.
- `src/explorer.js` / `src/explorer.css`: population comparison, evidence-gate states, boundary explorer, and patient-level criterion audit.
- `src/ranking.js`: `scoreReviewAttention`, `getReviewProfile`, and `rankCandidates`, a pure review layer after eligibility.
- `src/review-fixture.js`: editable index formula, coefficients, six profile dimensions, disclaimers, and expert-review task copy transcribed from the supplied fictional case.
- `src/patient-review.js` / `src/patient-review.css`: ranked table, status groups, selected-patient profile, evidence pathway, and review tasks.
- `src/app.js` / `src/styles.css`: four-stage workspace, evidence drawer, state, reset, report, responsive layout, and print styling.
- `tests/cohort.test.js`: deterministic examples, boundaries, adversarial evidence/config cases, provenance and reproducibility checks, and exhaustive condition combinations.
- `tests/ranking.test.js`: exact index/ranking regressions, ties, cap and configuration changes, missing context, profiles, review steps, and eligibility separation.

The engine evaluates every criterion without short-circuiting. `FAIL` makes the aggregate excluded; if none fail, `UNKNOWN` makes it indeterminate; only all `PASS` yields meets modeled criteria. Unknown results remain in the audit even when an independent failure already excludes the record.

A proposed scenario either passes the full gate or falls back to the complete original protocol. Fixed restrictions are never replaced. Each changed criterion records original/current results, original/current rule IDs, reason, and supporting source IDs. Overall `statusChanged` and `newlyEligible` are separate. The reviewer-attention index is computed only after all proposed eligibility criteria pass and the record is newly matching. It cannot alter any clinical classification. No language-model-generated eligibility logic is used.

## Rule and evidence configuration

Rules use an allowlisted declarative format, not executable strings:

```js
{
  id: 'renal-original-v1', version: '1.0.0', criterionId: 'RENAL',
  field: 'egfr_ml_min_1_73m2', operator: 'gte',
  value: thresholds.renalOriginalMin, min: 0,
  unit: 'mL/min/1.73 m²', sourceIds: ['SYN-PK-01', 'SYN-PK-02']
}
```

Supported predicates: `gte`, `lte`, `in`, `equals`, and nested `all` / `any`. Values are strictly typed; missing, contradictory, invalid, or explicitly mismatched-unit observations produce `UNKNOWN`. No automatic clinical unit conversion is performed. Unchanged criteria retain the protocol's original rule IDs.

```js
{
  id: 'renal-revision', version: '1.0.0',
  status: 'approved-demo', syntheticOnly: true,
  revisions: [{
    criterionId: 'RENAL', ruleId: 'renal-revised-v1',
    evidenceIds: ['SYN-PK-01', 'SYN-PK-02']
  }]
}
```

Evidence must exist in the registry, have `status: 'supporting'`, be drug-specific fixture evidence, and list the exact rule in `supportsRuleIds`. Every evidence reference required by the rule must be supplied. Missing, insufficient, conflicting, ambiguous, unversioned, or unsupported configurations withhold execution. General FDA guidance cannot substitute for drug-specific evidence.

Workflow labels remain distinct: **Approved demonstration rule**, **Evidence-supported draft change**, and **Awaiting medical review**. Approval means synthetic demonstration only, never clinical approval.

## For Ehsan and Imtenan

Edit `src/clinical-fixture.js` to review or replace:

- Renal boundary and standard units; adult inclusion and ECOG categories.
- Hepatic categories and cardiac/medication restrictions.
- The renal-stability definition and the added stability assumption on anchor cases.
- Evidence sufficiency, rule-to-evidence links, scenario approval, and monitoring requirements.
- The clinical meaning and scope of every input field. Disease, prior-treatment, and consent conditions remain explicit study-scope assumptions rather than independently verified data.

`src/patients.js` contains the synthetic cohort, and `src/data.js` contains narrative/source presentation. Update fixtures and tests together when expected outcomes intentionally change. The original `cohort_syn217_starter/syn217_demo_case.json` material is preserved as the initial case source of truth. Its illustrative attention index is now implemented only as an unvalidated reviewer-attention measure, never an eligibility rule or toxicity probability.

The FDA documents provide nonbinding general context. Their metadata was checked against live official pages/PDFs. Performance-status guidance does not endorse the unchanged fictional ECOG limit. SYN-217 evidence is fabricated and cannot establish real treatment safety.

## Illustrative ranking configuration

`src/review-fixture.js` contains all index inputs. The supplied formula is renal **12 + (60 − eGFR)** for the fixture window **45 ≤ eGFR < 60**, ECOG 1 **+5**, mild hepatic impairment **+8**, controlled hypertension **+3**, stable type 2 diabetes **+5**, stable cardiac history **+10**, capped at **100**. Age contributes no points. These are arbitrary demonstration coefficients, not validated medical risk weights.

`rankCandidates(cohort)` includes only newly matching records with an active approved demonstration rule, explicit passing criterion results, and complete index context. Excluded, indeterminate, originally matching, and unsupported-scenario records remain unranked. Missing or contradictory contextual fields withhold the score; they are never imputed as zero. Unscored newly matching records remain visible for further context review. Equal indices use natural numeric patient-ID order, then exact ID text, independent of input order.

`getReviewProfile(record)` returns index components, six fact-based dimensions, the original exclusion reasons, supporting evidence references, and fixture-based review tasks. It preserves the actual `criterionResult` separately when a profile dimension needs more context. Scores are not calibrated, do not predict drug toxicity, and cannot independently approve enrollment.

## Verification and limits

The unit suite passes 53 tests (35 eligibility and 18 ranking/profile checks), including all requested patient cases and 1,260 multi-condition combinations, including inclusive boundaries and neighbors; fixed/overlapping exclusions; missing/conflicting observations; unit mismatches; missing/insufficient/conflicting/foreign evidence; draft approval; malformed and ambiguous rule IDs; reversibility, determinism, and count reconciliation.

No real clinical validation, adverse-event prediction, live model activity, real patient data, or independent enrollment approval is provided. Qualified medical and regulatory review is required for any real-world use.
