import { log4js, httpLogger, logger, changeLevel } from './utils/logger'
process.on('uncaughtException', function (err) {
    logger.error('Caught exception ', err)
})
import fs from 'fs'
import path from 'path'
import init from './utils/init'
const { proxySettings } = init
import settings from '@s/store/settings'
import cookieParser from 'cookie-parser'
import express from 'express'
const app = express()
import https from 'https'
import history from 'connect-history-api-fallback'
import proxyMw from 'http-proxy-middleware'
const proxy = proxyMw.createProxyMiddleware
// import moduleName from 'socket.io';
import router from '@s/api'

app.use((req, res, next) => {
    // console.log('--------------', req.path)
    next()
})
app.use(log4js.connectLogger(httpLogger, { level: 'trace' }))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use('/api/old/v2', proxy(proxySettings))
app.use('/api', router)

// let tt = true
// app.use('/index.html', (req, res, next) => {
//     console.log('wwwwwwwwwwwwwwwwwwww', users.first, tt)
//     if (users.first === true && tt) {
//         tt = false
//         res.redirect('/welcome')
//     }
//     next()
// })

try {
    const oldwww = path.resolve(
        import.meta.env.DEV === true ? './webui/public' : './resources/dist/public',
    )
    fs.accessSync(oldwww)
    app.use('/old', express.static(oldwww))
} catch (error) {
    logger.error(error)
}

if (import.meta.env.DEV !== true) {
    try {
        const wwwroot = path.resolve('./resources/app/dist')
        fs.accessSync(wwwroot)
        app.use(express.static(wwwroot))
    } catch (error) {
        logger.error(error)
    }
}

try {
    if (!(proxySettings.ssl.cert && proxySettings.ssl.key)) {
        app.listen(settings.get('serverPort'))
        logger.info(
            'server start',
            `HTTP Server is running on: http://localhost:${settings.get('serverPort')}`,
        )
    } else {
        const httpsServer = https.createServer(proxySettings.ssl, app)
        // const io = require('socket.io')(httpsServer)
        if (import.meta.env.DEV === true)
            app.listen(+settings.get('serverPort') + 1, () => {
                logger.info(
                    `dev http server is running on: http://localhost:${
                        +settings.get('serverPort') + 1
                    }`,
                )
            })
        httpsServer.listen(settings.get('serverPort'), () => {
            logger.info(
                'server start',
                `HTTPS Server is running on: https://localhost:${settings.get('serverPort')}`,
            )
        })
    }
} catch (error) {
    console.log(error)
}

app.use(history())

// io.on('connection', function (socket) {
//     logger.debug('debug','cccccon');
//     // 发送数据
//     socket.emit('relogin', {
//         msg: `你好`,
//         code: 200
//     });
//     //接收数据
//     socket.on('login', function (obj) {
//         logger.debug('debug',obj.username);
//         logger.debug('debug',obj);
//     });
// });

export default app
