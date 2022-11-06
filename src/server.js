const { log4js, logger } = require('./utils/logger');
const fs = require('fs');
const path = require('path');
const {
    settings,
    Ffmpeg,
    proxySettings,
    libraryIndex,
    osPlatform
} = require('./utils/init');

var got = () => Promise.reject()
import('got').then((result) => {
    got = result.default
})
const cookieParser = require('cookie-parser');
const express = require('express');
const proxyMw = require('http-proxy-middleware');
const https = require('https');

const CookieJar = require('tough-cookie').CookieJar;
const cookieJar = new CookieJar()
// const xml2js = require('xml2js');
// const xmlParser = new xml2js.Parser();
const history = require('connect-history-api-fallback');


const merger = require('./utils/merger');
const dd2nfo = require('./utils/dd2nfo');
const trimPath = require('./utils/trimPath');



const { readdir, rmdir, mkdir, stat, readFile, writeFile } = require('./utils');
const proxy = proxyMw.createProxyMiddleware;
const app = express();






// const fileCookie = {}
// let qbCookie = { SID: undefined }
var SID
var cookieTimer
var checkCookie = true
var currentProcess = null
var maindataCache = {}


// const specialCharacter = ['\\', '$', '(', ')', '*', '+', '.', '[', '?', '^', '{', '|']



function updateCollections(params) {
    let fileQueue = []
    for (const hash in libraryIndex.collections) {
        // let form = new FormData()
        // form.append('hash', hash)
        let task = got({
            url: `${settings.qbHost}/api/v2/torrents/files`,
            method: 'post',
            // body: form,
            form: { 'hash': hash },
            cookieJar
        }).then((result) => {
            let fileTree = trimPath(JSON.parse(result.body))
            let seasonList = Object.keys(libraryIndex.allSeason)
            fileTree.sort((a, b) => {
                try {
                    var aPath = seasonList.find(v => a.label == path.parse(v).name)
                    var aId = libraryIndex.allSeason[aPath].id
                    var bPath = seasonList.find(v => b.label == path.parse(v).name)
                    var bId = libraryIndex.allSeason[bPath].id
                } catch (error) {
                    // logger.debug('debug',error);
                    return a.label.length - b.label.length
                }
                return aId - bId
            })
            let collectionTitle = fileTree[0].label
            let collectionPath = path.resolve(libraryIndex.collections[hash].rootPath, collectionTitle)
            collectionTitle = libraryIndex.allSeason[collectionPath].title
            // logger.debug('debug',collectionTitle);
            let collectionPoster = libraryIndex.allSeason[collectionPath].poster
            libraryIndex.collections[hash].title = collectionTitle
            libraryIndex.collections[hash].poster = collectionPoster
            return true
        }).catch((err) => {
            return false
        });
        fileQueue.push(task)
    }
    fs.writeFileSync('./libraryIndex.json', JSON.stringify(libraryIndex, '', '\t'))
    return Promise.all(fileQueue).then((fileQueue) => {
        initMaindata()
        logger.debug('debug', '合集匹配完成');
    }).catch((err) => {
    })
}

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
                    newData.torrents[hash].mediaInfo.poster = `/api/localFile/img.jpg?type=picture&path=${encodeURIComponent(libraryIndex.allSeason[newData.torrents[hash].content_path].poster)}`
                } else if (newData.torrents[hash].content_path == newData.torrents[hash].save_path) {
                    if (!libraryIndex.collections[hash]) {
                        libraryIndex.collections[hash] = { rootPath: path.resolve(newData.torrents[hash].save_path) }
                        update = true
                    } else if (libraryIndex.collections[hash].title) {
                        newData.torrents[hash].mediaInfo = JSON.parse(JSON.stringify(libraryIndex.collections[hash]))
                        newData.torrents[hash].mediaInfo.poster = `/api/localFile/img.jpg?type=picture&path=${encodeURIComponent(newData.torrents[hash].mediaInfo.poster)}`
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

function generatePictureUrl(path) {
    return `/api/localFile/img.jpg?type=picture&path=${encodeURIComponent(path)}`
}

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
});
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



app.use('/api', (req, res, next) => {
    // logger.debug('debug',req.headers.cookie,req.cookies);
    if (req.cookies) {
        // logger.debug('debug',SID,req.cookies.SID);
        if (SID != req.cookies.SID) {
            checkCookie = true
        }
        SID = req.cookies.SID
        // logger.debug('debug',SID);
        cookieJar.setCookieSync(`SID=${req.cookies.SID}`, settings.qbHost)
    }
    next()
})

//权限验证
app.use('/api/localFile', (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    if (checkCookie) {
        if (settings.share && req.path.includes('/output/')) {
            // logger.debug('debug','goooooo');
            next()
            return
        }
        if (req.query.cookie) {
            let coo = req.query.cookie.replace("SID=", '')
            // logger.debug('debug',coo,'----------ccccccccc');
            cookieJar.setCookieSync(`SID=${coo}`, settings.qbHost)
        }
        logger.debug('debug', 'check');
        got({
            url: `${settings.qbHost}/api/v2/auth/login`,
            method: 'POST',
            cookieJar
        }).then((result) => {
            result = result.body
            if (result == 'Ok.') {
                checkCookie = false
                clearTimeout(cookieTimer)
                cookieTimer = setTimeout(() => { checkCookie = true }, 30 * 60 * 1000)
                next()
            } else {
                throw new Error('无权限，请重新登录')
            }
        }).catch((err) => {
            // logger.debug('debug',err);
            res.status(403).send(err.message)
            return
        });
    } else {
        next()
    }
})

