# Decision Brief, guidance review and linked analysis

This additive milestone keeps Cohort's engine, clinical fixtures, generators, case packs, scoring, navigation and theme. It adds a deterministic explanation to each immutable analysis, a documented guidance-review workflow, and linked analytical views. No model service, package dependency or infrastructure was added.

## Exact demo path

Run `npm ci`, then `npm run dev`, or open the existing development preview at `http://localhost:5175`. Refresh an already open page to load the new modules.

1. In **Dataset**, choose **HIV**. **HIV-A** opens with “Protocol revision deserves consideration” while its active medical classification remains **Excluded**. Read the five-part Decision Brief; expand its first section for the exact recorded rejection, original rule/version and triggering observations. Expand reconsideration for dated facts and the three evidence groups.
2. Open **Evidence**, then **FDA-2025-REP**. The drawer identifies the issuing organization, final/nonbinding status, issue/version, actual source-verification date, inspected section and primary PDF page. A verified source does not establish patient-specific applicability.
3. Use **Case context & source → HIV-F** for screening-correction review, **HIV-B** for a retained interaction concern, and **HIV-C** for missing information alongside the retained protocol exclusion.
4. Open **Decision Review → Drug-specific evidence for changes**. Documentation is missing and applicability is unresolved. Enter a substantive status, rationale and information actually considered, then record the review. The event is a dated, unauthenticated demo annotation; medical classification and analysis-run identity stay unchanged. Inspect **Recorded-action traceability → FDA-2024-ERECORDS** for the Q12 source.
5. Choose **Reference case — 20 synthetic patients → Trial Strategy → Eligibility & barriers**. Select the **Excluded → Meets rules** ribbon (or its exact-transfer button). The patient drawer shows exactly P02, P03, P09, P11, P13 and P19. If Original is active, those rows still display their original exclusions; a preview filter does not apply the proposed scenario. Clear the subgroup chip, return to Trial Strategy, and select the medication-exclusion bar to inspect P06 and P17.
6. Open **Population composition → Age**. Under 65 shows original **3/4 = 75%** of all original matches and proposed **5/10 = 50%** of all proposed matches. The separate within-group rates are **3/9 = 33.3%** and **5/9 = 55.6%**. Select the proposed 75+ bar for P09 and P13. Unknown/not-collected categories remain explicit; absent demographic categories are not inferred.
7. Open **Patient × criterion**. A cell opens the actual evaluated rule and patient inputs in the existing drawer. P03's renal cell changes from FAIL to PASS when the predefined proposed renal scenario is activated. P06 retains its interaction failure; P16 remains indeterminate. The expanded 500-record matrix is paginated in 25-record pages.
8. Choose **ACCESS → ACCESS-B** for medically matching with proposed support still pending. **COGNITIVE → COGNITIVE-F** retains separate consent/method questions. **PREG → PREG-A** stays excluded with a separate research pathway; Trial Strategy explicitly says **Scenario not configured**. A pregnancy referral never becomes a new medical match.
9. Open **Review packet** from Trial Strategy or Decision Review. HTML and JSON preserve the selected Decision Brief, every loaded record's explanation, whole-cohort results, filtered IDs, both evidence directions, unresolved issues, guidance rows and actual review events.

## Inspected screenshots

- [Patient Review](screenshots/patient-review.png): HIV-A's recorded exclusion, computed result and Decision Brief in the existing workspace.
- [Trial Strategy](screenshots/trial-strategy.png): the configured reference renal comparison, exact transitions and remaining exclusion reasons.
- [Decision Review](screenshots/decision-review.png): separate documentation and substantive-review states after recording a real demonstration annotation.
- [Mobile patient inspection](screenshots/patient-mobile.png): ACCESS-B's medical matching and pending accommodation review.

## What changed and where

