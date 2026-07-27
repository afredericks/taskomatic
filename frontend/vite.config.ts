import { resolve } from 'node:path'

import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// Assets are built into the Django static directory and served through
// django-vite, which looks them up in .vite/manifest.json.
const OUT_DIR = resolve(__dirname, '../src/tinypm/static/dist')

export default defineConfig({
    base: '/static/dist/',
    plugins: [svelte()],
    // Under Vitest, resolve Svelte's browser build rather than its server build.
    resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
    build: {
        manifest: true,
        emptyOutDir: true,
        outDir: OUT_DIR,
        rollupOptions: {
            input: resolve(__dirname, 'src/main.ts'),
        },
    },
    server: {
        port: 5173,
        strictPort: true,
        origin: 'http://localhost:5173',
        cors: true,
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/setup-tests.ts'],
    },
})
