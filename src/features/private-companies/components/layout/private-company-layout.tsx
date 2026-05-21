import './company-page.css'
import type { PrivateCompanyLayoutProps } from './types'

const PAGE_GUTTER = 'mx-auto w-full max-w-[48rem] px-4 sm:px-6 lg:px-8'

export function PrivateCompanyLayout({
  header,
  tabNav,
  children,
}: PrivateCompanyLayoutProps) {
  return (
    <div className="company-page-v2 min-h-screen bg-background">
      <div
        className="border-b bg-[var(--company-bg)]"
        style={{ borderColor: 'var(--company-border)' }}
      >
        <div className={`${PAGE_GUTTER} pt-2.5 pb-0 sm:pt-4`}>
          {header}
          <div className="-mx-4 mt-2 sm:-mx-6 lg:-mx-8">{tabNav}</div>
        </div>
      </div>
      <main
        id="company-main-content"
        className={`${PAGE_GUTTER} py-4 sm:py-5`}
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  )
}
