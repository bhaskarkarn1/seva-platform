"""
SEVA v4 — Rebuilt FastAPI Backend
All analytics are loaded from pre-computed JSON files (no hardcoded values).
Real SHAP explanations are served from model artifacts.
New: Mission Control, Barricade Planner, Diversion Engine, Post-Event Learning, Similar Events
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import numpy as np
import joblib
import json
import os
from datetime import datetime

# Engine imports
from engines.barricade_planner import compute_barricade_plan
from engines.similar_events import find_similar_events, build_event_profiles
from engines.post_event_learning import compute_learning_report
from engines.mission_control import generate_mission_brief

app = FastAPI(title="SEVA v4 API", description="Smart Event Vulnerability & Action Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS_DIR = os.path.join(BACKEND_DIR, "ml", "artifacts")
ANALYTICS_DIR = os.path.join(BACKEND_DIR, "analytics")

# Global state
models = {}
eda_data = {}
model_metrics = {}
station_data = {}
feature_cols = []
kmeans_model = None
closure_threshold = 0.5
road_graph = None

# ---- Optimizer (inlined for simplicity) ----
from ortools.linear_solver import pywraplp

def haversine(lat1, lon1, lat2, lon2):
    lon1, lat1, lon2, lat2 = map(np.radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1; dlat = lat2 - lat1
    a = np.sin(dlat/2)**2 + np.cos(lat1)*np.cos(lat2)*np.sin(dlon/2)**2
    return 6371 * 2 * np.arcsin(np.sqrt(a))

def optimize_deployment(stations, active_events, tier='expected'):
    if not active_events:
        return {"status": "NO_EVENTS", "deployment_plan": [], "coverage_score": 1.0,
                "total_officers_deployed": 0, "uncovered_junctions": []}
    
    mult = {'conservative': 0.8, 'peak': 1.2}.get(tier, 1.0)
    
    solver = pywraplp.Solver.CreateSolver('SCIP')
    if not solver:
        return {"status": "SOLVER_NOT_FOUND", "deployment_plan": [], "coverage_score": 0.0}
    
    x, coverage, demand, weight = {}, {}, {}, {}
    
    for i, ev in enumerate(active_events):
        base = np.ceil(ev['closure_prob'] * 3 * mult)
        demand[i] = int(min(max(base, 1), 5))
        weight[i] = (1.5 if ev.get('priority') == 'High' else 1.0) * ev['closure_prob']
        coverage[i] = solver.NumVar(0.0, 1.0, f'cov_{i}')
        for s in stations:
            x[(s, i)] = solver.IntVar(0, demand[i], f'x_{s}_{i}')
    
    for s, sd in stations.items():
        solver.Add(sum(x[(s, i)] for i in range(len(active_events))) <= sd['capacity'])
    
    for i, ev in enumerate(active_events):
        for s, sd in stations.items():
            if haversine(sd['lat'], sd['lon'], ev['latitude'], ev['longitude']) > 5.0:
                solver.Add(x[(s, i)] == 0)
        total = sum(x[(s, i)] for s in stations)
        if demand[i] > 0:
            solver.Add(coverage[i] <= total / demand[i])
            solver.Add(total <= demand[i])
        else:
            solver.Add(coverage[i] == 1.0)
            solver.Add(total == 0)
    
    obj = solver.Objective()
    for i in range(len(active_events)):
        obj.SetCoefficient(coverage[i], weight[i])
    obj.SetMaximization()
    
    status = solver.Solve()
    if status in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE):
        plan, total_off, uncov = [], 0, []
        for i, ev in enumerate(active_events):
            assigned = 0
            for s, sd in stations.items():
                a = int(x[(s, i)].solution_value())
                if a > 0:
                    d = haversine(sd['lat'], sd['lon'], ev['latitude'], ev['longitude'])
                    plan.append({
                        "event_id": ev.get('id', i),
                        "junction": ev.get('junction', 'Unknown'),
                        "from_station": s,
                        "officers_assigned": a,
                        "distance_km": round(d, 2),
                        "reason": f"closure_prob={ev['closure_prob']:.2f}, priority={ev.get('priority', 'Low')}"
                    })
                    assigned += a; total_off += a
            if assigned < demand[i]:
                uncov.append(ev.get('junction', 'Unknown'))
        
        max_score = sum(weight.values())
        return {
            "status": "OPTIMAL" if status == pywraplp.Solver.OPTIMAL else "FEASIBLE",
            "deployment_plan": sorted(plan, key=lambda p: p['officers_assigned'], reverse=True),
            "total_officers_deployed": total_off,
            "coverage_score": round(obj.Value() / max_score if max_score else 1.0, 3),
            "uncovered_junctions": uncov
        }
    return {"status": "INFEASIBLE", "deployment_plan": [], "coverage_score": 0.0}

# ---- Startup ----
@app.on_event("startup")
async def load_all():
    global models, eda_data, model_metrics, station_data, feature_cols, kmeans_model, closure_threshold
    
    print("Loading artifacts...")
    try:
        models['closure'] = joblib.load(os.path.join(ARTIFACTS_DIR, "model_closure.pkl"))
        models['priority'] = joblib.load(os.path.join(ARTIFACTS_DIR, "model_priority.pkl"))
        models['resolution'] = joblib.load(os.path.join(ARTIFACTS_DIR, "model_resolution.pkl"))
        closure_threshold = joblib.load(os.path.join(ARTIFACTS_DIR, "closure_threshold.pkl"))
        kmeans_model = joblib.load(os.path.join(ARTIFACTS_DIR, "kmeans_spatial.pkl"))
        
        with open(os.path.join(ARTIFACTS_DIR, "feature_cols.json")) as f:
            feature_cols = json.load(f)
    except Exception as e:
        print(f"Model load warning: {e}")
    
    try:
        with open(os.path.join(ANALYTICS_DIR, "eda_results.json")) as f:
            eda_data = json.load(f)
        with open(os.path.join(ANALYTICS_DIR, "model_metrics.json")) as f:
            model_metrics = json.load(f)
        with open(os.path.join(ANALYTICS_DIR, "station_data.json")) as f:
            station_data = json.load(f)
    except Exception as e:
        print(f"Analytics load warning: {e}")
    
    print(f"Loaded {len(models)} models, {len(station_data)} stations, {len(eda_data)} EDA keys")
    
    # Start road graph download in background (non-blocking)
    import threading
    def _load_graph():
        try:
            from engines.road_graph import load_graph
            load_graph()
        except Exception as e:
            print(f"Road graph load warning: {e}")
    threading.Thread(target=_load_graph, daemon=True).start()

    # Keep-alive self-ping to prevent Render free tier sleep (every 13 min)
    import urllib.request
    import time as _time
    def _keep_alive():
        render_url = os.environ.get("RENDER_EXTERNAL_URL")
        if not render_url:
            print("[KeepAlive] No RENDER_EXTERNAL_URL set, skipping self-ping")
            return
        health_url = f"{render_url}/health"
        print(f"[KeepAlive] Started — pinging {health_url} every 13 min")
        while True:
            _time.sleep(780)  # 13 minutes
            try:
                urllib.request.urlopen(health_url, timeout=10)
                print(f"[KeepAlive] Ping OK at {datetime.now().strftime('%H:%M:%S')}")
            except Exception as e:
                print(f"[KeepAlive] Ping failed: {e}")
    threading.Thread(target=_keep_alive, daemon=True).start()

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring and keep-alive."""
    return {
        "status": "healthy",
        "models_loaded": len(models),
        "stations": len(station_data),
        "timestamp": datetime.now().isoformat()
    }

