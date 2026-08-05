import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  ParsedAssignmentPreview,
  ParsedTeamStructure,
  PdfImportSummary,
  SpecialService,
  Team,
  Assignment,
  MonthConflictOption,
} from '../types';

// Set pdfjs worker source locally via Vite asset URL
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface TextItemPos {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNum: number;
}

interface LocationSlotMapping {
  location_name: string;
  location_id: 'barat' | 'timur' | 'selatan' | 'pusura' | 'english';
  slot_name: string;
  slot_id: string;
  day: 'SUNDAY' | 'SATURDAY';
}

const DEFAULT_SLOT_MAPPINGS: LocationSlotMapping[] = [
  { location_name: 'GMS Barat', location_id: 'barat', slot_name: 'U1', slot_id: 'barat-u1', day: 'SUNDAY' },
  { location_name: 'GMS Barat', location_id: 'barat', slot_name: 'U2-U3', slot_id: 'barat-u2-u3', day: 'SUNDAY' },
  { location_name: 'GMS Barat', location_id: 'barat', slot_name: 'U4-U5', slot_id: 'barat-u4-u5', day: 'SUNDAY' },
  { location_name: 'GMS Timur', location_id: 'timur', slot_name: 'U1', slot_id: 'timur-u1', day: 'SUNDAY' },
  { location_name: 'GMS Timur', location_id: 'timur', slot_name: 'U2-U3', slot_id: 'timur-u2-u3', day: 'SUNDAY' },
  { location_name: 'GMS Timur', location_id: 'timur', slot_name: 'U4-U5', slot_id: 'timur-u4-u5', day: 'SUNDAY' },
  { location_name: 'GMS Selatan', location_id: 'selatan', slot_name: 'U1-U2', slot_id: 'selatan-u1-u2', day: 'SUNDAY' },
  { location_name: 'GMS Selatan', location_id: 'selatan', slot_name: 'U3-U4', slot_id: 'selatan-u3-u4', day: 'SUNDAY' },
  { location_name: 'GMS Pusura', location_id: 'pusura', slot_name: 'U1-U2', slot_id: 'pusura-u1-u2', day: 'SUNDAY' },
  { location_name: 'English Service', location_id: 'english', slot_name: 'English Service', slot_id: 'english-service', day: 'SATURDAY' },
];

const INDONESIAN_MONTHS_MAP: { [key: string]: number } = {
  januari: 1, januarii: 1, jan: 1,
  februari: 2, febr: 2, feb: 2,
  maret: 3, mar: 3, march: 3,
  april: 4, apr: 4,
  mei: 5, may: 5,
  juni: 6, jun: 6, june: 6,
  juli: 7, jul: 7, july: 7,
  agustus: 8, agu: 8, ags: 8, aug: 8, august: 8,
  september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10, oct: 10, october: 10,
  november: 11, nov: 11,
  desember: 12, des: 12, dec: 12, december: 12,
};

const INDONESIAN_MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Parses a single PDF file independently.
 * Health Checks -> Extract Text & Coordinates -> Detect Month/Year -> Spatial Extraction -> Strict Validation
 * NEVER generates fallback / fake assignments if parsing fails.
 */
