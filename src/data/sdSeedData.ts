import { ServiceDirector, SDAssignment, SDSchedule } from '../types';

export const DEFAULT_SERVICE_DIRECTORS: ServiceDirector[] = [
  {
    id: 'sd-aa',
    name: 'AA',
    status: 'active',
    phone: '081234567801',
    email: 'aa@gms.church',
    notes: 'Hanya Minggu, Hanya Service U1, Barat/Timur/Selatan/Pusura',
    created_at: '2026-01-01T00:00:00.000Z',
    special_rules: {
      allowed_days: ['SUNDAY'],
      allowed_locations: ['barat', 'timur', 'selatan', 'pusura'],
      allowed_services: ['Service U1'],
      notes: 'Hanya Hari Minggu, Khusus Service U1, Lokasi Barat/Timur/Selatan/Pusura',
    },
    max_services_per_month: 4,
    qualification: 'Senior Service Director',
    requests: [],
  },
  {
    id: 'sd-merlyn',
    name: 'Merlyn',
    status: 'active',
    phone: '081234567802',
    email: 'merlyn@gms.church',
    notes: 'Hanya Timur, Service U1, Minggu',
    created_at: '2026-01-01T00:00:00.000Z',
    special_rules: {
      allowed_days: ['SUNDAY'],
      allowed_locations: ['timur'],
      allowed_services: ['Service U1'],
      notes: 'Hanya Timur, Hari Minggu, Khusus Service U1',
    },
    max_services_per_month: 3,
    qualification: 'Service Director Timur',
    requests: [],
  },
  {
    id: 'sd-jane',
    name: 'Jane',
    status: 'active',
    phone: '081234567803',
    email: 'jane@gms.church',
    notes: 'Service Director General - Bebas Lokasi',
    created_at: '2026-01-01T00:00:00.000Z',
    special_rules: {},
    max_services_per_month: 4,
    qualification: 'General SD',
    requests: [],
  },
  {
    id: 'sd-niar',
    name: 'Niar',
    status: 'active',
    phone: '081234567804',
    email: 'niar@gms.church',
    notes: 'Service Director General',
    created_at: '2026-01-01T00:00:00.000Z',
    special_rules: {},
    max_services_per_month: 4,
    qualification: 'General SD',
    requests: [],
  },
  {
    id: 'sd-yoel',
    name: 'Yoel',
    status: 'active',
    phone: '081234567805',
    email: 'yoel@gms.church',
    notes: 'Service Director General',
    created_at: '2026-01-01T00:00:00.000Z',
    special_rules: {},
    max_services_per_month: 4,
    qualification: 'General SD',
    requests: [],
  },
  {
    id: 'sd-ibas',
    name: 'Ibas',
    status: 'active',
    phone: '081234567806',
    email: 'ibas@gms.church',
    notes: 'Service Director General',
    created_at: '2026-01-01T00:00:00.000Z',
    special_rules: {},
    max_services_per_month: 4,
    qualification: 'General SD',
    requests: [],
  },
];

export const DEFAULT_SD_SCHEDULE_AUG_2026: SDSchedule = {
  id: 'sd-sched-2026-8',
  month: 8,
  year: 2026,
  status: 'finalized',
  created_at: '2026-08-01T00:00:00.000Z',
  finalized_at: '2026-08-01T08:00:00.000Z',
  notes: 'Jadwal Service Director Agustus 2026',
};

