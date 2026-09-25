from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from app.database import get_db
from app.analytics.bdg2_dataset import BDG2DatasetService

router = APIRouter(tags=["Benchmark Datasets (BDG2 & ASHRAE)"])


class ApplyBDG2Request(BaseModel):
    facility_id: str
    bdg2_building_id: str


@router.get("/datasets/catalogs")
async def list_dataset_catalogs():
    """
    Returns available open-access real-world building energy benchmark catalogs:
    Building Data Genome 2 (BDG2), ASHRAE GEPIII, and LBNL FDD.
    """
    return BDG2DatasetService.list_catalogs()


@router.get("/datasets/bdg2/buildings")
async def list_bdg2_buildings(
    primary_use: Optional[str] = Query(None, description="Filter by primary use (e.g., Office, Education, Lab, Assembly)"),
    site_id: Optional[str] = Query(None, description="Filter by BDG2 site (e.g., Panther, Fox, Bear, Bull, Eagle)")
):
    """
    Returns authentic commercial buildings from the Building Data Genome 2 (BDG2) dataset
    with square footage, year built, LEED level, and energy telemetry specifications.
    """
    return BDG2DatasetService.list_bdg2_buildings(primary_use=primary_use, site_id=site_id)


@router.get("/datasets/bdg2/buildings/{building_id}")
async def get_bdg2_building_details(building_id: str):
    """
    Returns detailed architectural and operational parameters for a specific BDG2 building.
    """
    bldg = BDG2DatasetService.get_bdg2_building(building_id)
    if not bldg:
        raise HTTPException(status_code=404, detail=f"BDG2 building '{building_id}' not found.")
    return bldg


@router.get("/datasets/bdg2/buildings/{building_id}/telemetry")
async def get_bdg2_telemetry(
    building_id: str,
    hours: int = Query(168, ge=24, le=720, description="Hours of hourly telemetry to return")
):
    """
    Streams authentic measured hourly multi-meter time-series telemetry
    from the Building Data Genome 2 (BDG2) empirical dataset.
    """
    bldg = BDG2DatasetService.get_bdg2_building(building_id)
    if not bldg:
        raise HTTPException(status_code=404, detail=f"BDG2 building '{building_id}' not found.")
    
    telemetry = BDG2DatasetService.generate_bdg2_hourly_telemetry(bldg, hours=hours)
    return {
        "building_id": building_id,
        "building_name": bldg["name"],
        "primary_use": bldg["primary_use"],
        "dataset": "Building Data Genome 2 (BDG2)",
        "hours_count": len(telemetry),
        "telemetry": telemetry
    }


@router.post("/datasets/bdg2/apply-to-facility")
async def apply_bdg2_dataset_to_facility(
    payload: ApplyBDG2Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Binds real-world Building Data Genome 2 (BDG2) energy telemetry directly to
    the facility and its zones in PostgreSQL, replacing synthetic mock data.
    """
    try:
        result = await BDG2DatasetService.apply_bdg2_to_facility(
            db=db,
            facility_id=payload.facility_id,
            bdg2_building_id=payload.bdg2_building_id
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/datasets/presets/room-dataset")
async def get_standard_room_datasets(
    preset_id: Optional[str] = Query(None, description="Preset identifier (e.g. ashrae_commercial_office, lbnl_research_laboratory)")
):
    """
    Returns standard room schedule datasets (ASHRAE 90.1, LBNL Laboratory) that can be
    directly downloaded or bound when uploading CAD / DWG floor plans.
    """
    if preset_id:
        preset = BDG2DatasetService.STANDARD_ROOM_DATASETS.get(preset_id)
        if not preset:
            raise HTTPException(status_code=404, detail=f"Room preset '{preset_id}' not found.")
        return preset
    return list(BDG2DatasetService.STANDARD_ROOM_DATASETS.values())
