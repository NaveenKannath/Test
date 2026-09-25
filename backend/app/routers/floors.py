from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Dict, Any, Optional
from app.database import get_db
from app.models import Building, Floor, FloorPlan, Zone
from app.schemas import FloorResponse, FloorCreate, FloorPlanResponse, ZoneResponse

router = APIRouter(tags=["Floors & Floor Plans"])

@router.get("/buildings/{building_id}/floors", response_model=List[FloorResponse])
async def list_building_floors(building_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Floor)
        .options(selectinload(Floor.floor_plan))
        .where(Floor.building_id == building_id)
        .order_by(Floor.floor_number)
    )
    return result.scalars().all()

@router.post("/buildings/{building_id}/floors", response_model=FloorResponse)
async def create_floor(building_id: str, payload: FloorCreate, db: AsyncSession = Depends(get_db)):
    floor = Floor(building_id=building_id, **payload.model_dump())
    db.add(floor)
    await db.commit()
    await db.refresh(floor)
    return floor

@router.get("/floors/{floor_id}", response_model=FloorResponse)
async def get_floor(floor_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Floor).options(selectinload(Floor.floor_plan)).where(Floor.id == floor_id)
    )
    floor = result.scalar_one_or_none()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")
    return floor

@router.post("/floors/{floor_id}/floor-plan", response_model=FloorPlanResponse)
async def set_floor_plan(floor_id: str, payload: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(FloorPlan).where(FloorPlan.floor_id == floor_id))
    fp = existing.scalar_one_or_none()
    if fp:
        fp.image_url = payload.get("image_url", fp.image_url)
        fp.width = payload.get("width", fp.width)
        fp.height = payload.get("height", fp.height)
        fp.status = payload.get("status", fp.status)
        fp.metadata_json = payload.get("metadata_json", fp.metadata_json)
    else:
        fp = FloorPlan(
            floor_id=floor_id,
            image_url=payload.get("image_url", "/floorplans/default.svg"),
            width=payload.get("width", 1000.0),
            height=payload.get("height", 700.0),
            status=payload.get("status", "active"),
            metadata_json=payload.get("metadata_json", {})
        )
        db.add(fp)
    await db.commit()
    await db.refresh(fp)
    return fp

@router.get("/floor-plans/{floor_plan_id}", response_model=FloorPlanResponse)
async def get_floor_plan(floor_plan_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FloorPlan).where(FloorPlan.id == floor_plan_id))
    fp = result.scalar_one_or_none()
    if not fp:
        raise HTTPException(status_code=404, detail="Floor plan not found")
    return fp

@router.get("/floors/{floor_id}/zones", response_model=List[ZoneResponse])
async def list_floor_zones(floor_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Zone).where(Zone.floor_id == floor_id).order_by(Zone.name)
    )
    return result.scalars().all()


from pydantic import BaseModel

class FloorPlanRecognizeRequest(BaseModel):
    building_id: str
    floor_name: Optional[str] = None
    floor_number: Optional[int] = 1
    image_base64: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    rooms_dataset: Optional[List[Dict[str, Any]]] = None
    csv_content: Optional[str] = None

from app.ai.floor_plan_analyzer import AIFloorPlanRecognizer

@router.post("/floors/recognize-rooms")
async def recognize_and_import_floor_plan(
    payload: FloorPlanRecognizeRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    AI Floor Plan Vision & Room Segmentation:
    Recognizes rooms from the user-provided CSV/JSON dataset,
    maps them to 2D polygon coordinates, and commits live telemetry to PostgreSQL.
    The uploaded file (DWG/PNG/etc) is stored for display; room segmentation
    is driven entirely by the user-supplied room dataset.
    """
    try:
        result = await AIFloorPlanRecognizer.process_and_persist_floor(
            db=db,
            building_id=payload.building_id,
            floor_name=payload.floor_name or f"Floor {payload.floor_number or 1}",
            floor_number=payload.floor_number or 1,
            image_data=payload.image_base64,
            file_name=payload.file_name,
            file_type=payload.file_type,
            custom_dataset=payload.rooms_dataset,
            csv_content=payload.csv_content
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

