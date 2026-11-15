# Cohort Presentation

Open **Presentation** in the existing header. The compact setup shows **Cohort — From Exclusion to Evidence**, the SYN-217 reference dataset, computed speaking time, availability and optional speaker notes. Notes remain collapsed until expanded. Start operates the actual application through its existing actions and renderers; each scene reads the current engine result.

## Default story

The configured holds total **300 seconds / 5 minutes**. Loading, positioning, population transitions, progressive view preparation and manual pauses do not consume speaking time. All twelve default scenes are available; none is omitted.

| Scene | Hold | Actual view or action |
|---|---:|---|
| Introduce the study | 15 s | Reference dataset, original scenario, population overview |
| Meet P03 | 25 s | Patient Review; exact original renal failure and rule |
| Inspect the evidence | 35 s | Existing SYN-PK-02 fictional evidence passage and wording |
| Apply the proposed scenario | 20 s | Normal proposed-renal action, settled population and actual P03 result |
| Explain the review priority | 25 s | Existing attention-index factors and interpretation limits |
| A restriction that remains | 25 s | P06's retained medication-interaction failure |
| An unresolved record | 20 s | P16's required missing information and indeterminate result |
| The trial-wide effect | 35 s | Trial Strategy; engine-backed transition and exact newly matching group |
| The people behind the total | 30 s | Age composition, then actual records in the proposed 75+ group |
| Guidance alignment and open questions | 30 s | Existing FDA guidance matrix; documented topic, then unresolved topic |
| Trace the recorded decision | 25 s | Existing source, rule, patient inputs and criterion result |
| A reason you can inspect | 15 s | Current report preview; stops with Replay and Exit |

[`src/presentation-scenes.js`](../../src/presentation-scenes.js) holds stable scene IDs, editable durations, context, readiness policy, targets, captions, notes and progressive beats. Beat positions are fractions of each scene's hold. This is one story, with no presentation builder or external orchestration service.

## Presenter controls

Pause cancels the single countdown, pending scene work and automatic scrolling immediately. A harmless population transition may settle. Play resumes the remaining hold; it does not restart the story. Previous, Next and the picker retain playing or paused intent, cancel stale work and start the selected scene at its configured duration.

Pointer, wheel, input and relevant keyboard interaction outside the presentation UI interrupts playback. Hover alone does not. The manual view remains in place until **Return to this scene and continue** (restores only the scene view and remaining hold) or **Continue with the next scene**. Highlighting disappears during manual exploration. Native inputs, textareas, selects, editable elements and controls keep their own keys. Space plays/pauses, arrows navigate and Escape exits elsewhere. Hidden-tab visibility events pause and require explicit resume.

Controls stay accessible in the active native dialog, including evidence, patient explorer, profile review and report. On desktop Patient Review they dock beneath the population rather than covering the inspector. Trial and Decision Review reserve room below the workspace. Phone controls wrap, and focus uses a subtle outline attached to the real component. Active playback repositions after viewport resizing without resetting its remaining time; paused/manual exploration stays untouched. Existing Motion transitions and reduced-motion behavior are reused.

## Integration and data boundaries

| Files | Purpose |
|---|---|
| `src/presentation-controller.js` | Small state controller, one authoritative clock, abort/revision protection, pause/resume, progressive beats, retry, optional skip, completion and restoration |
| `src/presentation.js`, `src/presentation.css` | Setup, stable accessible controls, dialog relocation, shortcuts, intervention/lifecycle listeners and focus styling |
| `src/studio.js` | Existing-action adapter, preflight, explicit view capture/restore, actual readiness checks, target focus and cleanup |
| `src/workspace.js` | Labels only presentation-driven dataset/scenario navigation as Presentation playback with a session ID |
| `src/population-stage.js` | Exposes transition readiness and compatible population view capture/restore |
| Existing patient, chart, evidence and report renderers | Small stable target attributes; no duplicate presentation metrics |
| `tests/presentation.test.js` | Clock, cancellation, navigation, availability, failure, replay, edit and event-separation regressions |