| Files | Purpose |
|---|---|
| `src/decision-brief.js` | Builds one versioned, patient-specific explanation from the actual run: recorded screen, original/current/active outcomes, criterion results, field-level facts/dates/provenance, evidence groups, blockers, actions and constrained scenario explanation. |
| `src/guidance-sources.js` | Metadata for the two inspected primary FDA documents, seven passage mappings and six application review topics. |
| `src/guidance-review.js` | Independent documentation and substantive-review statuses; six-topic progress counts with an explicit priority/denominator. |
| `src/review-views.js`, `src/review.css` | Five-part briefs, grouped evidence, criterion/source drawers, review matrix, actual-review forms and responsive/print presentation. |
| `src/analysis-model.js`, `src/analysis-views.js` | Exact transition/exclusion/composition patient-ID groups, separate composition denominators, paired bars and the paginated criterion matrix. |
| `src/workspace.js` | Enriches the existing immutable run; reuses its subgroup filter for exact chart IDs; records actual guidance annotations and before/after context without changing eligibility. |
| `src/charts.js` | Adds keyboard/click transition inspection and analytical tabs; limits the primary view to two charts; discloses deeper readiness separately. |
| `src/studio-patient.js`, `src/investigation-views.js` | Makes the Decision Brief primary in the existing inspector. Detailed clinical profiles, index context and configuration remain available on expansion. |
| `src/studio-views.js`, `src/studio.js`, `index.html` | Integrates the same explanation into Decision Review and reports, preserves review drafts while inspecting the trace, validates rationale input and clears stale criterion/source drawers. |
| `tests/decision-readiness.test.js`, `tests/charts.test.js` | 25 new focused tests; two existing chart presentation assertions follow the retained criterion chart/new matrix after the default chart pair changed. Clinical baseline expectations were not weakened. |

The shared clinical result now carries `explanations`, `evidenceRegistry`, `guidanceTopics` and `chartGroups`. Actual review annotations use the existing state/event pattern in `guidanceReviews`, keyed by dataset/run/patient/topic. A source link, recommendation or matching count cannot create a reviewed annotation. Scenario changes create fresh explanations and a fresh substantive-review context; prior annotations remain in local history.

JSON retains all explanations under `analysis.explanations`, exposes the selected object as `decisionBrief`, and includes selected-patient `guidanceReview` rows and summary. This is the same deterministic model used by the UI and HTML report. The recorded original screen is null for SYN-217 reference/showcase records where no screener statement was supplied; computed original reasons are explicitly identified as engine output.

## Sources inspected and mappings added

Source verification was recorded at **2026-11-15T04:05:57Z**. This records inspection of the primary material, not qualified clinical or regulatory review of a patient.

