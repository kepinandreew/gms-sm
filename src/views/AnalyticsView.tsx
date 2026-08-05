import React, { useState, useMemo, useCallback } from 'react';
import { BarChart3, Filter, ShieldCheck, PieChart, TrendingUp, Calendar } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Team, Assignment, Schedule } from '../types';
import { SERVICE_LOCATIONS, SERVICE_SLOTS } from '../data/locationsAndSlots';
import { getMonthName } from '../engine/dateUtils';

interface AnalyticsViewProps {
  teams: Team[];
  assignments: Assignment[];
  schedules: Schedule[];
  selectedMonth?: number;
  selectedYear?: number;
}

export type PeriodFilter = 'THIS_MONTH' | 'LAST_3_MONTHS' | 'LAST_6_MONTHS' | 'ALL_TIME';

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  teams,
  assignments,
  schedules,
  selectedMonth = new Date().getMonth() + 1,
  selectedYear = new Date().getFullYear(),
}) => {
  const [period, setPeriod] = useState<PeriodFilter>('LAST_3_MONTHS');

  // Map schedules by ID
  const scheduleMap = useMemo(() => {
    const map = new Map<string, Schedule>();
    schedules.forEach((s) => map.set(s.id, s));
    return map;
  }, [schedules]);

  const selectedEndTotalMonths = selectedYear * 12 + (selectedMonth - 1);

  // Helper to extract month/year and calculated totalMonths index
  const getAssignmentMonthYear = useCallback(
    (a: Assignment): { month: number; year: number; totalMonths: number } => {
      let m = selectedMonth;
      let y = selectedYear;

      if (a.schedule_id && scheduleMap.has(a.schedule_id)) {
        const sched = scheduleMap.get(a.schedule_id)!;
        m = sched.month;
        y = sched.year;
      } else if (a.service_date) {
        const parts = a.service_date.split('-');
        if (parts.length >= 2) {
          y = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10);
        }
      }
      return { month: m, year: y, totalMonths: y * 12 + (m - 1) };
    },
    [scheduleMap, selectedMonth, selectedYear]
  );

  // Dynamically filter assignments based on selected period
  const { filteredAssignments, periodLabel } = useMemo(() => {
    // Deduplicate assignments by ID
    const seenIds = new Set<string>();
    const uniqueAssignments = assignments.filter((a) => {
      if (!a.id || seenIds.has(a.id)) return false;
      seenIds.add(a.id);
      return true;
    });

    let filtered: Assignment[] = [];
    let startMonths = selectedEndTotalMonths;
    let label = '';

    if (period === 'THIS_MONTH') {
      filtered = uniqueAssignments.filter(
        (a) => getAssignmentMonthYear(a).totalMonths === selectedEndTotalMonths
      );
      label = `${getMonthName(selectedMonth)} ${selectedYear}`;
    } else if (period === 'LAST_3_MONTHS') {
      startMonths = selectedEndTotalMonths - 2;
      filtered = uniqueAssignments.filter((a) => {
        const tm = getAssignmentMonthYear(a).totalMonths;
        return tm >= startMonths && tm <= selectedEndTotalMonths;
      });
      const startY = Math.floor(startMonths / 12);
      const startM = (startMonths % 12) + 1;
      label = `${getMonthName(startM)} ${startY} – ${getMonthName(selectedMonth)} ${selectedYear}`;
    } else if (period === 'LAST_6_MONTHS') {
      startMonths = selectedEndTotalMonths - 5;
      filtered = uniqueAssignments.filter((a) => {
        const tm = getAssignmentMonthYear(a).totalMonths;
        return tm >= startMonths && tm <= selectedEndTotalMonths;
      });
      const startY = Math.floor(startMonths / 12);
      const startM = (startMonths % 12) + 1;
      label = `${getMonthName(startM)} ${startY} – ${getMonthName(selectedMonth)} ${selectedYear}`;
    } else {
      // ALL_TIME
      filtered = uniqueAssignments;
      if (uniqueAssignments.length > 0) {
        let minTM = Infinity;
        let maxTM = -Infinity;
        uniqueAssignments.forEach((a) => {
          const tm = getAssignmentMonthYear(a).totalMonths;
          if (tm < minTM) minTM = tm;
          if (tm > maxTM) maxTM = tm;
        });
        const minY = Math.floor(minTM / 12);
        const minM = (minTM % 12) + 1;
        const maxY = Math.floor(maxTM / 12);
        const maxM = (maxTM % 12) + 1;
        label = `Semua Histori (${getMonthName(minM)} ${minY} – ${getMonthName(maxM)} ${maxY})`;
      } else {
        label = 'Semua Data Histori';
      }
    }

    return { filteredAssignments: filtered, periodLabel: label };
  }, [assignments, period, selectedEndTotalMonths, selectedMonth, selectedYear, getAssignmentMonthYear]);

  // Active teams list sorted by team number
  const activeTeams = useMemo(() => {
    return teams.filter((t) => t.status === 'active').sort((a, b) => a.team_number - b.team_number);
  }, [teams]);

  // 1. Services Per Team Data
  const servicesPerTeamData = useMemo(() => {
    return activeTeams.map((team) => {
      const count = filteredAssignments.filter((a) => a.team_id === team.id).length;
      return {
        teamName: team.name,
        totalServices: count,
      };
    });
  }, [activeTeams, filteredAssignments]);

  // 2. Location Distribution Per Team Data
  const locationDistData = useMemo(() => {
    return activeTeams.map((team) => {
      const teamAsgns = filteredAssignments.filter((a) => a.team_id === team.id);
      const entry: Record<string, string | number> = { teamName: team.name };

      SERVICE_LOCATIONS.forEach((loc) => {
        entry[loc.name] = teamAsgns.filter((a) => a.location_id === loc.id).length;
      });

      return entry;
    });
  }, [activeTeams, filteredAssignments]);

  // Compute workload min, max, avg
  const counts = servicesPerTeamData.map((d) => d.totalServices);
  const minCount = counts.length > 0 ? Math.min(...counts) : 0;
  const maxCount = counts.length > 0 ? Math.max(...counts) : 0;
  const avgCount =
    counts.length > 0 ? (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1) : '0';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Header & Filter */}
      <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Fairness & Service Analytics</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Analisis Pelayanan & Rotasi</h1>
          <div className="flex items-center space-x-2 mt-1">
            <p className="text-xs text-slate-400">
              Monitor pemerataan jumlah pelayanan, rotasi lokasi, dan variasi slot ibadah secara historis.
            </p>
            <span className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
              <Calendar className="w-3 h-3 mr-1" />
              {periodLabel}
            </span>
          </div>
        </div>

        {/* Filter Period Buttons */}
        <div className="flex items-center space-x-2 bg-white/5 p-1.5 rounded-xl border border-white/10">
          <Filter className="w-3.5 h-3.5 text-slate-400 ml-2" />
          {(
            [
              { id: 'THIS_MONTH', label: 'Bulan Ini' },
              { id: 'LAST_3_MONTHS', label: '3 Bulan Terakhir' },
              { id: 'LAST_6_MONTHS', label: '6 Bulan Terakhir' },
              { id: 'ALL_TIME', label: 'Semua Histori' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                period === p.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-lg space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Min Pelayanan / Tim</span>
          <p className="text-3xl font-extrabold text-white">{minCount} Kali</p>
          <p className="text-xs text-slate-400">Batas minimum seluruh tim</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-lg space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Max Pelayanan / Tim</span>
          <p className="text-3xl font-extrabold text-white">{maxCount} Kali</p>
          <p className="text-xs text-emerald-400 font-semibold">Toleransi Selisih ≤ 1</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-lg space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Rata-rata Pelayanan</span>
          <p className="text-3xl font-extrabold text-indigo-400">{avgCount} Kali</p>
          <p className="text-xs text-slate-400">Rata-rata per tim aktif</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Total Services Per Team */}
        <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-lg space-y-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-white text-base">Total Pelayanan per Tim</h2>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={servicesPerTeamData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff15" />
                <XAxis dataKey="teamName" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#ffffff20', borderRadius: '12px', color: '#fff' }} />
                <Bar dataKey="totalServices" name="Jumlah Pelayanan" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Location Distribution Stacked Bar */}
        <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-lg space-y-4">
          <div className="flex items-center space-x-2">
            <PieChart className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-white text-base">Distribusi Lokasi Pelayanan</h2>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locationDistData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff15" />
                <XAxis dataKey="teamName" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#ffffff20', borderRadius: '12px', color: '#fff' }} />
                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                <Bar dataKey="GMS Barat" stackId="a" fill="#6366f1" />
                <Bar dataKey="GMS Timur" stackId="a" fill="#10b981" />
                <Bar dataKey="GMS Selatan" stackId="a" fill="#f59e0b" />
                <Bar dataKey="GMS Pusura" stackId="a" fill="#f43f5e" />
                <Bar dataKey="English Service" stackId="a" fill="#a855f7" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
