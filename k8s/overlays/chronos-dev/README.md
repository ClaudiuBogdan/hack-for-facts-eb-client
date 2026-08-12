# Chronos development overlay

This source-only overlay renders the Transparenta.eu client workload for the
future Chronos namespace `transparenta-eu-dev`. It is not an installation
instruction and has not been applied.

The overlay intentionally owns only the Deployment, Service, ServiceAccount,
ConfigMap, and PodDisruptionBudget. It excludes the Phoenix `VirtualService`
and HPA. Chronos ingress remains centrally owned, and replicas remain fixed
until the worker Metrics Server gate passes.

The initial public configuration points the client canary at the existing
Phoenix development API. Before any sync:

- prove whether the image reads `VITE_API_URL` at runtime; otherwise build and
  pin a distinct digest for each hostname-matrix row;
- add independently resealed Chronos Secret declarations from Bitwarden;
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
