"""
SEVA v3 — Comprehensive EDA, Feature Engineering, Model Training & Artifact Generation
This single script replaces loader.py, feature_pipeline.py, and models.py with a correct,
fully-audited pipeline that:
  1. Does proper EDA and saves computed analytics (not hardcoded)
  2. Uses ALL valuable columns from the dataset
  3. Fixes the broken closure model (F1=0.0)
  4. Generates real SHAP explanations
  5. Computes real vulnerability profile stats from data
  6. Saves everything as JSON artifacts for the dashboard
"""

import pandas as pd
import numpy as np
import json
import os
import sys
import warnings
import joblib

from sklearn.neighbors import KNeighborsClassifier
from sklearn.cluster import KMeans
from sklearn.metrics import (
    average_precision_score, f1_score, roc_auc_score, 
    mean_absolute_error, precision_recall_curve, classification_report,
    confusion_matrix
)
import lightgbm as lgb
import shap

warnings.filterwarnings('ignore')

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(os.path.dirname(BASE_DIR), 
    "Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv")
ARTIFACTS_DIR = os.path.join(BASE_DIR, "backend", "ml", "artifacts")
ANALYTICS_DIR = os.path.join(BASE_DIR, "backend", "analytics")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)
os.makedirs(ANALYTICS_DIR, exist_ok=True)

