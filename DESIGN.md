# COHORT — Live Trial Review Studio

**Implementation design proposal · 14 November 2026**

## 0. Product decision

Build one interactive clinical-trial review application with three perspectives on the **same** patient records, protocol scenario, evidence, and review history:

1. **Patient review** — explain the individual record, exclusions, candidate revision, risk factors, evidence gaps, and next review step.
2. **Trial strategy** — show the candidate pool, clinical and demographic composition, coverage gaps, and operational implications.
3. **Decision review** — replay how an output was derived and inspect sources, versions, unresolved questions, and human dispositions.

The third perspective is a **simulated regulatory-review workspace**, not an FDA account, FDA employee, agency endorsement, regulatory decision, or compliance certification.

The visual identity is **a dark interactive population stage surrounded by calm, highly readable clinical documents**. 3D must explain a change in the data. It is not a decorative landing-page effect.

## 1. Research and evidence boundaries

Firecrawl was explicitly requested. Its first search returned an insufficient-credits error and was not executed; no Firecrawl capture or extraction is claimed. Public web search and official pages were used instead. External browser screenshot attempts were blocked in this environment. Published image-search visuals were inspected, but complete live animation behavior, computed styles, and mobile behavior were not independently tested.

The palette, spacing, component dimensions, timings, and compositions below are **our proposed design tokens**, not values extracted from the reference sites. Published descriptions are distinguished from observed images.

### Reference shortlist

| Reference | Verified basis | Take for Cohort | Avoid copying |
|---|---|---|---|
| Lusion — Synthetic Human | The creator describes realtime 3D optimization, an interactive frontend, procedural animation, and visual effects. https://lusion.co/projects/synthetic_human/ ; public project https://synthetic-humans.ai/ | A single memorable, responsive spatial scene; deliberate camera transitions. | Campaign-site navigation, expensive custom asset work, synthetic-person marketing claims, proprietary assets. |
| BioDigital Human | Official platform and developer documentation describe interactive anatomy, conditions, treatments, labels, and embedding. https://www.biodigital.com/product/the-biodigital-human ; https://developer.biodigital.com/ | A selectable anatomical context that opens the relevant structured findings. | Claiming our illustration is a patient scan, validated anatomy model, pharmacology simulation, or licensed BioDigital integration. |
| Linear interface | Published interface imagery shows subdued dark navigation and a focused content area. Its March 2026 design article explains restrained chrome and clearer hierarchy. https://linear.app/now/behind-the-latest-design-refresh | Quiet navigation, one focused detail panel, dense but legible records, subdued borders. | Its brand, proprietary fonts, exact components, or screenshots as application assets. |
| deck.gl examples | Official interactive examples expose data layers, filters, maps, and source code. https://deck.gl/examples ; https://deck.gl/examples/scatterplot-layer | Link every visual point to an actual record; use a legend, filtering, and honest denominators. | Geographic coverage invented from clinical records; demographic color assignments copied from examples. |
| Spline for Web | Official documentation describes web embedding and programmatic control of scene events, variables, and objects. https://spline.design/web | Polished materials and object interaction; optional prebuilt licensed illustration. | Making a hosted scene the clinical engine or a mandatory network dependency. |

**Design synthesis:** Lusion's spatial presence + BioDigital's anatomical context + Linear's working-interface clarity. Quantitative reading stays in 2D tables and charts.

## 2. Existing data: preserve it, do not silently enlarge it

Use the supplied `syn217_demo_case.json`. All drug evidence and records are fictional. The existing index is an arbitrary review-attention heuristic, not a probability of toxicity.

The original 20 records contain age and clinical fields. They do **not** contain sex, gender, race, ethnicity, site, geography, longitudinal laboratory series, or actual enrollment status. Do not infer these from names, appearance, age, or other variables.

An independent check of the five existing modeled criteria reproduced every one of the 40 original/proposed patient classifications:

| Scenario | Meets modeled rules | Excluded | Indeterminate |
|---|---:|---:|---:|
| Original | 4 | 15 | 1 |
| Proposed renal revision | 10 | 8 | 2 |

Newly matching: P02, P03, P09, P11, P13, P19. Lower-to-higher attention-index order remains P13, P02, P19, P09, P03, P11.

