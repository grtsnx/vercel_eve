import { z } from "zod";

export const AgentUsageSchema = z.object({
  notes: z.array(z.string()).default([]),
});

export const IntentDecisionSchema = z.object({
  allowed: z.boolean(),
  intent: z.enum(["conversation", "build", "edit", "analyze", "unsafe"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  reason: z.string(),
  nextAgent: z
    .enum([
      "conversation",
      "orchestrator",
      "repair",
      "validation",
      "none",
    ])
    .nullable(),
});

export const ConversationResultSchema = z.object({
  response: z.string(),
});

export const OrchestratorPlanSchema = z.object({
  objective: z.string(),
  userLanguage: z.string(),
  requestType: z.enum(["build", "edit", "analyze"]),
  brief: z.string(),
  constraints: z.array(z.string()),
  requiredCapabilities: z.array(z.string()),
  nextAgent: z.literal("design_research"),
  handoffInstructions: z.string(),
});

export const DesignResearchResultSchema = z.object({
  summary: z.string(),
  referoMcpUsed: z.literal(false),
  references: z.array(
    z.object({
      title: z.string(),
      source: z.string(),
      url: z.string().nullable().optional(),
      relevance: z.string(),
      patterns: z.array(z.string()),
    }),
  ),
  targetAudience: z.string(),
  visualDirection: z.object({
    mood: z.string(),
    theme: z.enum(["light", "dark", "system"]),
    rationale: z.string(),
  }),
  designSpec: z.object({
    palette: z.object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
      background: z.string(),
      foreground: z.string(),
      muted: z.string(),
    }),
    typography: z.object({
      heading: z.string(),
      body: z.string(),
      scale: z.array(z.string()),
    }),
    spacing: z.object({
      unit: z.number(),
      scale: z.array(z.number()),
    }),
    radius: z.object({
      card: z.string(),
      button: z.string(),
      input: z.string(),
    }),
  }),
  informationArchitecture: z.object({
    siteMode: z.enum(["multi_page", "single_page"]),
    siteModeRationale: z.string(),
    sitemap: z.array(
      z.object({
        path: z.string(),
        title: z.string(),
        purpose: z.string(),
      }),
    ),
    sections: z.array(
      z.object({
        name: z.string(),
        purpose: z.string(),
        priority: z.enum(["low", "medium", "high"]),
      }),
    ),
  }),
  recommendedExtras: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      reason: z.string(),
      priority: z.enum(["low", "medium", "high"]),
    }),
  ),
  componentGuidance: z.array(
    z.object({
      component: z.string(),
      guidance: z.string(),
    }),
  ),
  risks: z.array(z.string()),
  approvalPrompt: z.string(),
});

export const GeneratedFileSchema = z.object({
  path: z.string(),
  content: z.string(),
  purpose: z.string(),
});

export const QualityPlanSchema = z.object({
  packageManager: z.enum(["bun", "npm", "pnpm", "yarn"]).default("bun"),
  commands: z.array(z.string()),
  previewCommand: z.string(),
  previewPort: z.number().int().positive(),
  autofixAgentRequired: z.boolean(),
  codeReviewAgentRequired: z.boolean(),
});

export const CodeWriterResultSchema = z.object({
  agent: z.literal("code_writer"),
  status: z.enum(["code_ready", "sandbox_tools_required", "blocked"]),
  message: z.string(),
  selectedStarter: z.object({
    name: z.string(),
    source: z.string(),
    reason: z.string(),
  }),
  stack: z.object({
    framework: z.literal("Next.js"),
    language: z.literal("TypeScript"),
    packageManager: z.enum(["bun", "npm", "pnpm", "yarn"]),
    styling: z.array(z.string()),
    backend: z.object({
      provider: z.string(),
      reason: z.string(),
    }),
  }),
  toolRequirements: z.array(
    z.object({
      name: z.string(),
      category: z.string(),
      requiredWhen: z.string(),
      usage: z.string(),
      status: z.enum(["required", "optional", "not_applicable"]),
    }),
  ),
  filePlan: z.array(
    z.object({
      path: z.string(),
      purpose: z.string(),
    }),
  ),
  files: z.array(GeneratedFileSchema),
  implementationSteps: z.array(z.string()),
  qualityPlan: QualityPlanSchema,
  sandbox: z.object({
    required: z.boolean(),
    status: z.enum(["not_started", "running", "deployed", "failed"]),
    commands: z.array(z.string()),
    previewUrl: z.string().nullable(),
    note: z.string(),
  }),
  handoff: z.object({
    nextAgent: z.enum(["sandbox", "autofix", "security_review"]),
    reason: z.string(),
  }),
});

