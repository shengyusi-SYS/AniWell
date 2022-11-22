const { log4js, logger } = require('./utils/logger');
const fs = require('fs');
const path = require('path');
const { readFile, writeFile } = require('fs/promises');

const { settings, settingsList, proxySettings, libraryIndex, mergeSettings } = require('./utils/init');
const { generatePictureUrl, searchLeaf } = require('./utils');

var got = () => Promise.reject()
import('got').then((result) => {
    got = result.default
})
const cookieParser = require('cookie-parser');
const express = require('express');
module.exports.express = express
const https = require('https');
const CookieJar = require('tough-cookie').CookieJar;
const cookieJar = new CookieJar()
const history = require('connect-history-api-fallback');
const proxyMw = require('http-proxy-middleware');
const proxy = proxyMw.createProxyMiddleware;
const app = express();
const { debounce } = require('lodash');

const merger = require('./utils/merger');
const trimPath = require('./utils/trimPath');
const handleVideoRequest = require('./components/handleVideoRequest');
const { librarySettingsList, updateLibrarySettings} = require('./components/mediaLibrary/librarySettings');
const { initMediaLibrary, cleanLibrary} = require('./components/mediaLibrary');
const dandanplayScraper = require('./components/mediaLibrary/dandanplayScraper');

var SID
var cookieTimer
var checkCookie = true
var maindataCache = {}
var videoHandler
var bannedSIDs = []

process.on('uncaughtException', function (err) {
    logger.error('Caught exception ', err);
});
// const specialCharacter = ['\\', '$', '(', ')', '*', '+', '.', '[', '?', '^', '{', '|']

function initMaindata(params) {
    got({
        url: `${settings.qbHost}/api/v2/sync/maindata`,
        method: 'get',
        cookieJar
    }).then((result) => {
        let newData = JSON.parse(result.body)
        let update = false
        if (libraryIndex.allSeason) {
            for (const hash in newData.torrents) {
                if (libraryIndex.allSeason[newData.torrents[hash].content_path]) {
                    newData.torrents[hash].mediaInfo = JSON.parse(JSON.stringify(libraryIndex.allSeason[newData.torrents[hash].content_path]))
                    newData.torrents[hash].mediaInfo.poster = `/api/localFile/getFile/img.jpg?type=picture&path=${encodeURIComponent(libraryIndex.allSeason[newData.torrents[hash].content_path].poster)}`
                } else if (newData.torrents[hash].content_path == newData.torrents[hash].save_path) {
                    if (!libraryIndex.collections[hash]) {
                        libraryIndex.collections[hash] = { rootPath: path.resolve(newData.torrents[hash].save_path) }
                        update = true
                    } else if (libraryIndex.collections[hash].title) {
                        newData.torrents[hash].mediaInfo = JSON.parse(JSON.stringify(libraryIndex.collections[hash]))
                        newData.torrents[hash].mediaInfo.poster = `/api/localFile/getFile/img.jpg?type=picture&path=${encodeURIComponent(newData.torrents[hash].mediaInfo.poster)}`
                    }
                }
            }
            if (update) {
                updateCollections()
            }
            fs.writeFileSync('./libraryIndex.json', JSON.stringify(libraryIndex, '', '\t'))
        }
        maindataCache = {}
        merger(maindataCache, newData)
    }).catch((err) => {
        logger.error('error', err);
    });
}



app.use(log4js.connectLogger(log4js.getLogger("http"), { level: 'trace' }));
app.use(express.json())
app.use(cookieParser())


//test
// app.use('/test', (req, res) => {
//     readFile(`${settings.tempPath}output${req.path}`).then((result) => {
//         logger.debug('debug','sent', [req.path]);
//         // logger.debug('debug',result.toString());
//         res.send(result)
//     }).catch(err => {
//         logger.debug('debug',err);
//         res.status(404).send('not found')
//     })
// })
// app.use(logger('dev'));
// app.use(express.static(path.join(__dirname, 'public')));
// app.get('/',(req,res)=>{
//     res.sendFile(path.resolve(__dirname,'dist','index.html'))
// })


