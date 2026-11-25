# Architecture rules

- Keep compression, conversion, and original files browser-only; remote agents access only explicitly saved, user-owned SEO records to preserve file privacy.
- Author MCP tools in `src/lib/mcp` using the SDK and its Vite plugin; the generated edge function is SDK-owned and activates only through app publication.
- Verify delegated OAuth tokens with the direct provider issuer and use caller-scoped public-key clients plus owner RLS; never use privileged clients or browser session tokens as an integration mechanism.
- Share SEO field validation and filename normalization between forms and agent tools; use revision-checked updates to prevent overwriting concurrent edits.
- Preserve validated local return paths through every sign-in method and the public auth callback so external-client consent survives authentication.
- Register browser-local tools only on the file queue screens, keep them separate from remote tools, and emit only static tool names, outcomes, and durations through the shared telemetry helper.