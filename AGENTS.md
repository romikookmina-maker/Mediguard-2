# AGENTS.md — AI Agent Instructions (MCP focus)

Purpose: Help AI coding agents quickly become productive on this Vite + React project and when working on MCP-related tasks.

Quick facts
- **Project type:** Vite + React (TypeScript). See [package.json](package.json).
- **Dev / build:** `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`. See [package.json](package.json).
- **Entry points:** [src/main.tsx](src/main.tsx) and [src/App.tsx](src/App.tsx).
- **Env / secrets:** Set `GEMINI_API_KEY` in [.env.local](.env.local) (referenced in README). See [README.md](README.md).
- **AI deps present:** `@google/genai` in dependencies — search `src/` for usage before adding new integrations.

Guidelines for MCP-related tasks
- When asked to add an MCP server or protocol hooks, prefer creating a minimal Node/Express endpoint under `server/` or `src/server.ts` and wire it into `package.json` scripts (e.g., `npm run start:server`).
- Keep secrets out of source; use `.env.local` and document new env vars in README.
- Keep changes small and focused: add tests or a tiny example consumer when introducing protocol surfaces.
- Link to existing docs rather than copying content. If new procedures are required, add short references in this file and link deeper docs.

Quick checklist for agents
- Inspect [package.json](package.json) for scripts and dependencies.
- Inspect [src/App.tsx](src/App.tsx) and [src/main.tsx](src/main.tsx) for UI/data flow.
- Search the codebase for `@google/genai` or `GEMINI_API_KEY` usage before modifying AI integration.
- If adding server code, prefer `server/` directory and update README with run steps.

If you need more detail (example MCP endpoints, security conventions, or CI hooks), ask the repository owner before making large changes.
