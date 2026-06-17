import { useState, useEffect, useRef } from 'react'

const MOCK_EVENTS = [
  { id: 1, junction: 'Silk Board', latitude: 12.9172, longitude: 77.6227, closure_prob: 0.85, priority: 'High' },
  { id: 2, junction: 'Mekhri Circle', latitude: 13.0135, longitude: 77.5794, closure_prob: 0.72, priority: 'High' },
  { id: 3, junction: 'KR Puram', latitude: 13.0012, longitude: 77.6955, closure_prob: 0.30, priority: 'Low' },
  { id: 4, junction: 'Marathahalli', latitude: 12.9565, longitude: 77.7010, closure_prob: 0.68, priority: 'High' },
  { id: 5, junction: 'Hebbal Flyover', latitude: 13.0358, longitude: 77.5970, closure_prob: 0.55, priority: 'Medium' },
]

function formatTime(d) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

export default function CommandCenter({ stations, apiBase }) {
  const [tier, setTier] = useState('expected')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeEvents, setActiveEvents] = useState([1, 2, 3]) // selected event IDs
  const [log, setLog] = useState([]) // persistent activity log
  const logRef = useRef(null)

  function addLog(message, type = 'info') {
    setLog(prev => [...prev, { time: new Date(), message, type }])
    setTimeout(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
    }, 50)
  }

  async function runOptimize(selectedTier, selectedEventIds) {
    const events = MOCK_EVENTS.filter(e => selectedEventIds.includes(e.id))
    if (events.length === 0) {
      addLog('No events selected. Select at least one event.', 'warning')
      return
    }

    setLoading(true)
    addLog(`Running MILP optimization | Tier: ${selectedTier} | Events: ${events.map(e => e.junction).join(', ')}`)

    const base = apiBase || 'http://localhost:8000'
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(`${base}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selectedTier, events }),
        signal: controller.signal
      })
      clearTimeout(timeout)
      const data = await res.json()
      setResult(data)
      setLoading(false)
      addLog(`MILP solved: ${data.status} | ${data.total_officers_deployed} officers | Coverage: ${(data.coverage_score * 100).toFixed(0)}%`, 'success')
      if (data.uncovered_junctions?.length > 0) {
        addLog(`Uncovered junctions: ${data.uncovered_junctions.join(', ')}`, 'warning')
      }
    } catch {
      // Fallback
      const fallback = buildFallback(events, selectedTier)
      setResult(fallback)
      setLoading(false)
      addLog(`Backend unreachable. Using pre-computed fallback | ${fallback.total_officers_deployed} officers`, 'warning')
    }
  }

  function buildFallback(events, selectedTier) {
    const mult = selectedTier === 'peak' ? 1.3 : selectedTier === 'conservative' ? 0.7 : 1.0
    const stationNames = ['HSR Layout PS', 'Sadashivanagar PS', 'KR Puram PS', 'Marathahalli PS', 'Hebbal PS',
      'Cubbon Park PS', 'Halasuru PS', 'Whitefield PS', 'Koramangala PS', 'Indiranagar PS']
    const plan = events.map((ev, i) => ({
      event_id: ev.id,
      junction: ev.junction,
      from_station: stationNames[i % stationNames.length],
      officers_assigned: Math.max(1, Math.round(ev.closure_prob * 3 * mult)),
      distance_km: +(1.2 + i * 0.6).toFixed(1),
      reason: `closure_prob=${ev.closure_prob.toFixed(2)}, priority=${ev.priority}`
    }))
    const totalOff = plan.reduce((s, p) => s + p.officers_assigned, 0)
    return {
      status: 'OPTIMAL',
      deployment_plan: plan,
      total_officers_deployed: totalOff,
      coverage_score: 1.0,
      uncovered_junctions: []
    }
  }

  // Run on mount
  useEffect(() => {
    addLog('Command Center initialized. System ready.')
    runOptimize(tier, activeEvents)
  }, [])

  function handleTierChange(newTier) {
    setTier(newTier)
    addLog(`Tier changed to: ${newTier}`)
    runOptimize(newTier, activeEvents)
  }

  function toggleEvent(evId) {
    setActiveEvents(prev => {
      const next = prev.includes(evId) ? prev.filter(id => id !== evId) : [...prev, evId]
      const ev = MOCK_EVENTS.find(e => e.id === evId)
      if (next.includes(evId)) {
        addLog(`Event added: ${ev.junction} (${(ev.closure_prob * 100).toFixed(0)}% closure)`)
      } else {
        addLog(`Event removed: ${ev.junction}`)
      }
      return next
    })
  }

  function handleReoptimize() {
    runOptimize(tier, activeEvents)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* Left: Events + Controls */}
      <div>
        <h4 style={{ fontSize: '0.9rem', marginBottom: 12, color: '#0f172a' }}>Active Events</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {MOCK_EVENTS.map(ev => {
            const active = activeEvents.includes(ev.id)
            return (
              <div key={ev.id} onClick={() => toggleEvent(ev.id)}
                style={{
                  padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                  border: active ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  background: active ? '#eff6ff' : '#fff',
                  transition: 'all 0.2s ease',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>{ev.junction}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Closure: {(ev.closure_prob * 100).toFixed(0)}% | {ev.priority}
                  </div>
                </div>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: ev.priority === 'High' ? '#dc2626' : ev.priority === 'Medium' ? '#d97706' : '#22c55e'
                }} />
              </div>
            )
          })}
        </div>

        <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
          Deployment Tier
        </label>
        <select value={tier} onChange={e => handleTierChange(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
            fontSize: '0.88rem', color: '#334155', marginBottom: 12, background: '#fff' }}>
          <option value="conservative">Conservative (fewer officers)</option>
          <option value="expected">Expected (balanced)</option>
          <option value="peak">Peak (max readiness)</option>
        </select>

        <button onClick={handleReoptimize} disabled={loading}
          className="btn-primary" style={{ marginBottom: 16 }}>
          {loading ? 'Optimizing...' : 'Re-Optimize Deployment'}
        </button>
      </div>

      {/* Right: Results + Log */}
      <div>
        {loading ? (
          <div className="loading"><div className="spinner" />Optimizing...</div>
        ) : result ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div className="metric-box">
                <div className="label">Coverage</div>
                <div className="value green">{(result.coverage_score * 100).toFixed(0)}%</div>
                <div className="sub">{result.status}</div>
              </div>
              <div className="metric-box">
                <div className="label">Officers</div>
                <div className="value blue">{result.total_officers_deployed}</div>
                <div className="sub">
                  {new Set(result.deployment_plan.map(p => p.from_station)).size} stations
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: '0.85rem', marginBottom: 10 }}>Deployment Orders</h4>
            {result.deployment_plan.map((p, i) => {
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
                padding: 10, marginTop: 10, fontSize: '0.8rem', color: '#d97706' }}>
                Uncovered: {result.uncovered_junctions.join(', ')}
              </div>
            )}
          </>
        ) : null}

        {/* Persistent Activity Log */}
        <div style={{ marginTop: 16 }}>
          <h4 style={{ fontSize: '0.82rem', marginBottom: 8, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Activity Log
          </h4>
          <div ref={logRef} style={{
            background: '#0f172a', borderRadius: 10, padding: 12, maxHeight: 200, overflowY: 'auto',
            fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: '0.72rem', lineHeight: 1.7
          }}>
            {log.length === 0 ? (
              <div style={{ color: '#475569' }}>Waiting for activity...</div>
            ) : (
              log.map((entry, i) => (
                <div key={i} style={{
                  color: entry.type === 'success' ? '#22c55e' : entry.type === 'warning' ? '#f59e0b' : entry.type === 'error' ? '#ef4444' : '#94a3b8'
                }}>
                  <span style={{ color: '#475569' }}>[{formatTime(entry.time)}]</span> {entry.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
