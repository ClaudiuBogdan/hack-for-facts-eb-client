import { Button } from '@/components/ui/button'

/** A zoom control on the map's corner: 40 px under a finger, 32 px from `sm`. */
export function ZoomButton({ label, onClick, disabled, children }: { readonly label: string; readonly onClick: () => void; readonly disabled?: boolean; readonly children: React.ReactNode }) {
  return (
    <Button size="icon" variant="outline" className="size-10 bg-background/90 sm:size-8" aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  )
}
