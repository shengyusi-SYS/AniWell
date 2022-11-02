var got = () => Promise.reject()
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
const url = require("url");
const CookieJar = require('tough-cookie').CookieJar;
const cookieJar = new CookieJar()
// const xml2js = require('xml2js');
// const xmlParser = new xml2js.Parser();
// const logger = require('morgan');
const history = require('connect-history-api-fallback');

const merger = require('./utils/merger');
const dd2nfo = require('./utils/dd2nfo');
const trimPath = require('./utils/trimPath');
const getGPU = require('./utils/getGPU');
const os = require('os');
var osPlatform
var ffmpegSuffix = ''
var gpus
switch (os.type()) {
    case 'Linux':
        osPlatform = 'lin'
        break;
    case 'Darwin':
        osPlatform = 'mac'
        break;
    case 'Windows_NT':
        osPlatform = 'win'
        ffmpegSuffix = '.exe'
        break
}
getGPU(osPlatform).then((result) => {
    gpus = result
}).catch((err) => {
})


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
    qbHost: 'http://localhost:8080',
    serverPort: 9009,
    tempPath: os.tmpdir(),
    ffmpegPath: './',
    dandanplayPath: '',
    cert: './ssl/domain.pem',
    key: './ssl/domain.key',
    secure: false,
    // burnSubtitle: true,
    // forceTranscode: false,
    share: false,
    platform: 'nvidia',
    encode: 'h264',
    bitrate: 5,
    autoBitrate: false,
    advAccel: true,
    customInputCommand: '',
    customOutputCommand: '',
}
const settingsList = {
    qbHost: { type: 'text' },
    tempPath: { type: 'text' },
    cert: { type: 'text' },
    key: { type: 'text' },
    ffmpegPath: { type: 'text' },
    dandanplayPath: { type: 'text' },
    secure: { type: 'switch' },
    burnSubtitle: { type: 'switch' },
    forceTranscode: { type: 'switch' },
    share: { type: 'switch' },
    autoBitrate: { type: 'switch' },
    platform: { type: 'radio' },
    encode: { type: 'radio' },
    customInputCommand: { type: 'textarea' },
    customOutputCommand: { type: 'textarea' },
    serverPort: { type: 'number' },
    bitrate: { type: 'number' },
}
const settingsType = {
    text: [
        "qbHost",
        "tempPath",
        "cert",
        "key",
        "ffmpegPath",
        "dandanplayPath",
    ],
    switch: [
        "secure",
        "burnSubtitle",
        "forceTranscode",
        "share",
        "autoBitrate",
    ],
    radio: ["platform", "encode"],
    textarea: ["customInputCommand", "customOutputCommand"],
    number: ["serverPort", "bitrate"],
}

