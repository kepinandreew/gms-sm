import React from 'react';
import { X, CheckCircle, HelpCircle, Award, History, CalendarDays } from 'lucide-react';
import { ExplanationDetails } from '../types';

interface WhyThisTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  details: ExplanationDetails | null;
}

export const WhyThisTeamModal: React.FC<WhyThisTeamModalProps> = ({ isOpen, onClose, details }) => {
  if (!isOpen || !details) return null;

  const {
    team_name,
    location_name,
    slot_name,
    monthly_count,
    monthly_target,
    total_lifetime_services,
    recent_location_history,
    recent_slot_history,
    explanation_text,
    score_breakdown,
  } = details;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1e293b]/90 backdrop-blur-2xl rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-white/10 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-white/5 border-b border-white/10 p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Why This Team?</h3>
              <p className="text-xs text-slate-400">
                Alasan Penjadwalan: <strong className="text-indigo-300">{team_name}</strong>
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
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-slate-200 text-sm">
          {/* Target Location & Slot Badge */}
          <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Lokasi & Slot</span>
              <p className="font-bold text-white text-base">
                {location_name} — {slot_name}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Service Count</span>
              <p className="font-bold text-indigo-400 text-base">{total_lifetime_services} Kali</p>
            </div>
          </div>

          {/* Algorithm Explanation Box */}
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-2">
            <div className="flex items-center space-x-2 text-indigo-300 font-bold text-sm">
              <Award className="w-4 h-4 text-indigo-400" />
              <span>Rangkuman Keputusan Algoritma:</span>
            </div>
            <p className="text-slate-200 leading-relaxed text-sm">{explanation_text}</p>
          </div>

          {/* Scoring Factors Breakdown */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Kriteria Bobot Algoritma
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/5 rounded-lg border border-white/10 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1 font-medium">
                    <CalendarDays className="w-3.5 h-3.5 text-blue-400" /> Monthly Target
                  </span>
                  <span className="font-bold text-white">{score_breakdown.monthly_urgency}%</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full"
                    style={{ width: `${score_breakdown.monthly_urgency}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Status: {monthly_count} / {monthly_target} pelayanan
                </p>
              </div>

              <div className="p-3 bg-white/5 rounded-lg border border-white/10 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1 font-medium">
                    <History className="w-3.5 h-3.5 text-emerald-400" /> Rotasi Lokasi
                  </span>
                  <span className="font-bold text-white">{score_breakdown.location_fit}%</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${score_breakdown.location_fit}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-400">Kesesuaian rotasi lokasi</p>
              </div>
            </div>
          </div>

          {/* Historical Location Counts */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Riwayat Distribusi Lokasi
            </h4>
            <div className="flex flex-wrap gap-2">
              {recent_location_history.map((lh, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-white/5 border border-white/10 text-slate-200 text-xs rounded-lg font-medium"
                >
                  {lh.location}: <strong className="text-white">{lh.count}x</strong>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white/5 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
