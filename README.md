# Cohort — Live Trial Review Studio

A frontend-only synthetic trial-review studio with connected Patient Review, Trial Strategy, and Decision Review perspectives. A pure deterministic engine applies versioned criteria; one immutable analysis snapshot drives the 3D population, accessible table, age comparison, evidence trace, and review packet.

## Run

Node.js 18 or newer. The only runtime library is locally installed, pinned Three.js 0.187.0. No API keys, remote assets, model service, or backend are required.

```sh
npm ci
npm run dev
# http://localhost:5173
npm run check
npm test
npm run build
```

`dist/` is the static build, including local Three.js modules and its MIT license. Serve it at a site's root. To use a different local port: `PORT=5174 npm run dev`. State and events are held in this browser tab: perspective changes preserve the run, selection, filters and working dataset. Reload clears the session. Reset restores the immutable 20-record baseline while retaining the current session's actual history.

## Three-minute demonstration

1. Open Patient Review. The baseline loads 20 actual synthetic records and selects P03. Inspect its original exclusion, side-by-side modeled outcomes, proposed index preview and applicability limitation. Open a source reference to read the fictional summary.
2. Select **Proposed renal**. Six records move into the newly matching group; P16 moves to indeterminate. Counts and classifications update before geometry animates. There is one real marker per loaded record, never decorative extra patients.
3. Filter **Newly matching** for the computed ranking: P13 (14), P02 (24), P19 (27), P09 (36), P03 (39), P11 (43). P03's additive factors are 23 renal + 5 ECOG + 8 hepatic + 3 hypertension. The illustrative index is not a probability of harm.
4. Clear filters and select P06: its medication exclusion remains active. Select P16: missing hepatic information remains unresolved. Use the table, scene markers, search, previous/next buttons, or queue arrow keys to select a patient.
5. Switch to **Trial Strategy**. The same analysis compares 4/20 (20%) with 10/20 (50%). Click an age bar to filter the same patient IDs; whole-cohort denominators remain labelled. Missing demographic/reference data stay explicit.
6. Switch to **Decision Review**. Inspect source → criterion → inputs → outcomes → index factors → actual review action. Record a demo disposition with a rationale, then open the review packet and print/PDF or export JSON.
7. **Review a profile** evaluates a structured draft outside cohort totals. Only **Add synthetic profile to working cohort** adds it and creates a dataset version. Reset restores the baseline. All boolean fields default to unknown; new records never inherit baseline stability assumptions.
8. **Study tools** preserves protocol, criterion desk and boundary explorer. Advanced scenario options demonstrate withheld draft/ECOG revisions. The 120-record seeded dataset is still available. The scene has a working 2D toggle and automatic WebGL fallback.

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
- `src/workspace.js`: immutable runs, shared presentation state, age/subgroup metrics, AND filters, scratch validation, working versions, actual local events and dispositions.
- `src/studio.js` / `src/studio.css`: persistent shell, connected perspective controls, evidence/profile/tool dialogs, keyboard/focus continuity, responsive and print flow.
- `src/studio-patient.js` / `src/studio-patient.css`: patient queue, original/proposed criteria, factor contributions, evidence applicability, next review and structured synthetic-profile form.
- `src/constellation.js` / `src/constellation.css`: one locally rendered WebGL scene, deterministic categorical layout, record picking, geometry transitions, idle pause, and equivalent 2D fallback. Layout has no quantitative spatial or risk meaning.
- `src/studio-views.js`: trial composition, source-to-decision trace, current-state review packet and JSON export. `src/study-tools.js` preserves the original study/criterion/boundary tools.
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

The official guidance references provide general context, not proof supporting SYN-217 rules. The drawer identifies registry paraphrases and missing document versions/passage identifiers honestly. Ehsan and Imtenan must verify source status and applicability before real claims. SYN-217 evidence is fabricated and cannot establish real treatment safety.

### The renal-stability distinction

The supplied raw JSON has no longitudinal renal-stability field. The pre-existing adapter in `src/patients.js` assigns `renal_stable: true` to anchor cases to reproduce the established modeled scenario. This milestone preserves that rule and regression adapter, labels its provenance, and separately states that evidence applicability is not established. Evaluating raw records without the adapter is a different input and yields a different result. New synthetic drafts use explicit yes/no/unknown stability and never inherit the assumption.

## Illustrative ranking configuration

`src/review-fixture.js` contains all index inputs. The supplied formula is renal **12 + (60 − eGFR)** for the fixture window **45 ≤ eGFR < 60**, ECOG 1 **+5**, mild hepatic impairment **+8**, controlled hypertension **+3**, stable type 2 diabetes **+5**, stable cardiac history **+10**, capped at **100**. Age contributes no points. These are arbitrary demonstration coefficients, not validated medical risk weights.

`rankCandidates(cohort)` includes only newly matching records with an active approved demonstration rule, explicit passing criterion results, and complete index context. Excluded, indeterminate, originally matching, and unsupported-scenario records remain unranked. Missing or contradictory contextual fields withhold the score; they are never imputed as zero. Unscored newly matching records remain visible for further context review. Equal indices use natural numeric patient-ID order, then exact ID text, independent of input order.

`getReviewProfile(record)` returns index components, six fact-based dimensions, the original exclusion reasons, supporting evidence references, and fixture-based review tasks. It preserves the actual `criterionResult` separately when a profile dimension needs more context. Scores are not calibrated, do not predict drug toxicity, and cannot independently approve enrollment.

## Verification and limits

The suite currently includes 88 passing tests: all 53 existing engine/ranking regressions, 21 shared-workspace checks, 3 constellation-layout checks, and 11 view/report integration checks. It retains the 1,260 exhaustive multi-condition combinations. The new checks cover immutable run identity, age/count reconciliation, linked filters, tri-state validation, scratch isolation, explicit addition/version/reset, actual dispositions, complete reports, and exact marker identities. `npm run check` syntax-checks every source module; no separate lint task is configured.

Browser verification used Chrome 157 at 1440×900, 375×812, 812×375 and 768×1024. The connected journey, profile addition/reset, shared filters, keyboard tabs, evidence, real dispositions, JSON download, A4 print/PDF, reduced motion and forced no-WebGL fallback were exercised. Screenshots and export checks are local QA artifacts under ignored `output/playwright/`; these browser checks are separate from `npm test`.

Three.js is MIT-licensed; its license ships in `dist/vendor/LICENSE`. All scene geometry is generated locally. There are no remote models, fonts or other licensed visual assets on the critical path.

No real clinical validation, adverse-event prediction, live model activity, real patient data, or independent enrollment approval is provided. Qualified medical and regulatory review is required for any real-world use.