Do not add an evidence-applicability gate and continue asserting these results are unchanged. Keep the existing modeled-eligibility result and a separate applicability assessment. Any later change to the gate requires a versioned scenario and updated tests.

### Existing age view that can work immediately

| Age band (illustrative chart grouping) | Screened records | Original matching | Proposed matching |
|---|---:|---:|---:|
| Under 65 | 9 | 3 | 5 |
| 65–74 | 9 | 1 | 3 |
| 75+ | 2 | 0 | 2 |

These are synthetic counts, not clinical outcome comparisons. The screened sample is not automatically a representative reference population. Two records in a group cannot establish safety or a reliable subgroup effect.

### Optional demographic overlay

Use a separate keyed fixture rather than mutating the base case:

```ts
type DemographicOverlay = {
  patientId: string;
  synthetic: true;
  provenance: 'explicitly_authored_demo_metadata';
  sexAsRecorded: string | null;
  genderAsRecorded?: string | null;
  raceAsRecorded: string[] | null;
  ethnicityAsRecorded: string | null;
  regionId: string | null;
  siteId: string | null;
  dataStatus: 'recorded' | 'unknown' | 'not_collected';
};
```

In a real application, categories and collection methods must follow the actual data specification. Do not conflate sex and gender or race and ethnicity. For overlapping categories, state the denominator and avoid implying percentages sum to 100. Keep unknown and not-collected states visible. Do not add demographic penalties to the demonstration risk score.

Add any illustrative benchmark in a **separate reference-population object**, with indication, disease stage, geography, time period, population definition, source, sample size, and synthetic status. Without a benchmark, show composition rather than declaring representativeness.

## 3. Information architecture

The header persists across every perspective:

`COHORT / SYN-217 · Phase 3 / Synthetic demo / Original ↔ Proposed scenario`

Second row:

`Patient review | Trial strategy | Decision review`

Persistent context includes selected patient, selected scenario, active filters, dataset version, and current analysis-run ID. A perspective switch changes presentation, not facts.

### Desktop layout proposal

At 1440 px, use a 64 px navigation rail. Within the workspace, use a 64 px header, a compact context row, and an adaptive grid: approximately 260 px queue, flexible visualization, and 360 px detail panel. These are targets, not rigid widths.

Below approximately 1200 px, make the queue collapsible. On small screens, present readable panels sequentially and make the 2D patient table the primary explorer. No horizontal overflow is acceptable.

## 4. The signature scene: a patient constellation

Each interactive object represents exactly one loaded synthetic patient. For the starter case, render **20 objects**, not hundreds of decorative particles pretending to be patients.

Use one WebGL canvas, an orthographic or low-distortion camera, subtle lighting, a dark matte stage, and slightly dimensional luminous markers. Stable IDs map both geometry and data. Geometry can have gentle depth, but point placement is presentational unless an explicit quantitative axis is provided.

### Semantic visual encoding

- Originally matching: sky blue marker.
- Newly matching under proposed rules: teal marker plus an extra ring.
- Still excluded: muted coral/neutral marker with a distinct shape or outline.
- Indeterminate: amber hollow marker.
- Selected: high-contrast outer ring and connected HTML detail panel.

Color always has a textual or shape counterpart. Avoid red/green-only semantics.

### Layout modes

1. **Eligibility:** three labeled groups, with the newly matching subset separately marked.
2. **Age:** predefined age bands, preserving each patient's identity.
3. **Clinical factor:** Ehsan-reviewed group labels; overlapping conditions do not duplicate the underlying person in totals.

Do not label a point's distance from the center as medical risk. Do not use unlabeled axes implying clinical similarity. Include a 'View table' control with the same selection and filtering.

### Live scenario transition

On selecting the proposed renal scenario:

1. Compute the complete new result first.
2. Commit the scenario and derived counts atomically.
3. Animate the six newly matching records into the matching group.
4. Move P16 into indeterminate, not matching.
5. Keep P06 excluded because its unchanged medication rule still fails.
6. Update age coverage and the comparison report from the same result.
7. Record a demonstration analysis event with the scenario versions and changed IDs.

Totals must never pass through an invented intermediate count. An animation may interpolate geometry, not clinical classification.

