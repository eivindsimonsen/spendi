import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      // The default 'forks' pool spawns a new OS process per worker,
      // which times out in this environment (likely AV/sandbox overhead
      // on process spawn) -- 'threads' avoids that entirely.
      pool: 'threads',
    },
  }),
)
