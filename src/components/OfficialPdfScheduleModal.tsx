import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Printer, FileText, CheckCircle, Loader2, AlertTriangle, Users, UserCheck } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { Team, Assignment, SpecialService } from '../types';
import { OFFICIAL_TEAMS_DATA } from '../data/seedData';
import { getMonthName, getServiceWeekendsInMonth } from '../engine/dateUtils';
import { matchSlotId } from '../data/locationsAndSlots';
import { store } from '../db/store';

interface OfficialPdfScheduleModalProps {
  isOpen?: boolean;
  onClose: () => void;
  selectedMonth: number;
  selectedYear: number;
  teams?: Team[];
  assignments?: Assignment[];
  defaultViewMode?: 'combined' | 'team_only' | 'sd_only';
}

// Map PIC/Koordinator default names for August 2026 grid cells
const AUGUST_2026_PICS: { [key: string]: string } = {
  // Weekend 1 (Aug 2)
  '2026-08-01_barat-u1': 'Merlyn',
  '2026-08-01_barat-u2-u3': 'Sherly',
  '2026-08-01_barat-u4-u5': 'Kristanto',
  '2026-08-01_timur-u1': 'Ivan Tiono',
  '2026-08-01_timur-u2-u3': 'Veve',
  '2026-08-01_timur-u4-u5': 'Natasha',
  '2026-08-01_selatan-u1-u2': 'Agustin',
  '2026-08-01_selatan-u3-4': 'Linda',
  '2026-08-01_pusura-u1-u2': 'Syanti',
  '2026-08-01_english-service': 'Syanti',

  // Weekend 2 (Aug 9)
  '2026-08-08_barat-u1': 'Ivan Sebastian',
  '2026-08-08_barat-u2-u3': 'Yoel',
  '2026-08-08_barat-u4-u5': 'Jane',
  '2026-08-08_timur-u1': 'Andreas Agung',
  '2026-08-08_timur-u2-u3': 'Merry',
  '2026-08-08_timur-u4-u5': 'Kristanto',
  '2026-08-08_selatan-u1-u2': 'Gritty',
  '2026-08-08_selatan-u3-4': 'Jeffry',
  '2026-08-08_pusura-u1-u2': 'Veve',
  '2026-08-08_english-service': 'Veve',

  // Weekend 3 (Aug 16)
  '2026-08-15_barat-u1': 'Syanti',
  '2026-08-15_barat-u2-u3': 'Gritty',
  '2026-08-15_barat-u4-u5': 'Niar',
  '2026-08-15_timur-u1': 'Linda',
  '2026-08-15_timur-u2-u3': 'Natasha',
  '2026-08-15_timur-u4-u5': 'Yoel',
  '2026-08-15_selatan-u1-u2': 'Jeffry',
  '2026-08-15_selatan-u3-4': 'Agustin',
  '2026-08-15_pusura-u1-u2': 'Jane',
  '2026-08-15_english-service': 'Jane',

  // Weekend 4 (Aug 23)
  '2026-08-22_barat-u1': 'Merlyn',
  '2026-08-22_barat-u2-u3': 'Devi',
  '2026-08-22_barat-u4-u5': 'Jane',
  '2026-08-22_timur-u1': 'Ivan Tiono',
  '2026-08-22_timur-u2-u3': 'Yoel',
  '2026-08-22_timur-u4-u5': 'Merry',
  '2026-08-22_selatan-u1-u2': 'Sherly',
  '2026-08-22_selatan-u3-4': 'Agustin',
  '2026-08-22_pusura-u1-u2': 'Niar',
  '2026-08-22_english-service': 'Niar',

  // Weekend 5 (Aug 30)
  '2026-08-29_barat-u1': 'Andreas Agung',
  '2026-08-29_barat-u2-u3': 'Niar',
  '2026-08-29_barat-u4-u5': 'Syanti',
  '2026-08-29_timur-u1': 'Ivan Sebastian',
  '2026-08-29_timur-u2-u3': 'Gritty',
  '2026-08-29_timur-u4-u5': 'Veve',
  '2026-08-29_selatan-u1-u2': 'Devi',
  '2026-08-29_selatan-u3-4': 'Jeffry',
  '2026-08-29_pusura-u1-u2': 'Kristanto',
  '2026-08-29_english-service': 'Kristanto',
};

