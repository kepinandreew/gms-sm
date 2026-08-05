import { Team, Schedule, Assignment, TeamAvailability, SchedulerSettings, ServiceSlot, ServiceWeekend, SpecialService } from '../types';
import { SERVICE_SLOTS } from '../data/locationsAndSlots';
import { getServiceWeekendsInMonth, getWeekendForDate, getMonthName } from './dateUtils';
import { validateTeamAssignment, getDaysDifference, getNormalizedShiftType } from './validator';
import { store } from '../db/store';

export interface GenerateScheduleParams {
  month: number; // 1-12
  year: number; // e.g. 2026
  teams: Team[];
  availabilities: TeamAvailability[];
  pastAssignments: Assignment[];
  settings: SchedulerSettings;
  specialServices?: SpecialService[];
  existingSchedule?: Schedule;
  existingAssignments?: Assignment[];
  regenerateUnlockedOnly?: boolean;
  skipFinalizationCheck?: boolean;
}

export interface ScheduleConflictReport {
  message: string;
  failedWeekendId?: string;
  failedSlotId?: string;
  failedSlotName?: string;
  unfilledSlotsCount: number;
  blockedDetails: string[];
}

export interface ScheduleVariationSummary {
  totalTeams: number;
  assignmentCountDistribution: Record<string, number>;
  weekendPatterns: Record<string, number>;
  repeatedPatternFromPreviousMonthCount: number;
  averageServiceGapWeekends: number;
  weekDistribution: Record<string, number>;
  warnings: string[];
}

export interface GenerateScheduleResult {
  schedule: Schedule;
  assignments: Assignment[];
  logs: string[];
  hasConflict?: boolean;
  conflictReport?: ScheduleConflictReport;
  variationSummary?: ScheduleVariationSummary;
}

export interface RollingHistoricalData {
  rollingCounts: Record<string, number>;
  weekOfMonthCounts: Record<string, Record<number, number>>;
  lastMonthPatterns: Record<string, number[]>;
  lastServiceDates: Record<string, string>;
  teamM1SlotMap: Record<string, Set<string>>;
  teamM1LocationMap: Record<string, Set<string>>;
  teamM1WeeksMap: Record<string, Set<number>>;
  teamM2SlotMap: Record<string, Set<string>>;
  teamM2LocationMap: Record<string, Set<string>>;
  teamM2WeeksMap: Record<string, Set<number>>;
  m1ScheduleFinalized: boolean;
  m2ScheduleFinalized: boolean;
}

interface SlotVariable {
  id: string; // key e.g. "w-2026-09-05-barat-u1"
  weekend: ServiceWeekend;
  slot: ServiceSlot;
  serviceDate: string;
}

/**
 * Helper to normalize slot IDs across different legacy/modern naming conventions.
 */
export function getCanonicalSlotId(slotId?: string): string {
  if (!slotId) return '';
  const s = slotId.toLowerCase();
  if (s.includes('english')) return 'english-service';
  if (s.includes('barat-u1') || s.includes('barat-slot-a')) return 'barat-u1';
  if (s.includes('barat-u2') || s.includes('barat-slot-b')) return 'barat-u2-u3';
  if (s.includes('barat-u4') || s.includes('barat-slot-c')) return 'barat-u4-u5';
  if (s.includes('timur-u1') || s.includes('timur-slot-a')) return 'timur-u1';
  if (s.includes('timur-u2') || s.includes('timur-slot-b')) return 'timur-u2-u3';
  if (s.includes('timur-u4') || s.includes('timur-slot-c')) return 'timur-u4-u5';
  if (s.includes('selatan-u1') || s.includes('selatan-slot-a')) return 'selatan-u1-u2';
  if (s.includes('selatan-u3') || s.includes('selatan-slot-b') || s.includes('selatan-u3-4')) return 'selatan-u3-u4';
  if (s.includes('pusura')) return 'pusura-u1-u2';
  return s;
}

/**
 * Computes rolling historical data over prior finalized months (M-1 and M-2 lookback).
 * Strictly filters out assignments from non-finalized schedules.
 */
export function computeRollingHistoricalData(params: {
  pastAssignments: Assignment[];
  activeTeams: Team[];
  targetMonth: number;
  targetYear: number;
}): RollingHistoricalData {
  const { pastAssignments, activeTeams, targetMonth, targetYear } = params;

  const m1Month = targetMonth === 1 ? 12 : targetMonth - 1;
  const m1Year = targetMonth === 1 ? targetYear - 1 : targetYear;

  const m2Month = m1Month === 1 ? 12 : m1Month - 1;
  const m2Year = m1Month === 1 ? m1Year - 1 : m1Year;

  const rollingCounts: Record<string, number> = {};
  const weekOfMonthCounts: Record<string, Record<number, number>> = {};
  const lastMonthWeekendsMap: Record<string, Set<number>> = {};
  const lastServiceDates: Record<string, string> = {};

  const teamM1SlotMap: Record<string, Set<string>> = {};
  const teamM1LocationMap: Record<string, Set<string>> = {};
  const teamM1WeeksMap: Record<string, Set<number>> = {};

  const teamM2SlotMap: Record<string, Set<string>> = {};
  const teamM2LocationMap: Record<string, Set<string>> = {};
  const teamM2WeeksMap: Record<string, Set<number>> = {};

  activeTeams.forEach((t) => {
    rollingCounts[t.id] = 0;
    weekOfMonthCounts[t.id] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    lastMonthWeekendsMap[t.id] = new Set<number>();
    lastServiceDates[t.id] = '';

    teamM1SlotMap[t.id] = new Set<string>();
    teamM1LocationMap[t.id] = new Set<string>();
    teamM1WeeksMap[t.id] = new Set<number>();

    teamM2SlotMap[t.id] = new Set<string>();
    teamM2LocationMap[t.id] = new Set<string>();
    teamM2WeeksMap[t.id] = new Set<number>();
  });

  const schedulesMap = new Map<string, Schedule>();
  store.getSchedules().forEach((s) => schedulesMap.set(s.id, s));

  const m1Sched = store.getScheduleByMonthYear(m1Month, m1Year);
  const m2Sched = store.getScheduleByMonthYear(m2Month, m2Year);

  const m1ScheduleFinalized = m1Sched?.status === 'finalized';
  const m2ScheduleFinalized = m2Sched?.status === 'finalized';

  const targetTotalMonths = targetYear * 12 + (targetMonth - 1);
  const lookbackStartTotalMonths = targetTotalMonths - 3;

  pastAssignments.forEach((asgn) => {
    if (rollingCounts[asgn.team_id] === undefined) return;

    let m = targetMonth;
    let y = targetYear;
    let schedStatus = '';
    if (asgn.schedule_id && schedulesMap.has(asgn.schedule_id)) {
      const sched = schedulesMap.get(asgn.schedule_id)!;
      m = sched.month;
      y = sched.year;
      schedStatus = sched.status;
    } else if (asgn.service_date) {
      const parts = asgn.service_date.split('-');
      if (parts.length >= 2) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
      }
      const sched = store.getScheduleByMonthYear(m, y);
      if (sched) schedStatus = sched.status;
    }

    // RULE 1 & 12: ONLY load historical assignments from FINALIZED schedules!
    if (schedStatus !== 'finalized') {
      return;
    }

    const itemTotalMonths = y * 12 + (m - 1);
    const dateStr = asgn.service_date || asgn.weekend_id;

    if (dateStr && dateStr < `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`) {
      if (!lastServiceDates[asgn.team_id] || dateStr > lastServiceDates[asgn.team_id]) {
        lastServiceDates[asgn.team_id] = dateStr;
      }
    }

    const canonicalSlotId = getCanonicalSlotId(asgn.slot_id);
    const dayNum = dateStr ? parseInt(dateStr.split('-')[2] || '1', 10) : 1;
    const wNum = dayNum <= 7 ? 1 : dayNum <= 14 ? 2 : dayNum <= 21 ? 3 : dayNum <= 28 ? 4 : 5;

    // Record M-1 finalized history
    if (m === m1Month && y === m1Year) {
      teamM1SlotMap[asgn.team_id]?.add(canonicalSlotId);
      if (asgn.location_id) teamM1LocationMap[asgn.team_id]?.add(asgn.location_id);
      teamM1WeeksMap[asgn.team_id]?.add(wNum);
      lastMonthWeekendsMap[asgn.team_id]?.add(wNum);
    }

    // Record M-2 finalized history
    if (m === m2Month && y === m2Year) {
      teamM2SlotMap[asgn.team_id]?.add(canonicalSlotId);
      if (asgn.location_id) teamM2LocationMap[asgn.team_id]?.add(asgn.location_id);
      teamM2WeeksMap[asgn.team_id]?.add(wNum);
    }

    if (itemTotalMonths >= lookbackStartTotalMonths && itemTotalMonths < targetTotalMonths) {
      rollingCounts[asgn.team_id] += 1;
      weekOfMonthCounts[asgn.team_id][wNum] = (weekOfMonthCounts[asgn.team_id][wNum] || 0) + 1;
    }
  });

  const lastMonthPatterns: Record<string, number[]> = {};
  activeTeams.forEach((t) => {
    lastMonthPatterns[t.id] = Array.from(lastMonthWeekendsMap[t.id]).sort((a, b) => a - b);
  });

  return {
    rollingCounts,
    weekOfMonthCounts,
    lastMonthPatterns,
    lastServiceDates,
    teamM1SlotMap,
    teamM1LocationMap,
    teamM1WeeksMap,
    teamM2SlotMap,
    teamM2LocationMap,
    teamM2WeeksMap,
    m1ScheduleFinalized,
    m2ScheduleFinalized,
  };
}

