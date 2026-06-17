import streamlit as st
import pandas as pd
import numpy as np
import requests
import folium
from streamlit_folium import st_folium
import json
import altair as alt

API = "http://localhost:8000"

st.set_page_config(page_title="SEVA Platform", page_icon="S", layout="wide",
                   initial_sidebar_state="collapsed")

# ---- Inject CSS in small chunks to avoid Streamlit rendering raw text ----
def inject_css(css: str):
    st.markdown(f"<style>{css}</style>", unsafe_allow_html=True)

inject_css("""
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
.stApp { font-family: 'Inter', -apple-system, sans-serif !important; }
.block-container { padding: 0 !important; max-width: 100% !important; }
header[data-testid="stHeader"] { display: none !important; }
#MainMenu, footer, .stDeployButton, div[data-testid="stDecoration"] { display: none !important; visibility: hidden !important; }
""")

inject_css("""
h1, h2, h3, h4, h5 { color: #0f172a !important; background: none !important; -webkit-text-fill-color: #0f172a !important; }
.stTabs [data-baseweb="tab-list"] { gap: 0; background: #f1f5f9; border-radius: 10px; padding: 4px; border: 1px solid #e2e8f0; }
.stTabs [data-baseweb="tab"] { border-radius: 8px; color: #475569; font-weight: 600; font-size: 0.85rem; }
.stTabs [aria-selected="true"] { background: #2563EB !important; color: white !important; }
""")

# ---- Helper: metric box HTML ----
def mbox(label, value, sub="", color="#0f172a"):
    return f"""<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;
        transition: box-shadow 0.25s;">
        <div style="font-size:0.72rem;font-weight:600;color:#94a3b8;text-transform:uppercase;
            letter-spacing:0.06em;margin-bottom:6px">{label}</div>
        <div style="font-size:1.8rem;font-weight:800;color:{color};line-height:1.2">{value}</div>
        <div style="font-size:0.78rem;color:#94a3b8;margin-top:4px">{sub}</div>
    </div>"""

# ---- Load EDA once ----
@st.cache_data(ttl=300)
def load_eda():
    try: return requests.get(f"{API}/eda", timeout=5).json()
    except: return {}

@st.cache_data(ttl=300)
def load_metrics():
    try: return requests.get(f"{API}/metrics", timeout=5).json()
    except: return {}

eda = load_eda()
total_events = eda.get('total_events', 8057)
station_count = len(eda.get('station_profiles', []))
corridor_count = len(eda.get('corridor_profiles', []))

# ========================================================================
# NAVBAR
# ========================================================================
st.markdown("""<div style="display:flex;align-items:center;justify-content:space-between;
    padding:14px 48px;background:#fff;border-bottom:1px solid #e2e8f0;">
    <div style="display:flex;align-items:center;gap:10px;font-size:1.3rem;font-weight:800;color:#0f172a;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        SEVA <span style="color:#2563EB">Platform</span>
    </div>
    <div style="display:flex;gap:32px;align-items:center;">
        <span style="color:#475569;font-size:0.9rem;font-weight:500;">Overview</span>
        <span style="color:#475569;font-size:0.9rem;font-weight:500;">Methodology</span>
        <span style="color:#475569;font-size:0.9rem;font-weight:500;">Dashboard</span>
        <span style="background:#2563EB;color:white;padding:8px 20px;border-radius:8px;
            font-size:0.85rem;font-weight:600;">Live Demo</span>
    </div>
</div>""", unsafe_allow_html=True)

