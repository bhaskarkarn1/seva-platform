import { useState, useEffect } from 'react'
import { Shield, Radio, Clock } from 'lucide-react'

export default function Navbar() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const istTime = time.toLocaleTimeString('en-IN', { 
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
  })

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Shield size={24} color="#2563EB" strokeWidth={2.5} />
        <span style={{ fontWeight: 900, color: '#0f172a' }}>SEVA</span>
      </div>

      {/* Live operational strip — compact, no ASTraM label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="nav-status-item">
          <div className="nav-live-dot" />
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live</span>
        </div>
        <div className="nav-status-item">
          <Clock size={12} color="#94a3b8" />
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{istTime}</span>
        </div>
      </div>

      <div className="navbar-links">
        <a href="#overview" className="nav-link">Overview</a>
        <a href="#approach" className="nav-link">Approach</a>
        <a href="#impact" className="nav-link">Impact</a>
        <a href="#dashboard" className="nav-cta">
          <Radio size={14} style={{ marginRight: 4 }} /> Command Center
        </a>
      </div>
    </nav>
  )
}
