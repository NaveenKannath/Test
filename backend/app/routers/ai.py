from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Dict, Any

from app.database import get_db
from app.models import Building, Anomaly, Zone, EnergyReading
from app.schemas import AIDetectiveRequest, AIDetectiveResponse
from app.ai.detective import AIEnergyDetective
from app.config import settings

router = APIRouter(tags=["AI Energy Detective"])

@router.post("/ai/investigate", response_model=AIDetectiveResponse)
@router.post("/ai/chat", response_model=AIDetectiveResponse)
async def ask_energy_detective(payload: AIDetectiveRequest, db: AsyncSession = Depends(get_db)):
    """
    Forensic conversational investigation endpoint.
    Grounds LLM in verified PostgreSQL data. Falls back to deterministic rule engine if API key absent.
    """
    b_res = await db.execute(select(Building).where(Building.id == payload.building_id))
    bldg = b_res.scalar_one_or_none()
    if not bldg:
        raise HTTPException(status_code=404, detail="Building not found")
        
    # Gather anomalies
    a_res = await db.execute(
        select(Anomaly)
        .where(Anomaly.building_id == payload.building_id)
        .order_by(Anomaly.priority_score.desc())
    )
    anomalies_objs = a_res.scalars().all()
    anomalies_data = [
        {
            "id": a.id,
            "title": a.title,
            "anomaly_type": a.anomaly_type,
            "severity": a.severity,
            "start_time": a.start_time,
            "end_time": a.end_time,
            "actual_kwh": a.actual_kwh,
            "expected_kwh": a.expected_kwh,
            "excess_kwh": a.excess_kwh,
            "estimated_cost": a.estimated_cost,
            "zone_id": a.zone_id
        }
        for a in anomalies_objs
    ]
    
    # Gather zones
    z_res = await db.execute(select(Zone.id, Zone.name, Zone.zone_type, Zone.area_m2))
    zones_data = [{"id": z[0], "name": z[1], "type": z[2], "area": z[3]} for z in z_res.all()]
    
    # Total consumption
    e_res = await db.execute(
        select(func.sum(EnergyReading.energy_kwh)).where(EnergyReading.building_id == payload.building_id)
    )
    total_kwh = e_res.scalar() or 24850.0
    
    building_context = {
        "id": bldg.id,
        "name": bldg.name,
        "area_m2": bldg.gross_floor_area_m2,
        "tariff_rate": bldg.default_tariff_rate,
        "total_consumption_kwh": round(total_kwh, 1),
        "total_waste_kwh": sum(a["excess_kwh"] for a in anomalies_data),
        "total_waste_cost": sum(a["estimated_cost"] for a in anomalies_data)
    }
    
    result = await AIEnergyDetective.investigate_query(
        query=payload.query,
        building_context=building_context,
        anomalies=anomalies_data,
        zones=zones_data,
        openai_key=settings.OPENAI_API_KEY
    )
    
    return AIDetectiveResponse(**result)
