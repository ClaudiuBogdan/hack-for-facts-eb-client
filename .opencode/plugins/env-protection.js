/**
 * Prevent OpenCode from reading common local secret files.
 *
 * Permission rules in opencode.jsonc provide the first line of defense; this
 * plugin catches direct tool calls and shell reads that bypass broad patterns.
 */
export const EnvProtection = async () => {
  const secretPathPattern = /(^|\/)(\.env($|\.)|.*key.*\.pem$)/i;
  const shellReadPattern =
    /\b(cat|head|tail|less|more|sed|awk|grep|rg|node|python|python3|cp|open|vi|vim|nano|code)\b[\s\S]*(^|\/)?(\.env($|\.)|[^\s]*key[^\s]*\.pem)/i;

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
        if (shellReadPattern.test(command) && !command.includes(".env.example")) {
          throw new Error("Access denied: shell reads of local secret files are blocked.");
        }
      }
    },
  };
};
