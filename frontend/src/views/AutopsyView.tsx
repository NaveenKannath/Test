import React, { useState, useEffect } from 'react';
import { 
  FileCheck2, 
  HelpCircle, 
  ArrowRight, 
  Sliders, 
  CheckCircle2,
  Clock,
  MapPin,
  AlertTriangle
} from 'lucide-react';
import type { AnomalyItem, EvidenceCard, AutopsyTimeline } from '../api/client';
import { api } from '../api/client';

interface AutopsyViewProps {
  anomalies: AnomalyItem[];
  selectedAnomalyId: string;
  onSelectAnomaly: (id: string) => void;
  onNavigateTab: (tabId: string) => void;
}

export const AutopsyView: React.FC<AutopsyViewProps> = ({
  anomalies,
  selectedAnomalyId,
  onSelectAnomaly,
  onNavigateTab
}) => {
  const [evidence, setEvidence] = useState<EvidenceCard | null>(null);
  const [autopsy, setAutopsy] = useState<AutopsyTimeline | null>(null);
  const [nonWasteExplanations, setNonWasteExplanations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const activeId = selectedAnomalyId || (anomalies.length > 0 ? anomalies[0].id : 'anom-golden-01');

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!activeId) return;
      setLoading(true);
      try {
        const [evData, autoData, legitData] = await Promise.all([
          api.getAnomalyEvidence(activeId),
          api.getAnomalyAutopsy(activeId),
          api.getNonWasteExplanations('bldg-technova-01')
        ]);
        if (isMounted) {
          setEvidence(evData);
          setAutopsy(autoData);
          setNonWasteExplanations(legitData);
        }
      } catch (err) {
        console.error("Failed to load autopsy data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [activeId]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header and Incident Selector */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Energy Autopsy & Forensic Evidence Room</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-full">
              Incident Investigation
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Every watt explained. Chronological forensic reconstruction from initial trigger to thermodynamic root cause.
          </p>
        </div>

        {/* Anomaly Selector Dropdown */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Active Incident:</span>
          <select
            value={activeId}
            onChange={(e) => onSelectAnomaly(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
          >
            {anomalies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.excess_kwh} kWh)
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-slate-500 font-medium">Reconstructing Energy Autopsy Timeline...</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Forensic Autopsy Timeline (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Chronological Failure Sequence</h3>
                  <p className="text-xs text-slate-500">Timeline reconstruction of the failure cascade</p>
                </div>
                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  5 Investigation Steps
                </span>
              </div>

              {/* Timeline Steps */}
              {autopsy && (
                <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                  {autopsy.timeline.map((step) => {
                    const isAlert = step.event_type === 'threshold_breached' || step.event_type === 'anomaly_flagged';
                    const isRoot = step.event_type === 'root_cause_identified';

                    return (
                      <div key={step.id} className="relative group">
                        {/* Dot on line */}
                        <div className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 ${
                          isRoot ? 'bg-emerald-600 border-white ring-4 ring-emerald-100' :
                          (isAlert ? 'bg-rose-600 border-white ring-4 ring-rose-100' :
                          'bg-blue-600 border-white ring-2 ring-slate-100')
                        }`}></div>

                        <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold text-slate-900 font-mono flex items-center space-x-1.5">
                              <span className="text-blue-600">#{step.step_order}</span>
                              <span>{step.title}</span>
                            </span>
                            <span className="text-slate-400 font-mono text-[11px]">
                              {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed mt-1">
                            {step.description}
                          </p>

                          {step.evidence_reference && (
                            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                              <span>Telemetry Proof Point:</span>
                              <span className="text-blue-600 font-mono font-medium">{step.evidence_reference}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Autopsy Diagnostic Verdict */}
              {autopsy && (
                <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                  <div className="flex items-center space-x-2 text-emerald-800 font-bold mb-1">
                    <FileCheck2 className="w-4 h-4 text-emerald-600" />
                    <span>Autopsy Diagnostic Verdict</span>
                  </div>
                  <p className="text-emerald-900 leading-snug">
                    <strong>Primary Root Cause:</strong> {autopsy.primary_cause}.
                  </p>
                  <p className="text-emerald-700 text-[11px] mt-1">
                    <strong>Action:</strong> {autopsy.recommended_action}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Evidence Card & Why Not Flagged (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* The Evidence Card */}
            {evidence && (
              <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 rounded-full">
                      Evidence Card
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-700">
                      {(evidence.confidence_score * 100).toFixed(0)}% Confidence
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Incident #{evidence.anomaly_id.slice(-6)}</span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mb-3">{evidence.title}</h3>

                {/* 2 Big Number Boxes */}
                <div className="grid grid-cols-2 gap-2.5 text-xs mb-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 uppercase font-mono font-semibold">Avoidable Excess</span>
                    <div className="text-lg font-bold font-mono text-rose-600 mt-0.5">
                      {evidence.how_much_kwh} <span className="text-xs text-slate-400 font-normal">kWh</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 uppercase font-mono font-semibold">Waste Cost</span>
                    <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                      ₹{evidence.how_much_cost.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Facts Table */}
                <div className="space-y-2 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-slate-600">
                  <div>
                    <strong className="text-slate-900">WHERE: </strong>
                    <span>{evidence.where}</span>
                  </div>
                  <div>
                    <strong className="text-slate-900">WHEN: </strong>
                    <span>{evidence.when}</span>
                  </div>
                  <div>
                    <strong className="text-slate-900">WHY FLAGGED: </strong>
                    <span>{evidence.why_flagged}</span>
                  </div>
                </div>

                {/* Verified Sensor Telemetry Items */}
                <div className="mt-4 space-y-2">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Verified Sensor Proof Points:</span>
                  {evidence.evidence_list.map((item) => (
                    <div key={item.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                      <div className="flex items-center justify-between text-[11px] mb-0.5">
                        <span className="font-bold text-slate-800">{item.metric_name}</span>
                        <span className="text-emerald-700 font-mono font-bold">{(item.confidence * 100).toFixed(0)}% verified</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">{item.narrative}</p>
                    </div>
                  ))}
                </div>

                {/* Transition to What-If Simulator */}
                <button
                  onClick={() => onNavigateTab('simulator')}
                  className="mt-4 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Simulate Fixing This in What-If Simulator</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* "Why Wasn't This Flagged?" Card */}
            <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200 text-xs">
              <div className="flex items-center space-x-2 text-blue-900 font-bold mb-2">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                <span>"Why Wasn't This Flagged?" (High Weather vs. Waste)</span>
              </div>
              <p className="text-blue-900/80 leading-relaxed">
                Nexyra distinguishes between <strong>HIGH ENERGY</strong> and <strong>ENERGY WASTE</strong>.
              </p>
              {nonWasteExplanations.length > 0 && (
                <div className="mt-2.5 p-3 rounded-xl bg-white border border-blue-200 space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-bold text-slate-900">Heatwave Design Day Event:</span>
                    <span className="text-emerald-700 font-mono font-bold">Non-Waste Verdict</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    {nonWasteExplanations[0].explanation}
                  </p>
                  <div className="text-[10px] text-blue-700 font-mono pt-1">
                    Ambient: 33.5°C • Occupants: 88% verified • Chillers within nominal COP
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
