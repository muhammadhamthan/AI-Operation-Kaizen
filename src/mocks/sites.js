// Sites Mock Data - 5 Chennai locations
export const sites = [
  {
    id: 1,
    name: 'Vepery Industrial Complex',
    location: 'Vepery, Chennai',
    coordinates: { lat: 13.0827, lon: 80.2707 },
    created_at: '2023-01-01T09:00:00Z',
    updated_at: '2025-01-01T09:00:00Z',
  },
  {
    id: 2,
    name: 'Ambattur Manufacturing Unit',
    location: 'Ambattur, Chennai',
    coordinates: { lat: 13.1143, lon: 80.1548 },
    created_at: '2023-02-01T09:00:00Z',
    updated_at: '2025-01-01T09:00:00Z',
  },
  {
    id: 3,
    name: 'Guindy Tech Park',
    location: 'Guindy, Chennai',
    coordinates: { lat: 13.0067, lon: 80.2206 },
    created_at: '2023-03-01T09:00:00Z',
    updated_at: '2025-01-01T09:00:00Z',
  },
  {
    id: 4,
    name: 'Perungudi IT Corridor',
    location: 'Perungudi, Chennai',
    coordinates: { lat: 12.9645, lon: 80.2486 },
    created_at: '2023-04-01T09:00:00Z',
    updated_at: '2025-01-01T09:00:00Z',
  },
  {
    id: 5,
    name: 'Taramani Innovation Hub',
    location: 'Taramani, Chennai',
    coordinates: { lat: 12.9831, lon: 80.2432 },
    created_at: '2023-05-01T09:00:00Z',
    updated_at: '2025-01-01T09:00:00Z',
  },
];

export const getSiteById = (id) => sites.find(site => site.id === id);
export const getSitesByIds = (ids) => sites.filter(site => ids.includes(site.id));