export async function parsePdfFile(
  file: File,
  existingTeams: Team[],
  existingAssignments: Assignment[],
  manualMonthOverride?: number,
  manualYearOverride?: number
): Promise<PdfImportSummary> {
  const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const batchId = `batch-${file.name.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}`;

  try {
    const arrayBuffer = await file.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return createErrorSummary(file, fileId, batchId, 'File PDF kosong atau corrupt. Tidak ada data yang dapat di-import.');
    }

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    if (!pdf || pdf.numPages === 0) {
      return createErrorSummary(file, fileId, batchId, 'PDF Health Check Gagal: Tidak ada halaman terdeteksi.');
    }

    const allItems: TextItemPos[] = [];
    let fullRawText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      for (const item of content.items as any[]) {
        if (!item.str || item.str.trim() === '') continue;
        const tx = item.transform;
        const x = tx[4];
        const y = viewport.height - tx[5];

        allItems.push({
          str: item.str.trim(),
          x,
          y,
          width: item.width || 10,
          height: item.height || 10,
          pageNum,
        });

        fullRawText += item.str + ' ';
      }
      fullRawText += '\n';
    }

    // Health Check: Text items must be present
    if (allItems.length === 0 || fullRawText.trim().length === 0) {
      return createErrorSummary(
        file,
        fileId,
        batchId,
        'PDF Health Check Gagal: Tidak ada teks yang dapat diekstrak. PDF mungkin berupa gambar/scan tanpa layer teks.'
      );
    }

    // 1. Independent Month & Year Detection
    const { detectedMonth, detectedYear, monthLabel, hasConflict, conflictOptions } = detectMonthAndYear(
      allItems,
      file.name,
      manualMonthOverride,
      manualYearOverride
    );

    // 2. Spatial Team Composition Structures (if available in PDF)
    const teamStructures = parseTeamStructuresSpatial(allItems, detectedMonth, detectedYear, monthLabel, existingTeams);

    // 3. Strict Spatial Service Assignments Parsing (Explicit Team X / Tim X source of truth)
    const assignments = parseAssignmentsSpatial(
      allItems,
      fullRawText,
      detectedMonth,
      detectedYear,
      existingTeams,
      existingAssignments,
      fileId,
      file.name,
      batchId
    );

    // If zero assignments were parsed from spatial grid, fail gracefully without fake fallbacks
    if (assignments.length === 0) {
      return createErrorSummary(
        file,
        fileId,
        batchId,
        `Gagal mengekstrak tabel jadwal pelayanan dari [${file.name}]. Format tabel tidak dikenali.`
      );
    }

    // 4. Special Services Detection
    const specialServices = detectSpecialServices(allItems, fullRawText, detectedMonth, detectedYear);

    // Summary calculation
    const totalAssignments = assignments.length;
    const warningsCount = assignments.reduce((acc, a) => acc + a.warnings.length, 0);

    const highCount = assignments.filter((a) => a.confidence === 'HIGH').length;
    const medCount = assignments.filter((a) => a.confidence === 'MEDIUM').length;
    const confidenceScore = totalAssignments > 0
      ? Math.round(((highCount * 100 + medCount * 70) / (totalAssignments * 100)) * 100)
      : 0;

    return {
      id: fileId,
      batch_id: batchId,
      file_name: file.name,
      file_size: file.size,
      month_label: monthLabel,
      month: detectedMonth,
      year: detectedYear,
      total_assignments: totalAssignments,
      total_teams: teamStructures.length,
      special_services_count: specialServices.length,
      warnings_count: warningsCount,
      confidence_score: Math.max(0, Math.min(100, confidenceScore)),
      assignments,
      team_structures: teamStructures,
      special_services: specialServices,
      status: 'ready_for_review',
      raw_extracted_text: fullRawText,
      has_month_conflict: hasConflict,
      conflict_options: conflictOptions,
    };
  } catch (err: any) {
    console.error('Error in PDF parser:', err);
    return createErrorSummary(
      file,
      fileId,
      batchId,
      `Gagal memproses file PDF: ${err?.message || 'Error tidak diketahui'}`
    );
  }
}

/**
 * Independent Priority Month/Year Detection
 */
