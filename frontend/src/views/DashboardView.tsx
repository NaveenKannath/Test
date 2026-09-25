import React from 'react';
import { 
  Activity, 
  AlertTriangle, 
  DollarSign, 
  ShieldCheck, 
  Compass,
  ArrowUpRight,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  Clock
} from 'lucide-react';
import type { EnergySummary, HealthScore, TimeseriesPoint, AnomalyItem } from '../api/client';

interface DashboardViewProps {
  buildingName?: string;
  summary: EnergySummary | null;
  health: HealthScore | null;
  timeseries: TimeseriesPoint[];
  anomalies: AnomalyItem[];
  onSelectAnomaly: (anomalyId: string) => void;
  onNavigateTab: (tabId: string) => void;
  timeRange: string;
  setTimeRange: (range: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  buildingName,
  summary,
  health,
  timeseries,
  anomalies,
  onSelectAnomaly,
  onNavigateTab,
  timeRange,
  setTimeRange
}) => {
  if (!summary || !health) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-xs font-medium">Synchronizing Building Telemetry...</p>
        </div>
      </div>
    );
  }

  // Filter timeseries according to timeRange
  const pointsCount = timeRange === 'Today' ? 24 : (timeRange === '7 Days' ? 48 : 72);
  const points = timeseries.slice(0, pointsCount);
  const allVals = points.flatMap(p => [p.actual_kwh, p.expected_kwh]).filter(v => typeof v === 'number');
  const minVal = allVals.length > 0 ? Math.min(...allVals) : 0;
  const maxVal = allVals.length > 0 ? Math.max(...allVals) : 10;
  const spread = Math.max(maxVal - minVal, 1.2);
  const minKwh = Math.max(0, Math.floor((minVal - spread * 0.25) * 10) / 10);
  const maxKwh = Math.ceil((maxVal + spread * 0.25) * 10) / 10;
  const kwhRange = Math.max(maxKwh - minKwh, 1);
  const chartHeight = 180;
  const chartWidth = 720;
  const paddingBottom = 20;
  const paddingTop = 20;
  const usableH = chartHeight - paddingTop - paddingBottom;

  const getY = (kwh: number) => {
    const norm = (kwh - minKwh) / kwhRange;
    return chartHeight - paddingBottom - norm * usableH;
  };

  const actualPath = points.map((p, i) => {
    const x = (i / Math.max(1, points.length - 1)) * chartWidth;
    const y = getY(p.actual_kwh);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const expectedPath = points.map((p, i) => {
    const x = (i / Math.max(1, points.length - 1)) * chartWidth;
    const y = getY(p.expected_kwh);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Sync Status Bar */}
      <div>
        <div className="flex items-center space-x-2.5">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Energy Intelligence</h1>
          <span className="px-2.5 py-0.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200/80 rounded-full">
            Live Monitor
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Real-time forensics, continuous anomaly surveillance, and verified savings for <strong className="text-slate-700">{buildingName || "Bengaluru Innovation Center"}</strong>
        </p>

        <div className="mt-3 flex items-center space-x-3 text-xs">
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{points.length > 0 ? "Telemetry Ingested" : "No Telemetry Ingested"}</span>
          </span>
          <span className="text-slate-400 font-medium text-[11px]">Synced 0m ago</span>
        </div>
      </div>

      {/* 5 Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Building Health */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Building Health</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold text-slate-900">{health.overall_score}</span>
              <span className="text-xs text-slate-400 font-medium">/ 100</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">{health.grade === 'A' ? 'Optimal Standing' : 'Good Standing'}</span>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] flex items-center space-x-0.5">
                <span>↗ +3.8 pts</span>
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Anomalies */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Anomalies</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {anomalies.length}
            </div>
            <div className="mt-2 text-[11px] text-slate-500 font-medium">
              {anomalies.length > 0 ? "1 critical • 1 warning" : "0 critical • 0 warning"}
            </div>
          </div>
        </div>

        {/* Card 3: Recoverable Cost */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Recoverable Cost</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
              ₹
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-slate-900">₹{(summary.estimated_excess_cost || 0).toFixed(0)}</span>
              <span className="text-xs text-slate-400 font-medium">/ mo</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 font-medium">
              {summary.total_excess_kwh || 0} kWh avoidable
            </div>
          </div>
        </div>

        {/* Card 4: Action Recommendations */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Action Recommendations</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              3 Active
            </div>
            <div className="mt-2 text-[11px] text-slate-500 font-medium">
              8.4% efficiency potential
            </div>
          </div>
        </div>

        {/* Card 5: Verified Savings */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Verified Savings</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-slate-900">₹9,85,400</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">YTD</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">IPMVP Option C</span>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                ↗ +14.2%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Energy Consumption Profile & Health Scorecard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Energy Consumption Profile (8 Cols) */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Energy Consumption Profile</h3>
                <p className="text-xs text-slate-500">Measured telemetry vs. simulated baseline demand</p>
              </div>

              {/* Time Range Selector */}
              <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/70 text-xs self-start sm:self-auto">
                {['Today', '7 Days', '30 Days'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-3 py-1 rounded-lg text-xs transition-all ${
                      timeRange === r
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Chart */}
            <div className="pt-6 pb-2">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-52 overflow-visible">
                {/* Horizontal Grid lines */}
                <line x1="0" y1={getY(maxKwh)} x2={chartWidth} y2={getY(maxKwh)} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1={getY((maxKwh + minKwh) / 2)} x2={chartWidth} y2={getY((maxKwh + minKwh) / 2)} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1={getY(minKwh)} x2={chartWidth} y2={getY(minKwh)} stroke="#e2e8f0" strokeWidth="1.5" />

                {/* Y-Axis Value Labels */}
                <text x="4" y={getY(maxKwh) - 4} fill="#94a3b8" fontSize="10" fontFamily="monospace" fontWeight="500">{maxKwh.toFixed(1)} kWh</text>
                <text x="4" y={getY((maxKwh + minKwh) / 2) - 4} fill="#94a3b8" fontSize="10" fontFamily="monospace" fontWeight="500">{((maxKwh + minKwh) / 2).toFixed(1)} kWh</text>
                <text x="4" y={getY(minKwh) - 4} fill="#94a3b8" fontSize="10" fontFamily="monospace" fontWeight="500">{minKwh.toFixed(1)} kWh</text>

                {/* Expected Baseline Line (Dashed Slate) */}
                <path d={expectedPath} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" />

                {/* Actual Energy Consumption Line (Royal Blue) */}
                <path d={actualPath} fill="none" stroke="#2563eb" strokeWidth="2.5" />

                {/* Anomaly Points (Red Dots) */}
                {points.map((p, idx) => {
                  if (p.is_anomaly) {
                    const cx = (idx / Math.max(1, points.length - 1)) * chartWidth;
                    const cy = getY(p.actual_kwh);
                    return (
                      <g key={idx}>
                        <circle cx={cx} cy={cy} r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                      </g>
                    );
                  }
                  return null;
                })}
              </svg>

              {/* Chart Legend & Axes */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-3 border-t border-slate-100 mt-2">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-3 h-1 bg-blue-600 rounded-sm"></span>
                    <span className="font-medium text-slate-700">Measured Load (kWh)</span>
                  </span>
                  <span className="flex items-center space-x-1.5">
                    <span className="w-3 h-1 border-t-2 border-dashed border-slate-400"></span>
                    <span>Expected Baseline</span>
                  </span>
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span className="text-rose-600 font-medium">Anomaly Breach</span>
                  </span>
                </div>
                <span className="font-mono text-slate-400">Resolution: 60m BACnet intervals</span>
              </div>
            </div>
          </div>

          {/* Quick Action Footer */}
          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <span className="text-slate-600">
              <strong>Incident Detected:</strong> Zone F3-Z05 drew 9.4 kW between 20:00 and 04:00 (PIR occupancy = 0).
            </span>
            <button
              onClick={() => onSelectAnomaly('anom-golden-01')}
              className="text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1 transition-colors"
            >
              <span>View Autopsy</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column: Health Scorecard (4 Cols) */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-700 tracking-wider uppercase font-mono">
                  Executive Health Scorecard
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200">
                Moderate Deviation
              </span>
            </div>

            {/* Big Score Block */}
            <div className="py-4 flex items-center justify-between">
              <div>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-4xl font-bold text-slate-900">{health.overall_score}</span>
                  <span className="text-xs text-slate-400 font-medium">/ 100</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Comprehensive building operational index</p>
              </div>

              <div className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold text-xs text-right">
                <div>+3.8</div>
                <div className="text-[9px] font-medium text-emerald-600 uppercase">pts trend</div>
              </div>
            </div>

            {/* Subsystem Assessment List */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-2">
                <span>Subsystem Assessment</span>
                <span>Index</span>
              </div>

              <div className="space-y-3">
                {health.components.map((c, i) => (
                  <div key={i} className="text-xs">
                    <div className="flex justify-between font-medium text-slate-700">
                      <span>{c.name}</span>
                      <span className="font-mono font-bold text-slate-900">{c.score}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          c.score >= 80 ? 'bg-emerald-500' : (c.score >= 65 ? 'bg-amber-500' : 'bg-rose-500')
                        }`}
                        style={{ width: `${c.score}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Protocol: IPMVP Option C</span>
            <span className="text-slate-600 font-medium">Ashrae 55 Compliant</span>
          </div>
        </div>
      </div>

      {/* Active Investigations Table */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Active Forensic Investigations</h3>
            <p className="text-xs text-slate-500">Autonomous anomaly triage ranked by cost and operational impact</p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
            {anomalies.length} Flagged
          </span>
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-mono">
                <th className="py-2.5 font-semibold">Incident & Zone</th>
                <th className="py-2.5 font-semibold">Anomaly Type</th>
                <th className="py-2.5 font-semibold">Severity</th>
                <th className="py-2.5 font-semibold">Avoidable kWh</th>
                <th className="py-2.5 font-semibold">Cost Impact</th>
                <th className="py-2.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {anomalies.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 font-medium text-slate-800">
                    <div>{a.title}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{a.zone_name}</div>
                  </td>
                  <td className="py-3 text-slate-600 font-mono text-[11px]">{a.anomaly_type}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      a.severity === 'critical' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      (a.severity === 'high' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-blue-50 text-blue-700 border border-blue-200')
                    }`}>
                      {a.severity}
                    </span>
                  </td>
                  <td className="py-3 font-mono font-semibold text-rose-600">+{a.excess_kwh} kWh</td>
                  <td className="py-3 font-mono font-bold text-slate-900">₹{a.estimated_cost.toFixed(2)}</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => onSelectAnomaly(a.id)}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs inline-flex items-center space-x-1 transition-colors"
                    >
                      <span>Investigate</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
