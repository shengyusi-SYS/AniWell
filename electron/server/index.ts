import { log4js, httpLogger, logger, syncLogger, clientLogger } from './utils/logger'
process.on('uncaughtException', function (err) {
    logger.error('Caught exception !!!', err)
})
import fs from 'fs'
import { join, resolve } from 'path'
import settings from '@s/store/settings'
logger.info('settings', settings)
import init from './utils/init'
const { ssl } = init
import cookieParser from 'cookie-parser'
import express from 'express'
const app = express()
import https from 'https'
import http from 'http'
import history from 'connect-history-api-fallback'
import { Server } from 'socket.io'
import router from '@s/api'
import users from '@s/store/users'
import { verifyToken } from '@s/utils/jwt'
import Io from './api/v1/socket'
// import { MongoClient } from 'mongodb'
// const url = 'mongodb://localhost:27017/fs'

// MongoClient.connect(url, {})
app.use(log4js.connectLogger(httpLogger, { level: 'trace' }))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use('/api', router)

try {
    const wwwroot = join(__dirname, import.meta.env.DEV ? '../../dist' : '../../../dist')
    logger.info('wwwroot', wwwroot)

    const rootFileList = [
        ...fs.readdirSync(wwwroot).map((v) => '/' + v),
        ...fs.readdirSync(join(wwwroot, 'assets')).map((v) => '/assets/' + v),
    ].join('|')
    const assetsReg = new RegExp(`(${rootFileList})$`)
    app.use(
        history({
            // logger: console.log.bind(logger.info),
            rewrites: [
                {
                    from: assetsReg,
                    to: (ctx) => {
                        return ctx.match[0]
                    },
                },
            ],
        }),
        express.static(wwwroot),
    )
} catch (error) {
    logger.error('wwwroot', error)
}

try {
    const httpsServer = https.createServer(ssl, app)
    httpsServer.listen(settings.server.serverPort, () => {
        logger.info(
            'server start',
            `HTTPS Server is running on: https://localhost:${settings.server.serverPort}`,
        )
    })
    if (import.meta.env.DEV === true) {
        //vite+https proxy时，vue devtool会出问题，所以另开一个开发用
        const httpServer = http.createServer(app)
        httpServer.listen(+settings.server.serverPort + 1, () => {
            logger.info(
                `dev http server is running on: http://localhost:${
                    +settings.server.serverPort + 1
                }`,
            )
        })

        Io.init(httpServer)
    } else Io.init(httpsServer)
} catch (error) {
    logger.error('start server', error)
}

import('./modules/scraper')
    .then((result) => {
        console.log('``````````````````')
    })
    .catch((err) => {})
export default app
