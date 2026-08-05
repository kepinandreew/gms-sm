import { Team, Assignment, TeamAvailability, ValidationResult } from '../types';
import { SERVICE_SLOTS, SERVICE_LOCATIONS } from '../data/locationsAndSlots';

export type ShiftType = 'EARLY' | 'MIDDLE' | 'LATE' | 'ENGLISH';

export function getNormalizedShiftType(slotId: string): ShiftType {
  const norm = slotId.toLowerCase();
  if (norm.includes('english')) return 'ENGLISH';
  if (norm.includes('u1-u2') && norm.includes('selatan')) return 'EARLY';
  if (norm.includes('u3-u4') && norm.includes('selatan')) return 'LATE';
  if (norm.includes('u1-u2') && norm.includes('pusura')) return 'MIDDLE';
  if (norm.includes('u1')) return 'EARLY';
  if (norm.includes('u2-u3')) return 'MIDDLE';
  if (norm.includes('u4-u5')) return 'LATE';
  return 'EARLY';
}

export function getShiftTypeLabel(shiftType: ShiftType): string {
  switch (shiftType) {
    case 'EARLY':
      return 'Shift Pagi (Barat U1, Timur U1, Selatan U1-U2)';
    case 'MIDDLE':
      return 'Shift Siang (Barat U2-U3, Timur U2-U3, Pusura U1-U2)';
    case 'LATE':
      return 'Shift Sore (Barat U4-U5, Timur U4-U5, Selatan U3-U4)';
    case 'ENGLISH':
      return 'English Service (Sabtu 18:30)';
  }
}

const dateDaysCache = new Map<string, number>();

function getEpochDays(dateStr: string): number {
  if (!dateStr) return 0;
  const cached = dateDaysCache.get(dateStr);
  if (cached !== undefined) return cached;

  const parts = dateStr.split('-');
  let days = 0;
  if (parts.length >= 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    days = Math.floor(Date.UTC(y, m, d) / 86400000);
  } else {
    days = Math.floor(new Date(dateStr).getTime() / 86400000);
  }
  dateDaysCache.set(dateStr, days);
  return days;
}

export function getDaysDifference(dateStr1: string, dateStr2: string): number {
  if (!dateStr1 || !dateStr2) return 999;
  return Math.abs(getEpochDays(dateStr1) - getEpochDays(dateStr2));
}

/**
 * Validates whether assigning a team to a specific slot on a weekend creates hard conflicts or warnings.
 */
