from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models import Equipment
from app.schemas import EquipmentResponse, EquipmentCreate

router = APIRouter(tags=["Equipment"])

@router.get("/buildings/{building_id}/equipment", response_model=List[EquipmentResponse])
async def list_building_equipment(building_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Equipment).where(Equipment.building_id == building_id).order_by(Equipment.name)
    )
    return result.scalars().all()

@router.post("/buildings/{building_id}/equipment", response_model=EquipmentResponse)
async def create_equipment(building_id: str, payload: EquipmentCreate, db: AsyncSession = Depends(get_db)):
    equipment = Equipment(building_id=building_id, **payload.model_dump())
    db.add(equipment)
    await db.commit()
    await db.refresh(equipment)
    return equipment
