import { Team, Schedule, Assignment, TeamAvailability, SchedulerSettings, TeamMember, LeaderHistory, TeamCompositionHistory, SpecialService, ImportAuditLog } from '../types';

export interface OfficialTeamData {
  team_number: number;
  leader_name: string;
  members: string[];
}

export const OFFICIAL_TEAMS_DATA: OfficialTeamData[] = [
  {
    team_number: 1,
    leader_name: 'DS',
    members: ['Alung', 'Chandra', 'Frida', 'Sherlly', 'Sherly M', 'Khayfuk', 'Finna', 'Mona', 'Andrew'],
  },
  {
    team_number: 2,
    leader_name: 'Jiren',
    members: ['Bonita', 'Indra', 'Susanna', 'Felisya', 'Edsel', 'Ndaru', 'Lona', 'Andreas', 'Yuda'],
  },
  {
    team_number: 3,
    leader_name: 'Clara',
    members: ['Billy', 'Calvin', 'Carys', 'Cavita', 'Arlene', 'Amor', 'Christo', 'Michelle', 'Oliviani'],
  },
  {
    team_number: 4,
    leader_name: 'Hans',
    members: ['Gracia', 'Gita', 'Yenny Oei', 'Michael A', 'Robby Henuk', 'Astri', 'Cindy Verrel', 'Sun-sun', 'Lidya A.', 'Chandra'],
  },
  {
    team_number: 5,
    leader_name: 'Hana / Kevin',
    members: ['Lavenia', 'Ronald', 'Natalia', 'Indra G', 'Listya', 'Alexdevi', 'Livin', 'Jessica C.', 'Edy'],
  },
  {
    team_number: 6,
    leader_name: 'Dymas',
    members: ['Teddy', 'Gaby', 'Catur', 'Canaan', 'Elly', 'Aldino', 'Cecil', 'Franky', 'Njoo Ester'],
  },
  {
    team_number: 7,
    leader_name: 'Eveline',
    members: ['Angelin P', 'Felix', 'Anggre', 'Alex', 'Corry', 'Shinta', 'Ricky', 'Mery Y.'],
  },
  {
    team_number: 8,
    leader_name: 'Vero',
    members: ['Cicil', 'Clarence', 'Desy', 'Eci', 'Dewi', 'Viona', 'Yohanes AT', 'Natalia', 'Liem Yao'],
  },
  {
    team_number: 9,
    leader_name: 'Martha',
    members: ['Munika', 'Fei Chen', 'Nana', 'Erwin', 'Yohanes', 'Novi', 'Chita Ursula', 'Raka', 'Olivia T'],
  },
  {
    team_number: 10,
    leader_name: 'Kennard',
    members: ['Fanyshia', 'Nicholas', 'Josken', 'Sherleen', 'Hanna', 'Flo', 'Dina', 'Angelia', 'Yordan'],
  },
  {
    team_number: 11,
    leader_name: 'Stefiana',
    members: ['Charoline', 'Jason', 'Febe', 'Merit', 'Ronny', 'Stella', 'Stephanie', 'Yuli', 'Sendy'],
  },
  {
    team_number: 12,
    leader_name: 'Wilson',
    members: ['Sisca', 'Rio', 'Angelita', 'Donny', 'Tugas', 'Meidiana', 'Kelvin', 'Dedy Kristanto', 'Joas'],
  },
  {
    team_number: 13,
    leader_name: 'Stefilia',
    members: ['Eric', 'Elia', 'Dewa Batara', 'Henry', 'Widya', 'Caroline', 'Agnes M', 'Levi', 'Grace V'],
  },
  {
    team_number: 14,
    leader_name: 'Nathan',
    members: ['Mayleen', 'Cynthia', 'Kevin', 'Matthew', 'Jessi', 'Calista Kirana', 'Sherly', 'Mike', 'Ronald U'],
  },
  {
    team_number: 15,
    leader_name: 'Yulia K',
    members: ['Rut Maria', 'Sherly S', 'Sindu', 'Hana Aprilia', 'Refiana', 'Geraldo', 'Aileen', 'Yosua', 'Christine'],
  },
  {
    team_number: 16,
    leader_name: 'Lovenza',
    members: ['Ierwin', 'Raymond', 'Yolanda', 'Merry', 'Luciana', 'Retna', 'Lily', 'Ardo', 'Sinta'],
  },
  {
    team_number: 17,
    leader_name: 'Jojo',
    members: ['Ovy', 'Tifani', 'Pauline', 'Lave', 'Kevin', 'Alim', 'Gabriel Titus', 'Vania E', 'Daniel Marwan', 'Cynthia L.'],
  },
  {
    team_number: 18,
    leader_name: 'Alvin',
    members: ['Jesiska', 'Shieny J.', 'Dina W.', 'Meilin Detty', 'Meylanni', 'Merry S.', 'Stephen JS', 'Sugiarto', 'Devina M.'],
  },
  {
    team_number: 19,
    leader_name: 'Imelda',
    members: ['Anita', 'Fella', 'Mei', 'Melani', 'Cecilia Noviani', 'Daniel Hartanto', 'Caroline', 'Fen-Fen', 'Susanti'],
  },
  {
    team_number: 20,
    leader_name: 'Ericko',
    members: ['Erlin', 'Angel', 'Vina', 'Elly', 'Vincent', 'Varrel', 'Fika', 'Michael J.'],
  },
];

