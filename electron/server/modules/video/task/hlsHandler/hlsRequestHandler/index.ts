import settings from '@s/store/settings'
import { rimraf } from '@s/utils'
import { mkdir, stat } from 'fs/promises'
import path from 'path'
import { debounce } from 'lodash'
import { VideoHandler } from '@s/modules/video/task'
import { VideoInfo } from '../../getVideoInfo'
import { Request, Response } from 'express'
import { transcodeLogger } from '@s/utils/logger'
import type hlsProcessController from '../hlsProcessController'

//hls请求处理
export default class HlsRequestHandler {
    videoIndex
    HlsProcessController: hlsProcessController
    currentProcess
    lastTargetId
    readTimeout
    tempReqPath
    contentType: string
    taskId: string
    constructor() {}
    /**
     * init
     */
    public async init({
        videoInfo,
        HlsProcessController,
    }: {
        videoInfo: VideoInfo
        HlsProcessController
    }) {
        transcodeLogger.debug('hlsRequestHandler constructor', 'start')
        this.videoIndex = videoInfo.videoIndex
        this.taskId = videoInfo.taskId
        this.HlsProcessController = HlsProcessController
        this.currentProcess = HlsProcessController.currentProcess
        this.lastTargetId = 0
    }

    /**
     * originalHandler
     */
    public async originalHandler(req: Request, res: Response) {
        res.header('Access-Control-Allow-Origin', '*')
        if (req.path == '/index.m3u8') {
            res.header('Content-Type', 'application/x-mpegURL')

            res.sendFile(path.resolve(settings.server.tempPath, 'output', 'index.m3u8'))
            return
        }
        let tryTimes = 0
        // transcodeLogger.debug('hlsRequestHandler /api/localFile/output', req.path);
        if (this.tempReqPath && this.tempReqPath != req.path) {
            clearTimeout(this.readTimeout)
        }
        this.tempReqPath = req.path
        const targetSegment = path.parse(req.path).name
        transcodeLogger.info(
            'hlsRequestHandler handler 2',
            'target-------------------->',
            targetSegment,
            this.taskId,
        )
        const read = () => {
            tryTimes++
            if (tryTimes >= 20) {
                res.status(404).send('not found')
                tryTimes = 0
                return
            } else {
                if (this.videoIndex[targetSegment].state == 'done') {
                    transcodeLogger.debug(
                        'hlsRequestHandler /api/localFile/output',
                        'send',
                        targetSegment,
                    )
                    tryTimes = 0
                    res.sendFile(
                        path.resolve(settings.server.tempPath, 'output', targetSegment + '.ts'),
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
        if (this.HlsProcessController.transState === 'init' && targetSegment === 'index0') {
            await this.HlsProcessController.killCurrentProcess()
            await this.HlsProcessController.generateHlsProcess(targetSegment)
        }

        //处理跳转，如果所有人都把视频从头看到尾，就没它什么事了...
        res.header('Content-Type', 'video/m2pt')
        transcodeLogger.debug(
            'hlsRequestHandler handler 2',
            targetSegment,
            '-------',
            this.videoIndex[targetSegment].state,
        )
        const targetSegmentId = Number(targetSegment.replace('index', ''))
        const beforeSegment = `index${targetSegmentId - 1 >= 0 ? targetSegmentId - 1 : 0}`
        const endId = Object.keys(this.videoIndex).length - 1
        if (targetSegmentId < Number(this.lastTargetId)) {
            if (this.videoIndex[targetSegment].state != 'done') {
                transcodeLogger.info(
                    'hlsRequestHandler handler 3',
                    'back----------',
                    targetSegmentId,
                    this.lastTargetId,
                )
                await this.HlsProcessController.killCurrentProcess()
                await this.HlsProcessController.generateHlsProcess(targetSegment)
            } else {
                if (this.HlsProcessController.currentProcess.id <= targetSegmentId) {
                    transcodeLogger.debug(
                        'hlsRequestHandler handler 3',
                        'continue----------',
                        targetSegment,
                    )
                } else {
                    transcodeLogger.debug(
                        'hlsRequestHandler handler 3',
                        'backcheck----------',
                        targetSegment,
                    )
                    let nextProcessId = Number(targetSegment.replace('index', ''))
                    // transcodeLogger.debug('debug',videoIndex[`index${nextProcessId}`]);
                    while (this.videoIndex[`index${nextProcessId}`].state == 'done') {
                        if (nextProcessId < endId) {
                            nextProcessId++
                        } else {
                            break
                        }
                        // transcodeLogger.debug('hlsRequestHandler handler 3', 'nextProcessId',nextProcessId);
                    }
                    if (nextProcessId > endId) {
                        transcodeLogger.debug('hlsRequestHandler handler 3', 'end', nextProcessId)
                    } else {
                        transcodeLogger.debug(
                            'hlsRequestHandler handler 3',
                            'back to',
                            nextProcessId,
                        )
                        await this.HlsProcessController.killCurrentProcess()
                        await this.HlsProcessController.generateHlsProcess(`index${nextProcessId}`)
                    }
                }
            }
        } else if (targetSegmentId > Number(this.lastTargetId) + 1) {
            if (this.videoIndex[targetSegment].state != 'done') {
                transcodeLogger.debug('hlsRequestHandler handler 3', 'jump', targetSegment)
                await this.HlsProcessController.killCurrentProcess()
                await this.HlsProcessController.generateHlsProcess(targetSegment)
            } else {
                if (this.HlsProcessController.currentProcess.id <= targetSegmentId) {
                    transcodeLogger.debug('hlsRequestHandler handler 3', 'seek', targetSegment)
                } else {
                    transcodeLogger.debug(
                        'hlsRequestHandler handler 3',
                        'jump check',
                        targetSegment,
                    )
                    let nextProcessId = Number(targetSegment.replace('index', ''))
                    while (this.videoIndex[`index${nextProcessId}`].state == 'done') {
                        if (nextProcessId < endId) {
                            nextProcessId++
                        } else {
                            break
                        }
                        // transcodeLogger.debug('hlsRequestHandler handler 3','nextProcessId', nextProcessId);
                    }
                    if (nextProcessId > endId) {
                        transcodeLogger.debug('hlsRequestHandler handler 3', 'end', nextProcessId)
                    } else {
                        transcodeLogger.debug(
                            'hlsRequestHandler handler 3',
                            'jump continue',
                            nextProcessId,
                        )
                        await this.HlsProcessController.killCurrentProcess()
                        await this.HlsProcessController.generateHlsProcess(`index${nextProcessId}`)
                    }
                }
            }
        } else {
            // transcodeLogger.debug('debug','teeeeee---------eeeeeest', targetSegmentId, this.lastTargetId);
        }
        this.lastTargetId = targetSegmentId
        read()
    }

    //处理分段请求
    public handler = debounce(this.originalHandler.bind(this), 500, { leading: true })

    async clearVideoTemp(fromUser?: boolean /* 调用是否来自用户操作 */) {
        try {
            transcodeLogger.debug('hlsRequestHandler clearVideoTemp start', this.taskId)
            await this.HlsProcessController.killCurrentProcess(fromUser)
            await new Promise((resolve, reject) => {
                rimraf(path.resolve(settings.server.tempPath, 'output'), async (err) => {
                    if (err) {
                        reject(err)
                    } else resolve(null)
                })
            })
            await mkdir(path.resolve(settings.server.tempPath, 'output'))
            transcodeLogger.info('hlsRequestHandler clearVideoTemp clear', this.taskId)
        } catch (error) {
            transcodeLogger.error('hlsRequestHandler clearVideoTemp', this.taskId, error)
        }
    }
}
