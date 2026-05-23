## Explore Romanian Public Finances: Main Tools and How To Use Them

This application helps you understand how Romanian public administration collects and spends money. Use the four main tools below together to move from a high-level picture to granular evidence, then package your insights into reproducible charts.

### Entity Details (deep dive on one institution)

What it is: A 360° page for a single entity (city hall, county council, ministry). It organizes data into an Overview, detailed Line Items, Trends, Reports, and an optional Map view when relevant.

What you can do:
- Overview: See yearly trend lines for Income (venituri), Expenses (cheltuieli), and Budget Balance; switch between absolute and YoY%.
- Year selector: Jump across years; the whole page updates and stays in sync with the URL for sharing.
- Line Items: Browse both Income and Expense breakdowns using functional and economic classifications; search to highlight specific areas (e.g., Education, Healthcare).
- Analytics within the entity: Get a structural view (bar/pie) of how spending or income is composed for a given year.
- Reports: Access official submissions tied to the entity and year.

Tips & tricks:
- Use the search prefixes in the entity URL (e.g., `expenseSearch=fn:<prefix>`) to auto-focus the page on a topic.
- Click on a year in the trends chart to synchronize the rest of the page.
- If the entity has a geographic role (UAT/County), switch to Map to see spatial patterns.

Why it’s powerful: It connects high-level trends to the precise line items that drive them, preserving institutional context.

### Map (spatial comparison at a glance)

What it is: An interactive heatmap of spending or revenue across UATs or Counties. Toggle normalization (per capita vs total) to make fair comparisons.

What you can do:
- Switch between UAT and County views; pick year(s) and account category (Income/Expenses).
- Hover and click to inspect; click-through navigates to the entity’s detail page carrying relevant context.
- View the same dataset as a sortable table or summary charts.

Tips & tricks:
- Prefer per-capita when comparing differently sized regions.
- Use the legend to calibrate what “high” or “low” means in the current view.

Why it’s powerful: It makes geographic outliers obvious and offers a frictionless hop to entity-level investigation.

### Chart Builder (custom, reproducible analysis)

What it is: A local-first workspace to build multi-year charts by combining series (filters, calculations, static datasets), annotate them, and share deep links.

What you can do:
- Add a “line-items aggregated yearly” series for selected entities, functional/economic prefixes, and account category (Income/Expenses).
- Create calculation series to derive indicators (e.g., Spending per Capita, Ratios), with cycle detection and year alignment.
- Add static datasets (e.g., macro indicators) and custom/manual series; mix and compare.
- Pick the best visualization (bar/line/area and aggregated charts like treemap/pie) and show year ranges inside the chart.
- Annotate important changes; export and share via a single URL that encodes the chart state.

Tips & tricks:
- Prefer aggregated charts for composition questions and line/area for trend questions.
- If a pie chart mixes different units, the app warns you to avoid misleading visuals.
- Use categories and favorites to organize your private chart library; backup/restore when switching devices.

Why it’s powerful: It turns ad-hoc questions into repeatable, documented visual analyses that anyone can open with the exact same data cuts.

### Entity Analytics (compare many entities fast)

What it is: A filterable, paginated, exportable table of entities with both total and per-capita metrics, plus a drill-down view for line items.

What you can do:
- Apply the same mental model as the Map filters (year, normalization, account category, functional/economic prefixes).
- Sort by total amount, per-capita, population, county, etc.; export CSV for offline work.
- Switch to Line Items to see the detailed composition for selected entities; jump to charting top categories.

Tips & tricks:
- Start broad (all entities) and progressively add prefixes or filters until your cohort is meaningful.
- Use per-capita to surface efficiency and affordability stories; use totals for scale comparisons.

Why it’s powerful: It’s the fastest way to find who’s highest/lowest on a metric and to shortlist entities for deeper investigation.

### Suggested investigation workflow

1) Start in Entity Analytics to find outliers on per-capita or total amounts for a chosen year/topic.
2) Open the Map to validate if the pattern is regional and to spot neighbors with similar/different profiles.
3) Dive into Entity Details for the few entities that stand out; read their trend lines and line-item composition.
4) Build a Chart that combines multiple entities, categories, or calculations; annotate and share your findings.

---