export function generateScheduleVariationSummary(params: {
  assignments: Assignment[];
  activeTeams: Team[];
  pastAssignments: Assignment[];
  weekends: ServiceWeekend[];
  targetMonth: number;
  targetYear: number;
  rollingData?: RollingHistoricalData;
}): ScheduleVariationSummary {
  const { assignments, activeTeams, pastAssignments, weekends, targetMonth, targetYear, rollingData } = params;

  const countDist: Record<string, number> = { '1x': 0, '2x': 0, '3x': 0, 'Other': 0 };
  const patternDist: Record<string, number> = {};
  const weekDist: Record<string, number> = { W1: 0, W2: 0, W3: 0, W4: 0, W5: 0 };

  let repeatedCount = 0;
  let totalGapDays = 0;
  let gapCount = 0;

  activeTeams.forEach((t) => {
    const tAsgns = assignments.filter((a) => a.team_id === t.id);
    const count = tAsgns.length;
    if (count === 1) countDist['1x']++;
    else if (count === 2) countDist['2x']++;
    else if (count === 3) countDist['3x']++;
    else countDist['Other']++;

    const weeksServed = tAsgns.map((a) => {
      const d = parseInt((a.service_date || a.weekend_id).split('-')[2] || '1', 10);
      return d <= 7 ? 1 : d <= 14 ? 2 : d <= 21 ? 3 : d <= 28 ? 4 : 5;
    });

    weeksServed.forEach((w) => {
      const key = `W${w}`;
      weekDist[key] = (weekDist[key] || 0) + 1;
    });

    const sortedWeeks = Array.from(new Set(weeksServed)).sort((a, b) => a - b);
    const patternStr = sortedWeeks.length > 0 ? sortedWeeks.map((w) => `W${w}`).join('+') : 'Off';
    patternDist[patternStr] = (patternDist[patternStr] || 0) + 1;

    if (rollingData) {
      const lastPattern = rollingData.lastMonthPatterns[t.id] || [];
      if (
        sortedWeeks.length >= 2 &&
        lastPattern.length >= 2 &&
        sortedWeeks.length === lastPattern.length &&
        sortedWeeks.every((v, idx) => v === lastPattern[idx])
      ) {
        repeatedCount++;
      }
    }

    if (tAsgns.length >= 2) {
      const dates = tAsgns.map((a) => a.service_date || a.weekend_id).sort();
      for (let i = 1; i < dates.length; i++) {
        const diffDays = getDaysDifference(dates[i], dates[i - 1]);
        totalGapDays += diffDays;
        gapCount++;
      }
    }
  });

  const avgGapWeekends = gapCount > 0 ? Number((totalGapDays / gapCount / 7).toFixed(1)) : 2.0;

  const warnings: string[] = [];
  if (activeTeams.length > 0 && repeatedCount / activeTeams.length > 0.5) {
    warnings.push(
      `⚠️ Rotasi pola weekend belum optimal: ${repeatedCount} dari ${activeTeams.length} tim mengulang pola pelayanan bulan sebelumnya.`
    );
  }

  return {
    totalTeams: activeTeams.length,
    assignmentCountDistribution: countDist,
    weekendPatterns: patternDist,
    repeatedPatternFromPreviousMonthCount: repeatedCount,
    averageServiceGapWeekends: avgGapWeekends,
    weekDistribution: weekDist,
    warnings,
  };
}

interface SlotVariable {
  id: string; // key e.g. "w-2026-09-05-barat-u1"
  weekend: ServiceWeekend;
  slot: ServiceSlot;
  serviceDate: string;
}

