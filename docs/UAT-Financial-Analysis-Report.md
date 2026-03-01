# Romanian UAT Economics - Detailed Financial Analysis Report

## Context

This report template outlines the comprehensive financial analysis of Romanian UAT (Unități Administrativ-Teritoriale) economics to investigate budget problems during the **2026 budget public discussion period**, updated with EU macro-fiscal constraint context.

### Why UAT Economics is Politically Urgent (2026 Context)

Romania's national fiscal constraints materially change the operating environment for local budgets:

- **EU Excessive Deficit Procedure (EDP)**: Romania remains under EDP with projected deficits of 9.3% (2024), 8.4% (2025), and 6.2% (2026) of GDP
- **EU Funds Conditionality**: Under EDP, Romania faces risk of EU funds suspension if fiscal path deviations occur
- **Consolidation Cascading**: National deficit reduction creates tighter transfer envelopes, stricter spending controls, and higher pressure for local tax compliance
- **Policy Regime Changes**: VAT increases, wage/pension freeze extensions, property tax changes affecting local budgets

### Key Policy Timeline Variables

| Year | Policy Event | Local Budget Impact |
|------|--------------|---------------------|
| 2024 | First consolidation package | VAT increase from 19% to 24% |
| 2025 | Extended wage/pension freezes | Personnel cost rigidity increased |
| 2025 | Property tax reforms | Own-source revenue structure changed |
| 2026 | New EDP milestone | EU funds conditional on compliance |

**Data Sources:**

- Execuții bugetare (Budget Execution) - aggregated at principal ordonator level
- Angajamente bugetare (Budget Commitments) - commitments, payments, receipts
- Date INS (INS Statistical Data) - population, demographics, economic indicators
- **SIRUTA Register** - Administrative unit codes and hierarchy (INS open data portal)
- **RELUAT Boundary Data** - Versioned UAT geometry with legal status flags
- **EU Funds Data** - Local absorption and co-financing obligations

---

# Report Structure

## 1. Executive Summary

### 1.1 Key Findings at a Glance

## National Budget Health Overview (2025)

| Metric | National Total | National Per Capita | YoY Change |
|--------|----------------|---------------------|------------|
| Total Revenues | [amount] RON | [amount] RON | [%] |
| Total Expenses | [amount] RON | [amount] RON | [%] |
| Budget Balance | [amount] RON | [amount] RON | [%] |
| Execution Rate | [%] | - | [%] |
| UATs with Deficit | [count] ([%]) | - | [%] |
| UATs with Arrears >20% | [count] ([%]) | - | [%] |

### 1.2 Top 10 Most Problematic UATs

| Rank | UAT | County | Deficit/Capita | Arrears % | Execution Rate | Personnel % | Risk Level |
|------|-----|--------|----------------|-----------|----------------|-------------|------------|
| 1 | [name] | [county] | -[amount] RON | [%] | [%] | [%] | CRITICAL |
| 2 | [name] | [county] | -[amount] RON | [%] | [%] | [%] | CRITICAL |
| ... | ... | ... | ... | ... | ... | ... | ... |

**Calculation Pseudocode - Risk Score:**

```
# For each UAT, calculate risk score (0-100)
risk_score = 0

IF deficit_per_capita < -1000:  risk_score += 25
ELIF deficit_per_capita < -500:   risk_score += 15
ELIF deficit_per_capita < 0:      risk_score += 5

IF execution_rate < 50:           risk_score += 25
ELIF execution_rate < 70:         risk_score += 15

IF arrears_ratio > 30:            risk_score += 25
ELIF arrears_ratio > 20:          risk_score += 15

IF personnel_ratio > 70:          risk_score += 15
ELIF personnel_ratio > 60:        risk_score += 10

IF operational_ratio > 90:        risk_score += 10

RISK_LEVELS:
- 80-100: CRITICAL
- 60-79:   HIGH
- 40-59:   MEDIUM
- 20-39:   LOW
- 0-19:    MINIMAL
```

---

## 2. Methodology

### 2.1 Data Sources and Coverage

```
DATA_SOURCE_BUDGET_EXECUTION:
    endpoint: "Executie bugetara agregata la nivel de ordonator principal de credite"
    granularity: UAT (localitate), County (judet), National
    time_period: 2016-2025 (annual), with quarterly/monthly detail
    fields:
        - entity_cui: Unique identifier
        - entity_name: UAT/Institution name
        - year, quarter, month: Temporal dimensions
        - account_category: 'vn' (venituri/revenues) or 'ch' (cheltuieli/expenses)
        - functional_code: Classification by purpose (e.g., "09" = education)
        - economic_code: Classification by type (e.g., "10" = personnel)
        - amount: Absolute value in RON
        - funding_source_id: Source A-I

DATA_SOURCE_COMMITMENTS:
    endpoint: "Angajamente bugetare"
    granularity: Principal ordonator, secondary ordonator
    fields:
        - credite_angajament: Commitment credits
        - credite_bugetare: Budget credits
        - limita_credit_angajament: Commitment credit limit
        - plati_trezor: Treasury payments
        - plati_non_trezor: Non-treasury payments
        - receptii_totale: Total receipts
        - receptii_neplatite: Unpaid receipts (arrears)

DATA_SOURCE_INS:
    endpoint: INS Tempo (National Institute of Statistics)
    granularity: UAT (SIRUTA), County, National
    key_datasets:
        - POP107D: Resident population
        - POP106D: Population by age groups
        - LAB102A: Employed population
        - Other economic/demographic indicators
    linkage: siruta_code connects INS data to budget entities
```

### 2.2 Metric Definitions and Calculations

#### Core Financial Metrics

**1. Budget Deficit**

```
# Total Deficit (absolute)
deficit_total = sum(expenses) - sum(revenues)
    WHERE: year = 2025
          AND entity_type IN ('city_hall', 'county_council', 'admin_county_council')
          AND is_uat = true

# Per Capita Deficit
deficit_per_capita = deficit_total / population
    WHERE: population from INS dataset POP107D (latest year)

# Interpretation:
- Negative: Deficit (expenses > revenues)
- Positive: Surplus (revenues > expenses)
- < -500 RON/capita: Significant fiscal stress
```

**2. Execution Rate**

```
# From Commitments Data
execution_rate = (plati_trezor + plati_non_trezor) / credite_bugetare * 100

# Alternative: YTD execution
execution_rate_ytd = payments_ytd / (credite_bugetare * (current_month / 12)) * 100

# Interpretation:
- < 50%: Severe under-execution (planning or capacity failure)
- 50-70%: Under-execution (concerning)
- 70-95%: Normal range
- > 105%: Over-execution (potential bypass of procedures)
```

**3. Commitment Rate**

```
commitment_rate = credite_angajament / limita_credit_angajament * 100

# Interpretation:
- > 95%: Near-maximum commitment (limited flexibility)
- 80-95%: Normal range
- < 50%: Under-commitment (planning issue)
```

**4. Arrears Ratio**

```
arrears_ratio = receptii_neplatite / receptii_totale * 100

# Interpretation:
- > 30%: Severe cash flow problems
- 20-30%: Significant arrears (concerning)
- 10-20%: Moderate arrears
- < 10%: Normal range
```

