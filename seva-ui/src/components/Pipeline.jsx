import { RevealSection } from '../hooks/useReveal'

export default function Pipeline() {
  const steps = [
    { num: 1, title: 'Data Ingestion', desc: '8,057 ASTraM events: cleaned, K-NN imputed, temporally split' },
    { num: 2, title: 'Feature Engineering', desc: '40+ features: temporal, spatial, categorical, rolling historical' },
    { num: 3, title: 'ML Prediction', desc: 'LightGBM: closure (PR-AUC 0.99), priority (ROC 0.99), resolution time' },
    { num: 4, title: 'MILP Optimization', desc: 'OR-Tools solver deploys officers optimally across 54 stations' },
    { num: 5, title: 'Operational Engines', desc: 'Barricade planner, diversion engine (OSMnx), similar event retrieval' },
    { num: 6, title: 'Mission Control', desc: 'One button produces complete brief: officers, barricades, diversions' },
  ]

  return (
    <section className="section section-alt" id="methodology">
      <RevealSection>
        <div className="section-label">Our Approach</div>
        <div className="section-title">Data to deployment in six stages</div>
        <p className="section-desc">
          Every prediction is traceable to the ASTraM dataset. No hardcoded scores,
          no synthetic metrics, no fabricated intelligence.
        </p>
      </RevealSection>
      <RevealSection>
        <div className="pipeline">
          {steps.map(s => (
            <div className="pipe-step" key={s.num}>
              <div className="pipe-num">{s.num}</div>
              <h5>{s.title}</h5>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </RevealSection>
    </section>
  )
}
