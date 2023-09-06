import type { Plugin, PluginOption } from 'vite'
import NamedPipe from 'named-pipe'
import type { Socket } from 'net'
import mainPkg from '../../package.json'
import { readFileSync } from 'fs'

export function manualReady(name: string, mode: 'ready' | 'complete' = 'ready') {
    const pkg = JSON.parse(readFileSync('./package.json').toString())
    const pipeName = mainPkg.name

    let socket: Socket = new NamedPipe(pipeName).connect()
    socket.on('error', (err) => {
        console.error(err.name, err.message)
    })
    if (socket.writable) {
        socket.write(
            JSON.stringify({
                type: 'invoke',
                invoke: 'setReady',
                data: { name: name || pkg.name, complete: mode === 'complete' },
            }),
        )
    }
}

export default function plugin(enable = true, name?: string): Plugin {
    let socket: Socket
    let ready = false
    const pkg = JSON.parse(readFileSync('./package.json').toString())
    const emit = async (mode: 'ready' | 'complete' = 'ready') => {
        if (socket == undefined) {
            const pipeName = mainPkg.name
            socket = new NamedPipe(pipeName).connect()
            socket.on('error', (err) => {
                console.error(err.name, err.message)
            })
        }
        if (socket.writable && !ready) {
            try {
                socket.write(
                    JSON.stringify({
                        type: 'invoke',
                        invoke: 'setReady',
                        data: { name: name || pkg.name, complete: mode === 'complete' },
                    }),
                )
                ready = true
            } catch (error) {
                console.error(error)
            }
        }
    }
    return {
        name: 'vite-plugin-dev-app-ready',
        enforce: 'post',
        apply(config, env) {
            return enable
        },
        async closeBundle() {
            emit('complete')
        },
        async configureServer() {
            emit('ready')
        },
    }
}
