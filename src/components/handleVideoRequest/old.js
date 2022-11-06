const { logger } = require('../../utils/logger');
const { app, express } = require('../../server');
const {
    Ffmpeg,
    ffmpegSuffix
} = require('../../utils/init');
const { spawn } = require('child_process');
const kill = require('tree-kill');
const { promisify } = require('util');
// const log4js = require('log4js');
// log4js.configure(path.join( 'config', 'log4js.json'));
const fs = require('fs');
const path = require('path');
const { readdir, rmdir, mkdir, stat, readFile, writeFile } = require('../../utils');
var hlsTemp = ''
var tryTimes = 0
var fileRootPath = ''
var subtitleList = []
var killTimeout
var currentProcess = null
var writingSegmentId = null
var processList = []
var lastProcessList
var transState = 'false'
var lastTargetId
var FFmpegProcess

const getVideoInfo = require('./getVideoInfo');
const handleSubtitles = require('./handleSubtitles');
const generateTsQueue = require('./handleTranscode/generateTsQueue');
var { generateM3U8, videoIndex } = require('./handleTranscode/generateM3U8');

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

const gpus = require('../../utils/getGPU');


this.handleVideoRequest = function handleVideoRequest(app, res, filePath) {
    if (hlsTemp == filePath) {
        logger.debug('debug', 'exist');
        res.send('Ok.')
    } else return stat(path.resolve(filePath))
        .catch(err => {
            logger.debug('debug', '文件错误' + path.resolve(filePath));
            // throw new Error('文件错误' + filePath)
        }).then(async (result) => {

            currentProcess = null
            await killCurrentProcess()
        }).then((result) => {
            lastProcessList = processList
            processList = []
            writingSegmentId = null
            lastTargetId = null
            videoIndex = {}
            let videoInfo
            getVideoInfo(filePath).catch((err) => {
                logger.error('error', err);
                res.status(404).send('文件错误')
                return Promise.reject()
            }).then((info) => {
                if (!info.codec) {
                    res.status(404).send('文件错误')
                    throw new Error('文件错误')
                }
                videoInfo = info
                return handleSubtitles(filePath, videoInfo).catch(e => logger.error('error', e))
            }).then((result) => {
                subtitleList = result
                // logger.debug('debug','------------------~~~~~~~~~~~~~~~~~~~~~',result[0]);
                return generateM3U8(videoInfo)
            }).then(() => {
                hlsTemp = filePath
                console.log();
                return generateTsQueue(videoInfo, subtitleList)
            }).then((queue) => {
                FFmpegProcess = queue
                if (FFmpegProcess.index0.state = 'init') {
                    FFmpegProcess.index0.state = 'doing'
                    console.log(FFmpegProcess.index0);
                    FFmpegProcess.index0.process()
                }
                return writeFile(path.resolve(settings.tempPath, 'output', 'videoIndex.json'), JSON.stringify(videoIndex, '', '\t')).then((result) => {
                    // logger.debug('debug',videoIndex);
                    res.send("Ok.")
                }).catch((err) => {
                    logger.error('error', err);
                });
            })
        })
}


function continueFFmpegProgress(params) {
    if (transState == 'stop') {
        transState = 'continue'
        // logger.debug('debug','>>>>>>>>>>!~~~~~~~~~~~',transState);
        for (const index in FFmpegProcess) {
            if (FFmpegProcess[index].state == 'init') {
                FFmpegProcess[index].process()
                logger.debug('debug', '>>>>>>>>>>!~~~~~~~~~~~', index, FFmpegProcess[index]);
                break
            }
        }
    }
}







