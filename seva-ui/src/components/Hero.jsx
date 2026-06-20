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

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

const STATS = [
  { end: 8057, label: 'Events Analyzed', duration: 1500 },
  { end: 54, label: 'Police Stations', duration: 1000 },
  { end: 22, label: 'Corridors Mapped', duration: 800 },
  { end: 3, label: 'ML Models', duration: 600 },
  { end: 5, label: 'Operational Engines', duration: 600 },
]

const APPROACH_STEPS = [
  { num: '01', icon: AlertTriangle, color: '#dc2626', title: 'Event Detection & Classification',
    desc: 'LightGBM models classify events by type, severity, and expected impact from 8,057 ASTraM events.',
    detail: 'PR-AUC: 0.9945' },
  { num: '02', icon: TrendingDown, color: '#2563eb', title: 'Traffic Impact Forecasting',
    desc: 'BPR delay function forecasts congestion. Estimates attendance → vehicles → V/C ratios per corridor.',
    detail: 'BPR: t₀ × (1 + 0.15 × (V/C)⁴)' },
  { num: '03', icon: Users, color: '#7c3aed', title: 'Optimal Team Deployment',
    desc: 'MILP via OR-Tools allocates teams from 54 stations with capacity and distance constraints.',
    detail: '5km max, station limits' },
  { num: '04', icon: Construction, color: '#ea580c', title: 'Barricade Zone Placement',
    desc: 'Junction-based perimeter containment at high-connectivity intersections using angular distribution.',
    detail: '70–90% containment' },
  { num: '05', icon: Navigation, color: '#16a34a', title: 'Diversion Planning',
    desc: 'OSMnx road graph rerouting computes shortest alternative paths when junctions are blocked.',
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
      {/* Hero Section */}
      <section className="hero" id="overview">
        <div className="hero-inner">
          {/* Gridlock tag — subtle, not dominant */}
          <div style={{ 
            position: 'absolute', top: 24, right: 0, 
            fontSize: '0.6rem', fontWeight: 600, color: '#94a3b8', 
            letterSpacing: '0.06em', textTransform: 'uppercase',
            background: '#f8fafc', border: '1px solid #f1f5f9',
            padding: '4px 12px', borderRadius: 6
          }}>
            Gridlock 2.0 · PS 2
          </div>

          <h1 className="hero-title">
            <span className="hero-title-accent">SEVA</span>
          </h1>
          <p className="hero-tagline">Smart Event-Driven Vulnerability Analyzer</p>
          <p className="hero-description">
            An AI-powered operational command center for <strong>Bengaluru Traffic Police</strong> that forecasts 
            event-driven congestion, deploys teams optimally, and activates diversions — 
            all before the first vehicle arrives.
          </p>

          {/* Stats Row - sleek horizontal strip */}
          <div className="hero-stats-row">
            {STATS.map((s, i) => (
              <div key={i} className="hero-stat-item">
                <div className="hero-stat-number">
                  <CountUp end={i === 0 ? total : i === 1 ? stationCount : i === 2 ? corridorCount : s.end} duration={s.duration} />
                </div>
                <div className="hero-stat-text">{s.label}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <a href="#dashboard" className="hero-cta">
            Launch Command Center <ArrowRight size={18} />
          </a>
        </div>
      </section>

      {/* Approach Section */}
      <section className="section" id="approach">
        <RevealSection>
          <div className="section-label">Our Approach</div>
          <div className="section-title">How SEVA Tackles Event-Driven Congestion</div>
          <p className="section-desc">
            A 7-stage operational pipeline that transforms raw ASTraM event data into actionable traffic management plans.
            Every prediction is traceable, every metric is verifiable.
          </p>
        </RevealSection>
        <div className="approach-grid">
          {APPROACH_STEPS.map((step, i) => (
            <div key={i} className="approach-card">
              <div className="approach-card-header">
                <div className="approach-num" style={{ background: step.color + '12', color: step.color }}>{step.num}</div>
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
