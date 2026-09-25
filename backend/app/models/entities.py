import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, 
    Text, JSON, UniqueConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    buildings = relationship("Building", back_populates="organization", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="auditor")  # admin, auditor, facility_manager, viewer
    created_at = Column(DateTime, default=datetime.utcnow)


class Building(Base):
    __tablename__ = "buildings"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    address = Column(String(255), nullable=True)
    building_type = Column(String(100), default="Commercial Office")
    gross_floor_area_m2 = Column(Float, nullable=False, default=1000.0)
    primary_use = Column(String(100), default="Office")
    timezone = Column(String(50), default="America/New_York")
    currency = Column(String(10), default="USD")
    default_tariff_rate = Column(Float, default=0.14)  # $/kWh
    carbon_factor = Column(Float, default=0.385)  # kg CO2/kWh
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    organization = relationship("Organization", back_populates="buildings")
    floors = relationship("Floor", back_populates="building", cascade="all, delete-orphan", order_by="Floor.floor_number")
    meters = relationship("Meter", back_populates="building", cascade="all, delete-orphan")
    equipment = relationship("Equipment", back_populates="building", cascade="all, delete-orphan")
    schedules = relationship("OperatingSchedule", back_populates="building", cascade="all, delete-orphan")
    tariffs = relationship("Tariff", back_populates="building", cascade="all, delete-orphan")
    anomalies = relationship("Anomaly", back_populates="building", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="building", cascade="all, delete-orphan")
    interventions = relationship("Intervention", back_populates="building", cascade="all, delete-orphan")


class Floor(Base):
    __tablename__ = "floors"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    building_id = Column(String(36), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False, index=True)
    floor_number = Column(Integer, nullable=False)
    name = Column(String(500), nullable=False)
    area_m2 = Column(Float, nullable=False, default=500.0)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    building = relationship("Building", back_populates="floors")
    zones = relationship("Zone", back_populates="floor", cascade="all, delete-orphan")
    floor_plan = relationship("FloorPlan", back_populates="floor", uselist=False, cascade="all, delete-orphan")


class FloorPlan(Base):
    __tablename__ = "floor_plans"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    floor_id = Column(String(36), ForeignKey("floors.id", ondelete="CASCADE"), unique=True, nullable=False)
    image_url = Column(Text, nullable=True)
    width = Column(Float, default=1000.0)
    height = Column(Float, default=700.0)
    status = Column(String(50), default="active")  # pending, active, corrected
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    floor = relationship("Floor", back_populates="floor_plan")


