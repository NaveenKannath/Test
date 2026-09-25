import pytest
import sys
import os
from fastapi.testclient import TestClient

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app

client = TestClient(app)

def test_health_endpoint():
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "Nexyra" in data["service"]

def test_list_buildings():
    resp = client.get("/api/v1/buildings")
    assert resp.status_code == 200
    data = resp.json()
    assert any(b["name"] == "TechNova Business Centre" for b in data)

def test_get_building_details():
    resp = client.get("/api/v1/buildings/bldg-technova-01")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "bldg-technova-01"
    assert data["gross_floor_area_m2"] == 12500.0

def test_floors_and_zones():
    resp = client.get("/api/v1/buildings/bldg-technova-01/floors")
    assert resp.status_code == 200
    floors = resp.json()
    assert len(floors) >= 4
    
    first_floor_id = floors[0]["id"]
    z_resp = client.get(f"/api/v1/floors/{first_floor_id}/zones")
    assert z_resp.status_code == 200
    zones = z_resp.json()
    assert len(zones) == 10

def test_zone_energy_states():
    resp = client.get("/api/v1/floors/floor-technova-03/zones/states")
    assert resp.status_code == 200
    states = resp.json()
    assert len(states) == 10
    assert any(s["status"] in ["anomaly", "critical", "normal"] for s in states)

def test_energy_summary():
    resp = client.get("/api/v1/buildings/bldg-technova-01/energy/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_consumption_kwh"] > 0
    assert data["energy_intensity_kwh_m2"] > 0
    assert data["peak_demand_kw"] > 0

def test_health_score_decomposable():
    resp = client.get("/api/v1/buildings/bldg-technova-01/energy/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "overall_score" in data
    assert len(data["components"]) == 5

def test_peak_demand():
    resp = client.get("/api/v1/buildings/bldg-technova-01/energy/peak-demand")
    assert resp.status_code == 200
    data = resp.json()
    assert data["peak_power_kw"] > 0
    assert len(data["reduction_opportunities"]) > 0

def test_anomalies_and_evidence():
    resp = client.get("/api/v1/buildings/bldg-technova-01/anomalies")
    assert resp.status_code == 200
    anomalies = resp.json()
    assert len(anomalies) >= 2
    
    golden_id = "anom-golden-01"
    ev_resp = client.get(f"/api/v1/anomalies/{golden_id}/evidence")
    assert ev_resp.status_code == 200
    ev_data = ev_resp.json()
    assert ev_data["anomaly_id"] == golden_id
    assert len(ev_data["evidence_list"]) >= 2

def test_energy_autopsy_timeline():
    golden_id = "anom-golden-01"
    resp = client.get(f"/api/v1/anomalies/{golden_id}/autopsy")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["timeline"]) >= 4
    assert data["primary_cause"] != ""

def test_why_not_flagged_legitimate_weather():
    resp = client.get("/api/v1/buildings/bldg-technova-01/non-waste-explanations")
    assert resp.status_code == 200
    explanations = resp.json()
    assert len(explanations) >= 1
    assert explanations[0]["is_waste"] is False
    assert "heatwave" in explanations[0]["event_id"] or "temperature" in explanations[0]["primary_reason"]