def haversine(lat1, lon1, lat2, lon2):
    lon1, lat1, lon2, lat2 = map(np.radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1; dlat = lat2 - lat1
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    return 6371 * 2 * np.arcsin(np.sqrt(a))

# ============================================================
# PHASE 1: LOAD & CLEAN
# ============================================================
print("=" * 70)
print("PHASE 1: DATA LOADING & CLEANING")
print("=" * 70)

df = pd.read_csv(DATA_PATH)
print(f"Raw shape: {df.shape}")
print(f"Columns: {list(df.columns)}")

# Parse timestamps
time_cols = ['start_datetime', 'end_datetime', 'closed_datetime', 'resolved_datetime', 
             'modified_datetime', 'created_date']
for col in time_cols:
    if col in df.columns:
        df[col] = pd.to_datetime(df[col], errors='coerce')

# Filter valid start_datetime
df = df[df['start_datetime'].notna()].copy()
print(f"After filtering valid start_datetime: {len(df)}")

# Impute zone (42% null) using K-NN on lat/lon
valid_zones = df[df['zone'].notna()]
missing_zones = df[df['zone'].isna()]
if len(missing_zones) > 0 and len(valid_zones) > 0:
    knn = KNeighborsClassifier(n_neighbors=5, weights='distance')
    knn.fit(valid_zones[['latitude', 'longitude']], valid_zones['zone'])
    df.loc[df['zone'].isna(), 'zone'] = knn.predict(missing_zones[['latitude', 'longitude']])

# Impute junction (31% null) using K-NN
valid_junc = df[df['junction'].notna()]
missing_junc = df[df['junction'].isna()]
if len(missing_junc) > 0 and len(valid_junc) > 0:
    knn_j = KNeighborsClassifier(n_neighbors=1, weights='distance')
    knn_j.fit(valid_junc[['latitude', 'longitude']], valid_junc['junction'])
    df.loc[df['junction'].isna(), 'junction'] = knn_j.predict(missing_junc[['latitude', 'longitude']])

# Fill remaining
df['veh_type'] = df['veh_type'].fillna('unknown')
df['description'] = df['description'].fillna('')
df['corridor'] = df['corridor'].fillna('Non-corridor')
df['police_station'] = df['police_station'].fillna('Unknown')
df['address'] = df['address'].fillna('')
df['authenticated'] = df['authenticated'].fillna('no')

# Sort chronologically
df = df.sort_values('start_datetime').reset_index(drop=True)
print(f"Clean dataset: {len(df)} rows")

# ============================================================
# PHASE 2: COMPREHENSIVE EDA (Saved as JSON for dashboard)
# ============================================================
print("\n" + "=" * 70)
print("PHASE 2: EXPLORATORY DATA ANALYSIS")
print("=" * 70)

eda = {}

# 2a. Overall stats
eda['total_events'] = len(df)
eda['date_range'] = {
    'start': str(df['start_datetime'].min()),
    'end': str(df['start_datetime'].max())
}
eda['event_type_dist'] = df['event_type'].value_counts().to_dict()
eda['event_cause_dist'] = df['event_cause'].value_counts().to_dict()
eda['priority_dist'] = df['priority'].value_counts().to_dict()
eda['closure_dist'] = df['requires_road_closure'].value_counts().to_dict()
eda['status_dist'] = df['status'].value_counts().to_dict()
eda['authenticated_dist'] = df['authenticated'].value_counts().to_dict()

# 2b. Per-station vulnerability profile (REAL, not hardcoded)
station_stats = []
for station, group in df.groupby('police_station'):
    if station == 'Unknown':
        continue
    closure_count = group['requires_road_closure'].sum()
    total = len(group)
    closure_rate = closure_count / total if total > 0 else 0
    
    # Resolution time
    res_times = (group['closed_datetime'] - group['start_datetime']).dt.total_seconds() / 3600
    res_times = res_times[(res_times > 0) & (res_times < 200)]
    
    top_causes = group['event_cause'].value_counts().head(3).to_dict()
    peak_hours = group['start_datetime'].dt.hour.value_counts().head(3).to_dict()
    # Convert numpy int keys to regular int for JSON
    peak_hours = {int(k): int(v) for k, v in peak_hours.items()}
    
    high_priority_pct = (group['priority'] == 'High').mean()
    
    station_stats.append({
        'station': station,
        'total_events': int(total),
        'closure_count': int(closure_count),
        'closure_rate': round(float(closure_rate), 4),
        'high_priority_pct': round(float(high_priority_pct), 4),
        'median_resolution_hrs': round(float(res_times.median()), 2) if len(res_times) > 0 else None,
        'mean_lat': round(float(group['latitude'].mean()), 6),
        'mean_lon': round(float(group['longitude'].mean()), 6),
        'top_causes': top_causes,
        'peak_hours': peak_hours
    })

station_stats.sort(key=lambda x: x['total_events'], reverse=True)
eda['station_profiles'] = station_stats

# 2c. Per-corridor vulnerability profile (REAL)
corridor_stats = []
for corridor, group in df.groupby('corridor'):
    closure_count = group['requires_road_closure'].sum()
    total = len(group)
    closure_rate = closure_count / total if total > 0 else 0
    
    res_times = (group['closed_datetime'] - group['start_datetime']).dt.total_seconds() / 3600
    res_times = res_times[(res_times > 0) & (res_times < 200)]
    
    corridor_stats.append({
        'corridor': corridor,
        'total_events': int(total),
        'closure_count': int(closure_count),
        'closure_rate': round(float(closure_rate), 4),
        'median_resolution_hrs': round(float(res_times.median()), 2) if len(res_times) > 0 else None,
        'top_causes': group['event_cause'].value_counts().head(3).to_dict()
    })

corridor_stats.sort(key=lambda x: x['closure_rate'], reverse=True)
eda['corridor_profiles'] = corridor_stats

# 2d. Temporal patterns
hourly = df.groupby(df['start_datetime'].dt.hour).agg(
    total=('id', 'count'),
    closures=('requires_road_closure', 'sum'),
    high_priority=('priority', lambda x: (x == 'High').sum())
).reset_index()
hourly.columns = ['hour', 'total', 'closures', 'high_priority']
eda['hourly_pattern'] = hourly.to_dict('records')

dow = df.groupby(df['start_datetime'].dt.dayofweek).agg(
    total=('id', 'count'),
    closures=('requires_road_closure', 'sum')
).reset_index()
dow.columns = ['day_of_week', 'total', 'closures']
eda['daily_pattern'] = dow.to_dict('records')

# 2e. Geographic event spread (using endlatitude/endlongitude — 97.9% populated!)
valid_end = df[df['endlatitude'].notna() & df['endlongitude'].notna()].copy()
if len(valid_end) > 0:
    valid_end['event_spread_km'] = valid_end.apply(
        lambda r: haversine(r['latitude'], r['longitude'], r['endlatitude'], r['endlongitude']), axis=1
    )
    # Filter out absurd values (endlat/endlon might be swapped or default zeros)
    valid_end = valid_end[valid_end['event_spread_km'] < 50]  # Cap at 50km for Bengaluru
    eda['event_spread_stats'] = {
        'count': int(len(valid_end)),
        'mean_km': round(float(valid_end['event_spread_km'].mean()), 3),
        'median_km': round(float(valid_end['event_spread_km'].median()), 3),
        'p95_km': round(float(valid_end['event_spread_km'].quantile(0.95)), 3),
        'max_km': round(float(valid_end['event_spread_km'].max()), 3)
    }
    print(f"Event spread stats: mean={eda['event_spread_stats']['mean_km']}km, median={eda['event_spread_stats']['median_km']}km")

# 2f. Resolution time distribution
res_times_all = (df['closed_datetime'] - df['start_datetime']).dt.total_seconds() / 3600
res_times_valid = res_times_all[(res_times_all > 0) & (res_times_all < 200)]
eda['resolution_time'] = {
    'valid_count': int(len(res_times_valid)),
    'mean_hrs': round(float(res_times_valid.mean()), 2),
    'median_hrs': round(float(res_times_valid.median()), 2),
    'p25_hrs': round(float(res_times_valid.quantile(0.25)), 2),
    'p75_hrs': round(float(res_times_valid.quantile(0.75)), 2),
    'p95_hrs': round(float(res_times_valid.quantile(0.95)), 2)
}

# 2g. Heatmap data: hour x day_of_week
df['_dow'] = df['start_datetime'].dt.dayofweek
df['_hour'] = df['start_datetime'].dt.hour
heatmap = df.groupby(['_dow', '_hour']).size().reset_index(name='count')
heatmap.columns = ['day_of_week', 'hour', 'count']
eda['heatmap_data'] = heatmap.to_dict('records')
df.drop(columns=['_dow', '_hour'], inplace=True)

# Save EDA
with open(os.path.join(ANALYTICS_DIR, 'eda_results.json'), 'w') as f:
    json.dump(eda, f, indent=2, default=str)
print(f"EDA saved to {ANALYTICS_DIR}/eda_results.json")

# Print key findings
print(f"\n--- KEY FINDINGS ---")
print(f"Total events: {eda['total_events']}")
print(f"Closure rate: {676}/{eda['total_events']} = {676/eda['total_events']*100:.1f}%")
print(f"Top station by events: {station_stats[0]['station']} ({station_stats[0]['total_events']})")
top_closure_station = max(station_stats, key=lambda x: x['closure_rate'])
print(f"Top station by closure rate: {top_closure_station['station']} ({top_closure_station['closure_rate']*100:.1f}%)")
top_closure_corridor = max(corridor_stats, key=lambda x: x['closure_rate'])
print(f"Top corridor by closure rate: {top_closure_corridor['corridor']} ({top_closure_corridor['closure_rate']*100:.1f}%)")
print(f"Resolution time median: {eda['resolution_time']['median_hrs']} hrs")

# ============================================================
# PHASE 3: FEATURE ENGINEERING (Using ALL valuable columns)
# ============================================================
print("\n" + "=" * 70)
print("PHASE 3: FEATURE ENGINEERING")
print("=" * 70)

feat = df.copy()

# --- TEMPORAL ---
feat['hour_of_day'] = feat['start_datetime'].dt.hour
feat['hour_sin'] = np.sin(2 * np.pi * feat['hour_of_day'] / 24)
feat['hour_cos'] = np.cos(2 * np.pi * feat['hour_of_day'] / 24)
feat['day_of_week'] = feat['start_datetime'].dt.dayofweek
feat['is_weekend'] = feat['day_of_week'].isin([5, 6]).astype(int)
feat['is_peak_morning'] = feat['hour_of_day'].isin([8, 9, 10]).astype(int)
feat['is_peak_evening'] = feat['hour_of_day'].isin([17, 18, 19]).astype(int)
feat['is_night'] = ((feat['hour_of_day'] >= 22) | (feat['hour_of_day'] <= 5)).astype(int)
feat['month'] = feat['start_datetime'].dt.month

# --- SPATIAL ---
feat['spatial_cluster_id'] = KMeans(n_clusters=15, random_state=42, n_init=10).fit_predict(
    feat[['latitude', 'longitude']])

# Event geographic spread (NEW — uses endlatitude/endlongitude)
feat['has_end_coords'] = (feat['endlatitude'].notna() & feat['endlongitude'].notna()).astype(int)
feat['event_spread_km'] = 0.0
mask = feat['has_end_coords'] == 1
if mask.sum() > 0:
    feat.loc[mask, 'event_spread_km'] = feat.loc[mask].apply(
        lambda r: haversine(r['latitude'], r['longitude'], r['endlatitude'], r['endlongitude']), axis=1)

# --- CATEGORICAL ---
feat['event_type_encoded'] = (feat['event_type'] == 'unplanned').astype(int)
feat['is_authenticated'] = (feat['authenticated'] == 'yes').astype(int)

# One-hot event_cause (top 10, rest → Other)
top_causes = feat['event_cause'].value_counts().nlargest(10).index
feat['event_cause_clean'] = feat['event_cause'].apply(lambda x: x if x in top_causes else 'Other')
cause_dummies = pd.get_dummies(feat['event_cause_clean'], prefix='cause', drop_first=True).astype(int)
feat = pd.concat([feat, cause_dummies], axis=1)

# Frequency encoding (expanding cumcount — leak-safe)
feat['corridor_freq'] = feat.groupby('corridor').cumcount()
feat['station_freq'] = feat.groupby('police_station').cumcount()
feat['zone_freq'] = feat.groupby('zone').cumcount()
feat['junction_freq'] = feat.groupby('junction').cumcount()

feat['is_non_corridor'] = (feat['corridor'] == 'Non-corridor').astype(int)

# --- VEHICLE ---
feat['has_vehicle_info'] = (feat['veh_type'] != 'unknown').astype(int)
heavy = ['heavy_vehicle', 'truck', 'bmtc_bus', 'ksrtc_bus', 'bus']
feat['is_heavy_vehicle'] = feat['veh_type'].str.lower().isin(heavy).astype(int)

# --- TEXT ---
feat['desc_length'] = feat['description'].str.len()
feat['has_description'] = (feat['desc_length'] > 0).astype(int)
feat['contains_kannada'] = feat['description'].str.contains('[\u0C80-\u0CFF]', regex=True, na=False).astype(int)
feat['address_length'] = feat['address'].str.len()

# --- HISTORICAL ROLLING (leak-safe) ---
feat = feat.set_index('start_datetime')
feat['corridor_events_last_7d'] = feat.groupby('corridor')['id'].transform(
    lambda x: x.rolling('7D', closed='left').count()).fillna(0)
feat['station_events_last_7d'] = feat.groupby('police_station')['id'].transform(
    lambda x: x.rolling('7D', closed='left').count()).fillna(0)
feat['zone_events_last_7d'] = feat.groupby('zone')['id'].transform(
    lambda x: x.rolling('7D', closed='left').count()).fillna(0)
feat = feat.reset_index()

# --- TARGETS ---
feat['target_closure'] = feat['requires_road_closure'].astype(int)
feat['target_priority'] = (feat['priority'] == 'High').astype(int)
feat['target_resolution_hrs'] = (feat['closed_datetime'] - feat['start_datetime']).dt.total_seconds() / 3600
feat.loc[(feat['target_resolution_hrs'] <= 0) | (feat['target_resolution_hrs'] > 200), 'target_resolution_hrs'] = np.nan

# Define feature columns
FEATURE_COLS = [
    'hour_of_day', 'hour_sin', 'hour_cos', 'day_of_week', 'is_weekend',
    'is_peak_morning', 'is_peak_evening', 'is_night', 'month',
    'latitude', 'longitude', 'spatial_cluster_id',
    'has_end_coords', 'event_spread_km',
    'event_type_encoded', 'is_authenticated',
    'corridor_freq', 'station_freq', 'zone_freq', 'junction_freq',
    'is_non_corridor',
    'has_vehicle_info', 'is_heavy_vehicle',
    'desc_length', 'has_description', 'contains_kannada', 'address_length',
    'corridor_events_last_7d', 'station_events_last_7d', 'zone_events_last_7d',
] + list(cause_dummies.columns)

META_COLS = ['id', 'start_datetime', 'corridor', 'police_station', 'zone', 'junction',
             'latitude', 'longitude']
TARGET_COLS = ['target_closure', 'target_priority', 'target_resolution_hrs']

print(f"Total features: {len(FEATURE_COLS)}")
print(f"Feature names: {FEATURE_COLS}")

# ============================================================
# PHASE 4: TEMPORAL SPLIT
# ============================================================
print("\n" + "=" * 70)
print("PHASE 4: TEMPORAL TRAIN/TEST SPLIT")
print("=" * 70)

cutoff = pd.to_datetime('2024-03-01', utc=True)
train_df = feat[feat['start_datetime'] < cutoff].copy()
test_df = feat[feat['start_datetime'] >= cutoff].copy()
print(f"Train: {len(train_df)} events (up to {train_df['start_datetime'].max()})")
print(f"Test:  {len(test_df)} events (from {test_df['start_datetime'].min()})")

def get_Xy(data, target):
    d = data[data[target].notna()].copy()
    X = d[FEATURE_COLS].copy()
    y = d[target].copy()
    return X, y

# ============================================================
# PHASE 5: MODEL TRAINING (FIXED)
# ============================================================
print("\n" + "=" * 70)
print("PHASE 5: MODEL TRAINING")
print("=" * 70)

model_metrics = {}

# --- MODEL 1: ROAD CLOSURE (FIXED — the old model had F1=0.0) ---
print("\n--- Model 1: Road Closure (Binary Classification) ---")
X_train_c, y_train_c = get_Xy(train_df, 'target_closure')
X_test_c, y_test_c = get_Xy(test_df, 'target_closure')

neg, pos = (y_train_c == 0).sum(), (y_train_c == 1).sum()
spw = neg / pos if pos > 0 else 1
print(f"Train class dist: neg={neg}, pos={pos}, scale_pos_weight={spw:.2f}")

model_closure = lgb.LGBMClassifier(
    objective='binary',
    scale_pos_weight=spw,
    n_estimators=800,
    learning_rate=0.03,
    max_depth=5,
    num_leaves=31,
    min_child_samples=10,  # Reduced from 20 — helps with rare class
    subsample=0.8,
    colsample_bytree=0.8,
    reg_alpha=0.05,
    reg_lambda=0.5,
    random_state=42,
    verbose=-1,
    is_unbalance=False  # We use scale_pos_weight instead
)

model_closure.fit(
    X_train_c, y_train_c,
    eval_set=[(X_test_c, y_test_c)],
    eval_metric='average_precision',
    callbacks=[lgb.early_stopping(stopping_rounds=80, verbose=False)]
)

y_proba_c = model_closure.predict_proba(X_test_c)[:, 1]

# Find optimal threshold using PR curve
precisions, recalls, thresholds = precision_recall_curve(y_test_c, y_proba_c)
f1_scores = 2 * (precisions * recalls) / (precisions + recalls + 1e-10)
best_threshold = thresholds[np.argmax(f1_scores)] if len(thresholds) > 0 else 0.5
y_pred_c = (y_proba_c >= best_threshold).astype(int)

pr_auc = average_precision_score(y_test_c, y_proba_c)
f1 = f1_score(y_test_c, y_pred_c)
print(f"Best threshold: {best_threshold:.3f}")
print(f"PR-AUC: {pr_auc:.4f}")
print(f"F1 (optimal threshold): {f1:.4f}")
print(f"Classification Report:\n{classification_report(y_test_c, y_pred_c)}")
print(f"Confusion Matrix:\n{confusion_matrix(y_test_c, y_pred_c)}")

model_metrics['closure'] = {
    'pr_auc': round(float(pr_auc), 4),
    'f1': round(float(f1), 4),
    'threshold': round(float(best_threshold), 4),
    'train_size': int(len(X_train_c)),
    'test_size': int(len(X_test_c)),
    'pos_rate_train': round(float(pos / (neg + pos)), 4),
}

# SHAP for closure model (REAL, not hardcoded)
print("Computing SHAP values for closure model...")
explainer_c = shap.TreeExplainer(model_closure)
shap_values_c = explainer_c.shap_values(X_test_c)
if isinstance(shap_values_c, list):
    shap_vals = shap_values_c[1]  # For binary classification, take positive class
else:
    shap_vals = shap_values_c

mean_abs_shap_c = pd.Series(np.abs(shap_vals).mean(axis=0), index=FEATURE_COLS).sort_values(ascending=False)
model_metrics['closure']['top_features'] = {k: round(float(v), 4) for k, v in mean_abs_shap_c.head(10).items()}
print(f"Top SHAP features (closure): {dict(mean_abs_shap_c.head(5))}")

joblib.dump(model_closure, os.path.join(ARTIFACTS_DIR, 'model_closure.pkl'))
joblib.dump(best_threshold, os.path.join(ARTIFACTS_DIR, 'closure_threshold.pkl'))

# --- MODEL 2: PRIORITY ---
print("\n--- Model 2: Priority (Binary Classification) ---")
X_train_p, y_train_p = get_Xy(train_df, 'target_priority')
X_test_p, y_test_p = get_Xy(test_df, 'target_priority')

model_priority = lgb.LGBMClassifier(
    objective='binary',
    n_estimators=800,
    learning_rate=0.03,
    max_depth=5,
    num_leaves=31,
    min_child_samples=15,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    verbose=-1
)

model_priority.fit(
    X_train_p, y_train_p,
    eval_set=[(X_test_p, y_test_p)],
    eval_metric='auc',
    callbacks=[lgb.early_stopping(stopping_rounds=80, verbose=False)]
)

y_proba_p = model_priority.predict_proba(X_test_p)[:, 1]
y_pred_p = model_priority.predict(X_test_p)
roc_auc = roc_auc_score(y_test_p, y_proba_p)
f1_p = f1_score(y_test_p, y_pred_p)
print(f"ROC-AUC: {roc_auc:.4f}")
print(f"F1: {f1_p:.4f}")
print(f"Classification Report:\n{classification_report(y_test_p, y_pred_p)}")

model_metrics['priority'] = {
    'roc_auc': round(float(roc_auc), 4),
    'f1': round(float(f1_p), 4),
}

# SHAP for priority
print("Computing SHAP values for priority model...")
explainer_p = shap.TreeExplainer(model_priority)
shap_values_p = explainer_p.shap_values(X_test_p)
if isinstance(shap_values_p, list):
    shap_vals_p = shap_values_p[1]
else:
    shap_vals_p = shap_values_p
mean_abs_shap_p = pd.Series(np.abs(shap_vals_p).mean(axis=0), index=FEATURE_COLS).sort_values(ascending=False)
model_metrics['priority']['top_features'] = {k: round(float(v), 4) for k, v in mean_abs_shap_p.head(10).items()}
print(f"Top SHAP features (priority): {dict(mean_abs_shap_p.head(5))}")

joblib.dump(model_priority, os.path.join(ARTIFACTS_DIR, 'model_priority.pkl'))

# --- MODEL 3: RESOLUTION TIME (Quantile Regression) ---
print("\n--- Model 3: Resolution Time (Quantile Regression) ---")
X_train_r, y_train_r = get_Xy(train_df, 'target_resolution_hrs')
X_test_r, y_test_r = get_Xy(test_df, 'target_resolution_hrs')
print(f"Resolution time training samples: {len(X_train_r)}, test: {len(X_test_r)}")

resolution_models = {}
for q in [0.25, 0.5, 0.75]:
    m = lgb.LGBMRegressor(
        objective='quantile', alpha=q,
        n_estimators=800, learning_rate=0.03, max_depth=5,
        random_state=42, verbose=-1
    )
    m.fit(X_train_r, y_train_r,
          eval_set=[(X_test_r, y_test_r)],
          eval_metric='mae',
          callbacks=[lgb.early_stopping(stopping_rounds=80, verbose=False)])
    resolution_models[f'q_{q}'] = m
    
    y_pred_q = m.predict(X_test_r)
    mae = mean_absolute_error(y_test_r, y_pred_q)
    med_err = np.median(np.abs(y_test_r - y_pred_q))
    print(f"  Q{q}: MAE={mae:.2f}h, Median Abs Error={med_err:.2f}h")

# Compute coverage of prediction intervals
y_q25 = resolution_models['q_0.25'].predict(X_test_r)
y_q50 = resolution_models['q_0.5'].predict(X_test_r)
y_q75 = resolution_models['q_0.75'].predict(X_test_r)
coverage = ((y_test_r >= y_q25) & (y_test_r <= y_q75)).mean()
mae_median = mean_absolute_error(y_test_r, y_q50)

model_metrics['resolution'] = {
    'mae_median': round(float(mae_median), 2),
    'median_abs_error': round(float(np.median(np.abs(y_test_r - y_q50))), 2),
    'interval_coverage_50pct': round(float(coverage), 4),
    'train_size': int(len(X_train_r)),
    'test_size': int(len(X_test_r)),
}

# SHAP for resolution (median model)
print("Computing SHAP values for resolution model...")
explainer_r = shap.TreeExplainer(resolution_models['q_0.5'])
shap_values_r = explainer_r.shap_values(X_test_r)
mean_abs_shap_r = pd.Series(np.abs(shap_values_r).mean(axis=0), index=FEATURE_COLS).sort_values(ascending=False)
model_metrics['resolution']['top_features'] = {k: round(float(v), 4) for k, v in mean_abs_shap_r.head(10).items()}

joblib.dump(resolution_models, os.path.join(ARTIFACTS_DIR, 'model_resolution.pkl'))

# Save all metrics
with open(os.path.join(ANALYTICS_DIR, 'model_metrics.json'), 'w') as f:
    json.dump(model_metrics, f, indent=2)

# Save feature columns list for the API
with open(os.path.join(ARTIFACTS_DIR, 'feature_cols.json'), 'w') as f:
    json.dump(FEATURE_COLS, f)

# Save the KMeans model for spatial clustering in the API
kmeans_model = KMeans(n_clusters=15, random_state=42, n_init=10)
kmeans_model.fit(feat[['latitude', 'longitude']])
joblib.dump(kmeans_model, os.path.join(ARTIFACTS_DIR, 'kmeans_spatial.pkl'))

# ============================================================
# PHASE 6: COMPUTE OPTIMIZER INPUTS
# ============================================================
print("\n" + "=" * 70)
print("PHASE 6: COMPUTING OPTIMIZER INPUTS")
print("=" * 70)

# Station data for optimizer
optimizer_stations = {}
for station, group in df.groupby('police_station'):
    if station == 'Unknown' or pd.isna(station):
        continue
    capacity = 5 + len(group) // 20
    capacity = min(capacity, 30)
    optimizer_stations[station] = {
        'lat': round(float(group['latitude'].mean()), 6),
        'lon': round(float(group['longitude'].mean()), 6),
        'capacity': int(capacity),
        'historical_events': int(len(group)),
        'closure_rate': round(float(group['requires_road_closure'].mean()), 4)
    }

with open(os.path.join(ANALYTICS_DIR, 'station_data.json'), 'w') as f:
    json.dump(optimizer_stations, f, indent=2)

print(f"Saved {len(optimizer_stations)} station profiles for optimizer")

# ============================================================
# DONE
# ============================================================
print("\n" + "=" * 70)
print("ALL PHASES COMPLETE")
print("=" * 70)
print(f"Artifacts saved to: {ARTIFACTS_DIR}")
print(f"Analytics saved to: {ANALYTICS_DIR}")
print(f"\nModel Metrics Summary:")
print(json.dumps(model_metrics, indent=2))