// Seed sample initial SD assignments for August 2026 (matching standard slot matrix)
export const DEFAULT_SD_ASSIGNMENTS_AUG_2026: SDAssignment[] = [
  // Weekend 1 (Aug 2)
  { id: 'sd-asgn-1', sd_schedule_id: 'sd-sched-2026-8', weekend_id: '2026-08-01', service_date: '2026-08-02', sd_id: 'sd-merlyn', location_id: 'barat', slot_id: 'barat-u1', locked: true, manually_assigned: true },
  { id: 'sd-asgn-2', sd_schedule_id: 'sd-sched-2026-8', weekend_id: '2026-08-01', service_date: '2026-08-02', sd_id: 'sd-aa', location_id: 'timur', slot_id: 'timur-u1', locked: true, manually_assigned: true },
  { id: 'sd-asgn-3', sd_schedule_id: 'sd-sched-2026-8', weekend_id: '2026-08-01', service_date: '2026-08-02', sd_id: 'sd-jane', location_id: 'barat', slot_id: 'barat-u2-u3', locked: false, manually_assigned: false },
  { id: 'sd-asgn-4', sd_schedule_id: 'sd-sched-2026-8', weekend_id: '2026-08-01', service_date: '2026-08-02', sd_id: 'sd-niar', location_id: 'timur', slot_id: 'timur-u2-u3', locked: false, manually_assigned: false },

  // Weekend 2 (Aug 9)
  { id: 'sd-asgn-6', sd_schedule_id: 'sd-sched-2026-8', weekend_id: '2026-08-08', service_date: '2026-08-09', sd_id: 'sd-aa', location_id: 'barat', slot_id: 'barat-u1', locked: true, manually_assigned: true },
  { id: 'sd-asgn-7', sd_schedule_id: 'sd-sched-2026-8', weekend_id: '2026-08-08', service_date: '2026-08-09', sd_id: 'sd-merlyn', location_id: 'timur', slot_id: 'timur-u1', locked: true, manually_assigned: true },
  { id: 'sd-asgn-8', sd_schedule_id: 'sd-sched-2026-8', weekend_id: '2026-08-08', service_date: '2026-08-09', sd_id: 'sd-yoel', location_id: 'barat', slot_id: 'barat-u2-u3', locked: false, manually_assigned: false },
  { id: 'sd-asgn-9', sd_schedule_id: 'sd-sched-2026-8', weekend_id: '2026-08-08', service_date: '2026-08-09', sd_id: 'sd-jane', location_id: 'timur', slot_id: 'timur-u2-u3', locked: false, manually_assigned: false },

  // Weekend 3 (Aug 16)
  { id: 'sd-asgn-11', sd_schedule_id: 'sd-sched-2026-8', weekend_id: '2026-08-15', service_date: '2026-08-16', sd_id: 'sd-niar', location_id: 'barat', slot_id: 'barat-u1', locked: false, manually_assigned: false },
  { id: 'sd-asgn-12', sd_schedule_id: 'sd-sched-2026-8', weekend_id: '2026-08-15', service_date: '2026-08-16', sd_id: 'sd-merlyn', location_id: 'timur', slot_id: 'timur-u1', locked: true, manually_assigned: true },
  { id: 'sd-asgn-13', sd_schedule_id: 'sd-sched-2026-8', weekend_id: '2026-08-15', service_date: '2026-08-16', sd_id: 'sd-jane', location_id: 'selatan', slot_id: 'selatan-u1-u2', locked: false, manually_assigned: false },

  // Weekend 4 (Aug 23)
  { id: 'sd-asgn-14', sd_schedule_id: 'sd-sched-2026-8', weekend_id: '2026-08-22', service_date: '2026-08-23', sd_id: 'sd-merlyn', location_id: 'timur', slot_id: 'timur-u1', locked: true, manually_assigned: true },
  { id: 'sd-asgn-15', sd_schedule_id: 'sd-sched-2026-8', weekend_id: '2026-08-22', service_date: '2026-08-23', sd_id: 'sd-aa', location_id: 'barat', slot_id: 'barat-u1', locked: true, manually_assigned: true },

  // Weekend 5 (Aug 30)
  { id: 'sd-asgn-16', sd_schedule_id: 'sd-sched-2026-8', weekend_id: '2026-08-29', service_date: '2026-08-30', sd_id: 'sd-aa', location_id: 'barat', slot_id: 'barat-u1', locked: true, manually_assigned: true },
  { id: 'sd-asgn-17', sd_schedule_id: 'sd-sched-2026-8', weekend_id: '2026-08-29', service_date: '2026-08-30', sd_id: 'sd-niar', location_id: 'timur', slot_id: 'timur-u1', locked: false, manually_assigned: false },
];