export function getSlotEligibilityBreakdown(params: {
  weekend: ServiceWeekend;
  slot: ServiceSlot;
  activeTeams: Team[];
  pastAssignments: Assignment[];
  monthAssignments: Assignment[];
  availabilities: TeamAvailability[];
  teams: Team[];
}): {
  slotName: string;
  weekendLabel: string;
  totalTeams: number;
  excludedPreviousOff: string[];
  excludedAvailability: string[];
  excludedSameWeekend: string[];
  excludedOtherHard: string[];
  eligibleTeams: string[];
} {
  const { weekend, slot, activeTeams, pastAssignments, monthAssignments, availabilities, teams } = params;
  const isSat = slot.day === 'SATURDAY';
  const serviceDate = isSat ? weekend.saturday_date : weekend.sunday_date;

  const excludedPreviousOff: string[] = [];
  const excludedAvailability: string[] = [];
  const excludedSameWeekend: string[] = [];
  const excludedOtherHard: string[] = [];
  const eligibleTeams: string[] = [];

  const currentWeekendAsgns = monthAssignments.filter((a) => a.weekend_id === weekend.id);

  activeTeams.forEach((team) => {
    // 0. Member Availability check (Cuti / Inactive)
    const teamMembers = store.getTeamMembers(team.id);
    if (teamMembers && teamMembers.length > 0) {
      const activeMembers = teamMembers.filter(
        (m) => m.status === 'active' || (!m.status && (m.status as any) !== 'cuti' && (m.status as any) !== 'inactive')
      );
      if (activeMembers.length === 0) {
        excludedAvailability.push(`${team.name} (Semua anggota Cuti/Inactive)`);
        return;
      }
    }

    // 1. Availability check
    const avail = availabilities.find((a) => a.team_id === team.id && a.weekend_date === weekend.id);
    if (avail && !avail.available) {
      excludedAvailability.push(team.name);
      return;
    }

    // 2. Same weekend assignment check
    const sameWknd = currentWeekendAsgns.filter((a) => a.team_id === team.id);
    if (sameWknd.length > 0) {
      excludedSameWeekend.push(team.name);
      return;
    }

    // 3. Off 1 week rule check
    const filteredPast = pastAssignments.filter((a) => {
      const aDate = a.service_date || a.weekend_id;
      return aDate < serviceDate;
    });

    const allKnown = [...filteredPast, ...monthAssignments].filter((a) => {
      if (a.team_id !== team.id) return false;
      if (a.slot_id.startsWith('spec-') && (a as any).countsAsServiceAssignment === false) return false;
      return true;
    });

    let isOffConflict = false;
    for (const asgn of allKnown) {
      const asgnDate = asgn.service_date || asgn.weekend_id;
      const daysDiff = getDaysDifference(serviceDate, asgnDate);
      if (daysDiff > 0 && daysDiff < 12) {
        isOffConflict = true;
        break;
      }
    }
    if (isOffConflict) {
      excludedPreviousOff.push(team.name);
      return;
    }

    // 4. General hard conflict validation
    const val = validateTeamAssignment({
      teamId: team.id,
      weekendId: weekend.id,
      slotId: slot.id,
      currentAssignmentsInWeekend: currentWeekendAsgns,
      monthAssignments,
      pastAssignments,
      allTeams: teams,
      availabilities,
      serviceDate,
    });

    if (val.severity === 'HARD_CONFLICT') {
      excludedOtherHard.push(team.name);
    } else {
      eligibleTeams.push(team.name);
    }
  });

  return {
    slotName: slot.name,
    weekendLabel: weekend.label,
    totalTeams: activeTeams.length,
    excludedPreviousOff,
    excludedAvailability,
    excludedSameWeekend,
    excludedOtherHard,
    eligibleTeams,
  };
}

