/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { store } from './db/store';
import { getCurrentSession, logoutUser } from './services/supabase';
import { NavRoute, Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { ScheduleView } from './views/ScheduleView';
import { WeekendView } from './views/WeekendView';
import { GenerateView } from './views/GenerateView';
import { TeamsManagementView } from './views/TeamsManagementView';
import { ImportPdfView } from './views/ImportPdfView';
import { SpecialServicesView } from './views/SpecialServicesView';
import { AvailabilityView } from './views/AvailabilityView';
import { AnalyticsView } from './views/AnalyticsView';
import { ImportExportView } from './views/ImportExportView';
import { SettingsView } from './views/SettingsView';
import { SimulatorView } from './views/SimulatorView';
import { JadwalServiceDirectorView } from './views/JadwalServiceDirectorView';
import { DataServiceDirectorView } from './views/DataServiceDirectorView';
import { Team, Schedule, Assignment, TeamAvailability, SchedulerSettings } from './types';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<NavRoute>('dashboard');

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline'>('synced');

  // Check initial Auth session strictly via Supabase
  useEffect(() => {
    let isMounted = true;
    getCurrentSession().then(async (auth) => {
      if (auth.isAuthenticated && auth.user && auth.user.email) {
        setIsAuthenticated(true);
        setCurrentUserEmail(auth.user.email);
        setCloudSyncStatus('syncing');
        await store.syncFromCloud(selectedMonth, selectedYear);
        if (isMounted) setCloudSyncStatus('synced');
      } else {
        setIsAuthenticated(false);
        setCurrentUserEmail(null);
      }
      if (isMounted) {
        setIsAuthLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    setIsAuthenticated(false);
    setCurrentUserEmail(null);
  };

  const handleLoginSuccess = async (email: string) => {
    setIsAuthenticated(true);
    setCurrentUserEmail(email);
    setCurrentRoute('dashboard');
    setCloudSyncStatus('syncing');
    await store.syncFromCloud(selectedMonth, selectedYear);
    setCloudSyncStatus('synced');
  };

  // Selected Month & Year (Default to current running month and year)
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

  // Store Reactive State
  const [teams, setTeams] = useState<Team[]>(store.getTeams());
  const [schedules, setSchedules] = useState<Schedule[]>(store.getSchedules());
  const [assignments, setAssignments] = useState<Assignment[]>(store.getAssignments());
  const [availabilities, setAvailabilities] = useState<TeamAvailability[]>(store.getAvailabilities());
  const [settings, setSettings] = useState<SchedulerSettings>(store.getSettings());
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);

  // Subscribe to store updates & trigger cloud sync on auth or month change
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setTeams(store.getTeams());
      setSchedules(store.getSchedules());
      setAssignments(store.getAssignments());
      setAvailabilities(store.getAvailabilities());
      setSettings(store.getSettings());
    });
    const unsubscribeError = store.subscribeError((msg) => {
      setSyncErrorMessage(msg);
      setCloudSyncStatus('error');
    });
    return () => {
      unsubscribe();
      unsubscribeError();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      setCloudSyncStatus('syncing');
      store.syncFromCloud(selectedMonth, selectedYear).then((success) => {
        if (success) {
          setCloudSyncStatus('synced');
          setSyncErrorMessage(null);
        } else {
          setCloudSyncStatus('error');
        }
      });
    }
  }, [isAuthenticated, selectedMonth, selectedYear]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen w-full bg-[#0f172a] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto text-white font-black text-lg animate-pulse">
            GMS
          </div>
          <p className="text-xs font-bold text-slate-400">Memeriksa Sesi Supabase...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Derived current month schedule & assignments
  const currentSchedule = store.getScheduleByMonthYear(selectedMonth, selectedYear);
  const currentMonthAssignments = currentSchedule
    ? store.getAssignmentsForSchedule(currentSchedule.id)
    : [];

  // Handlers
  const handleMonthYearChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const handleSaveScheduleResult = async (schedule: Schedule, newAssignments: Assignment[]) => {
    await store.saveScheduleAndAssignments(schedule, newAssignments);
  };

  const handleUpdateAssignment = (assignmentId: string, updates: Partial<Assignment>) => {
    store.updateAssignment(assignmentId, updates);
  };

  const handleFinalizeSchedule = async () => {
    if (!currentSchedule) return;
    await store.saveSchedule({
      ...currentSchedule,
      status: 'finalized',
      finalized_at: new Date().toISOString(),
    });
  };

  const handleReopenSchedule = async () => {
    if (!currentSchedule) return;
    await store.saveSchedule({
      ...currentSchedule,
      status: 'generated',
    });
  };

  const handleClearSchedule = async () => {
    await store.clearScheduleForMonth(selectedMonth, selectedYear);
  };

  const handleAddTeam = (name: string, notes?: string) => {
    store.addTeam(name, notes);
  };

  const handleUpdateTeam = (id: string, updates: Partial<Team>) => {
    store.updateTeam(id, updates);
  };

  const handleDeleteTeam = (id: string) => {
    store.deleteTeam(id);
  };

  const handleSetAvailability = (
    teamId: string,
    weekendDate: string,
    available: boolean,
    notes?: string
  ) => {
    store.setTeamAvailability(teamId, weekendDate, available, notes);
  };

  const handleResetDemoData = () => {
    store.resetToDemoData();
  };

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-100 font-sans overflow-hidden relative select-none">
      {/* Background Frosted Ambient Orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-700/15 blur-[150px] pointer-events-none z-0"></div>
      <div className="fixed top-[40%] right-[20%] w-[35%] h-[35%] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none z-0"></div>

      {/* Sidebar Navigation */}
      <Sidebar
        currentRoute={currentRoute}
        onNavigate={(route) => setCurrentRoute(route)}
        activeTeamsCount={teams.filter((t) => t.status === 'active').length}
        currentUserEmail={currentUserEmail}
        cloudSyncStatus={cloudSyncStatus}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto relative z-10">
        {syncErrorMessage && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-red-300 z-50">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
              <span className="font-semibold">{syncErrorMessage}</span>
            </div>
            <button
              onClick={() => setSyncErrorMessage(null)}
              className="text-red-400 hover:text-white font-bold ml-4 cursor-pointer underline"
            >
              Tutup
            </button>
          </div>
        )}

        <Header
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onMonthYearChange={handleMonthYearChange}
          currentSchedule={currentSchedule}
          onGenerateClick={() => setCurrentRoute('generate')}
          currentUserEmail={currentUserEmail}
          cloudSyncStatus={cloudSyncStatus}
          onLogout={handleLogout}
        />

        <main className="flex-1 pb-12 relative z-30">
          {currentRoute === 'dashboard' && (
            <DashboardView
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              teams={teams}
              schedule={currentSchedule}
              assignments={currentMonthAssignments}
              onNavigate={(route) => setCurrentRoute(route)}
              onGenerateClick={() => setCurrentRoute('generate')}
            />
          )}

          {currentRoute === 'schedule' && (
            <ScheduleView
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              teams={teams}
              schedule={currentSchedule}
              assignments={currentMonthAssignments}
              availabilities={availabilities}
              pastAssignments={assignments.filter((a) => a.schedule_id !== currentSchedule?.id)}
              onRegenerateAll={() => setCurrentRoute('generate')}
              onRegenerateUnlocked={() => setCurrentRoute('generate')}
              onFinalizeSchedule={handleFinalizeSchedule}
              onReopenSchedule={handleReopenSchedule}
              onClearSchedule={handleClearSchedule}
              onUpdateAssignment={handleUpdateAssignment}
              onNavigate={(route) => setCurrentRoute(route)}
            />
          )}

          {currentRoute === 'sd_schedule' && (
            <JadwalServiceDirectorView
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onNavigateToMasterData={() => setCurrentRoute('sd_master')}
            />
          )}

          {currentRoute === 'sd_master' && (
            <DataServiceDirectorView onNavigateToSchedule={() => setCurrentRoute('sd_schedule')} />
          )}

          {currentRoute === 'weekend' && (
            <WeekendView
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              teams={teams}
              assignments={currentMonthAssignments}
            />
          )}

          {currentRoute === 'generate' && (
            <GenerateView
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              teams={teams}
              availabilities={availabilities}
              pastAssignments={assignments}
              settings={settings}
              existingSchedule={currentSchedule}
              onSaveScheduleResult={handleSaveScheduleResult}
              onNavigate={(route) => setCurrentRoute(route)}
            />
          )}

          {currentRoute === 'teams' && <TeamsManagementView />}

          {currentRoute === 'special_services' && (
            <SpecialServicesView selectedMonth={selectedMonth} selectedYear={selectedYear} />
          )}

          {currentRoute === 'import_pdf' && (
            <ImportPdfView
              onNavigate={(route) => setCurrentRoute(route)}
              onMonthYearSelect={(m, y) => {
                setSelectedMonth(m);
                setSelectedYear(y);
                setCurrentRoute('schedule');
              }}
            />
          )}

          {currentRoute === 'availability' && (
            <AvailabilityView
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              teams={teams}
              availabilities={availabilities}
              onSetAvailability={handleSetAvailability}
            />
          )}

          {currentRoute === 'analytics' && (
            <AnalyticsView
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              teams={teams}
              assignments={assignments}
              schedules={schedules}
            />
          )}

          {currentRoute === 'import_export' && (
            <ImportExportView
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              teams={teams}
              schedule={currentSchedule}
              assignments={currentMonthAssignments}
              onImportAssignments={(imported) => {
                if (currentSchedule) {
                  store.saveAssignmentsForSchedule(currentSchedule.id, imported);
                }
              }}
            />
          )}

          {currentRoute === 'settings' && (
            <SettingsView
              settings={settings}
              onSaveSettings={(s) => store.saveSettings(s)}
              onResetDemoData={handleResetDemoData}
            />
          )}

          {currentRoute === 'simulator' && <SimulatorView />}
        </main>
      </div>
    </div>
  );
}
