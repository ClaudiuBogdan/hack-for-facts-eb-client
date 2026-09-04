import { userInfo } from "node:os";

export const KEYCHAIN_SERVICE = "transparenta-bws-access-token";

// Read directly from the terminal. The token never enters shell history or argv.
export const readHiddenToken = ({
  input = process.stdin,
  output = process.stderr,
  signals = process,
} = {}) => {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== "function") {
    throw new Error(
      "Unlock the Keychain credential or run from an interactive terminal",
    );
  }
  return new Promise((resolve, reject) => {
    const wasRaw = Boolean(input.isRaw);
    let value = "";
    let settled = false;
    const cleanup = () => {
      input.removeListener("data", onData);
      for (const event of ["end", "close", "error"])
        input.removeListener(event, cancel);
      for (const event of ["SIGINT", "SIGTERM", "SIGHUP"])
        signals.removeListener(event, cancel);
      let failed = false;
      for (const restore of [
        () => input.setRawMode(wasRaw),
        () => input.pause(),
        () => output.write("\n"),
      ]) {
        try {
          restore();
        } catch {
          failed = true;
        }
      }
      return failed;
    };
    const finish = (error) => {
      if (settled) return;
      settled = true;
      const cleanupFailed = cleanup();
      if (cleanupFailed)
        reject(new Error("Could not restore terminal after token input"));
      else if (error) reject(error);
      else if (!value.trim())
        reject(new Error("Bitwarden access token is required"));
      else resolve(value.trim());
      value = "";
    };
    const cancel = () => finish(new Error("Bitwarden token input cancelled"));
    const onData = (chunk) => {
      for (const char of chunk.toString("utf8")) {
        if (char === "\r" || char === "\n") {
          finish();
          return;
        }
        if (char === "\u0003" || char === "\u0004" || char === "\u001b") {
          cancel();
          return;
        }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else if (char >= " ") value += char;
      }
    };
    try {
      input.on("data", onData);
      for (const event of ["end", "close", "error"]) input.once(event, cancel);
      for (const event of ["SIGINT", "SIGTERM", "SIGHUP"])
        signals.once(event, cancel);
      input.setRawMode(true);
      output.write("Bitwarden access token (hidden): ");
      input.resume();
    } catch {
      finish(new Error("Could not start hidden token input"));
    }
  });
};

export const readAccessToken = async ({
  runProcess,
  platform = process.platform,
  account = () => userInfo().username,
  prompt = readHiddenToken,
} = {}) => {
  if (platform === "darwin") {
    try {
      const result = await runProcess(
        "/usr/bin/security",
        [
          "find-generic-password",
          "-a",
          account(),
          "-s",
          KEYCHAIN_SERVICE,
          "-w",
        ],
        { allowFailure: true },
      );
      if (result.exitCode === 0 && result.stdout.trim())
        return result.stdout.trim();
    } catch {
      // Keychain diagnostics may contain sensitive data. Only a hidden prompt follows.
    }
  }
  return prompt();
};