# ---- Original Endpoints (kept) ----

@app.get("/eda")
async def get_eda():
    """Return all EDA results computed from real data."""
    return eda_data

@app.get("/eda/stations")
async def get_station_profiles():
    return eda_data.get('station_profiles', [])

@app.get("/eda/corridors")
async def get_corridor_profiles():
    return eda_data.get('corridor_profiles', [])

@app.get("/eda/heatmap")
async def get_heatmap():
    return eda_data.get('heatmap_data', [])

@app.get("/eda/hourly")
async def get_hourly():
    return eda_data.get('hourly_pattern', [])

@app.get("/eda/daily")
async def get_daily():
    return eda_data.get('daily_pattern', [])

@app.get("/metrics")
async def get_model_metrics():
    """Return real model evaluation metrics with SHAP feature importances."""
    return model_metrics

class OptimizeRequest(BaseModel):
    tier: str = "expected"
    events: list

@app.post("/optimize")
async def run_optimizer(req: OptimizeRequest):
    if not station_data:
        raise HTTPException(503, "Station data not loaded")
    return optimize_deployment(station_data, req.events, req.tier)

@app.get("/scenario/chinnaswamy")
async def chinnaswamy_scenario():
    if not station_data:
        raise HTTPException(503, "Station data not loaded")
    
    events = [
        {"id": 9999, "junction": "Chinnaswamy Stadium", "latitude": 12.9784, "longitude": 77.5998,
         "closure_prob": 0.89, "priority": "High"},
        {"id": 10000, "junction": "Queens Road", "latitude": 12.9800, "longitude": 77.6000,
         "closure_prob": 0.75, "priority": "High"},
        {"id": 10001, "junction": "MG Road", "latitude": 12.9750, "longitude": 77.6020,
         "closure_prob": 0.82, "priority": "High"}
    ]
    
    with_seva = optimize_deployment(station_data, events, "expected")
    
    total_nearby_stations = set()
    for ev in events:
        for s, sd in station_data.items():
            if haversine(sd['lat'], sd['lon'], ev['latitude'], ev['longitude']) <= 5.0:
                total_nearby_stations.add(s)
    
    naive_plan = []
    for ev in events:
        nearest_s, nearest_d = None, float('inf')
        for s, sd in station_data.items():
            d = haversine(sd['lat'], sd['lon'], ev['latitude'], ev['longitude'])
            if d < nearest_d:
                nearest_s, nearest_d = s, d
        if nearest_s:
            naive_plan.append({
                "event_id": ev['id'], "junction": ev['junction'],
                "from_station": nearest_s, "officers_assigned": 1,
                "distance_km": round(nearest_d, 2), "reason": "Intuition (nearest station, 1 officer)"
            })
    
    naive_coverage = 0
    total_weight = sum((1.5 if ev.get('priority')=='High' else 1.0) * ev['closure_prob'] for ev in events)
    for i, ev in enumerate(events):
        base_demand = max(1, int(np.ceil(ev['closure_prob'] * 3)))
        cov = min(1.0, 1.0 / base_demand)
        w = (1.5 if ev.get('priority')=='High' else 1.0) * ev['closure_prob']
        naive_coverage += cov * w
    naive_coverage_score = round(naive_coverage / total_weight if total_weight else 1.0, 3)
    
    uncov = [ev['junction'] for ev in events if int(np.ceil(ev['closure_prob'] * 3)) > 1]
    
    without_seva = {
        "deployment_plan": naive_plan,
        "total_officers_deployed": len(naive_plan),
        "coverage_score": naive_coverage_score,
        "uncovered_junctions": uncov
    }
    
    # NEW: Add barricade plan to scenario
    barricade_plan = compute_barricade_plan(
        12.9784, 77.5998, "public_event", station_data, eda_data, impact_radius_km=3.0
    )
    
    return {
        "scenario": "Chinnaswamy 2025 IPL Egress",
        "events": events,
        "with_seva": with_seva,
        "without_seva": without_seva,
        "barricade_plan": barricade_plan,
        "improvement": {
            "coverage_gain": round(with_seva['coverage_score'] - naive_coverage_score, 3),
            "additional_officers": with_seva['total_officers_deployed'] - len(naive_plan),
            "junctions_secured": len(uncov) - len(with_seva.get('uncovered_junctions', []))
        }
    }

