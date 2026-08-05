import React from 'react';
import { Calendar, Sparkles, LogOut, Cloud, ShieldCheck } from 'lucide-react';
import { INDONESIAN_MONTHS } from '../engine/dateUtils';
import { Schedule } from '../types';

interface HeaderProps {
  selectedMonth: number;
  selectedYear: number;
  onMonthYearChange: (month: number, year: number) => void;
  currentSchedule?: Schedule;
  onGenerateClick: () => void;
  onResetDemoData?: () => void;
  currentUserEmail?: string | null;
  cloudSyncStatus?: 'synced' | 'syncing' | 'error' | 'offline';
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedMonth,
  selectedYear,
  onMonthYearChange,
  currentSchedule,
  onGenerateClick,
  currentUserEmail,
  cloudSyncStatus = 'synced',
  onLogout,
}) => {
  const years = [2025, 2026, 2027];

  return (
    <header className="bg-[#0f172a]/95 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 shadow-xl text-slate-200">
      <div className="flex items-center space-x-4">
        {/* Month Selector */}
        <div className="flex items-center space-x-2 bg-white/5 p-1.5 rounded-xl border border-white/10 shadow-xs">
          <Calendar className="w-4 h-4 text-slate-400 ml-2" />
          <select
            value={selectedMonth}
            onChange={(e) => onMonthYearChange(Number(e.target.value), selectedYear)}
            className="bg-slate-900 text-white font-semibold text-sm focus:outline-none cursor-pointer pr-2 rounded-lg py-0.5"
          >
            {INDONESIAN_MONTHS.map((m, idx) => (
              <option key={idx + 1} value={idx + 1} className="bg-slate-900 text-white">
                {m}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => onMonthYearChange(selectedMonth, Number(e.target.value))}
            className="bg-slate-900 text-white font-semibold text-sm focus:outline-none cursor-pointer pr-1 border-l border-white/10 pl-2 rounded-lg py-0.5"
          >
            {years.map((y) => (
              <option key={y} value={y} className="bg-slate-900 text-white">
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Schedule Status Badge */}
        {currentSchedule && (
          <div className="flex items-center space-x-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                currentSchedule.status === 'finalized'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : currentSchedule.status === 'generated'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              {currentSchedule.status}
            </span>

            <span className="text-xs text-slate-400 font-medium hidden md:inline">
              Fairness: <strong className="text-indigo-300">{currentSchedule.quality_score}%</strong>
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3">
        {/* Cloud Status Badge */}
        <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs font-medium text-slate-300">
          <Cloud className="w-3.5 h-3.5 text-indigo-400" />
          {cloudSyncStatus === 'syncing' ? (
            <span className="text-blue-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
              Syncing...
            </span>
          ) : cloudSyncStatus === 'error' ? (
            <span className="text-red-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
              Sync Error
            </span>
          ) : (
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Cloud Synced
            </span>
          )}
        </div>

        <button
          onClick={onGenerateClick}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/20 border border-indigo-400/20 transition cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate Schedule</span>
        </button>

        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center space-x-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs rounded-xl border border-rose-500/20 transition cursor-pointer"
            title="Sign Out / Logout"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        )}
      </div>
    </header>
  );
};