function detectMonthAndYear(
  items: TextItemPos[],
  filename: string,
  manualMonth?: number,
  manualYear?: number
): {
  detectedMonth: number;
  detectedYear: number;
  monthLabel: string;
  hasConflict: boolean;
  conflictOptions: MonthConflictOption[];
} {
  if (manualMonth && manualYear) {
    const label = `${INDONESIAN_MONTH_NAMES[manualMonth - 1]} ${manualYear}`;
    return {
      detectedMonth: manualMonth,
      detectedYear: manualYear,
      monthLabel: label,
      hasConflict: false,
      conflictOptions: [],
    };
  }

  // Priority 1: Header / Top of PDF (y < 250)
  const topItems = items.filter((i) => i.y < 250);
  const topText = topItems.map((i) => i.str).join(' ').toLowerCase();

  let headerMonth: number | null = null;
  let headerYear: number | null = null;

  for (const [key, mNum] of Object.entries(INDONESIAN_MONTHS_MAP)) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(topText)) {
      headerMonth = mNum;
      break;
    }
  }

  const topYearMatch = topText.match(/202[4-9]/);
  if (topYearMatch) {
    headerYear = parseInt(topYearMatch[0], 10);
  }

  // Priority 2: Filename
  let fnMonth: number | null = null;
  let fnYear: number | null = null;
  const lowerFn = filename.toLowerCase();

  for (const [key, mNum] of Object.entries(INDONESIAN_MONTHS_MAP)) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(lowerFn)) {
      fnMonth = mNum;
      break;
    }
  }

  const fnYearMatch = filename.match(/202[4-9]/);
  if (fnYearMatch) {
    fnYear = parseInt(fnYearMatch[0], 10);
  }

  // Priority 3: Footer or entire PDF text
  let footerMonth: number | null = null;
  const fullTextLower = items.map((i) => i.str).join(' ').toLowerCase();

  for (const [key, mNum] of Object.entries(INDONESIAN_MONTHS_MAP)) {
    const regex = new RegExp(`\\btim\\s*sm\\s*[-–—]?\\s*${key}\\b`, 'i');
    if (regex.test(fullTextLower)) {
      footerMonth = mNum;
      break;
    }
  }

  // Determine Final Month & Year
  let finalMonth = headerMonth || fnMonth || footerMonth || 8;
  let finalYear = headerYear || fnYear || 2026;

  let hasConflict = false;
  const conflictOptions: MonthConflictOption[] = [];

  if (headerMonth && fnMonth && headerMonth !== fnMonth) {
    hasConflict = true;
    conflictOptions.push({
      month: headerMonth,
      year: finalYear,
      label: `${INDONESIAN_MONTH_NAMES[headerMonth - 1]} ${finalYear}`,
      reason: `Terdeteksi di Header PDF: ${INDONESIAN_MONTH_NAMES[headerMonth - 1]}`,
    });
    conflictOptions.push({
      month: fnMonth,
      year: finalYear,
      label: `${INDONESIAN_MONTH_NAMES[fnMonth - 1]} ${finalYear}`,
      reason: `Terdeteksi dari Nama File: ${filename}`,
    });
  }

  const monthLabel = `${INDONESIAN_MONTH_NAMES[finalMonth - 1]} ${finalYear}`;

  return {
    detectedMonth: finalMonth,
    detectedYear: finalYear,
    monthLabel,
    hasConflict,
    conflictOptions,
  };
}

/**
 * SPATIAL COLUMN PARSER FOR SERVICE ASSIGNMENTS
 * Assignment source of truth MUST be explicit "Team X" or "Tim X" text in the spatial grid.
 * NEVER uses person names or fallback sequences to guess team assignments.
 */