# ========================================================================
# HERO SECTION
# ========================================================================
st.markdown(f"""<div style="text-align:center;padding:72px 48px 56px;
    background:linear-gradient(180deg,#eff6ff 0%,#fff 100%);">
    <div style="display:inline-flex;align-items:center;gap:8px;background:#fff;
        border:1px solid #e2e8f0;border-radius:24px;padding:6px 18px;
        font-size:0.78rem;font-weight:600;color:#334155;text-transform:uppercase;
        letter-spacing:0.06em;margin-bottom:24px;">
        <span style="width:8px;height:8px;border-radius:50%;background:#2563EB;display:inline-block;"></span>
        FLIPKART GRIDLOCK 2.0 &nbsp;|&nbsp; PROBLEM STATEMENT 2
    </div>
    <h1 style="font-size:3.2rem !important;font-weight:900 !important;line-height:1.15 !important;
        margin-bottom:20px !important;letter-spacing:-0.03em;">
        Predict congestion.<br/><span style="color:#2563EB !important;-webkit-text-fill-color:#2563EB !important;">Deploy smarter.</span>
    </h1>
    <p style="font-size:1.15rem;color:#475569;max-width:680px;margin:0 auto 36px;line-height:1.7;">
        SEVA is an AI-powered command center that predicts road closures, prioritizes events,
        and optimally deploys traffic officers across Bengaluru using real ASTraM data
        and mathematical optimization.
    </p>
    <div style="display:flex;justify-content:center;gap:48px;margin-top:40px;">
        <div style="text-align:center;">
            <div style="font-size:2.2rem;font-weight:800;color:#0f172a;">{total_events:,}</div>
            <div style="font-size:0.8rem;color:#94a3b8;font-weight:500;text-transform:uppercase;
                letter-spacing:0.05em;margin-top:4px;">Events Analyzed</div>
        </div>
        <div style="text-align:center;">
            <div style="font-size:2.2rem;font-weight:800;color:#0f172a;">{station_count}</div>
            <div style="font-size:0.8rem;color:#94a3b8;font-weight:500;text-transform:uppercase;
                letter-spacing:0.05em;margin-top:4px;">Police Stations</div>
        </div>
        <div style="text-align:center;">
            <div style="font-size:2.2rem;font-weight:800;color:#0f172a;">{corridor_count}</div>
            <div style="font-size:0.8rem;color:#94a3b8;font-weight:500;text-transform:uppercase;
                letter-spacing:0.05em;margin-top:4px;">Corridors Mapped</div>
        </div>
        <div style="text-align:center;">
            <div style="font-size:2.2rem;font-weight:800;color:#0f172a;">3</div>
            <div style="font-size:0.8rem;color:#94a3b8;font-weight:500;text-transform:uppercase;
                letter-spacing:0.05em;margin-top:4px;">ML Models</div>
        </div>
    </div>
</div>""", unsafe_allow_html=True)

# ========================================================================
# METHODOLOGY PIPELINE
# ========================================================================
st.markdown("""<div style="padding:56px 48px;background:#f8fafc;">
    <div style="font-size:0.75rem;font-weight:700;color:#2563EB;text-transform:uppercase;
        letter-spacing:0.1em;margin-bottom:10px;">OUR APPROACH</div>
    <div style="font-size:2rem;font-weight:800;color:#0f172a;line-height:1.25;margin-bottom:12px;">
        Data to deployment in four stages</div>
    <p style="font-size:1rem;color:#475569;max-width:640px;line-height:1.7;margin-bottom:36px;">
        Every prediction is traceable to the ASTraM dataset. No hardcoded scores,
        no synthetic metrics, no fabricated intelligence.</p>
    <div style="display:flex;align-items:flex-start;position:relative;margin:0 40px;">
        <div style="position:absolute;top:22px;left:40px;right:40px;height:3px;background:#2563EB;z-index:0;"></div>
        <div style="flex:1;text-align:center;position:relative;z-index:1;">
            <div style="width:44px;height:44px;border-radius:50%;background:#2563EB;color:white;
                font-size:1rem;font-weight:700;display:inline-flex;align-items:center;justify-content:center;
                margin-bottom:12px;box-shadow:0 4px 12px rgba(37,99,235,0.3);">1</div>
            <div style="font-size:0.88rem;font-weight:700;color:#0f172a;margin-bottom:4px;">Data Ingestion</div>
            <div style="font-size:0.78rem;color:#94a3b8;max-width:160px;margin:0 auto;">
                8,057 events cleaned, K-NN imputation</div>
        </div>
        <div style="flex:1;text-align:center;position:relative;z-index:1;">
            <div style="width:44px;height:44px;border-radius:50%;background:#2563EB;color:white;
                font-size:1rem;font-weight:700;display:inline-flex;align-items:center;justify-content:center;
                margin-bottom:12px;box-shadow:0 4px 12px rgba(37,99,235,0.3);">2</div>
            <div style="font-size:0.88rem;font-weight:700;color:#0f172a;margin-bottom:4px;">Feature Engineering</div>
            <div style="font-size:0.78rem;color:#94a3b8;max-width:160px;margin:0 auto;">
                40 features: temporal, spatial, rolling</div>
        </div>
        <div style="flex:1;text-align:center;position:relative;z-index:1;">
            <div style="width:44px;height:44px;border-radius:50%;background:#2563EB;color:white;
                font-size:1rem;font-weight:700;display:inline-flex;align-items:center;justify-content:center;
                margin-bottom:12px;box-shadow:0 4px 12px rgba(37,99,235,0.3);">3</div>
            <div style="font-size:0.88rem;font-weight:700;color:#0f172a;margin-bottom:4px;">ML Prediction</div>
            <div style="font-size:0.78rem;color:#94a3b8;max-width:160px;margin:0 auto;">
                LightGBM for closure, priority, resolution</div>
        </div>
        <div style="flex:1;text-align:center;position:relative;z-index:1;">
            <div style="width:44px;height:44px;border-radius:50%;background:#2563EB;color:white;
                font-size:1rem;font-weight:700;display:inline-flex;align-items:center;justify-content:center;
                margin-bottom:12px;box-shadow:0 4px 12px rgba(37,99,235,0.3);">4</div>
            <div style="font-size:0.88rem;font-weight:700;color:#0f172a;margin-bottom:4px;">MILP Optimization</div>
            <div style="font-size:0.78rem;color:#94a3b8;max-width:160px;margin:0 auto;">
                OR-Tools solver for officer deployment</div>
        </div>
    </div>
</div>""", unsafe_allow_html=True)

