# Exclusion Investigation handoff

This milestone adds eight independent case packs to Cohort's existing workspace. It preserves the theme, navigation, population ring, reference and expanded datasets, eligibility engine, original SYN-217 rules and ranking. Each pack has six authored anchors and 44 seeded variants: **400 additional synthetic people**, not a representative clinical population.

## Open and demonstrate

Run `npm ci`, then `npm run dev`, and open the printed localhost URL (default port 5173). The development preview used for this milestone is at `http://localhost:5175`. Use the existing **Dataset** selector; no new top-level navigation was added. Open **Case context & source** for the source, missing configuration and six anchor shortcuts. **Patients** opens the complete searchable table, including the linked **Investigation route** filter.

| Selector / dataset ID | Useful anchors and distinction |
|---|---|
| HIV / `case-hiv` | A remains excluded by the authored blanket protocol and receives protocol review; F meets its separately authored current protocol and receives screening-correction review. B retains its relevant medication concern; C needs information. |
| BRAIN / `case-brain` | A needs protocol review; F meets a snapshot allowing the explicitly assessed stable subgroup. Treatment and stability are alternatives in this authored snapshot, not a universal AND requirement. |
| OLDER / `case-older` | A separates a controlled historical condition from the retained blanket wording; F demonstrates screening interpretation. Age itself creates no exclusion or score. |
| ACCESS / `case-access` | A has confirmed support, B has proposed support, C lacks task/support information, E has an independent medical restriction, and F has procedure review pending. Medical matching and readiness remain separate. |
| COGNITIVE / `case-cognitive` | A has documented fictional task/support reviews; B and F retain separate pending consent-process or assessment-method review. A helper does not settle either question. |
| PRIOR / `case-prior` | A needs review of the blanket policy; F has active concurrent cancer with explicit favorable interference assessments. An active-cancer label is not a universal exclusion. |
| PREG / `case-preg` | A and F demonstrate separate research referrals; B retains an explicitly authored concern; C has unknown pregnancy status. No pregnancy inclusion scenario exists. |
| RENAL / `case-renal` | A compares original and proposed SYN-217 renal rules. E retains the hard interaction restriction; F requires correction of the renal metric. This is the only new pack with an executable proposed scenario. |

For each patient, inspect **Overview**, **Criteria**, **Evidence** and **Next review** in the existing detail panel. The Overview contains the Exclusion Investigation section. The source drawer shows the supplied case-specification passage and the missing-original-note status. **Trial Strategy** shows the current medical partition separately from overlapping review findings. **Decision Review** traces source, protocol/rules, inputs, outcomes and actual annotations. Open the existing **Current review packet** to export JSON or use Print / PDF.

## Generated outcomes

These are evaluated results for generator `COHORT-INVESTIGATION` v1.0.0, seed **2171**, fixed as-of date **2026-11-01**, six anchors plus 44 variants per pack. Generation does not import the evaluator or resample for a desired result. Each row has 50 distinct people. Different authored study contexts must not be combined into a trial-coverage percentage.

| Case | Meets current modeled medical rules | Excluded | Indeterminate | Recorded rejections | Screening discrepancies |
|---|---:|---:|---:|---:|---:|
| HIV | 14 | 36 | 0 | 43 | 11 |
| BRAIN | 17 | 33 | 0 | 43 | 10 |
| OLDER | 16 | 34 | 0 | 39 | 9 |
| ACCESS | 39 | 11 | 0 | 44 | 0 |
| COGNITIVE | 40 | 10 | 0 | 38 | 0 |
| PRIOR | 15 | 35 | 0 | 38 | 3 |
| PREG | 8 | 37 | 5 | 37 | 0 |
| RENAL | 9 | 23 | 18 | 40 | 12 |

The existing fictional SYN-217 renal revision produces **14 meets / 18 excluded / 18 indeterminate**, including **5 newly matching** people, in the RENAL pack. The other seven proposals are **Requires configuration**; there is no computed proposed matching count for them. A screening discrepancy can include an erroneous original acceptance as well as rejection; it is not proof of wrongful exclusion. ACCESS/COGNITIVE original participation rejections are not relabelled medical screening errors.

