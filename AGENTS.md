# Agent Instructions

Keep repository instructions generic and safe for open source.

This repo is the Hermes3D frontend. It talks to the Hermes backend over the gateway WebSocket protocol and does not contain the backend itself.

When the user asks for changes, they are asking for changes to this app. Apply solutions here, and treat the gateway protocol and the Hermes HTTP API as external contracts you read rather than edit.

If you use local private overlay instructions, keep them outside the repository and do not commit them here.

Do not commit personal, environment-specific, or secret instructions to this repository.

## Development environment instructions

### Service overview

Hermes3D is a Next.js 16 frontend (TypeScript, React 19, Three.js, Phaser) for the Hermes backend. It runs a custom Node.js server (`server/index.js`) that bundles a same-origin WebSocket proxy to the upstream gateway. No database or Docker is required. The only hard system dependency is Node.js 20+ with npm 10+.

### Running the app

- `npm run dev` starts the dev server on port 3000 via the custom server (`node server/index.js --dev`). In dev it also auto-starts the bundled demo gateway on `ws://127.0.0.1:18789` unless `HERMES3D_AUTO_START_DEMO` is false.
- `npm run hermes-adapter` starts the bundled Hermes gateway adapter (`server/hermes-gateway-adapter.js`) on `ws://localhost:18789`. `npm run demo-gateway` starts the mock gateway instead.
- The office can render the seeded Avery, Mika, and Rune fleet before the browser finishes connecting to that gateway. A disconnected badge with those three agents on screen is the demo seed, not a missing install.
- `.env` is copied from `.env.example`; see `README.md` "Configuration" for variable descriptions. Copy it for local runs. Vitest does not require it.

### Lint, typecheck, and tests

- `npm run lint` — ESLint. The codebase has pre-existing warnings and one pre-existing error: `react-hooks/rules-of-hooks` in `src/features/agents/components/GatewayConnectScreen.tsx`.
- `npm run typecheck` — `tsc --noEmit`. Pre-existing errors are in `tests/unit/demoGatewayChild.test.ts` (`ProcessEnv` requires `NODE_ENV`).
- `npm run test -- --run` — Vitest unit tests (use `--run` for single-run mode). Pre-existing failures are in `tests/unit/colorSemanticsGuard.test.ts`, `tests/unit/gatewayEnvDefaults.test.ts`, and `tests/unit/studioSettingsRoute.test.ts`.
- `npm run e2e` — Playwright E2E tests; requires `npx playwright install` first.
- `npm run smoke:dev-server` — starts the dev server on a random port and verifies HTTP response.

### Build

- `npm run build` — Next.js production build.

### Gotchas

- `npm run studio:setup` is interactive (TTY prompts) — avoid running it in non-interactive cloud environments.
- Vitest runs in watch mode by default; always pass `--run` for CI/cloud agent use.