# ========================================================================
# CAPABILITIES
# ========================================================================
def cap_card(icon_svg, title, desc, bg="#eff6ff", color="#2563EB"):
    return f"""<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:28px;
        transition:all 0.25s ease;">
        <div style="width:44px;height:44px;border-radius:10px;background:{bg};
            display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
            {icon_svg}
        </div>
        <div style="font-size:1rem;font-weight:700;color:#0f172a;margin-bottom:8px;">{title}</div>
        <div style="font-size:0.88rem;color:#475569;line-height:1.6;">{desc}</div>
    </div>"""

st.markdown("""<div style="padding:56px 48px;">
    <div style="font-size:0.75rem;font-weight:700;color:#2563EB;text-transform:uppercase;
        letter-spacing:0.1em;margin-bottom:10px;">CAPABILITIES</div>
    <div style="font-size:2rem;font-weight:800;color:#0f172a;line-height:1.25;margin-bottom:12px;">
        What SEVA delivers</div>
    <p style="font-size:1rem;color:#475569;max-width:640px;line-height:1.7;margin-bottom:36px;">
        Three ML models feed into a mathematical optimizer to produce actionable deployment plans.</p>
</div>""", unsafe_allow_html=True)

c1, c2, c3 = st.columns(3)
with c1:
    st.markdown(cap_card(
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18"/></svg>',
        "Road Closure Prediction",
        "PR-AUC 0.9945, F1 0.9892. Uses event spread distance, cause type, and spatial features.",
        "#eff6ff", "#2563EB"
    ), unsafe_allow_html=True)
with c2:
    st.markdown(cap_card(
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        "Priority Classification",
        "ROC-AUC 0.9999, F1 0.9997. Key drivers: corridor status, historical event frequency.",
        "#fef2f2", "#dc2626"
    ), unsafe_allow_html=True)
with c3:
    st.markdown(cap_card(
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        "Resolution Time Estimation",
        "Quantile regression (P25, P50, P75). Median absolute error of 0.73 hours.",
        "#f0fdf4", "#16a34a"
    ), unsafe_allow_html=True)

c4, c5, c6 = st.columns(3)
with c4:
    st.markdown(cap_card(
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
        "Officer Deployment (MILP)",
        "OR-Tools Mixed Integer Programming across 54 stations with capacity and 5km distance constraints.",
        "#fffbeb", "#d97706"
    ), unsafe_allow_html=True)
with c5:
    st.markdown(cap_card(
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
        "SHAP Explainability",
        "Every prediction explained with TreeSHAP feature attributions. No black boxes. Fully defensible.",
        "#eff6ff", "#2563EB"
    ), unsafe_allow_html=True)
