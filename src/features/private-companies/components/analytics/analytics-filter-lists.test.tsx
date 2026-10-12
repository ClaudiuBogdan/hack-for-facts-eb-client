import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CompanyAnalysisScope } from '@/schemas/company-analytics'
import { CodesField, FilingField, FlagField, RangeField, SizeField } from './analytics-filter-fields'

/**
 * The filters panel's lists (the owner, 3 October 2026): past four values
 * one column, past eight a search and a scrolled list; what was picked when
 * the panel opened comes first and a pick stays where it was clicked;
 * nothing above a list changes when it is picked from.
 */

const options = vi.hoisted(() => ({ groups: [] as { key: string; label: string | null }[], read: 'done' as 'done' | 'pending' | 'failed' }))

vi.mock('../../hooks/use-company-analytics', () => ({
  useCompanyAnalysisOptions: () => ({
    data: options.read === 'done' ? { groups: options.groups } : undefined,
    isError: options.read === 'failed',
    isPending: options.read === 'pending',
    refetch: vi.fn(),
  }),
}))

const LEGAL_FORMS = ['SRL', 'SA', 'SNC', 'SC', 'SCS', 'RA', 'SCA', 'SE', 'SCE', 'GIE', 'GEIE', 'INCD']

const boxes = (name: string) => within(screen.getByRole('group', { name })).getAllByRole('checkbox')
const names = (name: string) => boxes(name).map((box) => box.textContent)

beforeEach(() => {
  options.groups = LEGAL_FORMS.map((key) => ({ key, label: null }))
  options.read = 'done'
})

describe('the filters panel lists', () => {
  it('lists the legal forms in one column, by code and name, under a search', () => {
    render(<CodesField label="Formă juridică" dimension="LEGAL_FORM" question={null} open values={['SRL']} onToggle={vi.fn()} />)
    expect(boxes('Formă juridică')).toHaveLength(12)
    expect(boxes('Formă juridică')[0]).toHaveTextContent('SRL Societate cu răspundere limitată')
    expect(boxes('Formă juridică')[0]).toHaveAttribute('aria-checked', 'true')
    const search = screen.getByRole('textbox', { name: 'Caută: Formă juridică' })
    fireEvent.change(search, { target: { value: 'coop' } })
    expect(names('Formă juridică')).toEqual(['SC Societate cooperativă', 'SCE Societate cooperativă europeană'])
    // By its code too, without the diacritics.
    fireEvent.change(search, { target: { value: 'geie' } })
    expect(names('Formă juridică')).toEqual(['GEIE Grup european de interes economic'])
    fireEvent.change(search, { target: { value: 'zzz' } })
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.getAllByText('Nimic pentru „zzz".').length).toBeGreaterThan(0)
  })

  it('puts first what was picked when the panel opened, and leaves a new pick where it was clicked', () => {
    const onToggle = vi.fn()
    const view = render(<CodesField label="Formă juridică" dimension="LEGAL_FORM" question={null} open values={['RA']} onToggle={onToggle} />)
    expect(names('Formă juridică').slice(0, 3)).toEqual(['RA Regie autonomă', 'SRL Societate cu răspundere limitată', 'SA Societate pe acțiuni'])
    fireEvent.click(screen.getByRole('checkbox', { name: 'SA Societate pe acțiuni' }))
    expect(onToggle).toHaveBeenCalledWith('SA')
    view.rerender(<CodesField label="Formă juridică" dimension="LEGAL_FORM" question={null} open values={['RA', 'SA']} onToggle={onToggle} />)
    expect(names('Formă juridică').slice(0, 3)).toEqual(['RA Regie autonomă', 'SRL Societate cu răspundere limitată', 'SA Societate pe acțiuni'])
    expect(screen.getByRole('checkbox', { name: 'SA Societate pe acțiuni' })).toHaveAttribute('aria-checked', 'true')
  })

  it('writes the statuses with a capital and offers the unknown group as the last value', () => {
    options.groups = [
      { key: '1048', label: 'funcțiune' },
      { key: '1084', label: 'radiată' },
    ]
    const onUnknown = vi.fn()
    render(<CodesField label="Stare ONRC" dimension="OBSERVED_STATUS" question={null} open values={[]} onToggle={vi.fn()} onUnknown={onUnknown} />)
    expect(names('Stare ONRC')).toEqual(['Funcțiune', 'Radiată', 'Fără stare comună (orice motiv)'])
    fireEvent.click(screen.getByRole('checkbox', { name: 'Fără stare comună (orice motiv)' }))
    expect(onUnknown).toHaveBeenCalled()
  })

  it('has its search from the start, not inserted above the list once the values arrive', () => {
    options.read = 'pending'
    // A new element each time: the same one would let React skip the render the options' arrival makes.
    const field = () => <CodesField label="Formă juridică" dimension="LEGAL_FORM" question={null} open values={['SRL']} onToggle={vi.fn()} />
    const view = render(field())
    const search = screen.getByRole('textbox', { name: 'Caută: Formă juridică' })
    expect(names('Formă juridică')).toEqual(['SRL Societate cu răspundere limitată'])
    options.read = 'done'
    view.rerender(field())
    expect(screen.getByRole('textbox', { name: 'Caută: Formă juridică' })).toBe(search)
    expect(boxes('Formă juridică')).toHaveLength(12)
  })

  it('keeps the unknown status picked and reachable when the list cannot be read', () => {
    options.read = 'failed'
    const onUnknown = vi.fn()
    render(<CodesField label="Stare ONRC" dimension="OBSERVED_STATUS" question={null} open values={[]} unknown onToggle={vi.fn()} onUnknown={onUnknown} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Lista nu s-a putut citi.')
    const box = screen.getByRole('checkbox', { name: 'Fără stare comună (orice motiv)' })
    expect(box).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(box)
    expect(onUnknown).toHaveBeenCalled()
  })

  it('lists the size bands in one column, by size, with what a statement could not place last', () => {
    render(<SizeField scope={{}} onChange={vi.fn()} />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(names('Mărime')).toEqual([
      '0 salariați',
      '1–9 salariați',
      '10–49 salariați',
      '50–249 salariați',
      '250 de salariați sau mai mulți',
      'Fără număr de salariați raportat',
      'Număr negativ raportat',
    ])
  })

  it('says a statement filter keeps only the filers under the size list, never above it, its room always kept', () => {
    const NOTE = 'Filtrele pe valori și pe mărime păstrează doar firmele care au depus.'
    const panel = (scope: CompanyAnalysisScope) => (
      <>
        <FilingField scope={scope} year={2024} onChange={vi.fn()} />
        <SizeField scope={scope} onChange={vi.fn()} />
      </>
    )
    const view = render(panel({}))
    // Unsaid, it keeps its room: a note that came or left with a pick would move the list (or the panel's scroll).
    const note = screen.getByText(NOTE)
    expect(note).toHaveClass('invisible')
    expect(screen.getByRole('group', { name: 'Mărime' }).compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    view.rerender(panel({ employeeSizeBands: ['FROM_10_TO_49'] }))
    expect(screen.getByText(NOTE)).not.toHaveClass('invisible')
    // Unticked again, and picked as „Au depus" (the filers are already all it reads): unsaid, in the same room.
    view.rerender(panel({}))
    expect(screen.getByText(NOTE)).toHaveClass('invisible')
    view.rerender(panel({ filing: 'FILED', employeeSizeBands: ['FROM_10_TO_49'] }))
    expect(screen.getByText(NOTE)).toHaveClass('invisible')
  })

  it('keeps three short values side by side', () => {
    render(<FlagField label="Plătitor de TVA" values={['YES']} onChange={vi.fn()} />)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Da' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Necunoscut' }).parentElement).toBe(screen.getByRole('button', { name: 'Da' }).parentElement)
  })
})