//权限验证预处理
app.use('/api', (req, res, next) => {
    // logger.debug('/api',req.path);
    try {
        if (req.path == '/v2/auth/login') {
            // logger.debug('/v2/auth/login', req.headers)
            next()
        } else if (!req.cookies && !req.query.cookie) {
            throw new Error('Fails.')
        } else {
            let newSID
            if (req.cookies && req.cookies.SID) {
                newSID = req.cookies.SID
            } else if (req.query && req.query.cookie) {
                newSID = req.query.cookie.replace('SID=', '')
            } else {
                throw new Error('Fails.')
            }

            if (bannedSIDs.includes(newSID)) {
                logger.error('/api', 'bannedSIDs')
                throw new Error('Fails.')
            } else if (SID != newSID) {
                checkCookie = true
                SID = newSID
                cookieJar.setCookieSync(`SID=${newSID}`, settings.qbHost)
            }
            next()
        }
    } catch (error) {
        if (req.path != '/v2/sync/maindata') {
            logger.error('/api', error)
        }
        res.status(403).send(error)
    }
})

//权限验证
app.use('/api/localFile', async (req, res, next) => {
    try {
        res.header("Access-Control-Allow-Origin", "*");
        if (settings.share && /^\/localFile\/output\//i.test(req.path)) {
            next()
            return
        }
        if (checkCookie) {
            logger.info('/api/localFile', 'check');
            let result = await got({
                url: `${settings.qbHost}/api/v2/auth/login`,
                method: 'POST',
                cookieJar
            })
            result = result.body
            if (result == 'Ok.') {
                checkCookie = false
                clearTimeout(cookieTimer)
                cookieTimer = setTimeout(() => { checkCookie = true }, 30 * 60 * 1000)
                next()
            } else {
                logger.info('/api/localFile', 'banned', SID);
                bannedSIDs.push(SID)
                throw new Error('Fails.')
            }
        } else {
            next()
        }
    } catch (error) {
        logger.error('/api/localFile', error);
        res.status(403).send(error)
    }
})

//连接状态测试，返回服务器配置项
app.use('/api/localFile/checkFileServer', (req, res) => {
    res.send(settingsList)
})
//获取媒体库配置项
app.use('/api/localFile/librarySettings', (req, res) => {
    res.send(librarySettingsList)
})
//更新媒体库设定
app.use('/api/localFile/updateLibrarySettings', (req, res) => {
    let result = updateLibrarySettings(req.body)
    if (result) {
        res.send('Ok.')
    } else {
        res.send({
            error: true,
            errorMessage: '路径错误'
        })
    }
})
//更新指定媒体库
app.use('/api/localFile/updateLibrary', async(req, res) => {
    let {libraryPath, libraryName} = req.body
    if (!searchLeaf(libraryIndex,libraryPath)) {
        res.send({
            error: true,
            errorMessage: '媒体库不存在'
        })
        return
    }else{
        res.send('Ok.')
    }
   await initMediaLibrary(libraryPath, libraryName)
   await cleanLibrary()
   logger.info('/api/localFile/updateLibrary end')
})
//更新指定文件夹
app.use('/api/localFile/updateDir', async(req, res) => {
    let {dirPath} = req.body
    // if (!searchLeaf(libraryIndex,dirPath)) {
    //     res.send({
    //         error: true,
    //         errorMessage: '不存在,请更新媒体库'
    //     })
    //     return
    // }else{
        res.send('Ok.')
    // }
   await dandanplayScraper(dirPath,searchLeaf(libraryIndex,dirPath),true,0)
   logger.info('/api/localFile/updateDir end')
})


//更新配置项
app.use('/api/localFile/changeFileServerSettings', async (req, res) => {
    let data = req.body
    mergeSettings(settingsList, settings, data)
    writeFile('./settings.json', JSON.stringify(settings, '', '\t')).then((result) => {
        logger.debug('debug', '已更新配置');
        logger.debug('debug', settings);
        res.send('Ok.')
    }).catch((err) => {
        logger.error('error', err);
        res.send('Fails.')
    });
})


// app.use('/api/localFile/killFFmpeg', (req, res, next) => {
//     if (FFmpegProcess) {
//         // spawn('taskkill',['-PID',FFmpegProcess.pid,'-F'])
//         kill(FFmpegProcess.pid, 'SIGKILL')
//         logger.debug('debug',FFmpegProcess);
//     }
//     res.send('Ok.')
// })


