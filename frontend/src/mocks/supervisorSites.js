// Supervisor-Sites junction table (NO timestamps per spec)
export const supervisorSites = [
  { supervisor_id: 1, site_id: 1 },
  { supervisor_id: 1, site_id: 2 },
  { supervisor_id: 2, site_id: 3 },
  { supervisor_id: 2, site_id: 4 },
  { supervisor_id: 3, site_id: 5 },
];

export const getSitesBySupervisorId = (supervisorId) => 
  supervisorSites.filter(ss => ss.supervisor_id === supervisorId).map(ss => ss.site_id);

export const getSupervisorsBySiteId = (siteId) => 
  supervisorSites.filter(ss => ss.site_id === siteId).map(ss => ss.supervisor_id);
