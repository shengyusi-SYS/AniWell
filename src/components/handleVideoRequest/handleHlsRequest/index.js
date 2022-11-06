const {logger} = require('../../../utils/logger');
const {videoIndex} = require('../handleTranscode/generateM3U8');
const {FFmpegProcess} = require('../old');
//hls请求处理
function handleHlsRequest() {
    this.setFFmpegProcess = FFmpegProcess => {
        this.FFmpegProcess = FFmpegProcess
        return this
    }
    this.handleRequest = app => {
        let FFmpegProcess = this.FFmpegProcess
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
    }
    return this
}

handleHlsRequest()
