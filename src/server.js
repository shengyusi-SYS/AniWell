// import got from 'got';
// import fs from 'fs';
// import cookieParser from 'cookie-parser';
// import { promisify } from 'util';
// import { spawn } from 'child_process';
// import express from 'express';
// import proxyMw from 'http-proxy-middleware';
// import rimraf from 'rimraf';
// import https from 'https';
// import kill from 'tree-kill';
// import Ffmpeg from 'fluent-ffmpeg';
// import path from 'path';
var got = () => Promise.reject()
// const got = require('got');
import('got').then((result) => {
    got = result.default
})
const fs = require('fs');
const cookieParser = require('cookie-parser');
const { promisify } = require('util');
const { spawn } = require('child_process');
const express = require('express');
const proxyMw = require('http-proxy-middleware');
const rimraf = require('rimraf');
const https = require('https');
const kill = require('tree-kill');
const Ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const FormData = require('form-data')
const merger = require('./utils/merger');
const url = require("url");
const CookieJar = require('tough-cookie').CookieJar;
const cookieJar = new CookieJar()
const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const readdir = promisify(fs.readdir)
const rmdir = promisify(fs.rmdir)
const mkdir = promisify(fs.mkdir)
const stat = promisify(fs.stat)
const proxy = proxyMw.createProxyMiddleware;
const app = express();
var io
//配置
var settings = {
    qbHost: 'http://localhost:8008',
    serverPort: 9009,
    tempPath: './',
    cert: './ssl/domain.pem',
    key: './ssl/domain.key',
    secure: false,
    // burnSubtitle: true,
    // forceTranscode: false,
    share: false,
    ffmpegPath: '',
    platform: 'nvidia',
    encode: 'h264',
    bitrate: 5,
    customInputCommand: '',
    customOutputCommand: '',
    dandanplayPath: ''
}

try {
    settings = Object.assign(settings, JSON.parse(fs.readFileSync('./settings.json')))
    if (settings.ffmpegPath) {
        // settings.ffmpegPath = path.resolve(path.parse(settings.ffmpegPath).root, `"${path.parse(settings.ffmpegPath).dir.replace(path.parse(settings.ffmpegPath).root,'')}"`,path.basename(settings.ffmpegPath))
        Ffmpeg.setFfmpegPath(path.resolve(settings.ffmpegPath, 'ffmpeg.exe'))
        Ffmpeg.setFfprobePath(path.resolve(settings.ffmpegPath, 'ffprobe.exe'))
    }
    // console.log(__dirname);
    console.log('已加载本地配置', settings);
} catch (error) {
    fs.writeFileSync('./settings.json', JSON.stringify(settings, '', '\t'))
    console.log('已写入默认配置');
}
// console.log(settings);
//转发配置
var proxySettings = {
    target: settings.qbHost,
    changeOrigin: false,
    secure: settings.secure,
    ssl: {
    }
}
try {
    proxySettings.ssl.cert = fs.readFileSync(settings.cert, 'utf8')
    proxySettings.ssl.key = fs.readFileSync(settings.key, 'utf8')
} catch (error) {
    // console.log(error);
}


// const fileCookie = {}
// let qbCookie = { SID: undefined }
var SID
var hlsTemp = ''
var tryTimes = 0
var fileRootPath = ''
var subtitleList = []
var checkTimeout
var FFmpegProcess = {}
var currentProcess = null
var writingSegmentId = null
var processList = []
var transState = 'false'
var videoIndex = {}
var lastTargetId
var dandanplayLibrary = []
var libraryIndex = {}
var maindataCache = {}
// console.log(dandanplayLibrary);

