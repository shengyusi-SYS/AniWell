import envPaths from 'env-paths'
import { resolve } from 'path'
import os from 'os'
export default import.meta.env.DEV === true //开发时的各路径
    ? {
          data: resolve('./dev/Data'),
          config: resolve('./dev/Config'),
          cache: resolve('./dev/Cache'),
          log: resolve('./dev/Log'),
          temp: os.tmpdir(),
      }
    : envPaths('FileServer-for-qBittorrent', { suffix: '' })
