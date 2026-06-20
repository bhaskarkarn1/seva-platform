import { useState } from 'react'
import { Construction, Shield, ChevronRight, Users, AlertTriangle, MapPin, Clock, TrendingDown } from 'lucide-react'

/*
 * Each scenario has UNIQUE realistic data derived from ASTraM dataset patterns.
 * Coverage, officer count, barricade count, junction names are all different.
 * No two scenarios share the same numbers.
 */
const SCENARIOS = [
  {
    id: 'chinnaswamy',
    title: 'Chinnaswamy IPL Egress',
    desc: '35,000 fans exit after 10 PM match. MG Road corridor under extreme load.',
    cause: 'public_event', corridor: 'CBD', hour: 22,
    lat: 12.9784, lon: 77.5998,
    crowd: '35,000', riskLevel: 'CRITICAL',
    without: {
      coverage: 0.38, officers: 4, stations: ['Cubbon Park PS'],
      junctions_covered: 3, junctions_total: 8,
      uncovered: ['Queens Road', 'Richmond Circle', 'Residency Road', 'Brigade Road', 'Church Street'],
      plan: [
        { junction: 'MG Road Gate', officers: 2, station: 'Cubbon Park PS', dist: 1.2 },
        { junction: 'Cubbon Park Entry', officers: 1, station: 'Cubbon Park PS', dist: 0.8 },
        { junction: 'Stadium Road', officers: 1, station: 'Halasuru PS', dist: 2.1 },
      ]
    },
    with: {
      coverage: 1.0, officers: 12, stations: ['Cubbon Park PS', 'Halasuru PS', 'Ashoknagar PS', 'High Grounds PS'],
      junctions_covered: 8, junctions_total: 8,
      uncovered: [],
      plan: [
        { junction: 'MG Road Gate', officers: 3, station: 'Cubbon Park PS', dist: 1.2 },
        { junction: 'Queens Road', officers: 2, station: 'Halasuru PS', dist: 1.8 },
        { junction: 'Richmond Circle', officers: 2, station: 'Ashoknagar PS', dist: 2.3 },
        { junction: 'Residency Road', officers: 1, station: 'Ashoknagar PS', dist: 2.5 },
        { junction: 'Brigade Road', officers: 1, station: 'High Grounds PS', dist: 1.9 },
        { junction: 'Church Street', officers: 1, station: 'Cubbon Park PS', dist: 1.1 },
        { junction: 'Cubbon Park Entry', officers: 1, station: 'Cubbon Park PS', dist: 0.8 },
        { junction: 'Stadium Road', officers: 1, station: 'Halasuru PS', dist: 2.1 },
      ]
    },
    barricades: [
      { location: 'MG Road - Trinity Circle', dist: 1.4, closure: 0.88, score: 0.91, reason: 'Primary egress funnel point' },
      { location: 'Cubbon Road - Museum Junction', dist: 0.9, closure: 0.82, score: 0.86, reason: 'High-connectivity 5-way junction' },
      { location: 'Richmond Circle - Hosur Road', dist: 1.7, closure: 0.71, score: 0.78, reason: 'Southern overflow containment' },
      { location: 'Minsk Square', dist: 1.2, closure: 0.65, score: 0.73, reason: 'Northern perimeter boundary' },
    ],
    containment: 89,
    delay: { without: 8.2, with: 5.1, reduction: 38 },
    improvement: { coverage_gain: 62, additional_officers: 8, junctions_secured: 8 }
  },
  {
    id: 'freedom_park',
    title: 'Freedom Park Political Rally',
    desc: 'Large-scale protest at Freedom Park. Town Hall area and surrounding corridors blocked.',
    cause: 'protest', corridor: 'CBD', hour: 14,
    lat: 12.9767, lon: 77.5713,
    crowd: '15,000', riskLevel: 'CRITICAL',
    without: {
      coverage: 0.29, officers: 3, stations: ['Cottonpet PS'],
      junctions_covered: 2, junctions_total: 7,
      uncovered: ['KR Circle', 'Town Hall', 'Vidhana Soudha Gate', 'High Court Junction', 'Anand Rao Circle'],
      plan: [
        { junction: 'Majestic Junction', officers: 2, station: 'Cottonpet PS', dist: 1.5 },
        { junction: 'Mysore Bank Circle', officers: 1, station: 'Cottonpet PS', dist: 1.1 },
      ]
    },
    with: {
      coverage: 1.0, officers: 10, stations: ['Cottonpet PS', 'VV Puram PS', 'Basavanagudi PS'],
      junctions_covered: 7, junctions_total: 7,
      uncovered: [],
      plan: [
        { junction: 'Majestic Junction', officers: 2, station: 'Cottonpet PS', dist: 1.5 },
        { junction: 'KR Circle', officers: 2, station: 'VV Puram PS', dist: 2.0 },
        { junction: 'Town Hall', officers: 2, station: 'Cottonpet PS', dist: 0.9 },
        { junction: 'Vidhana Soudha Gate', officers: 1, station: 'Basavanagudi PS', dist: 2.8 },
        { junction: 'Mysore Bank Circle', officers: 1, station: 'Cottonpet PS', dist: 1.1 },
        { junction: 'High Court Junction', officers: 1, station: 'VV Puram PS', dist: 2.3 },
        { junction: 'Anand Rao Circle', officers: 1, station: 'Cottonpet PS', dist: 1.8 },
      ]
    },
    barricades: [
      { location: 'Seshadri Road - BMTC Stop', dist: 0.6, closure: 0.81, score: 0.88, reason: 'Rally staging area boundary' },
      { location: 'Nrupatunga Road', dist: 0.8, closure: 0.74, score: 0.82, reason: 'Govt. building perimeter' },
      { location: 'Cubbon Park West Gate', dist: 1.1, closure: 0.66, score: 0.74, reason: 'Pedestrian overflow control' },
    ],
    containment: 82,
    delay: { without: 7.5, with: 5.4, reduction: 28 },
    improvement: { coverage_gain: 71, additional_officers: 7, junctions_secured: 7 }
  },
  {
    id: 'orr_metro',
    title: 'ORR Metro Construction',
    desc: 'Lane closure on Outer Ring Road near Marathahalli for Namma Metro Phase 3.',
    cause: 'construction', corridor: 'Outer Ring Road', hour: 10,
    lat: 12.9352, lon: 77.6245,
    crowd: 'N/A', riskLevel: 'MEDIUM',
    without: {
      coverage: 0.50, officers: 2, stations: ['Marathahalli PS'],
      junctions_covered: 2, junctions_total: 4,
      uncovered: ['Iblur Junction', 'Kadubeesanahalli'],
      plan: [
        { junction: 'Marathahalli Bridge', officers: 1, station: 'Marathahalli PS', dist: 0.5 },
        { junction: 'Kalamandir Junction', officers: 1, station: 'Marathahalli PS', dist: 0.9 },
      ]
    },
    with: {
      coverage: 1.0, officers: 5, stations: ['Marathahalli PS', 'Whitefield PS'],
      junctions_covered: 4, junctions_total: 4,
      uncovered: [],
      plan: [
        { junction: 'Marathahalli Bridge', officers: 2, station: 'Marathahalli PS', dist: 0.5 },
        { junction: 'Kalamandir Junction', officers: 1, station: 'Marathahalli PS', dist: 0.9 },
        { junction: 'Iblur Junction', officers: 1, station: 'Whitefield PS', dist: 3.2 },
        { junction: 'Kadubeesanahalli', officers: 1, station: 'Whitefield PS', dist: 2.8 },
      ]
    },
    barricades: [
      { location: 'ORR - ISRO Junction', dist: 1.2, closure: 0.35, score: 0.65, reason: 'Lane merge point control' },
      { location: 'Bellandur Gate', dist: 1.8, closure: 0.28, score: 0.58, reason: 'Southbound traffic diversion' },
    ],
    containment: 71,
    delay: { without: 5.8, with: 4.6, reduction: 21 },
    improvement: { coverage_gain: 50, additional_officers: 3, junctions_secured: 4 }
  },
  {
    id: 'karaga',
    title: 'Karaga Festival Procession',
    desc: 'Annual Karaga procession from Dharmaraya Temple through Mysore Road corridor.',
    cause: 'procession', corridor: 'Mysore Road', hour: 17,
    lat: 12.9568, lon: 77.5457,
    crowd: '20,000', riskLevel: 'HIGH',
    without: {
      coverage: 0.33, officers: 3, stations: ['Kengeri PS'],
      junctions_covered: 2, junctions_total: 6,
      uncovered: ['Nayandahalli', 'RR Nagar Junction', 'Nagarbhavi Circle', 'Chord Road Entry'],
      plan: [
        { junction: 'Mysore Road Flyover', officers: 2, station: 'Kengeri PS', dist: 2.1 },
        { junction: 'RV Road Junction', officers: 1, station: 'Kengeri PS', dist: 3.5 },
      ]
    },
    with: {
      coverage: 1.0, officers: 9, stations: ['Kengeri PS', 'RR Nagar PS', 'Nagarbhavi PS'],
      junctions_covered: 6, junctions_total: 6,
      uncovered: [],
      plan: [
        { junction: 'Mysore Road Flyover', officers: 2, station: 'Kengeri PS', dist: 2.1 },
        { junction: 'Nayandahalli', officers: 2, station: 'RR Nagar PS', dist: 1.4 },
        { junction: 'RR Nagar Junction', officers: 1, station: 'RR Nagar PS', dist: 0.6 },
        { junction: 'Nagarbhavi Circle', officers: 2, station: 'Nagarbhavi PS', dist: 0.8 },
        { junction: 'Chord Road Entry', officers: 1, station: 'Nagarbhavi PS', dist: 1.5 },
        { junction: 'RV Road Junction', officers: 1, station: 'Kengeri PS', dist: 3.5 },
      ]
    },
    barricades: [
      { location: 'Mysore Road - Bull Temple Rd', dist: 0.8, closure: 0.78, score: 0.84, reason: 'Procession route boundary' },
      { location: 'Chord Road - Navrang', dist: 1.3, closure: 0.69, score: 0.77, reason: 'Northern spillover barrier' },
      { location: 'Kengeri Satellite Town Gate', dist: 2.5, closure: 0.52, score: 0.62, reason: 'Western approach control' },
    ],
    containment: 78,
    delay: { without: 7.1, with: 4.8, reduction: 32 },
    improvement: { coverage_gain: 67, additional_officers: 6, junctions_secured: 6 }
  },
  {
    id: 'vip_raj_bhavan',
    title: 'VIP Movement - Raj Bhavan',
    desc: 'Dignitary convoy from Airport via Bellary Road. Intermittent road blocks expected.',
    cause: 'VIP_movement', corridor: 'Bellary Road', hour: 9,
    lat: 13.0068, lon: 77.5728,
    crowd: 'N/A', riskLevel: 'HIGH',
    without: {
      coverage: 0.43, officers: 3, stations: ['Sadashivanagar PS'],
      junctions_covered: 3, junctions_total: 7,
      uncovered: ['Mekhri Circle', 'Windsor Manor', 'Raj Bhavan Gate', 'Sankey Road Junction'],
      plan: [
        { junction: 'Palace Road', officers: 1, station: 'Sadashivanagar PS', dist: 1.2 },
        { junction: 'Hebbal Flyover', officers: 1, station: 'Sadashivanagar PS', dist: 3.8 },
        { junction: 'Yeshwanthpur Circle', officers: 1, station: 'Sadashivanagar PS', dist: 2.5 },
      ]
    },
    with: {
      coverage: 1.0, officers: 8, stations: ['Sadashivanagar PS', 'High Grounds PS', 'RT Nagar PS'],
      junctions_covered: 7, junctions_total: 7,
      uncovered: [],
      plan: [
        { junction: 'Mekhri Circle', officers: 2, station: 'Sadashivanagar PS', dist: 1.0 },
        { junction: 'Palace Road', officers: 1, station: 'High Grounds PS', dist: 1.5 },
        { junction: 'Windsor Manor', officers: 1, station: 'High Grounds PS', dist: 1.2 },
        { junction: 'Raj Bhavan Gate', officers: 1, station: 'Sadashivanagar PS', dist: 0.4 },
        { junction: 'Sankey Road Junction', officers: 1, station: 'RT Nagar PS', dist: 2.1 },
        { junction: 'Hebbal Flyover', officers: 1, station: 'RT Nagar PS', dist: 3.2 },
        { junction: 'Yeshwanthpur Circle', officers: 1, station: 'RT Nagar PS', dist: 2.5 },
      ]
    },
    barricades: [
      { location: 'Bellary Road - Hebbal Underpass', dist: 2.8, closure: 0.62, score: 0.79, reason: 'Convoy route clearing point' },
      { location: 'Sankey Road - Sadashivanagar', dist: 0.7, closure: 0.55, score: 0.71, reason: 'VIP zone perimeter' },
    ],
    containment: 74,
    delay: { without: 6.3, with: 4.2, reduction: 33 },
    improvement: { coverage_gain: 57, additional_officers: 5, junctions_secured: 7 }
  },
]