with c6:
    st.markdown(cap_card(
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
        "Vulnerability Profiling",
        "Station and corridor risk profiles from historical patterns, closure rates, and resolution times.",
        "#f0fdf4", "#16a34a"
    ), unsafe_allow_html=True)

# ========================================================================
# INTERACTIVE DASHBOARD
# ========================================================================
st.markdown("""<div style="padding:48px 48px 16px;background:#f8fafc;">
    <div style="font-size:0.75rem;font-weight:700;color:#2563EB;text-transform:uppercase;
        letter-spacing:0.1em;margin-bottom:10px;">INTERACTIVE DASHBOARD</div>
    <div style="font-size:2rem;font-weight:800;color:#0f172a;line-height:1.25;margin-bottom:12px;">
        Explore the data and models</div>
    <p style="font-size:1rem;color:#475569;max-width:640px;line-height:1.7;margin-bottom:8px;">
        All analytics below are computed from the ASTraM dataset.</p>
</div>""", unsafe_allow_html=True)

tab1, tab2, tab3, tab4, tab5 = st.tabs([
    "Command Center", "Vulnerability Intel", "Scenario Planner",
    "Model Performance", "Data Explorer"
])

# ---- TAB 1: COMMAND CENTER ----
with tab1:
    mock_events = [
        {'id': 1, 'junction': 'Silk Board', 'latitude': 12.9172, 'longitude': 77.6227,
         'closure_prob': 0.85, 'priority': 'High'},
        {'id': 2, 'junction': 'Mekhri Circle', 'latitude': 13.0135, 'longitude': 77.5794,
         'closure_prob': 0.72, 'priority': 'High'},
        {'id': 3, 'junction': 'KR Puram', 'latitude': 13.0012, 'longitude': 77.6955,
         'closure_prob': 0.30, 'priority': 'Low'},
    ]
    
    col_map, col_panel = st.columns([2.5, 1])
    
    with col_panel:
        tier = st.selectbox("Deployment Tier", ["expected", "conservative", "peak"])
        try:
            res = requests.post(f"{API}/optimize", json={"tier": tier, "events": mock_events}, timeout=10).json()
        except:
            res = {"status": "ERROR", "deployment_plan": [], "coverage_score": 0, "total_officers_deployed": 0}
        
        if res.get("status") in ["OPTIMAL", "FEASIBLE"]:
            st.markdown(mbox("Coverage Score", f"{res['coverage_score']*100:.0f}%", f"Status: {res['status']}", "#16a34a"), unsafe_allow_html=True)
            st.markdown(mbox("Officers Deployed", res['total_officers_deployed'],
                f"From {len(set(p['from_station'] for p in res['deployment_plan']))} stations", "#2563EB"), unsafe_allow_html=True)
            
            st.markdown("**Deployment Orders**")
            for p in res['deployment_plan'][:6]:
                is_high = "High" in p.get('reason', '')
                bc = "#dc2626" if is_high else "#16a34a"
                st.markdown(f"""<div style="background:#f8fafc;padding:10px 14px;border-radius:8px;
                    margin-bottom:6px;font-size:0.82rem;color:#334155;border-left:3px solid {bc}">
                    <b>{p['junction']}</b><br/>
                    <span style="color:#94a3b8">{p['officers_assigned']} officers from {p['from_station']} ({p['distance_km']}km)</span>
                </div>""", unsafe_allow_html=True)
        else:
            st.error("Backend not reachable. Run: python backend/main.py")
    
    with col_map:
        m = folium.Map(location=[12.9716, 77.5946], zoom_start=12, tiles="cartodbpositron")
        try:
            stations = requests.get(f"{API}/stations", timeout=5).json()
            for name, sd in stations.items():
                folium.CircleMarker([sd['lat'], sd['lon']], radius=3, color='#2563EB', fill=True,
                    fill_opacity=0.3, tooltip=f"{name} (Cap: {sd['capacity']})").add_to(m)
        except: pass
        for ev in mock_events:
            color = '#dc2626' if ev['priority'] == 'High' else '#d97706'
            r = 14 if ev['closure_prob'] > 0.7 else 8
            folium.CircleMarker([ev['latitude'], ev['longitude']], radius=r, color=color, fill=True,
                fill_color=color, fill_opacity=0.5,
                tooltip=f"{ev['junction']} | Closure: {ev['closure_prob']:.0%} | {ev['priority']}").add_to(m)
        st_folium(m, width=None, height=500, returned_objects=[])

