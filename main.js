import got from 'got';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import { promisify } from 'util';
import { spawn } from 'child_process';
import express from 'express';
import proxyMw from 'http-proxy-middleware';
import rimraf from 'rimraf';
import https from 'https';
import kill from 'tree-kill';
const _rimrafs = (path) => new Promise((resolve, reject) => {
    rimraf(path, resolve)
})

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const readdir = promisify(fs.readdir)
const rmdir = promisify(fs.rmdir)
const mkdir = promisify(fs.mkdir)
const proxy = proxyMw.createProxyMiddleware;
const app = express();

//配置
var settings = {
    qbHost: 'http://localhost:8008',
    serverPort: 9009,
    tempPath: './',
    cert: './ssl/domain.pem',
    key: './ssl/domain.key',
    secure: false,
    burnSubtitle: true,
    forceTranscode: false,
    share: false,
    platform: 'nvidia',
    encode: 'h265',
    bitrate: 5,
    customCommand: '',
}
try {
    settings = Object.assign(settings, JSON.parse(fs.readFileSync('./settings.json')))
    console.log('已加载本地配置', settings);
} catch (error) {
    fs.writeFileSync('./settings.json', JSON.stringify(settings, '', '\t'))
    console.log('已写入默认配置');
}
// console.log(settings);
//转发配置
var proxySettings = {
    target: settings.qbHost,
    changeOrigin: true,
    secure: settings.secure
}
const fileCookie = {}
// let qbCookie = { SID: undefined }
let temp = ''
let tryTimes = 0
var fileRootPath = ''
var subtitle = []
var checkTimeout
var FFmpegProcess
var transState = 'false'
let encoders = {
    h265: {
        nvidia: 'hevc_nvenc',
        intel: 'hevc_qsv',
        amd: 'hevc_amf',
        other: 'libx265',
    },
    h264: {
        nvidia: 'h264_nvenc',
        intel: 'h264_qsv',
        amd: 'h264_amf',
        other: 'libx264',
    }
}
let decoders = {
    nvidia:'cuivd',
    intel:'qsv',
}

// var masterList = `#EXTM3U
// #EXT-X-VERSION:7
// #EXT-X-MEDIA:TYPE=SUBTITLES,ID="subs",NAME="default",GROUP-ID="subtitle",DEFAULT=YES,URI="index_vtt.m3u8"
// index_vtt.m3u8
// #EXT-X-MEDIA:TYPE=VIDEO,NAME="default",DEFAULT=YES,URI="index.m3u8"
// #EXT-X-STREAM-INF:BANDWIDTH=10000000,SUBTITLES="subs"
// index.m3u8`

//检查hls生成
function checkM3u8() {
    clearTimeout(checkTimeout)
    return readFile(settings.tempPath + 'output/index.m3u8').then((result) => {
        return result
    }).catch((err) => {
        tryTimes++
        console.log('re');
        if (tryTimes < 10) {
            checkTimeout = setTimeout(() => { checkM3u8() }, 400);
        } else {
            return false
        }
    })
}


app.use('/api/localFile', express.json())
app.use('/api/localFile', cookieParser())

//test
// app.use('/test', (req, res) => {
//     readFile(`${settings.tempPath}output${req.path}`).then((result) => {
//         console.log('sent', [req.path]);
//         // console.log(result.toString());
//         res.send(result)
//     }).catch(err => {
//         console.log(err);
//         res.status(404).send('not found')
//     })
// })



//权限验证
app.use('/api/localFile', (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    var SID = req.cookies.SID
    got({
        url: `${settings.qbHost}/api/v2/auth/login`,
        method: 'POST',
        headers: {
            cookie: `SID=${SID}`
        }
    }).then((result) => {
        result = result.body
        if (result == 'Ok.') {
            next()
        } else if (settings.share && req.path.includes('/output/')) {
            // console.log('goooooo');
            next()
        } else {
            throw new Error('无权限，请重新登录')
        }
    }).catch((err) => {
        res.status(403).send(err.message)
        return
    });
})

//连接状态测试
app.use('/api/localFile/checkFileServer', (req, res) => {
    res.send(settings)
})

