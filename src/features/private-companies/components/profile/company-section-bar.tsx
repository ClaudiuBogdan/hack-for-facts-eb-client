import type { ReactNode } from 'react'
import { CompanySectionBar, CompanySectionBarPending, type CompanyBarSection } from '../company-section-bar'
import { PROFILE_SECTIONS, type ProfileSection } from './company-profile-sections'

/** The profile's sections with their words resolved now, at render (never frozen in one locale). */
function resolved(sections: readonly ProfileSection[]): readonly CompanyBarSection[] {
  return sections.map((section) => ({ id: section.id, label: section.label(), icon: section.icon }))
}

/** The profile's pinned bar: the company's name, then its bands (`CompanySectionBar`). */
export function ProfileSectionBar({ name, sections }: { readonly name: string; readonly sections: readonly ProfileSection[] }) {
  return <CompanySectionBar name={name} sections={resolved(sections)} />
}

/**
 * The bar while the company loads: the same frame and words, inert, the
 * name a pulse. Litigation is left out, as on every profile today (no
 * name-to-CUI link is published); a company without statements loses „An cu
 * an" when it arrives, a change along the bar, never in its height.
 */
export function ProfileSectionBarPending({ name }: { readonly name: ReactNode }) {
  return <CompanySectionBarPending name={name} sections={resolved(PROFILE_SECTIONS.filter((section) => section.id !== 'litigii'))} />
}
