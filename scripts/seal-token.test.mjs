import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import test from "node:test";
import {
  KEYCHAIN_SERVICE,
  readAccessToken,
  readHiddenToken,
} from "./seal-token.mjs";

const terminal = () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const signals = new EventEmitter();
  input.isTTY = true;
  output.isTTY = true;
  input.isRaw = false;
  input.setRawMode = (value) => {
    input.isRaw = value;
  };
  let printed = "";
  output.on("data", (chunk) => {
    printed += chunk;
  });
  return { input, output, signals, printed: () => printed };
};

test("Keychain uses the current account and fixed service without secret arguments", async () => {
  const calls = [];
  const value = await readAccessToken({
    platform: "darwin",
    account: () => "alice",
    runProcess: async (...args) => {
      calls.push(args);
      return { exitCode: 0, stdout: "sensitive-token\n" };
    },
    prompt: () => {
      throw new Error("must not prompt");
    },
  });
  assert.equal(value, "sensitive-token");
  assert.deepEqual(calls[0][1], [
    "find-generic-password",
    "-a",
    "alice",
    "-s",
    KEYCHAIN_SERVICE,
    "-w",
  ]);
  assert.equal(JSON.stringify(calls).includes("sensitive-token"), false);
});

test("Keychain failures do not surface sensitive diagnostics", async () => {
  const value = await readAccessToken({
    platform: "darwin",
    account: () => "alice",
    runProcess: async () => {
      throw new Error("SENSITIVE child output");
    },
    prompt: async () => "manual-token",
  });
  assert.equal(value, "manual-token");
});

test("non-Mac uses a hidden prompt without looking up an account", async () => {
  assert.equal(
    await readAccessToken({
      platform: "linux",
      account: () => {
        throw new Error("not called");
      },
      prompt: async () => "manual",
    }),
    "manual",
  );
});

test("hidden input handles edits and restores terminal without echoing the token", async () => {
  const t = terminal();
  const result = readHiddenToken(t);
  t.input.emit("data", Buffer.from("secrex\u007ft\r"));
  assert.equal(await result, "secret");
  assert.equal(t.input.isRaw, false);
  assert.equal(t.printed().includes("secret"), false);
  assert.equal(t.input.listenerCount("data"), 0);
});

for (const event of [
  "end",
  "close",
  "error",
  "SIGINT",
  "SIGTERM",
  "SIGHUP",
  "ctrl-c",
  "ctrl-d",
]) {
  test(`hidden input restores terminal and handlers after ${event}`, async () => {
    const t = terminal();
    t.input.isRaw = true;
    const result = readHiddenToken(t);
    if (event.startsWith("SIG")) t.signals.emit(event);
    else if (event === "ctrl-c" || event === "ctrl-d")
      t.input.emit(
        "data",
        Buffer.from(event === "ctrl-c" ? "\u0003" : "\u0004"),
      );
    else
      t.input.emit(
        event,
        event === "error" ? new Error("sensitive-input") : undefined,
      );
    await assert.rejects(result, /token input cancelled/);
    assert.equal(t.input.isRaw, true);
    assert.equal(t.input.listenerCount("data"), 0);
    assert.equal(t.signals.listenerCount("SIGINT"), 0);
    assert.equal(t.signals.listenerCount("SIGTERM"), 0);
  });
}

test("noninteractive fallback fails without reading stdin", () => {
  const t = terminal();
  t.input.isTTY = false;
  assert.throws(() => readHiddenToken(t), /interactive terminal/);
});

for (const failure of ["setup", "cleanup", "output"]) {
  test(`terminal ${failure} failure restores remaining state and settles without diagnostics`, async () => {
    const t = terminal();
    if (failure === "setup")
      t.input.resume = () => {
        throw new Error("sensitive setup");
      };
    if (failure === "output")
      t.output.write = () => {
        throw new Error("sensitive output");
      };
    const result = readHiddenToken(t);
    if (failure === "cleanup") {
      t.input.setRawMode = () => {
        throw new Error("sensitive cleanup");
      };
      t.input.emit("data", Buffer.from("secret\r"));
    }
    await assert.rejects(result, (error) => {
      assert.equal(error.message.includes("sensitive"), false);
      return true;
    });
    assert.equal(t.input.listenerCount("data"), 0);
    assert.equal(t.signals.listenerCount("SIGTERM"), 0);
    if (failure !== "cleanup") assert.equal(t.input.isRaw, false);
  });
}
