import { log4js, httpLogger, logger, changeLevel } from './utils/logger'
process.on('uncaughtException', function (err) {
    logger.error('Caught exception ', err)
})
import fs from 'fs'
import path, { join } from 'path'
import init from './utils/init'
const { proxySettings } = init
import settings from '@s/store/settings'
import cookieParser from 'cookie-parser'
import express from 'express'
const app = express()
import https from 'https'
import http from 'http'
import history from 'connect-history-api-fallback'
import { Server } from 'socket.io'
import router from '@s/api'
// import serveAsar from 'express-serve-asar'

app.use(log4js.connectLogger(httpLogger, { level: 'trace' }))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
// app.use('/api/old/v2', proxy(proxySettings))
app.use('/api', router)
app.use(history())

// if (import.meta.env.DEV !== true) {
try {
    const wwwroot = join(__dirname, import.meta.env.DEV ? '../../dist' : '../../../dist')
    logger.info('~~~~~~~~~~~~~', wwwroot)
    fs.accessSync(wwwroot)
    app.use(
        // serveAsar(wwwroot),
        express.static(wwwroot),
    )
} catch (error) {
    logger.error('wwwroot', error)
}
// }

try {
    if (!(proxySettings.ssl.cert && proxySettings.ssl.key)) {
        app.listen(settings.get('serverPort'))
        logger.info(
            'server start',
            `HTTP Server is running on: http://localhost:${settings.get('serverPort')}`,
        )
    } else {
        const httpsServer = https.createServer(proxySettings.ssl, app)
        httpsServer.listen(settings.get('serverPort'), () => {
            logger.info(
                'server start',
                `HTTPS Server is running on: https://localhost:${settings.get('serverPort')}`,
            )
        })
        if (import.meta.env.DEV === true) {
            const httpServer = http.createServer(proxySettings.ssl, app)
            httpServer.listen(+settings.get('serverPort') + 1, () => {
                logger.info(
                    `dev http server is running on: http://localhost:${
                        +settings.get('serverPort') + 1
                    }`,
                )
            })
            var io = new Server(httpServer)
        } else io = new Server(httpsServer)
    }
} catch (error) {
    logger.error('start server', error)
}

io.on('connection', (socket) => {
    console.log('a user connected')
})

export default app
