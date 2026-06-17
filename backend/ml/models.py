import os
import joblib
import pandas as pd
import numpy as np
import lightgbm as lgb
from sklearn.metrics import average_precision_score, f1_score, roc_auc_score, mean_absolute_error
from datetime import datetime

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")

def temporal_train_test_split(df):
    """
    Split data temporally to avoid data leakage.
    Train: Nov 2023 - Feb 2024
    Test: Mar 2024 - Apr 2024
    """
    print("Splitting data temporally...")
    cutoff_date = pd.to_datetime('2024-03-01', utc=True)
    
    train = df[df['start_datetime'] < cutoff_date].copy()
    test = df[df['start_datetime'] >= cutoff_date].copy()
    
    print(f"Train size: {len(train)} (up to {train['start_datetime'].max()})")
    print(f"Test size:  {len(test)} (from {test['start_datetime'].min()})")
    return train, test

def prepare_X_y(df, target_col):
    meta_cols = ['id', 'start_datetime', 'corridor', 'police_station', 'zone', 'junction', 
                 'target_closure', 'target_priority', 'target_resolution_time_hrs']
    
    # Drop rows where target is null
    df = df[df[target_col].notna()]
    
    X = df.drop(columns=[c for c in meta_cols if c in df.columns], errors='ignore')
    y = df[target_col]
    return X, y

def train_closure_model(train_df, test_df):
    print("\n--- Training Model 1: Road Closure (Imbalanced Classification) ---")
    X_train, y_train = prepare_X_y(train_df, 'target_closure')
    X_test, y_test = prepare_X_y(test_df, 'target_closure')
    
    # Calculate scale_pos_weight
    neg_count = (y_train == 0).sum()
    pos_count = (y_train == 1).sum()
    scale_weight = neg_count / pos_count if pos_count > 0 else 1.0
    print(f"scale_pos_weight: {scale_weight:.2f}")
    
    model = lgb.LGBMClassifier(
        objective='binary',
        scale_pos_weight=scale_weight,
        n_estimators=500,
        learning_rate=0.05,
        max_depth=6,
        num_leaves=31,
        min_child_samples=20,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
        verbose=-1
    )
    
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        eval_metric='average_precision',
        callbacks=[lgb.early_stopping(stopping_rounds=50, verbose=False)]
    )
    
    # Evaluate
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    y_pred = model.predict(X_test)
    
    pr_auc = average_precision_score(y_test, y_pred_proba)
    f1 = f1_score(y_test, y_pred)
    print(f"Test PR-AUC: {pr_auc:.4f}")
    print(f"Test F1: {f1:.4f}")
    
    # Feature importance
    importance = pd.DataFrame({'feature': X_train.columns, 'importance': model.feature_importances_})
    importance = importance.sort_values('importance', ascending=False).head(5)
    print("Top 5 Features:\n", importance)
    
    joblib.dump(model, os.path.join(ARTIFACTS_DIR, 'model_closure.pkl'))
    return model

def train_priority_model(train_df, test_df):
    print("\n--- Training Model 2: Priority (Balanced Classification) ---")
    X_train, y_train = prepare_X_y(train_df, 'target_priority')
    X_test, y_test = prepare_X_y(test_df, 'target_priority')
    
    model = lgb.LGBMClassifier(
        objective='binary',
        n_estimators=500,
        learning_rate=0.05,
        max_depth=6,
        random_state=42,
        verbose=-1
    )
    
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        eval_metric='auc',
        callbacks=[lgb.early_stopping(stopping_rounds=50, verbose=False)]
    )
    
    # Evaluate
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    y_pred = model.predict(X_test)
    
    roc_auc = roc_auc_score(y_test, y_pred_proba)
    f1 = f1_score(y_test, y_pred)
    print(f"Test ROC-AUC: {roc_auc:.4f}")
    print(f"Test F1: {f1:.4f}")
    
    joblib.dump(model, os.path.join(ARTIFACTS_DIR, 'model_priority.pkl'))
    return model

def train_resolution_model(train_df, test_df):
    print("\n--- Training Model 3: Resolution Time (Quantile Regression) ---")
    X_train, y_train = prepare_X_y(train_df, 'target_resolution_time_hrs')
    X_test, y_test = prepare_X_y(test_df, 'target_resolution_time_hrs')
    
    quantiles = [0.25, 0.5, 0.75]
    models = {}
    
    for q in quantiles:
        print(f"Training Quantile {q}...")
        model = lgb.LGBMRegressor(
            objective='quantile',
            alpha=q,
            n_estimators=500,
            learning_rate=0.05,
            max_depth=5,
            random_state=42,
            verbose=-1
        )
        
        model.fit(
            X_train, y_train,
            eval_set=[(X_test, y_test)],
            eval_metric='mae',
            callbacks=[lgb.early_stopping(stopping_rounds=50, verbose=False)]
        )
        models[f'q_{q}'] = model
        
        # Evaluate median model with MAE
        if q == 0.5:
            y_pred = model.predict(X_test)
            mae = mean_absolute_error(y_test, y_pred)
            median_abs_err = np.median(np.abs(y_test - y_pred))
            print(f"Test MAE (median): {mae:.2f} hrs")
            print(f"Test Median Abs Error: {median_abs_err:.2f} hrs")
    
    joblib.dump(models, os.path.join(ARTIFACTS_DIR, 'model_resolution.pkl'))
    return models

if __name__ == "__main__":
    from data.loader import load_and_clean_data
    from data.feature_pipeline import engineer_features
    
    df = load_and_clean_data()
    features_df = engineer_features(df)
    
    train_df, test_df = temporal_train_test_split(features_df)
    
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    
    train_closure_model(train_df, test_df)
    train_priority_model(train_df, test_df)
    train_resolution_model(train_df, test_df)
    
    print("\nModel training complete. Artifacts saved.")
