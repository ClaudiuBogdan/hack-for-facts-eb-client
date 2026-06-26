import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CONTEST_SEARCH,
  DEFAULT_ELECTION_HUB_SEARCH,
  DEFAULT_ELECTIONS_LANDING_SEARCH,
  parseContestSearch,
  parseElectionHubSearch,
  parseElectionsLandingSearch,
} from './elections'

describe('elections search parsers', () => {
  describe('parseElectionsLandingSearch', () => {
    it('returns defaults for empty search', () => {
      expect(parseElectionsLandingSearch(undefined)).toEqual(
        DEFAULT_ELECTIONS_LANDING_SEARCH,
      )
    })

    it('normalizes invalid family and archive values without throwing', () => {
      expect(
        parseElectionsLandingSearch({
          family: 'invalid,local,not-a-family',
          arhiva: '99',
          sort: 'not-a-sort',
        }),
      ).toEqual({
        ...DEFAULT_ELECTIONS_LANDING_SEARCH,
        family: ['local'],
        arhiva: 0,
        sort: 'date_desc',
      })
    })

    it('keeps valid filters and trims query text', () => {
      expect(
        parseElectionsLandingSearch({
          q: '  cluj  ',
          family: 'local,prezidentiale',
          arhiva: '1',
          sort: 'name_asc',
          year: '2024',
        }),
      ).toEqual({
        q: '  cluj  ',
        family: ['local', 'prezidentiale'],
        authority: [],
        year: 2024,
        yearFrom: undefined,
        yearTo: undefined,
        round: undefined,
        arhiva: 1,
        sort: 'name_asc',
      })
    })
  })

  describe('parseElectionHubSearch', () => {
    it('returns defaults for empty search', () => {
      expect(parseElectionHubSearch(undefined)).toEqual(DEFAULT_ELECTION_HUB_SEARCH)
    })

    it('drops invalid tab and scope values', () => {
      expect(
        parseElectionHubSearch({
          tab: 'invalid',
          scope: 'invalid,siruta',
          q: 'primar',
        }),
      ).toEqual({
        tab: 'contests',
        office: [],
        scope: ['siruta'],
        q: 'primar',
      })
    })

    it('accepts summary tab and office csv', () => {
      expect(
        parseElectionHubSearch({
          tab: 'sumar',
          office: 'primar,consiliu_local',
        }),
      ).toEqual({
        tab: 'sumar',
        office: ['primar', 'consiliu_local'],
        scope: [],
        q: '',
      })
    })
  })

  describe('parseContestSearch', () => {
    it('returns defaults for empty search', () => {
      expect(parseContestSearch(undefined)).toEqual(DEFAULT_CONTEST_SEARCH)
    })

    it('normalizes invalid view, tab, and expert values', () => {
      expect(
        parseContestSearch({
          view: 'invalid',
          tab: 'invalid',
          expert: '5',
          page: '0',
          pageSize: '999',
        }),
      ).toEqual({
        ...DEFAULT_CONTEST_SEARCH,
        view: 'lista',
        tab: 'rezultate',
        expert: 0,
        page: 1,
        pageSize: 50,
      })
    })

    it('accepts explorer view and tab switches', () => {
      expect(
        parseContestSearch({
          view: 'harta',
          tab: 'mandate',
          expert: '1',
          geo: '54984',
          scope: 'siruta',
        }),
      ).toEqual({
        geo: '54984',
        scope: 'siruta',
        view: 'harta',
        metric: 'voturi',
        sort: 'votes_desc',
        expert: 1,
        compare: undefined,
        tab: 'mandate',
        page: 1,
        pageSize: 50,
      })
    })
  })
})
