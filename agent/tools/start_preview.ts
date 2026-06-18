import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  commandInGeneratedWorkspace,
  generatedWorkspacePath,
  normalizePreviewCommand,
  redactSensitive,
} from "../lib/sandbox.js";

export default defineTool({
  description:
    "Start the generated app preview process in the Eve sandbox and verify it responds over HTTP before reporting success. Mayar v1 reports the sandbox id, preview command, and port, not an external preview URL.",
  inputSchema: z.object({
    previewCommand: z.string().min(1),
    previewPort: z.number().int().positive().default(4173),
  }),
  async execute({ previewCommand, previewPort }, ctx) {
    const sandbox = await ctx.getSandbox();
    const normalizedPreviewCommand = normalizePreviewCommand(
      previewCommand,
      previewPort,
    );
    const processHandle = await sandbox.spawn({
      command: commandInGeneratedWorkspace(normalizedPreviewCommand),
    });
    const probeCommand = [
      `for i in $(seq 1 45); do`,
      `node -e "fetch('http://127.0.0.1:${previewPort}').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"`,
      `&& exit 0;`,
      `sleep 2;`,
      `done;`,
      `echo 'Preview did not respond on port ${previewPort}' >&2;`,
      `exit 1`,
    ].join(" ");
    const probeResult = await sandbox.run({
      command: commandInGeneratedWorkspace(probeCommand),
    });

    if (probeResult.exitCode !== 0 && probeResult.exitCode !== null) {
      if (typeof processHandle.kill === "function") {
        await processHandle.kill();
      }

      return {
        agent: "sandbox" as const,
        status: "build_failed" as const,
        sandboxId: sandbox.id,
        workspacePath: generatedWorkspacePath,
        message: "Preview process started, but the health check did not pass.",
        previewCommand: redactSensitive(normalizedPreviewCommand),
        previewPort,
        previewProcessStarted: true,
        previewHealthCheck: {
          ok: false,
          command: redactSensitive(probeCommand),
          exitCode: probeResult.exitCode ?? null,
          stdout: redactSensitive(probeResult.stdout ?? ""),
          stderr: redactSensitive(probeResult.stderr ?? ""),
        },
        notes: [
          "The generated app is not preview-ready until this health check passes.",
          "Call autofix with the preview failure details, then rerun quality commands and start_preview.",
        ],
        nextAgent: "autofix" as const,
      };
    }

    return {
      agent: "sandbox" as const,
      status: "preview_ready" as const,
      sandboxId: sandbox.id,
      workspacePath: generatedWorkspacePath,
      message:
        "Preview process was started and responded to the HTTP health check. Mayar v1 does not resolve an external preview URL.",
      previewCommand: redactSensitive(normalizedPreviewCommand),
      previewPort,
      previewProcessStarted: true,
      previewHealthCheck: {
        ok: true,
        command: redactSensitive(probeCommand),
        exitCode: probeResult.exitCode ?? null,
        stdout: redactSensitive(probeResult.stdout ?? ""),
        stderr: redactSensitive(probeResult.stderr ?? ""),
      },
      process: {
        waitAvailable: typeof processHandle.wait === "function",
        killAvailable: typeof processHandle.kill === "function",
      },
      notes: [
        "Preview is reachable inside the Eve sandbox on the reported port.",
        "External preview URL support should be added as a later adapter.",
      ],
      nextAgent: "security_review" as const,
    };
  },
});
