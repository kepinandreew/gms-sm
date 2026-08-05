import React, { useState } from 'react';
import { Settings, RefreshCw, Save, RotateCcw, AlertTriangle } from 'lucide-react';
import { SchedulerSettings } from '../types';
import { DEFAULT_SETTINGS } from '../data/seedData';

interface SettingsViewProps {
  settings: SchedulerSettings;
  onSaveSettings: (settings: SchedulerSettings) => void;
  onResetDemoData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onResetDemoData,
}) => {
  const [formSettings, setFormSettings] = useState<SchedulerSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSave = () => {
    onSaveSettings(formSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleResetToDefaults = () => {
    setFormSettings(DEFAULT_SETTINGS);
    onSaveSettings(DEFAULT_SETTINGS);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto text-slate-100">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4" />
            <span>Optimization Weighting Configurations</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Scheduler Engine Settings</h1>
          <p className="text-xs text-slate-400">
            Atur tingkat prioritas pembobotan algoritma penjadwalan otomatis.
          </p>
        </div>

        <button
          onClick={handleResetToDefaults}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs rounded-xl border border-white/10 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Settings Default</span>
        </button>
      </div>

      {/* Active Hard Constraints Panel */}
      <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-lg space-y-4">
        <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
          <Settings className="w-4 h-4" />
          <span>Aturan Hard Constraints Auto Scheduling Engine</span>
        </div>
        <h2 className="text-lg font-bold text-white">Ketentuan Utama Penjadwalan Otomatis</h2>
        <p className="text-xs text-slate-400">
          Seluruh aturan di bawah ini bersifat mutlak (Hard Constraints) dan selalu aktif pada auto-scheduling engine.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-indigo-300">RULE 1 — WAJIB OFF 1 MINGGU</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-normal">
              Tim yang bertugas di weekend N <strong>WAJIB OFF</strong> di weekend N+1 (berlaku lintas bulan, misal
              akhir Agustus ke awal September).
            </p>
          </div>

          <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-indigo-300">RULE 2 — UNIQUE LOCATION / BULAN</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-normal">
              Satu tim <strong>tidak boleh bertugas di lokasi yang sama 2x</strong> dalam 1 bulan yang sama (Barat,
              Timur, Selatan, Pusura, English).
            </p>
          </div>

          <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-indigo-300">RULE 3 — UNIQUE SHIFT TYPE / BULAN</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-normal">
              Satu tim <strong>tidak boleh bertugas di tipe shift yang sama 2x</strong> dalam 1 bulan (Early, Middle,
              Late, atau English).
            </p>
          </div>

          <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-indigo-300">RULE 4 — ENGLISH & SUNDAY EXCLUSIVE</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-normal">
              English Service (Sabtu) dan Sunday Service adalah 1 Service Weekend. Maksimal 1 penugasan per weekend.
            </p>
          </div>
        </div>
      </div>

      {/* Weight Sliders */}
      <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-lg space-y-6">
        <div className="space-y-4">
          {/* 1. Monthly Workload Balance Weight */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold text-white text-sm">Monthly Workload Balance Weight</span>
                <p className="text-xs text-slate-400">Pemerataan jumlah pelayanan dalam bulan berjalan (Priority 1)</p>
              </div>
              <span className="font-extrabold text-indigo-400 text-base">{formSettings.weight_monthly_balance}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="80"
              value={formSettings.weight_monthly_balance}
              onChange={(e) =>
                setFormSettings({ ...formSettings, weight_monthly_balance: Number(e.target.value) })
              }
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* 2. Long-Term Workload Balance Weight */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold text-white text-sm">Long-Term Workload Balance Weight</span>
                <p className="text-xs text-slate-400">Pemerataan total histori jangka panjang (Priority 2)</p>
              </div>
              <span className="font-extrabold text-indigo-400 text-base">{formSettings.weight_longterm_balance}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              value={formSettings.weight_longterm_balance}
              onChange={(e) =>
                setFormSettings({ ...formSettings, weight_longterm_balance: Number(e.target.value) })
              }
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* 3. Location Rotation Weight */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold text-white text-sm">Location Rotation Weight</span>
                <p className="text-xs text-slate-400">Rotasi lokasi pelayanan (Barat, Timur, Selatan, Pusura, English)</p>
              </div>
              <span className="font-extrabold text-emerald-400 text-base">{formSettings.weight_location_rotation}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="40"
              value={formSettings.weight_location_rotation}
              onChange={(e) =>
                setFormSettings({ ...formSettings, weight_location_rotation: Number(e.target.value) })
              }
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* 4. Slot Rotation Weight */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold text-white text-sm">Slot / Time Rotation Weight</span>
                <p className="text-xs text-slate-400">Variasi jam ibadah (Pagi U1 vs Siang U2-U3 vs Sore U4-U5)</p>
              </div>
              <span className="font-extrabold text-amber-400 text-base">{formSettings.weight_slot_rotation}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              value={formSettings.weight_slot_rotation}
              onChange={(e) =>
                setFormSettings({ ...formSettings, weight_slot_rotation: Number(e.target.value) })
              }
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          {isSaved ? (
            <span className="text-xs font-bold text-emerald-400 animate-in fade-in">
              ✓ Pengaturan berhasil disimpan!
            </span>
          ) : (
            <span></span>
          )}

          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 border border-indigo-400/20 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </div>

      {/* Danger Zone: Reset Demo Data */}
      <div className="bg-rose-500/10 border border-rose-500/30 p-6 rounded-2xl space-y-3">
        <div className="flex items-center space-x-2 text-rose-300 font-bold text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          <span>Reset Data Demo System</span>
        </div>
        <p className="text-xs text-rose-200/80 leading-relaxed">
          Menghapus seluruh jadwal buatan dan mengembalikan database ke 20 tim default beserta 3 bulan riwayat demo.
        </p>

        <button
          onClick={() => setShowResetConfirm(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 border border-rose-400/20 transition cursor-pointer flex items-center space-x-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Demo Data Sekarang</span>
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1e293b]/90 backdrop-blur-2xl rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-white/10 text-slate-100">
            <h3 className="font-bold text-lg text-white">Konfirmasi Reset Demo Data</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin mereset seluruh data aplikasi kembali ke kondisi demo awal? Seluruh perubahan
              manual yang belum diekspor akan terhapus.
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl text-xs font-semibold border border-white/10 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onResetDemoData();
                  setShowResetConfirm(false);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-600/20 border border-rose-400/20 cursor-pointer"
              >
                Ya, Reset Ke Demo Awal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
