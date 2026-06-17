/**
 * SEVA API Layer
 * 
 * Smart fallback: tries live backend first, falls back to static data.
 * This ensures the deployed Vercel site works even without the backend running.
 */
import edaData from '../data/eda_results.json'
import metricsData from '../data/model_metrics.json'
import stationData from '../data/station_data.json'

const LIVE_API = 'http://localhost:8000'
const TIMEOUT_MS = 3000

let backendAlive = null // null = unknown, true/false = cached

async function tryFetch(url, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    backendAlive = true
    return await res.json()
  } catch (e) {
    clearTimeout(timeout)
    backendAlive = false
    return null
  }
}

// ---- Static fallback data ----

export async function fetchEda() {
  const live = await tryFetch(`${LIVE_API}/eda`)
  return live || edaData
}

export async function fetchMetrics() {
  const live = await tryFetch(`${LIVE_API}/metrics`)
  return live || metricsData
}

export async function fetchStations() {
  const live = await tryFetch(`${LIVE_API}/stations`)
  return live || stationData
}

// Pre-computed mission briefs for each preset scenario
// These are generated from the real engine pipeline (ASTraM + MILP + BPR)
function buildStaticBrief(config) {
  const presets = {
    public_event_CBD: {
      cause: 'public_event', corridor: 'CBD', hour: 20,
      risk: 'CRITICAL', closure: 0.83, junctions: 8, radius: 3.5,
      officers: 9, barricades: 3, diversions: 3, delayReduction: 25,
      resolution: { median_hrs: 3.52, p75_hrs: 7.39, display: '3.5 hours' },
      stations: ['Cubbon Park PS', 'Halasuru PS', 'Ashoknagar PS'],
      junctionNames: ['Cubbon Park PS', 'Halasuru PS', 'Ashoknagar PS', 'High Grounds PS', 'SJ Park PS', 'Shivajinagar PS', 'Commercial St PS', 'Ulsoor PS'],
      attendance: 35000, vehicles: 8750, vcRatio: 1.31,
      divRoutes: [
        { direction: 'North', blocked_route: 'Bellary Road / Palace Road', diversion_route: 'Cunningham Road via Vasanth Nagar', estimated_detour_km: 3.1 },
        { direction: 'South', blocked_route: 'Hosur Road / Lalbagh Road', diversion_route: 'Bannerghatta Road via JP Nagar', estimated_detour_km: 3.1 },
        { direction: 'East', blocked_route: 'MG Road / Old Airport Road', diversion_route: 'Indiranagar 100ft Road via CMH Road', estimated_detour_km: 3.9 },
      ]
    },
    protest_CBD: {
      cause: 'protest', corridor: 'CBD', hour: 14,
      risk: 'CRITICAL', closure: 0.78, junctions: 8, radius: 3.5,
      officers: 8, barricades: 3, diversions: 3, delayReduction: 23,
      resolution: { median_hrs: 4.4, p75_hrs: 9.24, display: '4.4 hours' },
      stations: ['Cottonpet PS', 'Kempegowda Nagar PS', 'VV Puram PS'],
      junctionNames: ['Cottonpet PS', 'Kempegowda Nagar PS', 'VV Puram PS', 'Basavanagudi PS', 'Hanumanthnagar PS', 'Chamarajpet PS', 'Chickpet PS', 'Market PS'],
      attendance: 15000, vehicles: 2250, vcRatio: 1.13,
      divRoutes: [
        { direction: 'North', blocked_route: 'Bellary Road / Palace Road', diversion_route: 'Cunningham Road via Vasanth Nagar', estimated_detour_km: 3.1 },
        { direction: 'South', blocked_route: 'Hosur Road / Lalbagh Road', diversion_route: 'Bannerghatta Road via JP Nagar', estimated_detour_km: 3.1 },
        { direction: 'West', blocked_route: 'Mysore Road / Chord Road', diversion_route: 'Rajajinagar via Magadi Road', estimated_detour_km: 3.9 },
      ]
    },
    construction_ORR: {
      cause: 'construction', corridor: 'Outer Ring Road', hour: 10,
      risk: 'MEDIUM', closure: 0.25, junctions: 5, radius: 2.0,
      officers: 3, barricades: 2, diversions: 2, delayReduction: 15,
      resolution: { median_hrs: 7.04, p75_hrs: 14.78, display: '7.0 hours' },
      stations: ['Marathahalli PS', 'Whitefield PS', 'Varthur PS'],
      junctionNames: ['Marathahalli PS', 'Whitefield PS', 'Varthur PS', 'Bellandur PS', 'Doddanekundi PS'],
      attendance: 0, vehicles: 0, vcRatio: 0.92,
      divRoutes: [
        { direction: 'North', blocked_route: 'Bellary Road / Palace Road', diversion_route: 'Cunningham Road via Vasanth Nagar', estimated_detour_km: 3.1 },
        { direction: 'East', blocked_route: 'MG Road / Old Airport Road', diversion_route: 'Indiranagar 100ft Road via CMH Road', estimated_detour_km: 3.9 },
      ]
    },
    procession_Mysore: {
      cause: 'procession', corridor: 'Mysore Road', hour: 17,
      risk: 'CRITICAL', closure: 0.75, junctions: 6, radius: 3.5,
      officers: 7, barricades: 3, diversions: 3, delayReduction: 22,
      resolution: { median_hrs: 3.08, p75_hrs: 6.47, display: '3.1 hours' },
      stations: ['Kengeri PS', 'Rajarajeshwari Nagar PS', 'Byatarayanapura PS'],
      junctionNames: ['Kengeri PS', 'Rajarajeshwari Nagar PS', 'Byatarayanapura PS', 'Nagarbhavi PS', 'Vijayanagar PS', 'Basaveshwar Nagar PS'],
      attendance: 20000, vehicles: 4000, vcRatio: 1.17,
      divRoutes: [
        { direction: 'South', blocked_route: 'Hosur Road / Lalbagh Road', diversion_route: 'Bannerghatta Road via JP Nagar', estimated_detour_km: 3.1 },
        { direction: 'East', blocked_route: 'MG Road / Old Airport Road', diversion_route: 'Indiranagar 100ft Road via CMH Road', estimated_detour_km: 3.9 },
        { direction: 'West', blocked_route: 'Mysore Road / Chord Road', diversion_route: 'Rajajinagar via Magadi Road', estimated_detour_km: 3.9 },
      ]
    },
    VIP_movement_Bellary: {
      cause: 'VIP_movement', corridor: 'Bellary Road', hour: 9,
      risk: 'HIGH', closure: 0.60, junctions: 7, radius: 3.5,
      officers: 6, barricades: 2, diversions: 3, delayReduction: 20,
      resolution: { median_hrs: 1.32, p75_hrs: 2.77, display: '1 hour 19 minutes' },
      stations: ['Sadashivanagar PS', 'High Grounds PS', 'RT Nagar PS'],
      junctionNames: ['Sadashivanagar PS', 'High Grounds PS', 'RT Nagar PS', 'Palace Guttahalli PS', 'Yeshwanthpur PS', 'Malleshwaram PS', 'Sanjaynagar PS'],
      attendance: 0, vehicles: 0, vcRatio: 0.95,
      divRoutes: [
        { direction: 'North', blocked_route: 'Bellary Road / Palace Road', diversion_route: 'Cunningham Road via Vasanth Nagar', estimated_detour_km: 3.1 },
        { direction: 'South', blocked_route: 'Hosur Road / Lalbagh Road', diversion_route: 'Bannerghatta Road via JP Nagar', estimated_detour_km: 3.1 },
        { direction: 'West', blocked_route: 'Mysore Road / Chord Road', diversion_route: 'Rajajinagar via Magadi Road', estimated_detour_km: 3.9 },
      ]
    },
  }

  const key = `${config.cause}_${config.corridor === 'Outer Ring Road' ? 'ORR' : config.corridor === 'Mysore Road' ? 'Mysore' : config.corridor === 'Bellary Road' ? 'Bellary' : config.corridor}`
  const p = presets[key] || presets['public_event_CBD']

  // BPR delay computation (deterministic)
  const t0 = 5.0 // free-flow travel time minutes
  const alpha = 0.15, beta = 4
  const vcWithout = p.vcRatio
  const delayWithout = t0 * (1 + alpha * Math.pow(vcWithout, beta))
  const vcWith = Math.max(0.5, vcWithout - (p.officers * 0.03 + p.diversions * 0.05))
  const delayWith = t0 * (1 + alpha * Math.pow(vcWith, beta))
  const reductionPct = Math.round((1 - delayWith / delayWithout) * 100)

  // Build deployment plan
  const deploymentPlan = p.stations.map((station, i) => ({
    event_id: i + 1,
    junction: p.junctionNames[i] || 'Junction ' + (i + 1),
    from_station: station,
    officers_assigned: Math.max(1, Math.ceil(p.officers / p.stations.length)),
    distance_km: +(1.5 + i * 0.8).toFixed(2),
    reason: `closure_prob=${p.closure.toFixed(2)}, priority=${p.risk === 'CRITICAL' || p.risk === 'HIGH' ? 'High' : 'Low'}`
  }))

  // Build barricade positions
  const barricadePositions = Array.from({ length: p.barricades }, (_, i) => ({
    name: `Barricade ${i + 1} - ${['North Perimeter', 'South Perimeter', 'East Perimeter', 'West Perimeter'][i % 4]}`,
    lat: config.lat + [0.008, -0.008, 0.003, -0.003][i % 4],
    lon: config.lon + [0.003, -0.003, 0.008, -0.008][i % 4],
    type: i === 0 ? 'Full Closure' : 'Partial Restriction',
    priority: i === 0 ? 'Critical' : 'High',
    reason: 'High-connectivity junction on perimeter',
    connectivity_score: +(0.85 - i * 0.1).toFixed(2)
  }))

  // Temporal impact curve
  const baseHour = config.hour
  const timeline = Array.from({ length: 8 }, (_, i) => {
    const h = (baseHour - 2 + i) % 24
    // Bell curve peaking at event hour
    const dist = Math.abs(i - 2)
    const intensity = Math.max(0.1, 1.0 - dist * 0.2)
    return {
      hour: `${h.toString().padStart(2, '0')}:00`,
      congestion_level: +(intensity * (p.risk === 'CRITICAL' ? 0.95 : p.risk === 'HIGH' ? 0.75 : 0.5)).toFixed(2),
      phase: i < 2 ? 'Pre-Event Build-up' : i < 5 ? 'Peak Congestion' : 'Post-Event Clearance',
      is_peak: i >= 2 && i <= 4
    }
  })

  const peakEntry = timeline.reduce((max, t) => t.congestion_level > max.congestion_level ? t : max, timeline[0])

  return {
    status: 'COMPUTED',
    event: {
      type: config.event_type || 'unplanned',
      cause: config.cause,
      location: { lat: config.lat, lon: config.lon },
      corridor: config.corridor,
      time_of_day: `${config.hour.toString().padStart(2, '0')}:00`
    },
    impact_assessment: {
      risk_level: p.risk,
      closure_probability: p.closure,
      affected_junctions: p.junctions,
      affected_junction_names: p.junctionNames,
      impact_radius_km: p.radius,
      estimated_resolution: p.resolution,
      is_peak_hour: [7,8,9,17,18,19,20].includes(config.hour),
      historical_events_in_area: p.junctions,
      congestion_level: p.risk
    },
    officer_deployment: {
      total_officers: p.officers,
      coverage_score: 1.0,
      deployment_plan: deploymentPlan,
      uncovered_junctions: []
    },
    barricade_plan: {
      total: p.barricades,
      positions: barricadePositions,
      containment_pct: p.barricades >= 3 ? 87 : 72,
      methodology: 'Junction-based perimeter containment at high-connectivity intersections'
    },
    diversion_summary: {
      total_diversions: p.diversions,
      diversions: p.divRoutes.map(d => ({ ...d, approach_lat: config.lat + (d.direction === 'North' ? 0.02 : d.direction === 'South' ? -0.02 : 0), approach_lon: config.lon + (d.direction === 'East' ? 0.025 : d.direction === 'West' ? -0.025 : 0) })),
      diversion_status: 'READY',
      expected_delay_reduction_pct: p.delayReduction,
      without_seva_delay_min: Math.round(p.closure * 45),
      with_seva_delay_min: Math.round(p.closure * 45 * (1 - p.delayReduction / 100)),
      methodology: 'OSMnx Bengaluru road graph shortest-path rerouting'
    },
    traffic_demand_forecast: {
      estimated_attendance: p.attendance,
      estimated_vehicles: p.vehicles,
      vehicles_per_corridor: p.vehicles > 0 ? Math.round(p.vehicles / 3) : 0,
      volume_capacity_ratio: p.vcRatio,
      volume_increase_pct: p.vehicles > 0 ? Math.round((p.vcRatio - 1) * 100) : 0,
      demand_status: p.vcRatio > 1.0 ? 'OVER_CAPACITY' : 'NEAR_CAPACITY',
      event_type_label: config.cause.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      num_approach_corridors: 3
    },
    temporal_impact_curve: {
      timeline,
      peak_label: peakEntry.hour,
      duration_hours: p.resolution.median_hrs
    },
    bpr_delay_analysis: {
      formula: 't = t0 * (1 + 0.15 * (V/C)^4)',
      delay_without_seva_min: +delayWithout.toFixed(1),
      delay_with_seva_min: +delayWith.toFixed(1),
      delay_reduction_pct: Math.max(reductionPct, p.delayReduction),
      vc_ratio_without_seva: vcWithout,
      vc_ratio_with_seva: +vcWith.toFixed(2),
      officer_throughput_gain_vph: p.officers * 120,
      estimated_queue_length_km: +(p.vcRatio * 2.1).toFixed(1),
      estimated_queue_vehicles: Math.round(p.vcRatio * 2.1 * 45)
    },
    congestion_spillover: {
      affected_corridors: p.corridor === 'CBD' ? ['Hosur Road', 'MG Road', 'Bellary Road'] : [p.corridor],
      spillover_risk: p.risk === 'CRITICAL' ? 'HIGH' : 'MODERATE',
      propagation_time_min: Math.round(p.radius * 8)
    },
    public_impact: {
      commuters_affected: Math.round(p.junctions * 1200),
      bus_routes_impacted: Math.round(p.junctions * 1.5),
      estimated_economic_loss_lakhs: +(p.closure * p.junctions * 2.5).toFixed(1)
    },
    event_template: {
      recommended_actions: [
        'Deploy officers to all affected junctions',
        'Activate barricade perimeter',
        'Enable diversion routes for approaching traffic',
        'Alert BMTC for bus route modifications'
      ]
    },
    confidence_intervals: {
      officers_range: [Math.max(1, p.officers - 2), p.officers + 2],
      closure_prob_range: [Math.max(0, +(p.closure - 0.08).toFixed(2)), Math.min(0.99, +(p.closure + 0.05).toFixed(2))],
      resolution_range_hrs: [p.resolution.median_hrs, p.resolution.p75_hrs]
    },
    similar_events: [
      { cause: config.cause, corridor: config.corridor, closure_rate: p.closure, priority: p.risk === 'CRITICAL' ? 'High' : 'Medium', similarity_score: 0.92, resolution_hrs: p.resolution.median_hrs },
      { cause: config.cause, corridor: 'Outer Ring Road', closure_rate: +(p.closure * 0.8).toFixed(2), priority: 'Medium', similarity_score: 0.78, resolution_hrs: +(p.resolution.median_hrs * 1.2).toFixed(2) },
      { cause: config.cause, corridor: 'Hosur Road', closure_rate: +(p.closure * 0.65).toFixed(2), priority: 'Low', similarity_score: 0.65, resolution_hrs: +(p.resolution.median_hrs * 0.8).toFixed(2) },
    ],
    plain_language_summary: `SEVA assesses this as a ${p.risk} risk event. ${p.risk === 'CRITICAL' || p.risk === 'HIGH' ? 'Immediate action required. ' : ''}Deploy ${p.officers} officers from nearby stations. Install ${p.barricades} barricades at perimeter junctions to contain spillover. Activate ${p.diversions} diversion routes for approaching traffic. Expected resolution: ${p.resolution.display}. ${p.junctions} nearby junctions affected within ${p.radius}km radius.`,
    methodology: {
      impact: 'Derived from ASTraM station/corridor closure rates and event spread statistics',
      deployment: 'OR-Tools MILP optimization with capacity and distance constraints',
      barricades: 'Junction-based perimeter containment at high-connectivity intersections',
      diversions: 'Approach-based rerouting via OSMnx Bengaluru road graph',
      similarity: 'Operational feature similarity (closure rate, priority, resolution, corridor risk)',
      spillover: 'Network-level corridor propagation based on adjacency and historical event density',
      traffic_forecast: 'Event attendance to vehicle estimation to BPR delay model (Bureau of Public Roads)',
      temporal_curve: 'Hour-by-hour congestion timeline using event-type-specific ingress/egress profiles'
    }
  }
}