**5. Self-Funding Ratio (Fiscal Autonomy)**

```
# Own revenues (Source B = venituri proprii)
own_revenues = sum(amount)
    WHERE: account_category = 'vn'
          AND funding_source_id = 'B'
          AND year = 2025

self_funding_ratio = own_revenues / total_expenses * 100

# Interpretation:
- > 70%: High fiscal autonomy
- 50-70%: Moderate autonomy
- 30-50%: Low autonomy (high dependence on transfers)
- < 30%: Very low autonomy (structural vulnerability)
```

**6. Personnel Cost Ratio**

```
# Personnel expenses (Economic code 10 = cheltuieli cu personalul)
personnel_expenses = sum(amount)
    WHERE: account_category = 'ch'
          AND economic_code LIKE '10%'
          AND year = 2025

personnel_ratio = personnel_expenses / total_expenses * 100

# Interpretation:
- > 70%: Severe - limits service delivery capacity
- 60-70%: High - concerning for service quality
- 50-60%: Moderate
- 40-50%: Normal range
- < 40%: Low personnel costs
```

**7. Operational vs Development Spending**

```
# Operational expenses (functionare)
operational_expenses = sum(amount)
    WHERE: account_category = 'ch'
          AND expense_type = 'functionare'
          AND year = 2025

# Development expenses (dezvoltare)
development_expenses = sum(amount)
    WHERE: account_category = 'ch'
          AND expense_type = 'dezvoltare'
          AND year = 2025

operational_ratio = operational_expenses / total_expenses * 100
development_ratio = development_expenses / total_expenses * 100

# Interpretation:
# Development ratio:
- < 10%: Severe underinvestment
- 10-15%: Low investment
- 15-25%: Moderate investment
- > 25%: High investment

# Operational ratio:
- > 90%: Structural problem - no development capacity
- > 85%: Concerning - minimal investment
- 70-85%: Normal range
```

**8. Per Capita Spending by Sector**

```
# General per capita spending
per_capita_spending = total_expenses / population

# Education per capita
education_expenses = sum(amount)
    WHERE: account_category = 'ch'
          AND functional_code LIKE '09%'  # Education sector
          AND year = 2025

per_capita_education = education_expenses / population

# Health per capita
health_expenses = sum(amount)
    WHERE: account_category = 'ch'
          AND functional_code LIKE '12%'  # Health sector
          AND year = 2025

per_capita_health = health_expenses / population

# Infrastructure per capita
infrastructure_expenses = sum(amount)
    WHERE: account_category = 'ch'
          AND functional_code IN ('05', '06')  # Transport, communications
          AND year = 2025

per_capita_infrastructure = infrastructure_expenses / population
```

---

## 3. National Overview

### 3.1 Aggregate Budget Indicators

```
# National Totals Calculation
national_revenues = sum(amount)
    WHERE: account_category = 'vn'
          AND year = 2025

national_expenses = sum(amount)
    WHERE: account_category = 'ch'
          AND year = 2025

national_balance = national_revenues - national_expenses
national_balance_per_capita = national_balance / national_population

# Execution (national)
national_execution_rate = sum(payments) / sum(credite_bugetare) * 100
    FROM: commitments data
```

### 3.2 Revenue Structure Analysis

```
# Revenues by Funding Source
FOR EACH funding_source_id IN ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']:
    revenue_by_source[source] = sum(amount)
        WHERE: account_category = 'vn'
              AND funding_source_id = source
              AND year = 2025

# Revenues by Functional Category
FOR EACH functional_prefix IN ['01', '02', ..., '68']:
    revenue_by_function[prefix] = sum(amount)
        WHERE: account_category = 'vn'
              AND functional_code LIKE prefix + '%'
              AND year = 2025

# Calculate concentration
revenue_concentration = max(revenue_by_source.values()) / national_revenues
```

**Funding Source Interpretation:**

- A: Venituri din impozite și taxe locale (Local taxes)
- B: Venituri proprii (Own revenues)
- C: Taxe și impozite compartimentate (Shared taxes)
- D: Sume defalcate din taxa pe valoarea adăugată (VAT sharing)
- E: Transferuri de la bugetul de stat (State transfers)
- F: Transferuri din fondul de rezervă (Reserve fund)
- G: Subvenții (Subsidies)
- H: Alte venituri (Other revenues)
- I: Rambursări și despăgubiri (Refunds and compensations)

### 3.3 Expense Structure Analysis

```
# Expenses by Economic Category
FOR EACH economic_prefix IN ['10', '20', '30', '40', '50', '60']:
    expenses_by_economic[prefix] = sum(amount)
        WHERE: account_category = 'ch'
              AND economic_code LIKE prefix + '%'
              AND year = 2025

# Economic Code Categories:
# 10: Cheltuieli cu personalul (Personnel)
# 20: Bunuri și servicii (Goods and services)
# 30: Subvenții (Subsidies)
# 40: Transferuri (Transfers)
# 50: Dobânzi (Interest)
# 60: Alte cheltuieli (Other expenses)

# Expenses by Functional Category
FOR EACH functional_prefix IN ['01', '05', '06', '09', '12', ..., '68']:
    expenses_by_function[prefix] = sum(amount)
        WHERE: account_category = 'ch'
              AND functional_code LIKE prefix + '%'
              AND year = 2025
```

### 3.4 Year-over-Year Trend Analysis

```
# For years 2020-2025
FOR EACH year IN [2020, 2021, 2022, 2023, 2024, 2025]:
    revenues_by_year[year] = sum(amount)
        WHERE: account_category = 'vn' AND year = year
    expenses_by_year[year] = sum(amount)
        WHERE: account_category = 'ch' AND year = year

# Calculate growth rates
yoy_revenue_growth[year] = (revenues_by_year[year] - revenues_by_year[year-1])
                           / revenues_by_year[year-1] * 100

yoy_expense_growth[year] = (expenses_by_year[year] - expenses_by_year[year-1])
                           / expenses_by_year[year-1] * 100

# Calculate volatility
revenue_volatility = STDEV(revenues_by_year) / MEAN(revenues_by_year) * 100
```

---

## 4. County-by-County Analysis

### 4.1 County Aggregation Method

```
# For each county in Romania's 41 counties + Bucharest
FOR EACH county_code IN ['AB', 'AR', ..., 'B']:

    # Aggregate all UATs in county
    county_revenues[county] = sum(amount)
        WHERE: county_code = county_code
              AND account_category = 'vn'
              AND year = 2025
              AND is_uat = true

    county_expenses[county] = sum(amount)
        WHERE: county_code = county_code
              AND account_category = 'ch'
              AND year = 2025
              AND is_uat = true

    county_deficit[county] = county_expenses[county] - county_revenues[county]

    county_population[county] = sum(population)
        WHERE: county_code = county_code
        FROM: INS data

    county_deficit_per_capita[county] = county_deficit[county] / county_population[county]

    # Count problematic UATs
    county_uat_count[county] = COUNT(DISTINCT uat_id)
        WHERE: county_code = county_code

    county_deficit_uat_count[county] = COUNT(DISTINCT uat_id)
        WHERE: county_code = county_code
              AND (expenses - revenues) < 0
```