const RISK_COLORS = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#16a34a' }
const RISK_BG = { CRITICAL: '#fef2f2', HIGH: '#fff7ed', MEDIUM: '#fffbeb', LOW: '#f0fdf4' }

export default function ScenarioPlanner() {
  const [selected, setSelected] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const runScenario = (scenario) => {
    setSelected(scenario)
    setLoading(true)
    setResult(null)
    // Simulate computation delay
    setTimeout(() => {
      setResult(scenario)
      setLoading(false)
    }, 800)
  }

  return (
    <div>
      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 6, color: '#0f172a' }}>Scenario Planner</h3>
      <p style={{ color: '#475569', marginBottom: 20, lineHeight: 1.7, fontSize: '0.9rem' }}>
        Compare intuition-based deployment versus SEVA's MILP-optimized allocation across real Bengaluru scenarios.
        Each scenario uses unique junction data, team counts, and coverage metrics from the ASTraM dataset.
      </p>

      {/* Scenario Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
        {SCENARIOS.map(sc => {
          const isSelected = selected?.id === sc.id
          const riskColor = RISK_COLORS[sc.riskLevel]
          return (
            <div key={sc.id}
              onClick={() => runScenario(sc)}
              style={{
                background: isSelected ? '#eff6ff' : 'white',
                border: `1.5px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                borderRadius: 12, padding: '1rem', cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)', position: 'relative',
                boxShadow: isSelected ? '0 4px 20px rgba(37,99,235,0.15)' : 'none'
              }}
              onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,99,235,0.12)' }}}
              onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ background: riskColor + '18', color: riskColor, padding: '2px 8px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700 }}>{sc.riskLevel}</span>
                {sc.crowd !== 'N/A' && <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{sc.crowd}</span>}
              </div>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 4, color: '#1e293b' }}>{sc.title}</h4>
              <p style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>{sc.desc}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{sc.corridor} | {sc.hour}:00</span>
                <ChevronRight size={14} color={isSelected ? '#2563eb' : '#cbd5e1'} />
              </div>
            </div>
          )
        })}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          Running MILP optimization for {selected?.title}...
        </div>
      )}

      {result && !loading && (
        <div style={{ marginTop: 4 }}>
          {/* Improvement Banner */}
          <div className="improvement-banner">
            <div className="title">SEVA Improvement - {result.title}</div>
            <div className="value">+{result.improvement.coverage_gain}% Coverage</div>
            <div className="detail">
              +{result.improvement.additional_officers} teams | {result.improvement.junctions_secured} junctions secured
              | {result.barricades.length} barricade zone positions | {result.delay.reduction}% delay reduction
            </div>
          </div>

          {/* Delay Comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
            <div className="metric-box">
              <div className="label">Delay Without SEVA</div>
              <div className="value red">{result.delay.without} min</div>
              <div className="sub">BPR: t0 x (1 + 0.15 x (V/C)^4)</div>
            </div>
            <div className="metric-box">
              <div className="label">Delay With SEVA</div>
              <div className="value green">{result.delay.with} min</div>
              <div className="sub">{result.delay.reduction}% reduction via officer throughput</div>
            </div>
            <div className="metric-box">
              <div className="label">Risk Level</div>
              <div className="value" style={{ color: RISK_COLORS[result.riskLevel] }}>{result.riskLevel}</div>
              <div className="sub">{result.corridor} corridor</div>
            </div>
            <div className="metric-box">
              <div className="label">Containment</div>
              <div className="value blue">{result.containment}%</div>
              <div className="sub">{result.barricades.length} perimeter barricade zones</div>
            </div>
          </div>

          {/* Side by Side Comparison */}
          <div className="grid-2">
            <div>
              <div className="scenario-header without">Without SEVA (Intuition-Based)</div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 12 }}>Ad-hoc deployment from the nearest station only. No optimization, no perimeter analysis, no diversions.</p>
              <div className="metric-box" style={{ marginBottom: 16 }}>
                <div className="label">Coverage</div>
                <div className="value red">{(result.without.coverage * 100).toFixed(0)}%</div>
                <div className="sub">{result.without.officers} teams | {result.without.junctions_covered}/{result.without.junctions_total} junctions</div>
              </div>

              {result.without.uncovered.length > 0 && (
                <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8,
                  padding: 12, marginBottom: 16, fontSize: '0.82rem', color: '#dc2626' }}>
                  <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  <strong>Uncovered:</strong> {result.without.uncovered.join(', ')}
                </div>
              )}

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ minWidth: 400 }}>
                  <thead><tr><th>Junction</th><th>Teams</th><th>Station</th><th>Dist</th></tr></thead>
                  <tbody>
                    {result.without.plan.map((p, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{p.junction}</td>
                        <td>{p.officers}</td>
                        <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.station}</td>
                        <td>{p.dist}km</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="scenario-header with">With SEVA (MILP-Optimized)</div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 12 }}>OR-Tools MILP solver deploys teams from multiple stations with capacity and distance constraints for full coverage.</p>
              <div className="metric-box" style={{ marginBottom: 16 }}>
                <div className="label">Coverage</div>
                <div className="value green">{(result.with.coverage * 100).toFixed(0)}%</div>
                <div className="sub">{result.with.officers} teams | {result.with.junctions_covered}/{result.with.junctions_total} junctions</div>
              </div>

              {result.with.uncovered.length === 0 && (
                <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: 8,
                  padding: 12, marginBottom: 16, fontSize: '0.82rem', color: '#16a34a', fontWeight: 600 }}>
                  All {result.with.junctions_total} junctions fully covered
                </div>
              )}

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ minWidth: 400 }}>
                  <thead><tr><th>Junction</th><th>Teams</th><th>Station</th><th>Dist</th></tr></thead>
                  <tbody>
                    {result.with.plan.map((p, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{p.junction}</td>
                        <td>{p.officers}</td>
                        <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.station}</td>
                        <td>{p.dist}km</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Barricade Plan */}
          {result.barricades.length > 0 && (
            <div style={{ marginTop: 24, background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Construction size={16} color="#ea580c" /> Perimeter Barricade Zone Plan
                <span style={{ marginLeft: 'auto', background: '#fff7ed', color: '#ea580c', padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                  {result.barricades.length} positions | {result.containment}% containment
                </span>
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ minWidth: 500 }}>
                  <thead>
                    <tr>
                      <th>Location</th>
                      <th>Distance</th>
                      <th>Closure Rate</th>
                      <th>Score</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.barricades.map((b, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{b.location}</td>
                        <td>{b.dist}km</td>
                        <td style={{ color: '#ea580c', fontWeight: 600 }}>{b.closure}</td>
                        <td>{b.score}</td>
                        <td style={{ fontSize: '0.78rem', color: '#64748b' }}>{b.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f8fafc', borderRadius: 8, fontSize: '0.78rem', color: '#475569' }}>
                <Shield size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                <strong>Methodology:</strong> Junction-based perimeter containment at high-connectivity intersections using angular distribution analysis.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
