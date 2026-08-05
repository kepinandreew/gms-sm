import React, { useState } from 'react';
import { Sparkles, CheckCircle2, Award, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';
import { Team, Schedule, Assignment, TeamAvailability, SchedulerSettings } from '../types';
import { getServiceWeekendsInMonth, getMonthName } from '../engine/dateUtils';
import { generateMonthlySchedule } from '../engine/scheduler';
import { SERVICE_SLOTS } from '../data/locationsAndSlots';

import { store } from '../db/store';

interface GenerateViewProps {
  selectedMonth: number;
  selectedYear: number;
  teams: Team[];
  availabilities: TeamAvailability[];
  pastAssignments: Assignment[];
  settings: SchedulerSettings;
  existingSchedule: Schedule | undefined;
  onSaveScheduleResult: (schedule: Schedule, assignments: Assignment[]) => void;
  onNavigate: (route: any) => void;
}

export const GenerateView: React.FC<GenerateViewProps> = ({
  selectedMonth,
  selectedYear,
  teams,
  availabilities,
  pastAssignments,
  settings,
  existingSchedule,
  onSaveScheduleResult,
  onNavigate,
}) => {
  const activeTeams = teams.filter((t) => t.status === 'active');
  const weekends = getServiceWeekendsInMonth(selectedMonth, selectedYear);
  const regularSlotsCount = weekends.length * SERVICE_SLOTS.length;

  const activeSpecialServices = store
    .getSpecialServices(selectedMonth, selectedYear)
    .filter((s) => s.status === 'active');

  let specialSlotsCount = 0;
  activeSpecialServices.forEach((s) => {
    s.slots.forEach((slot) => {
      specialSlotsCount += slot.teams_required || 1;
    });
  });

  const monthName = getMonthName(selectedMonth);

  const baseQuota = Math.floor(regularSlotsCount / (activeTeams.length || 1));
  const remainder = regularSlotsCount % (activeTeams.length || 1);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const [lastGeneratedSchedule, setLastGeneratedSchedule] = useState<Schedule | null>(
    existingSchedule || null
  );

  const [conflictReport, setConflictReport] = useState<any | null>(null);

  const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
  const prevMonthName = getMonthName(prevMonth);
  const prevSchedule = store.getScheduleByMonthYear(prevMonth, prevYear);
  const isPrevFinalized = prevSchedule?.status === 'finalized';
  const isTargetFinalized = existingSchedule?.status === 'finalized';

  const handleRunGenerator = async () => {
    if (isTargetFinalized) {
      setGenerationLogs([`❌ Error: Jadwal ${monthName} ${selectedYear} sudah difinalisasi (Read-Only).`]);
      return;
    }

    if (!isPrevFinalized) {
      setGenerationLogs([
        `❌ Error: ${prevMonthName} ${prevYear} belum difinalisasi. Silakan Finalize jadwal ${prevMonthName} terlebih dahulu agar histori yang digunakan sudah benar.`,
      ]);
      return;
    }

    setIsGenerating(true);
    setConflictReport(null);
    setGenerationLogs(['Mempersiapkan parameter & pembersihan jadwal...']);

    try {
      // 1. CLEAR existing schedule for this month/year first sequentially & verify Supabase is empty
      setGenerationLogs((prev) => [
        ...prev,
        `Menghapus jadwal lama (${monthName} ${selectedYear}) dari Supabase & memori...`,
      ]);

      const clearRes = await store.clearScheduleForMonth(selectedMonth, selectedYear);
      if (!clearRes.success) {
        setGenerationLogs((prev) => [
          ...prev,
          `❌ Gagal membersihkan jadwal lama dari Supabase: ${clearRes.error}`,
          `Proses pembuatan jadwal dibatalkan untuk mencegah duplikasi data.`,
        ]);
        setIsGenerating(false);
        return;
      }

      setGenerationLogs((prev) => [
        ...prev,
        `✓ Database Supabase terverifikasi bersih (jadwal & penugasan lama dihapus).`,
        `Memulai kalkulasi optimasi jadwal otomatis...`,
      ]);

      await new Promise((resolve) => setTimeout(resolve, 300));

      // 2. GENERATE new monthly schedule
      const result = generateMonthlySchedule({
        month: selectedMonth,
        year: selectedYear,
        teams,
        availabilities,
        pastAssignments,
        settings,
        existingSchedule: undefined,
      });

      setGenerationLogs((prev) => [...prev, ...result.logs]);
      setLastGeneratedSchedule(result.schedule);
      if (result.hasConflict && result.conflictReport) {
        setConflictReport(result.conflictReport);
      }

      // 3. SAVE new schedule & assignments sequentially to Supabase
      setGenerationLogs((prev) => [...prev, `Menyimpan jadwal & penugasan baru ke Supabase...`]);

      const saveRes = await store.saveScheduleAndAssignments(result.schedule, result.assignments);
      if (!saveRes.success) {
        setGenerationLogs((prev) => [
          ...prev,
          `❌ Gagal menyimpan jadwal baru ke Supabase: ${saveRes.error}`,
        ]);
        setIsGenerating(false);
        return;
      }

      setGenerationLogs((prev) => [...prev, `✓ Jadwal & Penugasan baru berhasil disimpan ke Supabase!`]);
      onSaveScheduleResult(result.schedule, result.assignments);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setGenerationLogs((prev) => [...prev, `❌ Error: ${errorMessage}`]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto text-slate-100">
      {/* Header Banner */}
      <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl text-white shadow-xl space-y-3 border border-white/10">
        <div className="inline-flex items-center space-x-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
          <Cpu className="w-3.5 h-3.5" />
          <span>Automated Constraint Optimization Engine</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Generate Monthly Schedule ({monthName} {selectedYear})
        </h1>
        <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
          Algoritma akan menghitung target presisi kuota pelayanan per tim, mengecek ketersediaan (availability),
          serta mengoptimalkan rotasi lokasi dan jam ibadah secara otomatis tanpa menggunakan pure random logic.
        </p>
      </div>

      {/* Configuration & Targets Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-lg space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Service Weekend</span>
          <p className="text-2xl font-extrabold text-white">{weekends.length} Weekend</p>
          <p className="text-xs text-slate-400">{regularSlotsCount} Regular Slot (+ {activeSpecialServices.length} Special Service)</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-lg space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Teams</span>
          <p className="text-2xl font-extrabold text-white">{activeTeams.length} Tim</p>
          <p className="text-xs text-slate-400">Siap Masuk Ke Dalam Engine</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-lg space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Ideal / Tim</span>
          <p className="text-2xl font-extrabold text-indigo-400">
            {baseQuota} {remainder > 0 ? `s/d ${baseQuota + 1}` : ''} Kali
          </p>
          <p className="text-xs text-slate-400">
            {remainder > 0 ? `${remainder} tim akan dapat ${baseQuota + 1} pelayanan` : 'Sangat Presisi Seimbang'}
          </p>
        </div>
      </div>

      {/* Run Generator Main Button / Protection for August */}
      {selectedMonth === 8 && selectedYear === 2026 ? (
        <div className="bg-amber-500/10 backdrop-blur-xl p-8 rounded-3xl border border-amber-500/20 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="max-w-xl mx-auto space-y-2">
            <h2 className="text-xl font-extrabold text-amber-200">
              August 2026 Adalah Jadwal Historis PDF Baseline
            </h2>
            <p className="text-xs text-amber-300/80 leading-relaxed">
              Sesuai aturan sistem, jadwal August 2026 berasal dari PDF resmi yang di-upload dan tidak boleh
              di-generate ulang oleh algoritma otomatis. Silakan manfaatkan menu <strong>PDF Import</strong> untuk
              meng-upload PDF August 2026 sebagai baseline histori.
            </p>
          </div>
          <button
            onClick={() => onNavigate('import_pdf')}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer border border-amber-400/20 inline-flex items-center space-x-2"
          >
            <span>Buka PDF Import August 2026</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-lg text-center space-y-5">
          {/* Target Month Finalized Warning Banner */}
          {isTargetFinalized && (
            <div className="max-w-xl mx-auto p-4 bg-amber-500/15 border border-amber-500/30 rounded-2xl text-left space-y-2">
              <div className="flex items-center space-x-2 text-amber-200 font-extrabold text-sm">
                <span>🔒 Jadwal {monthName} {selectedYear} Sudah Difinalisasi (Read-Only)</span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                Jadwal bulan ini sudah berada dalam status <strong>FINALIZED</strong>. Untuk melakukan penjelajahan/re-generate ulang,
                batalkan status finalisasi (Re-open) terlebih dahulu di halaman Matriks Jadwal.
              </p>
            </div>
          )}

          {/* Previous Month Unfinalized Warning Banner */}
          {!isTargetFinalized && !isPrevFinalized && (
            <div className="max-w-xl mx-auto p-4 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-left space-y-2">
              <div className="flex items-center space-x-2 text-rose-300 font-extrabold text-sm">
                <span>⚠️ Finalisasi {prevMonthName} {prevYear} Diperlukan</span>
              </div>
              <p className="text-xs text-rose-200/90 leading-relaxed">
                Sistem mewajibkan bulan sebelumnya (<strong>{prevMonthName} {prevYear}</strong>) di-finalize terlebih dahulu.
                Penyesuaian manual/swap yang dilakukan admin di {prevMonthName} baru menjadi acuan histori resmi setelah difinalisasi.
              </p>
              <button
                onClick={() => onNavigate('schedule')}
                className="mt-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer inline-flex items-center space-x-2"
              >
                <span>Buka Jadwal {prevMonthName} {prevYear} untuk Finalize</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-bold text-white">Jalankan Penjadwalan Otomatis</h2>
            <p className="text-xs text-slate-400">
              Algoritma akan mengeksekusi 50 iterasi heuristic constraint-satisfaction untuk menemukan kombinasi
              jadwal dengan Quality Score tertinggi.
            </p>
          </div>

          <button
            onClick={handleRunGenerator}
            disabled={isGenerating || isTargetFinalized || !isPrevFinalized}
            className={`px-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-indigo-600/30 border border-indigo-400/30 transition transform active:scale-98 flex items-center justify-center space-x-3 mx-auto cursor-pointer ${
              isGenerating || isTargetFinalized || !isPrevFinalized ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Sparkles className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Menghitung Kombinasi Optimal...' : 'Jalankan Scheduling Algorithm'}</span>
          </button>

          {/* Conflict Report Banner if Hard Constraints cannot be met */}
          {conflictReport && (
            <div className="max-w-xl mx-auto p-5 bg-rose-500/10 backdrop-blur-md border border-rose-500/30 rounded-2xl text-left space-y-3">
              <div className="flex items-center space-x-2 text-rose-300 font-extrabold text-sm">
                <span>⚠️ {conflictReport.message}</span>
              </div>
              <p className="text-xs text-rose-200/90 leading-relaxed">
                Algoritma menolak memaksa penugasan tidak sah demi mematuhi Hard Constraints secara 100%.
              </p>
              <div className="space-y-1 pt-1">
                <span className="text-[11px] font-bold text-rose-300 uppercase">Rincian Slot / Rules Terblokir:</span>
                <ul className="list-disc list-inside text-[11px] text-rose-200/80 space-y-1">
                  {conflictReport.blockedDetails.map((detail: string, i: number) => (
                    <li key={i}>{detail}</li>
                  ))}
                </ul>
              </div>
              <div className="pt-2 flex items-center space-x-2">
                <button
                  onClick={() => onNavigate('availability')}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  Tinjau Ketersediaan Tim
                </button>
              </div>
            </div>
          )}
          {generationLogs.length > 0 && (
            <div className="max-w-xl mx-auto p-4 bg-slate-950/80 backdrop-blur-md border border-white/10 text-slate-200 rounded-2xl text-left text-xs font-mono space-y-1 max-h-48 overflow-y-auto">
              {generationLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">
                  <span className="text-indigo-400 font-bold">&gt;</span> {log}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Generated Results Breakdown */}
      {lastGeneratedSchedule && (
        <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-lg space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold text-xl">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Hasil Penjadwalan Bulanan</h2>
                <p className="text-xs text-slate-400">Schedule Quality Score & Metrics Breakdown</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Quality Score</span>
                <p className="text-2xl font-extrabold text-emerald-400">
                  {lastGeneratedSchedule.quality_score} / 100
                </p>
              </div>

              <button
                onClick={() => onNavigate('schedule')}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 border border-indigo-400/20 transition flex items-center space-x-2 cursor-pointer"
              >
                <span>Buka Matriks Jadwal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Monthly Balance</span>
              <p className="font-extrabold text-white text-base">
                {lastGeneratedSchedule.fairness_metrics.monthly_balance_score}%
              </p>
            </div>

            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Long-Term Balance</span>
              <p className="font-extrabold text-white text-base">
                {lastGeneratedSchedule.fairness_metrics.longterm_balance_score}%
              </p>
            </div>

            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Location Rotation</span>
              <p className="font-extrabold text-white text-base">
                {lastGeneratedSchedule.fairness_metrics.location_rotation_score}%
              </p>
            </div>

            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Slot Rotation</span>
              <p className="font-extrabold text-white text-base">
                {lastGeneratedSchedule.fairness_metrics.slot_rotation_score}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
