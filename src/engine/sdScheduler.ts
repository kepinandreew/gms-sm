import {
  ServiceDirector,
  SDAssignment,
  SDSchedule,
  DayOfWeek,
  SpecialService,
} from '../types';
import { getServiceWeekendsInMonth } from './dateUtils';
import { matchSlotId } from '../data/locationsAndSlots';

export interface SDRuleCheckResult {
  isCompatible: boolean;
  warnings: string[];
}

/**
 * Maps a slot ID to its corresponding Service type name(s).
 */
export function getServiceTypeFromSlot(slotId: string): string[] {
  const norm = slotId.toLowerCase();
  if (norm.includes('english')) {
    return ['English Service'];
  }
  const services: string[] = [];
  if (norm.includes('u1')) services.push('Service U1');
  if (norm.includes('u2') || norm.includes('u3')) services.push('Service U2-U3');
  if (norm.includes('u4') || norm.includes('u5')) services.push('Service U4-U5');

  if (services.length === 0) {
    if (norm === 'barat-u1' || norm === 'timur-u1') services.push('Service U1');
    else if (norm === 'barat-u2-u3' || norm === 'timur-u2-u3') services.push('Service U2-U3');
    else if (norm === 'barat-u4-u5' || norm === 'timur-u4-u5') services.push('Service U4-U5');
    else if (norm === 'selatan-u1-u2' || norm === 'pusura-u1-u2') services.push('Service U1', 'Service U2-U3');
    else if (norm === 'selatan-u3-4') services.push('Service U2-U3', 'Service U4-U5');
  }
  return services;
}

/**
 * Checks whether a Service Director satisfies the specific rules for a given slot.
 * Validates ALL three independent groups: Day AND Location AND Service.
 */
export function checkSDRuleCompatibility(params: {
  sd: ServiceDirector;
  locationId: 'barat' | 'timur' | 'selatan' | 'pusura';
  day: DayOfWeek;
  slotId: string; // e.g. 'barat-u1'
}): SDRuleCheckResult {
  const { sd, locationId, day, slotId } = params;
  const warnings: string[] = [];

  // 1. Status Check
  if (sd.status === 'cuti') {
    return {
      isCompatible: false,
      warnings: [`${sd.name} sedang CUTI / Izin.`],
    };
  }
  if (sd.status === 'inactive') {
    return {
      isCompatible: false,
      warnings: [`${sd.name} dalam status Non-Aktif.`],
    };
  }

  const rules = sd.special_rules;
  if (!rules) {
    return { isCompatible: true, warnings: [] };
  }

  // 2. Day Check (Group 1)
  if (rules.allowed_days && rules.allowed_days.length > 0) {
    if (!rules.allowed_days.includes(day)) {
      warnings.push(`Hanya bisa bertugas di hari: ${rules.allowed_days.join(', ')}.`);
    }
  }

  // 3. Location Check (Group 2)
  if (rules.blocked_locations && rules.blocked_locations.includes(locationId)) {
    warnings.push(`Tidak diperbolehkan di lokasi: ${locationId.toUpperCase()}.`);
  }

  if (rules.allowed_locations && rules.allowed_locations.length > 0) {
    if (!rules.allowed_locations.includes(locationId)) {
      warnings.push(`Hanya diperbolehkan di lokasi: ${rules.allowed_locations.map((l) => l.toUpperCase()).join(', ')}.`);
    }
  }

  // 4. Service Check (Group 3)
  if (rules.allowed_services && rules.allowed_services.length > 0) {
    const slotServices = getServiceTypeFromSlot(slotId);
    const matchesService = slotServices.some((s) => rules.allowed_services!.includes(s as any));
    if (!matchesService) {
      warnings.push(`Hanya diperbolehkan di ibadah: ${rules.allowed_services.join(', ')}.`);
    }
  }

  // 5. Specific Slot Allow/Block Check
  const normalizedSlot = slotId.toLowerCase();
  if (rules.blocked_slots && rules.blocked_slots.some((s) => normalizedSlot.includes(s.toLowerCase()))) {
    warnings.push(`Slot ${slotId} diblokir untuk SD ini.`);
  }

  if (rules.allowed_slots && rules.allowed_slots.length > 0) {
    const matchesAllowed = rules.allowed_slots.some((s) => {
      const sNorm = s.toLowerCase();
      return (
        normalizedSlot === sNorm ||
        normalizedSlot.includes(sNorm) ||
        sNorm.includes(normalizedSlot) ||
        matchSlotId(slotId, s)
      );
    });

    if (!matchesAllowed) {
      warnings.push(`Hanya diperbolehkan di slot: ${rules.allowed_slots.join(', ')}.`);
    }
  }

  return {
    isCompatible: warnings.length === 0,
    warnings,
  };
}

