import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const requiredFiles = [
  "agent/agent.ts",
  "agent/instructions.md",
  "agent/lib/model.ts",
  "agent/lib/schemas.ts",
  "agent/lib/sandbox.ts",
  "agent/sandbox/sandbox.ts",
  "agent/subagents/intent/agent.ts",
  "agent/subagents/orchestrator/agent.ts",
  "agent/subagents/design_research/agent.ts",
  "agent/subagents/code_writer/agent.ts",
  "agent/subagents/autofix/agent.ts",
  "agent/subagents/security_review/agent.ts",
  "agent/subagents/conversation/agent.ts",
  "agent/tools/write_generated_files.ts",
  "agent/tools/run_quality_commands.ts",
  "agent/tools/start_preview.ts",
  "agent/tools/deploy_to_vercel.ts",
  "README.md",
  ".github/workflows/ci.yml",
  ".github/workflows/release.yml",
];

const fail = (message) => {
  console.error(`smoke: ${message}`);
  process.exitCode = 1;
};

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) {
    fail(`missing required file ${file}`);
  }
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
if (pkg.version !== "1.0.0") {
  fail(`expected package version 1.0.0, got ${pkg.version}`);
}

const modelConfig = readFileSync(join(root, "agent/lib/model.ts"), "utf8");
for (const key of [
  "MAYAR_ROOT_MODEL",
  "INTENT_AGENT_MODEL",
  "ORCHESTRATOR_AGENT_MODEL",
  "DESIGN_RESEARCH_AGENT_MODEL",
  "CODE_WRITER_AGENT_MODEL",
  "AUTOFIX_AGENT_MODEL",
  "SECURITY_REVIEW_AGENT_MODEL",
  "CONVERSATION_AGENT_MODEL",
]) {
  if (!modelConfig.includes(key)) {
    fail(`model config does not mention ${key}`);
  }
}

const instructions = readFileSync(join(root, "agent/instructions.md"), "utf8");
if (!instructions.includes("Every declared subagent call payload must contain exactly one key")) {
  fail("root instructions are missing the Eve subagent call discipline");
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("smoke: Mayar project structure, release version, and model config look good.");
