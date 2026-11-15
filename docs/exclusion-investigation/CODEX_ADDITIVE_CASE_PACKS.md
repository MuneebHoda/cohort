# Codex task: add eight exclusion-investigation case packs to the existing application

Continue the established application. This is an additive content-and-logic milestone, not a redesign, restart, or replacement of the existing eligibility engine.

Read these attachments first:
- `SOURCE_RESEARCH_NOTE.txt` — the exact user-provided research note.
- `case_pack_spec.json` — eight case specifications with fields, missing configuration, source locations, and 48 anchor-vignette descriptions.
- `PRESENTATION_CASE_NOTES.md` — the intended explanation of each example.

The research note calls its proposed product TrialFair. Preserve our application's existing name and branding; do not rename it.

## 1. Inspect and protect the current application

Read AGENTS.md and inspect the current dataset loader/generator, rule engine, patient model, source registry, state management, Patient Review, Trial Strategy, Decision Review, reports, and tests.

Locate the smallest extension points. Briefly name the files or modules you will extend, then implement. Reuse the current theme, shared components, interactions, libraries, and persistence strategy. Do not create a second dashboard, new backend, new authentication layer, database migration, or new framework merely for these cases.

Keep every existing study and dataset available. Preserve the SYN-217 reference fixture and its results. If that exact fixture is present, its expected results are original 4 matching / 15 excluded / 1 indeterminate and proposed 10 / 8 / 2, with ranking P13, P02, P19, P09, P03, P11. Use actual existing tests and inspect discrepancies; do not change rules to force expected totals.

## 2. Source and evidence boundaries

The supplied note describes research patterns and potential review questions, not eight complete protocols, adjudicated patient records, or validated inclusion rules.

Preserve its four categories:
1. Incorrect interpretation.
2. Lack of individualized assessment.
3. Inadequate accommodations.
4. Overly restrictive medical thresholds.

Pregnancy needs a distinct research-pathway route, as described in its example.

Register the note as a user-provided secondary research summary. Each case must link to the relevant section and excerpt. Do not label the note as an FDA document, trial result, or verified primary paper. Publisher labels, image links, and favicons are not complete research citations. Mark unresolved bibliography items as such. Do not repeat the note's percentages as validated model parameters or patient prevalence.

Separate:
- Source-derived observations and review questions.
- Fictional patient observations.
- Explicitly authored hypothetical protocol rules.
- Fictional clinical assessments used to illustrate a workflow.
- Verified primary evidence, only if such material actually exists in the repository.

Do not invent missing quotations, drug-specific findings, efficacy/safety results, clinical approvals, or source verification. Do not infer that “no interaction mentioned” means an interaction review found none.

The note supplies no numerical CD4 cutoff, viral-load acceptance rule, brain-stability duration, upper age limit, cardiac threshold, disease-free waiting period, renal cutoff, lab-expiry window, or pregnancy eligibility condition. Leave missing parameters unconfigured and expose the gap. Never choose a convenient clinical default.

An anchor may contain a clearly authored fictional assessment such as “protocol-specific CD4 review satisfied,” with its origin and hypothetical protocol context visible. Do not represent that as an actual measured or source-validated cutoff.

## 3. Keep different decisions separate

Retain the current engine's criterion-level PASS / FAIL / UNKNOWN semantics and its existing aggregation within medical eligibility. Extend the result schema minimally to distinguish:

- Original recorded screening decision, reason, date, and protocol version.
- Computed eligibility under the current protocol.
- Computed proposed-scenario result, only when that scenario has explicit, complete rules.
- Investigation findings and recommended review route(s).
- Evidence applicability and unresolved evidence requirements.
- Participation readiness, including support and consent-process review.

These are not interchangeable statuses.

A patient can pass clinical criteria while support is pending. A patient may deserve protocol reconsideration while still excluded by the current protocol. A screening error can exist even though no protocol change is needed.

Use review routes such as:
- Screening correction review.
- Protocol revision review.
- Accommodation review.
- Needs information.
- Retain restriction.
- Separate research pathway.
- No case-specific action.

Allow more than one relevant finding per patient. Preserve every independent exclusion and missing-data reason. Do not flatten access, consent, clinical, and research questions into one fairness or risk score.

If a rule is incomplete, its proposed evaluation is “Requires configuration,” not a passing result. General participation recommendations can support a review flag; they cannot authorize enrollment or override an unchanged current protocol.

## 4. Implement the eight case packs

Treat these as separate illustrative protocol contexts, not eight new universally active rules for SYN-217. Keep each case scoped to its trial, dataset, scenario, and source. Multiple conditions may appear in a record, but only rules applicable to its selected study may be evaluated.

