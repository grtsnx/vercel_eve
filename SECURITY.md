# Security Policy

Eveable generates, validates, previews, and deploys applications with AI assistance. Treat it as a system that can execute generated code in a sandbox and perform external deployment side effects.

## Supported Versions

Security fixes target the latest `main` branch and the latest tagged release.

| Version | Supported |
| --- | --- |
| `1.x` | Yes |
| `<1.0.0` | No |

## Reporting A Vulnerability

Please report security issues privately. Do not open a public issue with exploit details, secrets, private logs, or live tokens.

Send a private report to the repository owner with:

- affected commit or release
- vulnerability summary
- reproduction steps
- impact
- suggested fix, if known
- redacted logs or traces

If GitHub private vulnerability reporting is enabled for this repository, use that channel.

## Security Boundaries

Eveable's main security boundaries are:

- generated files are constrained to `/workspace/generated-app`
- generated file paths must be safe relative paths
- broad shell and file tools are disabled by default
- validation commands must be finite
- preview commands are separated from validation commands
- real secrets must not be written into generated files
- deployment runs through `deploy_to_vercel`
- Vercel deployment URLs must be verified before final success

## Secret Handling

Never commit:

- `.env.local`
- provider API keys
- Vercel tokens
- InsForge keys
- database URLs
- user data
- generated app credentials

Runtime secrets may be read by Eveable tools from the Eveable environment and passed to Vercel as deployment env flags when allowed. They must not be copied into generated source files, browser-exposed `NEXT_PUBLIC_*` variables, or generated `.env.local` files.

## Generated Code Review

The `security_review` subagent checks generated apps after sandbox validation and before Vercel deployment. It should look for:

- hardcoded secrets
- unsafe browser environment variables
- exposed server credentials
- risky fetch/proxy behavior
- dangerous dependencies or scripts
- auth bypasses in generated server routes

Security review is not a substitute for human review before production use.

## Deployment Risk

`deploy_to_vercel` is an external side-effecting tool. It requires `VERCEL_TOKEN` and can create Vercel preview or production deployments.

Recommended controls:

- use a Vercel token scoped to a dedicated project or team
- avoid production deployment unless explicitly requested
- keep preview protection enabled where appropriate
- review generated apps before using real data
- rotate tokens after suspected exposure

## Dependency Security

Run:

```bash
pnpm run audit
```

CI runs a critical production dependency audit. Contributors should also watch upstream security advisories for Eve, AI SDK, Vercel CLI, Next.js, and generated app dependencies.
