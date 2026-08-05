import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle,
  Printer,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import Papa from 'papaparse';
import { Team, Assignment, Schedule } from '../types';
import { SERVICE_LOCATIONS, SERVICE_SLOTS } from '../data/locationsAndSlots';
import { getServiceWeekendsInMonth, getMonthName } from '../engine/dateUtils';
import { OfficialPdfScheduleModal } from '../components/OfficialPdfScheduleModal';

interface ImportExportViewProps {
  selectedMonth: number;
  selectedYear: number;
  teams: Team[];
  schedule: Schedule | undefined;
  assignments: Assignment[];
  onImportAssignments: (importedAssignments: Assignment[]) => void;
}

export const ImportExportView: React.FC<ImportExportViewProps> = ({
  selectedMonth,
  selectedYear,
  teams,
  schedule,
  assignments,
  onImportAssignments,
}) => {
  const monthName = getMonthName(selectedMonth);

  // CSV Import States
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  // Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const csvContent =
      'Date,Team,Location,Slot\n' +
      '2026-08-01,Team 1,English Service,English Service\n' +
      '2026-08-02,Team 2,GMS Barat,Barat U1\n' +
      '2026-08-02,Team 3,GMS Timur,Timur U2-U3\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'GMS_Schedule_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle CSV File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setValidationErrors([]);
    setImportSuccessMessage(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        setParsedRows(rows);

        // Validate rows
        const errors: string[] = [];
        rows.forEach((row: any, idx: number) => {
          const rowNum = idx + 2;
          if (!row.Date || !row.Team || !row.Location || !row.Slot) {
            errors.push(`Baris ${rowNum}: Field Date, Team, Location, atau Slot tidak lengkap.`);
          }
        });

        setValidationErrors(errors);
      },
    });
  };

  // Confirm Import
  const handleConfirmImport = () => {
    if (parsedRows.length === 0 || validationErrors.length > 0) return;

    const importedAssignments: Assignment[] = [];

    parsedRows.forEach((row, idx) => {
      const matchedTeam = teams.find(
        (t) => t.name.toLowerCase() === String(row.Team).trim().toLowerCase()
      );
      const matchedSlot = SERVICE_SLOTS.find(
        (s) => s.name.toLowerCase() === String(row.Slot).trim().toLowerCase()
      );

      const teamId = matchedTeam ? matchedTeam.id : `team-import-${idx}`;
      const slotId = matchedSlot ? matchedSlot.id : 'barat-slot-a';
      const locId = matchedSlot ? matchedSlot.location_id : 'barat';

      importedAssignments.push({
        id: `asgn-import-${Date.now()}-${idx}`,
        schedule_id: schedule ? schedule.id : `sched-${selectedYear}-${selectedMonth}`,
        weekend_id: row.Date,
        service_date: row.Date,
        team_id: teamId,
        location_id: locId,
        slot_id: slotId,
        locked: false,
        manually_assigned: true,
      });
    });

    onImportAssignments(importedAssignments);
    setImportSuccessMessage(`Berhasil mengimpor ${importedAssignments.length} data jadwal ke dalam database!`);
    setParsedRows([]);
    setCsvFile(null);
  };

  // Export Schedule to CSV
  const handleExportCSV = () => {
    const csvRows = [
      ['Date', 'Team', 'Location', 'Slot'],
      ...assignments.map((a) => {
        const team = teams.find((t) => t.id === a.team_id);
        const loc = SERVICE_LOCATIONS.find((l) => l.id === a.location_id);
        const slot = SERVICE_SLOTS.find((s) => s.id === a.slot_id);
        return [a.service_date, team?.name || a.team_id, loc?.name || a.location_id, slot?.name || a.slot_id];
      }),
    ];

    const csvString = csvRows.map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `GMS_Schedule_${monthName}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open Official Printable PDF Modal
  const handlePrintView = () => {
    setPdfModalOpen(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import & Export Center</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            Import / Export Jadwal Pelayanan
          </h1>
          <p className="text-xs text-slate-400">
            Impor riwayat jadwal masa lalu dari CSV/Excel, atau ekspor jadwal final ke format CSV dan PDF.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* EXPORT SECTION */}
        <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-lg space-y-5">
          <div className="flex items-center space-x-3 border-b border-white/10 pb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Ekspor Jadwal ({monthName} {selectedYear})</h2>
              <p className="text-xs text-slate-400">Unduh jadwal aktif dalam berbagai format</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
              <div>
                <p className="font-bold text-white text-sm">Format CSV / Excel</p>
                <p className="text-xs text-slate-400">Mudah dibuka di Microsoft Excel / Google Sheets</p>
              </div>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 border border-indigo-400/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" /> Export CSV
              </button>
            </div>

            <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
              <div>
                <p className="font-bold text-white text-sm">Cetak / Simpan PDF (Print View)</p>
                <p className="text-xs text-slate-400">Tampilan rapi siap cetak untuk papan pengumuman</p>
              </div>
              <button
                onClick={handlePrintView}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs rounded-xl border border-white/10 transition cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print / PDF
              </button>
            </div>
          </div>
        </div>

        {/* IMPORT SECTION */}
        <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-lg space-y-5">
          <div className="flex items-center space-x-3 border-b border-white/10 pb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Impor Data Histori CSV</h2>
              <p className="text-xs text-slate-400">Unggah file CSV jadwal bulan-bulan sebelumnya</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs rounded-xl border border-white/10 transition cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Download Template CSV
            </button>

            {/* File Upload Area */}
            <div className="border-2 border-dashed border-white/20 hover:border-indigo-400 rounded-2xl p-6 text-center space-y-2 bg-white/5 transition cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload-input"
              />
              <label htmlFor="csv-upload-input" className="cursor-pointer space-y-2 block">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="font-bold text-white text-xs">
                  {csvFile ? csvFile.name : 'Klik untuk memilih File CSV atau drag & drop'}
                </p>
                <p className="text-[11px] text-slate-400">Format: Date, Team, Location, Slot</p>
              </label>
            </div>

            {/* Success Banner */}
            {importSuccessMessage && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{importSuccessMessage}</span>
              </div>
            )}

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Ditemukan Kesalahan Validasi:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Confirm Import Button */}
            {parsedRows.length > 0 && validationErrors.length === 0 && (
              <button
                onClick={handleConfirmImport}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 border border-emerald-400/20 transition cursor-pointer"
              >
                Konfirmasi & Simpan {parsedRows.length} Data Ke Database
              </button>
            )}
          </div>
        </div>
      </div>

      <OfficialPdfScheduleModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        teams={teams}
        assignments={assignments}
      />
    </div>
  );
};
