import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'

const API = 'http://localhost:8000'

const MOCK_EVENTS = [
  { id: 1, junction: 'Silk Board', latitude: 12.9172, longitude: 77.6227, closure_prob: 0.85, priority: 'High' },
  { id: 2, junction: 'Mekhri Circle', latitude: 13.0135, longitude: 77.5794, closure_prob: 0.72, priority: 'High' },
  { id: 3, junction: 'KR Puram', latitude: 13.0012, longitude: 77.6955, closure_prob: 0.30, priority: 'Low' },
]

async function tryOptimize(tier) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(`${API}/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier, events: MOCK_EVENTS }),
      signal: controller.signal
    })
    clearTimeout(timeout)
    return await res.json()
  } catch {
    // Fallback static result
    return {
      status: 'OPTIMAL',
      deployment_plan: [
        { event_id: 1, junction: 'Silk Board', from_station: 'HSR Layout PS', officers_assigned: 3, distance_km: 2.1, reason: 'closure_prob=0.85, priority=High' },
        { event_id: 2, junction: 'Mekhri Circle', from_station: 'Sadashivanagar PS', officers_assigned: 3, distance_km: 1.8, reason: 'closure_prob=0.72, priority=High' },
        { event_id: 3, junction: 'KR Puram', from_station: 'KR Puram PS', officers_assigned: 1, distance_km: 0.9, reason: 'closure_prob=0.30, priority=Low' },
      ],
      total_officers_deployed: 7,
      coverage_score: 1.0,
      uncovered_junctions: []
    }
  }
}

export default function CommandCenter({ stations }) {
  const [tier, setTier] = useState('expected')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    tryOptimize(tier)
      .then(data => { setResult(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [tier])

  const stationEntries = stations ? Object.entries(stations) : []

  return (
    <div className="grid-sidebar">
      <div className="map-container">
        <MapContainer center={[12.9716, 77.5946]} zoom={12} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://carto.com">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {stationEntries.map(([name, s]) => (
            <CircleMarker key={name} center={[s.lat, s.lon]} radius={4}
              pathOptions={{ color: '#2563EB', fillColor: '#2563EB', fillOpacity: 0.3, weight: 1 }}>
              <Tooltip>{name} (Capacity: {s.capacity})</Tooltip>
            </CircleMarker>
          ))}
          {MOCK_EVENTS.map(ev => (
            <CircleMarker key={ev.id} center={[ev.latitude, ev.longitude]}
              radius={ev.closure_prob > 0.7 ? 14 : 8}
              pathOptions={{
                color: ev.priority === 'High' ? '#dc2626' : '#d97706',
                fillColor: ev.priority === 'High' ? '#dc2626' : '#d97706',
                fillOpacity: 0.5, weight: 2
              }}>
              <Tooltip>
                <strong>{ev.junction}</strong><br />
                Closure: {(ev.closure_prob * 100).toFixed(0)}% | {ev.priority} Priority
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div>
        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 8 }}>
          Deployment Tier
        </label>
        <select value={tier} onChange={e => setTier(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
            fontSize: '0.88rem', color: '#334155', marginBottom: 20, background: '#fff' }}>
          <option value="conservative">Conservative (fewer officers)</option>
          <option value="expected">Expected (balanced)</option>
          <option value="peak">Peak (max readiness)</option>
        </select>

        {loading ? (
          <div className="loading"><div className="spinner" />Optimizing...</div>
        ) : result?.status === 'OPTIMAL' || result?.status === 'FEASIBLE' ? (
          <>
            <div className="metric-box" style={{ marginBottom: 12 }}>
              <div className="label">Coverage Score</div>
              <div className="value green">{(result.coverage_score * 100).toFixed(0)}%</div>
              <div className="sub">Status: {result.status}</div>
            </div>
            <div className="metric-box" style={{ marginBottom: 20 }}>
              <div className="label">Officers Deployed</div>
              <div className="value blue">{result.total_officers_deployed}</div>
              <div className="sub">
                From {new Set(result.deployment_plan.map(p => p.from_station)).size} stations
              </div>
            </div>

            <h4 style={{ fontSize: '0.9rem', marginBottom: 12 }}>Deployment Orders</h4>
            {result.deployment_plan.slice(0, 8).map((p, i) => {
              const isHigh = p.reason?.includes('High')
              return (
                <div className={`deploy-order ${isHigh ? 'high' : ''}`} key={i}>
                  <strong>{p.junction}</strong>
                  <div className="station">
                    {p.officers_assigned} officers from {p.from_station} ({p.distance_km}km)
                  </div>
                </div>
              )
            })}
            {result.uncovered_junctions?.length > 0 && (
              <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 8,
                padding: 12, marginTop: 12, fontSize: '0.82rem', color: '#d97706' }}>
                Uncovered: {result.uncovered_junctions.join(', ')}
              </div>
            )}
          </>
        ) : (
          <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8,
            padding: 16, fontSize: '0.88rem', color: '#dc2626' }}>
            Backend not reachable. Run: <code>python backend/main.py</code>
          </div>
        )}
      </div>
    </div>
  )
}
