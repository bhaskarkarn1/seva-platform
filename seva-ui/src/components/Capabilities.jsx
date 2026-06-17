import { useState } from 'react'
import { BarChart3, AlertTriangle, Clock, Users, Construction, Navigation, BookOpen, Shield, Search } from 'lucide-react'
import { RevealSection, StaggerGrid } from '../hooks/useReveal'

const items = [
  { icon: Shield, color: 'blue', title: 'Mission Control',
    desc: 'One button produces a complete operational brief: risk assessment, officer deployment, barricade positions, and diversion routes.',
    detail: 'Generates comprehensive operational plans in <500ms. Combines all 5 engines into a single actionable briefing.',
    metrics: 'Input → Output in 1 click' },
  { icon: BarChart3, color: 'blue', title: 'Road Closure Prediction',
    desc: 'LightGBM binary classifier with PR-AUC 0.9945. Uses event spread, cause type, and spatial features.',
    detail: 'Trained on 8,057 historical events. Key features: event_spread_encoded, cause_type, corridor_status.',
    metrics: 'PR-AUC: 0.9945' },
  { icon: AlertTriangle, color: 'red', title: 'Priority Classification',
    desc: 'ROC-AUC 0.9999 multi-class classifier. Key drivers: corridor status, historical event frequency.',
    detail: 'Multi-class classification into priority levels. SHAP explainability for every prediction.',
    metrics: 'ROC-AUC: 0.9999' },
  { icon: Users, color: 'amber', title: 'Officer Deployment (MILP)',
    desc: 'OR-Tools Mixed Integer Programming across 54 stations with capacity and 5km distance constraints.',
    detail: 'Minimizes total deployment cost while ensuring coverage. Respects station capacity limits.',
    metrics: '54 stations, 5km max distance' },
  { icon: Construction, color: 'amber', title: 'Barricade Planner',
    desc: 'Junction-based perimeter containment at high-connectivity intersections using angular distribution and ASTraM event density.',
    detail: 'Identifies optimal barricade locations to maximize congestion containment with minimum resources.',
    metrics: 'Target: 70-90% containment' },
  { icon: Navigation, color: 'green', title: 'Diversion Engine',
    desc: 'OSMnx-powered Bengaluru road graph rerouting. Computes shortest alternative paths when junctions are blocked.',
    detail: 'Bengaluru road graph: 155,359 nodes, 393,717 edges. Real-time shortest path computation.',
    metrics: '155K nodes, 394K edges' },
  { icon: Clock, color: 'green', title: 'Resolution Time Estimation',
    desc: 'Quantile regression provides P25, P50, P75 estimates. Median absolute error of 0.73 hours.',
    detail: 'Predicts resolution time distribution, not just point estimates. Enables risk-based planning.',
    metrics: 'MAE: 0.73 hours' },
  { icon: BookOpen, color: 'red', title: 'Performance Monitor',
    desc: 'Closed-loop feedback comparing predictions vs actual outcomes. Concrete retraining triggers with threshold alerts.',
    detail: 'Monitors prediction drift, data quality, and model confidence. Automatic retraining recommendations.',
    metrics: 'Continuous improvement loop' },
  { icon: Search, color: 'blue', title: 'SHAP Explainability',
    desc: 'Every prediction explained with TreeSHAP feature attributions. No black boxes. Fully defensible.',
    detail: 'Judges can ask "why this prediction?" and get a quantitative answer for every metric.',
    metrics: 'Full transparency' },
]

export default function Capabilities() {
  const [activeCard, setActiveCard] = useState(null)

  return (
    <section className="section" id="capabilities">
      <RevealSection>
        <div className="section-label">Capabilities</div>
        <div className="section-title">3 ML Models + 5 Operational Engines</div>
        <p className="section-desc">
          Every capability is backed by real data, validated models, and mathematical optimization - not magic numbers.
        </p>
      </RevealSection>
      <StaggerGrid className="card-grid">
        {items.map((item, i) => (
          <div 
            className={`card ${activeCard === i ? 'card-pop' : ''}`} 
            key={i}
            onClick={() => setActiveCard(activeCard === i ? null : i)}
          >
            <div className={`card-icon ${item.color}`}>
              <item.icon size={20} />
            </div>
            <h4>{item.title}</h4>
            <p>{item.desc}</p>
            
            {/* Expanded details on click */}
            {activeCard === i && (
              <div style={{
                marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0',
                animation: 'slideUpFade 0.3s ease forwards'
              }}>
                <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.7, marginBottom: 8 }}>
                  {item.detail}
                </p>
                <div style={{
                  display: 'inline-block', background: '#eff6ff', color: '#2563eb',
                  padding: '4px 12px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700
                }}>
                  {item.metrics}
                </div>
              </div>
            )}
          </div>
        ))}
      </StaggerGrid>
    </section>
  )
}
