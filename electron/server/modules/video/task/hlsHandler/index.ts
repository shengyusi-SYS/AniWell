import { logger } from '@s/utils/logger'
import generateFFmpegCommand from './generateFFmpegCommand'
import hlsProcessController from './hlsProcessController'
import { generateM3U8 } from './generateM3U8'
async function handleTranscode(videoInfo, subtitleList) {
    try {
        // logger.debug('handleTranscode','start',videoInfo,subtitleList)
        await generateM3U8(videoInfo)
        const commandTemplate = await generateFFmpegCommand(videoInfo, subtitleList)
        const HlsProcessController = new hlsProcessController(videoInfo, commandTemplate)
        logger.debug('handleTranscode', 'end')
        return HlsProcessController
    } catch (error) {
        logger.error('handleTranscode', error)
    }
}

import { VideoHandler } from '@s/modules/video/task'
import { ClientParams } from '@s/api/v1/library/handler/video'
export default class HlsHandler implements VideoHandler {
    contentType: string
    /**
     * init
     */
    public async init(params: ClientParams) {
        try {
            // logger.debug('handleTranscode','start',videoInfo,subtitleList)
            this.contentType = 'application/x-mpegURL'
            await generateM3U8(videoInfo)
            const commandTemplate = await generateFFmpegCommand(videoInfo, subtitleList)
            const HlsProcessController = new hlsProcessController(videoInfo, commandTemplate)
            logger.debug('handleTranscode', 'end')
            return HlsProcessController
        } catch (error) {
            logger.error('handleTranscode', error)
        }
    }
    /**
     * handle
     */
    public async handle(req: any, res: any) {}
}
