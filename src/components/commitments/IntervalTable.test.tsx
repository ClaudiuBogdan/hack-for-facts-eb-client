import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCommitmentPeriods, type CommitmentPeriodPage } from '@/lib/api/commitment-periods'
import { CommitmentIntervalTable } from './IntervalTable'
vi.mock('@/lib/api/commitment-periods',async(importOriginal)=>({...await importOriginal<typeof import('@/lib/api/commitment-periods')>(),fetchCommitmentPeriods:vi.fn()}))
const page:CommitmentPeriodPage={metadataAvailable:true,total:1,earliestTerminalMonth:8,latestTerminalMonth:12,items:[{
  reportId:'one',sectorId:2,creditorCui:null,sourceUrl:'https://example.com/report',startMonth:4,endMonth:8,monthsCovered:5,observation:'values',continuity:'gap',isQuarterly:false,isLatestYtd:true,isYearEnd:false,
  amounts:[{metric:'credite_angajament',interval:'90071992547434.91',ytd:'90071992547434.91'},{metric:'plati_trezor',interval:'0.00',ytd:'1.00'},{metric:'plati_non_trezor',interval:null,ytd:null}],
}]}
function mount(selection={},change=vi.fn()){
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}})
 render(<QueryClientProvider client={client}><CommitmentIntervalTable cui="4505359" year={2025} reportType="COMMITMENT_DETAILED" selection={selection} onSelectionChange={change}/></QueryClientProvider>)
 return change
}
beforeEach(()=>{vi.clearAllMocks();vi.mocked(fetchCommitmentPeriods).mockResolvedValue(page)})
describe('reported interval table',()=>{
 it('shows exact dates, nominal units, mixed coverage, zero and unavailable distinctly',async()=>{
   mount()
   expect(await screen.findByText('90 071 992 547 434.91')).toBeInTheDocument()
   expect(screen.getByText('2025-04 – 2025-08')).toBeInTheDocument()
   expect(screen.getByText('0.00')).toBeInTheDocument()
   expect(screen.getByText(/Some sectors do not have a December/)).toBeInTheDocument()
   expect(screen.getByText(/Nominal RON/)).toBeInTheDocument()
   expect(screen.getByRole('link',{name:'Report'})).toHaveAttribute('href','https://example.com/report')
 })
 it('does not render unavailable metadata as an empty successful table',async()=>{
   vi.mocked(fetchCommitmentPeriods).mockResolvedValue({...page,metadataAvailable:false,total:0,items:[]})
   mount()
   expect(await screen.findByText(/Verified interval data is not available/)).toBeInTheDocument()
   expect(screen.queryByRole('table')).not.toBeInTheDocument()
 })
 it('reports transport errors and allows retry',async()=>{
   vi.mocked(fetchCommitmentPeriods).mockRejectedValue(new Error('offline'))
   mount()
   expect(await screen.findByRole('alert')).toHaveTextContent('Reported intervals could not be loaded.')
 })
 it('updates shareable month filters and resets the page',()=>{
   const change=mount({commitments_period_page:3})
   fireEvent.change(screen.getByLabelText('Report ending from month'),{target:{value:'4'}})
   expect(change).toHaveBeenCalledWith({commitments_from_month:4,commitments_period_page:1})
 })
 it('does not request an inverted interval',()=>{
   mount({commitments_from_month:10,commitments_to_month:3})
   expect(screen.getByRole('alert')).toHaveTextContent('The starting month must not follow the ending month.')
   expect(fetchCommitmentPeriods).not.toHaveBeenCalled()
 })
})
