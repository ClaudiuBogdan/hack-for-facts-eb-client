# Kubernetes Deployment Guide (Client)

This directory contains Kubernetes manifests for deploying `hack-for-facts-eb-client` with Kustomize overlays, Istio routing, and ArgoCD GitOps sync.

## Structure

```text
k8s/
├── base/
│   ├── deployment.yaml
│   ├── hpa.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   ├── virtual-service.yaml
│   └── kustomization.yaml
├── performance-rollout.md
└── overlays/
    ├── dev/
    │   ├── kustomization.yaml
    │   └── secrets/
    │       ├── app-secret.template.yaml
    │       ├── convert-secret.sh
    │       ├── sealed-app-secret.yaml
    │       └── sealed-registry-secret.yaml
    └── prod/
        ├── kustomization.yaml
        ├── virtual-service-www-redirect.yaml
        └── secrets/
            ├── app-secret.template.yaml
            ├── convert-secret.sh
            ├── sealed-app-secret.yaml
            └── sealed-registry-secret.yaml
```

## Environments

- Dev namespace: `hack-for-facts-dev`
- Prod namespace: `hack-for-facts-prod`

## Istio hosts

- Dev: `dev.transparenta.eu`
- Prod: `transparenta.eu`
- Redirect: `www.transparenta.eu` -> `transparenta.eu`

## Secret sealing

Plain secret manifests must never be committed.

1. Create `*.secret.yaml` files locally in the overlay `secrets/` folder.
   Use `app-secret.template.yaml` as the starting structure.
2. Run `./convert-secret.sh` in that folder.
3. Commit only `sealed-*.yaml` files.

### App runtime secret contract

`Deployment` reads `hack-for-facts-eb-client-secrets` via `envFrom.secretRef`.
This enables one image across environments while still using environment-specific
runtime values.

Required runtime keys:

- `VITE_APP_NAME`
- `VITE_APP_ENVIRONMENT`
- `VITE_API_URL`
- `VITE_SITE_URL`
- `NODE_ENV`

Recommended runtime keys:

- `VITE_POSTHOG_ENABLED`
- `VITE_POSTHOG_API_KEY`
- `VITE_POSTHOG_HOST`
- `VITE_POSTHOG_PERSON_PROFILES`
- `VITE_SENTRY_ENABLED`
- `VITE_SENTRY_DSN`
- `VITE_SENTRY_TRACES_SAMPLE_RATE`
- `VITE_SENTRY_FEEDBACK_ENABLED`
- `VITE_BETTER_STACK_STATUS_WIDGET_ID`
- `VITE_CLERK_PUBLISHABLE_KEY`

`VITE_APP_VERSION` is optional because the app falls back to `APP_VERSION`
provided by the deployment annotation (`image-sha`).

### Build-time CI variables (not Kubernetes app secret)

These are used during CI build/release automation and should stay in GitHub
Actions variables/secrets, not in the runtime app secret:

- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`

## Local validation

```bash
kustomize build k8s/overlays/dev
kustomize build k8s/overlays/prod
```

## Performance rollout

For first-load latency optimization rollout and validation:

- See `k8s/performance-rollout.md`

## ArgoCD applications

ArgoCD app definitions are under `argocd/applications/`:

- `dev.yaml` -> `k8s/overlays/dev` on branch `dev`
- `prod.yaml` -> `k8s/overlays/prod` on branch `main`

## CI/CD image updates

`/.github/workflows/ci.yml` `deploy-dev` updates the Chronos development overlay image tag and workload annotation. `deploy-prod` still reads the frozen shared-base tag; see the migration boundary below.


## Chronos migration deployment boundary (2026-09-05)

User-approved migration work publishes server/client `dev` and updates only
`overlays/chronos-dev`. The shared base image remains frozen so existing Phoenix
rendered workloads do not change. Production promotion from this dev branch is
suspended for the migration: do not merge these delivery changes to `main` or
trigger production promotion until a separate production plan is approved.
The client's existing production job still reads the frozen shared-base image;
it must not be redirected to the Chronos development pin.