### 4.2 County Benchmarking

```
# Calculate county medians for comparison
county_median_per_capita = MEDIAN(county_deficit_per_capita.values())
county_median_execution = MEDIAN(county_execution_rate.values())
county_median_personnel = MEDIAN(county_personnel_ratio.values())

# For each UAT, calculate deviation from county median
FOR EACH uat:
    uat_county = uat.county_code

    deviation_from_median = (uat.value - county_median[uat_county])
                           / county_median[uat_county] * 100

    # Flag if deviation > 50%
    IF ABS(deviation_from_median) > 50:
        flag_uat_as_outlier(uat)
```

### 4.3 County Risk Classification

```
# County-level risk score
FOR EACH county:
    county_risk_score = 0

    # Percentage of UATs in deficit
    deficit_uat_pct = county_deficit_uat_count[county] / county_uat_count[county] * 100
    IF deficit_uat_pct > 70:      county_risk_score += 30
    ELIF deficit_uat_pct > 50:    county_risk_score += 20
    ELIF deficit_uat_pct > 30:    county_risk_score += 10

    # County-level deficit per capita
    IF county_deficit_per_capita[county] < -1000:  county_risk_score += 30
    ELIF county_deficit_per_capita[county] < -500: county_risk_score += 20

    # Average execution rate
    IF county_avg_execution[county] < 60:  county_risk_score += 20
    ELIF county_avg_execution[county] < 70: county_risk_score += 10

    # Average arrears
    IF county_avg_arrears[county] > 25:    county_risk_score += 20

COUNTY_RISK_LEVELS:
- 80-100: CRITICAL (needs immediate intervention)
- 60-79:   HIGH
- 40-59:   MEDIUM
- 20-39:   LOW
- 0-19:    MINIMAL
```

### 4.4 County Summary Table Template

| County | UATs | Deficit UATs % | Deficit/Capita | Avg Execution | Avg Personnel | Avg Arrears | Risk Level |
|--------|------|----------------|----------------|---------------|---------------|-------------|------------|
| Alba | 78 | 45% | -234 RON | 78% | 52% | 12% | MEDIUM |
| Arad | 77 | 38% | -189 RON | 82% | 48% | 8% | LOW |
| ... | ... | ... | ... | ... | ... | ... | ... |

---

## 5. Deep Dive: Problematic UATs

### 5.1 UAT Selection Criteria (Filtering Logic)

```
# Identify UATs meeting ANY of these criteria:
problem_uats = []

FOR EACH uat IN all_uats:
    red_flags = []

    # Criteria 1: Severe deficit per capita
    deficit_pc = (expenses - revenues) / population
    IF deficit_pc < -1000:
        red_flags.append("SEVERE_DEFICIT")

    # Criteria 2: High arrears
    arrears = receptii_neplatite / receptii_totale * 100
    IF arrears > 30:
        red_flags.append("HIGH_ARREARS")

    # Criteria 3: Low execution
    execution = payments / credite_bugetare * 100
    IF execution < 50:
        red_flags.append("SEVERE_UNDER_EXECUTION")

    # Criteria 4: Personnel overload
    personnel_pct = personnel_expenses / total_expenses * 100
    IF personnel_pct > 70:
        red_flags.append("PERSONNEL_OVERLOAD")

    # Criteria 5: No development spending
    dev_pct = development_expenses / total_expenses * 100
    IF dev_pct < 5:
        red_flags.append("NO_INVESTMENT")

    # Criteria 6: Low fiscal autonomy
    own_revenue_pct = own_revenues / total_expenses * 100
    IF own_revenue_pct < 20:
        red_flags.append("LOW_AUTONOMY")

    IF len(red_flags) >= 3:
        problem_uats.append({
            'uat': uat,
            'flags': red_flags,
            'risk_score': calculate_risk_score(uat)
        })

# Sort by risk score (highest first)
problem_uats.sort(key='risk_score', reverse=True)
```

### 5.2 Individual UAT Analysis Template

## [UAT Name], [County]

### Financial Health Dashboard

| Metric | Value | County Median | National Median | Status |
|--------|-------|---------------|-----------------|--------|
| Population | [number] | - | - | - |
| Total Revenues | [amount] RON | [amount] RON | [amount] RON | - |
| Total Expenses | [amount] RON | [amount] RON | [amount] RON | - |
| Budget Balance | [amount] RON | [amount] RON | [amount] RON | ⚠️ DEFICIT |
| Per Capita Balance | [amount] RON | [amount] RON | [amount] RON | 🔴 CRITICAL |
| Execution Rate | [%] | [%] | [%] | ⚠️ |
| Arrears Ratio | [%] | [%] | [%] | 🔴 |
| Personnel Ratio | [%] | [%] | [%] | ⚠️ |
| Development Ratio | [%] | [%] | [%] | 🔴 |
| Self-Funding Ratio | [%] | [%] | [%] | ⚠️ |

### Red Flags Identified

- [🔴] Severe deficit per capita (< -500 RON)
- [🔴] High arrears (> 20%)
- [⚠️] Personnel costs exceed 60%
- [⚠️] Development spending below 10%
- [⚠️] Low fiscal autonomy (< 30%)
- [🔴] Execution rate below 70%

### 5-Year Trend Analysis

**5-Year Trend Calculation:**

```
# For years 2021-2025
FOR year IN [2021, 2022, 2023, 2024, 2025]:
    uat_revenues[year] = sum(amount)
        WHERE: uat_id = [target_uat]
              AND account_category = 'vn'
              AND year = year

    uat_expenses[year] = sum(amount)
        WHERE: uat_id = [target_uat]
              AND account_category = 'ch'
              AND year = year

    uat_balance[year] = uat_revenues[year] - uat_expenses[year]

# Calculate CAGR (Compound Annual Growth Rate)
cagr_revenues = (uat_revenues[2025] / uat_revenues[2021]) ^ (1/4) - 1
cagr_expenses = (uat_expenses[2025] / uat_expenses[2021]) ^ (1/4) - 1

# Trend classification
IF cagr_revenues < -0.05 AND cagr_expenses > 0.05:
    trend = "DETERIORATING" (revenues declining, expenses growing)
ELIF uat_balance[2025] < uat_balance[2024] < uat_balance[2023]:
    trend = "ACCELERATING_DEFICIT"
ELIF uat_balance[2025] > uat_balance[2024]:
    trend = "IMPROVING"
ELSE:
    trend = "STABLE"
```

### 5.3 Peer Group Comparison

```
# Define peer groups by population
PEER_GROUPS = {
    'small': (0, 5000),      # Communes
    'medium': (5000, 20000), # Towns
    'large': (20000, 100000), # Cities
    'very_large': (100000, infinity) # Municipalities
}

FOR target_uat IN problem_uats:
    peer_group = determine_peer_group(target_uat.population)

    # Get peer statistics
    peer_median_revenues = MEDIAN(uat_revenues)
        WHERE: population IN PEER_GROUPS[peer_group]
              AND year = 2025

    peer_median_expenses = MEDIAN(uat_expenses)
        WHERE: population IN PEER_GROUPS[peer_group]
              AND year = 2025

    # Calculate percentile rank
    uat_percentile = PERCENTILE_RANK(target_uat.metric, all_peers.metric)
```

