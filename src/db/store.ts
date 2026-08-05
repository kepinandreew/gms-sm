import {
  Team,
  Schedule,
  Assignment,
  TeamAvailability,
  SchedulerSettings,
  TeamMember,
  LeaderHistory,
  TeamCompositionHistory,
  SpecialService,
  ImportAuditLog,
  ServiceDirector,
  SDAssignment,
  SDSchedule,
  SDHistoryItem,
} from '../types';
import {
  DEFAULT_TEAMS,
  DEFAULT_SETTINGS,
  DEFAULT_LEADER_HISTORIES,
  DEFAULT_COMPOSITION_HISTORIES,
  DEFAULT_SPECIAL_SERVICES,
  DEFAULT_AUDIT_LOGS,
  generateSeedMembers,
  generateSeedHistoryData,
  OFFICIAL_TEAMS_DATA,
} from '../data/seedData';
import {
  DEFAULT_SERVICE_DIRECTORS,
  DEFAULT_SD_SCHEDULE_AUG_2026,
  DEFAULT_SD_ASSIGNMENTS_AUG_2026,
} from '../data/sdSeedData';
import { SERVICE_SLOTS } from '../data/locationsAndSlots';
import {
  pushTableToSupabase,
  fetchTableFromSupabase,
  deleteFromSupabase,
  deleteMonthAssignmentsInSupabase,
  deleteSDMonthAssignmentsInSupabase,
  deleteImportBatchFromSupabase,
  isSupabaseConfigured,
  SupabaseOpResult,
} from '../services/supabase';
import { getMonthName } from '../engine/dateUtils';

const STORAGE_KEYS = {
  TEAMS: 'gms_scheduler_teams_v3',
  MEMBERS: 'gms_scheduler_members_v3',
  LEADER_HISTORY: 'gms_scheduler_leader_history_v3',
  COMPOSITION_HISTORY: 'gms_scheduler_comp_history_v3',
  SPECIAL_SERVICES: 'gms_scheduler_special_services_v2',
  AUDIT_LOGS: 'gms_scheduler_audit_logs_v2',
  SCHEDULES: 'gms_scheduler_schedules_v1',
  ASSIGNMENTS: 'gms_scheduler_assignments_v1',
  AVAILABILITY: 'gms_scheduler_availability_v1',
  SETTINGS: 'gms_scheduler_settings_v1',
  SD_DIRECTORS: 'gms_scheduler_sd_directors_v1',
  SD_SCHEDULES: 'gms_scheduler_sd_schedules_v1',
  SD_ASSIGNMENTS: 'gms_scheduler_sd_assignments_v1',
};

class DataStore {
  private listeners: Set<() => void> = new Set();
  private errorListeners: Set<(msg: string) => void> = new Set();

  private schedules: Schedule[] = [];
  private assignments: Assignment[] = [];
  private sdSchedules: SDSchedule[] = [];
  private sdAssignments: SDAssignment[] = [];
  private teams: Team[] = [];
  private members: TeamMember[] = [];
  private availability: TeamAvailability[] = [];
  private settings: SchedulerSettings = DEFAULT_SETTINGS;
  private sdDirectors: ServiceDirector[] = [];
  private auditLogs: ImportAuditLog[] = [];
  private compHistories: TeamCompositionHistory[] = [];
  private specialServices: SpecialService[] = [];
  private leaderHistory: LeaderHistory[] = [];
  private isHydrated: boolean = false;

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public subscribeError(listener: (msg: string) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  public notifyError(message: string) {
    console.error('[DataStore Cloud Error]:', message);
    this.errorListeners.forEach((listener) => listener(message));
  }

  constructor() {
    this.init();
  }

  public init() {
    this.migrateLegacyMetadataToRelationalTables().then(() => {
      this.syncFromCloud().catch((e) => {
        console.warn('Initial sync warning:', e);
      });
    });
  }

  public async migrateLegacyMetadataToRelationalTables(): Promise<void> {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    const migrationDone = localStorage.getItem('gms_legacy_metadata_migrated');
    if (migrationDone === 'true') return;

    console.log('[Migration]: Auditing and migrating legacy metadata...');
    
    const legacyKeys = Object.keys(localStorage).filter(
      (k) => k.startsWith('local_storage:') || k.startsWith('app_metadata:') || k.includes('gms_scheduler_blob')
    );

    for (const key of legacyKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);

        if (key.includes('schedule') && Array.isArray(parsed)) {
          await pushTableToSupabase('schedules', parsed);
        } else if (key.includes('assignment') && Array.isArray(parsed)) {
          await pushTableToSupabase('assignments', parsed);
        } else if (key.includes('team') && Array.isArray(parsed)) {
          await pushTableToSupabase('teams', parsed);
        } else if (key.includes('member') && Array.isArray(parsed)) {
          await pushTableToSupabase('members', parsed);
        } else if (key.includes('setting') && typeof parsed === 'object') {
          await pushTableToSupabase('settings', [parsed]);
        }
        localStorage.removeItem(key);
      } catch (e) {
        console.warn(`Migration error on key ${key}:`, e);
      }
    }