const encoders = {
    h265: {
        nvidia: 'hevc_nvenc',
        intel: 'hevc_qsv',
        amd: 'hevc_amf',
        // other: 'libx265',
    },
    h264: {
        nvidia: 'h264_nvenc',
        intel: 'h264_qsv',
        amd: 'h264_amf',
        // other: 'libx264',
    }
}
const decoders = {
    nvidia: '_cuvid',
    intel: '_qsv',
    // amd:''
}
const hwaccels = {
    nvidia: 'cuda'
    , intel: 'qsv'
    , other: 'd3d11va'
}
// const specialCharacter = ['\\', '$', '(', ')', '*', '+', '.', '[', '?', '^', '{', '|']
try {
    libraryIndex = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'libraryIndex.json')))
    console.log('已加载匹配数据');
} catch (error) {
}
function updateLibrary(params) {
    if (settings.dandanplayPath) {
        dandanplayLibrary = JSON.parse(fs.readFileSync(path.resolve(settings.dandanplayPath, 'library.json'))).VideoFiles
        console.log('已关联弹弹Play');
        libraryIndex.animePathIndex = {}
        dandanplayLibrary.forEach(v => {
            let tempPath = path.resolve(v.Path)
            libraryIndex[tempPath] = v
            libraryIndex[tempPath].imgPath = path.resolve(settings.dandanplayPath, 'Cache', 'LibraryImage', `${v.Hash}.jpg`)
            if (v.AnimeId != 0 || !libraryIndex.animePathIndex[path.parse(tempPath).dir]) {
                libraryIndex.animePathIndex[path.parse(tempPath).dir] = {
                    AnimeId: v.AnimeId,
                    AnimeTitle: v.AnimeTitle
                }
            }
        })
        return got({
            url: `${settings.qbHost}/api/v2/sync/maindata`,
            method: 'get',
            cookieJar
        }).then((result) => {
            let torrents = JSON.parse(result.body).torrents
            libraryIndex.animeIndex = {}
            for (const animePath in libraryIndex.animePathIndex) {
                for (const hash in torrents) {
                    if (path.resolve(animePath).includes(path.resolve(torrents[hash].content_path))) {
                        if (!libraryIndex.animeIndex[hash]) {
                            libraryIndex.animeIndex[hash] = libraryIndex.animePathIndex[animePath]
                        }
                    }
                }
            }
            let searchQueue = []
            for (const hash in libraryIndex.animeIndex) {
                let task = got({
                    url: `https://api.dandanplay.net/api/v2/search/anime?keyword=${encodeURIComponent(libraryIndex.animeIndex[hash].AnimeTitle)}`
                    , method: 'get'
                }).then((result) => {
                    result = JSON.parse(result.body)
                    if (result.success) {
                        result.animes.forEach(v => {
                            if (v.animeId == libraryIndex.animeIndex[hash].AnimeId) {
                                // console.log(v);
                                libraryIndex.animeIndex[hash] = v
                            }
                        })
                    }
                    return Promise.resolve()
                }).catch((err) => {
                    console.log(err);
                    return Promise.resolve()
                });
                searchQueue.push(task)
            }
            return Promise.all(searchQueue).then((result) => {
                return writeFile(path.resolve(__dirname, 'libraryIndex.json'), JSON.stringify(libraryIndex, '', '\t'))
            }).then((result) => {
                console.log('已匹配');
            }).catch((err) => {
                console.log(err);
            })
        })
    }
}


//------------------------------------------------//
function handleVideoRequest(req, res, filePath) {
    // console.log(hlsTemp, filePath);
    let subtitlePath
    if (hlsTemp == filePath) {
        console.log('exist');
        res.send('Ok.')
    } else return stat(`${filePath}`)
        .catch(err => {
            console.log('文件错误' + filePath);
            // throw new Error('文件错误' + filePath)
        }).then((result) => {
            currentProcess = null
            return killCurrentProcess()
        }).then((result) => {
            processList = []
            writingSegmentId = null
            lastTargetId = null
            videoIndex = {}
            let videoInfo
            getVideoInfo(filePath).catch((err) => {
                console.log(err);
                res.status(404).send('文件错误')
                return Promise.reject()
            }).then((info) => {
                videoInfo = info
                return handleSubtitle(filePath, videoInfo)
            }).then((result) => {
                subtitlePath = result
                // console.log('------------------~~~~~~~~~~~~~~~~~~~~~',result[0]);
                return generateM3U8(videoInfo)
            }).then(() => {
                hlsTemp = filePath
                return generateTsQueue(videoInfo, subtitlePath)
            }).then((queue) => {
                if (FFmpegProcess.index0.state = 'init') {
                    FFmpegProcess.index0.state = 'doing'
                    FFmpegProcess.index0.process()
                }
                return writeFile(`${settings.tempPath}/videoIndex.json`, JSON.stringify(videoIndex, '', '\t')).then((result) => {
                    // console.log(videoIndex);
                    res.send("Ok.")
                }).catch((err) => {
                    console.log(err);
                });
            })
        })
}



