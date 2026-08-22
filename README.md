# Tobi Flap

Tobi Flap is a photo-powered Space Arcade game with two playable pilots, score tracking, audio controls, and an escalating Asteroid Field mode. The game is a React and TypeScript static application powered by Vite.

## Local Setup

Install a current Node.js LTS release and pnpm 10 or newer. Then use the Makefile from the repository root:

| Goal | Command | Purpose |
| --- | --- | --- |
| Install | `make install` | Install the locked dependency set. |
| Develop | `make dev` | Start the Vite development server. |
| Type check | `make check` | Run TypeScript validation. |
| Test | `make test` | Run deterministic unit tests. |
| Verify | `make verify` | Run type checks, tests, and the production build. |
| Preview | `make preview` | Build and serve the production output locally. |

The npm equivalents are also available through `pnpm dev`, `pnpm check`, `pnpm test`, and `pnpm build`.

## Testing Scope

The unit suite covers the deterministic game rules that drive active play: the 30-second timed threat cadence, tier cap and countdown, asteroid contact coverage, explicit launch rules, and audio-volume clamping. Browser-mediated rendering, input, and Web Audio playback remain exercised in the interactive game preview.

## Notes on Assets

Pilot art and soundtrack assets are referenced through managed `/manus-storage/` URLs so the hosted project stays lightweight. The included application source and local commands remain fully available in this repository.

The original pilot artwork and soundtrack can be downloaded from the public GitHub asset branch documented in [ASSETS.md](./ASSETS.md). The application continues to use its managed URLs so that deployment remains reliable.
