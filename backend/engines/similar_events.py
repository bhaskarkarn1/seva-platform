"""
SEVA v5 — Similar Event Retrieval Engine
Uses OPERATIONAL similarity (closure rate, priority, resolution, corridor risk)
instead of cause-dominant one-hot matching.

An accident on MG Road can retrieve construction on Hosur Road
if they have similar operational profiles.
"""
import numpy as np
from collections import defaultdict


def build_event_profiles(eda_data):
    """
    Build event type profiles from ASTraM EDA data.
    Each event type gets an OPERATIONAL profile (not just a name match).
    """
    station_profiles = eda_data.get('station_profiles', [])
    corridor_profiles = eda_data.get('corridor_profiles', [])
    cause_dist = eda_data.get('event_cause_dist', {})
    resolution = eda_data.get('resolution_time', {})
    
    # Group station data by cause to create operational profiles
    cause_stats = defaultdict(lambda: {
        'count': 0, 'closure_count': 0, 'high_prio_count': 0,
        'total_resolution_hrs': 0, 'resolution_count': 0,
        'corridors': set(), 'stations': set()
    })
    
    for sp in station_profiles:
        for cause, count in sp.get('top_causes', {}).items():
            stats = cause_stats[cause]
            stats['count'] += count
            stats['closure_count'] += int(sp.get('closure_rate', 0) * count)
            stats['high_prio_count'] += int(sp.get('high_priority_pct', 0) * count)
            stats['stations'].add(sp['station'])
            if sp.get('median_resolution_hrs'):
                stats['total_resolution_hrs'] += sp['median_resolution_hrs'] * count
                stats['resolution_count'] += count
    
    profiles = []
    for cause, stats in cause_stats.items():
        avg_resolution = (stats['total_resolution_hrs'] / stats['resolution_count'] 
                         if stats['resolution_count'] > 0 else None)
        closure_rate = stats['closure_count'] / stats['count'] if stats['count'] > 0 else 0
        high_prio_rate = stats['high_prio_count'] / stats['count'] if stats['count'] > 0 else 0
        
        profiles.append({
            'event_type': cause,
            'total_events': stats['count'],
            'closure_rate': round(closure_rate, 3),
            'high_priority_rate': round(high_prio_rate, 3),
            'avg_resolution_hrs': round(avg_resolution, 2) if avg_resolution else None,
            'affected_stations': len(stats['stations']),
            'station_names': sorted(stats['stations'])
        })
    
    profiles.sort(key=lambda p: p['total_events'], reverse=True)
    return profiles


def find_similar_events(query_cause, query_corridor, query_hour, eda_data, top_k=5):
    """
    Find the most operationally similar historical event profiles.
    
    Similarity is based on OPERATIONAL features:
    - Closure rate (how likely is road closure?)
    - Priority distribution (how severe?)
    - Resolution time (how long does it last?)
    - Corridor risk (what's the spatial risk profile?)
    - Time of day (temporal pattern)
    
    This means an accident on MG Road CAN retrieve construction on Hosur Road
    if they produce similar operational disruption.
    """
    profiles = build_event_profiles(eda_data)
    corridor_profiles = {cp['corridor']: cp for cp in eda_data.get('corridor_profiles', [])}
    
    if not profiles:
        return []
    
    # Build query operational vector (NO one-hot cause encoding)
    query_vec = _build_operational_vector(query_cause, query_corridor, query_hour, 
                                          profiles, corridor_profiles)
    
    # Compute similarity for each historical event type
    results = []
    for profile in profiles:
        # Get best-matching corridor for this profile
        profile_corridor = _get_profile_corridor(profile, eda_data)
        
        # Use peak hour for this cause type from historical data
        profile_hour = 17  # Default peak
        
        profile_vec = _build_operational_vector(
            profile['event_type'], profile_corridor, profile_hour,
            profiles, corridor_profiles
        )
        
        similarity = _cosine_similarity(query_vec, profile_vec)
        
        # Skip very low similarity
        if similarity > 0.2:
            # Generate operational match explanation
            match_reasons = _explain_similarity(query_cause, profile, corridor_profiles.get(query_corridor, {}))
            
            results.append({
                'event_type': profile['event_type'],
                'similarity_pct': round(similarity * 100, 1),
                'match_reason': match_reasons,
                'total_historical_events': profile['total_events'],
                'historical_closure_rate': f"{profile['closure_rate']*100:.1f}%",
                'historical_high_priority_rate': f"{profile['high_priority_rate']*100:.1f}%",
                'avg_resolution_hrs': profile['avg_resolution_hrs'],
                'affected_stations_count': profile['affected_stations'],
                'recommendation': _generate_recommendation(profile)
            })
    
    results.sort(key=lambda r: r['similarity_pct'], reverse=True)
    return results[:top_k]