function getVideoInfo(filePath) {
    return new Promise((r, j) => {
        Ffmpeg.ffprobe(filePath, function (err, metadata) {
            console.log(metadata);
            if (err) {
                return j(err)
            }
            let {
                bit_rate,
                duration
            } = { ...metadata.format }
            let vidoeStream = metadata.streams.find((v) => {
                return v.codec_type == 'video'
            })
            let subtitleStream = metadata.streams.find((v) => {
                return v.codec_type == 'subtitle'
            })
            let {
                codec_name,
                width,
                height,
                pix_fmt,
                r_frame_rate
            } = { ...vidoeStream }
            let videoInfo = {
                codec: codec_name,
                bitRate: bit_rate,
                duration,
                width,
                height,
                frame_rate: r_frame_rate.split('/')[0] / 1000,
                pix_fmt,
                subtitleStream
            }
            // console.log(videoInfo);
            return r(videoInfo)
        })
    })
}



function generateM3U8(videoInfo) {
    let { duration } = videoInfo
    let segmentLength = 3
    let segmentDuration = Number((segmentLength * 1001 / 1000).toFixed(3))
    let duration_ts = segmentDuration * 90000
    let lastSegmentDuration = (duration % segmentLength * 1001 / 1000).toFixed(3)
    let segmentNum = parseInt(duration / 1.001 / segmentLength)
    // let { timeList, header } = { ...example.listExample }
    // let { ts0, ts1 } = { ...example }
    // let startTmp
    let M3U8 = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:${segmentLength}\n#EXT-X-MEDIA-SEQUENCE:${segmentNum}\n#EXT-X-PLAYLIST-TYPE:event\n`
    // if (timeList[0] == timeList[1]) {
    // let segmentDuration = Number(timeList[0])
    // let base_pts = ts0.start_pts
    // let segmentDuration = Number((duration_ts/90000).toFixed(6))

    for (let i = 0, base_pts = 1, start, start_pts, end, endLoop = false; !endLoop; i++) {
        start_pts = base_pts + (duration_ts + 1) * i
        start = Number(((start_pts - base_pts) / 90000).toFixed(6))
        if (i < segmentNum) {
            end = Number(((start_pts - base_pts + duration_ts) / 90000).toFixed(6))
            M3U8 += `#EXTINF:${segmentDuration}\nindex${i}.ts\n`
        } else {
            end = duration
            M3U8 += `#EXTINF:${lastSegmentDuration}\nindex${i}.ts\n#EXT-X-ENDLIST`
            endLoop = true
        }
        videoIndex[`index${i}`] = { start_pts, duration_ts, start, end, segmentDuration, id: i }
    }
    return new Promise((r, j) => {
        rimraf(`${settings.tempPath}output`, (err) => {
            console.log(err);
            r()
        })
    }).then((result) => {
        return mkdir(`${settings.tempPath}output`)
    }).then((result) => {
        console.log('clear');
        return writeFile(settings.tempPath + 'output/index.m3u8', M3U8).catch(err => { console.log(err); })
    }).catch((err) => {
        console.log(err);
    })
}


