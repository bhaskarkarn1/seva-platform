import { useState, useEffect, useRef } from 'react'
import { Shield, AlertTriangle, Users, Construction, Navigation, TrendingDown, BookOpen, Zap, ArrowRight } from 'lucide-react'
import { RevealSection } from '../hooks/useReveal'

function CountUp({ end, suffix = '', duration = 1500 }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const increment = end / (duration / 16)
        let current = 0
        const timer = setInterval(() => {
          current += increment
          if (current >= end) { setCount(end); clearInterval(timer) }
          else { setCount(Math.floor(current)) }
        }, 16)
      }
    }, { threshold: 0.3 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [end, duration])

  return <span ref={ref} className="count-up">{count.toLocaleString()}{suffix}</span>
}

const STATS = [
  { end: 8057, label: 'Events Analyzed', icon: '📊' },
  { end: 54, label: 'Police Stations', icon: '🏛', duration: 1000 },
  { end: 22, label: 'Corridors Mapped', icon: '🗺', duration: 800 },
  { end: 3, label: 'ML Models', icon: '🤖', duration: 600 },
  { end: 5, label: 'Operational Engines', icon: '⚙️', duration: 600 },
]

const APPROACH_STEPS = [
  { num: '01', icon: AlertTriangle, color: '#dc2626', title: 'Event Detection & Classification',
    desc: 'LightGBM models classify events by type, severity, and expected impact from 8,057 ASTraM events.',
    detail: 'PR-AUC: 0.9945' },
  { num: '02', icon: TrendingDown, color: '#2563eb', title: 'Traffic Impact Forecasting',
    desc: 'BPR delay function forecasts congestion. Estimates attendance to vehicle to V/C ratios per corridor.',
    detail: 'BPR: t0 x (1 + 0.15 x (V/C)^4)' },
  { num: '03', icon: Users, color: '#7c3aed', title: 'Optimal Officer Deployment',
    desc: 'MILP via OR-Tools allocates officers from 54 stations with capacity and distance constraints.',
    detail: '5km max, station limits' },
  { num: '04', icon: Construction, color: '#ea580c', title: 'Barricade Placement',
    desc: 'Junction-based perimeter containment at high-connectivity intersections using angular distribution.',
    detail: '70-90% containment' },
  { num: '05', icon: Navigation, color: '#16a34a', title: 'Diversion Planning',
    desc: 'OSMnx road graph rerouting computes shortest alternative paths with delay reduction estimates.',
    detail: '155K nodes, 394K edges' },
  { num: '06', icon: Zap, color: '#0891b2', title: 'Real-Time Execution',
    desc: 'One-click briefing generates deployment orders, barricade positions, and diversion routes.',
    detail: 'Brief in <500ms' },
  { num: '07', icon: BookOpen, color: '#9333ea', title: 'Post-Event Learning',
    desc: 'Closed-loop feedback compares predictions vs outcomes. Triggers model retraining on drift.',
    detail: 'Auto retraining alerts' },
]

export default function Hero({ eda }) {
  const total = eda?.total_events || 8057
  const stationCount = eda?.station_profiles?.length || 54
  const corridorCount = eda?.corridor_profiles?.length || 22

  return (
    <>
      {/* Hero Section - Premium Design */}
      <section className="hero" id="overview">
        {/* Animated Background Orbs */}
        <div className="hero-orbs">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>

        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Live Badge */}
          <div className="hero-pill">
            <span className="dot" />
            Flipkart Gridlock 6.0 | Problem Statement 2
          </div>

          <h1>
            <span className="accent">SEVA</span>
          </h1>
          <p className="hero-subtitle">Smart Event-driven Vulnerability Analyzer</p>
          <p className="hero-sub">
            An AI-powered operational command center for <strong>Bengaluru Traffic Police</strong> that forecasts 
            event-driven congestion, deploys officers optimally, places barricades strategically, and 
            activates diversions - all before the first vehicle arrives.
          </p>

          {/* Stats Cards */}
          <div className="hero-stats-grid">
            {STATS.map((s, i) => (
              <div key={i} className="hero-stat-card">
                <span className="hero-stat-icon">{s.icon}</span>
                <div className="hero-stat-num">
                  <CountUp end={i === 0 ? total : i === 1 ? stationCount : i === 2 ? corridorCount : s.end} duration={s.duration || 1500} />
                </div>
                <div className="hero-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <a href="#dashboard" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: 'white',
            padding: '14px 32px', borderRadius: 12, fontWeight: 700, fontSize: '0.95rem',
            marginTop: 32, textDecoration: 'none', transition: 'all 0.3s',
            boxShadow: '0 4px 20px rgba(37,99,235,0.3)'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(37,99,235,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,99,235,0.3)' }}
          >
            Launch Command Center <ArrowRight size={18} />
          </a>
        </div>
      </section>

      {/* Approach Section */}
      <section className="section" id="approach" style={{ background: '#f8fafc' }}>
        <RevealSection>
          <div className="section-label">Our Approach</div>
          <div className="section-title">How SEVA Tackles Event-Driven Congestion</div>
          <p className="section-desc">
            A 7-stage operational pipeline that transforms raw event data into actionable traffic management plans.
          </p>
        </RevealSection>
        <div className="approach-grid">
          {APPROACH_STEPS.map((step, i) => (
            <div key={i} className="approach-card">
              <div className="approach-card-header">
                <div className="approach-num" style={{ background: step.color + '15', color: step.color }}>{step.num}</div>
                <step.icon size={20} color={step.color} />
              </div>
              <h4 className="approach-card-title">{step.title}</h4>
              <p className="approach-card-desc">{step.desc}</p>
              <div className="approach-card-detail">{step.detail}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
