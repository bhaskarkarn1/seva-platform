"""
SEVA v4 — Road Graph Engine
Downloads and caches Bengaluru road network from OpenStreetMap via OSMnx.
Provides shortest-path routing and diversion computation.
"""
import os
import json
import pickle
import numpy as np

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "cache")
GRAPH_CACHE = os.path.join(CACHE_DIR, "bengaluru_graph.pkl")
NODES_CACHE = os.path.join(CACHE_DIR, "bengaluru_nodes.json")

# Lazy-loaded globals
_G = None
_nodes_df = None

def _ensure_cache_dir():
    os.makedirs(CACHE_DIR, exist_ok=True)


def load_graph():
    """Load or download the Bengaluru road graph."""
    global _G, _nodes_df
    if _G is not None:
        return _G

    _ensure_cache_dir()

    if os.path.exists(GRAPH_CACHE):
        print("[RoadGraph] Loading cached Bengaluru graph...")
        with open(GRAPH_CACHE, "rb") as f:
            _G = pickle.load(f)
        print(f"[RoadGraph] Loaded: {_G.number_of_nodes()} nodes, {_G.number_of_edges()} edges")
        return _G

    print("[RoadGraph] Downloading Bengaluru road network (this takes 1-2 minutes)...")
    try:
        import osmnx as ox
        # Download the drivable road network for Bengaluru
        _G = ox.graph_from_place("Bengaluru, Karnataka, India", network_type="drive")
        # Cache it
        with open(GRAPH_CACHE, "wb") as f:
            pickle.dump(_G, f)
        print(f"[RoadGraph] Downloaded and cached: {_G.number_of_nodes()} nodes, {_G.number_of_edges()} edges")
    except Exception as e:
        print(f"[RoadGraph] Download failed: {e}")
        print("[RoadGraph] Falling back to synthetic local graph from station data...")
        _G = _build_fallback_graph()

    return _G


def _build_fallback_graph():
    """Build a minimal graph from station coordinates if OSMnx download fails."""
    import networkx as nx
    G = nx.DiGraph()
    
    station_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "analytics", "station_data.json")
    if not os.path.exists(station_file):
        return G
    
    with open(station_file) as f:
        stations = json.load(f)
    
    # Add station nodes
    for name, data in stations.items():
        node_id = hash(name) & 0x7FFFFFFF
        G.add_node(node_id, x=data['lon'], y=data['lat'], street_count=4, name=name)
    
    # Connect stations within 5km
    node_list = list(G.nodes(data=True))
    for i, (n1, d1) in enumerate(node_list):
        for j, (n2, d2) in enumerate(node_list):
            if i >= j:
                continue
            dist = _haversine(d1['y'], d1['x'], d2['y'], d2['x'])
            if dist < 5.0:  # 5km threshold
                # Add bidirectional edges
                G.add_edge(n1, n2, length=dist * 1000, name=f"{d1.get('name','')}-{d2.get('name','')}")
                G.add_edge(n2, n1, length=dist * 1000, name=f"{d2.get('name','')}-{d1.get('name','')}")
    
    return G


