import { defineConfig } from 'vite'
import { builtinModules } from 'node:module'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default defineConfig({
    plugins: [nodeResolve()],
    resolve: {
        browserField: false,
        mainFields: ['module', 'jsnext:main', 'jsnext'],
        conditions: ['node'],
    },
    build: {
        target: 'node18',
        outDir: 'dist',
        lib: {
            entry: 'index.ts',
            formats: ['es'],
        },
        rollupOptions: {
            external: [...builtinModules.flatMap((m) => [m, `node:${m}`])],
            output: {
                entryFileNames: '[name].mjs',
                chunkFileNames: 'chunk/[name].mjs',
            },
        },
    },
    worker: {
        format: 'es',
        plugins: [nodeResolve(), commonjs()],
        rollupOptions: {
            external: [...builtinModules.flatMap((m) => [m, `node:${m}`])],
            output: {
                entryFileNames: 'worker/[name].mjs',
                chunkFileNames: 'worker/[name].mjs',
            },
        },
    },
})