function generateTsQueue(videoInfo, subtitlePath) {
    let filePath = hlsTemp
    let lastWriteId = -1
    for (const segment in videoIndex) {
        let { inputParams, outputParams } = generateFfmpegCommand(videoInfo, subtitlePath, segment)
        let params = [
            ...inputParams,
            `-i "${filePath}"`,
            ...outputParams,
            `${settings.tempPath}output/tempList/${segment}.m3u8`
        ]
        // if (segment == 'index0') {
        // }
        let process = async () => {
            await killCurrentProcess(segment)
            if ((Number(segment.replace('index', '')) == Object.keys(videoIndex).length - 1) && FFmpegProcess[segment].state == 'done') {
                return
            }
            console.log(path.resolve(settings.ffmpegPath, 'ffmpeg.exe'));
            let ffmpeg = spawn(settings.ffmpegPath ? `"${path.resolve(settings.ffmpegPath, 'ffmpeg.exe')}"` : 'ffmpeg', params, {
                shell: true,
                //    stdio: 'inherit'
            })
            processList.push(ffmpeg)
            ffmpeg.queue = []
            ffmpeg.id = Number(segment.replace('index', ''))
            console.log('start------------------------' + segment);
            console.log([params.join(' ')]);
            // function checkSegment(segment) {
            //     let checkTimes = 0
            //     function check(segment) {
            //         return new Promise((r, j) => {
            //             stat(path.resolve(settings.tempPath, 'output', `${segment}.ts`)).then((result) => {
            //                 FFmpegProcess[segment].state = 'done'
            //                 ffmpeg.queue.push(segment)
            //                 console.log(segment, 'done');
            //                 checkTimes = 0
            //                 r(true)
            //             }).catch((err) => {
            //                 if (checkTimes < 10) {
            //                     setTimeout(() => {
            //                         console.log('cccccccccccccckkkkkkkkk');
            //                         checkTimes++
            //                         check(segment)
            //                     }, 500)
            //                 } else {
            //                     j(false)
            //                 }
            //             })

            //         }).catch(err=>console.log(err))
            //     }
            //     return check()
            // }
            ffmpeg.stderr.on('data', async function (stderrLine) {
                currentProcess = ffmpeg
                stderrLine = stderrLine.toString()
                // console.log(`${stderrLine} ${Boolean(stderrLine.match(/Opening.*for writing/))} ${stderrLine.search(/m3u8/) == -1}`);
                if (/Opening.*for writing/.test(stderrLine) && !/m3u8/i.test(stderrLine)) {
                    let writingSegment = path.parse(path.parse(/'.*'/.exec(stderrLine)[0]).name).name
                    writingSegmentId = Number(writingSegment.replace('index', ''))
                    let nextSegment = `index${writingSegmentId + 1}`

                    console.log(`${stderrLine}-------outtttttt`);

                    // await checkSegment(writingSegment)

                    if (lastWriteId != writingSegmentId - 1 && lastWriteId >= ffmpeg.id) {
                        tempLostSegment = `index${lastWriteId}`
                        console.log('lossssssssssssssssssssst', lastWriteId);
                        stat(path.resolve(settings.tempPath, 'output', `${tempLostSegment}.ts`)).then((result) => {
                            FFmpegProcess[tempLostSegment].state = 'done'
                            console.log('reloaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaad', result, tempLostSegment, FFmpegProcess[tempLostSegment]);
                        }).catch((err) => {
                            console.log('errrrrrrrrrrrrr', FFmpegProcess[tempLostSegment], err);
                        });
                        // await checkSegment(`index${lastWriteId}`)
                    }
                    writingSegmentId = Number(writingSegment.replace('index', ''))
                    // console.log(writingSegmentId);
                    if (writingSegmentId != ffmpeg.id) {
                        let completedSegment = `index${writingSegmentId - 1 >= 0 ? writingSegmentId - 1 : 0}`
                        ffmpeg.queue.push(completedSegment)
                        FFmpegProcess[completedSegment].state = 'done'
                        console.log(completedSegment, 'done');
                    }
                    lastWriteId = writingSegmentId

                    if (writingSegmentId == Object.keys(videoIndex).length - 1) {
                        console.log('end~~~~~~~~~~~~~~~~~~', writingSegmentId);
                        FFmpegProcess[writingSegment].state = 'done'
                        return
                    }
                    if (FFmpegProcess[writingSegment].state == 'done') {
                        await killCurrentProcess()
                        console.log('breeeeeeeeeeeeeeeeeeak', writingSegment);
                        let nextProcessId = writingSegmentId + 1
                        if (FFmpegProcess[`index${nextProcessId}`]) {
                            while (FFmpegProcess[`index${nextProcessId}`].state == 'done') {
                                if (nextProcessId >= Object.keys(videoIndex).length - 1) {
                                    console.log('end-------------------', nextProcessId);
                                    break
                                } else { nextProcessId++ }
                            }
                            console.log('coooooooooooooooooooon', nextProcessId);
                            FFmpegProcess[`index${nextProcessId}`].process()
                        } else {
                            console.log('end-------------------', nextProcessId);
                        }
                    }
                }
            })
            return ffmpeg
        }

        FFmpegProcess[segment] = {
            process,
            state: 'init'
        }
        // console.log('generate'+process);
    }
    return FFmpegProcess
}