//hls地址生成
app.use('/api/localFile/videoSrc', (req, res, next) => {
    const path = req.headers.referer.split(':')
    if (videoHandler.method == 'direct') {
        res.send({
            src: `/api/localFile/directPlay/${videoHandler.id}?cookie=SID=${encodeURIComponent(SID)}`,
            type: videoHandler.contentType
        })
    } else if (videoHandler.method == 'transcode') {

        res.send({
            src: `/api/localFile/output/index.m3u8?cookie=SID=${encodeURIComponent(SID)}`,
            type: videoHandler.contentType,
        })
    }
    // logger.debug('debug','src', fileRootPath);
})

app.use("/api/localFile/library", (req, res, next) => {
    try {
        var library = JSON.parse(fs.readFileSync(path.resolve('./libraryIndex.json')))
        res.send(library)
    } catch (error) {
        res.status(404).send('未建立媒体库')
    }
})

//文件请求处理
app.use('/api/localFile/getFile', async (req, res, next) => {
    let filePath
    let formatList = {
        text: ['txt'],
        video: ['mkv', 'mp4', 'flv', 'ts', 'm3u8', 'mov', 'avi'],
        picture: ['jpg', 'png'],
        audio: ['mp3', 'wav', 'flac']
    }
    let fileType
    var body = req.body
    if (body && body.rootPath && (body.name || body.label)) {
        filePath = path.resolve(body.rootPath, body.name ? body.name : body.label ? body.label : '')
        var suffix = path.extname(filePath).replace('.', '')
        for (const key in formatList) {
            if (formatList[key].includes(suffix)) {
                fileType = key
            }
        }
    }
    if (req.query.path) {
        fileType = req.query.type
        filePath = path.resolve(req.query.path)
    }
    // logger.debug('debug',req.query);
    try {
        if (fileType == 'text') {
            readFile(path.resolve(filePath)).then((result) => {
                res.send(result)
            })
        } else if (fileType == 'video') {
            let params = { filePath, suffix, SID, bitrate: settings.bitrate, autoBitrate: settings.autoBitrate, resolution: '1080p' }
            videoHandler = await handleVideoRequest(params)
            videoHandler(app)
            res.send('Ok.')
        } else if (fileType == 'picture') {
            res.sendFile(path.resolve(filePath))
        } else if (fileType == 'audio') {
            readFile(path.resolve(filePath)).then((result) => {
                res.send(result)
            })
        } else {
            throw new Error('暂不支持')
        }
        return
    } catch (error) {
        res.send(error.message)
        next()
    }
})

// app.use("/", (req,res,next)=>{

// });

app.use("/api/v2/sync/maindata", async (req, res, next) => {
    got({
        url: `${settings.qbHost}/api/v2/sync/maindata?rid=${req.query.rid}`,
        method: 'get',
        cookieJar
    }).then((result) => {
        let newData = JSON.parse(result.body)
        res.header('Content-Type', 'application/json')
        //处理删减
        if (newData.torrents_removed) {
            newData.torrents_removed.forEach((hash) => {
                delete maindataCache.torrents[hash]
            })
        } else if (newData.full_update) {//处理完全更新
            let update = false
            //附加媒体信息，半废中
            for (const hash in newData.torrents) {
                if (newData.torrents[hash].content_path == newData.torrents[hash].save_path) {
                    // newData.torrents[hash].mediaInfo = JSON.parse(JSON.stringify(libraryIndex.collections[hash]))
                    // newData.torrents[hash].mediaInfo.poster = `/api/localFile/getFile/img.jpg?type=picture&path=${encodeURIComponent(newData.torrents[hash].mediaInfo.poster)}`
                } else {
                    // console.log(newData.torrents[hash]);
                    let mediaPath = newData.torrents[hash].content_path
                    let mediaInfo = searchLeaf(libraryIndex, mediaPath)
                    if (mediaInfo) {
                        mediaInfo = JSON.parse(JSON.stringify(mediaInfo))
                        delete mediaInfo.children
                        newData.torrents[hash].mediaInfo = mediaInfo
                        if (mediaInfo.poster) {
                            newData.torrents[hash].mediaInfo.poster = generatePictureUrl(mediaInfo.poster)
                        }
                    }
                }
            }
            maindataCache = {}
            merger(maindataCache, newData)
        } else {
            merger(maindataCache, newData)
        }
        res.send(newData)
    }).catch((err) => {
        logger.debug('maindata', err);
    });
});