### HIV — controlled HIV in oncology

Capture HIV status, viral-load assessment, CD4 data or explicitly documented protocol assessment, current medication context, actual interaction-review status, and other criteria.

Show the difference between a diagnosis-only rejection and review of controlled infection. Missing viral load/CD4 assessment stays unresolved. A documented relevant interaction still blocks the corresponding hypothetical scenario. Include a screening-error example where the current protocol already permits the subgroup, separately from an example requiring protocol revision. Do not invent a CD4 cutoff or antiretroviral-drug interaction list.

### BRAIN — treated or clinically stable brain metastases

Capture treatment history, current stability assessment, neurological symptoms, assessment provenance, and relevant drug/protocol concerns.

Use the note's distinction between treated or clinically stable disease and blanket diagnosis-based rejection. Do not invent a stability period, steroid limit, or universal treatment prerequisite. A treated-and-stable hero example is acceptable; do not silently convert the source's wording into a universal AND rule. Active/symptomatic disease needs its own documented protocol assessment, not extrapolation from the hero case.

### OLDER — older adults with controlled comorbidities

Capture age, current versus historical cardiac disease, severity/control assessment, functional status, drug-specific concern, and independent criteria.

Include an 82-year-old with a controlled history as a review example, an active-condition comparator with an explicitly applicable restriction, and an incomplete-current-assessment example. Do not create an age penalty or general maximum age. Controlled history does not prove safety or override an unrelated functional restriction.

### ACCESS — physical/sensory/mobility accommodations

Capture the specific study task, individually assessed ability, requested support, whether it is available, availability evidence, and any unresolved procedure review.

Distinguish “support proposed” from “support confirmed.” Show a clinically matching patient whose participation barrier can be addressed by a documented arrangement, as well as a support-pending case and an independent medical exclusion. Disability itself must not add toxicity-risk points or automatically imply poor performance status.

### COGNITIVE — intellectual disability and participation support

Capture communication, questionnaire, and procedure support needs; actual availability; the consent-process assessment; and assessment-method acceptability.

Do not infer inability to consent from a diagnosis, or infer adequate consent from the presence of a helper. Keep support, consent-process review, and questionnaire-method review separate. Do not invent a legally sufficient consent procedure or assume proxy responses preserve an endpoint. Show resolved and unresolved support pathways without silently broadening medical criteria.

### PRIOR — previous or concurrent malignancy

Capture previous treatment, recurrence/activity, current treatment, documented endpoint-interference assessment, and safety/treatment concerns.

Use a prior cancer treated ten years ago as one illustrative vignette, not a ten-year rule. The source also discusses concurrent malignancy; do not automatically exclude every active/concurrent cancer. A documented interference concern retains the relevant restriction, while an absent interference assessment remains unknown.

### PREG — pregnancy research pathway

Capture pregnancy status where relevant, current protocol policy, drug-specific evidence status, documented concerns, and research/oversight-review status.

This is not another automatic inclusion toggle. Route general participation arguments and absent drug-specific evidence to a separate research-pathway/evidence-gap review. Do not make pregnancy records newly eligible under SYN-217 or another general oncology protocol. Do not invent trimester rules, dosing, or maternal/fetal safety conclusions. A nonpregnant comparator is not evidence supporting inclusion during pregnancy.

### RENAL — renal function and measurement review

Reuse existing renal logic only within its matching study context. Preserve the distinction between creatinine clearance and eGFR, their units, methods, and collection dates.

The uploaded note gives no cutoff. The existing SYN-217 thresholds are fictional case settings, not thresholds extracted from this research note. Do not silently convert metrics or invent a laboratory freshness interval. An independent interaction restriction must still apply after any proposed renal change. Dosing and monitoring recommendations are outside this milestone.

## 5. Generate data without changing existing datasets

Create 400 additional synthetic demo records:
- 50 per case pack.
- Six deliberately authored anchor records per pack, following the 48 descriptions in the spec.
- 44 seeded variants per pack.

The quotas are for demonstration coverage, not prevalence estimation. Preserve current 20-record and expanded datasets separately. Do not copy the same patients with new IDs.

Use stable IDs, a recorded configurable seed, fixed configurable as-of date, a versioned generation configuration, and coherent field combinations. Keep IDs distinguishable by case. Retain a person identifier separate from case membership when a person is reused intentionally; do not inflate unique-patient counts.

Create complete, retained-restriction, missing-information, unaffected-comparator, and multi-condition examples. Pregnancy's anchors must demonstrate its research pathway; do not force an inclusion-success example into every pack.

Generate the records before evaluating them. Do not use the evaluator to resample until a desired matching rate appears. Do not embed expected classifications as inputs that drive the evaluator.