class Zone(Base):
    __tablename__ = "zones"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    floor_id = Column(String(36), ForeignKey("floors.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(500), nullable=False)
    zone_type = Column(String(50), default="office")  # office, conference, server_room, cafeteria, common, mechanical, restroom, lobby
    area_m2 = Column(Float, nullable=False, default=50.0)
    capacity = Column(Integer, default=10)
    polygon_coordinates = Column(JSON, default=list)  # [[x1,y1], [x2,y2], ...] normalized or viewBox pixels
    detection_source = Column(String(50), default="synthetic")  # synthetic, cad_import, ai_vision, manual
    detection_confidence = Column(Float, default=1.0)
    target_energy_intensity_kwh_m2 = Column(Float, default=120.0)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    floor = relationship("Floor", back_populates="zones")
    meters = relationship("Meter", back_populates="zone")
    equipment = relationship("Equipment", back_populates="zone")
    anomalies = relationship("Anomaly", back_populates="zone")
    recommendations = relationship("Recommendation", back_populates="zone")
    interventions = relationship("Intervention", back_populates="zone")


class Meter(Base):
    __tablename__ = "meters"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    building_id = Column(String(36), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False, index=True)
    zone_id = Column(String(36), ForeignKey("zones.id", ondelete="SET NULL"), nullable=True, index=True)
    meter_number = Column(String(100), nullable=False)
    meter_type = Column(String(50), default="submeter")  # main, submeter, hvac, lighting, plug_load
    unit = Column(String(20), default="kWh")
    location_description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    building = relationship("Building", back_populates="meters")
    zone = relationship("Zone", back_populates="meters")


class Equipment(Base):
    __tablename__ = "equipment"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    building_id = Column(String(36), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False, index=True)
    zone_id = Column(String(36), ForeignKey("zones.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(150), nullable=False)
    equipment_type = Column(String(50), nullable=False)  # chiller, ahu, vrf, lighting_bank, server_rack, elevator, boiler
    rated_power_kw = Column(Float, nullable=False, default=5.0)
    status = Column(String(50), default="operational")  # operational, degraded, abnormal, offline
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    building = relationship("Building", back_populates="equipment")
    zone = relationship("Zone", back_populates="equipment")


class OperatingSchedule(Base):
    __tablename__ = "operating_schedules"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    building_id = Column(String(36), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False, index=True)
    zone_id = Column(String(36), ForeignKey("zones.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    schedule_type = Column(String(50), default="standard")  # standard, weekend, holiday, custom
    days_of_week = Column(JSON, default=lambda: [0, 1, 2, 3, 4])  # 0=Monday, 6=Sunday
    start_time = Column(String(10), default="08:00")  # HH:MM
    end_time = Column(String(10), default="18:00")    # HH:MM
    hvac_setpoint_occupied = Column(Float, default=22.0)    # Celsius
    hvac_setpoint_unoccupied = Column(Float, default=26.0)  # Celsius
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    building = relationship("Building", back_populates="schedules")


class Tariff(Base):
    __tablename__ = "tariffs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    building_id = Column(String(36), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), default="Commercial Time-of-Use")
    tariff_type = Column(String(50), default="tou")  # flat, tou
    rate_per_kwh = Column(Float, default=0.14)
    peak_rate_per_kwh = Column(Float, default=0.28)
    off_peak_rate_per_kwh = Column(Float, default=0.09)
    peak_hours_start = Column(String(10), default="14:00")
    peak_hours_end = Column(String(10), default="18:00")
    currency = Column(String(10), default="USD")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    building = relationship("Building", back_populates="tariffs")


class EnergyReading(Base):
    __tablename__ = "energy_readings"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    building_id = Column(String(36), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False, index=True)
    floor_id = Column(String(36), ForeignKey("floors.id", ondelete="SET NULL"), nullable=True, index=True)
    zone_id = Column(String(36), ForeignKey("zones.id", ondelete="SET NULL"), nullable=True, index=True)
    meter_id = Column(String(36), ForeignKey("meters.id", ondelete="SET NULL"), nullable=True, index=True)
    equipment_id = Column(String(36), ForeignKey("equipment.id", ondelete="SET NULL"), nullable=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    energy_kwh = Column(Float, nullable=False)
    power_kw = Column(Float, nullable=False)
    quality_status = Column(String(20), default="good")  # good, suspect, missing, interpolated
    is_after_hours = Column(Boolean, default=False)
    is_weekend = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_energy_bldg_time", "building_id", "timestamp"),
        Index("idx_energy_zone_time", "zone_id", "timestamp"),
    )


class OccupancyReading(Base):
    __tablename__ = "occupancy_readings"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    building_id = Column(String(36), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False, index=True)
    floor_id = Column(String(36), ForeignKey("floors.id", ondelete="SET NULL"), nullable=True)
    zone_id = Column(String(36), ForeignKey("zones.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    occupancy_count = Column(Integer, default=0)
    occupancy_ratio = Column(Float, default=0.0)  # 0.0 to 1.0
    capacity = Column(Integer, default=10)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_occ_zone_time", "zone_id", "timestamp"),
    )


class WeatherReading(Base):
    __tablename__ = "weather_readings"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    building_id = Column(String(36), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    outdoor_temperature_c = Column(Float, nullable=False)
    outdoor_humidity_pct = Column(Float, default=50.0)
    cooling_degree_days = Column(Float, default=0.0)
    heating_degree_days = Column(Float, default=0.0)
    source = Column(String(50), default="local_station")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_weather_bldg_time", "building_id", "timestamp"),
    )


class Anomaly(Base):
    __tablename__ = "anomalies"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    building_id = Column(String(36), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False, index=True)
    floor_id = Column(String(36), ForeignKey("floors.id", ondelete="SET NULL"), nullable=True, index=True)
    zone_id = Column(String(36), ForeignKey("zones.id", ondelete="SET NULL"), nullable=True, index=True)
    meter_id = Column(String(36), ForeignKey("meters.id", ondelete="SET NULL"), nullable=True)
    equipment_id = Column(String(36), ForeignKey("equipment.id", ondelete="SET NULL"), nullable=True)
    
    anomaly_type = Column(String(100), nullable=False)
    # after_hours_hvac, empty_room_lighting, weekend_operation, occupancy_hvac_mismatch,
    # equipment_abnormality, peak_demand_event, persistent_excess, sudden_spike,
    # recurring_waste, emerging_anomaly, data_quality_fault
    
    severity = Column(String(20), default="medium", index=True)  # info, low, medium, high, critical
    status = Column(String(50), default="open", index=True)      # open, investigating, acknowledged, resolved, dismissed
    
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False)
    
    actual_kwh = Column(Float, nullable=False)
    expected_kwh = Column(Float, nullable=False)
    excess_kwh = Column(Float, nullable=False)
    estimated_cost = Column(Float, nullable=False)
    estimated_co2_kg = Column(Float, nullable=False)
    
    confidence_score = Column(Float, default=0.85)  # 0.0 to 1.0
    priority_score = Column(Float, default=50.0)    # 0.0 to 100.0
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    is_recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    building = relationship("Building", back_populates="anomalies")
    zone = relationship("Zone", back_populates="anomalies")
    evidence_cards = relationship("Evidence", back_populates="anomaly", cascade="all, delete-orphan")
    investigations = relationship("Investigation", back_populates="anomaly", cascade="all, delete-orphan")
    autopsy_events = relationship("AutopsyEvent", back_populates="anomaly", cascade="all, delete-orphan", order_by="AutopsyEvent.step_order")
    recommendations = relationship("Recommendation", back_populates="anomaly")


class Evidence(Base):
    __tablename__ = "evidence"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    anomaly_id = Column(String(36), ForeignKey("anomalies.id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_type = Column(String(100), nullable=False)
    # occupancy_zero, schedule_off, historical_baseline_exceeded, weather_discrepancy,
    # neighboring_zone_comparison, equipment_power_draw
    
    metric_name = Column(String(100), nullable=False)
    actual_value = Column(Float, nullable=False)
    expected_value = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)
    confidence = Column(Float, default=0.90)
    narrative = Column(Text, nullable=False)
    supporting_data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    anomaly = relationship("Anomaly", back_populates="evidence_cards")


class Investigation(Base):
    __tablename__ = "investigations"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    anomaly_id = Column(String(36), ForeignKey("anomalies.id", ondelete="CASCADE"), nullable=False, index=True)
    primary_cause = Column(String(255), nullable=False)
    contributing_factors = Column(JSON, default=list)  # list of strings
    supporting_evidence_summary = Column(Text, nullable=False)
    operational_context = Column(Text, nullable=True)
    model_rule_used = Column(String(100), default="Contextual Energy Forensics Engine v1")
    confidence_score = Column(Float, default=0.88)
    limitations = Column(Text, nullable=True)
    status = Column(String(50), default="completed")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    anomaly = relationship("Anomaly", back_populates="investigations")


class AutopsyEvent(Base):
    __tablename__ = "autopsy_events"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    anomaly_id = Column(String(36), ForeignKey("anomalies.id", ondelete="CASCADE"), nullable=False, index=True)
    step_order = Column(Integer, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    event_type = Column(String(50), nullable=False)
    # normal, deviation_start, threshold_breached, peak_detected, contextual_evidence, anomaly_flagged, root_cause_identified
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    metric_name = Column(String(100), nullable=True)
    value = Column(Float, nullable=True)
    expected_value = Column(Float, nullable=True)
    evidence_reference = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    anomaly = relationship("Anomaly", back_populates="autopsy_events")


class Recommendation(Base):
    __tablename__ = "recommendations"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    building_id = Column(String(36), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False, index=True)
    zone_id = Column(String(36), ForeignKey("zones.id", ondelete="SET NULL"), nullable=True, index=True)
    anomaly_id = Column(String(36), ForeignKey("anomalies.id", ondelete="SET NULL"), nullable=True, index=True)
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)  # behavioral, operational, maintenance, retrofit
    action_steps = Column(JSON, default=list)
    
    estimated_annual_kwh_savings = Column(Float, nullable=False)
    estimated_annual_cost_savings = Column(Float, nullable=False)
    estimated_annual_co2_reduction_kg = Column(Float, nullable=False)
    implementation_cost = Column(Float, default=0.0)
    payback_period_months = Column(Float, default=0.0)
    roi_percentage = Column(Float, default=100.0)
    
    confidence = Column(Float, default=0.88)
    status = Column(String(50), default="proposed")  # proposed, approved, scheduled, completed, rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    
    building = relationship("Building", back_populates="recommendations")
    zone = relationship("Zone", back_populates="recommendations")
    anomaly = relationship("Anomaly", back_populates="recommendations")
    interventions = relationship("Intervention", back_populates="recommendation")


class SimulationScenario(Base):
    __tablename__ = "simulation_scenarios"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    building_id = Column(String(36), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    scenario_type = Column(String(50), nullable=False)
    # hvac_runtime_reduction, setpoint_adjustment, lighting_runtime_reduction, equipment_replacement, schedule_optimization
    parameters = Column(JSON, default=dict)
    
    baseline_annual_kwh = Column(Float, nullable=False)
    projected_annual_kwh = Column(Float, nullable=False)
    annual_kwh_savings = Column(Float, nullable=False)
    annual_cost_savings = Column(Float, nullable=False)
    annual_co2_savings_kg = Column(Float, nullable=False)
    percent_reduction = Column(Float, nullable=False)
    assumptions = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)


class Intervention(Base):
    __tablename__ = "interventions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    building_id = Column(String(36), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False, index=True)
    zone_id = Column(String(36), ForeignKey("zones.id", ondelete="SET NULL"), nullable=True, index=True)
    recommendation_id = Column(String(36), ForeignKey("recommendations.id", ondelete="SET NULL"), nullable=True, index=True)
    
    title = Column(String(255), nullable=False)
    planned_action = Column(Text, nullable=False)
    implementation_date = Column(DateTime, nullable=False)
    completion_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="planned")  # planned, in_progress, completed, cancelled
    
    estimated_annual_savings_kwh = Column(Float, default=0.0)
    estimated_annual_savings_cost = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    building = relationship("Building", back_populates="interventions")
    zone = relationship("Zone", back_populates="interventions")
    recommendation = relationship("Recommendation", back_populates="interventions")
    verification_result = relationship("VerificationResult", back_populates="intervention", uselist=False, cascade="all, delete-orphan")


class VerificationResult(Base):
    __tablename__ = "verification_results"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    intervention_id = Column(String(36), ForeignKey("interventions.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    baseline_period_start = Column(DateTime, nullable=False)
    baseline_period_end = Column(DateTime, nullable=False)
    post_period_start = Column(DateTime, nullable=False)
    post_period_end = Column(DateTime, nullable=False)
    
    baseline_kwh = Column(Float, nullable=False)
    post_kwh = Column(Float, nullable=False)
    weather_normalized_baseline_kwh = Column(Float, nullable=False)
    measured_kwh_savings = Column(Float, nullable=False)
    measured_cost_savings = Column(Float, nullable=False)
    measured_co2_savings_kg = Column(Float, nullable=False)
    percent_improvement = Column(Float, nullable=False)
    
    confidence_score = Column(Float, default=0.92)
    is_statistically_significant = Column(Boolean, default=True)
    methodology = Column(String(100), default="IPMVP Option C (Whole Facility / Submeter)")
    limitations = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    intervention = relationship("Intervention", back_populates="verification_result")


class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    building_id = Column(String(36), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False, index=True)
    job_type = Column(String(50), default="full_audit")
    status = Column(String(50), default="queued")  # queued, running, completed, failed
    progress_pct = Column(Integer, default=0)
    result_summary = Column(JSON, default=dict)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
