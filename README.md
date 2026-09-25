# VOLTARIS — AI Energy-Waste Auditor & Energy Detective

> **"Don't just monitor energy. Investigate it. Explain Every Watt."**

Voltaris is an autonomous AI-powered commercial-building energy forensics and audit platform. Unlike traditional energy management dashboards that merely chart kilowatt-hours, Voltaris actively investigates anomalous consumption, distinguishes between legitimate weather-driven demand and genuine waste, generates forensic evidence cards and autopsy timelines, simulates conservation measures with real physics models, and verifies measured savings using the international IPMVP Option C protocol.

---

## Core Investigation Lifecycle

```
DETECT ──► INVESTIGATE ──► EXPLAIN ──► SIMULATE ──► RECOMMEND ──► ACT ──► VERIFY
```

1. **DETECT**: Contextual anomaly engine identifies deviations across submeters, time-of-day, day-of-week, occupancy, and weather enthalpy.
2. **INVESTIGATE**: Energy Autopsy reconstructs chronological timeline from normal operations to failure cascade.
3. **EXPLAIN**: Evidence cards present verified proof points while explaining why legitimate high consumption (e.g. heatwaves) was *not* flagged.
4. **SIMULATE**: What-If simulator projects annual dollar, kWh, and carbon savings with thermodynamic models.
5. **RECOMMEND**: Actionable ECMs categorized into operational, behavioral, maintenance, and retrofits with payback and ROI.
6. **ACT**: Facility operators track active intervention workflows.
7. **VERIFY**: Post-intervention IPMVP Option C weather-normalized regression proves measured savings.

---

## Technology Stack

- **Backend**:
  - Python 3.12+ / 3.13
  - FastAPI (60 fully-typed REST endpoints under `/api/v1`)
  - Pydantic v2 (Strict validation and request/response serialization)
  - PostgreSQL (`voltaris3_db`)
  - SQLAlchemy 2.0 (Async + Sync engines with `NullPool` connection management)
  - NumPy, Pandas, Scikit-learn
  - Pytest (17/17 automated end-to-end tests passing)
- **Frontend**:
  - React 19 + TypeScript + Vite
  - Tailwind CSS with custom cybernetic dark theme and glassmorphism
  - Lucide React icon system
  - Responsive SVG vector architectural floor plan with live zone energy coloring
