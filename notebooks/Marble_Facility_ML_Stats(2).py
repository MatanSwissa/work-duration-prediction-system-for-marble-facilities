import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.cm as cm

# -------------------------------------------------
# Meter grid from real data
# -------------------------------------------------
meter_grid = np.linspace(df["Meters"].min(), 20, 50)

# -------------------------------------------------
# Safe job builder
# -------------------------------------------------
def build_job_df(meters, base_job):
    row = {"Meters": meters, **base_job}
    for col in interaction_features:
        mat = col.replace("Meters_S_", "Material_")
        row[col] = meters * row.get(mat, 0)
    return pd.DataFrame([row])

# -------------------------------------------------
# Actual mean by meter
# -------------------------------------------------
def actual_mean_by_meter(stage, meter_grid, max_window=3.0):
    means = []
    for m in meter_grid:
        val = np.nan
        for w in np.linspace(0.5, max_window, 6):
            mask = (df["Meters"] >= m - w) & (df["Meters"] <= m + w)
            vals = df.loc[mask, stage].dropna()
            if len(vals) > 0:
                val = vals.mean()
                break
        means.append(val)
    return np.array(means)

# -------------------------------------------------
# RMS error by meter
# -------------------------------------------------
def rmse_by_meter(stage, meter_grid, model, feats, base_job, max_window=3.0):
    rmses = []
    for m in meter_grid:
        rmse_val = np.nan
        for w in np.linspace(0.5, max_window, 6):
            mask = (df["Meters"] >= m - w) & (df["Meters"] <= m + w)
            vals = df.loc[mask, stage].dropna()
            if len(vals) >= 2:
                preds = []
                for mm in df.loc[mask, "Meters"]:
                    job = build_job_df(mm, base_job)
                    preds.append(model.predict(job[feats])[0])
                rmse_val = np.sqrt(np.mean((vals.values - np.array(preds)) ** 2))
                break
        rmses.append(rmse_val)
    return np.array(rmses)

# -------------------------------------------------
# Materials to plot
# -------------------------------------------------
materials = {
    "Quartz": {
        "Material_Quartz": 1,
        "Material_Porcelain": 0,
        "Material_NaturalStone": 0,
        "Material_Ceramics": 0,
        "CNC": 1,
        "Waterjet": 1
    },
    "Porcelain": {
        "Material_Quartz": 0,
        "Material_Porcelain": 1,
        "Material_NaturalStone": 0,
        "Material_Ceramics": 0,
        "CNC": 1,
        "Waterjet": 1
    }
}

def print_sigma_extremes(meter_grid, sigma, label, min_meter=3.0): #Above 3 meter = kitchen & major marble works
    meter_grid = np.array(meter_grid)
    sigma = np.array(sigma)

    # Filter: only meters >= min_meter
    valid = (~np.isnan(sigma)) & (meter_grid >= min_meter)

    if valid.sum() == 0:
        print(f"{label}: no valid sigma values above {min_meter} m")
        return

    filt_sigma = sigma[valid]
    filt_meter = meter_grid[valid]

    min_idx = np.argmin(filt_sigma)
    max_idx = np.argmax(filt_sigma)

    print(f"\n{label} (meters ≥ {min_meter} m)")
    print(f"  Min Sigma(RMS error): {filt_sigma[min_idx]:.2f} h at {filt_meter[min_idx]:.2f} m")
    print(f"  Max Sigma(RMS error): {filt_sigma[max_idx]:.2f} h at {filt_meter[max_idx]:.2f} m")

# -------------------------------------------------
# Color palette
# -------------------------------------------------
colors = cm.Set2.colors

for material_name, BASE_JOB in materials.items():

    print(f"\n==============================")
    print(f"Material: {material_name}")
    print(f"==============================")

    plt.figure(figsize=(14, 9))

    total_pred = np.zeros(len(meter_grid))
    total_actual = np.zeros(len(meter_grid))
    total_rmse_sq = np.zeros(len(meter_grid))

    stage_rmse_store = {}

    for i, stage in enumerate(ml_models.keys()):
        model = ml_models[stage]
        feats = ml_stage_features[stage]
        color = colors[i % len(colors)]

        # -----------------------------
        # Prediction
        # -----------------------------
        preds = []
        for m in meter_grid:
            job = build_job_df(m, BASE_JOB)
            preds.append(model.predict(job[feats])[0])
        preds = np.array(preds)

        # -----------------------------
        # Actual + RMS error
        # -----------------------------
        actual = actual_mean_by_meter(stage, meter_grid)
        rmse = rmse_by_meter(stage, meter_grid, model, feats, BASE_JOB)

        stage_rmse_store[stage] = rmse

        total_pred += preds
        total_actual += np.nan_to_num(actual)
        total_rmse_sq += np.nan_to_num(rmse) ** 2

        # -----------------------------
        # Plot stage
        # -----------------------------
        plt.plot(
            meter_grid, preds,
            color=color, linewidth=2.5,
            label=f"{stage} – predicted"
        )
        plt.plot(
            meter_grid, actual,
            color=color, linestyle="--",
            alpha=0.8,
            label=f"{stage} – actual"
        )
        plt.fill_between(
            meter_grid,
            preds - rmse,
            preds + rmse,
            color=color,
            alpha=0.15
        )

    # -------------------------------------------------
    # TOTAL
    # -------------------------------------------------
    for s in stat_stages:
        total_pred += stat_models[s]
        total_actual += stat_models[s]

    total_rmse = np.sqrt(total_rmse_sq)

    plt.plot(
        meter_grid, total_pred,
        color="black", linewidth=3.5,
        label="TOTAL – predicted"
    )
    plt.plot(
        meter_grid, total_actual,
        color="black", linestyle="--",
        alpha=0.9,
        label="TOTAL – actual"
    )
    plt.fill_between(
        meter_grid,
        total_pred - total_rmse,
        total_pred + total_rmse,
        color="gray",
        alpha=0.25
    )

    # -------------------------------------------------
    # PRINT SIGMA (RMS error per meter)
    # -------------------------------------------------
    print("\n--- Stage RMS errors ---")
    for stage, rmse in stage_rmse_store.items():
        print_sigma_extremes(meter_grid, rmse, stage)

    print("\n--- TOTAL RMS error ---")
    print_sigma_extremes(meter_grid, total_rmse, "TOTAL")

    # -------------------------------------------------
    # FINAL DECORATION
    # -------------------------------------------------
    plt.xlabel("Meters of Work [m]")
    plt.ylabel("Duration [Hours]")
    plt.title(f"Stage & Total Duration vs Meters — {material_name}")
    plt.legend(ncol=2)
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.show()