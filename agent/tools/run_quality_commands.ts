import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  GeneratedFileSchema,
  QualityPlanSchema,
  SandboxValidationResultSchema,
} from "../lib/schemas.js";
import {
  applyBuildStatus,
  commandInGeneratedWorkspace,
  createInitialBuildStatus,
  generatedWorkspacePath,
  normalizeCommandResult,
  normalizeQualityCommands,
} from "../lib/sandbox.js";

export default defineTool({
  description:
    "Run finite install, typecheck, lint, test, and build commands for the generated app in the Eve sandbox. Do not use this for long-running preview commands.",
  inputSchema: z.object({
    files: z.array(GeneratedFileSchema).min(1),
    qualityPlan: QualityPlanSchema,
  }),
  outputSchema: SandboxValidationResultSchema,
  async execute({ files, qualityPlan }, ctx) {
    const sandbox = await ctx.getSandbox();
    const commands = normalizeQualityCommands(files, qualityPlan);
    const commandResults = [];
    const buildStatus = createInitialBuildStatus();

    for (const command of commands) {
      const result = await sandbox.run({
        command: commandInGeneratedWorkspace(command),
      });
      const normalizedResult = normalizeCommandResult(command, result);
      commandResults.push(normalizedResult);
      applyBuildStatus(buildStatus, command, normalizedResult.exitCode);

      if (
        normalizedResult.exitCode !== 0 &&
        normalizedResult.exitCode !== null
      ) {
        return {
          agent: "sandbox" as const,
          status: "build_failed" as const,
          sandboxId: sandbox.id,
          workspacePath: generatedWorkspacePath,
          message: `Sandbox command failed: ${command}`,
          commands,
          commandResults,
          buildStatus,
          previewCommand: null,
          previewPort: qualityPlan.previewPort,
          notes: [
            "Generated files were written, but at least one quality command failed.",
          ],
          nextAgent: "autofix" as const,
        };
      }
    }

    return {
      agent: "sandbox" as const,
      status: "ready_for_review" as const,
      sandboxId: sandbox.id,
      workspacePath: generatedWorkspacePath,
      message: "Sandbox quality commands passed.",
      commands,
      commandResults,
      buildStatus,
      previewCommand: qualityPlan.previewCommand,
      previewPort: qualityPlan.previewPort,
      notes: [
        "Quality validation passed.",
        "Run start_preview next if the generated app needs a live preview process.",
      ],
      nextAgent: "security_review" as const,
    };
  },
});