---

## 6. Sector-Specific Analysis

### 6.1 Education Sector Analysis

```
# Education Functional Codes: 09 (Învățământ)

# Total education spending by UAT
FOR EACH uat:
    education_expenses = sum(amount)
        WHERE: functional_code LIKE '09%'
              AND account_category = 'ch'
              AND uat_id = uat.id
              AND year = 2025

    # Sub-categories:
    education_preprimary = sum(amount)
        WHERE: functional_code LIKE '09.01%'  # Pre-primary

    education_primary = sum(amount)
        WHERE: functional_code LIKE '09.02%'  # Primary

    education_secondary = sum(amount)
        WHERE: functional_code LIKE '09.03%'  # Secondary

    education_tertiary = sum(amount)
        WHERE: functional_code LIKE '09.04%'  # Tertiary

    education_vocational = sum(amount)
        WHERE: functional_code LIKE '09.05%'  # Vocational

# Calculate per-student spending (if school population data available)
per_student_spending = education_expenses / school_age_population
    FROM: INS data (population by age groups 5-18)

# Flag UATs with low education investment
IF per_student_spending < (national_median * 0.5):
    flag_as "LOW_EDUCATION_SPENDING"
```

**Education Spending Template:**

### Education Sector Analysis

| County | UATs with Lowest Spending | Per-Student Spending | National Median | Deviation |
|--------|---------------------------|----------------------|-----------------|-----------|
| [County] | [UAT Name] | [amount] RON | [amount] RON | [%] |

### 6.2 Health Sector Analysis

```
# Health Functional Codes: 12 (Sănătate)

FOR EACH uat:
    health_expenses = sum(amount)
        WHERE: functional_code LIKE '12%'
              AND account_category = 'ch'
              AND uat_id = uat.id
              AND year = 2025

    # Sub-categories:
    health_hospitals = sum(amount)
        WHERE: functional_code LIKE '12.01%'  # Hospital care

    health_primary_care = sum(amount)
        WHERE: functional_code LIKE '12.02%'  # Primary care

    health_preventive = sum(amount)
        WHERE: functional_code LIKE '12.03%'  # Preventive care

# Per elderly population spending (65+)
elderly_population = INS_POPULATION_WHERE(age_group = '65+')
per_elderly_spending = health_expenses / elderly_population

# Per capita health spending
per_capita_health = health_expenses / total_population
```

### 6.3 Infrastructure Investment Analysis

```
# Infrastructure Functional Codes: 05 (Transporturi), 06 (Locuințe)

FOR EACH uat:
    infrastructure_expenses = sum(amount)
        WHERE: functional_code IN ('05%', '06%')
              AND expense_type = 'dezvoltare'  # Development expenses only
              AND account_category = 'ch'
              AND uat_id = uat.id
              AND year = 2025

    # Calculate infrastructure intensity
    infrastructure_per_capita = infrastructure_expenses / population
    infrastructure_per_km2 = infrastructure_expenses / area_km2

# Identify underinvestment
IF infrastructure_per_capita < (national_median * 0.3):
    flag_as "SEVERE_UNDERINVESTMENT"
ELIF infrastructure_per_capita < (national_median * 0.5):
    flag_as "LOW_INVESTMENT"
```

### 6.4 Public Administration Overhead

```
# Public Administration: 01 (Autorități publice)

FOR EACH uat:
    admin_expenses = sum(amount)
        WHERE: functional_code LIKE '01%'
              AND account_category = 'ch'
              AND uat_id = uat.id
              AND year = 2025

    admin_overhead_ratio = admin_expenses / total_expenses * 100

# High administrative overhead indicates inefficient structure
IF admin_overhead_ratio > 30:
    flag_as "HIGH_ADMIN_OVERHEAD"
```

---

## 7. Statistical Outlier Detection

### 7.1 Z-Score Analysis

```
# For each metric, calculate z-scores
FOR metric IN ['deficit_per_capita', 'execution_rate', 'personnel_ratio', 'arrears_ratio']:

    metric_mean = MEAN(all_uats[metric])
    metric_stddev = STDEV(all_uats[metric])

    FOR EACH uat:
        uat.z_score[metric] = (uat[metric] - metric_mean) / metric_stddev

# Flag outliers
IF ABS(uat.z_score[metric]) > 2:
    uat.outlier_flags.append(f"{metric}_OUTLIER")
IF ABS(uat.z_score[metric]) > 3:
    uat.outlier_flags.append(f"{metric}_EXTREME_OUTLIER")
```

### 7.2 Interquartile Range (IQR) Method

```
# More robust for non-normal distributions
FOR metric IN metrics:

    q1 = PERCENTILE(all_uats[metric], 25)
    q3 = PERCENTILE(all_uats[metric], 75)
    iqr = q3 - q1

    lower_bound = q1 - (1.5 * iqr)
    upper_bound = q3 + (1.5 * iqr)

    FOR EACH uat:
        IF uat[metric] < lower_bound OR uat[metric] > upper_bound:
            uat.outlier_flags.append(f"{metric}_IQR_OUTLIER")
```

### 7.3 MAD (Median Absolute Deviation)

```
# Most robust outlier detection
FOR metric IN metrics:

    median = MEDIAN(all_uats[metric])
    absolute_deviations = ABS(all_uats[metric] - median)
    mad = MEDIAN(absolute_deviations)

    # Robust z-score
    FOR EACH uat:
        robust_z = 0.6745 * (uat[metric] - median) / mad
        IF ABS(robust_z) > 3.5:
            uat.outlier_flags.append(f"{metric}_MAD_OUTLIER")
```

---

## 8. Commitment Pipeline Analysis

### 8.1 Cash Flow Stress Indicators

```
# Commitment Pipeline Metrics
FOR EACH uat:

    # 1. Commitment Utilization
    commitment_utilization = credite_angajament / limita_credit_angajament * 100
    IF commitment_utilization > 95:
        flag_as "OVER_COMMITTED"

    # 2. Payment Gap
    payment_gap = credite_angajament - (plati_trezor + plati_non_trezor)
    payment_gap_ratio = payment_gap / credite_angajament * 100
    IF payment_gap_ratio > 30:
        flag_as "HIGH_PAYMENT_GAP"

    # 3. Arrears Accumulation Trend
    arrears_trend = (receptii_neplatite[current_year]
                     - receptii_neplatite[previous_year])
                    / receptii_neplatite[previous_year] * 100
    IF arrears_trend > 20:
        flag_as "ACCELERATING_ARREARS"

    # 4. Cash Flow Health Index
    cash_flow_index = (plati_trezor + plati_non_trezor)
                     / (credite_angajament + receptii_neplatite) * 100
    IF cash_flow_index < 70:
        flag_as "CASH_FLOW_STRESS"
```

### 8.2 Budget Realism Assessment

