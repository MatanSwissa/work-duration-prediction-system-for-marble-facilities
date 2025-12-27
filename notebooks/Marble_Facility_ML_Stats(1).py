# =========================================================
# AUTH & IMPORTS
# =========================================================
from google.colab import auth
auth.authenticate_user()

import gspread
from google.auth import default
import pandas as pd
import numpy as np

from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import cross_val_predict
from sklearn.metrics import mean_squared_error

# =========================================================
# LOAD DATA
# =========================================================
creds, _ = default()
gc = gspread.authorize(creds)

spreadsheet = gc.open_by_url(
    "INSERT_GOOGLE_SHEET_URL_HERE"
    )
sheet = spreadsheet.worksheet("Stage Deltas")
df = pd.DataFrame(sheet.get_all_records())

# =========================================================
# CLEAN DATA
# =========================================================
df = df.replace("-", pd.NA)

df["Meters"] = pd.to_numeric(df["Meters"], errors="coerce")
df = df.dropna(subset=["Meters"])

df["Material"] = df["Material"].astype(str).str.lower()

df["Material_Quartz"] = df["Material"].str.contains("quartz", na=False).astype(int)
df["Material_Porcelain"] = df["Material"].str.contains("porcelain", na=False).astype(int)
df["Material_NaturalStone"] = df["Material"].str.contains("natural|stone", na=False).astype(int)
df["Material_Ceramics"] = df["Material"].str.contains("ceramic", na=False).astype(int)

def yes_no(col):
    return col.astype(str).str.lower().map({"yes":1,"no":0}).fillna(0).astype(int)

df["CNC"] = yes_no(df["CNC"])
df["Waterjet"] = yes_no(df["Waterjet"])

stages = [
    "Measurements",
    "CAD",
    "Installation+Feedback",
    "CNC_Duration",
    "Waterjet_Duration",
    "Supplementary"
]

for s in stages:
    df[s] = pd.to_numeric(df[s], errors="coerce")

df = df[~df[stages].gt(24).any(axis=1)] # Remove outliers (data errors)

# =========================================================
# FEATURE ENGINEERING
# =========================================================
df["Meters_S_Quartz"] = df["Meters"] * df["Material_Quartz"]
df["Meters_S_Porcelain"] = df["Meters"] * df["Material_Porcelain"]
df["Meters_S_NaturalStone"] = df["Meters"] * df["Material_NaturalStone"]
df["Meters_S_Ceramics"] = df["Meters"] * df["Material_Ceramics"]

material_features = [
    "Material_Quartz",
    "Material_Porcelain",
    "Material_NaturalStone",
    "Material_Ceramics"
]

interaction_features = [
    "Meters_S_Quartz",
    "Meters_S_Porcelain",
    "Meters_S_NaturalStone",
    "Meters_S_Ceramics"
]

# =========================================================
# STATISTICAL STAGES
# =========================================================
stat_stages = ["Measurements", "Installation+Feedback"]

stat_models = {}
for stage in stat_stages:
    stat_models[stage] = df[stage].median()

# =========================================================
# ML STAGES
# =========================================================
ml_stage_features = {
    "CAD": ["Meters"] + material_features,
    "CNC_Duration": ["Meters"] + material_features + interaction_features,
    "Waterjet_Duration": ["Meters"] + material_features + interaction_features,
    "Supplementary": ["Meters"] + material_features + ["CNC", "Waterjet"]
}

ml_models = {}
ml_rmse = {}

for stage, feats in ml_stage_features.items():
    X = df[feats]
    y = df[stage].fillna(0)

    model = RandomForestRegressor(
        n_estimators=400,
        max_depth=12,
        min_samples_leaf=3,
        random_state=42
    )

    y_pred_cv = cross_val_predict(model, X, y, cv=5)
    rmse = np.sqrt(mean_squared_error(y, y_pred_cv))

    model.fit(X, y)

    ml_models[stage] = model
    ml_rmse[stage] = rmse

# =========================================================
# PRINT RMS Error
# =========================================================
print("\nRMS error per ML stage (hours):")
for k, v in ml_rmse.items():
    print(f"{k:18s}: {v:.2f}")

print("\nAverage ML RMS error:", round(np.mean(list(ml_rmse.values())), 2))

# =========================================================
# PREDICT NEW JOB
# =========================================================
new_job = pd.DataFrame([{
    "Meters": 10,
    "Material_Quartz": 1,
    "Material_Porcelain": 0,
    "Material_NaturalStone": 0,
    "Material_Ceramics": 0,
    "CNC": 1,
    "Waterjet": 1
}])

for col in interaction_features:
    mat = col.replace("Meters_S_", "Material_")
    new_job[col] = new_job["Meters"] * new_job[mat]

# =========================================================
# FINAL PREDICTION
# =========================================================
predicted = {}

# Statistical predictions
for stage in stat_stages:
    predicted[stage] = stat_models[stage]

# ML predictions
for stage, model in ml_models.items():
    feats = ml_stage_features[stage]
    predicted[stage] = model.predict(new_job[feats])[0]

total_duration = sum(predicted.values())

print("\nPredicted duration per stage (hours):")
for k, v in predicted.items():
    print(f"{k:18s}: {v:.2f}")

print("\nTOTAL PREDICTED DURATION (hours):", round(total_duration, 2))