export function validateTeamAssignment(params: {
  teamId: string;
  weekendId: string; // Saturday date YYYY-MM-DD
  slotId: string;
  currentAssignmentsInWeekend: Assignment[]; // All assignments in this weekend
  monthAssignments?: Assignment[]; // All assignments in current calendar month
  pastAssignments?: Assignment[]; // Historical / prior assignments (for cross-month check)
  precomputedLastPastDate?: string; // Optional fast lookup of team's last service date prior to target date
  allTeams: Team[];
  availabilities: TeamAvailability[];
  targetAssignmentId?: string; // If replacing an existing assignment
  serviceDate?: string; // Specific service date (Saturday or Sunday YYYY-MM-DD)
}): ValidationResult {
  const {
    teamId,
    weekendId,
    slotId,
    currentAssignmentsInWeekend,
    monthAssignments = [],
    pastAssignments = [],
    precomputedLastPastDate,
    allTeams,
    availabilities,
    targetAssignmentId,
    serviceDate,
  } = params;

  const team = allTeams.find((t) => t.id === teamId);
  if (!team) {
    return {
      severity: 'HARD_CONFLICT',
      message: 'Tim tidak ditemukan dalam database.',
    };
  }

  // 1. HARD CONFLICT: Team status is inactive or cuti
  if (team.status !== 'active') {
    return {
      severity: 'HARD_CONFLICT',
      message: `🔴 HARD CONFLICT: ${team.name} berstatus ${team.status?.toUpperCase() || 'INACTIVE/CUTI'}. Tim non-aktif / cuti tidak boleh dijadwalkan.`,
    };
  }

  // 1b. HARD CONFLICT: Check team members status (all cuti or inactive)
  try {
    const { store } = require('../db/store');
    const teamMembers = store.getTeamMembers(teamId);
    if (teamMembers && teamMembers.length > 0) {
      const activeMembers = teamMembers.filter(
        (m: any) => m.status === 'active' || (!m.status && m.status !== 'cuti' && m.status !== 'inactive')
      );
      if (activeMembers.length === 0) {
        return {
          severity: 'HARD_CONFLICT',
          message: `🔴 HARD CONFLICT: ${team.name} seluruh anggotanya berstatus CUTI / INACTIVE.`,
        };
      }
    }
  } catch (_e) {
    // Ignore store import error if store not available in pure unit tests
  }

  // 2. HARD CONFLICT: Team is Unavailable on this weekend
  const availability = availabilities.find((a) => a.team_id === teamId && a.weekend_date === weekendId);
  if (availability && !availability.available) {
    const reason = availability.notes ? ` (${availability.notes})` : '';
    return {
      severity: 'HARD_CONFLICT',
      message: `🔴 HARD CONFLICT: ${team.name} UNAVAILABLE pada weekend tanggal ini${reason}.`,
    };
  }

  const slotBeingAssigned = SERVICE_SLOTS.find((s) => s.id === slotId);
  const isSat = slotBeingAssigned?.day === 'SATURDAY';
  const targetDate = serviceDate || (isSat ? weekendId : weekendId);

  // 3. HARD CONFLICT: Already assigned to another slot in same weekend (RULE 4 - Max 1 assignment per service weekend)
  const existingOtherInWeekend = currentAssignmentsInWeekend.filter(
    (a) => a.id !== targetAssignmentId && a.team_id === teamId
  );

  if (existingOtherInWeekend.length > 0) {
    const otherSlot = SERVICE_SLOTS.find((s) => s.id === existingOtherInWeekend[0].slot_id);
    return {
      severity: 'HARD_CONFLICT',
      message: `🔴 HARD CONFLICT (Max 1 Assignment per Weekend): ${team.name} sudah bertugas di slot ${
        otherSlot?.name || 'lain'
      } pada weekend yang sama. English Service dan Sunday Service dianggap 1 service weekend.`,
    };
  }

  // 4. MEDIUM CONFLICT (WARNING): WAJIB OFF 1 MINGGU SETELAH PELAYANAN (RULE 1 & Cross-Month Rule 8)
  // Fast check: Check precomputed last past assignment date
  if (precomputedLastPastDate && precomputedLastPastDate < targetDate) {
    const daysDiff = getDaysDifference(targetDate, precomputedLastPastDate);
    if (daysDiff > 0 && daysDiff < 12) {
      return {
        severity: 'WARNING',
        message: `⚠️ MEDIUM CONFLICT (Rule WAJIB OFF 1 Minggu): ${team.name} WAJIB OFF 1 minggu setelah bertugas. Tim sudah bertugas pada service weekend tanggal ${precomputedLastPastDate}.`,
      };
    }
  } else if (!precomputedLastPastDate && pastAssignments.length > 0) {
    // Fallback: search past assignments if precomputed date is not supplied
    for (let i = pastAssignments.length - 1; i >= 0; i--) {
      const a = pastAssignments[i];
      if (a.team_id !== teamId) continue;
      const asgnDate = a.service_date || a.weekend_id;
      if (asgnDate >= targetDate) continue;
      const daysDiff = getDaysDifference(targetDate, asgnDate);
      if (daysDiff > 0 && daysDiff < 12) {
        return {
          severity: 'WARNING',
          message: `⚠️ MEDIUM CONFLICT (Rule WAJIB OFF 1 Minggu): ${team.name} WAJIB OFF 1 minggu setelah bertugas. Tim sudah bertugas pada service weekend tanggal ${asgnDate}.`,
        };
      }
      if (daysDiff >= 12) break; // Earlier past assignments will be even further away
    }
  }

  // Also check current month assignments for the 12-day rest rule
  for (const asgn of monthAssignments) {
    if (asgn.id === targetAssignmentId || asgn.team_id !== teamId) continue;
    if (asgn.slot_id.startsWith('spec-') && (asgn as any).countsAsServiceAssignment === false) continue;

    const asgnDate = asgn.service_date || asgn.weekend_id;
    const daysDiff = getDaysDifference(targetDate, asgnDate);

    if (daysDiff > 0 && daysDiff < 12) {
      return {
        severity: 'WARNING',
        message: `⚠️ MEDIUM CONFLICT (Rule WAJIB OFF 1 Minggu): ${team.name} WAJIB OFF 1 minggu setelah bertugas. Tim sudah bertugas pada service weekend tanggal ${asgnDate}.`,
      };
    }
  }

  // 5. SOFT CONSTRAINTS (WARNING): UNIQUE LOCATION & SHIFT TYPE WITHIN SAME MONTH
  const isEnglishSlot = slotId.toLowerCase().includes('english') || slotBeingAssigned?.location_id === 'english';
  const targetLocationId = slotBeingAssigned?.location_id;

  if (!isEnglishSlot && targetLocationId) {
    const targetMonthYear = targetDate.substring(0, 7); // YYYY-MM
    const sameMonthRegularAssignments = monthAssignments.filter((a) => {
      if (a.id === targetAssignmentId || a.team_id !== teamId) return false;
      const aDate = a.service_date || a.weekend_id;
      if (aDate.substring(0, 7) !== targetMonthYear) return false;
      const isAEnglish = a.slot_id.toLowerCase().includes('english') || a.location_id === 'english';
      return !isAEnglish;
    });

    const hasSameLocation = sameMonthRegularAssignments.some((a) => a.location_id === targetLocationId);
    if (hasSameLocation) {
      const locObj = SERVICE_LOCATIONS.find((l) => l.id === targetLocationId);
      return {
        severity: 'WARNING',
        message: `⚠️ SOFT CONFLICT (Lokasi Sama): ${team.name} sudah bertugas di lokasi ${
          locObj?.name || targetLocationId
        } pada bulan yang sama.`,
      };
    }

    const targetShiftType = getNormalizedShiftType(slotId);
    if (targetShiftType !== 'ENGLISH') {
      const hasSameShiftType = sameMonthRegularAssignments.some(
        (a) => getNormalizedShiftType(a.slot_id) === targetShiftType
      );

      if (hasSameShiftType) {
        return {
          severity: 'WARNING',
          message: `⚠️ SOFT CONFLICT (Shift Type Sama): ${team.name} sudah bertugas pada ${getShiftTypeLabel(
            targetShiftType
          )} pada bulan yang sama.`,
        };
      }
    }
  }

  return {
    severity: 'VALID',
    message: `🟢 VALID: ${team.name} memenuhi seluruh hard constraints untuk slot ${slotBeingAssigned?.name}.`,
  };
}

