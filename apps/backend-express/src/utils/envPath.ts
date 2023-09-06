import envPaths from 'env-paths'
import type { Paths } from 'env-paths'
import { basename, dirname, resolve } from 'path'
import { accessSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const base: Paths = import.meta.env.VITE_DEV //开发时的各路径
    ? {
          data: resolve('./dev/Data'),
          config: resolve('./dev/Config'),
          cache: resolve('./dev/Cache'),
          log: resolve('./dev/Log'),
          temp: resolve('./dev/Temp'),
      }
    : envPaths('FileServer-for-qBittorrent', { suffix: '' })

const moduleFilePath = fileURLToPath(import.meta.url)
let serverDist: string
const parentDirName = basename(dirname(moduleFilePath))
if (parentDirName === 'chunk') serverDist = dirname(dirname(moduleFilePath))
else if (parentDirName === 'backend') serverDist = dirname(moduleFilePath)
else if (parentDirName === 'out') serverDist = dirname(dirname(moduleFilePath))
else serverDist = resolve('./resources/app/out')

let frontendDist: string
try {
    accessSync(resolve(serverDist, '../frontend'))
    frontendDist = resolve(serverDist, '../frontend')
} catch (error) {
    try {
        accessSync(resolve('../frontend-vue/out'))
        frontendDist = resolve('../frontend-vue/out')
    } catch (error) {
        frontendDist = ''
    }
}

let launcherDist: string
try {
    accessSync(resolve(serverDist, '../main'))
    launcherDist = resolve(serverDist, '../main')
} catch (error) {
    launcherDist = ''
}

let rendererDist: string
try {
    accessSync(resolve(serverDist, '../renderer'))
    rendererDist = resolve(serverDist, '../renderer')
} catch (error) {
    rendererDist = ''
}

const append = {
    cut: resolve(base.temp, 'cut'),
    ssl: resolve(base.data, 'ssl'),
    resources: resolve(base.data, 'resources'),
    plugins: resolve(base.data, 'plugins'),
    serverDist,
    frontendDist,
    launcherDist,
    rendererDist,
}

const paths = {
    ...base,
    ...append,
    create: () => {
        Object.values(base).forEach((path) => {
            try {
                mkdirSync(dirname(path))
            } catch (error) {}
            try {
                mkdirSync(path)
            } catch (error) {}
        })

        Object.values(append).forEach((path) => {
            try {
                mkdirSync(path)
            } catch (error) {}
        })

        Object.values(paths)
            .filter((v) => v)
            .forEach((path) => {
                if (typeof path === 'string') {
                    try {
                        accessSync(path)
                    } catch (error) {
                        paths.logger('envPath acces Error : ' + path, error)
                    }
                }
            })
    },
    logger: (...args) => console.log(args),
}

paths.create()
export default paths
