from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models import Meter
from app.schemas import MeterResponse, MeterCreate

router = APIRouter(tags=["Meters"])

@router.get("/buildings/{building_id}/meters", response_model=List[MeterResponse])
async def list_building_meters(building_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Meter).where(Meter.building_id == building_id).order_by(Meter.meter_number)
    )
    return result.scalars().all()

@router.post("/buildings/{building_id}/meters", response_model=MeterResponse)
async def create_meter(building_id: str, payload: MeterCreate, db: AsyncSession = Depends(get_db)):
    meter = Meter(building_id=building_id, **payload.model_dump())
    db.add(meter)
    await db.commit()
    await db.refresh(meter)
    return meter
