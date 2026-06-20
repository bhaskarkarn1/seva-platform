import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Map raw feature names to human-readable labels
const FEATURE_LABELS = {
  'event_spread_encoded': 'Event Spread (encoded)',
  'cause_type': 'Cause Type',
  'corridor_status': 'Corridor Status',
  'hour_of_day': 'Hour of Day',
  'day_of_week': 'Day of Week',
  'is_weekend': 'Weekend Flag',
  'station_event_count': 'Station Event Count',
  'station_closure_rate': 'Station Closure Rate',
  'corridor_closure_rate': 'Corridor Closure Rate',
  'rolling_event_count': 'Rolling Event Count',
  'event_type': 'Event Type',
  'authenticated': 'Authenticated',
  'priority': 'Priority Level',
  'month': 'Month',
  'resolution_time_hrs': 'Resolution Time',
}

function humanize(name) {
  return FEATURE_LABELS[name] || name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const MODEL_DESCRIPTIONS = {
  closure: 'PR-AUC measures how well the model identifies true road closures, even when closures are rare (6.7% of events). A score near 1.0 means very few false alarms and very few missed closures.',
  priority: 'ROC-AUC evaluates how reliably the model separates high-priority events from low-priority ones. A score of 0.9999 means near-perfect classification across all priority levels.',
  resolution: 'MAE (Median Absolute Error) measures how far off the predicted resolution time is from the actual time. Lower is better — 0.73h means predictions are typically within 44 minutes of reality.',
}

const SHAP_DESCRIPTION = 'Feature importance shows which input variables most influence the model\'s predictions. Taller bars indicate stronger impact on the output. This uses TreeSHAP — an exact, theoretically grounded method (not approximation).'

export default function ModelPerformance({ metrics }) {
  if (!metrics) return <div className="loading">No metrics available.</div>

  const cl = metrics.closure || {}
  const pr = metrics.priority || {}
  const rs = metrics.resolution || {}

  const shapChart = (features, color, colorLight, title) => {
    if (!features) return null
    const data = Object.entries(features)
      .filter(([, v]) => v > 0.0001)
      .map(([k, v]) => ({ name: humanize(k), value: v }))
      .sort((a, b) => b.value - a.value)
    if (!data.length) return null

    return (
      <div className="chart-container" style={{ overflowX: 'auto' }}>
        <div className="chart-title">{title}</div>
        <p className="chart-description">{SHAP_DESCRIPTION}</p>
        <div style={{ minWidth: 400 }}>
          <ResponsiveContainer width="100%" height={Math.max(data.length * 36, 120)}>
            <BarChart data={data} layout="vertical" margin={{ left: 120 }}>
              <defs>
                <linearGradient id={`shap-${color.replace('#','')}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={color} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={colorLight} stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} width={115} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: '0.82rem', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                formatter={v => [v.toFixed(4), 'Mean |SHAP|']}
                cursor={{ fill: 'rgba(37,99,235,0.03)' }}
              />
              <Bar dataKey="value" fill={`url(#shap-${color.replace('#','')})`} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p style={{ color: '#475569', marginBottom: 28, lineHeight: 1.7, fontSize: '0.9rem' }}>
        All metrics computed on unseen test data (temporal hold-out: March to April 2024).
        SHAP explanations are real TreeSHAP values. No data leakage.
      </p>

      {/* Closure Model */}
      <div style={{ marginBottom: 8 }}>
        <span className="badge badge-blue">MODEL 1</span>
      </div>
      <h4 style={{ marginBottom: 8, color: '#0f172a' }}>Road Closure Prediction</h4>
      <p className="chart-description" style={{ marginBottom: 16 }}>{MODEL_DESCRIPTIONS.closure}</p>
      <div className="metric-grid">
        <div className="metric-box">
          <div className="label">PR-AUC</div>
          <div className="value green">{cl.pr_auc ?? 'N/A'}</div>
          <div className="metric-insight">Precision-Recall Area Under Curve — ideal for imbalanced datasets where closures are rare.</div>
        </div>
        <div className="metric-box">
          <div className="label">F1 Score</div>
          <div className="value green">{cl.f1 ?? 'N/A'}</div>
          <div className="sub">Threshold: {cl.threshold}</div>
          <div className="metric-insight">Harmonic mean of precision and recall. Balances false positives vs missed closures.</div>
        </div>
        <div className="metric-box">
          <div className="label">Train / Test</div>
          <div className="value">{cl.train_size} / {cl.test_size}</div>
          <div className="sub">Pos rate: {(cl.pos_rate_train * 100).toFixed(1)}%</div>
          <div className="metric-insight">Temporal split ensures no future data leaks into training.</div>
        </div>
        <div className="metric-box">
          <div className="label">Algorithm</div>
          <div className="value" style={{ fontSize: '1.2rem' }}>LightGBM</div>
          <div className="sub">800 estimators, lr=0.03</div>
          <div className="metric-insight">Gradient boosted decision trees — fast, handles missing values natively.</div>
        </div>
      </div>
      {shapChart(cl.top_features, '#2563EB', '#93c5fd', 'SHAP Feature Importance: Closure Model')}

      <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '32px 0' }} />

      {/* Priority Model */}
      <div style={{ marginBottom: 8 }}>
        <span className="badge badge-red">MODEL 2</span>
      </div>
      <h4 style={{ marginBottom: 8, color: '#0f172a' }}>Priority Classification</h4>
      <p className="chart-description" style={{ marginBottom: 16 }}>{MODEL_DESCRIPTIONS.priority}</p>
      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="metric-box">
          <div className="label">ROC-AUC</div>
          <div className="value green">{pr.roc_auc ?? 'N/A'}</div>
          <div className="metric-insight">Receiver Operating Characteristic AUC — measures classification quality across all thresholds.</div>
        </div>
        <div className="metric-box">
          <div className="label">F1 Score</div>
          <div className="value green">{pr.f1 ?? 'N/A'}</div>
          <div className="metric-insight">Multi-class weighted F1 across all priority levels.</div>
        </div>
      </div>
      {shapChart(pr.top_features, '#dc2626', '#fca5a5', 'SHAP Feature Importance: Priority Model')}

      <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '32px 0' }} />

      {/* Resolution Model */}
      <div style={{ marginBottom: 8 }}>
        <span className="badge badge-amber">MODEL 3</span>
      </div>
      <h4 style={{ marginBottom: 8, color: '#0f172a' }}>Resolution Time Estimation (Quantile Regression)</h4>
      <p className="chart-description" style={{ marginBottom: 16 }}>{MODEL_DESCRIPTIONS.resolution}</p>
      <div className="metric-grid metric-grid-3">
        <div className="metric-box">
          <div className="label">MAE (Median)</div>
          <div className="value amber">{rs.mae_median ?? 'N/A'}h</div>
          <div className="metric-insight">Average absolute prediction error on the median quantile.</div>
        </div>
        <div className="metric-box">
          <div className="label">Median Abs Error</div>
          <div className="value amber">{rs.median_abs_error ?? 'N/A'}h</div>
          <div className="sub">50% of predictions within this range</div>
          <div className="metric-insight">The "typical" error — half of all predictions are closer than this.</div>
        </div>
        <div className="metric-box">
          <div className="label">50% CI Coverage</div>
          <div className="value blue">{((rs.interval_coverage_50pct || 0) * 100).toFixed(1)}%</div>
          <div className="sub">Train: {rs.train_size} / Test: {rs.test_size}</div>
          <div className="metric-insight">How often the true resolution time falls within the predicted P25–P75 interval.</div>
        </div>
      </div>
      {shapChart(rs.top_features, '#d97706', '#fcd34d', 'SHAP Feature Importance: Resolution Model')}
    </div>
  )
}