// app.use("/api/v2/sync/maindata", proxy({
//     ...proxySettings,
//     selfHandleResponse: true,
//     onProxyRes:(proxyRes, req, res)=>{
//         logger.debug('debug',proxyRes.body);
//         proxyRes.on('data', function (chunk) {
//             logger.debug('debug',chunk.toString());
//         })
//     }
// }));
app.use("/api/v2/torrents/files", express.urlencoded({ extended: false }), (req, res, next) => {
    let hash = req.body.hash
    // let form = new FormData()
    // form.append('hash', hash)
    let file
    got({
        url: `${settings.qbHost}/api/v2/torrents/files`,
        method: 'post',
        form: { 'hash': hash },
        cookieJar
    }).then((result) => {
        file = JSON.parse(result.body)
        file.forEach(v => {
            let fullPath = path.resolve(maindataCache.torrents[hash].save_path, v.name)
            // console.log(libraryIndex.children.find(v=>fullPath.includes(v.path)),fullPath);
            let info = searchLeaf(libraryIndex, fullPath)
            if (info) {
                v.mediaInfo = JSON.parse(JSON.stringify(info))
                if (v.mediaInfo.poster) {
                    v.mediaInfo.poster = generatePictureUrl(v.mediaInfo.poster)
                }
                // v.mediaInfo.seasonPoster = generatePictureUrl(v.mediaInfo.seasonPoster)
            }
        })
        // file.forEach(v => {
        //     let fullPath = path.resolve(maindataCache.torrents[hash].save_path, v.name)
        //     console.log(libraryIndex.children.find(v=>fullPath.includes(v.path)),fullPath);
        //     let info =  searchLeaf(libraryIndex.children.find(v=>fullPath.includes(v.path)),fullPath)
        //     if (libraryIndex.episodes[fullPath]) {
        //         v.mediaInfo = JSON.parse(JSON.stringify(info))
        //         v.mediaInfo.poster = generatePictureUrl(v.mediaInfo.poster)
        //         // v.mediaInfo.seasonPoster = generatePictureUrl(v.mediaInfo.seasonPoster)
        //     }
        // })
        res.send(file)
    }).catch(e => logger.error('error', e))
})
// next()
// app.use("/api/v2/torrents/files",express.urlencoded());
// app.use("/api/v2/torrents/files", proxy({
//     ...proxySettings,
//     onProxyRes:(proxyRes, req, res)=>{
//         logger.debug('debug',proxyRes.body,proxyRes.data,proxyRes.params,req.query);
//         // logger.debug('debug',proxyRes);
//         // res.send(proxyRes)
//         // proxyRes.on('data', function (chunk) {
//         //     logger.debug('debug',chunk.toString());
//         // })
//     }
// }));
try {
    let wwwroot = path.resolve(__dirname, '../dist/public')
    fs.accessSync(wwwroot)
    app.use(express.static(wwwroot));
    app.use(history());
    app.use("/api/v2", proxy(proxySettings));
    logger.debug('debug', '~~~本地WebUI');
} catch (error) {
    app.use("/", proxy(proxySettings));
    logger.debug('debug', '~~~qBittorrent Web UI');
}
logger.debug('debug', 'dir', __dirname, 'resolve', path.resolve(''));

// app.use((req,res,next)=>{
//     logger.debug('all',req.path)
//     next()
// })

if (!(proxySettings.ssl.cert && proxySettings.ssl.key)) {
    app.listen(settings.serverPort);
    logger.debug('debug', `HTTP Server is running on: http://localhost:${settings.serverPort}`);
} else {
    const httpsServer = https.createServer(proxySettings.ssl, app);
    io = require('socket.io')(httpsServer);
    httpsServer.listen(settings.serverPort, () => {
        logger.debug('debug', `HTTPS Server is running on: https://localhost:${settings.serverPort}`);
    });
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
