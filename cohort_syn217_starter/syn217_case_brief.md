# Cohort demo case — SYN-217 (fictional)

**This is a synthetic software demonstration, not medical guidance or clinical evidence.** The investigational drug SYN-217, its PK/DDI findings and all patient records are invented. The scores are **not calibrated probabilities of toxicity**, and the app should never independently approve patient enrollment.

## Product story

A pharmaceutical sponsor inherited a blanket Phase 3 renal eligibility rule of **eGFR ≥60 mL/min/1.73 m²**. Its fictional SYN-217 evidence packet includes a limited PK sub-study in patients with stable eGFR **45–59**. The product asks whether the sponsor should **review a narrower exclusion**, prepares the clinical rationale, and simulates a proposed **eGFR ≥45** criterion **without changing other restrictions**. Ehsan must replace/validate this exercise before any claim beyond a demo.

## Fictional drug and supplied evidence

- **Fictional drug:** SYN-217, targeted oral small molecule for advanced non-small-cell lung cancer after prior systemic therapy.
- **Fictional elimination:** ~7% unchanged renal elimination; CYP3A metabolism is important.
- **Fictional renal PK:** n=36 in eGFR 45–59; modeled AUC ratio 1.12 versus a reference population; study too small to establish safety. No data for eGFR <45.
- **Fictional interaction:** n=12, strong CYP3A inhibitor associated with ~2.7× exposure; keep the interacting-medication exclusion in the demo.
- **Fictional gaps:** insufficient ECOG 2 and moderate/severe hepatic impairment evidence; keep these exclusions unchanged.

## Protocol criteria

| Criterion | Original | Proposed demonstration scenario |
|---|---|---|
| Renal | eGFR ≥60 | eGFR ≥45 (candidate revision requiring expert review) |
| Performance status | ECOG 0–1 | Unchanged |
| Hepatic | Normal/mild only | Unchanged |
| Medication interaction | No strong CYP3A inhibitor | Unchanged |
| Cardiac | No clinically unstable cardiac disease | Unchanged |

## Reproducible cohort result (20 synthetic patients)

| Classification | Original | Renal revision scenario |
|---|---:|---:|
| Meets modeled rules | 4 | 10 |
| Excluded | 15 | 8 |
| Indeterminate | 1 | 2 |

**Six** newly meet the proposed *modeled* criteria. Those six are **not** declared medically safe for the actual drug. A previously excluded record can become **indeterminate** rather than passing when another required measurement is missing (P16).

## Newly matching records — example ranking

This is an **illustrative review-attention index** (lower = fewer predefined review flags), **not** the probability of a drug adverse event. Rank only records meeting all proposed modeled criteria; hard exclusions and unknowns stay unranked. Age is *not* a penalty.

| Rank | Patient | eGFR | ECOG | Other known factors | Review-attention index | Reason newly matching |
|---:|---|---:|---:|---|---:|---|
| 1 | P13 | 58 | 0 | None flagged | 14/100 | Renal criterion only |
| 2 | P02 | 56 | 1 | Controlled hypertension | 24/100 | Renal criterion only |
| 3 | P19 | 45 | 0 | None flagged | 27/100 | Renal criterion only |
| 4 | P09 | 46 | 1 | Stable type 2 diabetes | 36/100 | Renal criterion only |
| 5 | P03 | 49 | 1 | Controlled hypertension, Mild hepatic impairment | 39/100 | Renal criterion only |
| 6 | P11 | 45 | 1 | Controlled hypertension, Mild hepatic impairment | 43/100 | Renal criterion only |

## Exclusions and uncertainty to show in UI

| Patient | Why this is not a newly matching candidate |
|---|---|
| P04, P20 | eGFR below fictional evidence boundary of 45; remains excluded |
| P05, P12 | ECOG 2 criterion unchanged; P05 also has renal impairment |
| P06, P17 | Strong CYP3A inhibitor interaction restriction remains active |
| P07 | Severe hepatic impairment remains excluded |
| P08 | Clinically unstable cardiac disease remains excluded |
| P10 | Missing kidney-function result; indeterminate |
| P16 | Renal rule is satisfied under the new scenario, but hepatic status is missing; indeterminate |

## How to explain the number

In the demo, the risk-profile *display* consists of renal, functional-status, hepatic, medication-interaction, cardiac, and comorbidity factors. For newly matching records only, a heuristic **review-attention index** adds: renal **12+(60–eGFR)** when 45≤eGFR<60, ECOG 1 **+5**, mild hepatic impairment **+8**, controlled hypertension **+3**, stable diabetes **+5**, and stable cardiac history **+10**. Age has no points. These coefficients are arbitrarily selected **for demonstrating transparency**, not established by any drug study; do not call them validated clinical weights or adverse-event probabilities.

If a clinic wants a real adverse-event risk prediction, a separate development program would require representative patient-level safety outcomes, validated model features, calibration, subgroup assessment, and external validation.

## Key distinction: FDA guidance versus drug evidence

FDA guidance can justify **asking whether a broad exclusion remains necessary**. It does not supply the safety evidence needed to admit an individual patient to a particular drug trial. Every drug-specific finding in this sample is fictitious.

- [Enhancing Participation in Clinical Trials — Eligibility Criteria, Enrollment Practices, and Trial Designs](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/enhancing-participation-clinical-trials-eligibility-criteria-enrollment-practices-and-trial-designs) — Final, nonbinding guidance.
- [Cancer Clinical Trial Eligibility Criteria: Patients with Organ Dysfunction or Prior or Concurrent Malignancies](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cancer-clinical-trial-eligibility-criteria-patients-organ-dysfunction-or-prior-or-concurrent) — Final, nonbinding guidance.
- [Cancer Clinical Trial Eligibility Criteria: Laboratory Values](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cancer-clinical-trial-eligibility-criteria-laboratory-values) — Final, nonbinding guidance.
- [Cancer Clinical Trial Eligibility Criteria: Performance Status](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cancer-clinical-trial-eligibility-criteria-performance-status) — Final, nonbinding guidance.
- [Cancer Clinical Trial Eligibility Criteria: Washout Periods and Concomitant Medications](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cancer-clinical-trial-eligibility-criteria-washout-periods-and-concomitant-medications) — Final, nonbinding guidance.

## Implementation notes for Codex

1. Use `synthetic_patients` and `rule_sets` from `syn217_demo_case.json` as the source of truth.
2. Evaluate all criteria (renal, ECOG, hepatic, DDI, cardiac), with precedence **FAIL > UNKNOWN > PASS** for aggregate status.
3. Show each criterion result, original vs revised status, and source refs.
4. Rank **only** newly matching patients using the explicit illustrative review-attention index. Never rank excluded/indeterminate patients as suitable for inclusion.
5. Label the index **not predictive** and display its components on click.
6. Preserve all synthetic labels; the drug evidence is fabricated, FDA documents are real.
7. Check the expected counts (4/15/1 original, 10/8/2 proposed) and ordered IDs (`P13, P02, P19, P09, P03, P11`).
