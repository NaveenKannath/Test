import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { DashboardView } from './views/DashboardView';
import { FloorPlanView } from './views/FloorPlanView';
import { AutopsyView } from './views/AutopsyView';
import { SimulatorView } from './views/SimulatorView';
import { InterventionsView } from './views/InterventionsView';
import { AIDetectiveView } from './views/AIDetectiveView';
import { AuditReportView } from './views/AuditReportView';
import type { 
  Building, 
  Floor, 
  EnergySummary, 
  HealthScore, 
  TimeseriesPoint, 
  AnomalyItem
} from './api/client';
import { api } from './api/client';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [timeRange, setTimeRange] = useState<string>('7 Days');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [currentBuildingId, setCurrentBuildingId] = useState<string>('');
  const [building, setBuilding] = useState<Building | null>(null);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [summary, setSummary] = useState<EnergySummary | null>(null);
  const [health, setHealth] = useState<HealthScore | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const loadBuildingData = async (bId: string) => {
    try {
      const [bldgData, floorData, sumData, healthData, tsData, anomData] = await Promise.all([
        api.getBuilding(bId),
        api.getFloors(bId),
        api.getEnergySummary(bId),
        api.getHealthScore(bId),
        api.getEnergyTimeseries(bId, 72),
        api.getAnomalies(bId)
      ]);

      setBuilding(bldgData);
      setFloors(floorData);
      setSummary(sumData);
      setHealth(healthData);
      setTimeseries(tsData);
      setAnomalies(anomData);
      if (anomData.length > 0) {
        setSelectedAnomalyId(anomData[0].id);
      }
      setError(null);
    } catch (err: any) {
      console.error("Failed to load facility data:", err);
      setError("Could not reach Nexyra Backend at http://localhost:8000. Please ensure the backend is running.");
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const bldgs = await api.getBuildings();
        if (isMounted && Array.isArray(bldgs) && bldgs.length > 0) {
          setBuildings(bldgs);
          const initialBldgId = bldgs[0].id;
          setCurrentBuildingId(initialBldgId);
          await loadBuildingData(initialBldgId);
        } else {
          setError('Could not reach Nexyra Backend at http://localhost:8000. Please ensure the backend is running.');
        }
      } catch (err) {
        console.error('Failed to list buildings:', err);
        setError('Could not reach Nexyra Backend at http://localhost:8000. Please ensure the backend is running.');
      }
    }
    init();
    return () => { isMounted = false; };
  }, []);

  const handleSelectBuilding = async (bId: string) => {
    setCurrentBuildingId(bId);
    await loadBuildingData(bId);
  };

  const handleAddBuilding = async (payload: {
    name: string;
    building_type: string;
    gross_floor_area_m2: number;
    primary_use: string;
    address: string;
    timezone: string;
    currency: string;
    default_tariff_rate: number;
    number_of_floors: number;
  }) => {
    const newBldg = await api.createBuilding(payload);
    setBuildings(prev => [newBldg, ...prev]);
    setCurrentBuildingId(newBldg.id);
    await loadBuildingData(newBldg.id);
  };

  const handleDeleteBuilding = async (bId: string) => {
    try {
      await api.deleteBuilding(bId);
      const remaining = buildings.filter(b => b.id !== bId);
      setBuildings(remaining);
      if (currentBuildingId === bId) {
        if (remaining.length > 0) {
          setCurrentBuildingId(remaining[0].id);
          await loadBuildingData(remaining[0].id);
        } else {
          setBuilding(null);
          setFloors([]);
          setSummary(null);
          setHealth(null);
          setTimeseries([]);
          setAnomalies([]);
        }
      }
    } catch (err: any) {
      console.error("Failed to delete facility:", err);
      alert(err.message || "Failed to delete facility");
    }
  };

  const handleRefreshFloors = async () => {
    try {
      const floorData = await api.getFloors(currentBuildingId);
      setFloors(floorData);
    } catch (err) {
      console.error("Failed to refresh floors:", err);
    }
  };

  const handleSelectAnomalyAndNavigate = (anomId: string) => {
    setSelectedAnomalyId(anomId);
    setActiveTab('autopsy');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <TopHeader 
          buildings={buildings}
          currentBuilding={building}
          onSelectBuilding={handleSelectBuilding}
          onAddBuilding={handleAddBuilding}
          onDeleteBuilding={handleDeleteBuilding}
          timeRange={timeRange} 
          setTimeRange={setTimeRange}
          floorsCount={floors.length}
        />

        {/* View Content */}
        <main className="flex-1 px-8 py-6 overflow-y-auto">
          {error ? (
            <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center my-12 space-y-3">
              <h3 className="text-lg font-bold text-rose-800">Backend Connection Error</h3>
              <p className="text-sm text-rose-600">{error}</p>
              <p className="text-xs text-slate-500 font-mono">
                Start the backend with: <code className="bg-white border border-rose-200 px-2 py-1 rounded text-rose-700">uvicorn app.main:app --port 8000 --reload</code>
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  summary={summary}
                  health={health}
                  timeseries={timeseries}
                  anomalies={anomalies}
                  onSelectAnomaly={handleSelectAnomalyAndNavigate}
                  onNavigateTab={setActiveTab}
                  timeRange={timeRange}
                  setTimeRange={setTimeRange}
                  buildingName={building?.name}
                />
              )}

              {activeTab === 'floorplan' && (
                <FloorPlanView
                  floors={floors}
                  buildingId={currentBuildingId}
                  buildingName={building?.name}
                  onSelectAnomaly={handleSelectAnomalyAndNavigate}
                  onRefreshFloors={handleRefreshFloors}
                />
              )}

              {activeTab === 'autopsy' && (
                <AutopsyView
                  buildingId={currentBuildingId}
                  buildingName={building?.name}
                  anomalies={anomalies}
                  selectedAnomalyId={selectedAnomalyId}
                  onSelectAnomaly={setSelectedAnomalyId}
                  onNavigateTab={setActiveTab}
                />
              )}

              {activeTab === 'simulator' && (
                <SimulatorView
                  buildingId={currentBuildingId}
                  onNavigateTab={setActiveTab}
                />
              )}

              {activeTab === 'interventions' && (
                <InterventionsView
                  buildingId={currentBuildingId}
                />
              )}

              {activeTab === 'ai' && (
                <AIDetectiveView
                  buildingId={currentBuildingId}
                  buildingName={building?.name}
                />
              )}

              {activeTab === 'report' && (
                <AuditReportView
                  buildingId={currentBuildingId}
                />
              )}
            </>
          )}
        </main>

        {/* Persistent Status Footer */}
        <footer className="border-t border-slate-200 bg-white py-2.5 px-6 text-[11px] text-slate-400 flex items-center justify-between font-mono">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-slate-600">Nexyra v1.0</span>
            <span>·</span>
            <span>nexyra3_db</span>
          </div>
          <div>IPMVP Option C · ASHRAE 55</div>
        </footer>
      </div>
    </div>
  );
};

export default App;
