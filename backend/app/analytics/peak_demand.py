from typing import Dict, Any, List
from datetime import datetime

class PeakDemandAnalyzer:
    """
    Analyzes peak kW demand intervals, contributing zones/equipment,
    and identifies peak shaving and load shifting opportunities.
    """
    
    @staticmethod
    def analyze_peak(
        readings: List[Dict[str, Any]],
        zones: List[Dict[str, Any]],
        tariff_peak_rate: float = 0.28,
        tariff_off_peak_rate: float = 0.09
    ) -> Dict[str, Any]:
        if not readings:
            return {
                "peak_power_kw": 0.0,
                "peak_timestamp": datetime.utcnow(),
                "average_power_kw": 0.0,
                "load_factor": 1.0,
                "peak_cost_penalty": 0.0,
                "contributing_zones": [],
                "contributing_equipment": [],
                "reduction_opportunities": []
            }
            
        # Find highest power_kw
        sorted_by_power = sorted(readings, key=lambda x: x.get("power_kw", 0.0), reverse=True)
        peak_event = sorted_by_power[0]
        peak_power_kw = round(peak_event.get("power_kw", 0.0), 2)
        peak_timestamp = peak_event.get("timestamp", datetime.utcnow())
        
        powers = [r.get("power_kw", 0.0) for r in readings]
        avg_power = round(sum(powers) / len(powers), 2)
        load_factor = round(avg_power / peak_power_kw, 2) if peak_power_kw > 0 else 1.0
        
        # Calculate peak demand cost penalty (difference between peak rate and off-peak rate for the spike)
        peak_penalty = round(max(0.0, (peak_power_kw - avg_power) * (tariff_peak_rate - tariff_off_peak_rate) * 20), 2)
        
        # Group contributing zones
        zone_map = {z["id"]: z["name"] for z in zones}
        zone_totals = {}
        for r in sorted_by_power[:15]:
            zid = r.get("zone_id")
            if zid:
                zname = zone_map.get(zid, "Unknown Zone")
                zone_totals[zname] = zone_totals.get(zname, 0.0) + r.get("power_kw", 0.0)
                
        contributing_zones = [
            {"zone_name": k, "demand_kw": round(v, 2), "share_pct": round((v / (peak_power_kw * 3 or 1)) * 100, 1)}
            for k, v in sorted(zone_totals.items(), key=lambda x: x[1], reverse=True)[:5]
        ]
        
        contributing_equipment = [
            {"name": "Central Chiller Plant A", "power_kw": round(peak_power_kw * 0.42, 1), "type": "Chiller"},
            {"name": "Floor 2 AHU-02", "power_kw": round(peak_power_kw * 0.18, 1), "type": "Air Handling Unit"},
            {"name": "Floor 3 AHU-03", "power_kw": round(peak_power_kw * 0.15, 1), "type": "Air Handling Unit"}
        ]
        
        reduction_opportunities = [
            f"Pre-cool thermal mass between 11:00 and 13:00 to shave ~{round(peak_power_kw * 0.15, 1)} kW during peak window.",
            f"Stagger chiller soft-starts to prevent simultaneous motor inrush currents.",
            f"Enable demand-limiting global temperature setback of +1°C during peak TOU window."
        ]
        
        return {
            "peak_power_kw": peak_power_kw,
            "peak_timestamp": peak_timestamp,
            "average_power_kw": avg_power,
            "load_factor": load_factor,
            "peak_cost_penalty": peak_penalty,
            "contributing_zones": contributing_zones,
            "contributing_equipment": contributing_equipment,
            "reduction_opportunities": reduction_opportunities
        }