export function generateMonthlySchedule(params: GenerateScheduleParams): GenerateScheduleResult {
  const {
    month,
    year,
    teams,
    availabilities,
    pastAssignments,
    settings,
    specialServices = store.getSpecialServices(month, year),
    existingSchedule,
    existingAssignments = [],
    regenerateUnlockedOnly = false,
    skipFinalizationCheck = false,
  } = params;

  // Rule 11: Finalized schedule lock check
  if (existingSchedule && existingSchedule.status === 'finalized') {
    throw new Error(
      `Jadwal ${getMonthName(month)} ${year} sudah difinalisasi (Read-Only). Silakan batalkan finalisasi (Re-open) terlebih dahulu jika ingin meng-generate ulang.`
    );
  }

  // Rule 2 & 13: Check previous month finalization
  if (!skipFinalizationCheck) {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthName = getMonthName(prevMonth);

    const prevSched = store.getScheduleByMonthYear(prevMonth, prevYear);
    if (!prevSched || prevSched.status !== 'finalized') {
      throw new Error(
        `${prevMonthName} ${prevYear} belum difinalisasi.\nSilakan Finalize jadwal ${prevMonthName} terlebih dahulu agar histori yang digunakan sudah benar.`
      );
    }
  }

  const startTime = Date.now();
  const logs: string[] = [];
  logs.push(`Memulai penjadwalan otomatis CSP (MRV + Forward Checking) untuk ${month}/${year}...`);

  // Filter pastAssignments to strictly prior months (before target month start)
  const targetMonthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const cleanPastAssignments = pastAssignments.filter(
    (a) => (a.service_date || a.weekend_id) < targetMonthStart
  );

  // 1. Get Service Weekends in target month
  const weekends = getServiceWeekendsInMonth(month, year);
  const regularSlotsCount = weekends.length * SERVICE_SLOTS.length;

  // Active Special Services for this month/year
  const activeSpecialServices = specialServices.filter(
    (s) => s.status === 'active' && s.month === month && s.year === year
  );

  let preAssignedCount = 0;
  let unassignedCount = 0;
  let blockingOffCount = 0;
  let nonBlockingCount = 0;

  activeSpecialServices.forEach((s) => {
    if (s.countsAsServiceAssignment) {
      blockingOffCount++;
    } else {
      nonBlockingCount++;
    }
    s.slots.forEach((slot) => {
      if (slot.assigned_team_ids && slot.assigned_team_ids.length > 0) {
        preAssignedCount++;
      } else {
        unassignedCount++;
      }
    });
  });

  // Regular slots count determines CSP quota
  const totalSlotsCount = regularSlotsCount;

  // 2. Filter Active Teams
  const activeTeams = teams.filter((t) => t.status === 'active');
  logs.push(
    `REGULAR SCHEDULE: ${weekends.length} Service Weekends (${regularSlotsCount} regular slots) & ${activeTeams.length} tim aktif.`
  );
  logs.push(
    `SPECIAL SERVICES: Total ${activeSpecialServices.length} events (Pre-assigned: ${preAssignedCount}, Unassigned: ${unassignedCount}, Blocking OFF: ${blockingOffCount}, Non-blocking: ${nonBlockingCount}).`
  );

  if (activeTeams.length === 0) {
    throw new Error('Tidak ada tim aktif untuk dijadwalkan.');
  }

  // 3. Calculate Historical Lifetime Service Counts per Team using cleanPastAssignments
  const teamLifetimeCounts: Record<string, number> = {};
  const teamLastPastDateMap: Record<string, string> = {};
  activeTeams.forEach((t) => {
    teamLifetimeCounts[t.id] = 0;
    teamLastPastDateMap[t.id] = '';
  });

  cleanPastAssignments.forEach((asgn) => {
    if (teamLifetimeCounts[asgn.team_id] !== undefined) {
      teamLifetimeCounts[asgn.team_id]++;
    }
    const d = asgn.service_date || asgn.weekend_id;
    if (d < targetMonthStart) {
      if (!teamLastPastDateMap[asgn.team_id] || d > teamLastPastDateMap[asgn.team_id]) {
        teamLastPastDateMap[asgn.team_id] = d;
      }
    }
  });

  // 4. Calculate Target Monthly Quotas per Team
  const baseQuota = Math.floor(totalSlotsCount / activeTeams.length);
  const remainder = totalSlotsCount % activeTeams.length;

  const sortedByLifetime = [...activeTeams].sort((a, b) => {
    const countA = teamLifetimeCounts[a.id] || 0;
    const countB = teamLifetimeCounts[b.id] || 0;
    return countA - countB;
  });

  // Physical upper bound on service count per team due to WAJIB OFF 1 MINGGU (no consecutive weekends)
  const maxPossibleQuotaPerTeam = Math.ceil(weekends.length / 2);

  const targetQuotas: Record<string, number> = {};
  activeTeams.forEach((t) => (targetQuotas[t.id] = Math.min(baseQuota, maxPossibleQuotaPerTeam)));

  for (let i = 0; i < remainder; i++) {
    const teamToIncrement = sortedByLifetime[i];
    targetQuotas[teamToIncrement.id] = Math.min(targetQuotas[teamToIncrement.id] + 1, maxPossibleQuotaPerTeam);
  }

  logs.push(
    `Target kuota regular pelayanan bulan ini: ${baseQuota} s/d ${Math.min(
      baseQuota + (remainder > 0 ? 1 : 0),
      maxPossibleQuotaPerTeam
    )} kali per tim (Max cap: ${maxPossibleQuotaPerTeam}x karena aturan OFF 1 minggu).`
  );

  const scheduleId = existingSchedule ? existingSchedule.id : `sched-${year}-${month}`;

  // Pre-fill initial assignments and team usage
  const initialAssignments: Assignment[] = [];
  const initialTeamUsage: Record<string, number> = {};
  activeTeams.forEach((t) => (initialTeamUsage[t.id] = 0));

  // If a Special Service has countsAsServiceAssignment === true AND has an assigned team,
  // we record it as a blocking assignment for that team only
  for (const ss of activeSpecialServices) {
    if (ss.countsAsServiceAssignment) {
      for (const slot of ss.slots) {
        const assignedId = slot.assigned_team_ids?.[0];
        if (assignedId) {
          const w = getWeekendForDate(ss.date, weekends) || weekends[0];
          initialAssignments.push({
            id: `asgn-spec-${ss.id}-${slot.id}`,
            schedule_id: scheduleId,
            weekend_id: w.id,
            service_date: ss.date,
            team_id: assignedId,
            location_id: (ss.location_id || 'barat') as any,
            slot_id: `spec-${ss.id}-${slot.id}`,
            locked: true,
            manually_assigned: true,
            countsAsServiceAssignment: true,
          } as any);
        }
      }
    }
  }

  // 3b. Compute Rolling Historical Data (3 months lookback)
  const rollingData = computeRollingHistoricalData({
    pastAssignments: cleanPastAssignments,
    activeTeams,
    targetMonth: month,
    targetYear: year,
  });

  // 5. Build Slot Variables Array (ONLY Regular Service Slots)
  const slotVariables: SlotVariable[] = [];

  for (const w of weekends) {
    for (const slot of SERVICE_SLOTS) {
      const isSat = slot.day === 'SATURDAY';
      slotVariables.push({
        id: `${w.id}-${slot.id}`,
        weekend: w,
        slot,
        serviceDate: isSat ? w.saturday_date : w.sunday_date,
      });
    }
  }

  // Locked assignments map from existing schedule if regenerating unlocked only
  const lockedAssignmentsMap: Record<string, Assignment> = {};
  if (regenerateUnlockedOnly && existingAssignments) {
    existingAssignments.forEach((asgn) => {
      if (asgn.locked) {
        lockedAssignmentsMap[`${asgn.weekend_id}-${asgn.slot_id}`] = asgn;
      }
    });
  }

  // Pre-fill existing locked assignments if regenerating
  slotVariables.forEach((sv) => {
    if (lockedAssignmentsMap[sv.id]) {
      const lockedAsgn = lockedAssignmentsMap[sv.id];
      if (!initialAssignments.some((a) => a.id === lockedAsgn.id)) {
        initialAssignments.push(lockedAsgn);
        if (initialTeamUsage[lockedAsgn.team_id] !== undefined) {
          initialTeamUsage[lockedAsgn.team_id]++;
        }
      }
    }
  });

  const unassignedSlotVariables = slotVariables.filter(
    (sv) => !lockedAssignmentsMap[sv.id] && !initialAssignments.some((a) => a.slot_id === sv.slot.id)
  );

  // Maximum slot capacity that active teams can legally fill under targetQuotas
  const maxUnassignedCapacity = activeTeams.reduce(
    (sum, t) => sum + Math.max(0, targetQuotas[t.id] - (initialTeamUsage[t.id] || 0)),
    0
  );
  const targetUnassignedSlotsToFill = Math.min(unassignedSlotVariables.length, maxUnassignedCapacity);

  // 6. CSP Solver Function with MRV + Forward Checking & Pattern Diversity
  let bestAssignments: Assignment[] = [];
  let globalBestPartialAssignments: Assignment[] = [];
  let globalMaxAssignedCount = -1;

  function runCspSolver(maxQuotaMap: Record<string, number>, maxSearchAttempts: number): Assignment[] | null {
    let localBestAssignments: Assignment[] | null = null;
    let localBestScore = -Infinity;

    for (let attempt = 0; attempt < maxSearchAttempts; attempt++) {
      const currentAssignments = [...initialAssignments];
      const teamUsage = { ...initialTeamUsage };

      const tracker: SolverTracker = {
        visitCount: 0,
        maxVisits: 1000, // Search depth guard (max 1000 visits per search attempt)
        visitedStates: new Set<string>(),
        bestAssignments: [...currentAssignments],
        bestAssignedCount: currentAssignments.length,
      };

      const resultAssignments = backtrackSolve({
        unassigned: [...unassignedSlotVariables],
        currentAssignments,
        teamUsage,
        maxQuotaMap,
        activeTeams,
        teams,
        pastAssignments: cleanPastAssignments,
        teamLastPastDateMap,
        availabilities,
        settings,
        scheduleId,
        attempt,
        rollingData,
        tracker,
      });

      if (tracker.bestAssignedCount > globalMaxAssignedCount) {
        globalMaxAssignedCount = tracker.bestAssignedCount;
        globalBestPartialAssignments = tracker.bestAssignments;
      }

      const targetTotalSlots = initialAssignments.length + targetUnassignedSlotsToFill;
      if (resultAssignments && resultAssignments.length >= targetTotalSlots) {
        const score = evaluateScheduleQuality({
          assignments: resultAssignments,
          activeTeams,
          targetQuotas,
          pastAssignments: cleanPastAssignments,
          settings,
          rollingData,
        });

        if (score > localBestScore) {
          localBestScore = score;
          localBestAssignments = resultAssignments;
        }

        if (localBestScore > 92) break;
      }
    }

    return localBestAssignments;
  }

  // Level 1: Strict Target Quotas (max 3 attempt passes)
  bestAssignments = runCspSolver(targetQuotas, 3) || [];

  // Level 2 Fallback: Relax Quotas by +1 if strict quota is unfeasible
  if (bestAssignments.length === 0 || bestAssignments.length < slotVariables.length) {
    const relaxedQuotas: Record<string, number> = {};
    activeTeams.forEach((t) => (relaxedQuotas[t.id] = targetQuotas[t.id] + 1));
    logs.push('ℹ️ Level 2: Menggunakan relaksasi kuota fleksibel (+1) untuk menemukan solusi feasible.');
    const res2 = runCspSolver(relaxedQuotas, 3);
    if (res2 && res2.length > bestAssignments.length) {
      bestAssignments = res2;
    }
  }

  // Level 3 Fallback: Relax Quotas by +2
  if (bestAssignments.length < slotVariables.length) {
    const relaxedQuotas2: Record<string, number> = {};
    activeTeams.forEach((t) => (relaxedQuotas2[t.id] = targetQuotas[t.id] + 2));
    logs.push('ℹ️ Level 3: Menggunakan relaksasi kuota fleksibel (+2) untuk menemukan solusi feasible.');
    const res3 = runCspSolver(relaxedQuotas2, 3);
    if (res3 && res3.length > bestAssignments.length) {
      bestAssignments = res3;
    }
  }

  // Level 4 Fallback: Unconstrained Quotas (up to total slots)
  if (bestAssignments.length < slotVariables.length) {
    const unconstrainedQuotas: Record<string, number> = {};
    activeTeams.forEach((t) => (unconstrainedQuotas[t.id] = slotVariables.length));
    logs.push('ℹ️ Level 4: Menggunakan kuota bebas untuk menghindari kegagalan jadwal selama hard constraints terpenuhi.');
    const res4 = runCspSolver(unconstrainedQuotas, 3);
    if (res4 && res4.length > bestAssignments.length) {
      bestAssignments = res4;
    }
  }

  let hasConflict = false;
  let conflictReport: ScheduleConflictReport | undefined;

  if (bestAssignments.length < slotVariables.length) {
    hasConflict = true;
    logs.push(
      `⚠️ CONFLICT DETECTED: Algoritma mengalokasikan ${bestAssignments.length} dari ${slotVariables.length} slot secara presisi tanpa melanggar hard constraint. ${slotVariables.length - bestAssignments.length} slot sisa disesuaikan secara otomatis.`
    );

    const partialAssignments =
      bestAssignments.length > 0
        ? [...bestAssignments]
        : globalBestPartialAssignments.length > 0
        ? [...globalBestPartialAssignments]
        : [...initialAssignments];

    const unassignedSV = slotVariables.filter(
      (sv) => !partialAssignments.some((a) => a.weekend_id === sv.weekend.id && a.slot_id === sv.slot.id)
    );

    const blockedDetails: string[] = [];

    unassignedSV.forEach((sv) => {
      const weekendAsgns = partialAssignments.filter((a) => a.weekend_id === sv.weekend.id);
      let assignedTeam: Team | undefined;

      for (const team of activeTeams) {
        const val = validateTeamAssignment({
          teamId: team.id,
          weekendId: sv.weekend.id,
          slotId: sv.slot.id,
          currentAssignmentsInWeekend: weekendAsgns,
          monthAssignments: partialAssignments,
          pastAssignments: cleanPastAssignments,
          precomputedLastPastDate: teamLastPastDateMap[team.id],
          allTeams: teams,
          availabilities,
          serviceDate: sv.serviceDate,
        });

        if (val.severity !== 'HARD_CONFLICT') {
          assignedTeam = team;
          break;
        }
      }

      if (!assignedTeam) {
        const teamInWeekend = new Set(weekendAsgns.map((a) => a.team_id));
        const unusedInWeekend = activeTeams.filter((t) => !teamInWeekend.has(t.id));
        const pool = unusedInWeekend.length > 0 ? unusedInWeekend : activeTeams;

        const sortedPool = [...pool].sort((a, b) => {
          const countA = partialAssignments.filter((asgn) => asgn.team_id === a.id).length;
          const countB = partialAssignments.filter((asgn) => asgn.team_id === b.id).length;
          return countA - countB;
        });

        assignedTeam = sortedPool[0];
        blockedDetails.push(
          `Slot ${sv.slot.name} (${sv.weekend.label}): Dialokasikan ke ${assignedTeam.name} karena tim lain bertabrakan dengan jadwal/rest rule.`
        );
      }

      partialAssignments.push({
        id: `asgn-${sv.weekend.id}-${sv.slot.id}`,
        schedule_id: scheduleId,
        weekend_id: sv.weekend.id,
        service_date: sv.serviceDate,
        team_id: assignedTeam.id,
        location_id: sv.slot.location_id,
        slot_id: sv.slot.id,
        locked: false,
        manually_assigned: false,
      });
    });

    conflictReport = {
      message: 'SCHEDULE CONSTRAINT CONFLICT: Terdapat kendala ketersediaan tim pada beberapa slot.',
      failedWeekendId: unassignedSV[0]?.weekend.id,
      failedSlotName: unassignedSV[0]?.slot.name || 'Slot Ibadah',
      unfilledSlotsCount: unassignedSV.length,
      blockedDetails:
        blockedDetails.length > 0
          ? blockedDetails
          : ['Beberapa slot membutuhkan penyesuaian manual karena aturan OFF 1 minggu dan unavailability.'],
    };

    bestAssignments = partialAssignments;
  }

  // Generate detailed Candidate Selection & Rejection Debug Logs for every slot
  logs.push('\n=== DETAILED CANDIDATE EVALUATION LOGS ===');
  slotVariables.forEach((sv) => {
    const slotAsgn = bestAssignments.find((a) => a.weekend_id === sv.weekend.id && a.slot_id === sv.slot.id);
    const assignedTeam = teams.find((t) => t.id === slotAsgn?.team_id);
    const weekendAsgns = bestAssignments.filter((a) => a.weekend_id === sv.weekend.id && a.id !== slotAsgn?.id);

    logs.push(`--------------------------------------------------`);
    logs.push(`[EVALUASI CANDIDATE FLOW] Slot: ${sv.slot.name} | ${sv.weekend.label} (${sv.serviceDate})`);

    activeTeams.forEach((team) => {
      const validation = validateTeamAssignment({
        teamId: team.id,
        weekendId: sv.weekend.id,
        slotId: sv.slot.id,
        currentAssignmentsInWeekend: weekendAsgns,
        monthAssignments: bestAssignments.filter((a) => a.id !== slotAsgn?.id),
        pastAssignments: cleanPastAssignments,
        precomputedLastPastDate: teamLastPastDateMap[team.id],
        allTeams: teams,
        availabilities,
        serviceDate: sv.serviceDate,
      });

      if (validation.severity === 'HARD_CONFLICT') {
        let reason = 'hard constraint conflict';
        if (team.status !== 'active') {
          reason = 'cuti / inactive';
        } else {
          const avail = availabilities.find((a) => a.team_id === team.id && a.weekend_date === sv.weekend.id);
          if (avail && !avail.available) {
            reason = `unavailable${avail.notes ? ' (' + avail.notes + ')' : ''}`;
          } else if (weekendAsgns.some((a) => a.team_id === team.id)) {
            reason = 'already assigned on same weekend';
          } else if (validation.message.includes('OFF 1 Minggu')) {
            reason = 'rest rule (WAJIB OFF 1 minggu)';
          }
        }
        logs.push(`  • ${team.name} - Rejected because: ${reason}`);
      } else {
        const fitScore = calculateCandidateFitScore({
          team,
          slot: sv.slot,
          weekend: sv.weekend,
          pastAssignments: cleanPastAssignments,
          currentMonthAssignments: bestAssignments.filter((a) => a.id !== slotAsgn?.id),
          settings,
          rollingData,
        });
        logs.push(`  • ${team.name} - Valid Candidate (Score: ${Math.round(fitScore)})`);
      }
    });

    if (assignedTeam) {
      const finalFitScore = calculateCandidateFitScore({
        team: assignedTeam,
        slot: sv.slot,
        weekend: sv.weekend,
        pastAssignments: cleanPastAssignments,
        currentMonthAssignments: bestAssignments.filter((a) => a.id !== slotAsgn?.id),
        settings,
        rollingData,
      });

      logs.push(`  Selected Team: ${assignedTeam.name}`);
      logs.push(`  Reason: Highest scoring valid candidate evaluated`);
      logs.push(`  Final Score: ${Math.round(finalFitScore)}`);
    } else {
      logs.push(`  Selected Team: NONE`);
      logs.push(`  Reason: ALL active teams were evaluated and every candidate violated a HARD constraint`);
    }
  });

  // 7. Compute Final Quality Metrics & Schedule Variation Summary
  const minMaxCounts = computeMinMaxServices(bestAssignments, activeTeams);
  const qualityMetrics = computeDetailedFairnessMetrics({
    assignments: bestAssignments,
    activeTeams,
    targetQuotas,
    pastAssignments: cleanPastAssignments,
    settings,
    rollingData,
  });

  const variationSummary = generateScheduleVariationSummary({
    assignments: bestAssignments,
    activeTeams,
    pastAssignments: cleanPastAssignments,
    weekends,
    targetMonth: month,
    targetYear: year,
    rollingData,
  });

  const finalizedScore = Math.max(0, Math.min(100, Math.round(qualityMetrics.overallScore)));

  const schedule: Schedule = {
    id: scheduleId,
    month,
    year,
    status: existingSchedule ? existingSchedule.status : 'generated',
    created_at: existingSchedule ? existingSchedule.created_at : new Date().toISOString(),
    quality_score: finalizedScore,
    fairness_metrics: {
      monthly_balance_score: qualityMetrics.monthlyBalance,
      longterm_balance_score: qualityMetrics.longtermBalance,
      location_rotation_score: qualityMetrics.locationRotation,
      slot_rotation_score: qualityMetrics.slotRotation,
      date_distribution_score: qualityMetrics.dateDistribution,
      total_assignments: bestAssignments.length,
      active_teams_count: activeTeams.length,
      min_services_per_team: minMaxCounts.min,
      max_services_per_team: minMaxCounts.max,
      avg_services_per_team: Number((bestAssignments.length / activeTeams.length).toFixed(2)),
    },
  };

  logs.push(`Penjadwalan selesai dalam ${Date.now() - startTime}ms dengan Quality Score: ${finalizedScore}/100.`);
  logs.push(`Distribusi pelayanan: MIN ${minMaxCounts.min} - MAX ${minMaxCounts.max} per tim.`);
  logs.push(`📊 LAPORAN VARIASI & FAIRNESS SCHEDULING:`);
  logs.push(
    `• Kuota Pelayanan: 2x: ${variationSummary.assignmentCountDistribution['2x']} tim, 1x: ${variationSummary.assignmentCountDistribution['1x']} tim, 3x: ${variationSummary.assignmentCountDistribution['3x']} tim.`
  );
  logs.push(
    `• Repetisi Pola Bulan Lalu: ${variationSummary.repeatedPatternFromPreviousMonthCount} dari ${activeTeams.length} tim mengulang pola.`
  );
  logs.push(
    `• Rata-rata Jeda Pelayanan: ${variationSummary.averageServiceGapWeekends} service weekend (~${Math.round(variationSummary.averageServiceGapWeekends * 7)} hari).`
  );

  if (variationSummary.warnings.length > 0) {
    variationSummary.warnings.forEach((w) => logs.push(w));
  }

  return {
    schedule,
    assignments: bestAssignments,
    logs,
    hasConflict,
    conflictReport,
    variationSummary,
  };
}