export const OfficialPdfScheduleModal: React.FC<OfficialPdfScheduleModalProps> = ({
  isOpen = true,
  onClose,
  selectedMonth,
  selectedYear,
  teams: inputTeams,
  assignments: inputAssignments,
  defaultViewMode = 'combined',
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'combined' | 'team_only' | 'sd_only'>(defaultViewMode);

  const teams = inputTeams || store.getTeams();
  const assignments = inputAssignments || store.getAssignmentsForMonth(selectedMonth, selectedYear);

  // Performance optimization: lookup map for team_id -> leader_name
  const leaderLookup = useMemo(() => {
    const map: Record<string, string> = {};
    teams.forEach((t) => {
      const leaderName = t.leader_name && t.leader_name.trim() !== '' ? t.leader_name : '-';
      map[t.id] = leaderName;
      if (t.id.startsWith('team-')) {
        map[t.id.replace('team-', '')] = leaderName;
      } else {
        map[`team-${t.id}`] = leaderName;
      }
      map[String(t.team_number)] = leaderName;
    });
    return map;
  }, [teams]);

  if (!isOpen) return null;

  const monthName = getMonthName(selectedMonth);
  const monthUpper = monthName.toUpperCase();
  const weekends = getServiceWeekendsInMonth(selectedMonth, selectedYear);
  const schedule = store.getScheduleByMonthYear(selectedMonth, selectedYear);
  const specialServices = store.getSpecialServices(selectedMonth, selectedYear);
  const sdAssignments = store.getSDAssignmentsForMonth(selectedMonth, selectedYear);
  const serviceDirectors = store.getServiceDirectors();

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Helper to get assignment team and SD info for a weekend & slot
  const getCellData = (weekendId: string, slotId: string) => {
    const w = weekends.find(
      (wk) => wk.id === weekendId || wk.saturday_date === weekendId || wk.sunday_date === weekendId
    );

    const asgn = assignments.find((a) => {
      if (!matchSlotId(a.slot_id, slotId)) return false;
      if (w) {
        return (
          a.weekend_id === w.id ||
          a.service_date === w.saturday_date ||
          a.service_date === w.sunday_date ||
          a.weekend_id === w.saturday_date ||
          a.weekend_id === w.sunday_date ||
          a.weekend_id === `wk-${w.saturday_date}` ||
          a.weekend_id === `wk-${w.sunday_date}`
        );
      }
      return (
        a.weekend_id === weekendId ||
        a.service_date === weekendId ||
        a.id.includes(weekendId)
      );
    });

    const sdAsgn = sdAssignments.find((a) => {
      if (!matchSlotId(a.slot_id, slotId)) return false;
      if (w) {
        return (
          a.weekend_id === w.id ||
          a.service_date === w.saturday_date ||
          a.service_date === w.sunday_date ||
          a.weekend_id === w.saturday_date ||
          a.weekend_id === w.sunday_date ||
          a.weekend_id === `wk-${w.saturday_date}` ||
          a.weekend_id === `wk-${w.sunday_date}`
        );
      }
      return a.weekend_id === weekendId || a.service_date === weekendId;
    });

    const sd = sdAsgn ? serviceDirectors.find((d) => d.id === sdAsgn.sd_id) : undefined;
    const sdName = sd ? sd.name : '—';

    if (!asgn) {
      return { pic: sdName, sdName, teamNum: null, leaderName: '-' };
    }

    const team = teams.find(
      (t) =>
        t.id === asgn.team_id ||
        t.id === `team-${asgn.team_id}` ||
        t.team_number === Number(String(asgn.team_id).replace('team-', ''))
    );
    const teamNum = team ? team.team_number : Number(String(asgn.team_id).replace('team-', '')) || 1;
    const leaderFromMap = leaderLookup[asgn.team_id] || (team && team.leader_name ? team.leader_name : '-');
    const leaderName = leaderFromMap && leaderFromMap.trim() !== '' ? leaderFromMap : '-';

    return {
      pic: sdName || leaderName || 'Koordinator',
      sdName,
      teamNum,
      leaderName,
    };
  };

  // Generate Multi-Page PDF via html-to-image + jsPDF with proper page breaks
  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    setDownloadSuccess(false);
    setDownloadError(null);

    try {
      const page1El = document.getElementById('pdf-page-1');
      const page2El = document.getElementById('pdf-page-2');

      if (!page1El || !page2El) {
        throw new Error('Elemen template PDF tidak ditemukan.');
      }

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 297 mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 210 mm

      // PAGE 1: Main Schedule Grid (using html-to-image to bypass oklch CSS parser errors)
      let imgData1: string;
      try {
        imgData1 = await toPng(page1El, {
          quality: 0.98,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          cacheBust: true,
        });
      } catch (err1) {
        console.warn('toPng page 1 failed, falling back to html2canvas', err1);
        const canvas1 = await html2canvas(page1El, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        });
        imgData1 = canvas1.toDataURL('image/jpeg', 0.98);
      }

      pdf.addImage(imgData1, 'PNG', 0, 0, pdfWidth, pdfHeight);

      // PAGE 2: Tim SM Roster & Special Services
      pdf.addPage('a4', 'landscape');
      let imgData2: string;
      try {
        imgData2 = await toPng(page2El, {
          quality: 0.98,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          cacheBust: true,
        });
      } catch (err2) {
        console.warn('toPng page 2 failed, falling back to html2canvas', err2);
        const canvas2 = await html2canvas(page2El, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        });
        imgData2 = canvas2.toDataURL('image/jpeg', 0.98);
      }

      pdf.addImage(imgData2, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const filename = `GMS-Service-Schedule-${monthName}-${selectedYear}.pdf`;
      pdf.save(filename);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: any) {
      console.error('Failed to generate PDF:', err);
      setDownloadError(err.message || 'Gagal mengunduh file PDF. Silakan gunakan tombol Print / Cetak.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // 10 Slot Columns Mapping according to official structure
  const slotsConfig = [
    { id: 'barat-u1', name: 'U1' },
    { id: 'barat-u2-u3', name: 'U2-3' },
    { id: 'barat-u4-u5', name: 'U4-5' },

    { id: 'timur-u1', name: 'U1' },
    { id: 'timur-u2-u3', name: 'U2-3' },
    { id: 'timur-u4-u5', name: 'U4-5' },

    { id: 'selatan-u1-u2', name: 'U1-2' },
    { id: 'selatan-u3-4', name: 'U3-4' },

    { id: 'pusura-u1-u2', name: 'U1-2' },

    { id: 'english-service', name: 'ENGLISH SERVICE' },
  ];

  const modalJsx = (
    <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-6xl w-full flex flex-col max-h-[95vh] overflow-hidden">
        {/* Modal Top Bar */}
        <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">
                Print & Export PDF Official — {monthName} {selectedYear}
              </h2>
              <p className="text-xs text-slate-400">
                Dokumen Resmi A4 Landscape • Multi-Page Layout Terpisah Rapi
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 flex-wrap gap-2">
            {/* View Mode Toggle Switcher */}
            <div className="flex items-center bg-slate-950/80 border border-slate-700 rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => setViewMode('combined')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  viewMode === 'combined'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Gabungan (SD + Tim)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('team_only')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  viewMode === 'team_only'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Hanya Tim (Tanpa SD)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('sd_only')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  viewMode === 'sd_only'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Hanya SD</span>
              </button>
            </div>

            {downloadSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/80 border border-emerald-700 px-3 py-1.5 rounded-xl font-bold">
                <CheckCircle className="w-4 h-4" /> PDF Berhasil Diunduh!
              </span>
            )}

            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengunduh PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Schedule</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {downloadError && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold flex items-center justify-between no-print">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{downloadError}</span>
            </div>
            <button onClick={() => setDownloadError(null)} className="text-rose-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable Printable Container Preview */}
        <div className="p-6 overflow-auto flex-1 bg-slate-950/60 flex flex-col items-center gap-8">
          <div id="printable-schedule-view" className="flex flex-col gap-8 w-[1100px] text-slate-900 select-none">
            {/* ==================== PAGE 1: WEEKLY SCHEDULE MATRIX ==================== */}
            <div
              id="pdf-page-1"
              className="pdf-page-sheet bg-white p-6 rounded-lg border border-slate-300 shadow-xl flex flex-col justify-between"
              style={{ width: '1100px', minHeight: '750px', color: '#000000' }}
            >
              <div>
                {/* 1. DOCUMENT HEADER */}
                <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                  <div>
                    <h1 className="text-xl font-black uppercase tracking-wider text-black">
                      {viewMode === 'sd_only'
                        ? 'GMS SERVICE DIRECTOR SCHEDULE'
                        : viewMode === 'team_only'
                        ? 'GMS SERVICE TEAM SCHEDULE'
                        : 'GMS SERVICE TEAM & SERVICE DIRECTOR SCHEDULE'}
                    </h1>
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                      JADWAL PELAYANAN {
                        viewMode === 'sd_only'
                          ? 'SERVICE DIRECTOR'
                          : viewMode === 'team_only'
                          ? 'TIM SM IBADAH UMUM'
                          : 'SM IBADAH UMUM & SERVICE DIRECTOR'
                      } — {monthUpper} {selectedYear}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-0.5 bg-black text-white text-[10px] font-black uppercase rounded tracking-wider mr-1.5">
                      {schedule?.status ? schedule.status.toUpperCase() : 'FINALIZED'}
                    </span>
                    <span className="inline-block px-2.5 py-0.5 bg-slate-200 text-black border border-black text-[10px] font-black uppercase rounded tracking-wider">
                      {viewMode === 'sd_only'
                        ? 'JADWAL SD SAJA'
                        : viewMode === 'team_only'
                        ? 'JADWAL TIM SAJA'
                        : 'OFFICIAL SCHEDULE'}
                    </span>
                  </div>
                </div>

                {/* 2. SECTOR HEADER BARS */}
                <div className="w-full border-2 border-black mb-1 flex">
                  {/* LEFT CORNER BOX (Above Month Bar) */}
                  <div className="w-[32px] bg-black border-r border-black shrink-0"></div>

                  {/* HEADER COLUMNS (Aligned with grid-cols-11 below) */}
                  <div className="flex-1">
                    <div className="grid grid-cols-11 text-center text-xs font-bold text-white uppercase">
                      {/* YEAR BOX (Aligned with Sunday Date Column) */}
                      <div className="col-span-1 bg-black text-white flex items-center justify-center font-black text-sm border-r border-black py-1">
                        {selectedYear}
                      </div>

                      {/* SEKTORS */}
                      <div className="col-span-3 bg-blue-700 py-1 border-r border-black font-extrabold text-[12px]">
                        BARAT ROOFTOP
                      </div>
                      <div className="col-span-3 bg-emerald-700 py-1 border-r border-black font-extrabold text-[12px]">
                        TIMUR PCM
                      </div>
                      <div className="col-span-2 bg-orange-600 py-1 border-r border-black font-extrabold text-[12px]">
                        SELATAN MCC
                      </div>
                      <div className="col-span-1 bg-purple-700 py-1 border-r border-black font-extrabold text-[11px]">
                        PUSAT GC
                      </div>
                      <div className="col-span-1 bg-yellow-400 text-black py-1 font-extrabold text-[11px]">
                        ENGLISH SERVICE
                      </div>
                    </div>

                    {/* SUB-HEADER SLOTS */}
                    <div className="grid grid-cols-11 text-center text-[10px] font-bold border-t border-black bg-slate-200">
                      <div className="col-span-1 bg-black border-r border-black"></div>
                      <div className="col-span-1 py-0.5 border-r border-black bg-blue-800 text-white">U1</div>
                      <div className="col-span-1 py-0.5 border-r border-black bg-blue-800 text-white">U2-3</div>
                      <div className="col-span-1 py-0.5 border-r border-black bg-blue-800 text-white">U4-5</div>

                      <div className="col-span-1 py-0.5 border-r border-black bg-emerald-800 text-white">U1</div>
                      <div className="col-span-1 py-0.5 border-r border-black bg-emerald-800 text-white">U2-3</div>
                      <div className="col-span-1 py-0.5 border-r border-black bg-emerald-800 text-white">U4-5</div>

                      <div className="col-span-1 py-0.5 border-r border-black bg-orange-700 text-white">U1-2</div>
                      <div className="col-span-1 py-0.5 border-r border-black bg-orange-700 text-white">U3-4</div>

                      <div className="col-span-1 py-0.5 border-r border-black bg-purple-800 text-white">U1-2</div>

                      <div className="col-span-1 py-0.5 bg-yellow-400 text-black font-black uppercase text-[9.5px]">
                        SABTU 18:30
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. MAIN SCHEDULE GRID MATRIX */}
                <div className="w-full border-2 border-black mb-2">
                  <div className="flex">
                    {/* LEFT MONTH BAR */}
                    <div className="w-[32px] bg-black text-white font-black text-xs flex flex-col items-center justify-around py-3 tracking-widest border-r border-black">
                      {monthUpper.split('').map((char, i) => (
                        <span key={i} className="block my-0.5">
                          {char}
                        </span>
                      ))}
                    </div>

                    {/* WEEKEND ROWS GRID */}
                    <div className="flex-1">
                      {weekends.slice(0, 5).map((w, wIdx) => {
                        const sunDate = new Date(w.sunday_date);
                        const sunDayNum = sunDate.getDate();
                        const satDate = new Date(w.saturday_date);
                        const satDayNum = satDate.getDate();
                        const satMonthShort = getMonthName(satDate.getMonth() + 1).substring(0, 3);

                        return (
                          <div
                            key={w.id}
                            className={`grid grid-cols-11 text-center border-b border-black text-[11px] last:border-b-0 ${
                              wIdx % 2 === 1 ? 'bg-slate-50' : 'bg-white'
                            }`}
                            style={{ minHeight: '62px' }}
                          >
                            {/* Sunday Date Column */}
                            <div className="col-span-1 font-black text-base border-r border-black flex flex-col items-center justify-center bg-slate-200 text-slate-900 leading-none py-1">
                              <span>{sunDayNum}</span>
                              <span className="text-[9px] font-semibold uppercase text-slate-600 mt-1">Minggu</span>
                            </div>

                            {/* 9 Sunday Slot Cells */}
                            {slotsConfig.slice(0, 9).map((slot) => {
                              const cell = getCellData(w.id, slot.id);
                              return (
                                <div
                                  key={slot.id}
                                  className="col-span-1 border-r border-black p-1 flex flex-col justify-center items-center leading-tight bg-white space-y-0.5"
                                >
                                  {viewMode === 'combined' ? (
                                    <>
                                      <div className="font-extrabold text-indigo-950 text-[10px] bg-indigo-50 px-1 py-0.5 rounded border border-indigo-200 w-full text-center truncate max-w-full">
                                        SD: {cell.sdName || '—'}
                                      </div>
                                      {cell.teamNum ? (
                                        <div className="font-black text-slate-950 text-[11px] bg-slate-100 px-1 py-0.5 rounded border border-slate-300 w-full text-center flex flex-col justify-center items-center">
                                          <div>Tim {cell.teamNum}</div>
                                          <div className="text-[9px] font-normal text-slate-600 text-center leading-tight whitespace-normal break-words max-w-full">
                                            {cell.leaderName || '-'}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-slate-400 font-bold text-[10px]">—</div>
                                      )}
                                    </>
                                  ) : viewMode === 'team_only' ? (
                                    cell.teamNum ? (
                                      <div className="font-black text-slate-950 text-[12px] bg-slate-100 px-1 py-1 rounded border border-slate-300 w-full text-center flex flex-col justify-center items-center">
                                        <span className="text-[12px] font-black text-slate-950">
                                          Tim {cell.teamNum}
                                        </span>
                                        <span className="text-[10px] font-normal text-slate-600 text-center leading-tight whitespace-normal break-words max-w-full">
                                          {cell.leaderName || '-'}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="text-slate-400 font-bold text-[10px]">—</div>
                                    )
                                  ) : (
                                    <div className="font-extrabold text-indigo-950 text-[11px] bg-indigo-50/90 px-1 py-1.5 rounded border border-indigo-200 w-full text-center truncate max-w-full flex flex-col justify-center items-center">
                                      <span className="text-[8px] font-bold uppercase text-indigo-600 tracking-wider">
                                        SD
                                      </span>
                                      <span className="text-[11px] font-extrabold text-indigo-950 mt-0.5">
                                        {cell.sdName || '—'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* 10th Column: English Service (Saturday Date) */}
                            {(() => {
                              const cell = getCellData(w.id, 'english-service');
                              return (
                                <div className="col-span-1 p-1 flex flex-col justify-center items-center leading-tight bg-amber-50/60 border-l border-amber-300 relative space-y-0.5">
                                  <div className="text-[8.5px] font-extrabold text-amber-900 uppercase mb-0.5">
                                    Sabtu, {satDayNum} {satMonthShort}
                                  </div>
                                  {viewMode === 'combined' ? (
                                    <>
                                      <div className="font-extrabold text-indigo-950 text-[9.5px] bg-indigo-50 px-1 py-0.5 rounded border border-indigo-200 w-full text-center truncate max-w-full">
                                        SD: {cell.sdName || '—'}
                                      </div>
                                      {cell.teamNum ? (
                                        <div className="font-black text-amber-950 text-[10.5px] bg-amber-200/80 px-1 py-0.5 rounded border border-amber-300 w-full text-center flex flex-col justify-center items-center">
                                          <div>Tim {cell.teamNum}</div>
                                          <div className="text-[8.5px] font-normal text-amber-900/80 text-center leading-tight whitespace-normal break-words max-w-full">
                                            {cell.leaderName || '-'}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-slate-400 font-bold text-[10px]">—</div>
                                      )}
                                    </>
                                  ) : viewMode === 'team_only' ? (
                                    cell.teamNum ? (
                                      <div className="font-black text-amber-950 text-[11.5px] bg-amber-200/80 px-1 py-1 rounded border border-amber-300 w-full text-center flex flex-col justify-center items-center">
                                        <span className="text-[11.5px] font-black text-amber-950">
                                          Tim {cell.teamNum}
                                        </span>
                                        <span className="text-[9.5px] font-normal text-amber-900/80 text-center leading-tight whitespace-normal break-words max-w-full">
                                          {cell.leaderName || '-'}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="text-slate-400 font-bold text-[10px]">—</div>
                                    )
                                  ) : (
                                    <div className="font-extrabold text-indigo-950 text-[11px] bg-indigo-50/90 px-1 py-1.5 rounded border border-indigo-200 w-full text-center truncate max-w-full flex flex-col justify-center items-center">
                                      <span className="text-[8px] font-bold uppercase text-indigo-600 tracking-wider">
                                        SD
                                      </span>
                                      <span className="text-[11px] font-extrabold text-indigo-950 mt-0.5">
                                        {cell.sdName || '—'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* PAGE 1 FOOTER */}
              <div className="border-t border-slate-300 pt-2 flex items-center justify-between text-[10px] text-slate-600 font-medium">
                <div>
                  <strong>GMS Service Team Scheduler</strong> • Gereja Mawar Sharon
                </div>
                <div>Halaman 1 dari 2</div>
                <div>Dicetak: {todayFormatted}</div>
              </div>
            </div>

            {/* ==================== PAGE 2: ROSTER & SPECIAL SERVICES ==================== */}
            <div
              id="pdf-page-2"
              className="pdf-page-sheet bg-white p-6 rounded-lg border border-slate-300 shadow-xl flex flex-col justify-between"
              style={{ width: '1100px', minHeight: '750px', color: '#000000' }}
            >
              <div>
                {/* PAGE 2 HEADER */}
                <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                  <div>
                    <h1 className="text-xl font-black uppercase tracking-wider text-black">
                      {viewMode === 'sd_only'
                        ? 'SERVICE DIRECTOR ROSTER & SPECIAL SERVICES'
                        : 'GMS SERVICE TEAM SCHEDULE'}
                    </h1>
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                      {viewMode === 'sd_only'
                        ? `REKAP SERVICE DIRECTOR & SPECIAL SERVICES — ${monthUpper} ${selectedYear}`
                        : `TIM SM ROSTER & SPECIAL SERVICES — ${monthUpper} ${selectedYear}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-0.5 bg-black text-white text-[10px] font-black uppercase rounded tracking-wider">
                      {viewMode === 'sd_only' ? 'SD ROSTER' : 'COMPOSITION & SPECIAL SERVICES'}
                    </span>
                  </div>
                </div>

                {/* SECTION A: ROSTER GRID */}
                {viewMode !== 'sd_only' ? (
                  /* TIM SM COMPOSITION ROSTER (TEAMS 1 - 20) */
                  <div className="w-full border-2 border-black mb-4">
                    <div className="bg-black text-white font-extrabold text-xs px-3 py-1 uppercase tracking-wider text-left border-b border-black">
                      TIM SM ROSTER (TIM 1 - 20) — {monthUpper} {selectedYear}
                    </div>

                    {/* Row 1: Teams 1 to 10 */}
                    <div className="grid grid-cols-10 text-center border-b border-black text-[10px]">
                      {OFFICIAL_TEAMS_DATA.slice(0, 10).map((t) => {
                        const liveTeam = teams.find((lt) => lt.team_number === t.team_number);
                        const leader = liveTeam ? liveTeam.leader_name : t.leader_name;

                        return (
                          <div key={t.team_number} className="col-span-1 border-r border-black last:border-r-0">
                            <div className="bg-black text-white font-black p-0.5 border-b border-black">
                              Tim {t.team_number}
                            </div>
                            <div className="bg-slate-200 font-extrabold p-0.5 border-b border-black text-slate-900">
                              {leader}
                            </div>
                            <div className="divide-y divide-slate-300">
                              {t.members.map((m, mIdx) => (
                                <div key={mIdx} className="py-0.5 px-0.5 truncate text-[9px] font-medium text-slate-800">
                                  {m}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Row 2: Teams 11 to 20 */}
                    <div className="grid grid-cols-10 text-center text-[10px]">
                      {OFFICIAL_TEAMS_DATA.slice(10, 20).map((t) => {
                        const liveTeam = teams.find((lt) => lt.team_number === t.team_number);
                        const leader = liveTeam ? liveTeam.leader_name : t.leader_name;

                        return (
                          <div key={t.team_number} className="col-span-1 border-r border-black last:border-r-0">
                            <div className="bg-black text-white font-black p-0.5 border-b border-black">
                              Tim {t.team_number}
                            </div>
                            <div className="bg-slate-200 font-extrabold p-0.5 border-b border-black text-slate-900">
                              {leader}
                            </div>
                            <div className="divide-y divide-slate-300">
                              {t.members.map((m, mIdx) => (
                                <div key={mIdx} className="py-0.5 px-0.5 truncate text-[9px] font-medium text-slate-800">
                                  {m}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* SD ROSTER (SERVICE DIRECTORS LIST) */
                  <div className="w-full border-2 border-black mb-4">
                    <div className="bg-black text-white font-extrabold text-xs px-3 py-1 uppercase tracking-wider text-left border-b border-black">
                      DAFTAR SERVICE DIRECTOR (SD) — {monthUpper} {selectedYear}
                    </div>

                    <div className="grid grid-cols-4 gap-0 divide-x divide-y divide-black text-[11px]">
                      {serviceDirectors.map((sd) => {
                        const assignedCount = sdAssignments.filter((a) => a.sd_id === sd.id).length;
                        return (
                          <div key={sd.id} className="p-2.5 bg-slate-50 flex items-center justify-between">
                            <div>
                              <div className="font-black text-slate-950 text-xs">{sd.name}</div>
                              <div className="text-[10px] text-slate-600 font-medium">Service Director</div>
                            </div>
                            <div className="text-right">
                              <span className="inline-block px-2 py-0.5 bg-indigo-100 text-indigo-950 font-black text-[10px] rounded border border-indigo-200">
                                {assignedCount} Tugas
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SECTION B: SPECIAL SERVICES */}
                <div className="w-full border-2 border-black">
                  <div className="bg-black text-white font-extrabold text-xs px-3 py-1 uppercase tracking-wider text-left border-b border-black">
                    SPECIAL SERVICES — {monthUpper} {selectedYear}
                  </div>

                  {specialServices && specialServices.length > 0 ? (
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-200 text-slate-900 font-black border-b border-black uppercase text-[10px]">
                          <th className="p-2 border-r border-black w-[15%]">Tanggal</th>
                          <th className="p-2 border-r border-black w-[30%]">Event / Acara</th>
                          <th className="p-2 border-r border-black w-[25%]">Lokasi</th>
                          <th className="p-2 border-r border-black w-[15%]">Waktu Slot</th>
                          <th className="p-2 w-[15%]">Tim Pelayan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black">
                        {specialServices.map((spec: SpecialService) => {
                          const specDate = new Date(spec.date);
                          const dateFormatted = specDate.toLocaleDateString('id-ID', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          });

                          const locName =
                            spec.location_type === 'custom' && spec.custom_location_name
                              ? spec.custom_location_name
                              : spec.location_id
                              ? `GMS ${spec.location_id.toUpperCase()}`
                              : 'GMS Main Hall';

                          return (
                            <tr key={spec.id} className="hover:bg-slate-50">
                              <td className="p-2 font-bold border-r border-black">{dateFormatted}</td>
                              <td className="p-2 font-bold text-slate-900 border-r border-black">
                                {spec.event_name}
                                {spec.notes && <p className="text-[9.5px] font-normal text-slate-600">{spec.notes}</p>}
                              </td>
                              <td className="p-2 font-semibold border-r border-black">{locName}</td>
                              <td className="p-2 border-r border-black">
                                {spec.slots.map((s, idx) => (
                                  <div key={idx} className="font-semibold text-[10px]">
                                    {s.slot_name} ({s.start_time})
                                  </div>
                                ))}
                              </td>
                              <td className="p-2 font-extrabold text-indigo-900">
                                {spec.slots
                                  .flatMap((s) => s.assigned_team_ids)
                                  .map((tId) => {
                                    const tNum = tId.replace('team-', '');
                                    const tObj = teams.find((lt) => String(lt.team_number) === tNum || lt.id === tId);
                                    return tObj ? `Tim ${tObj.team_number} (${tObj.leader_name})` : `Tim ${tNum}`;
                                  })
                                  .join(', ') || 'Belum ditugaskan'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-600 font-bold bg-slate-50">
                      Tidak ada Jadwal Special Service khusus yang terdaftar pada bulan {monthName} {selectedYear}.
                    </div>
                  )}
                </div>
              </div>

              {/* PAGE 2 FOOTER */}
              <div className="border-t border-slate-300 pt-2 flex items-center justify-between text-[10px] text-slate-600 font-medium">
                <div>
                  <strong>GMS Service Team Scheduler</strong> • Gereja Mawar Sharon
                </div>
                <div>Halaman 2 dari 2</div>
                <div>Dicetak: {todayFormatted}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalJsx, document.body);
};
