import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BookOpen, CheckCircle, AlertTriangle, Database, TrendingUp, RefreshCw } from 'lucide-react';
import { fetchPostEventLearning } from '../data/api';

export default function PostEventLearning() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPostEventLearning()
      .then(data => { if (data) setReport(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading learning report...</div>;
  if (!report) return <div style={{ textAlign: 'center', padding: '3rem', color: '#dc2626' }}>Failed to load report.</div>;

  const accuracy = report.model_accuracy;
  const quality = report.data_quality_issues;
  const perType = report.event_type_accuracy;
  const recs = report.improvement_recommendations;

  return (
    <div>
      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>Performance Monitoring &amp; Feedback</h3>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: 1.7 }}>
        Closed-loop feedback: how SEVA predictions compare to actual ASTraM outcomes, with concrete retraining triggers.
      </p>

      {/* Model Accuracy Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <AccuracyCard
          title="Road Closure Prediction"
          model={accuracy.closure_prediction.model}
          metric={accuracy.closure_prediction.metric}
          value={accuracy.closure_prediction.value}
          assessment={accuracy.closure_prediction.assessment}
          details={[
            `Actual closure rate: ${accuracy.closure_prediction.actual_closure_rate}`,
            `${accuracy.closure_prediction.actual_closures} closures in ${accuracy.closure_prediction.total_events} events`
          ]}
          action={accuracy.closure_prediction.learning_action}
        />
        <AccuracyCard
          title="Priority Classification"
          model={accuracy.priority_classification.model}
          metric={accuracy.priority_classification.metric}
          value={accuracy.priority_classification.value}
          assessment={accuracy.priority_classification.assessment}
          details={[
            `High priority rate: ${accuracy.priority_classification.actual_high_priority_rate}`,
            `${accuracy.priority_classification.actual_high_priority} high-priority events`
          ]}
          action={accuracy.priority_classification.learning_action}
        />
        <AccuracyCard
          title="Resolution Time"
          model={accuracy.resolution_time.model}
          metric={accuracy.resolution_time.metric}
          value={`${accuracy.resolution_time.value_hrs}h`}
          assessment={accuracy.resolution_time.assessment}
          details={[
            `Actual median: ${accuracy.resolution_time.actual_median_hrs}h`,
            `Valid samples: ${accuracy.resolution_time.valid_samples}`
          ]}
          action={accuracy.resolution_time.learning_action}
        />
      </div>

      {/* Per-Type Accuracy Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={16} color="#2563eb" /> Prediction Confidence by Event Type
          </h4>
          <p className="chart-description">
            Shows how reliably SEVA predicts outcomes for each event category. Blue bars indicate high prediction
            confidence, amber bars indicate medium confidence requiring more training data.
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={perType} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis dataKey="event_type" type="category" tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} width={95} />
              <Tooltip
                contentStyle={{ borderRadius: 10, fontSize: '0.82rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                formatter={(val, name, props) => [val, `Events (${props.payload.prediction_confidence} confidence)`]}
                cursor={{ fill: 'rgba(37,99,235,0.03)' }}
              />
              <Bar dataKey="count" name="Event Count" radius={[0, 6, 6, 0]}>
                {perType.map((entry, i) => (
                  <Cell key={i} fill={entry.prediction_confidence === 'High' ? '#2563eb' : entry.prediction_confidence === 'Medium' ? '#ca8a04' : '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '0.72rem', color: '#94a3b8' }}>
            {[{ label: 'High confidence', color: '#2563eb' }, { label: 'Medium confidence', color: '#ca8a04' }, { label: 'Low confidence', color: '#94a3b8' }].map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Data Quality Report */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Database size={16} color="#7c3aed" /> Data Quality Assessment
          </h4>
          <p className="chart-description">Measures completeness and reliability of the ASTraM dataset. Higher coverage enables more accurate model predictions.</p>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Resolution Time Coverage</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: quality.resolution_coverage_pct > 50 ? '#16a34a' : quality.resolution_coverage_pct > 30 ? '#ca8a04' : '#dc2626' }}>{quality.resolution_coverage_pct}%</span>
            </div>
            <div style={{ background: '#f1f5f9', borderRadius: 6, height: 10, overflow: 'hidden' }}>
              <div style={{ background: quality.resolution_coverage_pct > 50 ? '#16a34a' : quality.resolution_coverage_pct > 30 ? '#ca8a04' : '#dc2626', height: '100%', width: `${quality.resolution_coverage_pct}%`, borderRadius: 6, transition: 'width 1s' }} />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Event Spread Coverage</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: quality.spread_coverage_pct > 50 ? '#16a34a' : quality.spread_coverage_pct > 30 ? '#ca8a04' : '#dc2626' }}>{quality.spread_coverage_pct}%</span>
            </div>
            <div style={{ background: '#f1f5f9', borderRadius: 6, height: 10, overflow: 'hidden' }}>
              <div style={{ background: quality.spread_coverage_pct > 50 ? '#16a34a' : quality.spread_coverage_pct > 30 ? '#ca8a04' : '#dc2626', height: '100%', width: `${quality.spread_coverage_pct}%`, borderRadius: 6, transition: 'width 1s' }} />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Overall Quality Score</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a' }}>{quality.overall_quality_score}/100</span>
            </div>
            <div style={{ background: '#f1f5f9', borderRadius: 6, height: 10, overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(90deg, #16a34a, #22c55e)', height: '100%', width: `${quality.overall_quality_score}%`, borderRadius: 6, transition: 'width 1s' }} />
            </div>
          </div>

          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '0.75rem', marginTop: '0.5rem', fontSize: '0.78rem', color: '#475569', lineHeight: 1.6 }}>
            <strong>Summary:</strong> {quality.events_with_resolution_time} of {quality.total_events} events have valid resolution timestamps.
            Data quality improvements would enhance prediction accuracy.
          </div>
        </div>
      </div>

      {/* Improvement Recommendations */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={16} color="#16a34a" /> System Learning Recommendations
        </h4>
        <p className="chart-description">Actionable recommendations ranked by priority. Implementing these would improve SEVA's prediction accuracy and operational reliability.</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr>
              <th style={thStyle}>Priority</th>
              <th style={thStyle}>Area</th>
              <th style={thStyle}>Recommendation</th>
              <th style={thStyle}>Expected Impact</th>
            </tr>
          </thead>
          <tbody>
            {recs.map((r, i) => (
              <tr key={i}>
                <td style={tdStyle}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700,
                    background: r.priority === 'HIGH' ? '#fef2f2' : r.priority === 'MEDIUM' ? '#fffbeb' : '#f0fdf4',
                    color: r.priority === 'HIGH' ? '#dc2626' : r.priority === 'MEDIUM' ? '#ca8a04' : '#16a34a'
                  }}>{r.priority}</span>
                </td>
                <td style={{...tdStyle, fontWeight: 600}}>{r.area}</td>
                <td style={tdStyle}>{r.recommendation}</td>
                <td style={{...tdStyle, color: '#2563eb', fontWeight: 500}}>{r.expected_impact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* System Status */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#475569', lineHeight: 1.6 }}>
        <strong>System Learning Status:</strong> Last trained on {report.system_learning_status.last_training_date} | 
        Training set: {report.system_learning_status.events_in_training_set} events | 
        Test set: {report.system_learning_status.events_in_test_set} events | 
        {report.system_learning_status.retraining_recommended && 
          <span style={{ color: '#ca8a04', fontWeight: 600 }}> Retraining recommended: {report.system_learning_status.retraining_reason}</span>
        }
      </div>

      {/* Retraining Triggers */}
      {report.retraining_triggers && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', marginTop: '1rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={16} color="#d97706" /> Retraining Triggers
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {report.retraining_triggers.map((t, i) => (
              <div key={i} style={{
                background: t.current_status === 'TRIGGERED' ? '#fef3c7' : '#f8fafc',
                border: `1px solid ${t.current_status === 'TRIGGERED' ? '#fcd34d' : '#e2e8f0'}`,
                borderRadius: 10, padding: '1rem',
                borderLeft: `4px solid ${t.current_status === 'TRIGGERED' ? '#d97706' : t.current_status === 'MONITORING' ? '#3b82f6' : '#16a34a'}`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.01)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>{t.condition}</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700,
                    background: t.current_status === 'TRIGGERED' ? '#fef2f2' : t.current_status === 'MONITORING' ? '#eff6ff' : '#f0fdf4',
                    color: t.current_status === 'TRIGGERED' ? '#dc2626' : t.current_status === 'MONITORING' ? '#2563eb' : '#16a34a'
                  }}>{t.current_status}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', marginBottom: 4 }}><strong>Action:</strong> {t.action}</div>
                <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontStyle: 'italic' }}>→ {t.what_would_change}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AccuracyCard({ title, model, metric, value, assessment, details, action }) {
  const color = assessment === 'Excellent' ? '#16a34a' : assessment === 'Good' ? '#2563eb' : '#ca8a04';
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem', borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{title}</span>
        <span style={{
          background: color + '15', color, padding: '2px 8px', borderRadius: 6,
          fontSize: '0.7rem', fontWeight: 700
        }}>
          <CheckCircle size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          {assessment}
        </span>
      </div>
      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>{model}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '1.75rem', fontWeight: 800, color }}>{value}</span>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{metric}</span>
      </div>
      <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5, marginBottom: '0.5rem' }}>
        {details.map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div style={{ fontSize: '0.72rem', color: '#475569', fontStyle: 'italic', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
        <BookOpen size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
        {action}
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '2px solid #e2e8f0',
  fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

const tdStyle = {
  padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9'
};
