import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  ArrowRight, 
  CheckCircle2,
  TrendingDown,
  Info
} from 'lucide-react';
import type { SimulationResult } from '../api/client';
import { api } from '../api/client';

interface SimulatorViewProps {
  buildingId?: string;
  onNavigateTab: (tabId: string) => void;
}

export const SimulatorView: React.FC<SimulatorViewProps> = ({ buildingId, onNavigateTab }) => {
  const [scenarioType, setScenarioType] = useState<string>('hvac_runtime_reduction');
  const [runtimeHours, setRuntimeHours] = useState<number>(2.0);
  const [setpointDelta, setSetpointDelta] = useState<number>(1.5);
  const [efficiencyGain, setEfficiencyGain] = useState<number>(25.0);
  const [compliancePct, setCompliancePct] = useState<number>(95.0);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const activeBuildingId = buildingId || 'bldg-technova-01';

  // Recalculate simulation via backend API
  useEffect(() => {
    let isMounted = true;
    async function calculate() {
      setLoading(true);
      try {
        const sim = await api.runSimulation({
          building_id: activeBuildingId,
          scenario_type: scenarioType,
          reduction_hours_per_day: runtimeHours,
          setpoint_change_degrees: setpointDelta,
          equipment_efficiency_improvement_pct: efficiencyGain,
          schedule_compliance_pct: compliancePct
        });
        if (isMounted) {
          setResult(sim);
        }
      } catch (err) {
        console.error("Simulation calculation failed:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    calculate();
    return () => { isMounted = false; };
  }, [scenarioType, runtimeHours, setpointDelta, efficiencyGain, compliancePct]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">What-If Energy Savings Simulator</h2>
          <span className="px-2.5 py-0.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200/80 rounded-full">
            Thermodynamic Engine
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time simulation of building conservation measures (ECMs). Physics-grounded calculations computed live on the backend.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Scenario Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">1. Select Conservation Measure</h3>

            {/* Scenario Buttons */}
            <div className="space-y-2">
              {[
                { id: 'hvac_runtime_reduction', label: 'Reduce Daily HVAC Runtime', desc: 'Truncate after-hours fan & compressor cycling' },
                { id: 'setpoint_adjustment', label: 'Thermostat Setpoint Setback (+°C)', desc: 'ASHRAE 55 thermal comfort setback envelope' },
                { id: 'lighting_runtime_reduction', label: 'Vacancy-Sensor Lighting Control', desc: '15-minute auto-off in intermittently occupied rooms' },
                { id: 'equipment_replacement', label: 'High-Efficiency Chiller Retrofit', desc: 'Upgrade central plant to magnetic-bearing compressors' },
                { id: 'schedule_optimization', label: 'BMS Holiday & Weekend Calendar Sync', desc: 'Enforce automatic weekend lockouts' }
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setScenarioType(s.id)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                    scenarioType === s.id
                      ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold text-slate-900">{s.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{s.desc}</div>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono mb-3">2. Calibrate Parameters</h3>

              {/* Slider 1: Runtime Hours */}
              {scenarioType === 'hvac_runtime_reduction' && (
                <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-medium">Daily Runtime Reduction:</span>
                    <span className="font-mono font-bold text-blue-600">{runtimeHours} Hours / Day</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="4.0"
                    step="0.5"
                    value={runtimeHours}
                    onChange={(e) => setRuntimeHours(parseFloat(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>0.5h (Mild)</span>
                    <span>2.0h (Recommended)</span>
                    <span>4.0h (Aggressive)</span>
                  </div>
                </div>
              )}

              {/* Slider 2: Setpoint Delta */}
              {scenarioType === 'setpoint_adjustment' && (
                <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-medium">Cooling Setpoint Increase:</span>
                    <span className="font-mono font-bold text-blue-600">+{setpointDelta} °C</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.5"
                    value={setpointDelta}
                    onChange={(e) => setSetpointDelta(parseFloat(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>+0.5°C</span>
                    <span>+1.5°C</span>
                    <span>+3.0°C</span>
                  </div>
                </div>
              )}

              {/* Slider 3: Equipment Upgrade */}
              {scenarioType === 'equipment_replacement' && (
                <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-medium">COP Efficiency Gain:</span>
                    <span className="font-mono font-bold text-blue-600">+{efficiencyGain}% Efficiency</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="40"
                    step="5"
                    value={efficiencyGain}
                    onChange={(e) => setEfficiencyGain(parseFloat(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>+10% (VFD Add-on)</span>
                    <span>+25% (Chiller Upgrade)</span>
                    <span>+40% (Geothermal)</span>
                  </div>
                </div>
              )}

              {/* Slider 4: Schedule Adherence */}
              {(scenarioType === 'schedule_optimization' || scenarioType === 'lighting_runtime_reduction') && (
                <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-medium">Schedule Compliance Target:</span>
                    <span className="font-mono font-bold text-blue-600">{compliancePct}% Adherence</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="100"
                    step="5"
                    value={compliancePct}
                    onChange={(e) => setCompliancePct(parseFloat(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>80%</span>
                    <span>95% (Target)</span>
                    <span>100%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Projected Real-World Results (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {result && (
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{result.scenario_name}</h3>
                  <p className="text-xs text-slate-500">Live Projected Annual Savings for TechNova</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold font-mono">
                  -{result.percent_reduction}% Facility Demand
                </span>
              </div>

              {/* 4 Impact Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-mono uppercase font-semibold">Annual Cost Saved</span>
                  <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                    ₹{result.annual_cost_savings.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">at ₹9.50/kWh</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-mono uppercase font-semibold">Energy Conserved</span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {result.annual_kwh_savings.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">kWh / year</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-mono uppercase font-semibold">CO2 Mitigated</span>
                  <div className="text-xl font-bold font-mono text-teal-700 mt-1">
                    {(result.annual_co2_savings_kg / 1000).toFixed(1)} <span className="text-xs font-normal">t</span>
                  </div>
                  <span className="text-[10px] text-slate-400">metric tons CO2e</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-mono uppercase font-semibold">Confidence</span>
                  <div className="text-xl font-bold font-mono text-blue-600 mt-1">
                    {(result.confidence * 100).toFixed(0)}%
                  </div>
                  <span className="text-[10px] text-slate-400">Thermodynamic</span>
                </div>
              </div>

              {/* 12-Month Seasonal Trajectory Bar Chart */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-slate-700 font-mono uppercase text-[11px]">12-Month Simulated Seasonal Trajectory</span>
                  <div className="flex items-center space-x-3 text-[11px]">
                    <span className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-slate-300"></span>
                      <span className="text-slate-500">Baseline</span>
                    </span>
                    <span className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-blue-600"></span>
                      <span className="text-blue-700 font-medium">Projected</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-1.5 pt-4 pb-2 items-end h-32 bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                  {result.monthly_breakdown.map((m) => {
                    const maxVal = Math.max(...result.monthly_breakdown.map(x => x.baseline_kwh));
                    const baseH = (m.baseline_kwh / maxVal) * 100;
                    const projH = (m.projected_kwh / maxVal) * 100;

                    return (
                      <div key={m.month} className="flex flex-col items-center h-full justify-end group relative">
                        <div className="w-full flex items-end justify-center space-x-0.5 h-full">
                          <div className="w-2.5 bg-slate-300 rounded-t-sm" style={{ height: `${baseH}%` }}></div>
                          <div className="w-2.5 bg-blue-600 rounded-t-sm" style={{ height: `${projH}%` }}></div>
                        </div>
                        <span className="text-[9px] text-slate-500 mt-1 font-mono">{m.month}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Engineering Assumptions Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">Engineering & Physics Assumptions:</span>
                <ul className="mt-2 space-y-1 text-slate-700 text-[11px]">
                  {Object.entries(result.assumptions).map(([k, v]) => (
                    <li key={k} className="flex items-start space-x-1.5">
                      <span className="text-blue-600">•</span>
                      <span><strong>{k.replace(/_/g, ' ')}:</strong> {String(v)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Transition CTA */}
              <button
                onClick={() => onNavigateTab('interventions')}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition-colors shadow-xs"
              >
                <span>Commit as Active Facility Intervention</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
