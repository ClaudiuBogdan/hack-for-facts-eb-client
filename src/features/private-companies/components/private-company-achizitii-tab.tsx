import { Trans } from '@lingui/react/macro'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { ProcurementSupplierSlice } from '@/features/procurement/components/procurement-supplier-slice'

type Props = {
  readonly profile: PrivateCompanyProfile
}

/**
 * "Achiziții publice" tab on the private-company page. Renders the supplier
 * procurement slice scoped to the company CUI. The slice is procurement-
 * sourced revenue (not company turnover, which lives in the `financials`
 * tab). See docs/design/procurement/features/supplier-procurement-slice.md.
 */
export function PrivateCompanyAchizitiiTab({ profile }: Props) {
  const supplierCui = profile.cui
  if (!supplierCui) {
    return (
      <p className="text-sm text-muted-foreground">
        <Trans>CUI indisponibil — achizițiile publice nu pot fi rezolvate.</Trans>
      </p>
    )
  }
  return <ProcurementSupplierSlice supplierCui={supplierCui} />
}