// Regular 9 Service Slots Config for SD Scheduling
const STANDARD_SD_SLOTS: {
  slot_id: string;
  location_id: 'barat' | 'timur' | 'selatan' | 'pusura';
  day: DayOfWeek;
  name: string;
}[] = [
  { slot_id: 'barat-u1', location_id: 'barat', day: 'SUNDAY', name: 'Barat U1' },
  { slot_id: 'barat-u2-u3', location_id: 'barat', day: 'SUNDAY', name: 'Barat U2-3' },
  { slot_id: 'barat-u4-u5', location_id: 'barat', day: 'SUNDAY', name: 'Barat U4-5' },

  { slot_id: 'timur-u1', location_id: 'timur', day: 'SUNDAY', name: 'Timur U1' },
  { slot_id: 'timur-u2-u3', location_id: 'timur', day: 'SUNDAY', name: 'Timur U2-3' },
  { slot_id: 'timur-u4-u5', location_id: 'timur', day: 'SUNDAY', name: 'Timur U4-5' },

  { slot_id: 'selatan-u1-u2', location_id: 'selatan', day: 'SUNDAY', name: 'Selatan U1-2' },
  { slot_id: 'selatan-u3-4', location_id: 'selatan', day: 'SUNDAY', name: 'Selatan U3-4' },

  { slot_id: 'pusura-u1-u2', location_id: 'pusura', day: 'SUNDAY', name: 'Pusura U1-2' },
];

export interface GenerateSDResult {
  schedule: SDSchedule;
  assignments: SDAssignment[];
  logs: string[];
  totalFilled: number;
  totalEmpty: number;
}

/**
 * Generates Service Director assignments for EMPTY / UNLOCKED slots only.
 * NEVER overwrites locked SD assignments.
 */