An optional play control replays known, labeled demo events. No fake live telemetry, randomized vitals, fabricated model activity, or invented patient arrivals.

## 5. Patient-review perspective

### First visual impression

A searchable/sortable candidate queue on the left, a central clinical context stage, and a focused decision sheet on the right. Selecting a row and selecting a 3D point perform the same action.

The profile contains:

- Synthetic patient ID, age, available demographic information, and missing-data labels.
- Current protocol result and proposed-scenario result, separately.
- Every original exclusion and every unchanged restriction.
- Candidate reconsideration rationale, not a declaration the person should receive the drug.
- Multidimensional clinical concern profile: renal, hepatic, functional, cardiac, medication, comorbidity factors.
- The existing illustrative attention index with its exact additive factors.
- Evidence applicability and outstanding questions.
- A patient-specific pathway to further review.

### Review a newly supplied synthetic profile

Provide a small **Review a profile** action using a validated structured form or pasted JSON, not general-purpose medical PDF parsing. Expose the existing engine's age, eGFR (with units), ECOG, hepatic status, interaction flag, cardiac flag, and relevant comorbidity fields. Boolean clinical fields need yes/no/unknown rather than an implicit false default.

Evaluate a draft in a scratch panel immediately against both scenarios. Keep it outside cohort totals until the user explicitly chooses **Add synthetic profile to working cohort**. That action creates a new dataset version and event. Reset restores the unchanged original 20-record fixture and its regression results. Label the form synthetic demonstration only; no real identifiable records should be sent to public services.

Show validation errors for invalid types, impossible negative measurements, unsupported enums, conflicting units, and missing requirements. Missing data is not automatically a pass. This makes patient review genuinely interactive without adding EHR integration or an LLM extraction dependency.

### Example P03

The supplied fixture has eGFR 49 and an illustrative index of 39. Show the comparison against the two **fictional configured rules** and the factor breakdown: renal 23, performance status 5, mild hepatic impairment 8, controlled hypertension 3. The number is not 39% toxicity risk.

Use horizontal bars or a factor table rather than a radar chart that implies comparable, calibrated medical scales. Keep the label 'Illustrative review-attention index' next to the number, not hidden in a tooltip.

### Anatomical context

A later enhancement is a neutral, stylized 3D body with renal, hepatic, and cardiac hotspots. Selecting a hotspot filters the relevant observed fields, criterion evaluations, and evidence. Demographic information does not alter skin tone, facial appearance, or body morphology.

For the first milestone, prioritize the functioning 3D cohort scene. A lightweight body schematic can accompany the detail panel. Do not pause the project to create an anatomically accurate model. Use owned or appropriately licensed assets; maintain an asset-source/license register. Label it as an illustration, not patient imaging or a digital twin.

### Evidence applicability

Keep it distinct from numerical rule matching. Suggested states: directly covered, partially covered, not established, conflicting. Explain the reason and cite the supplied passage. Do not assign unsupported confidence percentages.

The fictional packet concerns stable renal impairment. The existing records do not establish stability through longitudinal measurements. Surface this as an applicability question; do not silently invent stability or rewrite the baseline expected outputs.

### Pathway to review

Examples:

- Missing hepatic information: obtain/verify required information, then rerun.
- Unchanged interaction restriction: remains excluded; a qualified medication review is needed, not an automatic instruction to stop or substitute therapy.
- Outside the supplied evidence range: further drug-specific evidence is needed before a broader scenario can be justified.
- Meets proposed rules: candidate for expert protocol review, not enrolled or medically cleared.

## 6. Trial-strategy perspective

Answer: what does this proposed change cover, who remains unrepresented, and what work remains?

Use one central comparative visualization and a compact metrics strip. Avoid a grid of unrelated decorative KPI cards.

### Four distinct meanings of coverage

1. **Modeled eligibility coverage:** matching records divided by the clearly stated screened dataset.
2. **Clinical coverage:** which defined impairment and comorbidity groups appear in the candidate pool.
3. **Demographic composition/representation:** age and supplied demographic distributions, compared with a suitable source population when one exists.
4. **Geographic/site reach:** only when explicit site and region data exist. A map is a view of those data, not proof of access or recruitment performance.

