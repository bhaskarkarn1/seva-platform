import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function ModelPerformance({ metrics }) {
  if (!metrics) return <div className="loading">No metrics available.</div>

  const cl = metrics.closure || {}
  const pr = metrics.priority || {}
  const rs = metrics.resolution || {}

  const shapChart = (features, color, title) => {
    if (!features) return null
    const data = Object.entries(features)
      .filter(([, v]) => v > 0.0001)
      .map(([k, v]) => ({ name: k, value: v }))
      .sort((a, b) => b.value - a.value)
    if (!data.length) return null

    return (
      <div className="chart-container">
        <div className="chart-title">{title}</div>
        <ResponsiveContainer width="100%" height={Math.max(data.length * 32, 100)}>
          <BarChart data={data} layout="vertical" margin={{ left: 140 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} width={130} />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem' }}
              formatter={v => [v.toFixed(4), 'Mean |SHAP|']}
            />
            <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
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
      <h4 style={{ marginBottom: 16, color: '#0f172a' }}>Road Closure Prediction</h4>
      <div className="metric-grid">
        <div className="metric-box">
          <div className="label">PR-AUC</div>
          <div className="value green">{cl.pr_auc ?? 'N/A'}</div>
        </div>
        <div className="metric-box">
          <div className="label">F1 Score</div>
          <div className="value green">{cl.f1 ?? 'N/A'}</div>
          <div className="sub">Threshold: {cl.threshold}</div>
        </div>
        <div className="metric-box">
          <div className="label">Train / Test</div>
          <div className="value">{cl.train_size} / {cl.test_size}</div>
          <div className="sub">Pos rate: {(cl.pos_rate_train * 100).toFixed(1)}%</div>
        </div>
        <div className="metric-box">
          <div className="label">Algorithm</div>
          <div className="value" style={{ fontSize: '1.2rem' }}>LightGBM</div>
          <div className="sub">800 estimators, lr=0.03</div>
        </div>
      </div>
      {shapChart(cl.top_features, '#2563EB', 'SHAP Feature Importance: Closure Model')}

      <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '32px 0' }} />

      {/* Priority Model */}
      <div style={{ marginBottom: 8 }}>
        <span className="badge badge-red">MODEL 2</span>
      </div>
      <h4 style={{ marginBottom: 16, color: '#0f172a' }}>Priority Classification</h4>
      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="metric-box">
          <div className="label">ROC-AUC</div>
          <div className="value green">{pr.roc_auc ?? 'N/A'}</div>
        </div>
        <div className="metric-box">
          <div className="label">F1 Score</div>
          <div className="value green">{pr.f1 ?? 'N/A'}</div>
        </div>
      </div>
      {shapChart(pr.top_features, '#dc2626', 'SHAP Feature Importance: Priority Model')}

      <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '32px 0' }} />

      {/* Resolution Model */}
      <div style={{ marginBottom: 8 }}>
        <span className="badge badge-amber">MODEL 3</span>
      </div>
      <h4 style={{ marginBottom: 16, color: '#0f172a' }}>Resolution Time Estimation (Quantile Regression)</h4>
      <div className="metric-grid metric-grid-3">
        <div className="metric-box">
          <div className="label">MAE (Median)</div>
          <div className="value amber">{rs.mae_median ?? 'N/A'}h</div>
        </div>
        <div className="metric-box">
          <div className="label">Median Abs Error</div>
          <div className="value amber">{rs.median_abs_error ?? 'N/A'}h</div>
          <div className="sub">50% of predictions within this range</div>
        </div>
        <div className="metric-box">
          <div className="label">50% CI Coverage</div>
          <div className="value blue">{((rs.interval_coverage_50pct || 0) * 100).toFixed(1)}%</div>
          <div className="sub">Train: {rs.train_size} / Test: {rs.test_size}</div>
        </div>
      </div>
      {shapChart(rs.top_features, '#d97706', 'SHAP Feature Importance: Resolution Model')}
    </div>
  )
}
