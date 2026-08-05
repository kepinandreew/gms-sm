import React, { useState } from 'react';
import { CalendarRange, Clock, Users, Building2, Globe2 } from 'lucide-react';
import { Team, Assignment } from '../types';
import { getServiceWeekendsInMonth, getMonthName, formatNiceDate } from '../engine/dateUtils';
import { SERVICE_SLOTS, SERVICE_LOCATIONS, matchSlotId } from '../data/locationsAndSlots';

interface WeekendViewProps {
  selectedMonth: number;
  selectedYear: number;
  teams: Team[];
  assignments: Assignment[];
}

export const WeekendView: React.FC<WeekendViewProps> = ({
  selectedMonth,
  selectedYear,
  teams,
  assignments,
}) => {
  const weekends = getServiceWeekendsInMonth(selectedMonth, selectedYear);
  const monthName = getMonthName(selectedMonth);

  const [selectedWeekendIdx, setSelectedWeekendIdx] = useState<number>(0);
  const activeWeekend = weekends[selectedWeekendIdx] || weekends[0];

  const weekendAssignments = assignments.filter(
    (a) =>
      a.weekend_id === activeWeekend?.id ||
      a.service_date === activeWeekend?.saturday_date ||
      a.service_date === activeWeekend?.sunday_date ||
      a.weekend_id === activeWeekend?.saturday_date ||
      a.weekend_id === activeWeekend?.sunday_date ||
      a.weekend_id === `wk-${activeWeekend?.saturday_date}` ||
      a.weekend_id === `wk-${activeWeekend?.sunday_date}`
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Header & Weekend Selector */}
      <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
            <CalendarRange className="w-4 h-4" />
            <span>Detailed Service Weekend View</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            Weekend {selectedWeekendIdx + 1}: {activeWeekend?.label}
          </h1>
          <p className="text-xs text-slate-400">
            Tampilan detail jadwal pelayanan hari Sabtu (English Service) dan Minggu ({monthName} {selectedYear}).
          </p>
        </div>

        {/* Weekend Tabs */}
        <div className="flex flex-wrap gap-2">
          {weekends.map((w, idx) => (
            <button
              key={w.id}
              onClick={() => setSelectedWeekendIdx(idx)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedWeekendIdx === idx
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
              }`}
            >
              W{idx + 1} ({w.saturday_date.substring(8)}-{w.sunday_date.substring(8)})
            </button>
          ))}
        </div>
      </div>

      {/* Weekend Cards Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SATURDAY SECTION (English Service) */}
        <div className="space-y-4">
          <div className="p-4 bg-purple-950/70 backdrop-blur-xl border border-purple-500/30 text-white rounded-2xl shadow-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Globe2 className="w-6 h-6 text-purple-400" />
              <div>
                <h2 className="font-extrabold text-lg text-white">SABTU / SATURDAY</h2>
                <p className="text-xs text-purple-300">{formatNiceDate(activeWeekend?.saturday_date || '')}</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-purple-500/20 border border-purple-500/30 text-purple-200 text-xs font-bold rounded-lg uppercase">
              1 Service
            </span>
          </div>

          {/* English Service Card */}
          {SERVICE_SLOTS.filter((s) => s.day === 'SATURDAY').map((slot) => {
            const asgn = weekendAssignments.find((a) => matchSlotId(a.slot_id, slot.id));
            const team = teams.find(
              (t) =>
                t.id === asgn?.team_id ||
                t.id === `team-${asgn?.team_id}` ||
                t.team_number === Number(asgn?.team_id?.replace('team-', ''))
            );

            return (
              <div
                key={slot.id}
                className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-purple-500/20 shadow-lg space-y-3 hover:border-purple-500/40 transition"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="font-bold text-purple-300 text-sm">{slot.name}</span>
                  <div className="flex items-center space-x-1 text-xs text-purple-300 font-semibold bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{slot.start_times.join(', ')}</span>
                  </div>
                </div>

                <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tim Bertugas</span>
                    <p className="font-extrabold text-white text-base">{team ? team.name : 'Belum Ditugaskan'}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                </div>

                <p className="text-[11px] text-purple-300 italic">
                  * Catatan: Tim yang bertugas di English Service Sabtu tidak akan dijadwalkan di hari Minggu.
                </p>
              </div>
            );
          })}
        </div>

        {/* SUNDAY SECTION (Barat, Timur, Selatan, Pusura) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 text-white rounded-2xl shadow-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building2 className="w-6 h-6 text-indigo-400" />
              <div>
                <h2 className="font-extrabold text-lg text-white">MINGGU / SUNDAY</h2>
                <p className="text-xs text-slate-400">{formatNiceDate(activeWeekend?.sunday_date || '')}</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-white/10 text-slate-300 text-xs font-bold rounded-lg uppercase border border-white/10">
              9 Services / 4 Lokasi
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Group slots by location */}
            {SERVICE_LOCATIONS.filter((l) => l.day === 'SUNDAY').map((loc) => {
              const locSlots = SERVICE_SLOTS.filter((s) => s.location_id === loc.id);

              return (
                <div key={loc.id} className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-lg space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`w-3 h-3 rounded-full ${loc.color.split(' ')[0]}`}></span>
                      <h3 className="font-extrabold text-white text-base">{loc.name}</h3>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{locSlots.length} Slot</span>
                  </div>

                  <div className="space-y-2.5">
                    {locSlots.map((slot) => {
                      const asgn = weekendAssignments.find((a) => matchSlotId(a.slot_id, slot.id));
                      const team = teams.find(
                        (t) =>
                          t.id === asgn?.team_id ||
                          t.id === `team-${asgn?.team_id}` ||
                          t.team_number === Number(asgn?.team_id?.replace('team-', ''))
                      );

                      return (
                        <div
                          key={slot.id}
                          className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between gap-2 hover:bg-white/10 transition"
                        >
                          <div>
                            <span className="font-bold text-white text-xs">{slot.name}</span>
                            <div className="flex items-center space-x-1 text-[11px] text-slate-400 font-medium">
                              <Clock className="w-3 h-3" />
                              <span>{slot.start_times.join(' & ')}</span>
                            </div>
                          </div>

                          <span
                            className={`px-3 py-1 font-extrabold rounded-lg text-xs shadow-xs ${
                              team
                                ? 'bg-indigo-600 text-white border border-indigo-400/30'
                                : 'bg-white/5 text-slate-400 border border-white/10'
                            }`}
                          >
                            {team ? team.name : 'Kosong'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
