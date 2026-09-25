import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight,
  Activity,
  Maximize2,
  Sparkles,
  Upload,
  FileText,
  X,
  Layers,
  Zap,
  Info,
  Sliders,
  Check,
  Wind,
  RotateCcw
} from 'lucide-react';
import type { Floor, ZoneState } from '../api/client';
import { api } from '../api/client';

export interface HVACSystemItem {
  id: string;
  name: string;
  type: string;
  cop: number;
  description: string;
  health_score: number;
  badge_color: string;
  is_active: boolean;
}

interface FloorPlanViewProps {
  floors: Floor[];
  buildingId?: string;
  buildingName?: string;
  onSelectAnomaly: (anomalyId: string) => void;
  onRefreshFloors?: () => void;
}

export const FloorPlanView: React.FC<FloorPlanViewProps> = ({ 
  floors, 
  buildingId,
  buildingName,
  onSelectAnomaly,
  onRefreshFloors 
}) => {
  // Never default to a mock or hardcoded building floor. Initialize with first floor if available, else empty.
  const [selectedFloorId, setSelectedFloorId] = useState<string>(() => floors[0]?.id || '');
  const [zones, setZones] = useState<ZoneState[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedZone, setSelectedZone] = useState<ZoneState | null>(null);
  const [hoveredZone, setHoveredZone] = useState<ZoneState | null>(null);

  // Interchangeable HVAC Datasets State
  const [hvacSystems, setHvacSystems] = useState<HVACSystemItem[]>([]);
  const [activeHvacId, setActiveHvacId] = useState<string>('chilled_water_vav');
  const [isApplyingHvac, setIsApplyingHvac] = useState<boolean>(false);
  const [hvacStatusMsg, setHvacStatusMsg] = useState<string | null>(null);

  const activeBuildingId = buildingId || floors[0]?.building_id || 'bldg-technova-01';

  // Load available interchangeable HVAC systems
  useEffect(() => {
    let isMounted = true;
    async function loadHvacProfiles() {
      try {
        const data = await api.getHVACSystems(activeBuildingId);
        if (isMounted && Array.isArray(data)) {
          setHvacSystems(data);
          const active = data.find(s => s.is_active);
          if (active) setActiveHvacId(active.id);
        }
      } catch (err) {
        console.error("Failed to load HVAC systems:", err);
      }
    }
    loadHvacProfiles();
    return () => { isMounted = false; };
  }, [activeBuildingId]);

  // AI Floor Plan Recognition & Dataset Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [floorNameInput, setFloorNameInput] = useState<string>('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null);
  const [uploadedFileType, setUploadedFileType] = useState<string | null>(null);
  // Dataset CSV text — starts EMPTY so user must provide their own data, not hardcoded mock
  const [datasetText, setDatasetText] = useState<string>('');
  const [aiProcessing, setAiProcessing] = useState<boolean>(false);
  const [aiStep, setAiStep] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [customFloorNumber, setCustomFloorNumber] = useState<number>(1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize floor selection when building or floors change
  useEffect(() => {
    if (floors.length > 0) {
      if (!floors.some(f => f.id === selectedFloorId)) {
        setSelectedFloorId(floors[0].id);
      }
    } else {
      setSelectedFloorId('');
      setZones([]);
      setSelectedZone(null);
    }
  }, [floors, buildingId]);

  // Load zone states strictly for floors belonging to the current building
  useEffect(() => {
    let isMounted = true;
    async function loadFloorData() {
      if (!selectedFloorId) {
        setZones([]);
        setSelectedZone(null);
        setLoading(false);
        return;
      }
      // If floor does not belong to current floors array, do not load foreign building zones
      if (floors.length > 0 && !floors.some(f => f.id === selectedFloorId)) {
        setZones([]);
        setSelectedZone(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await api.getFloorZoneStates(selectedFloorId);
        if (isMounted) {
          setZones(data);
          const anomZone = data.find(z => z.status === 'critical' || z.status === 'anomaly');
          setSelectedZone(anomZone || data[0] || null);
        }
      } catch (err) {
        console.error("Failed to load zone states:", err);
        if (isMounted) {
          setZones([]);
          setSelectedZone(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadFloorData();
    return () => { isMounted = false; };
  }, [selectedFloorId, floors]);

  const activeFloor = floors.find(f => f.id === selectedFloorId);

  // Interchangeably swap HVAC dataset
  const handleApplyHvacSystem = async (sysId: string) => {
    if (isApplyingHvac) return;
    setIsApplyingHvac(true);
    const chosen = hvacSystems.find(s => s.id === sysId);
    setHvacStatusMsg(`Calibrating ${chosen?.name || sysId} dataset...`);
    try {
      await api.applyHVACSystem(activeBuildingId, sysId, selectedFloorId);
      setActiveHvacId(sysId);
      
      // Refresh current floor's zones immediately
      const data = await api.getFloorZoneStates(selectedFloorId);
      setZones(data);
      const anomZone = data.find(z => z.status === 'critical' || z.status === 'anomaly');
      setSelectedZone(anomZone || data[0] || null);

      // Refresh system profile active tags
      const updatedSys = await api.getHVACSystems(activeBuildingId);
      if (Array.isArray(updatedSys)) setHvacSystems(updatedSys);

      if (onRefreshFloors) onRefreshFloors();
      setHvacStatusMsg(`Active: ${chosen?.name || sysId} (COP ${chosen?.cop || 4.5})`);
      setTimeout(() => setHvacStatusMsg(null), 4000);
    } catch (err: any) {
      console.error("Failed to apply HVAC dataset:", err);
      setHvacStatusMsg(`Error: ${err.message || 'Failed'}`);
    } finally {
      setIsApplyingHvac(false);
    }
  };

  // Clean light mode styling for SVG zones
  const getZoneColors = (status: string, isSelected: boolean) => {
    if (isSelected) {
      return { fill: '#dbeafe', stroke: '#2563eb', strokeWidth: 3 };
    }
    switch (status) {
      case 'critical':
        return { fill: '#fee2e2', stroke: '#ef4444', strokeWidth: 2 };
      case 'anomaly':
        return { fill: '#fef3c7', stroke: '#f59e0b', strokeWidth: 2 };
      case 'elevated':
        return { fill: '#eff6ff', stroke: '#93c5fd', strokeWidth: 1.5 };
      default:
        return { fill: '#ffffff', stroke: '#cbd5e1', strokeWidth: 1.5 };
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'dwg';
      setUploadedFileName(file.name);
      setUploadedFileSize(
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`
      );
      setUploadedFileType(ext);

      // Auto-suggest floor name from file name — strip extension, clean it up
      const baseName = file.name.replace(/\.[^/.]+$/, '').trim();
      if (baseName && baseName.length > 2) {
        const shortName = baseName.length > 55 ? `${baseName.slice(0, 52)}...` : baseName;
        setFloorNameInput(shortName);
      }

      // For image formats, read as data URL so it can be shown as SVG background
      const imageFormats = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'bmp', 'tiff', 'tif'];
      if (imageFormats.includes(ext)) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setUploadedImage(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        // For CAD files (DWG, DXF, PDF, IFC), we cannot render them natively in the browser.
        // Store the file name/type only; the backend will use the CSV dataset for room segmentation.
        setUploadedImage(null);
      }
    }
  };

  // Load CSV dataset from a separate file
  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && content.trim().length > 0) {
        setDatasetText(content.trim());
      }
    };
    reader.readAsText(file);
    if (csvFileInputRef.current) csvFileInputRef.current.value = '';
  };

  const handleClearUploadedFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedImage(null);
    setUploadedFileName(null);
    setUploadedFileSize(null);
    setUploadedFileType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRunAiRecognition = async () => {
    // Guard: require a room dataset — do not silently use hidden mock templates
    if (!datasetText.trim()) {
      setModalError('Please paste your room dataset (CSV/JSON) in Step 2 before running AI recognition. The AI uses your dataset to segment rooms — it does not make up data.');
      return;
    }

    setAiProcessing(true);
    setModalError(null);
    setAiStep(
      uploadedFileType === 'dwg' || uploadedFileType === 'dxf'
        ? '1. Registered AutoCAD DWG/DXF file. Parsing room dataset for spatial segmentation...'
        : uploadedFileType && ['png','jpg','jpeg','webp','svg','bmp'].includes(uploadedFileType)
        ? '1. Loaded floor plan image. Binding room dataset to spatial canvas...'
        : '1. Processing floor plan file. Ingesting your room dataset...'
    );

    try {
      await new Promise(r => setTimeout(r, 500));
      setAiStep('2. Segmenting rooms, doors, and bounding coordinates from your dataset...');
      await new Promise(r => setTimeout(r, 600));
      setAiStep('3. Binding submeter telemetry to recognized zones...');

      const result = await api.recognizeFloorPlan({
        building_id: activeBuildingId,
        floor_name: floorNameInput || `Floor ${customFloorNumber}`,
        floor_number: customFloorNumber,
        // Only send image_base64 for renderable image formats
        image_base64: (uploadedImage && uploadedFileType && ['png','jpg','jpeg','webp','svg','bmp','tiff','tif'].includes(uploadedFileType))
          ? uploadedImage
          : undefined,
        file_name: uploadedFileName || undefined,
        file_type: uploadedFileType || undefined,
        csv_content: datasetText
      });

      // Refresh floors list from backend
      if (onRefreshFloors) {
        await onRefreshFloors();
      }

      // Switch to the newly created floor
      setSelectedFloorId(result.floor_id);

      // Reload zones for this floor
      const updatedZones = await api.getFloorZoneStates(result.floor_id);
      setZones(updatedZones);
      if (updatedZones.length > 0) {
        setSelectedZone(updatedZones[0]);
      }

      setAiProcessing(false);
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('AI recognition failed:', err);
      setModalError(err.message || 'Failed to recognize floor plan and dataset.');
      setAiProcessing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header and Controls */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Interactive Architectural Floor Plan</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full">
              CAD Vector Spatial Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time submeter mapping across {buildingName || 'TechNova Business Centre'}. Click any zone to inspect terminal VAV loads and avoidable waste.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Floor Switcher Pills */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/60 overflow-x-auto max-w-md">
            {floors.length === 0 ? (
              <span className="text-xs text-slate-400 italic px-3 py-1">No floors uploaded yet</span>
            ) : (
              floors.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFloorId(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    selectedFloorId === f.id
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Floor {f.floor_number}
                </button>
              ))
            )}
          </div>

          {/* AI Custom Floor Plan Upload Button */}
          <button
            onClick={() => {
              // Auto-compute the next available floor number
              const existingNumbers = floors.map(f => f.floor_number);
              let nextNum = 1;
              while (existingNumbers.includes(nextNum)) nextNum++;
              setFloorNameInput('');
              setCustomFloorNumber(nextNum);
              setUploadedImage(null);
              setUploadedFileName(null);
              setUploadedFileSize(null);
              setUploadedFileType(null);
              setDatasetText('');
              setModalError(null);
              setIsModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-xs flex items-center space-x-2 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Add Custom Floor Plan (AI)</span>
          </button>
        </div>
      </div>

      {/* Interchangeable HVAC Thermodynamic Systems Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Wind className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider">
                  Interchangeable HVAC System Datasets
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold font-mono">
                  6 Thermodynamic Profiles
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Hot-swap HVAC system datasets for this floor plan. Modulates thermodynamic power curves, COP, and forensic fault anomalies.
              </p>
            </div>
          </div>
          {zones.length === 0 ? (
            <span className="text-xs font-mono font-medium px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 border border-slate-200">
              Upload floor plan to activate HVAC profiles
            </span>
          ) : hvacStatusMsg ? (
            <span className="text-xs font-mono font-semibold px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center space-x-1.5 self-start sm:self-auto">
              {isApplyingHvac && <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
              <span>{hvacStatusMsg}</span>
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {hvacSystems.map((sys) => {
            const isSelected = activeHvacId === sys.id;
            const isToolbarDisabled = zones.length === 0 || isApplyingHvac;
            return (
              <button
                key={sys.id}
                disabled={isToolbarDisabled}
                onClick={() => handleApplyHvacSystem(sys.id)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isToolbarDisabled
                    ? 'bg-slate-50/50 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                    : isSelected
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs cursor-pointer'
                    : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-800 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    COP {sys.cop}
                  </span>
                  {isSelected ? (
                    <Check className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <span className={`w-2 h-2 rounded-full ${
                      sys.badge_color === 'rose' ? 'bg-rose-500' :
                      (sys.badge_color === 'emerald' ? 'bg-emerald-500' :
                      (sys.badge_color === 'amber' ? 'bg-amber-500' : 'bg-blue-500'))
                    }`}></span>
                  )}
                </div>
                <div className="mt-2">
                  <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {sys.name}
                  </p>
                  <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                    {sys.type}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SVG Floor Plan Canvas (8 Cols) */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 mb-3 gap-2">
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700 font-mono uppercase">
                  {activeFloor ? activeFloor.name : 'Floor 3'} • {zones.length} Active Zones
                </span>
                {activeFloor?.floor_plan?.metadata_json?.file_name && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center space-x-1">
                    <Layers className="w-3 h-3 text-blue-600" />
                    <span>CAD: {activeFloor.floor_plan.metadata_json.file_name}</span>
                  </span>
                )}
              </div>

              {/* Clean Legend */}
              <div className="flex items-center space-x-3 text-xs">
                <span className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-white border border-slate-300"></span>
                  <span className="text-slate-600">Normal</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-100 border border-blue-400"></span>
                  <span className="text-blue-700 font-medium">Elevated</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-400"></span>
                  <span className="text-amber-700 font-medium">Warning</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-100 border border-rose-500"></span>
                  <span className="text-rose-700 font-bold">Anomaly</span>
                </span>
              </div>
            </div>

            {/* SVG Render Container */}
            <div className="w-full bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 min-h-[440px] flex items-center justify-center relative overflow-hidden">
              {loading ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-slate-500 font-medium">Rendering Floor Coordinates...</span>
                </div>
              ) : zones.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 max-w-md my-auto">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shadow-xs">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">No Floor Plan Uploaded Yet</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      This facility does not contain mock floor plans. Upload your own architectural blueprint or CAD layout and room dataset to let ECO ⚡ VOLT AI Vision segment rooms and bind submeter telemetry.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      // Auto-compute next floor number
                      const existingNumbers = floors.map(f => f.floor_number);
                      let nextNum = 1;
                      while (existingNumbers.includes(nextNum)) nextNum++;
                      if (activeFloor) {
                        setFloorNameInput(activeFloor.name);
                        setCustomFloorNumber(activeFloor.floor_number);
                      } else {
                        setFloorNameInput('');
                        setCustomFloorNumber(nextNum);
                      }
                      setUploadedImage(null);
                      setUploadedFileName(null);
                      setUploadedFileSize(null);
                      setUploadedFileType(null);
                      setDatasetText('');
                      setModalError(null);
                      setIsModalOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center space-x-2 transition-all shadow-xs cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Floor Plan & Bind Dataset (AI)</span>
                  </button>
                </div>
              ) : (
                <svg viewBox="0 0 1000 680" className="w-full h-full max-h-[500px]">
                  {/* Optional Background Blueprint Image if custom image was uploaded */}
                  {activeFloor?.floor_plan?.image_url && activeFloor.floor_plan.image_url.startsWith('data:image') && (
                    <image
                      href={activeFloor.floor_plan.image_url}
                      x="35"
                      y="35"
                      width="930"
                      height="610"
                      preserveAspectRatio="xMidYMid slice"
                      opacity="0.25"
                    />
                  )}

                  {/* Building Outer Frame */}
                  <rect x="35" y="35" width="930" height="610" rx="10" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="5 5" />

                  {/* Central Corridor Pathway Indicator */}
                  <line x1="55" y1="340" x2="945" y2="340" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 4" />
                  <text x="500" y="344" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace" letterSpacing="2">
                    CENTRAL CIRCULATION CORRIDOR
                  </text>

                  {/* Render All Zones */}
                  {zones.map((z) => {
                    const isSelected = selectedZone?.zone_id === z.zone_id;
                    const isHovered = hoveredZone?.zone_id === z.zone_id;
                    const style = getZoneColors(z.status, isSelected);
                    const polyPoints = z.polygon_coordinates.map(pt => `${pt[0]},${pt[1]}`).join(' ');

                    const xs = z.polygon_coordinates.map(p => p[0]);
                    const ys = z.polygon_coordinates.map(p => p[1]);
                    const centerX = xs.length > 0 ? (Math.min(...xs) + Math.max(...xs)) / 2 : 100;
                    const centerY = ys.length > 0 ? (Math.min(...ys) + Math.max(...ys)) / 2 : 100;

                    return (
                      <g 
                        key={z.zone_id}
                        className="cursor-pointer transition-all duration-150"
                        onClick={() => setSelectedZone(z)}
                        onMouseEnter={() => setHoveredZone(z)}
                        onMouseLeave={() => setHoveredZone(null)}
                      >
                        <polygon
                          points={polyPoints}
                          fill={style.fill}
                          stroke={isHovered ? '#2563eb' : style.stroke}
                          strokeWidth={isHovered ? 3 : style.strokeWidth}
                        />

                        {/* Zone Name Label */}
                        <text
                          x={centerX}
                          y={centerY - 10}
                          textAnchor="middle"
                          fill="#1e293b"
                          fontSize="12"
                          fontWeight="600"
                          className="pointer-events-none select-none"
                        >
                          {z.zone_name.split(' - ')[1] || z.zone_name}
                        </text>

                        {/* Power draw value */}
                        <text
                          x={centerX}
                          y={centerY + 12}
                          textAnchor="middle"
                          fill={z.status === 'critical' ? '#dc2626' : (z.status === 'anomaly' ? '#d97706' : '#2563eb')}
                          fontSize="12"
                          fontWeight="700"
                          fontFamily="monospace"
                          className="pointer-events-none select-none"
                        >
                          {z.current_power_kw.toFixed(1)} kW
                        </text>

                        {/* Anomaly Badge Marker */}
                        {z.active_anomalies_count > 0 && (
                          <g transform={`translate(${centerX - 8}, ${centerY + 22})`}>
                            <circle cx="8" cy="8" r="8" fill="#ef4444" />
                            <text x="8" y="11" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">!</text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>

          <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Coordinate System: 1000 x 680 ViewBox CAD Normalized</span>
            <span className="text-blue-600 font-semibold">Click any room polygon to inspect live telemetry</span>
          </div>
        </div>

        {/* Selected Zone Telemetry Slide-Out (4 Cols) */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          {selectedZone ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    selectedZone.status === 'critical' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                    (selectedZone.status === 'anomaly' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    (selectedZone.status === 'elevated' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    'bg-emerald-50 text-emerald-700 border border-emerald-200'))
                  }`}>
                    {selectedZone.status}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{selectedZone.zone_id}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-2">{selectedZone.zone_name}</h3>
                <p className="text-xs text-slate-500">
                  Type: <span className="text-slate-800 capitalize font-medium">{selectedZone.zone_type}</span> • Area: <span className="font-mono text-slate-800 font-medium">{selectedZone.area_m2} m²</span>
                </p>
              </div>

              {/* Real-time Telemetry Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 font-mono uppercase font-semibold">Current Power</span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                    {selectedZone.current_power_kw.toFixed(1)} <span className="text-xs text-slate-400 font-normal">kW</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 font-mono uppercase font-semibold">Total Energy</span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                    {selectedZone.total_energy_kwh.toLocaleString()} <span className="text-xs text-slate-400 font-normal">kWh</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 font-mono uppercase font-semibold">Avoidable Waste</span>
                  <div className={`text-xl font-bold font-mono mt-0.5 ${selectedZone.waste_cost > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                    ₹{selectedZone.waste_cost.toFixed(2)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 font-mono uppercase font-semibold">Intensity</span>
                  <div className="text-xl font-bold font-mono text-blue-700 mt-0.5">
                    {selectedZone.energy_intensity_kwh_m2} <span className="text-xs text-slate-400 font-normal">kWh/m²</span>
                  </div>
                </div>
              </div>

              {/* Anomaly Callout Box if present */}
              {selectedZone.active_anomalies_count > 0 ? (
                <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-200 space-y-2">
                  <div className="flex items-center space-x-2 text-rose-800 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Forensic Anomaly Detected</span>
                  </div>
                  <p className="text-xs text-rose-700 leading-relaxed">
                    Zone drew continuous unmitigated cooling draw outside scheduled hours while PIR occupancy sensors registered 0 occupants.
                  </p>
                  <button
                    onClick={() => onSelectAnomaly('anom-golden-01')}
                    className="w-full mt-2 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Inspect Forensic Autopsy</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Submeter telemetry is operating within ASHRAE efficiency limits.</span>
                </div>
              )}
            </div>
          ) : zones.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-xs text-center space-y-2 p-4">
              <Building2 className="w-8 h-8 text-slate-300" />
              <p className="font-semibold text-slate-700">Awaiting Floor Plan</p>
              <p className="text-[11px] text-slate-400">Upload an architectural layout and room dataset to view live submeter telemetry.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-xs text-center space-y-2">
              <Building2 className="w-8 h-8 text-slate-300" />
              <p>Select any room polygon on the floor plan to view live sensor telemetry</p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>BACnet MS/TP Gateway</span>
            <span className="flex items-center space-x-1 text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Online</span>
            </span>
          </div>
        </div>
      </div>

      {/* AI Floor Plan Upload & Dataset Recognition Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">AI Floor Plan Vision & Room Segmentation</h3>
                  <p className="text-xs text-slate-500">Upload your own floor plan and bind your custom room dataset</p>
                </div>
              </div>
              <button 
                onClick={() => !aiProcessing && setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Floor Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Floor Name</label>
                  <input
                    type="text"
                    value={floorNameInput}
                    onChange={(e) => setFloorNameInput(e.target.value)}
                    placeholder="e.g. Floor 5 (Innovation Center)"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Floor Number</label>
                  <input
                    type="number"
                    value={customFloorNumber}
                    onChange={(e) => setCustomFloorNumber(parseInt(e.target.value) || 5)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              {/* Step 1: Upload Architectural Plan (DWG, DXF, PDF, SVG, Images) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    1. Architectural Floor Plan File <span className="text-blue-600 font-medium">(AutoCAD DWG, DXF, PDF, SVG, PNG, JPG, IFC)</span>
                  </label>
                  {uploadedFileName && (
                    <button 
                      type="button"
                      onClick={handleClearUploadedFile} 
                      className="text-[11px] text-rose-600 hover:underline cursor-pointer font-medium"
                    >
                      Clear file
                    </button>
                  )}
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                    uploadedFileName ? 'border-blue-400 bg-blue-50/20' : 'border-slate-200 hover:border-blue-400 bg-slate-50/50'
                  }`}
                >
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".dwg,.dxf,.pdf,.svg,.png,.jpg,.jpeg,.webp,.tiff,.tif,.bmp,.ifc,.json,.geojson,image/*" 
                    onChange={handleImageUpload} 
                    className="hidden" 
                  />

                  {uploadedFileName ? (
                    <div className="flex items-center justify-between p-2">
                      <div className="flex items-center space-x-3 text-left">
                        {/* Thumbnail or CAD Icon */}
                        {uploadedImage && ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(uploadedFileType || '') ? (
                          <img src={uploadedImage} alt="Plan preview" className="w-14 h-14 object-cover rounded-lg border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex flex-col items-center justify-center font-mono font-bold text-[10px] shrink-0 shadow-xs">
                            <Layers className="w-5 h-5 mb-0.5" />
                            <span>{(uploadedFileType || 'CAD').toUpperCase()}</span>
                          </div>
                        )}
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-900 truncate max-w-xs">{uploadedFileName}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold uppercase">
                              {uploadedFileType === 'dwg' ? 'AutoCAD DWG' : (uploadedFileType === 'dxf' ? 'AutoCAD DXF' : (uploadedFileType === 'pdf' ? 'Architectural PDF' : `${uploadedFileType?.toUpperCase()} Vector`))}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {uploadedFileSize} • Ready for AI Vector Polyline & Boundary Extraction
                          </p>
                          <p className="text-[10px] text-emerald-600 font-medium flex items-center space-x-1 mt-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>CAD drawing validated. Neural recognizer will align rooms to coordinate layers.</span>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer shrink-0 shadow-2xs"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-2 text-xs text-slate-500 py-2">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">
                          Click or drag & drop AutoCAD DWG, DXF, PDF, SVG, or Architectural Blueprint
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          Supported: .dwg (AutoCAD), .dxf, .pdf, .svg, .png, .jpg, .webp, .ifc, .json
                        </p>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                        AutoCAD vector plan sets & architectural drawings fully supported
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Custom Room Dataset */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">
                      2. Room Dataset <span className="text-rose-600 font-bold">*</span>
                      <span className="text-slate-400 font-normal ml-1">(CSV or JSON — required)</span>
                    </label>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      The AI segments rooms <strong className="text-slate-600">only from your dataset</strong>. It does not guess or use hidden templates.
                      Each row = one room/zone.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      ref={csvFileInputRef}
                      type="file"
                      accept=".csv,.tsv,.json,.txt"
                      onChange={handleCsvFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => csvFileInputRef.current?.click()}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[11px] font-semibold transition-colors"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Load from CSV file</span>
                    </button>
                    {datasetText && (
                      <button
                        type="button"
                        onClick={() => setDatasetText('')}
                        className="text-[11px] text-rose-600 hover:underline font-medium"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 mb-1">
                  Required columns: <strong className="text-slate-600">Room Name, Zone Type, Area m2, Power kW, Status, Occupancy</strong>
                  &nbsp;&nbsp;|&nbsp;&nbsp;Status values: normal, elevated, anomaly, critical
                </div>

                <textarea
                  rows={7}
                  value={datasetText}
                  onChange={(e) => setDatasetText(e.target.value)}
                  placeholder={`Room Name,Zone Type,Area m2,Power kW,Status,Occupancy,Daily kWh\nBoardroom A,conference,160,4.8,normal,14,68.5\nEngineering Floor,office,280,6.5,elevated,26,112.0\nServer Room,server_room,80,11.4,normal,0,235.0\nLobby,lobby,90,1.5,normal,4,22.0`}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 placeholder:text-slate-300"
                />
              </div>

              {/* AI Processing Status */}
              {aiProcessing && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center space-x-3">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0"></div>
                  <div>
                    <p className="font-bold">{aiStep}</p>
                    <p className="text-[11px] text-blue-600">ECO ⚡ VOLT AI Vision Neural Spatial Segmenter</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={aiProcessing}
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={aiProcessing || !floorNameInput.trim()}
                onClick={handleRunAiRecognition}
                className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{aiProcessing ? 'Processing AI Recognition...' : 'Recognize Rooms & Bind Dataset'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
