import { Trans } from "@lingui/react/macro";
import { cn } from "@/lib/utils";
import { formatPnrrSourceDate } from "../../lib/pnrr-release-context";
import { PNRR_RELEASE_LANES, type PnrrLiveRelease } from "@/schemas/pnrr-live";

/** The release's MIPE project snapshot and ORDS capture dates, kept apart. */
export function PnrrReleaseSourceDates({
  release,
  showMipeSnapshot = true,
}: {
  readonly release: PnrrLiveRelease;
  readonly showMipeSnapshot?: boolean;
}) {
  const mipe = release.lanes.find(
    (lane) => lane.lane === PNRR_RELEASE_LANES.mipeProjects,
  );
  const ords = release.lanes.find(
    (lane) => lane.lane === PNRR_RELEASE_LANES.ordsPaymentsCapture,
  );

  return (
    <dl
      className={cn("mt-4 grid gap-4 text-sm", showMipeSnapshot && "sm:grid-cols-2")}
    >
      {showMipeSnapshot && (
        <div>
          <dt className="font-bold">
            <Trans>MIPE project snapshot</Trans>
          </dt>
          <dd>{formatPnrrSourceDate(mipe?.asOf ?? null)}</dd>
        </div>
      )}
      <div>
        <dt className="font-bold">
          <Trans>ORDS payments capture</Trans>
        </dt>
        <dd>{formatPnrrSourceDate(ords?.asOf ?? null)}</dd>
      </div>
    </dl>
  );
}