[OUTCOMES.json](OUTCOMES.json) records the full primary-route partition and overlapping findings. Findings count unique `personId` values and may overlap. For example, the 37 PREG research-pathway findings do not create 37 newly eligible people. Known medical failure takes precedence over unknown information, while all failure and missing-information reasons remain available. All eight packs have **Not configured for this case** attention scoring and no numeric ranking model.

## Sources and authored content

- **Supplied material:** [case_pack_spec.json](../../case_pack_spec.json), [CODEX_ADDITIVE_CASE_PACKS.md](CODEX_ADDITIVE_CASE_PACKS.md), and [PRESENTATION_CASE_NOTES.md](PRESENTATION_CASE_NOTES.md). Case descriptions, review questions, source categories and the 48 route expectations come from these briefs. Drawer quotations are actual case-specification text.
- **Unavailable original:** `SOURCE_RESEARCH_NOTE.txt` was not supplied. The registry retains it as unavailable secondary-summary provenance with `passage: null` and `verified: false`. Its reported 499-line length, section ranges and SHA-256 are metadata from the supplied specification, not independently verified facts. No missing passage was reconstructed, and no complete research citation was invented.
- **Authored demonstration inputs:** all patient observations, original screening reasons/dates, medication placeholders, support confirmations, assessment tokens, protocol snapshots and seeded variants are fictional. Their provenance is exposed in the patient facts and JSON. In particular, a `satisfied` assessment is an explicitly authored input, not an independent clinical assessment performed by this app.
- **Rule scope:** seven packs use case-specific hypothetical protocol snapshots and explicit qualitative assessment inputs. Undefined numeric acceptance criteria are not inferred. The existing fictional SYN-217 renal predicates and fabricated drug evidence execute only in the matching RENAL study context. Evidence applicability remains unestablished. A missing assessment never becomes passing because a measured value looks favorable.
- **Actions:** computed investigation recommendations are distinct from actual user-entered review annotations. Actual annotations carry the run, study, versions, timestamp and unauthenticated demo-reviewer identity. Neither type approves enrollment.

## Clinical configuration for Ehsan

| Case | Inputs still requiring qualified configuration/review |
|---|---|
| HIV | Actual protocol wording, viral-load acceptance and timing, CD4 acceptance, current medication list and drug-specific interaction assessment. No thresholds were supplied or invented. |
| BRAIN | Applicable treatment/stability alternatives, required evidence and timing, symptom assessment, and relevant neurological/drug concerns. No universal stability duration or steroid rule was added. |
| OLDER | Historical versus active disease definitions, severity/control and functional assessments, and drug-specific relevance. No upper age limit or numeric cardiac cutoff was added. |
| ACCESS | Specific study tasks, individual ability/support needs, actual resources and confirmation, and acceptability of modified procedures. Suggested accommodations are not confirmed resources. |
| COGNITIVE | Task/communication assessment, actual support arrangements, a separately reviewed consent process, and scientific acceptability of assisted/proxy assessment methods. Practical help is not legal or methodological clearance. |
| PRIOR | Current activity, recurrence and other-treatment information; endpoint-, safety- and treatment-specific interference assessments. The ten-year vignette is not a universal cancer-free waiting period. |
| PREG | Drug-specific pregnancy evidence, a separately configured research protocol and qualified oversight. No pregnancy inclusion conditions, dosing or existing-trial amendment were inferred. |
| RENAL | Intended metric/method/units, dated observations and documented measurement currency, protocol-specific thresholds, evidence applicability and stability definition. No creatinine-clearance conversion, lab-expiry interval or dosing recommendation was added. |

Edit source-display metadata in `src/case-pack-metadata.js`, authored records/protocol contexts and generator settings in `src/case-packs.js`, and case assessment mappings in `src/investigation.js`. The existing SYN-217 thresholds remain in `src/clinical-fixture.js`. Keep independently authored expectations and the reported outcomes synchronized when intentionally replacing the fictional case. No approval from Ehsan has been asserted.

## Source and review questions for Imtenan

