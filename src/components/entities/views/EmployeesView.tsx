import { EntityDetailsData } from '@/lib/api/entities'
import { useCsvData } from '@/hooks/useCsvData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Link } from '@tanstack/react-router'
import { Info, Users, BarChart3, MapPin } from 'lucide-react'
import { EntityEmployeesDataInfo } from '../EntityEmployeesDataInfo'
import { CalculationLegend } from './CalculationLegend'
import { Trans } from '@lingui/react/macro'

const EMPLOYEES_DATA_DISCLAIMER_ID = 'employees-data-disclaimer'

export function EmployeesView({ entity }: { entity: EntityDetailsData | null | undefined }) {
  const { data, isLoading, error } = useCsvData()
  const siruta = entity?.uat?.siruta_code
  const row = data?.find(r => r.sirutaCode === (Number(siruta) || -1))

  if (error) return <div className="p-4 text-red-600 dark:text-red-500">{error.message}</div>
  if (isLoading) return <div className="p-4 text-muted-foreground">Se încarcă datele analitice...</div>
  if (!row || !data) return <div className="p-4 text-muted-foreground">Nu au fost găsite date specifice pentru această entitate.</div>

  // Corrected calculations based on provided formulas
  const G = row.maxPostsFromOUG63 ?? 0
  const J = row.popRegistryPosts ?? 0
  const L = row.onePolicePer1200Pop ?? 0
  const M = row.euProjectsImplementationPosts ?? 0
  const N = row.schoolBusDriversPosts ?? 0
  const O = row.euProjectsPostImplementationPosts ?? 0

  const commonPart = J + L + M + N + O
  const legalLimit40 = Math.round((G * 0.6) + commonPart)
  const legalLimit45 = Math.round((G * 0.55) + commonPart)

  const occupancyVsLimit = legalLimit45 > 0 ? (row.occupiedPosts / legalLimit45) : 0
  const occupancyVsLimit40 = legalLimit40 > 0 ? (row.occupiedPosts / legalLimit40) : 0
  const surplus = Math.max(0, row.occupiedPosts - legalLimit45)
  const surplus40 = Math.max(0, row.occupiedPosts - legalLimit40)
  const deficit = Math.max(0, legalLimit45 - row.occupiedPosts)
  const reductionPercent = surplus > 0 && row.occupiedPosts > 0 ? (surplus / row.occupiedPosts) * 100 : 0

  // Additional derived stats from raw fields
  const euProjectsTotal = (row.euProjectsImplementationPosts ?? 0) + (row.euProjectsPostImplementationPosts ?? 0)
  const vacantPosts = Math.max(0, (row.totalPostsActual ?? 0) - (row.occupiedPosts ?? 0))
  const vacancyRate = (row.totalPostsActual ?? 0) > 0 ? (vacantPosts / (row.totalPostsActual ?? 0)) * 100 : 0
  const headroomToMax = Math.max(0, (row.maxPostsFromOUG63 ?? 0) - (row.totalPostsActual ?? 0))
  const overMax = Math.max(0, (row.totalPostsActual ?? 0) - (row.maxPostsFromOUG63 ?? 0))
  const hasPopulation = (row.uatPopulation ?? 0) > 0

  const calculatePercentile = (arr: number[], value: number) => {
    let pos = 0
    while (pos < arr.length && arr[pos] <= value) pos++
    return Math.round((pos / arr.length) * 100)
  }
  const employeesPer1kPercentile = hasPopulation ? calculatePercentile(data.map(r => r.employeesPer1000Capita).sort((a, b) => a - b), row.employeesPer1000Capita) : null
  const occupancyPercentile = calculatePercentile(data.map(r => { const limit = Math.max(0, r.totalPostsReduction45); return limit > 0 ? r.occupiedPosts / limit : 0; }).sort((a, b) => a - b), occupancyVsLimit)

  // Rank (1..N) for extra clarity next to percentiles
  const dataWithoutCounty = data.filter(r => !r.uatName.toLowerCase().startsWith("cj") && r.uatPopulation > 0)
  const totalEntities = dataWithoutCounty.length
  const computeRank = (sortedArr: number[], value: number) => {
    let pos = 0
    while (pos < sortedArr.length && sortedArr[pos] <= value) pos++
    return Math.max(1, pos)
  }
  const employeesPer1kRank = hasPopulation ? computeRank(dataWithoutCounty.map(r => r.employeesPer1000Capita).sort((a, b) => a - b), row.employeesPer1000Capita) : null
  const occupancyRank = computeRank(dataWithoutCounty.map(r => { const limit = Math.max(0, r.totalPostsReduction45); return limit > 0 ? r.occupiedPosts / limit : 0 }).sort((a, b) => a - b), occupancyVsLimit)

  const barWidthPct = Math.min(100, Math.round(occupancyVsLimit * 100))
  const scenarioBarGradient = (ratio: number) => ratio <= 1
    ? 'linear-gradient(90deg, hsl(140, 60%, 82%), hsl(115, 80%, 70%))'
    : 'linear-gradient(90deg, hsl(35, 100%, 78%), hsl(0, 90%, 66%))'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border bg-muted/50 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            <Trans>
              The data is presented for informational purposes, based on government data available for September 2025. This temporary view is intended to simplify the
              Government&apos;s explanation of the simulated local administration reform.
            </Trans>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          asChild
        >
          <a href={`#${EMPLOYEES_DATA_DISCLAIMER_ID}`}>
            <Trans>Read more</Trans>
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Populație</CardTitle><MapPin className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent className="flex flex-col gap-4 flex-grow">
            <div className="flex-grow flex items-center justify-center">
              <div className="text-3xl font-extrabold text-center">{row.uatPopulation > 0 ? row.uatPopulation.toLocaleString('ro-RO') : <span className="text-sm text-muted-foreground font-normal">Nu există date suficiente pentru acest indicator.</span>}</div>
            </div>
            <p className="text-xs text-muted-foreground text-center">Conform datelor din Sept. 2025</p>
          </CardContent>
        </Card>
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Posturi Ocupate</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent className="flex flex-col gap-4 flex-grow">
            <div className="flex-grow flex items-center justify-center">
              <TooltipProvider><Tooltip delayDuration={150}>
                <TooltipTrigger asChild><div className="text-3xl font-extrabold cursor-help">{row.occupiedPosts.toLocaleString('ro-RO')}</div></TooltipTrigger>
                <TooltipContent><p>Numărul efectiv de angajați care lucrează în prezent.</p></TooltipContent>
              </Tooltip></TooltipProvider>
            </div>
            <p className="text-xs text-muted-foreground text-center">Total personal curent</p>
          </CardContent>
        </Card>
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Angajați / 1.000 Locuitori</CardTitle><BarChart3 className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent className="flex flex-col gap-4 flex-grow">
            {hasPopulation ? (
              <>
                <div className="flex-grow flex items-center justify-center">
                  <TooltipProvider><Tooltip delayDuration={150}>
                    <TooltipTrigger asChild><div className="text-3xl font-extrabold cursor-help">{(Math.round(row.employeesPer1000Capita * 100) / 100).toLocaleString('ro-RO')}</div></TooltipTrigger>
                    <TooltipContent><p>Măsoară eficiența administrativă. O valoare mai mică sugerează o administrație mai suplă.</p></TooltipContent>
                  </Tooltip></TooltipProvider>
                </div>
                <p className="text-xs text-muted-foreground text-center">Indicator de eficiență</p>
              </>
            ) : (
              <div className="flex-grow flex items-center justify-center">
                <p className="text-sm text-muted-foreground text-center">Nu există date suficiente pentru acest indicator.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Scenarii Alternative de Limită</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>Scenariu -40%</span>
                  <span className={`font-medium ${occupancyVsLimit40 > 1 ? 'text-red-500' : 'text-green-600'}`}>{Math.round(occupancyVsLimit40 * 100)}%</span>
                </div>
                <div className="h-4 rounded-md bg-muted overflow-hidden"><div className="h-full" style={{ width: `${Math.min(100, Math.round(occupancyVsLimit40 * 100))}%`, background: scenarioBarGradient(occupancyVsLimit40) }} /></div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1"><span>Ocupate: {row.occupiedPosts.toLocaleString('ro-RO')}</span><span>Limită: {legalLimit40.toLocaleString('ro-RO')}</span></div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>Scenariu -45%</span>
                  <span className={`font-medium ${occupancyVsLimit > 1 ? 'text-red-500' : 'text-green-600'}`}>{Math.round(occupancyVsLimit * 100)}%</span>
                </div>
                <div className="h-4 rounded-md bg-muted overflow-hidden"><div className="h-full" style={{ width: `${barWidthPct}%`, background: scenarioBarGradient(occupancyVsLimit) }} /></div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1"><span>Ocupate: {row.occupiedPosts.toLocaleString('ro-RO')}</span><span>Limită: {legalLimit45.toLocaleString('ro-RO')}</span></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-1 lg:col-start-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{surplus > 0 ? 'Atenție: Excedent de Personal' : 'Status: În Limitele Legale'}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col justify-center text-center">
            {surplus > 0 ? (
              <div>
                <p className="text-sm text-muted-foreground">Posturi de Redus <span className="font-semibold">(Scenariu -45%)</span></p>
                <TooltipProvider><Tooltip delayDuration={150}>
                  <TooltipTrigger asChild><p className="text-5xl font-bold text-red-500 my-1 cursor-help">{surplus.toLocaleString('ro-RO')}</p></TooltipTrigger>
                  <TooltipContent><p>Numărul exact de posturi ocupate care depășește limita legală simulată pentru această entitate.</p></TooltipContent>
                </Tooltip></TooltipProvider>
                <p className="text-base font-medium text-red-500">({Math.round(reductionPercent)}% din personalul actual)</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground">Capacitate Disponibilă</p>
                <TooltipProvider><Tooltip delayDuration={150}>
                  <TooltipTrigger asChild><p className="text-5xl font-bold text-green-600 my-1 cursor-help">{deficit.toLocaleString('ro-RO')}</p></TooltipTrigger>
                  <TooltipContent><p>Numărul de posturi suplimentare ce pot fi ocupate până la atingerea limitei legale simulate.</p></TooltipContent>
                </Tooltip></TooltipProvider>
                <p className="text-base text-muted-foreground">posturi sub limita simulată</p>
              </div>
            )}
            <Separator className="my-4" />
            <div className="text-xs text-muted-foreground space-y-1 text-left">
              <p className="font-semibold text-foreground mb-1">Limite Simulate:</p>
              <div className="flex items-center justify-between"><span>Limită (Scenariu -40%):</span><span>{legalLimit40.toLocaleString('ro-RO')}</span></div>
              {surplus40 > 0 && (
                <div className="text-right text-muted-foreground text-[10px] pl-4">
                  <span>{row.occupiedPosts.toLocaleString('ro-RO')}</span> - <span className="text-red-500 font-medium">{surplus40.toLocaleString('ro-RO')}</span> = <span className="font-bold text-foreground">{legalLimit40.toLocaleString('ro-RO')}</span>
                </div>
              )}
              <div className="flex items-center justify-between mt-2"><span>Limită (Scenariu -45%):</span><span className="font-bold">{legalLimit45.toLocaleString('ro-RO')}</span></div>
              {surplus > 0 && (
                <div className="text-right text-muted-foreground text-[10px] pl-4">
                  <span>{row.occupiedPosts.toLocaleString('ro-RO')}</span> - <span className="text-red-500 font-medium">{surplus.toLocaleString('ro-RO')}</span> = <span className="font-bold text-foreground">{legalLimit45.toLocaleString('ro-RO')}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>


        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Comparație cu Alte Entități</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {hasPopulation && employeesPer1kPercentile !== null && employeesPer1kRank !== null ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Personal per Capita</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Top <span className="font-semibold text-primary">{employeesPer1kPercentile}%</span></span>
                  <span>Locul <span className="font-semibold">{employeesPer1kRank}</span> din {totalEntities}</span>
                </div>
                <div className="mt-1"><PercentileBar value={employeesPer1kPercentile} tooltipLabel={'dintre entități'} /></div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Nu există date suficiente pentru „Personal per Capita”.</div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Ocupare vs. Limită</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Top <span className="font-semibold text-primary">{occupancyPercentile}%</span></span>
                <span>Locul <span className="font-semibold">{occupancyRank}</span> din {totalEntities}</span>
              </div>
              <div className="mt-1"><PercentileBar value={occupancyPercentile} tooltipLabel={'dintre entități'} /></div>
            </div>
          </CardContent>
        </Card>

        {/* Normative components and other relevant info */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Componente Normative Relevante</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex items-center justify-between"><TooltipProvider><Tooltip delayDuration={150}><TooltipTrigger asChild><span className="cursor-help">Evidența populației</span></TooltipTrigger><TooltipContent><p>Posturi stabilite prin legislație pentru evidența persoanelor.</p></TooltipContent></Tooltip></TooltipProvider><span className="font-medium">{row.popRegistryPosts.toLocaleString('ro-RO')}</span></div>
            <div className="flex items-center justify-between"><TooltipProvider><Tooltip delayDuration={150}><TooltipTrigger asChild><span className="cursor-help">Poliția locală (norma actuală)</span></TooltipTrigger><TooltipContent><p>Calcul curent: 1 post la 1.000 locuitori.</p></TooltipContent></Tooltip></TooltipProvider><span className="font-medium">{row.localPolicePosts.toLocaleString('ro-RO')}</span></div>
            <div className="flex items-center justify-between"><TooltipProvider><Tooltip delayDuration={150}><TooltipTrigger asChild><span className="cursor-help">Poliția locală (simulare 1/1200)</span></TooltipTrigger><TooltipContent><p>Propunere alternativă folosită în simulări.</p></TooltipContent></Tooltip></TooltipProvider><span className="font-medium">{row.onePolicePer1200Pop.toLocaleString('ro-RO')}</span></div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between"><span>Proiecte UE (implementare)</span><span className="font-medium">{row.euProjectsImplementationPosts.toLocaleString('ro-RO')}</span></div>
            <div className="flex items-center justify-between"><span>Proiecte UE (post-implementare)</span><span className="font-medium">{row.euProjectsPostImplementationPosts.toLocaleString('ro-RO')}</span></div>
            <div className="flex items-center justify-between"><span>Total Proiecte UE</span><span className="font-semibold">{euProjectsTotal.toLocaleString('ro-RO')}</span></div>
            <div className="flex items-center justify-between"><span>Șoferi microbuze școlare</span><span className="font-medium">{row.schoolBusDriversPosts.toLocaleString('ro-RO')}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Organigramă și Diferențe</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex items-center justify-between"><TooltipProvider><Tooltip delayDuration={150}><TooltipTrigger asChild><span className="cursor-help">Total posturi în organigramă</span></TooltipTrigger><TooltipContent><p>Include atât posturile ocupate, cât și cele vacante.</p></TooltipContent></Tooltip></TooltipProvider><span className="font-medium">{row.totalPostsActual.toLocaleString('ro-RO')}</span></div>
            <div className="flex items-center justify-between"><span>Posturi vacante</span><span className="font-medium">{vacantPosts.toLocaleString('ro-RO')} <span className="text-xs text-muted-foreground">({Math.round(vacancyRate)}%)</span></span></div>
            <div className="flex items-center justify-between"><TooltipProvider><Tooltip delayDuration={150}><TooltipTrigger asChild><span className="cursor-help">Maxim legal (OUG 63/2010)</span></TooltipTrigger><TooltipContent><p>Limită superioară calculată în funcție de populație.</p></TooltipContent></Tooltip></TooltipProvider><span className="font-medium">{row.maxPostsFromOUG63.toLocaleString('ro-RO')}</span></div>
            <div className="flex items-center justify-between">
              <span>Organigrama - Max. Legal</span>
              <span className={`font-medium ${overMax > 0 ? 'text-red-600' : ''}`}>{(headroomToMax > 0 ? headroomToMax : overMax).toLocaleString('ro-RO')}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between"><span>Total cu reducere -40%</span><span className="font-medium">{legalLimit40.toLocaleString('ro-RO')}</span></div>
            <div className="flex items-center justify-between"><span>Total cu reducere -45%</span><span className="font-semibold">{legalLimit45.toLocaleString('ro-RO')}</span></div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Detalii Calcul Limită Normativă</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/50">
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center cursor-help">
                      <p className="text-xs text-muted-foreground">Limită Legală OUG 63/2010 (G)</p>
                      <p className="text-3xl font-extrabold text-primary my-1">{G.toLocaleString('ro-RO')}</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Acesta este nr. max. de posturi cf. pct. 1 din anexa la O.U.G nr. 63/2010 și<br />reprezintă baza de calcul pentru reducerile normative.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="space-y-3">
              <p className="font-semibold text-foreground">Scenariu Reducere -40%</p>
              <div className="flex items-center justify-between text-xs">
                <span>Reducere (G * 40%):</span>
                <span className="font-mono p-1 bg-muted rounded-md">{Math.round(G * 0.4).toLocaleString('ro-RO')}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Bază redusă (H = G * 60%):</span>
                <span className="font-mono p-1 bg-muted rounded-md">{Math.round(G * 0.6).toLocaleString('ro-RO')}</span>
              </div>
              <Separator />
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-between text-xs cursor-help">
                      <span>Total Excepții (J+L+M+N+O):</span>
                      <span className="font-mono p-1 bg-muted rounded-md">{commonPart.toLocaleString('ro-RO')}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <div className="space-y-1 text-xs">
                      <p className="font-bold">Componenta excepțiilor:</p>
                      <p><span className="font-semibold">(J)</span> Evidența populației: {J.toLocaleString('ro-RO')}</p>
                      <p><span className="font-semibold">(L)</span> Poliția locală (1/1200): {L.toLocaleString('ro-RO')}</p>
                      <p><span className="font-semibold">(M)</span> Proiecte UE (implementare): {M.toLocaleString('ro-RO')}</p>
                      <p><span className="font-semibold">(N)</span> Șoferi microbuze: {N.toLocaleString('ro-RO')}</p>
                      <p><span className="font-semibold">(O)</span> Proiecte UE (post-impl.): {O.toLocaleString('ro-RO')}</p>
                      <p className="pt-1 text-muted-foreground text-[10px] italic">*Literele corespund coloanelor din fișierul sursă XLS.</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex items-center justify-between font-bold">
                <span>Limită Finală (Q):</span>
                <span>{legalLimit40.toLocaleString('ro-RO')}</span>
              </div>
            </div>
            <div className="space-y-3">
              <p className="font-semibold text-foreground">Scenariu Reducere -45%</p>
              <div className="flex items-center justify-between text-xs">
                <span>Reducere (G * 45%):</span>
                <span className="font-mono p-1 bg-muted rounded-md">{Math.round(G * 0.45).toLocaleString('ro-RO')}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Bază redusă (I = G * 55%):</span>
                <span className="font-mono p-1 bg-muted rounded-md">{Math.round(G * 0.55).toLocaleString('ro-RO')}</span>
              </div>
              <Separator />
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-between text-xs cursor-help">
                      <span>Total Excepții (J+L+M+N+O):</span>
                      <span className="font-mono p-1 bg-muted rounded-md">{commonPart.toLocaleString('ro-RO')}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <div className="space-y-1 text-xs">
                      <p className="font-bold">Componenta excepțiilor:</p>
                      <p><span className="font-semibold">(J)</span> Evidența populației: {J.toLocaleString('ro-RO')}</p>
                      <p><span className="font-semibold">(L)</span> Poliția locală (1/1200): {L.toLocaleString('ro-RO')}</p>
                      <p><span className="font-semibold">(M)</span> Proiecte UE (implementare): {M.toLocaleString('ro-RO')}</p>
                      <p><span className="font-semibold">(N)</span> Șoferi microbuze: {N.toLocaleString('ro-RO')}</p>
                      <p><span className="font-semibold">(O)</span> Proiecte UE (post-impl.): {O.toLocaleString('ro-RO')}</p>
                      <p className="pt-1 text-muted-foreground text-[10px] italic">*Literele corespund coloanelor din fișierul sursă XLS.</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex items-center justify-between font-bold">
                <span>Limită Finală (R):</span>
                <span>{legalLimit45.toLocaleString('ro-RO')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <CalculationLegend />

      <div id={EMPLOYEES_DATA_DISCLAIMER_ID}>
        <EntityEmployeesDataInfo />
      </div>

      <Separator />

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground max-w-md">Sursa: Gov.ro/aal (Raport Sept. 2025). Datele reflectă o simulare cu o marjă de eroare națională de ±2%.</p>
        <Button asChild variant="outline" size="sm"><Link to="/research/employees-data">Vezi Toate Datele</Link></Button>
      </div>
    </div>
  )
}

function PercentileBar({ value, tooltipLabel }: { value: number; tooltipLabel: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild><div className="relative h-2 w-full rounded-full bg-muted cursor-help"><div className="h-full rounded-full bg-gradient-to-r from-sky-200 to-sky-500" style={{ width: `${value}%` }} /><div className="absolute top-1/2 h-3 w-1 -translate-y-1/2 -translate-x-1/2 rounded-full bg-slate-700" style={{ left: `${value}%` }} /></div></TooltipTrigger>
        <TooltipContent><p>Doar {value}% {tooltipLabel} au o valoare mai mică sau egală pentru acest indicator.</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
