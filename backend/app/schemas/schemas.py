from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

# ==================== Common / Base ====================
class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# ==================== Building ====================
class BuildingBase(BaseSchema):
    name: str
    address: Optional[str] = None
    building_type: str = "Commercial Office"
    gross_floor_area_m2: float = 1000.0
    primary_use: str = "Commercial"
    timezone: str = "Asia/Kolkata"
    currency: str = "INR"
    default_tariff_rate: float = 9.50
    carbon_factor: float = 0.82

class BuildingCreate(BuildingBase):
    organization_id: Optional[str] = None
    number_of_floors: Optional[int] = 4
    metadata_json: Optional[Dict[str, Any]] = None

class BuildingResponse(BuildingBase):
    id: str
    organization_id: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime

# ==================== Floor & FloorPlan ====================
class FloorBase(BaseSchema):
    floor_number: int
    name: str
    area_m2: float
    sort_order: int = 0

class FloorCreate(FloorBase):
    pass

class FloorPlanResponse(BaseSchema):
    id: str
    floor_id: str
    image_url: Optional[str] = None
    width: float
    height: float
    status: str
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime

class FloorResponse(FloorBase):
    id: str
    building_id: str
    floor_plan: Optional[FloorPlanResponse] = None
    created_at: datetime

# ==================== Zone ====================
class ZoneBase(BaseSchema):
    name: str
    zone_type: str = "office"
    area_m2: float = 50.0
    capacity: int = 10
    polygon_coordinates: List[List[float]] = []
    detection_source: str = "synthetic"
    detection_confidence: float = 1.0
    target_energy_intensity_kwh_m2: float = 120.0

class ZoneCreate(ZoneBase):
    floor_id: str
    metadata_json: Optional[Dict[str, Any]] = None

class ZoneUpdate(BaseSchema):
    name: Optional[str] = None
    zone_type: Optional[str] = None
    area_m2: Optional[float] = None
    capacity: Optional[int] = None
    polygon_coordinates: Optional[List[List[float]]] = None

class ZoneResponse(ZoneBase):
    id: str
    floor_id: str
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime

class ZoneEnergyState(BaseSchema):
    zone_id: str
    zone_name: str
    zone_type: str
    floor_id: str
    floor_name: str
    area_m2: float
    polygon_coordinates: List[List[float]]
    current_power_kw: float
    total_energy_kwh: float
    expected_energy_kwh: float
    energy_intensity_kwh_m2: float
    status: str  # normal, elevated, anomaly, critical
    active_anomalies_count: int
    waste_kwh: float
    waste_cost: float

# ==================== Meter & Equipment ====================
class MeterBase(BaseSchema):
    meter_number: str
    meter_type: str = "submeter"
    unit: str = "kWh"
    location_description: Optional[str] = None
    is_active: bool = True

class MeterCreate(MeterBase):
    building_id: str
    zone_id: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None

class MeterResponse(MeterBase):
    id: str
    building_id: str
    zone_id: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime

class EquipmentBase(BaseSchema):
    name: str
    equipment_type: str
    rated_power_kw: float = 5.0
    status: str = "operational"

class EquipmentCreate(EquipmentBase):
    building_id: str
    zone_id: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None

class EquipmentResponse(EquipmentBase):
    id: str
    building_id: str
    zone_id: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime

# ==================== Schedules & Tariffs ====================
class OperatingScheduleBase(BaseSchema):
    name: str
    schedule_type: str = "standard"
    days_of_week: List[int] = [0, 1, 2, 3, 4]
    start_time: str = "08:00"
    end_time: str = "18:00"
    hvac_setpoint_occupied: float = 22.0
    hvac_setpoint_unoccupied: float = 26.0
    is_active: bool = True

class OperatingScheduleCreate(OperatingScheduleBase):
    building_id: str
    zone_id: Optional[str] = None

class OperatingScheduleResponse(OperatingScheduleBase):
    id: str
    building_id: str
    zone_id: Optional[str] = None
    created_at: datetime

class TariffResponse(BaseSchema):
    id: str
    building_id: str
    name: str
    tariff_type: str
    rate_per_kwh: float
    peak_rate_per_kwh: float
    off_peak_rate_per_kwh: float
    peak_hours_start: str
    peak_hours_end: str
    currency: str

# ==================== Energy, Occupancy, Weather ====================
class EnergyReadingItem(BaseSchema):
    timestamp: datetime
    energy_kwh: float
    power_kw: float
    zone_id: Optional[str] = None
    meter_id: Optional[str] = None
    quality_status: str = "good"

class EnergyImportRequest(BaseSchema):
    readings: List[EnergyReadingItem]

class EnergyImportResponse(BaseSchema):
    total_received: int
    rows_accepted: int
    rows_rejected: int
    duplicate_rows: int
    invalid_rows: int
    warnings: List[str] = []

