import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { loginWithEmail } from '../services/supabase';

interface LoginViewProps {
  onLoginSuccess: (email: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Masukkan alamat email yang valid.');
      return;
    }
    if (!password) {
      setErrorMsg('Masukkan kata sandi.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await loginWithEmail(email, password);
      if (res.ok && res.user) {
        onLoginSuccess(res.user.email || email);
      } else {
        setErrorMsg(res.error || 'Gagal masuk. Periksa kembali email dan kata sandi Anda.');
      }
    } catch (err: any) {
      setErrorMsg('Terjadi kesalahan saat masuk: ' + (err.message || String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background Frosted Ambient Orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-700/20 blur-[150px] pointer-events-none z-0"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Card */}
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/90 border border-indigo-400/40 flex items-center justify-center mx-auto text-white font-black text-xl shadow-xl shadow-indigo-600/30">
              GMS
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">GMS Service Scheduler</h1>
              <p className="text-xs font-semibold text-slate-400 mt-1">
                Cloud Authentication & Schedule Management
              </p>
            </div>
          </div>

          {/* Quick Info Badge */}
          <div className="bg-indigo-950/50 border border-indigo-500/20 rounded-2xl p-3 flex items-center space-x-3 text-xs text-indigo-200">
            <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
            <p className="leading-snug">
              Sistem Otentikasi Cloud terhubung secara real-time dengan Supabase & Local Database.
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 text-xs text-rose-300 font-medium text-center">
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 ml-1">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@gms.church"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 ml-1">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 border border-indigo-400/30 transition cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Proses Masuk...</span>
              ) : (
                <>
                  <span>Masuk Akun Cloud</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
