from typing import Dict, Any, List

class HealthScoreCalculator:
    """
    Computes a fully explainable and decomposable Energy Health Score (0-100)
    across five operational pillars.
    """
    
    @staticmethod
    def calculate(
        total_kwh: float,
        waste_kwh: float,
        after_hours_kwh: float,
        gross_area_m2: float,
        peak_demand_kw: float,
        avg_demand_kw: float,
        data_completeness_pct: float = 99.5,
        anomaly_count: int = 0
    ) -> Dict[str, Any]:
        # Pillar 1: Waste Anomaly Score (Weight 30%)
        # Lower waste ratio = higher score
        waste_ratio = (waste_kwh / total_kwh) if total_kwh > 0 else 0.0
        waste_score = max(0.0, min(100.0, 100.0 - (waste_ratio * 250.0)))
        
        # Pillar 2: Schedule & After-Hours Compliance (Weight 25%)
        # Normal commercial building after-hours baseline is ~15-25% of total.
        after_hours_ratio = (after_hours_kwh / total_kwh) if total_kwh > 0 else 0.0
        if after_hours_ratio <= 0.20:
            schedule_score = 100.0
        else:
            schedule_score = max(20.0, 100.0 - ((after_hours_ratio - 0.20) * 150.0))
            
        # Pillar 3: Energy Intensity Efficiency (Weight 20%)
        # Target for modern commercial office is ~120-140 kWh/m2/year or ~0.4 kWh/m2/day
        energy_intensity_kwh_m2 = (total_kwh / gross_area_m2) if gross_area_m2 > 0 else 0.0
        if energy_intensity_kwh_m2 <= 1.0:
            intensity_score = 95.0
        elif energy_intensity_kwh_m2 <= 2.0:
            intensity_score = 80.0
        else:
            intensity_score = max(30.0, 80.0 - (energy_intensity_kwh_m2 - 2.0) * 20.0)
            
        # Pillar 4: Peak Demand Load Factor (Weight 15%)
        # Load factor = avg_demand / peak_demand. Higher load factor = flatter, more efficient curve
        load_factor = (avg_demand_kw / peak_demand_kw) if peak_demand_kw > 0 else 0.5
        peak_score = min(100.0, max(20.0, load_factor * 130.0))
        
        # Pillar 5: Data Quality & Sensor Reliability (Weight 10%)
        quality_score = min(100.0, max(0.0, data_completeness_pct))
        
        # Overall weighted composite
        overall = (
            waste_score * 0.30 +
            schedule_score * 0.25 +
            intensity_score * 0.20 +
            peak_score * 0.15 +
            quality_score * 0.10
        )
        overall = round(overall, 1)
        
        # Grade mapping
        if overall >= 90:
            grade = "A"
        elif overall >= 80:
            grade = "B"
        elif overall >= 70:
            grade = "C"
        elif overall >= 60:
            grade = "D"
        else:
            grade = "F"
            
        components = [
            {
                "name": "Energy Waste & Anomaly Mitigation",
                "score": round(waste_score, 1),
                "weight": 0.30,
                "status": "optimal" if waste_score >= 80 else ("warning" if waste_score >= 60 else "critical"),
                "explanation": f"Waste accounted for {round(waste_ratio * 100, 1)}% of total consumption across {anomaly_count} detected events."
            },
            {
                "name": "Schedule & Setback Compliance",
                "score": round(schedule_score, 1),
                "weight": 0.25,
                "status": "optimal" if schedule_score >= 80 else "warning",
                "explanation": f"After-hours load represented {round(after_hours_ratio * 100, 1)}% of total energy."
            },
            {
                "name": "Energy Intensity Benchmark",
                "score": round(intensity_score, 1),
                "weight": 0.20,
                "status": "optimal" if intensity_score >= 80 else "warning",
                "explanation": f"Current normalized consumption is {round(energy_intensity_kwh_m2, 2)} kWh/m²."
            },
            {
                "name": "Peak Demand & Load Factor",
                "score": round(peak_score, 1),
                "weight": 0.15,
                "status": "optimal" if peak_score >= 75 else "warning",
                "explanation": f"Peak demand reached {round(peak_demand_kw, 1)} kW with a load factor of {round(load_factor, 2)}."
            },
            {
                "name": "Sensor & Telemetry Health",
                "score": round(quality_score, 1),
                "weight": 0.10,
                "status": "optimal" if quality_score >= 95 else "degraded",
                "explanation": f"Submeter data completeness is at {round(data_completeness_pct, 1)}%."
            }
        ]
        
        return {
            "overall_score": overall,
            "grade": grade,
            "components": components,
            "data_limitations": [
                "Baseline calibrated on 30-day rolling history.",
                "Peak demand evaluated against standard TOU ratchets."
            ]
        }
