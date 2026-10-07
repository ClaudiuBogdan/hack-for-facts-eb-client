import { MAIN_STAGES } from '../lib/judicial-model'

/**
 * The justice pages' GraphQL documents, apart from the reads that send them,
 * so a script can record the API's answers to exactly these documents
 * (`scripts/record-justice-fixtures.ts`). No document asks for a party's name
 * or a hearing's solution: the API withholds both, and the client never asks.
 */

export const COURT_CASES_PAGE_SIZE = 20

/** A court's list of cases: what tells them apart and opens them. What a case is about stays on its own page (owner, 2026-10-07). */
const CASE_LIST_FIELDS = 'caseId institutionCode caseNumber category stageName sourceOpenedAt latestSourceModifiedAt'
const AGGREGATE_FIELDS = 'denominator groups { key caseCount }'

export const COURT_QUERY = /* GraphQL */ `
  query JudicialCourtPage($code: String!, $court: JudicialCasesFilter!, $year: JudicialCasesFilter!, ${MAIN_STAGES.map((_, index) => `$stage${index}: JudicialCasesFilter!`).join(', ')}, $first: Int!) {
    court: judicialCourt(institutionCode: $code) {
      institutionCode
      courtLevel
      specialization
      locality
      countyCode
      parentInstitutionCode
      children {
        institutionCode
        courtLevel
      }
    }
    newestModified: judicialCases(filter: $court, sort: modifiedAt, dir: DESC, first: 1) {
      edges {
        node {
          latestSourceModifiedAt
        }
      }
    }
    newestOpened: judicialCases(filter: $court, sort: openedAt, dir: DESC, first: 1) {
      edges {
        node {
          sourceOpenedAt
        }
      }
    }
    years: judicialCaseload(groupBy: year, filter: $court) { ${AGGREGATE_FIELDS} }
    matters: judicialCaseload(groupBy: category, filter: $year) { ${AGGREGATE_FIELDS} }
    ${MAIN_STAGES.map((_, index) => `stage${index}: judicialCaseload(groupBy: courtLevel, filter: $stage${index}) { denominator }`).join('\n    ')}
    cases: judicialCases(filter: $court, sort: modifiedAt, dir: DESC, first: $first) {
      edges {
        node { ${CASE_LIST_FIELDS} }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

export const CHILDREN_QUERY = /* GraphQL */ `
  query JudicialCourtChildren($filter: JudicialCasesFilter!) {
    judicialCaseload(groupBy: court, filter: $filter) { ${AGGREGATE_FIELDS} }
  }
`

export const CASES_QUERY = /* GraphQL */ `
  query JudicialCourtCases($court: JudicialCasesFilter!, $first: Int!, $after: String) {
    judicialCases(filter: $court, sort: modifiedAt, dir: DESC, first: $first, after: $after) {
      edges {
        node { ${CASE_LIST_FIELDS} }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

export const CASE_QUERY = /* GraphQL */ `
  query JudicialCasePage($code: String!, $number: String!) {
    judicialCase(institutionCode: $code, caseNumber: $number) {
      case {
        caseId
        sourceSlug
        institutionCode
        caseNumber
        caseNumberOld
        department
        category
        stage
        stageName
        object
        sourceOpenedAt
        latestSourceModifiedAt
      }
      hearings {
        hearingIndex
        hearingAt
        panel
        pronouncementDate
        documentNumber
        documentDate
      }
      appeals {
        appealIndex
        appealDeclaredAt
        appealType
      }
      parties {
        partyIndex
        partyKind
        roleNormalized
        legalForm
      }
      personPartyCount
      legalReferences {
        caseLegalReferenceId
        sourceField
        citation
        actType
        actNumber
        actYear
        articleFragment
        resolutionStatus
        targetActId
      }
      lineage {
        fromCaseId
        toCaseId
        lineageType
        confidenceScore
        validationStatus
      }
      asOf {
        asOf
        sourceSlug
      }
    }
  }
`

export const relatedCasesQuery = (ids: readonly string[]) => /* GraphQL */ `
  query JudicialRelatedCases(${ids.map((_, index) => `$id${index}: BigInt!`).join(', ')}) {
    ${ids.map((_, index) => `r${index}: judicialCase(caseId: $id${index}) { case { caseId institutionCode caseNumber category stageName sourceOpenedAt } }`).join('\n    ')}
  }
`