function killCurrentProcess(start) {
    console.log('dddddddddddddddd');
    return new Promise((r, j) => {
        let tempProcessList = JSON.parse(JSON.stringify(processList))
        if (currentProcess) {
            currentProcess.on('close', () => {
                console.log('ccccccccccccccc');
                return r()
            })
            currentProcess.on('exit', () => {
                console.log('eeeeeeeeeeeeeeeee');
                return r()
            })
            currentProcess.on('error', (err) => {
                console.log('rrrrrrrrrrrrrrrrrr');
                return j(err)
            })
            kill(currentProcess.pid, 'SIGKILL')
        }
        setTimeout(() => {
            tempProcessList.forEach(v => {
                kill(v.pid, 'SIGKILL')
            })
            console.log('kkkkkkk~~~~~~~~~');
            return r()
        }, 500);
    }).then((result) => {
        return result
    }).catch((err) => {
        console.log(err);
        return
    })
}

function handleSubtitle(filePath, videoInfo) {
    let subType = ['.ass', '.ssa', '.srt', '.vtt']
    // if (videoInfo.subtitleStream) {

    // } else {
    let videoName = path.parse(filePath).name
    let suffix = path.extname(filePath)
    subtitleList = []
    fileRootPath = path.dirname(filePath)
    return readdir(fileRootPath).catch((err) => {
        console.log(err)
    }).then((dir) => {
        dir.forEach(v => {
            if (v.includes(videoName) && subType.includes(path.extname(v))) {
                subtitleList.push(path.join(fileRootPath, v))

            }
        })
        if (subtitleList[0]) {
            fs.copyFileSync(subtitleList[0], 'in.ass')
            return 'in.ass'
        } else if (videoInfo.subtitleStream) {
            return new Promise((r, j) => {
                if (subType.includes('.' + videoInfo.subtitleStream.codec_name)) {
                    // console.log('.'+videoInfo.subtitleStream.codec_name);
                    let ffmpeg = spawn(settings.ffmpegPath ? `"${path.resolve(settings.ffmpegPath, 'ffmpeg.exe')}"` : 'ffmpeg', [
                        `-i "${filePath}"`,
                        '-y',
                        `in.ass`,
                    ], {
                        shell: true,
                        //    stdio: 'inherit'
                    })
                    ffmpeg.on('close', function (stderrLine) {
                        r('in.ass')
                    })
                } else {
                    r(null)
                }
            })
        }
        return null
    })
    // }

}

