import { ConfigEnv, UserConfig, defineConfig } from 'vite'
import { builtinModules } from 'node:module'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import nodeAppPlugin from 'vite-plugin-dev-node-app'
import { join, resolve } from 'node:path'
import { accessSync, readFileSync, readdirSync, statSync } from 'node:fs'

const projectRoot = resolve('../../')
const packagesRoot = join(projectRoot, 'packages')
const packages = readdirSync(packagesRoot)
    .map((v) => join(packagesRoot, v))
    .filter((path) => statSync(path).isDirectory())

const thisPkg = JSON.parse(readFileSync(resolve('./package.json')).toString())
export const thisDeps = thisPkg.dependencies ? Object.keys(thisPkg.dependencies) : []

const projectPkg = JSON.parse(readFileSync(join(projectRoot, 'package.json')).toString())
export const projectDeps = projectPkg.dependencies ? Object.keys(projectPkg.dependencies) : []

const localPkgs = packages.flatMap((v) => {
    return JSON.parse(readFileSync(join(v, 'package.json')).toString())
})
export const localPkgDeps = localPkgs.flatMap((v) =>
    v.dependencies ? Object.keys(v.dependencies) : [],
)

export const external = [...thisDeps, ...projectDeps, ...localPkgDeps]

export const builtins = builtinModules.flatMap((m) => [m, `node:${m}`])

let externalDeps: string[] = [...thisDeps, ...projectDeps, ...localPkgDeps]

export default function ({
    nodeApp,
    external,
    appendManualChunks,
}: {
    nodeApp?: boolean | ((config: UserConfig, env: ConfigEnv) => boolean)
    external?:
        | { include?: string[]; exclude?: string[] }
        | ((
              config: UserConfig,
              env: ConfigEnv,
          ) => Promise<void | { include?: string[]; exclude?: string[] }>)
    appendManualChunks?: string[] | ((id: string) => string | void)
} = {}) {
    const manuals: Record<string, string[]> = {}

    return defineConfig({
        plugins: [
            nodeResolve(),
            nodeAppPlugin(nodeApp),
            {
                name: 'countManualChunks',
                enforce: 'post',
                closeBundle() {
                    if (Object.keys(manuals).length > 0) console.log('manualChunks---', manuals)
                },
            },
            {
                name: 'envExternal',
                enforce: 'pre',
                async config(config, env) {
                    if (external) {
                        if (typeof external === 'function') {
                            external = (await external(config, env)) || {}
                        }
                        const exclude = external.exclude
                        if (exclude) externalDeps = externalDeps.filter((v) => !exclude.includes(v))
                        if (external.include) externalDeps = externalDeps.concat(external.include)
                    }
                    externalDeps = Array.from(new Set(externalDeps))
                    // console.log(externalDeps)
                    if (config.build?.rollupOptions?.external) {
                        config.build.rollupOptions.external = [...externalDeps, ...builtins]
                    }
                    if (config.worker?.rollupOptions?.external) {
                        config.worker.rollupOptions.external = [...externalDeps, ...builtins]
                    }
                },

                // configResolved(config) {
                //     console.log(config.build.rollupOptions.external)
                // },
            },
        ],
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
            commonjsOptions: {
                strictRequires: true,
            },
            rollupOptions: {
                external: [...externalDeps, ...builtins],

                output: {
                    entryFileNames: '[name].mjs',
                    chunkFileNames: 'chunk/[name].mjs',
                    manualChunks(id: string) {
                        if (appendManualChunks) {
                            if (appendManualChunks instanceof Array) {
                                for (const chunkName of appendManualChunks) {
                                    if (new RegExp(chunkName, 'g').test(id)) return chunkName
                                }
                            } else {
                                const res = appendManualChunks(id)
                                if (res != undefined) {
                                    if (manuals[res] == undefined) manuals[res] = [id]
                                    else manuals[res].push(id)
                                    return res
                                }
                            }
                        }

                        for (const pkgName of externalDeps) {
                            if (pkgName === thisPkg.name) break
                            const reg = new RegExp(`node_modules\/${pkgName}\/`, 'g')
                            if (reg.test(id) && !builtins.includes(pkgName)) {
                                if (manuals[pkgName] == undefined) manuals[pkgName] = [id]
                                else manuals[pkgName].push(id)
                                return pkgName
                            }
                        }
                        return
                    },
                },
            },
        },
        worker: {
            format: 'es',
            plugins: [nodeResolve(), commonjs()],
            rollupOptions: {
                external: [...externalDeps, ...builtins],
                output: {
                    entryFileNames: 'worker/[name].mjs',
                    chunkFileNames: 'worker/[name].mjs',
                },
            },
        },
    })
}
