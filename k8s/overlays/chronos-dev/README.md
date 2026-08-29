# Chronos development overlay

This overlay renders the telemetry-disabled, unauthenticated Transparenta.eu
client deployed as an internal canary in the Chronos namespace
`transparenta-eu-dev`. Argo tracks `refs/heads/dev` with manual sync, prune off,
and self-heal off, so a branch update changes only the reviewed desired state
until a separate sync is approved.

The overlay intentionally owns only the Deployment, Service, ServiceAccount,
ConfigMap, and PodDisruptionBudget. It excludes the Phoenix `VirtualService`
and HPA. Chronos ingress remains centrally owned, and replicas remain fixed
until the worker Metrics Server gate passes.

Runtime configuration is read from the pod environment. Browser-safe values are
injected into the browser bootstrap; `INTERNAL_API_URL` remains server-only and
routes SSR directly to the in-cluster API Service through the Istio mesh. The
browser points to the public
`https://dev-chronos-api.transparenta.eu` endpoint and
`https://dev-chronos.transparenta.eu` site URL. PostHog and Sentry are
explicitly disabled; no Clerk or application runtime Secret is mounted.
`VITE_API_MODE=redesign` prevents this redesign-only canary from dispatching
requests for auxiliary entity panels that have not moved off the legacy API;
other environments retain their existing behavior by default.

Deploy the server before the client. Before syncing a client revision that uses
the redesign entity ranking, verify both Phoenix and Chronos accept
`BudgetRankingFilter.frequency` and
`BudgetRankingFilterExclude.excludeEntityCuis` on `/api/v1/graphql`. Do not add a
client fallback to the legacy endpoint if that gate fails.

The repository-local secret generator owns only
`registry-credentials-client` for the initial canary. The workload
Kustomization excludes ciphertext; a separate, narrowly scoped Argo secrets
Application owns the `secrets/` path.

Before any sync:

- retain the proven runtime-config bootstrap for `VITE_API_URL` and
  `VITE_SITE_URL`, and verify `INTERNAL_API_URL` is absent from the browser
  bootstrap;
- confirm the existing SealedSecret remains Synced and Healthy; normal image
  rollouts do not regenerate it or access BWS;
- confirm the inherited base image uses the exact Git SHA tag written by the
  existing dev CI and is pullable with the bounded Chronos registry credential;
- pass the platform, policy, recovery, and ingress gates in the
  Phoenix-to-Chronos application migration plan;
- keep the Argo Application on `refs/heads/dev` with manual sync, prune off,
  self-heal off, and deletion finalizers absent.

Render without applying:

```bash
kubectl kustomize k8s/overlays/chronos-dev
```

Expected kinds are one ConfigMap, Deployment, PodDisruptionBudget, Service,
and ServiceAccount. A render containing `VirtualService`, HPA, `HTTPRoute`, or
a Secret is a failure.

The separate `secrets/` render must contain exactly one SealedSecret and no raw
Secret.