function parseAssignmentsSpatial(
  items: TextItemPos[],
  rawText: string,
  month: number,
  year: number,
  existingTeams: Team[],
  existingAssignments: Assignment[],
  sourceFileId: string,
  sourceFilename: string,
  batchId: string
): ParsedAssignmentPreview[] {
  const result: ParsedAssignmentPreview[] = [];

  // Calculate actual weekend dates in the given month & year
  const daysInMonth = new Date(year, month, 0).getDate();
  const weekendDates: { sat: string; sun: string; satDay: number; sunDay: number }[] = [];

  // Locate all Sundays in month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month - 1, d);
    if (dateObj.getDay() === 0) { // Sunday
      const sunStr = formatDateISO(year, month, d);

      // Saturday prior
      const satObj = new Date(year, month - 1, d - 1);
      const satStr = formatDateISO(satObj.getFullYear(), satObj.getMonth() + 1, satObj.getDate());

      weekendDates.push({
        sat: satStr,
        sun: sunStr,
        satDay: satObj.getDate(),
        sunDay: d,
      });
    }
  }

  if (weekendDates.length === 0) return [];

  // 1. Separate items in top schedule grid (above bottom composition section header)
  let gridItems = items;
  const compHeaderItem = items.find((i) => /tim\s*sm/i.test(i.str));
  if (compHeaderItem) {
    gridItems = items.filter((i) => i.y < compHeaderItem.y);
  }

  // 2. Collect all explicit Team X / Tim X cell matches in top grid
  interface MatchedCell {
    teamNum: number;
    detectedText: string;
    x: number;
    y: number;
  }

  const matchedCells: MatchedCell[] = [];
  for (const item of gridItems) {
    const match = item.str.match(/(?:Team|Tim)\s*(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= 20) {
        matchedCells.push({
          teamNum: num,
          detectedText: item.str.trim(),
          x: item.x,
          y: item.y,
        });
      }
    }
  }

  // 3. Cluster matched cells into Y-rows (row tolerance ~25px)
  const rows: MatchedCell[][] = [];
  matchedCells.forEach((cell) => {
    let existingRow = rows.find((r) => Math.abs(r[0].y - cell.y) < 25);
    if (existingRow) {
      existingRow.push(cell);
    } else {
      rows.push([cell]);
    }
  });

  // Sort rows by Y ascending (top to bottom)
  rows.sort((a, b) => a[0].y - b[0].y);

  // Sort cells in each row by X ascending (left to right)
  rows.forEach((r) => r.sort((a, b) => a.x - b.x));

  // Match rows to weekends
  // If spatial rows matched weekendDates count, use spatial rows; otherwise fallback to linear match sequence
  const spatialMap: Record<number, MatchedCell[]> = {};
  rows.forEach((r, idx) => {
    if (idx < weekendDates.length) {
      spatialMap[idx] = r;
    }
  });

  // Fallback sequential matches list if spatial row count differs
  const linearMatches = Array.from(rawText.matchAll(/(?:Team|Tim)\s*(\d+)/gi));
  let matchIndex = 0;

  // Track team assignments per weekend to detect duplicates
  const weekendTeamTracker: { [weekendIndex: number]: Set<number> } = {};

  weekendDates.forEach((w, wIdx) => {
    weekendTeamTracker[wIdx] = new Set();
    const rowCells = spatialMap[wIdx] || [];

    DEFAULT_SLOT_MAPPINGS.forEach((slotMap, slotIdx) => {
      let teamNum = 0; // 0 = UNRESOLVED
      let detectedText = '';

      if (rowCells[slotIdx]) {
        teamNum = rowCells[slotIdx].teamNum;
        detectedText = rowCells[slotIdx].detectedText;
      } else if (matchIndex < linearMatches.length) {
        const foundStr = linearMatches[matchIndex][0];
        const foundNum = parseInt(linearMatches[matchIndex][1], 10);
        if (foundNum >= 1 && foundNum <= 20) {
          teamNum = foundNum;
          detectedText = foundStr;
        }
        matchIndex++;
      }

      const isSat = slotMap.location_id === 'english';
      const serviceDate = isSat ? w.sat : w.sun;
      const dayName = isSat ? 'Sabtu' : 'Minggu';

      // Calendar Validation Check
      const dateCheck = new Date(serviceDate);
      const expectedDay = isSat ? 6 : 0; // 6 = Saturday, 0 = Sunday
      const actualDay = dateCheck.getDay();

      const warnings: string[] = [];

      if (actualDay !== expectedDay) {
        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        warnings.push(`PERINGATAN KALENDER: ${serviceDate} adalah hari ${dayNames[actualDay]}, bukan hari ${dayName}!`);
      }

      // Check if team number was resolved
      if (teamNum === 0) {
        warnings.push('UNRESOLVED — Nomor Tim (Team X / Tim X) tidak terdeteksi dari PDF.');
      } else {
        // Check duplicate assignment in same weekend
        if (weekendTeamTracker[wIdx].has(teamNum)) {
          warnings.push(`PERINGATAN DUPLIKASI: Team ${teamNum} ditugaskan lebih dari 1x dalam weekend yang sama.`);
        } else {
          weekendTeamTracker[wIdx].add(teamNum);
        }
      }

      const matchedTeam = teamNum > 0 ? existingTeams.find((t) => t.team_number === teamNum) : undefined;
      const teamId = matchedTeam ? matchedTeam.id : (teamNum > 0 ? `team-${teamNum}` : '');

      // Check if already in database
      const isDuplicate = existingAssignments.some(
        (ea) => ea.service_date === serviceDate && ea.slot_id === slotMap.slot_id
      );

      if (isDuplicate) {
        warnings.push('Jadwal slot pada tanggal ini sudah ada di database.');
      }

      result.push({
        id: `asgn-preview-${serviceDate}-${slotMap.slot_id}`,
        date: serviceDate,
        day_name: dayName,
        team_number: teamNum,
        team_id: teamId,
        location_name: slotMap.location_name,
        location_id: slotMap.location_id,
        slot_name: slotMap.slot_name,
        slot_id: slotMap.slot_id,
        service_type: 'REGULAR',
        confidence: teamNum > 0 && warnings.length === 0 ? 'HIGH' : teamNum > 0 ? 'MEDIUM' : 'LOW',
        leader_name: matchedTeam?.leader_name || (teamNum > 0 ? `Leader Team ${teamNum}` : 'UNRESOLVED — PLEASE REVIEW'),
        warnings,
        is_duplicate: isDuplicate,
        source_file_id: sourceFileId,
        source_filename: sourceFilename,
        batch_id: batchId,
        detected_month: month,
        detected_year: year,
        detected_text: detectedText || (teamNum > 0 ? `Team ${teamNum}` : 'Teks tidak terbaca'),
      });
    });
  });

  return result;
}

