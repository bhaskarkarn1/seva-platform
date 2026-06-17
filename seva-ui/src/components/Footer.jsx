export default function Footer() {
  return (
    <footer className="site-footer">
      <p><strong style={{ color: '#0f172a' }}>SEVA Platform</strong> | Smart Event-driven Vulnerability Analyzer</p>
      <p style={{ marginTop: 4 }}>
        Built with React, FastAPI, LightGBM, OR-Tools (MILP), OSMnx, TreeSHAP, and Leaflet.
        All predictions trained on ASTraM dataset (8,057 events). Zero synthetic data.
      </p>
      <p style={{ marginTop: 12, fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
        Built by <strong style={{ color: '#0f172a' }}>Bhaskar Karn</strong>
      </p>
    </footer>
  )
}
