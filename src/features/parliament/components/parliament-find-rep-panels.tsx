import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Landmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useParliamentJudete } from '../hooks/use-parliament-data'
import {
  PARLIAMENT_ACTION_BLUE,
  PARLIAMENT_CAMERA_GREEN,
  PARLIAMENT_SENAT_RED,
  parliamentHubActionClassName,
  parliamentHubFieldClassName,
  parliamentHubSectionClassName,
} from '../lib/hub-theme'
import {
  ParliamentChamberMark,
  ParliamentPromoPanel,
  ParliamentSearchPanel,
} from './parliament-hub-panel'

/** Three-column find block — UK Parliament homepage search row */
export function ParliamentFindRepPanels() {
  const navigate = useNavigate()
  const { data: judete = [] } = useParliamentJudete()
  const [cameraJudet, setCameraJudet] = useState('')
  const [senatQuery, setSenatQuery] = useState('')

  const searchCamera = () => {
    if (!cameraJudet) return
    void navigate({
      to: '/parlament',
      search: { tab: 'membri', chamber: 'camera', judet: cameraJudet },
    })
  }

  const searchSenat = () => {
    void navigate({
      to: '/parlament',
      search: {
        tab: 'membri',
        chamber: 'senat',
        q: senatQuery.trim() || undefined,
      },
    })
  }

  return (
    <section
      aria-labelledby="parliament-find-rep-heading"
      className={cn(parliamentHubSectionClassName, 'overflow-hidden')}
    >
      <h2 id="parliament-find-rep-heading" className="sr-only">
        Caută parlamentari
      </h2>

      <div className="lg:grid lg:grid-cols-3">
        <ParliamentSearchPanel
          title={
            <>
              <ParliamentChamberMark color={PARLIAMENT_CAMERA_GREEN} />
              <span>Găsește deputații din Camera Deputaților</span>
            </>
          }
          intro="Selectează județul pentru a vedea numele și detaliile deputaților aleși în circumscripția respectivă."
          footerLink={{
            to: '/parlament',
            search: { tab: 'membri', chamber: 'camera' },
            label: 'Vezi toți deputații',
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault()
              searchCamera()
            }}
          >
            <Label htmlFor="camera-judet" className="text-base font-bold text-[var(--pnrr-fg)]">
              Județ
            </Label>
            <div className="mt-2 flex">
              <Select value={cameraJudet} onValueChange={setCameraJudet}>
                <SelectTrigger id="camera-judet" className={parliamentHubFieldClassName}>
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
                type="submit"
                disabled={!cameraJudet}
                className={parliamentHubActionClassName}
                style={{ backgroundColor: PARLIAMENT_ACTION_BLUE }}
              >
                Caută
              </Button>
            </div>
          </form>
        </ParliamentSearchPanel>

        <ParliamentSearchPanel
          title={
            <>
              <ParliamentChamberMark color={PARLIAMENT_SENAT_RED} />
              <span>Găsește senatorii din Senat</span>
            </>
          }
          intro="Introdu numele senatorului pentru a găsi detalii despre un membru al Senatului."
          footerLink={{
            to: '/parlament',
            search: { tab: 'membri', chamber: 'senat' },
            label: 'Vezi toți senatorii',
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault()
              searchSenat()
            }}
          >
            <Label htmlFor="senat-search" className="text-base font-bold text-[var(--pnrr-fg)]">
              Nume senator
            </Label>
            <div className="mt-2 flex">
              <Input
                id="senat-search"
                placeholder="Ex: Popescu"
                value={senatQuery}
                onChange={(event) => setSenatQuery(event.target.value)}
                className={parliamentHubFieldClassName}
              />
              <Button
                type="submit"
                className={parliamentHubActionClassName}
                style={{ backgroundColor: PARLIAMENT_ACTION_BLUE }}
              >
                Caută
              </Button>
            </div>
          </form>
        </ParliamentSearchPanel>

        <ParliamentPromoPanel
          title="Bugetul instituțiilor parlamentare"
          description="Descoperă cheltuielile publice ale Camerei Deputaților, Senatului și instituțiilor conexe."
          image={
            <div className="flex aspect-[16/10] items-center justify-center bg-[var(--pnrr-subtle)]">
              <Landmark
                className="h-16 w-16 text-[var(--pnrr-muted)]/35"
                strokeWidth={1}
                aria-hidden
              />
            </div>
          }
          action={
            <Button
              variant="outline"
              className="h-10 w-full rounded-none border-2 bg-[var(--pnrr-card)] text-base font-semibold hover:bg-[var(--pnrr-hover)]"
              style={{ borderColor: PARLIAMENT_ACTION_BLUE, color: PARLIAMENT_ACTION_BLUE }}
              asChild
            >
              <Link to="/buget-national-2026">Deschide bugetul</Link>
            </Button>
          }
          footerLink={{
            to: '/parlament',
            search: { tab: 'voturi' },
            label: 'Vezi voturile recente',
          }}
        />
      </div>
    </section>
  )
}
