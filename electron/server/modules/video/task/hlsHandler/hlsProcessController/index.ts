import { logger, transcodeLogger } from '@s/utils/logger'
import { access } from 'fs/promises'
import path from 'path'
import init from '@s/utils/init'
const { ffmpegSuffix } = init
import  settings  from '@s/store/settings'
import kill from 'tree-kill'
import { spawn } from 'child_process'
import { debounce } from 'lodash'
import fs from 'fs'
//转码串流的核心，进程控制系统，测试感觉挺完善了（删）
let _this
class hlsProcessController {
    constructor(videoInfo = {}, commandTemplate = {}) {
        logger.info('hlsProcessController', 'constructor', 'start')
        _this = this
        this.videoInfo = videoInfo
        this.commandTemplate = commandTemplate
        this.currentProcess = null
        this.processList = []
        this.transState = 'init'
        logger.info('hlsProcessController', 'constructor', 'end')
    }
    async generateHlsProcess(segment) {
        try {
            logger.info('hlsProcessController', 'generateHlsProcess 1', 'start', segment)
            await this.killCurrentProcess()
            const videoIndex = this.videoInfo.videoIndex
            const params = this.commandTemplate(videoIndex[segment].start, segment)
            this.transState = 'doing'
            const initSegmentId = videoIndex[segment].id
            const initSegmentState = videoIndex[segment].state
            if (initSegmentId == Object.keys(videoIndex).length - 1 && initSegmentState == 'done') {
                return
            }

            logger.debug(
                'hlsProcessController',
                'generateHlsProcess 2',
                'ffmpegPath',
                path.resolve(settings.get('ffmpegPath'), `ffmpeg${ffmpegSuffix}`),
            )
            const ffmpeg = spawn(
                settings.get('ffmpegPath')
                    ? `"${path.resolve(settings.get('ffmpegPath'), `ffmpeg${ffmpegSuffix}`)}"`
                    : 'ffmpeg',
                params,
                { shell: true },
            )
            ffmpeg.id = initSegmentId
            this.currentProcess = ffmpeg
            this.processList.push(ffmpeg)
            ffmpeg.queue = []
            logger.info(
                'hlsProcessController',
                'generateHlsProcess 3',
                'start------------------------' + segment,
            )
            logger.info('hlsProcessController', 'generateHlsProcess 4', [params.join(' ')])
            transcodeLogger.info('transcode', [params.join(' ')])
            // let lastWriteId
            ffmpeg.stderr.on('data', async function (stderrLine) {
                stderrLine = stderrLine.toString()
                transcodeLogger.info('transcode', `~${stderrLine}`)
                const isWriting = stderrLine.match(/Opening.*index\d+\.ts\.tmp.*?for writing/)
                if (isWriting) {
                    //打脸来得太快了，任务密集时，信息输出会合并为一条，需要匹配全部
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
                                        settings.get('tempPath'),
                                        'output',
                                        `${lastWriteSegment}.ts`,
                                    ),
                                )
                                videoIndex[lastWriteSegment].state = 'done'
                                ffmpeg.queue.push(lastWriteSegment)
                                logger.info(
                                    'hlsProcessController',
                                    'generateHlsProcess 5',
                                    lastWriteSegment,
                                    'done',
                                )
                            } catch (error) {
                                if (videoIndex[lastWriteSegment].state != 'init') {
                                    videoIndex[lastWriteSegment].state = 'err'
                                    logger.error(
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
                        logger.info(
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
                        logger.info(
                            'hlsProcessController',
                            'generateHlsProcess 6',
                            'break------------------------',
                            writingSegment,
                            writingSegmentId,
                        )
                        await _this.killCurrentProcess()
                        let nextProcessId = writingSegmentId + 1
                        if (videoIndex[`index${nextProcessId}`]) {
                            while (videoIndex[`index${nextProcessId}`].state == 'done') {
                                if (nextProcessId >= Object.keys(videoIndex).length - 1) {
                                    logger.info(
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
                            logger.info(
                                'hlsProcessController',
                                'generateHlsProcess 7',
                                'continue-------------------',
                                `index${nextProcessId}`,
                            )
                            this.transState = 'changing'
                            await _this.generateHlsProcess(`index${nextProcessId}`)
                        } else {
                            logger.info(
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
            logger.error('hlsProcessController', 'generateHlsProcess', error)
        }
        return this
    }
    async killCurrentProcess() {
        try {
            logger.info('hlsProcessController', 'killCurrentProcess', 'init')
            if (
                !this.currentProcess ||
                this.currentProcess.exitCode == 0 ||
                this.currentProcess.exitCode == 1 ||
                this.transState == 'changing'
            ) {
                return this
            } else {
                logger.info('hlsProcessController', 'killCurrentProcess', 'start')
                this.transState = 'changing'
                await new Promise((r, j) => {
                    logger.info('hlsProcessController', 'kill', 'start')
                    // let tempProcessList = JSON.parse(JSON.stringify(this.processList))
                    if (this.currentProcess) {
                        this.currentProcess.on('close', (code) => {
                            logger.info('hlsProcessController', 'killCurrentProcess', 'close', code)
                            return r()
                        })
                        // this.currentProcess.on('exit', () => {
                        //     logger.info('hlsProcessController','killCurrentProcess', 'exit');
                        //     return r()
                        // })
                        this.currentProcess.on('error', (err) => {
                            logger.error('hlsProcessController', 'killCurrentProcess', 'error', err)
                            return r(err)
                        })
                        kill(this.currentProcess.pid, 'SIGKILL')
                    } else {
                        return r()
                    }
                })
                this.transState = 'stopped'
            }

            logger.info('hlsProcessController', 'killCurrentProcess', 'end')
            return this
        } catch (error) {
            logger.error('hlsProcessController', ' killCurrentProcess', error)
        }
    }
}

export default hlsProcessController