export function generateRemainingSDAssignments(params: {
  month: number;
  year: number;
  directors: ServiceDirector[];
  existingAssignments: SDAssignment[];
  specialServices?: SpecialService[];
}): GenerateSDResult {
  const { month, year, directors, existingAssignments, specialServices = [] } = params;

  const logs: string[] = [];
  logs.push(`Mulai pencarian penjadwalan Service Director (SD) untuk ${month}/${year}...`);

  const activeDirectors = directors.filter((d) => d.status === 'active');
  logs.push(`Jumlah Service Director Aktif: ${activeDirectors.length} orang.`);

  const weekends = getServiceWeekendsInMonth(month, year);
  const sdScheduleId = `sd-sched-${year}-${month}`;

  // Preserve locked assignments map
  const lockedAssignmentsMap: Record<string, SDAssignment> = {};
  existingAssignments.forEach((asgn) => {
    if (asgn.locked || asgn.manually_assigned) {
      lockedAssignmentsMap[`${asgn.weekend_id}_${asgn.slot_id}`] = asgn;
    }
  });

  const finalAssignments: SDAssignment[] = [...Object.values(lockedAssignmentsMap)];

  // Track assignment counts per SD for workload balancing
  const monthlyCounts: Record<string, number> = {};
  directors.forEach((d) => (monthlyCounts[d.id] = 0));
  finalAssignments.forEach((a) => {
    if (monthlyCounts[a.sd_id] !== undefined) {
      monthlyCounts[a.sd_id]++;
    }
  });

  let filledCount = finalAssignments.length;
  let emptyCount = 0;

  // Process each weekend
  weekends.forEach((w) => {
    STANDARD_SD_SLOTS.forEach((slotDef) => {
      const slotKey = `${w.id}_${slotDef.slot_id}`;

      // Skip if already locked / manually assigned
      if (lockedAssignmentsMap[slotKey]) {
        return;
      }

      const serviceDate = slotDef.day === 'SATURDAY' ? w.saturday_date : w.sunday_date;

      // Find candidates
      const candidates = activeDirectors.filter((sd) => {
        // 1. Rule Check
        const ruleRes = checkSDRuleCompatibility({
          sd,
          locationId: slotDef.location_id,
          day: slotDef.day,
          slotId: slotDef.slot_id,
        });
        if (!ruleRes.isCompatible) return false;

        // 2. Weekend Conflict check: An SD can ONLY serve ONE assignment in the SAME WEEKEND.
        const hasConflictInWeekend = finalAssignments.some(
          (a) => a.sd_id === sd.id && a.weekend_id === w.id
        );
        if (hasConflictInWeekend) return false;

        return true;
      });

      if (candidates.length === 0) {
        emptyCount++;
        logs.push(`[PERINGATAN] Tidak ada SD yang memenuhi syarat untuk Weekend ${w.label} - Slot ${slotDef.name}.`);
        return;
      }

      // Rank candidates by lowest monthly count so far (and slight rotation)
      candidates.sort((a, b) => {
        const countA = monthlyCounts[a.id] || 0;
        const countB = monthlyCounts[b.id] || 0;
        if (countA !== countB) return countA - countB;
        return Math.random() - 0.5; // randomize ties
      });

      const chosenSD = candidates[0];

      const newAssignment: SDAssignment = {
        id: `sd-asgn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sd_schedule_id: sdScheduleId,
        weekend_id: w.id,
        service_date: serviceDate,
        sd_id: chosenSD.id,
        location_id: slotDef.location_id,
        slot_id: slotDef.slot_id,
        locked: false,
        manually_assigned: false,
      };

      finalAssignments.push(newAssignment);
      monthlyCounts[chosenSD.id] = (monthlyCounts[chosenSD.id] || 0) + 1;
      filledCount++;
    });
  });

  const schedule: SDSchedule = {
    id: sdScheduleId,
    month,
    year,
    status: 'generated',
    created_at: new Date().toISOString(),
    notes: `Generated ${new Date().toLocaleDateString('id-ID')}`,
  };

  logs.push(`Penjadwalan SD selesai: ${filledCount} slot terisi (${Object.keys(lockedAssignmentsMap).length} locked/manual), ${emptyCount} slot kosong.`);

  return {
    schedule,
    assignments: finalAssignments,
    logs,
    totalFilled: filledCount,
    totalEmpty: emptyCount,
  };
}

export interface SDValidationError {
  sdName: string;
  weekendNumber: number | string;
  message: string;
}

/**
 * Validates that no Service Director is assigned more than once within the same weekend.
 */
export function validateSDScheduleNoWeekendConflict(
  assignments: SDAssignment[],
  directors: ServiceDirector[],
  weekends: { id: string; weekend_number: number }[]
): SDValidationError[] {
  const errors: SDValidationError[] = [];
  const byWeekend = new Map<string, SDAssignment[]>();

  for (const a of assignments) {
    if (!a.sd_id) continue;
    const list = byWeekend.get(a.weekend_id) || [];
    list.push(a);
    byWeekend.set(a.weekend_id, list);
  }

  for (const [weekendId, asgns] of byWeekend.entries()) {
    const sdCounts = new Map<string, number>();
    for (const a of asgns) {
      sdCounts.set(a.sd_id, (sdCounts.get(a.sd_id) || 0) + 1);
    }

    for (const [sdId, count] of sdCounts.entries()) {
      if (count > 1) {
        const sd = directors.find((d) => d.id === sdId);
        const sdName = sd ? sd.name : 'Unknown SD';
        const wk = weekends.find((w) => w.id === weekendId);
        const wkNum = wk ? wk.weekend_number : weekendId;

        errors.push({
          sdName,
          weekendNumber: wkNum,
          message: `Service Director '${sdName}' sudah ditugaskan pada Weekend ${wkNum}. Satu SD hanya boleh memiliki satu assignment per weekend.`,
        });
      }
    }
  }

  return errors;
}
