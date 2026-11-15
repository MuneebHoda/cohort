// Supplied case specification, excluding anchor expectations. Original research-note text was not supplied.
export const casePackMetadata = {
  "version": "1.0",
  "source": {
    "filename": "SOURCE_RESEARCH_NOTE.txt",
    "original_filename": "Pasted text.txt",
    "sha256": "9ca0f0a2a5b0056cf235c6a99f0114f794934867381d7bf9f3810dd97bd0cc8e",
    "line_count": 499,
    "status": "user_provided_secondary_summary",
    "unresolved_bibliography": true,
    "available": false
  },
  "taxonomy": [
    "Incorrect interpretation",
    "Lack of individualized assessment",
    "Inadequate accommodations",
    "Overly restrictive medical thresholds"
  ],
  "cases": [
    {
      "id": "HIV",
      "title": "Controlled HIV in cancer trials",
      "source_lines": [
        25,
        60
      ],
      "source_category": [
        "Incorrect interpretation",
        "Lack of individualized assessment"
      ],
      "original_concern": "Adverse reactions, treatment interactions, and interpretation of cancer outcomes.",
      "reconsideration_basis": "The note describes considering controlled HIV rather than an automatic diagnosis-based exclusion, while checking other trial requirements.",
      "fields": [
        "hiv_status",
        "viral_load_status",
        "viral_load_collection_date",
        "cd4_value",
        "cd4_unit",
        "cd4_protocol_assessment",
        "current_antiretroviral_medications",
        "interaction_assessment",
        "other_criteria_results"
      ],
      "missing_configuration": [
        "CD4 acceptance threshold",
        "definition of viral suppression",
        "required stability duration",
        "drug-specific interaction evidence"
      ],
      "review_questions": [
        "Is viral suppression documented?",
        "Does the supplied CD4 assessment satisfy an explicitly configured protocol requirement?",
        "Was an actual medication interaction assessment completed?",
        "Does the current protocol permit this subgroup, or would the protocol need revision?"
      ],
      "presentation_line": "The question is not simply whether the patient has HIV. It is whether their current infection status, immune assessment, and medication review justify excluding them from this particular trial.",
      "source_status": "provided_secondary_research_note_not_independently_verified",
      "case_context": "separate_hypothetical_protocol_snapshot; not a universal extension of SYN-217"
    },
    {
      "id": "BRAIN",
      "title": "Treated or clinically stable brain metastases",
      "source_lines": [
        72,
        109
      ],
      "source_category": [
        "Lack of individualized assessment"
      ],
      "original_concern": "Neurological assessment, complications, and distinguishing treatment effects from disease progression.",
      "reconsideration_basis": "The note distinguishes treated or clinically stable metastases from a diagnosis-only exclusion.",
      "fields": [
        "brain_metastases_present",
        "prior_treatment_status",
        "current_stability_assessment",
        "neurological_symptoms",
        "assessment_date",
        "drug_specific_neurological_concern",
        "other_criteria_results"
      ],
      "missing_configuration": [
        "Meaning and duration of stability",
        "any symptom, treatment, or medication limits",
        "drug-specific relevant safety restrictions"
      ],
      "review_questions": [
        "Are the metastases treated or clinically stable?",
        "What symptoms or relevant concerns are actually documented?",
        "What does this particular protocol say?"
      ],
      "presentation_line": "The original screen sees brain metastases. The review asks whether they are treated, stable, and actually relevant to the restriction being applied.",
      "source_status": "provided_secondary_research_note_not_independently_verified",
      "case_context": "separate_hypothetical_protocol_snapshot; not a universal extension of SYN-217"
    },
    {
      "id": "OLDER",
      "title": "Older adults with controlled comorbidities",
      "source_lines": [
        119,
        160
      ],
      "source_category": [
        "Lack of individualized assessment",
        "Overly restrictive medical thresholds"
      ],
      "original_concern": "Functional status, cardiac disease, previous malignancies, and drug-specific concerns associated with those conditions.",
      "reconsideration_basis": "The note distinguishes a historical or controlled condition from an active or severe condition; age alone does not resolve the eligibility question.",
      "fields": [
        "age_years",
        "cardiac_history",
        "current_cardiac_status",
        "condition_severity_assessment",
        "functional_assessment",
        "current_comorbidity_treatment",
        "drug_specific_concern",
        "other_criteria_results"
      ],
      "missing_configuration": [
        "Drug-specific cardiac restriction",
        "functional-status requirements",
        "severity and activity definitions"
      ],
      "review_questions": [
        "Is the condition historical or active?",
        "Is it controlled or severe under the supplied clinical assessment?",
        "What specific relevance does it have to the drug and protocol?"
      ],
      "presentation_line": "An 82-year-old with controlled heart disease is not the same clinical situation as someone with active cardiac instability. We show whether the screen recognized that difference.",
      "source_status": "provided_secondary_research_note_not_independently_verified",
      "case_context": "separate_hypothetical_protocol_snapshot; not a universal extension of SYN-217"
    },
    {
      "id": "ACCESS",
      "title": "Physical, sensory, and mobility accommodations",
      "source_lines": [
        174,
        224
      ],
      "source_category": [
        "Inadequate accommodations",
        "Lack of individualized assessment"
      ],
      "original_concern": "Ability to attend visits and complete trial procedures; the note also describes broad investigator discretion.",
      "reconsideration_basis": "Individualized assessment can identify transport, assistive-device, communication, or procedure accommodations instead of diagnosis-based assumptions.",
      "fields": [
        "functional_support_needs",
        "required_study_tasks",
        "task_specific_ability_assessment",
        "accommodations_requested",
        "accommodation_availability",
        "availability_confirmation",
        "procedure_validity_review",
        "other_criteria_results"
      ],
      "missing_configuration": [
        "Study tasks and allowed accommodation methods",
        "confirmation of site resources",
        "whether adapted procedures preserve the trial requirements"
      ],
      "review_questions": [
        "Which specific task is blocked?",
        "Is an accommodation actually available or merely proposed?",
        "Does the accommodation preserve the relevant study procedure?",
        "Is there a separate medical exclusion?"
      ],
      "presentation_line": "This person was rejected because the team assumed they could not complete the visits. We show whether there is a real barrier, whether support can address it, and whether that support is actually available.",
      "source_status": "provided_secondary_research_note_not_independently_verified",
      "case_context": "separate_hypothetical_protocol_snapshot; not a universal extension of SYN-217"
    },
    {
      "id": "COGNITIVE",
      "title": "Intellectual disabilities and participation support",
      "source_lines": [
        230,
        260
      ],
      "source_category": [
        "Inadequate accommodations"
      ],
      "original_concern": "Independent completion of questionnaires, understanding instructions, and managing study procedures.",
      "reconsideration_basis": "The note asks whether appropriate support could make participation possible instead of making independence a blanket requirement.",
      "fields": [
        "communication_support_needs",
        "questionnaire_completion_method",
        "procedure_support_plan",
        "support_availability",
        "consent_process_assessment_status",
        "study_method_acceptability_review",
        "other_criteria_results"
      ],
      "missing_configuration": [
        "Trial-appropriate support arrangements",
        "reviewed consent process",
        "acceptability of adapted measurement or questionnaire methods"
      ],
      "review_questions": [
        "What assistance is actually required?",
        "Is it available?",
        "Has the applicable consent process been separately assessed?",
        "Would the supported method preserve the required assessment?"
      ],
      "presentation_line": "Needing help with a questionnaire is not the same thing as being unable to participate. The review identifies what support is needed and what still requires a separate assessment.",
      "source_status": "provided_secondary_research_note_not_independently_verified",
      "case_context": "separate_hypothetical_protocol_snapshot; not a universal extension of SYN-217"
    },
    {
      "id": "PRIOR",
      "title": "Prior or concurrent malignancy",
      "source_lines": [
        270,
        305
      ],
      "source_category": [
        "Lack of individualized assessment"
      ],
      "original_concern": "Competing risks, interpretation of treatment effects, and interference with safety or efficacy endpoints.",
      "reconsideration_basis": "The note describes considering prior or concurrent cancers when they are unlikely to interfere with the trial endpoints.",
      "fields": [
        "prior_cancer_history",
        "time_since_treatment_years",
        "recurrence_status",
        "current_cancer_activity",
        "other_cancer_treatment",
        "endpoint_interference_assessment",
        "safety_interference_assessment",
        "other_criteria_results"
      ],
      "missing_configuration": [
        "Endpoint-specific interference assessment",
        "relevant treatment interaction assessment",
        "any protocol-specific timing requirement"
      ],
      "review_questions": [
        "Is the other cancer active?",
        "Is treatment ongoing?",
        "Does a documented assessment identify likely interference with safety or efficacy endpoints?"
      ],
      "presentation_line": "A cancer treated ten years ago may have little relevance to this trial. We ask whether it actually interferes with the study, rather than excluding someone because the diagnosis remains in their history.",
      "source_status": "provided_secondary_research_note_not_independently_verified",
      "case_context": "separate_hypothetical_protocol_snapshot; not a universal extension of SYN-217"
    },
    {
      "id": "PREG",
      "title": "Pregnancy-specific evidence and research pathways",
      "source_lines": [
        313,
        339
      ],
      "source_category": [
        "Distinct research-pathway case; not an automatic inclusion revision"
      ],
      "original_concern": "Potential fetal harm and drug-specific pregnancy safety uncertainties.",
      "reconsideration_basis": "The note identifies an evidence gap and the possibility of carefully designed pregnancy-specific research, not automatic admission to an existing trial.",
      "fields": [
        "pregnancy_status",
        "trial_pregnancy_policy",
        "drug_specific_pregnancy_evidence_status",
        "documented_drug_specific_concern",
        "research_pathway_review_status",
        "oversight_review_status",
        "other_criteria_results"
      ],
      "missing_configuration": [
        "Drug-specific maternal/fetal evidence",
        "a separately designed research protocol",
        "appropriate clinical and oversight review"
      ],
      "review_questions": [
        "What does the current trial permit?",
        "Is there a relevant drug-specific concern?",
        "Is the issue a missing research pathway rather than a correctable screen?"
      ],
      "presentation_line": "Sometimes the answer is not to change this trial. It is to identify the evidence gap and the need for a separate, carefully reviewed research pathway.",
      "source_status": "provided_secondary_research_note_not_independently_verified",
      "case_context": "separate_hypothetical_protocol_snapshot; not a universal extension of SYN-217"
    },
    {
      "id": "RENAL",
      "title": "Reduced kidney function and threshold review",
      "source_lines": [
        347,
        377
      ],
      "source_category": [
        "Overly restrictive medical thresholds",
        "Incorrect interpretation"
      ],
      "original_concern": "Drug processing and elimination in patients with impaired kidney function.",
      "reconsideration_basis": "The note calls for reviewing the specific measurement, its currency, drug elimination, and evidence behind a cutoff rather than automatically overturning the decision.",
      "fields": [
        "renal_metric_type",
        "renal_value",
        "renal_unit",
        "collection_date",
        "laboratory_method",
        "drug_elimination_evidence",
        "configured_protocol_limit",
        "configured_proposed_limit",
        "measurement_currency_assessment",
        "other_criteria_results"
      ],
      "missing_configuration": [
        "The note supplies no actual renal cutoff",
        "no maximum acceptable laboratory age",
        "no dose adjustment or monitoring schedule"
      ],
      "review_questions": [
        "Which renal metric does this protocol require?",
        "Is the measurement current under a supplied rule?",
        "Does drug-specific evidence support the proposed criterion?"
      ],
      "presentation_line": "The number matters, but so do the measurement used, when it was taken, and what is known about the drug. We bring those pieces together before asking whether the restriction should change.",
      "source_status": "provided_secondary_research_note_not_independently_verified",
      "case_context": "separate_hypothetical_protocol_snapshot; not a universal extension of SYN-217"
    }
  ]
};
