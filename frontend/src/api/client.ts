export const API_BASE = "http://localhost:8000/api/v1";

export interface Building {
  id: string;
  name: string;
  address?: string;
  building_type: string;
  gross_floor_area_m2: number;
  primary_use: string;
  timezone: string;
  currency: string;
  default_tariff_rate: number;
  carbon_factor: number;
  metadata_json?: any;
}

export interface Floor {
  id: string;
  building_id: string;
  floor_number: number;
  name: string;
  area_m2: number;
  sort_order: number;
  floor_plan?: {
    id?: string;
    image_url?: string;
    width?: number;
    height?: number;
    status?: string;
    metadata_json?: any;
  };
}

export interface ZoneState {
  zone_id: string;
  zone_name: string;
  zone_type: string;
  floor_id: string;
  floor_name: string;
  area_m2: number;
  polygon_coordinates: number[][];
  current_power_kw: number;
  total_energy_kwh: number;
  expected_energy_kwh: number;
  energy_intensity_kwh_m2: number;
  status: "normal" | "elevated" | "anomaly" | "critical";
  active_anomalies_count: number;
  waste_kwh: number;
  waste_cost: number;
}

export interface EnergySummary {
  building_id: string;
  period_start: string;
  period_end: string;
  total_consumption_kwh: number;
  expected_consumption_kwh: number;
  total_excess_kwh: number;
  energy_intensity_kwh_m2: number;
  peak_demand_kw: number;
  peak_demand_timestamp?: string;
  after_hours_consumption_kwh: number;
  after_hours_percentage: number;
  weekend_consumption_kwh: number;
  estimated_total_cost: number;
  estimated_excess_cost: number;
  estimated_carbon_kg: number;
  currency: string;
}

export interface TimeseriesPoint {
  timestamp: string;
  actual_kwh: number;
  expected_kwh: number;
  power_kw: number;
  is_after_hours: boolean;
  is_weekend: boolean;
  is_anomaly: boolean;
}

export interface HealthScore {
  building_id: string;
  overall_score: number;
  grade: string;
  components: Array<{
    name: string;
    score: number;
    weight: number;
    status: string;
    explanation: string;
  }>;
  data_limitations: string[];
}

export interface AnomalyItem {
  id: string;
  building_id: string;
  floor_id?: string;
  zone_id?: string;
  zone_name?: string;
  floor_name?: string;
  anomaly_type: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "acknowledged" | "resolved" | "dismissed";
  start_time: string;
  end_time: string;
  actual_kwh: number;
  expected_kwh: number;
  excess_kwh: number;
  estimated_cost: number;
  estimated_co2_kg: number;
  confidence_score: number;
  priority_score: number;
  title: string;
  description: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
}

export interface EvidenceCard {
  anomaly_id: string;
  title: string;
  severity: string;
  what_happened: string;
  where: string;
  when: string;
  how_much_kwh: number;
  how_much_cost: number;
  how_much_co2_kg: number;
  why_flagged: string;
  context_considered: Record<string, any>;
  confidence_score: number;
  evidence_list: Array<{
    id: string;
    evidence_type: string;
    metric_name: string;
    actual_value: number;
    expected_value: number;
    unit: string;
    confidence: number;
    narrative: string;
    supporting_data?: any;
  }>;
  limitations?: string;
}

export interface AutopsyTimeline {
  anomaly_id: string;
  title: string;
  zone_name?: string;
  timeline: Array<{
    id: string;
    step_order: number;
    timestamp: string;
    event_type: string;
    title: string;
    description: string;
    metric_name?: string;
    value?: number;
    expected_value?: number;
    evidence_reference?: string;
  }>;
  primary_cause: string;
  total_waste_kwh: number;
  total_waste_cost: number;
  recommended_action: string;
}

export interface RecommendationItem {
  id: string;
  building_id: string;
  zone_id?: string;
  zone_name?: string;
  title: string;
  description: string;
  category: string;
  action_steps: string[];
  estimated_annual_kwh_savings: number;
  estimated_annual_cost_savings: number;
  estimated_annual_co2_reduction_kg: number;
  implementation_cost: number;
  payback_period_months: number;
  roi_percentage: number;
  confidence: number;
  status: string;
}

export interface SimulationResult {
  scenario_name: string;
  scenario_type: string;
  baseline_annual_kwh: number;
  projected_annual_kwh: number;
  annual_kwh_savings: number;
  annual_cost_savings: number;
  annual_co2_savings_kg: number;
  percent_reduction: number;
  monthly_breakdown: Array<{
    month: string;
    baseline_kwh: number;
    projected_kwh: number;
    savings_kwh: number;
    cost_savings: number;
  }>;
  assumptions: Record<string, any>;
  confidence: number;
}

