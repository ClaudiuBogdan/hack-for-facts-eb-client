import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSafeSealedYaml,
  assertSealedDocument,
  buildSecretDocument,
  createRedactor,
  normalizeRegistry,
  fetchBitwardenSecrets,
  selectSecrets,
  resolveSecrets,
  parseSecretFields,
} from "./seal-bitwarden-secrets.mjs";

const definition = {
  name: "app-runtime",
  bitwardenSecretId: "record-id",
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

test("selected records are resolved before fetching credentials", () => {
  assert.throws(
    () => selectSecrets({ secrets: [definition] }, ["unknown"]),
    /Unknown Secret/,
  );
  assert.deepEqual(
    selectSecrets({ secrets: [definition] }, [definition.name]),
    [definition],
  );
});

test("Bitwarden fetches only exact selected IDs, passing token only in child env", async () => {
  const calls = [];
  const record = {
    id: definition.bitwardenSecretId,
    key: "/record",
    projectId: "project",
    value: "{}",
  };
  const result = await fetchBitwardenSecrets(
    "private-token",
    [definition],
    async (...args) => {
      calls.push(args);
      return { exitCode: 0, stdout: JSON.stringify(record) };
    },
  );
  assert.deepEqual(result, [record]);
  assert.deepEqual(calls[0][1], [
    "secret",
    "get",
    definition.bitwardenSecretId,
    "--output",
    "json",
  ]);
  assert.equal(calls[0][2].environment.BWS_ACCESS_TOKEN, "private-token");
  assert.equal(calls[0][1].includes("private-token"), false);
});

test("wrong identity and sensitive Bitwarden failures fail closed", async () => {
  await assert.rejects(
    fetchBitwardenSecrets("private-token", [definition], async () => ({
      exitCode: 0,
      stdout: '{"id":"other"}',
    })),
    /identity mismatch/,
  );
  await assert.rejects(
    fetchBitwardenSecrets("private-token", [definition], async () => ({
      exitCode: 1,
      stdout: "private-token",
      stderr: "private-token",
    })),
    (error) => {
      assert.equal(error.message.includes("private-token"), false);
      return true;
    },
  );
  assert.throws(
    () =>
      resolveSecrets(
        { bitwarden: { basePrefix: "/record", projectId: "approved" } },
        [
          {
            id: definition.bitwardenSecretId,
            key: "/record/app-runtime",
            projectId: "wrong",
            value: "{}",
          },
        ],
        [definition],
      ),
    /approved BWS project/,
  );
});

const sealed = () => ({
  apiVersion: "bitnami.com/v1alpha1",
  kind: "SealedSecret",
  metadata: { name: definition.name, namespace: "transparenta-eu-dev" },
  spec: {
    encryptedData: Object.fromEntries(
      definition.requiredFields.map((key) => [key, "encrypted-value"]),
    ),
    template: {
      metadata: { name: definition.name, namespace: "transparenta-eu-dev" },
      type: "Opaque",
    },
  },
});

test("strict sealed contract rejects identity swaps, broader scope, raw fields and incomplete ciphertext", () => {
  assert.doesNotThrow(() =>
    assertSealedDocument(sealed(), definition, "transparenta-eu-dev"),
  );
  const corruptions = [
    (doc) => {
      doc.metadata.namespace = "production";
    },
    (doc) => {
      doc.spec.template.metadata.name = "different";
    },
    (doc) => {
      doc.spec.template.metadata.namespace = "production";
    },
    (doc) => {
      doc.spec.template.type = "kubernetes.io/dockerconfigjson";
    },
    (doc) => {
      delete doc.spec.encryptedData.URL;
    },
    (doc) => {
      doc.spec.encryptedData.URL = "";
    },
    (doc) => {
      doc.spec.encryptedData.URL = null;
    },
    (doc) => {
      doc.spec.encryptedData.extra = "encrypted";
    },
    ...["data", "stringData"].flatMap((key) => [
      (doc) => {
        doc[key] = {};
      },
      (doc) => {
        doc.spec[key] = {};
      },
      (doc) => {
        doc.spec.template[key] = {};
      },
    ]),
    ...["cluster-wide", "namespace-wide"].flatMap((scope) => [
      (doc) => {
        doc.metadata.annotations = {
          ["sealedsecrets.bitnami.com/" + scope]: "true",
        };
      },
      (doc) => {
        doc.spec.template.metadata.annotations = {
          ["sealedsecrets.bitnami.com/" + scope]: "true",
        };
      },
    ]),
  ];
  for (const corrupt of corruptions) {
    const doc = sealed();
    corrupt(doc);
    assert.throws(
      () => assertSealedDocument(doc, definition, "transparenta-eu-dev"),
      /metadata contract failed/,
    );
  }
});