    localStorage.setItem('gms_legacy_metadata_migrated', 'true');
    console.log('[Migration]: Legacy metadata migration completed successfully.');
  }

  public async syncFromCloud(month?: number, year?: number): Promise<boolean> {
    if (!isSupabaseConfigured) return false;

    console.log('Loading schedules from Supabase...');

    try {
      const [
        schedules,
        assignments,
        sdSchedules,
        sdAssignments,
        teams,
        members,
        availability,
        settings,
        sdDirectors,
        auditLogs,
        compHistories,
        specialServices,
        leaderHistory,
      ] = await Promise.all([
        fetchTableFromSupabase('schedules'),
        fetchTableFromSupabase('assignments'),
        fetchTableFromSupabase('sd_schedules'),
        fetchTableFromSupabase('sd_assignments'),
        fetchTableFromSupabase('teams'),
        fetchTableFromSupabase('members'),
        fetchTableFromSupabase('availability'),
        fetchTableFromSupabase('settings'),
        fetchTableFromSupabase('sd_directors'),
        fetchTableFromSupabase('audit_logs'),
        fetchTableFromSupabase('composition_history'),
        fetchTableFromSupabase('special_services'),
        fetchTableFromSupabase('leader_history'),
      ]);

      const results = [
        schedules, assignments, sdSchedules, sdAssignments, teams, members,
        availability, settings, sdDirectors, auditLogs, compHistories, specialServices, leaderHistory
      ];
      const allFailed = results.every((r) => r === null);

      if (schedules && Array.isArray(schedules)) {
        this.schedules = schedules;
        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
      } else if (!this.isHydrated) {
        const local = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
        if (local) this.schedules = JSON.parse(local);
      }

      if (assignments && Array.isArray(assignments)) {
        this.assignments = assignments;
        localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(assignments));
      } else if (!this.isHydrated) {
        const local = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
        if (local) this.assignments = JSON.parse(local);
      }

      if (sdSchedules && Array.isArray(sdSchedules)) {
        this.sdSchedules = sdSchedules;
        localStorage.setItem(STORAGE_KEYS.SD_SCHEDULES, JSON.stringify(sdSchedules));
      } else if (!this.isHydrated) {
        const local = localStorage.getItem(STORAGE_KEYS.SD_SCHEDULES);
        if (local) this.sdSchedules = JSON.parse(local);
      }

      if (sdAssignments && Array.isArray(sdAssignments)) {
        this.sdAssignments = sdAssignments;
        localStorage.setItem(STORAGE_KEYS.SD_ASSIGNMENTS, JSON.stringify(sdAssignments));
      } else if (!this.isHydrated) {
        const local = localStorage.getItem(STORAGE_KEYS.SD_ASSIGNMENTS);
        if (local) this.sdAssignments = JSON.parse(local);
      }

      if (teams && Array.isArray(teams) && teams.length > 0) {
        this.teams = teams;
        localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
      } else if (teams && Array.isArray(teams) && teams.length === 0) {
        await this.seedCloudDatabase().catch((e) => console.warn('Seed cloud error:', e));
        return true;
      } else if (!this.isHydrated) {
        const local = localStorage.getItem(STORAGE_KEYS.TEAMS);
        if (local) this.teams = JSON.parse(local);
        else this.teams = DEFAULT_TEAMS;
      }

      if (members && Array.isArray(members) && members.length > 0) {
        this.members = members;
        localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
      } else if (!this.isHydrated) {
        const local = localStorage.getItem(STORAGE_KEYS.MEMBERS);
        if (local) this.members = JSON.parse(local);
      }

      if (availability && Array.isArray(availability)) {
        this.availability = availability;
        localStorage.setItem(STORAGE_KEYS.AVAILABILITY, JSON.stringify(availability));
      } else if (!this.isHydrated) {
        const local = localStorage.getItem(STORAGE_KEYS.AVAILABILITY);
        if (local) this.availability = JSON.parse(local);
      }

      if (settings && Array.isArray(settings) && settings.length > 0) {
        this.settings = settings[0];
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings[0]));
      } else if (!this.isHydrated) {
        const local = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (local) this.settings = JSON.parse(local);
      }

      if (sdDirectors && Array.isArray(sdDirectors) && sdDirectors.length > 0) {
        this.sdDirectors = sdDirectors;
        localStorage.setItem(STORAGE_KEYS.SD_DIRECTORS, JSON.stringify(sdDirectors));
      } else if (!this.isHydrated) {
        const local = localStorage.getItem(STORAGE_KEYS.SD_DIRECTORS);
        if (local) this.sdDirectors = JSON.parse(local);
      }

      if (auditLogs && Array.isArray(auditLogs)) {
        this.auditLogs = auditLogs;
        localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));
      } else if (!this.isHydrated) {
        const local = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
        if (local) this.auditLogs = JSON.parse(local);
      }

      if (compHistories && Array.isArray(compHistories)) {
        this.compHistories = compHistories;
        localStorage.setItem(STORAGE_KEYS.COMPOSITION_HISTORY, JSON.stringify(compHistories));
      } else if (!this.isHydrated) {
        const local = localStorage.getItem(STORAGE_KEYS.COMPOSITION_HISTORY);
        if (local) this.compHistories = JSON.parse(local);
      }

      if (specialServices && Array.isArray(specialServices)) {
        this.specialServices = specialServices;
        localStorage.setItem(STORAGE_KEYS.SPECIAL_SERVICES, JSON.stringify(specialServices));
      } else if (!this.isHydrated) {
        const local = localStorage.getItem(STORAGE_KEYS.SPECIAL_SERVICES);
        if (local) this.specialServices = JSON.parse(local);
      }

      if (leaderHistory && Array.isArray(leaderHistory)) {
        this.leaderHistory = leaderHistory;
        localStorage.setItem(STORAGE_KEYS.LEADER_HISTORY, JSON.stringify(leaderHistory));
      } else if (!this.isHydrated) {
        const local = localStorage.getItem(STORAGE_KEYS.LEADER_HISTORY);
        if (local) this.leaderHistory = JSON.parse(local);
      }

      this.isHydrated = true;

      // Print required logs
      console.log(`Schedules loaded: ${this.schedules.length}`);
      console.log(`Assignments loaded: ${this.assignments.length}`);
      const activeMonth = month || 9;
      const activeYear = year || 2026;
      const monthName = getMonthName(activeMonth) || 'September';
      console.log(`Current month: ${monthName} ${activeYear}`);

      this.notify();
      return !allFailed;
    } catch (e: any) {
      console.warn('Sync from cloud failed:', e);
      this.notifyError(`Gagal menyinkronkan data dari Cloud: ${e.message || 'Kesalahan jaringan'}`);
      return false;
    }
  }

  public async seedCloudDatabase(): Promise<void> {
    const seedMembers = generateSeedMembers();
    const seed = generateSeedHistoryData();

    await pushTableToSupabase('teams', DEFAULT_TEAMS);
    await pushTableToSupabase('members', seedMembers);
    await pushTableToSupabase('settings', [DEFAULT_SETTINGS]);
    await pushTableToSupabase('sd_directors', DEFAULT_SERVICE_DIRECTORS);
    await pushTableToSupabase('sd_schedules', [DEFAULT_SD_SCHEDULE_AUG_2026]);
    await pushTableToSupabase('sd_assignments', DEFAULT_SD_ASSIGNMENTS_AUG_2026);
    await pushTableToSupabase('special_services', DEFAULT_SPECIAL_SERVICES);
    await pushTableToSupabase('schedules', seed.schedules);
    await pushTableToSupabase('assignments', seed.assignments);
    await pushTableToSupabase('leader_history', DEFAULT_LEADER_HISTORIES);
    await pushTableToSupabase('composition_history', DEFAULT_COMPOSITION_HISTORIES);

    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(DEFAULT_TEAMS));
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(seedMembers));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.SD_DIRECTORS, JSON.stringify(DEFAULT_SERVICE_DIRECTORS));
    localStorage.setItem(STORAGE_KEYS.SD_SCHEDULES, JSON.stringify([DEFAULT_SD_SCHEDULE_AUG_2026]));
    localStorage.setItem(STORAGE_KEYS.SD_ASSIGNMENTS, JSON.stringify(DEFAULT_SD_ASSIGNMENTS_AUG_2026));
    localStorage.setItem(STORAGE_KEYS.SPECIAL_SERVICES, JSON.stringify(DEFAULT_SPECIAL_SERVICES));
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(seed.schedules));
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(seed.assignments));
    localStorage.setItem(STORAGE_KEYS.LEADER_HISTORY, JSON.stringify(DEFAULT_LEADER_HISTORIES));
    localStorage.setItem(STORAGE_KEYS.COMPOSITION_HISTORY, JSON.stringify(DEFAULT_COMPOSITION_HISTORIES));

    this.notify();
  }

  public resetToDemoData() {
    this.resetToOfficialDatabase();
  }

  public resetToOfficialDatabase() {
    const members = generateSeedMembers();

    // 1. Reset Team Structure data ONLY
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(DEFAULT_TEAMS));
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    localStorage.setItem(STORAGE_KEYS.LEADER_HISTORY, JSON.stringify(DEFAULT_LEADER_HISTORIES));
    localStorage.setItem(STORAGE_KEYS.COMPOSITION_HISTORY, JSON.stringify(DEFAULT_COMPOSITION_HISTORIES));

    // 2. Preserve existing schedules, assignments, availability, special services, etc.
    if (!localStorage.getItem(STORAGE_KEYS.SPECIAL_SERVICES)) {
      localStorage.setItem(STORAGE_KEYS.SPECIAL_SERVICES, JSON.stringify(DEFAULT_SPECIAL_SERVICES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([]));
    }
    
    const existingSchedules = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
    if (!existingSchedules || JSON.parse(existingSchedules).length === 0) {
      const seed = generateSeedHistoryData();
      localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(seed.schedules));
      localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(seed.assignments));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.AVAILABILITY)) {
      localStorage.setItem(STORAGE_KEYS.AVAILABILITY, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }

    this.notify();

    // Sync reset state to Cloud
    this.seedCloudDatabase().catch((e) => console.warn('Seed cloud error:', e));

    return this.verifyTeamDatabase();
  }

  public verifyTeamDatabase() {
    const teams = this.getTeams().sort((a, b) => a.team_number - b.team_number);
    const allMembers = this.getTeamMembers();

    return OFFICIAL_TEAMS_DATA.map((official) => {
      const team = teams.find((t) => t.team_number === official.team_number);
      const teamMems = allMembers.filter(
        (m) => m.team_id === (team?.id || `team-${official.team_number}`) && m.role === 'Member'
      );
      const dbMemberNames = teamMems.map((m) => m.name);

      const leaderOk = team?.leader_name === official.leader_name;
      const countOk = dbMemberNames.length === official.members.length;

      const missingMembers = official.members.filter((name) => !dbMemberNames.includes(name));
      const extraMembers = dbMemberNames.filter((name) => !official.members.includes(name));
      const namesMatch = missingMembers.length === 0 && extraMembers.length === 0;

      const isOk = leaderOk && countOk && namesMatch;

      return {
        team_number: official.team_number,
        leader_name: team?.leader_name || '-',
        expected_leader: official.leader_name,
        member_count: dbMemberNames.length,
        expected_count: official.members.length,
        members_list: dbMemberNames,
        expected_members: official.members,
        missing_members: missingMembers,
        extra_members: extraMembers,
        status: isOk ? 'OK' : 'ERROR',
      };
    });
  }

  // --- TEAMS CRUD ---
  public getTeams(): Team[] {
    if (this.teams.length === 0) {
      const data = localStorage.getItem(STORAGE_KEYS.TEAMS);
      this.teams = data ? JSON.parse(data) : DEFAULT_TEAMS;
    }
    return this.teams;
  }

  public saveTeams(teams: Team[]): void {
    this.teams = teams;
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
    this.notify();

    pushTableToSupabase('teams', teams).then((res) => {
      if (!res.success) {
        this.notifyError(`Gagal menyimpan Tim ke Supabase: ${res.error}`);
      }
    });
  }

  public addTeam(name: string, notes?: string, leader_name?: string): Team {
    const teams = this.getTeams();
    const team_number = teams.length + 1;
    const newTeam: Team = {
      id: `team-${Date.now()}`,
      team_number,
      name: name || `Team ${team_number}`,
      leader_name: leader_name || `Leader ${team_number}`,
      status: 'active',
      notes,
      created_at: new Date().toISOString(),
    };
    teams.push(newTeam);
    this.saveTeams(teams);

    // add leader member
    if (leader_name) {
      this.addTeamMember({
        team_id: newTeam.id,
        name: leader_name,
        role: 'Leader',
        status: 'active',
        joined_at: new Date().toISOString().slice(0, 10),
      });
    }

    return newTeam;
  }

  public updateTeam(id: string, updates: Partial<Team>): void {
    const teams = this.getTeams();
    const idx = teams.findIndex((t) => t.id === id);
    if (idx !== -1) {
      const oldLeader = teams[idx].leader_name;
      teams[idx] = { ...teams[idx], ...updates };
      this.saveTeams(teams);

      // If leader changed, record in leader history
      if (updates.leader_name && updates.leader_name !== oldLeader) {
        this.addLeaderHistory({
          team_id: id,
          leader_name: updates.leader_name,
          period_start: new Date().toISOString().slice(0, 7),
          period_end: 'Present',
        });
      }
    }
  }

  public deleteTeam(id: string): void {
    this.teams = this.getTeams().filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(this.teams));

    this.members = this.getTeamMembers().filter((m) => m.team_id !== id);
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(this.members));

    this.notify();

    deleteFromSupabase('teams', 'id', id).then((res1) => {
      if (!res1.success) this.notifyError(`Gagal menghapus Tim dari Supabase: ${res1.error}`);
    });
    deleteFromSupabase('members', 'team_id', id).then((res2) => {
      if (!res2.success) this.notifyError(`Gagal menghapus anggota tim dari Supabase: ${res2.error}`);
    });
  }

  // --- TEAM MEMBERS CRUD ---
  public getTeamMembers(teamId?: string): TeamMember[] {
    if (this.members.length === 0) {
      const data = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      if (data) this.members = JSON.parse(data);
    }
    if (teamId) {
      return this.members.filter((m) => m.team_id === teamId);
    }
    return this.members;
  }

  public saveTeamMembers(members: TeamMember[]): void {
    this.members = members;
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    this.notify();

    pushTableToSupabase('members', members).then((res) => {
      if (!res.success) {
        this.notifyError(`Gagal menyimpan Anggota Tim ke Supabase: ${res.error}`);
      }
    });
  }

  public addTeamMember(memberData: Omit<TeamMember, 'id'>): TeamMember {
    const members = [...this.getTeamMembers()];
    const newMember: TeamMember = {
      ...memberData,
      id: `m-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    members.push(newMember);
    this.saveTeamMembers(members);
    return newMember;
  }

  public updateTeamMember(id: string, updates: Partial<TeamMember>): void {
    const members = [...this.getTeamMembers()];
    const idx = members.findIndex((m) => m.id === id);
    if (idx !== -1) {
      members[idx] = { ...members[idx], ...updates };
      this.saveTeamMembers(members);
    }
  }

  public deleteTeamMember(id: string): void {
    this.members = this.getTeamMembers().filter((m) => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(this.members));
    this.notify();

    deleteFromSupabase('members', 'id', id).then((res) => {
      if (!res.success) {
        this.notifyError(`Gagal menghapus Anggota Tim dari Supabase: ${res.error}`);
      }
    });
  }

  public moveTeamMember(memberId: string, newTeamId: string): void {
    this.updateTeamMember(memberId, { team_id: newTeamId });
  }

  // --- LEADER & COMPOSITION HISTORIES ---
  public getLeaderHistory(teamId?: string): LeaderHistory[] {
    if (this.leaderHistory.length === 0) {
      const data = localStorage.getItem(STORAGE_KEYS.LEADER_HISTORY);
      if (data) this.leaderHistory = JSON.parse(data);
      else this.leaderHistory = DEFAULT_LEADER_HISTORIES;
    }
    if (teamId) return this.leaderHistory.filter((lh) => lh.team_id === teamId);
    return this.leaderHistory;
  }

  public addLeaderHistory(entry: Omit<LeaderHistory, 'id'>): void {
    const list = [...this.getLeaderHistory()];
    const newEntry: LeaderHistory = {
      ...entry,
      id: `lh-${Date.now()}`,
    };
    list.push(newEntry);
    this.leaderHistory = list;
    localStorage.setItem(STORAGE_KEYS.LEADER_HISTORY, JSON.stringify(list));
    this.notify();

    pushTableToSupabase('leader_history', [newEntry]).catch((e) => console.warn('Supabase leader_history push error:', e));
  }

  public getCompositionHistories(teamId?: string): TeamCompositionHistory[] {
    if (this.compHistories.length === 0) {
      const data = localStorage.getItem(STORAGE_KEYS.COMPOSITION_HISTORY);
      if (data) this.compHistories = JSON.parse(data);
      else this.compHistories = DEFAULT_COMPOSITION_HISTORIES;
    }
    if (teamId) return this.compHistories.filter((ch) => ch.team_id === teamId);
    return this.compHistories;
  }

  public addCompositionHistory(comp: Omit<TeamCompositionHistory, 'id'>): TeamCompositionHistory {
    const list = this.getCompositionHistories();
    const filtered = list.filter(
      (ch) => !(ch.team_id === comp.team_id && ch.month === comp.month && ch.year === comp.year)
    );
    const newItem: TeamCompositionHistory = {
      ...comp,
      id: `comp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    filtered.push(newItem);
    this.compHistories = filtered;
    localStorage.setItem(STORAGE_KEYS.COMPOSITION_HISTORY, JSON.stringify(filtered));
    this.notify();

    pushTableToSupabase('composition_history', [newItem]).catch((e) => console.warn('Supabase composition push error:', e));
    return newItem;
  }

  /**
   * Deletes an imported batch completely from the database:
   * - Schedule for month/year and all its assignments
   * - Composition history snapshots for month/year
   * - Special services created for month/year
   * - Audit log entry for batch
   */
  public deleteImportBatch(batchId: string, month: number, year: number): void {
    const scheduleId = `sched-${year}-${month}`;
    this.schedules = this.getSchedules().filter(
      (s) => !(s.id === scheduleId || (s.month === month && s.year === year))
    );
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(this.schedules));

    this.assignments = this.getAssignments().filter(
      (a) => !(a.schedule_id === scheduleId || a.id.includes(`imported-${year}-${month}`))
    );
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(this.assignments));

    this.compHistories = this.getCompositionHistories().filter(
      (ch) => !(ch.month === month && ch.year === year)
    );
    localStorage.setItem(STORAGE_KEYS.COMPOSITION_HISTORY, JSON.stringify(this.compHistories));

    this.specialServices = this.getSpecialServices().filter(
      (ss) => !(ss.month === month && ss.year === year)
    );
    localStorage.setItem(STORAGE_KEYS.SPECIAL_SERVICES, JSON.stringify(this.specialServices));

    this.auditLogs = this.getAuditLogs().filter((al) => al.batch_id !== batchId);
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(this.auditLogs));

    this.notify();

    deleteImportBatchFromSupabase(batchId, month, year).catch((e) => console.warn('Supabase delete import batch error:', e));
  }

  // --- SPECIAL SERVICES CRUD ---
  public getSpecialServices(month?: number, year?: number): SpecialService[] {
    if (this.specialServices.length === 0) {
      const data = localStorage.getItem(STORAGE_KEYS.SPECIAL_SERVICES);
      if (data) this.specialServices = JSON.parse(data);
      else this.specialServices = DEFAULT_SPECIAL_SERVICES;
    }
    const rawList = this.specialServices;
    const list = rawList.map((s) => ({
      ...s,
      countsAsServiceAssignment: s.countsAsServiceAssignment ?? false,
      offImpact: s.offImpact ?? 'NONE',
    }));
    if (month !== undefined && year !== undefined) {
      return list.filter((s) => s.month === month && s.year === year);
    }
    return list;
  }

  public saveSpecialServices(services: SpecialService[]): void {
    this.specialServices = services;
    localStorage.setItem(STORAGE_KEYS.SPECIAL_SERVICES, JSON.stringify(services));
    this.notify();

    pushTableToSupabase('special_services', services).then((res) => {
      if (!res.success) this.notifyError(`Gagal menyimpan Special Services ke Supabase: ${res.error}`);
    });
  }

  public addSpecialService(serviceData: Omit<SpecialService, 'id' | 'created_at'>): SpecialService {
    const list = [...this.getSpecialServices()];
    const newService: SpecialService = {
      ...serviceData,
      id: `spec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
    };
    list.push(newService);
    this.saveSpecialServices(list);
    return newService;
  }

  public updateSpecialService(id: string, updates: Partial<SpecialService>): void {
    const list = [...this.getSpecialServices()];
    const idx = list.findIndex((s) => s.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      this.saveSpecialServices(list);
    }
  }

  public deleteSpecialService(id: string): {
    success: boolean;
    deletedService?: SpecialService;
    affectedAssignmentsCount: number;
    message: string;
  } {
    const services = this.getSpecialServices();
    const service = services.find((s) => s.id === id);
    if (!service) {
      return {
        success: false,
        affectedAssignmentsCount: 0,
        message: 'Special Service tidak ditemukan.',
      };
    }

    // 1. Remove Special Service from list
    const updatedServices = services.filter((s) => s.id !== id);
    this.specialServices = updatedServices;
    localStorage.setItem(STORAGE_KEYS.SPECIAL_SERVICES, JSON.stringify(updatedServices));

    // 2. Remove associated assignments matching service date, location, or slot IDs
    const assignments = this.getAssignments();
    const serviceDate = service.date;
    const locationId = service.location_id;

    const removedAssignments: Assignment[] = [];
    const remainingAssignments = assignments.filter((a) => {
      if (a.service_date === serviceDate) {
        if (locationId && a.location_id === locationId) {
          removedAssignments.push(a);
          return false;
        }
        if (service.slots.some((slot) => a.slot_id === slot.id || a.id.includes(slot.id))) {
          removedAssignments.push(a);
          return false;
        }
      }
      return true;
    });

    const removedAssignmentsCount = removedAssignments.length;
    if (removedAssignmentsCount > 0) {
      this.assignments = remainingAssignments;
      localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(remainingAssignments));

      // Delete removed assignments from Supabase
      removedAssignments.forEach((a) => {
        deleteFromSupabase('assignments', 'id', a.id).catch((e) => console.warn('Supabase delete assignment error:', e));
      });

      // Recalculate schedule metrics if schedule exists
      const schedule = this.getScheduleByMonthYear(service.month, service.year);
      if (schedule) {
        const scheduleAssignments = remainingAssignments.filter((a) => a.schedule_id === schedule.id);
        const activeTeams = this.getTeams().filter((t) => t.status === 'active');

        const teamCounts: Record<string, number> = {};
        activeTeams.forEach((t) => (teamCounts[t.id] = 0));
        scheduleAssignments.forEach((a) => {
          if (teamCounts[a.team_id] !== undefined) teamCounts[a.team_id]++;
        });
        const countsList = Object.values(teamCounts);
        const minCount = countsList.length ? Math.min(...countsList) : 0;
        const maxCount = countsList.length ? Math.max(...countsList) : 0;

        schedule.fairness_metrics = {
          ...schedule.fairness_metrics,
          total_assignments: scheduleAssignments.length,
          min_services_per_team: minCount,
          max_services_per_team: maxCount,
          avg_services_per_team: Number((scheduleAssignments.length / (activeTeams.length || 1)).toFixed(2)),
        };
        this.saveSchedule(schedule);
      }
    }

    this.notify();

    // Delete special service from Supabase
    deleteFromSupabase('special_services', 'id', id).then((res) => {
      if (!res.success) {
        this.notifyError(`Gagal menghapus Special Service dari Supabase: ${res.error}`);
      }
    });

    return {
      success: true,
      deletedService: service,
      affectedAssignmentsCount: removedAssignmentsCount,
      message: `Special Service "${service.event_name}" berhasil dihapus.`,
    };
  }

  public deleteSpecialServiceSlot(serviceId: string, slotId: string): {
    success: boolean;
    affectedAssignmentsCount: number;
    message: string;
  } {
    const services = this.getSpecialServices();
    const service = services.find((s) => s.id === serviceId);
    if (!service) {
      return { success: false, affectedAssignmentsCount: 0, message: 'Special Service tidak ditemukan.' };
    }

    const slotToDelete = service.slots.find((s) => s.id === slotId);
    const updatedSlots = service.slots.filter((s) => s.id !== slotId);

    if (updatedSlots.length === 0) {
      return this.deleteSpecialService(serviceId);
    }

    this.updateSpecialService(serviceId, { slots: updatedSlots });

    // Remove associated assignments
    const assignments = this.getAssignments();
    const removedAssignments: Assignment[] = [];
    const remainingAssignments = assignments.filter((a) => {
      if (a.service_date === service.date && (a.slot_id === slotId || a.id.includes(slotId))) {
        removedAssignments.push(a);
        return false;
      }
      return true;
    });

    const removedCount = removedAssignments.length;
    if (removedCount > 0) {
      this.assignments = remainingAssignments;
      localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(remainingAssignments));

      removedAssignments.forEach((a) => {
        deleteFromSupabase('assignments', 'id', a.id).catch((e) => console.warn('Supabase delete assignment error:', e));
      });
    }

    this.notify();
    return {
      success: true,
      affectedAssignmentsCount: removedCount,
      message: `Slot ${slotToDelete?.slot_name || ''} berhasil dihapus.`,
    };
  }

  public duplicateSpecialService(id: string): SpecialService | null {
    const service = this.getSpecialServices().find((s) => s.id === id);
    if (!service) return null;

    const duplicated: SpecialService = {
      ...service,
      id: `spec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      event_name: `${service.event_name} (Copy)`,
      created_at: new Date().toISOString(),
      assignment_mode: 'auto',
      is_locked: false,
      slots: service.slots.map((s) => ({
        ...s,
        id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        assigned_team_ids: [],
      })),
    };

    const list = this.getSpecialServices();
    list.push(duplicated);
    this.saveSpecialServices(list);
    return duplicated;
  }

  public bulkDeleteSpecialServices(ids: string[]): {
    success: boolean;
    deletedCount: number;
    affectedAssignmentsCount: number;
  } {
    let totalAssignmentsRemoved = 0;
    let deletedCount = 0;

    ids.forEach((id) => {
      const res = this.deleteSpecialService(id);
      if (res.success) {
        deletedCount++;
        totalAssignmentsRemoved += res.affectedAssignmentsCount;
      }
    });

    return {
      success: true,
      deletedCount,
      affectedAssignmentsCount: totalAssignmentsRemoved,
    };
  }

  // --- AUDIT LOGS CRUD ---
  public getAuditLogs(): ImportAuditLog[] {
    const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return data ? JSON.parse(data) : DEFAULT_AUDIT_LOGS;
  }

  public addAuditLog(logData: Omit<ImportAuditLog, 'id'>): ImportAuditLog {
    const list = this.getAuditLogs();
    const newLog: ImportAuditLog = {
      ...logData,
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    list.unshift(newLog);
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(list));
    this.notify();

    pushTableToSupabase('audit_logs', [newLog]).then((res) => {
      if (!res.success) this.notifyError(`Gagal menyimpan Log Audit ke Supabase: ${res.error}`);
    });
    return newLog;
  }

  // --- SCHEDULES CRUD ---
  public getSchedules(): Schedule[] {
    return this.schedules;
  }

  public getSchedule(id: string): Schedule | undefined {
    return this.schedules.find((s) => s.id === id);
  }

  public getScheduleByMonthYear(month: number, year: number): Schedule | undefined {
    return this.schedules.find(
      (s) => Number(s.month) === Number(month) && Number(s.year) === Number(year)
    );
  }

  public async saveSchedule(schedule: Schedule): Promise<SupabaseOpResult> {
    const existingByMonthYear = this.getScheduleByMonthYear(schedule.month, schedule.year);
    if (existingByMonthYear && existingByMonthYear.id !== schedule.id) {
      schedule = {
        ...schedule,
        id: existingByMonthYear.id,
        created_at: existingByMonthYear.created_at || schedule.created_at,
      };
    }

    const idx = this.schedules.findIndex(
      (s) =>
        s.id === schedule.id ||
        (Number(s.month) === Number(schedule.month) && Number(s.year) === Number(schedule.year))
    );
    if (idx !== -1) {
      this.schedules[idx] = schedule;
    } else {
      this.schedules.push(schedule);
    }
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(this.schedules));
    this.notify();

    const res = await pushTableToSupabase('schedules', [schedule]);
    if (!res.success) this.notifyError(`Gagal menyimpan Jadwal ke Supabase: ${res.error}`);
    return res;
  }

  public async saveScheduleAndAssignments(
    schedule: Schedule,
    newAssignments: Assignment[]
  ): Promise<SupabaseOpResult> {
    const existing = this.getScheduleByMonthYear(schedule.month, schedule.year);
    if (existing && existing.id !== schedule.id) {
      const oldId = schedule.id;
      schedule = {
        ...schedule,
        id: existing.id,
        created_at: existing.created_at || schedule.created_at,
      };
      newAssignments = newAssignments.map((a) =>
        a.schedule_id === oldId ? { ...a, schedule_id: existing.id } : a
      );
    }

    const idx = this.schedules.findIndex(
      (s) =>
        s.id === schedule.id ||
        (Number(s.month) === Number(schedule.month) && Number(s.year) === Number(schedule.year))
    );
    if (idx !== -1) {
      this.schedules[idx] = schedule;
    } else {
      this.schedules.push(schedule);
    }
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(this.schedules));

    this.assignments = this.assignments.filter((a) => a.schedule_id !== schedule.id);
    this.assignments.push(...newAssignments);
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(this.assignments));

    this.notify();

    const schedRes = await pushTableToSupabase('schedules', [schedule]);
    if (!schedRes.success) {
      this.notifyError(`Gagal menyimpan Jadwal ke Supabase: ${schedRes.error}`);
      return schedRes;
    }

    const asgnRes = await pushTableToSupabase('assignments', newAssignments);
    if (!asgnRes.success) {
      this.notifyError(`Gagal menyimpan Penugasan ke Supabase: ${asgnRes.error}`);
      return asgnRes;
    }

    return { success: true };
  }

  public async deleteSchedule(id: string): Promise<SupabaseOpResult> {
    this.schedules = this.schedules.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(this.schedules));

    this.assignments = this.assignments.filter((a) => a.schedule_id !== id);
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(this.assignments));

    this.notify();

    const res1 = await deleteFromSupabase('schedules', 'id', id);
    if (!res1.success) this.notifyError(`Gagal menghapus Jadwal dari Supabase: ${res1.error}`);

    const res2 = await deleteFromSupabase('assignments', 'schedule_id', id);
    if (!res2.success) this.notifyError(`Gagal menghapus Penugasan dari Supabase: ${res2.error}`);

    return res1.success && res2.success
      ? { success: true }
      : { success: false, error: res1.error || res2.error };
  }

  public async clearScheduleForMonth(month: number, year: number): Promise<SupabaseOpResult> {
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const sched = this.getScheduleByMonthYear(month, year);
    const schedId = sched ? sched.id : `sched-${year}-${month}`;

    const res = await deleteMonthAssignmentsInSupabase(schedId, monthPrefix, month, year);
    if (!res.success) {
      this.notifyError(`Gagal menghapus Jadwal Bulan ini dari Supabase: ${res.error}`);
      return res;
    }

    this.schedules = this.schedules.filter(
      (s) => s.id !== schedId && !(Number(s.month) === Number(month) && Number(s.year) === Number(year))
    );
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(this.schedules));

    this.assignments = this.assignments.filter((a) => {
      if (a.schedule_id === schedId || a.schedule_id === `sched-${year}-${month}`) return false;
      if (a.weekend_id && a.weekend_id.startsWith(monthPrefix)) return false;
      if (a.service_date && a.service_date.startsWith(monthPrefix)) return false;
      return true;
    });
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(this.assignments));

    this.notify();
    return { success: true };
  }

  // --- ASSIGNMENTS CRUD ---
  public getAssignments(): Assignment[] {
    return this.assignments;
  }

  public getAssignmentsForSchedule(scheduleId: string): Assignment[] {
    return this.assignments.filter((a) => a.schedule_id === scheduleId);
  }

  public getAssignmentsForMonth(month: number, year: number): Assignment[] {
    const sched = this.getScheduleByMonthYear(month, year);
    const targetSchedId = sched ? sched.id : `sched-${year}-${month}`;
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

    return this.assignments.filter(
      (a) =>
        a.schedule_id === targetSchedId ||
        a.schedule_id === `sched-${year}-${month}` ||
        (a.weekend_id && a.weekend_id.startsWith(monthPrefix)) ||
        (a.service_date && a.service_date.startsWith(monthPrefix))
    );
  }

  public saveAssignmentsForSchedule(scheduleId: string, newAssignments: Assignment[]): void {
    this.assignments = this.assignments.filter((a) => a.schedule_id !== scheduleId);
    this.assignments.push(...newAssignments);
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(this.assignments));
    this.notify();

    let schedule = this.getSchedule(scheduleId);
    if (!schedule) {
      const parts = scheduleId.split('-');
      const year = parts.length >= 3 ? parseInt(parts[1], 10) || 2026 : 2026;
      const month = parts.length >= 3 ? parseInt(parts[2], 10) || 9 : 9;
      schedule = {
        id: scheduleId,
        month,
        year,
        status: 'draft',
        created_at: new Date().toISOString(),
        quality_score: 90,
        fairness_metrics: {
          monthly_balance_score: 90,
          longterm_balance_score: 90,
          location_rotation_score: 90,
          slot_rotation_score: 90,
          date_distribution_score: 90,
          total_assignments: newAssignments.length,
          active_teams_count: 20,
          min_services_per_team: 2,
          max_services_per_team: 3,
          avg_services_per_team: 2.5,
        },
      };
      this.schedules.push(schedule);
    }
    const finalSchedule = schedule;
    const syncFn = async () => {
      const schedRes = await pushTableToSupabase('schedules', [finalSchedule]);
      if (!schedRes.success) console.warn(`[Supabase Schedules Push Warning]:`, schedRes.error);
      const res = await pushTableToSupabase('assignments', newAssignments);
      if (!res.success) this.notifyError(`Gagal menyimpan Penugasan ke Supabase: ${res.error}`);
    };
    syncFn();
  }

  public updateAssignment(assignmentId: string, updates: Partial<Assignment>): void {
    const assignments = this.getAssignments();
    const idx = assignments.findIndex((a) => a.id === assignmentId);
    if (idx !== -1) {
      assignments[idx] = { ...assignments[idx], ...updates };
      this.assignments = assignments;
      localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(assignments));
      this.notify();

      pushTableToSupabase('assignments', [assignments[idx]]).then((res) => {
        if (!res.success) this.notifyError(`Gagal memperbarui Penugasan di Supabase: ${res.error}`);
      });
    }
  }

  public deleteAssignment(assignmentId: string): void {
    const assignments = this.getAssignments();
    const filtered = assignments.filter((a) => a.id !== assignmentId);
    this.assignments = filtered;
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(filtered));
    this.notify();

    deleteFromSupabase('assignments', 'id', assignmentId).then((res) => {
      if (!res.success) this.notifyError(`Gagal menghapus Penugasan di Supabase: ${res.error}`);
    });
  }

  public assignTeamToSlot(params: {
    scheduleId: string;
    weekendId: string;
    serviceDate: string;
    slotId: string;
    teamId: string;
    locked?: boolean;
    manuallyAssigned?: boolean;
  }): Assignment {
    const assignments = this.getAssignments();
    const existingIdx = assignments.findIndex(
      (a) =>
        a.schedule_id === params.scheduleId &&
        a.weekend_id === params.weekendId &&
        a.slot_id === params.slotId
    );

    const slotObj = SERVICE_SLOTS.find((s) => s.id === params.slotId);
    const locationId = slotObj?.location_id || 'barat';

    let resultAssignment: Assignment;

    if (existingIdx !== -1) {
      resultAssignment = {
        ...assignments[existingIdx],
        team_id: params.teamId,
        locked: params.locked ?? true,
        manually_assigned: params.manuallyAssigned ?? true,
      };
      assignments[existingIdx] = resultAssignment;
    } else {
      resultAssignment = {
        id: `asgn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        schedule_id: params.scheduleId,
        weekend_id: params.weekendId,
        service_date: params.serviceDate,
        slot_id: params.slotId,
        location_id: locationId,
        team_id: params.teamId,
        locked: params.locked ?? true,
        manually_assigned: params.manuallyAssigned ?? true,
      };
      assignments.push(resultAssignment);
    }

    this.assignments = assignments;
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(assignments));
    this.notify();

    pushTableToSupabase('assignments', [resultAssignment]).then((res) => {
      if (!res.success) this.notifyError(`Gagal menyimpan Penugasan di Supabase: ${res.error}`);
    });

    return resultAssignment;
  }

  public swapAssignments(assignmentId1: string, assignmentId2: string): void {
    const assignments = this.getAssignments();
    const idx1 = assignments.findIndex((a) => a.id === assignmentId1);
    const idx2 = assignments.findIndex((a) => a.id === assignmentId2);

    if (idx1 !== -1 && idx2 !== -1) {
      const tempTeam = assignments[idx1].team_id;
      assignments[idx1] = {
        ...assignments[idx1],
        team_id: assignments[idx2].team_id,
        manually_assigned: true,
      };
      assignments[idx2] = {
        ...assignments[idx2],
        team_id: tempTeam,
        manually_assigned: true,
      };

      this.assignments = assignments;
      localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(assignments));
      this.notify();

      pushTableToSupabase('assignments', [assignments[idx1], assignments[idx2]]).then((res) => {
        if (!res.success) this.notifyError(`Gagal memperbarui Swap Penugasan di Supabase: ${res.error}`);
      });
    }
  }

  // --- AVAILABILITY CRUD ---
  public getAvailabilities(): TeamAvailability[] {
    const data = localStorage.getItem(STORAGE_KEYS.AVAILABILITY);
    return data ? JSON.parse(data) : [];
  }

  public saveAvailabilities(availabilities: TeamAvailability[]): void {
    const sanitizedAvailabilities = availabilities.map((a) => {
      const nowISO = new Date().toISOString();
      return {
        ...a,
        created_at: a.created_at || nowISO,
        updated_at: nowISO,
      };
    });

    localStorage.setItem(STORAGE_KEYS.AVAILABILITY, JSON.stringify(sanitizedAvailabilities));
    this.notify();

    pushTableToSupabase('availability', sanitizedAvailabilities).then((res) => {
      if (!res.success) this.notifyError(`Gagal menyimpan Ketersediaan Tim ke Supabase: ${res.error}`);
    });
  }

  public setTeamAvailability(
    teamId: string,
    weekendDate: string,
    available: boolean,
    notes?: string
  ): void {
    const availabilities = this.getAvailabilities();
    const idx = availabilities.findIndex(
      (a) => a.team_id === teamId && a.weekend_date === weekendDate
    );
    const nowISO = new Date().toISOString();

    if (idx !== -1) {
      const existing = availabilities[idx];
      availabilities[idx] = {
        ...existing,
        available,
        notes,
        created_at: existing.created_at || nowISO,
        updated_at: nowISO,
      };
    } else {
      availabilities.push({
        id: `avail-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        team_id: teamId,
        weekend_date: weekendDate,
        available,
        notes,
        created_at: nowISO,
        updated_at: nowISO,
      });
    }

    this.saveAvailabilities(availabilities);
  }

  // --- SETTINGS CRUD ---
  public getSettings(): SchedulerSettings {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  }

  public saveSettings(settings: SchedulerSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    this.notify();

    pushTableToSupabase('settings', [settings]).then((res) => {
      if (!res.success) this.notifyError(`Gagal menyimpan Pengaturan ke Supabase: ${res.error}`);
    });
  }

  // --- SERVICE DIRECTORS (SD) CRUD ---
  public getServiceDirectors(): ServiceDirector[] {
    const data = localStorage.getItem(STORAGE_KEYS.SD_DIRECTORS);
    if (!data) {
      // Seed default SD directors if empty
      localStorage.setItem(STORAGE_KEYS.SD_DIRECTORS, JSON.stringify(DEFAULT_SERVICE_DIRECTORS));
      return DEFAULT_SERVICE_DIRECTORS;
    }
    return JSON.parse(data);
  }

  public saveServiceDirectors(directors: ServiceDirector[]): void {
    localStorage.setItem(STORAGE_KEYS.SD_DIRECTORS, JSON.stringify(directors));
    this.notify();

    pushTableToSupabase('sd_directors', directors).then((res) => {
      if (!res.success) this.notifyError(`Gagal menyimpan Service Director ke Supabase: ${res.error}`);
    });
  }

  public addServiceDirector(sdData: Omit<ServiceDirector, 'id' | 'created_at'>): ServiceDirector {
    const list = this.getServiceDirectors();
    const newSD: ServiceDirector = {
      ...sdData,
      id: `sd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
      requests: sdData.requests || [],
    };
    list.push(newSD);
    this.saveServiceDirectors(list);
    return newSD;
  }

  public updateServiceDirector(id: string, updates: Partial<ServiceDirector>): void {
    const list = this.getServiceDirectors();
    const idx = list.findIndex((sd) => sd.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      this.saveServiceDirectors(list);
    }
  }

  public deleteServiceDirector(id: string): void {
    const list = this.getServiceDirectors().filter((sd) => sd.id !== id);
    this.saveServiceDirectors(list);

    deleteFromSupabase('sd_directors', 'id', id).then((res) => {
      if (!res.success) this.notifyError(`Gagal menghapus Service Director dari Supabase: ${res.error}`);
    });
  }

  // --- SD SCHEDULES & ASSIGNMENTS CRUD ---
  public getSDSchedules(): SDSchedule[] {
    const data = localStorage.getItem(STORAGE_KEYS.SD_SCHEDULES);
    if (!data) {
      // Seed initial schedule
      localStorage.setItem(STORAGE_KEYS.SD_SCHEDULES, JSON.stringify([DEFAULT_SD_SCHEDULE_AUG_2026]));
      return [DEFAULT_SD_SCHEDULE_AUG_2026];
    }
    return JSON.parse(data);
  }

  public getSDScheduleByMonthYear(month: number, year: number): SDSchedule | undefined {
    return this.getSDSchedules().find((s) => s.month === month && s.year === year);
  }

  public saveSDSchedule(schedule: SDSchedule): void {
    const list = this.getSDSchedules();
    const idx = list.findIndex((s) => s.id === schedule.id);
    if (idx !== -1) {
      list[idx] = schedule;
    } else {
      list.push(schedule);
    }
    localStorage.setItem(STORAGE_KEYS.SD_SCHEDULES, JSON.stringify(list));
    this.notify();

    pushTableToSupabase('sd_schedules', [schedule]).then((res) => {
      if (!res.success) this.notifyError(`Gagal menyimpan Jadwal SD ke Supabase: ${res.error}`);
    });
  }

  public getSDAssignments(): SDAssignment[] {
    const data = localStorage.getItem(STORAGE_KEYS.SD_ASSIGNMENTS);
    if (!data) {
      // Seed default assignments
      localStorage.setItem(STORAGE_KEYS.SD_ASSIGNMENTS, JSON.stringify(DEFAULT_SD_ASSIGNMENTS_AUG_2026));
      return DEFAULT_SD_ASSIGNMENTS_AUG_2026;
    }
    return JSON.parse(data);
  }

  public getSDAssignmentsForSchedule(sdScheduleId: string): SDAssignment[] {
    return this.getSDAssignments().filter((a) => a.sd_schedule_id === sdScheduleId);
  }

  public getSDAssignmentsForMonth(month: number, year: number): SDAssignment[] {
    const sched = this.getSDScheduleByMonthYear(month, year);
    const targetSchedId = sched ? sched.id : `sd-sched-${year}-${month}`;
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

    return this.getSDAssignments().filter(
      (a) =>
        a.sd_schedule_id === targetSchedId ||
        a.sd_schedule_id === `sd-sched-${year}-${month}` ||
        (a.weekend_id && a.weekend_id.startsWith(monthPrefix)) ||
        (a.service_date && a.service_date.startsWith(monthPrefix))
    );
  }

  public saveSDAssignmentsForSchedule(sdScheduleId: string, newAssignments: SDAssignment[]): void {
    const allAssignments = this.getSDAssignments().filter((a) => a.sd_schedule_id !== sdScheduleId);
    allAssignments.push(...newAssignments);
    localStorage.setItem(STORAGE_KEYS.SD_ASSIGNMENTS, JSON.stringify(allAssignments));
    this.notify();

    const sdSchedule = this.getSDSchedules().find((s) => s.id === sdScheduleId);
    const syncFn = async () => {
      if (sdSchedule) {
        await pushTableToSupabase('sd_schedules', [sdSchedule]);
      }
      const res = await pushTableToSupabase('sd_assignments', newAssignments);
      if (!res.success) this.notifyError(`Gagal menyimpan Penugasan SD ke Supabase: ${res.error}`);
    };
    syncFn();
  }

  public updateSDAssignment(id: string, updates: Partial<SDAssignment>): void {
    const list = this.getSDAssignments();
    const idx = list.findIndex((a) => a.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      localStorage.setItem(STORAGE_KEYS.SD_ASSIGNMENTS, JSON.stringify(list));
      this.notify();

      pushTableToSupabase('sd_assignments', [list[idx]]).then((res) => {
        if (!res.success) this.notifyError(`Gagal memperbarui Penugasan SD di Supabase: ${res.error}`);
      });
    }
  }

  public assignSDToSlot(params: {
    month: number;
    year: number;
    weekend_id: string;
    service_date: string;
    location_id: 'barat' | 'timur' | 'selatan' | 'pusura';
    slot_id: string;
    sd_id: string;
    locked?: boolean;
  }): SDAssignment {
    const { month, year, weekend_id, service_date, location_id, slot_id, sd_id, locked = true } = params;

    let sched = this.getSDScheduleByMonthYear(month, year);
    if (!sched) {
      sched = {
        id: `sd-sched-${year}-${month}`,
        month,
        year,
        status: 'draft',
        created_at: new Date().toISOString(),
      };
      this.saveSDSchedule(sched);
    }

    const allAssignments = this.getSDAssignments();
    const existingIdx = allAssignments.findIndex(
      (a) => a.sd_schedule_id === sched.id && a.weekend_id === weekend_id && a.slot_id === slot_id
    );

    let resultAssignment: SDAssignment;

    if (existingIdx !== -1) {
      resultAssignment = {
        ...allAssignments[existingIdx],
        sd_id,
        locked,
        manually_assigned: true,
      };
      allAssignments[existingIdx] = resultAssignment;
    } else {
      resultAssignment = {
        id: `sd-asgn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sd_schedule_id: sched.id,
        weekend_id,
        service_date,
        location_id,
        slot_id,
        sd_id,
        locked,
        manually_assigned: true,
      };
      allAssignments.push(resultAssignment);
    }

    localStorage.setItem(STORAGE_KEYS.SD_ASSIGNMENTS, JSON.stringify(allAssignments));
    this.notify();

    pushTableToSupabase('sd_assignments', [resultAssignment]).then((res) => {
      if (!res.success) this.notifyError(`Gagal menugaskan SD di Supabase: ${res.error}`);
    });

    return resultAssignment;
  }

  public removeSDAssignmentFromSlot(month: number, year: number, weekend_id: string, slot_id: string): void {
    const sched = this.getSDScheduleByMonthYear(month, year);
    if (!sched) return;

    const allAssignments = this.getSDAssignments();
    const removedItem = allAssignments.find((a) => a.sd_schedule_id === sched.id && a.weekend_id === weekend_id && a.slot_id === slot_id);
    const filtered = allAssignments.filter(
      (a) => !(a.sd_schedule_id === sched.id && a.weekend_id === weekend_id && a.slot_id === slot_id)
    );

    localStorage.setItem(STORAGE_KEYS.SD_ASSIGNMENTS, JSON.stringify(filtered));
    this.notify();

    if (removedItem) {
      deleteFromSupabase('sd_assignments', 'id', removedItem.id).then((res) => {
        if (!res.success) this.notifyError(`Gagal menghapus penugasan SD di Supabase: ${res.error}`);
      });
    }
  }

  public clearUnlockedSDAssignments(month: number, year: number): { clearedCount: number; remainingCount: number } {
    const sched = this.getSDScheduleByMonthYear(month, year);
    const targetSchedId = sched ? sched.id : `sd-sched-${year}-${month}`;
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

    const allAssignments = this.getSDAssignments();
    let clearedCount = 0;
    const updatedAssignments = allAssignments.filter((a) => {
      const isTargetMonth =
        a.sd_schedule_id === targetSchedId ||
        a.sd_schedule_id === `sd-sched-${year}-${month}` ||
        (a.weekend_id && a.weekend_id.startsWith(monthPrefix)) ||
        (a.service_date && a.service_date.startsWith(monthPrefix));

      if (isTargetMonth) {
        if (a.locked || a.manually_assigned || sched?.status === 'finalized') {
          return true; // Keep locked / manual / finalized assignments
        } else {
          clearedCount++;
          return false; // Remove unlocked generated assignment
        }
      }
      return true; // Keep assignments for other months
    });

    localStorage.setItem(STORAGE_KEYS.SD_ASSIGNMENTS, JSON.stringify(updatedAssignments));
    this.notify();

    pushTableToSupabase('sd_assignments', updatedAssignments).then((res) => {
      if (!res.success) this.notifyError(`Gagal menyinkronkan penugasan SD ke Supabase: ${res.error}`);
    });

    const remainingCount = updatedAssignments.filter((a) =>
      a.sd_schedule_id === targetSchedId ||
      a.sd_schedule_id === `sd-sched-${year}-${month}` ||
      (a.weekend_id && a.weekend_id.startsWith(monthPrefix)) ||
      (a.service_date && a.service_date.startsWith(monthPrefix))
    ).length;

    return { clearedCount, remainingCount };
  }

  public clearAllSDAssignments(month: number, year: number): { clearedCount: number } {
    const sched = this.getSDScheduleByMonthYear(month, year);
    const targetSchedId = sched ? sched.id : `sd-sched-${year}-${month}`;
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

    const allAssignments = this.getSDAssignments();
    let clearedCount = 0;
    const updatedAssignments = allAssignments.filter((a) => {
      const isTargetMonth =
        a.sd_schedule_id === targetSchedId ||
        a.sd_schedule_id === `sd-sched-${year}-${month}` ||
        (a.weekend_id && a.weekend_id.startsWith(monthPrefix)) ||
        (a.service_date && a.service_date.startsWith(monthPrefix));

      if (isTargetMonth) {
        clearedCount++;
        return false;
      }
      return true;
    });

    localStorage.setItem(STORAGE_KEYS.SD_ASSIGNMENTS, JSON.stringify(updatedAssignments));
    this.notify();

    deleteSDMonthAssignmentsInSupabase(targetSchedId, monthPrefix).then((res) => {
      if (!res.success) this.notifyError(`Gagal menghapus penugasan SD bulan ini di Supabase: ${res.error}`);
    });

    return { clearedCount };
  }
}

export const store = new DataStore();
