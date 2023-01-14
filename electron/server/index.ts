import { log4js, logger, changeLevel } from './utils/logger'
process.on('uncaughtException', function (err) {
    logger.error('Caught exception ', err)
})
import fs from 'fs'
import path from 'path'
import init from './utils/init'
const { proxySettings } = init
import settings from '@s/store/settings'
import got from 'got'
import cookieParser from 'cookie-parser'
import express from 'express'
const app = express()
import https from 'https'
import { CookieJar } from 'tough-cookie'
const cookieJar = new CookieJar()
import history from 'connect-history-api-fallback'
import proxyMw from 'http-proxy-middleware'
const proxy = proxyMw.createProxyMiddleware
// import moduleName from 'socket.io';
import router from '@s/api'

let SID: string
let cookieTimer: NodeJS.Timeout
let checkCookie = true
const bannedSIDs: string[] = []

// const specialCharacter = ['\\', '$', '(', ')', '*', '+', '.', '[', '?', '^', '{', '|']

// function initMaindata(params) {
//     got({
//         url: `${settings.qbHost}/api/v2/sync/maindata`,
//         method: 'get',
//         cookieJar,
//     })
//         .then((result) => {
//             const newData = JSON.parse(result.body)
//             let update = false
//             if (libraryIndex.allSeason) {
//                 for (const hash in newData.torrents) {
//                     if (libraryIndex.allSeason[newData.torrents[hash].content_path]) {
//                         newData.torrents[hash].mediaInfo = JSON.parse(
//                             JSON.stringify(
//                                 libraryIndex.allSeason[newData.torrents[hash].content_path],
//                             ),
//                         )
//                         newData.torrents[
//                             hash
//                         ].mediaInfo.poster = `/api/localFile/getFile/img.jpg?type=picture&path=${encodeURIComponent(
//                             libraryIndex.allSeason[newData.torrents[hash].content_path].poster,
//                         )}`
//                     } else if (
//                         newData.torrents[hash].content_path == newData.torrents[hash].save_path
//                     ) {
//                         if (!libraryIndex.collections[hash]) {
//                             libraryIndex.collections[hash] = {
//                                 rootPath: path.resolve(newData.torrents[hash].save_path),
//                             }
//                             update = true
//                         } else if (libraryIndex.collections[hash].title) {
//                             newData.torrents[hash].mediaInfo = JSON.parse(
//                                 JSON.stringify(libraryIndex.collections[hash]),
//                             )
//                             newData.torrents[
//                                 hash
//                             ].mediaInfo.poster = `/api/localFile/getFile/img.jpg?type=picture&path=${encodeURIComponent(
//                                 newData.torrents[hash].mediaInfo.poster,
//                             )}`
//                         }
//                     }
//                 }
//                 if (update) {
//                     // updateCollections()
//                 }
//                 fs.writeFileSync(
//                     init.libraryIndexPath,
//                     JSON.stringify(libraryIndex, () => {}, '\t'),
//                 )
//             }
//             deepMerge(maindataCache, newData)
//         })
//         .catch((err) => {
//             logger.error('error', err)
//         })
// }

app.use(log4js.connectLogger(log4js.getLogger('http'), { level: 'trace' }))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
// test
// app.use('/test', (req, res) => {})

//权限验证预处理
app.use('/api', (req, res, next) => {
    // logger.debug('/api',req.path);
    try {
        if (
            req.path == '/v2/auth/login' ||
            /^\/v1/.test(req.path) ||
            /^\/localFile\/output\//i.test(req.path)
        ) {
            // logger.debug('/v2/auth/login', req.headers)
            next()
        } else if (!req.cookies && !req.query.cookie) {
            throw new Error('Fails.')
        } else {
            let newSID
            if (req.cookies?.SID) {
                newSID = req.cookies.SID
            } else if (req.query?.cookie) {
                newSID = (req.query.cookie as string).replace('SID=', '')
            } else {
                throw new Error('Fails.')
            }

            if (bannedSIDs.includes(newSID)) {
                logger.error('/api', 'bannedSIDs')
                throw new Error('Fails.')
            } else if (SID != newSID) {
                checkCookie = true
                SID = newSID
                cookieJar.setCookieSync(`SID=${newSID}`, settings.get('qbHost'))
            }
            next()
        }
    } catch (error) {
        if (req.path != '/v2/sync/maindata') {
            logger.error('/api', req.path, req.headers, req.cookies, error)
        }
        res.status(403).send(error)
    }
})

//权限验证
app.use('/api/localFile', async (req, res, next) => {
    try {
        res.header('Access-Control-Allow-Origin', '*')
        if (settings.get('share') && /^\/localFile\/output\//i.test(req.path)) {
            next()
            return
        }
        if (/^\/v1/.test(req.path)) {
            next()
            return
        }
        if (checkCookie) {
            logger.info('/api/localFile', 'check')
            const result = (
                await got({
                    url: `${settings.get('qbHost')}/api/v2/auth/login`,
                    method: 'POST',
                    cookieJar,
                })
            ).body
            if (result == 'Ok.') {
                checkCookie = false
                clearTimeout(cookieTimer)
                cookieTimer = setTimeout(() => {
                    checkCookie = true
                }, 30 * 60 * 1000)
                next()
            } else {
                logger.info('/api/localFile', 'banned', SID)
                bannedSIDs.push(SID)
                throw new Error('Fails.')
            }
        } else {
            next()
        }
    } catch (error) {
        logger.error('/api/localFile', error)
        res.status(403).send(error)
    }
})

app.use('/api', router)

try {
    const wwwroot = path.resolve(
        import.meta.env.DEV === true ? './webui/public' : './resources/dist/public',
    )
    fs.accessSync(wwwroot)
    app.use(express.static(wwwroot))
    app.use(history())
    proxySettings.secure = true
    // proxySettings.changeOrigin = true
    app.use('/api/v2', (req, res, next) => {
        console.log('~~~~~~', req.body, req.path)
        next()
    })
    app.use('/api/v2', proxy(proxySettings))
    logger.info('server start', '~~~本地WebUI')
} catch (error) {
    app.use('/', proxy(proxySettings))
    logger.info('server start', '~~~qBittorrent Web UI')
}

// if (init.signUp === true) {
//     app.use('/login', (req, res) => {
//         res.redirect('/signup')
//     })
// }
// logger.debug('debug', 'dir', __dirname, 'resolve', path.resolve(''));

// app.use((req,res,next)=>{
//     logger.debug('all',req.path)
//     next()
// })
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
// export default app

// module.exports = {
//     app,
//     express,
//     SID
// }

export default app
