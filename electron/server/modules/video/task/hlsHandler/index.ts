import { logger } from '@s/utils/logger'
import generateFFmpegCommand from './generateFFmpegCommand'
import HlsProcessController from './hlsProcessController'
import { generateM3U8 } from './generateM3U8'
import HlsRequestHandler from './hlsRequestHandler'
import { VideoHandler } from '@s/modules/video/task'
import { ClientParams } from '@s/api/v1/library/requestHandler/video'
import { VideoInfo } from '../getVideoInfo'

export default class HlsHandler implements VideoHandler {
    contentType: string
    processController: HlsProcessController
    requestHandler: HlsRequestHandler
    /**
     * init
     */
    public async init({
        videoInfo,
        params,
        taskId,
    }: {
        videoInfo: VideoInfo
        params: ClientParams
        taskId: string
    }) {
        try {
            // logger.debug('handleTranscode','start',videoInfo,subtitleList)
            this.contentType = 'application/x-mpegURL'
            await generateM3U8(videoInfo)
            const commandTemplate = await generateFFmpegCommand(videoInfo)
            this.processController = new HlsProcessController()
            await this.processController.init(videoInfo, commandTemplate)
            this.requestHandler = new HlsRequestHandler()
            await this.requestHandler.init({
                videoInfo,
                HlsProcessController: this.processController,
            })
            logger.debug('handleTranscode', 'end')
        } catch (error) {
            logger.error('handleTranscode', error)
        }
    }
    /**
     * handle
     */
    public async handle(req: any, res: any) {
        return this.requestHandler.handler(req, res)
    }
    public async stop() {
        this.handle = async (req, res) => {
            res.status(400).json({ error: 'task stopped' })
        }
        await this.requestHandler.clearVideoTemp(true)
    }
}