//连接状态测试
app.use('/api/localFile/checkFileServer', (req, res) => {
    res.send(settings)
})

app.use('/api/localFile/updateLibrary', (req, res) => {
    if (req.query.fullUpdate === 'true') {
        var fullUpdate = true
    } else fullUpdate = false
    if (req.query.overwrite === 'true') {
        var overwrite = true
    } else overwrite = false
    res.send('Ok.')
    dd2nfo(settings.dandanplayPath, fullUpdate, overwrite).then((result) => {
        libraryIndex = JSON.parse(fs.readFileSync('./libraryIndex.json'))
        libraryIndex.allSeason = result
        if (!libraryIndex.collections) {
            libraryIndex.collections = {}
        }
        fs.writeFileSync('./libraryIndex.json', JSON.stringify(libraryIndex, '', '\t'))
        return
    }).catch((err) => {
        logger.error('error', err);
    }).then((result) => {
        updateCollections()
    })
})

//更新配置项
app.use('/api/localFile/changeFileServerSettings', async (req, res) => {
    let data = req.body
    let clean = ['customInputCommand',
        'customOutputCommand',
        'encode', 'platform', 'bitrate', 'autoBitrate']
    data.forEach(val => {
        if (settings[val.name] != val.value) {
            settings[val.name] = val.value
            if (clean.includes(val.name) && currentProcess) {
                hlsTemp = null
            }
        }
    })
    killCurrentProcess()
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
    // logger.debug('debug','src', fileRootPath);
    res.send(`${path[0]}:${path[1]}:${settings.serverPort}/api/localFile/output/index.m3u8?cookie=SID=${encodeURIComponent(SID)}`)
})

app.use("/api/localFile/library", (req, res, next) => {
    try {
        var library = JSON.parse(fs.readFileSync(path.resolve('libraryIndex.json')))
        res.send(library.libraryTree)
    } catch (error) {
        res.status(404).send('未建立媒体库')
    }
})

//文件请求处理
app.use('/api/localFile', async (req, res, next) => {
    let filePath
    let formatList = {
        text: ['txt'],
        video: ['mkv', 'mp4', 'flv', 'ts', 'm3u8', 'mov', 'avi'],
        picture: ['jpg', 'png'],
        audio: ['mp3', 'wav', 'flac']
    }
    let fileType
    if (req.body.name) {
        var body = req.body
        var suffix = body.name.split('.').slice(-1)[0]
        for (const key in formatList) {
            if (formatList[key].includes(suffix)) {
                fileType = key
            }
        }
        filePath = path.resolve(body.rootPath, body.name)
    }
    if (req.query.path) {
        fileType = req.query.type
        filePath = req.query.path
    }
    // logger.debug('debug',req.query);
    try {
        if (fileType == 'text') {
            readFile(path.resolve(filePath)).then((result) => {
                res.send(result)
            })
        } else if (fileType == 'video') {
            handleVideoRequest(req, res, filePath, suffix)
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
            if (libraryIndex.allSeason) {
                for (const hash in newData.torrents) {
                    if (libraryIndex.allSeason[newData.torrents[hash].content_path]) {
                        newData.torrents[hash].mediaInfo = JSON.parse(JSON.stringify(libraryIndex.allSeason[newData.torrents[hash].content_path]))
                        newData.torrents[hash].mediaInfo.poster = `/api/localFile/img.jpg?type=picture&path=${encodeURIComponent(libraryIndex.allSeason[newData.torrents[hash].content_path].poster)}`
                    } else if (newData.torrents[hash].content_path == newData.torrents[hash].save_path) {
                        if (!libraryIndex.collections[hash]) {
                            libraryIndex.collections[hash] = { rootPath: path.resolve(newData.torrents[hash].save_path) }
                            update = true
                        } else if (libraryIndex.collections[hash].title) {
                            newData.torrents[hash].mediaInfo = JSON.parse(JSON.stringify(libraryIndex.collections[hash]))
                            newData.torrents[hash].mediaInfo.poster = `/api/localFile/img.jpg?type=picture&path=${encodeURIComponent(newData.torrents[hash].mediaInfo.poster)}`
                        }
                    }
                }
                if (update) {
                    updateCollections()
                }
                fs.writeFileSync('./libraryIndex.json', JSON.stringify(libraryIndex, '', '\t'))
            }
            // logger.debug('debug',newData);
            maindataCache = {}
            merger(maindataCache, newData)
        } else {
            merger(maindataCache, newData)
        }
        res.send(newData)
    }).catch((err) => {
        // logger.debug('debug',err);
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
            if (libraryIndex.episodes[fullPath]) {
                v.mediaInfo = JSON.parse(JSON.stringify(libraryIndex.episodes[fullPath]))
                v.mediaInfo.poster = generatePictureUrl(v.mediaInfo.poster)
                v.mediaInfo.seasonPoster = generatePictureUrl(v.mediaInfo.seasonPoster)
            }
        })
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

module.exports = {
    app,
    express,
    SID
}
require('./components/handleVideoRequest/old.js')