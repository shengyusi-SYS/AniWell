import { logger } from '@s/utils/logger'
import init from '@s/utils/init'
const { settings } = init
import { rimraf } from '@s/utils'
import { mkdir, stat } from 'fs/promises'
import path from 'path'
import { debounce } from 'lodash'
let _this
//hls请求处理
class hlsRequestHandler {
    videoIndex
    HlsProcessController
    currentProcess
    lastTargetId
    constructor(videoIndex, HlsProcessController) {
        logger.debug('hlsRequestHandler constructor', 'start')
        this.videoIndex = videoIndex
        this.HlsProcessController = HlsProcessController
        this.currentProcess = HlsProcessController.currentProcess
        this.lastTargetId = 0
        // this.id = new Date()
        _this = this
        // logger.debug('hlsRequestHandler constructor', 'end~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', this.id);
    }
    handler = (app) => {
        try {
            logger.debug('hlsRequestHandler handler 1', 'init', app._router.stack.length)
            let tryTimes = 0
            let readTimeout
            let tempReqPath
            // logger.debug('hlsRequestHandler currentProcess',currentProcess.id,currentProcess.state)

            //处理分段请求
            let used = app._router.stack.findIndex((v) => v.regexp.toString().includes('output'))
            if (used < 0) {
                app.use(
                    '/api/localFile/output',
                    debounce(
                        async (req, res, next) => {
                            // logger.debug('hlsRequestHandler /api/localFile/output', req.path);
                            if (tempReqPath && tempReqPath != req.path) {
                                clearTimeout(readTimeout)
                            }
                            tempReqPath = req.path
                            res.header('Access-Control-Allow-Origin', '*')
                            const read = () => {
                                tryTimes++
                                if (tryTimes >= 20) {
                                    res.status(404).send('not found')
                                    tryTimes = 0
                                    return
                                } else {
                                    return stat(
                                        path.resolve(
                                            settings.tempPath,
                                            'output',
                                            targetSegment + '.ts',
                                        ),
                                    )
                                        .then((result) => {
                                            if (_this.videoIndex[targetSegment].state == 'done') {
                                                logger.debug(
                                                    'hlsRequestHandler /api/localFile/output',
                                                    'send',
                                                    targetSegment,
                                                )
                                                tryTimes = 0
                                                res.sendFile(
                                                    path.resolve(
                                                        settings.tempPath,
                                                        'output',
                                                        targetSegment + '.ts',
                                                    ),
                                                )
                                                // clearTimeout(cleanTimeout)
                                                // cleanTimeout = setTimeout(() => {
                                                //     killCurrentProcess()
                                                // }, 1000*15);
                                                return
                                            } else {
                                                readTimeout = setTimeout(() => {
                                                    return read()
                                                }, 300)
                                            }
                                        })
                                        .catch((err) => {
                                            readTimeout = setTimeout(() => {
                                                logger.debug(
                                                    'hlsRequestHandler /api/localFile/output',
                                                    'read',
                                                    targetSegment,
                                                    _this.videoIndex[targetSegment].state,
                                                )
                                                return read()
                                            }, 300)
                                        })
                                }
                            }
                            const targetSegment = path.parse(req.path).name
                            logger.info(
                                'hlsRequestHandler handler 2',
                                'target-------------------->',
                                targetSegment,
                            )
                            // if (transState=='stop') {
                            //         continueFFmpegProgress()
                            // }
                            if (req.path == '/index.m3u8') {
                                res.header('Content-Type', 'application/x-mpegURL')
                                res.sendFile(
                                    path.resolve(settings.tempPath, 'output', 'index.m3u8'),
                                )
                                return
                            } else {
                                //处理跳转，如果所有人都把视频从头看到尾，就没它什么事了...
                                res.header('Content-Type', 'video/m2pt')
                                logger.debug(
                                    'hlsRequestHandler handler 2',
                                    targetSegment,
                                    '-------',
                                    _this.videoIndex[targetSegment].state,
                                )
                                const targetSegmentId = Number(targetSegment.replace('index', ''))
                                const beforeSegment = `index${
                                    targetSegmentId - 1 >= 0 ? targetSegmentId - 1 : 0
                                }`
                                const endId = Object.keys(_this.videoIndex).length - 1
                                if (targetSegmentId < Number(_this.lastTargetId)) {
                                    if (_this.videoIndex[targetSegment].state != 'done') {
                                        logger.info(
                                            'hlsRequestHandler handler 3',
                                            'back----------',
                                            targetSegmentId,
                                            _this.lastTargetId,
                                        )
                                        await _this.HlsProcessController.killCurrentProcess()
                                        await _this.HlsProcessController.generateHlsProcess(
                                            targetSegment,
                                        )
                                    } else {
                                        if (
                                            _this.HlsProcessController.currentProcess.id <=
                                            targetSegmentId
                                        ) {
                                            logger.debug(
                                                'hlsRequestHandler handler 3',
                                                'continue----------',
                                                targetSegment,
                                            )
                                        } else {
                                            logger.debug(
                                                'hlsRequestHandler handler 3',
                                                'backcheck----------',
                                                targetSegment,
                                            )
                                            let nextProcessId = Number(
                                                targetSegment.replace('index', ''),
                                            )
                                            // logger.debug('debug',videoIndex[`index${nextProcessId}`]);
                                            while (
                                                _this.videoIndex[`index${nextProcessId}`].state ==
                                                'done'
                                            ) {
                                                if (nextProcessId < endId) {
                                                    nextProcessId++
                                                } else {
                                                    break
                                                }
                                                // logger.debug('hlsRequestHandler handler 3', 'nextProcessId',nextProcessId);
                                            }
                                            if (nextProcessId > endId) {
                                                logger.debug(
                                                    'hlsRequestHandler handler 3',
                                                    'end',
                                                    nextProcessId,
                                                )
                                            } else {
                                                logger.debug(
                                                    'hlsRequestHandler handler 3',
                                                    'back to',
                                                    nextProcessId,
                                                )
                                                await _this.HlsProcessController.killCurrentProcess()
                                                await _this.HlsProcessController.generateHlsProcess(
                                                    `index${nextProcessId}`,
                                                )
                                            }
                                        }
                                    }
                                } else if (targetSegmentId > Number(_this.lastTargetId) + 1) {
                                    if (_this.videoIndex[targetSegment].state != 'done') {
                                        logger.debug(
                                            'hlsRequestHandler handler 3',
                                            'jump',
                                            targetSegment,
                                        )
                                        await _this.HlsProcessController.killCurrentProcess()
                                        await _this.HlsProcessController.generateHlsProcess(
                                            targetSegment,
                                        )
                                    } else {
                                        if (
                                            _this.HlsProcessController.currentProcess.id <=
                                            targetSegmentId
                                        ) {
                                            logger.debug(
                                                'hlsRequestHandler handler 3',
                                                'seek',
                                                targetSegment,
                                            )
                                        } else {
                                            logger.debug(
                                                'hlsRequestHandler handler 3',
                                                'jump check',
                                                targetSegment,
                                            )
                                            let nextProcessId = Number(
                                                targetSegment.replace('index', ''),
                                            )
                                            while (
                                                _this.videoIndex[`index${nextProcessId}`].state ==
                                                'done'
                                            ) {
                                                if (nextProcessId < endId) {
                                                    nextProcessId++
                                                } else {
                                                    break
                                                }
                                                // logger.debug('hlsRequestHandler handler 3','nextProcessId', nextProcessId);
                                            }
                                            if (nextProcessId > endId) {
                                                logger.debug(
                                                    'hlsRequestHandler handler 3',
                                                    'end',
                                                    nextProcessId,
                                                )
                                            } else {
                                                logger.debug(
                                                    'hlsRequestHandler handler 3',
                                                    'jump continue',
                                                    nextProcessId,
                                                )
                                                await _this.HlsProcessController.killCurrentProcess()
                                                await _this.HlsProcessController.generateHlsProcess(
                                                    `index${nextProcessId}`,
                                                )
                                            }
                                        }
                                    }
                                } else {
                                    // logger.debug('debug','teeeeee---------eeeeeest', targetSegmentId, this.lastTargetId);
                                }
                                _this.lastTargetId = targetSegmentId
                                read()
                            }
                        },
                        500,
                        { leading: true },
                    ),
                )
            }
            console.log(app._router.stack.find((v) => v.regexp.toString().includes('output')))
            // app._router.stack.splice(used - 1, used >= 0 ? 1 : 0)

            //hls缓存清理
            used = app._router.stack.findIndex((v) =>
                v.regexp.toString().includes('clearVideoTemp'),
            )
            // logger.debug('hlsRequestHandler /api/localFile/clearVideoTemp', 'start~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', this.id);
            if (used < 0) {
                app.use('/api/localFile/clearVideoTemp', async (req, res, next) => {
                    try {
                        logger.debug('hlsRequestHandler /api/localFile/clearVideoTemp', 'start')
                        await _this.HlsProcessController.killCurrentProcess()
                        await new Promise((resolve, reject) => {
                            rimraf(path.resolve(settings.tempPath, 'output'), async (err) => {
                                if (err) {
                                    reject()
                                } else resolve(null)
                            })
                        })
                        await mkdir(path.resolve(settings.tempPath, 'output'))
                        logger.info('hlsRequestHandler /api/localFile/clearVideoTemp', 'clear')
                        res.send('Ok.')
                    } catch (error) {
                        logger.error('hlsRequestHandler /api/localFile/clearVideoTemp', error)
                    }
                })
            }
            // app._router.stack.splice(used - 1, used >= 0 ? 1 : 0)

            used = app._router.stack.findIndex((v) => v.regexp.toString().includes('stopTranscode'))
            if (used < 0) {
                app.use('/api/localFile/stopTranscode', async (req, res, next) => {
                    res.send('Ok.')
                })
            }

            logger.debug('hlsRequestHandler handler', 'end', app._router.stack.length)
        } catch (error) {
            logger.error('hlsRequestHandler handler', error)
        }
    }
}

export default hlsRequestHandler
