import { useNavigate } from "@tanstack/react-router";
import { Trans } from "@lingui/react/macro";
import type {
  StatisticsLandingCatalog,
  StatisticsLandingSearch,
  StatisticsTerritorySearchRow,
} from "@/schemas/statistics";
import {
  useStatisticsLandingCatalog,
  useStatisticsUatSnapshot,
} from "../hooks/use-statistics";
import { statisticsTheme } from "../lib/statistics-theme";
import { LandingDecadeSection } from "../components/landing/landing-decade-section";
import { LandingExampleCard } from "../components/landing/landing-example-card";
import { LandingHero } from "../components/landing/landing-hero";
import { LandingHonestySection } from "../components/landing/landing-honesty-section";
import { LandingThemesSection } from "../components/landing/landing-themes-section";
import { ShareFilteredView } from "../components/share-filtered-view";

import {
  useNativeLanding,
  type NativeLandingBootstrap,
} from "../hooks/use-native-landing";
import { LandingReadState } from "../components/landing/landing-read-state";

type StatisticsLandingPageProps = {
  readonly search: StatisticsLandingSearch;
  readonly initialLandingData?: NativeLandingBootstrap;
  readonly initialLandingCatalog?: StatisticsLandingCatalog;
};

/** Native source blocks load independently; the app shell owns the main landmark. */
export function StatisticsLandingPage({
  search,
  initialLandingData,
  initialLandingCatalog,
}: StatisticsLandingPageProps) {
  const navigate = useNavigate();
  const { tiles, county, example, retryCounty } = useNativeLanding(initialLandingData);
  const catalogQuery = useStatisticsLandingCatalog(initialLandingCatalog);
  const loc = typeof search.loc === "string" ? search.loc : undefined;
  const snapshotQuery = useStatisticsUatSnapshot(loc);

  const handleTermChange = (q: string | undefined) => {
    void navigate({
      to: "/statistici",
      search: {
        ...(q ? { q } : {}),
        ...(loc ? { loc } : {}),
      },
    });
  };

  const handlePickTerritory = (row: StatisticsTerritorySearchRow) => {
    if (!row.siruta) return;
    void navigate({ to: "/statistici", search: { loc: row.siruta } });
  };

  const handleClearPick = () => {
    void navigate({
      to: "/statistici",
      search: typeof search.q === "string" ? { q: search.q } : {},
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className={statisticsTheme.page}>
        <header className="space-y-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                <Trans>Statistici</Trans>
              </h1>
              <p className="max-w-3xl text-sm text-muted-foreground">
                <Trans>
                  Date oficiale INS Tempo pentru fiecare localitate, județ și
                  pentru întreaga țară.
                </Trans>
              </p>
            </div>
            <ShareFilteredView />
          </div>
        </header>

        <LandingHero
          searchTerm={typeof search.q === "string" ? search.q : undefined}
          onTermChange={handleTermChange}
          onPickTerritory={handlePickTerritory}
          onClearPick={handleClearPick}
          loc={loc}
          landingData={tiles.data?.data ?? undefined}
          landingDataError={tiles.isError || Boolean(tiles.data?.error)}
          landingDataLoading={tiles.isLoading}
          onRetryLandingData={() => void tiles.refetch()}
          snapshot={snapshotQuery.data}
          snapshotLoading={Boolean(search.loc) && snapshotQuery.isLoading}
          snapshotError={snapshotQuery.isError}
        />

        <LandingReadState
          title={<Trans>Schimbarea populației pe județe</Trans>}
          loading={county.isLoading || tiles.isLoading}
          failure={
            county.data?.error ?? (county.isError ? "READ_FAILED" : null)
          }
          datasetCode="POP107D"
          onRetry={() => {
            void retryCounty();
          }}
        >
          {county.data?.data ? (
            <LandingDecadeSection story={county.data.data.story} />
          ) : null}
        </LandingReadState>
        <LandingReadState
          title={<Trans>Compară trei niveluri teritoriale</Trans>}
          loading={example.isLoading}
          failure={
            example.data?.error ?? (example.isError ? "READ_FAILED" : null)
          }
          datasetCode="FOM104D"
          onRetry={() => void example.refetch()}
        >
          {example.data?.data ? (
            <LandingExampleCard example={example.data.data.example} />
          ) : null}
        </LandingReadState>

        {catalogQuery.isError ? (
          <p className="text-sm text-muted-foreground">
            <Trans>
              Temele nu au putut fi încărcate — catalogul complet rămâne
              disponibil în explorator.
            </Trans>
          </p>
        ) : (
          <LandingThemesSection catalog={catalogQuery.data} />
        )}

        <LandingHonestySection
          catalog={catalogQuery.data}
          catalogError={catalogQuery.isError}
        />
      </div>
    </div>
  );
}
