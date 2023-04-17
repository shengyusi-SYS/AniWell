import envPaths from 'env-paths'
import { resolve } from 'path'
import os from 'os'
import { access, mkdir } from 'fs/promises'

const base =
    import.meta.env.DEV === true //开发时的各路径
        ? {
              data: resolve('./dev/Data'),
              config: resolve('./dev/Config'),
              cache: resolve('./dev/Cache'),
              log: resolve('./dev/Log'),
              temp: resolve('./dev/Temp'),
          }
        : envPaths('FileServer-for-qBittorrent', { suffix: '' })

const append = {
    // asar: '',
    // dist: '',
    cut: resolve(base.temp, 'cut'),
    ssl: resolve(base.data, 'ssl'),
}

export const paths = { ...base, ...append }

export default paths

Promise.allSettled(Object.values(paths).map((path) => mkdir(path)))
    .then((result) => {
        return Promise.all(Object.values(paths).map((path) => access(path)))
    })
    .catch((err) => {
        process.abort()
    })
