import React, { useState } from 'react';
import { Users, Plus, Edit2, Trash2, CheckCircle2, XCircle, History, Building2, Clock, X } from 'lucide-react';
import { Team, Assignment } from '../types';
import { SERVICE_LOCATIONS, SERVICE_SLOTS } from '../data/locationsAndSlots';

interface TeamsViewProps {
  teams: Team[];
  assignments: Assignment[];
  onAddTeam: (name: string, notes?: string) => void;
  onUpdateTeam: (id: string, updates: Partial<Team>) => void;
  onDeleteTeam: (id: string) => void;
}

export const TeamsView: React.FC<TeamsViewProps> = ({
  teams,
  assignments,
  onAddTeam,
  onUpdateTeam,
  onDeleteTeam,
}) => {
  const [selectedTeamForDetail, setSelectedTeamForDetail] = useState<Team | null>(null);

  // Add/Edit Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamNotes, setNewTeamNotes] = useState('');

  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    onAddTeam(newTeamName.trim(), newTeamNotes.trim());
    setNewTeamName('');
    setNewTeamNotes('');
    setIsAddModalOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam || !editName.trim()) return;
    onUpdateTeam(editingTeam.id, {
      name: editName.trim(),
      notes: editNotes.trim(),
    });
    setEditingTeam(null);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Header Bar */}
      <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-extrabold text-white">Kelola Tim Pelayanan</h1>
            <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold rounded-full">
              {teams.length} Tim
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tambah, edit, hapus, dan atur status Aktif/Non-Aktif tim. Hanya tim aktif yang dijadwalkan oleh engine.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 border border-indigo-400/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Tim Baru</span>
        </button>
      </div>

      {/* Teams Grid / Table */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-white text-xs uppercase tracking-wider font-bold">
                <th className="p-4 border-b border-white/10">NAMA TIM</th>
                <th className="p-4 border-b border-white/10">STATUS</th>
                <th className="p-4 border-b border-white/10 text-center">TOTAL PELAYANAN</th>
                <th className="p-4 border-b border-white/10">CATATAN</th>
                <th className="p-4 border-b border-white/10 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-medium text-slate-200">
              {teams.map((team) => {
                const teamAssignments = assignments.filter((a) => a.team_id === team.id);

                return (
                  <tr key={team.id} className="hover:bg-white/5 transition">
                    <td className="p-4">
                      <button
                        onClick={() => setSelectedTeamForDetail(team)}
                        className="font-extrabold text-white text-sm hover:text-indigo-400 transition cursor-pointer flex items-center space-x-2"
                      >
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>{team.name}</span>
                      </button>
                    </td>

                    <td className="p-4">
                      <button
                        onClick={() =>
                          onUpdateTeam(team.id, {
                            status: team.status === 'active' ? 'inactive' : 'active',
                          })
                        }
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold border transition cursor-pointer ${
                          team.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                        }`}
                        title="Klik untuk mengubah status"
                      >
                        {team.status === 'active' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>ACTIVE</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-slate-400" />
                            <span>INACTIVE</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="p-4 text-center">
                      <span className="font-extrabold text-white text-sm px-2.5 py-1 bg-white/10 rounded-lg border border-white/10">
                        {teamAssignments.length} Kali
                      </span>
                    </td>

                    <td className="p-4 text-slate-400 italic truncate max-w-[200px]">
                      {team.notes || '-'}
                    </td>

                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedTeamForDetail(team)}
                        className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 font-bold rounded-xl transition cursor-pointer border border-white/10"
                      >
                        Detail History
                      </button>

                      <button
                        onClick={() => {
                          setEditingTeam(team);
                          setEditName(team.name);
                          setEditNotes(team.notes || '');
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-white/10 rounded-lg transition cursor-pointer"
                        title="Edit Tim"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Apakah Anda yakin ingin menghapus ${team.name}?`)) {
                            onDeleteTeam(team.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                        title="Hapus Tim"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Team Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1e293b]/90 backdrop-blur-2xl rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-white/10 text-slate-100">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-lg text-white">Tambah Tim Pelayanan Baru</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs font-semibold text-slate-200">
              <div>
                <label className="block mb-1 text-slate-300">Nama Tim</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Team 21"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-white/15 bg-slate-800/80 text-white placeholder-slate-500 font-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block mb-1 text-slate-300">Catatan Tambahan (Opsional)</label>
                <textarea
                  placeholder="Keterangan anggota / preferensi..."
                  value={newTeamNotes}
                  onChange={(e) => setNewTeamNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-white/15 bg-slate-800/80 text-white placeholder-slate-500 font-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none h-20"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl transition border border-white/10 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 border border-indigo-400/20 transition cursor-pointer"
                >
                  Simpan Tim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1e293b]/90 backdrop-blur-2xl rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-white/10 text-slate-100">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-lg text-white">Edit {editingTeam.name}</h3>
              <button onClick={() => setEditingTeam(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-semibold text-slate-200">
              <div>
                <label className="block mb-1 text-slate-300">Nama Tim</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-white/15 bg-slate-800/80 text-white font-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block mb-1 text-slate-300">Catatan</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-white/15 bg-slate-800/80 text-white font-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none h-20"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl transition border border-white/10 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 border border-indigo-400/20 transition cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Detail Modal */}
      {selectedTeamForDetail && (
        <TeamDetailModal
          team={selectedTeamForDetail}
          assignments={assignments.filter((a) => a.team_id === selectedTeamForDetail.id)}
          onClose={() => setSelectedTeamForDetail(null)}
        />
      )}
    </div>
  );
};

interface TeamDetailModalProps {
  team: Team;
  assignments: Assignment[];
  onClose: () => void;
}

const TeamDetailModal: React.FC<TeamDetailModalProps> = ({ team, assignments, onClose }) => {
  // Location Counts
  const locationCounts: Record<string, number> = {};
  assignments.forEach((a) => {
    const locName = SERVICE_LOCATIONS.find((l) => l.id === a.location_id)?.name || a.location_id;
    locationCounts[locName] = (locationCounts[locName] || 0) + 1;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1e293b]/90 backdrop-blur-2xl rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-white/10 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-white/5 border-b border-white/10 p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">{team.name} — Detailed History</h3>
              <p className="text-xs text-slate-400">Total Services: {assignments.length} Kali</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-slate-200 text-xs">
          {/* Location Breakdown */}
          <div className="space-y-2">
            <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
              Distribusi Lokasi Pelayanan
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SERVICE_LOCATIONS.map((loc) => (
                <div key={loc.id} className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{loc.name}</span>
                  <p className="font-extrabold text-white text-base">
                    {locationCounts[loc.name] || 0} Kali
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* History Log Table */}
          <div className="space-y-2">
            <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
              Riwayat Jadwal Pelayanan ({assignments.length})
            </h4>
            <div className="border border-white/10 rounded-xl overflow-hidden max-h-56 overflow-y-auto bg-white/5">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900/90 text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5 border-b border-white/10">TANGGAL</th>
                    <th className="p-2.5 border-b border-white/10">LOKASI</th>
                    <th className="p-2.5 border-b border-white/10">SLOT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {assignments.map((asgn) => {
                    const loc = SERVICE_LOCATIONS.find((l) => l.id === asgn.location_id);
                    const slot = SERVICE_SLOTS.find((s) => s.id === asgn.slot_id);

                    return (
                      <tr key={asgn.id} className="hover:bg-white/5 transition">
                        <td className="p-2.5 font-bold text-white">{asgn.service_date}</td>
                        <td className="p-2.5 text-slate-300">{loc?.name || asgn.location_id}</td>
                        <td className="p-2.5 text-slate-300 font-semibold">{slot?.name || asgn.slot_id}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white/5 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 border border-indigo-400/20 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
