import { logger } from '@s/utils/logger'
import { mediaContentType } from '@s/utils'
import path from 'path'
import getVideoInfo from './getVideoInfo'
import handleSubtitles from './handleSubtitles'
import selectMethod from './selectMethod'
import { hlsRequestHandler } from './hlsRequestHandler'
import handleTranscode from './handleTranscode'
import { directPlayHandler } from './directPlayHandler'
import handleFonts from './handleFonts'
let lastHlsProcessController
let lastHandler
//处理视频请求，返回一个接收app的handler
async function handleVideoRequest(params) {
    try {
        logger.debug('handleVideoRequest params', params)
        const { filePath, bitrate, autoBitrate, resolution, SID } = params
        const fonts = handleFonts(filePath)
        logger.debug('handleVideoRequest handleFonts')
        let videoInfo = await getVideoInfo(filePath)
        logger.debug('handleVideoRequest videoInfo')
        const subtitleList = await handleSubtitles(filePath, videoInfo)
        logger.debug('handleVideoRequest handleSubtitles', subtitleList)
        videoInfo = selectMethod(videoInfo, params)
        logger.debug('handleVideoRequest selectMethod')
        let handler
        if (videoInfo.method == 'direct') {
            logger.info('handleVideoRequest', 'start direct')
            directPlayHandler.init(videoInfo)
            handler = directPlayHandler
            handler.contentType = mediaContentType(videoInfo.filePath)
        } else if (videoInfo.method == 'transcode') {
            if (videoInfo.exist) {
                handler = hlsRequestHandler
            } else {
                logger.info('handleVideoRequest', 'start transcode')
                if (lastHlsProcessController) {
                    await lastHlsProcessController.killCurrentProcess()
                }
                const HlsProcessController = await handleTranscode(videoInfo, subtitleList)
                await fonts
                lastHlsProcessController = HlsProcessController
                await HlsProcessController.generateHlsProcess('index0')
                logger.debug('handleVideoRequest handleTranscode')
                hlsRequestHandler.init(videoInfo.videoIndex, HlsProcessController)
                handler = hlsRequestHandler
                logger.debug('handleVideoRequest', 'end transcode', videoInfo)
            }
            handler.contentType = 'application/x-mpegURL'
        }
        handler.method = videoInfo.method
        handler.id = path.basename(videoInfo.filePath)
        logger.info('handleVideoRequest', 'end')
        return handler
    } catch (error) {
        logger.error('handleVideoRequest', error)
    }
}

export default handleVideoRequest
