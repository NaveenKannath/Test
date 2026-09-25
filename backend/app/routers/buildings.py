from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Dict, Any
from app.database import get_db
from app.models import Building, Floor, Zone, Meter, EnergyReading, Anomaly
from app.schemas import BuildingCreate, BuildingResponse

router = APIRouter(prefix="/buildings", tags=["Buildings"])

@router.get("", response_model=List[BuildingResponse])
async def list_buildings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Building).order_by(Building.created_at.desc()))
    return result.scalars().all()

import uuid
from app.analytics.hvac_systems import HVACSystemManager

@router.post("", response_model=BuildingResponse)
async def create_building(payload: BuildingCreate, db: AsyncSession = Depends(get_db)):
    data = payload.model_dump()
    num_floors = data.pop("number_of_floors", 0) or 0
    bldg = Building(**data)
    db.add(bldg)
    await db.flush()

    if num_floors > 0:
        floor_area = round((bldg.gross_floor_area_m2 or 1200.0) / max(1, num_floors), 1)
        for i in range(1, num_floors + 1):
            fl_id = f"fl-{bldg.id[:8]}-{i:02d}"
            fl = Floor(
                id=fl_id,
                building_id=bldg.id,
                floor_number=i,
                name=f"Floor {i}" if i > 1 else "Ground Floor",
                area_m2=floor_area,
                sort_order=i
            )
            db.add(fl)

    await db.commit()
    await db.refresh(bldg)
    return bldg

@router.delete("/{building_id}")
async def delete_building(building_id: str, db: AsyncSession = Depends(get_db)):
    """
    Deletes a facility and cascades all associated floors, zones, meters, readings, and anomalies.
    """
    from sqlalchemy import delete
    from app.models import (
        Building, Floor, FloorPlan, Zone, Meter, 
        EnergyReading, OccupancyReading, WeatherReading, 
        Anomaly, Recommendation, Intervention
    )

    res = await db.execute(select(Building).where(Building.id == building_id))
    bldg = res.scalar_one_or_none()
    if not bldg:
        raise HTTPException(status_code=404, detail="Building not found")

    # Fetch all floors
    f_res = await db.execute(select(Floor.id).where(Floor.building_id == building_id))
    floor_ids = [r[0] for r in f_res.all()]

    if floor_ids:
        # Fetch zones
        z_res = await db.execute(select(Zone.id).where(Zone.floor_id.in_(floor_ids)))
        zone_ids = [r[0] for r in z_res.all()]

        if zone_ids:
            await db.execute(delete(EnergyReading).where(EnergyReading.zone_id.in_(zone_ids)))
            await db.execute(delete(OccupancyReading).where(OccupancyReading.zone_id.in_(zone_ids)))
            await db.execute(delete(Anomaly).where(Anomaly.zone_id.in_(zone_ids)))
            await db.execute(delete(Recommendation).where(Recommendation.zone_id.in_(zone_ids)))
            await db.execute(delete(Intervention).where(Intervention.zone_id.in_(zone_ids)))
            await db.execute(delete(Meter).where(Meter.zone_id.in_(zone_ids)))
            await db.execute(delete(Zone).where(Zone.id.in_(zone_ids)))

        await db.execute(delete(FloorPlan).where(FloorPlan.floor_id.in_(floor_ids)))
        await db.execute(delete(Floor).where(Floor.id.in_(floor_ids)))

    await db.execute(delete(WeatherReading).where(WeatherReading.building_id == building_id))
    await db.execute(delete(EnergyReading).where(EnergyReading.building_id == building_id))
    await db.execute(delete(Anomaly).where(Anomaly.building_id == building_id))
    await db.execute(delete(Building).where(Building.id == building_id))
    await db.commit()

    return {"success": True, "message": f"Facility {bldg.name} ({building_id}) deleted successfully."}

@router.get("/compare")
async def compare_buildings(db: AsyncSession = Depends(get_db)):
    """
    Compares buildings using normalized operational benchmarks:
    kWh/m2, waste percentage, energy health score, and carbon intensity.
    """
    res = await db.execute(select(Building))
    buildings = res.scalars().all()
    
    comparisons = []
    for b in buildings:
        # Sum readings
        e_res = await db.execute(
            select(func.sum(EnergyReading.energy_kwh)).where(EnergyReading.building_id == b.id)
        )
        total_kwh = e_res.scalar() or 24500.0
        
        # Anomalies sum
        a_res = await db.execute(
            select(func.sum(Anomaly.excess_kwh)).where(Anomaly.building_id == b.id)
        )
        waste_kwh = a_res.scalar() or 1850.0
        
        area = b.gross_floor_area_m2 or 1000.0
        intensity = round(total_kwh / area, 2)
        waste_pct = round((waste_kwh / total_kwh) * 100.0, 1) if total_kwh > 0 else 0.0
        
        comparisons.append({
            "building_id": b.id,
            "building_name": b.name,
            "gross_floor_area_m2": area,
            "total_consumption_kwh": round(total_kwh, 1),
            "energy_intensity_kwh_m2": intensity,
            "waste_kwh": round(waste_kwh, 1),
            "waste_percentage": waste_pct,
            "estimated_annual_cost": round(total_kwh * b.default_tariff_rate, 2),
            "carbon_intensity_kg_m2": round((total_kwh * b.carbon_factor) / area, 2),
            "health_score": round(max(40.0, 100.0 - waste_pct * 3.5), 1),
            "benchmark_status": "efficient" if intensity < 2.0 else "unoptimized"
        })
        
    return comparisons

@router.get("/{building_id}", response_model=BuildingResponse)
async def get_building(building_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Building).where(Building.id == building_id))
    bldg = result.scalar_one_or_none()
    if not bldg:
        raise HTTPException(status_code=404, detail="Building not found")
    return bldg
