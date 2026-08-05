import React, { useState } from 'react';
import { ShieldCheck, Play, CheckCircle2, XCircle, Award, Cpu } from 'lucide-react';
import { runFullSchedulerSimulation, FullSimulationSuiteResult } from '../engine/simulator';

export const SimulatorView: React.FC = () => {
  const [testResult, setTestResult] = useState<FullSimulationSuiteResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunSuite = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = runFullSchedulerSimulation();
      setTestResult(res);
      setIsRunning(false);
    }, 500);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto text-slate-100">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900/90 via-indigo-950/80 to-slate-900/90 backdrop-blur-xl p-8 rounded-3xl text-white shadow-2xl space-y-3 border border-white/10">
        <div className="inline-flex items-center space-x-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
          <Cpu className="w-3.5 h-3.5" />
          <span>Automated Verification & Simulation Suite</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Uji Simulator Fairness Algoritma
        </h1>
        <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
          Fitur ini menjalankan simulasi pengujian otomatis untuk memverifikasi bahwa scheduling engine memenuhi
          persyaratan absolute fairness (MAX - MIN &le; 1), aturan English Service, ketersediaan tim, dan rotasi.
        </p>
      </div>

      {/* Run Simulation Action */}
      <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-lg text-center space-y-4">
        <div className="max-w-md mx-auto space-y-1">
          <h2 className="text-xl font-bold text-white">Eksekusi Test Suite</h2>
          <p className="text-xs text-slate-400">
            Akan menguji simulasi bulan 4 weekend (40 assignments), 5 weekend (50 assignments), unavailability,
            dan aturan English Service.
          </p>
        </div>

        <button
          onClick={handleRunSuite}
          disabled={isRunning}
          className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-600/30 border border-emerald-400/20 transition transform active:scale-98 flex items-center justify-center space-x-2 mx-auto cursor-pointer"
        >
          <Play className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Menjalankan Simulasi...' : 'Jalankan Simulation Suite Sekarang'}</span>
        </button>
      </div>

      {/* Simulation Results Display */}
      {testResult && (
        <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-lg space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center space-x-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl ${
                  testResult.passed_all
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {testResult.passed_all
                    ? 'SEMUA UJI SIMULASI LOLOS (100% PASSED)'
                    : 'BEBERAPA SIMULASI GAGAL'}
                </h2>
                <p className="text-xs text-slate-400">
                  Hasil: {testResult.passed_count} dari {testResult.total_tests} test case berhasil diverifikasi.
                </p>
              </div>
            </div>

            <span
              className={`px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                testResult.passed_all
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {testResult.passed_all ? 'VERIFIED PASSED' : 'ACTION REQUIRED'}
            </span>
          </div>

          {/* Test Case Cards List */}
          <div className="space-y-3">
            {testResult.test_results.map((tr) => (
              <div
                key={tr.test_id}
                className={`p-4 rounded-2xl border space-y-2 transition ${
                  tr.passed
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5 font-bold text-sm">
                    {tr.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                    <span className="text-white">{tr.test_name}</span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold uppercase ${
                      tr.passed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {tr.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-slate-300 pl-7">{tr.details}</p>

                {tr.distribution_summary && (
                  <div className="pl-7 text-[11px] font-mono font-bold text-indigo-300">
                    Distribusi: {tr.distribution_summary}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
