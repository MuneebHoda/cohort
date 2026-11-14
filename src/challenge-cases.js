import { anchorPatients } from './patients.js';
const patient = changes => ({ ...structuredClone(anchorPatients[1]), ...changes });
// Software stress tests only. These records never enter ordinary cohort analytics.
export const challengeCases = [
  { id: 'missing-lab', patient: patient({ id: 'CHECK-MISSING', egfr_ml_min_1_73m2: null }) },
  { id: 'conflicting-lab', patient: patient({ id: 'CHECK-CONFLICT', conflicts: ['egfr_ml_min_1_73m2'] }) },
  { id: 'invalid-unit', patient: patient({ id: 'CHECK-UNIT', units: { egfr_ml_min_1_73m2: 'mL/min' } }) },
  { id: 'inclusive-boundary', patient: patient({ id: 'CHECK-BOUNDARY', egfr_ml_min_1_73m2: 45 }) },
  { id: 'below-boundary', patient: patient({ id: 'CHECK-BELOW', egfr_ml_min_1_73m2: 44.9 }) },
  { id: 'multiple-exclusions', patient: patient({ id: 'CHECK-MULTIPLE', egfr_ml_min_1_73m2: 33, ecog: 2, hepatic_status: 'severe', strong_cyp3a_inhibitor: true }) },
  { id: 'hard-interaction', patient: patient({ id: 'CHECK-DDI', strong_cyp3a_inhibitor: true }) },
  { id: 'missing-evidence-reference', patient: patient({ id: 'CHECK-EVIDENCE' }), removeEvidenceId: 'SYN-PK-02' },
];