def _haversine(lat1, lon1, lat2, lon2):
    """Haversine distance in km."""
    lon1, lat1, lon2, lat2 = map(np.radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = np.sin(dlat/2)**2 + np.cos(lat1)*np.cos(lat2)*np.sin(dlon/2)**2
    return 6371 * 2 * np.arcsin(np.sqrt(a))


def nearest_node(lat, lon):
    """Find the nearest graph node to a given lat/lon."""
    G = load_graph()
    try:
        import osmnx as ox
        return ox.nearest_nodes(G, lon, lat)
    except ImportError:
        # Fallback: manual nearest node
        min_dist = float('inf')
        nearest = None
        for node, data in G.nodes(data=True):
            d = _haversine(lat, lon, data.get('y', 0), data.get('x', 0))
            if d < min_dist:
                min_dist, nearest = d, node
        return nearest


def compute_diversion_routes(blocked_lat, blocked_lon, approach_points, num_alternatives=3):
    """
    Compute diversion routes around a blocked point.
    
    Args:
        blocked_lat, blocked_lon: Location of the blockage
        approach_points: List of dicts with lat/lon of approach directions
        num_alternatives: Number of alternative routes per approach
    
    Returns:
        List of diversion route dicts with coordinates and metrics
    """
    import networkx as nx
    G = load_graph()
    
    if G is None or G.number_of_nodes() == 0:
        return []
    
    blocked_node = nearest_node(blocked_lat, blocked_lon)
    
    # Find nodes within ~500m of blocked point to remove (simulating road closure)
    blocked_zone = set()
    for node, data in G.nodes(data=True):
        d = _haversine(blocked_lat, blocked_lon, data.get('y', 0), data.get('x', 0))
        if d < 0.5:  # 500m radius
            blocked_zone.add(node)
    
    diversions = []
    
    for approach in approach_points:
        origin_node = nearest_node(approach['lat'], approach['lon'])
        
        # Find a destination node on the opposite side of the blockage
        dest_lat = blocked_lat + (blocked_lat - approach['lat'])
        dest_lon = blocked_lon + (blocked_lon - approach['lon'])
        dest_node = nearest_node(dest_lat, dest_lon)
        
        if origin_node == dest_node:
            continue
        
        try:
            # Original route (through blocked area)
            original_path = nx.shortest_path(G, origin_node, dest_node, weight='length')
            original_length = nx.shortest_path_length(G, origin_node, dest_node, weight='length')
            original_coords = [(G.nodes[n].get('y', 0), G.nodes[n].get('x', 0)) for n in original_path]
        except nx.NetworkXNoPath:
            continue
        
        # Create modified graph with blocked zone removed
        G_modified = G.copy()
        G_modified.remove_nodes_from(blocked_zone)
        
        try:
            # Diversion route (avoiding blocked area)
            diversion_path = nx.shortest_path(G_modified, origin_node, dest_node, weight='length')
            diversion_length = nx.shortest_path_length(G_modified, origin_node, dest_node, weight='length')
            diversion_coords = [(G.nodes[n].get('y', 0), G.nodes[n].get('x', 0)) for n in diversion_path if n in G.nodes]
            
            distance_increase_pct = round((diversion_length - original_length) / original_length * 100, 1) if original_length > 0 else 0
            
            diversions.append({
                "approach": approach.get('name', f"Approach {len(diversions)+1}"),
                "original_route": {
                    "coordinates": original_coords[::max(1, len(original_coords)//20)],  # Subsample for frontend
                    "distance_km": round(original_length / 1000, 2)
                },
                "diversion_route": {
                    "coordinates": diversion_coords[::max(1, len(diversion_coords)//20)],
                    "distance_km": round(diversion_length / 1000, 2)
                },
                "distance_increase_pct": distance_increase_pct,
                "estimated_time_min": round(diversion_length / 1000 / 25 * 60, 0),  # Assuming 25 km/h avg urban speed
                "status": "COMPUTED"
            })
        except nx.NetworkXNoPath:
            diversions.append({
                "approach": approach.get('name', f"Approach {len(diversions)+1}"),
                "original_route": {"coordinates": original_coords[::max(1, len(original_coords)//20)], "distance_km": round(original_length/1000, 2)},
                "diversion_route": {"coordinates": [], "distance_km": 0},
                "distance_increase_pct": 0,
                "estimated_time_min": 0,
                "status": "NO_ALTERNATIVE"
            })
    
    return diversions


def get_graph_stats():
    """Return basic graph statistics."""
    G = load_graph()
    if G is None:
        return {"status": "NOT_LOADED"}
    return {
        "nodes": G.number_of_nodes(),
        "edges": G.number_of_edges(),
        "status": "LOADED"
    }
