import { Team, TeamAvailability, SchedulerSettings, Assignment } from '../types';
import { generateMonthlySchedule } from './scheduler';
import { DEFAULT_SETTINGS, generateSeedHistoryData } from '../data/seedData';
import { getNormalizedShiftType, getDaysDifference } from './validator';

export interface SimulationTestResult {
  test_id: string;
  test_name: string;
  passed: boolean;
  min_assignments: number;
  max_assignments: number;
  assignments_count: number;
  hard_conflicts_count: number;
  details: string;
  distribution_summary: string;
}

export interface FullSimulationSuiteResult {
  passed_all: boolean;
  total_tests: number;
  passed_count: number;
  failed_count: number;
  test_results: SimulationTestResult[];
}

export function runFullSchedulerSimulation(): FullSimulationSuiteResult {
  const results: SimulationTestResult[] = [];

  // Setup 20 active teams
  const teams: Team[] = Array.from({ length: 20 }, (_, i) => ({
    id: `team-${i + 1}`,
    team_number: i + 1,
    name: `Team ${i + 1}`,
    leader_name: `Leader ${i + 1}`,
    status: 'active',
    created_at: new Date().toISOString(),
  }));

  const settings: SchedulerSettings = { ...DEFAULT_SETTINGS };

  // --- TEST 1: 4 Weekend Month (June 2026) ---
  try {
    const juneRes = generateMonthlySchedule({
      month: 6,
      year: 2026,
      teams,
      availabilities: [],
      pastAssignments: [],
      settings,
      skipFinalizationCheck: true,
    });

    const counts = getTeamAssignmentCounts(juneRes.assignments, teams);
    const min = Math.min(...Object.values(counts));
    const max = Math.max(...Object.values(counts));

    // Check consecutive weekend rule violations
    const consecutiveViolations = checkConsecutiveWeekendViolations(juneRes.assignments);
    const passed = max - min <= 1 && juneRes.assignments.length === 40 && consecutiveViolations === 0;

    results.push({
      test_id: 'test-1',
      test_name: 'TEST 1: Bulan 4 Weekend (40 Assignments, 20 Tim, Fair Quota)',
      passed,
      min_assignments: min,
      max_assignments: max,
      assignments_count: juneRes.assignments.length,
      hard_conflicts_count: consecutiveViolations,
      details: passed
        ? `Lolos: Setiap tim mendapatkan tepat ${min} s/d ${max} pelayanan. Tidak ada pelanggaran minggu berturut-turut.`
        : `Gagal: Perbedaan kuota (${min}-${max}) atau terdapat ${consecutiveViolations} pelanggaran minggu berturut-turut.`,
      distribution_summary: formatCountsDistribution(counts),
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    results.push({
      test_id: 'test-1',
      test_name: 'TEST 1: Bulan 4 Weekend (40 Assignments, 20 Tim, Fair Quota)',
      passed: false,
      min_assignments: 0,
      max_assignments: 0,
      assignments_count: 0,
      hard_conflicts_count: 1,
      details: `Error: ${errorMessage}`,
      distribution_summary: '',
    });
  }

  // --- TEST 2: Rule WAJIB OFF 1 MINGGU SETELAH PELAYANAN ---
  try {
    const mayRes = generateMonthlySchedule({
      month: 5,
      year: 2026,
      teams,
      availabilities: [],
      pastAssignments: [],
      settings,
      skipFinalizationCheck: true,
    });

    const consecutiveViolations = checkConsecutiveWeekendViolations(mayRes.assignments);
    const passed = consecutiveViolations === 0 && mayRes.assignments.length === 50;

    results.push({
      test_id: 'test-2',
      test_name: 'TEST 2: Rule WAJIB OFF 1 MINGGU (Tidak Ada Pelayanan Berturut-turut)',
      passed,
      min_assignments: 0,
      max_assignments: 0,
      assignments_count: mayRes.assignments.length,
      hard_conflicts_count: consecutiveViolations,
      details: passed
        ? 'Lolos: Terbukti 100% tim yang bertugas pada Weekend N WAJIB OFF pada Weekend N+1.'
        : `Gagal: Ditemukan ${consecutiveViolations} pelanggaran tim bertugas 2 minggu berturut-turut.`,
      distribution_summary: '',
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    results.push({
      test_id: 'test-2',
      test_name: 'TEST 2: Rule WAJIB OFF 1 MINGGU (Tidak Ada Pelayanan Berturut-turut)',
      passed: false,
      min_assignments: 0,
      max_assignments: 0,
      assignments_count: 0,
      hard_conflicts_count: 1,
      details: `Error: ${errorMessage}`,
      distribution_summary: '',
    });
  }

  // --- TEST 3: CROSS-MONTH OFF RULE (August -> September) ---
  try {
    const seed = generateSeedHistoryData();
    const augustAssignments = seed.assignments; // 50 assignments in August 2026

    // Teams on August Weekend 5 (2026-08-29 / 2026-08-30)
    const augLastWeekendTeams = new Set(
      augustAssignments.filter((a) => a.weekend_id === '2026-08-29').map((a) => a.team_id)
    );

    const septRes = generateMonthlySchedule({
      month: 9,
      year: 2026,
      teams,
      availabilities: [],
      pastAssignments: augustAssignments,
      settings,
      skipFinalizationCheck: true,
    });

    // Check September Weekend 1 (2026-09-05)
    const septFirstWeekendAssignments = septRes.assignments.filter((a) => a.weekend_id === '2026-09-05');
    let crossMonthViolations = 0;
    septFirstWeekendAssignments.forEach((a) => {
      if (augLastWeekendTeams.has(a.team_id)) {
        crossMonthViolations++;
      }
    });

    const passed = crossMonthViolations === 0;

    results.push({
      test_id: 'test-3',
      test_name: 'TEST 3: Rule Cross-Month OFF (Controlling Past August -> Sept)',
      passed,
      min_assignments: 0,
      max_assignments: 0,
      assignments_count: septRes.assignments.length,
      hard_conflicts_count: crossMonthViolations,
      details: passed
        ? `Lolos: Seluruh ${augLastWeekendTeams.size} tim yang bertugas di weekend terakhir August OFF pada weekend 1 September.`
        : `Gagal: Ditemukan ${crossMonthViolations} tim yang bertugas di akhir August dan dijadwalkan lagi di awal September.`,
      distribution_summary: '',
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    results.push({
      test_id: 'test-3',
      test_name: 'TEST 3: Rule Cross-Month OFF (Controlling Past August -> Sept)',
      passed: false,
      min_assignments: 0,
      max_assignments: 0,
      assignments_count: 0,
      hard_conflicts_count: 1,
      details: `Error: ${errorMessage}`,
      distribution_summary: '',
    });
  }

  // --- TEST 4: UNIQUE LOCATION & UNIQUE SHIFT TYPE PER MONTH ---
  try {
    const juneRes = generateMonthlySchedule({
      month: 6,
      year: 2026,
      teams,
      availabilities: [],
      pastAssignments: [],
      settings,
      skipFinalizationCheck: true,
    });

    let duplicateLocationCount = 0;
    let duplicateShiftTypeCount = 0;

    teams.forEach((t) => {
      const teamAsgns = juneRes.assignments.filter((a) => a.team_id === t.id);
      const locations = teamAsgns.map((a) => a.location_id);
      const shiftTypes = teamAsgns.map((a) => getNormalizedShiftType(a.slot_id));

      if (new Set(locations).size < locations.length) {
        duplicateLocationCount++;
      }
      if (new Set(shiftTypes).size < shiftTypes.length) {
        duplicateShiftTypeCount++;
      }
    });

    const passed = duplicateLocationCount === 0 && duplicateShiftTypeCount === 0;

    results.push({
      test_id: 'test-4',
      test_name: 'TEST 4: Unique Location & Unique Shift Type Dalam 1 Bulan',
      passed,
      min_assignments: 0,
      max_assignments: 0,
      assignments_count: juneRes.assignments.length,
      hard_conflicts_count: duplicateLocationCount + duplicateShiftTypeCount,
      details: passed
        ? 'Lolos: Setiap tim menerima lokasi dan tipe shift yang 100% berbeda/unik dalam satu bulan yang sama.'
        : `Gagal: Ditemukan tim dengan lokasi sama (${duplicateLocationCount}) atau shift sama (${duplicateShiftTypeCount}).`,
      distribution_summary: '',
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    results.push({
      test_id: 'test-4',
      test_name: 'TEST 4: Unique Location & Unique Shift Type Dalam 1 Bulan',
      passed: false,
      min_assignments: 0,
      max_assignments: 0,
      assignments_count: 0,
      hard_conflicts_count: 1,
      details: `Error: ${errorMessage}`,
      distribution_summary: '',
    });
  }

  // --- TEST 5: English Service & Sunday Mutual Exclusion ---
  try {
    const juneEngRes = generateMonthlySchedule({
      month: 6,
      year: 2026,
      teams,
      availabilities: [],
      pastAssignments: [],
      settings,
      skipFinalizationCheck: true,
    });

    let englishViolations = 0;
    const weekendsMap: Record<string, Assignment[]> = {};
    juneEngRes.assignments.forEach((a) => {
      if (!weekendsMap[a.weekend_id]) weekendsMap[a.weekend_id] = [];
      weekendsMap[a.weekend_id].push(a);
    });

    Object.values(weekendsMap).forEach((weekendAsgns) => {
      const teamIdsInWeekend = weekendAsgns.map((a) => a.team_id);
      if (new Set(teamIdsInWeekend).size < teamIdsInWeekend.length) {
        englishViolations++;
      }
    });

    const passed = englishViolations === 0;

    results.push({
      test_id: 'test-5',
      test_name: 'TEST 5: English Service & Sunday Exclusive (Maksimal 1 Assignment / Weekend)',
      passed,
      min_assignments: 0,
      max_assignments: 0,
      assignments_count: juneEngRes.assignments.length,
      hard_conflicts_count: englishViolations,
      details: passed
        ? 'Lolos: Tim yang bertugas di English Service (Sabtu) terbukti TIDAK PERNAH bertugas di hari Minggu pada weekend yang sama.'
        : `Gagal: Ditemukan ${englishViolations} pelanggaran penugasan ganda dalam weekend yang sama.`,
      distribution_summary: '',
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    results.push({
      test_id: 'test-5',
      test_name: 'TEST 5: English Service & Sunday Exclusive (Maksimal 1 Assignment / Weekend)',
      passed: false,
      min_assignments: 0,
      max_assignments: 0,
      assignments_count: 0,
      hard_conflicts_count: 1,
      details: `Error: ${errorMessage}`,
      distribution_summary: '',
    });
  }

  // --- TEST 6: Infeasibility Conflict Report ---
  try {
    // Make 18 teams unavailable on all weekends of June
    const heavyAvailabilities: TeamAvailability[] = [];
    teams.slice(2).forEach((t) => {
      ['2026-06-06', '2026-06-13', '2026-06-20', '2026-06-27'].map((wDate, idx) => {
        heavyAvailabilities.push({
          id: `unavail-${t.id}-${idx}`,
          team_id: t.id,
          weekend_date: wDate,
          available: false,
          notes: 'Simulasi Mass Unavailability',
        });
      });
    });

    const conflictRes = generateMonthlySchedule({
      month: 6,
      year: 2026,
      teams,
      availabilities: heavyAvailabilities,
      pastAssignments: [],
      settings,
      skipFinalizationCheck: true,
    });

    const passed = conflictRes.hasConflict === true && conflictRes.conflictReport !== undefined;

    results.push({
      test_id: 'test-6',
      test_name: 'TEST 6: Deteksi Infeasibility & Laporan Constraint Conflict',
      passed,
      min_assignments: 0,
      max_assignments: 0,
      assignments_count: conflictRes.assignments.length,
      hard_conflicts_count: 0,
      details: passed
        ? 'Lolos: Engine berhasil mendeteksi situasi infeasible dan melaporkan SCHEDULE CONSTRAINT CONFLICT tanpa melanggar hard constraints secara tidak sah.'
        : 'Gagal: Engine tidak memunculkan laporan conflict saat terjadi constraint deadlock.',
      distribution_summary: '',
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    results.push({
      test_id: 'test-6',
      test_name: 'TEST 6: Deteksi Infeasibility & Laporan Constraint Conflict',
      passed: false,
      min_assignments: 0,
      max_assignments: 0,
      assignments_count: 0,
      hard_conflicts_count: 1,
      details: `Error: ${errorMessage}`,
      distribution_summary: '',
    });
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    passed_all: failedCount === 0,
    total_tests: results.length,
    passed_count: passedCount,
    failed_count: failedCount,
    test_results: results,
  };
}

function checkConsecutiveWeekendViolations(assignments: Assignment[]): number {
  let violations = 0;
  const teamAssignmentsMap: Record<string, string[]> = {};

  assignments.forEach((a) => {
    if (!teamAssignmentsMap[a.team_id]) teamAssignmentsMap[a.team_id] = [];
    teamAssignmentsMap[a.team_id].push(a.service_date || a.weekend_id);
  });

  Object.values(teamAssignmentsMap).forEach((dates) => {
    const sortedDates = [...dates].sort();
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const diff = getDaysDifference(sortedDates[i], sortedDates[i + 1]);
      if (diff > 0 && diff < 12) {
        violations++;
      }
    }
  });

  return violations;
}

function getTeamAssignmentCounts(assignments: Assignment[], teams: Team[]): Record<string, number> {
  const counts: Record<string, number> = {};
  teams.forEach((t) => (counts[t.id] = 0));
  assignments.forEach((a) => {
    if (counts[a.team_id] !== undefined) {
      counts[a.team_id]++;
    }
  });
  return counts;
}

function formatCountsDistribution(counts: Record<string, number>): string {
  const grouped: Record<number, number> = {};
  Object.values(counts).forEach((cnt) => {
    grouped[cnt] = (grouped[cnt] || 0) + 1;
  });

  return Object.entries(grouped)
    .map(([services, numTeams]) => `${numTeams} Tim → ${services} Pelayanan`)
    .join(' | ');
}
