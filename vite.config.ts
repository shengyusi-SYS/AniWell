import { readFileSync, rmSync, writeFileSync } from 'fs'
import { defineConfig, loadEnv } from 'vite'
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
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

rmSync('dist-electron', { recursive: true, force: true })
const sourcemap = !!process.env.VSCODE_DEBUG
const isBuild = process.argv.slice(2).includes('build')
// import eslintPlugin from 'vite-plugin-eslint/'
// https://vitejs.dev/config/
let proxyPort = 9010
try {
    proxyPort =
        +JSON.parse(readFileSync('./dev/Config/settings.json', 'utf8')).server.serverPort + 1
} catch (error) {}

export const config = {
    build: {
        target: 'esnext',
    },
    plugins: [
        wasm(),
        topLevelAwait(),
        vue(),
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
                                const pureEsm = ['env-paths', 'file-type']
                                return !pureEsm.includes(name)
                            }),
                        },
                    },
                    resolve: {
                        alias: {
                            '@s': path.resolve(__dirname, './electron/server'),
                        },
                        conditions: ['node'],
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
    ],
    resolve: {
        alias: {
            '@v': path.resolve(__dirname, 'src'),
            '@h': path.resolve(__dirname, 'src/hooks'),
            '@s': path.resolve(__dirname, './electron/server'),
        },
    },
    base: './',
    // css: {
    //     // 预处理器配置项
    //     preprocessorOptions: {
    //         less: {
    //             math: 'always',
    //         },
    //     },
    //     postcss: {
    //         plugins: [
    //             postcsspxtoviewport({
    //                 viewportWidth: (file) => {
    //                     return file.indexOf('vant') !== -1 ? 375 : 750
    //                 },
    //                 selectorBlackList: [/^body$/],
    //                 // exclude: [/^node_modules$/],
    //                 mediaQuery: false,
    //                 minPixelValue: 1,
    //             }),
    //         ],
    //     },
    // },
    server: process.env.VSCODE_DEBUG
        ? (() => {
              const url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL)
              return {
                  host: url.hostname,
                  port: +url.port,
              }
          })()
        : {
              host: 'localhost',
              port: 5566,
              proxy: {
                  '/api': {
                      target: 'http://localhost:' + proxyPort,
                      //   changeOrigin: false,
                  },
                  '/old': {
                      target: 'http://localhost:' + proxyPort,
                      //   changeOrigin: true,
                  },
                  '/socket.io': {
                      target: 'ws://localhost:' + proxyPort,
                      ws: true,
                  },
              },
              //   https: {
              //       cert: readFileSync('./dev/Data/ssl/domain.pem'),
              //       key: readFileSync('./dev/Data/ssl/domain.key'),
              //   },
          },
    clearScreen: false,
}
export default defineConfig(({ command, mode }) => {
    // 根据当前工作目录中的 `mode` 加载 .env 文件
    // 设置第三个参数为 '' 来加载所有环境变量，而不管是否有 `VITE_` 前缀。
    const env = loadEnv(mode, process.cwd(), '')
    env.DEVHOST ? (config.server.host = env.DEVHOST) : null

    return config
})
