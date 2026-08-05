import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Sparkles,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  FileText,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  AlertTriangle,
  Info,
  Edit2,
  ShieldAlert,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { store } from '../db/store';
import {
  ServiceDirector,
  SDAssignment,
  SDSchedule,
  DayOfWeek,
  SpecialService,
} from '../types';
import { getServiceWeekendsInMonth, getMonthName } from '../engine/dateUtils';
import {
  generateRemainingSDAssignments,
  checkSDRuleCompatibility,
  validateSDScheduleNoWeekendConflict,
} from '../engine/sdScheduler';
import { OfficialPdfScheduleModal } from '../components/OfficialPdfScheduleModal';

interface JadwalServiceDirectorViewProps {
  selectedMonth?: number;
  selectedYear?: number;
  onNavigateToMasterData?: () => void;
}

// 9 Standard Slots for SD
const SLOTS_MATRIX = [
  { id: 'barat-u1', location_id: 'barat' as const, day: 'SUNDAY' as DayOfWeek, name: 'Barat U1', color: 'bg-blue-600 text-white' },
  { id: 'barat-u2-u3', location_id: 'barat' as const, day: 'SUNDAY' as DayOfWeek, name: 'Barat U2-3', color: 'bg-blue-600 text-white' },
  { id: 'barat-u4-u5', location_id: 'barat' as const, day: 'SUNDAY' as DayOfWeek, name: 'Barat U4-5', color: 'bg-blue-600 text-white' },

  { id: 'timur-u1', location_id: 'timur' as const, day: 'SUNDAY' as DayOfWeek, name: 'Timur U1', color: 'bg-emerald-600 text-white' },
  { id: 'timur-u2-u3', location_id: 'timur' as const, day: 'SUNDAY' as DayOfWeek, name: 'Timur U2-3', color: 'bg-emerald-600 text-white' },
  { id: 'timur-u4-u5', location_id: 'timur' as const, day: 'SUNDAY' as DayOfWeek, name: 'Timur U4-5', color: 'bg-emerald-600 text-white' },

  { id: 'selatan-u1-u2', location_id: 'selatan' as const, day: 'SUNDAY' as DayOfWeek, name: 'Selatan U1-2', color: 'bg-orange-600 text-white' },
  { id: 'selatan-u3-4', location_id: 'selatan' as const, day: 'SUNDAY' as DayOfWeek, name: 'Selatan U3-4', color: 'bg-orange-600 text-white' },

  { id: 'pusura-u1-u2', location_id: 'pusura' as const, day: 'SUNDAY' as DayOfWeek, name: 'Pusura U1-2', color: 'bg-purple-600 text-white' },
];

