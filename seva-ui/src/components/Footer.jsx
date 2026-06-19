export default function Footer() {
  return (
    <footer className="site-footer">
      <p><strong style={{ color: '#0f172a' }}>SEVA Platform</strong> &middot; Smart Event-Driven Vulnerability Analyzer</p>
      <p style={{ marginTop: 6, lineHeight: 1.7 }}>
        Built with React, FastAPI, LightGBM, OR-Tools (MILP), OSMnx, TreeSHAP, and Leaflet.
        Trained on ASTraM dataset (8,057 events).
      </p>
      <p style={{ marginTop: 14, fontSize: '0.82rem', color: '#475569', fontWeight: 500 }}>
        Designed and built by <strong style={{ color: '#0f172a', fontWeight: 600 }}>Bhaskar Karn</strong>
      </p>
    </footer>
  )
}
