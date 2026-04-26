/**
 * Prevent OpenCode from reading common local secret files.
 *
 * Permission rules in opencode.jsonc provide the first line of defense; this
 * plugin catches direct tool calls and shell reads that bypass broad patterns.
 */
export const EnvProtection = async () => {
  const secretPathPattern = /(^|\/)(\.env($|\.)|.*key.*\.pem$)/i;
  const shellReadToolPattern =
    /\b(cat|head|tail|less|more|sed|awk|grep|rg|node|python|python3|cp|open|vi|vim|nano|code)\b/i;
  const shellSecretPathPattern =
    /(?:^|[\s"'`])([^\s"'`]*?(?:\.env(?:\.[^\s"'`]*)?|[^/\s"'`]*key[^/\s"'`]*\.pem))(?=$|[\s"'`])/gi;
  const allowedExampleEnvPattern = /(^|\/)\.env\.example$/i;

  const commandReadsSecretPath = (command) => {
    if (!shellReadToolPattern.test(command)) {
      return false;
    }

    return [...command.matchAll(shellSecretPathPattern)].some((match) => {
      const matchedPath = match[1] ?? "";
      return !allowedExampleEnvPattern.test(matchedPath);
    });
  };

  return {
    "tool.execute.before": async (input, output) => {
      if (input.tool === "read") {
        const filePath = output.args?.filePath ?? output.args?.path ?? "";
        if (secretPathPattern.test(filePath) && !filePath.endsWith(".env.example")) {
          throw new Error("Access denied: local secret files cannot be read. Use .env.example instead.");
        }
      }

      if (input.tool === "bash") {
        const command = output.args?.command ?? "";
        if (commandReadsSecretPath(command)) {
          throw new Error("Access denied: shell reads of local secret files are blocked.");
        }
      }
    },
  };
};
