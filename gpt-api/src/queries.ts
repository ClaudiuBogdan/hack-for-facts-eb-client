// ── Entity Details (basic info + financials + trends) ──

export const ENTITY_DETAILS_QUERY = `
  query GetEntityDetails(
    $cui: ID!
    $reportPeriod: ReportPeriodInput!
    $trendPeriod: ReportPeriodInput!
    $reportType: ReportType
    $normalization: Normalization
    $currency: Currency
    $inflation_adjusted: Boolean
    $mainCreditorCui: String
  ) {
    entity(cui: $cui) {
      cui
      name
      address
      default_report_type
      entity_type
      is_uat
      uat {
        name
        county_code
        county_name
        siruta_code
        population
        county_entity { cui name }
      }
      parents { cui name }
      totalIncome(period: $reportPeriod, reportType: $reportType, normalization: $normalization, currency: $currency, inflation_adjusted: $inflation_adjusted, main_creditor_cui: $mainCreditorCui)
      totalExpenses(period: $reportPeriod, reportType: $reportType, normalization: $normalization, currency: $currency, inflation_adjusted: $inflation_adjusted, main_creditor_cui: $mainCreditorCui)
      budgetBalance(period: $reportPeriod, reportType: $reportType, normalization: $normalization, currency: $currency, inflation_adjusted: $inflation_adjusted, main_creditor_cui: $mainCreditorCui)
      incomeTrend(period: $trendPeriod, reportType: $reportType, normalization: $normalization, currency: $currency, inflation_adjusted: $inflation_adjusted, main_creditor_cui: $mainCreditorCui) {
        seriesId
        xAxis { name type unit }
        yAxis { name type unit }
        data { x y }
      }
      expenseTrend: expensesTrend(period: $trendPeriod, reportType: $reportType, normalization: $normalization, currency: $currency, inflation_adjusted: $inflation_adjusted, main_creditor_cui: $mainCreditorCui) {
        seriesId
        xAxis { name type unit }
        yAxis { name type unit }
        data { x y }
      }
      balanceTrend(period: $trendPeriod, reportType: $reportType, normalization: $normalization, currency: $currency, inflation_adjusted: $inflation_adjusted, main_creditor_cui: $mainCreditorCui) {
        seriesId
        xAxis { name type unit }
        yAxis { name type unit }
        data { x y }
      }
    }
  }
`

// ── Entity Basic (no financials — fallback if financials fail) ──

export const ENTITY_BASIC_QUERY = `
  query GetEntityBasic($cui: ID!) {
    entity(cui: $cui) {
      cui
      name
      address
      default_report_type
      entity_type
      is_uat
      uat {
        name
        county_code
        county_name
        siruta_code
        population
        county_entity { cui name }
      }
      parents { cui name }
    }
  }
`

// ── Entity Relationships ──

export const ENTITY_RELATIONSHIPS_QUERY = `
  query GetEntityRelationships($cui: ID!) {
    entity(cui: $cui) {
      children { cui name }
      parents { cui name }
    }
  }
`

// ── Entity Line Items ──

export const ENTITY_LINE_ITEMS_QUERY = `
  query GetEntityLineItems(
    $cui: ID!
    $reportPeriod: ReportPeriodInput!
    $reportType: ReportType
    $normalization: Normalization
    $currency: Currency
    $inflation_adjusted: Boolean
    $mainCreditorCui: String
  ) {
    entity(cui: $cui) {
      executionLineItemsCh: executionLineItems(
        filter: { account_category: ch, report_period: $reportPeriod, report_type: $reportType, normalization: $normalization, currency: $currency, inflation_adjusted: $inflation_adjusted, main_creditor_cui: $mainCreditorCui }
        sort: { by: "amount", order: "DESC" }
        limit: 15000
      ) {
        nodes {
          line_item_id
          account_category
          funding_source_id
          expense_type
          anomaly
          functionalClassification { functional_name functional_code }
          economicClassification { economic_name economic_code }
          ytd_amount
          quarterly_amount
          monthly_amount
        }
      }
      executionLineItemsVn: executionLineItems(
        filter: { account_category: vn, report_period: $reportPeriod, report_type: $reportType, normalization: $normalization, currency: $currency, inflation_adjusted: $inflation_adjusted, main_creditor_cui: $mainCreditorCui }
        sort: { by: "amount", order: "DESC" }
        limit: 15000
      ) {
        nodes {
          line_item_id
          account_category
          funding_source_id
          expense_type
          anomaly
          functionalClassification { functional_name functional_code }
          economicClassification { economic_name economic_code }
          ytd_amount
          quarterly_amount
          monthly_amount
        }
      }
    }
    fundingSources {
      nodes {
        source_id
        source_description
      }
    }
  }
`

