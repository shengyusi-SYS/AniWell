import {
    httpLogger,
    logger,
    syncLogger,
    clientLogger,
    scrapeLogger,
    transcodeLogger,
    changeLevel,
    log4js,
} from '@s/utils/logger'
import envPath from '@s/utils/envPath'
import init from '@s/utils/init'
import settings from '@s/store/settings'

import { basename, dirname, join, resolve } from 'path'
import cookieParser from 'cookie-parser'
import { type Express } from 'express'
import type SocketIo from './api/v1/socket'
import { type MessagePort, isMainThread, parentPort } from 'worker_threads'
import { createProxyMiddleware } from 'http-proxy-middleware'
import * as trpcExpress from '@trpc/server/adapters/express'
import { createContext } from '@s/trpc/context'
import { appRouter } from './trpc/router'
import EasyEvents, { type DuplexEventEmitter } from 'easy-events'
import { type Server, Socket as netSocket } from 'net'

const devAll = Boolean(process.env['DEVALL'])
const buildAll = Boolean(process.env['BUILDALL'])
console.log('enviroment', devAll, buildAll)
console.log('envPaths', envPath)

process.on('uncaughtException', function (err) {
    logger.error('Caught exception !!!', err)
})

class stdioSocket implements DuplexEventEmitter {
    input = process.stdin
    output = process.stdout
    postMessage = process.stdout.write.bind(process.stdout)
    on = process.stdin.on.bind(process.stdin)
    removeListener = (eventName: string, cb: (...args: any[]) => void) => {
        this.input.removeListener(eventName, cb)
        this.output.removeListener(eventName, cb)
    }
}
let channel: MessagePort | netSocket | DuplexEventEmitter
if (parentPort) {
    channel = parentPort
    logger.info('work as worker')
} else {
    process.openStdin()
    channel = new stdioSocket()
    logger.info('work as main')
}

type httpVersions = {
    http: 'http'
    https: 'https'
    http2: 'http2'
}
type serverConfig = {
    host?: string
    port?: number
    httpVersion?: keyof httpVersions
}
const defaultConfig = {
    host: 'localhost',
    port: 9009,
    httpVersion: 'http2' as httpVersions['http2'],
}
class AnyWell {
    host: string
    port: number
    httpVersion: 'http' | 'https' | 'http2'
    app: Express = {} as Express
    netServer: Server = {} as Server
    socketIo: typeof SocketIo = {} as typeof SocketIo
    state: 'init' | 'running' | 'stop' = 'init'
    controller = new EasyEvents(channel, {
        configurateServer: async function (config: serverConfig) {
            const newConfig = await anyWell.configurate(config)
            this.result('configurateServer', { config: newConfig })
        },
        startServer: async function () {
            const host = await anyWell.start()
            this.result('startServer', { host })
        },
        closeServer: async function () {
            const result = await anyWell.close()
            this.result('closeServer', { result })
        },
    })
    constructor(config: serverConfig = defaultConfig) {
        const { host, port, httpVersion } = this.configurate(config, false)
        this.host = host
        this.port = port
        this.httpVersion = httpVersion
    }
    configurate(
        config: serverConfig,
        params?: {
            write: boolean
            check?: boolean
        },
    ): Promise<Required<serverConfig>>
    configurate(config: serverConfig, write?: boolean): Required<serverConfig>
    configurate(
        config: serverConfig,
        params: boolean | { check?: boolean; write?: boolean } = true,
    ): Promise<Required<serverConfig>> | Required<serverConfig> {
        const newConfig = {} as Required<serverConfig>
        if (!config) {
            throw new Error('config undefined')
        }
        for (const key in defaultConfig) {
            if (Object.prototype.hasOwnProperty.call(defaultConfig, key)) {
                if (config[key] == undefined) {
                    newConfig[key] = defaultConfig[key]
                } else {
                    newConfig[key] = config[key]
                }
            }
        }

        const writeConfig = ({ host, port, httpVersion }: Required<serverConfig>) => {
            this.host = host
            this.port = port
            this.httpVersion = httpVersion
        }

        if (typeof params === 'object') {
            return new Promise<Required<serverConfig>>(async (resolve, reject) => {
                const { write, check } = params
                if (check) {
                    try {
                        await this.checkConfig(newConfig)
                        if (write) writeConfig(newConfig)
                        return resolve(newConfig)
                    } catch (error) {
                        return reject(error)
                    }
                }

                if (write) writeConfig(newConfig)
                resolve(newConfig)
            })
        } else {
            const write = params
            if (write) writeConfig(newConfig)
            return newConfig
        }
    }
    async checkConfig(config: serverConfig) {}
    async start() {
        const { host, port, httpVersion } = this
        const hostUrl = `${httpVersion === 'http' ? 'http' : 'https'}://${host}:${port}`
        if (this.state === 'running') return hostUrl
        else this.state = 'running'

        const express = (await import('express')).default
        const app = (this.app = express())
        const router = (await import('@s/api')).default
        const socketIo = (this.socketIo = (await import('./api/v1/socket')).default)

        logger.info('settings', settings)
        const { ssl } = init

        app.use(log4js.connectLogger(httpLogger, { level: 'trace' }))
        app.use(cookieParser())
        app.use(express.json())
        app.use(express.urlencoded({ extended: false }))

        app.use(
            '/trpc',
            trpcExpress.createExpressMiddleware({
                router: appRouter,
                createContext,
            }),
        )
        app.use('/api', router)

        try {
            if (devAll || buildAll) {
                app.use(
                    createProxyMiddleware({
                        target: `https://localhost:${settings.server.serverPort + 1}`,
                        secure: false,
                        ssl: ssl,
                    }),
                )
                logger.info(
                    'proxy frontend to dev server' +
                        `https://localhost:${settings.server.serverPort + 1}`,
                )
            } else {
                app.use(express.static(envPath.frontendDist))
                logger.info('serve frontendDist', envPath.frontendDist)
            }
        } catch (error) {
            logger.error('frontendDist', error)
        }

        let netServer: Server

        try {
            if (httpVersion === 'http') {
                this.netServer = netServer = (await import('http')).createServer(app)
            } else if (httpVersion === 'https') {
                this.netServer = netServer = (await import('https')).createServer({ ...ssl }, app)
            } else if (httpVersion === 'http2') {
                this.netServer = netServer = (await import('spdy')).default.createServer(
                    { ...ssl },
                    app,
                )
            } else throw new Error('httpVersion error', httpVersion)

            netServer.listen(port, () => {
                logger.info(httpVersion + 'server start running on: ' + hostUrl)
                parentPort?.postMessage({
                    event: 'ready',
                    data: { host: `https://localhost:${settings.server.serverPort}` },
                })
            })

            socketIo.init(netServer)
        } catch (error) {
            logger.error('start server', error)
        }

        return hostUrl
    }
    async close() {
        const res = await Promise.allSettled([
            new Promise((resolve, reject) => {
                this.socketIo.io.close((error) => {
                    if (error) logger.error('close socketio error', error)
                    resolve(error)
                })
            }),
            new Promise((resolve, reject) => {
                this.netServer.close((error) => {
                    if (error) logger.error('close socketio error', error)
                    resolve(error)
                })
            }),
        ])
        this.state = 'stop'
        return res
    }
}

const anyWell = new AnyWell()
anyWell.start()
export type serverController = (typeof anyWell)['controller']
export type serverMethods = Exclude<serverController['methods'], undefined>
export default anyWell
