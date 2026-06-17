import pandas as pd
import numpy as np
from ortools.linear_solver import pywraplp
from data.loader import haversine
import warnings

# Suppress warnings for cleaner output
warnings.filterwarnings('ignore')

class ResourceOptimizer:
    def __init__(self, df):
        """
        Initialize the optimizer by deriving constraints from the historical dataset.
        df: the cleaned dataframe from loader.py
        """
        self.df = df
        print("Initializing Resource Optimizer with data-derived constraints...")
        
        # 1. Compute Police Station Locations and Capacities
        station_groups = df.groupby('police_station')
        self.stations = {}
        for station, group in station_groups:
            if station == 'Unknown' or pd.isna(station):
                continue
            # Capacity proportional to historical load: Base 5 + 1 per 20 events
            capacity = 5 + len(group) // 20
            # Cap at 30 to be realistic
            capacity = min(capacity, 30)
            
            lat = group['latitude'].mean()
            lon = group['longitude'].mean()
            
            self.stations[station] = {
                'lat': lat,
                'lon': lon,
                'capacity': capacity,
                'historical_events': len(group)
            }
            
        print(f"Derived {len(self.stations)} police stations with capacities.")

    def _get_distance(self, lat1, lon1, lat2, lon2):
        return haversine(lat1, lon1, lat2, lon2)

    def optimize_deployment(self, active_events, tier='expected'):
        """
        active_events: list of dicts, each containing:
            - id
            - junction
            - latitude, longitude
            - closure_prob (0-1)
            - priority ('High' or 'Low')
            - predicted_resolution (hours) - used for the tier
        
        tier: 'conservative' (Q75), 'expected' (Q50), 'peak' (Q25)
              (Note: we map tier to how aggressively we deploy. 
               Here we'll use tier to scale the officer demand.)
        """
        if not active_events:
            return {"status": "NO_EVENTS", "deployment_plan": [], "coverage_score": 1.0}
            
        # Determine demand multiplier based on tier
        if tier == 'conservative':
            demand_multiplier = 0.8
        elif tier == 'peak':
            demand_multiplier = 1.2
        else: # expected
            demand_multiplier = 1.0

        solver = pywraplp.Solver.CreateSolver('SCIP')
        if not solver:
            return {"status": "SOLVER_NOT_FOUND", "deployment_plan": [], "coverage_score": 0.0}

        # Decision Variables: x[s, j] = officers from station s to event j
        x = {}
        # We also need a coverage variable for each event to measure objective
        coverage = {}
        
        event_demand = {}
        event_priority_weight = {}
        
        # Setup event requirements
        for i, event in enumerate(active_events):
            # Demand: up to 3 officers if 100% closure prob, modified by tier
            base_demand = np.ceil(event['closure_prob'] * 3 * demand_multiplier)
            demand = int(min(max(base_demand, 1), 5)) # Between 1 and 5
            event_demand[i] = demand
            
            # Priority weight
            p_weight = 1.5 if event['priority'] == 'High' else 1.0
            # Higher closure prob = higher weight
            weight = p_weight * event['closure_prob']
            event_priority_weight[i] = weight
            
            coverage[i] = solver.NumVar(0.0, 1.0, f'coverage_{i}')
            
            for s_name in self.stations.keys():
                x[(s_name, i)] = solver.IntVar(0, demand, f'x_{s_name}_{i}')

        # Constraints
        # 1. Station Capacity
        for s_name, s_data in self.stations.items():
            solver.Add(sum(x[(s_name, i)] for i in range(len(active_events))) <= s_data['capacity'])

        # 2. Distance Constraint (Max 5km)
        for i, event in enumerate(active_events):
            for s_name, s_data in self.stations.items():
                dist = self._get_distance(s_data['lat'], s_data['lon'], event['latitude'], event['longitude'])
                if dist > 5.0:
                    solver.Add(x[(s_name, i)] == 0)

        # 3. Coverage Definition & Max Officers per Event
        for i in range(len(active_events)):
            total_officers_for_event = sum(x[(s_name, i)] for s_name in self.stations.keys())
            if event_demand[i] > 0:
                solver.Add(coverage[i] <= total_officers_for_event / event_demand[i])
                # Do not allocate more officers than demanded
                solver.Add(total_officers_for_event <= event_demand[i])
            else:
                solver.Add(coverage[i] == 1.0)
                solver.Add(total_officers_for_event == 0)

        # Objective: Maximize weighted coverage
        objective = solver.Objective()
        for i in range(len(active_events)):
            objective.SetCoefficient(coverage[i], event_priority_weight[i])
        objective.SetMaximization()

        status = solver.Solve()

        if status == pywraplp.Solver.OPTIMAL or status == pywraplp.Solver.FEASIBLE:
            plan = []
            total_officers = 0
            uncovered = []
            
            for i, event in enumerate(active_events):
                event_assigned = 0
                for s_name in self.stations.keys():
                    assigned = int(x[(s_name, i)].solution_value())
                    if assigned > 0:
                        dist = self._get_distance(self.stations[s_name]['lat'], self.stations[s_name]['lon'], 
                                                  event['latitude'], event['longitude'])
                        plan.append({
                            "event_id": event['id'],
                            "junction": event.get('junction', 'Unknown'),
                            "from_station": s_name,
                            "officers_assigned": assigned,
                            "distance_km": round(dist, 2),
                            "reason": f"closure_prob={event['closure_prob']:.2f}, priority={event['priority']}"
                        })
                        event_assigned += assigned
                        total_officers += assigned
                
                if event_assigned < event_demand[i]:
                    uncovered.append(event.get('junction', 'Unknown'))

            max_possible_score = sum(event_priority_weight.values())
            actual_score = objective.Value()
            normalized_score = actual_score / max_possible_score if max_possible_score > 0 else 1.0

            return {
                "status": "OPTIMAL" if status == pywraplp.Solver.OPTIMAL else "FEASIBLE",
                "deployment_plan": sorted(plan, key=lambda p: p['officers_assigned'], reverse=True),
                "total_officers_deployed": total_officers,
                "coverage_score": round(normalized_score, 3),
                "uncovered_junctions": uncovered
            }
        else:
            return {"status": "INFEASIBLE", "deployment_plan": [], "coverage_score": 0.0}

if __name__ == "__main__":
    from data.loader import load_and_clean_data
    df = load_and_clean_data()
    optimizer = ResourceOptimizer(df)
    
    # Mock some active events for testing
    mock_events = [
        {'id': 1, 'junction': 'MekhriCircle', 'latitude': 13.0135, 'longitude': 77.5794, 'closure_prob': 0.85, 'priority': 'High'},
        {'id': 2, 'junction': 'SilkBoard', 'latitude': 12.9172, 'longitude': 77.6227, 'closure_prob': 0.40, 'priority': 'Low'},
        {'id': 3, 'junction': 'Chinnaswamy', 'latitude': 12.9784, 'longitude': 77.5998, 'closure_prob': 0.95, 'priority': 'High'}
    ]
    
    res = optimizer.optimize_deployment(mock_events, tier='expected')
    import json
    print(json.dumps(res, indent=2))
