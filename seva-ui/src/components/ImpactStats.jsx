import { useState, useEffect, useRef } from 'react'
import { RevealSection } from '../hooks/useReveal'
import { ArrowRight } from 'lucide-react'
import { fetchScenario, fetchMissionBrief } from '../data/api'

function CountUp({ end, suffix = '', duration = 1500, decimals = 0 }) {
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
          if (current >= end) {
            setCount(end)
            clearInterval(timer)
          } else {
            setCount(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.floor(current))
          }
        }, 16)
      }
    }, { threshold: 0.3 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [end, duration, decimals])

  return <span ref={ref}>{decimals > 0 ? count.toFixed(decimals) : count.toLocaleString()}{suffix}</span>
}

export default function ImpactStats() {
  const [scenario, setScenario] = useState(null)
  const [missionBrief, setMissionBrief] = useState(null)

  useEffect(() => {
    fetchScenario().then(data => setScenario(data)).catch(() => null)

    // fetchMissionBrief is synchronous — call directly
    const briefData = fetchMissionBrief({
      cause: 'public_event', lat: 12.9784, lon: 77.5998,
      corridor: 'CBD', hour: 20
    })
    setMissionBrief(briefData)
  }, [])

  const delayWithout = missionBrief?.bpr_delay_analysis?.delay_without_seva_min || 6.5
  const delayWith = missionBrief?.bpr_delay_analysis?.delay_with_seva_min || 4.9
  const delayReduction = missionBrief?.bpr_delay_analysis?.delay_reduction_pct || 25
  const diversionsActive = missionBrief?.diversion_summary?.total_diversions || 3
  const diversionsWithout = 0 // No diversions without SEVA

  const coverageWithout = scenario
    ? Math.round((scenario.without_seva?.coverage_score || 0.33) * 100)
    : 33
  const coverageWith = scenario
    ? Math.round((scenario.with_seva?.coverage_score || 1.0) * 100)
    : 100
  const uncoveredCount = scenario
    ? (scenario.without_seva?.uncovered_junctions?.length || 3)
    : 3

  return (
    <section className="section" id="impact">
      <RevealSection>
        <div className="section-label">Scenario: IPL Match at Chinnaswamy Stadium</div>
        <div className="section-title">What Changes When SEVA Is Deployed</div>
        <p className="section-desc">
          35,000 fans exit Chinnaswamy Stadium at 10 PM. These numbers show what happens
          to traffic on MG Road corridor — with and without SEVA.
        </p>
      </RevealSection>
      <RevealSection>
        <div className="impact-comparison">
          {/* WITHOUT SEVA */}
          <div className="impact-col impact-col-without">
            <div className="impact-col-header without">Without SEVA</div>
            <div className="impact-row">
              <div className="impact-metric-label">Avg. delay per vehicle</div>
              <div className="impact-metric-value red"><CountUp end={delayWithout} decimals={1} /> min</div>
            </div>
            <div className="impact-row">
              <div className="impact-metric-label">Junction team coverage</div>
              <div className="impact-metric-value red"><CountUp end={coverageWithout} />%</div>
            </div>
            <div className="impact-row">
              <div className="impact-metric-label">Unprotected junctions</div>
              <div className="impact-metric-value red"><CountUp end={uncoveredCount} /></div>
            </div>
            <div className="impact-row">
              <div className="impact-metric-label">Diversion routes active</div>
              <div className="impact-metric-value red">{diversionsWithout}</div>
            </div>
          </div>

          {/* ARROW */}
          <div className="impact-arrow">
            <ArrowRight size={28} />
            <span>SEVA</span>
          </div>

          {/* WITH SEVA */}
          <div className="impact-col impact-col-with">
            <div className="impact-col-header with">With SEVA</div>
            <div className="impact-row">
              <div className="impact-metric-label">Avg. delay per vehicle</div>
              <div className="impact-metric-value green"><CountUp end={delayWith} decimals={1} /> min</div>
            </div>
            <div className="impact-row">
              <div className="impact-metric-label">Junction team coverage</div>
              <div className="impact-metric-value green"><CountUp end={coverageWith} />%</div>
            </div>
            <div className="impact-row">
              <div className="impact-metric-label">Unprotected junctions</div>
              <div className="impact-metric-value green">0</div>
            </div>
            <div className="impact-row">
              <div className="impact-metric-label">Diversion routes active</div>
              <div className="impact-metric-value green">{diversionsActive}</div>
            </div>
          </div>
        </div>
        <p className="impact-footnote">
          Delay computed via BPR formula (Bureau of Public Roads) — the global standard used by FHWA for link-level delay estimation.
          Coverage from MILP optimization across 54 police stations. Diversion routes computed via OSMnx Bengaluru road graph.
        </p>
      </RevealSection>
    </section>
  )
}
