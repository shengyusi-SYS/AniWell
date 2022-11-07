const { logger } = require('../../../utils/logger');
const { settings } = require('../../../utils/init');
const { readdir, rmdir, mkdir, stat, readFile, writeFile, rimraf,event } = require('../../../utils');
const path = require('path');
var lastTargetId
var tryTimes = 0
//hls请求处理
function handleHlsRequest() {
    var currentProcess
    this.setFFmpegProcess = FFmpegProcess => {
        logger.debug('handleHlsRequest setFFmpegProcess')
        this.FFmpegProcess = FFmpegProcess
        return this
    }
    this.setVideoIndex = videoIndex => {
        logger.debug('handleHlsRequest setVideoIndex')
        this.videoIndex = videoIndex
        return this
    }
    this.handler = app => {
        try {
            logger.debug('handleHlsRequest handler', 'init',app._router.stack.length)
            event.on('setCurrentProcess',val=>{
                currentProcess = val
            })
            // logger.debug('handleHlsRequest currentProcess',currentProcess.id,currentProcess.state)
            let FFmpegProcess = this.FFmpegProcess
            let videoIndex = this.videoIndex
            app.use('/api/localFile/output', (req, res, next) => {
                logger.debug('handleHlsRequest /api/localFile/output', req.path)
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
                require('../handleTranscode/generateTsQueue').killCurrentProcess()
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
            logger.debug('handleHlsRequest handler', 'end',app._router.stack.length)
    
        } catch (error) {
            logger.error('handler',error)
        }

    }
    return this
}

module.exports = handleHlsRequest
