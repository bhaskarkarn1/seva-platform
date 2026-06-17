import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Shield, Users, Construction, Navigation, AlertTriangle, Clock, MapPin, ChevronDown, ChevronUp, Zap, TrendingDown, ArrowRight, Waves, Megaphone, BookOpen, History } from 'lucide-react';
import { fetchMissionBrief } from '../data/api';

const RISK_COLORS = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#ca8a04',
  LOW: '#16a34a'
};

const RISK_BG = {
  CRITICAL: 'rgba(220,38,38,0.08)',
  HIGH: 'rgba(234,88,12,0.08)',
  MEDIUM: 'rgba(202,138,4,0.08)',
  LOW: 'rgba(22,163,74,0.08)'
};

const EVENT_CAUSES = [
  { value: 'vehicle_breakdown', label: 'Vehicle Breakdown' },
  { value: 'accident', label: 'Accident' },
  { value: 'construction', label: 'Construction' },
  { value: 'water_logging', label: 'Water Logging' },
  { value: 'tree_fall', label: 'Tree Fall' },
  { value: 'public_event', label: 'Public Event / IPL Match' },
  { value: 'procession', label: 'Procession / Rally' },
  { value: 'protest', label: 'Protest / Demonstration' },
  { value: 'VIP_movement', label: 'VIP Movement' },
  { value: 'pot_holes', label: 'Potholes' },
  { value: 'road_conditions', label: 'Road Conditions' },
];

const CORRIDORS = [
  'CBD', 'Outer Ring Road', 'Bellary Road', 'Hosur Road', 'Tumkur Road',
  'Mysore Road', 'Old Airport Road', 'Bannerghatta Road', 'Kanakapura Road',
  'Sarjapur Road', 'Whitefield Road', 'Non-corridor'
];

// Real Bengaluru corridor center coordinates - auto-syncs lat/lon when corridor changes
const CORRIDOR_COORDINATES = {
  'CBD': { lat: 12.9716, lon: 77.5946 },
  'Outer Ring Road': { lat: 12.9352, lon: 77.6245 },
  'Bellary Road': { lat: 13.0068, lon: 77.5728 },
  'Hosur Road': { lat: 12.9141, lon: 77.6348 },
  'Tumkur Road': { lat: 13.0185, lon: 77.5160 },
  'Mysore Road': { lat: 12.9568, lon: 77.5457 },
  'Old Airport Road': { lat: 12.9636, lon: 77.6474 },
  'Bannerghatta Road': { lat: 12.8980, lon: 77.5970 },
  'Kanakapura Road': { lat: 12.8870, lon: 77.5650 },
  'Sarjapur Road': { lat: 12.9120, lon: 77.6780 },
  'Whitefield Road': { lat: 12.9698, lon: 77.7500 },
  'Non-corridor': { lat: 12.9716, lon: 77.5946 },
};

// Custom map icons
const officerIcon = new L.DivIcon({ className: 'custom-icon', html: '<div style="background:#2563eb;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:700;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">P</div>' });
const barricadeIcon = new L.DivIcon({ className: 'custom-icon', html: '<div style="background:#ea580c;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:700;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">B</div>' });
const eventIcon = new L.DivIcon({ className: 'custom-icon', html: '<div style="background:#dc2626;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:16px;font-weight:700;border:3px solid white;box-shadow:0 2px 8px rgba(220,38,38,0.5)">!</div>' });