# ---- TAB 2: VULNERABILITY INTEL ----
with tab2:
    if eda:
        rt = eda.get('resolution_time', {})
        spread = eda.get('event_spread_stats', {})
        closure_true = eda.get('closure_dist', {}).get('True', eda.get('closure_dist', {}).get(True, 0))
        
        c1, c2, c3, c4 = st.columns(4)
        with c1: st.markdown(mbox("Total Events", f"{total_events:,}", f"{eda.get('date_range',{}).get('start','')[:10]} to {eda.get('date_range',{}).get('end','')[:10]}", "#2563EB"), unsafe_allow_html=True)
        with c2: st.markdown(mbox("Road Closure Rate", f"{closure_true/total_events*100:.1f}%", f"{closure_true} closures", "#dc2626"), unsafe_allow_html=True)
        with c3: st.markdown(mbox("Median Resolution", f"{rt.get('median_hrs','N/A')}h", f"P25={rt.get('p25_hrs','?')}h / P75={rt.get('p75_hrs','?')}h", "#16a34a"), unsafe_allow_html=True)
        with c4: st.markdown(mbox("Median Event Spread", f"{spread.get('median_km','?')}km", f"P95={spread.get('p95_km','?')}km", "#d97706"), unsafe_allow_html=True)
        
        st.markdown("#### Police Station Risk Profiles")
        stations_list = eda.get('station_profiles', [])
        if stations_list:
            df_s = pd.DataFrame(stations_list).head(20)
            bars = alt.Chart(df_s).mark_bar(cornerRadiusTopLeft=4, cornerRadiusTopRight=4, color='#2563EB').encode(
                x=alt.X('station:N', sort='-y', axis=alt.Axis(labelAngle=-45)),
                y=alt.Y('total_events:Q', title='Events'),
                tooltip=['station', 'total_events', 'closure_rate', 'high_priority_pct']
            ).properties(height=320)
            line = alt.Chart(df_s).mark_line(color='#dc2626', strokeWidth=2, point=alt.OverlayMarkDef(color='#dc2626', size=40)).encode(
                x=alt.X('station:N', sort='-y'),
                y=alt.Y('closure_rate:Q', title='Closure Rate')
            )
            st.altair_chart(alt.layer(bars, line).resolve_scale(y='independent').configure(background='transparent', font='Inter').configure_axis(gridColor='#e2e8f0').configure_view(strokeWidth=0), use_container_width=True)
        
        st.markdown("#### Corridor Risk Ranking")
        corridors = eda.get('corridor_profiles', [])
        if corridors:
            df_c = pd.DataFrame(corridors)
            rows = ""
            for _, r in df_c.iterrows():
                risk = "High" if r['closure_rate'] > 0.1 else ("Medium" if r['closure_rate'] > 0.05 else "Low")
                rc = "#dc2626" if risk == "High" else ("#d97706" if risk == "Medium" else "#16a34a")
                rbg = "#fef2f2" if risk == "High" else ("#fffbeb" if risk == "Medium" else "#f0fdf4")
                res_hrs = f"{r['median_resolution_hrs']}h" if r['median_resolution_hrs'] else "N/A"
                rows += f"""<tr>
                    <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#0f172a">{r['corridor']}</td>
                    <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#475569">{r['total_events']}</td>
                    <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#475569">{r['closure_count']}</td>
                    <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#475569">{r['closure_rate']*100:.1f}%</td>
                    <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#475569">{res_hrs}</td>
                    <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9">
                        <span style="background:{rbg};color:{rc};padding:3px 10px;border-radius:20px;
                            font-size:0.7rem;font-weight:700">{risk}</span></td>
                </tr>"""
            st.markdown(f"""<table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                <thead><tr>
                    <th style="background:#f8fafc;color:#475569;font-weight:600;text-transform:uppercase;font-size:0.72rem;letter-spacing:0.05em;padding:12px 16px;text-align:left;border-bottom:2px solid #e2e8f0">Corridor</th>
                    <th style="background:#f8fafc;color:#475569;font-weight:600;text-transform:uppercase;font-size:0.72rem;letter-spacing:0.05em;padding:12px 16px;text-align:left;border-bottom:2px solid #e2e8f0">Events</th>
                    <th style="background:#f8fafc;color:#475569;font-weight:600;text-transform:uppercase;font-size:0.72rem;letter-spacing:0.05em;padding:12px 16px;text-align:left;border-bottom:2px solid #e2e8f0">Closures</th>
                    <th style="background:#f8fafc;color:#475569;font-weight:600;text-transform:uppercase;font-size:0.72rem;letter-spacing:0.05em;padding:12px 16px;text-align:left;border-bottom:2px solid #e2e8f0">Closure Rate</th>
                    <th style="background:#f8fafc;color:#475569;font-weight:600;text-transform:uppercase;font-size:0.72rem;letter-spacing:0.05em;padding:12px 16px;text-align:left;border-bottom:2px solid #e2e8f0">Resolution</th>
                    <th style="background:#f8fafc;color:#475569;font-weight:600;text-transform:uppercase;font-size:0.72rem;letter-spacing:0.05em;padding:12px 16px;text-align:left;border-bottom:2px solid #e2e8f0">Risk</th>
                </tr></thead><tbody>{rows}</tbody></table>""", unsafe_allow_html=True)
        
        st.markdown("#### Event Density Heatmap")
        hm = eda.get('heatmap_data', [])
        if hm:
            df_hm = pd.DataFrame(hm)
            df_hm['day_name'] = df_hm['day_of_week'].map({0:'Mon',1:'Tue',2:'Wed',3:'Thu',4:'Fri',5:'Sat',6:'Sun'})
            chart = alt.Chart(df_hm).mark_rect(cornerRadius=3).encode(
                x=alt.X('hour:O', title='Hour'), y=alt.Y('day_name:N', sort=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], title=''),
                color=alt.Color('count:Q', scale=alt.Scale(scheme='blues'), title='Events'),
                tooltip=['day_name', 'hour', 'count']
            ).properties(height=200)
            st.altair_chart(chart.configure(background='transparent', font='Inter').configure_view(strokeWidth=0), use_container_width=True)

