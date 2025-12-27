# INTRO

Central Control and Work Duration Prediction System for Marble Facilities

This project was derived from a marble facility request for a work management tool that would be suitable for the factory’s needs, which are specific due to a recent transition toward automation.
To answer this need, I’ve built Marble_Facility-CCS — a Google Sheets + Apps Script–based central control system, designed specifically for marble facilities.
This system manages the full factory workflow, timestamps each work stage, and accumulates historical production data.

On top of that, the project is accompanied by Marble_Facility_ML_Stats, a Google Colab notebook used for work duration prediction, based on 1.5+ years of real factory data, using a combination of machine learning and statistical modeling.

The goal is prediction, certainty and performance - while relying on actual data collected from a working marble facility over a decent period of time, and work seasons, it will take into account the factory’s workflow and stages, materials being used, and work size in meters - to predict future work duration given work size and material.

---

 # WORKFLOW

When predicting outcomes for a marble facility, it is critical to model the actual factory workflow, which is sequential and constrained by machinery and manual processes:

1. Order Digested - Opening a new work file and starting the factory process.
2. Slab Ordered - Ordering slabs from suppliers or using existing inventory when available.
3. Measurements - On-site measurements at the customer location.
4. CAD - Programming CAD files for CNC machinery.
5. CNC - Inserting slabs into the CNC machine and applying CAD designs (when CNC is required).
6. Waterjet - Transferring work pieces to a Waterjet cutting machine for sink cuts, stove cuts, and precision operations.
7. Supplementary Work - Manual operations performed afterward, including adhesives, polishing, edge finishing, and layout preparation before installation.
8. Installation + Feedback - Quality control, transportation, and final installation at the customer site.

Each stage is timestamped and later converted into working-hour durations.

---

# MACHINE LEARNING & STATISTICAL PREDICTIONS

Predictions are created using Google Colab via the notebook: 
Marble_Facility_ML_Stats.ipynb

The notebook imports data from the “Stage Deltas” sheet in the Marble_Facility-CCS.xlsx file (once imported to Google Sheets) and predicts work duration per stage based on:
- Work size (meters)
- Material type
- CNC usage
- Waterjet usage

Modeling Approach:
1. Random Forest Regressor (ML) - is used for stages that scale with complexity and automation:
- CAD
- CNC Duration
- Waterjet Duration
- Supplementary Work

2. Statistical Median Models are used for stages that are less dependent on work size:
- Measurements
- Installation + Feedback

Total job duration is computed as the sum of stage-level predictions.

Error & Uncertainty:
- Prediction error is measured using RMS error
- RMS is further translated into sigma bands, meter-dependent, reflecting higher uncertainty where real data is sparse or highly variable

---

# ASSUMPTIONS

1. Work Size Threshold
I’ve found that it is better to focus predictions on works of 1 meter and above.

(< 1 meter) - mostly small cutting or polishing jobs, workflow is different, and time does not scale the same way.
(1–3 meters) - small custom works, high variability per meter, setup and manual work dominate.
(> 3 meters) - kitchen countertops and large installations, more stable and predictable behavior, processes are repeatable.

2. Material Complexity
Quartz and Porcelain are mainly used in the market, also natural stones and various others, but we’ll not focus on those.

- Porcelain is more brittle and delicate, it requires more careful handling, slower CNC feeds, higher risk of breakage, more supplementary work overall.
- Quartz is more forgiving, faster fabrication, lower variance.

This difference is clearly reflected in the predictions.

---

# RESULTS

Given a new work size and material, the model will provide a prediction with relevant sigma error (meter dependent RMS error).
I wanted to predict time durations for all work sizes based on past facility performance data.
*See PNG files “Quartz_ML_Predictions” and “Porcelain_ML_Predictions” for graphic representation of results based on my data.
A few things to notice:

1. Predictions can be made for all work sizes, sigma is presented for all stages of work and total work duration - my data set resulted in accuracy of: ± 8.4 - 15.4 [hours] for Quartz and ± 9.5 -14.6 [hours] for Porcelain, which is a good estimation given human and material factors, keeping in mind limited quantity of data for >10 [m] works, so within the section of roughly 3-11 [m] works - sigma is minimal and predictions improve.
2. CNC usage has the strongest effect on total duration for porcelain, while for Quartz it’s CAD and Supplementary work that dominate. Waterjet contributes less in absolute time, but adds variability due to binary usage patterns.
3. Work duration improves with size - medium sized jobs (1-3 meters) are most uncertain, and large sized jobs (>3 meters) are stable and predictable.
4. Porcelain takes longer and is riskier to fabricate at all sizes, higher durations and sigma bands, this is mainly due to CNC usage as the material requires lower feed rate and careful handling during transport.
5. Work durations start flattening at high meter counts - while material price is linear, alternatively - medium sized works require longer work durations but less material - this should be taken into account when quoting.

---

# GOOGLE COLAB NOTEBOOK FILE (Marble_Facility_ML+Stats)

Note that when loading data, you should insert your google sheet URL address in the “LOAD DATA” section of the code.
The code uses random forest regression model for prediction on data - CAD, CNC, Waterjet, and Supplementary time durations from “Stage Deltas” on your google sheet,
It also uses median statistic calculations for data - Measurements and Installation+Feedback.
The code returns time of work predictions for any given set of the following parameters:
"Meters"
"Material_Quartz"
"Material_Porcelain"
"Material_NaturalStone"
"Material_Ceramics"
"CNC"
"Waterjet"

These can be inserted into the code - running the first part of the code will output the prediction according to input.
Running the second part of the code will output graphs for predictions across all work sizes and present max/min sigma values (stages and total).
Adding more work data into your google sheet will result in improved data set into Google Colab = improved predictions.

---

# DATA SETS AND TABS - GOOGLE SHEET DOC (Marble_Facility-CCS.xlsx)

Marble_Facility-CCS.xlsx is provided as an Excel file containing multiple sheets exported from Google Sheets.

- Orders - as main, this is where each work time stamp was manually inserted during each and every work stage, and other work details.
- Stage Deltas - which accumulates time duration of each stage of the following: Order Digested, Slab Ordered, Measurements, CAD, CNC, Waterjet, Supplementary, Installation. This sheet also includes work meters, material, CNC and waterjet usage - these parameters are later transferred into Google Colab for ML and statistics predictions.
- Customers - is using API for data import the company’s customer details from your cloud-based accounting and business management platform, later to be used when entering a new work into process.
- Info - includes static parameters used throughout the document for the specific factory use.
- Other data for event logs and further automations - Shutdowns, Inventory, Slabs Prices Info, Other Prices Info.


“.gs” FILES:

- Orders.gs - handles doc timestamps between work stages, creates drop down menus, etc.
- Customers.gs - fetches customers info using API with your accounting and business management platform, this should be changed with URL address for authentication and document search, for example: “…/api/login/authenticate” and “…/api/document/search”, it usually requires client ID, password, and authentication token - according to service provider specifications. I’ve included fields such as names and address, these can be adjusted as well. Customer info can be stored and used to open new work files.
- Inventory.gs - handles inventory data, pointing to static general factory parameters that are stores in the “Info” tab.
- X_Data.gs - calculates parameters for later predictions - (meter count, material, CNC/Waterjet use).
- y_Data.gs - calculates time durations between various work stages throughout process workflow.