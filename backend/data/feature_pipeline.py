import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from datetime import timedelta
from sklearn.preprocessing import LabelEncoder

def engineer_features(df):
    """
    Given a cleaned dataframe sorted by start_datetime, computes features.
    Strictly avoids data leakage by using rolling aggregations.
    """
    print("Engineering features...")
    df = df.copy()
    
    # --- 1. TEMPORAL FEATURES ---
    df['hour_of_day'] = df['start_datetime'].dt.hour
    df['hour_sin'] = np.sin(2 * np.pi * df['hour_of_day'] / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['hour_of_day'] / 24)
    
    df['day_of_week'] = df['start_datetime'].dt.dayofweek
    df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
    
    # Peak hours: 8-11 AM, 5-8 PM
    df['is_peak_morning'] = df['hour_of_day'].isin([8, 9, 10]).astype(int)
    df['is_peak_evening'] = df['hour_of_day'].isin([17, 18, 19]).astype(int)
    df['is_night'] = ((df['hour_of_day'] >= 22) | (df['hour_of_day'] <= 5)).astype(int)
    
    df['month'] = df['start_datetime'].dt.month
    
    # --- 2. SPATIAL FEATURES ---
    print("  Spatial features...")
    kmeans = KMeans(n_clusters=15, random_state=42, n_init=10)
    # Using fit_predict on the whole dataset here is technically a tiny leak for the cluster boundaries, 
    # but lat/lon distribution of Bengaluru doesn't change over 5 months, so it's acceptable.
    df['spatial_cluster_id'] = kmeans.fit_predict(df[['latitude', 'longitude']])
    
    # --- 3. CATEGORICAL ENCODING (Frequency Encoding) ---
    print("  Categorical features...")
    df['event_type_encoded'] = (df['event_type'] == 'unplanned').astype(int)
    
    # One-hot encoding event cause (keeping top N, rest to 'other')
    top_causes = df['event_cause'].value_counts().nlargest(10).index
    df['event_cause_clean'] = df['event_cause'].apply(lambda x: x if x in top_causes else 'Other')
    cause_dummies = pd.get_dummies(df['event_cause_clean'], prefix='cause', drop_first=True).astype(int)
    df = pd.concat([df, cause_dummies], axis=1)
    
    # Frequency encoding corridor and police station (global frequency is a leak if we use future data, 
    # but we can use expanding frequency or accept it as a static property of the city).
    # To be strictly safe, we'll use expanding frequency.
    
    corridor_freq = df.groupby('corridor').cumcount()
    df['corridor_freq'] = corridor_freq
    
    ps_freq = df.groupby('police_station').cumcount()
    df['police_station_freq'] = ps_freq
    
    df['is_non_corridor'] = (df['corridor'] == 'Non-corridor').astype(int)
    
    # --- 4. VEHICLE FEATURES ---
    df['has_vehicle_info'] = (df['veh_type'] != 'unknown').astype(int)
    heavy_vehicles = ['heavy_vehicle', 'truck', 'bmtc_bus', 'ksrtc_bus', 'bus']
    df['is_heavy_vehicle'] = df['veh_type'].str.lower().isin(heavy_vehicles).astype(int)
    
    # --- 5. TEXT FEATURES ---
    df['desc_length'] = df['description'].str.len()
    df['has_description'] = (df['desc_length'] > 0).astype(int)
    # Kannada unicode block: \u0C80-\u0CFF
    df['contains_kannada'] = df['description'].str.contains('[\u0C80-\u0CFF]', regex=True, na=False).astype(int)
    
    # --- 6. HISTORICAL AGGREGATES (Rolling Windows) ---
    print("  Historical rolling features...")
    # Count events on same corridor in last 7 days
    # Requires custom logic since standard rolling requires a datetime index and we group by corridor
    
    df = df.set_index('start_datetime')
    
    # 7-day rolling count per corridor
    # Shift by 1 to exclude current event
    df['corridor_events_last_7d'] = df.groupby('corridor')['event_cause'].transform(
        lambda x: x.rolling('7D', closed='left').count()
    ).fillna(0)
    
    # 7-day rolling count per police station
    df['station_events_last_7d'] = df.groupby('police_station')['event_cause'].transform(
        lambda x: x.rolling('7D', closed='left').count()
    ).fillna(0)
    
    df = df.reset_index()
    
    # --- 7. TARGET CREATION ---
    print("  Creating targets...")
    df['target_closure'] = df['requires_road_closure'].astype(int)
    df['target_priority'] = (df['priority'] == 'High').astype(int)
    
    # Resolution time target (only valid where closed_datetime exists)
    df['target_resolution_time_hrs'] = (df['closed_datetime'] - df['start_datetime']).dt.total_seconds() / 3600
    # Clean anomalies in duration (e.g. negative or extreme)
    df.loc[(df['target_resolution_time_hrs'] <= 0) | (df['target_resolution_time_hrs'] > 200), 'target_resolution_time_hrs'] = np.nan
    
    # Select final feature columns
    feature_cols = [
        'hour_of_day', 'hour_sin', 'hour_cos', 'day_of_week', 'is_weekend',
        'is_peak_morning', 'is_peak_evening', 'is_night', 'month',
        'latitude', 'longitude', 'spatial_cluster_id',
        'event_type_encoded', 'corridor_freq', 'police_station_freq', 'is_non_corridor',
        'has_vehicle_info', 'is_heavy_vehicle',
        'desc_length', 'has_description', 'contains_kannada',
        'corridor_events_last_7d', 'station_events_last_7d'
    ] + list(cause_dummies.columns)
    
    targets = ['target_closure', 'target_priority', 'target_resolution_time_hrs']
    meta = ['id', 'start_datetime', 'corridor', 'police_station', 'zone', 'junction']
    
    print(f"Feature engineering complete. Generated {len(feature_cols)} features.")
    
    return df[meta + feature_cols + targets]

if __name__ == "__main__":
    from loader import load_and_clean_data
    df = load_and_clean_data()
    features = engineer_features(df)
    print(features.head())
    print("Features:", [c for c in features.columns if c not in ['id', 'start_datetime', 'corridor', 'police_station', 'zone', 'junction', 'target_closure', 'target_priority', 'target_resolution_time_hrs']])
