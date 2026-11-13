import { Trans } from '@lingui/react/macro';
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Accordion } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export function EntityEmployeesDataInfo() {
    return (
        <Card className="bg-muted/30">
            <CardHeader><CardTitle className="flex items-center gap-2"><Info className="h-5 w-5" /><span>Despre Date și Metodologie</span></CardTitle></CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-6"><Trans>Guvernul României a publicat ediția în septembrie 2025, pe baza raportărilor prefecturilor privind aparatele proprii ale primăriilor și consiliilor județene. Fișierul nu precizează data la care a fost măsurată ocuparea posturilor pentru fiecare autoritate.</Trans></p>
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-5">
                        <AccordionTrigger>Cum se calculează limitele simulate?</AccordionTrigger>
                        <AccordionContent className="pb-4 space-y-4">
                            <p>Formula utilizată pentru a determina numărul maxim de posturi în cele două scenarii de reducere este următoarea (literele corespund coloanelor din fișierul sursă XLS):</p>
                            <div className="p-3 bg-background/50 rounded-md text-xs font-mono border">
                                <p><span className="font-semibold">TOTAL CU REDUCERE (Q sau R)</span> = BAZĂ REDUSĂ (H sau I) + EXCEPȚII (J+L+M+N+O)</p>
                            </div>
                            <ul className="list-disc pl-5 space-y-2 text-sm">
                                <li><strong>BAZĂ REDUSĂ (H sau I):</strong> Reprezintă <span className="font-semibold">Nr. max. posturi cf. O.U.G nr. 63/2010 (G)</span>, diminuat cu 40% (H) sau 45% (I).</li>
                                <li><strong>EXCEPȚII:</strong> Posturi care nu intră sub incidența reducerii:
                                    <ul className="list-['-_'] pl-5 mt-1 space-y-1 text-muted-foreground">
                                        <li><span className="font-semibold">(J)</span> Evidența populației</li>
                                        <li><span className="font-semibold">(L)</span> Poliția locală (calculată la 1/1200 locuitori)</li>
                                        <li><span className="font-semibold">(M)</span> Implementare proiecte europene</li>
                                        <li><span className="font-semibold">(N)</span> Șoferi microbuze şcolare</li>
                                        <li><span className="font-semibold">(O)</span> Post-implementare proiecte europene</li>
                                    </ul>
                                </li>
                            </ul>
                            <p className="text-xs text-muted-foreground pt-2">Această metodologie asigură că reducerile se aplică doar bazei administrative generale, protejând posturile esențiale și pe cele finanțate din fonduri externe.</p>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-1">
                        <AccordionTrigger>Ce înseamnă 'Limită Legală Simulată'?</AccordionTrigger>
                        <AccordionContent className="pb-4">Reprezintă un prag calculat pe baza unei propuneri de reducere cu <strong>40% sau 45%</strong> a numărului maxim teoretic de posturi permis de O.U.G. 63/2010, la care se adaugă posturile exceptate. Este o simulare pentru a evalua impactul unor posibile reforme, nu o limită legală în vigoare.</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                        <AccordionTrigger>Sunt datele 100% exacte?</AccordionTrigger>
                        <AccordionContent className="pb-4">Datele se bazează pe raportări multiple și, conform notei oficiale, s-ar putea înregistra un grad de eroare de aproximativ <strong>±2%</strong> la nivelul întregii țări din cauza unor posibile diferențe de raportare.</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                        <AccordionTrigger><Trans>Ce reprezintă posturile ocupate și plafoanele legale?</Trans></AccordionTrigger>
                        <AccordionContent className="pb-4">
                            <ul className="list-disc pl-5 space-y-2">
                                <li><Trans><strong>Posturi ocupate (S)</strong> este numărul de posturi raportate ca ocupate.</Trans></li>
                                <li><Trans><strong>Plafon legal de bază (G)</strong> este numărul maxim de posturi stabilit în funcție de populație.</Trans></li>
                                <li><Trans><strong>Plafon legal cu excepții (P)</strong> este valoarea „TOTAL ACTUAL” din fișierul sursă și include posturile exceptate. Pentru numărul de posturi aprobate este nevoie de organigrama autorității.</Trans></li>
                            </ul>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-4">
                        <AccordionTrigger>Ce entități sunt incluse în analiză?</AccordionTrigger>
                        <AccordionContent className="pb-4">Analiza include toate UAT-urile (comune, orașe, municipii), Sectoarele Municipiului București, Consiliile Județene și Primăria Generală a Municipiului București.</AccordionContent>
                    </AccordionItem>
                </Accordion>
                <div className="mt-6">
                    <Button asChild variant="link" className="px-0 h-auto">
                        <a href="https://gov.ro/aal/" target="_blank" rel="noopener noreferrer" className="text-sm">Vezi Sursa Oficială pe gov.ro/aal<ExternalLink className="h-4 w-4 ml-1" /></a>
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}