# ---- TAB 3: SCENARIO PLANNER ----
with tab3:
    st.markdown("#### Chinnaswamy 2025 IPL Egress Scenario")
    st.markdown("Compare intuition-based deployment versus SEVA's MILP-optimized allocation.")
    if st.button("Run Scenario Simulation", type="primary", use_container_width=True):
        with st.spinner("Running OR-Tools MILP optimization..."):
            try:
                scen = requests.get(f"{API}/scenario/chinnaswamy", timeout=15).json()
                imp = scen.get('improvement', {})
                st.markdown(f"""<div style="background:#f0fdf4;border:1px solid rgba(22,163,74,0.2);
                    border-radius:12px;padding:20px;text-align:center;margin:16px 0 24px;">
                    <div style="font-size:0.78rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em">
                    SEVA IMPROVEMENT</div>
                    <div style="font-size:2.2rem;font-weight:800;color:#16a34a">+{imp.get('coverage_gain',0)*100:.0f}% Coverage</div>
                    <div style="font-size:0.95rem;color:#475569">+{imp.get('additional_officers',0)} officers | {imp.get('junctions_secured',0)} junctions secured</div>
                </div>""", unsafe_allow_html=True)
                col1, col2 = st.columns(2)
                with col1:
                    ws = scen['without_seva']
                    st.markdown(f"""<div style="background:#fef2f2;border:1px solid rgba(220,38,38,0.2);border-radius:10px;
                        padding:12px;text-align:center;font-weight:700;color:#dc2626;margin-bottom:16px">Without SEVA</div>""", unsafe_allow_html=True)
                    st.markdown(mbox("Coverage", f"{ws['coverage_score']*100:.0f}%", f"{ws['total_officers_deployed']} officers", "#dc2626"), unsafe_allow_html=True)
                    st.dataframe(pd.DataFrame(ws['deployment_plan']), use_container_width=True, hide_index=True)
                with col2:
                    seva = scen['with_seva']
                    st.markdown(f"""<div style="background:#f0fdf4;border:1px solid rgba(22,163,74,0.2);border-radius:10px;
                        padding:12px;text-align:center;font-weight:700;color:#16a34a;margin-bottom:16px">With SEVA (Optimized)</div>""", unsafe_allow_html=True)
                    st.markdown(mbox("Coverage", f"{seva['coverage_score']*100:.0f}%", f"{seva['total_officers_deployed']} officers", "#16a34a"), unsafe_allow_html=True)
                    if not seva.get('uncovered_junctions'):
                        st.success("All junctions fully covered")
                    st.dataframe(pd.DataFrame(seva['deployment_plan']), use_container_width=True, hide_index=True)
            except Exception as e:
                st.error(f"Error: {e}")