try {
    fs.accessSync('./settings.json')
    try {
        var newSettings = JSON.parse(fs.readFileSync('./settings.json'))
        if (newSettings) {
            settings = Object.assign(settings, newSettings)
            fs.writeFileSync('./settings.json', JSON.stringify(settings, '', '\t'))
            fs.writeFileSync(path.resolve(settings.tempPath, './settings_backup.json'), JSON.stringify(settings, '', '\t'))
            console.log('已加载本地配置', settings);
        } else {
            newSettings = JSON.parse(fs.readFileSync(path.resolve(settings.tempPath, './settings_backup.json')))
            settings = Object.assign(settings, newSettings)
            console.log('配置项错误，请检查1');
        }
        if (settings.ffmpegPath) {
            // settings.ffmpegPath = path.resolve(path.parse(settings.ffmpegPath).root, `"${path.parse(settings.ffmpegPath).dir.replace(path.parse(settings.ffmpegPath).root, '')}"`, path.basename(settings.ffmpegPath))
            console.log(path.resolve(settings.ffmpegPath, `ffmpeg${ffmpegSuffix}`));
            try {
                Ffmpeg.setFfmpegPath(path.resolve(settings.ffmpegPath, `ffmpeg${ffmpegSuffix}`))
                Ffmpeg.setFfprobePath(path.resolve(settings.ffmpegPath, `ffprobe${ffmpegSuffix}`))
            } catch (error) {
                console.log('ffmpeg路径错误，请检查');
            }
        }
    } catch (error) {
        console.log('配置项错误，请检查2', error);
    }
} catch (error) {
    try {
        const defaultDandanplayPath = path.resolve(os.homedir(), 'AppData', 'Roaming', '弹弹play')
        fs.accessSync(path.resolve(defaultDandanplayPath, 'library.json'))
        console.log('在默认位置找到弹弹play');
        settings.dandanplayPath = defaultDandanplayPath
    } catch (error) {
        console.log('未在默认位置找到弹弹play');
    }
    try {
        let defaultFFmpegPath
        if (osPlatform == 'win') {
            defaultFFmpegPath = path.resolve(__dirname, 'thirdParty', 'win')
            try {
                fs.accessSync(path.resolve(defaultFFmpegPath, 'ffmpeg.exe'))
                settings.ffmpegPath = defaultFFmpegPath
            } catch (error) {
            }
        }
        if (osPlatform == 'lin') {
            defaultFFmpegPath = path.resolve('/usr/share/jellyfin-ffmpeg/')
            try {
                fs.accessSync(defaultFFmpegPath, 'ffmpeg')
                settings.ffmpegPath = defaultFFmpegPath
            } catch (error) {

            }
        }
    } catch (error) {

    }
    // settings.dir = __dirname
    // settings.base = path.resolve('')
    fs.mkdirSync('./temp')
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
var cookieTimer
var checkCookie = true
var hlsTemp = ''
var tryTimes = 0
var fileRootPath = ''
var subtitleList = []
var cleanTimeout
var FFmpegProcess = {}
var currentProcess = null
var writingSegmentId = null
var processList = []
var transState = 'false'
var videoIndex = {}
var lastTargetId
var libraryIndex = { allSeason: {}, episodes: {}, collections: {} }
var maindataCache = {}

const encoders = {
    h265: {
        nvidia: 'hevc_nvenc',
        intel: 'hevc_qsv',
        amd: 'hevc_amf',
    },
    h264: {
        nvidia: 'h264_nvenc',
        intel: 'h264_qsv',
        amd: 'h264_amf',
        vaapi: 'h264_vaapi',
    }
}
const decoders = {
    nvidia: '_cuvid',
    intel: '_qsv',
}
// const specialCharacter = ['\\', '$', '(', ')', '*', '+', '.', '[', '?', '^', '{', '|']
try {
    fs.stat('./temp/backup.json', (err) => { })
    libraryIndex = JSON.parse(fs.readFileSync('./libraryIndex.json'))
    console.log('已加载匹配数据');
} catch (error) {
    console.log(error);
}


//------------------------------------------------//
function handleVideoRequest(req, res, filePath) {
    // console.log(hlsTemp, filePath);
    let subtitleList
    if (hlsTemp == filePath) {
        console.log('exist');
        res.send('Ok.')
    } else return stat(path.resolve(filePath))
        .catch(err => {
            console.log('文件错误' + path.resolve(filePath));
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
                if (!info.codec) {
                    res.status(404).send('文件错误')
                    throw new Error('文件错误')
                }
                videoInfo = info
                return handleSubtitle(filePath, videoInfo).catch(e => console.log(e))
            }).then((result) => {
                subtitleList = result
                // console.log('------------------~~~~~~~~~~~~~~~~~~~~~',result[0]);
                return generateM3U8(videoInfo)
            }).then(() => {
                hlsTemp = filePath
                return generateTsQueue(videoInfo, subtitleList)
            }).then((queue) => {
                if (FFmpegProcess.index0.state = 'init') {
                    FFmpegProcess.index0.state = 'doing'
                    FFmpegProcess.index0.process()
                }
                return writeFile(path.resolve(settings.tempPath, 'output', 'videoIndex.json'), JSON.stringify(videoIndex, '', '\t')).then((result) => {
                    // console.log(videoIndex);
                    res.send("Ok.")
                }).catch((err) => {
                    console.log(err);
                });
            }).catch()
        })
}

function continueFFmpegProgress(params) {
    if (transState == 'stop') {
        transState = 'continue'
        // console.log('>>>>>>>>>>!~~~~~~~~~~~',transState);
        for (const index in FFmpegProcess) {
            if (FFmpegProcess[index].state == 'init') {
                FFmpegProcess[index].process()
                console.log('>>>>>>>>>>!~~~~~~~~~~~', index, FFmpegProcess[index]);
                break
            }
        }
    }
}


function getVideoInfo(filePath) {
    return new Promise((r, j) => {
        Ffmpeg.ffprobe(filePath, function (err, metadata) {
            // console.log(metadata);
            if (err) {
                return j(err)
            }
            console.log(metadata.streams[0]);
            let {
                bit_rate,
                duration
            } = { ...metadata.format }
            let vidoeStream = metadata.streams.find((v) => {
                return v.codec_type == 'video'
            })
            let audioStream = metadata.streams.find((v) => {
                return v.codec_type == 'audio'
            })
            let subtitleStream = []
            metadata.streams.forEach((v) => {
                if (v.codec_type == 'subtitle') {
                    subtitleStream.push(v)
                }
            })
            let {
                codec_name,
                width,
                height,
                pix_fmt,
                r_frame_rate,
                color_space,
                index
            } = { ...vidoeStream }
            let videoInfo = {
                index,
                codec: codec_name,
                audioCodec: audioStream.codec_name,
                bitrate: bit_rate,
                duration,
                width,
                height,
                frame_rate: r_frame_rate.split('/')[0] / 1000,
                pix_fmt,
                colorSpace: color_space,
                subtitleStream
            }
            // console.log(videoInfo);
            return r(videoInfo)
        })
    }).catch(e => console.log(e))
}