def _build_operational_vector(cause, corridor, hour, profiles, corridor_profiles):
    """
    Build an OPERATIONAL feature vector for similarity computation.
    
    Key change from v4: NO one-hot cause encoding.
    Instead, uses the operational characteristics of each cause type.
    """
    vec = []
    
    # Find this cause's operational profile
    cause_profile = None
    for p in profiles:
        if p['event_type'] == cause:
            cause_profile = p
            break
    
    # Operational features (weighted for impact)
    closure_rate = cause_profile['closure_rate'] if cause_profile else 0.1
    high_prio_rate = cause_profile['high_priority_rate'] if cause_profile else 0.5
    resolution = (cause_profile['avg_resolution_hrs'] or 1.0) if cause_profile else 1.0
    station_spread = (cause_profile['affected_stations'] / 54.0) if cause_profile else 0.1
    
    # 1. Closure rate (strongest signal) - weight 3x
    vec.extend([closure_rate * 3.0])
    
    # 2. Priority rate - weight 2x
    vec.extend([high_prio_rate * 2.0])
    
    # 3. Resolution time (normalized to 0-1 scale) - weight 2x
    vec.extend([min(resolution / 10.0, 1.0) * 2.0])
    
    # 4. Spatial spread (how many stations affected) - weight 1.5x
    vec.extend([station_spread * 1.5])
    
    # 5. Cyclical hour encoding - weight 1x
    vec.append(np.sin(2 * np.pi * hour / 24))
    vec.append(np.cos(2 * np.pi * hour / 24))
    
    # 6. Corridor risk features - weight 1.5x
    cp = corridor_profiles.get(corridor, {})
    vec.append(cp.get('closure_rate', 0) * 1.5)
    vec.append(min(cp.get('total_events', 0) / 500, 1.0) * 1.5)
    vec.append(min(cp.get('median_resolution_hrs', 1) / 10, 1.0) * 1.5)
    
    return np.array(vec, dtype=float)


def _get_profile_corridor(profile, eda_data):
    """Get the most relevant corridor for a given event profile."""
    for cp in eda_data.get('corridor_profiles', []):
        if cp.get('corridor') != 'Non-corridor':
            return cp['corridor']
    return None


def _explain_similarity(query_cause, profile, query_corridor_data):
    """Generate a human-readable explanation of why events are similar."""
    reasons = []
    
    if profile['event_type'] == query_cause:
        reasons.append("Same event category")
    
    if profile['closure_rate'] > 0.1:
        reasons.append(f"Similar closure pattern ({profile['closure_rate']*100:.0f}%)")
    
    if profile['high_priority_rate'] > 0.5:
        reasons.append("Similar severity profile")
    
    if profile['avg_resolution_hrs'] and profile['avg_resolution_hrs'] > 2:
        reasons.append(f"Extended resolution (~{profile['avg_resolution_hrs']:.1f}h)")
    
    if not reasons:
        reasons.append("Similar operational disruption pattern")
    
    return " | ".join(reasons)


def _cosine_similarity(a, b):
    """Compute cosine similarity between two vectors."""
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _generate_recommendation(profile):
    """Generate an operational recommendation based on historical profile."""
    if profile['closure_rate'] > 0.15:
        return f"High closure risk. Pre-deploy closure management teams. Historical rate: {profile['closure_rate']*100:.0f}%"
    elif profile['high_priority_rate'] > 0.7:
        return f"High priority zone. Deploy rapid response units. {profile['high_priority_rate']*100:.0f}% events were high-priority."
    elif profile['avg_resolution_hrs'] and profile['avg_resolution_hrs'] > 5:
        return f"Extended resolution expected (~{profile['avg_resolution_hrs']:.1f}h). Plan for sustained deployment."
    else:
        return "Standard deployment protocol. Monitor escalation indicators."