@app.get("/stations")
async def get_stations():
    """Return station data with coordinates for map rendering."""
    return station_data

# ---- NEW v4 Endpoints ----

class MissionControlRequest(BaseModel):
    event_type: str = "unplanned"
    cause: str = "vehicle_breakdown"
    lat: float = 12.9784
    lon: float = 77.5998
    corridor: str = "CBD"
    hour: int = 17

@app.post("/mission-control")
async def run_mission_control(req: MissionControlRequest):
    """
    The killer endpoint: One button produces a complete operational brief.
    Officers, barricades, diversions, similar events, plain-language summary.
    """
    if not station_data:
        raise HTTPException(503, "Station data not loaded")
    
    brief = generate_mission_brief(
        event_config={
            "event_type": req.event_type,
            "cause": req.cause,
            "lat": req.lat,
            "lon": req.lon,
            "corridor": req.corridor,
            "hour": req.hour
        },
        station_data=station_data,
        eda_data=eda_data,
        optimize_fn=optimize_deployment
    )
    return brief


@app.get("/barricade-plan")
async def get_barricade_plan(lat: float = 12.9784, lon: float = 77.5998, 
                              event_type: str = "public_event", radius: float = 2.5):
    """Compute optimal barricade placement around an event location."""
    if not station_data:
        raise HTTPException(503, "Station data not loaded")
    
    plan = compute_barricade_plan(lat, lon, event_type, station_data, eda_data, radius)
    return plan


