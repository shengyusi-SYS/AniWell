import type { ConfigEnv, Plugin, UserConfig } from 'vite'
import { Worker } from 'worker_threads'
import { join, resolve } from 'path'
import { readFile } from 'fs/promises'

let worker: Worker

export default async function plugin(
    apply?: boolean | ((config: UserConfig, env: ConfigEnv) => boolean),
): Promise<Plugin> {
    const pkg = JSON.parse((await readFile('./package.json')).toString())
    const entry = pkg.main
    return {
        name: 'vite-plugin-dev-node-app',
        apply(config, env) {
            if (env.mode === 'nodeApp') {
                return true
            }
            if (apply instanceof Function) {
                return apply(config, env)
            } else return apply || false
        },
        async watchChange(id, change) {
            if (worker?.terminate) await worker.terminate()
        },
        async closeBundle() {
            console.log('node app start', resolve(entry))
            worker = new Worker(resolve(entry))
            worker.once('error', (error) => {
                console.log('node app worker error', error)
            })
        },
    }
}
