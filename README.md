# Cohort — one SYN-217 trial

Cohort is a fictional oncology-trial review workspace with **one shared cohort of 500 synthetic patients**. Every patient is evaluated against Core requirements plus **HIV, BRAIN, OLDER, ACCESS, COGNITIVE, PRIOR, PREG and RENAL**. These are domains on the same patient, not separate studies.

The default is **Original**. **Proposed inclusive** evaluates the same observations against the complete proposed protocol. A patient meets the full modeled inclusion rules only when all applicable medical **and participation** requirements pass. Medical status and participation status remain separately inspectable. A modeled match is not enrollment approval.

## Run and verify

```sh
npm ci
npm run dev
npm test
npm run check
npm run build
npm run generate
```

The development server defaults to `http://localhost:5173`; `PORT=5175 npm run dev` selects another port. `dist/` is the static production build, including local Motion/Three.js bundles and licenses. No backend, API key or model service is required.

`npm run generate` reproducibly exports [data/syn217-unified.json](data/syn217-unified.json). Edit the versioned protocol and generator definitions, regenerate the export, then refresh the application. The application uses those same deterministic definitions; editing the generated export alone does not install a new cohort. The previous renal-only generator remains available as `npm run generate:legacy` for archived regression work.

State, profile additions and actual review annotations belong to the current browser tab. Reload clears them. Reset restores the original 500 records and retains the actual local event history.

## Exact demonstration

1. Start in **Patient Review → SYN-0001**. HIV, brain metastases, older age, controlled cardiac history, access support, assisted consent, another malignancy and renal impairment coexist on this record. The overview exposes all nine domain controls, including Core.
2. Apply **Proposed inclusive**. SYN-0001 meets all 18 modeled requirements. Open any domain for actual observations, active checks, original/proposed comparisons and the authored policy basis.
3. Open **Trial Strategy**. **Patient × Criterion** is first: 25 patients per page, nine grouped domain columns, independent results and a selected-patient explanation of why the person meets the rules, is excluded or remains indeterminate.
4. Inspect **SYN-0002** for a retained interaction, **SYN-0003** for missing CD4 information, **SYN-0004** for pending accommodations, **SYN-0005** for pending consent, **SYN-0006** for a fixed pregnancy restriction and **SYN-0007** for an original-protocol match.
5. Use **Patient group**, **Full inclusion result**, the individual patient picker or **Show N people**. These filter the same cohort and preserve the complete evaluation of every domain.
6. Trial Strategy also has **Eligibility changes**, **Exclusion reasons** and **Population composition**. Composition uses **Gender**, without a Sex control, and one joint **Race/Ethnicity** view that retains both recorded fields. Unknown/not-collected values and both denominator definitions stay visible.
7. In **Decision Review**, inspect the mapped FDA passages, documentation gaps and substantive questions. A source link is not a reviewer approval. Recording a rationale creates an unauthenticated demo annotation and never changes eligibility.
8. Open **Review packet** for HTML/print and JSON. The packet includes all people, both protocols, filtered IDs, every explanation, evidence and actual actions. **Presentation** walks through the same shared trial in twelve scenes with five minutes of configurable speaking time.

## Data, rules and source boundaries

- [src/unified-protocol.js](src/unified-protocol.js): editable domain/field definitions, units, 18 criteria, original/proposed predicates, thresholds, scenario revisions and authored-policy sources.
- [src/unified-cohort.js](src/unified-cohort.js): seven hand-authored demonstration records plus 493 reproducible mixed-condition records; validation and adaptation into the existing eligibility engine.
- [src/unified-analysis.js](src/unified-analysis.js): immutable shared analyses, distinct medical/participation results, domain results, explanations, demographics and normalized exports.
- [src/unified-views.js](src/unified-views.js): patient inspector, matrix, criterion comparisons, joint composition, protocol/source inspection, profile form and reports.

Clinical defaults are authored simulation assumptions. They are **not FDA eligibility criteria, clinical recommendations or empirical SYN-217 safety evidence**. General guidance is kept separate from the new `authored-demo-assumption` sources, which can authorize only explicitly synthetic scenarios. Fixed medication, cardiac and pregnancy restrictions cannot be overridden by a favorable score or an unrelated revision.

All criteria are evaluated independently. Aggregate precedence is **FAIL > UNKNOWN > PASS**, including participation requirements. Pending accommodation or consent information is UNKNOWN; an explicitly unmet required condition is FAIL. Known absence can make a condition-specific check not applicable; missing status cannot. Pregnancy applicability is explicitly assessed and never inferred from gender.

Laboratory checks require correct units and valid sample dates within the authored **30-day** window relative to **2026-11-01**. No numerical string or alternative unit is silently converted by the engine. Profile forms validate explicit user input; unanswered fields remain unknown.

The existing review-attention index covers **core factors only**. It does not model HIV, brain-metastasis, pregnancy or participation risk. It is unvalidated and is not a probability of harm. Ranking is restricted to newly matching patients with complete index inputs; other matching patients remain visible without a numerical rank. Age, gender, race and ethnicity add no points.

## Export schema

Unified review packets use `schemaVersion: "2.0.0"`. Each raw patient is stored once in `analysis.patients`. Complete criterion evaluations are stored once per protocol in `analysis.original.records` and `analysis.proposed.records`.

`analysis.current.evaluationsFrom` identifies the active canonical collection. Each patient explanation retains its narrative, evidence, actions and blockers; `factsRef` and `criteriaRef` resolve to raw observations and canonical evaluations by patient ID. The selected `decisionBrief` is also included in full. Protocol definitions supply criterion titles, domains, scopes and field mappings. `analysis.fieldDefinitions` supplies the shared field dictionary. Blocker `textRef` and retaining-evidence `useRef` resolve their exact text in the canonical evaluation collection. This avoids serializing repeated snapshots while preserving the full calculation and provenance.

Archived reference/case-pack fixtures remain available to tests and internal compatibility APIs. They are not offered as datasets in the main application. Their historical outcome counts and reference ranking remain regression checks, not expectations for this new cohort.

## Verification and remaining review

The current frozen cohort produces **24 / 469 / 7** original and **153 / 263 / 84** proposed meets/excluded/indeterminate results. **131 newly match**; two original matches become indeterminate because the proposed renal rule requires a documented stability assessment. Counts come from the engine and reconcile to all 500 people.

The full suite passes **224 tests**, retaining the previous clinical/ranking/controller regressions and adding 20 unified-trial checks. Syntax checks and the static production build pass. The [unified-trial handoff](docs/unified-trial/HANDOFF.md) records browser checks, screenshots, remaining clinical decisions and export verification.

Ehsan must validate real protocol requirements, drug evidence, laboratory interpretation and participation procedures. Imtenan must assess guidance applicability and recordkeeping requirements. No clinical validation, authenticated production review storage, full cross-browser/accessibility certification or real enrollment capability is established. Original secondary research-note text remains unavailable; none has been reconstructed.