For the starter case, show 4/20 (20%) versus 10/20 (50%), a 30-percentage-point difference and six newly matching records. Retain the indeterminate counts. Do not describe this as coverage of 50% of all patients with lung cancer.

### Metrics contract

For a fixed dataset N:

`eligibilityCoverage = matching / N`

`newlyMatching = count(original != MATCH && proposed == MATCH)`

`withinGroupMatchingRate = groupMatching / groupScreened`

`candidateGroupShare = groupMatching / totalMatching`

These last two metrics are different. Label which one is displayed.

For a compatible external or illustrative benchmark:

`representationGapPP = 100 * (candidateGroupShare - referenceGroupShare)`

A benchmark comparison is unavailable when the target population, category definitions, or denominator is missing. Show 'Not assessable' rather than 0 or 100%.

A general Shannon diversity score does not establish representativeness. Do not optimize to a generic equal distribution or infer safety from a balanced chart. Reference populations should match the indication, stage, location, and period as far as the data allow.

### Visuals

- Paired horizontal bars: original vs proposed distribution.
- A compact heatmap: selected clinical subgroup × age band, with n in every cell.
- A flow diagram/table: original exclusion → unchanged exclusions → new matching / still excluded / indeterminate.
- A benchmark marker, only where reference data exist.
- Clicking a bar or heatmap cell filters the actual records in the shared cohort scene and table.

Do not add totals for overlapping comorbidities as if groups were disjoint. Keep missing/unknown demographics explicit. Use counts and small-sample warnings; production small-cell suppression is a configurable governance policy, not a made-up universal threshold.

### Geography and business value

A later site map may show synthetic site centroids, candidate counts, and regional composition. Do not plot precise residences. A simple radius is not a measured travel-time accessibility model. Without geography, show a clear missing-data state.

Show unique newly matching records per proposed criterion change and unresolved review tasks. Optional scenario-based effort estimates require visible editable assumptions. Do not fabricate recruitment speed, cost savings, regulatory approval likelihood, market size, adverse-event rates, or efficacy improvements.

Label the current population 'Modeled candidates.' Actual enrolled population is a distinct future dataset; no enrollment data are present now.

## 7. Decision-review perspective

Label: **Regulatory review — simulation**. Do not use an FDA seal or imply the agency is logged in.

The primary screen is an evidence chain and review history, not an omniscient chatbot:

`source document/version → supporting passage → scenario rule/version → patient field snapshot → criterion outcomes → attention-index factors → reviewer disposition`

Use a restrained 2D graph or connected document cards; 3D adds no necessary value here. A 'Replay this decision' action highlights each real dependency and the values used. It is a computation/evidence trace, not a display of hidden model chain of thought.

### Reviewer questions

- What changed between scenarios?
- Which records changed classification, and why?
- Which exclusions remained active?
- What evidence supports the change, and to whom does it apply?
- Which data or evidence remain missing?
- Who recorded a review disposition, when, and with what rationale?
- Which subgroup comparisons lack a valid reference population?

### Review events

Store event ID, event type, actor label and actual authentication status, UTC timestamp, prior and new scenario IDs, rule/evidence/dataset versions, affected IDs, reason, and run ID. Use stable UTC storage and localized display.

The hackathon actor is explicitly a demo actor. Do not pre-populate Ehsan's or Imtenan's approval or a verified signature. A view-switch control is not role-based access control.

A local event list can demonstrate traceability, but is not a validated, tamper-resistant regulatory audit system. Export a labeled review packet with the evidence, comparisons, limitations, and event history. Do not label the output 'FDA approved' or 'Part 11 compliant.'

FDA's October 2024 electronic-records guidance, Q12, discusses audit trails capable of reconstructing changes, including actor, date/time, old/new values, and reasons. This supports the audit-oriented product direction; it does not certify this prototype. Source: https://www.fda.gov/media/166215/download (printed p.13 / PDF page 16).

### Optional AI review assistant

Only after deterministic review works, add an assistant that queries structured results and supplied source passages. It can summarize or ask for missing evidence, but cannot change rules, infer unknown clinical fields, approve enrollment, or invent citations. Use existing configured infrastructure; absent a live model connection, show prepared questions and deterministic answers labeled as such. External research tools must not receive real identifiable patient records.