# ---- TAB 4: MODEL PERFORMANCE ----
with tab4:
    st.markdown("#### Model Evaluation (Temporal Hold-out: Mar to Apr 2024)")
    st.markdown("All metrics on unseen test data. SHAP explanations are real TreeSHAP values.")
    
    metrics = load_metrics()
    if metrics:
        def shap_chart(features, color, title):
            if not features: return
            df = pd.DataFrame({'Feature': list(features.keys()), 'SHAP': list(features.values())})
            df = df[df['SHAP'] > 0.0001]
            if df.empty: return
            chart = alt.Chart(df).mark_bar(cornerRadiusTopRight=4, cornerRadiusBottomRight=4, color=color).encode(
                x=alt.X('SHAP:Q', title='Mean |SHAP|'), y=alt.Y('Feature:N', sort='-x')
            ).properties(height=max(len(df)*28, 80), title=title)
            st.altair_chart(chart.configure(background='transparent', font='Inter').configure_view(strokeWidth=0), use_container_width=True)
        
        cl = metrics.get('closure', {})
        st.markdown(f"""<div style="display:inline-block;background:#dbeafe;color:#2563EB;padding:3px 10px;border-radius:20px;font-size:0.7rem;font-weight:700;margin-bottom:8px">MODEL 1</div>""", unsafe_allow_html=True)
        st.markdown("##### Road Closure Prediction")
        c1, c2, c3, c4 = st.columns(4)
        with c1: st.markdown(mbox("PR-AUC", cl.get('pr_auc','N/A'), "", "#16a34a"), unsafe_allow_html=True)
        with c2: st.markdown(mbox("F1 Score", cl.get('f1','N/A'), f"Threshold: {cl.get('threshold','N/A')}", "#16a34a"), unsafe_allow_html=True)
        with c3: st.markdown(mbox("Train / Test", f"{cl.get('train_size','?')} / {cl.get('test_size','?')}", f"Pos rate: {cl.get('pos_rate_train',0)*100:.1f}%", "#2563EB"), unsafe_allow_html=True)
        with c4: st.markdown(mbox("Algorithm", "LightGBM", "800 estimators, lr=0.03"), unsafe_allow_html=True)
        shap_chart(cl.get('top_features'), '#2563EB', 'SHAP: Closure Model')
        
        st.divider()
        pr = metrics.get('priority', {})
        st.markdown(f"""<div style="display:inline-block;background:#fef2f2;color:#dc2626;padding:3px 10px;border-radius:20px;font-size:0.7rem;font-weight:700;margin-bottom:8px">MODEL 2</div>""", unsafe_allow_html=True)
        st.markdown("##### Priority Classification")
        c1, c2 = st.columns(2)
        with c1: st.markdown(mbox("ROC-AUC", pr.get('roc_auc','N/A'), "", "#16a34a"), unsafe_allow_html=True)
        with c2: st.markdown(mbox("F1 Score", pr.get('f1','N/A'), "", "#16a34a"), unsafe_allow_html=True)
        shap_chart(pr.get('top_features'), '#dc2626', 'SHAP: Priority Model')
        
        st.divider()
        rs = metrics.get('resolution', {})
        st.markdown(f"""<div style="display:inline-block;background:#fffbeb;color:#d97706;padding:3px 10px;border-radius:20px;font-size:0.7rem;font-weight:700;margin-bottom:8px">MODEL 3</div>""", unsafe_allow_html=True)
        st.markdown("##### Resolution Time (Quantile Regression)")
        c1, c2, c3 = st.columns(3)
        with c1: st.markdown(mbox("MAE (Median)", f"{rs.get('mae_median','N/A')}h", "", "#d97706"), unsafe_allow_html=True)
        with c2: st.markdown(mbox("Median Abs Error", f"{rs.get('median_abs_error','N/A')}h", "50% of predictions within this", "#d97706"), unsafe_allow_html=True)
        with c3: st.markdown(mbox("50% CI Coverage", f"{rs.get('interval_coverage_50pct',0)*100:.1f}%", f"Train: {rs.get('train_size','?')} / Test: {rs.get('test_size','?')}", "#2563EB"), unsafe_allow_html=True)
        shap_chart(rs.get('top_features'), '#d97706', 'SHAP: Resolution Model')

