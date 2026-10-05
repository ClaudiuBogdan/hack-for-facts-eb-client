/**
 * The national budget API's documents, one root per request (batching is off
 * on the server). Selections are lean and match `@/schemas/national-budget-api`;
 * a value's evidence is read on its own, for one cell.
 */

export const NATIONAL_CATALOG_QUERY = /* GraphQL */ `
  query BudgetNationalCatalog {
    budgetNationalCatalog {
      snapshots { approved execution }
      approved {
        editions {
          id budgetYear publication lineCount hasConflictingInterpretations
          slots { field measure measureYear lineCount }
          forms { form fund recordCount lineCount creditTypes authorityCount sources { sourceFileId document { url sha256 } } }
        }
        totals { key scope forms rowRole capitol label requiresCreditType }
      }
      execution {
        coverage { firstMonth lastMonth calendarMonthCount selectedMonthCount missingMonths note }
        seriesItems { itemId section sourceLabel relatedScopeItemId }
      }
    }
  }
`

const SERIES_PERIOD = 'date periodStart periodEnd status reason valueBasis'

export const EXECUTION_SERIES_QUERY = /* GraphQL */ `
  query BudgetNationalExecutionSeries($input: BudgetNationalExecutionSeriesInput!, $expectedSnapshot: String) {
    budgetNationalExecutionSeries(input: $input, expectedSnapshot: $expectedSnapshot) {
      snapshot
      results {
        item { itemId }
        component basis unit
        series { data { date value } }
        periods { ${SERIES_PERIOD} }
      }
    }
  }
`

const OPERAND = 'month observationKey sourceState document { url sha256 } coverage { start end } executionStatus finality label { sheet cell text }'

export const EXECUTION_SERIES_EVIDENCE_QUERY = /* GraphQL */ `
  query BudgetNationalExecutionSeriesEvidence($input: BudgetNationalExecutionSeriesInput!, $expectedSnapshot: String) {
    budgetNationalExecutionSeries(input: $input, expectedSnapshot: $expectedSnapshot) {
      snapshot
      results {
        item { itemId sourceLabel }
        unit
        series { data { date value } }
        periods { ${SERIES_PERIOD} endpoint { ${OPERAND} } predecessor { ${OPERAND} } }
      }
    }
  }
`

export const EXECUTION_OBSERVATIONS_QUERY = /* GraphQL */ `
  query BudgetExecutionObservations($input: BudgetExecutionObservationsInput!, $first: Int, $after: String, $expectedSnapshot: String) {
    budgetExecutionObservations(input: $input, first: $first, after: $after, expectedSnapshot: $expectedSnapshot) {
      snapshot
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          month section lineItem component measure periodRole disposition value unit sourceToken
          catalogItem { itemId }
          reportPeriod { start end }
          executionStatus finality
          locator { kind sheet cell page row column }
          labelEvidence { sheet cell text }
          document { url sha256 }
        }
      }
    }
  }
`

const LINE_REF = 'lineId recordIndex field annex token document { url sha256 }'

export const APPROVED_TOTALS_QUERY = /* GraphQL */ `
  query BudgetApprovedTotals($input: BudgetApprovedTotalsInput!, $expectedSnapshot: String) {
    budgetApprovedTotals(input: $input, expectedSnapshot: $expectedSnapshot) {
      snapshot
      unloadedEditionIds
      cells {
        edition { id budgetYear }
        fund total authorityCode
        authority { code name }
        measure measureYear creditType status matchCount value unit
        descriptor { label codes { capitol subcapitol paragraf grupa titlu articol alineat } }
        line { ${LINE_REF} }
      }
    }
  }
`

export const APPROVED_SERIES_QUERY = /* GraphQL */ `
  query BudgetApprovedSeries($input: BudgetApprovedSeriesInput!, $expectedSnapshot: String) {
    budgetApprovedSeries(input: $input, expectedSnapshot: $expectedSnapshot) {
      snapshot unit
      series { data { date value } }
      periods { date status budgetYear measureYear measure edition { id budgetYear } line { ${LINE_REF} } }
    }
  }
`

export const APPROVED_RECORDS_QUERY = /* GraphQL */ `
  query BudgetApprovedRecords($input: BudgetApprovedRecordsInput!, $first: Int, $after: String, $expectedSnapshot: String) {
    budgetApprovedRecords(input: $input, first: $first, after: $after, expectedSnapshot: $expectedSnapshot) {
      snapshot unit
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          recordIndex annex
          authority { code name }
          codes { capitol subcapitol paragraf grupa titlu articol alineat }
          label rowRole creditType contextLabel
          values { field measure measureYear value token }
          document { url sha256 }
        }
      }
    }
  }
`