1. Can the original note and primary bibliography eventually be recovered, and can the reported section locations/checksum be verified? Until then, only the supplied case-specification passages can be quoted.
2. Which original claims are secondary interpretations, which have authoritative primary support, and what are the document dates, versions and exact passages? No primary bibliography was verified in this milestone.
3. Does each source apply to the exact study, drug, population and proposed rule? General inclusion rationale cannot establish drug-specific safety or authorize a protocol change.
4. Are screening correction, protocol revision, accommodation, missing information, retained restrictions and separate research correctly distinguished in the presentation? Avoid describing every discrepancy as proven wrongful exclusion.
5. Which consent, procedure, pregnancy-research and regulatory statements need qualified review? The application does not label undefined criteria as FDA requirements or claim Imtenan's approval.

## Changed files

New:

- `case_pack_spec.json` — supplied specification preserved as a source artifact and independent route regression input.
- `src/case-pack-metadata.js` — case/source metadata without runtime expected classifications.
- `src/case-packs.js` — authored anchors, seeded variants, source-availability registry and versioned settings.
- `src/investigation.js` — case-scoped adapter into the unchanged engine, all findings and separate readiness.
- `src/investigation-views.js` — additive patient, source, strategy, trace and report content.
- `tests/investigation.test.js` — 23 focused regressions.
- `tests/fixtures/investigation-expectations.js` — independently authored medical/readiness expectations for all 48 anchors.
- `docs/exclusion-investigation/CODEX_ADDITIVE_CASE_PACKS.md`, `PRESENTATION_CASE_NOTES.md`, `OUTCOMES.json`, `HANDOFF.md` — supplied briefs, actual evaluated outcomes and this handoff.

Extended:

- `src/workspace.js` — case loading, immutable shared runs, study scoping, route filters and actual review actions.
- `src/studio.js` — existing selector, contextual scenario controls, source drawer, anchor shortcuts and shared handlers.
- `src/studio-patient.js` — existing queue/detail integration and case-specific ordering/labels.
- `src/studio-views.js` — existing strategy, decision and report/export dispatch.
- `src/inspection.js` — unconfigured proposal display and case review controls.
- `src/population-stage.js` — study-scoped captions; geometry and population interaction are unchanged.
- `src/studio.css` — scoped reading/provenance styles and mobile wrapping using existing tokens.
- `README.md` — case workflow, source limits and verification.

Protected engine, original clinical/ranking fixtures, original generators, and existing test files remain unchanged. No dependency, service, database or infrastructure was added. User `.agents/` and `.codex/` directories are excluded from the commit.

## Actual verification

- `npm test`: **143 passed, 0 failed** — 23 focused case tests plus all 120 existing tests, including the original ranking/boundary regressions and exhaustive condition combinations. All 48 source-authored anchor routes and all 48 independently authored medical/readiness expectations pass. Tests cover simultaneous failures and missing inputs, interactions, support confirmation, consent/method separation, pregnancy, concurrent cancer, brain alternatives, renal metric/date/unit checks, no demographic score, unique overlapping counts, deterministic generation and shared-state/report reconciliation.
- `npm run check`: passed syntax checks for every source module.
- `npm run build`: passed; `dist/` contains the static site and locally bundled Three.js/Motion.
- Actual Chrome 157 development flow: **77 workflow checks passed**, no runtime errors. All eight packs were exercised across Patient/Trial/Decision views; linked route filters, case switching, source inspection, actual demo annotations, phone navigation, JSON export and the unchanged reference ranking were checked.
- Independently served static build (`python3 -m http.server 5180 --directory dist`): **12 workflow checks passed**, no runtime errors. Covered local rendering, ten datasets, HIV correction/source, source drawer wrapping, ACCESS pending readiness, PREG research/export, RENAL proposal and preserved reference current counts.
- Browser viewports: **1440 × 900**, **1280 × 800**, **375 × 812**. Actual screenshots were visually inspected. HIV, ACCESS and PREG downloads were parsed and checked for the selected case, 50 unique people, separate outcome fields, unconfigured scoring and honest source status.
- The reference still gives original **4 / 15 / 1**, proposed **10 / 8 / 2**, and ranking **P13, P02, P19, P09, P03, P11**. The expanded 500-record dataset remains separate and retains its existing regression checks.

QA scripts, screenshots and downloaded packets are under ignored `output/playwright/`; they are local verification artifacts. No separate lint command is configured. This milestone does not establish real clinical validation, primary-source verification, authenticated or durable review storage, a full accessibility/cross-browser certification, PDF pagination certification, or Replit publication. Seven case proposals remain unconfigured by design. Reload clears the existing in-memory session, as before.
