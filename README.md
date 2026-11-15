# Cohort — Live Trial Review Studio

A frontend-only synthetic trial-review studio with connected Patient Review, Trial Strategy, and Decision Review perspectives. A pure deterministic engine applies versioned criteria; one immutable analysis snapshot drives the 3D population, accessible table, age and demographic composition, evidence trace, and review packet.

## Run

Node.js 18 or newer. Runtime libraries are locally installed, pinned Three.js 0.187.0 and free Motion 14.14.0. No API keys, remote assets, model service, or backend are required.

```sh
npm ci
npm run dev
# http://localhost:5173
npm run check
npm test
npm run build
```

`dist/` is the static build, including local Three.js/Motion bundles and their MIT licenses. Serve it at a site's root. To use a different local port: `PORT=5174 npm run dev`. State and events are held in this browser tab: perspective changes preserve the run, selection, filters and working dataset. Reload clears the session. Reset restores the selected dataset's immutable baseline (500 or 20), removes its working additions, and retains the current perspective, other dataset working copy and actual session history.

## Three-minute demonstration

1. Patient Review opens **Expanded cohort — 500 synthetic patients**. Select **Proposed renal**, then **Newly matching**. The paginated queue includes all 80 new matches; 78 have complete attention-index inputs, while two remain unscored. The population overview aggregates all 500 records into four proportional segments of a sculptural ring. Select a segment to inspect up to six labelled patient spheres (three on a phone); exact ranges and paging keep every record accessible. Open **Patients 500** for the complete searchable, ranked table in a persistent drawer. Segment focus does not change analysis filters or counts.
2. Select SYN-0005. Compare the original renal exclusion and proposed result, inspect every criterion and factor, then open its fictional renal evidence. A generated stability flag and one dated measurement do not establish longitudinal stability.
3. Open **Next review** and record a clinical-review flag, information request, retained restriction or reviewer note with a rationale. These actual annotations do not change eligibility or approve inclusion.
4. Open **Trial Strategy**. Compare 153/500 with 233/500, then inspect Age, Sex, Gender, Race, Ethnicity or Site. Click a category and open its exact patients. Whole-cohort denominators remain fixed; active filters appear as removable chips.
5. Open **Decision Review — Regulatory Review — Simulation**. Trace source → criterion → patient inputs → outcomes → index factors → actual review action. Export the current review packet to JSON or print/PDF.
6. **Review a profile** evaluates a draft outside cohort totals. Only **Add synthetic profile to working cohort** versions the dataset. Reset restores the selected baseline. Unknown, not collected and recorded No remain distinct.
7. Select **Reference case — 20 synthetic patients** for the rehearsed regression. Under proposed renal, its exact ranking remains P13 (14), P02 (24), P19 (27), P09 (36), P03 (39), P11 (43). Inspect P06's retained interaction exclusion and P16's unresolved hepatic information. The demonstration guide explicitly switches to this reference dataset.
8. **Study tools** retains the protocol, criterion desk and boundary explorer. Advanced options demonstrate withheld draft/ECOG revisions. The scene supports keyboard-accessible 2D and automatic no-WebGL fallbacks; the precise table is always retained.

Counts below are calculated outcomes, not generator targets. Values are **meets modeled rules / excluded / indeterminate**:

| Cohort | Original | Proposed renal | Newly meets | Classification changes |
|---|---|---|---:|---:|
| Supplied reference 20 | 4 / 15 / 1 | 10 / 8 / 2 | 6 | 7 |
| Expanded 500, seed 217 | 153 / 312 / 35 | 233 / 212 / 55 | 80 | 100 |

Twenty expanded records become indeterminate rather than matching. Every ranked record passes all proposed criteria. Two newly matching records lack required index context and remain unscored. An index cannot cancel an exclusion or unknown.

## Reproduce and inspect the showcase

```sh
npm run generate -- --seed 217 --count 500 --as-of 2026-11-01 --output output/showcase-cohort.json
```

Edit `src/synthetic-config.js` (SYN217-SHOWCASE **v2.0.0**) for seed, count, fixed date, profile mixture, missingness and synthetic demographic distributions. `src/synthetic-cohort.js` generates records without importing or resampling against the eligibility engine. Clinical and demographic streams are independent. Categories are validated. The clinical profiles are authored assumptions, not epidemiological estimates. They generate coherent variation; deliberately malformed/conflicting records live separately in `src/challenge-cases.js` and never enter ordinary analytics.

Actual default summaries, each with denominator **500**:

| Dimension | Screened records |
|---|---|
| Age | Under 65: 167; 65–74: 163; 75+: 169; missing: 1 |
| Sex as recorded | Female 206; Male 239; Intersex 12; Unknown 12; Not collected 31 |
| Gender as recorded | Woman 184; Man 235; Non-binary 47; Another recorded gender 1; Unknown 11; Not collected 22 |
| Race as recorded | White 169; Black or African American 112; Asian 94; Multiple recorded groups 49; American Indian or Alaska Native 33; Native Hawaiian or Other Pacific Islander 9; Unknown 15; Not collected 19 |
| Ethnicity as recorded | Hispanic or Latino 89; Not Hispanic or Latino 367; Unknown 25; Not collected 19 |
| Fictional site | DEMO-A 127; DEMO-B 108; DEMO-C 92; DEMO-D 76; DEMO-E 56; Unknown 18; Not collected 23 |