interface SolverTracker {
  visitCount: number;
  maxVisits: number;
  visitedStates: Set<string>;
  bestAssignments: Assignment[];
  bestAssignedCount: number;
}

/**
 * Backtracking Search with MRV (Minimum Remaining Values), Forward Checking, and Bounded Search
 */
function backtrackSolve(params: {
  unassigned: SlotVariable[];
  currentAssignments: Assignment[];
  teamUsage: Record<string, number>;
  maxQuotaMap: Record<string, number>;
  activeTeams: Team[];
  teams: Team[];
  pastAssignments: Assignment[];
  teamLastPastDateMap?: Record<string, string>;
  availabilities: TeamAvailability[];
  settings: SchedulerSettings;
  scheduleId: string;
  attempt: number;
  rollingData?: RollingHistoricalData;
  tracker?: SolverTracker;
}): Assignment[] | null {
  const {
    unassigned,
    currentAssignments,
    teamUsage,
    maxQuotaMap,
    activeTeams,
    teams,
    pastAssignments,
    teamLastPastDateMap,
    availabilities,
    settings,
    scheduleId,
    attempt,
    rollingData,
    tracker,
  } = params;

  if (tracker) {
    tracker.visitCount++;
    if (tracker.visitCount > tracker.maxVisits) {
      return null; // Bound depth exploration
    }

    if (currentAssignments.length > tracker.bestAssignedCount) {
      tracker.bestAssignedCount = currentAssignments.length;
      tracker.bestAssignments = [...currentAssignments];
    }
  }

  if (unassigned.length === 0) {
    return currentAssignments; // All slots successfully assigned!
  }

  // Deduplicate visited assignment states (state key includes weekend_id + slot_id + team_id)
  if (tracker && currentAssignments.length > 0) {
    const stateKey = currentAssignments
      .map((a) => `${a.weekend_id}_${a.slot_id}:${a.team_id}`)
      .sort()
      .join('|');
    if (tracker.visitedStates.has(stateKey)) {
      return null;
    }
    tracker.visitedStates.add(stateKey);
  }

  // Calculate candidates for each remaining unassigned slot
  const slotCandidates: Array<{
    slotVar: SlotVariable;
    candidates: Team[];
  }> = [];

  for (const sv of unassigned) {
    const weekendAsgns = currentAssignments.filter((a) => a.weekend_id === sv.weekend.id);
    const eligible: Team[] = [];

    for (const team of activeTeams) {
      if (teamUsage[team.id] >= maxQuotaMap[team.id]) continue;

      const val = validateTeamAssignment({
        teamId: team.id,
        weekendId: sv.weekend.id,
        slotId: sv.slot.id,
        currentAssignmentsInWeekend: weekendAsgns,
        monthAssignments: currentAssignments,
        pastAssignments,
        precomputedLastPastDate: teamLastPastDateMap?.[team.id],
        allTeams: teams,
        availabilities,
        serviceDate: sv.serviceDate,
      });

      if (val.severity !== 'HARD_CONFLICT') {
        eligible.push(team);
      }
    }

    // FORWARD CHECKING: If any unassigned slot has 0 eligible candidates, FAIL immediately and backtrack!
    if (eligible.length === 0) {
      return null;
    }

    slotCandidates.push({ slotVar: sv, candidates: eligible });
  }

  // MRV (Minimum Remaining Values) HEURISTIC: Select the slot with the FEWEST candidates
  slotCandidates.sort((a, b) => a.candidates.length - b.candidates.length);
  const chosen = slotCandidates[0];
  const { slotVar, candidates } = chosen;

  // Rank candidates by fit score + controlled stochastic noise for search attempts > 0
  const scoredCandidates = candidates.map((team, teamIdx) => {
    const fitScore = calculateCandidateFitScore({
      team,
      slot: slotVar.slot,
      weekend: slotVar.weekend,
      pastAssignments,
      currentMonthAssignments: currentAssignments,
      settings,
      rollingData,
    });
    const noise = attempt > 0 ? Math.sin(attempt * 997 + teamIdx * 31) * 20 : 0;
    return { team, score: fitScore + noise };
  });

  scoredCandidates.sort((a, b) => b.score - a.score);

  const remainingUnassigned = unassigned.filter((sv) => sv.id !== slotVar.id);
  const visitedCandidates = new Set<string>();

  for (const cand of scoredCandidates) {
    const team = cand.team;
    if (visitedCandidates.has(team.id)) continue;
    visitedCandidates.add(team.id);

    const newAsgn: Assignment = {
      id: `asgn-${slotVar.weekend.id}-${slotVar.slot.id}`,
      schedule_id: scheduleId,
      weekend_id: slotVar.weekend.id,
      service_date: slotVar.serviceDate,
      team_id: team.id,
      location_id: slotVar.slot.location_id,
      slot_id: slotVar.slot.id,
      locked: false,
      manually_assigned: false,
    };

    const nextAssignments = [...currentAssignments, newAsgn];
    const nextTeamUsage = { ...teamUsage, [team.id]: teamUsage[team.id] + 1 };

    const solution = backtrackSolve({
      unassigned: remainingUnassigned,
      currentAssignments: nextAssignments,
      teamUsage: nextTeamUsage,
      maxQuotaMap,
      activeTeams,
      teams,
      pastAssignments,
      teamLastPastDateMap,
      availabilities,
      settings,
      scheduleId,
      attempt,
      rollingData,
      tracker,
    });

    if (solution !== null) {
      return solution;
    }
  }

  return null; // Backtrack
}

