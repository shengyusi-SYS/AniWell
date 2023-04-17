import { logger, transcodeLogger } from '@s/utils/logger'
import getVideoInfo, { VideoInfo } from './getVideoInfo'
import handleSubtitles, { subInfo } from './handleSubtitles'
import selectMethod from './selectMethod'
import { ClientParams } from '@s/api/v1/library/handler/video'
import handleFonts from './handleFonts'
import DirectPlayHandler from './directPlayHandler'
import { v4 as uuidv4 } from 'uuid'
import { signAccessToken } from '@s/utils/jwt'
import HlsHandler from './hlsHandler'
import { readFileSync } from 'fs'
import { Request, Response } from 'express'
import { fontInfo } from '@s/store/fonts'

export interface IVideoTask {
    taskId: string
    init: (params: ClientParams) => Promise<void>
    stop: () => Promise<void>
}

export interface VideoHandler {
    contentType: string
    init: ({
        videoInfo,
    }: {
        videoInfo: VideoInfo
        params?: ClientParams
        taskId?: string
    }) => Promise<void>
    handle: (req: Request, res: Response) => Promise<void>
    stop: () => Promise<void>
}

export default class VideoTask implements IVideoTask {
    public videoInfo: VideoInfo
    public handler: VideoHandler
    public taskId: string
    public src: {
        url: string
        type: string
        fontsList: Array<fontInfo>
        subtitleList: Array<subInfo>
        chapters: VideoInfo['chapters']
    }
    constructor() {}
    /**
     * init
     */
    public async init(params: ClientParams) {
        const { filePath, libName, bitrate, autoBitrate, resolution, method, user } = params
        this.taskId = uuidv4()
        try {
            this.videoInfo = await getVideoInfo(filePath, libName)
        } catch (error) {
            logger.error('VideoTask init getVideoInfo error', error)
            return Promise.reject(error)
        }
        this.videoInfo.taskId = this.taskId

        await handleSubtitles(this.videoInfo)
        await handleFonts(this.videoInfo)
        selectMethod(this.videoInfo, params)

        console.log('VideoTask videoInfo', this.videoInfo)
        const subList: Array<subInfo> = this.videoInfo.subtitleList.map((v) => {
            return {
                ...v,
                url: `/api/v1/video/sub?id=${v.id}&codec=${v.codec}&index=${
                    v.subStreamIndex || ''
                }`,
            }
        })
        if (this.videoInfo.method == 'direct') {
            logger.info('handleVideoRequest', 'start direct')

            this.handler = new DirectPlayHandler()
            await this.handler.init({ videoInfo: this.videoInfo })

            this.src = {
                url: `/api/v1/video/src/${this.taskId}.mp4?token=${signAccessToken(user)}`,
                type: this.handler.contentType,
                subtitleList: subList,
                fontsList: this.videoInfo.fontsList,
                chapters: this.videoInfo.chapters,
            }
        } else if (this.videoInfo.method == 'transcode') {
            logger.info('handleVideoRequest', 'start transcode')
            this.handler = new HlsHandler()
            await this.handler.init({
                videoInfo: this.videoInfo,
                params,
                taskId: this.taskId,
            })
            this.src = {
                url: `/api/v1/video/src/index.m3u8?taskId=${this.taskId}&token=${signAccessToken(
                    user,
                )}`,
                // url: `/api/v1/video/src/${this.taskId}.m3u8?token=${signAccessToken(user)}`,
                type: this.handler.contentType,
                subtitleList: subList,
                fontsList: this.videoInfo.fontsList,
                chapters: this.videoInfo.chapters,
            }
        }
    }
    /**
     * stop
     */
    public async stop() {
        transcodeLogger.log('task stop..............', this.taskId)
        await this.handler.stop()
        return
    }
    /**
     * handleRequest
     */
    public async handleRequest(req, res) {
        await this.handler.handle(req, res)
        return
    }
}
