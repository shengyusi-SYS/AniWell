import got from 'got';
import fs from 'fs';
import MD5 from 'md5.js';
import cookieParser from 'cookie-parser';
import { promisify } from 'util';
import { spawn } from 'child_process';
import express from 'express';
import proxyMw from 'http-proxy-middleware';
import rimraf from 'rimraf';
const _rimrafs = (path) => new Promise((resolve, reject) => {
    rimraf(path, resolve)
})
const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const rmdir = promisify(fs.rmdir)
const mkdir = promisify(fs.mkdir)
const proxy = proxyMw.createProxyMiddleware;
const app = express();
const qbHost = 'http://localhost:8888'
const serverPort = 9000
const fileCookie = {}
let qbCookie = { SID: undefined }
let temp = ''
let tryTimes = 0

function checkM3u8() {
    return readFile('./output/index.m3u8').then((result) => {
        return result
    }).catch((err) => {
        tryTimes++
        console.log('re');
        if (tryTimes < 20) {
            setTimeout(() => { checkM3u8() }, 200);
        } else {
            return false
        }
    })
}

app.use('/api/localFile', express.json())
app.use('/api/localFile', cookieParser())


//hls请求处理
app.use('/output', (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    if (req.path == '/index.m3u8') {
        checkM3u8().then((result) => {
            res.send(result)
        }).catch(err => {
            console.log(err);
            res.status(404).send('not found')
        })
    } else {
        readFile(`./output${req.path}`).then((result) => {
            res.send(result)
        }).catch(err => {
            console.log(err);
            res.status(404).send('not found')
        })
    }
})

//权限验证
app.use('/api/localFile', (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    // console.log(req.query.file , fileCookie[qbCookie.SID]);
    // if (req.cookies.SID) {
    var SID = req.cookies.SID
    qbCookie.SID = SID
    fileCookie[SID] = new MD5().update(SID).digest('hex')
    got({
        url: `${qbHost}/api/v2/auth/login`,
        method: 'POST',
        headers: {
            cookie: `SID=${SID}`
        }
    }).then((result) => {
        result = result.body
        if (result == 'Ok.') {
            res.cookie('file', fileCookie[SID], { maxAge: 1000 * 60 * 10 })
            next()
        } else {
            throw new Error('无权限，请重新登录')
        }
    }).catch((err) => {
        res.status(403).send(err.message)
        return
    });

    // } else if (req.query.file == fileCookie[qbCookie.SID]) {
    //     next()
    // } else {
    //     console.log('no');
    //     res.status(403).send('无权限，请重新登录')
    //     return
    // }
})

//hls缓存清理
app.use('/api/localFile/clearVideoTemp', (req, res, next) => {
    setTimeout(() => {
        rimraf('./output', (err) => {
            console.log(err);
            mkdir('./output').then((result) => {
                console.log('clear');
                res.send('OK.')
            }).catch((err) => {
                console.log(err);
            })
        })
    }, 2000);
})

//hls地址生成
app.use('/api/localFile/videoSrc', (req, res, next) => {
    const path = req.headers.referer.split(':')
    res.send(`${path[0]}:${path[1]}:${serverPort}/output/index.m3u8`)
})

//文件请求处理
app.use('/api/localFile', async (req, res, next) => {

    let formatList = {
        text: ['txt'],
        video: ['mkv', 'mp4', 'flv', 'ts', 'm3u8'],
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
        var filePath = `${body.rootPath}\\${body.name}`.replace(/\\\\/g, '\\')
    }


    try {
        if (fileType == 'text') {
            readFile(`${filePath}`).then((result) => {
                res.send(result)
            })
        } else if (fileType == 'video') {
            if (suffix == 'mkv') {
                throw new Error('暂不支持')
            } else {
                readFile(`${filePath}`)
                    .catch(err => {
                        throw new Error('文件错误')
                    })
                    .then((result) => {
                        console.log(`find ${filePath}`);
                        if (temp == filePath) {
                            return checkM3u8().then(() => {
                                res.send('OK.')
                                return 'exist'
                            }).catch((err) => {
                                return
                            })
                        } else {
                            temp = filePath
                            return _rimrafs('./output')
                                .catch(err => console.log(err))
                                .then(() => mkdir('./output'))
                                .then(()=>console.log('clear'))
                                .catch(err => console.log(err))
                        }
                    })
                    .then((result) => {
                        if (result == 'exist') {
                            return
                        }else{
                            console.log('make');
                            return new Promise((r, j) => {
                                const params = ['-ss', '0', '-i', `"${filePath}"`, '-c', 'copy', '-f', 'hls', '-hls_time', '10', '-hls_segment_type', 'mpegts', '-hls_playlist_type', 'event', './output/index.m3u8', '-hide_banner']
                                const cp = spawn('ffmpeg', params, {
                                    shell: true,
                                    // stdio: 'inherit'
                                })
                                checkM3u8().then(() => {
                                    res.send('OK.')
                                }).catch((err) => {
                                    console.log(err);
                                });
                                cp.on('error', (err) => {
                                    console.log(err);
                                    j(err);
                                });
                                cp.on('close', (code) => {
                                    console.log(`ffmpeg process close all stdio with code ${code}`);
                                    r(code);
                                });
                                cp.on('exit', (code) => {
                                    console.log(`ffmpeg process exited with code ${code}`);
                                });
                            })
                        }
                    })
            }
        } else if (fileType == 'picture') {
            throw new Error('暂不支持')
        } else if (fileType == 'audio') {
            throw new Error('暂不支持')
        } else {
            throw new Error('暂不支持')
        }
        return
    } catch (error) {
        res.send(error.message)
        next()
    }
})

app.use("/", proxy({ target: qbHost, changeOrigin: true }));
app.listen(serverPort);