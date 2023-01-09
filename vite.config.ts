import { rmSync } from 'fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import pkg from './package.json'
import { fileURLToPath, URL } from 'url'
import path from 'path'
import postcsspxtoviewport from 'postcss-px-to-viewport-8-plugin'

import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { VantResolver } from 'unplugin-vue-components/resolvers'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'

rmSync('dist-electron', { recursive: true, force: true })
const sourcemap = !!process.env.VSCODE_DEBUG
const isBuild = process.argv.slice(2).includes('build')
// import eslintPlugin from 'vite-plugin-eslint/'
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        electron([
            {
                // Main-Process entry file of the Electron App.
                entry: 'electron/main/index.ts',
                onstart(options) {
                    if (process.env.VSCODE_DEBUG) {
                        console.log(/* For `.vscode/.debug.script.mjs` */ '[startup] Electron App')
                    } else {
                        options.startup()
                    }
                },
                vite: {
                    build: {
                        sourcemap,
                        minify: isBuild,
                        outDir: 'dist-electron/main',
                        rollupOptions: {
                            external: Object.keys(pkg.dependencies).filter((name) => {
                                const pureEsm = ['env-paths']
                                return !pureEsm.includes(name)
                            }),
                        },
                    },
                    resolve: {
                        alias: {
                            '@s': path.resolve(__dirname, './electron/server'),
                        },
                    },
                    base: './',
                },
            },
            {
                entry: 'electron/preload/index.ts',
                onstart(options) {
                    // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete,
                    // instead of restarting the entire Electron App.
                    options.reload()
                },
                vite: {
                    build: {
                        sourcemap,
                        minify: isBuild,
                        outDir: 'dist-electron/preload',
                        rollupOptions: {
                            external: Object.keys(pkg.dependencies),
                        },
                    },
                },
            },
        ]),
        AutoImport({
            imports: ['vue', 'vue-router'],
            resolvers: [
                ElementPlusResolver(),
                IconsResolver({
                    prefix: 'Icon',
                }),
            ],
            dts: './src/auto-imports.d.ts',
        }),
        Components({
            resolvers: [
                IconsResolver({
                    enabledCollections: ['ep', 'mdi', 'ic'],
                }),
                ElementPlusResolver(),
                VantResolver(),
            ],
            dts: './src/components.d.ts',
        }),
        Icons({
            autoInstall: true,
        }),
    ],
    resolve: {
        alias: {
            '@v': path.resolve(__dirname, 'src'),
            '@h': path.resolve(__dirname, 'src/hooks'),
        },
    },
    base: './',
    css: {
        // 预处理器配置项
        preprocessorOptions: {
            less: {
                math: 'always',
            },
        },
        postcss: {
            plugins: [
                postcsspxtoviewport({
                    viewportWidth: (file) => {
                        return file.indexOf('vant') !== -1 ? 375 : 750
                    },
                    selectorBlackList: [/^body$/],
                    // exclude: [/^node_modules$/],
                    mediaQuery: false,
                    minPixelValue: 1,
                }),
            ],
        },
    },
    server: process.env.VSCODE_DEBUG
        ? (() => {
              const url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL)
              return {
                  host: url.hostname,
                  port: +url.port,
              }
          })()
        : undefined,
    clearScreen: false,
})
