import { basename, dirname, isAbsolute, join, resolve, sep } from 'path'
import { defineConfig, mergeConfig } from 'vite'
import appReady from 'vite-plugin-dev-app-ready'
import { visualizer } from 'rollup-plugin-visualizer'

import templateConfig, { builtins, external, thisDeps } from '../../template/vite/config'
import { copyModule, deepSearchDeps, searchModule } from '../../utils/nodejs'

const devAll = Boolean(process.env['DEVALL'])
const buildAll = Boolean(process.env['BUILDALL'])

const config = mergeConfig(
    templateConfig({
        nodeApp: (config, env) => {
            // return false
            return !(env.mode === 'production')
        },
        external: async (config, env) => {
            if (env.mode === 'production')
                return {
                    exclude: [...external],
                    include: ['socket.io', '7zip-bin', 'log4js'],
                }
            else return
        },
    }),
    defineConfig({
        plugins: [
            appReady(devAll || buildAll),
            visualizer({ template: 'treemap' }),
            (function () {
                const importedModules: string[] = []
                return {
                    name: 'copy modules',
                    enforce: 'pre',
                    apply(config, env) {
                        if (env.mode === 'production') return true
                        else return false
                    },
                    moduleParsed(info) {
                        for (const moduleName of info.importedIds) {
                            if (
                                !importedModules.includes(moduleName) &&
                                !builtins.includes(moduleName) &&
                                !isAbsolute(moduleName) &&
                                !moduleName.startsWith('\x00')
                            ) {
                                importedModules.push(moduleName)
                            }
                        }
                    },
                    transform(code, id, options) {
                        if (/(__dirname)|(__filename)/g.test(code)) {
                            console.log(
                                'this module used __dirname or __filename,include it in external : ',
                                id,
                            )
                        }
                    },
                    async closeBundle() {
                        if (importedModules.length > 0) {
                            console.log('copying importedModules: ', importedModules)

                            const outModulePath = resolve('./out/node_modules')
                            const subDeps = Array.from(
                                new Set(
                                    importedModules
                                        .flatMap((v) => deepSearchDeps(v)) //without importedModules
                                        .concat(importedModules),
                                ),
                            )
                            const subDepPaths = subDeps.map((v) => searchModule(v))
                            for (const subDepPath of subDepPaths) {
                                if (subDepPath == undefined) break
                                await copyModule(
                                    subDepPath,
                                    join(outModulePath, basename(subDepPath)),
                                )
                            }
                            console.log('copied external deps')
                        }
                    },
                }
            })(),
        ],
        resolve: {
            alias: {
                '@s': resolve('src'),
            },
        },
        build: {
            lib: {
                entry: resolve('src/index.ts'),
            },
            rollupOptions: {
                output: {
                    dir: './out',
                    chunkFileNames: 'chunk/[name]-[hash].mjs',
                },
            },
            minify: false,
            commonjsOptions: {},
        },
    }),
)

export default config
