import { access } from 'fs/promises'
import path from 'path'
import init from '@s/utils/init'
const { ffmpegSuffix } = init
import settings from '@s/store/settings'
import kill from 'tree-kill'
import { spawn } from 'child_process'
import { debounce } from 'lodash'
import fs from 'fs'
import { VideoInfo } from '../../getVideoInfo'
import { transcodeLogger } from '@s/utils/logger'

//转码串流的核心，进程控制系统
class hlsProcessController {
    videoInfo
    commandTemplate
    currentProcess
    processList = []
    transState = 'init'
    taskId: string
    async init(videoInfo: VideoInfo, commandTemplate: Function) {
        transcodeLogger.info('hlsProcessController init start')
        this.videoInfo = videoInfo
        this.taskId = videoInfo.taskId
        this.commandTemplate = commandTemplate
        transcodeLogger.info('hlsProcessController init end')
    }
    async generateHlsProcess(segment) {
        try {
            transcodeLogger.info(
                'hlsProcessController generateHlsProcess 1 start',
                segment,
                this.taskId,
            )
            const _this = this
            await this.killCurrentProcess()
            const videoIndex = this.videoInfo.videoIndex
            const params = this.commandTemplate(videoIndex[segment].start, segment)
            this.transState = 'doing'
            const initSegmentId = videoIndex[segment].id
            const initSegmentState = videoIndex[segment].state
            if (initSegmentId == Object.keys(videoIndex).length - 1 && initSegmentState == 'done') {
                return
            }

            transcodeLogger.debug(
                'hlsProcessController',
                'generateHlsProcess 2',
                'ffmpegPath',
                path.resolve(settings.server.ffmpegPath, `ffmpeg${ffmpegSuffix}`),
            )
            const ffmpeg = (this.currentProcess = spawn(
                settings.server.ffmpegPath
                    ? `"${path.resolve(settings.server.ffmpegPath, `ffmpeg${ffmpegSuffix}`)}"`
                    : 'ffmpeg',
                params,
                { shell: true },
            ))
            this.processList.push(ffmpeg)
            ffmpeg.id = initSegmentId
            ffmpeg.queue = []
            transcodeLogger.info(
                'hlsProcessController',
                'generateHlsProcess 3',
                'start------------------------' + segment,
            )
            transcodeLogger.info('hlsProcessController', 'generateHlsProcess 4', [params.join(' ')])
            transcodeLogger.info('transcode', [params.join(' ')])
            // let lastWriteId
            ffmpeg.stderr.on('data', async function (stderrLine) {
                stderrLine = stderrLine.toString()
                transcodeLogger.info('transcode', `~${stderrLine}`)
                const isWriting = stderrLine.match(/Opening.*index\d+\.ts\.tmp.*?for writing/)
                if (isWriting) {
                    //任务密集时，信息输出会合并为一条，需要匹配全部
                    const writings = [
                        ...stderrLine.matchAll(/Opening.*index\d+\.ts\.tmp.*?for writing/g),
                    ]
                    let writingSegment
                    let writingSegmentId
                    for (let index = 0; index < writings.length; index++) {
                        writingSegment = writings[index][0].match(/index\d+/)[0]
                        writingSegmentId = Number(writingSegment.replace('index', ''))
                        if (videoIndex[writingSegment].state == 'init') {
                            videoIndex[writingSegment].state = 'writing'
                        }
                        if (writingSegmentId > 0) {
                            const lastWriteSegment = `index${writingSegmentId - 1}`
                            try {
                                fs.accessSync(
                                    path.resolve(
                                        settings.server.tempPath,
                                        'output',
                                        `${lastWriteSegment}.ts`,
                                    ),
                                )
                                videoIndex[lastWriteSegment].state = 'done'
                                ffmpeg.queue.push(lastWriteSegment)
                                transcodeLogger.info(
                                    'hlsProcessController generateHlsProcess 5',
                                    lastWriteSegment,
                                    'done',
                                    _this.taskId,
                                )
                            } catch (error) {
                                if (videoIndex[lastWriteSegment].state != 'init') {
                                    videoIndex[lastWriteSegment].state = 'err'
                                    transcodeLogger.error(
                                        'hlsProcessController',
                                        'generateHlsProcess 5',
                                        'lost',
                                        lastWriteSegment,
                                    )
                                }
                            }
                        }
                    }

                    if (writingSegmentId == Object.keys(videoIndex).length - 1) {
                        transcodeLogger.info(
                            'hlsProcessController',
                            'generateHlsProcess 5',
                            'end',
                            writingSegmentId,
                        )
                        videoIndex[writingSegment].state = 'done'
                        this.transState = 'done'
                        return
                    }

                    if (
                        videoIndex[writingSegment].state == 'done' &&
                        this.transState != 'changing'
                    ) {
                        transcodeLogger.info(
                            'hlsProcessController',
                            'generateHlsProcess 6',
                            'break------------------------',
                            writingSegment,
                            writingSegmentId,
                        )
                        await this.killCurrentProcess()
                        let nextProcessId = writingSegmentId + 1
                        if (videoIndex[`index${nextProcessId}`]) {
                            while (videoIndex[`index${nextProcessId}`].state == 'done') {
                                if (nextProcessId >= Object.keys(videoIndex).length - 1) {
                                    transcodeLogger.info(
                                        'hlsProcessController',
                                        'generateHlsProcess 7',
                                        'end-------------------',
                                        nextProcessId,
                                    )
                                    break
                                } else {
                                    nextProcessId++
                                }
                            }
                            transcodeLogger.info(
                                'hlsProcessController',
                                'generateHlsProcess 7',
                                'continue-------------------',
                                `index${nextProcessId}`,
                            )
                            this.transState = 'changing'
                            await this.generateHlsProcess(`index${nextProcessId}`)
                        } else {
                            transcodeLogger.info(
                                'hlsProcessController',
                                'generateHlsProcess 7',
                                'end-------------------',
                                nextProcessId,
                            )
                        }
                    }
                }
            })
        } catch (error) {
            transcodeLogger.error('hlsProcessController', 'generateHlsProcess', error)
        }
        return this
    }
    async killCurrentProcess(fromUser?: boolean /* 调用是否来自用户操作 */) {
        const _this = this
        transcodeLogger.info('hlsProcessController killCurrentProcess init', this.taskId, fromUser)
        if (fromUser) {
            return new Promise<void>((resolve, reject) => {
                const i = setInterval(async () => {
                    try {
                        await _this.killCurrentProcess()
                        clearInterval(i)
                        clearTimeout(t)
                        resolve()
                    } catch (error) {}
                }, 500)
                const t = setTimeout(() => {
                    clearInterval(i)
                    clearTimeout(t)
                    reject()
                }, 5000)
            })
        } else {
            if (
                !this.currentProcess ||
                this.transState === 'init' ||
                this.currentProcess.exitCode === 0 ||
                this.currentProcess.exitCode === 1 ||
                this.transState === 'changing'
            ) {
                transcodeLogger.info(
                    'hlsProcessController killCurrentProcess reject',
                    this.taskId,
                    Boolean(this.currentProcess),
                    this.transState,
                )
                return this
            }
        }
        transcodeLogger.info('hlsProcessController', 'killCurrentProcess', 'start')
        this.transState = 'changing'
        try {
            await new Promise<void>((r, j) => {
                transcodeLogger.info('hlsProcessController', 'kill', 'start')
                if (this.currentProcess) {
                    kill(this.currentProcess.pid, 'SIGKILL', (err) => {
                        if (err) {
                            transcodeLogger.error(
                                'hlsProcessController',
                                'killCurrentProcess',
                                'error',
                                err,
                            )
                            j(err)
                        } else {
                            transcodeLogger.info(
                                'hlsProcessController killCurrentProcess close',
                                this.taskId,
                            )
                            r()
                        }
                    })
                } else {
                    return r()
                }
            })
            this.transState = 'stopped'
            transcodeLogger.info('hlsProcessController', 'killCurrentProcess', 'end')
        } catch (error) {
            this.transState = 'stop err'
            transcodeLogger.error(
                'hlsProcessController killCurrentProcess err',
                this.taskId,
                Boolean(this.currentProcess),
                this.transState,
            )
        }
    }
}

export default hlsProcessController