Clinical profile counts: preserved function 117, controlled metabolic 124, renal review 98, complex organ 85, functional restriction 43, interaction restriction 33. Missing renal measurements: 36 (13 unknown, 23 not collected); hepatic status: 26 (19 unknown, 7 not collected); renal stability: 24 (13 unknown, 11 not collected). Missingness can overlap and must not be summed into a unique-patient total. The generator command emits all category matching counts and clinical missingness counts as JSON. No reference population, geographic coverage or demographic representativeness is claimed.

## Shared visual and motion system

`src/tokens.css` is the authoritative color, radius, control-size and motion layer. Light reading surfaces use one teal theme; the population stage uses dark navy. Existing matches use slate blue, new matches teal, exclusions coral and indeterminate records amber, paired with labels and symbols. Categorical composition colors carry no clinical valence. Text variants meet AA contrast in their tested pairings.

`src/motion.js` shares timing with the Three.js stage and uses the locally served free Motion runtime for interruptible 600ms ring/camera transitions and 680ms scenario transitions. Panel transitions remain 220ms; feedback 140ms. Scenario summaries describe actual calculated transfers. Motion MCP was not connected during this pass; the installed skill and current official documentation informed the implementation. Reduced motion commits final positions immediately, and a missing animation bundle leaves the stage functional without animated transitions.

The 3D stage uses a tilted, rounded, capped ring with satin materials, a locally generated lighting environment and contact shadows. Segment angles encode whole-cohort counts, with small empty separator gaps; zero-count groups keep a label but receive no artificial arc. Shared filters highlight each segment's exact matching fraction while preserving its total angle and explicit matching/whole labels. The center always shows loaded records. This is a grouped overview, not one visible patient per loaded record.

Focused inspection retains the ring and draws at most six patient spheres in one instanced mesh, with 84px labelled targets and 16px gaps. Capacity adapts to actual container width. New matches follow the existing ranking, with unscored matches last; other groups use natural ID order. The complete table retains every loaded ID. Table commits locate the exact group/page and close the drawer; arrow keys browse rows across pages without selecting, while Enter/Space commits. Search, filters, page and scroll survive drawer reopening. Escape closes it and restores focus. Mobile Back preserves the selection's scene or table origin, including detail stepping.

Dataset changes and Reset return the scene to overview. Scenario changes preserve the focused group, explain an out-of-group selection and provide Locate. Reset view changes presentation only. Rendering settles when idle and pauses when hidden. The equivalent SVG 2D view and automatic WebGL fallback preserve group navigation, complete paging and keyboard controls. Sphere size and placement carry no clinical risk meaning. Geometry buffers are reused during animation, with no remote models or assets.

## Architecture and main functions

- `src/clinical-fixture.js`: `clinicalConfig` and the reduced supplied `demoCase`; all executable thresholds, units, criterion definitions, rule versions, evidence references, and scenario approval states.
- `src/cohort.js`: pure `resolveScenario(config, requested)`, `evaluatePatient(patient, requested, config)`, and `evaluateCohort(patients, requested, config)`. `requested` is `false`, `true` (approved renal scenario), or an explicit predefined scenario ID.
- `src/patients.js`: `anchorPatients` preserves the 20 supplied cases, adding an explicit synthetic renal-stability assumption. `generateCohort(count=120, seed=217)` remains only for legacy engine regressions; the UI uses the separate profile-based showcase generator.
- `src/data.js`: editable product/study narrative, review copy, and source-display metadata. It adapts the structured fixtures for the existing workspace.
- `src/explorer.js` / `src/explorer.css`: population comparison, evidence-gate states, boundary explorer, and patient-level criterion audit.
- `src/ranking.js`: `scoreReviewAttention`, `getReviewProfile`, and `rankCandidates`, a pure review layer after eligibility.
- `src/review-fixture.js`: editable index formula, coefficients, six profile dimensions, disclaimers, and expert-review task copy transcribed from the supplied fictional case.
- `src/patient-review.js` / `src/patient-review.css`: ranked table, status groups, selected-patient profile, evidence pathway, and review tasks.
- `src/workspace.js`: immutable runs, shared study/dataset/scenario identity, age/demographic/subgroup metrics, AND filters, pagination, scratch validation, working versions and run-scoped actual review annotations.
- `src/inspection.js` / `src/composition.js`: exact composition counts, category-linked inspection, clinical missingness, provenance and reusable review controls.
- `src/synthetic-config.js` / `src/synthetic-cohort.js`: editable versioned assumptions and deterministic independent generation.
- `tests/showcase.test.js` / `tests/theme.test.js`: generator coherence, identities/dates, demographic independence, reconciliation, linked reports/tools, selected-dataset Reset and token contrast.
- `src/studio.js` / `src/studio.css`: persistent shell, connected perspective controls, evidence/profile/tool dialogs, keyboard/focus continuity, responsive and print flow.
- `src/studio-patient.js` / `src/studio-patient.css`: patient queue, original/proposed criteria, factor contributions, evidence applicability, next review and structured synthetic-profile form.
- `src/population-layout.js`: deterministic clinical group registry, ranked/filtered group membership, accessible page capacity and actual scenario-transfer summaries.
- `src/ring-geometry.js`: preallocated capped, rounded band geometry and exact filtered-color boundaries.
- `src/population-stage.js` / `src/constellation.css`: proportional ring, paged patient spheres, exact picking, keyboard navigation, patient location, Motion transitions, idle pause and equivalent 2D fallback. `src/constellation.js` preserves the scene entry point.
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

