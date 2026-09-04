#!/usr/bin/env node

import { spawn } from "node:child_process";
import {
  chmod,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { readAccessToken } from "./seal-token.mjs";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
const SAFE_ENVIRONMENT_KEYS = [
  "HOME",
  "PATH",
  "PATHEXT",
  "SystemRoot",
  "WINDIR",
  "SSL_CERT_FILE",
  "SSL_CERT_DIR",
];

const usage = () => `Usage: node scripts/seal-bitwarden-secrets.mjs [options]

Required:
  --registry <path>       Non-secret registry JSON
  --kubeconfig <path>     Explicit target kubeconfig
  --context <name>        Explicit target context

Optional:
  --secret <name>         Generate only one registered Secret (repeatable)
  --help                  Show this help

Reads the macOS Keychain token, or prompts without echo. The token stays in memory
and is passed only to bws. No token argument, environment file or plaintext output.
`;

const requireValue = (arguments_, index, option) => {
  const value = arguments_[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`Missing value for ${option}`);
  }
  return value;
};

export const parseArguments = (arguments_) => {
  const options = { secretNames: [] };
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    switch (argument) {
      case "--":
        break;
      case "--registry":
        options.registryPath = requireValue(arguments_, index, argument);
        index += 1;
        break;
      case "--kubeconfig":
        options.kubeconfig = requireValue(arguments_, index, argument);
        index += 1;
        break;
      case "--context":
        options.context = requireValue(arguments_, index, argument);
        index += 1;
        break;
      case "--secret":
        options.secretNames.push(requireValue(arguments_, index, argument));
        index += 1;
        break;
      case "--help":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown option: ${argument}`);
    }
  }
  return options;
};

export const parseJson = (input, label) => {
  const parser = Reflect.get(JSON, "parse");
  try {
    return Reflect.apply(parser, JSON, [input]);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
};

const object = (value, label) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
};

const string = (value, label) => {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
};

const stringArray = (value, label) => {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((entry) => typeof entry !== "string" || entry.length === 0)
  ) {
    throw new Error(`${label} must be a non-empty string array`);
  }
  return [...value];
};

const stringRecord = (value, label) => {
  if (value === undefined) return {};
  const source = object(value, label);
  return Object.fromEntries(
    Object.entries(source).map(([key, current]) => [
      string(key, `${label} key`),
      string(current, `${label}.${key}`),
    ]),
  );
};

export const normalizeRegistry = (input) => {
  const document = object(input, "registry");
  if (document.version !== 1) throw new Error("registry.version must be 1");
  const target = object(document.target, "target");
  const bitwarden = object(document.bitwarden, "bitwarden");
  const controller = object(document.sealedSecrets, "sealedSecrets");
  const output = object(document.output, "output");
  if (!Array.isArray(document.secrets) || document.secrets.length === 0) {
    throw new Error("registry.secrets must contain at least one definition");
  }
  if (controller.scope !== "strict") {
    throw new Error("sealedSecrets.scope must be strict");
  }

  const secrets = document.secrets.map((entry, index) => {
    const current = object(entry, `secrets[${index}]`);
    const render = string(current.render, `secrets[${index}].render`);
    if (!["stringData", "dockerconfigjson"].includes(render)) {
      throw new Error(`secrets[${index}].render is unsupported`);
    }
    return {
      name: string(current.name, `secrets[${index}].name`),
      bitwardenSecretId: string(
        current.bitwardenSecretId,
        `secrets[${index}].bitwardenSecretId`,
      ),
      type: string(current.type, `secrets[${index}].type`),
      render,
      requiredFields: stringArray(
        current.requiredFields,
        `secrets[${index}].requiredFields`,
      ),
      labels: stringRecord(current.labels, `secrets[${index}].labels`),
      annotations: stringRecord(
        current.annotations,
        `secrets[${index}].annotations`,
      ),
    };
  });

  const names = secrets.map((entry) => entry.name);
  if (new Set(names).size !== names.length) {
    throw new Error("registry.secrets contains duplicate names");
  }

  return {
    version: 1,
    target: {
      namespace: string(target.namespace, "target.namespace"),
      expectedContext: string(target.expectedContext, "target.expectedContext"),
      expectedServer: string(target.expectedServer, "target.expectedServer"),
      requiredReadyNode: string(
        target.requiredReadyNode,
        "target.requiredReadyNode",
      ),
      forbiddenNodes: stringArray(
        target.forbiddenNodes,
        "target.forbiddenNodes",
      ),
    },
    bitwarden: {
      projectId: string(bitwarden.projectId, "bitwarden.projectId"),
      basePrefix: string(bitwarden.basePrefix, "bitwarden.basePrefix").replace(
        /\/+$/u,
        "",
      ),
    },
    sealedSecrets: {
      controllerName: string(
        controller.controllerName,
        "sealedSecrets.controllerName",
      ),
      controllerNamespace: string(
        controller.controllerNamespace,
        "sealedSecrets.controllerNamespace",
      ),
      scope: "strict",
      syncWave: string(controller.syncWave, "sealedSecrets.syncWave"),
    },
    output: {
      directory: string(output.directory, "output.directory"),
      kustomization: string(output.kustomization, "output.kustomization"),
    },
    secrets,
  };
};

const childEnvironment = (overrides = {}) => {
  const environment = {};
  for (const key of SAFE_ENVIRONMENT_KEYS) {
    if (process.env[key] !== undefined) environment[key] = process.env[key];
  }
  return { ...environment, ...overrides };
};

const runProcess = (command, arguments_, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, arguments_, {
      env: options.environment ?? childEnvironment(),
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", () => reject(new Error(`${command} could not start`)));
    child.stdin.on("error", () => reject(new Error(`${command} input failed`)));
    child.on("close", (exitCode) => {
      const result = { exitCode: exitCode ?? 1, stdout, stderr };
      if (result.exitCode === 0 || options.allowFailure === true) {
        resolve(result);
        return;
      }
      reject(
        new Error(
          `${command} failed with exit code ${String(result.exitCode)}`,
        ),
      );
    });
    child.stdin.end(options.input ?? "");
  });

const requireCommand = async (command) => {
  const result = await runProcess("which", [command], { allowFailure: true });
  if (result.exitCode !== 0)
    throw new Error(`Missing required command: ${command}`);
};

const absoluteFromRepository = (value) =>
  path.isAbsolute(value) ? value : path.resolve(REPOSITORY_ROOT, value);

const kubectlArguments = (options, ...arguments_) => [
  "--kubeconfig",
  options.kubeconfig,
  "--context",
  options.context,
  ...arguments_,
];

const assertTarget = async (registry, options) => {
  if (options.context !== registry.target.expectedContext) {
    throw new Error(
      `Refusing context ${options.context}; expected ${registry.target.expectedContext}`,
    );
  }
  const server = await runProcess(
    "kubectl",
    kubectlArguments(
      options,
      "config",
      "view",
      "--minify",
      "-o",
      "jsonpath={.clusters[0].cluster.server}",
    ),
  );
  if (server.stdout !== registry.target.expectedServer) {
    throw new Error(
      `Refusing Kubernetes server ${server.stdout}; expected ${registry.target.expectedServer}`,
    );
  }
  const nodesResult = await runProcess(
    "kubectl",
    kubectlArguments(options, "get", "nodes", "-o", "json"),
  );
  const nodes =
    parseJson(nodesResult.stdout, "kubectl node response").items ?? [];
  const required = nodes.find(
    (node) => node.metadata?.name === registry.target.requiredReadyNode,
  );
  const ready = required?.status?.conditions?.some(
    (condition) => condition.type === "Ready" && condition.status === "True",
  );
  if (!ready) {
    throw new Error(
      `Required node ${registry.target.requiredReadyNode} is not Ready`,
    );
  }
  const names = new Set(nodes.map((node) => node.metadata?.name));
  const forbidden = registry.target.forbiddenNodes.filter((name) =>
    names.has(name),
  );
  if (forbidden.length > 0) {
    throw new Error(
      `Forbidden target nodes are present: ${forbidden.join(", ")}`,
    );
  }
};

const assertController = async (registry, options) => {
  const result = await runProcess(
    "kubeseal",
    [
      "--fetch-cert",
      "--kubeconfig",
      options.kubeconfig,
      "--context",
      options.context,
      "--controller-name",
      registry.sealedSecrets.controllerName,
      "--controller-namespace",
      registry.sealedSecrets.controllerNamespace,
    ],
    { allowFailure: true },
  );
  if (
    result.exitCode !== 0 ||
    !result.stdout.includes("-----BEGIN CERTIFICATE-----")
  ) {
    throw new Error(
      "Chronos Sealed Secrets controller certificate is unavailable",
    );
  }
};

export const fetchBitwardenSecrets = async (
  token,
  definitions,
  execute = runProcess,
) => {
  const records = [];
  for (const secret of definitions) {
    const result = await execute(
      "bws",
      ["secret", "get", secret.bitwardenSecretId, "--output", "json"],
      {
        allowFailure: true,
        environment: childEnvironment({ BWS_ACCESS_TOKEN: token }),
      },
    );
    if (result.exitCode !== 0)
      throw new Error("Bitwarden record lookup failed");
    const record = parseJson(result.stdout, "Bitwarden record");
    if (record?.id !== secret.bitwardenSecretId)
      throw new Error("Bitwarden record identity mismatch");
    records.push(record);
  }
  return records;
};

export const parseSecretFields = (recordKey, value, requiredFields) => {
  const fields = parseJson(value, `${recordKey} value`);
  object(fields, `${recordKey} value`);
  const keys = Object.keys(fields).sort();
  const expected = [...requiredFields].sort();
  const missing = expected.filter((key) => !keys.includes(key));
  const extra = keys.filter((key) => !expected.includes(key));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `${recordKey} field contract mismatch; missing=[${missing.join(",")}], extra=[${extra.join(",")}]`,
    );
  }
  for (const key of expected) {
    if (typeof fields[key] !== "string" || fields[key].length === 0) {
      throw new Error(`${recordKey}.${key} must be a non-empty string`);
    }
  }
  return fields;
};

export const selectSecrets = (registry, selectedNames) => {
  const requested =
    selectedNames.length === 0
      ? registry.secrets
      : registry.secrets.filter((entry) => selectedNames.includes(entry.name));
  const known = new Set(registry.secrets.map((entry) => entry.name));
  const unknown = selectedNames.filter((name) => !known.has(name));
  if (unknown.length > 0)
    throw new Error(`Unknown Secret: ${unknown.join(", ")}`);

  return requested;
};

export const resolveSecrets = (registry, records, requested) =>
  requested.map((secret) => {
    const recordKey = `${registry.bitwarden.basePrefix}/${secret.name}`;
    const matches = records.filter(
      (record) =>
        record?.id === secret.bitwardenSecretId && record?.key === recordKey,
    );
    if (matches.length !== 1) {
      throw new Error(`${recordKey} must resolve to exactly one BWS record`);
    }
    const record = matches[0];
    if (record.projectId !== registry.bitwarden.projectId) {
      throw new Error(`${recordKey} is not in the approved BWS project`);
    }
    return {
      secret,
      recordKey,
      fields: parseSecretFields(recordKey, record.value, secret.requiredFields),
    };
  });

const dockerConfig = (fields) => {
  const registry = fields.DOCKER_REGISTRY_URL.replace(/\/+$/u, "");
  const username = fields.DOCKER_USERNAME;
  const password = fields.DOCKER_PASSWORD;
  return JSON.stringify({
    auths: {
      [registry]: {
        username,
        password,
        auth: Buffer.from(`${username}:${password}`, "utf8").toString("base64"),
      },
    },
  });
};

export const buildSecretDocument = (definition, namespace, fields) => {
  const stringData =
    definition.render === "dockerconfigjson"
      ? { ".dockerconfigjson": dockerConfig(fields) }
      : Object.fromEntries(
          definition.requiredFields.map((field) => [field, fields[field]]),
        );
  const metadata = { name: definition.name, namespace };
  if (Object.keys(definition.labels).length > 0)
    metadata.labels = definition.labels;
  if (Object.keys(definition.annotations).length > 0) {
    metadata.annotations = definition.annotations;
  }
  return {
    apiVersion: "v1",
    kind: "Secret",
    metadata,
    type: definition.type,
    stringData,
  };
};

export const createRedactor = (values) => {
  const candidates = [...new Set(values.filter(Boolean))].sort(
    (left, right) => right.length - left.length,
  );
  return (input) => {
    let output = String(input);
    for (const value of candidates)
      output = output.split(value).join("[REDACTED]");
    return output;
  };
};

export const assertSafeSealedYaml = (sealedYaml, redact) => {
  if (redact(sealedYaml) !== sealedYaml) {
    throw new Error("SealedSecret output contains resolved plaintext");
  }
  if (!/^kind:\s*SealedSecret\s*$/mu.test(sealedYaml)) {
    throw new Error("kubeseal output is not a SealedSecret");
  }
  if (/^kind:\s*Secret\s*$/mu.test(sealedYaml)) {
    throw new Error("kubeseal returned a raw Secret");
  }
  if (/^\s*(data|stringData):\s*$/mu.test(sealedYaml)) {
    throw new Error("SealedSecret output contains raw Secret fields");
  }
};

const addSyncWave = async (sealedYaml, syncWave, redact) => {
  const result = await runProcess(
    "yq",
    [
      "e",
      '.metadata.annotations."argocd.argoproj.io/sync-wave" = strenv(SYNC_WAVE)',
      "-",
    ],
    {
      input: sealedYaml,
      redact,
      environment: childEnvironment({ SYNC_WAVE: syncWave }),
    },
  );
  return result.stdout;
};

export const assertSealedDocument = (input, definition, namespace) => {
  const parsed = object(input, "sealed manifest");
  const encryptedKeys = Object.keys(parsed.spec?.encryptedData ?? {}).sort();
  const expectedKeys =
    definition.render === "dockerconfigjson"
      ? [".dockerconfigjson"]
      : [...definition.requiredFields].sort();
  if (
    parsed.apiVersion !== "bitnami.com/v1alpha1" ||
    parsed.kind !== "SealedSecret" ||
    parsed.metadata?.name !== definition.name ||
    parsed.metadata?.namespace !== namespace ||
    parsed.spec?.template?.metadata?.name !== definition.name ||
    parsed.spec?.template?.metadata?.namespace !== namespace ||
    parsed.spec?.template?.type !== definition.type ||
    Object.values(parsed.spec?.encryptedData ?? {}).some(
      (value) => typeof value !== "string" || value.length === 0,
    ) ||
    ["data", "stringData"].some(
      (key) =>
        Object.hasOwn(parsed, key) ||
        Object.hasOwn(parsed.spec ?? {}, key) ||
        Object.hasOwn(parsed.spec?.template ?? {}, key),
    ) ||
    [parsed.metadata, parsed.spec?.template?.metadata].some((metadata) =>
      [
        "sealedsecrets.bitnami.com/cluster-wide",
        "sealedsecrets.bitnami.com/namespace-wide",
      ].some((key) => Object.hasOwn(metadata?.annotations ?? {}, key)),
    ) ||
    JSON.stringify(encryptedKeys) !== JSON.stringify(expectedKeys)
  ) {
    throw new Error(`${definition.name} sealed metadata contract failed`);
  }
};

const validateSealedStructure = async (
  sealedYaml,
  resolved,
  registry,
  options,
) => {
  const redact = createRedactor([
    ...Object.values(resolved.fields),
    JSON.stringify(resolved.fields),
  ]);
  assertSafeSealedYaml(sealedYaml, redact);
  const parsedResult = await runProcess("yq", ["e", "-o=json", ".", "-"], {
    input: sealedYaml,
    redact,
  });
  const parsed = parseJson(
    parsedResult.stdout,
    `${resolved.secret.name} sealed manifest`,
  );
  assertSealedDocument(parsed, resolved.secret, registry.target.namespace);
  const validation = await runProcess(
    "kubeseal",
    [
      "--validate",
      "--kubeconfig",
      options.kubeconfig,
      "--context",
      options.context,
      "--controller-name",
      registry.sealedSecrets.controllerName,
      "--controller-namespace",
      registry.sealedSecrets.controllerNamespace,
    ],
    { input: sealedYaml, redact },
  );
  if (validation.stdout.trim() !== "") {
    throw new Error(
      `${resolved.secret.name} validation returned unexpected output`,
    );
  }
  return sealedYaml;
};

const sealOne = async (resolved, registry, options) => {
  const document = buildSecretDocument(
    resolved.secret,
    registry.target.namespace,
    resolved.fields,
  );
  const rawDocument = `${JSON.stringify(document)}\n`;
  const redact = createRedactor([
    ...Object.values(resolved.fields),
    JSON.stringify(resolved.fields),
    rawDocument,
    ...(resolved.secret.render === "dockerconfigjson"
      ? [document.stringData[".dockerconfigjson"]]
      : []),
  ]);
  const result = await runProcess(
    "kubeseal",
    [
      "--kubeconfig",
      options.kubeconfig,
      "--context",
      options.context,
      "--controller-name",
      registry.sealedSecrets.controllerName,
      "--controller-namespace",
      registry.sealedSecrets.controllerNamespace,
      "--scope=strict",
      "--format=yaml",
      `--namespace=${registry.target.namespace}`,
    ],
    { input: rawDocument, redact },
  );
  const annotated = await addSyncWave(
    result.stdout,
    registry.sealedSecrets.syncWave,
    redact,
  );
  await validateSealedStructure(annotated, resolved, registry, options);
  return { resolved, yaml: annotated };
};

const assertKustomization = async (registry) => {
  const filePath = absoluteFromRepository(registry.output.kustomization);
  const result = await runProcess("yq", [
    "e",
    "-o=json",
    ".resources",
    filePath,
  ]);
  const resources = parseJson(result.stdout, "secrets kustomization resources");
  const expected = registry.secrets
    .map((entry) => `${entry.name}.sealed.yaml`)
    .sort();
  if (
    !Array.isArray(resources) ||
    JSON.stringify([...resources].sort()) !== JSON.stringify(expected)
  ) {
    throw new Error(
      "Secrets kustomization must list exactly all registered ciphertext files",
    );
  }
};

const writeValidatedBatch = async (registry, generated) => {
  const directory = absoluteFromRepository(registry.output.directory);
  await mkdir(directory, { recursive: true });
  const temporaryPaths = [];
  try {
    for (const item of generated) {
      const finalPath = path.join(
        directory,
        `${item.resolved.secret.name}.sealed.yaml`,
      );
      const temporaryPath = `${finalPath}.tmp-${String(process.pid)}`;
      await writeFile(temporaryPath, item.yaml, { mode: 0o600, flag: "wx" });
      temporaryPaths.push({ temporaryPath, finalPath });
    }
    for (const { temporaryPath, finalPath } of temporaryPaths) {
      await rename(temporaryPath, finalPath);
      await chmod(finalPath, 0o644);
      console.error(`Wrote ${path.relative(REPOSITORY_ROOT, finalPath)}`);
    }
  } catch (error) {
    await Promise.all(
      temporaryPaths.map(({ temporaryPath }) =>
        rm(temporaryPath, { force: true }),
      ),
    );
    throw error;
  }
};

export const run = async (options) => {
  if (!options.registryPath || !options.kubeconfig || !options.context) {
    throw new Error(
      "Explicit --registry, --kubeconfig, and --context are required",
    );
  }
  const registry = normalizeRegistry(
    parseJson(
      await readFile(absoluteFromRepository(options.registryPath), "utf8"),
      "secret registry",
    ),
  );
  const requested = selectSecrets(registry, options.secretNames);
  options.kubeconfig = path.resolve(options.kubeconfig);
  for (const command of ["bws", "kubectl", "kubeseal", "yq"]) {
    await requireCommand(command);
  }
  await assertTarget(registry, options);
  await assertController(registry, options);
  await assertKustomization(registry);
  const token = await readAccessToken({ runProcess });
  const records = await fetchBitwardenSecrets(token, requested);
  const resolved = resolveSecrets(registry, records, requested);
  const generated = [];
  for (const secret of resolved) {
    generated.push(await sealOne(secret, registry, options));
    console.error(
      `Validated ${secret.secret.name}: ${secret.secret.requiredFields.slice().sort().join(", ")}`,
    );
  }
  await writeValidatedBatch(registry, generated);
};

const main = async () => {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  await run(options);
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
