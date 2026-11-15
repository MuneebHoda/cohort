# Decision Brief, guidance review and linked analysis

This pass extends the existing Decision Brief and review-readiness implementation to explanation/mapping version 1.1.0. It preserves Cohort's engine, clinical fixtures, generators, eight case packs, scoring, ranking scope, navigation and theme. No model service, package dependency or infrastructure was added.

## Exact demo path

Run `npm run dev`, then open `http://localhost:5173`. Dependencies are already installed. Refresh an already open page to load the updated modules. The temporary development and static-build QA servers are stopped after verification.

1. In **Dataset**, choose **HIV**. **HIV-A** opens with “Protocol revision deserves consideration” while its active medical classification remains **Excluded**. Read the five-part Decision Brief; expand its first section for the exact recorded rejection, original rule/version and triggering observations. Expand reconsideration for dated facts and the three evidence groups.
2. Open **Evidence**, then **FDA-2025-REP**. The drawer identifies the issuing organization, final/nonbinding status, issue/version, actual source-verification date, inspected section and primary PDF page. A verified source does not establish patient-specific applicability.
3. Use **Case context & source → HIV-F** for screening-correction review, **HIV-B** for a retained interaction concern, and **HIV-C** for missing information alongside the retained protocol exclusion.
4. Open **Decision Review → Drug-specific evidence for changes**. Documentation is missing and applicability is unresolved. Enter a substantive status, rationale and information actually considered, then record the review. The event is a dated, unauthenticated demo annotation; medical classification and analysis-run identity stay unchanged. Inspect **Recorded-action traceability → FDA-2024-ERECORDS** for the Q12 source.
5. Choose **Reference case — 20 synthetic patients → Trial Strategy → Eligibility & barriers**. Select the **Excluded → Meets rules** ribbon (or the visible transition-matrix count **6**). The patient drawer shows exactly P02, P03, P09, P11, P13 and P19. If Original is active, those rows still display their original exclusions; a preview filter does not apply the proposed scenario. Clear the subgroup chip, return to Trial Strategy, and select the medication-exclusion bar to inspect P06 and P17.
6. Open **Population composition → Age**. Under 65 shows original **3/4 = 75%** of all original matches and proposed **5/10 = 50%** of all proposed matches. The separate within-group rates are **3/9 = 33.3%** and **5/9 = 55.6%**. Select the proposed 75+ bar for P09 and P13. Unknown/not-collected categories remain explicit; absent demographic categories are not inferred.
7. Open **Patient × criterion**. A cell opens the actual evaluated rule and patient inputs in the existing drawer. P03's renal cell changes from FAIL to PASS when the predefined proposed renal scenario is activated. P06 retains its interaction failure; P16 remains indeterminate. The expanded 500-record matrix is paginated in 25-record pages. Cells distinguish a condition explicitly marked not applicable from an actual completed passing assessment.
8. Choose **ACCESS → ACCESS-B** for medically matching with proposed support still pending. **COGNITIVE → COGNITIVE-F** keeps method acceptability pending despite confirmed support; **COGNITIVE-B** keeps consent-process review pending. **PREG → PREG-A** stays excluded with a separate research pathway; Trial Strategy explicitly says **Scenario not configured**. A pregnancy referral never becomes a new medical match.
9. Open **Review packet** from Trial Strategy or Decision Review. HTML and JSON preserve the selected Decision Brief, every loaded record's explanation, whole-cohort results, filtered IDs, both evidence directions, unresolved issues, guidance rows and actual review events.

## Improvements in this pass

- P06 now leads with the independently retained **Concomitant medication** failure and actual strong-CYP3A-inhibitor observation, in both scenarios. Its action no longer incorrectly targets the renal criterion. Authored case failures prefer the actual assessment over a medication or diagnosis label alone.
- The concise five-part brief names failed and unresolved criteria, retains the exact recorded screening statement, exposes matching measurement dates, and places the next action directly below the conclusion. A matching dated observation is required before a measurement date is attached; a lone stability flag still proves no longitudinal stability.
- Evidence entries open their actual criterion and supporting facts. Guidance topics link only relevant rules and facts; the rationale row retains original-rule links after a proposed scenario reclassifies a record. Drug-evidence rows expose the recorded medication regimen and interaction assessment. A laboratory method is not treated as participation support.
- Open-question links open the actual guidance row and preserve the reviewer's recorded question. Missing documentation and source-verification-pending states cannot become clinical approval.
- Flow counts are directly selectable in a visible 3-by-3 transition matrix, and SVG ribbons support keyboard activation. Changed-criterion bars distinguish original failures from the records that newly match all proposed checks.
- Every case pack has a clinical-composition view built only from a recorded field. Both composition and within-group rates retain their separate denominators. The expanded cohort's collected gender categories are also available. Unknown and not-collected states remain explicit.
- Reports retain the same brief and unresolved questions, add full source metadata and page links, and expose recorded version context and before/after values. Motion handles actual panel/drawer changes with reduced-motion and native-animation fallbacks. Existing color tokens are unchanged.

## Inspected screenshots

- [Patient Review](screenshots/patient-review-v1.1.png): P03's original exclusion, active proposed result and Decision Brief in the existing workspace.
- [Trial Strategy](screenshots/trial-strategy-v1.1.png): the configured reference renal comparison, exact transitions and remaining exclusion reasons.
- [Decision Review](screenshots/decision-review-v1.1.png): separate documentation and substantive-review states after recording a real demonstration annotation.
- [Mobile patient inspection](screenshots/patient-mobile-v1.1.png): ACCESS-B's medical matching and pending accommodation review.