export const JadwalServiceDirectorView: React.FC<JadwalServiceDirectorViewProps> = ({
  selectedMonth: propsSelectedMonth,
  selectedYear: propsSelectedYear,
  onNavigateToMasterData,
}) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(propsSelectedMonth || (currentDate.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<number>(propsSelectedYear || currentDate.getFullYear());

  useEffect(() => {
    if (propsSelectedMonth) setSelectedMonth(propsSelectedMonth);
    if (propsSelectedYear) setSelectedYear(propsSelectedYear);
  }, [propsSelectedMonth, propsSelectedYear]);

  const [directors, setDirectors] = useState<ServiceDirector[]>([]);
  const [schedule, setSchedule] = useState<SDSchedule | undefined>();
  const [assignments, setAssignments] = useState<SDAssignment[]>([]);

  // Modals
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);

  // Manual Assignment Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [activeSlotTarget, setActiveSlotTarget] = useState<{
    weekendId: string;
    serviceDate: string;
    locationId: 'barat' | 'timur' | 'selatan' | 'pusura';
    slotId: string;
    slotName: string;
    day: DayOfWeek;
    currentSDId?: string;
  } | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = () => {
    const sds = store.getServiceDirectors();
    const sched = store.getSDScheduleByMonthYear(selectedMonth, selectedYear);
    const asgns = store.getSDAssignmentsForMonth(selectedMonth, selectedYear);

    setDirectors(sds);
    setSchedule(sched);
    setAssignments(asgns);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = store.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [selectedMonth, selectedYear]);

  const weekends = getServiceWeekendsInMonth(selectedMonth, selectedYear);

  // Stats calculation
  const totalSlotsCount = weekends.length * SLOTS_MATRIX.length;
  const filledSlotsCount = assignments.length;
  const lockedSlotsCount = assignments.filter((a) => a.locked).length;
  const emptySlotsCount = Math.max(0, totalSlotsCount - filledSlotsCount);

  // Action: Generate Remaining SD
  const handleGenerateRemaining = () => {
    const result = generateRemainingSDAssignments({
      month: selectedMonth,
      year: selectedYear,
      directors,
      existingAssignments: assignments,
    });

    // Validation check before saving
    const validationErrors = validateSDScheduleNoWeekendConflict(
      result.assignments,
      directors,
      weekends.map((w, idx) => ({ id: w.id, weekend_number: idx + 1 }))
    );

    if (validationErrors.length > 0) {
      showToast(validationErrors[0].message, 'error');
      setGenerationLogs([...result.logs, `[ERROR VALIDASI] ${validationErrors[0].message}`]);
      setLogsModalOpen(true);
      return;
    }

    store.saveSDSchedule(result.schedule);
    store.saveSDAssignmentsForSchedule(result.schedule.id, result.assignments);

    setGenerationLogs(result.logs);
    setLogsModalOpen(true);
    showToast(`Penjadwalan otomatis SD selesai! ${result.totalFilled} slot terisi.`);
    loadData();
  };

  // Action: Finalize or Reopen Schedule
  const handleToggleFinalize = () => {
    const validationErrors = validateSDScheduleNoWeekendConflict(
      assignments,
      directors,
      weekends.map((w, idx) => ({ id: w.id, weekend_number: idx + 1 }))
    );

    if (validationErrors.length > 0) {
      showToast(validationErrors[0].message, 'error');
      return;
    }

    if (!schedule) {
      const newSched: SDSchedule = {
        id: `sd-sched-${selectedYear}-${selectedMonth}`,
        month: selectedMonth,
        year: selectedYear,
        status: 'finalized',
        created_at: new Date().toISOString(),
        finalized_at: new Date().toISOString(),
      };
      store.saveSDSchedule(newSched);
      showToast('Jadwal Service Director resmi DIFINALISASI.');
    } else {
      const nextStatus = schedule.status === 'finalized' ? 'draft' : 'finalized';
      store.saveSDSchedule({
        ...schedule,
        status: nextStatus,
        finalized_at: nextStatus === 'finalized' ? new Date().toISOString() : undefined,
      });
      showToast(`Status jadwal SD diubah menjadi ${nextStatus.toUpperCase()}.`);
    }
    loadData();
  };

  // Action: Clear Unlocked SDs
  const handleClearUnlocked = () => {
    if (
      !confirm(
        'Konfirmasi Bersihkan Tugas SD Unlocked:\n\n' +
        'Apakah Anda yakin ingin menghapus semua tugas SD yang TIDAK DILOCK?\n\n' +
        '• Tugas SD yang di-LOCK / manual tetap aman.\n' +
        '• Perubahan akan langsung disimpan dan UI diperbarui secara real-time.'
      )
    ) {
      return;
    }

    const { clearedCount } = store.clearUnlockedSDAssignments(selectedMonth, selectedYear);
    loadData();

    if (clearedCount === 0) {
      showToast('No unlocked SD assignments to clear.', 'error');
    } else {
      showToast(`Berhasil membersihkan ${clearedCount} tugas SD unlocked.`);
    }
  };

  // Action: Clear ALL SD Schedule
  const handleClearAll = () => {
    if (
      !confirm(
        'PERINGATAN: Clear ALL SD Schedule\n\n' +
        'Apakah Anda yakin ingin menghapus SELURUH tugas SD (termasuk tugas manual & locked) untuk bulan ini?\n\n' +
        'Tindakan ini tidak dapat dibatalkan.'
      )
    ) {
      return;
    }

    const { clearedCount } = store.clearAllSDAssignments(selectedMonth, selectedYear);
    loadData();

    if (clearedCount === 0) {
      showToast('Tidak ada tugas SD yang dapat dihapus.', 'error');
    } else {
      showToast(`Semua ${clearedCount} tugas SD berhasil dibersihkan.`);
    }
  };

  // Open Manual Assign Modal
  const handleOpenAssignModal = (
    weekendId: string,
    serviceDate: string,
    locationId: 'barat' | 'timur' | 'selatan' | 'pusura',
    slotId: string,
    slotName: string,
    day: DayOfWeek,
    currentSDId?: string
  ) => {
    setActiveSlotTarget({
      weekendId,
      serviceDate,
      locationId,
      slotId,
      slotName,
      day,
      currentSDId,
    });
    setAssignModalOpen(true);
  };

  // Manual Assign SD
  const handleSelectSD = (sdId: string) => {
    if (!activeSlotTarget) return;

    // Check Weekend Conflict rule: One SD per weekend
    const existingWeekendAsgn = assignments.find(
      (a) => a.weekend_id === activeSlotTarget.weekendId && a.sd_id === sdId && a.slot_id !== activeSlotTarget.slotId
    );

    if (existingWeekendAsgn) {
      const chosenSD = directors.find((d) => d.id === sdId);
      const sdName = chosenSD ? chosenSD.name : 'Service Director';
      const wkIndex = weekends.findIndex((w) => w.id === activeSlotTarget.weekendId);
      const wkNum = wkIndex !== -1 ? wkIndex + 1 : 1;

      showToast(
        `Service Director '${sdName}' sudah ditugaskan pada Weekend ${wkNum}. Satu SD hanya boleh memiliki satu assignment per weekend.`,
        'error'
      );
      return;
    }

    store.assignSDToSlot({
      month: selectedMonth,
      year: selectedYear,
      weekend_id: activeSlotTarget.weekendId,
      service_date: activeSlotTarget.serviceDate,
      location_id: activeSlotTarget.locationId,
      slot_id: activeSlotTarget.slotId,
      sd_id: sdId,
      locked: true,
    });

    const chosenSD = directors.find((d) => d.id === sdId);
    showToast(`SD "${chosenSD?.name || 'Director'}" berhasil ditugaskan & di-LOCK pada ${activeSlotTarget.slotName}.`);
    setAssignModalOpen(false);
    loadData();
  };

  // Remove SD from slot
  const handleRemoveAssignment = () => {
    if (!activeSlotTarget) return;

    store.removeSDAssignmentFromSlot(
      selectedMonth,
      selectedYear,
      activeSlotTarget.weekendId,
      activeSlotTarget.slotId
    );

    showToast(`Tugas SD di slot ${activeSlotTarget.slotName} berhasil dikosongkan.`);
    setAssignModalOpen(false);
    loadData();
  };

  // Toggle Lock state for an assignment
  const handleToggleLock = (asgnId: string, currentLocked: boolean) => {
    store.updateSDAssignment(asgnId, { locked: !currentLocked });
    showToast(`Status lock tugas SD berhasil diubah.`);
    loadData();
  };

  // Month Navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[999] px-4 py-3 rounded-xl shadow-2xl border text-sm font-bold flex items-center gap-2 animate-bounce ${
            toast.type === 'error'
              ? 'bg-rose-950 text-rose-200 border-rose-800'
              : 'bg-emerald-950 text-emerald-200 border-emerald-800'
          }`}
        >
          {toast.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Jadwal Service Director (SD)
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                schedule?.status === 'finalized'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
              }`}
            >
              {schedule?.status ? schedule.status.toUpperCase() : 'DRAFT'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Atur dan jadwalkan Service Director independen. Penugasan manual sebagai metode utama, dilanjutkan penjadwalan otomatis untuk slot kosong.
          </p>
        </div>

        {/* Month Selector & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              {getMonthName(selectedMonth)} {selectedYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleGenerateRemaining}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>Generate Remaining SD</span>
          </button>

          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-slate-300" />
            <span>Cetak Official PDF</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Slot SD</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">{totalSlotsCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Slot Terisi</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{filledSlotsCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Slot Locked / Manual</p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{lockedSlotsCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Slot Belum Terisi</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{emptySlotsCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar Actions */}
      <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          <Info className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>Setiap penugasan manual SD secara otomatis di-<strong>LOCK</strong> agar tidak tergeser saat auto-generate.</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleClearUnlocked}
            className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950 dark:hover:bg-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Clear SD Unlocked
          </button>

          <button
            onClick={handleClearAll}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white border border-rose-700 text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
          >
            Clear ALL SD Schedule
          </button>

          <button
            onClick={handleToggleFinalize}
            className={`px-4 py-1.5 text-xs font-bold rounded-xl transition border cursor-pointer ${
              schedule?.status === 'finalized'
                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700'
            }`}
          >
            {schedule?.status === 'finalized' ? 'Buka Kembali (Draft)' : 'Finalisasi Jadwal SD'}
          </button>

          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer border border-rose-400/30"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Cetak / Export PDF SD</span>
          </button>
        </div>
      </div>

      {/* Main Schedule Matrix per Weekend */}
      <div className="space-y-6">
        {weekends.map((w, wIdx) => {
          const sunDate = new Date(w.sunday_date);
          const sunDayNum = sunDate.getDate();

          return (
            <div
              key={w.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4"
            >
              {/* Weekend Title Header */}
              <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shadow">
                    {sunDayNum}
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                      {w.label} — {sunDayNum} {getMonthName(selectedMonth)} {selectedYear}
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Sabtu: {w.saturday_date} • Minggu: {w.sunday_date}
                    </p>
                  </div>
                </div>
              </div>

              {/* 9 Slot Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-2.5">
                {SLOTS_MATRIX.map((slot) => {
                  const serviceDate = slot.day === 'SATURDAY' ? w.saturday_date : w.sunday_date;
                  const asgn = assignments.find(
                    (a) => a.weekend_id === w.id && a.slot_id === slot.id
                  );

                  const assignedSD = asgn ? directors.find((d) => d.id === asgn.sd_id) : undefined;

                  return (
                    <div
                      key={slot.id}
                      onClick={() =>
                        handleOpenAssignModal(
                          w.id,
                          serviceDate,
                          slot.location_id,
                          slot.id,
                          slot.name,
                          slot.day,
                          assignedSD?.id
                        )
                      }
                      className={`border rounded-xl p-2.5 flex flex-col justify-between min-h-[110px] transition cursor-pointer hover:shadow-lg hover:border-indigo-400 ${
                        asgn
                          ? asgn.locked
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800'
                            : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 border-dashed hover:bg-indigo-50/30'
                      }`}
                    >
                      {/* Slot Header Badge */}
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${slot.color}`}>
                          {slot.name}
                        </span>
                        {asgn && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleLock(asgn.id, asgn.locked);
                            }}
                            title={asgn.locked ? 'Terlock (Klik untuk unlock)' : 'Tidak terlock'}
                            className="text-indigo-600 dark:text-indigo-400 hover:scale-110 transition cursor-pointer p-0.5"
                          >
                            {asgn.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5 text-slate-400" />}
                          </button>
                        )}
                      </div>

                      {/* SD Name Display */}
                      <div className="my-1 text-center">
                        {assignedSD ? (
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Service Director</span>
                            <span className="text-xs font-black text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 block truncate">
                              SD: {assignedSD.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400 italic block py-1">
                            Belum Ditentukan
                          </span>
                        )}
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() =>
                          handleOpenAssignModal(
                            w.id,
                            serviceDate,
                            slot.location_id,
                            slot.id,
                            slot.name,
                            slot.day,
                            assignedSD?.id
                          )
                        }
                        className={`w-full py-1 text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
                          assignedSD
                            ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                            : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm'
                        }`}
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                        <span>{assignedSD ? 'Ubah SD' : 'Assign SD'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ==================== MANUAL SD ASSIGNMENT PICKER MODAL ==================== */}
      {assignModalOpen && activeSlotTarget && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Pilih Service Director
                </h3>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                  Slot: {activeSlotTarget.slotName} ({activeSlotTarget.day === 'SATURDAY' ? 'Sabtu' : 'Minggu'})
                </p>
              </div>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Pilih Service Director untuk bertugas di slot ini. Penugasan manual secara otomatis mengaktifkan status <strong>LOCKED</strong>.
            </p>

            {/* List of Directors with Real-time Rule & Weekend Conflict Check */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {directors.map((sd) => {
                const isCurrent = activeSlotTarget.currentSDId === sd.id;
                const existingWeekendAsgn = assignments.find(
                  (a) => a.weekend_id === activeSlotTarget.weekendId && a.sd_id === sd.id && a.slot_id !== activeSlotTarget.slotId
                );

                const ruleCheck = checkSDRuleCompatibility({
                  sd,
                  locationId: activeSlotTarget.locationId,
                  day: activeSlotTarget.day,
                  slotId: activeSlotTarget.slotId,
                });

                const slotDef = SLOTS_MATRIX.find((s) => s.id === existingWeekendAsgn?.slot_id);
                const assignedSlotName = slotDef ? slotDef.name : existingWeekendAsgn?.slot_id;
                const isDisabled = Boolean(existingWeekendAsgn);

                return (
                  <div
                    key={sd.id}
                    onClick={() => !isDisabled && handleSelectSD(sd.id)}
                    className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                      isDisabled
                        ? 'bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-70 cursor-not-allowed'
                        : isCurrent
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/20 cursor-pointer'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs flex items-center justify-center shrink-0">
                        {sd.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100">{sd.name}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[9px] font-black rounded uppercase">
                              Saat Ini
                            </span>
                          )}
                        </div>

                        {/* Real-time Rule & Weekend Conflict Compatibility Badge */}
                        <div className="mt-1 space-y-0.5">
                          {existingWeekendAsgn ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                              ❌ Already assigned this weekend ({assignedSlotName})
                            </span>
                          ) : ruleCheck.isCompatible ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                              <ShieldCheck className="w-3 h-3" />
                              Sesuai Special Rules
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              {ruleCheck.warnings.map((w, wIdx) => (
                                <span
                                  key={wIdx}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 block"
                                >
                                  <ShieldAlert className="w-3 h-3 text-amber-500 shrink-0" />
                                  {w}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isDisabled}
                      className={`px-3 py-1.5 font-bold text-xs rounded-xl shadow shrink-0 transition ${
                        isDisabled
                          ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                      }`}
                    >
                      {isDisabled ? 'Terpakai' : 'Pilih SD'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Clear option if assigned */}
            {activeSlotTarget.currentSDId && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between">
                <button
                  onClick={handleRemoveAssignment}
                  className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950 dark:text-rose-200 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Kosongkan Tugas SD Ini
                </button>
                <button
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generation Logs Modal */}
      {logsModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                <span>Log Penjadwalan SD</span>
              </h3>
              <button onClick={() => setLogsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 text-emerald-400 font-mono text-xs p-4 rounded-xl max-h-60 overflow-y-auto space-y-1">
              {generationLogs.map((log, i) => (
                <p key={i}>&gt; {log}</p>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setLogsModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow"
              >
                Tutup & Lihat Jadwal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Combined PDF Schedule Modal */}
      {isPdfModalOpen && (
        <OfficialPdfScheduleModal
          isOpen={isPdfModalOpen}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          teams={store.getTeams()}
          assignments={store.getAssignmentsForMonth(selectedMonth, selectedYear)}
          defaultViewMode="sd_only"
          onClose={() => setIsPdfModalOpen(false)}
        />
      )}
    </div>
  );
};
