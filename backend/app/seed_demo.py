import sys
from pathlib import Path

_backend_root = str(Path(__file__).resolve().parent.parent)
if _backend_root not in sys.path:
    sys.path.insert(0, _backend_root)

import uuid
import random
import math
from datetime import datetime, timedelta
from app.database import get_sync_db, sync_engine
from app.models import (
    Base, Organization, User, Building, Floor, FloorPlan, Zone, Meter,
    Equipment, OperatingSchedule, Tariff, EnergyReading, OccupancyReading,
    WeatherReading, Anomaly, Evidence, Investigation, AutopsyEvent,
    Recommendation, SimulationScenario, Intervention, VerificationResult,
    AnalysisJob
)

def run_seed():
    print("Initializing Nexyra database schema in PostgreSQL...")
    Base.metadata.create_all(sync_engine)
    
    with get_sync_db() as db:
        # Check if TechNova already exists
        existing = db.query(Building).filter_by(name="TechNova Business Centre").first()
        if existing:
            print("TechNova Business Centre already exists. Purging and reseeding fresh...")
            db.query(Building).filter_by(name="TechNova Business Centre").delete()
            db.commit()

        print("Checking Organization & Users...")
        org = db.query(Organization).filter_by(name="Nexyra Enterprise Facilities Group").first()
        if not org:
            org = Organization(
                id=str(uuid.uuid4()),
                name="Nexyra Enterprise Facilities Group"
            )
            db.add(org)
            db.flush()
        
        user = db.query(User).filter_by(email="auditor@technova.com").first()
        if not user:
            user = User(
                id=str(uuid.uuid4()),
                organization_id=org.id,
                email="auditor@technova.com",
                full_name="Sarah Chen (Lead Energy Auditor)",
                role="auditor"
            )
            db.add(user)
            db.flush()
        
        print("Seeding Building: TechNova Business Centre...")
        bldg_id = "bldg-technova-01"
        bldg = Building(
            id=bldg_id,
            organization_id=org.id,
            name="TechNova Business Centre",
            address="100 Innovation Way, Tech Park",
            building_type="Commercial Office & Innovation Lab",
            gross_floor_area_m2=12500.0,
            primary_use="Commercial Office",
            timezone="Asia/Kolkata",
            currency="INR",
            default_tariff_rate=9.50,
            carbon_factor=0.82,
            metadata_json={
                "leed_target": "LEED Gold",
                "hvac_type": "Variable Air Volume (VAV) with Central Water-Cooled Chillers",
                "year_built": 2018,
                "floors_count": 4,
                "total_zones": 40
            }
        )
        db.add(bldg)
        db.flush()
        
        print("Seeding Tariffs and Operating Schedules...")
        tariff = Tariff(
            id=str(uuid.uuid4()),
            building_id=bldg.id,
            name="Commercial Peak TOU Rate (INR)",
            tariff_type="tou",
            rate_per_kwh=9.50,
            peak_rate_per_kwh=14.50,
            off_peak_rate_per_kwh=6.50,
            peak_hours_start="14:00",
            peak_hours_end="18:00",
            currency="INR"
        )
        db.add(tariff)
        
        bldg_sched = OperatingSchedule(
            id=str(uuid.uuid4()),
            building_id=bldg.id,
            name="Standard Office Hours",
            schedule_type="standard",
            days_of_week=[0, 1, 2, 3, 4],  # Mon-Fri
            start_time="08:00",
            end_time="18:00",
            hvac_setpoint_occupied=21.5,
            hvac_setpoint_unoccupied=26.0,
            is_active=True
        )
        db.add(bldg_sched)
        
        # 4 Floors
        floor_specs = [
            {"num": 1, "name": "Ground Floor (Reception, Amenities & Cafeteria)", "area": 3200.0},
            {"num": 2, "name": "Floor 2 (Software Engineering & Labs)", "area": 3100.0},
            {"num": 3, "name": "Floor 3 (Executive Offices & Conference Suites)", "area": 3100.0},
            {"num": 4, "name": "Floor 4 (Product Design & Collaboration)", "area": 3100.0}
        ]
        
        all_floors = []
        all_zones = []
        all_meters = []
        all_equipment = []
        
        # Grid layout generator for 10 realistic rectangular zones per floor
        zone_configs = [
            {"suffix": "Z01", "name": "Main Open Workspace North", "type": "office", "area": 420.0, "cap": 45, "row": 0, "col": 0, "w": 3, "h": 2},
            {"suffix": "Z02", "name": "Main Open Workspace South", "type": "office", "area": 420.0, "cap": 45, "row": 0, "col": 3, "w": 3, "h": 2},
            {"suffix": "Z03", "name": "Primary Conference Hall", "type": "conference", "area": 160.0, "cap": 30, "row": 0, "col": 6, "w": 2, "h": 2},
            {"suffix": "Z04", "name": "Collaboration Pods", "type": "common", "area": 120.0, "cap": 15, "row": 0, "col": 8, "w": 2, "h": 2},
            {"suffix": "Z05", "name": "Executive Meeting Room A", "type": "conference", "area": 140.0, "cap": 20, "row": 2, "col": 0, "w": 2, "h": 2},
            {"suffix": "Z06", "name": "Private Office Suite B", "type": "office", "area": 180.0, "cap": 12, "row": 2, "col": 2, "w": 2, "h": 2},
            {"suffix": "Z07", "name": "Elevator Lobby & Atrium", "type": "lobby", "area": 220.0, "cap": 25, "row": 2, "col": 4, "w": 2, "h": 2},
            {"suffix": "Z08", "name": "Restrooms & Wellness", "type": "restroom", "area": 90.0, "cap": 10, "row": 2, "col": 6, "w": 2, "h": 2},
            {"suffix": "Z09", "name": "Server & Telecom Hub", "type": "server_room", "area": 110.0, "cap": 4, "row": 2, "col": 8, "w": 2, "h": 2},
            {"suffix": "Z10", "name": "Cafeteria & Pantry Lounge", "type": "cafeteria", "area": 350.0, "cap": 50, "row": 4, "col": 0, "w": 10, "h": 2}
        ]
        
        for f_idx, f_spec in enumerate(floor_specs):
            f_id = f"floor-technova-0{f_spec['num']}"
            fl = Floor(
                id=f_id,
                building_id=bldg.id,
                floor_number=f_spec["num"],
                name=f_spec["name"],
                area_m2=f_spec["area"],
                sort_order=f_spec["num"]
            )
            db.add(fl)
            all_floors.append(fl)
            
            # Floor Plan
            fp = FloorPlan(
                id=f"plan-fl0{f_spec['num']}",
                floor_id=fl.id,
                image_url=f"/floorplans/floor_0{f_spec['num']}.svg",
                width=1000.0,
                height=700.0,
                status="active",
                metadata_json={"orientation": "North-Facing", "scale": "1px = 0.05m"}
            )
            db.add(fp)
            
            # 10 zones per floor
            for z_c in zone_configs:
                z_id = f"z-fl0{f_spec['num']}-{z_c['suffix']}"
                # Compute exact polygon vertices on 1000x700 viewBox canvas
                x_base = 50 + z_c["col"] * 90
                y_base = 50 + z_c["row"] * 100
                w_box = z_c["w"] * 85
                h_box = z_c["h"] * 90
                polygon = [
                    [x_base, y_base],
                    [x_base + w_box, y_base],
                    [x_base + w_box, y_base + h_box],
                    [x_base, y_base + h_box]
                ]
                
                z = Zone(
                    id=z_id,
                    floor_id=fl.id,
                    name=f"Floor {f_spec['num']} - {z_c['name']}",
                    zone_type=z_c["type"],
                    area_m2=z_c["area"],
                    capacity=z_c["cap"],
                    polygon_coordinates=polygon,
                    detection_source="synthetic",
                    detection_confidence=1.0,
                    target_energy_intensity_kwh_m2=115.0,
                    metadata_json={"hvac_terminal_id": f"VAV-0{f_spec['num']}-{z_c['suffix']}"}
                )
                db.add(z)
                all_zones.append(z)
                
                # Meter for zone
                m = Meter(
                    id=f"meter-{z_id}",
                    building_id=bldg.id,
                    zone_id=z.id,
                    meter_number=f"M-F0{f_spec['num']}-{z_c['suffix']}",
                    meter_type="submeter",
                    unit="kWh",
                    location_description=f"Distribution Board DB-0{f_spec['num']}, Feeder {z_c['suffix']}",
                    is_active=True
                )
                db.add(m)
                all_meters.append(m)
                
                # Equipment for zone
                eq_type = "ahu" if z_c["type"] in ["office", "conference"] else ("server_rack" if z_c["type"] == "server_room" else "vrf")
                eq = Equipment(
                    id=f"eq-{z_id}",
                    building_id=bldg.id,
                    zone_id=z.id,
                    name=f"F0{f_spec['num']}-{z_c['name']} Terminal Unit",
                    equipment_type=eq_type,
                    rated_power_kw=8.5 if eq_type == "ahu" else 4.0,
                    status="operational"
                )
                db.add(eq)
                all_equipment.append(eq)
                
        db.flush()
        print(f"Seeded {len(all_floors)} floors, {len(all_zones)} zones, {len(all_meters)} meters, and {len(all_equipment)} equipment.")
        
        # Seed 14 Days of Time Series Data (hourly intervals)
        print("Generating 14 days of realistic hourly energy, occupancy, and weather telemetry...")
        random.seed(42)  # Deterministic seed for reproducible evaluation
        
        start_date = datetime(2026, 9, 10, 0, 0, 0)
        total_hours = 14 * 24  # 336 hours
        
        # Ground truth scenario targets:
        # Scenario 1: After-Hours HVAC on Floor 3 Zone 05 (Executive Meeting Room A) between Sep 18 20:00 and Sep 19 04:00
        # Scenario 2: Empty-Room Lighting in Floor 2 Zone 03 (Conference Hall) on Sep 15 13:00 - 17:00
        # Scenario 3: Weekend Operation in Floor 1 Zone 01 on Sep 13 (Saturday)
        # Scenario 4: Extreme Heatwave (Legitimate High Energy, NON-WASTE) on Sep 16 11:00 - 17:00 (Temp 33.5°C)
        # Scenario 5: Peak Demand Event on Sep 17 at 14:00 (Total Power 185 kW)
        
        readings_to_add = []
        occ_readings_to_add = []
        weather_readings_to_add = []
        
        for h in range(total_hours):
            current_time = start_date + timedelta(hours=h)
            day_of_week = current_time.weekday()
            hour_of_day = current_time.hour
            is_weekend = day_of_week >= 5
            is_working_hours = (not is_weekend) and (8 <= hour_of_day < 18)
            
            # Weather profile
            # Day 6 (Sep 16) is the Heatwave test scenario
            is_heatwave_day = (current_time.day == 16)
            base_temp = 28.0 if is_heatwave_day else 20.0
            daily_temp_swing = 6.0 * math.sin((hour_of_day - 9) * math.pi / 12)
            out_temp = round(base_temp + daily_temp_swing + random.uniform(-0.5, 0.5), 1)
            humidity = round(55.0 - daily_temp_swing * 1.5, 1)
            
            # Weather record (building level)
            weather_readings_to_add.append(WeatherReading(
                id=str(uuid.uuid4()),
                building_id=bldg.id,
                timestamp=current_time,
                outdoor_temperature_c=out_temp,
                outdoor_humidity_pct=humidity,
                cooling_degree_days=max(0.0, out_temp - 22.0),
                heating_degree_days=max(0.0, 16.0 - out_temp),
                source="Campus Weather Station WS-01"
            ))
            
            # Subsample zones for readings to keep ingestion fast (~15 representative zones with detailed timeseries)
            monitored_zones = all_zones[:12]
            for z in monitored_zones:
                # Default occupancy
                if is_working_hours:
                    occ_ratio = round(random.uniform(0.65, 0.95), 2)
                    occ_count = int(z.capacity * occ_ratio)
                else:
                    occ_ratio = 0.0
                    occ_count = 0
                    
                # Default energy draw
                area = z.area_m2
                if is_working_hours:
                    base_kw = (area * 0.030) * (0.8 + 0.4 * occ_ratio)
                    # Heatwave increase
                    if out_temp > 28.0:
                        base_kw += (out_temp - 28.0) * 0.005 * area
                else:
                    base_kw = area * 0.005  # normal setback ~5 W/m2
                    
                # INJECT KNOWN GROUND TRUTH ANOMALY SCENARIOS:
                quality_status = "good"
                
                # Scenario 1: After-Hours HVAC on Floor 3 Zone 05 (Sep 18 20:00 - Sep 19 04:00)
                if z.id == "z-fl03-Z05" and current_time.day in [18, 19] and (hour_of_day >= 20 or hour_of_day <= 4):
                    base_kw = 9.4  # abnormal continuous draw
                    occ_ratio = 0.0
                    occ_count = 0
                    
                # Scenario 2: Empty Room Lighting in Floor 2 Zone 03 (Sep 15 13:00 - 17:00)
                if z.id == "z-fl02-Z03" and current_time.day == 15 and 13 <= hour_of_day <= 16:
                    base_kw = 6.2  # full lighting draw
                    occ_ratio = 0.0  # empty!
                    occ_count = 0
                    
                # Scenario 3: Weekend operation in Floor 1 Zone 01 (Sep 13 Saturday 09:00 - 17:00)
                if z.id == "z-fl01-Z01" and current_time.day == 13 and 9 <= hour_of_day <= 17:
                    base_kw = 12.8  # full weekday HVAC schedule running
                    occ_ratio = 0.0
                    occ_count = 0
                    
                # Scenario 4: Peak Demand Surge on Sep 17 at 14:00
                if current_time.day == 17 and hour_of_day == 14:
                    base_kw *= 2.4  # sudden simultaneous compressor spike
                    
                # Scenario 8: Sensor dropout / faulty reading on Zone 9
                if z.id == "z-fl01-Z09" and current_time.day == 21 and hour_of_day in [10, 11, 12]:
                    base_kw = -1.0  # impossible negative value
                    quality_status = "suspect"
                    
                kwh = round(max(0.1, base_kw * 1.0), 2)
                kw = round(max(0.1, base_kw), 2)
                
                readings_to_add.append(EnergyReading(
                    id=str(uuid.uuid4()),
                    building_id=bldg.id,
                    floor_id=z.floor_id,
                    zone_id=z.id,
                    meter_id=f"meter-{z.id}",
                    equipment_id=f"eq-{z.id}",
                    timestamp=current_time,
                    energy_kwh=kwh if kwh > 0 else 0.0,
                    power_kw=kw if kw > 0 else 0.0,
                    quality_status=quality_status,
                    is_after_hours=not is_working_hours,
                    is_weekend=is_weekend
                ))
                
                occ_readings_to_add.append(OccupancyReading(
                    id=str(uuid.uuid4()),
                    building_id=bldg.id,
                    floor_id=z.floor_id,
                    zone_id=z.id,
                    timestamp=current_time,
                    occupancy_count=occ_count,
                    occupancy_ratio=occ_ratio,
                    capacity=z.capacity
                ))
                
        # Batch insert time-series
        print(f"Inserting {len(readings_to_add)} energy readings and {len(weather_readings_to_add)} weather readings...")
        db.bulk_save_objects(weather_readings_to_add)
        db.bulk_save_objects(occ_readings_to_add)
        db.bulk_save_objects(readings_to_add)
        db.commit()
        
        # Seed Pre-Analyzed Anomalies & Evidence Cards for the Golden Demo
        print("Seeding Golden Demo Anomalies, Evidence, Investigations, and Recommendations...")
        
        # Primary Golden Demo Anomaly: Floor 3 After-Hours HVAC
        anom1_id = "anom-golden-01"
        anom1 = Anomaly(
            id=anom1_id,
            building_id=bldg.id,
            floor_id="floor-technova-03",
            zone_id="z-fl03-Z05",
            meter_id="meter-z-fl03-Z05",
            equipment_id="eq-z-fl03-Z05",
            anomaly_type="after_hours_hvac",
            severity="high",
            status="open",
            start_time=datetime(2026, 9, 18, 20, 0, 0),
            end_time=datetime(2026, 9, 19, 4, 0, 0),
            actual_kwh=75.2,
            expected_kwh=11.4,
            excess_kwh=63.8,
            estimated_cost=8.93,
            estimated_co2_kg=24.56,
            confidence_score=0.96,
            priority_score=92.5,
            title="After-Hours HVAC Operation in Floor 3 Executive Suite",
            description="Zone F3-Z05 consumed 75.2 kWh between 20:00 and 04:00 while occupancy was 0 and scheduled operating hours ended at 18:00. Expected baseline was 11.4 kWh. Estimated avoidable excess: 63.8 kWh.",
            is_recurring=True,
            recurrence_pattern="Weekdays between 20:00 and 04:00"
        )
        db.add(anom1)
        
        # Evidence Cards for Anomaly 1
        ev1 = Evidence(
            id=str(uuid.uuid4()),
            anomaly_id=anom1_id,
            evidence_type="occupancy_zero",
            metric_name="Tenant Occupancy Sensor (PIR/BLE)",
            actual_value=0.0,
            expected_value=0.0,
            unit="people",
            confidence=0.99,
            narrative="Ceiling-mounted dual-technology PIR motion and BLE beacons verified 0 occupants throughout the 8-hour period.",
            supporting_data={"sensor_id": "PIR-F03-Z05", "consecutive_empty_hours": 8}
        )
        ev2 = Evidence(
            id=str(uuid.uuid4()),
            anomaly_id=anom1_id,
            evidence_type="schedule_off",
            metric_name="BMS Schedule Operating State",
            actual_value=0.0,
            expected_value=0.0,
            unit="state",
            confidence=1.0,
            narrative="Automated facility schedule mandated unoccupied setback mode starting at 18:00 EDT.",
            supporting_data={"schedule_name": "Standard Office Hours", "setback_target_temp_c": 26.0}
        )
        ev3 = Evidence(
            id=str(uuid.uuid4()),
            anomaly_id=anom1_id,
            evidence_type="historical_baseline_exceeded",
            metric_name="Submeter Active Power",
            actual_value=9.4,
            expected_value=1.4,
            unit="kW",
            confidence=0.95,
            narrative="Submeter branch drew 9.4 kW continuous load, exceeding the calibrated night setback baseline of 1.4 kW by 571%.",
            supporting_data={"baseline_model": "Weather-Normalized Rolling 30-Day Median"}
        )
        db.add_all([ev1, ev2, ev3])
        
        # Energy Autopsy Timeline for Anomaly 1
        autopsy_steps = [
            AutopsyEvent(
                id=str(uuid.uuid4()),
                anomaly_id=anom1_id,
                step_order=1,
                timestamp=datetime(2026, 9, 18, 18, 0, 0),
                event_type="normal",
                title="Normal Operating Window Closes",
                description="BMS schedule transition commands zone terminal units to enter night setback mode (26°C target).",
                metric_name="Occupancy",
                value=2.0,
                expected_value=0.0,
                evidence_reference="BMS Master Schedule Event"
            ),
            AutopsyEvent(
                id=str(uuid.uuid4()),
                anomaly_id=anom1_id,
                step_order=2,
                timestamp=datetime(2026, 9, 18, 19, 45, 0),
                event_type="deviation_start",
                title="Manual Local Thermostat Override Engaged",
                description="A manual 21.0°C cooling setpoint override was activated at the wall thermostat without setting an expiration timer.",
                metric_name="Thermostat Setpoint",
                value=21.0,
                expected_value=26.0,
                evidence_reference="BACnet Point AV-305 Override"
            ),
            AutopsyEvent(
                id=str(uuid.uuid4()),
                anomaly_id=anom1_id,
                step_order=3,
                timestamp=datetime(2026, 9, 18, 20, 15, 0),
                event_type="threshold_breached",
                title="Zone Vacancy Confirmed / Consumption Remains at Peak",
                description="All occupants vacated the room, but VAV damper remained pinned at 80% open with chilled water valves at 65%.",
                metric_name="Active Power",
                value=9.4,
                expected_value=1.4,
                evidence_reference="IoT PIR Sensor Log"
            ),
            AutopsyEvent(
                id=str(uuid.uuid4()),
                anomaly_id=anom1_id,
                step_order=4,
                timestamp=datetime(2026, 9, 18, 22, 0, 0),
                event_type="anomaly_flagged",
                title="Nexyra Anomaly Triggered & Categorized",
                description="Contextual Forensics engine flagged 'After-Hours HVAC Operation' with 96% confidence score.",
                metric_name="Excess Energy",
                value=63.8,
                expected_value=0.0,
                evidence_reference="Nexyra Contextual Anomaly Engine"
            ),
            AutopsyEvent(
                id=str(uuid.uuid4()),
                anomaly_id=anom1_id,
                step_order=5,
                timestamp=datetime(2026, 9, 19, 4, 0, 0),
                event_type="root_cause_identified",
                title="Root Cause Diagnosed: Stuck BMS Manual Override Latch",
                description="Investigation concluded absence of automatic override timeout in BACnet field controller resulted in 8 hours of continuous night conditioning.",
                metric_name="Estimated Waste Cost",
                value=8.93,
                expected_value=0.0,
                evidence_reference="Forensics Investigation Engine"
            )
        ]
        db.add_all(autopsy_steps)
        
        # Root Cause Investigation
        inv1 = Investigation(
            id=str(uuid.uuid4()),
            anomaly_id=anom1_id,
            primary_cause="Manual Thermostat Override Latch Without Automated Reset",
            contributing_factors=[
                "Wall thermostat local user interface permitted untimed override",
                "BACnet global schedule reset command was disabled for Zone F03-Z05",
                "Supply air damper remained mechanically open at 80% commanded position"
            ],
            supporting_evidence_summary="Zero occupants detected by dual PIR sensors while submeter branch drew constant 9.4 kW between 20:00 and 04:00.",
            operational_context="Executive meeting concluded at 19:30; attendee engaged temporary cooling override that failed to expire.",
            model_rule_used="Contextual Schedule-Occupancy Discrepancy Forensics v2.1",
            confidence_score=0.96,
            limitations="Assumes constant chilled water supply temperature of 6.7°C at central plant header.",
            status="completed"
        )
        db.add(inv1)
        
        # Recommendation
        rec1 = Recommendation(
            id="rec-technova-01",
            building_id=bldg.id,
            zone_id="z-fl03-Z05",
            anomaly_id=anom1_id,
            title="Configure Mandatory 2-Hour Auto-Reset on BMS Thermostat Overrides",
            description="Reprogram the BACnet field controller for Zone F03-Z05 to enforce a maximum 120-minute expiration timer on all tenant manual overrides, and integrate PIR vacancy confirmation.",
            category="operational",
            action_steps=[
                "Access BACnet controller via Johnson Controls Metasys / Tridium Niagara workbench",
                "Set Point AV-305 Override_Timer parameter to 120 minutes",
                "Link occupancy sensor DO-12 to trigger immediate setback when unoccupied for >20 minutes"
            ],
            estimated_annual_kwh_savings=15950.0,
            estimated_annual_cost_savings=2233.0,
            estimated_annual_co2_reduction_kg=6140.0,
            implementation_cost=150.0,
            payback_period_months=0.8,
            roi_percentage=1380.0,
            confidence=0.95,
            status="approved"
        )
        db.add(rec1)
        
        # Secondary Anomaly: Empty Room Lighting in Floor 2
        anom2 = Anomaly(
            id="anom-golden-02",
            building_id=bldg.id,
            floor_id="floor-technova-02",
            zone_id="z-fl02-Z03",
            anomaly_type="empty_room_lighting",
            severity="medium",
            status="open",
            start_time=datetime(2026, 9, 15, 13, 0, 0),
            end_time=datetime(2026, 9, 15, 17, 0, 0),
            actual_kwh=24.8,
            expected_kwh=4.2,
            excess_kwh=20.6,
            estimated_cost=2.88,
            estimated_co2_kg=7.93,
            confidence_score=0.91,
            priority_score=68.0,
            title="Empty Room Lighting in Conference Hall F2-Z03",
            description="Conference hall lighting circuits drew full power for 4 consecutive hours while room remained completely vacant.",
            is_recurring=True,
            recurrence_pattern="Occurs 3-4 afternoons per week"
        )
        db.add(anom2)
        
        rec2 = Recommendation(
            id="rec-technova-02",
            building_id=bldg.id,
            zone_id="z-fl02-Z03",
            anomaly_id=anom2.id,
            title="Install Wireless DALI Vacancy Sensors & Photocell Auto-Off",
            description="Retrofit wireless ceiling occupancy sensors configured for auto-off vacancy mode with a 15-minute timeout.",
            category="retrofit",
            action_steps=[
                "Mount 2 wireless DALI vacancy sensors in Conference Hall F2-Z03",
                "Pair sensors with existing Lutron Vive lighting hub",
                "Set timeout delay to 15 minutes"
            ],
            estimated_annual_kwh_savings=5350.0,
            estimated_annual_cost_savings=749.0,
            estimated_annual_co2_reduction_kg=2060.0,
            implementation_cost=320.0,
            payback_period_months=5.1,
            roi_percentage=234.0,
            confidence=0.92,
            status="proposed"
        )
        db.add(rec2)
        
        # Seed Intervention and Verified IPMVP Savings for the Golden Demo
        print("Seeding Completed Intervention & Measured M&V Verification Result...")
        interv1 = Intervention(
            id="interv-golden-01",
            building_id=bldg.id,
            zone_id="z-fl01-Z01",
            recommendation_id=None,
            title="Automated Weekend HVAC Setback Enforcement",
            planned_action="Reprogrammed master chiller and AHU-01 staging to lock out cooling loops during weekend days unless manually requested via security badge swipe.",
            implementation_date=datetime(2026, 9, 14, 8, 0, 0),
            completion_date=datetime(2026, 9, 14, 12, 0, 0),
            status="completed",
            estimated_annual_savings_kwh=12800.0,
            estimated_annual_savings_cost=1792.0,
            notes="Implemented by Chief Building Engineer Dave Ross. Verified via BACnet diagnostic trace."
        )
        db.add(interv1)
        db.flush()
        
        verif1 = VerificationResult(
            id=str(uuid.uuid4()),
            intervention_id=interv1.id,
            baseline_period_start=datetime(2026, 9, 1, 0, 0, 0),
            baseline_period_end=datetime(2026, 9, 13, 23, 59, 59),
            post_period_start=datetime(2026, 9, 14, 0, 0, 0),
            post_period_end=datetime(2026, 9, 23, 23, 59, 59),
            baseline_kwh=3450.0,
            post_kwh=2280.0,
            weather_normalized_baseline_kwh=3480.0,
            measured_kwh_savings=1200.0,
            measured_cost_savings=168.0,
            measured_co2_savings_kg=462.0,
            percent_improvement=34.5,
            confidence_score=0.96,
            is_statistically_significant=True,
            methodology="IPMVP Option C (Whole Facility / Submeter Weather-Normalized Regression)",
            limitations="Monitored over a 10-day post-implementation window. Baseline adjusted for +1.2°C ambient weather delta."
        )
        db.add(verif1)
        
        # Simulation scenarios
        sim1 = SimulationScenario(
            id=str(uuid.uuid4()),
            building_id=bldg.id,
            name="Reduce HVAC Runtime by 2 Hours/Day",
            description="Shift daily HVAC shutdown from 18:00 to 16:30 and pre-cool building during off-peak morning hours.",
            scenario_type="hvac_runtime_reduction",
            parameters={"reduction_hours_per_day": 2.0},
            baseline_annual_kwh=850000.0,
            projected_annual_kwh=739500.0,
            annual_kwh_savings=110500.0,
            annual_cost_savings=15470.0,
            annual_co2_savings_kg=42542.0,
            percent_reduction=13.0,
            assumptions={"operating_hours_baseline": 12.0, "reduced_hours": 10.0}
        )
        db.add(sim1)
        
        db.commit()
        print("Successfully seeded all TechNova Business Centre data into PostgreSQL nexyra3_db!")

if __name__ == "__main__":
    run_seed()
