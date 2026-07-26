import type {
  PnrrLiveProject,
  PnrrLiveRelease,
  PnrrLiveVerification,
} from "@/schemas/pnrr-live";

const csvCell = (value: string | number | null): string => {
  const raw = value === null ? "" : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
};

const PROJECT_EXPORT_COLUMNS = [
  "release_id",
  "project_key_version",
  "project_key",
  "snapshot_date",
  "snapshot_id",
  "endpoint_name",
  "item_key",
  "contract_number",
  "beneficiary_cui",
  "beneficiary_name",
  "component_code",
  "measure_code",
  "county_siruta",
  "county_name",
  "status",
  "total_value_ron",
  "eu_contribution_ron",
  "national_public_value_ron",
  "vat_ron",
  "allocated_eur",
  "paid_eur",
  "received_eur",
  "physical_progress_ratio",
  "financial_progress_ratio",
  "source_system",
  "source_url",
  "retrieved_at",
] as const;

export function buildPnrrProjectPageCsv(
  projects: readonly PnrrLiveProject[],
  release: PnrrLiveRelease,
): string {
  const rows = projects.map((project) => [
    release.releaseId,
    project.projectKeyVersion,
    project.projectKey,
    project.snapshotDate,
    project.snapshotId,
    project.endpointName,
    project.itemKey,
    project.contractNumber,
    project.beneficiaryCui,
    project.beneficiaryName,
    project.componentCode,
    project.measureCode,
    project.countySiruta,
    project.countyName,
    project.status,
    project.totalValueRon,
    project.euContributionRon,
    project.nationalPublicValueRon,
    project.vatRon,
    project.allocatedEur,
    project.paidEur,
    project.receivedEur,
    project.physicalProgressRatio,
    project.financialProgressRatio,
    project.sourceSystem,
    project.sourceUrl,
    project.retrievedAt,
  ]);

  return [
    PROJECT_EXPORT_COLUMNS.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\r\n");
}

export function downloadPnrrProjectPageCsv(
  projects: readonly PnrrLiveProject[],
  release: PnrrLiveRelease,
): void {
  if (release.state === "abstained") return;
  const blob = new Blob(
    ["\uFEFF", buildPnrrProjectPageCsv(projects, release)],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pnrr-project-observations-${release.releaseId.replace(
    /[^a-zA-Z0-9._-]/g,
    "_",
  )}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const VERIFICATION_EXPORT_COLUMNS = [
  "release_id",
  "answer_state",
  "release_state",
  "rule_set_version",
  "reason_codes",
  "provenance",
  "coverage",
  "signal_code",
  "signal_count",
  "interpretation",
] as const;

export function buildPnrrVerificationCsv(
  verification: PnrrLiveVerification,
): string {
  const rows = [
    [
      "unresolved_commitment_envelope",
      verification.unresolvedCommitmentCount,
      "Source observations cannot yet be treated as one additive commitment value.",
    ],
    [
      "potential_duplicate_payment_group",
      verification.duplicatePaymentGroupCount,
      "Deterministic duplicate candidates require review before payment totals can be promoted.",
    ],
    [
      "missing_commitment_source_url",
      verification.missingCommitmentSourceUrlCount,
      "Commitment evidence lacks a direct human-openable source URL.",
    ],
    [
      "end_before_start",
      verification.endBeforeStartCount,
      "The source-reported end date precedes the source-reported start date.",
    ],
    [
      "progress_over_100",
      verification.overHundredProgressCount,
      "A source-reported physical or financial progress ratio is greater than 1.",
    ],
    [
      "missing_progress_link",
      verification.missingProgressLinkCount,
      "A progress observation has no accepted commitment relationship.",
    ],
  ] as const;
  return [
    VERIFICATION_EXPORT_COLUMNS.map(csvCell).join(","),
    ...rows.map(([code, count, interpretation]) =>
      [
        verification.meta.release.releaseId,
        verification.meta.state,
        verification.meta.release.state,
        verification.ruleSetVersion,
        verification.meta.reasonCodes.join("|"),
        verification.meta.provenance.join("|"),
        verification.meta.coverage
          .map(
            (entry) =>
              `${entry.field}:${entry.covered}/${entry.total}:${entry.percent ?? ""}`,
          )
          .join("|"),
        code,
        count,
        interpretation,
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\r\n");
}

export function downloadPnrrVerificationCsv(
  verification: PnrrLiveVerification,
): void {
  if (
    verification.meta.state === "abstained" ||
    verification.meta.release.state === "abstained"
  ) {
    return;
  }
  const blob = new Blob(["\uFEFF", buildPnrrVerificationCsv(verification)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pnrr-verification-${verification.meta.release.releaseId.replace(
    /[^a-zA-Z0-9._-]/g,
    "_",
  )}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
