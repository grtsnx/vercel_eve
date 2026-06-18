export type MayarModelRole =
  | "root"
  | "intent"
  | "orchestrator"
  | "designResearch"
  | "codeWriter"
  | "autofix"
  | "securityReview"
  | "conversation";

const fromEnv = (key: string, fallback: string) => {
  const value = process.env[key]?.trim();

  return value || fallback;
};

export const mayarModels = {
  root: fromEnv("MAYAR_ROOT_MODEL", "openai/gpt-5.4-mini"),
  intent: fromEnv("INTENT_AGENT_MODEL", "openai/gpt-5.4-mini"),
  orchestrator: fromEnv("ORCHESTRATOR_AGENT_MODEL", "openai/gpt-5.4-mini"),
  designResearch: fromEnv("DESIGN_RESEARCH_AGENT_MODEL", "openai/gpt-5.5"),
  codeWriter: fromEnv("CODE_WRITER_AGENT_MODEL", "openai/gpt-5.5"),
  autofix: fromEnv("AUTOFIX_AGENT_MODEL", "openai/gpt-5.5"),
  securityReview: fromEnv("SECURITY_REVIEW_AGENT_MODEL", "openai/gpt-5.5"),
  conversation: fromEnv("CONVERSATION_AGENT_MODEL", "openai/gpt-5.4-mini"),
} satisfies Record<MayarModelRole, string>;
