from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models import Building
from app.analytics.hvac_systems import HVACSystemManager

router = APIRouter(tags=["Interchangeable HVAC Systems"])

class ApplyHVACRequest(BaseModel):
    system_type: str
    floor_id: Optional[str] = None

@router.get("/buildings/{building_id}/hvac-systems")
async def list_building_hvac_systems(
    building_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns available interchangeable HVAC system profiles and current active status.
    """
    b_res = await db.execute(select(Building).where(Building.id == building_id))
    bldg = b_res.scalar_one_or_none()
    active_sys = "chilled_water_vav"
    if bldg and bldg.metadata_json:
        active_sys = bldg.metadata_json.get("active_hvac_system", "chilled_water_vav")
    
    return HVACSystemManager.list_available_systems(active_system_id=active_sys)

@router.post("/buildings/{building_id}/hvac-system")
async def apply_building_hvac_system(
    building_id: str,
    payload: ApplyHVACRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Interchangeably swaps the active HVAC dataset on the facility,
    regenerating all submeter load profiles and forensic anomalies.
    """
    try:
        result = await HVACSystemManager.apply_hvac_system_dataset(
            db=db,
            building_id=building_id,
            system_type=payload.system_type,
            floor_id=payload.floor_id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