function generateFfmpegCommand(videoInfo, subtitlePath, segment) {
    let inputParams = [
    ]
    let outputParams = [
    ]


    let decoder = ''
    if (decoders.hasOwnProperty(settings.platform)) {
        if (!(videoInfo.codec == 'h264' && /yuv\d{3}p\d{0,2}/.exec(videoInfo.pix_fmt)[0].replace(/yuv\d{3}p/, '') >= 10)) {
            decoder = `-c:v ${videoInfo.codec}${decoders[settings.platform]}`
        }
    } else if (hwaccels.hasOwnProperty(settings.platform)) {

    }

    let encoder = `-c:v ${encoders[settings.encode][settings.platform]}`
    // if (settings.encode == 'h265'&& videoInfo.codec=='hevc') {
    //     encoder = '-c:v copy'
    // }
    let pix_fmt = ''
    if (settings.encode == 'h264') {
        pix_fmt = `-pix_fmt yuv420p`
    }
    let tag = ''
    if (settings.encode == 'h265') {
        tag = '-tag:v hvc1'
    }

    let copyts = '-copyts'
    let sub = []
    if (subtitlePath) {
        sub = [
            '-sn',
            `-vf subtitles=${subtitlePath}`,
            // `-c:s ass`,
        ]
    }

    let bitrate = [
        `-b:v ${settings.bitrate}M`,
        `-bufsize ${settings.bitrate * 2}M`,
        `-maxrate ${settings.bitrate}M`
    ]
    let ss = `-ss ${videoIndex[segment].start}`
    let audio = [
        `-c:a aac`,
        '-ac 2 ',
        '-ab 384000'
    ]
    let segmentParams = [
        '-avoid_negative_ts disabled',
        `-g ${videoInfo.frame_rate * 3}`,
        `-keyint_min:v:0 ${videoInfo.frame_rate * 3}`,
    ]
    let customInputCommand = []
    let customOutputCommand = []
    customInputCommand = settings.customInputCommand.split('\n')
    customOutputCommand = settings.customOutputCommand.split('\n')

    if (customInputCommand[0].length > 0) {
        decoder = ''
        console.log('~~~~~~~~' + customInputCommand);
    }
    if (customOutputCommand[0].length > 0) {
        encoder = ''
        pix_fmt = ''
        bitrate = []
        audio = []
        sub = []
        console.log('~~~~~~~~' + customOutputCommand);
    }

    let hlsParams = [
        '-f hls'
        // , '-max_delay 5000000'
        , '-hls_time 3'
        , '-hls_segment_type mpegts'
        , '-hls_flags temp_file'
        , `-start_number ${videoIndex[segment].id}`
        , `-hls_segment_filename "${settings.tempPath}output/index%d.ts"`
        , '-hls_playlist_type event'
        , '-hls_list_size 0'
    ]

    let inTest = [
        '-extra_hw_frames 3',
        '-autorotate 0'
    ]

    let outTest = [
        '-map_metadata -1',
        '-map_chapters -1',
        '-threads 0',
        '-start_at_zero',
        // '-vsync -1',
        '-max_muxing_queue_size 2048',
        // '-sc_threshold:v:0 0',
        '-profile:v:0 high'
    ]




    inputParams = [
        ss,
        decoder,
        // ...inTest,
        ...customInputCommand,
    ]
    let inTemp = []
    inputParams.forEach((v, i, a) => {
        if (v.length != 0) {
            inTemp.push(v)
        }
    })
    inputParams = inTemp

    outputParams = [
        // ...outTest,
        encoder,
        pix_fmt,
        tag,
        copyts,
        ...sub,
        ...audio,
        ...segmentParams,
        ...bitrate,
        ...customOutputCommand,
        ...hlsParams,
        '-hide_banner',
        '-y'
    ]
    let outTemp = []
    outputParams.forEach((v, i, a) => {
        if (v.length != 0) {
            outTemp.push(v)
        }
    })
    outputParams = outTemp

    let ffmpegCommand
    ffmpegCommand = {
        inputParams,
        outputParams
    }
    // console.log(ffmpegCommand);
    return ffmpegCommand
}





app.use(express.json())
app.use(cookieParser())

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

app.use('/', (req, res, next) => {
    // console.log(req.headers.cookie,req.cookies);
    if (req.cookies) {
        SID = req.cookies.SID
        // console.log(SID);
        cookieJar.setCookieSync(`SID=${req.cookies.SID}`, settings.qbHost)
    }
    if (settings.dandanplayPath && !libraryIndex.animePathIndex) {
        updateLibrary().then(() => {
            next()
        })
    } else next()
})

