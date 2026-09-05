import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Trans } from "@lingui/react/macro";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { LandingReadFailure } from "../../hooks/use-native-landing";

export function LandingReadState({
  title,
  loading,
  failure,
  datasetCode,
  onRetry,
  children,
}: {
  readonly title: ReactNode;
  readonly loading: boolean;
  readonly failure: LandingReadFailure | null;
  readonly datasetCode: string;
  readonly onRetry: () => void;
  readonly children: ReactNode;
}) {
  if (!loading && !failure) return children;
  return (
    <section
      className="space-y-3 rounded-lg border border-border p-4"
      aria-busy={loading}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <>
          <p role="status" className="text-sm text-muted-foreground">
            {failure === "SELECTION" ? (
              <Trans>
                Nu există o selecție comună eligibilă pentru această comparație.
              </Trans>
            ) : failure === "PUBLICATION_CHANGED" ? (
              <Trans>
                Publicația sursă s-a schimbat în timpul citirii. Reîncarcă
                datele.
              </Trans>
            ) : failure === "INCOMPLETE" ? (
              <Trans>
                Seria completă nu a putut fi citită. Rezultatele parțiale nu
                sunt afișate.
              </Trans>
            ) : failure === "CATALOG_ONLY" ? (
              <Trans>
                Setul există în catalog, dar observațiile nu sunt încă
                disponibile.
              </Trans>
            ) : failure === "UNKNOWN" ? (
              <Trans>Setul de date nu este disponibil.</Trans>
            ) : (
              <Trans>Datele acestei secțiuni nu au putut fi citite.</Trans>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="outline" size="sm" onClick={onRetry}>
              <Trans>Reîncearcă</Trans>
            </Button>
            <Link
              to="/statistici/seturi/$cod"
              params={{ cod: datasetCode }}
              className="text-sm underline"
            >
              <Trans>Inspectează sursa</Trans>
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