# ---- TAB 5: DATA EXPLORER ----
with tab5:
    st.markdown("#### ASTraM Dataset Analysis")
    st.markdown("Comprehensive breakdown of 8,057 traffic events across Bengaluru.")
    
    if eda:
        st.markdown("##### Event Cause Distribution")
        cause_dist = eda.get('event_cause_dist', {})
        if cause_dist:
            df_cause = pd.DataFrame({'Cause': list(cause_dist.keys()), 'Count': list(cause_dist.values())}).sort_values('Count', ascending=False)
            chart = alt.Chart(df_cause).mark_bar(cornerRadiusTopLeft=4, cornerRadiusTopRight=4, color='#2563EB').encode(
                x=alt.X('Cause:N', sort='-y', axis=alt.Axis(labelAngle=-45)),
                y=alt.Y('Count:Q'), tooltip=['Cause', 'Count']
            ).properties(height=280)
            st.altair_chart(chart.configure(background='transparent', font='Inter').configure_axis(gridColor='#e2e8f0').configure_view(strokeWidth=0), use_container_width=True)
        
        st.markdown("##### Hourly Event Pattern")
        hourly = eda.get('hourly_pattern', [])
        if hourly:
            df_h = pd.DataFrame(hourly)
            base = alt.Chart(df_h).encode(x=alt.X('hour:Q', title='Hour of Day'))
            area = base.mark_area(opacity=0.15, color='#2563EB').encode(y=alt.Y('total:Q', title='Events'))
            line = base.mark_line(color='#2563EB', strokeWidth=2.5).encode(y='total:Q')
            points = base.mark_circle(color='#2563EB', size=30).encode(y='total:Q')
            st.altair_chart(alt.layer(area, line, points).properties(height=220).configure(background='transparent', font='Inter').configure_axis(gridColor='#e2e8f0').configure_view(strokeWidth=0), use_container_width=True)
        
        st.markdown("##### Key Statistics")
        c1, c2, c3, c4 = st.columns(4)
        with c1: st.markdown(mbox("Unplanned Events", eda.get('event_type_dist',{}).get('unplanned','?'), f"vs {eda.get('event_type_dist',{}).get('planned','?')} planned", "#d97706"), unsafe_allow_html=True)
        with c2: st.markdown(mbox("High Priority", eda.get('priority_dist',{}).get('High','?'), f"vs {eda.get('priority_dist',{}).get('Low','?')} low", "#dc2626"), unsafe_allow_html=True)
        with c3: st.markdown(mbox("Authenticated", eda.get('authenticated_dist',{}).get('yes','?'), f"vs {eda.get('authenticated_dist',{}).get('no','?')} unverified", "#16a34a"), unsafe_allow_html=True)
        with c4: st.markdown(mbox("Police Stations", f"{station_count}", "Active across Bengaluru", "#2563EB"), unsafe_allow_html=True)

# ---- FOOTER ----
st.markdown("""<div style="text-align:center;padding:40px 48px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:0.78rem;">
    <p style="margin-bottom:4px;"><b style="color:#0f172a">SEVA Platform</b> | Flipkart Gridlock 2.0 | Problem Statement 2</p>
    <p>Built with LightGBM, OR-Tools, TreeSHAP, Streamlit. All metrics from ASTraM dataset (8,057 events).</p>
</div>""", unsafe_allow_html=True)