class EnergyTimeseriesPoint(BaseSchema):
    timestamp: datetime
    actual_kwh: float
    expected_kwh: float
    power_kw: float
    is_after_hours: bool
    is_weekend: bool
    is_anomaly: bool = False

class EnergySummaryResponse(BaseSchema):
    building_id: str
    period_start: datetime
    period_end: datetime
    total_consumption_kwh: float
    expected_consumption_kwh: float
    total_excess_kwh: float
    energy_intensity_kwh_m2: float
    peak_demand_kw: float
    peak_demand_timestamp: Optional[datetime] = None
    after_hours_consumption_kwh: float
    after_hours_percentage: float
    weekend_consumption_kwh: float
    estimated_total_cost: float
    estimated_excess_cost: float
    estimated_carbon_kg: float
    currency: str = "USD"

# ==================== Anomaly, Evidence, Autopsy ====================
class AnomalyResponse(BaseSchema):
    id: str
    building_id: str
    floor_id: Optional[str] = None
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    floor_name: Optional[str] = None
    meter_id: Optional[str] = None
    equipment_id: Optional[str] = None
    anomaly_type: str
    severity: str
    status: str
    start_time: datetime
    end_time: datetime
    actual_kwh: float
    expected_kwh: float
    excess_kwh: float
    estimated_cost: float
    estimated_co2_kg: float
    confidence_score: float
    priority_score: float
    title: str
    description: str
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None
    created_at: datetime

class EvidenceItemResponse(BaseSchema):
    id: str
    evidence_type: str
    metric_name: str
    actual_value: float
    expected_value: float
    unit: str
    confidence: float
    narrative: str
    supporting_data: Optional[Dict[str, Any]] = None

class EvidenceCardResponse(BaseSchema):
    anomaly_id: str
    title: str
    severity: str
    what_happened: str
    where: str
    when: str
    how_much_kwh: float
    how_much_cost: float
    how_much_co2_kg: float
    why_flagged: str
    context_considered: Dict[str, Any]
    confidence_score: float
    evidence_list: List[EvidenceItemResponse]
    limitations: Optional[str] = None

class AutopsyEventResponse(BaseSchema):
    id: str
    step_order: int
    timestamp: datetime
    event_type: str
    title: str
    description: str
    metric_name: Optional[str] = None
    value: Optional[float] = None
    expected_value: Optional[float] = None
    evidence_reference: Optional[str] = None

class AutopsyTimelineResponse(BaseSchema):
    anomaly_id: str
    title: str
    zone_name: Optional[str] = None
    timeline: List[AutopsyEventResponse]
    primary_cause: str
    total_waste_kwh: float
    total_waste_cost: float
    recommended_action: str

# ==================== Investigation ====================
class InvestigationResponse(BaseSchema):
    id: str
    anomaly_id: str
    primary_cause: str
    contributing_factors: List[str]
    supporting_evidence_summary: str
    operational_context: Optional[str] = None
    model_rule_used: str
    confidence_score: float
    limitations: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime

class WhyNotFlaggedResponse(BaseSchema):
    event_id: str
    building_id: str
    timestamp: datetime
    actual_kwh: float
    expected_baseline_kwh: float
    is_waste: bool = False
    primary_reason: str
    contextual_factors: Dict[str, Any]
    confidence_score: float
    explanation: str

# ==================== Recommendations & Simulation ====================
class RecommendationResponse(BaseSchema):
    id: str
    building_id: str
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    anomaly_id: Optional[str] = None
    title: str
    description: str
    category: str
    action_steps: List[str]
    estimated_annual_kwh_savings: float
    estimated_annual_cost_savings: float
    estimated_annual_co2_reduction_kg: float
    implementation_cost: float
    payback_period_months: float
    roi_percentage: float
    confidence: float
    status: str
    created_at: datetime

class SimulationRequest(BaseSchema):
    building_id: str
    scenario_type: str  # hvac_runtime_reduction, setpoint_adjustment, lighting_runtime_reduction, equipment_replacement
    reduction_hours_per_day: Optional[float] = 2.0
    setpoint_change_degrees: Optional[float] = 1.5
    equipment_efficiency_improvement_pct: Optional[float] = 25.0
    schedule_compliance_pct: Optional[float] = 95.0
    zones_affected: Optional[List[str]] = None

class SimulationResponse(BaseSchema):
    scenario_name: str
    scenario_type: str
    baseline_annual_kwh: float
    projected_annual_kwh: float
    annual_kwh_savings: float
    annual_cost_savings: float
    annual_co2_savings_kg: float
    percent_reduction: float
    monthly_breakdown: List[Dict[str, Any]]
    assumptions: Dict[str, Any]
    confidence: float

class CounterfactualRequest(BaseSchema):
    building_id: str
    anomaly_id: str