//更新配置项
app.use('/api/localFile/changeFileServerSettings', (req, res) => {
    let data = req.body
    let clean = ['burnSubtitle',
        'forceTranscode',
        'encode', 'platform', 'customCommand']
    data.forEach(val => {
        if (settings[val.name] != val.value) {
            settings[val.name] = val.value
            if (clean.includes(val.name) && FFmpegProcess) {
                console.log('kill');
                kill(FFmpegProcess.pid, 'SIGKILL')
                transState = 'false'
            }
        }
    })
    writeFile('./settings.json', JSON.stringify(settings, '', '\t')).then((result) => {
        console.log('已更新配置');
        console.log(settings);
        res.send('Ok.')
    }).catch((err) => {
        console.log(err);
        res.send('Fails.')
    });
})

//hls请求处理
app.use('/api/localFile/output', (req, res, next) => {
    // res.header("Access-Control-Allow-Origin", "*");
    console.log(req.path);
    if (req.path == '/index.m3u8') {
        checkM3u8().then((result) => {
            // console.log('sent', [req.path]);
            res.send(result)
        }).catch(err => {
            console.log(err);
            res.status(404).send('not found')
        })
    } else {
        readFile(`${settings.tempPath}output${req.path}`).then((result) => {
            // console.log('sent', [req.path]);
            res.send(result)
        }).catch(err => {
            console.log(err);
            res.status(404).send('not found')
        })
    }
})

//hls缓存清理
app.use('/api/localFile/clearVideoTemp', (req, res, next) => {
    setTimeout(() => {
        rimraf(`${settings.tempPath}output`, (err) => {
            console.log(err);
            mkdir(`${settings.tempPath}output`).then((result) => {
                console.log('clear');
                res.send('Ok.')
            }).catch((err) => {
                console.log(err);
            })
        })
    }, 2000);
})

// app.use('/api/localFile/killFFmpeg', (req, res, next) => {
//     if (FFmpegProcess) {
//         // spawn('taskkill',['-PID',FFmpegProcess.pid,'-F'])
//         kill(FFmpegProcess.pid, 'SIGKILL')
//         console.log(FFmpegProcess);
//     }
//     res.send('Ok.')
// })


//hls地址生成
app.use('/api/localFile/videoSrc', (req, res, next) => {
    const path = req.headers.referer.split(':')
    // console.log('src', fileRootPath);
    res.send(`${path[0]}:${path[1]}:${settings.serverPort}/api/localFile/output/index.m3u8`)
})
// readdir().then((result) => {
//     console.log(result)
// }).catch((err) => {
//     console.log(err)

