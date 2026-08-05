import React, { useState } from 'react';
import {
  Sparkles,
  Lock,
  Unlock,
  RotateCcw,
  CheckCircle,
  FileSpreadsheet,
  HelpCircle,
  UserPlus,
  AlertTriangle,
  AlertOctagon,
  Download,
  Trash2,
} from 'lucide-react';
import { Team, Schedule, Assignment, TeamAvailability, ExplanationDetails } from '../types';
import { SERVICE_SLOTS, SERVICE_LOCATIONS, matchSlotId } from '../data/locationsAndSlots';
import { getServiceWeekendsInMonth, getMonthName, getWeekendForDate, formatNiceDate } from '../engine/dateUtils';
import { validateTeamAssignment } from '../engine/validator';
import { getAssignmentExplanation } from '../engine/explain';
import { WhyThisTeamModal } from '../components/WhyThisTeamModal';
import { ManualSwapModal } from '../components/ManualSwapModal';
import { OfficialPdfScheduleModal } from '../components/OfficialPdfScheduleModal';
import { AssignmentDetailModal } from '../components/AssignmentDetailModal';
import { store } from '../db/store';

interface ScheduleViewProps {
  selectedMonth: number;
  selectedYear: number;
  teams: Team[];
  schedule: Schedule | undefined;
  assignments: Assignment[];
  availabilities: TeamAvailability[];
  pastAssignments: Assignment[];
  onRegenerateAll: () => void;
  onRegenerateUnlocked: () => void;
  onFinalizeSchedule: () => void;
  onReopenSchedule: () => void;
  onClearSchedule?: () => void;
  onUpdateAssignment: (assignmentId: string, updates: Partial<Assignment>) => void;
  onNavigate: (route: any) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  selectedMonth,
  selectedYear,
  teams,
  schedule,
  assignments,
  availabilities,
  pastAssignments,
  onRegenerateAll,
  onRegenerateUnlocked,
  onFinalizeSchedule,
  onReopenSchedule,
  onClearSchedule,
  onUpdateAssignment,
  onNavigate,
}) => {
  const weekends = getServiceWeekendsInMonth(selectedMonth, selectedYear);
  const monthName = getMonthName(selectedMonth);

  const activeSpecialServices = store
    .getSpecialServices(selectedMonth, selectedYear)
    .filter((s) => s.status === 'active');

  const specialServiceSlotsList = activeSpecialServices.flatMap((ss) =>
    ss.slots.map((slot) => ({
      service: ss,
      slot,
      specSlotId: `spec-${ss.id}-${slot.id}`,
    }))
  );

  // Modals state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    weekend: any;
    slot: any;
    assignment: Assignment | null;
    assignedTeam: Team | undefined;
  } | null>(null);

  const [whyModalOpen, setWhyModalOpen] = useState(false);
  const [explanationDetails, setExplanationDetails] = useState<ExplanationDetails | null>(null);

  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [activeAssignmentForSwap, setActiveAssignmentForSwap] = useState<Assignment | null>(null);
  const [activeWeekendAssignments, setActiveWeekendAssignments] = useState<Assignment[]>([]);

  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Cell Click Handler to open Assignment Detail Dialog
  const handleCellClick = (
    weekend: any,
    slot: any,
    asgn: Assignment | undefined,
    team: Team | undefined
  ) => {
    setSelectedCell({
      weekend,
      slot,
      assignment: asgn || null,
      assignedTeam: team,
    });
    setDetailModalOpen(true);
  };

  // Open "Why This Team?" modal
  const handleWhyThisTeamClick = (assignment: Assignment) => {
    const details = getAssignmentExplanation({
      teamId: assignment.team_id,
      slotId: assignment.slot_id,
      scheduleId: assignment.schedule_id,
      allTeams: teams,
      allScheduleAssignments: assignments,
      pastAssignments,
    });
    setExplanationDetails(details);
    setWhyModalOpen(true);
  };

  // Open Manual Swap modal
  const handleSwapClick = (assignment: Assignment) => {
    const wAsgns = assignments.filter((a) => a.weekend_id === assignment.weekend_id);
    setActiveAssignmentForSwap(assignment);
    setActiveWeekendAssignments(wAsgns);
    setSwapModalOpen(true);
  };

  // Confirm manual swap
  const handleConfirmSwap = (assignmentId: string, newTeamId: string, isLocked: boolean) => {
    onUpdateAssignment(assignmentId, {
      team_id: newTeamId,
      locked: isLocked,
      manually_assigned: true,
    });
  };

  // Toggle lock directly
  const handleToggleLock = (assignment: Assignment, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateAssignment(assignment.id, { locked: !assignment.locked });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Top Controls Bar */}
      <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white">
              Jadwal Pelayanan {monthName} {selectedYear}
            </h1>
            {(selectedYear < 2026 || (selectedYear === 2026 && selectedMonth < 9)) ? (
              <>
                <span className="px-3 py-1 text-xs font-bold uppercase rounded-full tracking-wider border bg-amber-500/10 text-amber-400 border-amber-500/30">
                  JADWAL HISTORIS PDF
                </span>
                <span className="px-3 py-1 text-xs font-bold uppercase rounded-full tracking-wider border bg-purple-500/10 text-purple-400 border-purple-500/30">
                  PDF IMPORT MANUAL
                </span>
                <span className="px-3 py-1 text-xs font-bold uppercase rounded-full tracking-wider border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  FINALIZED BASELINE
                </span>
              </>
            ) : schedule ? (
              <span
                className={`px-3 py-1 text-xs font-bold uppercase rounded-full tracking-wider border ${
                  schedule.status === 'finalized'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}
              >
                {schedule.status}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Klik slot untuk melihat detail alokasi (Why This Team?), melakukan penyesuaian manual, atau mengunci assignment.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {(selectedYear < 2026 || (selectedYear === 2026 && selectedMonth < 9)) ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onNavigate('import_pdf')}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 transition cursor-pointer shadow-lg shadow-amber-500/10"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Upload / Update PDF Jadwal {monthName}</span>
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={onRegenerateUnlocked}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 text-slate-200 font-semibold text-xs rounded-xl border border-white/10 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Regenerate Unlocked</span>
              </button>

              <button
                onClick={onRegenerateAll}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/20 border border-indigo-400/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Regenerate All</span>
              </button>
            </>
          )}

          {schedule?.status === 'finalized' ? (
            <button
              onClick={onReopenSchedule}
              className="px-4 py-2 bg-amber-600/80 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer border border-amber-500/30"
            >
              Reopen Schedule
            </button>
          ) : (
            <button
              onClick={onFinalizeSchedule}
              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition cursor-pointer border border-emerald-400/20"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Finalize Schedule</span>
            </button>
          )}

          <button
            onClick={() => setPdfModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 transition cursor-pointer border border-rose-400/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Cetak / Export PDF Official</span>
          </button>

          <button
            onClick={() => setConfirmClearOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-rose-500/20 hover:bg-rose-600/30 text-rose-300 font-bold text-xs rounded-xl border border-rose-500/30 transition cursor-pointer shadow-lg shadow-rose-500/10"
            title="Kosongkan seluruh alokasi jadwal bulan ini"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Schedule</span>
          </button>

          <button
            onClick={() => onNavigate('import_export')}
            className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl border border-white/10 transition cursor-pointer"
            title="Export Schedule Data"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Schedule Matrix Table */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider font-bold">
                <th className="p-4 border-b border-white/10 w-48 sticky left-0 bg-[#1e293b] z-20 shadow-md">
                  WEEKEND / TANGGAL
                </th>
                {SERVICE_SLOTS.map((slot) => {
                  const location = SERVICE_LOCATIONS.find((l) => l.id === slot.location_id);

                  return (
                    <th key={slot.id} className="p-3.5 border-b border-white/10 text-left min-w-[170px]">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${location?.color.split(' ')[0]}`}></span>
                        <div>
                          <p className="font-extrabold text-white text-xs">{slot.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium normal-case">
                            {slot.day === 'SATURDAY' ? 'Sabtu' : 'Minggu'} ({slot.start_times.join(', ')})
                          </p>
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {weekends.map((w, idx) => (
                <tr key={w.id} className="hover:bg-white/5 transition">
                  {/* Weekend Column Header */}
                  <td className="p-3.5 font-bold text-white sticky left-0 bg-[#1e293b] border-r border-white/10 shadow-md z-10 whitespace-nowrap">
                    <div className="font-extrabold text-white text-xs uppercase">WEEKEND {idx + 1}</div>
                    <div className="text-[11px] font-medium text-slate-400 mt-0.5">{w.label}</div>
                  </td>

                  {/* Regular Slot Columns */}
                  {SERVICE_SLOTS.map((slot) => {
                    const asgn = assignments.find((a) => {
                      if (!matchSlotId(a.slot_id, slot.id)) return false;
                      return (
                        a.weekend_id === w.id ||
                        a.service_date === w.saturday_date ||
                        a.service_date === w.sunday_date ||
                        a.weekend_id === w.saturday_date ||
                        a.weekend_id === w.sunday_date ||
                        a.weekend_id === `wk-${w.saturday_date}` ||
                        a.weekend_id === `wk-${w.sunday_date}`
                      );
                    });

                    const team = teams.find(
                      (t) =>
                        t.id === asgn?.team_id ||
                        t.id === `team-${asgn?.team_id}` ||
                        t.team_number === Number(asgn?.team_id?.replace('team-', ''))
                    );

                    // Validation check for conflict badge
                    let validationRes = { severity: 'VALID', message: '' };
                    if (asgn && team) {
                      const wAsgns = assignments.filter((a) => a.weekend_id === w.id);
                      validationRes = validateTeamAssignment({
                        teamId: team.id,
                        weekendId: w.id,
                        slotId: slot.id,
                        currentAssignmentsInWeekend: wAsgns,
                        allTeams: teams,
                        availabilities,
                        targetAssignmentId: asgn.id,
                      });
                    }

                    return (
                      <td
                        key={slot.id}
                        onClick={() => handleCellClick(w, slot, asgn, team)}
                        className="p-2.5 text-center align-middle border-r border-white/5 min-w-[170px] cursor-pointer hover:bg-white/5 transition"
                      >
                        {asgn && team ? (
                          <div className="group relative bg-white/5 hover:bg-white/10 p-2 rounded-xl border border-white/10 hover:border-indigo-400/50 hover:shadow-lg transition space-y-1.5 backdrop-blur-md">
                            {/* Team Name Badge */}
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-extrabold text-white text-xs truncate">{team.name}</span>

                              {/* Lock Toggle Button */}
                              <button
                                onClick={(e) => handleToggleLock(asgn, e)}
                                className={`p-1 rounded transition ${
                                  asgn.locked
                                    ? 'text-amber-400 bg-amber-500/20 hover:bg-amber-500/30'
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/10'
                                }`}
                                title={asgn.locked ? 'Terkunci (Lock)' : 'Kunci Assignment'}
                              >
                                {asgn.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                              </button>
                            </div>

                            {/* Conflict / Status Badge */}
                            <div className="flex items-center justify-between pt-1 border-t border-white/10">
                              {validationRes.severity === 'HARD_CONFLICT' ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/20 border border-rose-500/30 px-1.5 py-0.5 rounded">
                                  <AlertOctagon className="w-3 h-3" /> Conflict
                                </span>
                              ) : validationRes.severity === 'WARNING' ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded">
                                  <AlertTriangle className="w-3 h-3" /> Warning
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium">Valid</span>
                              )}

                              {asgn.manually_assigned && (
                                <span className="text-[9px] uppercase font-bold text-indigo-400">Manual</span>
                              )}
                            </div>

                            {/* Hover Action Menu */}
                            <div className="flex items-center justify-center gap-1.5 pt-1.5 border-t border-white/10">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleWhyThisTeamClick(asgn);
                                }}
                                className="px-2 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-[10px] font-bold rounded-md flex items-center gap-1 transition border border-indigo-500/30"
                                title="Why This Team?"
                              >
                                <HelpCircle className="w-3 h-3" /> Why?
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSwapClick(asgn);
                                }}
                                className="px-2 py-1 bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] font-bold rounded-md flex items-center gap-1 transition border border-white/10"
                                title="Manual Override Swap"
                              >
                                <UserPlus className="w-3 h-3" /> Swap
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-dashed border-white/10 hover:border-indigo-400/50 transition flex items-center justify-center">
                            <span className="text-slate-400 font-bold text-[11px] italic">+ Klik Assign</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DEDICATED SPECIAL SERVICES SECTION */}
      <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                SPECIAL SERVICES — {monthName.toUpperCase()} {selectedYear}
              </h3>
              <p className="text-xs text-slate-400">
                Ibadah khusus / event spesial terdaftar yang berjalan secara terpisah dari jadwal regular weekly.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('special_services')}
            className="px-3.5 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Kelola Special Services
          </button>
        </div>

        {activeSpecialServices.length === 0 ? (
          <div className="p-6 text-center text-slate-400 bg-white/5 rounded-2xl border border-white/5 text-xs italic">
            Tidak ada Special Service aktif pada bulan {monthName} {selectedYear}.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSpecialServices.map((service) => {
              const locationLabel =
                service.location_type === 'custom'
                  ? service.custom_location_name
                  : `GMS ${service.location_id?.toUpperCase()}`;

              return (
                <div
                  key={service.id}
                  className="bg-purple-950/20 border border-purple-500/30 p-4 rounded-2xl space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase mb-1">
                        {service.assignment_mode === 'pre_assign' ? 'Pre-Assigned' : 'Auto Mode'}
                      </span>
                      <h4 className="font-extrabold text-white text-sm">{service.event_name}</h4>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        service.countsAsServiceAssignment
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {service.countsAsServiceAssignment ? 'Hitung Rule OFF' : 'Tak Menghitung OFF'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1 bg-black/20 p-2.5 rounded-xl border border-white/5 font-medium">
                    <div>📅 Tanggal: {formatNiceDate(service.date)}</div>
                    <div>📍 Lokasi: {locationLabel}</div>
                    {service.notes && <div className="text-slate-400 italic">📝 "{service.notes}"</div>}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-bold text-purple-300 uppercase">Daftar Slot & Tim Penugasan:</p>
                    {service.slots.map((slot) => {
                      const assignedTeamId = slot.assigned_team_ids?.[0];
                      const teamObj = assignedTeamId
                        ? teams.find(
                            (t) =>
                              t.id === assignedTeamId ||
                              t.id === `team-${assignedTeamId}` ||
                              t.team_number === Number(assignedTeamId.replace('team-', ''))
                          )
                        : null;

                      return (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10 text-xs"
                        >
                          <div>
                            <p className="font-bold text-white">{slot.slot_name}</p>
                            <p className="text-[10px] text-slate-400">
                              {slot.start_time} - {slot.end_time || 'Selesai'}
                            </p>
                          </div>
                          <div>
                            {teamObj ? (
                              <span className="font-extrabold text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded-lg border border-indigo-500/30 text-xs">
                                {teamObj.name}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">Belum Assigned</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedCell && (
        <AssignmentDetailModal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          weekend={selectedCell.weekend}
          slot={selectedCell.slot}
          assignment={selectedCell.assignment}
          assignedTeam={selectedCell.assignedTeam}
          allTeams={teams}
          weekendAssignments={assignments.filter((a) => a.weekend_id === selectedCell.weekend.id)}
          availabilities={availabilities}
          pastAssignments={pastAssignments}
          scheduleId={schedule?.id || `sched-${selectedYear}-${selectedMonth}`}
        />
      )}

      <WhyThisTeamModal
        isOpen={whyModalOpen}
        onClose={() => setWhyModalOpen(false)}
        details={explanationDetails}
      />

      <ManualSwapModal
        isOpen={swapModalOpen}
        onClose={() => setSwapModalOpen(false)}
        assignment={activeAssignmentForSwap}
        weekendAssignments={activeWeekendAssignments}
        allTeams={teams}
        availabilities={availabilities}
        onConfirmSwap={handleConfirmSwap}
      />

      <OfficialPdfScheduleModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        teams={teams}
        assignments={assignments}
      />

      {/* Clear Schedule Confirmation Modal */}
      {confirmClearOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-white">Kosongkan Jadwal Bulanan?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tindakan ini akan menghapus seluruh alokasi tim dan status jadwal untuk bulan{' '}
              <strong className="text-white">{monthName} {selectedYear}</strong>. Data jadwal yang telah dihapus dapat digenerate ulang kapan saja.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer border border-white/10"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmClearOpen(false);
                  if (onClearSchedule) onClearSchedule();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 transition cursor-pointer"
              >
                Ya, Clear Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
