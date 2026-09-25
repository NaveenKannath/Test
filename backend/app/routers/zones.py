from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Dict, Any
from app.database import get_db
from app.models import Zone, Floor, EnergyReading, Anomaly
from app.schemas import ZoneResponse, ZoneUpdate, ZoneEnergyState

router = APIRouter(tags=["Zones"])

@router.get("/zones/{zone_id}", response_model=ZoneResponse)
async def get_zone(zone_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Zone).where(Zone.id == zone_id))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return zone

@router.patch("/zones/{zone_id}", response_model=ZoneResponse)
async def update_zone(zone_id: str, payload: ZoneUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Zone).where(Zone.id == zone_id))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
        
    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(zone, k, v)
        
    await db.commit()
    await db.refresh(zone)
    return zone

@router.get("/floors/{floor_id}/zones/states", response_model=List[ZoneEnergyState])
async def get_floor_zone_energy_states(floor_id: str, db: AsyncSession = Depends(get_db)):
    """
    Returns real-time and aggregated energy state for every zone on the floor,
    including current power, active anomalies, waste cost, and semantic status
    (normal, elevated, anomaly, critical) for visual floor-plan rendering.
    """
    f_res = await db.execute(select(Floor).where(Floor.id == floor_id))
    floor = f_res.scalar_one_or_none()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")
        
    z_res = await db.execute(select(Zone).where(Zone.floor_id == floor_id))
    zones = z_res.scalars().all()
    
    zone_states = []
    for z in zones:
        # Get latest power and total energy
        e_res = await db.execute(
            select(EnergyReading)
            .where(EnergyReading.zone_id == z.id)
            .order_by(EnergyReading.timestamp.desc())
            .limit(1)
        )
        latest_reading = e_res.scalar_one_or_none()
        current_kw = latest_reading.power_kw if latest_reading else 2.1
        
        # Total energy sum
        sum_res = await db.execute(
            select(func.sum(EnergyReading.energy_kwh)).where(EnergyReading.zone_id == z.id)
        )
        total_kwh = sum_res.scalar() or (z.area_m2 * 2.8)
        
        # Active anomalies
        anom_res = await db.execute(
            select(Anomaly).where(Anomaly.zone_id == z.id, Anomaly.status.in_(["open", "investigating"]))
        )
        anomalies = anom_res.scalars().all()
        anom_count = len(anomalies)
        
        waste_kwh = sum(a.excess_kwh for a in anomalies)
        waste_cost = sum(a.estimated_cost for a in anomalies)
        
        # Semantic status calculation
        if any(a.severity == "critical" for a in anomalies):
            status = "critical"
        elif anom_count > 0:
            status = "anomaly"
        elif current_kw > (z.area_m2 * 0.045):
            status = "elevated"
        else:
            status = "normal"
            
        intensity = round(total_kwh / z.area_m2, 2) if z.area_m2 > 0 else 0.0
        expected_kwh = round(total_kwh - waste_kwh, 2)
        
        zone_states.append(ZoneEnergyState(
            zone_id=z.id,
            zone_name=z.name,
            zone_type=z.zone_type,
            floor_id=floor.id,
            floor_name=floor.name,
            area_m2=z.area_m2,
            polygon_coordinates=z.polygon_coordinates or [],
            current_power_kw=round(current_kw, 2),
            total_energy_kwh=round(total_kwh, 1),
            expected_energy_kwh=round(expected_kwh, 1),
            energy_intensity_kwh_m2=intensity,
            status=status,
            active_anomalies_count=anom_count,
            waste_kwh=round(waste_kwh, 1),
            waste_cost=round(waste_cost, 2)
        ))
        
    return zone_states