## 8. Proposed visual tokens

These are original proposed tokens, not extracted CSS:

```css
--stage: #0B1220;
--stage-raised: #142033;
--paper: #F5F7FA;
--surface: #FFFFFF;
--ink: #172335;
--muted-ink: #566579;
--on-stage: #F5F7FA;
--matching: #71B7FF;
--newly-matching: #48D7B8;
--unresolved: #F0BB65;
--excluded: #DF9196;
--stage-border: rgba(255,255,255,.12);
--paper-border: #DCE3EA;
```

Status colors identify shapes/accents; do not assume colored text meets contrast on white. Use dark accessible label text. Verify contrast in the actual rendering.

Typography: the repository's existing good sans-serif, with system fallbacks. Suggested body 14–16 px, page titles 26–32 px, main counts 32–44 px; tabular numerals for measurements and counts. Do not introduce a remote font dependency for the demo.

Use a 4/8/12/16/24/32 px spacing rhythm, 10–14 px panel corners, generous reading width, and restrained shadows. Solid evidence sheets are preferable to glass panels behind paragraph text.

## 9. Proposed motion contract

| Interaction | Suggested duration | Meaning |
|---|---:|---|
| Hover/press feedback | 120–160 ms | Identifies an actionable control. |
| Evidence drawer | 180–240 ms | Reveals a supporting source. |
| Patient selection | 250–350 ms | Brings one record into focus. |
| Cohort reclassification | 600–800 ms | Explains which people changed category. |
| Perspective transition | 250–350 ms | Changes presentation while preserving state. |
| Decision replay | User-stepped or explicitly played | Reconstructs a documented computation. |

Do not animate unmeasured vitals, invent processing time, or use decorative countdowns. Keep counts semantically correct during motion. Avoid scroll hijacking, cursor replacement, audio, particle rain, and perpetual rapid rotation.

Respect reduced-motion settings, provide a 2D equivalent, retain keyboard navigation, keep text as HTML, and disable auto-orbit while reading. Pause rendering when hidden and allow scenes to settle. These are proposed acceptance requirements, not measured performance results.

## 10. Technical architecture

Inspect the existing repository, AGENTS.md, framework, installed versions, and code before changing anything. The current project stack and implementation state were not verified in this research.

For an existing React app, the proposed minimal stack is:

- Existing React + TypeScript setup and state approach.
- Three.js + React Three Fiber for the patient constellation; reuse Drei helpers only as needed.
- Existing animation library, or Motion for DOM panel transitions.
- Existing chart library or plain SVG for precise 2D comparisons.
- Plain SVG or React Flow for a decision graph only if the graph is sufficiently interactive to justify the dependency.

Do not install Spline, R3F, deck.gl, and multiple chart engines together for the first milestone. Use Spline only if a licensed useful scene already exists; do not add a remote scene dependency to the critical path.

React Three Fiber documentation requires compatible React majors: Fiber 8 with React 18 and Fiber 9 with React 19; inspect installed versions and avoid alpha releases for this demo. Source: https://r3f.docs.pmnd.rs/getting-started/introduction

Use one canvas, stable IDs, cached geometry/materials, and event-driven state updates. R3F's official performance guide documents on-demand rendering and instancing: https://r3f.docs.pmnd.rs/advanced/scaling-performance . A 20-record scene needs no elaborate GPU optimization framework.

Motion provides reduced-motion support: https://motion.dev/docs/react-accessibility . React Flow supports custom nodes: https://reactflow.dev/examples/nodes/custom-node . A plain SVG evidence chain is sufficient for the first review view.

### State and data flow

```text
immutable base fixtures + optional explicit demographic overlay
                    ↓
versioned scenario + evidence registry
                    ↓
pure eligibility evaluator / separate evidence-applicability assessment
                    ↓
criterion traces + attention factors + cohort metrics
                    ↓
one shared state snapshot
    ↙                 ↓                    ↘
patient view     sponsor view        review/export view
```

Minimal shared context:

```ts
type WorkspaceContext = {
  perspective: 'patient' | 'trial' | 'review';
  scenarioId: string;
  selectedPatientId: string | null;
  selectedEvidenceId: string | null;
  datasetVersion: string;
  analysisRunId: string;
  activeFilters: Record<string, string[]>;
};
```

