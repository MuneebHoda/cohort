# Codex task — Cohort live visual review, milestone 1 only

Read the attached `DESIGN.md`, this instruction, and the existing `syn217_demo_case.json`. This is a scoped continuation of the current project, not permission to restart it or implement the entire roadmap.

## Goal

Deliver one beautiful, functioning journey across **Patient review**, **Trial strategy**, and **Decision review**, all using the same scenario, patient selection, and calculated results.

The application should feel alive because it reacts meaningfully to real state changes. Its central visual is a genuine interactive 3D constellation with one selectable marker per loaded patient. Keep detailed evidence and quantitative charts readable in normal HTML/SVG.

## First inspect

Read AGENTS.md. Inspect the actual framework, package versions, scripts, existing engine, existing design, and test setup. Reuse working code and installed components. Make a brief implementation statement, then implement. Do not stop at a plan.

The existing frontend stack has not been assumed. If it is React, use a compatible stable React Three Fiber/Three.js setup. Do not change React major versions for this task. Reuse the existing animation/chart library where practical. Avoid stacking multiple WebGL engines.

## Preserve the existing clinical demonstration

The case is explicitly fictional, with 20 records. Preserve it as a regression fixture.

Original: 4 meet modeled rules, 15 excluded, 1 indeterminate.
Proposed: 10 meet modeled rules, 8 excluded, 2 indeterminate.
Newly matching: P02, P03, P09, P11, P13, P19.
Attention-index ranking: P13, P02, P19, P09, P03, P11.

Calculate these results from the records and rules; never hardcode interface totals. Ranking cannot override exclusions or missing required information. Do not reinterpret the score as a clinical risk probability.

Keep evidence applicability distinct from the modeled-rule result. The existing file does not establish longitudinal renal stability. Surface applicability questions without silently changing the supplied baseline.

## Build these five connected pieces

### 1. Shared workspace shell

Use a persistent header with study, synthetic-demo label, original/proposed scenario control, and three perspective tabs. Preserve selectedPatientId, scenarioId, filters, and analysisRunId when switching perspectives.

Use the DESIGN.md palette as a proposal adapted to the existing app: dark matte 3D stage, quiet navigation, light readable evidence sheets, restrained teal/sky-blue/amber/coral status accents. Avoid an unrelated marketing landing page and excessive KPI cards.

### 2. Live cohort constellation

- Exactly one data-linked marker per record: 20 for this fixture.
- Distinct, labeled states for matching, newly matching, excluded, and indeterminate.
- Stable IDs, stable layouts, accessible selection through both the scene and a table.
- Clicking a marker opens that patient's details.
- Changing scenario recomputes results before animating the affected markers into their new groups.
- Show P06 remaining excluded and P16 becoming indeterminate.
- Offer a matching 2D/table fallback. No fake decorative records or invented live vitals.
- Use one canvas, restrained motion, and reduced-motion support. Suspend unnecessary rendering when idle/hidden. Keep navigation and report printing independent of WebGL.

### 3. Patient-review detail

Show demographics that are actually present, original/proposed status, all criterion outcomes, reasons, evidence references, missing information, and next review step.

For P03, show the existing illustrative 39/100 index with exact factor contributions. Label it as unvalidated reviewer-attention scoring, not 39% toxicity risk. Clinical concern dimensions remain separately visible.

Open evidence in a readable panel with title, source type, passage, and relationship to the criterion. Keep official guidance distinct from fictional drug evidence. Display missing source excerpts honestly rather than inventing quotations.

Add a compact `Review a profile` action with a structured synthetic-profile form or validated pasted JSON using the current engine's fields. Boolean clinical fields support yes/no/unknown. Evaluate drafts in a scratch panel against both scenarios; do not change cohort totals until an explicit `Add synthetic profile to working cohort` action. That action versions the working dataset. Reset restores the unchanged 20-record fixture. No arbitrary PDF parsing or real identifiable patient data.

A full anatomical 3D model is outside milestone 1. A lightweight contextual schematic may be used without delaying the actual 3D cohort visualization. It must not look like patient-specific imaging.

### 4. Trial-strategy view

Show calculated matching coverage 4/20 versus 10/20, the six newly matching records, excluded/indeterminate counts, and a real age breakdown.

Expected age counts for checking, not UI hardcoding:
- Under 65: screened 9; original matching 3; proposed matching 5.
- 65–74: screened 9; original matching 1; proposed matching 3.
- 75+: screened 2; original matching 0; proposed matching 2.

Use paired bars or a compact count matrix. Clicking a group filters/highlights the same patient IDs. Label denominators, synthetic status, and small groups.

The current file lacks sex, race, ethnicity, geography, sites, and actual enrollment data. Do not fabricate charts or infer these attributes. Show purposeful missing-data states and a clearly separated extension point for later explicit synthetic metadata. Label this candidate composition, not actual enrolled-trial diversity or coverage of all disease patients.

### 5. Decision-review view

Label it `Regulatory review — simulation`, with no FDA seal, approval badge, or real-agency identity.

Show a source-to-decision chain: source/version → criterion/version → patient fields → outcomes → score factors → review event. A simple SVG/HTML chain is sufficient; avoid adding a graph framework unless necessary.

Record actual demonstration actions with actor label, timestamp, scenario versions, reason, changed IDs, and run ID. Do not invent Ehsan/Imtenan approvals or legal signatures. A local log is not a tamper-proof production audit trail.

Provide a working comparison/report export or print action using the same current state. A persona switch is a presentation mode, not authenticated authorization.

## Completion checks

- Existing baseline engine tests still pass.
- Original/proposed counts, newly matching IDs, ranking, and age counts reconcile.
- No score overrides a failure or unknown result.
- All scene markers map to records; the table and charts agree.
- Scenario switches are reversible and preserve patient identity.
- All three views show the same selected scenario/run.
- Missing demographic values do not influence the clinical index.
- Scratch profile review does not change cohort totals; explicit addition creates a dataset version; reset restores the base case.
- Reports match the displayed scenario and filters, with denominators explicit.
- Reduced motion, keyboard table access, and WebGL fallback work.
- Existing build/lint/test checks pass or failures are reported honestly.
- Inspect real browser screenshots at the target laptop viewport and a smaller viewport when tooling is available.

## Scope control

Do not build milestone 2 or 3 yet. No new authentication system, database, EHR import, billing, autonomous agents, arbitrary threshold sliders, real medication advice, external model API, or fake live AI streaming.

Do not hardcode results to make the demo pass. Do not weaken tests. Do not replace the existing engine with generated clinical logic. Clinical/ranking configuration stays editable data.

## Handoff

Return the preview URL or exact launch command; key changed files; what is genuinely calculated versus fixture-based; actual test results; screenshots or browser-inspection status; and remaining clinical/content questions for Ehsan and source/terminology questions for Imtenan.

Stop after this complete visual milestone. Recommend later refinements only after the working journey is demonstrated.
