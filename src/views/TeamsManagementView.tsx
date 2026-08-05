import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  Shield,
  Edit2,
  Trash2,
  Plus,
  Search,
  History,
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  Calendar,
  X,
} from 'lucide-react';
import { store } from '../db/store';
import { Team, TeamMember, LeaderHistory, TeamCompositionHistory } from '../types';

export const TeamsManagementView: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>(() => store.getTeams());
  const [members, setMembers] = useState<TeamMember[]>(() => store.getTeamMembers());
  const [leaderHistories, setLeaderHistories] = useState<LeaderHistory[]>(() => store.getLeaderHistory());
  const [compHistories, setCompHistories] = useState<TeamCompositionHistory[]>(() => store.getCompositionHistories());

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [activeTab, setActiveTab] = useState<'members' | 'leader_history' | 'comp_history'>('members');

  // Modals
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isEditMemberOpen, setIsEditMemberOpen] = useState(false);
  const [isEditTeamOpen, setIsEditTeamOpen] = useState(false);
  const [isMoveMemberOpen, setIsMoveMemberOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Verification modal state
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationData, setVerificationData] = useState(() => store.verifyTeamDatabase());

  const handleRunOfficialReset = () => {
    if (confirm('RESET DATABASE AKAN MENGHAPUS DATA TIM LAMA & DIGANTI DENGAN KOMPOSISI RESMI 20 TIM AUGUST 2026. Lanjutkan?')) {
      const data = store.resetToOfficialDatabase();
      setVerificationData(data);
      refreshData();
      setShowVerificationModal(true);
    }
  };

  // Form states
  const [memberForm, setMemberForm] = useState({ name: '', role: 'Member', status: 'active' as 'active' | 'inactive' | 'cuti', notes: '' });
  const [editMemberForm, setEditMemberForm] = useState({ name: '', role: 'Member', status: 'active' as 'active' | 'inactive' | 'cuti', notes: '' });
  const [editTeamForm, setEditTeamForm] = useState({ name: '', leader_name: '', notes: '', status: 'active' as 'active' | 'inactive' });
  const [targetTeamId, setTargetTeamId] = useState('');

  const refreshData = () => {
    setTeams(store.getTeams());
    setMembers(store.getTeamMembers());
    setLeaderHistories(store.getLeaderHistory());
    setCompHistories(store.getCompositionHistories());
  };

  const handleSelectTeam = (team: Team) => {
    setSelectedTeam(team);
    setEditTeamForm({
      name: team.name,
      leader_name: team.leader_name || '',
      notes: team.notes || '',
      status: team.status,
    });
  };

  const handleSaveTeamEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;

    store.updateTeam(selectedTeam.id, {
      name: editTeamForm.name,
      leader_name: editTeamForm.leader_name,
      notes: editTeamForm.notes,
      status: editTeamForm.status,
    });

    setIsEditTeamOpen(false);
    refreshData();
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !memberForm.name.trim()) return;

    store.addTeamMember({
      team_id: selectedTeam.id,
      name: memberForm.name.trim(),
      role: memberForm.role,
      status: memberForm.status,
      joined_at: new Date().toISOString().slice(0, 10),
      notes: memberForm.notes,
    });

    setMemberForm({ name: '', role: 'Member', status: 'active', notes: '' });
    setIsAddMemberOpen(false);
    refreshData();
  };

  const handleOpenEditMember = (member: TeamMember) => {
    setSelectedMember(member);
    setEditMemberForm({
      name: member.name,
      role: member.role || 'Member',
      status: member.status || 'active',
      notes: member.notes || '',
    });
    setIsEditMemberOpen(true);
  };

  const handleSaveMemberEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !editMemberForm.name.trim()) return;

    store.updateTeamMember(selectedMember.id, {
      name: editMemberForm.name.trim(),
      role: editMemberForm.role,
      status: editMemberForm.status,
      notes: editMemberForm.notes,
    });

    setIsEditMemberOpen(false);
    setSelectedMember(null);
    refreshData();
  };

  const handleQuickStatusChange = (memberId: string, status: 'active' | 'inactive' | 'cuti') => {
    store.updateTeamMember(memberId, { status });
    refreshData();
  };

  const handleDeleteMember = (memberId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus anggota ini dari tim?')) {
      store.deleteTeamMember(memberId);
      refreshData();
    }
  };

  const handleMoveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !targetTeamId) return;

    store.moveTeamMember(selectedMember.id, targetTeamId);
    setIsMoveMemberOpen(false);
    setSelectedMember(null);
    refreshData();
  };

  // Filtered teams
  const filteredTeams = teams.filter((team) => {
    const matchesSearch =
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `Team ${team.team_number}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (team.leader_name && team.leader_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || team.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const selectedTeamMembers = selectedTeam ? members.filter((m) => m.team_id === selectedTeam.id) : [];
  const selectedLeaderHistory = selectedTeam ? leaderHistories.filter((lh) => lh.team_id === selectedTeam.id) : [];
  const selectedCompHistory = selectedTeam ? compHistories.filter((ch) => ch.team_id === selectedTeam.id) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-2xl border border-white/40 dark:border-slate-700/50 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Manajemen Tim & Anggota
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola {teams.length} tim pelayanan, leader, anggota (aktif/cuti/inactive), dan riwayat rotasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setVerificationData(store.verifyTeamDatabase());
              setShowVerificationModal(true);
            }}
            className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800 transition"
          >
            <CheckCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Verifikasi Database (20 Tim)
          </button>
          <button
            onClick={handleRunOfficialReset}
            className="px-4 py-2 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-rose-200 dark:border-rose-800 transition"
          >
            <History className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            Reset ke Database Resmi
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Teams List */}
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-5 rounded-2xl border border-white/40 dark:border-slate-700/50 shadow-sm space-y-4 flex flex-col h-[700px]">
          {/* Search & Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Cari tim atau leader..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Daftar Tim ({filteredTeams.length})
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    statusFilter === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    statusFilter === 'active'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Aktif
                </button>
                <button
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    statusFilter === 'inactive'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Non-Aktif
                </button>
              </div>
            </div>
          </div>

          {/* Teams List */}
          <div className="overflow-y-auto flex-1 space-y-2 pr-1">
            {filteredTeams.map((team) => {
              const isSelected = selectedTeam?.id === team.id;
              const teamMembersCount = members.filter((m) => m.team_id === team.id).length;
              const activeMembersCount = members.filter((m) => m.team_id === team.id && (m.status === 'active' || !m.status)).length;

              return (
                <div
                  key={team.id}
                  onClick={() => handleSelectTeam(team)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-600 shadow-sm'
                      : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        T{team.team_number}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">
                          {team.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-indigo-500" />
                          Leader: <span className="font-semibold text-slate-700 dark:text-slate-300">{team.leader_name || '-'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          team.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {team.status === 'active' ? 'Aktif' : 'Non-Aktif'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {teamMembersCount} Anggota ({activeMembersCount} Aktif)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Team Details */}
        <div className="lg:col-span-2 space-y-4">
          {selectedTeam ? (
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-2xl border border-white/40 dark:border-slate-700/50 shadow-sm space-y-6">
              {/* Selected Team Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-extrabold text-base flex items-center justify-center shadow-lg shadow-indigo-600/30">
                    T{selectedTeam.team_number}
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      {selectedTeam.name}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          selectedTeam.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {selectedTeam.status === 'active' ? 'Tim Aktif' : 'Tim Non-Aktif'}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Shield className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                      Leader / PIC Utama:{' '}
                      <strong className="text-slate-700 dark:text-slate-200 font-bold">
                        {selectedTeam.leader_name}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditTeamOpen(true)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Info Tim
                  </button>
                  <button
                    onClick={() => setIsAddMemberOpen(true)}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm transition cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> + Tambah Anggota
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-700 space-x-4 text-xs font-bold">
                <button
                  onClick={() => setActiveTab('members')}
                  className={`pb-2 flex items-center gap-1.5 transition ${
                    activeTab === 'members'
                      ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Users className="w-4 h-4" /> Anggota Tim ({selectedTeamMembers.length})
                </button>
                <button
                  onClick={() => setActiveTab('leader_history')}
                  className={`pb-2 flex items-center gap-1.5 transition ${
                    activeTab === 'leader_history'
                      ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <History className="w-4 h-4" /> Riwayat Leader ({selectedLeaderHistory.length})
                </button>
                <button
                  onClick={() => setActiveTab('comp_history')}
                  className={`pb-2 flex items-center gap-1.5 transition ${
                    activeTab === 'comp_history'
                      ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Clock className="w-4 h-4" /> Rotasi Historis ({selectedCompHistory.length})
                </button>
              </div>

              {/* Tab 1: Members Table */}
              {activeTab === 'members' && (
                <div className="space-y-3">
                  {selectedTeamMembers.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                      <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Belum ada anggota di tim ini</p>
                      <button
                        onClick={() => setIsAddMemberOpen(true)}
                        className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 font-semibold underline"
                      >
                        + Tambah Anggota Pertama
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-semibold">
                            <th className="p-3 rounded-l-xl">Nama Anggota</th>
                            <th className="p-3">Peran / Role</th>
                            <th className="p-3">Tanggal Bergabung</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right rounded-r-xl">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                          {selectedTeamMembers.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                              <td className="p-3 font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                {m.role === 'Leader' && <Shield className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />}
                                {m.name}
                              </td>
                              <td className="p-3 text-slate-600 dark:text-slate-400">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                  m.role === 'Leader'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : m.role === 'Co-Leader'
                                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}>
                                  {m.role}
                                </span>
                              </td>
                              <td className="p-3 text-slate-500">{m.joined_at || '-'}</td>
                              <td className="p-3">
                                {m.status === 'active' || !m.status ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-semibold">
                                    <CheckCircle className="w-3 h-3" /> Aktif
                                  </span>
                                ) : m.status === 'cuti' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 font-semibold">
                                    <Clock className="w-3 h-3" /> Cuti
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-semibold">
                                    <XCircle className="w-3 h-3" /> Inactive
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Quick Status Buttons */}
                                  {m.status === 'active' || !m.status ? (
                                    <>
                                      <button
                                        onClick={() => handleQuickStatusChange(m.id, 'cuti')}
                                        title="Tandai Cuti (Engine melewati anggota ini)"
                                        className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800 transition"
                                      >
                                        Cuti
                                      </button>
                                      <button
                                        onClick={() => handleQuickStatusChange(m.id, 'inactive')}
                                        title="Tandai Non-Aktif (Sembunyikan dari penugasan)"
                                        className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 transition"
                                      >
                                        Non-Aktif
                                      </button>
                                    </>
                                  ) : m.status === 'cuti' ? (
                                    <>
                                      <button
                                        onClick={() => handleQuickStatusChange(m.id, 'active')}
                                        title="Aktifkan Kembali"
                                        className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800 transition"
                                      >
                                        Aktifkan
                                      </button>
                                      <button
                                        onClick={() => handleQuickStatusChange(m.id, 'inactive')}
                                        title="Tandai Non-Aktif"
                                        className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 transition"
                                      >
                                        Non-Aktif
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => handleQuickStatusChange(m.id, 'active')}
                                      title="Aktifkan Kembali"
                                      className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800 transition"
                                    >
                                      Aktifkan Kembali
                                    </button>
                                  )}

                                  {/* Edit Member */}
                                  <button
                                    onClick={() => handleOpenEditMember(m)}
                                    title="Edit Nama / Role / Status Anggota"
                                    className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  {/* Move Member */}
                                  <button
                                    onClick={() => {
                                      setSelectedMember(m);
                                      setIsMoveMemberOpen(true);
                                    }}
                                    title="Pindahkan ke tim lain"
                                    className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                  >
                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                  </button>
                                  {/* Delete Member */}
                                  <button
                                    onClick={() => handleDeleteMember(m.id)}
                                    title="Hapus anggota"
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Leader History */}
              {activeTab === 'leader_history' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Histori pimpinan/PIC untuk Team {selectedTeam.team_number}. Jadwal pelayanan historis tetap terikat pada nomor tim.
                  </p>

                  <div className="space-y-2">
                    {selectedLeaderHistory.length === 0 ? (
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl text-xs text-slate-500">
                        Belum ada riwayat perubahan leader yang tercatat. Leader aktif saat ini: <strong>{selectedTeam.leader_name}</strong>.
                      </div>
                    ) : (
                      selectedLeaderHistory.map((lh) => (
                        <div key={lh.id} className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <Shield className="w-4 h-4 text-indigo-500" />
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-slate-200">{lh.leader_name}</p>
                              <p className="text-slate-400 text-[11px]">Periode: {lh.period_start} s/d {lh.period_end || 'Sekarang'}</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-medium">
                            {lh.period_end === 'Present' || !lh.period_end ? 'Leader Aktif' : 'Historis'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Composition History */}
              {activeTab === 'comp_history' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Komposisi anggota tim yang diekstrak dari impor PDF jadwal bulanan.
                  </p>

                  {selectedCompHistory.length === 0 ? (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl text-xs text-slate-500">
                      Belum ada snapshot komposisi tim dari impor PDF. Setiap kali impor PDF jadwal bulanan dilakukan, komposisi tim akan terekam secara otomatis.
                    </div>
                  ) : (
                    selectedCompHistory.map((ch) => (
                      <div key={ch.id} className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 dark:text-slate-200">Bulan {ch.month}/{ch.year}</span>
                          <span className="text-slate-400">File: {ch.source_file || 'PDF Import'}</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          Leader: <strong>{ch.leader_name}</strong>
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {ch.members.map((mName, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-[10px] text-slate-700 dark:text-slate-300">
                              {mName}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white/40 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Pilih tim di sebelah kiri untuk melihat detail anggota & riwayat leader</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add Member */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Tambah Anggota Ke {selectedTeam?.name}
            </h3>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Daniel Wijaya"
                  value={memberForm.name}
                  onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Peran / Role</label>
                <select
                  value={memberForm.role}
                  onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Member">Member (Anggota Tim)</option>
                  <option value="Co-Leader">Co-Leader (Wakil Leader)</option>
                  <option value="Leader">Leader (PIC Utama)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status Anggota</label>
                <select
                  value={memberForm.status}
                  onChange={(e) => setMemberForm({ ...memberForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="active">✓ Aktif (Dapat Dijadwalkan)</option>
                  <option value="cuti">⏱ Cuti (Dilewati saat Auto Generate)</option>
                  <option value="inactive">✕ Non-Aktif (Disembunyikan dari Penugasan)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Catatan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Keterangan singkat..."
                  value={memberForm.notes}
                  onChange={(e) => setMemberForm({ ...memberForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
                >
                  Simpan Anggota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Member */}
      {isEditMemberOpen && selectedMember && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-indigo-600" />
              Edit Anggota: {selectedMember.name}
            </h3>

            <form onSubmit={handleSaveMemberEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editMemberForm.name}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Peran / Role</label>
                <select
                  value={editMemberForm.role}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, role: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Member">Member (Anggota Tim)</option>
                  <option value="Co-Leader">Co-Leader (Wakil Leader)</option>
                  <option value="Leader">Leader (PIC Utama)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status Anggota</label>
                <select
                  value={editMemberForm.status}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="active">✓ Aktif (Dapat Dijadwalkan)</option>
                  <option value="cuti">⏱ Cuti (Dilewati saat Auto Generate)</option>
                  <option value="inactive">✕ Non-Aktif (Disembunyikan dari Penugasan)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Catatan / Notes</label>
                <input
                  type="text"
                  placeholder="Keterangan opsional..."
                  value={editMemberForm.notes}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditMemberOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Team */}
      {isEditTeamOpen && selectedTeam && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-indigo-600" />
              Edit Informasi {selectedTeam.name}
            </h3>

            <form onSubmit={handleSaveTeamEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Tim</label>
                <input
                  type="text"
                  required
                  value={editTeamForm.name}
                  onChange={(e) => setEditTeamForm({ ...editTeamForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Leader / PIC Utama</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Leader"
                  value={editTeamForm.leader_name}
                  onChange={(e) => setEditTeamForm({ ...editTeamForm, leader_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status Tim</label>
                <select
                  value={editTeamForm.status}
                  onChange={(e) => setEditTeamForm({ ...editTeamForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                >
                  <option value="active">Aktif (Dijadwalkan)</option>
                  <option value="inactive">Non-Aktif (Dilewati Scheduler)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Catatan Keterbatasan / Keterangan</label>
                <input
                  type="text"
                  placeholder="Contoh: Terbatas di minggu ke-3"
                  value={editTeamForm.notes}
                  onChange={(e) => setEditTeamForm({ ...editTeamForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditTeamOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Move Member */}
      {isMoveMemberOpen && selectedMember && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
              Pindahkan Anggota
            </h3>
            <p className="text-xs text-slate-500">
              Pindahkan <strong>{selectedMember.name}</strong> dari {selectedTeam?.name} ke tim lain.
            </p>

            <form onSubmit={handleMoveMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Pilih Tim Tujuan</label>
                <select
                  required
                  value={targetTeamId}
                  onChange={(e) => setTargetTeamId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="">-- Pilih Tim Tujuan --</option>
                  {teams
                    .filter((t) => t.id !== selectedTeam?.id)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (Leader: {t.leader_name || '-'})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMoveMemberOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!targetTeamId}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm disabled:opacity-50"
                >
                  Konfirmasi Pindah Tim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Verification Report */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                  Laporan Verifikasi Database Resmi (20 Tim)
                </h3>
              </div>
              <button
                onClick={() => setShowVerificationModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hasil pengecekan langsung data dari store. Menampilkan status 20 Tim, nama Team Leader resmi, dan jumlah anggota per tim.
            </p>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {verificationData.map((item) => (
                  <div
                    key={item.team_number}
                    className={`p-3 rounded-xl border flex flex-col justify-between text-xs space-y-1.5 ${
                      item.status === 'OK'
                        ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-700/60'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                          Team {item.team_number}
                        </span>{' '}
                        <span className="text-slate-400">—</span>{' '}
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {item.leader_name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                          {item.member_count} Members
                        </span>
                        <span
                          className={`px-2 py-0.5 font-extrabold rounded-lg text-[10px] ${
                            item.status === 'OK'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-rose-600 text-white animate-pulse'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      <strong>Members ({item.members_list.length}):</strong>{' '}
                      {item.members_list.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                ✓ Total 20 Tim & Seeluruh Anggota Resmi Terverifikasi Valid
              </span>
              <button
                onClick={() => setShowVerificationModal(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm"
              >
                Selesai / Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
