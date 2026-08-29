import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSafeSealedYaml,
  buildSecretDocument,
  createRedactor,
  normalizeRegistry,
  parseSecretFields,
} from "./seal-bitwarden-secrets.mjs";

const definition = {
  name: "app-runtime",
  type: "Opaque",
  render: "stringData",
  requiredFields: ["URL", "MULTILINE", "LEADING_DASH"],
  labels: {},
  annotations: {},
};

test("registry requires an exact strict target", () => {
  const registry = normalizeRegistry({
    version: 1,
    target: {
      namespace: "transparenta-eu-dev",
      expectedContext: "chronos",
      expectedServer: "https://chronos:6443",
      requiredReadyNode: "chronos",
      forbiddenNodes: ["phoenix", "griffin"],
    },
    bitwarden: { projectId: "project", basePrefix: "/secrets/chronos/dev/app" },
    sealedSecrets: {
      controllerName: "sealed-secrets-controller",
      controllerNamespace: "kube-system",
      scope: "strict",
      syncWave: "-8",
    },
    output: {
      directory: "secrets",
      kustomization: "secrets/kustomization.yaml",
    },
    secrets: [definition],
  });
  assert.equal(registry.sealedSecrets.scope, "strict");
  assert.equal(registry.target.expectedServer, "https://chronos:6443");
});

test("BWS JSON fields must match the registry exactly", () => {
  const fields = parseSecretFields(
    "/record",
    JSON.stringify({
      URL: "https://example.test",
      MULTILINE: "a\nb",
      LEADING_DASH: "---value",
    }),
    definition.requiredFields,
  );
  assert.equal(fields.LEADING_DASH, "---value");
  assert.throws(
    () =>
      parseSecretFields(
        "/record",
        JSON.stringify({ URL: "x", EXTRA: "y" }),
        definition.requiredFields,
      ),
    /field contract mismatch/u,
  );
});

test("raw Secret remains in memory and preserves multiline and leading-dash values", () => {
  const document = buildSecretDocument(definition, "transparenta-eu-dev", {
    URL: "https://example.test",
    MULTILINE: "line1\nline2",
    LEADING_DASH: "-----BEGIN TEST-----",
  });
  assert.equal(document.kind, "Secret");
  assert.equal(document.stringData.MULTILINE, "line1\nline2");
  assert.equal(document.stringData.LEADING_DASH, "-----BEGIN TEST-----");
});

test("redactor removes values even from child error text", () => {
  const redact = createRedactor([
    "short",
    "line1\nline2",
    "-----BEGIN TEST-----",
  ]);
  const output = redact("short line1\nline2 -----BEGIN TEST-----");
  assert.equal(output.includes("short"), false);
  assert.equal(output.includes("line1"), false);
  assert.equal(output.includes("BEGIN TEST"), false);
});

test("sealed output rejects raw kinds, fields, and resolved plaintext", () => {
  const redact = createRedactor(["super-secret"]);
  assert.doesNotThrow(() =>
    assertSafeSealedYaml(
      "apiVersion: bitnami.com/v1alpha1\nkind: SealedSecret\nmetadata:\n  name: ok\n",
      redact,
    ),
  );
  assert.throws(
    () =>
      assertSafeSealedYaml(
        "apiVersion: v1\nkind: Secret\nstringData:\n  A: x\n",
        redact,
      ),
    /raw Secret|not a SealedSecret/u,
  );
  assert.throws(
    () =>
      assertSafeSealedYaml(
        "apiVersion: bitnami.com/v1alpha1\nkind: SealedSecret\nspec:\n  encryptedData:\n    A: super-secret\n",
        redact,
      ),
    /resolved plaintext/u,
  );
});