// ── Entity Reports ──

export const ENTITY_REPORTS_QUERY = `
  query GetEntityReports(
    $cui: ID!
    $limit: Int
    $offset: Int
    $year: Int
    $period: String
    $type: ReportType
    $sort: SortOrder
  ) {
    entity(cui: $cui) {
      reports(limit: $limit, offset: $offset, year: $year, period: $period, type: $type, sort: $sort) {
        nodes {
          report_id
          reporting_year
          report_type
          report_date
          download_links
          main_creditor { cui name }
          budgetSector { sector_id sector_description }
        }
        pageInfo {
          totalCount
          hasNextPage
          hasPreviousPage
        }
      }
    }
  }
`

// ── Standalone Reports ──

export const REPORTS_QUERY = `
  query GetReports($filter: ReportFilter, $limit: Int, $offset: Int) {
    reports(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        report_id
        reporting_year
        report_type
        report_date
        download_links
        main_creditor { cui name }
        budgetSector { sector_id sector_description }
      }
      pageInfo {
        totalCount
        hasNextPage
        hasPreviousPage
      }
    }
  }
`

// ── Commitments Summary ──

export const COMMITMENTS_SUMMARY_QUERY = `
  query CommitmentsSummary($filter: CommitmentsFilterInput!, $limit: Int, $offset: Int) {
    commitmentsSummary(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        __typename
        ... on CommitmentsMonthlySummary {
          year
          month
          entity_cui
          entity_name
          report_type
          credite_angajament
          plati_trezor
          plati_non_trezor
          receptii_totale
          receptii_neplatite_change
          total_plati
        }
        ... on CommitmentsQuarterlySummary {
          year
          quarter
          entity_cui
          entity_name
          report_type
          credite_angajament
          limita_credit_angajament
          credite_bugetare
          credite_angajament_initiale
          credite_bugetare_initiale
          credite_angajament_definitive
          credite_bugetare_definitive
          credite_angajament_disponibile
          credite_bugetare_disponibile
          receptii_totale
          plati_trezor
          plati_non_trezor
          receptii_neplatite
          total_plati
          execution_rate
          commitment_rate
        }
        ... on CommitmentsAnnualSummary {
          year
          entity_cui
          entity_name
          report_type
          credite_angajament
          limita_credit_angajament
          credite_bugetare
          credite_angajament_initiale
          credite_bugetare_initiale
          credite_angajament_definitive
          credite_bugetare_definitive
          credite_angajament_disponibile
          credite_bugetare_disponibile
          receptii_totale
          plati_trezor
          plati_non_trezor
          receptii_neplatite
          total_plati
          execution_rate
          commitment_rate
        }
      }
      pageInfo {
        totalCount
        hasNextPage
        hasPreviousPage
      }
    }
  }
`

// ── Commitments Line Items ──