@app.get("/diversion")
async def get_diversion_routes(lat: float = 12.9784, lon: float = 77.5998):
    """Compute diversion routes around a blocked point using OSMnx road graph."""
    try:
        from engines.road_graph import compute_diversion_routes, get_graph_stats
        
        stats = get_graph_stats()
        if stats.get('status') != 'LOADED':
            # Graph not yet loaded, return placeholder
            return {
                "status": "GRAPH_LOADING",
                "message": "Bengaluru road graph is downloading. Diversion routes will be available shortly.",
                "diversions": []
            }
        
        approach_points = [
            {"name": "North Approach (Cantonment)", "lat": lat + 0.02, "lon": lon},
            {"name": "South Approach (Lalbagh)", "lat": lat - 0.02, "lon": lon},
            {"name": "East Approach (Indiranagar)", "lat": lat, "lon": lon + 0.025},
            {"name": "West Approach (Rajajinagar)", "lat": lat, "lon": lon - 0.025},
        ]
        
        diversions = compute_diversion_routes(lat, lon, approach_points)
        
        return {
            "status": "COMPUTED",
            "blocked_location": {"lat": lat, "lon": lon},
            "diversions": diversions,
            "graph_stats": stats
        }
    except Exception as e:
        return {
            "status": "ERROR",
            "message": str(e),
            "diversions": []
        }


@app.get("/similar-events")
async def get_similar_events(cause: str = "vehicle_breakdown", 
                              corridor: str = "CBD", hour: int = 17):
    """Find similar historical events from ASTraM data."""
    similar = find_similar_events(cause, corridor, hour, eda_data, top_k=5)
    return {"similar_events": similar, "query": {"cause": cause, "corridor": corridor, "hour": hour}}


@app.get("/post-event-learning")
async def get_learning_report():
    """Generate a post-event learning report comparing predictions vs actuals."""
    report = compute_learning_report(eda_data, model_metrics)
    return report


@app.get("/event-profiles")
async def get_event_profiles():
    """Return event type profiles built from ASTraM data."""
    profiles = build_event_profiles(eda_data)
    return {"profiles": profiles}


@app.get("/road-graph/stats")
async def get_road_graph_stats():
    """Return road graph loading status."""
    try:
        from engines.road_graph import get_graph_stats
        return get_graph_stats()
    except Exception as e:
        return {"status": "NOT_LOADED", "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
