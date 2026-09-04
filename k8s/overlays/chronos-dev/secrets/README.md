# Chronos development secrets

This directory contains only strict-scope SealedSecret ciphertext for namespace
`transparenta-eu-dev`. Bitwarden Secrets Manager project `chronos` is the
plaintext authority.

Generate from this repository only:

```bash
yarn secrets:seal:chronos -- \
  --kubeconfig "$HOME/.kube/chronos.yaml" \
  --context chronos
```

The generator verifies the Chronos API identity and Ready durable node, checks
the controller before BWS access, resolves exact JSON field contracts, streams
raw Secret JSON to `kubeseal`, validates ciphertext against the live controller,
and replaces no output until the complete selected batch passes.

Never add plaintext Secret YAML, passwords, tokens, kubeconfigs, BWS exports,
or environment files here. The initial client canary intentionally has no
runtime application Secret; this lane owns only its independent image-pull
credential.

## Local credential handling

Run the sealing command from this repository with explicit Chronos kubeconfig and
context. It checks the target, controller and Kustomization before requesting a
credential. On macOS it reads the current account's Keychain item
`transparenta-bws-access-token`; otherwise it prompts without echo in a terminal.
The token is passed only to the Bitwarden child process, never on the command line
or in files/logs. Normal sealing fetches only the registered Bitwarden record IDs
and verifies their project/key identity. Raw Secret JSON stays in memory and feeds
kubeseal through stdin. Only validated ciphertext is written. Generation does not
apply anything to Kubernetes. Never paste a token into a command or a chat.
