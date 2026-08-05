import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  Filter,
  Calendar,
  Sparkles,
  Shield,
  Edit2,
  Trash2,
  CheckCircle,
  X,
  AlertCircle,
  FileText,
  Clock,
  MapPin,
  Check,
  Ban,
  User,
  HeartHandshake,
} from 'lucide-react';
import { ServiceDirector, SDStatus, SDRule, SDRequestPlaceholder } from '../types';
import { store } from '../db/store';

interface DataServiceDirectorViewProps {
  onNavigateToSchedule?: () => void;
}

export const DataServiceDirectorView: React.FC<DataServiceDirectorViewProps> = ({ onNavigateToSchedule }) => {
  const [directors, setDirectors] = useState<ServiceDirector[]>(() => store.getServiceDirectors());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SDStatus>('ALL');

  // Modal States
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingSD, setEditingSD] = useState<ServiceDirector | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailSD, setDetailSD] = useState<ServiceDirector | null>(null);
  const [detailTab, setDetailTab] = useState<'profile' | 'rules' | 'history' | 'requests'>('profile');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const refreshList = () => {
    setDirectors(store.getServiceDirectors());
  };

  // Form State
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formStatus, setFormStatus] = useState<SDStatus>('active');
  const [formQualification, setFormQualification] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Special Rules Form State (3 Independent Groups)
  const [ruleAllowedDays, setRuleAllowedDays] = useState<('SATURDAY' | 'SUNDAY')[]>([]);
  const [ruleAllowedLocations, setRuleAllowedLocations] = useState<
    ('barat' | 'timur' | 'selatan' | 'pusura')[]
  >([]);
  const [ruleAllowedServices, setRuleAllowedServices] = useState<
    ('Service U1' | 'Service U2-U3' | 'Service U4-U5')[]
  >([]);
  const [ruleNotes, setRuleNotes] = useState('');

  const handleOpenAdd = () => {
    setEditingSD(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormStatus('active');
    setFormQualification('');
    setFormNotes('');
    setRuleAllowedDays([]);
    setRuleAllowedLocations([]);
    setRuleAllowedServices([]);
    setRuleNotes('');
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (sd: ServiceDirector) => {
    setEditingSD(sd);
    setFormName(sd.name);
    setFormPhone(sd.phone || '');
    setFormEmail(sd.email || '');
    setFormStatus(sd.status);
    setFormQualification(sd.qualification || '');
    setFormNotes(sd.notes || '');

    const r = sd.special_rules || {};
    setRuleAllowedDays(r.allowed_days || []);
    setRuleAllowedLocations(r.allowed_locations || []);
    setRuleAllowedServices(r.allowed_services || []);
    setRuleNotes(r.notes || '');
    setIsAddEditOpen(true);
  };

  const handleSaveSD = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Nama Service Director wajib diisi.', 'error');
      return;
    }

    const special_rules: SDRule = {
      allowed_days: ruleAllowedDays,
      allowed_locations: ruleAllowedLocations,
      allowed_services: ruleAllowedServices,
      notes: ruleNotes,
    };

    if (editingSD) {
      store.updateServiceDirector(editingSD.id, {
        name: formName.trim(),
        phone: formPhone,
        email: formEmail,
        status: formStatus,
        qualification: formQualification,
        notes: formNotes,
        special_rules,
      });
      showToast(`Data SD "${formName}" berhasil diperbarui.`);
    } else {
      store.addServiceDirector({
        name: formName.trim(),
        phone: formPhone,
        email: formEmail,
        status: formStatus,
        qualification: formQualification,
        notes: formNotes,
        special_rules,
      });
      showToast(`Service Director baru "${formName}" berhasil ditambahkan.`);
    }

    setIsAddEditOpen(false);
    refreshList();
  };

  const handleDeleteSD = (sd: ServiceDirector) => {
    if (confirm(`Apakah Anda yakin ingin menghapus Service Director "${sd.name}"?`)) {
      store.deleteServiceDirector(sd.id);
      showToast(`SD "${sd.name}" berhasil dihapus.`);
      refreshList();
    }
  };

  const handleToggleCuti = (sd: ServiceDirector) => {
    const nextStatus: SDStatus = sd.status === 'cuti' ? 'active' : 'cuti';
    store.updateServiceDirector(sd.id, { status: nextStatus });
    showToast(`Status SD "${sd.name}" diubah menjadi ${nextStatus === 'cuti' ? 'CUTI / Izin' : 'AKTIF'}.`);
    refreshList();
  };

  const handleOpenDetail = (sd: ServiceDirector) => {
    setDetailSD(sd);
    setDetailTab('profile');
    setIsDetailOpen(true);
  };

  // Filtered Directors
  const filteredDirectors = directors.filter((sd) => {
    const matchesSearch =
      sd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sd.notes && sd.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sd.special_rules?.notes && sd.special_rules.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || sd.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = directors.filter((d) => d.status === 'active').length;
  const cutiCount = directors.filter((d) => d.status === 'cuti').length;
  const inactiveCount = directors.filter((d) => d.status === 'inactive').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[999] px-4 py-3 rounded-xl shadow-2xl border text-sm font-bold flex items-center gap-2 animate-bounce ${
            toast.type === 'error'
              ? 'bg-rose-950 text-rose-200 border-rose-800'
              : 'bg-emerald-950 text-emerald-200 border-emerald-800'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <UserCheck className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Data Service Director (SD)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {directors.length} SD Terdaftar
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Master Data Service Director independen: aturan khusus (special rules), status cuti, riwayat pelayanan, dan arsitektur request.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onNavigateToSchedule && (
            <button
              onClick={onNavigateToSchedule}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Jadwal SD</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah SD Baru</span>
          </button>
        </div>
      </div>

      {/* Stats Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total SD</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">{directors.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">SD Aktif</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Sedang CUTI</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{cutiCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Non-Aktif</p>
            <p className="text-2xl font-black text-slate-500 dark:text-slate-400 mt-0.5">{inactiveCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center font-bold">
            <Ban className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Service Director atau Rule..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-500 mr-1 shrink-0">Status:</span>

          {(['ALL', 'active', 'cuti', 'inactive'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'Semua' : st === 'active' ? 'Aktif' : st === 'cuti' ? 'Cuti' : 'Non-Aktif'}
            </button>
          ))}
        </div>
      </div>

      {/* Service Director Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDirectors.map((sd) => {
          const rules = sd.special_rules || {};
          const hasRules =
            (rules.allowed_days && rules.allowed_days.length > 0) ||
            (rules.allowed_locations && rules.allowed_locations.length > 0) ||
            (rules.blocked_locations && rules.blocked_locations.length > 0) ||
            rules.notes;

          return (
            <div
              key={sd.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                {/* Card Top Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-black text-base shrink-0">
                      {sd.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 leading-tight">
                        {sd.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {sd.qualification || 'Service Director'}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0 ${
                      sd.status === 'active'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : sd.status === 'cuti'
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {sd.status === 'active' ? 'Aktif' : sd.status === 'cuti' ? 'CUTI' : 'Non-Aktif'}
                  </span>
                </div>

                {/* Special Rules Highlights Box */}
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3 mb-4 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                    <Shield className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Special Rules / Aturan Khusus:</span>
                  </div>

                  {hasRules ? (
                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 pl-5">
                      {rules.allowed_days && rules.allowed_days.length > 0 && (
                        <p className="flex items-center gap-1 font-medium text-[11px]">
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">• Hari:</span>{' '}
                          {rules.allowed_days.map((d) => (d === 'SUNDAY' ? 'Minggu' : 'Sabtu')).join(', ')}
                        </p>
                      )}

                      {rules.allowed_locations && rules.allowed_locations.length > 0 && (
                        <p className="flex items-center gap-1 font-medium text-[11px]">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">• Lokasi Diiizinkan:</span>{' '}
                          {rules.allowed_locations.map((l) => l.toUpperCase()).join(', ')}
                        </p>
                      )}

                      {rules.blocked_locations && rules.blocked_locations.length > 0 && (
                        <p className="flex items-center gap-1 font-medium text-[11px]">
                          <span className="font-semibold text-rose-600 dark:text-rose-400">• Tidak Boleh:</span>{' '}
                          {rules.blocked_locations.map((l) => l.toUpperCase()).join(', ')}
                        </p>
                      )}

                      {rules.notes && (
                        <p className="text-[11px] italic text-slate-500 dark:text-slate-400 pt-0.5">
                          "{rules.notes}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic pl-5">Tidak ada pembatasan khusus (Bebas / General SD).</p>
                  )}
                </div>

                {/* Additional Info */}
                <div className="text-xs space-y-1 text-slate-500 dark:text-slate-400 mb-4 px-1">
                  {sd.notes && <p className="truncate"><strong>Catatan:</strong> {sd.notes}</p>}
                </div>
              </div>

              {/* Card Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleCuti(sd)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    sd.status === 'cuti'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  {sd.status === 'cuti' ? 'Akhiri Cuti' : 'Set Cuti'}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenDetail(sd)}
                    title="Detail & History"
                    className="p-2 text-slate-600 hover:text-indigo-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleOpenEdit(sd)}
                    title="Edit SD"
                    className="p-2 text-slate-600 hover:text-indigo-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteSD(sd)}
                    title="Hapus SD"
                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredDirectors.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <User className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Tidak ada Service Director ditemukan</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Coba ubah kata kunci pencarian atau filter status.</p>
        </div>
      )}

      {/* ==================== MODAL 1: ADD / EDIT SD ==================== */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {editingSD ? `Edit Service Director: ${editingSD.name}` : 'Tambah Service Director Baru'}
                </h2>
              </div>
              <button
                onClick={() => setIsAddEditOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSD} className="space-y-4">
              {/* Profil Identitas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama SD <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: AA, Merlyn, Jane"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status SD</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as SDStatus)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100"
                  >
                    <option value="active">Aktif</option>
                    <option value="cuti">CUTI / Izin</option>
                    <option value="inactive">Non-Aktif</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">No. HP / WhatsApp</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="0812xxxx"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Kualifikasi / Peran</label>
                  <input
                    type="text"
                    value={formQualification}
                    onChange={(e) => setFormQualification(e.target.value)}
                    placeholder="Senior SD / General SD"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Special Rules Configuration Box (3 Independent Groups) */}
              <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                  <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Rule Engine Configuration (Aturan Khusus SD)
                  </h3>
                </div>

                {/* Group 1: Allowed Days */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                    1. Allowed Days
                  </label>
                  <p className="text-[10px] text-slate-500 mb-1">Pilih hari pelayanan yang diizinkan (Kosongkan jika semua hari Boleh):</p>
                  <div className="flex items-center gap-3">
                    {[
                      { id: 'SATURDAY', label: 'Saturday' },
                      { id: 'SUNDAY', label: 'Sunday' },
                    ].map((d) => {
                      const isChecked = ruleAllowedDays.includes(d.id as any);
                      return (
                        <label
                          key={d.id}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                            isChecked
                              ? 'bg-indigo-100 text-indigo-900 border-indigo-400 dark:bg-indigo-900/50 dark:text-indigo-200'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setRuleAllowedDays([...ruleAllowedDays, d.id as any]);
                              else setRuleAllowedDays(ruleAllowedDays.filter((x) => x !== d.id));
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{d.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Group 2: Allowed Locations */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                    2. Allowed Locations
                  </label>
                  <p className="text-[10px] text-slate-500 mb-1">Pilih lokasi pelayanan yang diizinkan (Kosongkan jika semua lokasi Boleh):</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'barat', label: 'Barat' },
                      { id: 'timur', label: 'Timur' },
                      { id: 'selatan', label: 'Selatan' },
                      { id: 'pusura', label: 'Pusura' },
                    ].map((loc) => {
                      const isChecked = ruleAllowedLocations.includes(loc.id as any);
                      return (
                        <label
                          key={loc.id}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold cursor-pointer transition ${
                            isChecked
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-900/50 dark:text-emerald-200'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked)
                                setRuleAllowedLocations([...ruleAllowedLocations, loc.id as any]);
                              else setRuleAllowedLocations(ruleAllowedLocations.filter((l) => l !== loc.id));
                            }}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>{loc.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Group 3: Allowed Services */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                    3. Allowed Services
                  </label>
                  <p className="text-[10px] text-slate-500 mb-1">Pilih jenis ibadah yang diizinkan (Kosongkan jika semua ibadah Boleh):</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'Service U1', label: 'Service U1' },
                      { id: 'Service U2-U3', label: 'Service U2-U3' },
                      { id: 'Service U4-U5', label: 'Service U4-U5' },
                    ].map((svc) => {
                      const isChecked = ruleAllowedServices.includes(svc.id as any);
                      return (
                        <label
                          key={svc.id}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold cursor-pointer transition ${
                            isChecked
                              ? 'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-900/50 dark:text-amber-200'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked)
                                setRuleAllowedServices([...ruleAllowedServices, svc.id as any]);
                              else setRuleAllowedServices(ruleAllowedServices.filter((s) => s !== svc.id));
                            }}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span>{svc.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Catatan Khusus Rule:
                  </label>
                  <input
                    type="text"
                    value={ruleNotes}
                    onChange={(e) => setRuleNotes(e.target.value)}
                    placeholder="Contoh: Hanya Minggu, Hanya Service 1, Tanpa English Service"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Catatan internal admin..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  Simpan SD Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL 2: SD DETAIL & REQUEST ARCHITECTURE ==================== */}
      {isDetailOpen && detailSD && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-6">
            <div className="flex items-start justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md">
                  {detailSD.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{detailSD.name}</h2>
                  <p className="text-xs text-slate-500">{detailSD.qualification || 'Service Director'}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Detail Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
              <button
                onClick={() => setDetailTab('profile')}
                className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
                  detailTab === 'profile'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Profil & Rules
              </button>
              <button
                onClick={() => setDetailTab('history')}
                className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
                  detailTab === 'history'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                History Pelayanan
              </button>
              <button
                onClick={() => setDetailTab('requests')}
                className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
                  detailTab === 'requests'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5 text-indigo-500" />
                <span>Requests (Architecture)</span>
              </button>
            </div>

            {/* TAB CONTENT */}
            {detailTab === 'profile' && (
              <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                  <div>
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">Status SD</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 uppercase">{detailSD.status}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">Maksimal Servis / Bulan</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100">
                      {detailSD.max_services_per_month || 4}x / Bulan
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">No. HP</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{detailSD.phone || '-'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">Email</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{detailSD.email || '-'}</span>
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
                  <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">Aturan Khusus (Special Rules):</h4>
                  <p className="text-slate-600 dark:text-slate-300">
                    {detailSD.special_rules?.notes || 'Tidak ada aturan pembatasan khusus.'}
                  </p>
                </div>
              </div>
            )}

            {detailTab === 'history' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">Daftar riwayat tugas Service Director untuk {detailSD.name}:</p>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2 max-h-60 overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-100">Agustus 2026 • Minggu 1</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                      Barat U1
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-100">Agustus 2026 • Minggu 2</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                      Timur U1
                    </span>
                  </div>
                </div>
              </div>
            )}

            {detailTab === 'requests' && (
              <div className="space-y-4">
                <div className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 p-4 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                  <p className="font-extrabold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Arsitektur Request Service Director</span>
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    Modul ini disiapkan sebagai wadah pengajuan permintaan jadwal (Preferensi tanggal, lokasi, atau izin khusus) dari SD kepada Admin.
                  </p>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Sample Pending Request:</h4>
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100">Request: Preferensi English Service</span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">PENDING</span>
                    </div>
                    <p className="text-slate-500">"Meminta jadwal di English Service untuk minggu ke-2 bulan depan."</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end border-t pt-4 border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