function handleSubtitle(filePath, videoInfo) {
    let videoSub = ['pgs']
    let textSub = ['ass', 'ssa', 'srt', 'vtt', 'mks', 'subrip']
    let specialCharacter = [':', `'`, '"', '`', '.', '?', '(', ')', '*', '^', '{', '$', '|']
    let videoName = path.parse(filePath).name
    subtitleList = []
    fileRootPath = path.dirname(filePath)
    return readdir(fileRootPath).catch((err) => {
        console.log(err)
    }).then((dir) => {
        dir.forEach(v => {
            let suffix = path.extname(v).replace('.', '')
            if (v.includes(videoName) && [...videoSub, ...textSub].includes(suffix)) {
                let sub = { path: path.join(fileRootPath, v), source: 'out', codec: suffix }
                if (textSub.includes(suffix)) {
                    sub.type = 'text'
                } else sub.type = 'video'
                try {
                    // let tempSubPath = path.resolve(settings.tempPath,'output',`in.${suffix}`)
                    let tempSubPath = path.resolve('temp',`in.${suffix}`)
                    let end = false
                    specialCharacter.forEach(v => {
                        if (end) {
                            return
                        }
                        console.log('~~~~~~~~~~~~~~~~~~~~~~', v);
                        if (sub.path.includes(v)) {
                            console.log('copy', sub.path);
                            fs.copyFileSync(sub.path, tempSubPath)
                            sub.path = tempSubPath
                            console.log('to', sub.path);
                            end = true
                        }
                    })
                } catch (error) {
                    console.log(error);
                }
                subtitleList.push(sub)
            }
        })
        if (videoInfo.subtitleStream[0]) {
            videoInfo.subtitleStream.forEach((v, i) => {
                let sub = { path: filePath, source: 'in', codec: v.codec_name, details: v, subStreamIndex: i }
                if (textSub.includes(v.codec_name)) {
                    sub.type = 'text'
                } else sub.type = 'video'
                subtitleList.push(sub)
            })
        }
        console.log(subtitleList[0]);
        return subtitleList
    })
}

function generateM3U8(videoInfo) {
    console.log(videoInfo);
    let { duration } = videoInfo
    let segmentLength = 3
    let segmentDuration = Number((segmentLength * 1001 / 1000).toFixed(3))
    // let duration_ts = 268393
    let duration_ts = segmentDuration * 90000 - 1
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
            M3U8 += `#EXTINF:${segmentDuration}\nindex${i}.ts?cookie=SID=${encodeURIComponent(SID)}\n`
        } else {
            end = duration
            M3U8 += `#EXTINF:${lastSegmentDuration}\nindex${i}.ts?cookie=SID=${encodeURIComponent(SID)}\n#EXT-X-ENDLIST`
            endLoop = true
        }
        videoIndex[`index${i}`] = { start_pts, duration_ts, start, end, segmentDuration, id: i }
    }
    return new Promise((r, j) => {
        rimraf(path.resolve(settings.tempPath, 'output'), (err) => {
            console.log(err);
            r()
        })
    }).then((result) => {
        return mkdir(path.resolve(settings.tempPath, 'output'))
    }).then((result) => {
        console.log('clear');
        return writeFile(path.resolve(settings.tempPath, 'output', 'index.m3u8'), M3U8).catch(err => { console.log(err); })
    }).catch((err) => {
        console.log(err);
    })
}