export default function MissionControl() {
  const [config, setConfig] = useState({
    cause: 'public_event',
    corridor: 'CBD',
    hour: 17,
    lat: CORRIDOR_COORDINATES['CBD'].lat,
    lon: CORRIDOR_COORDINATES['CBD'].lon
  });
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);
  const [briefHistory, setBriefHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(true);
  const [error, setError] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const logRef = useRef(null);

  function addLog(msg, type = 'info') {
    setActivityLog(prev => [...prev, { time: new Date(), msg, type }]);
    setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 50);
  }

  useEffect(() => { addLog('Mission Control initialized. Select a scenario or configure an event.'); }, []);

  const runSimulation = async (overrideConfig) => {
    const cfg = overrideConfig || config;
    setLoading(true);
    setError(null);
    addLog(`Simulation started: ${cfg.cause.replace(/_/g, ' ')} | ${cfg.corridor} | ${cfg.hour}:00`);
    try {
      const data = await fetchMissionBrief(cfg);
      if (!data || !data.impact_assessment) {
        throw new Error('Invalid response');
      }
      // Push current brief to history before replacing
      if (brief) {
        setBriefHistory(prev => [{ brief, timestamp: new Date().toLocaleTimeString(), config: { ...config } }, ...prev].slice(0, 10));
      }
      setBrief(data);
      const risk = data.impact_assessment?.risk_level || 'UNKNOWN';
      addLog(`Brief computed: ${risk} risk | ${data.officer_deployment?.total_officers || 0} officers | ${data.barricade_plan?.total || 0} barricades`, risk === 'CRITICAL' ? 'error' : risk === 'HIGH' ? 'warning' : 'success');
      if (data.diversion_summary?.total_diversions) {
        addLog(`${data.diversion_summary.total_diversions} diversion routes activated | ~${data.diversion_summary.expected_delay_reduction_pct}% delay reduction`, 'success');
      }
    } catch (e) {
      console.error('Mission control error:', e);
      setError('Simulation failed. Please try again.');
      addLog(`ERROR: ${e.message}`, 'error');
    }
    setLoading(false);
  };

  const impact = brief?.impact_assessment;
  const deployment = brief?.officer_deployment;
  const barricades = brief?.barricade_plan;
  const similar = brief?.similar_events;

  return (
    <div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>Mission Control</h3>
      <p style={{ color: '#64748b', marginBottom: '1rem', fontSize: '0.9rem' }}>
        One button. One screen. Complete operational brief for Bengaluru Traffic Police.
      </p>

      {/* Command Center Live Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: 14, padding: '1rem 1.5rem', marginBottom: '1.25rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', animation: 'pulse 2s infinite' }} />
          <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Bengaluru Command Center</span>
        </div>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Active Incidents', value: brief ? '1' : '0', color: brief?.impact_assessment?.risk_level === 'CRITICAL' ? '#ef4444' : '#f59e0b' },
            { label: 'Officers Deployed', value: brief?.officer_deployment?.total_officers || '-', color: '#3b82f6' },
            { label: 'Barricades Active', value: brief?.barricade_plan?.total || '-', color: '#f97316' },
            { label: 'Diversions Live', value: brief?.diversion_summary?.total_diversions || '-', color: '#22c55e' },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Scenario Presets */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {[
          { label: 'IPL Match', cause: 'public_event', corridor: 'CBD', hour: 20, lat: 12.9784, lon: 77.5998 },
          { label: 'Political Rally', cause: 'protest', corridor: 'CBD', hour: 14, lat: 12.9767, lon: 77.5713 },
          { label: 'Metro Construction', cause: 'construction', corridor: 'Outer Ring Road', hour: 10, lat: 12.9352, lon: 77.6245 },
          { label: 'Festival Procession', cause: 'procession', corridor: 'Mysore Road', hour: 17, lat: 12.9568, lon: 77.5457 },
          { label: 'VIP Movement', cause: 'VIP_movement', corridor: 'Bellary Road', hour: 9, lat: 13.0068, lon: 77.5728 },
        ].map(preset => (
          <button key={preset.label} onClick={() => {
            const newCfg = { cause: preset.cause, corridor: preset.corridor, hour: preset.hour, lat: preset.lat, lon: preset.lon };
            setConfig(newCfg);
            addLog(`Scenario selected: ${preset.label}`);
            // Defer simulation to next tick to avoid React state race
            setTimeout(() => runSimulation(newCfg), 0);
          }} style={{
            padding: '0.375rem 0.875rem', border: '1px solid #cbd5e1', borderRadius: 20,
            background: config.cause === preset.cause && config.corridor === preset.corridor ? '#2563eb' : 'white',
            color: config.cause === preset.cause && config.corridor === preset.corridor ? 'white' : '#475569',
            fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
          }}>
            {preset.label}
          </button>
        ))}
      </div>

      {/* Event Configuration Panel */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Event Type</label>
            <select value={config.cause} onChange={e => setConfig({...config, cause: e.target.value})} style={selectStyle}>
              {EVENT_CAUSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Corridor</label>
            <select value={config.corridor} onChange={e => {
              const c = e.target.value;
              const coords = CORRIDOR_COORDINATES[c] || CORRIDOR_COORDINATES['CBD'];
              setConfig({...config, corridor: c, lat: coords.lat, lon: coords.lon});
            }} style={selectStyle}>
              {CORRIDORS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time (Hour)</label>
            <select value={config.hour} onChange={e => setConfig({...config, hour: parseInt(e.target.value)})} style={selectStyle}>
              {Array.from({length: 24}, (_, i) => <option key={i} value={i}>{`${i.toString().padStart(2,'0')}:00`}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</label>
            <div style={{ ...selectStyle, background: '#f1f5f9', color: '#475569', fontSize: '0.82rem', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>📍</span> {config.lat.toFixed(4)}°N, {config.lon.toFixed(4)}°E
            </div>
          </div>
        </div>
        <button onClick={runSimulation} disabled={loading} style={{
          width: '100%', marginTop: '1rem', padding: '0.875rem', background: loading ? '#94a3b8' : '#2563eb',
          color: 'white', border: 'none', borderRadius: 10, fontSize: '1rem', fontWeight: 700,
          cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'background 0.2s'
        }}>
          <Zap size={18} /> {loading ? 'Computing Operational Brief...' : 'Run Event Simulation'}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '1rem', marginBottom: '1rem', color: '#dc2626', fontSize: '0.88rem', fontWeight: 600, textAlign: 'center' }}>
          {error}
        </div>
      )}

      {/* Results */}
      {brief && impact && (
        <div className="seq-reveal" style={{ overflowX: 'hidden' }}>
          {/* Executive Summary Card - FOR POLICE */}
          <div style={{
            background: RISK_BG[impact.risk_level],
            border: `2px solid ${RISK_COLORS[impact.risk_level]}`,
            borderRadius: 14, padding: '1.5rem', marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
              <div style={{
                background: RISK_COLORS[impact.risk_level], color: 'white',
                padding: '6px 16px', borderRadius: 8, fontWeight: 800, fontSize: '0.85rem',
                letterSpacing: '0.05em'
              }}>
                {impact.risk_level} RISK
              </div>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                {brief.event.cause.replace(/_/g, ' ').toUpperCase()} at {brief.event.time_of_day}
              </span>
            </div>

            <p style={{ fontSize: '1rem', lineHeight: 1.7, color: '#1e293b', marginBottom: '1.25rem' }}>
              {brief.plain_language_summary}
            </p>

            {/* Key Metrics Grid with Intel Tooltips */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
              <MetricCard icon={<AlertTriangle size={18} />} label="Closure Probability" value={`${(impact.closure_probability * 100).toFixed(0)}%`} sub={brief.confidence_intervals ? `${(brief.confidence_intervals.closure_prob_range[0]*100).toFixed(0)}–${(brief.confidence_intervals.closure_prob_range[1]*100).toFixed(0)}%` : null} color={RISK_COLORS[impact.risk_level]}
                intel={[
                  { label: 'Primary Driver', value: brief.event.cause.replace(/_/g, ' ') },
                  { label: 'Corridor Risk', value: impact.congestion_level },
                  { label: 'Peak Hour', value: impact.is_peak_hour ? 'Yes - higher weight' : 'No - off-peak' },
                  { label: 'Method', value: 'ASTraM historical rates + domain calibration' },
                ]} />
              <MetricCard icon={<MapPin size={18} />} label="Affected Junctions" value={impact.affected_junctions} color="#2563eb"
                intel={[
                  { label: 'Impact Radius', value: `${impact.impact_radius_km} km` },
                  { label: 'Key Junctions', value: impact.affected_junction_names?.slice(0, 3).join(', ') || 'N/A' },
                ]} />
              <MetricCard icon={<Users size={18} />} label="Officers Required" value={deployment.total_officers} sub={brief.confidence_intervals ? `${brief.confidence_intervals.officers_range[0]}–${brief.confidence_intervals.officers_range[1]}` : null} color="#2563eb"
                intel={[
                  { label: 'Optimizer', value: 'OR-Tools MILP' },
                  { label: 'Stations Used', value: `${deployment.deployment_plan?.length || 0} stations` },
                  { label: 'Max Distance', value: '5 km constraint' },
                ]} />
              <MetricCard icon={<Construction size={18} />} label="Barricades" value={barricades.total} sub={barricades.containment_pct ? `${barricades.containment_pct}% containment` : null} color="#ea580c"
                intel={[
                  { label: 'Method', value: 'Junction perimeter containment' },
                  { label: 'Coverage', value: `${barricades.containment_pct || 0}% area contained` },
                ]} />
              <MetricCard icon={<Navigation size={18} />} label="Diversions" value={brief.diversion_summary?.total_diversions || 0} color="#16a34a"
                intel={[
                  { label: 'Engine', value: 'OSMnx road graph rerouting' },
                  { label: 'Graph Size', value: '155K nodes, 394K edges' },
                ]} />
              <MetricCard icon={<TrendingDown size={18} />} label="Delay Reduction" value={`${brief.bpr_delay_analysis?.delay_reduction_pct || brief.diversion_summary?.expected_delay_reduction_pct || 0}%`} color="#059669"
                intel={[
                  { label: 'Formula', value: 'BPR: t₀×(1+0.15×(V/C)⁴)' },
                  { label: 'Source', value: 'Bureau of Public Roads (FHWA)' },
                ]} />
              <MetricCard icon={<Clock size={18} />} label="Est. Resolution" value={impact.estimated_resolution.display} color="#7c3aed"
                intel={[
                  { label: 'P25', value: `${impact.estimated_resolution.p75_hrs ? (impact.estimated_resolution.median_hrs * 0.6).toFixed(1) : '-'}h` },
                  { label: 'Median (P50)', value: `${impact.estimated_resolution.median_hrs}h` },
                  { label: 'P75', value: `${impact.estimated_resolution.p75_hrs}h` },
                  { label: 'Model', value: 'Quantile Regression' },
                ]} />
            </div>
          </div>

          {/* === TRAFFIC DEMAND FORECAST === */}
          {brief.traffic_demand_forecast && brief.traffic_demand_forecast.estimated_attendance > 0 && (
            <div style={{
              background: 'white', border: '1px solid #e2e8f0', borderRadius: 14,
              padding: '1.25rem', marginBottom: '1.5rem'
            }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Megaphone size={16} color="#7c3aed" /> Traffic Demand Forecast
                <span style={{ marginLeft: 'auto', background: brief.traffic_demand_forecast.demand_status === 'OVER_CAPACITY' ? '#fef2f2' : '#fffbeb',
                  color: brief.traffic_demand_forecast.demand_status === 'OVER_CAPACITY' ? '#dc2626' : '#ca8a04',
                  padding: '3px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>
                  {brief.traffic_demand_forecast.demand_status}
                </span>
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                {[
                  { label: 'Est. Attendance', value: brief.traffic_demand_forecast.estimated_attendance.toLocaleString(), color: '#7c3aed' },
                  { label: 'Additional Vehicles', value: brief.traffic_demand_forecast.estimated_vehicles.toLocaleString(), color: '#2563eb' },
                  { label: 'Per Corridor', value: `${brief.traffic_demand_forecast.vehicles_per_corridor.toLocaleString()} veh/hr`, color: '#ea580c' },
                  { label: 'V/C Ratio', value: brief.traffic_demand_forecast.volume_capacity_ratio, color: brief.traffic_demand_forecast.volume_capacity_ratio > 1.0 ? '#dc2626' : '#ca8a04' },
                  { label: 'Volume Increase', value: `+${brief.traffic_demand_forecast.volume_increase_pct}%`, color: '#dc2626' },
                ].map((item, i) => (
                  <div key={i} className="metric-box" style={{ textAlign: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                Pipeline: {brief.traffic_demand_forecast.event_type_label} → {brief.traffic_demand_forecast.estimated_attendance.toLocaleString()} attendees × {(brief.traffic_demand_forecast.estimated_vehicles / brief.traffic_demand_forecast.estimated_attendance).toFixed(2)} vehicle ratio → {brief.traffic_demand_forecast.estimated_vehicles.toLocaleString()} vehicles across {brief.traffic_demand_forecast.num_approach_corridors} corridors
              </div>
            </div>
          )}

          {/* === BPR DELAY ANALYSIS === */}
          {brief.bpr_delay_analysis && (
            <div style={{
              background: 'linear-gradient(135deg, #faf5ff 0%, #f0f9ff 100%)',
              border: '1px solid #ddd6fe', borderRadius: 14, padding: '1.25rem', marginBottom: '1.5rem'
            }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingDown size={16} color="#059669" /> BPR Delay Analysis
                <span style={{ marginLeft: 'auto', background: '#ecfdf5', color: '#059669', padding: '3px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>
                  {brief.bpr_delay_analysis.delay_reduction_pct}% delay reduction
                </span>
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ background: '#fef2f2', borderRadius: 10, padding: '1rem', textAlign: 'center', border: '1px solid #fecaca' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', marginBottom: 4 }}>Without SEVA</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#dc2626' }}>{brief.bpr_delay_analysis.delay_without_seva_min}<span style={{ fontSize: '0.9rem' }}> min</span></div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>V/C = {brief.bpr_delay_analysis.vc_ratio_without_seva}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowRight size={24} color="#059669" />
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669', marginTop: 4 }}>−{brief.bpr_delay_analysis.delay_reduction_pct}%</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{brief.bpr_delay_analysis.officer_throughput_gain_vph} veh/hr managed</div>
                </div>
                <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '1rem', textAlign: 'center', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', marginBottom: 4 }}>With SEVA</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a' }}>{brief.bpr_delay_analysis.delay_with_seva_min}<span style={{ fontSize: '0.9rem' }}> min</span></div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>V/C = {brief.bpr_delay_analysis.vc_ratio_with_seva}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '2rem', fontSize: '0.78rem', color: '#475569' }}>
                <div>📐 <strong>Formula:</strong> <code style={{ fontSize: '0.72rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{brief.bpr_delay_analysis.formula}</code></div>
                <div>📏 <strong>Queue:</strong> {brief.bpr_delay_analysis.estimated_queue_length_km} km ({brief.bpr_delay_analysis.estimated_queue_vehicles} vehicles)</div>
              </div>
            </div>
          )}

          {/* === TEMPORAL IMPACT CURVE === */}
          {brief.temporal_impact_curve?.timeline?.length > 0 && (
            <div style={{
              background: 'white', border: '1px solid #e2e8f0', borderRadius: 14,
              padding: '1.25rem', marginBottom: '1.5rem'
            }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={16} color="#2563eb" /> Congestion Timeline Forecast
                <span style={{ marginLeft: 'auto', background: '#eff6ff', color: '#1d4ed8', padding: '3px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>
                  Peak: {brief.temporal_impact_curve.peak_label}
                </span>
              </h4>
              <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '1rem' }}>
                Hour-by-hour congestion forecast for event lifecycle. {brief.temporal_impact_curve.hours_over_capacity} hours over capacity, {brief.temporal_impact_curve.hours_near_capacity} hours near capacity.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {brief.temporal_impact_curve.timeline.map((t, i) => {
                  const barWidth = Math.max(5, (t.congestion_multiplier - 0.95) * 200);
                  const barColor = t.status === 'OVER_CAPACITY' ? '#dc2626' : t.status === 'NEAR_CAPACITY' ? '#f59e0b' : '#22c55e';
                  const isPeak = t.congestion_multiplier === brief.temporal_impact_curve.peak_congestion_multiplier;
                  return (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '80px 1fr 120px 60px',
                      alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.5rem',
                      background: isPeak ? '#fef3c7' : i % 2 === 0 ? '#fafafa' : 'white',
                      borderRadius: 6, border: isPeak ? '1px solid #fbbf24' : 'none',
                      transition: 'all 0.2s'
                    }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1e293b' }}>{t.hour}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          height: 18, width: `${barWidth}%`, maxWidth: '100%',
                          background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
                          borderRadius: 4, transition: 'width 0.5s ease-out'
                        }} />
                        <span style={{ fontSize: '0.72rem', color: '#475569', whiteSpace: 'nowrap' }}>
                          {t.label} {isPeak && '⭐'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'right' }}>
                        {t.estimated_delay_min} min delay
                      </div>
                      <div style={{
                        fontSize: '0.68rem', fontWeight: 700, textAlign: 'center',
                        color: barColor, background: barColor + '15', padding: '2px 6px', borderRadius: 4
                      }}>
                        ×{t.congestion_multiplier.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Map */}
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', height: 400 }}>
              <MapContainer center={[config.lat, config.lon]} zoom={14} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                {/* Event marker */}
                <Marker position={[config.lat, config.lon]} icon={eventIcon}>
                  <Popup>Event: {config.cause.replace(/_/g, ' ')}</Popup>
                </Marker>
                {/* Impact radius */}
                <Circle center={[config.lat, config.lon]} radius={impact.impact_radius_km * 1000}
                  pathOptions={{ color: RISK_COLORS[impact.risk_level], fillOpacity: 0.08, weight: 2, dashArray: '6 4' }} />
                {/* Officer deployment markers */}
                {deployment.deployment_plan.map((d, i) => {
                  // Deterministic offsets for officer markers (no Math.random)
                  const offsets = [[0.004, 0.002], [-0.003, 0.004], [-0.004, -0.003], [0.002, -0.004], [0.005, 0], [0, 0.005]];
                  const [dlat, dlon] = offsets[i % offsets.length];
                  return (
                    <Marker key={`off-${i}`} position={[config.lat + dlat, config.lon + dlon]} icon={officerIcon}>
                      <Popup>{d.from_station}: {d.officers_assigned} officers</Popup>
                    </Marker>
                  );
                })}
                {/* Barricade markers */}
                {barricades.barricades.map((b, i) => (
                  <Marker key={`bar-${i}`} position={[b.lat, b.lon]} icon={barricadeIcon}>
                    <Popup><strong>{b.location}</strong><br/>{b.reason}</Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            {/* Deployment Orders */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Users size={16} color="#2563eb" /> Officer Deployment Orders
              </h4>
              <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Station</th>
                      <th style={thStyle}>Officers</th>
                      <th style={thStyle}>Distance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deployment.deployment_plan.map((d, i) => (
                      <tr key={i}>
                        <td style={tdStyle}>{d.from_station}</td>
                        <td style={{...tdStyle, fontWeight: 700, color: '#2563eb'}}>{d.officers_assigned}</td>
                        <td style={tdStyle}>{d.distance_km}km</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '1rem 0 0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Construction size={16} color="#ea580c" /> Barricade Positions
              </h4>
              <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Location</th>
                      <th style={thStyle}>Distance</th>
                      <th style={thStyle}>Closure Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {barricades.barricades.map((b, i) => (
                      <tr key={i}>
                        <td style={tdStyle}>{b.location}</td>
                        <td style={tdStyle}>{b.distance_from_event_km}km</td>
                        <td style={{...tdStyle, color: '#ea580c', fontWeight: 600}}>{b.historical_closure_rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Diversion Routes */}
          {brief.diversion_summary?.diversions?.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Navigation size={16} color="#16a34a" /> Diversion Routes
                <span style={{ marginLeft: 'auto', background: '#ecfdf5', color: '#059669', padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                  {brief.diversion_summary.expected_delay_reduction_pct}% delay reduction
                </span>
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem' }}>
                {brief.diversion_summary.diversions.map((d, i) => (
                  <div key={i} style={{
                    background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem',
                    borderLeft: '4px solid #16a34a'
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a', marginBottom: '0.5rem' }}>
                      {d.direction} Approach
                    </div>
                    <div style={{ fontSize: '0.82rem', lineHeight: 1.8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#dc2626', fontWeight: 600, textDecoration: 'line-through' }}>{d.blocked_route}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ArrowRight size={12} color="#16a34a" />
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>{d.diversion_route}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                        Detour: +{d.estimated_detour_km}km
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: '#475569' }}>
                <div>Without SEVA: <strong style={{ color: '#dc2626' }}>{brief.diversion_summary.without_seva_delay_min} min</strong> avg delay</div>
                <div>With SEVA: <strong style={{ color: '#16a34a' }}>{brief.diversion_summary.with_seva_delay_min} min</strong> avg delay</div>
              </div>
            </div>
          )}

          {/* Similar Events */}
          {similar && similar.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={16} color="#7c3aed" /> Similar Historical Events
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
                {similar.map((s, i) => (
                  <div key={i} style={{
                    background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem',
                    borderLeft: `4px solid ${s.similarity_pct > 80 ? '#2563eb' : '#94a3b8'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.event_type.replace(/_/g, ' ')}</span>
                      <span style={{
                        background: s.similarity_pct > 80 ? '#dbeafe' : '#f1f5f9',
                        color: s.similarity_pct > 80 ? '#1d4ed8' : '#64748b',
                        padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700
                      }}>{s.similarity_pct}% match</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.6 }}>
                      <div>{s.total_historical_events} events | Closure: {s.historical_closure_rate}</div>
                      <div>Resolution: {s.avg_resolution_hrs ? `${s.avg_resolution_hrs}h avg` : 'N/A'}</div>
                      <div style={{ marginTop: '0.25rem', color: '#1e293b', fontStyle: 'italic', fontSize: '0.78rem' }}>{s.recommendation}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Event Template - Expected Behavior Pattern */}
          {brief.event_template && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <BookOpen size={16} color="#7c3aed" /> Event Profile: {brief.event_template.name}
              </h4>
              <div style={{
                background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: '1rem',
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Expected Patterns</div>
                  {brief.event_template.expected_patterns.map((p, i) => (
                    <div key={i} style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#7c3aed', flexShrink: 0 }} /> {p}
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', marginBottom: 6 }}><strong>Typical Duration:</strong> {brief.event_template.typical_duration_hrs}</div>
                  <div style={{ fontSize: '0.82rem', marginBottom: 6 }}><strong>Peak Congestion:</strong> {brief.event_template.peak_congestion}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 4, marginTop: 8 }}>Critical Infrastructure</div>
                  {brief.event_template.critical_infrastructure.map((c, i) => (
                    <div key={i} style={{ fontSize: '0.82rem', color: '#475569' }}>• {c}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Congestion Spillover */}
          {brief.congestion_spillover?.affected_corridors?.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Waves size={16} color="#ea580c" /> Congestion Ripple Effect
                <span style={{ marginLeft: 'auto', background: '#fff7ed', color: '#c2410c', padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                  {brief.congestion_spillover.total_affected} corridors impacted
                </span>
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {brief.congestion_spillover.affected_corridors.map((c, i) => (
                  <div key={i} style={{
                    background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.875rem',
                    borderLeft: `4px solid ${c.severity === 'HIGH' ? '#dc2626' : c.severity === 'MEDIUM' ? '#f59e0b' : '#22c55e'}`,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 4 }}>{c.corridor}</div>
                    <div style={{
                      fontSize: '1.25rem', fontWeight: 800,
                      color: c.severity === 'HIGH' ? '#dc2626' : c.severity === 'MEDIUM' ? '#f59e0b' : '#22c55e'
                    }}>+{c.congestion_increase_pct}%</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>{c.severity} impact</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                Source: {brief.congestion_spillover.source_corridor} corridor → adjacency propagation
              </div>
            </div>
          )}

          {/* Public Impact Card */}
          {brief.public_impact && (
            <div style={{
              background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)', border: '1px solid #bbf7d0',
              borderRadius: 14, padding: '1.25rem', marginBottom: '1.5rem'
            }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Megaphone size={16} color="#059669" /> Citizen Impact Advisory
                <span style={{
                  marginLeft: 'auto', padding: '3px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700,
                  background: brief.public_impact.severity === 'SEVERE' ? '#fee2e2' : brief.public_impact.severity === 'MODERATE' ? '#fef3c7' : '#dcfce7',
                  color: brief.public_impact.severity === 'SEVERE' ? '#dc2626' : brief.public_impact.severity === 'MODERATE' ? '#d97706' : '#16a34a'
                }}>{brief.public_impact.severity}</span>
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#059669' }}>{brief.public_impact.estimated_commuters_display}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Estimated Commuters Affected</div>
                </div>
              </div>
              <div style={{ fontSize: '0.88rem', color: '#1e293b' }}>
                {brief.public_impact.advisory.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', flexShrink: 0 }} />
                    {a}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Barricade Containment Effectiveness */}
          {barricades.without_barricades && (
            <div style={{
              background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '1rem',
              marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '2rem'
            }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', marginBottom: 4 }}>Without Barricades</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626' }}>{barricades.without_barricades.affected_junctions}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>junctions affected</div>
              </div>
              <ArrowRight size={24} color="#f97316" />
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', marginBottom: 4 }}>With Barricades</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a' }}>{barricades.with_barricades.affected_junctions}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>junctions affected</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1, background: '#dcfce7', borderRadius: 8, padding: '0.75rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>{barricades.containment_pct}%</div>
                <div style={{ fontSize: '0.75rem', color: '#064e3b', fontWeight: 600 }}>Containment</div>
              </div>
            </div>
          )}

          {/* Technical Details (Expandable) */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            <button onClick={() => setShowTechnical(!showTechnical)} style={{
              background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.5rem 1rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem',
              color: '#64748b', fontWeight: 600
            }}>
              {showTechnical ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Technical Details (for engineers)
            </button>
            {showTechnical && (
              <div style={{ marginTop: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem', fontSize: '0.8rem', color: '#475569' }}>
                <h5 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Methodology</h5>
                {Object.entries(brief.methodology).map(([k, v]) => (
                  <div key={k} style={{ marginBottom: '0.25rem' }}>
                    <strong style={{ textTransform: 'capitalize' }}>{k}:</strong> {v}
                  </div>
                ))}
                <h5 style={{ fontWeight: 700, margin: '0.75rem 0 0.5rem' }}>Affected Junctions</h5>
                <div>{impact.affected_junction_names.join(', ')}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Simulation History Log */}
      {briefHistory.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <button onClick={() => setShowHistory(!showHistory)} style={{
            background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.5rem 1rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem',
            color: '#64748b', fontWeight: 600, width: '100%', justifyContent: 'center'
          }}>
            <History size={14} /> Previous Simulations ({briefHistory.length})
            {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showHistory && (
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {briefHistory.map((entry, i) => {
                const imp = entry.brief?.impact_assessment;
                return (
                  <div key={i}
                    onClick={() => { setBrief(entry.brief); setConfig(entry.config); }}
                    style={{
                      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
                      padding: '0.75rem 1rem', cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#eff6ff'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: RISK_COLORS[imp?.risk_level] || '#94a3b8'
                      }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#1e293b' }}>
                          {entry.config.cause.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} - {entry.config.corridor}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          {entry.timestamp} | {imp?.risk_level} risk | {imp?.affected_junctions} junctions
                        </div>
                      </div>
                    </div>
                    <div style={{
                      background: RISK_BG[imp?.risk_level] || '#f1f5f9',
                      color: RISK_COLORS[imp?.risk_level] || '#64748b',
                      padding: '3px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700
                    }}>
                      {imp?.risk_level}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Persistent Activity Log */}
      <div style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Zap size={14} style={{ color: '#22c55e' }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Activity Log
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>({activityLog.length} entries)</span>
        </div>
        <div ref={logRef} style={{
          background: '#0f172a', borderRadius: 10, padding: '0.75rem 1rem', maxHeight: 180, overflowY: 'auto',
          fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace", fontSize: '0.72rem', lineHeight: 1.8
        }}>
          {activityLog.length === 0 ? (
            <div style={{ color: '#475569' }}>Waiting for activity...</div>
          ) : activityLog.map((entry, i) => (
            <div key={i} style={{
              color: entry.type === 'success' ? '#22c55e' : entry.type === 'warning' ? '#f59e0b' : entry.type === 'error' ? '#ef4444' : '#94a3b8'
            }}>
              <span style={{ color: '#475569' }}>[{entry.time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}]</span> {entry.msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, color, sub, intel }) {
  return (
    <div className="metric-card-wrap">
      <div className="op-glow" style={{
        background: 'white', borderRadius: 10, padding: '0.75rem',
        border: '1px solid #e2e8f0', textAlign: 'center',
        cursor: 'pointer'
      }}>
        <div style={{ color, marginBottom: '0.25rem', display: 'flex', justifyContent: 'center' }}>{icon}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{value}</div>
        {sub && <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500, marginTop: 2 }}>{sub}</div>}
        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
      </div>
      {intel && (
        <div className="intel-tooltip">
          {intel.map((item, i) => (
            <div key={i} style={{ marginBottom: i < intel.length - 1 ? 8 : 0 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                {item.label}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f1f5f9' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const selectStyle = {
  width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1',
  borderRadius: 8, fontSize: '0.85rem', marginTop: '0.25rem', background: 'white',
  outline: 'none'
};

const tableStyle = {
  width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem'
};

const thStyle = {
  textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '2px solid #e2e8f0',
  fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

const tdStyle = {
  padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9'
};