Preflight checks the reference fixture, patient IDs, executable scenario, actual fictional passage and real renderer targets. It uses a detached reference workspace only to check renderer availability; playback uses the live analysis and working dataset. Missing optional priority/composition/trace views are named and omitted with a recomputed duration. Missing required content blocks Start. Runtime readiness failures stop with a readable error and Retry, optional Skip or Exit.

The restoration snapshot contains view fields only: dataset/scenario selection, patient, perspective, filters, detail/chart/trace view, population mode, transient panels and scroll positions. It never replaces the clinical store, working records, evidence, review history or reviewer notes. Presentation actions do not submit forms, add profiles, approve patients, print or download. Deliberate manual actions remain actual Demo reviewer events; navigation telemetry is separately labelled Presentation playback. As before, reload clears this local browser-tab session.

## Browser evidence

- [Setup](screenshots/setup.png)
- [Exact P03 exclusion](screenshots/patient-exclusion.png)
- [Fictional evidence passage](screenshots/evidence.png)
- [Population transition](screenshots/population-impact.png)
- [Final report and stopped controls](screenshots/completed-report.png)
- [Actual 75+ records](screenshots/normal-composition.png), [recorded criterion result](screenshots/normal-trace.png)
- [Documented guidance topic](screenshots/guidance-documented.png), [unresolved drug-evidence topic](screenshots/guidance-open-question.png)
- [Tablet](screenshots/tablet.png), [phone](screenshots/phone.png), [phone evidence](screenshots/phone-evidence.png)

## Verification

- `npm test`: **200 passed, 0 failed**, including fourteen Presentation regressions. Existing clinical results, sources, chart groups, dataset behavior, ranking and reviewer-action separation remain covered.
- `npm run check`: passed for every source module. No separate lint command is configured.
- `npm run build`: passed. All **50** built JS/CSS/index files were hash-compared with source, with no differences.
- Development browser: **81 workflow checks passed**: 40 scene/control/restoration checks, 22 interruption/editing checks and 19 availability/readiness/lifecycle/responsive checks. Actual saved reviewer text and a deliberately added synthetic working record both survived Exit. Tour actions created no reviewer annotations or automatic downloads.
- Additional modal checks verified that manual profile editing keeps Exit in the viewport on desktop and phone, and that Exit works from that topmost dialog. Its form scrolls independently while the presentation controls remain visible.
- Final screenshot checks waited for setup and both guidance beats to settle, verified the guidance outline stays inside its clipping container, and confirmed Exit cleanup. The final browser console contained no errors.
- **The complete default sequence ran once at normal configured timing without intervention**: 300 seconds of speaking time, **312.5 seconds wall time** including readiness. Seventeen audit checks passed. It visited all twelve scenes in order, opened P09/P13 automatically, showed the documented population topic and partially documented drug-evidence topic with unresolved applicability, progressed through all four trace steps, and stopped on the actual report. Every observed playing state had settled population content. The final report history contained only initialization and two navigation events; no reviewer annotations or downloads were created. Completion remained stopped without looping.
- Readiness fault injection removed the required evidence target during entry: playback stopped with an error, required Skip/Next stayed unavailable, and Retry restored the actual view while paused. Separate optional-target removal omitted priority, changed the plan to eleven scenes and recomputed speaking time to 4 min 35 sec. A missing required chart target blocked Start.
- Reduced motion, native form/picker keys, rapid navigation, pause during preparation, scroll cancellation, phone/tablet resizing and modal controls passed. Screenshots at 1440×1000, 768×1024 and 375×812 were visually inspected; the focused phone explanation and evidence remain readable above the controls, with no page-wide horizontal overflow.

The automated Chromium session keeps an actual background tab's `document.hidden` false. The hidden/visible handler was therefore verified with deterministic browser visibility events: hidden paused the countdown, and visible did not resume it. Native operating-system tab/window visibility and other browsers are not certified.

The independently served static build passed **17 workflow checks**, including real evidence, scenario analysis, linked flow focus, interruption/return, the documented population topic, the partially documented drug-evidence topic with unresolved applicability, report preview and prior-view restoration. No runtime errors, downloads or print invocation occurred.

Reproducible scripts, logs and `normal-audit.json` live under ignored `output/playwright/presentation/`. No deployment or publication is part of this change.