describe('the values on the answer’s measure', () => {
  it('ranges the measure the answer is in without naming it again, and another measure one click away', () => {
    const onChange = vi.fn()
    render(<RangeField scope={{}} offered={['TURNOVER', 'NET_RESULT', 'EMPLOYEES']} preferred="NET_RESULT" max={6} onChange={onChange} />)
    expect(screen.queryByRole('combobox', { name: 'Indicatorul filtrului' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Rezultatul net: valoarea minimă' }), { target: { value: '1000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adaugă' }))
    expect(onChange).toHaveBeenCalledWith({ filing: undefined, financialRanges: [{ metric: 'NET_RESULT', min: '1000' }] })
    fireEvent.click(screen.getByRole('button', { name: 'Pe alt indicator' }))
    expect(screen.getByRole('combobox', { name: 'Indicatorul filtrului' })).toHaveTextContent('Rezultatul net')
    // The button went with the focus: it lands on the dropdown it revealed.
    expect(screen.getByRole('combobox', { name: 'Indicatorul filtrului' })).toHaveFocus()
  })

  it('lets bounds typed for one measure go when the measure changes', () => {
    const view = render(<RangeField scope={{}} offered={['TURNOVER', 'EMPLOYEES']} preferred="TURNOVER" max={6} onChange={vi.fn()} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Cifra de afaceri: valoarea minimă' }), { target: { value: '100000' } })
    view.rerender(<RangeField scope={{}} offered={['TURNOVER', 'EMPLOYEES']} preferred="EMPLOYEES" max={6} onChange={vi.fn()} />)
    expect(screen.getByRole('textbox', { name: 'Numărul mediu de salariați: valoarea minimă' })).toHaveValue('')
  })

  it('asks which measure once the answer’s own is ranged already', () => {
    render(<RangeField scope={{ financialRanges: [{ metric: 'NET_RESULT', min: '1000' }] }} offered={['TURNOVER', 'NET_RESULT']} preferred="NET_RESULT" max={6} onChange={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: 'Indicatorul filtrului' })).toHaveTextContent('Cifra de afaceri')
    expect(screen.queryByRole('button', { name: 'Pe alt indicator' })).not.toBeInTheDocument()
  })
})
