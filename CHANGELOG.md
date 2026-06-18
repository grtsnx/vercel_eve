# Changelog

## 1.0.0 - 2026-06-18

### Added

- Standalone Eveable builder pipeline with root orchestration and declared subagents.
- Subagents for intent, conversation, orchestrator, design research, code writer, autofix, and security review.
- Shared Zod schemas for Eveable's structured handoffs and generated-project validation results.
- Role-specific model configuration with environment overrides.
- Eve sandbox configuration and root sandbox tools for generated files, quality commands, and preview startup.
- CodeWriter-local Unsplash image search tool.
- CI workflow with audit, typecheck, build, and smoke checks.
- Release workflow with package generation, artifact upload, tag handling, and GitHub release creation.
- Self-contained developer README, inline architecture diagrams, environment sample, and release notes.

### Changed

- Replaced the original Muna/Gemini-style single-instruction identity with the Eveable app and website builder identity.
- Switched default runtime model routing to OpenAI models through Vercel AI Gateway.
- Preserved the design approval checkpoint through Eve's built-in human-input flow.

### Security

- Generated files are written only under `/workspace/generated-app` in the Eve sandbox.
- Generated apps must not receive real secrets in source files or `.env.local`.
- InsForge values are documented as server-only placeholders.
- Built-in broad file and shell tools are disabled in favor of scoped root tools.

### Known limitations

- External preview URL support is not implemented in v1 because the current Eve docs do not expose a preview URL resolver.
- Subagent `outputSchema` is intentionally not passed at runtime because this Eve/provider combination rejected valid JSON text during task-mode validation.
