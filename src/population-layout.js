export const populationGroups = [
  { id: 'matching', label: 'Already matching', description: 'Meets the original modeled rules', color: '--status-existing-stage', x: -.25, y: -.25 },
  { id: 'new', label: 'Newly matching', description: 'Newly meets the proposed modeled rules', color: '--status-newly-stage', x: .25, y: -.25 },
  { id: 'excluded', label: 'Excluded', description: 'At least one modeled restriction applies', color: '--status-excluded-stage', x: -.25, y: .25 },
  { id: 'indeterminate', label: 'Indeterminate', description: 'Required information is unresolved', color: '--status-indeterminate-stage', x: .25, y: .25 },
];
export const comparePatientIds = (a, b) => String(a.id).localeCompare(String(b.id), 'en', { numeric: true }) || String(a.id).localeCompare(String(b.id), 'en');
export const patientGroup = record => record.status === 'eligible' ? record.newlyEligible ? 'new' : 'matching' : record.status === 'excluded' ? 'excluded' : 'indeterminate';

export function getMarkerLayout(records = []) {
  const sorted = [...records].sort(comparePatientIds);
  if (new Set(sorted.map(record => record.id)).size !== sorted.length) throw new Error('Patient markers require unique patient IDs.');
  return sorted.map(record => {
    const group = populationGroups.find(item => item.id === patientGroup(record));
    return { id: record.id, status: record.status, group: group.id, label: group.description, color: group.color, x: group.x, y: group.y, z: 0 };
  });
}

export function getFocusPageLayout(width, height) {
  const columns = Math.max(1, Math.min(6, Math.floor((width - 12) / 92)));
  const rows = Math.max(1, Math.min(4, Math.floor((height - 36) / 56)));
  return { columns, rows, capacity: columns * rows, tileWidth: 80, tileHeight: 44, gap: 12 };
}

export function getPopulationGroups(run, visibleIds = run.current.records.map(record => record.id)) {
  const visible = new Set(visibleIds);
  const ranked = new Map(run.ranked.map((record, index) => [record.id, index]));
  return populationGroups.map(group => {
    const all = run.current.records.filter(record => patientGroup(record) === group.id).sort((a, b) => group.id === 'new'
      ? (ranked.get(a.id) ?? Infinity) - (ranked.get(b.id) ?? Infinity) || comparePatientIds(a, b)
      : comparePatientIds(a, b));
    return { ...group, total: all.length, records: all.filter(record => visible.has(record.id)) };
  });
}

export function getFocusPage(group, dimensions, requested = 0, locateId = null) {
  const pages = Math.max(1, Math.ceil(group.records.length / dimensions.capacity));
  const index = locateId ? group.records.findIndex(record => record.id === locateId) : -1;
  const page = Math.max(0, Math.min(pages - 1, index < 0 ? requested : Math.floor(index / dimensions.capacity)));
  const start = page * dimensions.capacity;
  const records = group.records.slice(start, start + dimensions.capacity);
  return { ...dimensions, page, pages, start: records.length ? start + 1 : 0, end: start + records.length, total: group.records.length, records };
}

export function getGroupTransfers(previous, current) {
  if (!previous || previous.dataset.id !== current.dataset.id || previous.datasetVersion !== current.datasetVersion) return [];
  const before = new Map(previous.current.records.map(record => [record.id, patientGroup(record)]));
  const transfers = new Map();
  for (const record of current.current.records) {
    const from = before.get(record.id), to = patientGroup(record);
    if (!from || from === to) continue;
    const key = from + ':' + to;
    if (!transfers.has(key)) transfers.set(key, { from, to, ids: [] });
    transfers.get(key).ids.push(record.id);
  }
  return [...transfers.values()];
}