// });
//文件请求处理
app.use('/api/localFile', async (req, res, next) => {

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
        var filePath = `${body.rootPath}\\${body.name}`
    }
    try {
        if (fileType == 'text') {
            readFile(`${filePath}`).then((result) => {
                res.send(result)
            })
        } else if (fileType == 'video') {
            console.log(transState);
            readFile(`${filePath}`)
                .catch(err => {
                    throw new Error('文件错误')
                })
                .then((result) => {
                    console.log(`find ${filePath}`);
                    if ((temp == filePath) && (transState != 'false')) {
                        return checkM3u8().then(() => {
                            res.send('Ok.')
                            console.log('exist');
                            return 'exist'
                        }).catch((err) => {
                            return
                        })
                    } else {
                        temp = filePath
                        return _rimrafs(`${settings.tempPath}output`)
                            .catch(err => console.log(err))
                            .then(() => mkdir(`${settings.tempPath}output`))
                            .then(() => console.log('clear'))
                            .catch(err => console.log(err))
                    }
                })
                .then((result) => {
                    if (result == 'exist') {
                        return
                    } else {
                        console.log('make');
                        if (FFmpegProcess) {
                            kill(FFmpegProcess.pid, 'SIGKILL')
                            // console.log(FFmpegProcess);
                        }
                        subtitle = []
                        let nameReg = '/' + body.label
                        let specialCharacter = ['\\', '$', '(', ')', '*', '+', '.', '[', '?', '^', '{', '|']
                        let subType = ['ass', 'ssa', 'srt', 'vtt']
                        specialCharacter.map(v => {
                            let reg = new RegExp('\\' + v, 'gim')
                            nameReg = nameReg.replace(reg, '\\' + v)
                        })
                        let reg = new RegExp(nameReg)
                        fileRootPath = filePath.replace(reg, '').replace(/\\/g, '/')
                        // console.log('rrrrrrrrr', fileRootPath);
                        readdir(fileRootPath).catch((err) => {
                            console.log(err)
                        }).then((arr) => {
                            arr.forEach(v => {
                                if (v.includes(body.label.replace(new RegExp('.' + suffix), ''))) {
                                    if (subType.includes(v.split('.').slice(-1)[0])) {
                                        subtitle.push(`${fileRootPath}/${v}`)
                                    }
                                }
                            })
                        }).then((result) => {
                            transState = 'doing'
                            return new Promise((r, j) => {
                                if (subtitle[0]) {
                                    var subSuffix = subtitle[0].split('.').slice(-1)[0]
                                    var subtitlePath = 'in.' + subSuffix
                                    fs.copyFileSync(subtitle[0], subtitlePath)
                                }
                                var params = []
                                let encoder = encoders[settings.encode][settings.platform]
                                let command = settings.customCommand.split('\n')
                                if (command[0].length > 1) {
                                    params = command
                                } else {
                                    if (subtitle[0]) {
                                        params.push(...[
                                            ` -c:v ${encoder}`,
                                            `-vf subtitles=${subtitlePath}`,
                                        ])
                                        if (settings.encode == 'h265') {
                                            params.push(...[
                                                `-tag:v hvc1`,
                                                '-hls_segment_type fmp4',
                                            ])
                                        } else {
                                            params.push(...[
                                                `-pix_fmt yuv420p`,
                                                '-hls_segment_type mpegts',
                                            ])
                                        }
                                    } else if (settings.forceTranscode) {
                                        params.push(...[
                                            ` -c:v ${encoder}`,
                                        ])
                                        if (settings.encode == 'h265') {
                                            params.push(...[
                                                `-tag:v hvc1`,
                                                '-hls_segment_type fmp4',
                                            ])
                                        } else {
                                            params.push(...[
                                                `-pix_fmt yuv420p`,
                                                '-hls_segment_type mpegts',
                                            ])
                                        }
                                    } else {
                                        params.push('-c copy')
                                    }
                                    params.push(...[
                                        '-c:a:0 aac',
                                        `-b:v ${settings.bitrate}M`,
                                        `-bufsize ${settings.bitrate * 2}M`,
                                        `-maxrate ${settings.bitrate}M`
                                        //         '-pix_fmt yuv420p',
                                    ])
                                }
                                let ffmpegCommand = [
                                    '-ss 0',
                                    `-i "${filePath}"`,
                                    ...params,
                                    '-f hls',
                                    '-hls_time 10',
                                    '-hls_playlist_type event',
                                    `${settings.tempPath}output/index.m3u8`,
                                    '-hide_banner']
                                console.log([ffmpegCommand.join(' ')]);
                                FFmpegProcess = spawn('ffmpeg', ffmpegCommand, {
                                    shell: true,
                                    // stdio: 'inherit'
                                })
                                checkM3u8().then(() => {
                                    res.send('Ok.')
                                }).catch((err) => {
                                    console.log(err);
                                });
                                FFmpegProcess.on('error', (err) => {
                                    console.log(err);
                                    j(err);
                                });
                                FFmpegProcess.on('close', (code) => {
                                    if (code == 0) {
                                        transState = 'true'
                                    } else {
                                        transState = 'false'
                                    }
                                    console.log(`ffmpeg process close all stdio with code ${code}`);
                                    r(code);
                                });
                                FFmpegProcess.on('exit', (code) => {
                                    console.log(`ffmpeg process exited with code ${code}`);
                                });
                            })
                        })
                    }
                })
        } else if (fileType == 'picture') {
            readFile(`${filePath}`).then((result) => {
                res.send(result)
            })
        } else if (fileType == 'audio') {
            readFile(`${filePath}`).then((result) => {
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


Promise.all([readFile(settings.cert, 'utf8'), readFile(settings.key, 'utf8')])
    .then((result) => {
        // console.log(result[0]);
        proxySettings.ssl = {
            cert: result[0],
            key: result[1]
        }
        proxySettings.secure = true
        return 'https'
    }).catch((err) => {
        return 'http'
    }).then(sec => {
        // console.log(proxySettings);
        app.use("/", proxy(proxySettings));
        if (sec == 'http') {
            app.listen(settings.serverPort);
            console.log(`HTTP Server is running on: http://localhost:${settings.serverPort}`);
        } else if (sec == 'https') {
            const httpsServer = https.createServer(proxySettings.ssl, app);
            httpsServer.listen(settings.serverPort, () => {
                console.log(`HTTPS Server is running on: https://localhost:${settings.serverPort}`);
            });
        }
    })

export default app