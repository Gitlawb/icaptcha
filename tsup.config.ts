import { defineConfig } from 'tsup'

// Builds the publishable `@gitlawb/icaptcha` surface (src/index.ts) into
// dist/ as ESM + .d.ts so it installs cleanly on Node and Bun. The HTTP
// service (src/server.ts) is NOT part of the package — it ships via Docker
// (see Dockerfile) and runs from src/ under Bun.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node18',
})
