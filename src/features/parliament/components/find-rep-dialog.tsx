import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useParliamentJudete } from '../hooks/use-parliament-data'

type Props = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

/** Find-your-representative flow by județ */
export function FindRepDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate()
  const { data: judete = [] } = useParliamentJudete()
  const [selectedJudet, setSelectedJudet] = useState<string>('')

  useEffect(() => {
    if (!open) setSelectedJudet('')
  }, [open])

  const handleSubmit = () => {
    if (!selectedJudet) return
    onOpenChange(false)
    void navigate({
      to: '/parlament',
      search: {
        tab: 'membri',
        judet: selectedJudet,
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Găsește reprezentantul tău</DialogTitle>
          <DialogDescription>
            Selectează județul pentru a vedea deputații și senatorii aleși în
            circumscripția respectivă.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Select value={selectedJudet} onValueChange={setSelectedJudet}>
            <SelectTrigger aria-label="Județ">
              <SelectValue placeholder="Alege județul" />
            </SelectTrigger>
            <SelectContent>
              {judete.map((j) => (
                <SelectItem key={j.slug} value={j.slug}>
                  {j.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="w-full"
            disabled={!selectedJudet}
            onClick={handleSubmit}
          >
            Arată reprezentanții
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
