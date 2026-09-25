from app.routers.health import router as health_router
from app.routers.buildings import router as buildings_router
from app.routers.floors import router as floors_router
from app.routers.zones import router as zones_router
from app.routers.meters import router as meters_router
from app.routers.equipment import router as equipment_router
from app.routers.telemetry import router as telemetry_router
from app.routers.analytics import router as analytics_router
from app.routers.anomalies import router as anomalies_router
from app.routers.recommendations import router as recommendations_router
from app.routers.interventions import router as interventions_router
from app.routers.ai import router as ai_router
from app.routers.reports import router as reports_router
from app.routers.hvac import router as hvac_router
from app.routers.datasets import router as datasets_router
from app.routers.auth import router as auth_router

__all__ = [
    "health_router",
    "buildings_router",
    "floors_router",
    "zones_router",
    "meters_router",
    "equipment_router",
    "telemetry_router",
    "analytics_router",
    "anomalies_router",
    "recommendations_router",
    "interventions_router",
    "ai_router",
    "reports_router",
    "hvac_router",
    "datasets_router",
    "auth_router"
]

