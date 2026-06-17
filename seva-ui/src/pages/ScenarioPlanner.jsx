import { useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Tooltip, Circle } from 'react-leaflet'
import L from 'leaflet'
import { Construction, Shield } from 'lucide-react'
import { fetchScenario } from '../data/api'

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
})

const barricadeIcon = new L.DivIcon({
  className: 'custom-icon',
  html: '<div style="background:#ea580c;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:700;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">B</div>'
})

export default function ScenarioPlanner() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const runScenario = () => {
    setLoading(true)
    fetchScenario()
      .then(data => { setResult(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  return (
    <div>
      <h3 style={{ fontSize: '1.2rem', marginBottom: 8 }}>Chinnaswamy 2025 IPL Egress Scenario</h3>
      <p style={{ color: '#475569', marginBottom: 20, lineHeight: 1.7 }}>
        Compare intuition-based deployment versus SEVA's MILP-optimized allocation.
        Includes barricade perimeter containment analysis.
      </p>

      <button className="btn-primary" onClick={runScenario} disabled={loading}>
        {loading ? 'Running OR-Tools MILP Optimization...' : 'Run Scenario Simulation'}
      </button>

      {result && (
        <div style={{ marginTop: 28 }}>
          <div className="improvement-banner">
            <div className="title">SEVA Improvement Over Intuition</div>
            <div className="value">+{(result.improvement?.coverage_gain * 100).toFixed(0)}% Coverage</div>
            <div className="detail">
              +{result.improvement?.additional_officers} officers deployed | {result.improvement?.junctions_secured} junctions secured
              {result.barricade_plan && ` | ${result.barricade_plan.total} barricade positions computed`}
            </div>
          </div>

          <div className="grid-2">
            <div>
              <div className="scenario-header without">Without SEVA (Intuition Based)</div>
              <div className="metric-box" style={{ marginBottom: 16 }}>
                <div className="label">Coverage</div>
                <div className="value red">{(result.without_seva.coverage_score * 100).toFixed(0)}%</div>
                <div className="sub">{result.without_seva.total_officers_deployed} officers deployed</div>
              </div>

              {result.without_seva.uncovered_junctions?.length > 0 && (
                <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8,
                  padding: 12, marginBottom: 16, fontSize: '0.82rem', color: '#dc2626' }}>
                  Uncovered: {result.without_seva.uncovered_junctions.join(', ')}
                </div>
              )}

              <table className="data-table">
                <thead><tr><th>Junction</th><th>Officers</th><th>Station</th><th>Dist</th></tr></thead>
                <tbody>
                  {result.without_seva.deployment_plan.map((p, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{p.junction}</td>
                      <td>{p.officers_assigned}</td>
                      <td>{p.from_station}</td>
                      <td>{p.distance_km}km</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="map-container" style={{ height: 280, marginTop: 16 }}>
                <MapContainer center={[12.9784, 77.5998]} zoom={14} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                  {result.events?.map(ev => (
                    <CircleMarker key={ev.id} center={[ev.latitude, ev.longitude]} radius={12}
                      pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.4, weight: 2 }}>
                      <Tooltip>{ev.junction}</Tooltip>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>
            </div>

            <div>
              <div className="scenario-header with">With SEVA (MILP Optimized)</div>
              <div className="metric-box" style={{ marginBottom: 16 }}>
                <div className="label">Coverage</div>
                <div className="value green">{(result.with_seva.coverage_score * 100).toFixed(0)}%</div>
                <div className="sub">{result.with_seva.total_officers_deployed} officers deployed</div>
              </div>

              {!result.with_seva.uncovered_junctions?.length && (
                <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: 8,
                  padding: 12, marginBottom: 16, fontSize: '0.82rem', color: '#16a34a', fontWeight: 600 }}>
                  All junctions fully covered
                </div>
              )}

              <table className="data-table">
                <thead><tr><th>Junction</th><th>Officers</th><th>Station</th><th>Dist</th></tr></thead>
                <tbody>
                  {result.with_seva.deployment_plan.map((p, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{p.junction}</td>
                      <td>{p.officers_assigned}</td>
                      <td>{p.from_station}</td>
                      <td>{p.distance_km}km</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="map-container" style={{ height: 280, marginTop: 16 }}>
                <MapContainer center={[12.9784, 77.5998]} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                  <Circle center={[12.9784, 77.5998]} radius={3000}
                    pathOptions={{ color: '#2563eb', fillOpacity: 0.05, weight: 1, dashArray: '6 4' }} />
                  {result.events?.map(ev => (
                    <CircleMarker key={ev.id} center={[ev.latitude, ev.longitude]} radius={12}
                      pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.4, weight: 2 }}>
                      <Tooltip>{ev.junction}</Tooltip>
                    </CircleMarker>
                  ))}
                  {result.with_seva.deployment_plan.map((p, i) => {
                    const ev = result.events?.find(e => e.id === p.event_id)
                    if (!ev) return null
                    return (
                      <Marker key={`m-${i}`} position={[ev.latitude + 0.001, ev.longitude + 0.001]} icon={greenIcon}>
                        <Tooltip>{p.officers_assigned} from {p.from_station}</Tooltip>
                      </Marker>
                    )
                  })}
                  {result.barricade_plan?.barricades?.map((b, i) => (
                    <Marker key={`bar-${i}`} position={[b.lat, b.lon]} icon={barricadeIcon}>
                      <Tooltip>{b.location}: {b.reason}</Tooltip>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>
          </div>

          {result.barricade_plan && result.barricade_plan.barricades?.length > 0 && (
            <div style={{ marginTop: 24, background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Construction size={16} color="#ea580c" /> Perimeter Barricade Plan
                <span style={{ marginLeft: 'auto', background: '#fff7ed', color: '#ea580c', padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                  {result.barricade_plan.total} positions | {(result.barricade_plan.containment_score * 100).toFixed(0)}% containment
                </span>
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Location</th>
                    <th style={thStyle}>Distance</th>
                    <th style={thStyle}>Closure Rate</th>
                    <th style={thStyle}>Score</th>
                    <th style={thStyle}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {result.barricade_plan.barricades.map((b, i) => (
                    <tr key={i}>
                      <td style={{...tdStyle, fontWeight: 600}}>{b.location}</td>
                      <td style={tdStyle}>{b.distance_from_event_km}km</td>
                      <td style={{...tdStyle, color: '#ea580c', fontWeight: 600}}>{b.historical_closure_rate}</td>
                      <td style={tdStyle}>{b.barricade_score}</td>
                      <td style={{...tdStyle, fontSize: '0.78rem', color: '#64748b'}}>{b.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f8fafc', borderRadius: 8, fontSize: '0.78rem', color: '#475569' }}>
                <Shield size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                <strong>Methodology:</strong> {result.barricade_plan.methodology}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const thStyle = {
  textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '2px solid #e2e8f0',
  fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase',
  letterSpacing: '0.05em'
}

const tdStyle = {
  padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9'
}