function generateTsQueue(videoInfo, subtitleList) {
    let filePath = hlsTemp
    let lastWriteId = -1
    for (const segment in videoIndex) {
        let { inputParams, outputParams } = generateFfmpegCommand(videoInfo, subtitleList, segment)
        let params = [
            ...inputParams,
            `-i "${filePath}"`,
            ...outputParams,
            path.resolve(settings.tempPath, 'output', 'tempList', `${segment}.m3u8`)
        ]
        // if (segment == 'index0') {
        // }
        let process = async () => {
            await killCurrentProcess(segment)
            transState = 'doing'
            if ((Number(segment.replace('index', '')) == Object.keys(videoIndex).length - 1) && FFmpegProcess[segment].state == 'done') {
                return
            }
            console.log(path.resolve(settings.ffmpegPath, `ffmpeg${ffmpegSuffix}`));
            let ffmpeg = spawn(settings.ffmpegPath ? `"${path.resolve(settings.ffmpegPath, `ffmpeg${ffmpegSuffix}`)}"` : 'ffmpeg', params, {
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
                // console.log(`~${stderrLine}`);
                // console.log(`${stderrLine} ${Boolean(stderrLine.match(/Opening.*for writing/))} ${stderrLine.search(/m3u8/) == -1}`);
                if (/Opening.*for writing/.test(stderrLine) && !/m3u8/i.test(stderrLine)) {
                    let writingSegment = path.parse(path.parse(/'.*'/.exec(stderrLine)[0]).name).name
                    writingSegmentId = Number(writingSegment.replace('index', ''))
                    let nextSegment = `index${writingSegmentId + 1}`

                    // console.log(`${stderrLine}`);

                    // await checkSegment(writingSegment)

                    if (lastWriteId != writingSegmentId - 1 && lastWriteId >= ffmpeg.id) {
                        for (; lastWriteId <= writingSegmentId - 1; lastWriteId++) {
                            let tempLostSegment = `index${lastWriteId}`
                            console.log('lossssssssssssssssssssst', lastWriteId);
                            stat(path.resolve(settings.tempPath, 'output', `${tempLostSegment}.ts`)).then((result) => {
                                FFmpegProcess[tempLostSegment].state = 'done'
                                console.log('reloaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaad', result, tempLostSegment, FFmpegProcess[tempLostSegment]);
                            }).catch((err) => {
                                console.log('errrrrrrrrrrrrr', FFmpegProcess[tempLostSegment], err);
                            });
                        }
                        // await checkSegment(`index${lastWriteId}`)
                    }
                    lastWriteId = writingSegmentId

                    // console.log(writingSegmentId);
                    if (writingSegmentId != ffmpeg.id) {
                        let completedSegment = `index${writingSegmentId - 1 >= 0 ? writingSegmentId - 1 : 0}`
                        ffmpeg.queue.push(completedSegment)
                        FFmpegProcess[completedSegment].state = 'done'
                        console.log(completedSegment, 'done');
                    }

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
        transState = 'stop'
        return result
    }).catch((err) => {
        console.log(err);
        return
    })
}

function cleanNull(arr) {
    let temp = []
    arr.forEach(v => {
        if (v.length > 0) {
            temp.push(v)
        }
    })
    return temp
}

function generateFfmpegCommand(videoInfo, subtitleList, segment) {
    // settings.advAccel = false
    let inputParams = [
    ]
    let outputParams = [
    ]

    let map = [
        '-map v:0',
        '-map a:0',
        // '-map s:0'
    ]

    let bitrate = [
        `-b:v ${settings.bitrate}M`,
        `-bufsize ${settings.bitrate * 2}M`,
        `-maxrate ${settings.bitrate}M`
    ]
    let bitrateVal = settings.bitrate
    if (settings.autoBitrate) {
        if (videoInfo.bitrate * 1.5 <= settings.bitrate * 1000000) {
            bitrateVal = settings.bitrate * 1000000
        } else if (videoInfo.bitrate >= settings.bitrate * 1000000 * 1.5) {
            bitrateVal = settings.bitrate * 1000000 * 1.5
        } else {
            bitrateVal = videoInfo.bitrate * 1.2
        }
        bitrate = [
            `-b:v ${bitrateVal}`,
            `-bufsize ${bitrateVal * 2}`,
            `-maxrate ${bitrateVal}`
        ]
    }

    let decoder = ''
    let advAccel = settings.advAccel
    let hwaccelParams = []
    let hwDeviceId = ''
    let hwaccels = {
        win: {
            nvidia: {
                hwDevice: 'cuda',
                hwDeviceName: 'cu',
                flHwDevice: 'cuda',
                flHwDeviceName: 'cu',
                hwaccel: 'cuda',
                hwOutput: 'cuda',
                pixFormat: 'yuv420p',
                subFormat: 'yuva420p',
                scaleHw: 'cuda',
                scaleFormat: 'yuv420p',
                hwmap: 'cuda',
                hwmapFormat: 'cuda',
            },
            intel: {
                hwDevice: 'd3d11va',
                hwDeviceName: 'dx11',
                flHwDevice: 'qsv',
                flHwDeviceName: 'qs',
                hwaccel: 'qsv',
                hwOutput: 'qsv',
                pixFormat: 'nv12',
                subFormat: 'bgra',
                scaleHw: 'qsv',
                scaleFormat: 'nv12',
                hwmap: 'qsv',
                hwmapFormat: 'nv12',
            },
            amd: {
                hwDevice: 'd3d11va',
                hwDeviceName: 'dx11',
                flHwDevice: 'opencl',
                flHwDeviceName: 'oc',
                hwaccel: 'd3d11va',
                hwOutput: 'd3d11',
                pixFormat: 'nv12',
                subFormat: 'yuva420p',
                scaleHw: 'opencl',
                scaleFormat: 'nv12',
                hwmap: 'opencl',
                hwmapFormat: 'nv12',
            },
        },
        lin: {
            nvidia: {
                hwDevice: 'cuda',
                hwDeviceName: 'cu',
                flHwDevice: 'cuda',
                flHwDeviceName: 'cu',
                hwaccel: 'cuda',
                hwOutput: 'cuda',
                pixFormat: 'yuv420p',
                subFormat: 'yuva420p',
                scaleHw: 'cuda',
                scaleFormat: 'yuv420p',
                hwmap: 'cuda',
                hwmapFormat: 'cuda',
            },
            intel: {
                hwDevice: 'vaapi',
                hwDeviceName: 'va',
                hwaccel: 'vaapi',
                hwOutput: 'vaapi',
                flHwDevice: 'qsv',
                flHwDeviceName: 'qs',
                scaleHw: 'vaapi',
                scaleFormat: 'nv12',
                hwmap: 'qsv',
                hwmapFormat: 'qsv',
                pixFormat: 'nv12',
                subFormat: 'bgra'
            },
            amd: {
                hwDevice: 'null',
                hwDeviceName: 'null',
                flHwDevice: 'null',
                flHwDeviceName: 'null',
                flFormat: 'null',
                hwaccel: 'null',
                hwOutput: 'null',
                pixFormat: 'yuv420p',
                subFormat: 'yuva420p'
            },
            vaapi: {
                hwDevice: 'vaapi',
                hwDeviceName: 'va',
                hwaccel: 'vaapi',
                hwOutput: 'vaapi',
                flHwDevice: 'vaapi',
                flHwDeviceName: 'va',
                scaleHw: 'vaapi',
                scaleFormat: 'nv12',
                hwmap: 'vaapi',
                hwmapFormat: 'vaapi',
                pixFormat: 'nv12',
                subFormat: 'nv12'
            }
        }
    }
    for (const key in gpus) {
        let reg = new RegExp(settings.platform, 'i')
        if (key.match(reg)) {
            hwDeviceId = gpus[key]
        }
        // console.log(hwDeviceId);
    }
    // console.log(hwaccels[osPlatform][settings.platform]);
    let { hwDevice, hwDeviceName, flHwDevice, flHwDeviceName, scaleHw, scaleFormat, hwmap, hwmapFormat, hwaccel, hwOutput, pixFormat, subFormat } = hwaccels[osPlatform][settings.platform]
    if (hwaccel == 'cuda') {
        hwaccelParams = [
            `-init_hw_device ${hwDevice}=${hwDeviceName}`,
            `-filter_hw_device ${hwDeviceName}`,
            `-hwaccel ${hwaccel}`,
            `-hwaccel_output_format ${hwOutput}`
        ]
    } else if (hwaccel == 'qsv' || hwaccel == 'd3d11va' || hwaccel == 'vaapi') {
        hwaccelParams = [
            `-init_hw_device ${hwDevice}=${hwDeviceName}${hwDeviceId}`,
            `${settings.platform != 'vaapi' ? `-init_hw_device ${flHwDevice}=${flHwDeviceName}@${hwDeviceName}` : ''}`,
            `-filter_hw_device ${flHwDeviceName}`,
            `-hwaccel ${hwaccel}`,
            `-hwaccel_output_format ${hwOutput}`,
        ]
    }
    let notSupport = /yuv\d{3}p\d{0,2}/.exec(videoInfo.pix_fmt)[0].replace(/yuv\d{3}p/, '') >= 10
    if (decoders.hasOwnProperty(settings.platform)) {
        if (!(videoInfo.codec == 'h264' && notSupport)) {
            decoder = `-c:v ${videoInfo.codec}${decoders[settings.platform]}`
        }
    }
    if (hwaccel == 'vaapi') {
        decoder = ''
    } else {

    }

    let threads = '-threads 0'
    let encoder = `-c:v ${encoders[settings.encode][settings.platform]}`
    // let copyVideo = false
    // if ((settings.encode == 'h264'&& videoInfo.codec=='h264')&&(videoInfo.bitrate<=bitrateVal)&&!videoInfo.subtitleStream[0]) {
    //     encoder = '-c:v copy'
    //     copyVideo = true
    // }
    let pix_fmt = ''
    // if (settings.encode == 'h264') {
    //     pix_fmt = `yuv420p`
    // }
    // if (hwaccels[settings.platform] == 'd3d11va') {
    //     pix_fmt = `nv12`
    // }

    let tag = ''
    if (settings.encode == 'h265') {
        tag = '-tag:v hvc1'
    }
    let copyts = '-copyts'

    let filter = []
    let videoFilter = []
    let subtitleFilter = []
    let overlayFilter = []
    let subtitleListIndex = 0
    let overlay = false
    let sub
    let subtitlePath
    let fontsDir = path.resolve(settings.tempPath, 'fonts').replace(/\\/gim, '/').replace(':', '\\:')
    if (subtitleList[subtitleListIndex]) {
        overlay = true
        sub = subtitleList[subtitleListIndex]
        subtitlePath = sub.path.replace(/\\/gim, '/').replace(':', '\\:')
        if (sub.source == 'out') {
            if (sub.type == 'text') {
                subtitleFilter = [
                    `alphasrc=s=${videoInfo.width}x${videoInfo.height}:r=10:start='${videoIndex[segment].start}'`
                    , `format=${subFormat}`
                    , `subtitles=f='${subtitlePath}':charenc=utf-8:alpha=1:sub2video=1:fontsdir='${fontsDir}'`
                ]
            } else {
                subtitleFilter = [
                    , `format=${subFormat}`
                    , `subtitles=f='${subtitlePath}'`
                ]
            }
        } else if (sub.source == 'in') {
            if (sub.type == 'text') {
                // subtitleFilter = [
                //     `alphasrc=s=${videoInfo.width}x${videoInfo.height}:r=10:start='${videoIndex[segment].start}'`
                //     , `format=${subFormat}`
                // ]
                // if (hwaccel == 'vaapi') {
                subtitleFilter = [
                    `alphasrc=s=${videoInfo.width}x${videoInfo.height}:r=10:start='${videoIndex[segment].start}'`
                    , `format=${subFormat}`
                    , `subtitles=f='${subtitlePath}':si=${sub.subStreamIndex}:charenc=utf-8:alpha=1:sub2video=1:fontsdir='${fontsDir}'`
                ]
                // }
            } else {
                subtitleFilter = [
                    `[0:${sub.details.index}]scale=s=${videoInfo.width}x${videoInfo.height}:flags=fast_bilinear`
                    , `format=${subFormat}`
                ]
            }
        }
        subtitleFilter.push(`hwupload=derive_device=${flHwDevice}:extra_hw_frames=64[sub]`)
        subtitleFilter = cleanNull(subtitleFilter).join(',')
    }

    if (hwaccel == 'd3d11va') {
        videoFilter.push(`hwmap=derive_device=${hwmap}`)
    }
    videoFilter.push(`scale_${scaleHw}=format=${scaleFormat}`)
    if ((hwaccel == 'd3d11va' && !overlay) || hwaccel == 'vaapi') {
        // if (flHwDevice != 'vaapi') {
        videoFilter.push(`hwmap=derive_device=${hwmap}${hwaccel == 'd3d11va' ? ':reverse=1' : ''},format=${hwmapFormat}`)
        // }
    }
    videoFilter = cleanNull(videoFilter).join(',')
    if (overlay) {
        videoFilter = `[0:${videoInfo.index}]${videoFilter}[main]`
    }

    if (overlay) {
        overlayFilter.push(`[main][sub]overlay_${flHwDevice}=eof_action=endall`)
        if (hwaccel == 'd3d11va') {
            overlayFilter = [
                ...overlayFilter
                , `hwmap=derive_device=${hwmap}${hwaccel == 'd3d11va' ? ':reverse=1' : ''}`
                , `format=${hwmapFormat}`
            ]
        }
    }
    overlayFilter = cleanNull(overlayFilter).join(',')

    filter = cleanNull([subtitleFilter, videoFilter, overlayFilter])
    // if (!overlay) {
    //     filter = `-vf "${filter.join(';')}"`
    // } else {
    filter = `-filter_complex "${filter.join(';')}"`
    if (settings.platform == 'vaapi') {
        filter = `-vf "scale_vaapi=format=nv12${sub ? ',hwmap,format=nv12' : ''}${sub ? `,subtitles=f='${subtitlePath}'${sub.source == 'in' ? `:si=${sub.subStreamIndex}` : ''}:fontsdir='${fontsDir}',hwmap,format=vaapi` : ''}"`
    }
    if (osPlatform == 'lin' && settings.platform == 'amd') {
        hwaccelParams = []
        filter = `-vf "format=yuv420p${sub ? `,subtitles=f='${subtitlePath}'${sub.source == 'in' ? `:si=${sub.subStreamIndex}` : ''}${sub.type == 'text' ? `:fontsdir='${fontsDir}'` : ''}` : ''}"`
    }
    // }
    if ((videoInfo.codec == 'h264' && notSupport) || !advAccel) {
        // filter = `-vf "format=yuv420p"`
        filter = ''
        // hwaccelParams=[]
        if (hwaccel == 'vaapi') {
            pix_fmt = ''
        } else pix_fmt = '-pix_fmt yuv420p'

        if (sub) {
            if (sub.source == 'out') {
                if (sub.type == 'text') {
                    filter = `-vf "format=${subFormat},subtitles=f='${subtitlePath}':alpha=1:fontsdir='${fontsDir}'${settings.platform == 'vaapi' ? ',hwupload_vaapi' : ''}"`
                } else {
                    filter = `-vf "format=${subFormat},subtitles=f='${subtitlePath}'${settings.platform == 'vaapi' ? ',hwupload_vaapi' : ''}"`
                }
            } else if (sub.source == 'in') {
                if (sub.type == 'text') {
                    filter = `-filter_complex "[0:${sub.details.index}]format=${subFormat}${settings.platform == 'vaapi' ? ',hwupload_vaapi' : ''}"`
                } else {
                    filter = `-filter_complex "[0:${sub.details.index}]format=${subFormat},scale=s=${videoInfo.width}x${videoInfo.height}:flags=fast_bilinear${settings.platform == 'vaapi' ? ',hwupload_vaapi' : ''}"`
                }
            }
            // pix_fmt = ''
        }
        if (!advAccel) {
            hwaccelParams = []
            if (sub) {
                filter = `-vf "subtitles=f='${sub.path.replace(/\\/gim, '/').replace(':', '\\:')}'${sub.source == 'in' ? `:si=${sub.subStreamIndex}` : ''}:fontsdir='${fontsDir}'"`
            }
        }
    }
    if (videoInfo.colorSpace != 'bt709') {
        // filter = ''
        // hwaccelParams = [
        //     `-init_hw_device ${hwDevice}=${hwDeviceName}:,vendor=0x${hwDeviceId}`,
        //     `-hwaccel ${hwaccel}`,
        // ]
        // hwaccelParams=[]
        // threads = ''
        // pix_fmt = '-pix_fmt yuv420p'
        // if (sub) {
        // pix_fmt = ''
        //     let subtitlePath = sub.path
        //     filter = `-vf "subtitles=f='${subtitlePath}':alpha=1:fontsdir='${path.resolve(settings.tempPath, 'fonts').replace(/\\\\/gim, '/').replace(':', '\\:')}'"`
        // }
    }



    let ss = `-ss ${videoIndex[segment].start}`
    let audio = []
    // if (videoInfo.audioCodec == 'aac') {
    //     audio = ['-c:a copy']
    // } else 
    audio = [
        `-c:a libfdk_aac`,
        '-ac 2 ',
        '-ab 192000'
    ]
    let segmentParams = [
        '-avoid_negative_ts disabled',
        `-g ${videoInfo.frame_rate * 3}`,
        `-keyint_min ${videoInfo.frame_rate * 3}`,
        '-bf 1',
    ]
    let customInputCommand = []
    let customOutputCommand = []
    customInputCommand = settings.customInputCommand.split('\n')
    customOutputCommand = settings.customOutputCommand.split('\n')

    if (customInputCommand[0].length > 0) {
        decoder = ''
        hwaccel = []
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
        , `-hls_segment_filename "${path.resolve(settings.tempPath, 'output', `index%d.ts`)}"`
        , '-hls_playlist_type event'
        , '-hls_list_size 0'
    ]

    let inTest = [
        '-analyzeduration 200M',
        // '-extra_hw_frames 64',
        // '-autorotate 0',
    ]

    let outTest = [
        '-map_metadata -1',
        '-map_chapters -1',
        // '-threads 0',
        '-start_at_zero',
        // '-vsync -1',
        // '-max_muxing_queue_size 2048',
        // '-sc_threshold 0',
        // '-b_strategy 0'
        // '-profile:v:0 high',
        // '-flags +cgop',
        // `-segment_time_delta ${1 / (2 * videoInfo.frame_rate)}`,
        // '-quality speed',
        '-rc cbr',
        // '-force_key_frames expr:gte(t,n_forced*3)',
        // '-force_key_frames expr:if(isnan(prev_forced_n),eq(n,prev_forced_n+71))'
    ]

    // if (copyVideo) {
    //     filter = []
    //     decoder = []
    //     hwaccel = []
    //     bitrate = []
    // }


    inputParams = [
        ss,
        ...hwaccelParams,
        decoder,
        ...inTest,
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
        ...outTest,
        ...map,
        threads,
        encoder,
        pix_fmt,
        filter,
        tag,
        ...audio,
        copyts,
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

function updateCollections(params) {
    let fileQueue = []
    for (const hash in libraryIndex.collections) {
        let form = new FormData()
        form.append('hash', hash)
        let task = got({
            url: `${settings.qbHost}/api/v2/torrents/files`,
            method: 'post',
            body: form,
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
                    // console.log(error);
                    return a.label.length - b.label.length
                }
                return aId - bId
            })
            let collectionTitle = fileTree[0].label
            let collectionPath = path.resolve(libraryIndex.collections[hash].rootPath, collectionTitle)
            collectionTitle = libraryIndex.allSeason[collectionPath].title
            // console.log(collectionTitle);
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
        console.log('合集匹配完成');
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
        console.log(err);
    });
}

function generatePictureUrl(path) {
    return `/api/localFile/img.jpg?type=picture&path=${encodeURIComponent(path)}`
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
// app.use(logger('dev'));
// app.use(express.static(path.join(__dirname, 'public')));
// app.get('/',(req,res)=>{
//     res.sendFile(path.resolve(__dirname,'dist','index.html'))
// })



app.use('/api', (req, res, next) => {
    // console.log(req.headers.cookie,req.cookies);
    if (req.cookies) {
        // console.log(SID,req.cookies.SID);
        if (SID != req.cookies.SID) {
            checkCookie = true
        }
        SID = req.cookies.SID
        // console.log(SID);
        cookieJar.setCookieSync(`SID=${req.cookies.SID}`, settings.qbHost)
    }
    next()
})

//权限验证
app.use('/api/localFile', (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    if (checkCookie) {
        if (req.query.cookie) {
            let coo = req.query.cookie.replace("SID=", '')
            // console.log(coo,'----------ccccccccc');
            cookieJar.setCookieSync(`SID=${coo}`, settings.qbHost)
        }
        console.log('check');
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
            } else if (settings.share && req.path.includes('/output/')) {
                // console.log('goooooo');
                next()
            } else {
                throw new Error('无权限，请重新登录')
            }
        }).catch((err) => {
            // console.log(err);
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
        console.log(err);
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
    // if (transState=='stop') {
    //         continueFFmpegProgress() 
    // }
    if (req.path == '/index.m3u8') {
        res.header('Content-Type', 'application/x-mpegURL')
        res.sendFile(path.resolve(settings.tempPath, 'output', 'index.m3u8'))
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
        if (tryTimes >= 20) {
            res.status(404).send('not found')
            tryTimes = 0
            return
        } else {
            return stat(path.resolve(settings.tempPath, 'output', targetSegment + '.ts')).then((result) => {
                if (FFmpegProcess[targetSegment].state == 'done') {
                    console.log('seeeeeeeeeeeeeeeeeeeend', targetSegment);
                    tryTimes = 0
                    res.sendFile(path.resolve(settings.tempPath, 'output', targetSegment + '.ts'))
                    // clearTimeout(cleanTimeout)
                    // cleanTimeout = setTimeout(() => {
                    //     killCurrentProcess()
                    // }, 1000*15);
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
    killCurrentProcess()
    setTimeout(() => {
        rimraf(path.resolve(settings.tempPath, 'output'), (err) => {
            console.log(err);
            mkdir(path.resolve(settings.tempPath, 'output')).then((result) => {
                console.log('clear');
                hlsTemp = null
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
            // console.log(newData);
            maindataCache = {}
            merger(maindataCache, newData)
        } else {
            merger(maindataCache, newData)
        }
        res.send(newData)
    }).catch((err) => {
        // console.log(err);
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
    let hash = req.body.hash
    let form = new FormData()
    form.append('hash', hash)
    let file
    got({
        url: `${settings.qbHost}/api/v2/torrents/files`,
        method: 'post',
        body: form,
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
    }).catch(e => console.log(e))
})
// next()
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
try {
    let wwwroot=path.resolve(__dirname,'../dist/public')
    fs.accessSync(wwwroot)
    app.use(express.static(wwwroot));
    app.use(history());
    app.use("/api", proxy(proxySettings));
    console.log('~~~本地WebUI');
} catch (error) {
    app.use("/", proxy(proxySettings));
    console.log('~~~qBittorrent Web UI');
}
console.log('dir',__dirname,'resolve',path.resolve(''));



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