- **Database**:
  - Local PostgreSQL Server (`postgresql-x64-16`)

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          VOLTARIS FRONTEND                               │
│  React + Vite + TypeScript + Tailwind CSS (http://127.0.0.1:5173)     │
│                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ Command Center   │  │ Floor Plan CAD   │  │ Energy Autopsy       │  │
│  │ - 48h Load Curve │  │ - Vector SVG     │  │ - Failure Timeline   │  │
│  │ - Health Dial    │  │ - Zone Telemetry │  │ - Evidence Cards     │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ What-If Engine   │  │ M&V Verification │  │ AI Detective Chat    │  │
│  │ - Live Sliders   │  │ - IPMVP Option C │  │ - Zero-Hallucination │  │
│  │ - 12mo Forecast  │  │ - Measured Diff  │  │ - Telemetry Grounded │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP Fetch (/api/v1)
┌───────────────────────────────────▼────────────────────────────────────┐
│                          FASTAPI BACKEND                               │
│  Uvicorn ASGI Server (http://127.0.0.1:8000)                           │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ API Routers (/api/v1)                                            │  │
│  │ - /buildings, /floors, /zones, /meters, /equipment              │  │
│  │ - /energy, /occupancy, /weather, /schedules                      │  │
│  │ - /anomalies, /evidence, /autopsy, /non-waste-explanations       │  │
│  │ - /simulations, /counterfactuals, /recommendations               │  │
│  │ - /interventions, /verify, /ai/chat, /report                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                   │                                    │
│  ┌────────────────────────────────▼─────────────────────────────────┐  │
│  │ Analytics, Forensics & AI Engine                                 │  │
│  │ - ContextualBaselineEngine (Weather-normalized degree days)      │  │
│  │ - ContextualAnomalyDetector (Schedule + Occupancy + Weather)     │  │
│  │ - WhatIfSimulationEngine (ASHRAE Standard 55 models)             │  │
│  │ - SavingsVerificationService (IPMVP Option C regression)         │  │
│  │ - AIEnergyDetective (PostgreSQL grounded + Fallback)             │  │
│  │ - HealthScoreCalculator (5 explainable operational pillars)      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ SQLAlchemy 2.0 AsyncPool
┌───────────────────────────────────▼────────────────────────────────────┐
│                    POSTGRESQL DATABASE (voltaris3_db)                    │
│  - organizations, users, buildings, floors, floor_plans, zones         │
│  - meters, equipment, operating_schedules, tariffs                     │
│  - energy_readings (4,032 rows), occupancy_readings, weather_readings   │
│  - anomalies, evidence, investigations, autopsy_events                 │
│  - recommendations, simulation_scenarios, interventions, verifications │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Key Features & Analytical Capabilities

### 1. Contextual Expected Energy Baseline
Rather than naively comparing today vs yesterday, Voltaris calculates an explainable expected baseline for every zone based on:
- Time of day (circadian operating cycle)
- Day of week (weekday vs weekend setback)
- Outdoor dry-bulb temperature (cooling degree days / heating degree days)
- Operating mode (occupied vs unoccupied setback)
- Space type and square footage base standby load

### 2. Contextual Anomaly Detection & Legitimate High-Energy Explanation
- Detects after-hours HVAC overruns, empty-room lighting, weekend operations, occupancy/HVAC mismatches, peak demand surges, and telemetry faults.
- **CRITICAL**: Distinguishes **HIGH ENERGY** from **ENERGY WASTE**. When high consumption occurs during extreme outdoor heat waves (>31°C) with verified active tenant occupancy, the system classifies it as legitimate thermodynamic load and generates a transparent explanation in `/non-waste-explanations`.

### 3. Chronological Energy Autopsy & Evidence Cards
- Reconstructs step-by-step incident progression: Normal operation $\rightarrow$ Deviation start $\rightarrow$ Threshold breached $\rightarrow$ Anomaly flagged $\rightarrow$ Root cause diagnosed.
- Evidence cards supply verifiable sensor proof points (PIR motion counts = 0, BACnet schedule states, submeter kW deltas) with explicit confidence scores.

### 4. Interactive Vector SVG Floor Plan
- Architectural blueprint rendering of all 4 floors and 40 individual zones.
- Real-time semantic coloring:
  - Normal: Slate fill with subtle emerald stroke
  - Elevated: Cyan/blue glow
  - Warning: Amber glow
  - Anomaly / Critical: Crimson pulse with badge marker
- Hover inspection and slide-out panel with live submeter and terminal unit diagnostics.

### 5. What-If Savings Simulator
- Live parameter sliders:
  - HVAC runtime reduction (hours/day)
  - Thermostat setpoint adjustments (+°C)
  - Vacancy-sensor lighting auto-off controls
  - Chiller COP efficiency upgrades
  - Schedule adherence compliance
- Computes annual kWh saved, dollars recovered, CO2 mitigated, and a 12-month seasonal trajectory bar chart.

### 6. IPMVP Option C Savings Verification
- Tracks completed interventions.
- Performs before vs after regression analysis controlling for ambient weather variations.
- Reports weather-normalized baseline kWh, post-implementation kWh, verified savings, and statistical significance.

### 7. Grounded AI Energy Detective
- Conversational assistant answering operator questions in natural language.
- Queries live PostgreSQL tables first to guarantee zero hallucinations: all figures, dates, zones, and equipment referenced are factual database entities.

### 8. Decomposable Energy Health Score (0-100)
Every point is transparently decomposed into 5 pillars:
1. Energy Waste & Anomaly Mitigation (Weight 30%)
2. Schedule & Setback Compliance (Weight 25%)
3. Energy Intensity Benchmark (Weight 20%)
4. Peak Demand & Load Factor (Weight 15%)
5. Telemetry & Sensor Reliability (Weight 10%)

---

## Dataset: TechNova Business Centre

Deterministic, synthetic dataset calibrated with fixed random seed `42`:
- **Facility**: 4 Floors, 12,500 m² gross floor area, 40 distinct zones.
- **Equipment & Submeters**: 40 BACnet submeters, central chiller plant, 40 VAV air handling units.
- **Telemetry**: 14 days of continuous hourly readings (4,032 energy readings, 336 weather readings, occupancy sensor streams).
- **Ground Truth Scenarios**:
  1. *After-hours HVAC operation* (Floor 3 Executive Suite, Sep 18–19)
  2. *Empty-room lighting left on* (Floor 2 Conference Hall, Sep 15)
  3. *Unscheduled weekend operation* (Floor 1 Workspace, Sep 13)
  4. *Coincident peak demand surge* (Utility TOU on-peak window, Sep 17 at 14:00)
  5. *Legitimate heatwave cooling* (Sep 16 at 33.5°C with 88% verified occupancy — correctly recognized as non-waste)
  6. *Sensor dropout / suspect quality fault* (Zone 9)
  7. *Post-intervention verified savings* (Weekend setback lockouts)

---

## Running the Application Locally

### Prerequisites
- Python 3.12 or 3.13
- Node.js v18+ and npm
- PostgreSQL running locally on port 5432 with database `voltaris3_db` (username: `postgres`, password: `postgres`)

### 1. Database Setup & Seeding
From the `backend` directory:
```powershell
# Navigate to backend
cd backend

# Seed TechNova Business Centre into PostgreSQL
python -m app.seed_demo
```

### 2. Run Backend Tests
```powershell
pytest tests -v
```
*Expected: 17 passed in ~4 seconds.*

### 3. Start FastAPI Backend
```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
- API Base: `http://127.0.0.1:8000/api/v1`
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

### 4. Start React Frontend
In a new terminal window:
```powershell
cd frontend
npm run dev
```
Open `http://127.0.0.1:5173/` in your browser.

---

## Golden Demo Walkthrough

1. **Command Center**: View high-level KPIs ($207.20 identified waste, 185 kW peak demand), 48-hour actual vs baseline load curve, and the 5-pillar health score breakdown.
2. **Floor Plan Forensics**: Select Floor 3. Observe Zone F3-Z05 glowing crimson with an active anomaly marker. Click the zone to inspect its 9.4 kW draw and avoidable waste.
3. **Energy Autopsy**: View the 5-step forensic timeline showing how a manual thermostat override latch caused 8 hours of continuous night conditioning while PIR occupancy was 0.
4. **Evidence Card**: Inspect verified sensor proof points, and review the *"Why Wasn't This Flagged?"* card showing how the heatwave was rejected as waste.
5. **What-If Simulator**: Adjust the daily runtime reduction slider from 2.0h to 3.0h. Observe immediate recalculation of annual savings ($23,205/yr, 165,750 kWh) and 12-month projections.
6. **Interventions & M&V**: Select *Automated Weekend HVAC Setback Enforcement* and click **Run IPMVP Re-Verification**. Observe verified measured savings of +1,200 kWh (-34.5% improvement) and 14-day daily comparison bars.
7. **AI Detective**: Ask *"Why did energy spike yesterday?"* or *"Which floor is wasting the most energy?"* and receive answers grounded strictly in PostgreSQL records with source IDs.
8. **Audit & Evaluation**: Review executive audit synthesis, download PDF audit report, and view the Ground-Truth Validation Matrix showing 100% Precision, Recall, and Weather Accuracy.

---

## License & Compliance
Built for the Voltaris Hackathon. Calibrated to ASHRAE Standard 55 thermal comfort guidelines and EVO IPMVP Option C measurement and verification protocols.
