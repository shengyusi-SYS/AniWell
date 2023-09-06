import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { resolve } from 'node:path'
import appReady from 'vite-plugin-dev-app-ready'
import { readFileSync } from 'fs'
import NamedPipe from 'named-pipe'
import federation from '@originjs/vite-plugin-federation'
// import { external } from '../../template/vite/config'
import { visualizer } from 'rollup-plugin-visualizer'

import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { VantResolver } from 'unplugin-vue-components/resolvers'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import ElementPlus from 'unplugin-element-plus/vite'

const devAll = Boolean(process.env['DEVALL'])
const buildAll = Boolean(process.env['BUILDALL'])

let proxyPort = 9009
try {
    proxyPort = Number(
        JSON.parse(readFileSync(resolve('../backend-express/dev/Config/settings.json'), 'utf8'))
            .server.serverPort,
    )
} catch (error) {
    console.log(error)
}

let cer: object
function ssl() {
    //第一次运行pnpm dev 会生成自签名证书，第二次开始生效
    try {
        if (cer == undefined) {
            cer = {
                cert: readFileSync('../backend-express/dev/Data/ssl/domain.pem', 'utf8'),
                key: readFileSync('../backend-express/dev/Data/ssl/domain.key', 'utf8'),
            }
        }
        return cer
    } catch (error) {
        return undefined
    }
}

// https://vitejs.dev/config/
export default defineConfig({
    base: '/',
    build: {
        outDir: 'out',
        target: 'esnext',
        minify: false,
        rollupOptions: {
            external: [],
        },
    },
    resolve: {
        alias: {
            '@v': resolve('./src'),
            '@h': resolve('./src/hooks'),
        },
    },
    plugins: [
        vue(),
        vueJsx(),
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
        ElementPlus({}),
        federation({
            name: 'fake',
            remotes: {},
            shared: ['vue', 'pinia', 'vue-router', 'axios', 'uuid'],
        }),
        visualizer({ template: 'treemap' }),
        appReady(devAll || buildAll),
        {
            name: 'frontend-url',
            enforce: 'post',
            apply(config, env) {
                return devAll || buildAll
            },
            configureServer(server) {
                const socket = new NamedPipe().connect()
                socket.on('error', console.log)
                socket.write(
                    JSON.stringify({
                        type: 'invoke',
                        invoke: 'setInfo',
                        data: {
                            key: 'frontendUrl',
                            value: 'https://localhost:' + proxyPort,
                        },
                    }),
                )
            },
        },
    ],
    server: {
        host: true,
        https: {
            ...ssl(),
        },
        port: proxyPort + 1,
        proxy: {
            '^/(api|trpc)/.*': {
                target: 'https://localhost:' + proxyPort,
                ssl: ssl(),
                secure: false,
            },
            '/socket.io': {
                target: 'https://localhost:' + proxyPort,
                ws: true,
                ssl: ssl(),
                secure: false,
            },
        },
        hmr: {
            clientPort: proxyPort + 1,
        },
    },
})
