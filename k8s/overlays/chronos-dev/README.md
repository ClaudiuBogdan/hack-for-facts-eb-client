# Chronos development overlay

This overlay renders the telemetry-disabled, unauthenticated Transparenta.eu
client deployed as an internal canary in the Chronos namespace
`transparenta-eu-dev`. Argo remains pinned to an exact reviewed commit, so
updating this branch does not change the live cluster until a separate manual
sync is approved.

The overlay intentionally owns only the Deployment, Service, ServiceAccount,
ConfigMap, and PodDisruptionBudget. It excludes the Phoenix `VirtualService`
and HPA. Chronos ingress remains centrally owned, and replicas remain fixed
until the worker Metrics Server gate passes.

Runtime configuration is read from the pod environment and injected into the
browser bootstrap. The canary points to the future
`https://dev-chronos-api.transparenta.eu` endpoint and
`https://dev-chronos.transparenta.eu` site URL. PostHog and Sentry are
explicitly disabled; no Clerk or application runtime Secret is mounted.

The repository-local secret generator owns only
`registry-credentials-client` for the initial canary. The workload
Kustomization excludes ciphertext; a separate, narrowly scoped Argo secrets
Application owns the `secrets/` path.

Before any sync:

- retain the proven runtime-config bootstrap for `VITE_API_URL` and
  `VITE_SITE_URL`;
- generate and validate the independent image-pull ciphertext from BWS;
- reconfirm the image digest and prove it can be pulled with the bounded
  Chronos registry credential;
- pass the platform, policy, recovery, and ingress gates in the
  Phoenix-to-Chronos application migration plan;
- pin the Argo Application to an exact reviewed commit SHA and keep manual
  sync, prune off, self-heal off, and deletion finalizers absent.

Render without applying:

```bash
kubectl kustomize k8s/overlays/chronos-dev
```

Expected kinds are one ConfigMap, Deployment, PodDisruptionBudget, Service,
and ServiceAccount. A render containing `VirtualService`, HPA, `HTTPRoute`, or
a Secret is a failure.

The separate `secrets/` render must contain exactly one SealedSecret and no raw
Secret.
