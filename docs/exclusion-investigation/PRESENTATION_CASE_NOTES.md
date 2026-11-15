# Cohort: eight exclusion-investigation presentation cases

Basis: the user-provided research note, reproduced as SOURCE_RESEARCH_NOTE.txt. These notes preserve its qualitative examples. The case IDs, application behaviors, and datasets are proposed demo implementation choices, not extracted real patient records.

## Opening

“We are investigating why a patient was excluded. Sometimes the restriction is justified. Sometimes the record was interpreted incorrectly. Sometimes participation needs support rather than a different medical rule. Cohort shows the distinction and what should happen next.”

## Case notes

### 1. Controlled HIV in cancer trials

**Why the restriction exists:** Adverse reactions, treatment interactions, and interpretation of cancer outcomes.

**Why reconsider:** The note describes considering controlled HIV rather than an automatic diagnosis-based exclusion, while checking other trial requirements.

**Show in the application:** Is viral suppression documented?; Does the supplied CD4 assessment satisfy an explicitly configured protocol requirement?; Was an actual medication interaction assessment completed?; Does the current protocol permit this subgroup, or would the protocol need revision?

**Say:** “The question is not simply whether the patient has HIV. It is whether their current infection status, immune assessment, and medication review justify excluding them from this particular trial.”

**Do not invent:** CD4 acceptance threshold; definition of viral suppression; required stability duration; drug-specific interaction evidence.

**Source:** supplied research note, lines 25–60.

### 2. Treated or clinically stable brain metastases

**Why the restriction exists:** Neurological assessment, complications, and distinguishing treatment effects from disease progression.

**Why reconsider:** The note distinguishes treated or clinically stable metastases from a diagnosis-only exclusion.

**Show in the application:** Are the metastases treated or clinically stable?; What symptoms or relevant concerns are actually documented?; What does this particular protocol say?

**Say:** “The original screen sees brain metastases. The review asks whether they are treated, stable, and actually relevant to the restriction being applied.”

**Do not invent:** Meaning and duration of stability; any symptom, treatment, or medication limits; drug-specific relevant safety restrictions.

**Source:** supplied research note, lines 72–109.

### 3. Older adults with controlled comorbidities

**Why the restriction exists:** Functional status, cardiac disease, previous malignancies, and drug-specific concerns associated with those conditions.

**Why reconsider:** The note distinguishes a historical or controlled condition from an active or severe condition; age alone does not resolve the eligibility question.

**Show in the application:** Is the condition historical or active?; Is it controlled or severe under the supplied clinical assessment?; What specific relevance does it have to the drug and protocol?

**Say:** “An 82-year-old with controlled heart disease is not the same clinical situation as someone with active cardiac instability. We show whether the screen recognized that difference.”

**Do not invent:** Drug-specific cardiac restriction; functional-status requirements; severity and activity definitions.

**Source:** supplied research note, lines 119–160.

### 4. Physical, sensory, and mobility accommodations

**Why the restriction exists:** Ability to attend visits and complete trial procedures; the note also describes broad investigator discretion.

**Why reconsider:** Individualized assessment can identify transport, assistive-device, communication, or procedure accommodations instead of diagnosis-based assumptions.

**Show in the application:** Which specific task is blocked?; Is an accommodation actually available or merely proposed?; Does the accommodation preserve the relevant study procedure?; Is there a separate medical exclusion?

**Say:** “This person was rejected because the team assumed they could not complete the visits. We show whether there is a real barrier, whether support can address it, and whether that support is actually available.”

**Do not invent:** Study tasks and allowed accommodation methods; confirmation of site resources; whether adapted procedures preserve the trial requirements.

**Source:** supplied research note, lines 174–224.

### 5. Intellectual disabilities and participation support

**Why the restriction exists:** Independent completion of questionnaires, understanding instructions, and managing study procedures.

**Why reconsider:** The note asks whether appropriate support could make participation possible instead of making independence a blanket requirement.

**Show in the application:** What assistance is actually required?; Is it available?; Has the applicable consent process been separately assessed?; Would the supported method preserve the required assessment?

**Say:** “Needing help with a questionnaire is not the same thing as being unable to participate. The review identifies what support is needed and what still requires a separate assessment.”

**Do not invent:** Trial-appropriate support arrangements; reviewed consent process; acceptability of adapted measurement or questionnaire methods.

**Source:** supplied research note, lines 230–260.

### 6. Prior or concurrent malignancy

**Why the restriction exists:** Competing risks, interpretation of treatment effects, and interference with safety or efficacy endpoints.

**Why reconsider:** The note describes considering prior or concurrent cancers when they are unlikely to interfere with the trial endpoints.

**Show in the application:** Is the other cancer active?; Is treatment ongoing?; Does a documented assessment identify likely interference with safety or efficacy endpoints?

**Say:** “A cancer treated ten years ago may have little relevance to this trial. We ask whether it actually interferes with the study, rather than excluding someone because the diagnosis remains in their history.”

**Do not invent:** Endpoint-specific interference assessment; relevant treatment interaction assessment; any protocol-specific timing requirement.

**Source:** supplied research note, lines 270–305.

### 7. Pregnancy-specific evidence and research pathways

**Why the restriction exists:** Potential fetal harm and drug-specific pregnancy safety uncertainties.

**Why reconsider:** The note identifies an evidence gap and the possibility of carefully designed pregnancy-specific research, not automatic admission to an existing trial.

**Show in the application:** What does the current trial permit?; Is there a relevant drug-specific concern?; Is the issue a missing research pathway rather than a correctable screen?

**Say:** “Sometimes the answer is not to change this trial. It is to identify the evidence gap and the need for a separate, carefully reviewed research pathway.”

**Do not invent:** Drug-specific maternal/fetal evidence; a separately designed research protocol; appropriate clinical and oversight review.

**Source:** supplied research note, lines 313–339.

### 8. Reduced kidney function and threshold review

**Why the restriction exists:** Drug processing and elimination in patients with impaired kidney function.

**Why reconsider:** The note calls for reviewing the specific measurement, its currency, drug elimination, and evidence behind a cutoff rather than automatically overturning the decision.

**Show in the application:** Which renal metric does this protocol require?; Is the measurement current under a supplied rule?; Does drug-specific evidence support the proposed criterion?

**Say:** “The number matters, but so do the measurement used, when it was taken, and what is known about the drug. We bring those pieces together before asking whether the restriction should change.”

**Do not invent:** The note supplies no actual renal cutoff; no maximum acceptable laboratory age; no dose adjustment or monitoring schedule.

**Source:** supplied research note, lines 347–377.

## Keep three decisions distinct

1. Was the original screen consistent with the current protocol?
2. Does the protocol itself deserve a proposed revision?
3. Can a participation barrier be resolved through documented support?

Pregnancy is a separate research-pathway example in this source. Do not present it as another automatically broadened oncology criterion.

## Suggested short live demonstration

Controlled HIV → physical-access accommodation → older adult with controlled cardiac history → prior malignancy. These show distinct reasons to reconsider without repeating the existing renal-only demo. Use retained-restriction and missing-information counterparts to make the differences clear.

## Source limits

The note explicitly says the studies largely document exclusion patterns and do not supply individual records proving a particular person was wrongly excluded (lines 475–479). Several cited research items appear as publisher or PubMed labels rather than complete article citations. Do not present the note’s study percentages as independently verified findings. It supplies no CD4 cutoff, brain-stability interval, pregnancy eligibility conditions, or universal renal threshold.

These notes do not independently verify external claims. Review clinical and study-specific details with Ehsan, and source status and review terminology with Imtenan.
