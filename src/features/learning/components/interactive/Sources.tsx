type SourcesProps = {
  readonly children: React.ReactNode
}

export function Sources({ children }: SourcesProps) {
  return (
    <footer>
      <small className="block text-xs text-muted-foreground italic leading-relaxed">
        {children}
      </small>
    </footer>
  )
}
