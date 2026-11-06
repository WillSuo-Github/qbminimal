import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify('test'),
    __DEMO__: 'false',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
