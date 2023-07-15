import { defineConfig, rollup, watch as rollupWatch } from "rollup"
import type { InputOptions, OutputOptions } from "rollup"
import typescript from "rollup-plugin-typescript2"
import nodeResolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import type { Plugin } from "vite"
import alias from "@rollup/plugin-alias"
import { resolve } from "path"
import json from "@rollup/plugin-json"

export const inputOptions: InputOptions = {
    input: {
        server: "./src/server/index.ts",
    },
    plugins: [
        typescript({ check: false, clean: true }),
        alias({
            entries: {
                "@s": resolve("src/server"),
            },
        }),
        json(),
        nodeResolve({
            preferBuiltins: true,
        }),
        commonjs(),
    ],
    // cache: false,
}

export const outputOptions: OutputOptions = {
    entryFileNames: "[name].js",
    dir: "./out/main/server",
    format: "esm",
}

export const config = defineConfig({
    ...inputOptions,
    output: outputOptions,
})

export const watchOptions = {
    ...config,
    watch: {
        exclude: "node_modules/**",
        include: "src/server/**",
        // chokidar: false,
    },
}

export default function (): Plugin {
    return {
        name: "vite:esm-server",
        configureServer(server) {
            console.log("wwwwwwwwwwwwwwwwwwwww")

            rollupWatch(watchOptions)
                .on("event", (event) => {
                    console.log(event)
                })
                .on("change", (id, change) => {
                    console.log("rrrrrrrrrrrrrrrrrrr")

                    server.ws.send({ type: "full-reload" })
                })
        },
    }
}
