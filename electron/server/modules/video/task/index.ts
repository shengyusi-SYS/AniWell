import { logger } from '@s/utils/logger'
import getVideoInfo, { VideoInfo } from './getVideoInfo'
import handleSubtitles from './handleSubtitles'
import selectMethod from './selectMethod'
import { ClientParams } from '@s/api/v1/library/handler/video'
import handleFonts from './handleFonts'
import DirectPlayHandler from './directPlayHandler'
import { v4 as uuidv4 } from 'uuid'
import { signAccessToken } from '@s/utils/jwt'
import HlsHandler from './hlsHandler/a'

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
    private videoInfo: VideoInfo
    private subtitleList
    private handler: VideoHandler
    private process
    public contentType
    public method
    public taskId: string
    public src: {
        url: string
        type: string
        sub?: Buffer
        fontsList?: Array<string>
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
        this.subtitleList = await handleSubtitles(filePath, this.videoInfo)
        await handleFonts(filePath)
        selectMethod(this.videoInfo, params)
        console.log('VideoTask videoInfo', this.videoInfo)
        if (this.videoInfo.method == 'direct') {
            logger.info('handleVideoRequest', 'start direct')
            this.handler = new DirectPlayHandler()
            await this.handler.init(this.videoInfo)
            this.src = {
                url: `/api/v1/video/${this.taskId}.mp4?token=${signAccessToken(user)}`,
                type: this.handler.contentType,
            }
        } else if (this.videoInfo.method == 'transcode') {
            this.handler = new HlsHandler(this.videoInfo)
            await this.handler.init(this.videoInfo)
            this.src = {
                url: `/api/v1/video/${this.taskId}.m3u8`,
                type: this.handler.contentType,
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
    public handleRequest(req, res) {
        return this.handler.handle(req, res)
    }
}