## User Stories Index

## Step-by-step Tutorial (with examples)

Follow these steps to get the most out of Transparenta.eu. Links open live pages so you can replicate the flow.

### 1) Start on the Homepage

- Go to the homepage and use the search box to find an entity by name or CUI.
- Try shortcuts like “Mun. Sibiu” or “Min. Educației”.
- Tip: Use keyboard arrows to select a result and press Enter to open it.

Example: Open the Entity page for Sibiu
- Link: `/entities/4270740`

### 2) Understand a single entity (Entity Details)

- Use the year selector at the top to switch the reporting year; all sections update together.
- In Overview:
  - Read “Cheltuieli totale”, “Venituri totale”, and “Balanța bugetară”.
  - Toggle “Valori Absolute” vs “Diferență % YoY” to switch the trends interpretation.
  - Click a year in the chart to sync the whole page to that year.
- In Line Items:
  - Explore Expenses vs Incomes with the accordion, grouped by functional/economic classification.
  - Use search to quickly highlight a topic (e.g., “Invățământ”).
- In Analytics:
  - Switch “Income”/“Expenses” and “Bar chart”/“Pie chart” for composition views.
- In Reports:
  - Download official financial reports for auditing and references.

Pro tips
- Share the exact view by copying the URL (it encodes year and view you’re seeing).
- Use search prefixes in the URL to auto-focus a topic: `expenseSearch=fn:<prefix>` and `incomeSearch=fn:<prefix>`.

### 3) Compare geographies (Map)

- Open the Map page.
- Select the view: **UAT** (municipalities, towns, communes) or **Județ** (counties).
- Choose **Cheltuieli** or **Venituri** and **Total** vs **Per Capita**.
- Inspect the heatmap: darker means higher values for the selected metric.
- Click an area to jump to that entity’s page (year and key filters are carried over).

Pro tips
- Prefer Per Capita for fair cross-size comparisons; use Total for sheer scale.
- Use the legend to understand the current value range (min/max percentile based).

### 4) Rank and shortlist entities (Entity Analytics)

- Open the Entity Analytics page.
- Apply filters: year, normalization, account type, functional/economic prefixes, entity types, etc.
- Sort by Total Amount or Per Capita to surface outliers.
- Export CSV for further offline analysis.
- Switch the view to Line Items to see detail composition and optionally generate a trend chart of top categories.

Pro tips
- Start broad, then narrow with functional/economic prefixes to isolate your theme.
- Use Per Capita to identify efficiency/affordability trends.

### 5) Build and share a custom analysis (Charts)

- Go to Charts → Create chart.
- Add a series of type “line-items aggregated yearly”:
  - Choose entities and filters (functional/economic prefixes; revenues vs expenses).
- Add a calculation series to compute ratios or normalized metrics.
- Optionally add a static dataset to compare against macro indicators.
- Pick the visualization (bar/line/area or an aggregated chart like pie/treemap).
- Add annotations to point out key moments; export or copy a deep link to share.

Pro tips
- Use aggregated charts (bar/pie/treemap) for composition questions; line/area for trends.
- If a pie chart mixes units (e.g., RON vs persons), the app warns you to avoid misleading charts.
- Organize your charts with favorites and categories; back up locally and restore on another device.


- [App Shell and Navigation](./app-shell-and-navigation.md)
- [Landing Page](./landing-page.md)
- [Charts: List](./charts-list.md)
- [Charts: Create](./charts-create.md)
- [Charts: Detail](./charts-detail.md)
- [Entity Details](./entity-details.md)
- [Private Company Details](./private-company-details.md)
- [Entity Analytics](./entity-analytics.md)
- [Map](./map.md)
- [Cookies and Policies](./cookies-and-policies.md)
- [Global Search and Navigation](./global-search-and-navigation.md)
- [Filters System](./filters-system.md)
- [Data and Analytics Utilities](./data-and-analytics-utilities.md)
- [Storage and Persistence](./storage-and-persistence.md)
- [Error Handling and Telemetry](./error-and-telemetry.md)
- [Performance and Routing](./performance-and-routing.md)
- [Miscellaneous](./miscellaneous.md)
- [Deep-links and Python Tools](./deeplinks-and-python-tools.md)


