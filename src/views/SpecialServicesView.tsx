import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  Plus,
  Shield,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  CheckCircle,
  AlertTriangle,
  Users,
  Filter,
  MoreVertical,
  Copy,
  Ban,
  Check,
  AlertCircle,
  X,
  Search,
  CheckSquare,
  Square,
  Archive,
  RefreshCw,
} from 'lucide-react';
import { store } from '../db/store';
import { SpecialService, SpecialServiceSlot, Team, SpecialServiceStatus } from '../types';

interface SpecialServicesViewProps {
  selectedMonth?: number;
  selectedYear?: number;
}

export const SpecialServicesView: React.FC<SpecialServicesViewProps> = ({
  selectedMonth: propsSelectedMonth,
  selectedYear: propsSelectedYear,
}) => {
  const [specialServices, setSpecialServices] = useState<SpecialService[]>(() => store.getSpecialServices());
  const [teams, setTeams] = useState<Team[]>(() => store.getTeams());

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(propsSelectedMonth || (currentDate.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<number>(propsSelectedYear || currentDate.getFullYear());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (propsSelectedMonth !== undefined) setSelectedMonth(propsSelectedMonth);
    if (propsSelectedYear !== undefined) setSelectedYear(propsSelectedYear);
  }, [propsSelectedMonth, propsSelectedYear]);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync Cloud State
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const handleSyncCloud = async () => {
    setIsSyncing(true);
    try {
      await store.syncFromCloud(selectedMonth, selectedYear);
      showToast('Berhasil menyinkronkan data dengan Supabase Cloud');
    } catch (e: any) {
      showToast('Gagal menyinkronkan data: ' + (e.message || String(e)));
    } finally {
      setIsSyncing(false);
    }
  };

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingService, setEditingService] = useState<SpecialService | null>(null);
  const [deletingService, setDeletingService] = useState<SpecialService | null>(null);
  const [deletingSlotInfo, setDeletingSlotInfo] = useState<{ service: SpecialService; slot: SpecialServiceSlot } | null>(null);

  // Menu Dropdown Open State per card
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Finalized Protection Type Input
  const [deleteConfirmTextInput, setDeleteConfirmTextInput] = useState<string>('');

  // Multi-Select Bulk Delete
  const [isBulkSelectMode, setIsBulkSelectMode] = useState<boolean>(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState<boolean>(false);

  // Form states for Create/Edit
  const [form, setForm] = useState({
    event_name: '',
    date: `${propsSelectedYear || 2026}-${String(propsSelectedMonth || 8).padStart(2, '0')}-15`,
    location_type: 'existing' as 'existing' | 'custom',
    location_id: 'barat' as 'barat' | 'timur' | 'selatan' | 'pusura' | 'english',
    custom_location_name: '',
    notes: '',
    status: 'active' as SpecialServiceStatus,
    assignment_mode: 'auto' as 'auto' | 'pre_assign',
    countsAsServiceAssignment: false,
    offImpact: 'NONE' as 'NONE' | 'CURRENT_SERVICE_WEEKEND' | 'NEXT_SERVICE_WEEKEND',
    slot_name: 'Main Session',
    start_time: '19:00',
    end_time: '21:00',
    teams_required: 1,
    assigned_team_id: '',
  });

  const handleOpenCreateModal = () => {
    const defaultDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-15`;
    setForm({
      event_name: '',
      date: defaultDate,
      location_type: 'existing',
      location_id: 'barat',
      custom_location_name: '',
      notes: '',
      status: 'active',
      assignment_mode: 'auto',
      countsAsServiceAssignment: false,
      offImpact: 'NONE',
      slot_name: 'Main Session',
      start_time: '19:00',
      end_time: '21:00',
      teams_required: 1,
      assigned_team_id: '',
    });
    setIsCreateOpen(true);
  };

  // Subscribe to store updates
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setSpecialServices(store.getSpecialServices());
      setTeams(store.getTeams());
    });
    return () => unsubscribe();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const refreshData = () => {
    setSpecialServices(store.getSpecialServices());
    setTeams(store.getTeams());
  };

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();

    const dateObj = new Date(form.date);
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();

    const newSlot: SpecialServiceSlot = {
      id: `slot-${Date.now()}`,
      slot_name: form.slot_name || 'Main Session',
      start_time: form.start_time || '19:00',
      end_time: form.end_time || '21:00',
      teams_required: form.teams_required || 1,
      assigned_team_ids: form.assigned_team_id ? [form.assigned_team_id] : [],
    };

    store.addSpecialService({
      event_name: form.event_name,
      date: form.date,
      location_type: form.location_type,
      location_id: form.location_type === 'existing' ? form.location_id : undefined,
      custom_location_name: form.location_type === 'custom' ? form.custom_location_name : undefined,
      notes: form.notes,
      status: form.status || 'active',
      assignment_mode: form.assignment_mode,
      is_locked: form.assignment_mode === 'pre_assign',
      countsAsServiceAssignment: form.countsAsServiceAssignment,
      offImpact: form.offImpact,
      slots: [newSlot],
      month,
      year,
    });

    setIsCreateOpen(false);
    resetForm();
    refreshData();
    showToast(`Special Service "${form.event_name}" berhasil dibuat.`);
  };

  const handleOpenEditModal = (service: SpecialService) => {
    setEditingService(service);
    const mainSlot = service.slots[0] || { slot_name: 'Main Session', start_time: '19:00', end_time: '21:00', teams_required: 1, assigned_team_ids: [] };
    setForm({
      event_name: service.event_name,
      date: service.date,
      location_type: service.location_type,
      location_id: service.location_id || 'barat',
      custom_location_name: service.custom_location_name || '',
      notes: service.notes || '',
      status: service.status,
      assignment_mode: service.assignment_mode,
      countsAsServiceAssignment: service.countsAsServiceAssignment ?? false,
      offImpact: service.offImpact ?? 'NONE',
      slot_name: mainSlot.slot_name,
      start_time: mainSlot.start_time,
      end_time: mainSlot.end_time || '21:00',
      teams_required: mainSlot.teams_required,
      assigned_team_id: mainSlot.assigned_team_ids[0] || '',
    });
    setOpenMenuId(null);
  };

  const handleSaveEditService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    const dateObj = new Date(form.date);
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();

    const updatedSlots: SpecialServiceSlot[] = editingService.slots.length > 0
      ? editingService.slots.map((s, idx) => {
          if (idx === 0) {
            return {
              ...s,
              slot_name: form.slot_name,
              start_time: form.start_time,
              end_time: form.end_time,
              teams_required: form.teams_required,
              assigned_team_ids: form.assigned_team_id ? [form.assigned_team_id] : [],
            };
          }
          return s;
        })
      : [
          {
            id: `slot-${Date.now()}`,
            slot_name: form.slot_name,
            start_time: form.start_time,
            end_time: form.end_time,
            teams_required: form.teams_required,
            assigned_team_ids: form.assigned_team_id ? [form.assigned_team_id] : [],
          },
        ];

    store.updateSpecialService(editingService.id, {
      event_name: form.event_name,
      date: form.date,
      location_type: form.location_type,
      location_id: form.location_type === 'existing' ? form.location_id : undefined,
      custom_location_name: form.location_type === 'custom' ? form.custom_location_name : undefined,
      notes: form.notes,
      status: form.status,
      assignment_mode: form.assignment_mode,
      is_locked: form.assignment_mode === 'pre_assign' || !!form.assigned_team_id,
      countsAsServiceAssignment: form.countsAsServiceAssignment,
      offImpact: form.offImpact,
      slots: updatedSlots,
      month,
      year,
    });

    setEditingService(null);
    resetForm();
    refreshData();
    showToast(`Perubahan Special Service "${form.event_name}" berhasil disimpan.`);
  };

  const handleDuplicateService = (service: SpecialService) => {
    const dup = store.duplicateSpecialService(service.id);
    setOpenMenuId(null);
    if (dup) {
      refreshData();
      showToast(`Berhasil menduplikasi "${service.event_name}".`);
    }
  };

  const handleToggleCancelStatus = (service: SpecialService) => {
    const newStatus: SpecialServiceStatus = service.status === 'cancelled' ? 'active' : 'cancelled';
    store.updateSpecialService(service.id, { status: newStatus });
    setOpenMenuId(null);
    refreshData();
    showToast(`Status "${service.event_name}" diubah menjadi ${newStatus.toUpperCase()}.`);
  };

  const handleToggleLock = (service: SpecialService) => {
    store.updateSpecialService(service.id, {
      is_locked: !service.is_locked,
    });
    refreshData();
    showToast(`Status penguncian "${service.event_name}" diperbarui.`);
  };

  const handleAssignTeamToSlot = (service: SpecialService, slotId: string, teamId: string) => {
    const updatedSlots = service.slots.map((s) => {
      if (s.id === slotId) {
        return {
          ...s,
          assigned_team_ids: teamId ? [teamId] : [],
        };
      }
      return s;
    });

    store.updateSpecialService(service.id, {
      slots: updatedSlots,
      assignment_mode: teamId ? 'pre_assign' : 'auto',
      is_locked: !!teamId,
    });

    refreshData();
    const assignedTeam = teams.find((t) => t.id === teamId);
    if (assignedTeam) {
      showToast(`Slot ditugaskan ke Team ${assignedTeam.team_number} (${assignedTeam.leader_name}).`);
    } else {
      showToast(`Slot dikembalikan ke mode Auto-Assign.`);
    }
  };

  // Trigger Delete Modal
  const handlePromptDeleteService = (service: SpecialService) => {
    setDeletingService(service);
    setDeleteConfirmTextInput('');
    setOpenMenuId(null);
  };

  // Confirm Delete Service
  const handleConfirmDeleteService = (service: SpecialService) => {
    const res = store.deleteSpecialService(service.id);
    setDeletingService(null);
    if (editingService?.id === service.id) {
      setEditingService(null);
    }
    refreshData();
    showToast(res.message);
  };

  // Confirm Delete Slot
  const handleConfirmDeleteSlot = () => {
    if (!deletingSlotInfo) return;
    const { service, slot } = deletingSlotInfo;
    const res = store.deleteSpecialServiceSlot(service.id, slot.id);
    setDeletingSlotInfo(null);
    refreshData();
    showToast(res.message);
  };

  // Bulk Delete
  const handleConfirmBulkDelete = () => {
    const res = store.bulkDeleteSpecialServices(selectedServiceIds);
    setIsBulkDeleteOpen(false);
    setSelectedServiceIds([]);
    setIsBulkSelectMode(false);
    refreshData();
    showToast(`${res.deletedCount} Special Service berhasil dihapus.`);
  };

  const toggleSelectService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const resetForm = () => {
    setForm({
      event_name: '',
      date: '2026-08-13',
      location_type: 'existing',
      location_id: 'barat',
      custom_location_name: '',
      notes: '',
      status: 'active',
      assignment_mode: 'auto',
      slot_name: 'Main Session',
      start_time: '19:00',
      end_time: '21:00',
      teams_required: 1,
      assigned_team_id: '',
    });
  };

  // Helper formatting date
  const formatDateDisplay = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Filtered Services
  const filteredServices = specialServices
    .filter((s) => s.month === selectedMonth && s.year === selectedYear)
    .filter((s) => {
      if (statusFilter === 'all') return true;
      return s.status === statusFilter;
    })
    .filter((s) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const loc = s.location_type === 'custom' ? s.custom_location_name : `GMS ${s.location_id}`;
      return (
        s.event_name.toLowerCase().includes(q) ||
        (loc && loc.toLowerCase().includes(q)) ||
        s.date.includes(q)
      );
    });

  // Calculate info for deleting service modal
  const scheduleForMonth = deletingService ? store.getScheduleByMonthYear(deletingService.month, deletingService.year) : undefined;
  const isFinalizedSchedule = scheduleForMonth?.status === 'finalized';
  const isDraftSchedule = scheduleForMonth && scheduleForMonth.status !== 'finalized';

  // Find if deletingService has assignments
  const currentAssignments = store.getAssignments();
  const matchedAssignments = deletingService
    ? currentAssignments.filter(
        (a) =>
          a.service_date === deletingService.date &&
          ((deletingService.location_id && a.location_id === deletingService.location_id) ||
            deletingService.slots.some((s) => a.slot_id === s.id || a.id.includes(s.id)))
      )
    : [];
  
  const assignedTeamNames = matchedAssignments
    .map((a) => {
      const t = teams.find((tm) => tm.id === a.team_id);
      return t ? `Team ${t.team_number} (${t.leader_name})` : undefined;
    })
    .filter(Boolean)
    .join(', ');

  const hasPreAssignedLock = deletingService
    ? deletingService.is_locked ||
      deletingService.slots.some((s) => s.assigned_team_ids.length > 0)
    : false;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-indigo-500/30 flex items-center gap-3 animate-fade-in text-xs font-semibold">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md p-6 rounded-3xl border border-white/60 dark:border-slate-700/60 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Special Services & Events
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {filteredServices.length} Event
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Input, edit, kelola penugasan, dan hapus jadwal ibadah khusus (Jumat Agung, Natal, Revival Night, Doa Malam).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncCloud}
            disabled={isSyncing}
            className="px-3 py-2 text-xs font-bold rounded-xl border transition flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-200 disabled:opacity-50 cursor-pointer"
            title="Sinkronkan data dengan Supabase Cloud"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Cloud'}
          </button>

          <button
            onClick={() => {
              setIsBulkSelectMode(!isBulkSelectMode);
              setSelectedServiceIds([]);
            }}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition flex items-center gap-1.5 ${
              isBulkSelectMode
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-200'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            {isBulkSelectMode ? 'Batal Bulk Select' : 'Multi-Select Mode'}
          </button>

          {isBulkSelectMode && selectedServiceIds.length > 0 && (
            <button
              onClick={() => setIsBulkDeleteOpen(true)}
              className="px-3.5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Hapus Selected ({selectedServiceIds.length})
            </button>
          )}

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tambah Special Event
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari event atau lokasi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
          />
        </div>

        {/* Month Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Bulan:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="w-full text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
          >
            <option value={5}>Mei 2026</option>
            <option value={6}>Juni 2026</option>
            <option value={7}>Juli 2026</option>
            <option value={8}>Agustus 2026</option>
            <option value={9}>September 2026</option>
            <option value={10}>Oktober 2026</option>
            <option value={11}>November 2026</option>
            <option value={12}>Desember 2026</option>
          </select>
        </div>

        {/* Year Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Tahun:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="w-full text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
          >
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
          >
            <option value="all">Semua Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Special Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredServices.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white/60 dark:bg-slate-800/60 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 space-y-3">
            <Sparkles className="w-10 h-10 mx-auto opacity-40 text-indigo-500" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Tidak ada Special Service ditemukan untuk filter ini
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl hover:bg-indigo-100 transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Tambah Special Service Baru
            </button>
          </div>
        ) : (
          filteredServices.map((service) => {
            const isSelected = selectedServiceIds.includes(service.id);
            const isCancelled = service.status === 'cancelled';

            return (
              <div
                key={service.id}
                className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border transition-all p-5 shadow-sm space-y-4 relative ${
                  isCancelled
                    ? 'opacity-70 border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30'
                    : isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'border-white/60 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {/* Multi Select Checkbox */}
                {isBulkSelectMode && (
                  <button
                    onClick={() => toggleSelectService(service.id)}
                    className="absolute top-4 left-4 z-10 text-indigo-600 dark:text-indigo-400"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-indigo-600" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                )}

                <div className={`flex items-start justify-between gap-3 ${isBulkSelectMode ? 'pl-7' : ''}`}>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          service.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : service.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : service.status === 'draft'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {service.status}
                      </span>

                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        {formatDateDisplay(service.date)}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-1.5 flex items-center gap-2">
                      {service.event_name}
                      {isCancelled && (
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md">
                          [CANCELLED]
                        </span>
                      )}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      {service.location_type === 'custom'
                        ? service.custom_location_name
                        : `GMS ${service.location_id?.toUpperCase()}`}
                    </p>
                  </div>

                  {/* Actions Group */}
                  <div className="flex items-center gap-1.5 relative">
                    {/* Quick Lock */}
                    <button
                      onClick={() => handleToggleLock(service)}
                      title={service.is_locked ? 'Pre-Assigned / Locked' : 'Unlocked (Auto)'}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                    >
                      {service.is_locked ? (
                        <Lock className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Unlock className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {/* Quick Edit */}
                    <button
                      onClick={() => handleOpenEditModal(service)}
                      title="Edit Special Service"
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Quick Delete (Destructive) */}
                    <button
                      onClick={() => handlePromptDeleteService(service)}
                      title="Hapus Special Service"
                      className="p-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* More Menu Toggle */}
                    <button
                      onClick={() => setOpenMenuId(openMenuId === service.id ? null : service.id)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Action Dropdown Menu */}
                    {openMenuId === service.id && (
                      <div className="absolute right-0 top-9 z-30 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 text-xs font-semibold animate-in fade-in zoom-in-95">
                        <button
                          onClick={() => handleOpenEditModal(service)}
                          className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-indigo-500" /> Edit Event
                        </button>
                        <button
                          onClick={() => handleDuplicateService(service)}
                          className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2"
                        >
                          <Copy className="w-3.5 h-3.5 text-blue-500" /> Duplicate Event
                        </button>
                        <button
                          onClick={() => handleToggleCancelStatus(service)}
                          className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 flex items-center gap-2"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          {service.status === 'cancelled' ? 'Aktifkan Event' : 'Cancel Service'}
                        </button>
                        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                        <button
                          onClick={() => handlePromptDeleteService(service)}
                          className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center gap-2 font-bold"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete Special Service
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {service.notes && (
                  <p className="text-xs bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl text-slate-600 dark:text-slate-300 italic border border-slate-100 dark:border-slate-800">
                    "{service.notes}"
                  </p>
                )}

                {/* Slots & Team Assignment */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Slot Ibadah ({service.slots.length} Slot):
                    </span>
                  </div>

                  {service.slots.map((slot) => {
                    const assignedTeamId = slot.assigned_team_ids[0];
                    const assignedTeam = teams.find((t) => t.id === assignedTeamId);

                    return (
                      <div
                        key={slot.id}
                        className="p-3 bg-slate-50/80 dark:bg-slate-900/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            {slot.slot_name} ({slot.start_time} - {slot.end_time || 'Selesai'})
                          </span>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              Butuh: {slot.teams_required} Tim
                            </span>

                            {/* Delete Slot Button */}
                            <button
                              onClick={() => setDeletingSlotInfo({ service, slot })}
                              title="Hapus slot ini saja"
                              className="p-1 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 hover:bg-rose-200 transition"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Team Selector */}
                        <div className="flex items-center gap-2 pt-1">
                          <select
                            disabled={isCancelled}
                            value={assignedTeamId || ''}
                            onChange={(e) => handleAssignTeamToSlot(service, slot.id, e.target.value)}
                            className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium"
                          >
                            <option value="">-- Mode Auto-Assign (Otomatis Engine) --</option>
                            {teams.map((t) => (
                              <option key={t.id} value={t.id}>
                                Team {t.team_number} ({t.name} - Leader: {t.leader_name || '-'})
                              </option>
                            ))}
                          </select>
                        </div>

                        {assignedTeam ? (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Pre-Assigned ke Team {assignedTeam.team_number} ({assignedTeam.leader_name})
                          </p>
                        ) : (
                          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                            {isCancelled
                              ? 'Event dibatalkan (dikecualikan dari penjadwalan engine).'
                              : 'Akan otomatis dijadwalkan oleh scheduling engine dengan pemerataan kuota.'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: Create Special Service */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                Tambah Special Service / Special Event
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateService} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Acara / Ibadah Khusus</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Revival Night / Christmas Celebration"
                  value={form.event_name}
                  onChange={(e) => setForm({ ...form, event_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tanggal Pelaksanaan</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipe Lokasi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, location_type: 'existing' })}
                    className={`p-2.5 rounded-xl border text-center font-semibold transition ${
                      form.location_type === 'existing'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    GMS Sektor Saja
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, location_type: 'custom' })}
                    className={`p-2.5 rounded-xl border text-center font-semibold transition ${
                      form.location_type === 'custom'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    Lokasi Khusus (Ballroom/Luar)
                  </button>
                </div>
              </div>

              {form.location_type === 'existing' ? (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Pilih Sektor GMS</label>
                  <select
                    value={form.location_id}
                    onChange={(e) => setForm({ ...form, location_id: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium"
                  >
                    <option value="barat">GMS Barat</option>
                    <option value="timur">GMS Timur</option>
                    <option value="selatan">GMS Selatan</option>
                    <option value="pusura">GMS Pusura</option>
                    <option value="english">English Service</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Lokasi Khusus</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Grand Ballroom Hotel Ciputra"
                    value={form.custom_location_name}
                    onChange={(e) => setForm({ ...form, custom_location_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Jam Mulai</label>
                  <input
                    type="text"
                    placeholder="19:00"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Jam Selesai</label>
                  <input
                    type="text"
                    placeholder="21:00"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mode Penugasan Tim</label>
                <select
                  value={form.assignment_mode}
                  onChange={(e) => setForm({ ...form, assignment_mode: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="auto">Otomatis Oleh Engine (Pemerataan Kuota)</option>
                  <option value="pre_assign">Pre-Assign Tim Tertentu</option>
                </select>
              </div>

              {form.assignment_mode === 'pre_assign' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Pilih Tim Yang Ditugaskan</label>
                  <select
                    value={form.assigned_team_id}
                    onChange={(e) => setForm({ ...form, assigned_team_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium"
                  >
                    <option value="">-- Pilih Tim --</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        Team {t.team_number} ({t.name} - Leader: {t.leader_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Catatan</label>
                <textarea
                  rows={2}
                  placeholder="Catatan tambahan untuk ibadah ini..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md cursor-pointer"
                >
                  Simpan Special Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Special Service */}
      {editingService && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                Edit Special Service
              </h3>
              <button
                onClick={() => setEditingService(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditService} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Event</label>
                <input
                  type="text"
                  required
                  value={form.event_name}
                  onChange={(e) => setForm({ ...form, event_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Status Event</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-semibold"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipe Lokasi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, location_type: 'existing' })}
                    className={`p-2.5 rounded-xl border text-center font-semibold transition ${
                      form.location_type === 'existing'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    GMS Sektor Saja
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, location_type: 'custom' })}
                    className={`p-2.5 rounded-xl border text-center font-semibold transition ${
                      form.location_type === 'custom'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    Lokasi Khusus
                  </button>
                </div>
              </div>

              {form.location_type === 'existing' ? (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Pilih Sektor GMS</label>
                  <select
                    value={form.location_id}
                    onChange={(e) => setForm({ ...form, location_id: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium"
                  >
                    <option value="barat">GMS Barat</option>
                    <option value="timur">GMS Timur</option>
                    <option value="selatan">GMS Selatan</option>
                    <option value="pusura">GMS Pusura</option>
                    <option value="english">English Service</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Lokasi Khusus</label>
                  <input
                    type="text"
                    required
                    value={form.custom_location_name}
                    onChange={(e) => setForm({ ...form, custom_location_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Jam Mulai</label>
                  <input
                    type="text"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Jam Selesai</label>
                  <input
                    type="text"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mode Penugasan Tim</label>
                <select
                  value={form.assignment_mode}
                  onChange={(e) => setForm({ ...form, assignment_mode: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="auto">Otomatis Oleh Engine (Pemerataan Kuota)</option>
                  <option value="pre_assign">Pre-Assign Tim Tertentu</option>
                </select>
              </div>

              {form.assignment_mode === 'pre_assign' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Pilih Tim Yang Ditugaskan</label>
                  <select
                    value={form.assigned_team_id}
                    onChange={(e) => setForm({ ...form, assigned_team_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium"
                  >
                    <option value="">-- Pilih Tim --</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        Team {t.team_number} ({t.name} - Leader: {t.leader_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Catatan</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                {/* Prominent Delete Button inside Edit Modal */}
                <button
                  type="button"
                  onClick={() => handlePromptDeleteService(editingService)}
                  className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-400 rounded-xl transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Special Service
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingService(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE CONFIRMATION DIALOG */}
      {deletingService && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-100 dark:bg-rose-950 text-rose-600 rounded-2xl flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isFinalizedSchedule ? 'Finalized Service Warning' : 'Delete Special Service?'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Konfirmasi penghapusan ibadah khusus dari database.
                </p>
              </div>
            </div>

            {/* Event Summary Box */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1 text-xs">
              <p className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                {deletingService.event_name}
              </p>
              <p className="text-slate-600 dark:text-slate-300 font-medium">
                {formatDateDisplay(deletingService.date)}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Jam: {deletingService.slots[0]?.start_time || '19:00'} | Lokasi:{' '}
                {deletingService.location_type === 'custom'
                  ? deletingService.custom_location_name
                  : `GMS ${deletingService.location_id?.toUpperCase()}`}
              </p>
            </div>

            {/* Warning Message Box according to prompt scenarios */}
            {isFinalizedSchedule ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-xl text-xs space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  This Special Service is part of a finalized schedule and historical service records may already exist.
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Untuk keamanan historical data, disarankan memilih <strong>Cancel Service</strong>.
                </p>
                <div className="pt-2">
                  <label className="block font-bold text-[11px] text-slate-700 dark:text-slate-300 mb-1">
                    Atau ketik <strong>DELETE</strong> untuk konfirmasi hapus permanen:
                  </label>
                  <input
                    type="text"
                    placeholder="Ketik DELETE di sini"
                    value={deleteConfirmTextInput}
                    onChange={(e) => setDeleteConfirmTextInput(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-amber-300 rounded-lg text-slate-900 dark:text-slate-100 font-mono uppercase"
                  />
                </div>
              </div>
            ) : isDraftSchedule && matchedAssignments.length > 0 ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-xl text-xs space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Included in Draft Schedule
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  This Special Service is currently included in the schedule and assigned to:{' '}
                  <strong>{assignedTeamNames || 'Team Assignment'}</strong>.
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Deleting it will remove the event and its assignment from the current draft schedule. Monthly fairness may need to be recalculated.
                </p>
              </div>
            ) : hasPreAssignedLock ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-xl text-xs space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-600" />
                  Locked Assignment Notice
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  This Special Service has a locked / pre-assigned team constraint. Deleting the event will also remove this locked assignment.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 rounded-xl text-xs space-y-1">
                <p className="font-bold">Are you sure you want to delete this Special Service?</p>
                <p className="text-slate-600 dark:text-slate-300">
                  This action will remove this Special Service from the monthly scheduling pool.
                </p>
              </div>
            )}

            {/* Buttons: Default focus on Cancel */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                autoFocus
                onClick={() => setDeletingService(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                Cancel
              </button>

              {isFinalizedSchedule ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      store.updateSpecialService(deletingService.id, { status: 'cancelled' });
                      setDeletingService(null);
                      refreshData();
                      showToast(`Special Service "${deletingService.event_name}" di-archive / cancel.`);
                    }}
                    className="px-4 py-2.5 text-xs font-bold text-amber-800 bg-amber-200 hover:bg-amber-300 dark:bg-amber-900 dark:text-amber-100 rounded-xl cursor-pointer"
                  >
                    Archive / Cancel Service
                  </button>

                  <button
                    type="button"
                    disabled={deleteConfirmTextInput.trim().toUpperCase() !== 'DELETE'}
                    onClick={() => handleConfirmDeleteService(deletingService)}
                    className="px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl cursor-pointer"
                  >
                    Delete Finalized Service
                  </button>
                </>
              ) : isDraftSchedule && matchedAssignments.length > 0 ? (
                <button
                  type="button"
                  onClick={() => handleConfirmDeleteService(deletingService)}
                  className="px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Delete & Recalculate Schedule
                </button>
              ) : hasPreAssignedLock ? (
                <button
                  type="button"
                  onClick={() => handleConfirmDeleteService(deletingService)}
                  className="px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md cursor-pointer"
                >
                  Delete Event & Assignment
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleConfirmDeleteService(deletingService)}
                  className="px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md cursor-pointer"
                >
                  Delete Special Service
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE INDIVIDUAL SLOT CONFIRMATION */}
      {deletingSlotInfo && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-100 dark:bg-rose-950 text-rose-600 rounded-2xl flex-shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Slot?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Hapus slot ibadah spesifik tanpa menghapus seluruh event.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs space-y-1">
              <p className="font-extrabold text-slate-800 dark:text-slate-100">
                Event: {deletingSlotInfo.service.event_name}
              </p>
              <p className="text-slate-600 dark:text-slate-300 font-semibold">
                Slot: {deletingSlotInfo.slot.slot_name} ({deletingSlotInfo.slot.start_time} - {deletingSlotInfo.slot.end_time || 'Selesai'})
              </p>
            </div>

            {deletingSlotInfo.slot.assigned_team_ids.length > 0 ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-xl text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Assigned Slot Warning
                </p>
                <p>
                  This slot is currently assigned to{' '}
                  <strong>
                    {teams.find((t) => t.id === deletingSlotInfo.slot.assigned_team_ids[0])?.name || 'Team Assignment'}
                  </strong>
                  . Deleting the slot will also remove the team assignment and update monthly service count.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Apakah Anda yakin ingin menghapus slot ini dari {deletingSlotInfo.service.event_name}?
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSlotInfo(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSlot}
                className="px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md cursor-pointer"
              >
                {deletingSlotInfo.slot.assigned_team_ids.length > 0 ? 'Delete Slot & Assignment' : 'Delete Slot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: BULK DELETE CONFIRMATION */}
      {isBulkDeleteOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-100 dark:bg-rose-950 text-rose-600 rounded-2xl flex-shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Selected Special Services?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Menghapus {selectedServiceIds.length} Special Service sekaligus.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Apakah Anda yakin ingin menghapus {selectedServiceIds.length} event yang telah dipilih? Semua penugasan terkait juga akan dibersihkan.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md cursor-pointer"
              >
                Delete Selected Events
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