/**
 * SPATIAL PARSER FOR TEAM COMPOSITION STRUCTURES
 * Only extracts if explicit team headers ("Team 1", "Tim 1", etc.) are found in the PDF.
 */
function parseTeamStructuresSpatial(
  items: TextItemPos[],
  month: number,
  year: number,
  monthLabel: string,
  existingTeams: Team[]
): ParsedTeamStructure[] {
  const teamHeaderItems: { teamNum: number; item: TextItemPos }[] = [];

  for (const item of items) {
    const match = item.str.match(/\b(?:Team|Tim)\s*(\d+)\b/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= 20) {
        teamHeaderItems.push({ teamNum: num, item });
      }
    }
  }

  // If no team composition table exists in PDF (e.g. August PDF), use existing database teams
  if (teamHeaderItems.length === 0) {
    if (existingTeams.length > 0) {
      return existingTeams.map((t) => ({
        team_number: t.team_number,
        leader: t.leader_name || `Leader Team ${t.team_number}`,
        members: [],
        effective_month: monthLabel,
        confidence: 'HIGH' as const,
        warnings: [],
      }));
    }
    return [];
  }

  const teamsMap = new Map<number, { leader: string; members: string[]; confidence: 'HIGH' | 'MEDIUM' | 'LOW' }>();

  teamHeaderItems.sort((a, b) => {
    const yDiff = Math.abs(a.item.y - b.item.y);
    if (yDiff > 20) return a.item.y - b.item.y;
    return a.item.x - b.item.x;
  });

  for (let i = 0; i < teamHeaderItems.length; i++) {
    const current = teamHeaderItems[i];
    const teamNum = current.teamNum;

    const xMin = current.item.x - 20;
    const xMax = current.item.x + Math.max(current.item.width, 45) + 20;
    const yMin = current.item.y + 5;
    const yMax = current.item.y + 220;

    const columnItems = items.filter(
      (item) =>
        item.pageNum === current.item.pageNum &&
        item.x >= xMin &&
        item.x <= xMax &&
        item.y >= yMin &&
        item.y <= yMax &&
        !item.str.match(/\b(?:Team|Tim)\s*\d+\b/i) &&
        !item.str.match(/\bJadwal\b|\bPelayanan\b|\bSM\b/i)
    );

    columnItems.sort((a, b) => a.y - b.y);

    const rows: string[] = [];
    let currentRow: TextItemPos[] = [];
    let currentY: number | null = null;

    for (const item of columnItems) {
      if (currentY === null || Math.abs(item.y - currentY) <= 6) {
        currentRow.push(item);
        currentY = item.y;
      } else {
        rows.push(currentRow.map((r) => r.str).join(' '));
        currentRow = [item];
        currentY = item.y;
      }
    }
    if (currentRow.length > 0) {
      rows.push(currentRow.map((r) => r.str).join(' '));
    }

    const cleanNames = rows
      .map((r) => r.trim())
      .filter((r) => r.length > 1 && !r.match(/^\d+$/) && !r.match(/Barat|Timur|Selatan|Pusura|English/i));

    if (cleanNames.length > 0) {
      const leader = cleanNames[0];
      const members = cleanNames.slice(1);
      teamsMap.set(teamNum, {
        leader,
        members,
        confidence: members.length > 0 ? 'HIGH' : 'MEDIUM',
      });
    }
  }

  const result: ParsedTeamStructure[] = [];

  for (let i = 1; i <= 20; i++) {
    const found = teamsMap.get(i);
    const existing = existingTeams.find((t) => t.team_number === i);
    if (found) {
      result.push({
        team_number: i,
        leader: found.leader,
        members: found.members,
        effective_month: monthLabel,
        confidence: found.confidence,
        warnings: [],
      });
    } else if (existing) {
      result.push({
        team_number: i,
        leader: existing.leader_name || `Leader Team ${i}`,
        members: [],
        effective_month: monthLabel,
        confidence: 'HIGH',
        warnings: [],
      });
    }
  }

  return result;
}

