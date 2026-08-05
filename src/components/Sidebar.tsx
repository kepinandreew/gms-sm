import React, { useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Sparkles,
  Users,
  CalendarClock,
  BarChart3,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  CalendarRange,
  FileUp,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  BadgeCheck,
  LogOut,
  Cloud,
  CloudCheck,
} from 'lucide-react';

export type NavRoute =
  | 'dashboard'
  | 'schedule'
  | 'sd_schedule'
  | 'sd_master'
  | 'weekend'
  | 'generate'
  | 'teams'
  | 'special_services'
  | 'availability'
  | 'analytics'
  | 'import_pdf'
  | 'import_export'
  | 'settings'
  | 'simulator';

interface SidebarProps {
  currentRoute: NavRoute;
  onNavigate: (route: NavRoute) => void;
  activeTeamsCount: number;
  currentUserEmail?: string | null;
  cloudSyncStatus?: 'synced' | 'syncing' | 'error' | 'offline';
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  activeTeamsCount,
  currentUserEmail = 'kevinandrew0209@gmail.com',
  cloudSyncStatus = 'synced',
  onLogout,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('gms_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('gms_sidebar_collapsed', String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const navItems = [
    {
      id: 'dashboard' as NavRoute,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'schedule' as NavRoute,
      label: 'Jadwal Bulanan',
      icon: Calendar,
    },
    {
      id: 'sd_schedule' as NavRoute,
      label: 'Jadwal SD',
      icon: BadgeCheck,
      highlight: true,
    },
    {
      id: 'sd_master' as NavRoute,
      label: 'Data Service Director',
      icon: UserCheck,
    },
    {
      id: 'generate' as NavRoute,
      label: 'Generate Schedule',
      icon: Sparkles,
      highlight: true,
    },
    {
      id: 'teams' as NavRoute,
      label: 'Tim & Members',
      icon: Users,
      badge: activeTeamsCount,
    },
    {
      id: 'special_services' as NavRoute,
      label: 'Special Service',
      icon: Sparkles,
    },
    {
      id: 'import_pdf' as NavRoute,
      label: 'Import PDF Historis',
      icon: FileUp,
    },
    {
      id: 'availability' as NavRoute,
      label: 'Availability Tim',
      icon: CalendarClock,
    },
    {
      id: 'analytics' as NavRoute,
      label: 'Analytics & History',
      icon: BarChart3,
    },
    {
      id: 'weekend' as NavRoute,
      label: 'Detail Weekend',
      icon: CalendarRange,
    },
    {
      id: 'import_export' as NavRoute,
      label: 'Backup & Restore',
      icon: FileSpreadsheet,
    },
    {
      id: 'settings' as NavRoute,
      label: 'Pengaturan Engine',
      icon: Settings,
    },
    {
      id: 'simulator' as NavRoute,
      label: 'Uji Simulator',
      icon: ShieldCheck,
      subtext: 'Suite',
    },
  ];

  return (
    <aside
      className={`bg-white/5 backdrop-blur-xl text-slate-200 flex flex-col shrink-0 min-h-screen border-r border-white/10 shadow-2xl select-none relative z-20 transition-all duration-200 ease-in-out no-print ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* App Header / Brand */}
      <div
        className={`p-4 border-b border-white/10 flex items-center ${
          isCollapsed ? 'justify-center' : 'justify-between gap-2'
        }`}
      >
        {!isCollapsed && (
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/90 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30 border border-indigo-400/30 shrink-0">
              GMS
            </div>
            <div className="overflow-hidden whitespace-nowrap transition-opacity duration-200">
              <h1 className="font-bold text-white text-base leading-tight truncate">Service Scheduler</h1>
              <p className="text-xs text-slate-400 font-medium truncate">Tim Pelayanan Gereja</p>
            </div>
          </div>
        )}

        <button
          onClick={toggleCollapse}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors shrink-0 cursor-pointer"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;
          const tooltipText = item.badge !== undefined ? `${item.label} (${item.badge})` : item.label;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={isCollapsed ? tooltipText : undefined}
              className={`w-full flex items-center rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
              } ${
                isActive
                  ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/25 border border-indigo-400/40'
                  : item.highlight
                  ? 'text-indigo-300 hover:bg-indigo-600/20 hover:text-white border border-indigo-500/20'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <div className={`flex items-center truncate ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : item.highlight ? 'text-indigo-300' : 'text-slate-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!isCollapsed && item.badge !== undefined && (
                <span
                  className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    isActive ? 'bg-indigo-600/80 text-white border border-indigo-400/30' : 'bg-white/5 text-slate-300 border border-white/10'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {!isCollapsed && item.subtext && !item.badge && (
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {item.subtext}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info & Logout */}
      <div className="p-3.5 border-t border-white/10 bg-slate-950/40 text-xs text-slate-300 space-y-2.5">
        {!isCollapsed && (
          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-2">
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Logged In As</p>
              <p className="text-xs font-bold text-white truncate max-w-[130px]">{currentUserEmail}</p>
            </div>
            <div className="flex items-center space-x-1">
              <span
                className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  cloudSyncStatus === 'synced'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : cloudSyncStatus === 'syncing'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-slate-500/10 text-slate-300 border-slate-500/20'
                }`}
                title="Cloud Synchronization Status"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    cloudSyncStatus === 'synced'
                      ? 'bg-emerald-400 animate-pulse'
                      : cloudSyncStatus === 'syncing'
                      ? 'bg-amber-400 animate-ping'
                      : 'bg-slate-400'
                  }`}
                />
                {cloudSyncStatus === 'synced' ? 'Synced' : cloudSyncStatus === 'syncing' ? 'Syncing' : 'Offline'}
              </span>
            </div>
          </div>
        )}

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            title="Keluar dari akun Cloud"
            className={`w-full flex items-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-xl font-bold text-xs transition cursor-pointer ${
              isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
            }`}
          >
            <div className="flex items-center space-x-2">
              <LogOut className="w-4 h-4 text-rose-400" />
              {!isCollapsed && <span>Logout</span>}
            </div>
            {!isCollapsed && <span className="text-[10px] text-rose-400/80 uppercase font-extrabold">Sign Out</span>}
          </button>
        )}
      </div>
    </aside>
  );
};

