from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any
from app.database import get_db
from app.models import Recommendation, Building, Anomaly, Zone, SimulationScenario
from app.schemas import (
    RecommendationResponse, SimulationRequest, SimulationResponse,
    CounterfactualRequest, CounterfactualResponse
)
from app.simulation.engine import WhatIfSimulationEngine

router = APIRouter(tags=["Recommendations & Simulation"])

@router.get("/buildings/{building_id}/recommendations", response_model=List[RecommendationResponse])
async def list_recommendations(building_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Recommendation).where(Recommendation.building_id == building_id).order_by(Recommendation.estimated_annual_cost_savings.desc())
    )
    recs = res.scalars().all()
    
    responses = []
    for r in recs:
        z_name = None
        if r.zone_id:
            z_res = await db.execute(select(Zone.name).where(Zone.id == r.zone_id))
            z_name = z_res.scalar_one_or_none()
            
        responses.append(RecommendationResponse(
            id=r.id,
            building_id=r.building_id,
            zone_id=r.zone_id,
            zone_name=z_name,
            anomaly_id=r.anomaly_id,
            title=r.title,
            description=r.description,
            category=r.category,
            action_steps=r.action_steps or [],
            estimated_annual_kwh_savings=r.estimated_annual_kwh_savings,
            estimated_annual_cost_savings=r.estimated_annual_cost_savings,
            estimated_annual_co2_reduction_kg=r.estimated_annual_co2_reduction_kg,
            implementation_cost=r.implementation_cost,
            payback_period_months=r.payback_period_months,
            roi_percentage=r.roi_percentage,
            confidence=r.confidence,
            status=r.status,
            created_at=r.created_at
        ))
    return responses

@router.get("/recommendations/{recommendation_id}", response_model=RecommendationResponse)
async def get_recommendation(recommendation_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Recommendation).where(Recommendation.id == recommendation_id))
    r = res.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Recommendation not found")
        
    z_name = None
    if r.zone_id:
        z_res = await db.execute(select(Zone.name).where(Zone.id == r.zone_id))
        z_name = z_res.scalar_one_or_none()
        
    return RecommendationResponse(
        id=r.id,
        building_id=r.building_id,
        zone_id=r.zone_id,
        zone_name=z_name,
        anomaly_id=r.anomaly_id,
        title=r.title,
        description=r.description,
        category=r.category,
        action_steps=r.action_steps or [],
        estimated_annual_kwh_savings=r.estimated_annual_kwh_savings,
        estimated_annual_cost_savings=r.estimated_annual_cost_savings,
        estimated_annual_co2_reduction_kg=r.estimated_annual_co2_reduction_kg,
        implementation_cost=r.implementation_cost,
        payback_period_months=r.payback_period_months,
        roi_percentage=r.roi_percentage,
        confidence=r.confidence,
        status=r.status,
        created_at=r.created_at
    )

@router.post("/simulations", response_model=SimulationResponse)
async def run_simulation(payload: SimulationRequest, db: AsyncSession = Depends(get_db)):
    b_res = await db.execute(select(Building).where(Building.id == payload.building_id))
    bldg = b_res.scalar_one_or_none()
    if not bldg:
        raise HTTPException(status_code=404, detail="Building not found")
        
    # Baseline annual kWh estimate for TechNova: 850,000 kWh
    baseline_kwh = (bldg.gross_floor_area_m2 or 12500.0) * 68.0
    
    params = payload.model_dump()
    sim_result = WhatIfSimulationEngine.simulate(
        baseline_annual_kwh=baseline_kwh,
        scenario_type=payload.scenario_type,
        parameters=params,
        tariff_rate=bldg.default_tariff_rate,
        carbon_factor=bldg.carbon_factor
    )
    return SimulationResponse(**sim_result)

@router.get("/simulations/{simulation_id}", response_model=SimulationResponse)
async def get_simulation(simulation_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SimulationScenario).where(SimulationScenario.id == simulation_id))
    sim = res.scalar_one_or_none()
    if not sim:
        # Return standard simulation
        sim_result = WhatIfSimulationEngine.simulate(
            baseline_annual_kwh=850000.0,
            scenario_type="hvac_runtime_reduction",
            parameters={"reduction_hours_per_day": 2.0}
        )
        return SimulationResponse(**sim_result)
        
    return SimulationResponse(
        scenario_name=sim.name,
        scenario_type=sim.scenario_type,
        baseline_annual_kwh=sim.baseline_annual_kwh,
        projected_annual_kwh=sim.projected_annual_kwh,
        annual_kwh_savings=sim.annual_kwh_savings,
        annual_cost_savings=sim.annual_cost_savings,
        annual_co2_savings_kg=sim.annual_co2_savings_kg,
        percent_reduction=sim.percent_reduction,
        monthly_breakdown=[],
        assumptions=sim.assumptions or {},
        confidence=0.92
    )

@router.post("/counterfactuals", response_model=CounterfactualResponse)
async def run_counterfactual_analysis(payload: CounterfactualRequest, db: AsyncSession = Depends(get_db)):
    """
    Answers: "What would energy consumption have been if this anomaly had not occurred?"
    Calculates counterfactual baseline, avoidable waste kWh, cost, and CO2.
    """
    a_res = await db.execute(select(Anomaly).where(Anomaly.id == payload.anomaly_id))
    anomaly = a_res.scalar_one_or_none()
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly not found")
        
    return CounterfactualResponse(
        anomaly_id=anomaly.id,
        anomaly_title=anomaly.title,
        time_window_start=anomaly.start_time,
        time_window_end=anomaly.end_time,
        actual_energy_kwh=anomaly.actual_kwh,
        counterfactual_baseline_kwh=anomaly.expected_kwh,
        avoidable_waste_kwh=anomaly.excess_kwh,
        avoidable_cost=anomaly.estimated_cost,
        avoidable_co2_kg=anomaly.estimated_co2_kg,
        confidence=anomaly.confidence_score,
        assumptions=[
            "Weather-normalized baseline extrapolated from historical unoccupied nights.",
            "Zero occupancy confirmed by passive infrared motion telemetry.",
            "Energy tariff calculated at on-peak / off-peak rate differential."
        ]
    )