`src/patients.js` preserves the reference case; `src/synthetic-config.js` contains expanded generation assumptions; `src/data.js` contains narrative/source presentation. Update fixtures and tests together when expected outcomes intentionally change. The original `cohort_syn217_starter/syn217_demo_case.json` material is preserved as the initial case source of truth. Its illustrative attention index is now implemented only as an unvalidated reviewer-attention measure, never an eligibility rule or toxicity probability.

The official guidance references provide general context, not proof supporting SYN-217 rules. The drawer identifies registry paraphrases and missing document versions/passage identifiers honestly. Ehsan and Imtenan must verify source status and applicability before real claims. SYN-217 evidence is fabricated and cannot establish real treatment safety.

### The renal-stability distinction

The supplied raw JSON has no longitudinal renal-stability field. The pre-existing adapter in `src/patients.js` assigns `renal_stable: true` to anchor cases to reproduce the established modeled scenario. This milestone preserves that rule and regression adapter, labels its provenance, and separately states that evidence applicability is not established. Evaluating raw records without the adapter is a different input and yields a different result. New synthetic drafts use explicit yes/no/unknown stability and never inherit the assumption.

## Illustrative ranking configuration

`src/review-fixture.js` contains all index inputs. The supplied formula is renal **12 + (60 − eGFR)** for the fixture window **45 ≤ eGFR < 60**, ECOG 1 **+5**, mild hepatic impairment **+8**, controlled hypertension **+3**, stable type 2 diabetes **+5**, stable cardiac history **+10**, capped at **100**. Age contributes no points. These are arbitrary demonstration coefficients, not validated medical risk weights.

`rankCandidates(cohort)` includes only newly matching records with an active approved demonstration rule, explicit passing criterion results, and complete index context. Excluded, indeterminate, originally matching, and unsupported-scenario records remain unranked. Missing or contradictory contextual fields withhold the score; they are never imputed as zero. Unscored newly matching records remain visible for further context review. Equal indices use natural numeric patient-ID order, then exact ID text, independent of input order.

`getReviewProfile(record)` returns index components, six fact-based dimensions, the original exclusion reasons, supporting evidence references, and fixture-based review tasks. It preserves the actual `criterionResult` separately when a profile dimension needs more context. Scores are not calibrated, do not predict drug toxicity, and cannot independently approve enrollment.

## Verification and limits

`npm test`: **120 passed, 0 failed**, retaining the reference engine/ranking regressions and 1,260 exhaustive condition combinations. Coverage includes determinism, types/categories/units/dates, coherent cardiac states, missingness, independent demographic streams, unique IDs, all 500 group/table identities, complete candidate ranking, exhaustive focused-page coverage, responsive patient location, filter/chart/report reconciliation, actual review actions, boundary-tool filters, scratch isolation, dataset-specific Reset, separate challenge cases and contrast. `npm run check` syntax-checks every source module; `npm run build` creates the static bundle. No separate lint task is configured.

Chrome 157 ring verification passed **47 browser workflow checks** across the development server and an independently served static build at 1440×900 desktop, 1280×800 laptop and 375×812 mobile. Checks covered all 80 new-match sphere pages, exact reference ranking, queue search/focus/keyboard commit behavior, page/scroll preservation, linked filtering, scenario reversal, 20/500 switching, Reset, Trial/Decision perspective continuity, mobile return paths and detail stepping, empty states, canvas picking, interrupted Motion, reduced motion, idle/hidden rendering, SVG 2D switching, automatic no-WebGL fallback and a missing Motion bundle. No runtime errors occurred in either final normal-runtime flow. Intentional WebGL/Motion blocking was tested separately. Existing clinical, report and scratch-profile regressions remain covered by the test suite. Screenshots and QA scripts are under ignored `output/playwright/`. This is not a full accessibility certification or cross-browser/device benchmark.


Three.js and Motion are MIT-licensed; their licenses ship in `dist/vendor/LICENSE` and `dist/vendor/MOTION-LICENSE.md`. All scene geometry is generated locally. There are no remote models, fonts or other licensed visual assets on the critical path.

No real clinical validation, adverse-event prediction, live model activity, real patient data, or independent enrollment approval is provided. Qualified medical and regulatory review is required for any real-world use.