export const COMMITMENTS_LINE_ITEMS_QUERY = `
  query CommitmentsLineItems($filter: CommitmentsFilterInput!, $limit: Int, $offset: Int) {
    commitmentsLineItems(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        id
        year
        month
        report_type
        entity_cui
        entity_name
        budget_sector_id
        budget_sector_name
        funding_source_id
        funding_source_name
        functional_code
        functional_name
        economic_code
        economic_name
        credite_angajament
        limita_credit_angajament
        credite_bugetare
        credite_angajament_initiale
        credite_bugetare_initiale
        credite_angajament_definitive
        credite_bugetare_definitive
        credite_angajament_disponibile
        credite_bugetare_disponibile
        receptii_totale
        plati_trezor
        plati_non_trezor
        receptii_neplatite
        monthly_plati_trezor
        monthly_plati_non_trezor
        monthly_receptii_totale
        monthly_receptii_neplatite_change
        monthly_credite_angajament
        is_quarterly
        quarter
        is_yearly
        anomaly
      }
      pageInfo {
        totalCount
        hasNextPage
        hasPreviousPage
      }
    }
  }
`

// ── Commitments Aggregated ──

export const COMMITMENTS_AGGREGATED_QUERY = `
  query CommitmentsAggregated($input: CommitmentsAggregatedInput!) {
    commitmentsAggregated(input: $input) {
      nodes {
        functional_code
        functional_name
        economic_code
        economic_name
        amount
        count
      }
      pageInfo {
        totalCount
        hasNextPage
        hasPreviousPage
      }
    }
  }
`

// ── Commitments Analytics ──

export const COMMITMENTS_ANALYTICS_QUERY = `
  query CommitmentsAnalytics($inputs: [CommitmentsAnalyticsInput!]!) {
    commitmentsAnalytics(inputs: $inputs) {
      seriesId
      metric
      xAxis { name type unit }
      yAxis { name type unit }
      data { x y growth_percent }
    }
  }
`

// ── Commitment vs Execution ──

export const COMMITMENT_VS_EXECUTION_QUERY = `
  query CommitmentVsExecution($input: CommitmentExecutionComparisonInput!) {
    commitmentVsExecution(input: $input) {
      frequency
      data {
        period
        commitment_value
        execution_value
        difference
        difference_percent
        commitment_growth_percent
        execution_growth_percent
        difference_growth_percent
      }
      total_commitment
      total_execution
      total_difference
      overall_difference_percent
      matched_count
      unmatched_commitment_count
      unmatched_execution_count
    }
  }
`

// ── Execution Analytics ──

export const EXECUTION_ANALYTICS_QUERY = `
  query GetExecutionLineItemsAnalytics($inputs: [AnalyticsInput!]!) {
    executionAnalytics(inputs: $inputs) {
      seriesId
      xAxis { name type unit }
      yAxis { name type unit }
      data { x y }
    }
  }
`

// ── Static Chart Analytics ──

export const STATIC_CHART_ANALYTICS_QUERY = `
  query GetStaticChartAnalytics($seriesIds: [ID!]!, $lang: String) {
    staticChartAnalytics(seriesIds: $seriesIds, lang: $lang) {
      seriesId
      xAxis { name type unit }
      yAxis { name type unit }
      data { x y }
    }
  }
`

// ── Heatmap UAT Data ──

export const HEATMAP_UAT_DATA_QUERY = `
  query GetHeatmapUATData($filter: AnalyticsFilterInput!) {
    heatmapUATData(filter: $filter) {
      uat_id
      uat_name
      uat_code
      siruta_code
      county_code
      county_name
      population
      amount
      total_amount
      per_capita_amount
    }
  }
`

// ── Heatmap County Data ──

export const HEATMAP_COUNTY_DATA_QUERY = `
  query GetHeatmapCountyData($filter: AnalyticsFilterInput!) {
    heatmapCountyData(filter: $filter) {
      county_code
      county_name
      county_population
      total_amount
      per_capita_amount
      county_entity { cui name }
    }
  }
`

// ── Entity Analytics (rankings) ──