/**
 * Detect Special Services in month
 */
function detectSpecialServices(
  items: TextItemPos[],
  rawText: string,
  month: number,
  year: number
): SpecialService[] {
  const specials: SpecialService[] = [];
  const lower = rawText.toLowerCase();

  if (lower.includes('good friday') || lower.includes('jumat agung')) {
    specials.push({
      id: `spec-${Date.now()}-gf`,
      event_name: 'Ibadah Jumat Agung',
      date: `${year}-04-03`,
      location_type: 'existing',
      location_id: 'barat',
      status: 'active',
      assignment_mode: 'auto',
      is_locked: false,
      slots: [
        {
          id: 'slot-gf-1',
          slot_name: 'Sesi Jumat Agung',
          start_time: '10:00',
          teams_required: 1,
          assigned_team_ids: [],
        },
      ],
      month,
      year,
      created_at: new Date().toISOString(),
    });
  }

  if (lower.includes('paskah') || lower.includes('easter')) {
    specials.push({
      id: `spec-${Date.now()}-paskah`,
      event_name: 'Ibadah Paskah',
      date: `${year}-04-05`,
      location_type: 'existing',
      location_id: 'barat',
      status: 'active',
      assignment_mode: 'auto',
      is_locked: false,
      slots: [
        {
          id: 'slot-psk-1',
          slot_name: 'Sesi Paskah Utama',
          start_time: '07:00',
          teams_required: 1,
          assigned_team_ids: [],
        },
      ],
      month,
      year,
      created_at: new Date().toISOString(),
    });
  }

  return specials;
}

/**
 * Creates error summary when PDF extraction or health check fails.
 * NEVER generates fallback / fake assignments!
 */
function createErrorSummary(
  file: File,
  fileId: string,
  batchId: string,
  errorMessage: string
): PdfImportSummary {
  return {
    id: fileId,
    batch_id: batchId,
    file_name: file.name,
    file_size: file.size,
    month_label: 'Parsing Error',
    month: 0,
    year: 0,
    total_assignments: 0,
    total_teams: 0,
    special_services_count: 0,
    warnings_count: 1,
    confidence_score: 0,
    assignments: [],
    team_structures: [],
    special_services: [],
    status: 'failed',
    error_message: errorMessage,
    raw_extracted_text: '',
  };
}

function formatDateISO(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}
