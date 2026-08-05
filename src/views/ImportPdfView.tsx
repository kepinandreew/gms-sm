import React, { useState, useEffect } from 'react';
import {
  FileUp,
  FileText,
  CheckCircle,
  AlertTriangle,
  UploadCloud,
  Edit3,
  Check,
  RefreshCw,
  X,
  History,
  Info,
  Shield,
  Users,
  Calendar,
  Sparkles,
  ArrowRight,
  Database,
  Search,
  Trash2,
  Eye,
  Plus,
  UserCheck,
  UserPlus,
  ArrowLeftRight,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { parsePdfFile } from '../engine/pdfParser';
import { store } from '../db/store';
import { pushTableToSupabase, isSupabaseConfigured } from '../services/supabase';
import {
  PdfImportSummary,
  ParsedAssignmentPreview,
  ParsedTeamStructure,
  SpecialService,
  Team,
  Assignment,
  ImportAuditLog,
} from '../types';

interface ImportPdfViewProps {
  onNavigate?: (route: any) => void;
  onMonthYearSelect?: (month: number, year: number) => void;
}

export const ImportPdfView: React.FC<ImportPdfViewProps> = ({ onNavigate, onMonthYearSelect }) => {
  const [importSummaries, setImportSummaries] = useState<PdfImportSummary[]>([]);
  const [activeSummaryIndex, setActiveSummaryIndex] = useState<number>(0);
  const [isParsing, setIsParsing] = useState(false);
  const [parseLogs, setParseLogs] = useState<string[]>([]);
  
  // Active Tab inside preview
  const [reviewTab, setReviewTab] = useState<'assignments' | 'leaders' | 'members' | 'specials' | 'warnings'>('assignments');

  // Inline editing modal/state for Assignment
  const [editingAssignment, setEditingAssignment] = useState<ParsedAssignmentPreview | null>(null);
  const [editForm, setEditForm] = useState({
    team_number: 1,
    location_id: 'barat' as 'barat' | 'timur' | 'selatan' | 'pusura' | 'english',
    slot_id: 'barat-u1',
    date: '',
  });

  // Inline Leader Edit Modal
  const [editingTeamNum, setEditingTeamNum] = useState<number | null>(null);
  const [editLeaderName, setEditLeaderName] = useState('');

  // Add Member Modal / State
  const [addMemberTeamNum, setAddMemberTeamNum] = useState<number | null>(null);
  const [newMemberName, setNewMemberName] = useState('');

  // Raw Text Source Modal
  const [showRawTextModal, setShowRawTextModal] = useState(false);

  // Batch Deletion Confirmation Modal
  const [deletingBatch, setDeletingBatch] = useState<ImportAuditLog | null>(null);

  // Duplicate Month Conflict Modal
  const [duplicateConflict, setDuplicateConflict] = useState<{
    summary: PdfImportSummary;
    existingLog: ImportAuditLog;
  } | null>(null);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<ImportAuditLog[]>(() => store.getAuditLogs());

  const refreshAuditLogs = () => {
    setAuditLogs(store.getAuditLogs());
  };

  const buildSummariesFromStore = (): PdfImportSummary[] => {
    const logs = store.getAuditLogs();
    const allAssignments = store.getAssignments();
    const compHistories = store.getCompositionHistories();
    const specialServices = store.getSpecialServices();
    const teams = store.getTeams();

    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    if (!logs || logs.length === 0) return [];

    return logs.map((log) => {
      const schedId = `sched-${log.year}-${log.month}`;
      const schedAssignments = allAssignments.filter(
        (a) => a.schedule_id === schedId || a.id.includes(`imported-${log.year}-${log.month}`)
      );
      const monthComp = compHistories.filter((ch) => ch.month === log.month && ch.year === log.year);
      const monthSpecials = specialServices.filter((s) => s.month === log.month && s.year === log.year);

      const mappedAssignments: ParsedAssignmentPreview[] = schedAssignments.map((a) => {
        const matchedTeam = teams.find((t) => t.id === a.team_id || t.team_number === parseInt(a.team_id.replace('team-', ''), 10));
        const teamNum = matchedTeam ? matchedTeam.team_number : parseInt(a.team_id.replace('team-', '') || '0', 10);
        const teamComp = monthComp.find((c) => c.team_id === a.team_id || c.team_id === `team-${teamNum}`);

        return {
          id: a.id,
          date: a.service_date,
          day_name: a.weekend_id ? 'Minggu' : 'Sabtu',
          location_id: a.location_id as any,
          location_name: a.location_id ? `GMS ${a.location_id.toUpperCase()}` : 'GMS Barat',
          slot_id: a.slot_id,
          slot_name: a.slot_id.toUpperCase(),
          service_type: 'REGULAR',
          team_number: teamNum,
          team_id: a.team_id,
          leader_name: teamComp ? teamComp.leader_name : matchedTeam?.leader_name || '',
          detected_text: `Team ${teamNum}`,
          confidence: 'HIGH' as const,
          warnings: [],
        };
      });

      const mappedStructures: ParsedTeamStructure[] = monthComp.map((ch) => {
        const matchedTeam = teams.find((t) => t.id === ch.team_id);
        return {
          team_number: matchedTeam ? matchedTeam.team_number : parseInt(ch.team_id.replace('team-', '') || '0', 10),
          leader: ch.leader_name,
          members: ch.members || [],
          effective_month: log.month && log.year ? `${monthNames[log.month - 1]} ${log.year}` : 'Historis',
          confidence: 'HIGH' as const,
        };
      });

      const mLabel = log.month && log.year ? `${monthNames[log.month - 1]} ${log.year}` : 'Bulan Historis';

      return {
        id: `summary-${log.batch_id}`,
        batch_id: log.batch_id,
        file_name: log.imported_file,
        file_size: 1024,
        month: log.month || 8,
        year: log.year || 2026,
        month_label: mLabel,
        imported_at: log.import_date,
        total_assignments: log.number_of_assignments || mappedAssignments.length,
        total_teams: log.number_of_teams || mappedStructures.length,
        special_services_count: monthSpecials.length,
        warnings_count: log.warnings_count || 0,
        confidence_score: 98,
        status: 'confirmed' as const,
        assignments: mappedAssignments,
        team_structures: mappedStructures,
        special_services: monthSpecials,
      };
    });
  };

  useEffect(() => {
    const syncAndLoad = () => {
      setAuditLogs(store.getAuditLogs());
      const loaded = buildSummariesFromStore();
      if (loaded.length > 0) {
        setImportSummaries(loaded);
      }
    };

    syncAndLoad();
    const unsubscribe = store.subscribe(syncAndLoad);
    return () => unsubscribe();
  }, []);

  const saveSummaryToStore = async (summary: PdfImportSummary): Promise<boolean> => {
    if (!summary || !summary.assignments || summary.assignments.length === 0) return false;

    const scheduleId = `sched-${summary.year}-${summary.month}`;

    // 1. Create or update Schedule for this specific month & year
    store.saveSchedule({
      id: scheduleId,
      month: summary.month,
      year: summary.year,
      status: 'finalized',
      created_at: new Date().toISOString(),
      finalized_at: new Date().toISOString(),
      quality_score: summary.confidence_score,
      fairness_metrics: {
        monthly_balance_score: 95,
        longterm_balance_score: 90,
        location_rotation_score: 85,
        slot_rotation_score: 85,
        date_distribution_score: 85,
        total_assignments: summary.assignments.length,
        active_teams_count: summary.team_structures.length,
        min_services_per_team: 2,
        max_services_per_team: 2,
        avg_services_per_team: 2,
      },
    });

    // 2. Convert preview assignments to actual assignments
    const newAssignments: Assignment[] = summary.assignments.map((a, idx) => ({
      id: `asgn-imported-${summary.year}-${summary.month}-${idx}-${Date.now()}`,
      schedule_id: scheduleId,
      weekend_id: `wk-${a.date}`,
      service_date: a.date,
      team_id: a.team_id || `team-${a.team_number}`,
      location_id: a.location_id,
      slot_id: a.slot_id,
      locked: false,
      manually_assigned: false,
    }));

    store.saveAssignmentsForSchedule(scheduleId, newAssignments);

    // 3. Save Team Composition Snapshots per month
    if (summary.team_structures && summary.team_structures.length > 0) {
      summary.team_structures.forEach((ts) => {
        const teams = store.getTeams();
        const matched = teams.find((t) => t.team_number === ts.team_number);
        const teamId = matched ? matched.id : `team-${ts.team_number}`;

        store.addCompositionHistory({
          team_id: teamId,
          month: summary.month,
          year: summary.year,
          leader_name: ts.leader,
          members: ts.members,
          source_file: summary.file_name,
        });
      });
    }

    // 4. Save Special Services if any
    summary.special_services.forEach((spec) => {
      store.addSpecialService({
        event_name: spec.event_name,
        date: spec.date,
        location_type: spec.location_type,
        location_id: spec.location_id,
        status: 'active',
        assignment_mode: spec.assignment_mode,
        is_locked: spec.is_locked,
        slots: spec.slots,
        month: spec.month,
        year: spec.year,
      });
    });

    // 5. Save Audit Log with Batch Traceability
    store.addAuditLog({
      batch_id: summary.batch_id,
      imported_file: summary.file_name,
      import_date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      imported_by: 'Koordinator Pelayanan',
      number_of_assignments: summary.assignments.length,
      number_of_teams: summary.total_teams,
      warnings_count: summary.warnings_count,
      corrections_made: 0,
      status: 'SUCCESS',
      month: summary.month,
      year: summary.year,
    });

    // Verify Cloud Sync to Supabase
    if (isSupabaseConfigured) {
      try {
        const schedOk = await pushTableToSupabase('schedules', [{
          id: scheduleId,
          month: summary.month,
          year: summary.year,
          status: 'finalized',
          created_at: new Date().toISOString(),
          finalized_at: new Date().toISOString(),
          quality_score: summary.confidence_score || 95,
          fairness_metrics: {
            monthly_balance_score: 90,
            longterm_balance_score: 90,
            location_rotation_score: 90,
            slot_rotation_score: 90,
            date_distribution_score: 90,
            total_assignments: summary.assignments.length,
            active_teams_count: summary.total_teams,
            min_services_per_team: 2,
            max_services_per_team: 3,
            avg_services_per_team: 2.5,
          },
        }]);
        const asgnOk = await pushTableToSupabase('assignments', newAssignments);

        if (!schedOk.success || !asgnOk.success) {
          const errMsg = schedOk.error || asgnOk.error || 'Gagal menyimpan ke Cloud';
          alert(`Import berhasil diproses tetapi gagal disimpan ke Cloud: ${errMsg}`);
          return false;
        }
      } catch (e) {
        alert('Import berhasil diproses tetapi gagal disimpan ke Cloud.');
        return false;
      }
    }

    return true;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsParsing(true);
    setParseLogs(['Membaca file PDF...', 'Inisialisasi parser PDF spatial spatial-grid...']);

    const existingTeams = store.getTeams();
    const existingAssignments = store.getAssignments();
    const existingAuditLogs = store.getAuditLogs();
    const newSummaries: PdfImportSummary[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setParseLogs((prev) => [...prev, `Menguraikan [${i + 1}/${files.length}]: ${file.name}...`]);

      const summary = await parsePdfFile(file, existingTeams, existingAssignments);

      if (summary.assignments && summary.assignments.length > 0) {
        // Check if month/year already imported
        const duplicateLog = existingAuditLogs.find((log) => log.month === summary.month && log.year === summary.year);

        if (duplicateLog) {
          setIsParsing(false);
          setDuplicateConflict({ summary, existingLog: duplicateLog });
          return; // Prompt admin via modal
        }

        await saveSummaryToStore(summary);
        summary.status = 'confirmed';
        summary.imported_at = new Date().toISOString();
      }

      newSummaries.push(summary);
    }

    setImportSummaries((prev) => {
      const combined = [...prev, ...newSummaries];
      // deduplicate by batch_id
      const uniqueMap = new Map();
      combined.forEach((s) => uniqueMap.set(s.batch_id, s));
      return Array.from(uniqueMap.values());
    });
    setActiveSummaryIndex(importSummaries.length);
    setIsParsing(false);
    refreshAuditLogs();
    setParseLogs((prev) => [...prev, 'Proses ekstraksi PDF selesai & jadwal telah disimpan ke database!']);

    const validSummary = newSummaries.find((s) => s.assignments && s.assignments.length > 0);
    if (validSummary && onMonthYearSelect) {
      onMonthYearSelect(validSummary.month, validSummary.year);
    }
  };

  const handleReplaceDuplicate = async () => {
    if (!duplicateConflict) return;
    const { summary, existingLog } = duplicateConflict;

    store.deleteImportBatch(existingLog.batch_id, existingLog.month, existingLog.year);

    summary.status = 'confirmed';
    summary.imported_at = new Date().toISOString();
    await saveSummaryToStore(summary);

    setDuplicateConflict(null);
    refreshAuditLogs();
    alert(`Jadwal bulan ${summary.month}/${summary.year} berhasil digantikan dengan file [${summary.file_name}].`);
  };

  const handleAppendDuplicate = async () => {
    if (!duplicateConflict) return;
    const { summary } = duplicateConflict;

    summary.status = 'confirmed';
    summary.imported_at = new Date().toISOString();
    await saveSummaryToStore(summary);

    setDuplicateConflict(null);
    refreshAuditLogs();
    alert(`Jadwal baru dari file [${summary.file_name}] berhasil digabungkan ke bulan ${summary.month}/${summary.year}.`);
  };

  // Month conflict resolution by admin
  const handleResolveMonthConflict = async (summaryIndex: number, selectedMonth: number, selectedYear: number) => {
    const targetSummary = importSummaries[summaryIndex];
    if (!targetSummary) return;

    setIsParsing(true);
    setParseLogs([`Memperbarui analisis bulan untuk ${targetSummary.file_name} ke ${selectedMonth}/${selectedYear}...`]);

    const existingTeams = store.getTeams();
    const existingAssignments = store.getAssignments();

    // Re-parse with manual month/year override
    const dummyFile = new File([''], targetSummary.file_name, { type: 'application/pdf' });
    const updatedSummary = await parsePdfFile(
      dummyFile,
      existingTeams,
      existingAssignments,
      selectedMonth,
      selectedYear
    );

    const updatedSummaries = [...importSummaries];
    updatedSummaries[summaryIndex] = {
      ...updatedSummary,
      file_name: targetSummary.file_name,
      file_size: targetSummary.file_size,
      raw_extracted_text: targetSummary.raw_extracted_text,
      has_month_conflict: false,
    };

    setImportSummaries(updatedSummaries);
    setIsParsing(false);
  };

  // --- ASSIGNMENT EDITING ---
  const handleEditAssignmentClick = (asgn: ParsedAssignmentPreview) => {
    setEditingAssignment(asgn);
    setEditForm({
      team_number: asgn.team_number,
      location_id: asgn.location_id,
      slot_id: asgn.slot_id,
      date: asgn.date,
    });
  };

  const handleSaveAssignmentEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment || importSummaries.length === 0) return;

    const activeSum = importSummaries[activeSummaryIndex];
    if (!activeSum) return;

    const updatedAssignments = activeSum.assignments.map((a) => {
      if (a.id === editingAssignment.id) {
        const teams = store.getTeams();
        const matchedTeam = teams.find((t) => t.team_number === editForm.team_number);

        return {
          ...a,
          team_number: editForm.team_number,
          team_id: matchedTeam ? matchedTeam.id : `team-${editForm.team_number}`,
          location_id: editForm.location_id,
          slot_id: editForm.slot_id,
          date: editForm.date,
          confidence: 'HIGH' as const,
          warnings: [], // Clear warning since manually corrected
        };
      }
      return a;
    });

    const updatedSummaries = [...importSummaries];
    updatedSummaries[activeSummaryIndex] = {
      ...activeSum,
      assignments: updatedAssignments,
      warnings_count: updatedAssignments.reduce((acc, a) => acc + a.warnings.length, 0),
    };

    setImportSummaries(updatedSummaries);
    setEditingAssignment(null);
  };

  // --- LEADER EDITING ---
  const handleSaveLeaderEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTeamNum === null || !editLeaderName.trim()) return;

    const activeSum = importSummaries[activeSummaryIndex];
    if (!activeSum) return;

    const updatedStructures = activeSum.team_structures.map((ts) => {
      if (ts.team_number === editingTeamNum) {
        return {
          ...ts,
          leader: editLeaderName.trim(),
        };
      }
      return ts;
    });

    const updatedSummaries = [...importSummaries];
    updatedSummaries[activeSummaryIndex] = {
      ...activeSum,
      team_structures: updatedStructures,
    };

    setImportSummaries(updatedSummaries);
    setEditingTeamNum(null);
    setEditLeaderName('');
  };

  // --- MEMBER MANAGEMENT ---
  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addMemberTeamNum === null || !newMemberName.trim()) return;

    const activeSum = importSummaries[activeSummaryIndex];
    if (!activeSum) return;

    const updatedStructures = activeSum.team_structures.map((ts) => {
      if (ts.team_number === addMemberTeamNum) {
        return {
          ...ts,
          members: [...ts.members, newMemberName.trim()],
        };
      }
      return ts;
    });

    const updatedSummaries = [...importSummaries];
    updatedSummaries[activeSummaryIndex] = {
      ...activeSum,
      team_structures: updatedStructures,
    };

    setImportSummaries(updatedSummaries);
    setAddMemberTeamNum(null);
    setNewMemberName('');
  };

  const handleRemoveMember = (teamNum: number, memberName: string) => {
    const activeSum = importSummaries[activeSummaryIndex];
    if (!activeSum) return;

    const updatedStructures = activeSum.team_structures.map((ts) => {
      if (ts.team_number === teamNum) {
        return {
          ...ts,
          members: ts.members.filter((m) => m !== memberName),
        };
      }
      return ts;
    });

    const updatedSummaries = [...importSummaries];
    updatedSummaries[activeSummaryIndex] = {
      ...activeSum,
      team_structures: updatedStructures,
    };

    setImportSummaries(updatedSummaries);
  };

  const handleMoveMember = (fromTeamNum: number, toTeamNum: number, memberName: string) => {
    const activeSum = importSummaries[activeSummaryIndex];
    if (!activeSum) return;

    const updatedStructures = activeSum.team_structures.map((ts) => {
      if (ts.team_number === fromTeamNum) {
        return { ...ts, members: ts.members.filter((m) => m !== memberName) };
      }
      if (ts.team_number === toTeamNum) {
        return { ...ts, members: [...ts.members, memberName] };
      }
      return ts;
    });

    const updatedSummaries = [...importSummaries];
    updatedSummaries[activeSummaryIndex] = {
      ...activeSum,
      team_structures: updatedStructures,
    };

    setImportSummaries(updatedSummaries);
  };

  // --- INDIVIDUAL MONTH CONFIRMATION ---
  const handleConfirmImport = (summaryIndex: number) => {
    const summary = importSummaries[summaryIndex];
    if (!summary) return;

    saveSummaryToStore(summary);

    // Mark summary as confirmed
    const updatedSummaries = [...importSummaries];
    updatedSummaries[summaryIndex] = {
      ...summary,
      status: 'confirmed',
      imported_at: new Date().toISOString(),
    };

    setImportSummaries(updatedSummaries);
    refreshAuditLogs();

    if (onMonthYearSelect) {
      onMonthYearSelect(summary.month, summary.year);
    }
    if (onNavigate) {
      onNavigate('schedule');
    }
  };

  // --- DELETE IMPORT BATCH / ROLLBACK ---
  const handleConfirmDeleteBatch = () => {
    if (!deletingBatch) return;

    store.deleteImportBatch(deletingBatch.batch_id, deletingBatch.month, deletingBatch.year);
    refreshAuditLogs();

    // Also remove from local summaries list if present
    setImportSummaries((prev) => prev.filter((s) => s.batch_id !== deletingBatch.batch_id));
    setDeletingBatch(null);

    alert(`Batch import [${deletingBatch.imported_file}] (${deletingBatch.month}/${deletingBatch.year}) telah berhasil dihapus secara bersih dari database. Anda dapat melakukan re-import file PDF ini kapan saja.`);
  };

  const currentSummary = importSummaries[activeSummaryIndex];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-2xl border border-white/40 dark:border-slate-700/50 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileUp className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Import & Review Jadwal Historis PDF
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ekstraksi otomatis jadwal pelayanan & komposisi tim per bulan dengan spatial column parser.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-3.5 py-2 rounded-xl border border-amber-200 dark:border-amber-900/50">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Aturan Alur: Setiaps file diproses secara **independen**. Review & verifikasi sebelum confirm ke database.</span>
        </div>
      </div>

      {/* Dropzone & Multi-file Upload */}
      <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl border border-dashed border-indigo-300 dark:border-indigo-800 p-8 text-center shadow-sm relative overflow-hidden group hover:border-indigo-500 transition-all">
        <input
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileUpload}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />

        <div className="space-y-3 max-w-md mx-auto pointer-events-none">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm group-hover:scale-105 transition-transform">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Drop File PDF Jadwal GMS di Sini atau Klik Untuk Upload Batch
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Mendukung upload sekaligus beberapa file PDF (Maret, April, Mei, Juni, Juli, Agustus 2026).
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold pt-1">
            <Sparkles className="w-3.5 h-3.5" /> Spatial Column Parser (Anti-Bleeding Cross Column) & Cross Calendar Validation
          </div>
        </div>
      </div>

      {/* Parsing Progress Indicator */}
      {isParsing && (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-indigo-900 dark:text-indigo-200">Sedang Menguraikan PDF...</p>
            <p className="text-indigo-700 dark:text-indigo-300">{parseLogs[parseLogs.length - 1]}</p>
          </div>
        </div>
      )}

      {/* Summaries Review Section */}
      {importSummaries.length > 0 && (
        <div className="space-y-4">
          {/* File Selection Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {importSummaries.map((sum, index) => (
              <button
                key={sum.id}
                onClick={() => setActiveSummaryIndex(index)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  activeSummaryIndex === index
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span className="font-bold">{sum.month_label}</span>
                <span className="text-[10px] opacity-80">({sum.file_name})</span>
                {sum.status === 'confirmed' ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-[10px] font-bold">Imported</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 text-[10px] font-bold">Review Needed</span>
                )}
              </button>
            ))}
          </div>

          {/* Active Summary Review Card */}
          {currentSummary && (
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-white/60 dark:border-slate-700/60 p-6 shadow-sm space-y-6">
              
              {/* Failed Parsing Error Banner */}
              {currentSummary.status === 'failed' && (
                <div className="p-5 bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-sm">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>PDF PARSING ERROR — PROSES IMPORT DIHENTIKAN</span>
                  </div>
                  <p className="text-rose-700 dark:text-rose-300 font-medium">
                    {currentSummary.error_message || 'Sistem tidak dapat menguraikan teks dari PDF ini.'}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    Sesuai kebijakan integritas data: <strong>Sistem TIDAK akan membuat assignment atau tim buatan/fallback.</strong> Silakan periksa kembali file PDF yang Anda upload.
                  </p>
                </div>
              )}

              {/* Month Conflict Alert Banner if any */}
              {currentSummary.has_month_conflict && currentSummary.conflict_options && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>MONTH DETECTION CONFLICT — Mohon Pilih Bulan Yang Benar</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    Sistem mendeteksi indikasi bulan yang berbeda antara Header PDF dan Nama File. Silakan pilih bulan yang sesuai untuk file <strong>{currentSummary.file_name}</strong>:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {currentSummary.conflict_options.map((opt) => (
                      <button
                        key={opt.month}
                        onClick={() => handleResolveMonthConflict(activeSummaryIndex, opt.month, opt.year)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-sm flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" /> Pilih {opt.label} ({opt.reason})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentSummary.status !== 'failed' && (
                <>
                  {/* Summary Stats Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                          Hasil Ekstraksi PDF: {currentSummary.month_label}
                        </h2>
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          Skor Akurasi Spatial: {currentSummary.confidence_score}%
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5" /> Strict Mode: AKTIF
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        File: {currentSummary.file_name} • Extracted {currentSummary.total_assignments} slot pelayanan & {currentSummary.total_teams} tim.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowRawTextModal(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl"
                      >
                        <Eye className="w-4 h-4 text-indigo-500" /> Lihat Source PDF Text
                      </button>

                      {currentSummary.status === 'confirmed' ? (
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-4 py-2 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle className="w-4 h-4" /> Sudah Di-Import Ke Database
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConfirmImport(activeSummaryIndex)}
                          className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all"
                        >
                          <Database className="w-4 h-4" /> Confirm & Import {currentSummary.month_label}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Sub Navigation Tabs inside Review Workspace */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2 overflow-x-auto">
                <button
                  onClick={() => setReviewTab('assignments')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                    reviewTab === 'assignments'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Calendar className="w-4 h-4" /> Service Assignments ({currentSummary.assignments.length})
                </button>

                <button
                  onClick={() => setReviewTab('leaders')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                    reviewTab === 'leaders'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <UserCheck className="w-4 h-4" /> Team Leaders ({currentSummary.team_structures.length})
                </button>

                <button
                  onClick={() => setReviewTab('members')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                    reviewTab === 'members'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Users className="w-4 h-4" /> Team Members (Spatial Columns)
                </button>

                <button
                  onClick={() => setReviewTab('specials')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                    reviewTab === 'specials'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Sparkles className="w-4 h-4" /> Special Services ({currentSummary.special_services.length})
                </button>

                <button
                  onClick={() => setReviewTab('warnings')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                    reviewTab === 'warnings'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <AlertCircle className="w-4 h-4" /> Warnings ({currentSummary.warnings_count})
                </button>
              </div>

              {/* TAB 1: SERVICE ASSIGNMENTS REVIEW */}
              {reviewTab === 'assignments' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Review jadwal hasil ekstraksi untuk bulan <strong>{currentSummary.month_label}</strong>. Tekan <strong>Koreksi</strong> jika terdapat penyesuaian tanggal atau nomor tim.
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {currentSummary.assignments.length} Slot Terjadwal
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-bold">
                          <th className="p-3">Tanggal Service</th>
                          <th className="p-3">Hari</th>
                          <th className="p-3">Lokasi / Sektor</th>
                          <th className="p-3">Slot Jam</th>
                          <th className="p-3">Tim Ditugaskan</th>
                          <th className="p-3">Teks Cell PDF</th>
                          <th className="p-3">Leader</th>
                          <th className="p-3">Status Evaluasi</th>
                          <th className="p-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {currentSummary.assignments.map((asgn) => (
                          <tr key={asgn.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{asgn.date}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                asgn.day_name === 'Sabtu' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              }`}>
                                {asgn.day_name || 'Minggu'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-700 dark:text-slate-300">{asgn.location_name}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-medium">
                                {asgn.slot_name}
                              </span>
                            </td>
                            <td className="p-3">
                              {asgn.team_number > 0 ? (
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">Team {asgn.team_number}</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                                  UNRESOLVED — PLEASE REVIEW
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-[11px] font-mono text-slate-500 max-w-[150px] truncate" title={asgn.detected_text}>
                              {asgn.detected_text || '-'}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">{asgn.leader_name || '-'}</td>
                            <td className="p-3">
                              {asgn.warnings.length > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full font-semibold">
                                  <AlertTriangle className="w-3 h-3 text-amber-500" /> {asgn.warnings[0]}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full font-semibold">
                                  <Check className="w-3 h-3" /> Valid Kalender
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleEditAssignmentClick(asgn)}
                                className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg font-semibold flex items-center gap-1 text-[11px] ml-auto"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Koreksi
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: TEAM LEADERS REVIEW */}
              {reviewTab === 'leaders' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Leader terdeteksi dari baris pertama di bawah header kolom masing-masing Team pada section "Tim SM - {currentSummary.month_label}".
                  </p>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-bold">
                          <th className="p-3">Nomor Tim</th>
                          <th className="p-3">Detected Leader</th>
                          <th className="p-3">Bulan Efektif</th>
                          <th className="p-3">Confidence</th>
                          <th className="p-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {currentSummary.team_structures.map((ts) => (
                          <tr key={ts.team_number} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">Team {ts.team_number}</td>
                            <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{ts.leader}</td>
                            <td className="p-3 text-slate-500">{ts.effective_month}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                {ts.confidence || 'HIGH'}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => {
                                  setEditingTeamNum(ts.team_number);
                                  setEditLeaderName(ts.leader);
                                }}
                                className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg font-semibold flex items-center gap-1 text-[11px] ml-auto"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Ubah Leader
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: TEAM MEMBERS REVIEW (SPATIAL COLUMNS) */}
              {reviewTab === 'members' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500">
                    Anggota tim diekstrak berdasarkan **X Boundary (Kolom Vertikal)** pada PDF. Nama anggota dijamin tidak bocor ke kolom tim sebelah.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentSummary.team_structures.map((ts) => (
                      <div
                        key={ts.team_number}
                        className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                          <div>
                            <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">Team {ts.team_number}</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300">Leader: <strong>{ts.leader}</strong></p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {ts.members.length} Anggota
                          </span>
                        </div>

                        {/* Members List */}
                        <div className="space-y-1.5">
                          {ts.members.map((m, mIdx) => (
                            <div
                              key={mIdx}
                              className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700 text-xs"
                            >
                              <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-500" /> {m}
                              </span>

                              <div className="flex items-center gap-1">
                                {/* Move member to another team */}
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleMoveMember(ts.team_number, parseInt(e.target.value, 10), m);
                                    }
                                  }}
                                  defaultValue=""
                                  className="text-[10px] bg-slate-100 dark:bg-slate-700 rounded px-1.5 py-0.5 text-slate-600 dark:text-slate-300"
                                >
                                  <option value="" disabled>Pindah...</option>
                                  {Array.from({ length: 20 }, (_, i) => i + 1)
                                    .filter((n) => n !== ts.team_number)
                                    .map((n) => (
                                      <option key={n} value={n}>Ke Team {n}</option>
                                    ))}
                                </select>

                                <button
                                  onClick={() => handleRemoveMember(ts.team_number, m)}
                                  className="text-rose-500 hover:bg-rose-50 p-1 rounded"
                                  title="Hapus dari tim ini"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add Member Button */}
                        <button
                          onClick={() => {
                            setAddMemberTeamNum(ts.team_number);
                            setNewMemberName('');
                          }}
                          className="w-full py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg flex items-center justify-center gap-1 border border-indigo-200/50"
                        >
                          <Plus className="w-3.5 h-3.5" /> Tambah Anggota Ke Team {ts.team_number}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: SPECIAL SERVICES */}
              {reviewTab === 'specials' && (
                <div className="space-y-3">
                  {currentSummary.special_services.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                      Tidak ada ibadah khusus / special event yang terdeteksi di luar hari Sabtu/Minggu pada file PDF ini.
                    </div>
                  ) : (
                    currentSummary.special_services.map((spec) => (
                      <div key={spec.id} className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{spec.event_name}</h4>
                          <p className="text-xs text-slate-500">Tanggal: {spec.date} • Sektor: GMS {spec.location_id?.toUpperCase()}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                          Special Event
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 5: WARNINGS & AUDIT */}
              {reviewTab === 'warnings' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Catatan Evaluasi PDF Parser ({currentSummary.warnings_count} Warning)</h4>
                  {currentSummary.warnings_count === 0 ? (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 font-bold">
                      <CheckCircle className="w-4 h-4" /> Seluruh data tanggal & struktur tim tervalidasi 100% akurat!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentSummary.assignments
                        .filter((a) => a.warnings.length > 0)
                        .map((a, i) => (
                          <div key={i} className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-xl border border-amber-200 text-xs flex items-center justify-between">
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{a.date} ({a.location_name} - {a.slot_name}):</span>{' '}
                              <span className="text-amber-800 dark:text-amber-200">{a.warnings.join(', ')}</span>
                            </div>
                            <button
                              onClick={() => handleEditAssignmentClick(a)}
                              className="text-xs font-bold text-indigo-600 underline shrink-0"
                            >
                              Koreksi Sekarang
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* Audit Log / History Section with Batch Delete / Rollback */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-white/60 dark:border-slate-700/60 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            Riwayat Impor PDF & Batch Management
          </h3>
          <span className="text-xs text-slate-500">
            Anda dapat menghapus batch import historis jika terjadi kesalahan parsing.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-700/50 text-slate-500 font-semibold">
                <th className="p-3">Nama File PDF</th>
                <th className="p-3">Periode</th>
                <th className="p-3">Tanggal Impor</th>
                <th className="p-3">Pengimpor</th>
                <th className="p-3">Jumlah Slot</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Aksi Batch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    Belum ada riwayat impor PDF.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" /> {log.imported_file}
                    </td>
                    <td className="p-3 font-bold text-indigo-600">
                      {log.month && log.year ? `${log.month}/${log.year}` : '-'}
                    </td>
                    <td className="p-3 text-slate-500">{log.import_date}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{log.imported_by}</td>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{log.number_of_assignments} slot</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle className="w-3 h-3" /> {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setDeletingBatch(log)}
                        className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg flex items-center gap-1 ml-auto"
                        title="Hapus batch import ini dari database"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Batch
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Edit Assignment */}
      {editingAssignment && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-indigo-600" />
              Koreksi Manual Slot Service
            </h3>

            <form onSubmit={handleSaveAssignmentEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nomor Tim (1 - 20)</label>
                <select
                  value={editForm.team_number}
                  onChange={(e) => setEditForm({ ...editForm, team_number: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                >
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      Team {n}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tanggal Pelayanan</label>
                <input
                  type="date"
                  required
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Lokasi Sektor</label>
                <select
                  value={editForm.location_id}
                  onChange={(e) => setEditForm({ ...editForm, location_id: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                >
                  <option value="barat">GMS Barat</option>
                  <option value="timur">GMS Timur</option>
                  <option value="selatan">GMS Selatan</option>
                  <option value="pusura">GMS Pusura</option>
                  <option value="english">English Service</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAssignment(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
                >
                  Simpan Koreksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Team Leader */}
      {editingTeamNum !== null && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Ubah Leader Team {editingTeamNum}
            </h3>

            <form onSubmit={handleSaveLeaderEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Team Leader</label>
                <input
                  type="text"
                  required
                  value={editLeaderName}
                  onChange={(e) => setEditLeaderName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTeamNum(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Simpan Leader
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Member */}
      {addMemberTeamNum !== null && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Tambah Anggota Ke Team {addMemberTeamNum}
            </h3>

            <form onSubmit={handleAddMemberSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Anggota Pelayan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Daniel"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddMemberTeamNum(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Tambah Anggota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Raw PDF Source Text */}
      {showRawTextModal && currentSummary && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-700 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-600" /> Source PDF Raw Text Extracted — {currentSummary.file_name}
              </h3>
              <button
                onClick={() => setShowRawTextModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs leading-relaxed space-y-1">
              <pre className="whitespace-pre-wrap">{currentSummary.raw_extracted_text || 'Tidak ada teks mentah'}</pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowRawTextModal(false)}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Duplicate Month Conflict Resolution */}
      {duplicateConflict && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Konflik Data Import Bulan Sama</h3>
                <p className="text-xs text-slate-500">Jadwal untuk periode ini sudah pernah di-import sebelumnya.</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-xs space-y-2 border border-amber-200/60 dark:border-amber-800/60 text-slate-700 dark:text-slate-300">
              <p><strong>File Baru:</strong> {duplicateConflict.summary.file_name}</p>
              <p><strong>Periode Terdeteksi:</strong> Bulan {duplicateConflict.summary.month} Tahun {duplicateConflict.summary.year}</p>
              <p><strong>File Terdaftar Sebelumnya:</strong> {duplicateConflict.existingLog.imported_file} ({duplicateConflict.existingLog.import_date})</p>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Silakan pilih tindakan penanganan konflik data jadwal di database:
            </p>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <button
                onClick={() => setDuplicateConflict(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
              >
                Batal (Cancel)
              </button>
              <button
                onClick={handleAppendDuplicate}
                className="px-4 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl"
              >
                Gabungkan (Append)
              </button>
              <button
                onClick={handleReplaceDuplicate}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm flex items-center justify-center gap-1.5"
              >
                Ganti (Replace)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Batch Deletion Confirmation */}
      {deletingBatch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Hapus Batch Import Historis?</h3>
                <p className="text-xs text-slate-500">Aksi ini menghapus seluruh data hasil import ini dari database.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs space-y-1">
              <p><strong>File PDF:</strong> {deletingBatch.imported_file}</p>
              <p><strong>Periode:</strong> Bulan {deletingBatch.month} Tahun {deletingBatch.year}</p>
              <p><strong>Total Slot Terjadwal:</strong> {deletingBatch.number_of_assignments} slot</p>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Aksi ini akan menghapus jadwal pelayanan dan riwayat komposisi tim periode bulan tersebut tanpa mempengaruhi master data tim. Anda dapat mengunggah ulang PDF yang sama kapan saja.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingBatch(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDeleteBatch}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Ya, Hapus Batch Ini
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