export const ENTITY_ANALYTICS_QUERY = `
  query EntityAnalytics($filter: AnalyticsFilterInput!, $sort: SortOrder, $limit: Int, $offset: Int) {
    entityAnalytics(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {
      nodes {
        entity_cui
        entity_name
        entity_type
        uat_id
        county_code
        county_name
        population
        amount
        total_amount
        per_capita_amount
      }
      pageInfo {
        totalCount
        hasNextPage
        hasPreviousPage
      }
    }
  }
`

// ── Aggregated Line Items ──

export const AGGREGATED_LINE_ITEMS_QUERY = `
  query AggregatedLineItems($filter: AnalyticsFilterInput!, $limit: Int, $offset: Int) {
    aggregatedLineItems(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        functional_code
        functional_name
        economic_code
        economic_name
        amount
        count
      }
      pageInfo {
        totalCount
        hasNextPage
        hasPreviousPage
      }
    }
  }
`

// ── Execution Line Items (standalone, data discovery) ──

export const EXECUTION_LINE_ITEMS_QUERY = `
  query GetExecutionLineItems($filter: AnalyticsFilterInput, $sort: SortOrder, $limit: Int, $offset: Int) {
    executionLineItems(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {
      nodes {
        line_item_id
        report_id
        functional_code
        economic_code
        amount
        year
        account_category
        entity { cui name }
        functionalClassification { functional_name }
        economicClassification { economic_name }
      }
      pageInfo {
        totalCount
        hasNextPage
        hasPreviousPage
      }
    }
  }
`

// ── Datasets ──

export const DATASETS_QUERY = `
  query GetDatasets($ids: [ID!]!, $lang: String) {
    datasets(filter: { ids: $ids }, lang: $lang) {
      nodes {
        id
        name
        description
        sourceName
        sourceUrl
        xAxis { name type unit }
        yAxis { name type unit }
        data { x y }
      }
    }
  }
`

// ── Entity Search ──

export const ENTITY_SEARCH_QUERY = `
  query EntitySearch($filter: EntityFilter, $limit: Int, $offset: Int) {
    entities(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        cui
        name
        entity_type
        is_uat
        address
        uat {
          name
          county_code
          county_name
          siruta_code
          population
        }
      }
      pageInfo {
        totalCount
        hasNextPage
        hasPreviousPage
      }
    }
  }
`

// ── Classifications ──

export const ALL_FUNCTIONAL_CLASSIFICATIONS_QUERY = `
  query AllFunctionalClassifications {
    functionalClassifications(limit: 10000) {
      nodes {
        code: functional_code
        name: functional_name
      }
    }
  }
`

export const ALL_ECONOMIC_CLASSIFICATIONS_QUERY = `
  query AllEconomicClassifications {
    economicClassifications(limit: 10000) {
      nodes {
        code: economic_code
        name: economic_name
      }
    }
  }
`

export const BUDGET_SECTORS_QUERY = `
  query BudgetSectors {
    budgetSectors(limit: 1000) {
      nodes {
        sector_id
        sector_description
      }
    }
  }
`

export const FUNDING_SOURCES_QUERY = `
  query FundingSources {
    fundingSources(limit: 1000) {
      nodes {
        source_id
        source_description
      }
    }
  }
`

// ── INS Contexts ──

export const INS_CONTEXTS_QUERY = `
  query InsContexts($filter: InsContextFilterInput, $limit: Int, $offset: Int) {
    insContexts(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        id
        code
        name_ro
        name_en
        name_ro_markdown
        name_en_markdown
        level
        parent_id
        parent_code
        path
        matrix_count
      }
      pageInfo { totalCount hasNextPage hasPreviousPage }
    }
  }
`

// ── INS Datasets ──

export const INS_DATASETS_QUERY = `
  query InsDatasets($filter: InsDatasetFilterInput, $limit: Int, $offset: Int) {
    insDatasets(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        id
        code
        name_ro
        name_en
        definition_ro
        definition_en
        periodicity
        year_range
        dimension_count
        has_uat_data
        has_county_data
        has_siruta
        sync_status
        last_sync_at
        context_code
        context_name_ro
        context_name_en
        context_path
        metadata
      }
      pageInfo { totalCount hasNextPage hasPreviousPage }
    }
  }
`