| Primary FDA document | Inspected passage | Application mapping |
|---|---|---|
| [Enhancing Participation in Clinical Trials](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/enhancing-participation-clinical-trials-eligibility-criteria-enrollment-practices-and-trial-designs), final December 2025, Revision 1; [primary PDF](https://www.fda.gov/media/190162/download) | II / II.A, printed pp. 4–5 (PDF pp. 6–7) | Document exclusion rationale, review broad/diagnosis-only restrictions, consider drug-specific evidence and sufficiently specific organ-impairment assessments. |
| Same document | II and III.A, printed pp. 4 and 8 (PDF pp. 6 and 10) | Consider accommodations and participation/logistical requirements. This does not settle consent or method acceptability. |
| Same document | II.A, printed pp. 5–6 (PDF pp. 7–8) | Examine available population characteristics. Without a suitable reference population, the application reports composition rather than representativeness. |
| [Electronic Systems, Electronic Records, and Electronic Signatures in Clinical Investigations: Questions and Answers](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/electronic-systems-electronic-records-and-electronic-signatures-clinical-investigations-questions), final October 2024; [primary PDF](https://www.fda.gov/media/166215/download) | Q12, printed p. 13 (PDF p. 16) | Inform actual-action fields: actor, timestamp, versions, rationale, before/after values and retained prior history. |

Drawer passages are labelled paraphrases with page-specific primary links. The six topics are our application's review questions, not an official FDA checklist or an exhaustive framework. No FDA seal, approval, compliance percentage or automatic legal conclusion is shown. NCI/ASCO recommendations are not relabelled FDA guidance.

The source registry distinguishes primary FDA guidance, supplied secondary case summaries, unavailable original research-note text, fictional drug evidence, protocol requirements and explicit fictional clinical assessments. The two FDA documents do not supply this application's clinical thresholds. Other legacy reference entries were not newly verified in this milestone. `SOURCE_RESEARCH_NOTE.txt` remains unavailable, with no reconstructed quotation or bibliography. No real drug-specific evidence or patient-level source applicability is established.

## Remaining clinical decisions for Ehsan

- Replace or validate the authored clinical-assessment tokens and actual study requirements. Seven case proposals remain unconfigured; no CD4/viral-load cutoffs, stability interval, cardiac threshold, upper age limit, cancer-free waiting period or pregnancy inclusion conditions were invented.
- Review actual drug-specific evidence, relevant interactions, organ severity, subgroup coverage and measurement comparability/currency. Existing fictional SYN-217 boundaries and stability assumptions remain confined to their existing study context.
- Confirm real support arrangements and separately review procedures, consent processes and assisted/proxy assessment methods. Medical matching does not prove participation readiness.
- Define any separate pregnancy research protocol and qualified oversight. A source-backed research question cannot enroll someone in the existing trial.

The application's proposed actions request documentation/review. They do not suggest stopping medication, adjusting doses, changing health characteristics or ignoring a restriction.

## Remaining interpretation questions for Imtenan

- Confirm patient/study applicability of each mapped passage and whether additional authoritative guidance is needed for a specific context. Source verification does not answer that substantive question.
- Review the distinction between nonbinding recommendations and separately applicable legal requirements. No binding-requirement determination or Part 11 assessment was performed.
- Verify unresolved secondary bibliography and legacy source entries before making broader claims. Missing documentation is not proof of no medical justification.
- Assess actual reviewer identity, record protection, retention, validation, access controls and signatures before any production claim. Current actors are labelled Demo reviewer, unauthenticated; the browser-tab history is neither durable nor tamper-proof.

## Verification and limits

- `npm test`: **177 passed, 0 failed** — all 152 prior regressions plus 25 focused Decision Brief/guidance/graph tests. Coverage includes 920 existing records' field/rule/source traceability, exact screening versus engine reasons, retained failures/unknowns, unsupported interaction wording, evidence-range limits, missing/unconfigured criteria, readiness/consent/pregnancy separation, review validation and scoping, graph reconciliation, both composition denominators and report agreement. Existing reference ranking and case-pack counts remain unchanged.
- `npm run check`: syntax checks passed for every source module.
- `npm run build`: static build passed with locally bundled Motion/Three.js.
- Development Chrome: **57 workflow checks passed**, no runtime errors, at 1440×1000, 768×1024 and 375×812. Exercised reconsideration, screening correction, retained restriction, missing information, accommodation, cognitive support, pregnancy, unresolved guidance, whitespace validation, draft preservation, exact chart-to-patient navigation, scenario changes, criterion inspection, report download, reduced motion and matrix pagination.
- Independently served production build: **20 browser checks passed**, no runtime errors. Checked all eight case packs, exact reference transitions, composition denominators, actual criterion values, review annotations, the Q12 source, JSON export, print overflow, mobile matrix scrolling and reduced-motion renal comparison. The parsed export resolved all 100 source references in the 50 patient briefs; the recorded review left medical exclusion and missing documentation unchanged.

Actual JSON downloads were parsed for the selected patient/run, evidence passage registry, unresolved review questions and unchanged clinical outcome. Screenshots of Patient Review, Trial Strategy and Decision Review were captured and visually inspected. QA scripts and downloads remain under ignored `output/playwright/`.

No clinical validation, legal opinion, full accessibility/cross-browser certification, complete PDF-pagination certification, authenticated production review storage or Replit publication is established by these checks. Reloading clears local session reviews, as before. Broader primary drug evidence and qualified review remain outstanding.
