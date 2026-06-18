# Contributing To Eveable

Thanks for helping improve Eveable. This project is an Eve-powered AI app builder, so changes should preserve the core guarantee: generated apps are planned, approved, validated, previewed, security-reviewed, deployed, and verified before the agent calls them complete.

## Development Setup

1. Install Node.js `>=24 <27`.
2. Install pnpm `11.5.0`.
3. Install dependencies:

```bash
pnpm install --frozen-lockfile
```

4. Create local env:

```bash
cp env.sample .env.local
```

5. Add at least `AI_GATEWAY_API_KEY`. Add `VERCEL_TOKEN` if you are testing deployment.

## Local Workflow

Run Eve locally:

```bash
pnpm run dev
```

Run all checks:

```bash
pnpm run ci
```

Use focused checks while developing:

```bash
pnpm run typecheck
pnpm run build
pnpm run smoke
```

## Architecture Rules

- Keep the root workflow in `agent/instructions.md` explicit and conservative.
- Keep generated app writes inside `/workspace/generated-app`.
- Keep tool scopes narrow. Prefer typed Eve tools over broad shell access.
- Keep `bash.ts` and `write_file.ts` disabled unless a change intentionally updates the trust model.
- Preserve the design approval checkpoint before code generation.
- Preserve autofix loops for build, preview, security, and deployment failures.
- Preserve Vercel URL verification before final "deployed" summaries.

## Subagent Rules

Each subagent lives under `agent/subagents/<name>/`.

- `agent.ts` should define the model and short model-facing description.
- `instructions.md` should describe only that subagent's responsibility.
- Subagent tool calls from the root must use exactly one input key: `message`.
- Shared output shapes should be documented in `agent/lib/schemas.ts`.

## Tool Rules

Tools live under `agent/tools/`.

- Validate inputs with Zod.
- Return structured data.
- Redact secrets from command output.
- Avoid non-finite commands in validation tools.
- Do not write secrets into generated files.
- Treat deployment as an external side effect.

## Pull Request Checklist

Before opening a pull request:

- Run `pnpm run ci`.
- Update `README.md` if behavior, setup, env vars, architecture, or release behavior changes.
- Update `env.sample` if env vars change.
- Update `SECURITY.md` if the trust model changes.
- Keep unrelated refactors out of the PR.
- Include clear testing notes.

## License

By contributing to Eveable, you agree that your contribution is licensed under the MIT license.

## Reporting Bugs

Useful bug reports include:

- the prompt used
- whether the failure happened during design, code generation, validation, preview, security review, or deployment
- relevant redacted stream/tool output
- `pnpm run ci` result
- Node.js and pnpm versions

Never include secrets, API keys, tokens, private user data, or generated app credentials in issues.
