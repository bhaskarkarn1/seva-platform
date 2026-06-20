import { useState } from 'react'
import { RevealSection } from '../hooks/useReveal'
import MissionControl from './MissionControl'
import VulnerabilityIntel from './VulnerabilityIntel'
import ScenarioPlanner from './ScenarioPlanner'
import PostEventLearning from './PostEventLearning'
import ModelPerformance from './ModelPerformance'
import DataExplorer from './DataExplorer'

const TABS = [
  'Mission Control',
  'Vulnerability Intel',
  'Scenario Planner',
  'Post-Event Learning',
  'Model Performance',
  'Data Explorer'
]

export default function Dashboard({ eda, metrics, stations, loading }) {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <section className="section section-alt" id="dashboard">
      <RevealSection>
        <div className="section-label">Interactive Dashboard</div>
        <div className="section-title">Operational Command Platform</div>
        <p className="section-desc">
          All analytics derived from ASTraM dataset and established traffic engineering models.
          Every metric is verifiable, every prediction is explainable.
        </p>
      </RevealSection>

      <div className="page-tabs">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            className={`page-tab ${activeTab === i ? 'active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 28 }}>
        {loading ? (
          <div className="loading">
            <div className="spinner" />
            Loading data from backend...
          </div>
        ) : (
          <div className="tab-content" key={activeTab}>
            {activeTab === 0 && <MissionControl />}
            {activeTab === 1 && <VulnerabilityIntel eda={eda} />}
            {activeTab === 2 && <ScenarioPlanner />}
            {activeTab === 3 && <PostEventLearning />}
            {activeTab === 4 && <ModelPerformance metrics={metrics} />}
            {activeTab === 5 && <DataExplorer eda={eda} />}
          </div>
        )}
      </div>
    </section>
  )
}