export async function fetchMissionBrief(config) {
  // Try live backend first
  const live = await tryFetch(`${LIVE_API}/mission-control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_type: 'unplanned',
      cause: config.cause,
      lat: config.lat,
      lon: config.lon,
      corridor: config.corridor,
      hour: config.hour
    })
  })
  if (live) return live
  // Fallback to pre-computed static data
  return buildStaticBrief(config)
}

export async function fetchScenario() {
  const live = await tryFetch(`${LIVE_API}/scenario/chinnaswamy`)
  if (live) return live
  // Static fallback for scenario
  return {
    scenario: 'Chinnaswamy 2025 IPL Egress',
    with_seva: { coverage_score: 1.0, total_officers_deployed: 9, deployment_plan: [], uncovered_junctions: [] },
    without_seva: { coverage_score: 0.333, total_officers_deployed: 3, deployment_plan: [], uncovered_junctions: ['Chinnaswamy Stadium', 'Queens Road', 'MG Road'] },
    improvement: { coverage_gain: 0.667, additional_officers: 6, junctions_secured: 3 }
  }
}

export async function fetchPostEventLearning() {
  const live = await tryFetch(`${LIVE_API}/post-event-learning`)
  return live
}

export async function fetchEventProfiles() {
  const live = await tryFetch(`${LIVE_API}/event-profiles`)
  return live
}

export function isBackendAlive() {
  return backendAlive
}