function killCurrentProcess(start) {
    transState = 'changing'
    logger.debug('debug', 'dddddddddddddddd');
    if (lastProcessList) {
        lastProcessList.forEach(v => {
            kill(v.pid, 'SIGKILL')
        })
    }
    return new Promise((r, j) => {
        let tempProcessList = JSON.parse(JSON.stringify(processList))
        if (currentProcess) {
            currentProcess.on('close', () => {
                logger.debug('debug', 'ccccccccccccccc');
                return r()
            })
            currentProcess.on('exit', () => {
                logger.debug('debug', 'eeeeeeeeeeeeeeeee');
                return r()
            })
            currentProcess.on('error', (err) => {
                logger.debug('debug', 'rrrrrrrrrrrrrrrrrr');
                return j(err)
            })
            kill(currentProcess.pid, 'SIGKILL')
        } else {
            return r()
        }
        killTimeout = setTimeout(() => {
            tempProcessList.forEach(v => {
                kill(v.pid, 'SIGKILL')
            })
            logger.debug('debug', 'kkkkkkk~~~~~~~~~', currentProcess.id);
            return r()
        }, 3000);
    }).then((result) => {
        clearTimeout(killTimeout)
        transState = 'stop'
        return result
    }).catch((err) => {
        clearTimeout(killTimeout)
        logger.error('error', err);
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

app.use(express.json())
//更新配置项
app.use('/api/localFile/changeFileServerSettings', async (req, res) => {
    let data = req.body
    console.log(data);
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
//hls请求处理
app.use('/api/localFile/output', (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    let targetSegment = path.parse(req.path).name
    logger.debug('debug', '-------------------->', targetSegment);
    // if (transState=='stop') {
    //         continueFFmpegProgress() 
    // }
    if (req.path == '/index.m3u8') {
        res.header('Content-Type', 'application/x-mpegURL')
        res.sendFile(path.resolve(settings.tempPath, 'output', 'index.m3u8'))
        return
    } else {
        res.header('Content-Type', 'video/m2pt')
        logger.debug('debug', targetSegment, '-------', FFmpegProcess[targetSegment].state);
        let targetSegmentId = Number(targetSegment.replace('index', ''))
        let beforeSegment = `index${targetSegmentId - 1 >= 0 ? targetSegmentId - 1 : 0}`
        let endId = Object.keys(videoIndex).length - 1
        if (targetSegmentId < Number(lastTargetId)) {
            if (FFmpegProcess[targetSegment].state != 'done') {
                logger.debug('debug', 'backkkkkkkkkkkkkkkkkkkkkkk', targetSegmentId, lastTargetId);
                FFmpegProcess[targetSegment].process()
            } else {
                if (currentProcess.id <= targetSegmentId) {
                    logger.debug('debug', 'connnnnnnnnnnnnnnnnnnnntinue', targetSegment);
                } else {
                    logger.debug('debug', 'baaaaaaaaaackeeeeeeeeeek', targetSegment);
                    let nextProcessId = Number(targetSegment.replace('index', ''))
                    // logger.debug('debug',FFmpegProcess[`index${nextProcessId}`]);
                    while (FFmpegProcess[`index${nextProcessId}`].state == 'done') {
                        if (nextProcessId < endId) {
                            nextProcessId++

                        } else { break }
                        logger.debug('debug', nextProcessId);
                    }
                    if (nextProcessId > endId) {
                        logger.debug('debug', 'eeeeeeeeeeennnnnnnnnnnndddddddd', nextProcessId);
                    } else {
                        logger.debug('debug', 'baccccccccckooooooooooooooooooon', nextProcessId);
                        FFmpegProcess[`index${nextProcessId}`].process()
                    }
                }
            }
        } else if (targetSegmentId > Number(lastTargetId) + 1) {
            if (FFmpegProcess[targetSegment].state != 'done') {
                logger.debug('debug', 'juuuuuuuuuuuuuuuuuuuuuuuuump', targetSegment);
                FFmpegProcess[targetSegment].process()
            } else {
                if (currentProcess.id <= targetSegmentId) {
                    logger.debug('debug', 'seeeeeeeeeeeeeeeeeeeeeeeeeek', targetSegment);
                } else {
                    logger.debug('debug', 'juuuuuuuunnnnnnpcccccccheck', targetSegment);
                    // FFmpegProcess[targetSegment].process()
                    let nextProcessId = Number(targetSegment.replace('index', ''))
                    while (FFmpegProcess[`index${nextProcessId}`].state == 'done') {
                        if (nextProcessId < endId) {
                            nextProcessId++
                        } else { break }
                        logger.debug('debug', nextProcessId);
                    }
                    if (nextProcessId > endId) {
                        logger.debug('debug', 'eeeeeeeeeeennnnnnnnnnnndddddddd', nextProcessId);
                    } else {
                        logger.debug('debug', 'jumpccccccooooooooooooooon', nextProcessId);
                        FFmpegProcess[`index${nextProcessId}`].process()
                    }
                }
            }
        } else {
            // logger.debug('debug','teeeeee---------eeeeeest', targetSegmentId, lastTargetId);
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
                    logger.debug('debug', 'seeeeeeeeeeeeeeeeeeeend', targetSegment);
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
                    logger.debug('debug', 'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrread', targetSegment, FFmpegProcess[targetSegment]);
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
            logger.debug('debug', err);
            mkdir(path.resolve(settings.tempPath, 'output')).then((result) => {
                logger.debug('debug', 'clear');
                hlsTemp = null
                res.send('Ok.')
            }).catch((err) => {
                logger.error('error', err);
            })
        })
    }, 2000)
})

app.use('/api/localFile/stopProcess', async (req, res, next) => {
    await killCurrentProcess()
    res.send('Ok.')
})


module.exports = {
    handleVideoRequest,
    hlsTemp,
    FFmpegProcess
}
