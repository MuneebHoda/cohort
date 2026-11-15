# SYN-217 unified trial handoff

This milestone replaces separate case-pack navigation with one 500-person synthetic trial. The eight former topics are now domains evaluated on every patient, alongside Core requirements. Existing visual identity, population ring, Motion runtime and Node/static stack are retained.

## Implementation and editable data

`src/unified-protocol.js` defines the full field registry, thresholds, criterion scopes, predicates, original/proposed versions and simulation-only policy sources. `src/unified-cohort.js` supplies deterministic mixed-condition data and validates observations before the existing three-valued engine evaluates all requirements. Seven anchors establish independent expected behaviors; 493 seeded records add combinations and missingness.

`src/unified-analysis.js` connects immutable runs, 500 patient explanations, medical/participation/domain results, exact chart groups, attention profiles and normalized exports. `src/unified-views.js` supplies the inspector, matrix, comparisons, composition, profile form and reports. Existing workspace, controller, chart, source and presentation entry points use this shared result model.

The generated `data/syn217-unified.json` contains the study, full protocol, generator metadata, outcome summary and all 500 raw patient records with observations, dates, units and provenance. `npm run generate` reproduces it. Change the versioned definitions and regenerate to replace these authored defaults; editing this generated export alone does not change runtime generation.

### Authored protocol defaults

| Domain | Original | Proposed inclusive |
|---|---|---|
| Core | Adult ≥18, advanced NSCLC, ≥1 prior systemic line, ECOG 0–1, normal/mild hepatic status, no strong CYP3A inhibitor/relevant medication concern, no unstable cardiac disease | Unchanged |
| HIV | Positive status excludes | Negative, or viral load <200 copies/mL, CD4 ≥200 cells/µL, suppression ≥90 days and no relevant ART interaction |
| Brain | Metastases exclude | Absent, or accepted treatment OR stability ≥28 days, controlled/absent neurological symptoms and no relevant neurological concern |
| Older/comorbidity | Age ≤75, no cardiac history, absent/controlled comorbidities | No upper age limit; explicitly controlled history permitted; functional and unstable-cardiac restrictions remain |
| Access | Required tasks independently satisfied; procedures accepted | Independent task completion OR confirmed task-specific support with documented task completion; procedures still accepted |
| Cognitive/consent | Accepted independent standard consent, accepted assessment method and confirmed required communication support | Explicitly reviewed assisted consent permitted with confirmed support; consent and method reviews still required |
| Other malignancy | Prior/concurrent non-index malignancy excludes | Explicit assessments show no relevant endpoint, safety or treatment interference |
| Pregnancy | Not pregnant or explicitly documented clinical non-applicability | Unchanged; never inferred from gender; a separate research question cannot confer inclusion |
| Renal | eGFR ≥60 mL/min/1.73 m² | eGFR ≥45 with documented renal stability |

All laboratory samples need standard units and valid dates within 30 days of the fixed as-of date, 2026-11-01. Missing, conflicting, future, invalid or stale observations remain UNKNOWN. Pending reviews/support are UNKNOWN; explicitly unmet required conditions are FAIL. Overall precedence is FAIL > UNKNOWN > PASS, retaining all reasons and separate medical/participation results.

These values are authored simulation defaults, not clinical recommendations or FDA thresholds. `authored-demo-assumption` sources are accepted only in explicitly synthetic protocols/scenarios. General guidance cannot authorize a drug-specific revision, and fixed restrictions remain fixed.

## Exact demonstration and acceptance results

1. Patient Review starts on Original, SYN-0001. The same person has HIV, stable brain metastases, older age, controlled cardiac history, supported tasks, assisted consent, another malignancy and reduced renal function. All nine domain controls are visible in the overview.
2. Apply Proposed inclusive. SYN-0001 passes all 18 modeled requirements. Inspect any domain, then expand original/proposed comparisons or inspect an exact criterion and its observations.
3. Trial Strategy opens on Patient × Criterion. Select any cell or row; the selected-patient explanation stays synchronized. Pagination covers 25 patients per page; the table scrolls internally on phones.
4. SYN-0002 retains its medication restriction. SYN-0003 needs a CD4 observation. SYN-0004 medically matches but has pending accommodation confirmation. SYN-0005 medically matches but needs consent review. SYN-0006 retains its pregnancy restriction. SYN-0007 matches Original.
5. The visible patient/group controls filter the single shared cohort. HIV/brain/access groups overlap; they never replace the study or skip other domain checks.
6. Composition has Gender, no Sex control, and one Race/Ethnicity joint view. Each person occupies one recorded race/ethnicity combination, including unknown/not-collected states. Cell links open exact matching IDs; composition and within-group matching denominators remain distinct.
7. Decision Review retains separate documentation and substantive-review states. Enter a rationale and information actually considered to record a local action. This cannot change medical, participation or full inclusion outcomes.
8. Export the review packet. The HTML preserves full cohort results and restrictions; JSON schema 2.0 stores raw patients and both canonical evaluation collections once, with resolvable explanation references. The selected explanation remains complete.
9. Presentation uses the same cohort in all twelve scenes. It supports pause, scene navigation, actual target readiness and context restoration, with no approvals or automatic downloads.