```
# Compare budgeted vs actual over time
FOR EACH uat:
    FOR year IN [2023, 2024, 2025]:

        budgeted = credite_bugetare[year]
        actual = plati_trezor[year] + plati_non_trezor[year]
        variance = (actual - budgeted) / budgeted * 100

        IF ABS(variance) > 20:
            unrealistic_budget_count += 1

    IF unrealistic_budget_count >= 2:
        flag_as "UNREALISTIC_BUDGETING"
```

---

## 9. Time Series and Trend Analysis

### 9.1 Multi-Year Trend Calculation

```
# 5-Year Trend Analysis (2021-2025)
FOR EACH uat:

    # Collect yearly data
    yearly_data = []
    FOR year IN [2021, 2022, 2023, 2024, 2025]:
        yearly_data.append({
            'year': year,
            'revenues': sum_revenues(uat, year),
            'expenses': sum_expenses(uat, year),
            'balance': sum_revenues(uat, year) - sum_expenses(uat, year)
        })

    # Calculate trend line slope (linear regression)
    x = [d['year'] for d in yearly_data]
    y_balance = [d['balance'] for d in yearly_data]

    # Simple linear regression
    n = len(x)
    slope_balance = (n*SUM(x*y_balance) - SUM(x)*SUM(y_balance))
                   / (n*SUM(x^2) - (SUM(x))^2)

    # Classify trend
    IF slope_balance < -100000:  # Deteriorating by >100K RON/year
        trend = "RAPID_DETERIORATION"
    ELIF slope_balance < 0:
        trend = "DETERIORATION"
    ELIF slope_balance < 100000:
        trend = "STABLE"
    ELSE:
        trend = "IMPROVEMENT"
```

### 9.2 Structural Change Detection

```
# Detect sudden changes (e.g., policy changes, administrative restructuring)
FOR EACH uat:

    # Calculate year-over-year changes
    FOR year IN [2022, 2023, 2024, 2025]:
        yoy_change[year] = (balance[year] - balance[year-1])
                          / ABS(balance[year-1]) * 100

    # Flag structural breaks (>50% sudden change)
    IF ABS(yoy_change[year]) > 50:
        flag_structural_break(uat, year, yoy_change[year])
```

---

## 10. Composite Indices and Rankings

### 10.1 Fiscal Health Index

```
# Composite index (0-100) for overall fiscal health
FOR EACH uat:

    # Component scores (0-20 each, 5 components)

    # 1. Balance Score
    IF deficit_per_capita >= 0:
        balance_score = 20
    ELIF deficit_per_capita > -200:
        balance_score = 15
    ELIF deficit_per_capita > -500:
        balance_score = 10
    ELIF deficit_per_capita > -1000:
        balance_score = 5
    ELSE:
        balance_score = 0

    # 2. Execution Score
    IF 80 <= execution_rate <= 100:
        execution_score = 20
    ELIF 70 <= execution_rate < 80:
        execution_score = 15
    ELIF 50 <= execution_rate < 70:
        execution_score = 10
    ELSE:
        execution_score = 0

    # 3. Arrears Score
    IF arrears_ratio < 5:
        arrears_score = 20
    ELIF arrears_ratio < 10:
        arrears_score = 15
    ELIF arrears_ratio < 20:
        arrears_score = 10
    ELSE:
        arrears_score = 0

    # 4. Autonomy Score
    IF self_funding_ratio >= 60:
        autonomy_score = 20
    ELIF self_funding_ratio >= 40:
        autonomy_score = 15
    ELIF self_funding_ratio >= 30:
        autonomy_score = 10
    ELSE:
        autonomy_score = 0

    # 5. Development Score
    IF development_ratio >= 20:
        development_score = 20
    ELIF development_ratio >= 15:
        development_score = 15
    ELIF development_ratio >= 10:
        development_score = 10
    ELSE:
        development_score = 0

    # Total Fiscal Health Index
    fhi = balance_score + execution_score + arrears_score
          + autonomy_score + development_score

FHI_INTERPRETATION:
- 80-100: HEALTHY
- 60-79:   GOOD
- 40-59:   FAIR
- 20-39:   POOR
- 0-19:    CRITICAL
```

### 10.2 Vulnerability Index

```
# Focus on risk factors (inverse of health)
FOR EACH uat:

    vulnerability_score = 0

    # High deficit vulnerability
    IF deficit_per_capita < -1000: vulnerability_score += 25
    ELIF deficit_per_capita < -500:  vulnerability_score += 15

    # Cash flow vulnerability
    IF arrears_ratio > 30: vulnerability_score += 25
    ELIF arrears_ratio > 20: vulnerability_score += 15

    # Overstaffing vulnerability
    IF personnel_ratio > 70: vulnerability_score += 20
    ELIF personnel_ratio > 60: vulnerability_score += 10

    # Dependence vulnerability
    IF self_funding_ratio < 20: vulnerability_score += 20
    ELIF self_funding_ratio < 30: vulnerability_score += 10

    # Underinvestment vulnerability
    IF development_ratio < 5: vulnerability_score += 10

VULNERABILITY_LEVELS:
- 70-100: SEVERE
- 50-69:   HIGH
- 30-49:   MODERATE
- 10-29:   LOW
- 0-9:     MINIMAL
```

---

## 11. Geographic Cluster Analysis

### 11.1 Spatial Clustering of Problems

```
# Identify counties with high concentration of problems
FOR EACH county:

    # Percentage of UATs in deficit
    deficit_concentration = COUNT(uats_with_deficit) / COUNT(all_uats) * 100

    # Percentage of UATs with high arrears
    arrears_concentration = COUNT(uats_with_high_arrears) / COUNT(all_uats) * 100

    # County-level average metrics
    avg_county_deficit_pc = AVG(uat_deficit_per_capita)
    avg_county_arrears = AVG(uat_arrears_ratio)

    # Cluster classification
    IF deficit_concentration > 60 AND arrears_concentration > 30:
        county.cluster = "CRITICAL_CLUSTER"
    ELIF deficit_concentration > 50 OR arrears_concentration > 25:
        county.cluster = "HIGH_RISK_CLUSTER"
    ELIF deficit_concentration > 30:
        county.cluster = "ELEVATED_RISK"
    ELSE:
        county.cluster = "NORMAL"
```

### 11.2 Regional Disparity Analysis

```
# Compare development regions (NUTS2)
REGIONS = {
    'Nord-Est': ['SV', 'BT', 'IS', 'NT', 'BC', 'VAS', 'GL'],
    'Sud-Est': ['GR', 'TL', 'CL', 'BR', 'C'],
    'Sud': ['IF', 'PH', 'GR', 'CL', 'BZ'],
    'Sud-Vest': ['DJ', 'TR', 'OL', 'MH', 'VL'],
    'Vest': ['TM', 'AR', 'OR'],
    'Nord-Vest': ['SJ', 'SM', 'B', 'AB', 'CV', 'MM']
}

FOR EACH region IN REGIONS:
    region_avg_fhi = AVG(county_fhi) FOR county IN region
    region_avg_deficit_pc = AVG(county_deficit_per_capita) FOR county IN region
    region_gini = GINI(uat_per_capita_spending) FOR uat IN region

# Regional inequality
IF region_gini > 0.4:
    flag_region as "HIGH_INEQUALITY"
```

