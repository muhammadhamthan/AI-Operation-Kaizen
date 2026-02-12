// Issue Images Mock Data - Before and After are SEPARATE rows
export const issueImages = [
  // Issue 1 images (Completed)
  {
    id: 1,
    issue_id: 1,
    uploaded_by_user_id: 1,
    image_url: 'https://placehold.co/600x400/ef4444/white?text=Water+Leak+Before',
    image_type: 'BEFORE',
    ai_flag: false,
    ai_details: null,
    created_at: '2025-06-14T08:30:00Z',
    updated_at: '2025-06-14T08:30:00Z',
  },
  {
    id: 2,
    issue_id: 1,
    uploaded_by_user_id: 6,
    image_url: 'https://placehold.co/600x400/22c55e/white?text=Water+Leak+Fixed',
    image_type: 'AFTER',
    ai_flag: false,
    ai_details: null,
    created_at: '2025-06-15T15:30:00Z',
    updated_at: '2025-06-15T15:30:00Z',
  },
  // Issue 2 images (Completed)
  {
    id: 3,
    issue_id: 2,
    uploaded_by_user_id: 1,
    image_url: 'https://placehold.co/600x400/eab308/white?text=Panel+Fault+Before',
    image_type: 'BEFORE',
    ai_flag: false,
    ai_details: null,
    created_at: '2025-06-18T08:00:00Z',
    updated_at: '2025-06-18T08:00:00Z',
  },
  {
    id: 4,
    issue_id: 2,
    uploaded_by_user_id: 7,
    image_url: 'https://placehold.co/600x400/22c55e/white?text=Panel+Repaired',
    image_type: 'AFTER',
    ai_flag: false,
    ai_details: null,
    created_at: '2025-06-20T14:00:00Z',
    updated_at: '2025-06-20T14:00:00Z',
  },
  // Issue 3 images (Completed)
  {
    id: 5,
    issue_id: 3,
    uploaded_by_user_id: 2,
    image_url: 'https://placehold.co/600x400/3b82f6/white?text=AC+Unit+Before',
    image_type: 'BEFORE',
    ai_flag: false,
    ai_details: null,
    created_at: '2025-06-22T09:00:00Z',
    updated_at: '2025-06-22T09:00:00Z',
  },
  {
    id: 6,
    issue_id: 3,
    uploaded_by_user_id: 8,
    image_url: 'https://placehold.co/600x400/22c55e/white?text=AC+Working',
    image_type: 'AFTER',
    ai_flag: false,
    ai_details: null,
    created_at: '2025-06-25T15:00:00Z',
    updated_at: '2025-06-25T15:00:00Z',
  },
  // Issue 6 images (Escalated - only before)
  {
    id: 7,
    issue_id: 6,
    uploaded_by_user_id: 1,
    image_url: 'https://placehold.co/600x400/991b1b/white?text=Fire+Alarm+Issue',
    image_type: 'BEFORE',
    ai_flag: true,
    ai_details: 'Sensor damage detected',
    created_at: '2025-06-22T10:00:00Z',
    updated_at: '2025-06-22T10:00:00Z',
  },
  // Issue 13 images (In Progress)
  {
    id: 8,
    issue_id: 13,
    uploaded_by_user_id: 1,
    image_url: 'https://placehold.co/600x400/f97316/white?text=AC+Duct+Dirty',
    image_type: 'BEFORE',
    ai_flag: false,
    ai_details: null,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  // Issue 16 images (In Progress - Overdue)
  {
    id: 9,
    issue_id: 16,
    uploaded_by_user_id: 2,
    image_url: 'https://placehold.co/600x400/ef4444/white?text=Exit+Sign+Broken',
    image_type: 'BEFORE',
    ai_flag: false,
    ai_details: null,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  // Issue 24 images (In Progress)
  {
    id: 10,
    issue_id: 24,
    uploaded_by_user_id: 1,
    image_url: 'https://placehold.co/600x400/8b5cf6/white?text=Door+Lock+Stuck',
    image_type: 'BEFORE',
    ai_flag: false,
    ai_details: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  // More completed issue images
  {
    id: 11,
    issue_id: 4,
    uploaded_by_user_id: 2,
    image_url: 'https://placehold.co/600x400/6b7280/white?text=Door+Handle+Before',
    image_type: 'BEFORE',
    ai_flag: false,
    ai_details: null,
    created_at: '2025-06-26T08:00:00Z',
    updated_at: '2025-06-26T08:00:00Z',
  },
  {
    id: 12,
    issue_id: 4,
    uploaded_by_user_id: 9,
    image_url: 'https://placehold.co/600x400/22c55e/white?text=Door+Handle+Fixed',
    image_type: 'AFTER',
    ai_flag: false,
    ai_details: null,
    created_at: '2025-06-28T12:00:00Z',
    updated_at: '2025-06-28T12:00:00Z',
  },
  {
    id: 13,
    issue_id: 5,
    uploaded_by_user_id: 3,
    image_url: 'https://placehold.co/600x400/6b7280/white?text=Elevator+Before',
    image_type: 'BEFORE',
    ai_flag: false,
    ai_details: null,
    created_at: '2025-06-22T08:00:00Z',
    updated_at: '2025-06-22T08:00:00Z',
  },
  {
    id: 14,
    issue_id: 5,
    uploaded_by_user_id: 9,
    image_url: 'https://placehold.co/600x400/22c55e/white?text=Elevator+Maintained',
    image_type: 'AFTER',
    ai_flag: false,
    ai_details: null,
    created_at: '2025-06-27T14:00:00Z',
    updated_at: '2025-06-27T14:00:00Z',
  },
];

export const getImagesByIssueId = (issueId) => 
  issueImages.filter(img => img.issue_id === issueId);

export const getBeforeImage = (issueId) => 
  issueImages.find(img => img.issue_id === issueId && img.image_type === 'BEFORE');

export const getAfterImage = (issueId) => 
  issueImages.find(img => img.issue_id === issueId && img.image_type === 'AFTER');