function calculateCandidateFitScore(params: {
  team: Team;
  slot: ServiceSlot;
  weekend: ServiceWeekend;
  pastAssignments: Assignment[];
  currentMonthAssignments: Assignment[];
  settings: SchedulerSettings;
  rollingData?: RollingHistoricalData;
}): number {
  const { team, slot, weekend, pastAssignments, currentMonthAssignments, settings, rollingData } = params;

  let score = 1000;
  const canonicalSlotId = getCanonicalSlotId(slot.id);
  const locationId = slot.location_id;

  // 1. Monthly Usage Urgency
  const teamCurrentAssignments = currentMonthAssignments.filter((a) => a.team_id === team.id);
  const teamCurrentCount = teamCurrentAssignments.length;
  score -= teamCurrentCount * 300 * (settings.weight_monthly_balance / 50);

  // 2. RULE 5: NO DUPLICATE SERVICE WITHIN THE SAME MONTH
  const currentMonthCanonicalSlots = teamCurrentAssignments.map((a) => getCanonicalSlotId(a.slot_id));
  const inMonthDuplicateCount = currentMonthCanonicalSlots.filter((sId) => sId === canonicalSlotId).length;
  if (inMonthDuplicateCount > 0) {
    score -= 750 * inMonthDuplicateCount;
  }

  // 2b. UNIQUE LOCATION & UNIQUE SHIFT TYPE WITHIN SAME MONTH (REGULAR SUNDAY SERVICES)
  const isEnglishSlot = slot.id.toLowerCase().includes('english') || slot.location_id === 'english';
  if (!isEnglishSlot && slot.location_id) {
    const regularMonthAssignments = teamCurrentAssignments.filter(
      (a) => !a.slot_id.toLowerCase().includes('english') && a.location_id !== 'english'
    );
    const hasDuplicateLocationInMonth = regularMonthAssignments.some((a) => a.location_id === slot.location_id);
    if (hasDuplicateLocationInMonth) {
      score -= 1500;
    }

    const targetShiftType = getNormalizedShiftType(slot.id);
    if (targetShiftType !== 'ENGLISH') {
      const hasDuplicateShiftTypeInMonth = regularMonthAssignments.some(
        (a) => getNormalizedShiftType(a.slot_id) === targetShiftType
      );
      if (hasDuplicateShiftTypeInMonth) {
        score -= 1200;
      }
    }
  }

  // 3. RULE 4 & RULE 3: AVOID PREVIOUS MONTH (M-1) AND TWO MONTHS AGO (M-2) SERVICE & LOCATION
  if (rollingData) {
    // M-1 check
    const m1Slots = rollingData.teamM1SlotMap[team.id];
    if (m1Slots && m1Slots.has(canonicalSlotId)) {
      score -= 500; // Strong penalty for same service as previous month M-1
    }
    const m1Locs = rollingData.teamM1LocationMap[team.id];
    if (m1Locs && m1Locs.has(locationId)) {
      score -= 180; // Penalty for same location as M-1
    }

    // M-2 check
    const m2Slots = rollingData.teamM2SlotMap[team.id];
    if (m2Slots && m2Slots.has(canonicalSlotId)) {
      score -= 250; // Penalty for same service as 2 months ago M-2
    }
    const m2Locs = rollingData.teamM2LocationMap[team.id];
    if (m2Locs && m2Locs.has(locationId)) {
      score -= 90; // Penalty for same location as M-2
    }

    // RULE 6: SERVICE & LOCATION DIVERSITY BONUS
    const servedInM1orM2 = (m1Slots && m1Slots.has(canonicalSlotId)) || (m2Slots && m2Slots.has(canonicalSlotId));
    if (!servedInM1orM2) {
      score += 200; // Bonus for fresh/diverse service choice
    }

    const servedLocInM1orM2 = (m1Locs && m1Locs.has(locationId)) || (m2Locs && m2Locs.has(locationId));
    if (!servedLocInM1orM2) {
      score += 100; // Bonus for fresh location
    }

    // Pattern / Week number check
    const weekNum = weekend.weekend_number;
    const weekFreq = rollingData.weekOfMonthCounts[team.id]?.[weekNum] || 0;
    score -= weekFreq * 40;

    const teamMonthAssignedWeeks = teamCurrentAssignments.map((a) => {
      const d = parseInt((a.service_date || a.weekend_id).split('-')[2] || '1', 10);
      return d <= 7 ? 1 : d <= 14 ? 2 : d <= 21 ? 3 : d <= 28 ? 4 : 5;
    });

    const candidatePattern = Array.from(new Set([...teamMonthAssignedWeeks, weekNum])).sort((a, b) => a - b);
    const lastPattern = rollingData.lastMonthPatterns[team.id] || [];

    if (
      candidatePattern.length >= 2 &&
      lastPattern.length >= 2 &&
      candidatePattern.length === lastPattern.length &&
      candidatePattern.every((v, idx) => v === lastPattern[idx])
    ) {
      score -= 75; // Soft penalty for repeating exact same weekend pattern
    } else if (candidatePattern.length >= 2) {
      score += 40; // Bonus for pattern diversity
    }

    const r3Count = rollingData.rollingCounts[team.id] || 0;
    score -= r3Count * 45 * (settings.weight_longterm_balance / 20);
  }

  // 4. Service Rest Gap Priority & Medium Constraint Penalty
  const allTeamAsgns = [...pastAssignments, ...currentMonthAssignments].filter((a) => a.team_id === team.id);
  if (allTeamAsgns.length > 0) {
    const serviceDate = slot.day === 'SATURDAY' ? weekend.saturday_date : weekend.sunday_date;
    const lastAsgnDate = allTeamAsgns.reduce((max, a) => {
      const d = a.service_date || a.weekend_id;
      return d > max ? d : max;
    }, '');
    const daysDiff = getDaysDifference(serviceDate, lastAsgnDate);
    if (daysDiff < 12) {
      score -= 2500; // Strong penalty for consecutive weekend (violates Medium Constraint OFF 1 MINGGU)
    } else if (daysDiff >= 20) {
      score += 50; // Bonus for longer rest gap
    }
  }

  return score;
}