---

## 12. Report Generation Template

### 12.1 Final Report Structure

```markdown
# [TITLE] Analiza Bugetară Detaliată a UAT-urilor din România
## Anul 2025 - Raport de Investigație

---

## Rezumat Executiv

### Concluzii Cheie
- [Bullets with main findings]

### Statistici Naționale
[Table with key national indicators]

### Top 10 UAT-uri cu Probleme Critice
[Table]

---

## 1. Prezentare Generală Națională

### 1.1 Venituri și Cheltuieli la Nivel Național
[Charts and tables]

### 1.2 Structura Veniturilor pe Surse de Finanțare
[Pie chart + table]

### 1.3 Structura Cheltuielilor pe Categorii Economice
[Bar chart + table]

### 1.4 Evoluția Anuală (2021-2025)
[Line chart showing trends]

---

## 2. Analiză pe Județe

### 2.1 Harta Riscului pe Județe
[Choropleth map visualization]

### 2.2 Tabel Sintetic pe Județe
[Table with county-level aggregates]

### 2.3 Județele cu Cele Mai Mari Probleme
[Detailed analysis of top 5 problematic counties]

---

## 3. Analiză Detaliată a UAT-urilor Problematice

### 3.1 Metodologie de Identificare
[Explanation of filtering criteria]

### 3.2 Top 50 UAT-uri cu Cele Mai Mari Probleme
[Sortable table with all metrics]

### 3.3 Studii de Caz
[Detailed deep dives for most problematic UATs]

---

## 4. Analiză Sectorială

### 4.1 Învățământ
[Education-specific analysis]

### 4.2 Sănătate
[Health-specific analysis]

### 4.3 Infrastructură
[Infrastructure investment analysis]

### 4.4 Administrație Publică
[Administrative overhead analysis]

---

## 5. Indicatori de Risc și Vulnerabilitate

### 5.1 Indexul de Sănătate Fiscală (FHI)
[Methodology + national distribution]

### 5.2 Indexul de Vulnerabilitate
[Methodology + most vulnerable UATs]

### 5.3 Detectarea Anomaliilor Statistice
[Outlier analysis results]

---

## 6. Analiza Tendințelor

### 6.1 Tendințe pe 5 Ani (2021-2025)
[Trend analysis by UAT and county]

### 6.2 UAT-uri cu Deteriorare Accelerată
[Entities with worsening conditions]

### 6.3 Schimbări Structurale Detectate
[Identification of policy/administrative impacts]

---

## 7. Clustere Geografice de Risc

### 7.1 Zone cu Concentrație Ridicată de Probleme
[Spatial clustering results]

### 7.2 Disparități Regionale
[Regional comparison analysis]

---

## 8. Concluzii și Recomandări

### 8.1 Concluzii
[Summary of key findings]

### 8.2 Recomandări de Politică Publică
[Actionable recommendations]

### 8.3 UAT-uri ce Necesită Intervenție Urgentă
[List for immediate attention]

### 8.4 Testarea Narativivelor Politice
[Findings presented for each narrative A-D]

### 8.5 Analiza Sensibilității la Scenarii de Politică
[Transfer tightening, EU fund slowdown, wage freeze persistence]

---

## 9. Context Macro-Fiscal și Constrângeri EU

### 9.1 Procedura Deficit Excesiv (EDP)
[Current status and implications for local budgets]

### 9.2 Analiza Fondurilor UE la Nivel Local
[Absorption rates, co-financing burden, suspension risk]

### 9.3 Impactul Pachetelor de Consolidare Națională
[Structural breaks detected around policy events]

---

## 10. Analiza Funcționării vs Dezvoltare

### 10.1 Soldul de Funcționare (Operating Position)
[Current revenues vs current expenses excluding capital]

### 10.2 Volatilitatea Veniturilor Proprii
[Fragile tax base identification]

### 10.3 Dependența de Trezorerie
[Treasury vs non-Treasury payment analysis]

### 10.4 Deficitul Ascuns (Hidden Deficit)
[Off-balance-sheet pressure indicators]

---

## 11. Analiza Formulelor de Transfer

### 11.1 Eficacitatea Egalizării
[Do formula-based transfers reduce dispersion?]

### 11.2 Alocarea Suportului pentru Arereate
[Correlation with chronic stress indicators]

### 11.3 Capacitatea Fiscală vs Alocări
[Test of formula realism]

---

## Anexe

### A. Metodologie Detaliată
[Complete methodology]

### B. Dicționar de Coduri Clasificare
[Functional and economic code reference]

### C. Listă Completă UAT-uri
[Full ranking]

### D. Interpretarea Indicatorilor
[Glossary of terms]

### E. Proveniența Datelor și Calitate
[SIRUTA, RELUAT, ANAF XML structures]

### F. Limitări și Note Metodologice
[What the analysis can and cannot conclude]
```

---

## 13. EU Funds Analysis and Absorption Risk

### 13.1 EU Funds Exposure at UAT Level

```
# EU-funded capital expenditure analysis
FOR EACH uat:
    eu_funded_capex = sum(amount)
        WHERE: funding_source IN ['EU', 'FEAD', 'PNRR']
              AND account_category = 'ch'
              AND expense_type = 'dezvoltare'
              AND year = 2025

    total_capex = sum(amount)
        WHERE: account_category = 'ch'
              AND expense_type = 'dezvoltare'
              AND year = 2025

    eu_fund_share = eu_funded_capex / total_capex * 100
    cofinancing_burden = eu_funded_capex * local_share_percentage

# Execution slippage on EU programs
eu_execution_slippage = (credite_bugetare_eu - plati_eu) / credite_bugetare_eu * 100
```

### 13.2 Absorption Risk Indicators

| Metric | Calculation | Risk Threshold |
|--------|-------------|----------------|
| EU Fund Dependence | EU capex / total capex | > 50% = HIGH dependence |
| Co-financing Burden | Local contribution required | > 15% of own revenues = STRESS |
| Execution Slippage | (credits - payments) / credits | > 30% = HIGH risk |
| Suspension Sensitivity | Impact of EU fund pause | Scenario analysis |

### 13.3 EU Funds Conditionality Dashboard

**EDP Compliance Risk at Local Level:**
- Map UATs with >50% capital spending from EU sources
- Flag where co-financing burden exceeds 20% of own revenues
- Track execution slippage by NUTS2 region

---

## 14. Operating Position Analysis (Current vs Capital)

### 14.1 Operating Balance Definition

The operating balance excludes capital items to assess the sustainability of current service delivery:

```
# Operating Balance (excludes capital investment)
current_revenues = sum(amount)
    WHERE: account_category = 'vn'
          AND funding_source NOT IN ('loans', 'EU_capital_support')

current_expenses = sum(amount)
    WHERE: account_category = 'ch'
          AND expense_type = 'functionare'
          AND economic_code NOT LIKE '4%'  # Exclude capital transfers

operating_balance = current_revenues - current_expenses
operating_margin = operating_balance / current_revenues * 100

# Interpretation:
# operating_margin < -10%: Structural operating deficit
# operating_margin > 5%: Healthy operating position
```

