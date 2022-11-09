const { logger } = require('../../../utils/logger');
const { settings } = require('../../../utils/init');
const { readdir, rmdir, mkdir, stat, readFile, writeFile, rimraf, event } = require('../../../utils');
const path = require('path');
const {debounce} = require('lodash');
var _this
//hls请求处理
class handleHlsRequest {
    constructor(videoIndex, HlsProcessController) {
        logger.debug('handleHlsRequest constructor', 'start');
        this.videoIndex = videoIndex
        this.HlsProcessController = HlsProcessController
        this.currentProcess = HlsProcessController.currentProcess
        this.lastTargetId = 0
        this.id = new Date()
        _this = this
        logger.debug('handleHlsRequest constructor', 'end~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', this.id);
    }
    handler = (app) => {
        try {
            logger.debug('handleHlsRequest handler 1', 'init');
            let tryTimes = 0
            let readTimeout
            let tempReqPath
            // logger.debug('handleHlsRequest currentProcess',currentProcess.id,currentProcess.state)
            let oldOutput = app._router.stack.findIndex(v => v.regexp.toString().includes('output'))
            app._router.stack.splice(oldOutput - 1, oldOutput >= 0 ? 1 : 0)
            app.use('/api/localFile/output', debounce(async (req, res, next) => {
                logger.debug('handleHlsRequest /api/localFile/output', req.path);
                if (tempReqPath && (tempReqPath != req.path)) {
                    clearTimeout(readTimeout)
                }
                tempReqPath = req.path
                res.header("Access-Control-Allow-Origin", "*");
                let read = () => {
                    tryTimes++;
                    if (tryTimes >= 20) {
                        res.status(404).send('not found');
                        tryTimes = 0;
                        return;
                    } else {
                        return stat(path.resolve(settings.tempPath, 'output', targetSegment + '.ts')).then((result) => {
                            if (_this.videoIndex[targetSegment].state == 'done') {
                                logger.debug('handleHlsRequest /api/localFile/output', 'send', targetSegment);
                                tryTimes = 0;
                                res.sendFile(path.resolve(settings.tempPath, 'output', targetSegment + '.ts'));
                                // clearTimeout(cleanTimeout)
                                // cleanTimeout = setTimeout(() => {
                                //     killCurrentProcess()
                                // }, 1000*15);
                                return;
                            } else {
                                readTimeout = setTimeout(() => {
                                    return read();
                                }, 300);
                            }
                        }).catch((err) => {
                            readTimeout = setTimeout(() => {
                                logger.debug('handleHlsRequest /api/localFile/output', 'read', targetSegment, _this.videoIndex[targetSegment].state);
                                return read();
                            }, 300);

                        });
                    }
                }
                let targetSegment = path.parse(req.path).name;
                logger.info('handleHlsRequest handler 2', 'target-------------------->', targetSegment);
                // if (transState=='stop') {
                //         continueFFmpegProgress() 
                // }
                if (req.path == '/index.m3u8') {
                    res.header('Content-Type', 'application/x-mpegURL');
                    res.sendFile(path.resolve(settings.tempPath, 'output', 'index.m3u8'));
                    return;
                } else {
                    res.header('Content-Type', 'video/m2pt');
                    logger.debug('handleHlsRequest handler 2', targetSegment, '-------', _this.videoIndex[targetSegment].state);
                    let targetSegmentId = Number(targetSegment.replace('index', ''));
                    let beforeSegment = `index${targetSegmentId - 1 >= 0 ? targetSegmentId - 1 : 0}`;
                    let endId = Object.keys(_this.videoIndex).length - 1;

                    if (targetSegmentId < Number(_this.lastTargetId)) {
                        if (_this.videoIndex[targetSegment].state != 'done') {
                            logger.info('handleHlsRequest handler 3', 'back----------', targetSegmentId, _this.lastTargetId);
                            await _this.HlsProcessController.killCurrentProcess()
                            await _this.HlsProcessController.generateHlsProcess(targetSegment);
                        } else {
                            if (_this.currentProcess.id <= targetSegmentId) {
                                logger.debug('handleHlsRequest handler 3', 'continue----------', targetSegment);
                            } else {
                                logger.debug('handleHlsRequest handler 3', 'backcheck----------', targetSegment);
                                let nextProcessId = Number(targetSegment.replace('index', ''));
                                // logger.debug('debug',videoIndex[`index${nextProcessId}`]);
                                while (_this.videoIndex[`index${nextProcessId}`].state == 'done') {
                                    if (nextProcessId < endId) {
                                        nextProcessId++;

                                    } else { break; }
                                    // logger.debug('handleHlsRequest handler 3', 'nextProcessId',nextProcessId);
                                }
                                if (nextProcessId > endId) {
                                    logger.debug('handleHlsRequest handler 3', 'end', nextProcessId);
                                } else {
                                    logger.debug('handleHlsRequest handler 3', 'back to', nextProcessId);
                                    await _this.HlsProcessController.killCurrentProcess()
                                    await _this.HlsProcessController.generateHlsProcess(`index${nextProcessId}`);
                                }
                            }
                        }
                    } else if (targetSegmentId > Number(_this.lastTargetId) + 1) {
                        if (_this.videoIndex[targetSegment].state != 'done') {
                            logger.debug('handleHlsRequest handler 3', 'jump', targetSegment);
                            await _this.HlsProcessController.killCurrentProcess()
                            await _this.HlsProcessController.generateHlsProcess(targetSegment);
                        } else {
                            if (_this.currentProcess.id <= targetSegmentId) {
                                logger.debug('handleHlsRequest handler 3', 'seek', targetSegment);
                            } else {
                                logger.debug('handleHlsRequest handler 3', 'jump check', targetSegment);
                                let nextProcessId = Number(targetSegment.replace('index', ''));
                                while (_this.videoIndex[`index${nextProcessId}`].state == 'done') {
                                    if (nextProcessId < endId) {
                                        nextProcessId++;
                                    } else { break; }
                                    // logger.debug('handleHlsRequest handler 3','nextProcessId', nextProcessId);
                                }
                                if (nextProcessId > endId) {
                                    logger.debug('handleHlsRequest handler 3', 'end', nextProcessId);
                                } else {
                                    logger.debug('handleHlsRequest handler 3', 'jump continue', nextProcessId);
                                    await _this.HlsProcessController.killCurrentProcess()
                                    await _this.HlsProcessController.generateHlsProcess(`index${nextProcessId}`);
                                }
                            }
                        }
                    } else {
                        // logger.debug('debug','teeeeee---------eeeeeest', targetSegmentId, this.lastTargetId);
                    }
                    _this.lastTargetId = targetSegmentId;
                    read();
                }


            },500,{leading:true}));

            //hls缓存清理
            oldOutput = app._router.stack.findIndex(v => v.regexp.toString().includes('clearVideoTemp'))
            logger.debug('handleHlsRequest /api/localFile/clearVideoTemp', 'start~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', this.id);
            app._router.stack.splice(oldOutput - 1, oldOutput >= 0 ? 1 : 0)
            app.use('/api/localFile/clearVideoTemp', async (req, res, next) => {
                try {
                    logger.debug('handleHlsRequest /api/localFile/clearVideoTemp', 'start~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', _this.id);
                    await _this.HlsProcessController.killCurrentProcess()
                    rimraf(path.resolve(settings.tempPath, 'output'), (err) => {
                        logger.debug('handleHlsRequest /api/localFile/clearVideoTemp', err);
                        mkdir(path.resolve(settings.tempPath, 'output')).then((result) => {
                            logger.info('handleHlsRequest /api/localFile/clearVideoTemp', 'clear');
                            res.send('Ok.');
                        }).catch((err) => {
                            logger.error('handleHlsRequest /api/localFile/clearVideoTemp', err);
                        });
                    });
                } catch (error) {
                    logger.error('handleHlsRequest /api/localFile/clearVideoTemp', error);
                }
            });



            logger.debug('handleHlsRequest handler', 'end', app._router.stack.length);
        } catch (error) {
            logger.error('handleHlsRequest handler', error);
        }
    };
}

module.exports = handleHlsRequest