export const LEADER_NAMES = OFFICIAL_TEAMS_DATA.map((t) => t.leader_name);

export const DEFAULT_TEAMS: Team[] = OFFICIAL_TEAMS_DATA.map((t) => ({
  id: `team-${t.team_number}`,
  team_number: t.team_number,
  name: `Team ${t.team_number}`,
  leader_name: t.leader_name,
  status: 'active',
  created_at: '2026-08-01T00:00:00.000Z',
}));

export function generateSeedMembers(): TeamMember[] {
  const members: TeamMember[] = [];
  OFFICIAL_TEAMS_DATA.forEach((t) => {
    const teamId = `team-${t.team_number}`;
    // Leader entry
    members.push({
      id: `m-lead-${teamId}`,
      team_id: teamId,
      name: t.leader_name,
      role: 'Leader',
      status: 'active',
      joined_at: '2026-08-01',
      notes: 'PIC Utama Tim',
    });
    // Member entries
    t.members.forEach((memName, idx) => {
      members.push({
        id: `m-${teamId}-${idx + 1}`,
        team_id: teamId,
        name: memName,
        role: 'Member',
        status: 'active',
        joined_at: '2026-08-01',
      });
    });
  });
  return members;
}

export const DEFAULT_LEADER_HISTORIES: LeaderHistory[] = OFFICIAL_TEAMS_DATA.map((t) => ({
  id: `lh-${t.team_number}-1`,
  team_id: `team-${t.team_number}`,
  leader_name: t.leader_name,
  period_start: '2026-08',
  period_end: 'Present',
}));

export const DEFAULT_COMPOSITION_HISTORIES: TeamCompositionHistory[] = OFFICIAL_TEAMS_DATA.map((t) => ({
  id: `comp-aug-2026-team-${t.team_number}`,
  team_id: `team-${t.team_number}`,
  month: 8,
  year: 2026,
  leader_name: t.leader_name,
  members: [...t.members],
  source_file: 'Official_August_2026_Composition',
}));

export const DEFAULT_SPECIAL_SERVICES: SpecialService[] = [
  {
    id: 'spec-1',
    event_name: 'Revival Night Celebration',
    date: '2026-08-13', // Thursday service
    location_type: 'existing',
    location_id: 'barat',
    notes: 'Ibadah Kebangunan Rohani Pertengahan Bulan',
    status: 'active',
    assignment_mode: 'auto',
    is_locked: false,
    slots: [
      {
        id: 'spec-slot-1',
        slot_name: 'Night Service',
        start_time: '19:00',
        end_time: '21:00',
        teams_required: 1,
        assigned_team_ids: [],
      },
    ],
    month: 8,
    year: 2026,
    created_at: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'spec-2',
    event_name: 'Prayer & Worship Special',
    date: '2026-08-20', // Thursday
    location_type: 'custom',
    custom_location_name: 'Convention Center Main Hall',
    notes: 'Malam Doa Bersama Seluruh Pelayan',
    status: 'active',
    assignment_mode: 'pre_assign',
    is_locked: true,
    slots: [
      {
        id: 'spec-slot-2',
        slot_name: 'Session 1',
        start_time: '18:30',
        end_time: '21:00',
        teams_required: 1,
        assigned_team_ids: ['team-7'],
      },
    ],
    month: 8,
    year: 2026,
    created_at: '2026-08-01T00:00:00.000Z',
  },
];

export const DEFAULT_AUDIT_LOGS: ImportAuditLog[] = [];

export const DEFAULT_SETTINGS: SchedulerSettings = {
  weight_monthly_balance: 50,
  weight_longterm_balance: 20,
  weight_location_rotation: 15,
  weight_slot_rotation: 10,
  weight_date_distribution: 5,
};