export interface InterventionItem {
  id: string;
  building_id: string;
  zone_id?: string;
  zone_name?: string;
  title: string;
  planned_action: string;
  implementation_date: string;
  completion_date?: string;
  status: "planned" | "in_progress" | "completed" | "cancelled";
  estimated_annual_savings_kwh: number;
  estimated_annual_savings_cost: number;
  notes?: string;
}

export interface VerificationData {
  id: string;
  intervention_id: string;
  intervention_title: string;
  baseline_period_start: string;
  baseline_period_end: string;
  post_period_start: string;
  post_period_end: string;
  baseline_kwh: number;
  post_kwh: number;
  weather_normalized_baseline_kwh: number;
  measured_kwh_savings: number;
  measured_cost_savings: number;
  measured_co2_savings_kg: number;
  percent_improvement: number;
  confidence_score: number;
  is_statistically_significant: boolean;
  methodology: string;
  daily_comparison: Array<{
    day_number: number;
    label: string;
    baseline_kwh: number;
    post_intervention_kwh: number;
    savings_kwh: number;
  }>;
  limitations?: string;
}

export interface AIDetectiveAnswer {
  query: string;
  answer: string;
  supporting_evidence: string[];
  relevant_metrics: Record<string, any>;
  source_entity_ids: string[];
  confidence_score: number;
  engine_used: string;
  suggested_follow_ups: string[];
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const AUTH_TOKEN_KEY = "nexyra_auth_token";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
  const headers = new Headers(init?.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      if (err.detail) msg = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
      else if (err.message) msg = err.message;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  async login(payload: { email: string; password: string }): Promise<AuthResponse> {
    const data = await fetchJson<AuthResponse>(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (data.access_token && typeof window !== "undefined") {
      localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
    }
    return data;
  },

  async register(payload: { email: string; password: string; full_name: string; role?: string }): Promise<AuthResponse> {
    const data = await fetchJson<AuthResponse>(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (data.access_token && typeof window !== "undefined") {
      localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
    }
    return data;
  },

  async getMe(): Promise<User> {
    return fetchJson<User>(`${API_BASE}/auth/me`);
  },

  async logout(): Promise<void> {
    try {
      await fetchJson(`${API_BASE}/auth/logout`, { method: "POST" });
    } catch {}
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  },

  async getBuildings(): Promise<Building[]> {
    return fetchJson<Building[]>(`${API_BASE}/buildings`);
  },
  
  async getBuilding(id: string): Promise<Building> {
    return fetchJson<Building>(`${API_BASE}/buildings/${id}`);
  },
  
  async getFloors(buildingId: string): Promise<Floor[]> {
    return fetchJson<Floor[]>(`${API_BASE}/buildings/${buildingId}/floors`);
  },
  
  async getFloorZoneStates(floorId: string): Promise<ZoneState[]> {
    return fetchJson<ZoneState[]>(`${API_BASE}/floors/${floorId}/zones/states`);
  },
  
  async getEnergySummary(buildingId: string): Promise<EnergySummary> {
    return fetchJson<EnergySummary>(`${API_BASE}/buildings/${buildingId}/energy/summary`);
  },
  
  async getEnergyTimeseries(buildingId: string, limit: number = 72): Promise<TimeseriesPoint[]> {
    return fetchJson<TimeseriesPoint[]>(`${API_BASE}/buildings/${buildingId}/energy?limit=${limit}`);
  },
  
  async getHealthScore(buildingId: string): Promise<HealthScore> {
    return fetchJson<HealthScore>(`${API_BASE}/buildings/${buildingId}/energy/health`);
  },
  
  async getAnomalies(buildingId: string): Promise<AnomalyItem[]> {
    return fetchJson<AnomalyItem[]>(`${API_BASE}/buildings/${buildingId}/anomalies`);
  },
  
  async getAnomalyEvidence(anomalyId: string): Promise<EvidenceCard> {
    return fetchJson<EvidenceCard>(`${API_BASE}/anomalies/${anomalyId}/evidence`);
  },
  
  async getAnomalyAutopsy(anomalyId: string): Promise<AutopsyTimeline> {
    return fetchJson<AutopsyTimeline>(`${API_BASE}/anomalies/${anomalyId}/autopsy`);
  },
  
  async getNonWasteExplanations(buildingId: string): Promise<any[]> {
    return fetchJson<any[]>(`${API_BASE}/buildings/${buildingId}/non-waste-explanations`);
  },
  
  async getRecommendations(buildingId: string): Promise<RecommendationItem[]> {
    return fetchJson<RecommendationItem[]>(`${API_BASE}/buildings/${buildingId}/recommendations`);
  },
  
  async runSimulation(payload: {
    building_id: string;
    scenario_type: string;
    reduction_hours_per_day?: number;
    setpoint_change_degrees?: number;
    equipment_efficiency_improvement_pct?: number;
    schedule_compliance_pct?: number;
  }): Promise<SimulationResult> {
    return fetchJson<SimulationResult>(`${API_BASE}/simulations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  },
  
  async getInterventions(buildingId: string): Promise<InterventionItem[]> {
    return fetchJson<InterventionItem[]>(`${API_BASE}/buildings/${buildingId}/interventions`);
  },
  
  async verifyIntervention(interventionId: string): Promise<VerificationData> {
    return fetchJson<VerificationData>(`${API_BASE}/interventions/${interventionId}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
  },
  
  async askAIDetective(buildingId: string, query: string): Promise<AIDetectiveAnswer> {
    return fetchJson<AIDetectiveAnswer>(`${API_BASE}/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ building_id: buildingId, query })
    });
  },
  
  async getEvaluation(buildingId: string): Promise<any> {
    return fetchJson<any>(`${API_BASE}/buildings/${buildingId}/evaluation`);
  },
  
  async getAuditReport(buildingId: string): Promise<any> {
    return fetchJson<any>(`${API_BASE}/buildings/${buildingId}/report`);
  },

  async recognizeFloorPlan(payload: {
    building_id?: string;
    floor_name?: string;
    floor_number?: number;
    image_base64?: string;
    file_name?: string;
    file_type?: string;
    rooms_dataset?: any[];
    csv_content?: string;
  }): Promise<{
    floor_id: string;
    floor_name: string;
    floor_number: number;
    building_id: string;
    image_url: string;
    total_area_m2: number;
    recognized_rooms_count: number;
    rooms: any[];
    recognition_confidence: number;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/floors/recognize-rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Floor plan recognition failed" }));
      throw new Error(err.detail || "Floor plan recognition failed");
    }
    return res.json();
  },

  async createBuilding(payload: {
    name: string;
    building_type?: string;
    gross_floor_area_m2?: number;
    primary_use?: string;
    address?: string;
    timezone?: string;
    currency?: string;
    default_tariff_rate?: number;
    carbon_factor?: number;
    number_of_floors?: number;
  }): Promise<Building> {
    const res = await fetch(`${API_BASE}/buildings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to create facility" }));
      throw new Error(err.detail || "Failed to create facility");
    }
    return res.json();
  },

  async getHVACSystems(buildingId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/buildings/${buildingId}/hvac-systems`);
    return res.json();
  },

  async applyHVACSystem(buildingId: string, systemType: string, floorId?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/buildings/${buildingId}/hvac-system`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system_type: systemType, floor_id: floorId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to apply HVAC dataset" }));
      throw new Error(err.detail || "Failed to apply HVAC dataset");
    }
    return res.json();
  },

  async deleteBuilding(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/buildings/${id}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to delete facility" }));
      throw new Error(err.detail || "Failed to delete facility");
    }
    return res.json();
  },

  // Real-world Benchmark Datasets (BDG2, ASHRAE, LBNL)
  async getDatasetCatalogs(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/datasets/catalogs`);
    return res.json();
  },

  async getBDG2Buildings(primaryUse?: string, siteId?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (primaryUse) params.append("primary_use", primaryUse);
    if (siteId) params.append("site_id", siteId);
    const res = await fetch(`${API_BASE}/datasets/bdg2/buildings?${params.toString()}`);
    return res.json();
  },

  async getBDG2BuildingTelemetry(buildingId: string, hours: number = 168): Promise<any> {
    const res = await fetch(`${API_BASE}/datasets/bdg2/buildings/${buildingId}/telemetry?hours=${hours}`);
    return res.json();
  },

  async applyBDG2Dataset(facilityId: string, bdg2BuildingId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/datasets/bdg2/apply-to-facility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facility_id: facilityId, bdg2_building_id: bdg2BuildingId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to apply BDG2 dataset" }));
      throw new Error(err.detail || "Failed to apply BDG2 dataset");
    }
    return res.json();
  },

  async getStandardRoomDatasets(presetId?: string): Promise<any> {
    const url = presetId 
      ? `${API_BASE}/datasets/presets/room-dataset?preset_id=${presetId}`
      : `${API_BASE}/datasets/presets/room-dataset`;
    const res = await fetch(url);
    return res.json();
  }
};