### Computed cohort reconciliation

| Scenario | Meets every modeled rule | Excluded | Indeterminate | Total |
|---|---:|---:|---:|---:|
| Original | 24 | 469 | 7 | 500 |
| Proposed inclusive | 153 | 263 | 84 | 500 |

131 newly meet the rules. Two Original matches become indeterminate under the additional proposed renal-stability requirement, so the net gain is 129. The interface explicitly identifies these reassessments; the flow preserves every transition. 127 newly matching patients have complete core attention-index inputs; four remain matching but unranked. No total or inclusion percentage is hardcoded into the UI.

## Verification

- Full Node suite: **224 passed, 0 failed**. Existing clinical fixtures retain their original outcomes, including the 20-person 4/15/1 → 10/8/2 reference and P13/P02/P19/P09/P03/P11 ranking. Tests that target archived expanded fixtures now select that fixture explicitly; the new default and unified workflow have their own checks.
- Twenty new tests cover mixed conditions, independent failures/unknowns, exact HIV/brain/age/renal boundaries, units and dates, conditional absence, participation/consent gates, fixed restrictions, identity neutrality, full-cohort reconciliation, canonical data parity, trace references, scenario reversal, scratch profiles and normalized export size/completeness.
- Syntax check and static production build pass. No package dependency was added; Motion and Three.js remain pinned to their existing versions.
- Development Chrome: **53 workflow checks passed**, no runtime errors. Independently served static production build: **53 workflow checks passed**, no runtime errors. Covered the single trial, nine-domain matrix, all seven demonstration outcomes, exact group/chart navigation, keyboard inspection, joint demographics, actual review annotations, report download, scratch evaluation/addition/reset and responsive/reduced-motion behavior.
- Guided presentation: **16 browser checks passed**, including actual readiness for all twelve scenes, pause and context restoration.
- The final production packet was downloaded and parsed: schema 2.0.0, 500 raw patients, 500 complete records for each protocol, 500 explanations and all **9,000 criterion results per protocol**. Every canonical explanation and blocker reference resolved. SYN-0004 retained medical PASS and full inclusion UNKNOWN after an actual questions-open annotation.
- Canonical export normalization reduced the proposed packet from approximately **219 MB to 14.9 MB**; the full selected explanation is still included. Shared field definitions, phase results and reference-linked blockers/evidence replace duplicate snapshots. A regression check enforces completeness and the default proposed packet size below 15 MB.
- Phone/tablet/landscape checks used 375×812, 768×1024 and 812×375; desktop used 1440×1100. Local QA scripts and downloads remain under ignored `output/playwright/`. These checks do not establish full cross-browser/accessibility or PDF-pagination certification.

### Verified interface screenshots

- [Patient review and domain overview](screenshots/patient-review.png)
- [Patient × Criterion with inclusion rationale](screenshots/patient-criterion.png)
- [Phone inclusion inspection](screenshots/patient-criterion-phone.png)
- [Decision Review](screenshots/decision-review.png)
- [Joint Race/Ethnicity composition](screenshots/race-ethnicity.png)

## Source provenance and remaining qualified review

Existing inspected primary FDA participation-guidance and electronic-records links, page mappings and verification metadata are retained. They are review context, separate from the new authored protocol assumptions and patient-specific applicability. No clinical source was invented, no unavailable research-note passage reconstructed, and no new empirically supported drug-safety claim established.

Ehsan: replace/validate every new medical threshold and category, source sufficiency, drug interactions, clinical stability, lab timing, oncology scope, required tasks and actual support/consent/method processes. The renal stability requirement applies to every proposed renal check in this authored protocol; changing that intended scope requires an explicit protocol edit.

Imtenan: review the application of guidance passages to this unified protocol and the distinction between recommendations and binding requirements. Actual reviewer identity, access control, durable retention, protected history, validation and signatures remain unimplemented. Demo actions retain actor labels, actual UTC timestamps, versions, rationale and before/after context; they do not establish authenticated approval or compliance.

The attention index is the retained, unvalidated core-factor index, with no HIV, brain, pregnancy, identity or support-related weights added. Its actions are taken from the unified explanation rather than obsolete renal-only advice. Matching, attention priority and actual enrollment remain separate.