class CounterfactualResponse(BaseSchema):
    anomaly_id: str
    anomaly_title: str
    time_window_start: datetime
    time_window_end: datetime
    actual_energy_kwh: float
    counterfactual_baseline_kwh: float
    avoidable_waste_kwh: float
    avoidable_cost: float
    avoidable_co2_kg: float
    confidence: float
    assumptions: List[str]

# ==================== Opportunity Map & Interventions ====================
class OpportunityItem(BaseSchema):
    id: str
    zone_id: str
    zone_name: str
    floor_id: str
    floor_name: str
    polygon_coordinates: List[List[float]]
    opportunity_type: str
    title: str
    estimated_annual_savings_kwh: float
    estimated_annual_savings_cost: float
    estimated_co2_reduction_kg: float
    implementation_effort: str  # low, medium, high
    severity: str
    confidence: float
    recommendation_id: Optional[str] = None

class InterventionCreate(BaseSchema):
    building_id: str
    zone_id: Optional[str] = None
    recommendation_id: Optional[str] = None
    title: str
    planned_action: str
    implementation_date: datetime
    estimated_annual_savings_kwh: float = 0.0
    estimated_annual_savings_cost: float = 0.0
    notes: Optional[str] = None

class InterventionUpdate(BaseSchema):
    status: Optional[str] = None
    completion_date: Optional[datetime] = None
    notes: Optional[str] = None

class InterventionResponse(BaseSchema):
    id: str
    building_id: str
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    recommendation_id: Optional[str] = None
    title: str
    planned_action: str
    implementation_date: datetime
    completion_date: Optional[datetime] = None
    status: str
    estimated_annual_savings_kwh: float
    estimated_annual_savings_cost: float
    notes: Optional[str] = None
    created_at: datetime

# ==================== Verification ====================
class VerificationRequest(BaseSchema):
    intervention_id: str
    baseline_days: int = 14
    post_days: int = 14

class VerificationResponse(BaseSchema):
    id: str
    intervention_id: str
    intervention_title: str
    baseline_period_start: datetime
    baseline_period_end: datetime
    post_period_start: datetime
    post_period_end: datetime
    baseline_kwh: float
    post_kwh: float
    weather_normalized_baseline_kwh: float
    measured_kwh_savings: float
    measured_cost_savings: float
    measured_co2_savings_kg: float
    percent_improvement: float
    confidence_score: float
    is_statistically_significant: bool
    methodology: str
    daily_comparison: List[Dict[str, Any]]
    limitations: Optional[str] = None

# ==================== AI Detective ====================
class AIDetectiveRequest(BaseSchema):
    building_id: str
    query: str
    zone_id: Optional[str] = None
    anomaly_id: Optional[str] = None

class AIDetectiveResponse(BaseSchema):
    query: str
    answer: str
    supporting_evidence: List[str]
    relevant_metrics: Dict[str, Any]
    source_entity_ids: List[str]
    confidence_score: float
    engine_used: str  # "llm_grounded" or "deterministic_forensics_fallback"
    suggested_follow_ups: List[str]

# ==================== Health Score & Peak Demand & Data Quality ====================
class HealthScoreComponent(BaseSchema):
    name: str
    score: float  # 0 to 100
    weight: float
    status: str
    explanation: str

class HealthScoreResponse(BaseSchema):
    building_id: str
    overall_score: float  # 0 to 100
    grade: str  # A, B, C, D, F
    components: List[HealthScoreComponent]
    data_limitations: List[str]

class PeakDemandResponse(BaseSchema):
    building_id: str
    peak_power_kw: float
    peak_timestamp: datetime
    average_power_kw: float
    load_factor: float
    peak_cost_penalty: float
    contributing_zones: List[Dict[str, Any]]
    contributing_equipment: List[Dict[str, Any]]
    reduction_opportunities: List[str]

class DataQualityResponse(BaseSchema):
    building_id: str
    total_readings: int
    completeness_pct: float
    missing_intervals_count: int
    suspect_readings_count: int
    duplicate_records_count: int
    sensor_health_status: str  # excellent, good, degraded, critical
    sensor_diagnostics: List[Dict[str, Any]]

# ==================== Evaluation ====================
class EvaluationMetricsResponse(BaseSchema):
    total_ground_truth_scenarios: int
    detected_anomalies: int
    true_positives: int
    false_positives: int
    false_negatives: int
    precision: float
    recall: float
    f1_score: float
    weather_distinction_accuracy: float
    scenario_evaluations: List[Dict[str, Any]]

# ==================== Report ====================
class AuditReportResponse(BaseSchema):
    building_id: str
    building_name: str
    audit_date: datetime
    executive_summary: str
    energy_intensity_kwh_m2: float
    total_annual_waste_kwh: float
    total_annual_waste_cost: float
    health_score: float
    top_anomalies: List[Dict[str, Any]]
    top_recommendations: List[Dict[str, Any]]
    verified_interventions: List[Dict[str, Any]]
    data_quality_summary: str
    confidence_assessment: str