// ── INS Dataset Details ──

export const INS_DATASET_DETAILS_QUERY = `
  query InsDatasetDetails($code: String!) {
    insDataset(code: $code) {
      id
      code
      name_ro
      name_en
      definition_ro
      definition_en
      periodicity
      year_range
      dimension_count
      has_uat_data
      has_county_data
      has_siruta
      sync_status
      last_sync_at
      context_code
      context_name_ro
      context_name_en
      context_path
      metadata
      dimensions {
        index
        type
        label_ro
        label_en
        is_hierarchical
        option_count
        classification_type {
          code
          name_ro
          name_en
          is_hierarchical
        }
      }
    }
  }
`

// ── INS Observations ──

export const INS_OBSERVATIONS_QUERY = `
  query InsDatasetHistory($datasetCode: String!, $filter: InsObservationFilterInput, $limit: Int, $offset: Int) {
    insObservations(datasetCode: $datasetCode, filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        dataset_code
        value
        value_status
        time_period { iso_period year quarter month periodicity }
        territory { code siruta_code level name_ro }
        unit { code symbol name_ro }
        classifications { id type_code type_name_ro type_name_en code name_ro name_en sort_order }
      }
      pageInfo { totalCount hasNextPage hasPreviousPage }
    }
  }
`

// ── INS Dataset Dimensions ──

export const INS_DATASET_DIMENSIONS_QUERY = `
  query InsDatasetDimensions($datasetCode: String!) {
    insDatasets(filter: { codes: [$datasetCode] }, limit: 1, offset: 0) {
      nodes {
        code
        dimensions {
          index
          type
          label_ro
          label_en
          classification_type { code name_ro name_en }
        }
      }
    }
  }
`

// ── INS Dataset Dimension Values ──

export const INS_DATASET_DIMENSION_VALUES_QUERY = `
  query InsDatasetDimensionValues(
    $datasetCode: String!
    $dimensionIndex: Int!
    $search: String
    $limit: Int
    $offset: Int
  ) {
    insDatasetDimensionValues(
      datasetCode: $datasetCode
      dimensionIndex: $dimensionIndex
      filter: { search: $search }
      limit: $limit
      offset: $offset
    ) {
      nodes {
        nom_item_id
        dimension_type
        label_ro
        label_en
        parent_nom_item_id
        offset_order
        territory { code siruta_code level name_ro }
        time_period { iso_period year quarter month periodicity }
        classification_value { type_code code name_ro }
        unit { code symbol name_ro }
      }
      pageInfo { totalCount hasNextPage hasPreviousPage }
    }
  }
`

// ── INS Latest Dataset Values ──

export const INS_LATEST_DATASET_VALUES_QUERY = `
  query InsLatestDatasetValues(
    $entity: InsEntitySelectorInput!
    $datasetCodes: [String!]!
    $preferredClassificationCodes: [String!]
  ) {
    insLatestDatasetValues(
      entity: $entity
      datasetCodes: $datasetCodes
      preferredClassificationCodes: $preferredClassificationCodes
    ) {
      latestPeriod
      matchStrategy
      hasData
      dataset {
        id
        code
        name_ro
        name_en
        definition_ro
        definition_en
        periodicity
        year_range
        dimension_count
        has_uat_data
        has_county_data
        has_siruta
        context_code
        context_name_ro
        context_name_en
        context_path
        metadata
      }
      observation {
        dataset_code
        value
        value_status
        time_period { iso_period year quarter month periodicity }
        territory { code siruta_code level name_ro }
        unit { code symbol name_ro }
        classifications { id type_code type_name_ro type_name_en code name_ro name_en sort_order }
      }
    }
  }
`
