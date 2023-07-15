import envPaths from "env-paths"
import { dirname, resolve } from "path"
import os from "os"
import { access, mkdir } from "fs/promises"
import { accessSync, mkdirSync } from "fs"
import type { Paths } from "env-paths"

const base: Paths =
    import.meta.env.DEV === true //开发时的各路径
        ? {
              data: resolve("./dev/Data"),
              config: resolve("./dev/Config"),
              cache: resolve("./dev/Cache"),
              log: resolve("./dev/Log"),
              temp: resolve("./dev/Temp"),
          }
        : envPaths("FileServer-for-qBittorrent", { suffix: "" })

const append = {
    // asar: '',
    // dist: '',
    cut: resolve(base.temp, "cut"),
    ssl: resolve(base.data, "ssl"),
}

const paths = { ...base, ...append }

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
try {
    Object.values(paths).forEach((path) => accessSync(path))
} catch (error) {
    process.abort()
}

export default paths
