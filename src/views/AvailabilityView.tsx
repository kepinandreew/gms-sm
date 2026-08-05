import React, { useState } from 'react';
import { CalendarClock, Check, X, Edit3 } from 'lucide-react';
import { Team, TeamAvailability } from '../types';
import { getServiceWeekendsInMonth, getMonthName } from '../engine/dateUtils';

interface AvailabilityViewProps {
  selectedMonth: number;
  selectedYear: number;
  teams: Team[];
  availabilities: TeamAvailability[];
  onSetAvailability: (teamId: string, weekendDate: string, available: boolean, notes?: string) => void;
}

export const AvailabilityView: React.FC<AvailabilityViewProps> = ({
  selectedMonth,
  selectedYear,
  teams,
  availabilities,
  onSetAvailability,
}) => {
  const activeTeams = teams.filter((t) => t.status === 'active');
  const weekends = getServiceWeekendsInMonth(selectedMonth, selectedYear);
  const monthName = getMonthName(selectedMonth);

  // Note editing state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');

  const handleToggle = (teamId: string, weekendDate: string, currentAvailable: boolean) => {
    onSetAvailability(teamId, weekendDate, !currentAvailable);
  };

  const handleSaveNote = (teamId: string, weekendDate: string) => {
    onSetAvailability(teamId, weekendDate, false, noteInput.trim());
    setEditingKey(null);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
            <CalendarClock className="w-4 h-4" />
            <span>Ketersediaan Tim Pelayanan</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            Availability Matrix — {monthName} {selectedYear}
          </h1>
          <p className="text-xs text-slate-400">
            Tandai tim yang AVAILABLE (Tersedia) atau UNAVAILABLE (Tidak Tersedia). Scheduler TIDAK AKAN menjadwalkan
            tim pada tanggal unavailable.
          </p>
        </div>
      </div>

      {/* Availability Matrix Table */}
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider font-bold">
                <th className="p-4 border-b border-white/10 w-52 sticky left-0 top-0 bg-[#1e293b] z-20 shadow-md">
                  NAMA TIM
                </th>
                {weekends.map((w, idx) => (
                  <th key={w.id} className="p-4 border-b border-white/10 text-center bg-slate-900">
                    <div>WEEKEND {idx + 1}</div>
                    <div className="text-[10px] font-normal text-slate-400 mt-0.5">{w.label}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {activeTeams.map((team) => (
                <tr key={team.id} className="hover:bg-white/5 transition">
                  <td className="p-4 font-bold text-white sticky left-0 bg-[#1e293b] border-r border-white/10 shadow-md z-10 whitespace-nowrap">
                    {team.name}
                  </td>

                  {weekends.map((w) => {
                    const avail = availabilities.find(
                      (a) => a.team_id === team.id && a.weekend_date === w.saturday_date
                    );
                    const isAvailable = avail ? avail.available : true; // Default available
                    const cellKey = `${team.id}-${w.saturday_date}`;

                    return (
                      <td key={w.id} className="p-3 text-center align-middle border-r border-white/5">
                        <div className="flex flex-col items-center space-y-1.5">
                          {/* Toggle Button */}
                          <button
                            onClick={() => handleToggle(team.id, w.saturday_date, isAvailable)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border shadow-md ${
                              isAvailable
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                            }`}
                          >
                            {isAvailable ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>AVAILABLE</span>
                              </>
                            ) : (
                              <>
                                <X className="w-3.5 h-3.5 text-rose-400" />
                                <span>UNAVAILABLE</span>
                              </>
                            )}
                          </button>

                          {/* Reason/Notes Display */}
                          {!isAvailable && (
                            <div className="text-[10px] text-slate-400 italic max-w-[130px] truncate">
                              {avail?.notes || 'Tidak ada catatan'}
                              <button
                                onClick={() => {
                                  setEditingKey(cellKey);
                                  setNoteInput(avail?.notes || '');
                                }}
                                className="ml-1 text-indigo-400 hover:underline inline-block"
                              >
                                <Edit3 className="w-2.5 h-2.5 inline" />
                              </button>
                            </div>
                          )}

                          {/* Quick Inline Note Editor */}
                          {editingKey === cellKey && (
                            <div className="p-2 bg-slate-800 rounded-lg border border-white/15 shadow-2xl space-y-1 z-20">
                              <input
                                type="text"
                                placeholder="Alasan unavailable..."
                                value={noteInput}
                                onChange={(e) => setNoteInput(e.target.value)}
                                className="w-full text-[11px] p-1.5 bg-slate-900 border border-white/10 text-white rounded focus:outline-none"
                              />
                              <div className="flex justify-end space-x-1">
                                <button
                                  onClick={() => setEditingKey(null)}
                                  className="text-[10px] px-2 py-0.5 bg-white/10 text-slate-300 rounded"
                                >
                                  Batal
                                </button>
                                <button
                                  onClick={() => handleSaveNote(team.id, w.saturday_date)}
                                  className="text-[10px] px-2 py-0.5 bg-indigo-600 text-white rounded font-bold"
                                >
                                  Simpan
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