function computeMinMaxServices(
  assignments: Assignment[],
  activeTeams: Team[]
): { min: number; max: number } {
  const counts: Record<string, number> = {};
  activeTeams.forEach((t) => (counts[t.id] = 0));
  assignments.forEach((a) => {
    if (counts[a.team_id] !== undefined) {
      counts[a.team_id]++;
    }
  });

  const values = Object.values(counts);
  if (values.length === 0) return { min: 0, max: 0 };
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function evaluateScheduleQuality(params: {
  assignments: Assignment[];
  activeTeams: Team[];
  targetQuotas: Record<string, number>;
  pastAssignments: Assignment[];
  settings: SchedulerSettings;
  rollingData?: RollingHistoricalData;
}): number {
  const metrics = computeDetailedFairnessMetrics(params);
  return metrics.overallScore;
}

function computeDetailedFairnessMetrics(params: {
  assignments: Assignment[];
  activeTeams: Team[];
  targetQuotas: Record<string, number>;
  pastAssignments: Assignment[];
  settings: SchedulerSettings;
  rollingData?: RollingHistoricalData;
}): {
  monthlyBalance: number;
  longtermBalance: number;
  locationRotation: number;
  slotRotation: number;
  dateDistribution: number;
  overallScore: number;
} {
  const { assignments, activeTeams, pastAssignments, settings, rollingData } = params;

  // 1. Monthly Balance Score
  const minMax = computeMinMaxServices(assignments, activeTeams);
  const diff = minMax.max - minMax.min;
  let monthlyBalance = 100;
  if (diff > 1) {
    monthlyBalance -= (diff - 1) * 35;
  }

  // 2. Longterm Balance Score
  let longtermBalance = 90;
  const lifetimeCounts: Record<string, number> = {};
  activeTeams.forEach((t) => (lifetimeCounts[t.id] = 0));
  [...pastAssignments, ...assignments].forEach((a) => {
    if (lifetimeCounts[a.team_id] !== undefined) lifetimeCounts[a.team_id]++;
  });

  const lifeValues = Object.values(lifetimeCounts);
  const lifeMax = Math.max(...lifeValues);
  const lifeMin = Math.min(...lifeValues);
  if (lifeMax - lifeMin > 3) {
    longtermBalance -= (lifeMax - lifeMin - 3) * 5;
  }

  // 3. Location Rotation Score
  let locationRotation = 85;
  activeTeams.forEach((t) => {
    const teamLocs = assignments.filter((a) => a.team_id === t.id).map((a) => a.location_id);
    const uniqueLocs = new Set(teamLocs);
    if (teamLocs.length >= 2 && uniqueLocs.size === 1) {
      locationRotation -= 10;
    }
  });

  // 4. Slot Rotation Score
  let slotRotation = 85;
  activeTeams.forEach((t) => {
    const teamSlots = assignments.filter((a) => a.team_id === t.id).map((a) => a.slot_id);
    const uniqueSlots = new Set(teamSlots);
    if (teamSlots.length >= 2 && uniqueSlots.size === 1) {
      slotRotation -= 10;
    }
  });

  // 5. Pattern Diversity & Date Distribution Score
  let dateDistribution = 90;
  if (rollingData) {
    let repeatCount = 0;
    activeTeams.forEach((t) => {
      const teamMonthAssignedWeeks = assignments
        .filter((a) => a.team_id === t.id)
        .map((a) => {
          const d = parseInt((a.service_date || a.weekend_id).split('-')[2] || '1', 10);
          return d <= 7 ? 1 : d <= 14 ? 2 : d <= 21 ? 3 : d <= 28 ? 4 : 5;
        });
      const pattern = Array.from(new Set(teamMonthAssignedWeeks)).sort((a, b) => a - b);
      const lastPattern = rollingData.lastMonthPatterns[t.id] || [];
      if (
        pattern.length >= 2 &&
        lastPattern.length >= 2 &&
        pattern.length === lastPattern.length &&
        pattern.every((v, idx) => v === lastPattern[idx])
      ) {
        repeatCount++;
      }
    });

    if (activeTeams.length > 0) {
      const repeatRatio = repeatCount / activeTeams.length;
      dateDistribution = Math.max(0, Math.round(100 - repeatRatio * 80));
    }
  }

  const totalWeight =
    settings.weight_monthly_balance +
    settings.weight_longterm_balance +
    settings.weight_location_rotation +
    settings.weight_slot_rotation +
    settings.weight_date_distribution;

  const weightedSum =
    monthlyBalance * settings.weight_monthly_balance +
    longtermBalance * settings.weight_longterm_balance +
    locationRotation * settings.weight_location_rotation +
    slotRotation * settings.weight_slot_rotation +
    dateDistribution * settings.weight_date_distribution;

  const overallScore = weightedSum / totalWeight;

  return {
    monthlyBalance: Math.max(0, Math.round(monthlyBalance)),
    longtermBalance: Math.max(0, Math.round(longtermBalance)),
    locationRotation: Math.max(0, Math.round(locationRotation)),
    slotRotation: Math.max(0, Math.round(slotRotation)),
    dateDistribution: Math.max(0, Math.round(dateDistribution)),
    overallScore: Math.max(0, Math.min(100, overallScore)),
  };
}

function generateEmergencyFallbackAssignments(params: {
  weekends: ServiceWeekend[];
  activeTeams: Team[];
  scheduleId: string;
  teams: Team[];
  availabilities: TeamAvailability[];
}): Assignment[] {
  const { weekends, activeTeams, scheduleId, teams, availabilities } = params;
  const assignments: Assignment[] = [];
  let teamIdx = 0;

  for (const w of weekends) {
    const usedTeamsInWeekend = new Set<string>();
    for (const slot of SERVICE_SLOTS) {
      let assignedTeam: Team | undefined;

      for (let i = 0; i < activeTeams.length; i++) {
        const candidate = activeTeams[(teamIdx + i) % activeTeams.length];
        if (usedTeamsInWeekend.has(candidate.id)) continue;

        const validation = validateTeamAssignment({
          teamId: candidate.id,
          weekendId: w.id,
          slotId: slot.id,
          currentAssignmentsInWeekend: assignments.filter((a) => a.weekend_id === w.id),
          allTeams: teams,
          availabilities,
        });

        if (validation.severity !== 'HARD_CONFLICT') {
          assignedTeam = candidate;
          teamIdx = (teamIdx + i + 1) % activeTeams.length;
          break;
        }
      }

      if (!assignedTeam) {
        assignedTeam = activeTeams[teamIdx % activeTeams.length];
        teamIdx++;
      }

      usedTeamsInWeekend.add(assignedTeam.id);
      const isSat = slot.day === 'SATURDAY';

      assignments.push({
        id: `asgn-fallback-${w.id}-${slot.id}`,
        schedule_id: scheduleId,
        weekend_id: w.id,
        service_date: isSat ? w.saturday_date : w.sunday_date,
        team_id: assignedTeam.id,
        location_id: slot.location_id,
        slot_id: slot.id,
        locked: false,
        manually_assigned: false,
      });
    }
  }

  return assignments;
}
