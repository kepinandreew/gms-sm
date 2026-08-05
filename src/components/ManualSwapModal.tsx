import React, { useState, useEffect } from 'react';
import { X, Lock, Unlock, AlertTriangle, CheckCircle, AlertOctagon, UserCheck } from 'lucide-react';
import { Team, Assignment, TeamAvailability, ValidationResult } from '../types';
import { SERVICE_SLOTS, SERVICE_LOCATIONS } from '../data/locationsAndSlots';
import { validateTeamAssignment } from '../engine/validator';

interface ManualSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: Assignment | null;
  weekendAssignments: Assignment[];
  allTeams: Team[];
  availabilities: TeamAvailability[];
  onConfirmSwap: (assignmentId: string, newTeamId: string, isLocked: boolean) => void;
}

export const ManualSwapModal: React.FC<ManualSwapModalProps> = ({
  isOpen,
  onClose,
  assignment,
  weekendAssignments,
  allTeams,
  availabilities,
  onConfirmSwap,
}) => {
  if (!isOpen || !assignment) return null;

  const currentTeam = allTeams.find((t) => t.id === assignment.team_id);
  const slot = SERVICE_SLOTS.find((s) => s.id === assignment.slot_id);
  const location = SERVICE_LOCATIONS.find((l) => l.id === slot?.location_id);

  const [selectedTeamId, setSelectedTeamId] = useState<string>(assignment.team_id);
  const [isLocked, setIsLocked] = useState<boolean>(assignment.locked);
  const [validation, setValidation] = useState<ValidationResult>({
    severity: 'VALID',
    message: 'Tim saat ini telah memenuhi aturan.',
  });

  useEffect(() => {
    setSelectedTeamId(assignment.team_id);
    setIsLocked(assignment.locked);
  }, [assignment]);

  // Re-validate whenever selectedTeamId changes
  useEffect(() => {
    if (!assignment) return;
    const res = validateTeamAssignment({
      teamId: selectedTeamId,
      weekendId: assignment.weekend_id,
      slotId: assignment.slot_id,
      currentAssignmentsInWeekend: weekendAssignments,
      allTeams,
      availabilities,
      targetAssignmentId: assignment.id,
    });
    setValidation(res);
  }, [selectedTeamId, assignment, weekendAssignments, allTeams, availabilities]);

  const handleSave = () => {
    if (validation.severity === 'HARD_CONFLICT') return;
    onConfirmSwap(assignment.id, selectedTeamId, isLocked);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1e293b]/90 backdrop-blur-2xl rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-white/10 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-white/5 border-b border-white/10 p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Manual Override Assignment</h3>
              <p className="text-xs text-slate-400">
                {location?.name} — {slot?.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-slate-200 text-sm">
          {/* Current Team Display */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-xs text-slate-400 font-medium">Tim Terpasang Saat Ini:</span>
            <p className="font-bold text-white text-base">{currentTeam?.name || 'Belum Ada'}</p>
          </div>

          {/* Select Replacement Team */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Pilih Tim Pengganti
            </label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-white/15 text-white font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer bg-slate-800/90"
            >
              {allTeams.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                  {t.name} {t.status === 'inactive' ? '(INACTIVE)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Validation Feedback Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-start space-x-3 ${
              validation.severity === 'HARD_CONFLICT'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : validation.severity === 'WARNING'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            {validation.severity === 'HARD_CONFLICT' ? (
              <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : validation.severity === 'WARNING' ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}

            <div className="text-xs leading-relaxed font-medium">{validation.message}</div>
          </div>

          {/* Lock Assignment Toggle */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isLocked ? (
                <Lock className="w-4 h-4 text-amber-400" />
              ) : (
                <Unlock className="w-4 h-4 text-slate-400" />
              )}
              <div>
                <span className="font-semibold text-xs text-white">Kunci Assignment (Lock)</span>
                <p className="text-[11px] text-slate-400">Regenerate tidak akan mengubah tim yang terkunci.</p>
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
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white/5 border-t border-white/10 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-slate-300 font-semibold text-sm rounded-xl transition cursor-pointer border border-white/10"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={validation.severity === 'HARD_CONFLICT'}
            className={`px-5 py-2 font-semibold text-sm rounded-xl transition cursor-pointer shadow-md ${
              validation.severity === 'HARD_CONFLICT'
                ? 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5 shadow-none'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 border border-indigo-400/20'
            }`}
          >
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
};