//权限验证
app.use('/api/localFile', (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    // console.log(req.query.cookie);
    if (req.query.cookie) {
        cookieJar.setCookieSync(`SID=${req.query.cookie}`, settings.qbHost)
    }
    // console.log('check',cookieJar);
    got({
        url: `${settings.qbHost}/api/v2/auth/login`,
        method: 'POST',
        cookieJar
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

app.use('/api/localFile/updateLibrary', (req, res) => {
    updateLibrary()
    res.send('Ok.')
})

//更新配置项
app.use('/api/localFile/changeFileServerSettings', async (req, res) => {
    let data = req.body
    let clean = ['burnSubtitle',
        'forceTranscode',
        'encode', 'platform', 'customCommand']
    data.forEach(val => {
        if (settings[val.name] != val.value) {
            settings[val.name] = val.value
            if (clean.includes(val.name) && currentProcess) {
                hlsTemp = null
            }
        }
    })
    currentProcess = null
    await killCurrentProcess()
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
    res.header("Access-Control-Allow-Origin", "*");
    let targetSegment = path.parse(req.path).name
    console.log('-------------------->', targetSegment);
    if (req.path == '/index.m3u8') {
        res.header('Content-Type', 'application/x-mpegURL')
        res.sendFile(path.resolve(`${settings.tempPath}output/index.m3u8`))
        return
    } else {
        res.header('Content-Type', 'video/m2pt')
        console.log(targetSegment, '-------', FFmpegProcess[targetSegment].state);
        let targetSegmentId = Number(targetSegment.replace('index', ''))
        let beforeSegment = `index${targetSegmentId - 1 >= 0 ? targetSegmentId - 1 : 0}`
        let endId = Object.keys(videoIndex).length - 1
        if (targetSegmentId < Number(lastTargetId)) {
            if (FFmpegProcess[targetSegment].state != 'done') {
                console.log('backkkkkkkkkkkkkkkkkkkkkkk', targetSegmentId, lastTargetId);
                FFmpegProcess[targetSegment].process()
            } else {
                if (currentProcess.id <= targetSegmentId) {
                    console.log('connnnnnnnnnnnnnnnnnnnntinue', targetSegment);
                } else {
                    console.log('baaaaaaaaaackeeeeeeeeeek', targetSegment);
                    let nextProcessId = Number(targetSegment.replace('index', ''))
                    // console.log(FFmpegProcess[`index${nextProcessId}`]);
                    while (FFmpegProcess[`index${nextProcessId}`].state == 'done') {
                        if (nextProcessId < endId) {
                            nextProcessId++

                        } else { break }
                        console.log(nextProcessId);
                    }
                    if (nextProcessId > endId) {
                        console.log('eeeeeeeeeeennnnnnnnnnnndddddddd', nextProcessId);
                    } else {
                        console.log('baccccccccckooooooooooooooooooon', nextProcessId);
                        FFmpegProcess[`index${nextProcessId}`].process()
                    }
                }
            }
        } else if (targetSegmentId > Number(lastTargetId) + 1) {
            if (FFmpegProcess[targetSegment].state != 'done') {
                console.log('juuuuuuuuuuuuuuuuuuuuuuuuump', targetSegment);
                FFmpegProcess[targetSegment].process()
            } else {
                if (currentProcess.id <= targetSegmentId) {
                    console.log('seeeeeeeeeeeeeeeeeeeeeeeeeek', targetSegment);
                } else {
                    console.log('juuuuuuuunnnnnnpcccccccheck', targetSegment);
                    // FFmpegProcess[targetSegment].process()
                    let nextProcessId = Number(targetSegment.replace('index', ''))
                    while (FFmpegProcess[`index${nextProcessId}`].state == 'done') {
                        if (nextProcessId < endId) {
                            nextProcessId++
                        } else { break }
                        console.log(nextProcessId);
                    }
                    if (nextProcessId > endId) {
                        console.log('eeeeeeeeeeennnnnnnnnnnndddddddd', nextProcessId);
                    } else {
                        console.log('jumpccccccooooooooooooooon', nextProcessId);
                        FFmpegProcess[`index${nextProcessId}`].process()
                    }
                }
            }
        } else {
            // console.log('teeeeee---------eeeeeest', targetSegmentId, lastTargetId);
        }
        lastTargetId = targetSegmentId
        read()
    }
    function read() {
        tryTimes++
        if (tryTimes >= 10) {
            res.status(404).send('not found')
            tryTimes = 0
            return
        } else {
            return stat(path.resolve(settings.tempPath, 'output', targetSegment + '.ts')).then((result) => {
                if (FFmpegProcess[targetSegment].state == 'done') {
                    console.log('seeeeeeeeeeeeeeeeeeeend', targetSegment);
                    tryTimes = 0
                    res.sendFile(path.resolve(settings.tempPath, 'output', targetSegment + '.ts'))
                    return
                } else {
                    setTimeout(() => {
                        return read()
                    }, 300)
                }
            }).catch((err) => {
                setTimeout(() => {
                    console.log('rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrread', targetSegment, FFmpegProcess[targetSegment]);
                    return read()
                }, 300)

            });
        }
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
    }, 2000)
})

app.use('/api/localFile/stopProcess', async (req, res, next) => {
    await killCurrentProcess()
    res.send('Ok.')
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
    // console.log(req.query);
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
            if (libraryIndex.animeIndex) {
                for (const hash in newData.torrents) {
                    newData.torrents[hash].animeInfo = libraryIndex.animeIndex[hash]
                }
            }
            // console.log(newData);
            maindataCache = {}
            merger(maindataCache, newData)
        } else {
            merger(maindataCache, newData)
        }
        res.send(newData)
    }).catch((err) => {
        console.log(err.message);
    });
});

