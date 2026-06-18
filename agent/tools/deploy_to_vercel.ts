import { defineTool } from "eve/tools";
import { z } from "zod";
import { VercelDeploymentResultSchema } from "../lib/schemas.js";
import {
  commandInGeneratedWorkspace,
  generatedWorkspacePath,
  normalizeCommandResult,
  redactSensitive,
} from "../lib/sandbox.js";

const defaultDeployEnvAllowlist = [
  "AI_GATEWAY_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "INSFORGE_API_BASE_URL",
  "INSFORGE_API_KEY",
] as const;

export default defineTool({
  description:
    "Deploy the validated generated app from /workspace/generated-app to Vercel, then verify the deployment URL with vercel curl. Requires VERCEL_TOKEN in the Mayar runtime environment.",
  inputSchema: z.object({
    target: z.enum(["preview", "production"]).default("preview"),
    projectName: z.string().min(1).optional(),
    scope: z.string().min(1).optional(),
    envVarNames: z.array(z.string().min(1)).default([]),
  }),
  outputSchema: VercelDeploymentResultSchema,
  async execute({ target, projectName, scope, envVarNames }, ctx) {
    const sandbox = await ctx.getSandbox();
    const token = process.env.VERCEL_TOKEN;

    if (!token) {
      return {
        agent: "vercel_deploy" as const,
        status: "blocked" as const,
        message:
          "Vercel deployment requires VERCEL_TOKEN in Mayar's runtime environment.",
        target,
        sandboxId: sandbox.id,
        workspacePath: generatedWorkspacePath,
        deploymentUrl: null,
        inspectUrl: null,
        projectName: projectName ?? process.env.VERCEL_PROJECT_NAME ?? null,
        command: null,
        verify: {
          ok: false,
          command: null,
          exitCode: null,
          stdout: "",
          stderr: "Missing VERCEL_TOKEN.",
        },
        notes: [
          "Add VERCEL_TOKEN to .env.local or the deployed Mayar environment.",
          "Optional: set VERCEL_PROJECT_NAME and VERCEL_SCOPE to control where generated apps deploy.",
        ],
        nextAgent: "user_action" as const,
      };
    }

    const resolvedProjectName =
      projectName ?? process.env.VERCEL_PROJECT_NAME ?? undefined;
    const resolvedScope = scope ?? process.env.VERCEL_SCOPE ?? undefined;
    const deployCommand = buildDeployCommand({
      target,
      token,
      projectName: resolvedProjectName,
      scope: resolvedScope,
      envVarNames,
    });
    const deployResult = await sandbox.run({
      command: commandInGeneratedWorkspace(deployCommand),
    });
    const normalizedDeploy = normalizeCommandResult(deployCommand, deployResult);
    const deployment = parseDeploymentOutput(deployResult.stdout ?? "");

    if (
      normalizedDeploy.exitCode !== 0 ||
      !deployment.url
    ) {
      return {
        agent: "vercel_deploy" as const,
        status: "failed" as const,
        message:
          "Vercel deployment did not complete or did not return a deployment URL.",
        target,
        sandboxId: sandbox.id,
        workspacePath: generatedWorkspacePath,
        deploymentUrl: null,
        inspectUrl: deployment.inspectUrl,
        projectName: resolvedProjectName ?? null,
        command: normalizedDeploy.command,
        verify: {
          ok: false,
          command: null,
          exitCode: null,
          stdout: normalizedDeploy.stdout,
          stderr: normalizedDeploy.stderr,
        },
        notes: [
          "If this is a generated-app build error, call autofix and redeploy.",
          "If this is an authentication or team/project issue, the user must update Vercel configuration.",
        ],
        nextAgent: "autofix" as const,
      };
    }

    const verifyCommand = buildVerifyCommand({
      token,
      deploymentUrl: deployment.url,
      scope: resolvedScope,
    });
    const verifyResult = await sandbox.run({
      command: commandInGeneratedWorkspace(verifyCommand),
    });
    const normalizedVerify = normalizeCommandResult(verifyCommand, verifyResult);
    const verified =
      normalizedVerify.exitCode === 0 || normalizedVerify.exitCode === null;

    return {
      agent: "vercel_deploy" as const,
      status: verified ? ("deployed" as const) : ("failed" as const),
      message: verified
        ? "Generated app deployed to Vercel and the preview URL was verified."
        : "Generated app deployed to Vercel, but preview verification failed.",
      target,
      sandboxId: sandbox.id,
      workspacePath: generatedWorkspacePath,
      deploymentUrl: deployment.url,
      inspectUrl: deployment.inspectUrl,
      projectName: resolvedProjectName ?? null,
      command: normalizedDeploy.command,
      verify: {
        ok: verified,
        command: normalizedVerify.command,
        exitCode: normalizedVerify.exitCode,
        stdout: normalizedVerify.stdout,
        stderr: normalizedVerify.stderr,
      },
      notes: verified
        ? [
            "The deployment URL is the user-facing preview for the generated app.",
            "Secrets were passed through Vercel deployment env flags only; they were not written to generated files.",
          ]
        : [
            "The URL was returned by Vercel, but vercel curl could not verify the root route.",
            "Call autofix if the failure is app-related; otherwise ask the user to check Vercel access/protection settings.",
          ],
      nextAgent: verified ? ("complete" as const) : ("autofix" as const),
    };
  },
});

