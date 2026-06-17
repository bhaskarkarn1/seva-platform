import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, Clock, Users, Search, ShieldCheck } from 'lucide-react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import ImpactStats from './components/ImpactStats'
import Capabilities from './components/Capabilities'
import Dashboard from './pages/Dashboard'
import Footer from './components/Footer'

const API = 'http://localhost:8000'

export default function App() {
  const [eda, setEda] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [stations, setStations] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/eda`).then(r => r.json()).catch(() => null),
      fetch(`${API}/metrics`).then(r => r.json()).catch(() => null),
      fetch(`${API}/stations`).then(r => r.json()).catch(() => null),
    ]).then(([edaData, metricsData, stationsData]) => {
      setEda(edaData)
      setMetrics(metricsData)
      setStations(stationsData)
      setLoading(false)
    })
  }, [])

  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight
      setScrollProgress(total > 0 ? (window.scrollY / total) * 100 : 0)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="app">
      <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} />
      <Navbar />
      <Hero eda={eda} />
      <ImpactStats />
      <Capabilities />
      <Dashboard eda={eda} metrics={metrics} stations={stations} loading={loading} />
      <Footer />
    </div>
  )
}

