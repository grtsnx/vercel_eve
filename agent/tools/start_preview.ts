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
    "Start the generated app preview process in the Eve sandbox. Mayar v1 reports the sandbox id, preview command, and port, not an external preview URL.",
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

    return {
      agent: "sandbox" as const,
      status: "ready_for_review" as const,
      sandboxId: sandbox.id,
      workspacePath: generatedWorkspacePath,
      message:
        "Preview process was started. Mayar v1 does not resolve an external preview URL.",
      previewCommand: redactSensitive(normalizedPreviewCommand),
      previewPort,
      previewProcessStarted: true,
      process: {
        waitAvailable: typeof processHandle.wait === "function",
        killAvailable: typeof processHandle.kill === "function",
      },
      notes: [
        "Use Eve stream events and sandbox id for inspection.",
        "External preview URL support should be added as a later adapter.",
      ],
      nextAgent: "security_review" as const,
    };
  },
});