Compute derived results once per relevant data/scenario change. Do not keep three independent copies of eligibility state. Perspective changes do not produce three different answers.

## 11. Verification

Preserve the original cohort regression checks. Tests should cover:

- FAIL > UNKNOWN > PASS and all criterion reasons retained.
- Unchanged restrictions never overridden by attention score.
- Original/proposed totals reconcile to 20.
- Six known newly matching IDs; expected ranking unchanged.
- P06 stays excluded; P16 becomes indeterminate.
- Scenario off returns exactly to the original result.
- Each visible marker maps to one record; filter counts and exports agree.
- Missing demographics do not change the clinical score.
- Changing perspectives preserves scenario, filters, selection, and run ID.
- A changed evidence/rule version creates a new run, not a rewrite of history.
- Evidence unavailability is explicit; no forged citations or automatic approvals.
- Reduced motion, keyboard table selection, no-WebGL fallback, no network fallback.
- Print/export uses the current scenario and denominators.

Use browser screenshots at the primary laptop viewport and a smaller viewport. Inspect screenshots yourself rather than relying only on a successful build. Report real checks and any unavailable tooling.

## 12. Build order and stop rules

**Milestone 1 — One complete shared-state story:** preserve current engine; implement the three-perspective shell, the 20-patient 3D constellation, patient detail with evidence, sponsor age comparison, and basic evidence-chain review. Everything uses the supplied data and calculated results.

**Milestone 2 — Demographic extension:** add explicit, reviewed synthetic metadata and benchmark schema; linked charts, unknown states, and appropriate demographic labels. Preserve the base fixture's clinical outcomes. Add geography only with explicit data.

**Milestone 3 — Presentation refinement:** optional licensed body model/hotspots, camera transitions, decision replay, responsive/print polish, and a recorded demo.

**Later:** real model integration, real recruitment data, calibrated toxicity models, clinical validation, authenticated roles, production audit controls, and connected site data.

Stop after a reliable core story. Do not add authentication, billing, an EHR connector, generic chat, production database migration, or a new design framework merely to complete this demo.

## 13. Team handoffs

- **Muneeb:** shared state, evaluator integration, 3D/2D views, calculations, tests, deployment and demo.
- **Ehsan:** clinical examples, evidence applicability, organ-hotspot meanings, review questions, clinical subgroup definitions, validation of sample explanations. Do not treat clinician review alone as predictive-model validation.
- **Imtenan:** current source status/applicability, reviewer terminology, provenance and event fields, commercial assumptions, pitch and event requirements.

## 14. Three-minute demonstration storyboard

1. Open SYN-217: 20 labeled synthetic records, original 4/15/1.
2. Select P03: original exclusion, supplied renal evidence, illustrative index factors, unresolved clinical applicability.
3. Enable the existing proposed scenario: six patient markers move; count becomes 10/8/2.
4. Open P06: its unchanged medication restriction remains active.
5. Switch to Trial strategy: the same run shows 20% → 50% modeled eligibility coverage and the age comparison; no fabricated demographic charts.
6. Click an age bar: only the corresponding real fixture records are highlighted.
7. Switch to Decision review: replay source → criterion → patient fields → result; show P16's missing hepatic information.
8. Export the same comparison and review history. End with the concrete workflow, not a claim of guaranteed safety.

## 15. Primary regulatory references

- FDA, *Enhancing Participation in Clinical Trials — Eligibility Criteria, Enrollment Practices, and Trial Designs*, final December 2025: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/enhancing-participation-clinical-trials-eligibility-criteria-enrollment-practices-and-trial-designs ; PDF https://www.fda.gov/media/190162/download . The introduction considers both demographic and non-demographic characteristics. It is nonbinding guidance.
- FDA, *Electronic Systems, Electronic Records, and Electronic Signatures in Clinical Investigations: Questions and Answers*, final October 2024, Q12: https://www.fda.gov/media/166215/download . Source for audit-oriented requirements research, not a claim of compliance.

The published visuals are inspiration, not app assets or permission to reuse licensed 3D content. The software described in this plan has not been implemented or validated by this research task.