## What changed and where

| Files | Purpose |
|---|---|
| `src/decision-brief.js` | Builds one versioned, patient-specific explanation from the actual run: recorded screen, original/current/active outcomes, criterion results, field-level facts/dates/provenance, evidence groups, blockers, actions and constrained scenario explanation. |
| `src/guidance-sources.js` | Metadata for the two inspected primary FDA documents, seven passage mappings and six application review topics. |
| `src/guidance-review.js` | Independent documentation and substantive-review statuses; six-topic progress counts with an explicit priority/denominator. |
| `src/review-views.js`, `src/review.css` | Five-part briefs, grouped evidence, criterion/source drawers, review matrix, actual-review forms and responsive/print presentation. |
| `src/analysis-model.js`, `src/analysis-views.js` | Exact transition/exclusion/composition patient-ID groups, separate composition denominators, paired bars and the paginated criterion matrix. |
| `src/charts.js` | Adds keyboard/click transition inspection and analytical tabs; limits the primary view to two charts; discloses deeper readiness separately. |
| `src/investigation-views.js` | Shows recorded version context and before/after values in existing case-pack event history and reports. |
| `src/studio-views.js`, `src/studio.js` | Adds full source metadata and action context to the existing report and opens a guidance row from its actual unresolved-question link. |
| `tests/decision-readiness.test.js` | Nine additional focused regressions; concise-brief checks now cover every dataset and executable scenario. Clinical baseline expectations were not changed. |
| `src/motion.js` | Interruptible panel and drawer transitions use the installed Motion runtime, with reduced-motion and native fallbacks. |

The existing `src/workspace.js`, `src/studio-patient.js` and `index.html` integration points are preserved. The shared clinical result retains `explanations`, `evidenceRegistry`, `guidanceTopics` and `chartGroups`. Actual review annotations use the existing state/event pattern in `guidanceReviews`, keyed by dataset/run/patient/topic. A source link, recommendation or matching count cannot create a reviewed annotation. Scenario changes create fresh explanations and a fresh substantive-review context; prior annotations remain in local history.

JSON retains all explanations under `analysis.explanations`, exposes the selected object as `decisionBrief`, and includes selected-patient `guidanceReview` rows and summary. This is the same deterministic model used by the UI and HTML report. The recorded original screen is null for SYN-217 reference/showcase records where no screener statement was supplied; computed original reasons are explicitly identified as engine output.

## Sources inspected and mappings added

The two primary landing pages and PDFs were reinspected; verification was recorded at **2026-11-15T04:59:27Z**. The electronic-records PDF identifies itself as **Revision 1**, which is retained in its metadata. This records inspection of the primary material, not qualified clinical or regulatory review of a patient.

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

- `npm test`: **186 passed, 0 failed**. The 177 existing tests remain covered, with nine additional focused regressions. Checks cover 920 baseline records, both executable scenario states, factual dates, decisive restrictions, rule/source traceability, verification-pending sources, review/eligibility separation, flow totals and exact IDs, overlapping exclusions, all case-composition denominators, not-applicable criteria and report agreement. Reference totals and the ranking **P13 14, P02 24, P19 27, P09 36, P03 39, P11 43** remain unchanged.
- `npm run check`: passed for every source module.
- `npm run build`: passed with the existing local Motion/Three.js bundles. Every built JS and CSS file was hash-compared with its source.
- Development Chrome: **73 checks passed** (21 patient/chart checks and 52 guidance, case-pack and responsive checks). Exercised reconsideration, screening correction, retained restriction, missing information, pending accommodation, cognitive method review, pregnancy research, actual guidance annotations, whitespace rejection, source drawers, chart filters, scenario invalidation, report download, print-content generation, all eight case packs, phone/tablet layouts and reduced motion. The completed run reported no browser runtime errors.
- Independently served static build: **28 checks passed**. Verified keyboard ribbon navigation, preview filters leaving original classifications active, P03's original-rule link after proposed reclassification, medication/interaction facts in the guidance row, Q12 Revision 1 metadata, actual review annotations, JSON download, all case packs, collected gender composition and phone matrix scrolling. The completed build reload and workflow reported no runtime or console errors.
- Both actual browser JSON downloads were parsed. Each preserved the current run, **50 patient briefs**, **150 resolvable evidence references**, HIV-A's **Excluded** classification, **Documentation missing** and **Reviewer questions open**. The production packet includes explanation version 1.1.0, the verified electronic-records revision, and unchanged medical status in the recorded action's before/after values.

Patient Review, Trial Strategy, Decision Review, the expanded guidance row, the report, and phone/tablet layouts were captured and visually inspected. No page-wide overflow appeared at 375, 768 or 1440 pixels; the wide criterion matrix scrolls within its own container. Reports were checked as browser HTML, actual JSON downloads and the print-content DOM; the operating-system print dialog was intercepted during automation. PDF pagination and printer delivery were not certified.

Reproducible QA scripts, screenshots, downloads and logs are under ignored `output/playwright/review-readiness/`. The four linked perspective screenshots are retained in this documentation directory. Existing earlier screenshots are preserved separately. No clinical validation, legal opinion, full accessibility/cross-browser certification, authenticated production review storage or publication is established. Reloading still clears local session reviews. Qualified clinical decisions, primary drug evidence and regulatory interpretation remain outstanding.
