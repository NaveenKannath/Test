import numpy as np
from datetime import datetime
from typing import Dict, Any, Optional

class ContextualBaselineEngine:
    """
    Computes explainable expected energy baseline taking into account:
    - Time-of-day (circadian / operating cycle)
    - Day-of-week (weekday vs weekend)
    - Outdoor weather (cooling degree days / heating degree days)
    - Schedule operating mode (occupied vs unoccupied)
    - Zone area and type base load
    """
    
    @staticmethod
    def calculate_expected_kwh(
        timestamp: datetime,
        area_m2: float,
        zone_type: str,
        is_scheduled_operating: bool,
        occupancy_ratio: float = 0.0,
        outdoor_temp_c: float = 21.0,
        equipment_rated_kw: float = 5.0
    ) -> Dict[str, Any]:
        hour = timestamp.hour
        is_weekend = timestamp.weekday() >= 5
        
        # Base standby load per m2 (parasitic, standby electronics, emergency lighting)
        type_standby_rates = {
            "server_room": 0.050,  # 50 W/m2 constant IT load
            "mechanical": 0.015,
            "office": 0.005,       # 5 W/m2 base standby
            "conference": 0.003,
            "cafeteria": 0.008,
            "lobby": 0.006,
            "restroom": 0.002,
            "common": 0.004
        }
        standby_w_m2 = type_standby_rates.get(zone_type, 0.005)
        base_standby_kwh = (standby_w_m2 * area_m2) * 1.0  # for 1 hour interval
        
        # Operational occupancy load
        if is_scheduled_operating and not is_weekend:
            # Active lighting and plug loads
            active_w_m2 = 0.025 if zone_type == "office" else 0.015
            occupied_kwh = (active_w_m2 * area_m2) * max(0.2, occupancy_ratio)
        else:
            occupied_kwh = 0.0
            
        # Weather-driven HVAC component (Weather-Normalized)
        # Baseline balance point is 18.5 C - 22 C
        hvac_kwh = 0.0
        cooling_cdd = max(0.0, outdoor_temp_c - 22.0)
        heating_hdd = max(0.0, 16.0 - outdoor_temp_c)
        
        if is_scheduled_operating and not is_weekend:
            if cooling_cdd > 0:
                # Cooling requirement: ~0.004 kWh per m2 per deg C
                hvac_kwh += cooling_cdd * 0.004 * area_m2
            elif heating_hdd > 0:
                hvac_kwh += heating_hdd * 0.003 * area_m2
        else:
            # Unoccupied setback mode: minimal HVAC unless extreme freezing/heat
            if outdoor_temp_c > 32.0:
                hvac_kwh += (outdoor_temp_c - 32.0) * 0.0015 * area_m2
            elif outdoor_temp_c < 5.0:
                hvac_kwh += (5.0 - outdoor_temp_c) * 0.0015 * area_m2
                
        # Total expected energy in kWh for this hour
        total_expected_kwh = max(0.2, round(base_standby_kwh + occupied_kwh + hvac_kwh, 3))
        
        return {
            "expected_kwh": total_expected_kwh,
            "components": {
                "base_standby_kwh": round(base_standby_kwh, 3),
                "occupancy_lighting_kwh": round(occupied_kwh, 3),
                "weather_hvac_kwh": round(hvac_kwh, 3)
            },
            "context": {
                "is_operating_hours": is_scheduled_operating and not is_weekend,
                "occupancy_ratio": occupancy_ratio,
                "outdoor_temp_c": outdoor_temp_c,
                "cooling_degree_delta": round(cooling_cdd, 1),
                "heating_degree_delta": round(heating_hdd, 1)
            }
        }
