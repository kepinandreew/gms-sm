import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  AlertOctagon,
  UserCheck,
  HelpCircle,
  ArrowLeftRight,
  Trash2,
  Sparkles,
  Info,
} from 'lucide-react';
import { Team, Assignment, TeamAvailability, ValidationResult, ServiceWeekend, ServiceSlot } from '../types';
import { SERVICE_LOCATIONS } from '../data/locationsAndSlots';
import { validateTeamAssignment } from '../engine/validator';
import { getAssignmentExplanation } from '../engine/explain';
import { store } from '../db/store';

interface AssignmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekend: ServiceWeekend;
  slot: ServiceSlot;
  assignment: Assignment | null;
  assignedTeam: Team | undefined;
  allTeams: Team[];
  weekendAssignments: Assignment[];
  availabilities: TeamAvailability[];
  pastAssignments: Assignment[];
  scheduleId: string;
}

export const AssignmentDetailModal: React.FC<AssignmentDetailModalProps> = ({
  isOpen,
  onClose,
  weekend,
  slot,
  assignment,
  assignedTeam,
  allTeams,
  weekendAssignments,
  availabilities,
  pastAssignments,
  scheduleId,
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'swap' | 'why'>('manual');

  // Manual Selection State
  const [selectedTeamId, setSelectedTeamId] = useState<string>(assignedTeam?.id || '');
  const [isLocked, setIsLocked] = useState<boolean>(assignment?.locked ?? true);

  // Swap State
  const [swapTargetAssignmentId, setSwapTargetAssignmentId] = useState<string>('');

  const location = SERVICE_LOCATIONS.find((l) => l.id === slot.location_id);
  const activeTeams = useMemo(() => allTeams.filter((t) => t.status === 'active'), [allTeams]);

  useEffect(() => {
    if (assignedTeam) {
      setSelectedTeamId(assignedTeam.id);
    } else if (activeTeams.length > 0) {
      setSelectedTeamId(activeTeams[0].id);
    }
    setIsLocked(assignment?.locked ?? true);
    setSwapTargetAssignmentId('');
  }, [assignment, assignedTeam, activeTeams, isOpen]);

  if (!isOpen) return null;

  // Real-time Validation for Manual Team Selection
  const manualValidation: ValidationResult = selectedTeamId
    ? validateTeamAssignment({
        teamId: selectedTeamId,
        weekendId: weekend.id,
        slotId: slot.id,
        currentAssignmentsInWeekend: weekendAssignments,
        allTeams,
        availabilities,
        targetAssignmentId: assignment?.id,
      })
    : { severity: 'VALID', message: 'Silakan pilih tim.' };

  // Validation for Swap
  const swapTargetAssignment = weekendAssignments.find((a) => a.id === swapTargetAssignmentId);
  const swapTargetTeam = allTeams.find((t) => t.id === swapTargetAssignment?.team_id);

  // Explanation for "Why This Team?"
  const explanationDetails = assignedTeam
    ? getAssignmentExplanation({
        teamId: assignedTeam.id,
        slotId: slot.id,
        scheduleId: assignment?.schedule_id || scheduleId,
        allTeams,
        allScheduleAssignments: weekendAssignments,
        pastAssignments,
      })
    : null;

  // Handler: Save Manual Assignment
  const handleSaveManualAssignment = () => {
    if (!selectedTeamId || manualValidation.severity === 'HARD_CONFLICT') return;

    store.assignTeamToSlot({
      scheduleId: assignment?.schedule_id || scheduleId,
      weekendId: weekend.id,
      serviceDate: slot.day === 'SATURDAY' ? weekend.saturday_date : weekend.sunday_date,
      slotId: slot.id,
      teamId: selectedTeamId,
      locked: isLocked,
      manuallyAssigned: true,
    });

    onClose();
  };

  // Handler: Confirm Swap
  const handleConfirmSwap = () => {
    if (!assignment || !swapTargetAssignment) return;
    store.swapAssignments(assignment.id, swapTargetAssignment.id);
    onClose();
  };

  // Handler: Toggle Lock
  const handleToggleLock = () => {
    if (!assignment) return;
    store.updateAssignment(assignment.id, { locked: !assignment.locked });
    setIsLocked(!assignment.locked);
  };

  // Handler: Clear Assignment
  const handleClearAssignment = () => {
    if (!assignment) return;
    if (confirm('Apakah Anda yakin ingin mengosongkan penugasan tim di slot ini?')) {
      store.deleteAssignment(assignment.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#1e293b]/95 backdrop-blur-2xl rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-white/10 text-slate-100 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="bg-white/5 border-b border-white/10 p-5 flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Detail Penugasan Tim</h3>
              <p className="text-xs text-slate-300 font-medium">
                {location?.name || 'GMS'} — <span className="text-indigo-400 font-bold">{slot.name}</span> ({slot.day === 'SATURDAY' ? 'Sabtu' : 'Minggu'})
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {weekend.label} ({slot.day === 'SATURDAY' ? weekend.saturday_date : weekend.sunday_date})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Assigned Team Status Banner */}
        <div className="p-5 bg-black/20 border-b border-white/10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Tim Terpasang saat ini:
              </span>
              <p className="text-lg font-black text-white">
                {assignedTeam ? assignedTeam.name : <span className="text-slate-400 italic font-normal">Belum Ditugaskan (Kosong)</span>}
              </p>
              {assignedTeam?.leader_name && (
                <p className="text-xs text-slate-300 font-medium">
                  Leader: <span className="font-bold text-slate-100">{assignedTeam.leader_name}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {assignment && (
                <button
                  type="button"
                  onClick={handleToggleLock}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                    assignment.locked
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                  title="Klik untuk mengubah status lock"
                >
                  {assignment.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>{assignment.locked ? 'LOCKED' : 'UNLOCKED'}</span>
                </button>
              )}

              {assignment && (
                <button
                  type="button"
                  onClick={handleClearAssignment}
                  className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Kosongkan penugasan di slot ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {assignment?.manually_assigned && (
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase">
                Manual Override
              </span>
            )}
            {manualValidation.severity === 'HARD_CONFLICT' ? (
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase flex items-center gap-1">
                <AlertOctagon className="w-3 h-3" /> Hard Conflict
              </span>
            ) : manualValidation.severity === 'WARNING' ? (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Warning Rule
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Rule Valid
              </span>
            )}
          </div>
        </div>

        {/* Action Tabs */}
        <div className="flex border-b border-white/10 bg-black/10">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2.5 px-3 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === 'manual'
                ? 'border-indigo-500 text-indigo-300 bg-white/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Penugasan Manual</span>
          </button>

          <button
            onClick={() => setActiveTab('swap')}
            className={`flex-1 py-2.5 px-3 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === 'swap'
                ? 'border-indigo-500 text-indigo-300 bg-white/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Tukar Posisi (Swap)</span>
          </button>

          <button
            onClick={() => setActiveTab('why')}
            className={`flex-1 py-2.5 px-3 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === 'why'
                ? 'border-indigo-500 text-indigo-300 bg-white/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Why This Team?</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 space-y-4 max-h-[380px] overflow-y-auto">
          {/* TAB 1: MANUAL ASSIGNMENT */}
          {activeTab === 'manual' && (
            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Pilih Tim Penugasan
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-white/15 text-white font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer bg-slate-800"
                >
                  {activeTeams.map((t) => (
                    <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                      {t.name} {t.leader_name ? `(${t.leader_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Validation Feedback */}
              <div
                className={`p-3.5 rounded-xl border flex items-start space-x-3 ${
                  manualValidation.severity === 'HARD_CONFLICT'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : manualValidation.severity === 'WARNING'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}
              >
                {manualValidation.severity === 'HARD_CONFLICT' ? (
                  <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                ) : manualValidation.severity === 'WARNING' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div className="text-xs leading-relaxed font-medium">{manualValidation.message}</div>
              </div>

              {/* Lock Toggle */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {isLocked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4 text-slate-400" />}
                  <div>
                    <span className="font-semibold text-xs text-white">Kunci Penugasan (Lock)</span>
                    <p className="text-[11px] text-slate-400">Regenerate otomatis tidak akan mengganti tim ini.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLocked(!isLocked)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    isLocked
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {isLocked ? '🔒 LOCKED' : '🔓 UNLOCKED'}
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveManualAssignment}
                  disabled={manualValidation.severity === 'HARD_CONFLICT' || !selectedTeamId}
                  className={`px-5 py-2 font-bold text-xs rounded-xl transition cursor-pointer shadow-md ${
                    manualValidation.severity === 'HARD_CONFLICT' || !selectedTeamId
                      ? 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 border border-indigo-400/20'
                  }`}
                >
                  Simpan Penugasan Manual
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SWAP ASSIGNMENT */}
          {activeTab === 'swap' && (
            <div className="space-y-4 text-xs">
              {!assignment ? (
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-slate-400 text-center italic">
                  Slot ini belum memiliki tim. Pilih tim secara manual terlebih dahulu sebelum melakukan swap.
                </div>
              ) : (
                <>
                  <p className="text-slate-300">
                    Tukar posisi penugasan antara <strong>{assignedTeam?.name}</strong> dengan tim lain dalam Weekend ini:
                  </p>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      Pilih Tim Lawan Swap (Weekend {weekend.label})
                    </label>
                    <select
                      value={swapTargetAssignmentId}
                      onChange={(e) => setSwapTargetAssignmentId(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-white/15 text-white font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer bg-slate-800"
                    >
                      <option value="">-- Pilih Tim Penugasan untuk Ditukar --</option>
                      {weekendAssignments
                        .filter((a) => a.id !== assignment.id)
                        .map((a) => {
                          const t = allTeams.find((tm) => tm.id === a.team_id);
                          return (
                            <option key={a.id} value={a.id} className="bg-slate-900 text-white">
                              {t?.name || 'Tim'} (Slot: {a.slot_id})
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  {swapTargetTeam && (
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl space-y-1 text-indigo-200">
                      <div className="font-bold">Rencana Tukar Posisi:</div>
                      <div>• {assignedTeam?.name} ➔ Slot {swapTargetAssignment?.slot_id}</div>
                      <div>• {swapTargetTeam.name} ➔ Slot {slot.name}</div>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleConfirmSwap}
                      disabled={!swapTargetAssignmentId}
                      className={`px-5 py-2 font-bold text-xs rounded-xl transition cursor-pointer shadow-md ${
                        !swapTargetAssignmentId
                          ? 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 border border-indigo-400/20'
                      }`}
                    >
                      Tukar Posisi Sekarang
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: WHY THIS TEAM? */}
          {activeTab === 'why' && (
            <div className="space-y-4 text-xs">
              {!explanationDetails ? (
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-slate-400 text-center italic">
                  Belum ada tim yang ditugaskan di slot ini untuk dianalisis.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2">
                    <h4 className="font-extrabold text-white text-sm">
                      Alasan Alokasi — {assignedTeam?.name}
                    </h4>
                    <p className="text-slate-300 leading-relaxed text-xs">
                      {explanationDetails.explanation_text}
                    </p>

                    <div className="pt-2 border-t border-white/10 flex flex-wrap gap-2 text-[11px]">
                      <span className="px-2 py-1 bg-white/10 rounded text-slate-200">
                        Bulan Ini: <strong>{explanationDetails.monthly_count} / {explanationDetails.monthly_target}</strong> tugas
                      </span>
                      <span className="px-2 py-1 bg-white/10 rounded text-slate-200">
                        Total Lifetime: <strong>{explanationDetails.total_lifetime_services}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white/5 border-t border-white/10 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 italic">
            Perubahan langsung disimpan ke Supabase & database lokal.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer border border-white/10"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
