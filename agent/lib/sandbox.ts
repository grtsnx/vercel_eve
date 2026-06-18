import type {
  GeneratedFile,
  QualityPlan,
  SandboxValidationResult,
} from "./schemas.js";

type RawSandboxCommandResult = {
  readonly exitCode?: number | null;
  readonly output?: string;
  readonly stderr?: string;
  readonly stdout?: string;
};

export const generatedWorkspacePath = "generated-app" as const;

const secretPatterns = [
  /Bearer\s+[^\s"',}]+/gi,
  /(api[_-]?key["']?\s*[:=]\s*["']?)[^"',}\s]+/gi,
  /(token["']?\s*[:=]\s*["']?)[^"',}\s]+/gi,
  /\b(sk|dtn|ik)_[A-Za-z0-9_-]+\b/g,
];

export function assertSafeGeneratedPath(path: string): void {
  if (
    path.length === 0 ||
    path.trim() !== path ||
    path.startsWith("/") ||
    path.includes("..") ||
    path.includes("\\")
  ) {
    throw new Error(`Unsafe generated file path: ${path}`);
  }
}

export function buildSandboxFilePath(path: string): string {
  assertSafeGeneratedPath(path);
  return `${generatedWorkspacePath}/${path}`;
}

export function redactSensitive(value: string): string {
  return value
    .replace(secretPatterns[0], "Bearer [redacted]")
    .replace(secretPatterns[1], "$1[redacted]")
    .replace(secretPatterns[2], "$1[redacted]")
    .replace(secretPatterns[3], "[redacted]");
}

export function truncateOutput(value: string, maxLength = 8_000): string {
  const redacted = redactSensitive(value.trim());

  if (redacted.length <= maxLength) {
    return redacted;
  }

  return `${redacted.slice(0, maxLength)}\n...[truncated ${
    redacted.length - maxLength
  } chars]`;
}

export function normalizeCommandResult(
  command: string,
  result: RawSandboxCommandResult,
) {
  return {
    command: redactSensitive(command),
    exitCode: result.exitCode ?? null,
    stdout: truncateOutput(result.stdout ?? result.output ?? ""),
    stderr: truncateOutput(result.stderr ?? ""),
  };
}

export function normalizeQualityCommands(
  files: readonly GeneratedFile[],
  qualityPlan: QualityPlan,
): string[] {
  const commands = qualityPlan.commands.filter(
    (command) =>
      !isPreviewServerCommand(command) &&
      normalizeCommandForComparison(command) !==
        normalizeCommandForComparison(qualityPlan.previewCommand),
  );
  const hasPackageJson = files.some((file) => file.path === "package.json");
  const hasInstall = commands.some((command) =>
    /^(?:bun|npm|pnpm|yarn)\s+(?:install|i|ci)(?:\s|$)/i.test(
      normalizeCommandForComparison(command),
    ),
  );

  if (hasPackageJson && !hasInstall) {
    return ["bun install", ...commands];
  }

  return commands;
}

export function commandInGeneratedWorkspace(command: string): string {
  return `cd ${generatedWorkspacePath} && ${withServerRuntimeEnv(command)}`;
}

export function normalizePreviewCommand(command: string, port: number): string {
  const trimmed = command.trim();

  if (trimmed.includes("next dev")) {
    return trimmed
      .replace(/\s--port(?:=|\s+)\d+/g, "")
      .replace(/\s-p\s+\d+/g, "")
      .replace(/\s--hostname(?:=|\s+)\S+/g, "")
      .replace(/\s-H\s+\S+/g, "")
      .replace(/^PORT=\d+\s+/, "")
      .replace(/^HOSTNAME=\S+\s+/, "")
      .concat(` -H 0.0.0.0 -p ${port}`);
  }

  if (trimmed === "bun run dev" || trimmed === "bun dev") {
    return `PORT=${port} HOSTNAME=0.0.0.0 ${trimmed}`;
  }

  return trimmed;
}

export function createInitialBuildStatus(): SandboxValidationResult["buildStatus"] {
  return {
    install: "not_started",
    typecheck: "not_started",
    lint: "not_started",
    build: "not_started",
  };
}

export function applyBuildStatus(
  buildStatus: SandboxValidationResult["buildStatus"],
  command: string,
  exitCode: number | null,
): void {
  const status = exitCode === 0 || exitCode === null ? "passed" : "failed";
  const normalized = command.toLowerCase();

  if (normalized.includes("install")) {
    buildStatus.install = status;
  } else if (normalized.includes("typecheck") || normalized.includes("tsc")) {
    buildStatus.typecheck = status;
  } else if (normalized.includes("lint")) {
    buildStatus.lint = status;
  } else if (normalized.includes("build")) {
    buildStatus.build = status;
  }
}

function normalizeCommandForComparison(command: string): string {
  return command
    .trim()
    .replace(
      /^(?:[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|[^\s]+)\s+)*/g,
      "",
    )
    .replace(/\s--port(?:=|\s+)\d+/g, "")
    .replace(/\s-p\s+\d+/g, "")
    .replace(/\s--hostname(?:=|\s+)\S+/g, "")
    .replace(/\s-H\s+\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isPreviewServerCommand(command: string): boolean {
  const segments = normalizeCommandForComparison(command)
    .toLowerCase()
    .split(/\s*(?:&&|;)\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  return segments.some((segment) =>
    [
      /^(?:bun|npm|pnpm|yarn)(?:\s+run)?\s+(?:dev|start|preview)(?:\s|$)/,
      /^(?:next\s+(?:dev|start)|bunx\s+next\s+dev|npx\s+next\s+dev)(?:\s|$)/,
      /^(?:vite|astro\s+(?:dev|preview)|remix-serve|serve)(?:\s|$)/,
    ].some((pattern) => pattern.test(segment)),
  );
}

function withServerRuntimeEnv(command: string): string {
  const env: Record<string, string | undefined> = {
    INSFORGE_API_BASE_URL: process.env.INSFORGE_API_BASE_URL,
    INSFORGE_API_KEY: process.env.INSFORGE_API_KEY,
    NEXT_TELEMETRY_DISABLED: "1",
    CI: "true",
  };
  const prefix = Object.entries(env)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([key, value]) => `${key}=${shellQuote(value)}`)
    .join(" ");

  return prefix ? `${prefix} ${command}` : command;
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
