import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function DataExplorer({ eda }) {
  if (!eda) return <div className="loading">No data available.</div>

  const causeDist = eda.event_cause_dist || {}
  const causeData = Object.entries(causeDist)
    .map(([k, v]) => ({ name: k, count: v }))
    .sort((a, b) => b.count - a.count)

  const hourly = eda.hourly_pattern || []
  const stationCount = eda.station_profiles?.length || 0

  return (
    <div>
      <p style={{ color: '#475569', marginBottom: 28, lineHeight: 1.7, fontSize: '0.9rem' }}>
        Comprehensive breakdown of 8,057 traffic events recorded across Bengaluru.
      </p>

      {/* Cause distribution */}
      <div className="chart-container">
        <div className="chart-title">Event Cause Distribution</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={causeData} margin={{ bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" fontSize={11} tick={{ fill: '#64748b' }} height={80} />
            <YAxis tick={{ fill: '#64748b' }} fontSize={11} />
            <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem' }} />
            <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Hourly pattern */}
      <div className="chart-container">
        <div className="chart-title">Hourly Event Pattern</div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={hourly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: 'Hour of Day', position: 'bottom', fill: '#94a3b8', fontSize: 12 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem' }} />
            <Area type="monotone" dataKey="total" stroke="#2563EB" fill="#2563EB" fillOpacity={0.12} strokeWidth={2.5}
              dot={{ r: 3, fill: '#2563EB' }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Key stats */}
      <div className="metric-grid">
        <div className="metric-box">
          <div className="label">Unplanned Events</div>
          <div className="value amber">{eda.event_type_dist?.unplanned ?? '?'}</div>
          <div className="sub">vs {eda.event_type_dist?.planned ?? '?'} planned</div>
        </div>
        <div className="metric-box">
          <div className="label">High Priority</div>
          <div className="value red">{eda.priority_dist?.High ?? '?'}</div>
          <div className="sub">vs {eda.priority_dist?.Low ?? '?'} low priority</div>
        </div>
        <div className="metric-box">
          <div className="label">Authenticated</div>
          <div className="value green">{eda.authenticated_dist?.yes ?? '?'}</div>
          <div className="sub">vs {eda.authenticated_dist?.no ?? '?'} unverified</div>
        </div>
        <div className="metric-box">
          <div className="label">Police Stations</div>
          <div className="value blue">{stationCount}</div>
          <div className="sub">Active across Bengaluru</div>
        </div>
      </div>
    </div>
  )
}