// app.use("/api/v2/sync/maindata", proxy({
//     ...proxySettings,
//     selfHandleResponse: true,
//     onProxyRes:(proxyRes, req, res)=>{
//         console.log(proxyRes.body);
//         proxyRes.on('data', function (chunk) {
//             console.log(chunk.toString());
//         })
//     }
// }));
app.use("/api/v2/torrents/files", express.urlencoded(), (req, res, next) => {
    // console.log(req.body.hash);
    // console.log(maindataCache);
    let hash = req.body.hash
    let form = new FormData()
    form.append('hash', hash)
    const serverPath = url.parse(req.headers.referer)
    // console.log(req.headers.referer);
    got({
        url: `${settings.qbHost}/api/v2/torrents/files`,
        method: 'post',
        body: form,
        cookieJar
    }).then((result) => {
        let file = JSON.parse(result.body)
        // let tempSID = SID
        // specialCharacter.map(v => {
        //     let reg = new RegExp('\\' + v, 'gim')
        //     tempSID = tempSID.replace(reg, '\\' + v)
        // })
        // console.log(maindataCache.torrents[hash]);
        file.forEach(v => {
            v.fullPath = path.resolve(maindataCache.torrents[hash].save_path, v.name)
            if (libraryIndex[v.fullPath]) {
                v.videoInfo = JSON.parse(JSON.stringify(libraryIndex[v.fullPath]))
                v.videoInfo.imgUrl = `/api/localFile/img.jpg?cookie=${encodeURIComponent(SID)}&type=picture&path=${v.videoInfo.imgPath}`
            }
        })
        // console.log(file);
        res.send(file)
    }).catch((err) => {
        console.log(err);
    });
    // next()
});
// app.use("/api/v2/torrents/files",express.urlencoded());
// app.use("/api/v2/torrents/files", proxy({
//     ...proxySettings,
//     onProxyRes:(proxyRes, req, res)=>{
//         console.log(proxyRes.body,proxyRes.data,proxyRes.params,req.query);
//         // console.log(proxyRes);
//         // res.send(proxyRes)
//         // proxyRes.on('data', function (chunk) {
//         //     console.log(chunk.toString());
//         // })
//     }
// }));

app.use("/", proxy(proxySettings));




if (!(proxySettings.ssl.cert && proxySettings.ssl.key)) {
    app.listen(settings.serverPort);
    console.log(`HTTP Server is running on: http://localhost:${settings.serverPort}`);
} else {
    const httpsServer = https.createServer(proxySettings.ssl, app);
    io = require('socket.io')(httpsServer);
    httpsServer.listen(settings.serverPort, () => {
        console.log(`HTTPS Server is running on: https://localhost:${settings.serverPort}`);
    });
}


// io.on('connection', function (socket) {
//     console.log('cccccon');
//     // 发送数据
//     socket.emit('relogin', {
//         msg: `你好`,
//         code: 200
//     });
//     //接收数据
//     socket.on('login', function (obj) {
//         console.log(obj.username);
//         console.log(obj);
//     });
// });
// export default app
module.exports = app