Keep independently authored expected outcomes for the anchor tests separate from their patient inputs. Keep malformed-data challenge fixtures outside ordinary population analytics. Source percentages must not determine generator probabilities.

Do not infer demographics, disability, HIV, pregnancy, or cognition from a name or photo. Preserve current demographic conventions. Unknown, negative, and not applicable must remain distinct. Generate no actual names, contact details, or identifiers from real patients.

## 6. Integrate into existing screens

### Existing study/dataset controls

Add the case packs to the existing selector or case-library mechanism. Do not add eight competing top-level navigation tabs. Show a compact case summary: why the restriction exists, what triggers review, missing configuration, and source reference.

### Patient Review

Add a compact “Exclusion investigation” section with:
- Original recorded rejection and exact stated reason.
- Current protocol result and whether it agrees with the recorded screen.
- Relevant patient facts and assessed facts, with provenance.
- Why reconsideration is suggested, if applicable.
- What still prevents a decision or inclusion consideration.
- Source passages and scenario configuration.
- Appropriate next action: correction review, revision review, accommodation review, information request, retained restriction, or separate research pathway.

Reuse the current detail panel and source drawer. Only show an inclusion scenario comparison when a fully specified scenario exists. Keep risk/attention scoring limited to the cases for which that model is configured; show “Not configured for this case” rather than zero or recycled SYN-217 scores.

### Trial Strategy

For the active study/dataset, show unique-patient counts for recorded rejections, screening discrepancies, proposed-rule candidates, access-support needs, pending information, retained restrictions, and research-pathway referrals.

These are review findings and may overlap. Label overlapping counts; do not make them a pie chart that pretends they sum to 100%. Provide a proper mutually exclusive eligibility partition separately. Do not combine different hypothetical trial contexts into a single trial-coverage percentage.

Demographic charts describe the active cohort. Do not claim representativeness without a suitable benchmark. Do not count a suggested accommodation, pending consent review, or pregnancy research referral as a newly eligible patient.

### Decision Review and export

Extend the existing trace with source section, exact recorded reason, evaluated patient facts, protocol version, route chosen, unresolved configuration, and actual reviewer actions. Preserve evidence/source status and the current-versus-proposed distinction in the report. Do not fabricate approval or primary-source verification.

### Existing patient constellation and linked charts

Reuse the shared result state. Keep current eligibility colors consistent; use secondary badges or filters for investigation routes rather than recoloring all patients as newly included. A protocol-review flag should not silently move a currently excluded person to the eligible group.

## 7. Tests and acceptance criteria

Add focused tests using the existing framework:
- All 48 anchor records take the intended review route, with relevant exclusions preserved.
- Screening errors are distinguishable from needed protocol revisions.
- A blanket current exclusion remains in force until a correctly scoped proposed scenario is selected; the scenario does not alter the operative protocol.
- Missing clinical fields, unconfigured rules, unassessed interactions, and unresolved applicability cannot silently pass.
- Confirmed support differs from proposed support.
- Consent and assessment-method review remain independent from practical assistance.
- Pregnancy does not produce an automatic newly eligible transition.
- Concurrent cancer is not universally excluded merely because it is active.
- Different renal metrics are not silently treated as interchangeable.
- Age, disability, and other demographic labels do not add invented risk points.
- The same patient is not counted twice for overlapping findings.
- Switching cases does not carry incompatible rules or stale results into another study.
- Generator output is reproducible, IDs are unique, and inputs satisfy their schema.
- Anchor expectations are not generated by the evaluator under test.
- All existing baseline tests still pass.
- Table, scene, charts, trace, and export agree for the selected case and analysis run.

Do not rely solely on a test count. Inspect the running application with browser tooling, exercise at least HIV, ACCESS, and PREG, and verify transitions, evidence opening, linked filters, and exports. Report visual checks honestly.

## 8. Implementation order and completion

First deliver one complete vertical path: HIV pack → record → investigation → source → route → summary → report. Then add ACCESS to verify that practical support is not being conflated with eligibility. Then PREG to verify the separate-research route. Complete the remaining five packs through the same data-driven extension points.

Keep scope fixed. No redesign, replacement engine, general-purpose rules platform, new predictive model, new external service, or fabricated live AI behavior.

Finish with:
1. Exact changed files and launch instructions.
2. How to select and demonstrate each case.
3. Actual generated record counts and outcome summaries by pack.
4. What comes from the source, what is authored demo content, and what remains unconfigured.
5. Actual test commands/results and browser-verification status.
6. Outstanding clinical inputs for Ehsan and source/review questions for Imtenan.

Implement the addition. Do not stop after generating JSON or writing another plan.
