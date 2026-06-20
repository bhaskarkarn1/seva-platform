import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

export default function DataExplorer({ eda }) {
  if (!eda) return <div className="loading">No data available.</div>

  const causeDist = eda.event_cause_dist || {}
  const causeData = Object.entries(causeDist)
    .map(([k, v]) => ({ name: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), count: v }))
    .sort((a, b) => b.count - a.count)

  const hourly = eda.hourly_pattern || []
  const stationCount = eda.station_profiles?.length || 0
  const totalEvents = eda.total_events?.toLocaleString() || '8,057'

  // Find peak hour
  const peakHour = hourly.reduce((max, h) => (h.total > (max?.total || 0) ? h : max), hourly[0])

  return (
    <div>
      <p style={{ color: '#475569', marginBottom: 28, lineHeight: 1.7, fontSize: '0.9rem' }}>
        Comprehensive breakdown of {totalEvents} traffic events recorded across Bengaluru.
      </p>

      {/* Cause distribution with gradient */}
      <div className="chart-container">
        <div className="chart-title">Event Cause Distribution</div>
        <p className="chart-description">
          Breakdown of why traffic events occur. Vehicle breakdowns and accidents dominate the dataset,
          but planned events (public gatherings, processions) cause disproportionately more closures per incident.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={causeData} margin={{ bottom: 60 }}>
            <defs>
              <linearGradient id="causeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity={1} />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" angle={-45} textAnchor="end" fontSize={11} tick={{ fill: '#64748b' }} height={80} />
            <YAxis tick={{ fill: '#64748b' }} fontSize={11} />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: '0.82rem', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
              cursor={{ fill: 'rgba(37,99,235,0.04)' }}
            />
            <Bar dataKey="count" fill="url(#causeGradient)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Hourly pattern with peak annotation + rush hour bands */}
      <div className="chart-container">
        <div className="chart-title">Hourly Event Pattern</div>
        <p className="chart-description">
          Shows when Bengaluru experiences the most traffic disruptions throughout the day. Morning (8–10 AM)
          and evening (5–8 PM) rush hours show elevated activity. {peakHour ? `Peak hour: ${peakHour.hour}:00 with ${peakHour.total} events.` : ''}
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={hourly}>
            <defs>
              <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: 'Hour of Day', position: 'bottom', fill: '#94a3b8', fontSize: 12 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            {/* Rush hour reference bands */}
            <ReferenceLine x={8} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine x={10} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine x={17} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine x={20} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: '0.82rem', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
              cursor={{ stroke: '#2563eb', strokeWidth: 1.5, strokeDasharray: '4 4' }}
            />
            <Area type="monotone" dataKey="total" stroke="#2563EB" fill="url(#hourlyGradient)" strokeWidth={2.5}
              dot={{ r: 3, fill: '#2563EB', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#2563EB', stroke: '#fff', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '0.72rem', color: '#94a3b8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 2, background: '#f59e0b', borderRadius: 1 }} />
            Rush hour windows (8–10 AM, 5–8 PM)
          </div>
        </div>
      </div>

      {/* Key stats with insights */}
      <div className="metric-grid">
        <div className="metric-box">
          <div className="label">Unplanned Events</div>
          <div className="value amber">{eda.event_type_dist?.unplanned ?? '?'}</div>
          <div className="sub">vs {eda.event_type_dist?.planned ?? '?'} planned</div>
          <div className="metric-insight">Unplanned events (accidents, breakdowns) are harder to predict but follow temporal patterns SEVA can learn.</div>
        </div>
        <div className="metric-box">
          <div className="label">High Priority</div>
          <div className="value red">{eda.priority_dist?.High ?? '?'}</div>
          <div className="sub">vs {eda.priority_dist?.Low ?? '?'} low priority</div>
          <div className="metric-insight">Events requiring immediate police response. These drive SEVA's deployment recommendations.</div>
        </div>
        <div className="metric-box">
          <div className="label">Authenticated</div>
          <div className="value green">{eda.authenticated_dist?.yes ?? '?'}</div>
          <div className="sub">vs {eda.authenticated_dist?.no ?? '?'} unverified</div>
          <div className="metric-insight">Events verified by ASTraM operators. Higher authentication improves model training quality.</div>
        </div>
        <div className="metric-box">
          <div className="label">Police Stations</div>
          <div className="value blue">{stationCount}</div>
          <div className="sub">Active across Bengaluru</div>
          <div className="metric-insight">Stations available for MILP-optimized team deployment within 5km constraints.</div>
        </div>
      </div>
    </div>
  )
}
