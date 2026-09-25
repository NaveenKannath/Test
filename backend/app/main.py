import sys
from pathlib import Path

# Ensure backend root is in sys.path regardless of execution directory
_backend_root = str(Path(__file__).resolve().parent.parent)
if _backend_root not in sys.path:
    sys.path.insert(0, _backend_root)

import time
import uuid
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.config import settings
from app.routers import (
    health_router,
    buildings_router,
    floors_router,
    zones_router,
    meters_router,
    equipment_router,
    telemetry_router,
    analytics_router,
    anomalies_router,
    recommendations_router,
    interventions_router,
    ai_router,
    reports_router,
    hvac_router,
    datasets_router
)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Nexyra - Autonomous AI Commercial Building Energy Forensics Platform. 'Don't just monitor energy. Investigate it.'",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request ID & Performance Timing Middleware
@app.middleware("http")
async def add_request_id_and_timing(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    return response

# Standardized Error Handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "code": "VALIDATION_ERROR",
            "message": "The request payload failed structural validation.",
            "details": exc.errors(),
            "request_id": req_id
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "code": "INTERNAL_SERVER_ERROR",
            "message": str(exc) if settings.DEBUG else "An unexpected internal server error occurred.",
            "details": {},
            "request_id": req_id
        }
    )

# Include all API v1 Routers
api_v1_prefix = "/api/v1"

app.include_router(health_router, prefix=api_v1_prefix)
app.include_router(buildings_router, prefix=api_v1_prefix)
app.include_router(floors_router, prefix=api_v1_prefix)
app.include_router(zones_router, prefix=api_v1_prefix)
app.include_router(meters_router, prefix=api_v1_prefix)
app.include_router(equipment_router, prefix=api_v1_prefix)
app.include_router(telemetry_router, prefix=api_v1_prefix)
app.include_router(analytics_router, prefix=api_v1_prefix)
app.include_router(anomalies_router, prefix=api_v1_prefix)
app.include_router(recommendations_router, prefix=api_v1_prefix)
app.include_router(interventions_router, prefix=api_v1_prefix)
app.include_router(ai_router, prefix=api_v1_prefix)
app.include_router(reports_router, prefix=api_v1_prefix)
app.include_router(hvac_router, prefix=api_v1_prefix)
app.include_router(datasets_router, prefix=api_v1_prefix)

@app.get("/")
async def root():
    return {
        "service": "Nexyra AI Energy Detective API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "api_v1": "/api/v1"
    }
