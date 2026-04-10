# Map Editor Design Principles

## Philosophy

Clean, professional interfaces inspired by Vercel and Notion. Prioritize clarity over decoration. Every element must earn its place.

## Core Principles

### 1. Restrained Design System
- No decorative gradients unless tied to brand identity
- No generic analytics-dashboard clichés (no oversized charts, no noise)
- Avoid equal-weight cards everywhere—create visual hierarchy
- Avoid oversized hero sections unless the task specifically requires them
- No "AI slop" design patterns—avoid generic icon soup and decorative flourishes

### 2. 8pt Spacing System
All spacing follows an 8px grid:
- `py-2` = 8px
- `py-3` = 12px
- `py-4` = 16px
- `gap-2` = 8px
- `gap-4` = 16px
- Container padding: `px-6` = 24px

### 3. Strong Visual Hierarchy
- Primary actions: `font-semibold` with clear button labels
- Secondary text: `text-muted-foreground` at `text-sm` or `text-xs`
- Titles: `text-xl` to `text-2xl` with `font-semibold` and `tracking-tight`
- Metadata: smallest size (`text-xs`), muted color

### 4. Compact Clarity
- List items: minimal padding, clear separation via borders or subtle backgrounds
- Actions appear on hover (`opacity-0 group-hover:opacity-100`)
- No unnecessary card shadows or borders—use `divide-y` for lists
- Each row is a single clickable/accessible unit

### 5. Accessibility First
- All interactive elements have visible focus states (`focus-visible:ring-*`)
- Icon-only buttons have `aria-label`
- Decorative icons have `aria-hidden="true"`
- Color contrast meets WCAG 2.1 AA standards
- Keyboard navigation fully supported

### 6. Professional Loading States
- Page-centered loading indicators
- Text label above the loading animation (e.g., "Loading maps")
- Simple dot animation (no spinners or progress bars unless needed)
- Consistent with 8pt spacing

### 7. Status Indicators
Use badges/pills for states:
```tsx
// Public
<span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">

// Private
<span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-600/10">
```

### 8. List Design Pattern
- Contained within a rounded border (`rounded-lg border border-border/60`)
- Divided rows (`divide-y divide-border/60`)
- Hover state on entire row (`hover:bg-muted/50`)
- Actions (Open, Options) appear on hover
- Chevrons indicate navigation (`ChevronRight`)

### 9. Dialog Patterns
- Standard shadcn Dialog with `sm:max-w-md` or `sm:max-w-lg`
- Title: `text-lg font-medium`
- Description: `text-muted-foreground`
- Actions right-aligned with Cancel/Confirm pattern
- Loading states use same dot animation as main loader

### 10. Typography Rules
- Headings use `tracking-tight` for better readability
- Use `…` (ellipsis character) not `...`
- Loading states: "Loading maps" (no ellipsis, dots provide animation)
- Button labels: specific actions ("Create map" not "Submit")
- Dates/times: use `Intl.DateTimeFormat` not hardcoded formats

### 11. Container Standards
- Max width: `max-w-5xl` (1024px) for main content
- Centered: `mx-auto`
- Responsive padding: `px-6` (24px on all sides)
- Header margin: `mb-8` (32px)

### 12. Empty States
- Centered content with border
- Primary message: `text-sm font-medium text-foreground`
- Secondary message: `text-sm text-muted-foreground`
- No decorative illustrations unless essential

### 13. Internationalization (i18n)
- All user-facing text uses Lingui macros: `t\`Text\``
- Romanian translations provided in `src/locales/ro/messages.po`
- Extract with `yarn i18n:extract`, compile with `yarn i18n:compile`
- Typecheck after any i18n changes

## Component Patterns

### Map List Item
```tsx
<div className="group flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/50">
  <div className="min-w-0 flex-1">
    <div className="flex items-center gap-2">
      <span className="truncate text-sm font-medium">{title}</span>
      <MapVisibility state={state} />
    </div>
    <p className="mt-0.5 text-xs text-muted-foreground">
      {count} snapshots · updated {date}
    </p>
  </div>
  <div className="flex items-center gap-1">
    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
      Open <ChevronRight />
    </Button>
    <DropdownMenu>
      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
        <MoreHorizontal />
      </Button>
    </DropdownMenu>
  </div>
</div>
```

### Loading State
```tsx
<div className="flex min-h-[50vh] flex-col items-center justify-center">
  <p className="mb-4 text-sm text-muted-foreground">Loading maps</p>
  <div className="flex items-center">
    <div className="h-2 w-2 animate-pulse rounded-full bg-foreground/40" />
    <div className="ml-2 h-2 w-2 animate-pulse rounded-full bg-foreground/40 delay-75" />
    <div className="ml-2 h-2 w-2 animate-pulse rounded-full bg-foreground/40 delay-150" />
  </div>
</div>
```

## Anti-Patterns (Avoid)

- `transition: all` — always list specific properties
- `outline-none` without focus replacement
- Inline `onClick` navigation without `<a>` or `<Link>`
- Images without dimensions (causes CLS)
- Generic icon-only buttons without labels
- Decorative gradients without brand purpose
- Oversized hero sections for simple list views
- Equal visual weight for all elements (no hierarchy)
- AI-generated decorative elements

## Testing

Run before completing:
```bash
yarn typecheck
yarn test -- --run src/features/advanced-map-analytics/components/map-analytics-list-page.test.tsx
yarn i18n:extract && yarn i18n:compile
```
