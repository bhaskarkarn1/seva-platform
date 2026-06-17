# SEVA - Smart Event-driven Vulnerability Analyzer

An AI-powered operational command center for **Bengaluru Traffic Police** that forecasts event-driven congestion, deploys officers optimally, places barricades strategically, and activates diversions - all before the first vehicle arrives.

## Problem Statement

Political rallies, IPL matches, festivals, construction, and sudden gatherings create localized traffic breakdowns in Bengaluru. Today:

- Event impact is **not quantified in advance**
- Resource deployment is **experience-driven**
- There is **no post-event learning system**

SEVA solves all three with data-driven forecasting, mathematical optimization, and closed-loop performance monitoring.

## Architecture

```
seva-platform/
├── backend/                    # FastAPI server (Python)
│   ├── main.py                 # API endpoints & orchestration
│   ├── ml/
│   │   ├── models.py           # LightGBM model loaders
│   │   └── artifacts/          # Trained model files (.pkl)
│   ├── engines/
│   │   ├── mission_control.py  # Unified briefing engine
│   │   ├── barricade_planner.py # Junction-based containment
│   │   ├── road_graph.py       # OSMnx diversion routing
│   │   ├── similar_events.py   # Historical event retrieval
│   │   └── post_event_learning.py # Drift detection
│   ├── optimizer/              # OR-Tools MILP deployment
│   ├── analytics/              # EDA & vulnerability scoring
│   ├── scenarios/              # Pre-built scenario configs
│   ├── data/                   # ASTraM dataset & station data
│   └── learning/               # Post-event feedback loop
├── seva-ui/                    # React frontend (Vite)
│   └── src/
│       ├── App.jsx             # Root component
│       ├── index.css           # Design system
│       ├── components/
│       │   ├── Navbar.jsx      # Live command header
│       │   ├── Hero.jsx        # Landing + approach section
│       │   ├── Capabilities.jsx # Engine capabilities
│       │   ├── ImpactStats.jsx # BPR-derived impact metrics
│       │   └── Footer.jsx
│       ├── pages/
│       │   ├── Dashboard.jsx   # Tab container
│       │   ├── MissionControl.jsx # One-click briefing engine
│       │   ├── VulnerabilityIntel.jsx # Corridor risk analysis
│       │   ├── ScenarioPlanner.jsx # What-if comparisons
│       │   ├── ModelPerformance.jsx # SHAP & metrics
│       │   ├── PostEventLearning.jsx # Feedback monitor
│       │   └── DataExplorer.jsx # Raw data views
│       └── hooks/
│           └── useReveal.js    # Scroll-triggered animations
└── requirements.txt
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **ML Models** | LightGBM | Road closure prediction (PR-AUC: 0.9945), priority classification (ROC-AUC: 0.9999) |
| **Optimization** | OR-Tools (MILP) | Officer deployment across 54 stations with capacity + 5km distance constraints |
| **Graph Routing** | OSMnx + NetworkX | Diversion planning on Bengaluru road graph (155K nodes, 394K edges) |
| **Delay Model** | BPR Function | Bureau of Public Roads delay: t0 x (1 + 0.15 x (V/C)^4) |
| **Explainability** | TreeSHAP | Feature attributions for every prediction |
| **Backend** | FastAPI + Uvicorn | REST API with async endpoints |
| **Frontend** | React + Vite | SPA with Leaflet maps, Recharts, scroll animations |
| **Dataset** | ASTraM (Bengaluru) | 8,057 historical traffic events |

## ML Models

### 1. Road Closure Prediction
- **Algorithm**: LightGBM binary classifier
- **Metric**: PR-AUC 0.9945
- **Key Features**: event_spread_encoded, cause_type, corridor_status, hour, rolling_event_count

### 2. Priority Classification
- **Algorithm**: LightGBM multi-class
- **Metric**: ROC-AUC 0.9999
- **Key Features**: corridor_status, historical_event_frequency, event_spread_encoded

### 3. Resolution Time Estimation
- **Algorithm**: Quantile Regression
- **Outputs**: P25, P50 (median), P75 estimates
- **Metric**: MAE 0.73 hours

## Operational Engines

### Mission Control (One-Click Briefing)
Generates a complete operational brief in a single API call:
- Risk assessment with closure probability
- Officer deployment orders (station-wise)
- Barricade positions (junction containment)
- Diversion routes (shortest alternatives)
- BPR delay analysis (before/after)
- Confidence intervals

### Barricade Planner
Junction-based perimeter containment using:
- High-connectivity intersection identification
- Angular distribution analysis
- Historical ASTraM event density
- Target: 70-90% area containment

### Diversion Engine
OSMnx-powered road graph rerouting:
- Computes shortest alternative paths when junctions are blocked
- Quantifies detour distance and expected delay reduction
- Bengaluru graph: 155,359 nodes, 393,717 edges

### Officer Deployment Optimizer
Mixed Integer Linear Programming via OR-Tools:
- 54 police stations with individual capacity constraints
- Maximum deployment distance: 5km
- Minimizes total deployment cost while ensuring coverage

### Post-Event Learning
Closed-loop feedback system:
- Compares predictions vs actual outcomes
- Identifies model drift
- Generates concrete retraining triggers with threshold alerts

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm 9+

### Backend Setup

```bash
cd seva-platform

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the API server
cd backend
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

### Frontend Setup

```bash
cd seva-platform/seva-ui

# Install dependencies
npm install

# Start dev server
npm run dev
```

The UI will be available at `http://localhost:5173`.

### Production Build

```bash
cd seva-platform/seva-ui
npm run build
```

The production bundle will be in `seva-ui/dist/`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/mission-control` | Generate complete operational brief |
| GET | `/eda` | Dataset statistics |
| GET | `/metrics` | Model performance metrics |
| GET | `/stations` | Police station data |
| GET | `/corridors/risk` | Corridor vulnerability scores |
| GET | `/scenario/{name}` | Pre-built scenario comparison |
| GET | `/performance/monitor` | Model drift monitoring |
| POST | `/predict/closure` | Road closure prediction |
| POST | `/predict/priority` | Priority classification |
| POST | `/predict/resolution` | Resolution time estimate |

## Dataset

**ASTraM (Advanced Traffic Management)** - Bengaluru Traffic Police dataset containing 8,057 historical traffic events with:
- Event type, cause, severity
- Location (corridor, latitude, longitude)
- Temporal features (hour, day, month)
- Road closure status
- Resolution time

## Key Design Decisions

1. **No synthetic data**: Every metric shown on the UI is computed from real ASTraM data or validated ML models
2. **BPR delay model**: Uses the Bureau of Public Roads formula (FHWA standard) for delay estimation instead of arbitrary percentages
3. **MILP optimization**: Officer deployment uses mathematical optimization, not heuristic assignment
4. **SHAP explainability**: Every prediction can be explained with quantitative feature attributions
5. **Closed-loop learning**: Post-event feedback identifies drift and triggers retraining

## Built By

**Bhaskar Karn** - [GitHub](https://github.com/bhaskarkarn1)
