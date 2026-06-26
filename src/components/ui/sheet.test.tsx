import { describe, expect, it } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { Sheet, SheetContent, SheetTitle } from './sheet'

describe('SheetContent', () => {
  it('uses a translated default close label', () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Detalii</SheetTitle>
        </SheetContent>
      </Sheet>,
    )

    expect(screen.getByRole('button', { name: 'Închide' })).toBeInTheDocument()
  })

  it('allows a custom close label when a surface needs one', () => {
    render(
      <Sheet open>
        <SheetContent closeLabel="Închide panoul">
          <SheetTitle>Detalii</SheetTitle>
        </SheetContent>
      </Sheet>,
    )

    expect(screen.getByRole('button', { name: 'Închide panoul' })).toBeInTheDocument()
  })
})
