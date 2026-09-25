import React from 'react';
import { 
  Building2, 
  Activity, 
  Map, 
  Search, 
  Sliders, 
  CheckCircle2, 
  Bot, 
  FileText,
  Zap,
  Server
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  buildingName: string;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, buildingName }) => {
  const tabs = [
    { id: 'dashboard', label: 'Command Center', icon: Activity },
    { id: 'floorplan', label: 'Floor Plan Forensics', icon: Map },
    { id: 'autopsy', label: 'Energy Autopsy & Evidence', icon: Search },
    { id: 'simulator', label: 'What-If Simulator', icon: Sliders },
    { id: 'interventions', label: 'Interventions & M&V', icon: CheckCircle2 },
    { id: 'ai', label: 'AI Detective', icon: Bot },
    { id: 'report', label: 'Audit & Evaluation', icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0c121e]/90 backdrop-blur-md border-b border-[#1f2b42]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Tagline */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-wider text-white">VOLTARIS</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                  AI Detective
                </span>
              </div>
              <p className="text-[11px] text-slate-400">"Explain Every Watt" • Energy Forensics</p>
            </div>
          </div>

          {/* Active Facility Indicator */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#141d2f] border border-[#232f48] text-xs">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-300 font-medium">{buildingName}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-2"></span>
            <span className="text-emerald-400 text-[11px] font-mono">LIVE POSTGRESQL</span>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 overflow-x-auto py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#151f33]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
