import pandas as pd
import numpy as np
from sklearn.neighbors import KNeighborsClassifier
from scipy.spatial.distance import cdist
import os

# Dataset path
DATASET_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
    "Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv"
)

def haversine(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees) in km
    """
    # convert decimal degrees to radians 
    lon1, lat1, lon2, lat2 = map(np.radians, [lon1, lat1, lon2, lat2])

    # haversine formula 
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    c = 2 * np.arcsin(np.sqrt(a)) 
    r = 6371 # Radius of earth in kilometers. Use 3956 for miles
    return c * r

def load_and_clean_data(filepath=DATASET_PATH):
    print("Loading raw data...")
    df = pd.read_csv(filepath)
    
    # 1. Parse timestamps
    print("Parsing timestamps...")
    time_cols = ['start_datetime', 'end_datetime', 'closed_datetime', 'resolved_datetime']
    for col in time_cols:
        df[col] = pd.to_datetime(df[col], errors='coerce')
        
    # 2. Filter valid start_datetime (essential for forecasting)
    df = df[df['start_datetime'].notna()].copy()
    
    # 3. Handle veh_type nulls
    df['veh_type'] = df['veh_type'].fillna('unknown')
    
    # 4. Handle description nulls
    df['description'] = df['description'].fillna('')
    
    # 5. Impute zone using K-NN on lat/lon
    print("Imputing missing zones...")
    valid_zones = df[df['zone'].notna()]
    missing_zones = df[df['zone'].isna()]
    if len(missing_zones) > 0 and len(valid_zones) > 0:
        knn_zone = KNeighborsClassifier(n_neighbors=5, weights='distance')
        knn_zone.fit(valid_zones[['latitude', 'longitude']], valid_zones['zone'])
        df.loc[df['zone'].isna(), 'zone'] = knn_zone.predict(missing_zones[['latitude', 'longitude']])
    elif len(valid_zones) == 0:
        df['zone'] = 'Unknown Zone'
        
    # 6. Impute junction using K-NN on lat/lon
    print("Imputing missing junctions...")
    valid_junc = df[df['junction'].notna()]
    missing_junc = df[df['junction'].isna()]
    if len(missing_junc) > 0 and len(valid_junc) > 0:
        knn_junc = KNeighborsClassifier(n_neighbors=1, weights='distance') # Nearest neighbor
        knn_junc.fit(valid_junc[['latitude', 'longitude']], valid_junc['junction'])
        df.loc[df['junction'].isna(), 'junction'] = knn_junc.predict(missing_junc[['latitude', 'longitude']])
    elif len(valid_junc) == 0:
        df['junction'] = 'Unknown Junction'
        
    # 7. Drop highly null or administrative columns
    cols_to_drop = [
        'map_file', 'comment', 'meta_data', 
        'created_by_id', 'last_modified_by_id', 'client_id',
        'assigned_to_police_id', 'citizen_accident_id', 'closed_by_id', 'resolved_by_id',
        'cargo_material', 'reason_breakdown', 'age_of_truck', 'route_path',
        'direction', 'gba_identifier', 'kgid'
    ]
    df = df.drop(columns=[c for c in cols_to_drop if c in df.columns], errors='ignore')
    
    # Fill remaining critical NAs with unk
    df['corridor'] = df['corridor'].fillna('Non-corridor')
    df['police_station'] = df['police_station'].fillna('Unknown')
    
    # Sort chronologically
    df = df.sort_values('start_datetime').reset_index(drop=True)
    
    print(f"Data cleaning complete. Total records: {len(df)}")
    return df

if __name__ == "__main__":
    df = load_and_clean_data()
    print(df.info())