export function generateSeedHistoryData(): {
  schedules: Schedule[];
  assignments: Assignment[];
  availabilities: TeamAvailability[];
} {
  const augScheduleId = 'sched-2026-8';
  const augSchedule: Schedule = {
    id: augScheduleId,
    month: 8,
    year: 2026,
    status: 'finalized',
    created_at: '2026-08-01T00:00:00.000Z',
    finalized_at: '2026-08-01T00:00:00.000Z',
    quality_score: 98,
    fairness_metrics: {
      monthly_balance_score: 96,
      longterm_balance_score: 94,
      location_rotation_score: 90,
      slot_rotation_score: 90,
      date_distribution_score: 92,
      total_assignments: 50,
      active_teams_count: 20,
      min_services_per_team: 2,
      max_services_per_team: 3,
      avg_services_per_team: 2.5,
    },
  };

  // 50 Official Assignments for August 2026 from reference schedule
  const rawAugustAssignments: Array<{ wId: string; date: string; slotId: string; locId: string; teamNum: number }> = [
    // Weekend 1 (2026-08-01 sat / 2026-08-02 sun)
    { wId: '2026-08-01', date: '2026-08-02', slotId: 'barat-u1', locId: 'barat', teamNum: 15 },
    { wId: '2026-08-01', date: '2026-08-02', slotId: 'barat-u2-u3', locId: 'barat', teamNum: 8 },
    { wId: '2026-08-01', date: '2026-08-02', slotId: 'barat-u4-u5', locId: 'barat', teamNum: 6 },
    { wId: '2026-08-01', date: '2026-08-02', slotId: 'timur-u1', locId: 'timur', teamNum: 1 },
    { wId: '2026-08-01', date: '2026-08-02', slotId: 'timur-u2-u3', locId: 'timur', teamNum: 12 },
    { wId: '2026-08-01', date: '2026-08-02', slotId: 'timur-u4-u5', locId: 'timur', teamNum: 17 },
    { wId: '2026-08-01', date: '2026-08-02', slotId: 'selatan-u1-u2', locId: 'selatan', teamNum: 14 },
    { wId: '2026-08-01', date: '2026-08-02', slotId: 'selatan-u3-4', locId: 'selatan', teamNum: 20 },
    { wId: '2026-08-01', date: '2026-08-02', slotId: 'pusura-u1-u2', locId: 'pusura', teamNum: 4 },
    { wId: '2026-08-01', date: '2026-08-01', slotId: 'english-service', locId: 'english', teamNum: 9 },

    // Weekend 2 (2026-08-08 sat / 2026-08-09 sun)
    { wId: '2026-08-08', date: '2026-08-09', slotId: 'barat-u1', locId: 'barat', teamNum: 16 },
    { wId: '2026-08-08', date: '2026-08-09', slotId: 'barat-u2-u3', locId: 'barat', teamNum: 2 },
    { wId: '2026-08-08', date: '2026-08-09', slotId: 'barat-u4-u5', locId: 'barat', teamNum: 11 },
    { wId: '2026-08-08', date: '2026-08-09', slotId: 'timur-u1', locId: 'timur', teamNum: 10 },
    { wId: '2026-08-08', date: '2026-08-09', slotId: 'timur-u2-u3', locId: 'timur', teamNum: 7 },
    { wId: '2026-08-08', date: '2026-08-09', slotId: 'timur-u4-u5', locId: 'timur', teamNum: 18 },
    { wId: '2026-08-08', date: '2026-08-09', slotId: 'selatan-u1-u2', locId: 'selatan', teamNum: 5 },
    { wId: '2026-08-08', date: '2026-08-09', slotId: 'selatan-u3-4', locId: 'selatan', teamNum: 13 },
    { wId: '2026-08-08', date: '2026-08-09', slotId: 'pusura-u1-u2', locId: 'pusura', teamNum: 3 },
    { wId: '2026-08-08', date: '2026-08-08', slotId: 'english-service', locId: 'english', teamNum: 19 },

    // Weekend 3 (2026-08-15 sat / 2026-08-16 sun)
    { wId: '2026-08-15', date: '2026-08-16', slotId: 'barat-u1', locId: 'barat', teamNum: 17 },
    { wId: '2026-08-15', date: '2026-08-16', slotId: 'barat-u2-u3', locId: 'barat', teamNum: 1 },
    { wId: '2026-08-15', date: '2026-08-16', slotId: 'barat-u4-u5', locId: 'barat', teamNum: 3 },
    { wId: '2026-08-15', date: '2026-08-16', slotId: 'timur-u1', locId: 'timur', teamNum: 13 },
    { wId: '2026-08-15', date: '2026-08-16', slotId: 'timur-u2-u3', locId: 'timur', teamNum: 6 },
    { wId: '2026-08-15', date: '2026-08-16', slotId: 'timur-u4-u5', locId: 'timur', teamNum: 15 },
    { wId: '2026-08-15', date: '2026-08-16', slotId: 'selatan-u1-u2', locId: 'selatan', teamNum: 19 },
    { wId: '2026-08-15', date: '2026-08-16', slotId: 'selatan-u3-4', locId: 'selatan', teamNum: 9 },
    { wId: '2026-08-15', date: '2026-08-16', slotId: 'pusura-u1-u2', locId: 'pusura', teamNum: 12 },
    { wId: '2026-08-15', date: '2026-08-15', slotId: 'english-service', locId: 'english', teamNum: 7 },

    // Weekend 4 (2026-08-22 sat / 2026-08-23 sun)
    { wId: '2026-08-22', date: '2026-08-23', slotId: 'barat-u1', locId: 'barat', teamNum: 9 },
    { wId: '2026-08-22', date: '2026-08-23', slotId: 'barat-u2-u3', locId: 'barat', teamNum: 10 },
    { wId: '2026-08-22', date: '2026-08-23', slotId: 'barat-u4-u5', locId: 'barat', teamNum: 20 },
    { wId: '2026-08-22', date: '2026-08-23', slotId: 'timur-u1', locId: 'timur', teamNum: 2 },
    { wId: '2026-08-22', date: '2026-08-23', slotId: 'timur-u2-u3', locId: 'timur', teamNum: 14 },
    { wId: '2026-08-22', date: '2026-08-23', slotId: 'timur-u4-u5', locId: 'timur', teamNum: 16 },
    { wId: '2026-08-22', date: '2026-08-23', slotId: 'selatan-u1-u2', locId: 'selatan', teamNum: 18 },
    { wId: '2026-08-22', date: '2026-08-23', slotId: 'selatan-u3-4', locId: 'selatan', teamNum: 4 },
    { wId: '2026-08-22', date: '2026-08-23', slotId: 'pusura-u1-u2', locId: 'pusura', teamNum: 5 },
    { wId: '2026-08-22', date: '2026-08-22', slotId: 'english-service', locId: 'english', teamNum: 8 },

    // Weekend 5 (2026-08-29 sat / 2026-08-30 sun)
    { wId: '2026-08-29', date: '2026-08-30', slotId: 'barat-u1', locId: 'barat', teamNum: 19 },
    { wId: '2026-08-29', date: '2026-08-30', slotId: 'barat-u2-u3', locId: 'barat', teamNum: 12 },
    { wId: '2026-08-29', date: '2026-08-30', slotId: 'barat-u4-u5', locId: 'barat', teamNum: 13 },
    { wId: '2026-08-29', date: '2026-08-30', slotId: 'timur-u1', locId: 'timur', teamNum: 5 },
    { wId: '2026-08-29', date: '2026-08-30', slotId: 'timur-u2-u3', locId: 'timur', teamNum: 8 },
    { wId: '2026-08-29', date: '2026-08-30', slotId: 'timur-u4-u5', locId: 'timur', teamNum: 11 },
    { wId: '2026-08-29', date: '2026-08-30', slotId: 'selatan-u1-u2', locId: 'selatan', teamNum: 2 },
    { wId: '2026-08-29', date: '2026-08-30', slotId: 'selatan-u3-4', locId: 'selatan', teamNum: 15 },
    { wId: '2026-08-29', date: '2026-08-30', slotId: 'pusura-u1-u2', locId: 'pusura', teamNum: 1 },
    { wId: '2026-08-29', date: '2026-08-29', slotId: 'english-service', locId: 'english', teamNum: 17 },
  ];

  const assignments: Assignment[] = rawAugustAssignments.map((item, idx) => ({
    id: `asgn-aug-2026-${idx}`,
    schedule_id: augScheduleId,
    weekend_id: item.wId,
    service_date: item.date,
    team_id: `team-${item.teamNum}`,
    location_id: item.locId as 'barat' | 'timur' | 'selatan' | 'pusura' | 'english',
    slot_id: item.slotId,
    locked: false,
    manually_assigned: false,
  }));

  return {
    schedules: [augSchedule],
    assignments,
    availabilities: [],
  };
}

