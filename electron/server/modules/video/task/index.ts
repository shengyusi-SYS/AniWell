import { logger } from '@s/utils/logger'
import getVideoInfo, { VideoInfo } from './getVideoInfo'
import handleSubtitles, { subInfo } from './handleSubtitles'
import selectMethod from './selectMethod'
import { ClientParams } from '@s/api/v1/library/handler/video'
import handleFonts, { fontInfo } from './handleFonts'
import DirectPlayHandler from './directPlayHandler'
import { v4 as uuidv4 } from 'uuid'
import { signAccessToken } from '@s/utils/jwt'
import HlsHandler from './hlsHandler/a'
import { readFileSync } from 'fs'
import { Request, Response } from 'express'

export interface IVideoTask {
    taskId: string
    init: (params: ClientParams) => Promise<void>
    stop: () => Promise<void>
}

export interface VideoHandler {
    contentType: string
    init: (params: ClientParams) => Promise<void>
    handle: (req, res) => Promise<void>
    stop: () => Promise<void>
}

export default class VideoTask implements IVideoTask {
    public videoInfo: VideoInfo
    public subtitleList: Array<subInfo>
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
        const { filePath, bitrate, autoBitrate, resolution, user, method } = params //测试，待删
        this.taskId = uuidv4()
        this.videoInfo = await getVideoInfo(filePath)
        this.videoInfo.taskId = this.taskId

        this.subtitleList = await handleSubtitles(this.videoInfo)
        await handleFonts(this.videoInfo)
        selectMethod(this.videoInfo, params)

        console.log('VideoTask videoInfo', this.videoInfo)
        const subList: Array<subInfo> = JSON.parse(
            JSON.stringify(this.subtitleList),
        ) as Array<subInfo>
        subList.forEach((v) => {
            delete v.path
            v.url = `/api/v1/video/sub?id=${v.id}&codec=${v.codec}&index=${v.subStreamIndex || ''}`
        })

        if (this.videoInfo.method == 'direct') {
            logger.info('handleVideoRequest', 'start direct')

            this.handler = new DirectPlayHandler()
            await this.handler.init(this.videoInfo)

            this.src = {
                url: `/api/v1/video/src/${this.taskId}.mp4?token=${signAccessToken(user)}`,
                type: this.handler.contentType,
                subtitleList: subList,
                fontsList: this.videoInfo.fontsList,
                chapters: this.videoInfo.chapters,
            }
        } else if (this.videoInfo.method == 'transcode') {
            this.handler = new HlsHandler()
            await this.handler.init(this.videoInfo)
            this.src = {
                url: `/api/v1/video/src/${this.taskId}.m3u8?token=${signAccessToken(user)}`,
                type: this.handler.contentType,
                subtitleList: subList,
            }
        }
    }
    /**
     * stop
     */
    public async stop() {
        return this.handler.stop()
    }
    /**
     * handleRequest
     */
    public async handleRequest(req, res) {
        await this.handler.handle(req, res)
        return
    }
}