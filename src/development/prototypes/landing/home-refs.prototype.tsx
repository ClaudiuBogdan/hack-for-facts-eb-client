import type { PrototypeDefinition } from '@/development/harness/entry'
import { LandingRefsGrid } from './home-refs.grid'
import { LandingRefsForge } from './home-refs.forge'

/**
 * Landing page, round two — the reference study.
 *
 * Round one (`landing/home`) decided information architecture: baseline vs a
 * grouped table of contents vs an intent-led hero. Both variants here adopt the
 * grouped index, so this round varies only skin and grid structure.
 *
 * Source material: ui8.ai/forge, vercel.com/ai-sdk, opentrain.ai. Six claims in
 * the brief written from them do not survive the screenshots:
 *
 * - Vercel's AI SDK page and OpenTrain are both *light*. The dark canvas comes
 *   from Forge alone, which is one reference of three.
 * - Forge's primary CTA is solid orange, not the neutral white/black the brief
 *   recommends.
 * - Vercel's buttons are full pills and its code panel is ~12px, not the
 *   "0–8px, no pills" rule.
 * - Vercel's hero has no visible grid at all; OpenTrain's is a faint lattice on
 *   a white background.
 * - OpenTrain floats shadowed cards over a globe, which the brief lists as an
 *   anti-pattern.
 * - The 45% Vercel / 30% Forge weighting cannot produce a dark canvas, because
 *   the 45% reference is white.
 *
 * What does transfer is structure, and it is skin-agnostic: the continuous
 * lattice, cells sharing borders instead of floating, asymmetric section
 * headers, display type with tight tracking, monospace numbering, and section
 * boundaries drawn as hairlines. `grid` applies all of it on this app's own
 * light system; `forge` applies it on the brief's dark orange skin so the cost
 * is visible rather than argued.
 */
export const prototype = {
  title: 'Landing page — reference study (Forge / Vercel / OpenTrain)',
  spec: 'docs/user-stories/landing-page.md',
  variants: {
    grid: {
      title: 'Grid — references’ structure on this app’s system',
      component: LandingRefsGrid,
      note: 'Lattice, shared-border cells, split section header, display type — on the shipped light neutral-navy skin.',
    },
    forge: {
      title: 'Forge — the brief taken literally',
      component: LandingRefsForge,
      note: 'Same structure on a near-black canvas with one orange accent. Note the shell around it stays light.',
    },
  },
  compare: ['grid', 'forge'],
} satisfies PrototypeDefinition
