const statuses = ['eligible', 'excluded', 'indeterminate'];
const statusName = { eligible: 'meets modeled rules', excluded: 'excluded', indeterminate: 'indeterminate' };
const unique = records => [...new Set(records.map(record => record.id))];
const fraction = (numerator, denominator) => ({ numerator, denominator, percent: denominator ? Math.round(numerator / denominator * 1000) / 10 : null });

export function exclusionRows(run) {
  const ids = [...new Set(run.current.records.flatMap(record => record.evaluations.map(item => item.criterionId)))];
  const result = (record, id) => record.evaluations.find(item => item.criterionId === id);
  const originalById = new Map(run.original.records.map(record => [record.id, record]));
  return ids.map(id => {
    const evaluation = run.current.records.flatMap(record => record.evaluations).find(item => item.criterionId === id);
    const affected = unique(run.current.records.filter(record => result(record,id)?.result === 'FAIL'));
    const originallyAffected = unique(run.original.records.filter(record => result(record,id)?.result === 'FAIL'));
    const newlyMatching = run.proposed.available === false ? [] : unique(run.proposed.records.filter(record => record.newlyEligible && result(record,id)?.result === 'PASS' && result(originalById.get(record.id),id)?.result === 'FAIL'));
    return { id, label: evaluation.title, affected, originallyAffected, newlyMatching, fraction: fraction(affected.length, run.current.excluded), groupId: `criterion:${id}`, newGroupId: `resolved:${id}` };
  }).filter(row => row.affected.length || row.newlyMatching.length).sort((a,b) => b.affected.length - a.affected.length || a.id.localeCompare(b.id));
}
export function compositionComparison(run, dimension = 'age') {
  const definition = dimension === 'age' ? { id:'age', label:'Age', groups:run.ageGroups } : dimension === 'clinical' && !run.casePack ? {id:'clinical',label:'Clinical subgroups',groups:run.subgroups} : run.demographics.find(item => item.id === dimension);
  if (!definition) throw new TypeError('Composition dimension is not available for this study.');
  const original = new Set(run.original.records.filter(record => record.status === 'eligible').map(record => record.id));
  const proposed = new Set(run.proposed.records.filter(record => record.status === 'eligible').map(record => record.id));
  return { id:definition.id, label:definition.label, overlapping:dimension === 'clinical', proposedAvailable:run.proposed.available !== false,
    rows:definition.groups.map(group => {
      const before = group.ids.filter(id => original.has(id)), after = group.ids.filter(id => proposed.has(id));
      return { id:group.id, label:group.label, screened:group.ids.length, originalIds:before, proposedIds:after,
        originalComposition:fraction(before.length,run.original.eligible), originalWithin:fraction(before.length,group.ids.length),
        proposedComposition:run.proposed.available === false ? null : fraction(after.length,run.proposed.eligible), proposedWithin:run.proposed.available === false ? null : fraction(after.length,group.ids.length),
        originalGroupId:`composition:${dimension}:${group.id}:original`, proposedGroupId:`composition:${dimension}:${group.id}:proposed`,
      };
    }),
  };
}
export function buildAnalysisGroups(run) {
  const groups = [];
  const add = (id,label,ids,kind) => groups.push({id,label,ids,kind});
  if (run.proposed.available !== false) {
    const proposed = new Map(run.proposed.records.map(record => [record.id,record]));
    for (const from of statuses) for (const to of statuses) {
      const ids = unique(run.original.records.filter(record => record.status === from && proposed.get(record.id)?.status === to));
      if (ids.length) add(`flow:${from}:${to}`,`Original ${statusName[from]} → proposed ${statusName[to]}`,ids,'flow');
    }
  }
  for (const row of exclusionRows(run)) {
    add(row.groupId,`${row.label} · current exclusion`,row.affected,'criterion');
    if (row.newlyMatching.length) add(row.newGroupId,`${row.label} resolved · proposed newly matching`,row.newlyMatching,'resolved');
  }
  for (const dimension of ['age',...(!run.casePack?['clinical']:[]),...run.demographics.filter(item=>item.id!=='gender').map(item=>item.id)]) {
    for (const row of compositionComparison(run,dimension).rows) {
      add(row.originalGroupId,`${row.label} · original matching`,row.originalIds,'composition');
      if(run.proposed.available !== false)add(row.proposedGroupId,`${row.label} · proposed matching`,row.proposedIds,'composition');
    }
  }
  return groups;
}
