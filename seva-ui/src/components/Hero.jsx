import { useState, useEffect, useRef } from 'react'
import { Shield, AlertTriangle, Users, Construction, Navigation, TrendingDown, BookOpen, Zap } from 'lucide-react'
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

export default function Hero({ eda }) {
  const total = eda?.total_events || 8057
  const stationCount = eda?.station_profiles?.length || 54
  const corridorCount = eda?.corridor_profiles?.length || 22

  return (
    <>
      {/* Hero Section */}
      <section className="hero" id="overview">
        <h1>
          <span className="accent">SEVA</span>
        </h1>
        <p className="hero-subtitle">Smart Event-driven Vulnerability Analyzer</p>
        <p className="hero-sub">
          An AI-powered operational command center for <strong>Bengaluru Traffic Police</strong> that forecasts 
          event-driven congestion, deploys officers optimally, places barricades strategically, and 
          activates diversions - all before the first vehicle arrives.
        </p>

        {/* What is this project about */}
        <div style={{
          background: 'white', border: '1px solid #e2e8f0', borderRadius: 14,
          padding: '1.25rem 2rem', maxWidth: 800, margin: '0 auto 2rem', textAlign: 'left'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            The Problem We Solve
          </div>
          <p style={{ fontSize: '0.92rem', color: '#334155', lineHeight: 1.8, margin: 0 }}>
            Political rallies, IPL matches, festivals, construction, and sudden gatherings create localized traffic 
            breakdowns in Bengaluru. Today, event impact is <strong>not quantified in advance</strong>, resource deployment 
            is <strong>experience-driven</strong>, and there is <strong>no post-event learning system</strong>. SEVA solves all three 
            with data-driven forecasting, mathematical optimization, and closed-loop performance monitoring.
          </p>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <div className="num"><CountUp end={total} /></div>
            <div className="label">Events Analyzed</div>
          </div>
          <div className="hero-stat">
            <div className="num"><CountUp end={stationCount} duration={1000} /></div>
            <div className="label">Police Stations</div>
          </div>
          <div className="hero-stat">
            <div className="num"><CountUp end={corridorCount} duration={800} /></div>
            <div className="label">Corridors Mapped</div>
          </div>
          <div className="hero-stat">
            <div className="num"><CountUp end={3} duration={600} /></div>
            <div className="label">ML Models</div>
          </div>
          <div className="hero-stat">
            <div className="num"><CountUp end={5} duration={600} /></div>
            <div className="label">Operational Engines</div>
          </div>
        </div>
      </section>

      {/* How We Tackle It Section */}
      <section className="section" id="approach" style={{ background: '#f8fafc' }}>
        <RevealSection>
          <div className="section-label">Our Approach</div>
          <div className="section-title">How SEVA Tackles Event-Driven Congestion</div>
          <p className="section-desc">
            A 7-stage operational pipeline that transforms raw event data into actionable traffic management plans.
          </p>
        </RevealSection>
        <div className="approach-grid">
          {[
            { num: '01', icon: AlertTriangle, color: '#dc2626', title: 'Event Detection & Classification',
              desc: 'Classify incoming events by type, severity, and expected impact using LightGBM models trained on 8,057 historical events from the ASTraM dataset.',
              detail: 'PR-AUC: 0.9945 | ROC-AUC: 0.9999' },
            { num: '02', icon: TrendingDown, color: '#2563eb', title: 'Traffic Impact Forecasting',
              desc: 'Forecast hour-by-hour congestion using the BPR (Bureau of Public Roads) delay function. Estimate attendance → vehicles → V/C ratios for each approach corridor.',
              detail: 'BPR Formula: delay = t₀ × (1 + 0.15 × (V/C)⁴)' },
            { num: '03', icon: Users, color: '#7c3aed', title: 'Optimal Officer Deployment',
              desc: 'Mixed Integer Linear Programming (MILP) via OR-Tools allocates officers from 54 police stations with capacity and distance constraints.',
              detail: 'Constraint: 5km max distance, station capacity limits' },
            { num: '04', icon: Construction, color: '#ea580c', title: 'Barricade Placement',
              desc: 'Junction-based perimeter containment at high-connectivity intersections. Uses angular distribution and historical event density to maximize containment.',
              detail: 'Containment target: 70-90% of affected area' },
            { num: '05', icon: Navigation, color: '#16a34a', title: 'Diversion Planning',
              desc: 'OSMnx-powered road graph rerouting computes shortest alternative paths. Quantifies detour distance and expected delay reduction for each diversion.',
              detail: 'Bengaluru graph: 155K nodes, 394K edges' },
            { num: '06', icon: Zap, color: '#0891b2', title: 'Real-Time Execution',
              desc: 'One-click operational briefing generates deployment orders, barricade positions, diversion routes, and citizen advisories simultaneously.',
              detail: 'Complete brief in <500ms' },
            { num: '07', icon: BookOpen, color: '#9333ea', title: 'Post-Event Learning',
              desc: 'Closed-loop feedback compares predictions vs actual outcomes. Identifies drift, triggers model retraining, and continuously improves forecasting accuracy.',
              detail: 'Automated retraining triggers with threshold alerts' },
          ].map((step, i) => (
            <div key={i} className="approach-card">
              <div className="approach-num" style={{ background: step.color + '15', color: step.color }}>{step.num}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <step.icon size={18} color={step.color} />
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>{step.title}</h4>
                </div>
                <p style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.7, margin: '0 0 4px' }}>{step.desc}</p>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>{step.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
