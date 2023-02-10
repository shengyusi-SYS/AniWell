import { logger } from '@s/utils/logger'
import settings from '@s/store/settings'
import { rimraf } from '@s/utils'
import { mkdir, stat } from 'fs/promises'
import path from 'path'
import { debounce } from 'lodash'
import { VideoHandler } from '@s/modules/video/task'
let _this
//hls请求处理
export default class HlsRequestHandler implements VideoHandler {
    videoIndex
    HlsProcessController
    currentProcess
    lastTargetId

    readTimeout
    tempReqPath
    constructor() {}
    /**
     * init
     */
    public async init(videoIndex, HlsProcessController) {
        logger.debug('hlsRequestHandler constructor', 'start')
        this.videoIndex = videoIndex
        this.HlsProcessController = HlsProcessController
        this.currentProcess = HlsProcessController.currentProcess
        this.lastTargetId = 0
    }
    //处理分段请求
    output = debounce(
        async (req, res) => {
            res.header('Access-Control-Allow-Origin', '*')
            if (req.path == '/index.m3u8') {
                res.header('Content-Type', 'application/x-mpegURL')
                res.sendFile(path.resolve(settings.get('tempPath'), 'output', 'index.m3u8'))
                return
            }
            let tryTimes = 0
            // logger.debug('hlsRequestHandler /api/localFile/output', req.path);
            if (this.tempReqPath && this.tempReqPath != req.path) {
                clearTimeout(this.readTimeout)
            }
            this.tempReqPath = req.path
            const targetSegment = path.parse(req.path).name
            logger.info('hlsRequestHandler handler 2', 'target-------------------->', targetSegment)
            const read = () => {
                tryTimes++
                if (tryTimes >= 20) {
                    res.status(404).send('not found')
                    tryTimes = 0
                    return
                } else {
                    if (_this.videoIndex[targetSegment].state == 'done') {
                        logger.debug(
                            'hlsRequestHandler /api/localFile/output',
                            'send',
                            targetSegment,
                        )
                        tryTimes = 0
                        res.sendFile(
                            path.resolve(settings.get('tempPath'), 'output', targetSegment + '.ts'),
                        )
                        return
                    } else {
                        this.readTimeout = setTimeout(() => {
                            return read()
                        }, 300)
                    }
                }
            }

            // if (transState=='stop') {
            //         continueFFmpegProgress()
            // }

            //处理跳转，如果所有人都把视频从头看到尾，就没它什么事了...
            res.header('Content-Type', 'video/m2pt')
            logger.debug(
                'hlsRequestHandler handler 2',
                targetSegment,
                '-------',
                _this.videoIndex[targetSegment].state,
            )
            const targetSegmentId = Number(targetSegment.replace('index', ''))
            const beforeSegment = `index${targetSegmentId - 1 >= 0 ? targetSegmentId - 1 : 0}`
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
                    await _this.HlsProcessController.generateHlsProcess(targetSegment)
                } else {
                    if (_this.HlsProcessController.currentProcess.id <= targetSegmentId) {
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
                        let nextProcessId = Number(targetSegment.replace('index', ''))
                        // logger.debug('debug',videoIndex[`index${nextProcessId}`]);
                        while (_this.videoIndex[`index${nextProcessId}`].state == 'done') {
                            if (nextProcessId < endId) {
                                nextProcessId++
                            } else {
                                break
                            }
                            // logger.debug('hlsRequestHandler handler 3', 'nextProcessId',nextProcessId);
                        }
                        if (nextProcessId > endId) {
                            logger.debug('hlsRequestHandler handler 3', 'end', nextProcessId)
                        } else {
                            logger.debug('hlsRequestHandler handler 3', 'back to', nextProcessId)
                            await _this.HlsProcessController.killCurrentProcess()
                            await _this.HlsProcessController.generateHlsProcess(
                                `index${nextProcessId}`,
                            )
                        }
                    }
                }
            } else if (targetSegmentId > Number(_this.lastTargetId) + 1) {
                if (_this.videoIndex[targetSegment].state != 'done') {
                    logger.debug('hlsRequestHandler handler 3', 'jump', targetSegment)
                    await _this.HlsProcessController.killCurrentProcess()
                    await _this.HlsProcessController.generateHlsProcess(targetSegment)
                } else {
                    if (_this.HlsProcessController.currentProcess.id <= targetSegmentId) {
                        logger.debug('hlsRequestHandler handler 3', 'seek', targetSegment)
                    } else {
                        logger.debug('hlsRequestHandler handler 3', 'jump check', targetSegment)
                        let nextProcessId = Number(targetSegment.replace('index', ''))
                        while (_this.videoIndex[`index${nextProcessId}`].state == 'done') {
                            if (nextProcessId < endId) {
                                nextProcessId++
                            } else {
                                break
                            }
                            // logger.debug('hlsRequestHandler handler 3','nextProcessId', nextProcessId);
                        }
                        if (nextProcessId > endId) {
                            logger.debug('hlsRequestHandler handler 3', 'end', nextProcessId)
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
        },
        500,
        { leading: true },
    )
    clearVideoTemp = async (req, res) => {
        try {
            logger.debug('hlsRequestHandler /api/localFile/clearVideoTemp', 'start')
            await _this.HlsProcessController.killCurrentProcess()
            await new Promise((resolve, reject) => {
                rimraf(path.resolve(settings.get('tempPath'), 'output'), async (err) => {
                    if (err) {
                        reject()
                    } else resolve(null)
                })
            })
            await mkdir(path.resolve(settings.get('tempPath'), 'output'))
            logger.info('hlsRequestHandler /api/localFile/clearVideoTemp', 'clear')
            res.send('Ok.')
        } catch (error) {
            logger.error('hlsRequestHandler /api/localFile/clearVideoTemp', error)
        }
    }
    stopTranscode = async (req, res) => {
        res.send('Ok.')
    }
}
