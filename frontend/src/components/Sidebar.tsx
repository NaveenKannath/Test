import React, { useState } from 'react';
import {
  Zap,
  LayoutDashboard,
  Map,
  Search,
  Sliders,
  Wrench,
  Bot,
  FileBarChart,
  ChevronRight,
  ChevronLeft,
  Activity
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const NAV_ITEMS = [
  {
    group: 'Monitor',
    items: [
      { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, description: 'Energy intelligence' },
      { id: 'floorplan', label: 'Floor Plans', icon: Map, description: 'Zones & layout' },
    ],
  },
  {
    group: 'Forensics',
    items: [
      { id: 'autopsy', label: 'Investigations', icon: Search, description: 'Anomaly autopsy' },
      { id: 'simulator', label: 'Simulator', icon: Sliders, description: 'What-if scenarios' },
      { id: 'interventions', label: 'Interventions', icon: Wrench, description: 'M&V tracking' },
    ],
  },
  {
    group: 'Intelligence',
    items: [
      { id: 'ai', label: 'AI Detective', icon: Bot, description: 'Chat forensics' },
      { id: 'report', label: 'Audit Reports', icon: FileBarChart, description: 'IPMVP reports' },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-60'} bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 shrink-0 select-none transition-all duration-200`}
    >
      {/* Brand */}
      <div className={`flex items-center border-b border-slate-100 ${collapsed ? 'px-3 py-4 justify-center' : 'px-4 py-4 space-x-3'}`}>
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-white fill-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-slate-900 leading-none">Nexyra</p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Energy Detective</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV_ITEMS.map(({ group, items }) => (
          <div key={group}>
            {!collapsed && (
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1.5">
                {group}
              </p>
            )}
            <div className="space-y-0.5">
              {items.map(({ id, label, icon: Icon, description }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    title={collapsed ? label : undefined}
                    className={`w-full flex items-center rounded-lg text-left transition-all duration-100 group
                      ${collapsed ? 'justify-center p-2.5' : 'px-2.5 py-2 space-x-3'}
                      ${active
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <Icon
                      className={`shrink-0 ${collapsed ? 'w-5 h-5' : 'w-4 h-4'} ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                    />
                    {!collapsed && (
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold truncate leading-none ${active ? 'text-blue-700' : ''}`}>
                          {label}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{description}</p>
                      </div>
                    )}
                    {!collapsed && active && (
                      <ChevronRight className="w-3 h-3 text-blue-400 ml-auto shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Live Status Pill */}
      {!collapsed && (
        <div className="mx-3 mb-3 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-slate-700 leading-none">Live Telemetry</p>
              <p className="text-[9px] text-slate-400 mt-0.5">PostgreSQL · Synced now</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className={`border-t border-slate-100 p-2 ${collapsed ? 'flex justify-center' : ''}`}>
        {!collapsed && (
          <div className="flex items-center space-x-2.5 px-2 py-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0">
              FM
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-800 truncate leading-none">Facility Manager</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Operations Director</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-1.5 text-[10px] text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : (
            <>
              <ChevronLeft className="w-3 h-3 mr-1" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
