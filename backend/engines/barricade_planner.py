"""
SEVA v5 — Barricade Planner Engine
Places barricades at high-traffic JUNCTIONS (intersections, entries, merge points)
NOT at police stations. Uses ASTraM heatmap data for real junction coordinates.

Methodology: ASTraM historical junction event density + angular perimeter containment.
"""
import numpy as np


def _haversine(lat1, lon1, lat2, lon2):
    lon1, lat1, lon2, lat2 = map(np.radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1; dlat = lat2 - lat1
    a = np.sin(dlat/2)**2 + np.cos(lat1)*np.cos(lat2)*np.sin(dlon/2)**2
    return 6371 * 2 * np.arcsin(np.sqrt(a))


# Bengaluru major junction coordinates extracted from ASTraM + OpenStreetMap
# These are real intersections/junctions, not police stations
BENGALURU_JUNCTIONS = {
    "Silk Board Junction": {"lat": 12.9172, "lon": 77.6227, "degree": 6, "type": "intersection"},
    "KR Puram Junction": {"lat": 13.0012, "lon": 77.6955, "degree": 5, "type": "intersection"},
    "Mekhri Circle": {"lat": 13.0135, "lon": 77.5794, "degree": 5, "type": "roundabout"},
    "Hebbal Flyover": {"lat": 13.0358, "lon": 77.5970, "degree": 6, "type": "flyover_entry"},
    "Marathahalli Bridge": {"lat": 12.9591, "lon": 77.7019, "degree": 5, "type": "bridge"},
    "Tin Factory Junction": {"lat": 12.9928, "lon": 77.6773, "degree": 5, "type": "intersection"},
    "Yelahanka Junction": {"lat": 13.1007, "lon": 77.5963, "degree": 4, "type": "intersection"},
    "Jayanagar 4th Block": {"lat": 12.9254, "lon": 77.5836, "degree": 5, "type": "intersection"},
    "Majestic (Kempegowda)": {"lat": 12.9767, "lon": 77.5713, "degree": 7, "type": "interchange"},
    "MG Road - Brigade Junction": {"lat": 12.9756, "lon": 77.6062, "degree": 5, "type": "intersection"},
    "Hudson Circle": {"lat": 12.9857, "lon": 77.5901, "degree": 5, "type": "roundabout"},
    "Shivajinagar Bus Stand": {"lat": 12.9858, "lon": 77.6047, "degree": 5, "type": "intersection"},
    "Halasuru Gate": {"lat": 12.9804, "lon": 77.6141, "degree": 4, "type": "intersection"},
    "Cubbon Park Entry": {"lat": 12.9763, "lon": 77.5929, "degree": 4, "type": "road_entry"},
    "Yeshwanthpur Circle": {"lat": 13.0220, "lon": 77.5460, "degree": 5, "type": "roundabout"},
    "Banashankari Junction": {"lat": 12.9255, "lon": 77.5468, "degree": 4, "type": "intersection"},
    "Koramangala Ring Road": {"lat": 12.9352, "lon": 77.6245, "degree": 5, "type": "merge_point"},
    "BTM Layout Junction": {"lat": 12.9166, "lon": 77.6101, "degree": 4, "type": "intersection"},
    "Indiranagar 100ft Rd": {"lat": 12.9719, "lon": 77.6412, "degree": 4, "type": "intersection"},
    "Domlur Flyover": {"lat": 12.9609, "lon": 77.6387, "degree": 4, "type": "flyover_entry"},
    "Richmond Circle": {"lat": 12.9694, "lon": 77.6005, "degree": 5, "type": "roundabout"},
    "Lalbagh West Gate": {"lat": 12.9507, "lon": 77.5797, "degree": 4, "type": "road_entry"},
    "Mysore Road - Chord Rd Junction": {"lat": 12.9568, "lon": 77.5457, "degree": 5, "type": "intersection"},
    "Hosur Road - Madiwala": {"lat": 12.9222, "lon": 77.6165, "degree": 5, "type": "intersection"},
    "Outer Ring Rd - Sarjapur": {"lat": 12.9108, "lon": 77.6834, "degree": 5, "type": "merge_point"},
    "Bellary Road - Sadashivanagar": {"lat": 13.0068, "lon": 77.5728, "degree": 4, "type": "intersection"},
    "Race Course Road": {"lat": 12.9860, "lon": 77.5720, "degree": 4, "type": "road_entry"},
    "Residency Road - Church St": {"lat": 12.9726, "lon": 77.6037, "degree": 4, "type": "intersection"},
    "JC Road - Town Hall": {"lat": 12.9636, "lon": 77.5815, "degree": 4, "type": "intersection"},
    "Kumara Park Junction": {"lat": 12.9950, "lon": 77.5668, "degree": 4, "type": "intersection"},
}


def compute_barricade_plan(event_lat, event_lon, event_type, station_data, eda_data, impact_radius_km=2.5):
    """
    Compute optimal barricade placement at JUNCTIONS around an event.
    
    Logic:
    1. Find all junctions within impact radius (real intersections, not stations)
    2. Identify perimeter junctions (40-100% of impact radius)
    3. Rank by: junction degree (connectivity), historical event density, angular position
    4. Select barricade candidates forming a containment perimeter ring
    
    Returns:
        Dict with barricade recommendations at actual road junctions
    """
    # Also use station profiles to get historical event density per area
    station_profiles = {sp['station']: sp for sp in eda_data.get('station_profiles', [])}
    
    # Step 1: Find all junctions within impact radius
    nearby_junctions = []
    for name, jdata in BENGALURU_JUNCTIONS.items():
        dist = _haversine(event_lat, event_lon, jdata['lat'], jdata['lon'])
        if dist <= impact_radius_km:
            # Compute event density from nearest station profile
            nearest_station_events = 0
            nearest_closure_rate = 0
            nearest_high_prio = 0
            for sname, sp in station_profiles.items():
                sdist = _haversine(jdata['lat'], jdata['lon'], 
                                   station_data.get(sname, {}).get('lat', 0),
                                   station_data.get(sname, {}).get('lon', 0))
                if sdist < 2.0:  # Within 2km of this junction
                    nearest_station_events = max(nearest_station_events, sp.get('total_events', 0))
                    nearest_closure_rate = max(nearest_closure_rate, sp.get('closure_rate', 0))
                    nearest_high_prio = max(nearest_high_prio, sp.get('high_priority_pct', 0))
            
            nearby_junctions.append({
                'name': name,
                'lat': jdata['lat'],
                'lon': jdata['lon'],
                'distance_km': round(dist, 2),
                'junction_degree': jdata['degree'],
                'junction_type': jdata['type'],
                'closure_rate': nearest_closure_rate,
                'total_events': nearest_station_events,
                'high_priority_pct': nearest_high_prio,
            })
    
    if not nearby_junctions:
        return {"barricades": [], "total": 0, "containment_score": 0,
                "without_barricades": {"affected_junctions": 0},
                "with_barricades": {"affected_junctions": 0}}
    
    # Step 2: Classify into zones
    inner_radius = impact_radius_km * 0.3
    perimeter_min = impact_radius_km * 0.35
    perimeter_max = impact_radius_km * 1.0
    
    inner_zone = [j for j in nearby_junctions if j['distance_km'] <= inner_radius]
    perimeter_zone = [j for j in nearby_junctions if perimeter_min <= j['distance_km'] <= perimeter_max]
    
    # If not enough perimeter junctions, use all nearby except closest
    if len(perimeter_zone) < 2:
        perimeter_zone = sorted(nearby_junctions, key=lambda j: j['distance_km'])[1:]
    
    # Step 3: Score each perimeter junction for barricade placement
    for junc in perimeter_zone:
        # Higher score = more critical for barricade
        junc['barricade_score'] = (
            junc['junction_degree'] * 1.5 +         # High-connectivity junctions are key containment points
            junc['closure_rate'] * 3.0 +             # Historical closure tendency
            min(junc['total_events'] / 100, 1.0) * 2.0 +  # Event density in area
            junc['high_priority_pct'] * 1.5 +        # Priority events ratio
            (1.0 if junc['junction_type'] in ('roundabout', 'interchange', 'flyover_entry') else 0.5)  # Strategic type bonus
        )
    
    # Step 4: Select top barricade locations with angular distribution
    perimeter_zone.sort(key=lambda j: j['barricade_score'], reverse=True)
    
    selected = []
    used_angles = []
    
    for junc in perimeter_zone:
        angle = np.degrees(np.arctan2(
            junc['lat'] - event_lat,
            junc['lon'] - event_lon
        ))
        
        # Check angular sector spacing (50-degree sectors for better coverage)
        too_close = False
        for ua in used_angles:
            diff = abs(angle - ua)
            if diff > 180:
                diff = 360 - diff
            if diff < 40:
                too_close = True
                break
        
        if not too_close or len(selected) < 2:
            reason = _generate_barricade_reason(junc, event_type)
            selected.append({
                'location': junc['name'],
                'lat': junc['lat'],
                'lon': junc['lon'],
                'distance_from_event_km': junc['distance_km'],
                'barricade_score': round(junc['barricade_score'], 2),
                'junction_type': junc['junction_type'].replace('_', ' ').title(),
                'junction_connectivity': junc['junction_degree'],
                'reason': reason,
                'historical_closure_rate': f"{junc['closure_rate']*100:.1f}%",
                'historical_events': junc['total_events'],
                'zone': 'perimeter'
            })
            used_angles.append(angle)
        
        if len(selected) >= 6:
            break
    
    # Compute containment effectiveness
    angular_coverage = len(used_angles) * 55  # Each barricade covers ~55 degrees
    containment_score = min(angular_coverage / 360, 1.0)
    
    # Compute barricade impact: junctions affected without vs with barricades
    total_nearby = len(nearby_junctions)
    contained = max(1, int(total_nearby * containment_score * 0.65))
    
    return {
        "barricades": selected,
        "total": len(selected),
        "containment_score": round(containment_score, 2),
        "containment_pct": round(containment_score * 100),
        "impact_radius_km": impact_radius_km,
        "junctions_in_radius": total_nearby,
        "inner_zone_junctions": len(inner_zone),
        "perimeter_junctions_analyzed": len(perimeter_zone),
        "without_barricades": {
            "affected_junctions": total_nearby,
            "spillover_risk": "HIGH" if total_nearby > 5 else "MEDIUM"
        },
        "with_barricades": {
            "affected_junctions": total_nearby - contained,
            "spillover_risk": "LOW" if containment_score > 0.7 else "MEDIUM"
        },
        "methodology": "Junction-based perimeter containment: barricades placed at high-connectivity intersections using ASTraM event density and angular distribution"
    }


def _generate_barricade_reason(junc, event_type):
    """Generate a plain-language reason for barricade placement."""
    reasons = []
    
    jtype = junc['junction_type'].replace('_', ' ')
    if junc['junction_degree'] >= 5:
        reasons.append(f"High-connectivity {jtype} ({junc['junction_degree']} roads converge)")
    
    if junc['closure_rate'] > 0.1:
        reasons.append(f"Historical closure rate {junc['closure_rate']*100:.0f}%")
    
    if junc['total_events'] > 100:
        reasons.append(f"High event density zone ({junc['total_events']} recorded events nearby)")
    
    if junc['junction_type'] in ('roundabout', 'interchange', 'flyover_entry'):
        reasons.append(f"Strategic traffic control point ({jtype})")
    
    if not reasons:
        reasons.append("Perimeter containment point to prevent congestion spillover")
    
    return ". ".join(reasons)
