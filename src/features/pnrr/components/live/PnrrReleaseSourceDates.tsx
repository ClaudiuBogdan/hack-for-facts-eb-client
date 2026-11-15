import { Trans } from "@lingui/react/macro";
import { formatPnrrSourceDate } from "../../lib/pnrr-release-context";
import { PNRR_RELEASE_LANES, type PnrrLiveRelease } from "@/schemas/pnrr-live";

/** The release's MIPE project snapshot and ORDS capture dates, kept apart. */
export function PnrrReleaseSourceDates({
  release,
}: {
  readonly release: PnrrLiveRelease;
}) {
  const mipe = release.lanes.find(
    (lane) => lane.lane === PNRR_RELEASE_LANES.mipeProjects,
  );
  const ords = release.lanes.find(
    (lane) => lane.lane === PNRR_RELEASE_LANES.ordsPaymentsCapture,
  );

  return (
    <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
      <div>
        <dt className="font-bold">
          <Trans>MIPE project snapshot</Trans>
        </dt>
        <dd>{formatPnrrSourceDate(mipe?.asOf ?? null)}</dd>
      </div>
      <div>
        <dt className="font-bold">
          <Trans>ORDS payments capture</Trans>
        </dt>
        <dd>{formatPnrrSourceDate(ords?.asOf ?? null)}</dd>
      </div>
    </dl>
  );
}
