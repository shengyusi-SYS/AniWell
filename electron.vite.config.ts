import { resolve } from "path"
import { defineConfig, externalizeDepsPlugin } from "electron-vite"
import vue from "@vitejs/plugin-vue"

import AutoImport from "unplugin-auto-import/vite"
import Components from "unplugin-vue-components/vite"
import { ElementPlusResolver } from "unplugin-vue-components/resolvers"
import { VantResolver } from "unplugin-vue-components/resolvers"
import IconsResolver from "unplugin-icons/resolver"
import Icons from "unplugin-icons/vite"
import { readFileSync } from "fs"
import ElementPlus from "unplugin-element-plus/vite"

// import esmServer from "./plugins/esmServer"

const esmOnlyPackages = [
    // put your ESM-only package names here
    "env-paths",
    "file-type",
    "electron-store",
    "conf",
    "got",
]

let proxyPort = 9010
try {
    proxyPort = Number(
        JSON.parse(readFileSync("./dev/Config/settings.json", "utf8")).server.serverPort,
    )
} catch (error) {}
function ssl() {
    //第一次运行pnpm dev 会生成自签名证书，第二次开始生效
    try {
        return {
            cert: readFileSync("./dev/Data/ssl/domain.pem", "utf8"),
            key: readFileSync("./dev/Data/ssl/domain.key", "utf8"),
        }
    } catch (error) {
        return undefined
    }
}

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin({ exclude: esmOnlyPackages })],
        resolve: {
            alias: {
                "@s": resolve("src/server"),
            },
        },
        build: {
            rollupOptions: {
                output: {
                    manualChunks(id: string) {
                        for (const pkgName of esmOnlyPackages) {
                            if (id.includes(pkgName)) {
                                return pkgName
                            }
                        }
                    },
                },
            },
        },
    },
    preload: {
        plugins: [externalizeDepsPlugin()],
    },
    renderer: {
        base: "/",
        resolve: {
            alias: {
                "@v": resolve("src/renderer/src"),
                "@h": resolve("src/renderer/src/hooks"),
            },
        },
        plugins: [
            vue(),
            AutoImport({
                imports: ["vue", "vue-router"],
                resolvers: [
                    ElementPlusResolver(),
                    IconsResolver({
                        prefix: "Icon",
                    }),
                ],
                dts: "./src/auto-imports.d.ts",
            }),
            Components({
                resolvers: [
                    IconsResolver({
                        enabledCollections: ["ep", "mdi", "ic"],
                    }),
                    ElementPlusResolver(),
                    VantResolver(),
                ],
                dts: "./src/components.d.ts",
            }),
            Icons({
                autoInstall: true,
            }),
            ElementPlus({}),
        ],
        server: {
            host: true,
            https: {
                ...ssl(),
            },
            proxy: {
                "/api": {
                    target: "https://localhost:" + proxyPort,
                    ssl: ssl(),
                    secure: false,
                },
                "/socket.io": {
                    target: "wss://localhost:" + proxyPort,
                    ws: true,
                    ssl: ssl(),
                    secure: false,
                },
            },
        },
    },
})