def test_what_if_simulation():
    payload = {
        "building_id": "bldg-technova-01",
        "scenario_type": "hvac_runtime_reduction",
        "reduction_hours_per_day": 2.0
    }
    resp = client.post("/api/v1/simulations", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["annual_kwh_savings"] > 0
    assert data["annual_cost_savings"] > 0
    assert len(data["monthly_breakdown"]) == 12

def test_counterfactual_analysis():
    payload = {
        "building_id": "bldg-technova-01",
        "anomaly_id": "anom-golden-01"
    }
    resp = client.post("/api/v1/counterfactuals", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["avoidable_waste_kwh"] > 0
    assert data["avoidable_cost"] > 0

def test_interventions_and_ipmvp_verification():
    resp = client.get("/api/v1/buildings/bldg-technova-01/interventions")
    assert resp.status_code == 200
    intervs = resp.json()
    assert len(intervs) >= 1
    
    interv_id = intervs[0]["id"]
    verif_resp = client.get(f"/api/v1/interventions/{interv_id}/verification")
    assert verif_resp.status_code == 200
    v_data = verif_resp.json()
    assert v_data["measured_kwh_savings"] > 0
    assert v_data["is_statistically_significant"] is True

def test_ai_detective_chat():
    payload = {
        "building_id": "bldg-technova-01",
        "query": "Why did energy spike in Zone F3-Z05?"
    }
    resp = client.post("/api/v1/ai/chat", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["answer"]) > 50
    assert len(data["supporting_evidence"]) > 0

def test_ground_truth_evaluation():
    resp = client.get("/api/v1/buildings/bldg-technova-01/evaluation")
    assert resp.status_code == 200
    data = resp.json()
    assert data["precision"] >= 0.90
    assert data["recall"] >= 0.90
    assert data["weather_distinction_accuracy"] == 1.0

def test_audit_report():
    resp = client.get("/api/v1/buildings/bldg-technova-01/report")
    assert resp.status_code == 200
    data = resp.json()
    assert data["building_id"] == "bldg-technova-01"
    assert len(data["top_anomalies"]) > 0

def test_ai_floor_plan_recognition_and_dataset_binding():
    csv_sample = """Room Name,Zone Type,Area m2,Power kW,Status,Occupancy,Daily kWh
Boardroom Alpha,conference,160,4.5,normal,12,65.0
Executive Office 101,office,45,1.2,normal,1,16.5
Server Room Data Vault,server_room,75,9.8,normal,0,235.0
Engineering Bullpen,office,280,6.0,normal,25,95.0
Hardware Lab,mechanical,120,5.2,anomaly,3,78.0
Restrooms,restroom,40,0.8,normal,2,11.0
"""
    payload = {
        "building_id": "bldg-technova-01",
        "floor_name": "Floor 5 (Custom AI Plan)",
        "floor_number": 5,
        "csv_content": csv_sample
    }
    resp = client.post("/api/v1/floors/recognize-rooms", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["recognized_rooms_count"] == 6
    assert len(data["rooms"]) == 6
    assert data["rooms"][0]["room_name"] == "Boardroom Alpha"
    assert len(data["rooms"][0]["polygon_coordinates"]) == 4
    assert data["rooms"][4]["status"] == "anomaly"

def test_interchangeable_hvac_systems():
    # 1. List available systems
    resp = client.get("/api/v1/buildings/bldg-technova-01/hvac-systems")
    assert resp.status_code == 200
    systems = resp.json()
    assert len(systems) >= 5
    system_ids = [s["id"] for s in systems]
    assert "chilled_water_vav" in system_ids
    assert "vrf_heat_recovery" in system_ids
    assert "stuck_damper_overcooling" in system_ids

    # 2. Swap HVAC system to VRF Heat Recovery
    swap_resp = client.post("/api/v1/buildings/bldg-technova-01/hvac-system", json={
        "system_type": "vrf_heat_recovery"
    })
    assert swap_resp.status_code == 200
    swap_data = swap_resp.json()
    assert swap_data["system_type"] == "vrf_heat_recovery"
    assert swap_data["zones_updated"] > 0

    # 3. Swap back to Chilled Water VAV
    reset_resp = client.post("/api/v1/buildings/bldg-technova-01/hvac-system", json={
        "system_type": "chilled_water_vav"
    })
    assert reset_resp.status_code == 200

def test_create_and_delete_facility_without_mock_zones():
    # 1. Create a custom facility
    create_payload = {
        "name": "Custom Test Facility Zero Mock",
        "building_type": "Commercial Office",
        "gross_floor_area_m2": 15000.0,
        "primary_use": "Commercial",
        "address": "Electronic City, Bengaluru",
        "currency": "INR",
        "default_tariff_rate": 9.50,
        "number_of_floors": 3
    }
    c_resp = client.post("/api/v1/buildings", json=create_payload)
    assert c_resp.status_code == 200
    bldg = c_resp.json()
    bldg_id = bldg["id"]
    assert bldg["name"] == "Custom Test Facility Zero Mock"

    # 2. Verify floors exist but have NO mock zones
    fl_resp = client.get(f"/api/v1/buildings/{bldg_id}/floors")
    assert fl_resp.status_code == 200
    floors = fl_resp.json()
    assert len(floors) == 3
    
    first_floor_id = floors[0]["id"]
    z_resp = client.get(f"/api/v1/floors/{first_floor_id}/zones/states")
    assert z_resp.status_code == 200
    zones = z_resp.json()
    # MUST HAVE ZERO MOCK ZONES
    assert len(zones) == 0

    # 3. Delete the facility
    d_resp = client.delete(f"/api/v1/buildings/{bldg_id}")
    assert d_resp.status_code == 200
    assert d_resp.json()["success"] is True

    # 4. Verify facility no longer exists
    get_resp = client.get(f"/api/v1/buildings/{bldg_id}")
    assert get_resp.status_code == 404

def test_bdg2_and_benchmark_datasets_endpoints():
    # 1. Dataset Catalogs
    cat_resp = client.get("/api/v1/datasets/catalogs")
    assert cat_resp.status_code == 200
    cats = cat_resp.json()
    assert len(cats) >= 3
    assert any(c["id"] == "bdg2" for c in cats)

    # 2. BDG2 Buildings list
    bldg_resp = client.get("/api/v1/datasets/bdg2/buildings")
    assert bldg_resp.status_code == 200
    bdg_bldgs = bldg_resp.json()
    assert len(bdg_bldgs) >= 5
    sample_bldg = bdg_bldgs[0]["building_id"]

    # 3. BDG2 Building Telemetry
    tel_resp = client.get(f"/api/v1/datasets/bdg2/buildings/{sample_bldg}/telemetry?hours=48")
    assert tel_resp.status_code == 200
    tel_data = tel_resp.json()
    assert tel_data["hours_count"] == 48
    assert len(tel_data["telemetry"]) == 48

    # 4. Standard Room Datasets Presets
    preset_resp = client.get("/api/v1/datasets/presets/room-dataset")
    assert preset_resp.status_code == 200
    presets = preset_resp.json()
    assert len(presets) >= 2

    # 5. Apply BDG2 to a Facility
    c_res = client.post("/api/v1/buildings", json={
        "name": "BDG2 Test Facility",
        "building_type": "Office",
        "gross_floor_area_m2": 5000.0,
        "currency": "INR",
        "number_of_floors": 1
    })
    assert c_res.status_code == 200
    temp_fac_id = c_res.json()["id"]

    apply_resp = client.post("/api/v1/datasets/bdg2/apply-to-facility", json={
        "facility_id": temp_fac_id,
        "bdg2_building_id": "Panther_office_Karla"
    })
    assert apply_resp.status_code == 200
    apply_data = apply_resp.json()
    assert apply_data["dataset"] == "Building Data Genome 2 (BDG2)"
    assert apply_data["hours_telemetry_loaded"] == 48

    # Clean up
    client.delete(f"/api/v1/buildings/{temp_fac_id}")
