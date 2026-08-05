import React from 'react';
import {
  Users,
  CalendarCheck,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  CalendarDays,
  ChevronRight,
  Award,
} from 'lucide-react';
import { Team, Schedule, Assignment } from '../types';
import { getServiceWeekendsInMonth, getMonthName, formatNiceDate } from '../engine/dateUtils';
import { SERVICE_SLOTS, SERVICE_LOCATIONS } from '../data/locationsAndSlots';

interface DashboardViewProps {
  selectedMonth: number;
  selectedYear: number;
  teams: Team[];
  schedule: Schedule | undefined;
  assignments: Assignment[];
  onNavigate: (route: any) => void;
  onGenerateClick: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  selectedMonth,
  selectedYear,
  teams,
  schedule,
  assignments,
  onNavigate,
  onGenerateClick,
}) => {
  const activeTeams = teams.filter((t) => t.status === 'active');
  const weekends = getServiceWeekendsInMonth(selectedMonth, selectedYear);
  const totalRequiredAssignments = weekends.length * SERVICE_SLOTS.length;

  const monthName = getMonthName(selectedMonth);
  const completionPercentage = schedule
    ? Math.round((assignments.length / totalRequiredAssignments) * 100)
    : 0;

  // Compute team assignment counts for current schedule
  const teamAssignmentCounts: Record<string, number> = {};
  activeTeams.forEach((t) => (teamAssignmentCounts[t.id] = 0));
  assignments.forEach((a) => {
    if (teamAssignmentCounts[a.team_id] !== undefined) {
      teamAssignmentCounts[a.team_id]++;
    }
  });

  const countValues = Object.values(teamAssignmentCounts);
  const minCount = countValues.length > 0 ? Math.min(...countValues) : 0;
  const maxCount = countValues.length > 0 ? Math.max(...countValues) : 0;

  // Distribution summary
  const distributionGrouped: Record<number, number> = {};
  countValues.forEach((c) => {
    distributionGrouped[c] = (distributionGrouped[c] || 0) + 1;
  });

  const nextUpcomingWeekend = weekends[0];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Top Banner */}
      <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden border border-white/10">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>GMS Service Team Scheduler</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Jadwal Pelayanan {monthName} {selectedYear}
            </h1>
            <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
              Sistem penjadwalan otomatis berbasis algoritma fairness global, rotasi lokasi, dan rotasi slot ibadah
              sesuai data histori.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('simulator')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-slate-100 border border-white/15 font-semibold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer backdrop-blur-md"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Test Simulator</span>
            </button>

            <button
              onClick={onGenerateClick}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 border border-indigo-400/30 transition flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Schedule</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Teams Card */}
        <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Tim Pelayanan</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">{teams.length}</span>
            <span className="text-xs font-semibold text-emerald-400">({activeTeams.length} Aktif)</span>
          </div>
          <p className="text-xs text-slate-400">Mendukung jumlah tim dinamis</p>
        </div>

        {/* Total Assignments Card */}
        <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Slot Pelayanan</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">{assignments.length}</span>
            <span className="text-xs text-slate-400">/ {totalRequiredAssignments} slot</span>
          </div>
          <p className="text-xs text-slate-400">{weekends.length} Service Weekend bulan ini</p>
        </div>

        {/* Monthly Fairness Score */}
        <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Fairness Quality Score</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">
              {schedule ? schedule.quality_score : 0}%
            </span>
            <span className="text-xs font-semibold text-emerald-400">
              {schedule?.quality_score && schedule.quality_score >= 90 ? 'Perfect' : 'Good'}
            </span>
          </div>
          <p className="text-xs text-slate-400">Target per tim: {minCount} s/d {maxCount} kali</p>
        </div>

        {/* Schedule Status */}
        <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Status Jadwal</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold uppercase text-white">
              {schedule ? schedule.status : 'Draft'}
            </span>
          </div>
          <p className="text-xs text-slate-400">Kelengkapan: {completionPercentage}% Terisi</p>
        </div>
      </div>

      {/* Main Grid: Upcoming Weekend & Monthly Fairness Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Service Equality Breakdown Box */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="font-bold text-base text-white">Distribusi Fairness Pelayanan Bulan Ini</h2>
              <p className="text-xs text-slate-400">
                Laporan pemerataan jumlah pelayanan antar tim ({monthName} {selectedYear})
              </p>
            </div>
            <button
              onClick={() => onNavigate('schedule')}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Jadwal Lengkap</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Status Equality</span>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-white text-sm">
                  {maxCount - minCount <= 1
                    ? 'Perfect Monthly Equality (Max - Min <= 1)'
                    : 'Pemerataan Cukup Seimbang'}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Seluruh tim aktif mendapatkan alokasi antara <strong className="text-white">{minCount}</strong> hingga{' '}
                <strong className="text-white">{maxCount}</strong> kali pelayanan dalam bulan ini.
              </p>
            </div>

            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ringkasan Distribusi</span>
              <div className="space-y-1.5 pt-1">
                {Object.entries(distributionGrouped).map(([services, numTeams]) => (
                  <div key={services} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">
                      {numTeams} Tim mendapatkan:
                    </span>
                    <span className="font-bold text-indigo-300 px-2 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20">
                      {services} Kali Pelayanan
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Schedule Navigation */}
          <div className="pt-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">
              Daftar Service Weekend ({weekends.length} Weekend)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
              {weekends.map((w, idx) => {
                const weekendAsgns = assignments.filter((a) => a.weekend_id === w.id);
                return (
                  <div
                    key={w.id}
                    onClick={() => onNavigate('weekend')}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition cursor-pointer space-y-1"
                  >
                    <span className="text-[10px] font-bold uppercase text-slate-400">Weekend {idx + 1}</span>
                    <p className="font-bold text-xs text-white truncate">{w.label}</p>
                    <span className="text-[11px] text-emerald-400 font-medium">
                      {weekendAsgns.length} / {SERVICE_SLOTS.length} Slot
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Next Weekend Preview Card */}
        <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-lg space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-indigo-300">
              <CalendarDays className="w-5 h-5 text-indigo-400" />
              <h2 className="font-bold text-base text-white">Upcoming Weekend</h2>
            </div>

            {nextUpcomingWeekend && (
              <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  Weekend 1 ({monthName})
                </span>
                <p className="font-extrabold text-white text-sm">{nextUpcomingWeekend.label}</p>
                <p className="text-xs text-slate-300">
                  Sabtu: English Service | Minggu: Barat, Timur, Selatan, Pusura
                </p>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Alokasi Tim Weekend Ini:
              </h3>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {SERVICE_SLOTS.map((slot) => {
                  const location = SERVICE_LOCATIONS.find((l) => l.id === slot.location_id);
                  const asgn = assignments.find(
                    (a) => a.weekend_id === nextUpcomingWeekend?.id && a.slot_id === slot.id
                  );
                  const team = teams.find((t) => t.id === asgn?.team_id);

                  return (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between text-xs p-2 bg-white/5 rounded-lg border border-white/10"
                    >
                      <span className="font-medium text-slate-300 truncate max-w-[140px]">
                        {slot.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 font-bold rounded text-[11px] ${
                          team
                            ? 'bg-indigo-500/20 text-white border border-indigo-500/30'
                            : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        {team ? team.name : 'Kosong'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('weekend')}
            className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl transition cursor-pointer text-center border border-white/10"
          >
            Buka Detailed Weekend View
          </button>
        </div>
      </div>
    </div>
  );
};