### 14.2 Revenue Volatility Analysis

```
# Rolling volatility for fragile tax base detection
FOR EACH uat:
    own_source_revenues = sum(amount)
        WHERE: account_category = 'vn'
              AND funding_source IN ['A', 'B']  # Local taxes + own revenues

    # Calculate 3-year rolling volatility
    rolling_stddev = STDEV(own_source_revenues[t-2:t])
    rolling_mean = MEAN(own_source_revenues[t-2:t])
    revenue_volatility = (rolling_stddev / rolling_mean) * 100

# Interpretation:
# revenue_volatility > 30%: Fragile, unpredictable tax base
# revenue_volatility < 15%: Stable revenue stream
```

### 14.3 Treasury Dependency Analysis

```
# Treasury vs non-Treasury payment channels
treasury_payments = plati_trezor
non_treasury_payments = plati_non_trezor
total_payments = treasury_payments + non_treasury_payments

treasury_dependency = treasury_payments / total_payments * 100

# Risk interpretation:
# High treasury dependency (>90%) may indicate:
# - Limited direct payment authority
# - Potential bottlenecks if Treasury liquidity constrained
# - Central cash management dominance
```

### 14.4 Hidden Deficit Proxy

Cash reporting can understate fiscal stress. This proxy captures "off-balance-sheet" pressures:

```
# Hidden deficit indicator
hidden_deficit_proxy =
    (change_in_unpaid_receipts) +
    (change_in_other_payables)
    - (change_in_cash_reserves)

# Positive value = growing hidden obligations
IF hidden_deficit_proxy > (total_expenses * 0.10):
    flag_as "HIDDEN_DEFICIT_RISK"
```

---

## 15. Policy Regime Analysis and Structural Breaks

### 15.1 Consolidation Package Impact Detection

```
# Detect synchronized discontinuities around policy events
POLICY_EVENTS = {
    '2024-07': 'VAT increase 19% -> 24%',
    '2025-01': 'Wage freeze extension',
    '2025-07': 'Property tax reform',
}

FOR EACH policy_date IN POLICY_EVENTS:
    pre_event_mean = MEAN(monthly_revenue[3_months_before])
    post_event_mean = MEAN(monthly_revenue[3_months_after])

    discontinuity = (post_event_mean - pre_event_mean) / pre_event_mean * 100

    IF ABS(discontinuity) > 15:
        flag_structural_break(uat, policy_date, discontinuity)
```

### 15.2 Personnel Cost Rigidity Under Wage Freeze

```
# Personnel spending rigidity during consolidation
personnel_rigidity_index = (
    personnel_share_current_year -
    personnel_share_previous_year
) / national_wage_freeze_indicator

# If personnel share grows despite freeze → indicates:
# - Headcount growth masking wage freeze
# - Grade promotions increasing fixed costs
# - Reclassification of positions
```

---

## 16. Transfer Formula Realism Checks

### 16.1 Equalization Transfer Analysis

Romania's local finance law (Law 273/2006) defines allocation formulas for balancing transfers including:
- Financial capacity component (based on income tax per capita)
- Area component
- Arrears/co-financing support portion (at county level)

```
# Test equalization effectiveness
FOR EACH uat:
    actual_transfers = sum(amount)
        WHERE: funding_source = 'E'  # State transfers
              AND year = 2025

    # Formula-predicted transfer (simplified)
    formula_transfer = (
        (base_per_capita * population) +
        (area_component * area_km2) +
        (capacity_adjustment * estimated_capacity)
    )

    transfer_gap = actual_transfers - formula_transfer
    transfer_deviation = transfer_gap / formula_transfer * 100

# Hypothesis test: Do formula-based transfers reduce dispersion?
before_equalization_gini = GINI(own_source_per_capita)
after_equalization_gini = GINI((own_source + transfers) _per_capita)

equalization_effectiveness = before_equalization_gini - after_equalization_gini
```

### 16.2 Arrears Support Allocation Test

```
# Test if arrears support goes to chronically stressed UATs
county_arrears_pool = sum(amount)
    WHERE: transfer_type = 'arrears_support'
          AND year = 2025
    GROUP BY county_code

# Correlate with chronic stress indicators
chronic_stress_uats = COUNT(uats)
    WHERE: arrears_ratio > 20
      AND execution_rate < 70
      AND deficit_per_capita < -200
    GROUP BY county_code

arrears_correlation = CORRELATE(county_arrears_pool, chronic_stress_uats)

# Present as association, not intent
```

---

## 17. Policy Scenario Analysis (Sensitivity Testing)

### 17.1 Scenario: Transfer Tightening

```
# Impact of 10% reduction in state transfers
FOR EACH uat:
    current_transfers = sum(state_transfers)
    current_balance = revenues - expenses

    transfer_shock = current_transfers * 0.10
    post_shock_balance = current_balance - transfer_shock

    IF post_shock_balance < (current_balance * 0.80):
        uat.vulnerability_to_transfer_cuts = "SEVERE"
    ELIF post_shock_balance < 0:
        uat.vulnerability_to_transfer_cuts = "HIGH"
    ELSE:
        uat.vulnerability_to_transfer_cuts = "MODERATE"
```

### 17.2 Scenario: EU Fund Slowdown

```
# Impact if EU-funded capital execution slows by 50%
FOR EACH uat:
    eu_capex_current = eu_funded_capex
    local_cofinancing = eu_capex_current * local_share

    eu_slowdown_impact = eu_capex_current * 0.50 * local_share

    # Measure fiscal space to absorb co-finishing
    fiscal_slack = own_revenues - (operating_expenses + local_cofinancing)

    IF fiscal_slack < 0:
        flag_as "CANNOT_ABSORB_EU_SLOWDOWN"
```

### 17.3 Scenario: Wage Freeze Persistence

```
# Multi-year wage freeze impact on personnel cost ratio
FOR EACH uat:
    personnel_ratio_t0 = personnel_expenses[2023] / total_expenses[2023]
    personnel_ratio_t1 = personnel_expenses[2025] / total_expenses[2025]

    personnel_drift = personnel_ratio_t1 - personnel_ratio_t0

    # If personnel ratio grows despite wage freeze:
    # → Indicates headcount growth or reclassification pressure
    IF personnel_drift > 5:
        flag_as "PERSONNEL_COST_PRESSURE"
```

---

## 18. Narrative Testing Framework

The report tests competing political narratives with data:

### Narrative A: "Local governments are underfunded"

**Test:**
- Service burden indicators (spending per capita by function) vs population structure
- Fiscal capacity (own-source per capita) distribution
- Equalization effectiveness (do transfers reduce dispersion?)

**Evidence to present:**
- Map of service burden (education, health spending per capita)
- Distribution of fiscal capacity by UAT type
- Before/after equalization Gini coefficients

### Narrative B: "Local governments are inefficient"

**Test:**
- Unit cost benchmarks (spending per capita by function among peers)
- Personnel share vs outcomes proxies
- Investment execution vs administrative capacity

**Evidence to present:**
- Peer group rankings (percentiles within same UAT type/population band)
- Administrative overhead ratio distribution
- Capital execution rates by UAT type

