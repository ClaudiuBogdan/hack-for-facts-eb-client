import { beforeEach, describe, expect, it, vi } from 'vitest'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { fetchCommitmentPeriods, formatCommitmentAmount, nativeCommitmentReportType } from './commitment-periods'
vi.mock('@/lib/graphql/graphql-client',()=>({graphqlQuery:vi.fn()}))
beforeEach(()=>vi.clearAllMocks())
describe('native commitment periods',()=>{
  it('keeps cents beyond the safe number range',()=>{
    expect(formatCommitmentAmount('90071992547434.91')).toBe('90 071 992 547 434.91')
    expect(formatCommitmentAmount('-1234.5')).toBe('-1 234.50')
    expect(formatCommitmentAmount('0')).toBe('0.00')
    expect(formatCommitmentAmount(null)).toBe('—')
  })
  it('maps legacy report types explicitly and refuses unknown ones',()=>{
    expect(nativeCommitmentReportType('PRINCIPAL_AGGREGATED')).toBe('COMMITMENT_AGG_PRINCIPAL')
    expect(nativeCommitmentReportType('COMMITMENT_SECONDARY_AGGREGATED')).toBe('COMMITMENT_AGG_SECONDARY')
    expect(()=>nativeCommitmentReportType('wrong')).toThrow()
  })
  it('uses the native client with public auth, cancellation and an explicit endpoint window',async()=>{
    const page={metadataAvailable:false,total:0,earliestTerminalMonth:null,latestTerminalMonth:null,items:[]}
    vi.mocked(graphqlQuery).mockResolvedValue({budgetCommitmentPeriods:page})
    const input={cui:'4505359',year:2025,reportType:'PRINCIPAL_AGGREGATED',startMonth:4,endMonth:8,page:2}
    const signal=new AbortController().signal
    expect(await fetchCommitmentPeriods(input,signal)).toEqual(page)
    expect(graphqlQuery).toHaveBeenCalledWith(expect.stringContaining('budgetCommitmentPeriods'),{...input,reportType:'COMMITMENT_AGG_PRINCIPAL'},{signal,auth:'none'})
  })
  it('rejects malformed coverage and missing metrics instead of displaying unavailable values',async()=>{
    const input={cui:'4505359',year:2025,reportType:'DETAILED',startMonth:1,endMonth:12,page:1}
    vi.mocked(graphqlQuery).mockResolvedValue({budgetCommitmentPeriods:{metadataAvailable:true,total:0,earliestTerminalMonth:99,latestTerminalMonth:12,items:[]}})
    await expect(fetchCommitmentPeriods(input)).rejects.toThrow()
    vi.mocked(graphqlQuery).mockResolvedValue({budgetCommitmentPeriods:{metadataAvailable:true,total:1,earliestTerminalMonth:8,latestTerminalMonth:8,items:[{
      reportId:'one',sectorId:2,creditorCui:null,sourceUrl:'https://example.com/report',startMonth:4,endMonth:8,monthsCovered:5,observation:'values',continuity:'gap',isQuarterly:false,isLatestYtd:true,isYearEnd:false,amounts:[],
    }]}})
    await expect(fetchCommitmentPeriods(input)).rejects.toThrow()
  })

})
