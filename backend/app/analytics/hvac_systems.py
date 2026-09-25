from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import uuid
import math
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func

from app.models import Building, Floor, Zone, Meter, EnergyReading, Anomaly, Tariff


class HVACSystemManager:
    """
    Manages interchangeable HVAC system datasets and operational profiles.
    Allows mixing, matching, and swapping HVAC systems across facilities and floor plans.
    """

    HVAC_PROFILES = {
        "chilled_water_vav": {
            "id": "chilled_water_vav",
            "name": "Chilled Water Central VAV",
            "type": "Central Plant",
            "cop": 5.6,
            "description": "Centrifugal chillers, cooling towers, variable speed primary pumping, and AHUs with VAV terminal reheat.",
            "base_multiplier": 1.0,
            "after_hours_setback": 0.20,
            "anomaly_frequency": 0,
            "health_score": 92.5,
            "badge_color": "blue"
        },
        "vrf_heat_recovery": {
            "id": "vrf_heat_recovery",
            "name": "Variable Refrigerant Flow (VRF)",
            "type": "Distributed Inverter DX",
            "cop": 4.8,
            "description": "Inverter-driven 3-pipe heat recovery VRF system with multi-split branch controllers for simultaneous zoned heating and cooling.",
            "base_multiplier": 0.82,
            "after_hours_setback": 0.12,
            "anomaly_frequency": 0,
            "health_score": 98.4,
            "badge_color": "emerald"
        },
        "packaged_rtu_economizer": {
            "id": "packaged_rtu_economizer",
            "name": "Packaged Rooftop Units (RTU)",
            "type": "Direct Expansion RTU",
            "cop": 3.4,
            "description": "Staged rooftop DX units with modulating barometric relief dampers and dual-enthalpy economizers.",
            "base_multiplier": 1.25,
            "after_hours_setback": 0.38,
            "anomaly_frequency": 1,
            "health_score": 78.5,
            "badge_color": "amber"
        },
        "precision_crac_datacenter": {
            "id": "precision_crac_datacenter",
            "name": "Precision High-Density CRAC",
            "type": "Mission-Critical 24/7",
            "cop": 3.1,
            "description": "Continuous N+1 precision computer room air conditioners with ECM plug fans and high sensible heat ratio.",
            "base_multiplier": 2.10,
            "after_hours_setback": 0.95,
            "anomaly_frequency": 0,
            "health_score": 88.0,
            "badge_color": "indigo"
        },
        "stuck_damper_overcooling": {
            "id": "stuck_damper_overcooling",
            "name": "Faulty Damper Overcooling (Waste Profile)",
            "type": "Uncalibrated Pneumatic Fault",
            "cop": 2.4,
            "description": "Uncalibrated VAV actuators causing stuck 100% cooling air delivery outside occupancy schedules. Generates severe after-hours waste.",
            "base_multiplier": 1.68,
            "after_hours_setback": 0.88,
            "anomaly_frequency": 2,
            "health_score": 52.0,
            "badge_color": "rose"
        },
        "monsoon_high_humidity": {
            "id": "monsoon_high_humidity",
            "name": "Monsoon Dehumidification Profile",
            "type": "Latent Heavy Reheat",
            "cop": 2.9,
            "description": "High ambient humidity mode (>80% RH) requiring deep coil subcooling and active hot gas reheat for moisture stripping.",
            "base_multiplier": 1.42,
            "after_hours_setback": 0.45,
            "anomaly_frequency": 1,
            "health_score": 71.0,
            "badge_color": "cyan"
        }
    }

    @classmethod
    def list_available_systems(cls, active_system_id: str = "chilled_water_vav") -> List[Dict[str, Any]]:
        systems = []
        for sid, p in cls.HVAC_PROFILES.items():
            systems.append({
                **p,
                "is_active": sid == active_system_id
            })
        return systems

    @classmethod
    async def apply_hvac_system_dataset(
        cls,
        db: AsyncSession,
        building_id: str,
        system_type: str,
        floor_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Interchangeably binds the selected HVAC system dataset to the building / floor,
        regenerating telemetry curves, power draws, and operational anomalies.
        """
        profile = cls.HVAC_PROFILES.get(system_type)
        if not profile:
            profile = cls.HVAC_PROFILES["chilled_water_vav"]
            system_type = "chilled_water_vav"

        # Fetch building
        b_res = await db.execute(select(Building).where(Building.id == building_id))
        bldg = b_res.scalar_one_or_none()
        if not bldg:
            all_b = await db.execute(select(Building).limit(1))
            bldg = all_b.scalar_one_or_none()
            if not bldg:
                raise ValueError("Building not found.")
            building_id = bldg.id

        # Update metadata to store active HVAC profile
        meta = dict(bldg.metadata_json or {})
        meta["active_hvac_system"] = system_type
        meta["hvac_system_name"] = profile["name"]
        meta["hvac_cop"] = profile["cop"]
        bldg.metadata_json = meta

        # Find targets (zones and meters)
        zone_query = select(Zone).join(Floor).where(Floor.building_id == building_id)
        if floor_id:
            zone_query = zone_query.where(Zone.floor_id == floor_id)
        z_res = await db.execute(zone_query)
        zones = z_res.scalars().all()

        if not zones:
            return {
                "building_id": building_id,
                "system_type": system_type,
                "hvac_profile": profile,
                "zones_updated": 0,
                "message": "No zones found to bind HVAC dataset."
            }

        now = datetime.utcnow()

        # Purge previous anomalies for these zones to refresh with current profile (preserving golden anomalies)
        zone_ids = [z.id for z in zones]
        await db.execute(
            delete(Anomaly)
            .where(Anomaly.zone_id.in_(zone_ids))
            .where(~Anomaly.id.like("anom-golden%"))
        )

        # Purge recent energy readings and re-synthesize according to this HVAC system
        await db.execute(delete(EnergyReading).where(EnergyReading.zone_id.in_(zone_ids)))
        await db.flush()

        tariff_rate = bldg.default_tariff_rate or 9.50
        mult = profile["base_multiplier"]
        setback = profile["after_hours_setback"]

        created_anomalies = []

        for z_idx, z in enumerate(zones):
            # Check or create meter
            m_res = await db.execute(select(Meter).where(Meter.zone_id == z.id))
            meter = m_res.scalar_one_or_none()
            if not meter:
                meter = Meter(
                    id=f"mtr-{z.id}-{uuid.uuid4().hex[:4]}",
                    building_id=building_id,
                    zone_id=z.id,
                    meter_number=f"MTR-{z.name[:8].upper()}",
                    meter_type="hvac",
                    unit="kWh",
                    is_active=True
                )
                db.add(meter)
                await db.flush()

            base_zone_kw = (z.area_m2 * 0.035) * mult

            # 72 hours of telemetry (3 days)
            for h in range(72):
                ts = now - timedelta(hours=71 - h)
                hour = ts.hour
                is_after = hour < 7 or hour >= 19
                is_weekend = ts.weekday() >= 5

                # Diurnal solar & occupancy curve
                solar_factor = math.sin(max(0, hour - 6) / 14 * math.pi) if 6 <= hour <= 20 else 0.0
                diurnal = 0.5 + 0.5 * solar_factor

                if is_after or is_weekend:
                    actual_kw = base_zone_kw * setback * (0.9 + 0.2 * ((h % 5) / 5))
                else:
                    actual_kw = base_zone_kw * (0.8 + 0.4 * diurnal)

                # Fault injection for faulty damper profile
                is_anom = False
                if system_type == "stuck_damper_overcooling" and z_idx == 0:
                    if is_after:
                        actual_kw = base_zone_kw * 1.85  # Stuck cooling loop
                        is_anom = True

                reading = EnergyReading(
                    meter_id=meter.id,
                    building_id=building_id,
                    floor_id=z.floor_id,
                    zone_id=z.id,
                    timestamp=ts,
                    power_kw=round(actual_kw, 2),
                    energy_kwh=round(actual_kw, 2),
                    quality_status="good",
                    is_after_hours=is_after,
                    is_weekend=is_weekend
                )
                db.add(reading)

            # Generate Anomaly for faulty profile
            if system_type == "stuck_damper_overcooling" and z_idx == 0:
                excess_kwh = round(base_zone_kw * 14.5 * 1.5, 1)
                cost_waste = round(excess_kwh * tariff_rate, 2)
                anom = Anomaly(
                    id=f"anom-hvac-{z.id[:8]}",
                    building_id=building_id,
                    floor_id=z.floor_id,
                    zone_id=z.id,
                    anomaly_type="after_hours_hvac",
                    severity="critical",
                    status="open",
                    start_time=now - timedelta(hours=14),
                    end_time=now,
                    actual_kwh=round(base_zone_kw * 24 * 1.68, 1),
                    expected_kwh=round(base_zone_kw * 24 * 0.4, 1),
                    excess_kwh=excess_kwh,
                    estimated_cost=cost_waste,
                    estimated_co2_kg=round(excess_kwh * bldg.carbon_factor, 1),
                    confidence_score=0.96,
                    priority_score=94.0,
                    title=f"Stuck VAV Actuator Overcooling in {z.name}",
                    description=f"Terminal VAV damper commanded to 100% cooling continuously overnight. Zone overcooling detected.",
                    is_recurring=True,
                    recurrence_pattern="daily_after_hours"
                )
                db.add(anom)
                created_anomalies.append(anom.id)

        await db.commit()

        return {
            "building_id": building_id,
            "system_type": system_type,
            "hvac_profile": profile,
            "zones_updated": len(zones),
            "anomalies_count": len(created_anomalies),
            "message": f"Successfully swapped HVAC dataset to '{profile['name']}' (COP: {profile['cop']}). 72-hour telemetry regenerated."
        }