### Narrative C: "The problem is arrears, not annual deficit"

**Test:**
- Commitment coverage and unpaid receipts ratios
- Persistence of payment delays over multiple periods
- Hidden deficit proxy trends

**Evidence to present:**
- UATs with high arrears but moderate annual deficit
- Arrears accumulation trend maps
- Cash vs accrual reconciliation

### Narrative D: "EU funds will solve it"

**Test:**
- EU-fund dependence vs co-financing burden
- Under-execution patterns by UAT type and region
- Sensitivity to suspension scenarios

**Evidence to present:**
- UATs ranked by EU fund exposure
- Co-financing burden as % of own revenues
- Execution slippage by region

---

## 19. Data Provenance and Quality

### 19.1 Administrative Identity Hierarchy

| Source | Field | Purpose |
|--------|-------|---------|
| SIRUTA register | siruta_code | Canonical UAT identifier |
| SIRUTA register | uat_type | Commune/town/municipality/county |
| SIRUTA register | county_code | County membership |
| RELUAT | geometry_polygon | Map visualization |
| Eurostat LAU | lau_code | EU compatibility |

### 19.2 Geometry Versioning

```
# Versioned boundaries to avoid map errors
geometry_table:
    - siruta_code
    - valid_from (date)
    - valid_to (date)
    - geometry_version
    - legal_status (agreed / contested / pending)

# Always filter by validity date
WHERE report_date BETWEEN valid_from AND valid_to
```

### 19.3 Quality Checks

| Check | Method | Threshold |
|-------|--------|-----------|
| Missing UAT mappings | COUNT(uats with NULL siruta) | = 0 |
| Negative values | WHERE amount < 0 | Flag for review |
| Payments > credits | WHERE payments > definitive_credits | Flag with explanation |
| Duplicate reporting | GROUP BY uat_id, period HAVING COUNT > 1 | Merge or flag |

---

## 20. Political Context and Accountability

### 20.1 Key Actors (for context, not attribution)

| Role | Context |
|------|---------|
| Prime Minister | Sets deficit correction targets (~6-6.5% GDP 2026) |
| Ministry of Finance | Implements consolidation packages |
| Fiscal Council | Independent monitoring of compliance |
| EU Commission | EDP monitoring and funds conditionality |

### 20.2 National Constraint Indicators to Track

- General government deficit (% GDP)
- Public debt trajectory
| EDP status | Active - corrective measures required |
| EU funds absorption rate | Currently low (concern cited by EP) |

---

## 21. Data Extraction Queries (For Reference)

```
# Query 1: Base UAT Data with Budget Execution
SELECT
    uat_id,
    uat_name,
    county_code,
    county_name,
    siruta_code,
    year,

    -- Revenues
    SUM(CASE WHEN account_category = 'vn' THEN amount ELSE 0 END) AS total_revenues,

    -- Expenses by economic category
    SUM(CASE WHEN account_category = 'ch' THEN amount ELSE 0 END) AS total_expenses,
    SUM(CASE WHEN economic_code LIKE '10%' THEN amount ELSE 0 END) AS personnel_expenses,
    SUM(CASE WHEN economic_code LIKE '20%' THEN amount ELSE 0 END) AS_goods_services,

    -- By expense type
    SUM(CASE WHEN expense_type = 'functionare' THEN amount ELSE 0 END) AS operational_expenses,
    SUM(CASE WHEN expense_type = 'dezvoltare' THEN amount ELSE 0 END) AS development_expenses,

    -- By functional category
    SUM(CASE WHEN functional_code LIKE '09%' THEN amount ELSE 0 END) AS education_expenses,
    SUM(CASE WHEN functional_code LIKE '12%' THEN amount ELSE 0 END) AS health_expenses,
    SUM(CASE WHEN functional_code LIKE '01%' THEN amount ELSE 0 END) AS admin_expenses,
    SUM(CASE WHEN functional_code IN ('05', '06') THEN amount ELSE 0 END) AS infrastructure_expenses

FROM budget_execution
WHERE year = 2025
  AND is_uat = true
GROUP BY uat_id, uat_name, county_code, county_name, siruta_code, year

# Query 2: Commitments Data
SELECT
    uat_id,
    year,

    SUM(credite_angajament) AS total_commitments,
    SUM(credite_bugetare) AS total_budget_credits,
    SUM(limita_credit_angajament) AS total_commitment_limit,
    SUM(plati_trezor) AS total_treasury_payments,
    SUM(plati_non_trezor) AS total_non_treasury_payments,
    SUM(receptii_totale) AS total_receipts,
    SUM(receptii_neplatite) AS total_unpaid_receipts

FROM budget_commitments
WHERE year = 2025
  AND is_uat = true
GROUP BY uat_id, year

# Query 3: INS Population Data
SELECT
    siruta_code,
    uat_name,
    population AS total_population,

    -- Age groups
    SUM(CASE WHEN age_group = '0-14' THEN population ELSE 0 END) AS age_0_14,
    SUM(CASE WHEN age_group = '15-64' THEN population ELSE 0 END) AS age_15_64,
    SUM(CASE WHEN age_group = '65+' THEN population ELSE 0 END) AS age_65_plus,

    -- School age (for education analysis)
    SUM(CASE WHEN age BETWEEN 5 AND 18 THEN population ELSE 0 END) AS school_age_population

FROM ins_population
WHERE year = 2024  # Use latest available
GROUP BY siruta_code, uat_name
```

---

## Next Steps

### Data Collection and Preparation
1. **Extract budget execution data** with ANAF XML structure mapping
2. **Extract commitments data** including pipeline metrics (credits, limits, receipts, payments)
3. **Join with SIRUTA register** for UAT identity and typology
4. **Import RELUAT geometry** with versioning for map visualizations
5. **Collect EU funds data** by UAT for absorption analysis
6. **Compile policy event timeline** (consolidation packages, tax changes)

### Metric Calculation
7. **Calculate core financial metrics** (deficit, execution, arrears, autonomy)
8. **Calculate operating position** (current revenues vs current expenses)
9. **Calculate revenue volatility** (3-year rolling std dev / mean)
10. **Calculate hidden deficit proxy** (change in unpaid receipts + payables)
11. **Calculate peer group benchmarks** (typology-normalized comparisons)
12. **Calculate composite indices** (FHI, Vulnerability Index)

### Advanced Analyses
13. **Detect structural breaks** linked to consolidation packages
14. **Test equalization effectiveness** (before/after Gini comparison)
15. **Analyze EU funds exposure** (dependence, co-financing, execution slippage)
16. **Run policy scenario sensitivity tests** (transfer cuts, EU slowdown)
17. **Test political narratives** with empirical evidence
18. **Identify spatial clusters** of fiscal stress

### Visualization and Reporting
19. **Generate the statistical analyses** (z-scores, percentiles, trends)
20. **Create choropleth maps** (operating margin, payment delay, capital execution)
21. **Build peer benchmarking dashboards** (typology-normalized)
22. **Compile findings into report template** with Romanian sections
23. **Validate findings** with domain experts
24. **Finalize and distribute** for 2026 budget debate
