import envPaths from 'env-paths'
import { resolve } from 'path'
import os from 'os'
import { mkdir } from 'fs/promises'

export const paths =
    import.meta.env.DEV === true //开发时的各路径
        ? {
              data: resolve('./dev/Data'),
              config: resolve('./dev/Config'),
              cache: resolve('./dev/Cache'),
              log: resolve('./dev/Log'),
              temp: resolve('./dev/Temp'),
              asar: '',
              dist: '',
              cut: resolve('./dev/Temp/cut'),
          }
        : envPaths('FileServer-for-qBittorrent', { suffix: '' })
export default paths

const createTask = []
for (const pathName in paths) {
    const path = paths[pathName]
    createTask.push(mkdir(path))
}
Promise.allSettled(createTask)