function buildDeployCommand(input: {
  target: "preview" | "production";
  token: string;
  projectName?: string;
  scope?: string;
  envVarNames: readonly string[];
}): string {
  const args = [
    "deploy",
    "--yes",
    "--archive=tgz",
    "--format",
    "json",
    "--non-interactive",
  ];

  if (input.target === "production") {
    args.push("--prod");
  }

  if (input.projectName) {
    args.push("--project", shellQuote(input.projectName));
  }

  if (input.scope) {
    args.push("--scope", shellQuote(input.scope));
  }

  for (const flag of buildVercelEnvFlags(input.envVarNames)) {
    args.push(flag);
  }

  return vercelCommand(input.token, args);
}

function buildVerifyCommand(input: {
  token: string;
  deploymentUrl: string;
  scope?: string;
}): string {
  const args = [
    "curl",
    "/",
    "--deployment",
    shellQuote(input.deploymentUrl),
    "--yes",
    "--non-interactive",
  ];

  if (input.scope) {
    args.push("--scope", shellQuote(input.scope));
  }

  return vercelCommand(input.token, args);
}

function buildVercelEnvFlags(requestedEnvVarNames: readonly string[]): string[] {
  const configuredAllowlist = (process.env.MAYAR_DEPLOY_ENV_ALLOWLIST ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  const envNames = [
    ...new Set([
      ...defaultDeployEnvAllowlist,
      ...configuredAllowlist,
      ...requestedEnvVarNames,
    ]),
  ].filter((name) => isSafeServerEnvName(name));

  return envNames.flatMap((name) => {
    const value = process.env[name];
    if (!value) return [];

    const pair = `${name}=${value}`;
    return ["-e", shellQuote(pair), "-b", shellQuote(pair)];
  });
}

function parseDeploymentOutput(output: string): {
  url: string | null;
  inspectUrl: string | null;
} {
  const parsedOutput = parseDeploymentJson(output.trim());
  if (parsedOutput.url) return parsedOutput;

  for (const candidate of output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .reverse()) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (parsed && typeof parsed === "object") {
        const record = parsed as Record<string, unknown>;
        const url = normalizeDeploymentUrl(record.url);
        const inspectUrl = normalizeDeploymentUrl(
          record.inspectUrl ?? record.inspectorUrl,
        );

        if (url) {
          return { url, inspectUrl };
        }
      }
    } catch {
      const url = normalizeDeploymentUrl(candidate);
      if (url) return { url, inspectUrl: null };
    }
  }

  const match = output.match(/https?:\/\/[^\s"']+\.vercel\.app[^\s"']*/i);
  return {
    url: normalizeDeploymentUrl(match?.[0] ?? null),
    inspectUrl: null,
  };
}

function parseDeploymentJson(value: string): {
  url: string | null;
  inspectUrl: string | null;
} {
  if (!value) return { url: null, inspectUrl: null };

  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      return {
        url: normalizeDeploymentUrl(record.url),
        inspectUrl: normalizeDeploymentUrl(
          record.inspectUrl ?? record.inspectorUrl,
        ),
      };
    }
  } catch {
    return { url: null, inspectUrl: null };
  }

  return { url: null, inspectUrl: null };
}

function normalizeDeploymentUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;

  const trimmed = redactSensitive(value.trim());
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[A-Za-z0-9.-]+\.vercel\.app(?:\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return null;
}

function isSafeServerEnvName(name: string): boolean {
  return (
    /^[A-Z][A-Z0-9_]*$/.test(name) &&
    !name.startsWith("NEXT_PUBLIC_") &&
    !name.includes("TOKEN") &&
    name !== "VERCEL_TOKEN"
  );
}

function vercelCommand(token: string, args: readonly string[]): string {
  const commandArgs = args.join(" ");
  const envPrefix = `VERCEL_TOKEN=${shellQuote(token)}`;

  return [
    "if command -v vercel >/dev/null 2>&1; then",
    `${envPrefix} vercel ${commandArgs};`,
    "else",
    `${envPrefix} npx --yes vercel@latest ${commandArgs};`,
    "fi",
  ].join(" ");
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
