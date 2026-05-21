import type { ReactNode } from 'react'

export type PrivateCompanyPageShellSlots = {
  readonly header: ReactNode
  readonly tabNav: ReactNode
  readonly children: ReactNode
}

export type PrivateCompanyLayoutProps = PrivateCompanyPageShellSlots

export type PrivateCompanyPageShellProps = PrivateCompanyPageShellSlots
