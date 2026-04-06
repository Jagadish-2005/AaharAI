# Technical Audit Report: AI Integration Readiness

## 1. Database Schema Deep-Dive
**Target:** `backend/data/aahar.db`

### Table Row Counts
| Table Name | Row Count |
|---|---|
| distributions | 1006 |
| ai_alerts | 716 |
| beneficiary_monthly_status | 650 |
| demand_predictions | 516 |
| beneficiaries | 200 |
| vendor_stock | 25 |
| otps | 14 |
| entitlement_rules | 13 |
| grievances | 6 |
| commodities | 5 |
| vendors | 5 |
| admins | 2 |

### Schema Observations (Timestamp/Creation tracking)
- **`distributions`** (transactions): Contains `distributed_at DATETIME DEFAULT CURRENT_TIMESTAMP`, `month`, and `year`.
- **`grievances`**: Contains `created_at DATETIME DEFAULT CURRENT_TIMESTAMP`.
- **`ai_alerts`**: Contains `created_at DATETIME DEFAULT CURRENT_TIMESTAMP` and `resolved_at DATETIME`.
- **Other Tables**: `vendor_stock` tracks updates via `updated_at`, while `beneficiaries`, `vendors`, `admins`, `demand_predictions`, and `otps` generally have `created_at`.
*Note: There is no strict "orders" table, but `distributions` fulfills this transactional role.*

## 2. Backend Architecture Audit
**API Structure (from `backend/src/server.js`):**
- `/api/auth`
- `/api/webhooks`
- `/api/vendors`
- `/api/beneficiaries`
- `/api/distribution`
- `/api/analytics`
- `/api/alerts`
- `/api/grievances`

**Grievances & Alerts Origin:**
- **Alerts** are currently written to the database under `/api/alerts/run-detection` passing through `runAnomalyDetection()` in `backend/src/services/ai.js`. Currently, anomaly detection is hard-coded using programmatic rules (e.g., duplicate distributions, stock discrepancies).
- **Grievances** mostly export HTTP GET routes (`/api/grievances` and `/api/grievances/mine`). The data is mostly likely pre-seeded (via `db/seed.js`) or inserted through unimplemented/hidden interfaces.

## 3. Frontend Display Mapping
The frontend is split into two React applications. Based on an audit of their core dashboard views:

- **Admin Dashboard (`admin-dashboard/src/pages/DashboardPage.jsx`)**: Contains a "Distribution Trend (6 months)" Area Chart and a "Stock Utilization" Bar Chart. This is the optimal place to inject XGBoost predictions and Isolation Forest anomaly boundaries.
- **Vendor App (`vendor-app/src/pages/DashboardPage.jsx`)**: Contains a "Stock Overview" grid with progress bars demonstrating distributed vs allocated stock.

## 4. Environment Check
Both Python and package managers are present on the system.
- **Python Version**: Python 3.14.3
- **Pip Version**: pip 25.3

## 5. Integration Data Points for Training

### Available Data Points
- **XGBoost Demand Predictor:** 
  The `distributions` table gives us historical `quantity` segmented by `commodity_id`, `vendor_id`, `month` and `year`. This time-series dataset (1006 historical distributions) is highly suitable for forecasting required `vendor_stock` allocations.
  *Target Variable:* Aggregate quantity demanded per commodity/month.
- **Isolation Forest Anomaly Detector:**
  The `vendor_stock` (discrepancy between allocated, actual distributed, and remaining stock) crossed with the user-level velocity in `distributions` (spikes of distributions clustered around specific `distributed_at` timestamps) are powerful features for unsupervised anomaly detection.

### Recommended API Host for AI Routes
The best place to inject the new ML hooks is **`backend/src/routes/alerts.js`** and **`backend/src/routes/analytics.js`** moving forward. We can upgrade the existing `run-detection` and `predict-demand` endpoints to invoke actual Python models (possibly using a python child-process integration) rather than relying on the hard-coded baseline JS logic found in `backend/src/services/ai.js`.