export const SandboxCommandResultSchema = z.object({
  command: z.string(),
  exitCode: z.number().nullable(),
  stdout: z.string(),
  stderr: z.string(),
});

export const SandboxValidationResultSchema = z.object({
  agent: z.literal("sandbox"),
  status: z.enum(["not_started", "running", "blocked", "build_failed", "ready_for_review"]),
  sandboxId: z.string(),
  workspacePath: z.literal("generated-app"),
  message: z.string(),
  commands: z.array(z.string()),
  commandResults: z.array(SandboxCommandResultSchema),
  buildStatus: z.object({
    install: z.enum(["not_started", "passed", "failed", "skipped"]),
    typecheck: z.enum(["not_started", "passed", "failed", "skipped"]),
    lint: z.enum(["not_started", "passed", "failed", "skipped"]),
    build: z.enum(["not_started", "passed", "failed", "skipped"]),
  }),
  previewCommand: z.string().nullable(),
  previewPort: z.number().int().positive().nullable(),
  notes: z.array(z.string()),
  nextAgent: z.enum(["autofix", "security_review", "user_approval"]).nullable(),
});

export const VercelDeploymentResultSchema = z.object({
  agent: z.literal("vercel_deploy"),
  status: z.enum(["deployed", "blocked", "failed"]),
  message: z.string(),
  target: z.enum(["preview", "production"]),
  sandboxId: z.string(),
  workspacePath: z.literal("generated-app"),
  deploymentUrl: z.string().url().nullable(),
  inspectUrl: z.string().url().nullable(),
  projectName: z.string().nullable(),
  command: z.string().nullable(),
  verify: z.object({
    ok: z.boolean(),
    command: z.string().nullable(),
    exitCode: z.number().nullable(),
    stdout: z.string(),
    stderr: z.string(),
  }),
  notes: z.array(z.string()),
  nextAgent: z.enum(["complete", "autofix", "user_action"]),
});

export const AutofixResultSchema = z.object({
  agent: z.literal("autofix"),
  status: z.enum(["patched", "blocked"]),
  message: z.string(),
  attempt: z.number().int().positive(),
  fixes: z.array(
    z.object({
      area: z.string(),
      explanation: z.string(),
      files: z.array(z.string()),
    }),
  ),
  files: z.array(GeneratedFileSchema),
  qualityPlan: QualityPlanSchema.nullable(),
  handoff: z.object({
    nextAgent: z.enum(["sandbox", "user_approval"]),
    reason: z.string(),
  }),
});

export const SecurityReviewResultSchema = z.object({
  agent: z.literal("security_review"),
  status: z.enum(["passed", "needs_fixes", "blocked"]),
  summary: z.string(),
  reviewedFiles: z.array(z.string()),
  findings: z.array(
    z.object({
      severity: z.enum(["critical", "high", "medium", "low", "info"]),
      category: z.string(),
      file: z.string().nullable(),
      issue: z.string(),
      evidence: z.string(),
      recommendation: z.string(),
    }),
  ),
  hardeningNotes: z.array(z.string()),
  nextAgent: z.enum(["complete", "autofix", "user_approval"]),
});

export type CodeWriterResult = z.infer<typeof CodeWriterResultSchema>;
export type ConversationResult = z.infer<typeof ConversationResultSchema>;
export type GeneratedFile = z.infer<typeof GeneratedFileSchema>;
export type QualityPlan = z.infer<typeof QualityPlanSchema>;
export type SandboxValidationResult = z.infer<
  typeof SandboxValidationResultSchema
>;
export type VercelDeploymentResult = z.infer<typeof VercelDeploymentResultSchema>;
