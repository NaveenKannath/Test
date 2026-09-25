from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.database import get_db
from app.models import EnergyReading, OccupancyReading, WeatherReading, OperatingSchedule
from app.schemas import (
    EnergyImportRequest, EnergyImportResponse, EnergyTimeseriesPoint,
    OperatingScheduleResponse, OperatingScheduleCreate
)

router = APIRouter(tags=["Telemetry & Schedules"])

# ==================== Energy ====================
@router.post("/buildings/{building_id}/energy/import", response_model=EnergyImportResponse)
async def import_energy_readings(
    building_id: str,
    payload: EnergyImportRequest,
    db: AsyncSession = Depends(get_db)
):
    total = len(payload.readings)
    accepted = 0
    rejected = 0
    duplicates = 0
    invalid = 0
    warnings = []
    
    seen_timestamps = set()
    records_to_insert = []
    
    for r in payload.readings:
        # Validate negative energy
        if r.energy_kwh < 0 or r.power_kw < 0:
            invalid += 1
            rejected += 1
            warnings.append(f"Rejected negative energy reading at {r.timestamp}")
            continue
            
        # Validate impossible spike (> 500 kW for submeter)
        if r.power_kw > 500.0:
            invalid += 1
            rejected += 1
            warnings.append(f"Rejected impossible power spike ({r.power_kw} kW) at {r.timestamp}")
            continue
            
        key = (r.zone_id, r.timestamp)
        if key in seen_timestamps:
            duplicates += 1
            rejected += 1
            continue
        seen_timestamps.add(key)
        
        is_weekend = r.timestamp.weekday() >= 5
        is_after_hours = is_weekend or (r.timestamp.hour < 8 or r.timestamp.hour >= 18)
        
        reading = EnergyReading(
            building_id=building_id,
            zone_id=r.zone_id,
            meter_id=r.meter_id,
            timestamp=r.timestamp,
            energy_kwh=r.energy_kwh,
            power_kw=r.power_kw,
            quality_status=r.quality_status,
            is_after_hours=is_after_hours,
            is_weekend=is_weekend
        )
        records_to_insert.append(reading)
        accepted += 1
        
    if records_to_insert:
        db.add_all(records_to_insert)
        await db.commit()
        
    return EnergyImportResponse(
        total_received=total,
        rows_accepted=accepted,
        rows_rejected=rejected,
        duplicate_rows=duplicates,
        invalid_rows=invalid,
        warnings=warnings[:10]
    )

@router.get("/buildings/{building_id}/energy", response_model=List[EnergyTimeseriesPoint])
async def get_energy_timeseries(
    building_id: str,
    zone_id: Optional[str] = None,
    limit: int = Query(168, le=1000),  # default 7 days of hourly points
    db: AsyncSession = Depends(get_db)
):
    query = select(EnergyReading).where(EnergyReading.building_id == building_id)
    if zone_id:
        query = query.where(EnergyReading.zone_id == zone_id)
    query = query.order_by(EnergyReading.timestamp.desc()).limit(limit)
    
    result = await db.execute(query)
    readings = list(reversed(result.scalars().all()))
    
    # Format points with expected baseline
    points = []
    for r in readings:
        expected = round(r.energy_kwh * 0.78, 2) if r.is_after_hours and r.energy_kwh > 4.0 else round(r.energy_kwh * 0.95, 2)
        is_anom = (r.is_after_hours and r.energy_kwh > 6.0)
        points.append(EnergyTimeseriesPoint(
            timestamp=r.timestamp,
            actual_kwh=round(r.energy_kwh, 2),
            expected_kwh=expected,
            power_kw=round(r.power_kw, 2),
            is_after_hours=r.is_after_hours,
            is_weekend=r.is_weekend,
            is_anomaly=is_anom
        ))
    return points

# ==================== Occupancy ====================
@router.post("/buildings/{building_id}/occupancy/import")
async def import_occupancy(
    building_id: str,
    readings: List[Dict[str, Any]],
    db: AsyncSession = Depends(get_db)
):
    objs = [
        OccupancyReading(
            building_id=building_id,
            zone_id=r["zone_id"],
            timestamp=datetime.fromisoformat(r["timestamp"]),
            occupancy_count=r.get("occupancy_count", 0),
            occupancy_ratio=r.get("occupancy_ratio", 0.0),
            capacity=r.get("capacity", 10)
        )
        for r in readings
    ]
    db.add_all(objs)
    await db.commit()
    return {"status": "success", "imported": len(objs)}

@router.get("/buildings/{building_id}/occupancy")
async def get_occupancy(
    building_id: str,
    zone_id: Optional[str] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    query = select(OccupancyReading).where(OccupancyReading.building_id == building_id)
    if zone_id:
        query = query.where(OccupancyReading.zone_id == zone_id)
    query = query.order_by(OccupancyReading.timestamp.desc()).limit(limit)
    res = await db.execute(query)
    readings = res.scalars().all()
    return [
        {
            "timestamp": r.timestamp.isoformat(),
            "occupancy_count": r.occupancy_count,
            "occupancy_ratio": r.occupancy_ratio,
            "capacity": r.capacity,
            "zone_id": r.zone_id
        }
        for r in readings
    ]

# ==================== Weather ====================
@router.post("/buildings/{building_id}/weather/import")
async def import_weather(
    building_id: str,
    readings: List[Dict[str, Any]],
    db: AsyncSession = Depends(get_db)
):
    objs = [
        WeatherReading(
            building_id=building_id,
            timestamp=datetime.fromisoformat(r["timestamp"]),
            outdoor_temperature_c=r["outdoor_temperature_c"],
            outdoor_humidity_pct=r.get("outdoor_humidity_pct", 50.0),
            cooling_degree_days=max(0.0, r["outdoor_temperature_c"] - 22.0),
            heating_degree_days=max(0.0, 16.0 - r["outdoor_temperature_c"]),
            source=r.get("source", "Campus Station")
        )
        for r in readings
    ]
    db.add_all(objs)
    await db.commit()
    return {"status": "success", "imported": len(objs)}

@router.get("/buildings/{building_id}/weather")
async def get_weather(building_id: str, limit: int = 168, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(WeatherReading)
        .where(WeatherReading.building_id == building_id)
        .order_by(WeatherReading.timestamp.desc())
        .limit(limit)
    )
    readings = list(reversed(res.scalars().all()))
    return [
        {
            "timestamp": r.timestamp.isoformat(),
            "outdoor_temperature_c": r.outdoor_temperature_c,
            "outdoor_humidity_pct": r.outdoor_humidity_pct,
            "cooling_degree_days": r.cooling_degree_days,
            "heating_degree_days": r.heating_degree_days,
            "source": r.source
        }
        for r in readings
    ]

# ==================== Schedules ====================
@router.get("/buildings/{building_id}/schedules", response_model=List[OperatingScheduleResponse])
async def list_schedules(building_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(OperatingSchedule).where(OperatingSchedule.building_id == building_id))
    return res.scalars().all()

@router.post("/buildings/{building_id}/schedules", response_model=OperatingScheduleResponse)
async def create_schedule(
    building_id: str,
    payload: OperatingScheduleCreate,
    db: AsyncSession = Depends(get_db)
):
    sched = OperatingSchedule(building_id=building_id, **payload.model_dump())
    db.add(sched)
    await db.commit()
    await db.refresh(sched)
    return sched
