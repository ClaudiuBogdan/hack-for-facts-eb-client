import { EntityDetailsData } from '@/lib/api/entities';
import { ExternalLink, Info } from 'lucide-react';
import { Trans } from '@lingui/react/macro';
import { Button } from '@/components/ui/button';

type Props = {
    entity: EntityDetailsData | null | undefined;
};

export function ContractsView({ entity }: Readonly<Props>) {

    if (!entity) {
        return null;
    }

    const sicapUrl = `https://sicap.ai/autoritate/${entity.cui}?utm_source=transparenta.eu`;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border bg-muted/50 p-4">
                <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">
                        <Trans>
                            Public procurement data is provided by SICAP.ai, an independent platform that aggregates and analyzes public contracts from Romania's Electronic Public Procurement System (SEAP).
                        </Trans>
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    asChild
                >
                    <a href={sicapUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        <Trans>Open in SICAP.ai</Trans>
                    </a>
                </Button>
            </div>

            <div className="space-y-3">
                <div className="relative w-full overflow-hidden rounded-lg border bg-background shadow-sm">
                <div className="relative w-full h-[620px] md:h-[740px] lg:h-[900px]">
                        <iframe
                            src={sicapUrl}
                            title="SICAP.ai Public Contracts Portal"
                            className="absolute inset-0 h-full w-full"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
