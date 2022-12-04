const { logger } = require('../../utils/logger');
const { mediaContentType } = require('../../utils');
const path = require('path');
const getVideoInfo = require('./getVideoInfo');
const handleSubtitles = require('./handleSubtitles');
const selectMethod = require('./selectMethod');
const hlsRequestHandler = require('./hlsRequestHandler');
const handleTranscode = require('./handleTranscode');
const directPlayHandler = require('./directPlayHandler');
const handleFonts = require('./handleFonts');
var lastHlsProcessController
var lastHandler
//处理视频请求，返回一个接收app的handler
async function handleVideoRequest(params) {
    try {
        logger.debug('handleVideoRequest params', params)
        let { filePath, bitrate, autoBitrate, resolution, SID } = params
        let fonts = handleFonts(filePath)
        logger.debug('handleVideoRequest handleFonts')
        let videoInfo = await getVideoInfo(filePath)
        logger.debug('handleVideoRequest videoInfo')
        let subtitleList = await handleSubtitles(filePath, videoInfo)
        logger.debug('handleVideoRequest handleSubtitles', subtitleList)
        videoInfo = selectMethod(videoInfo, params)
        logger.debug('handleVideoRequest selectMethod')
        let handler
        if (videoInfo.method == 'direct') {
            logger.info('handleVideoRequest', 'start direct')
            let DirectPlayHandler = new directPlayHandler(videoInfo)
            handler = DirectPlayHandler.handler
            handler.contentType = mediaContentType(videoInfo.filePath)
        } else if (videoInfo.method == 'transcode') {
            if (videoInfo.exist) {
                handler = lastHandler
            } else {
                logger.info('handleVideoRequest', 'start transcode')
                if (lastHlsProcessController) {
                    await lastHlsProcessController.killCurrentProcess()
                }
                let HlsProcessController = await handleTranscode(videoInfo, subtitleList)
                await fonts
                lastHlsProcessController = HlsProcessController
                await HlsProcessController.generateHlsProcess('index0')
                logger.debug('handleVideoRequest handleTranscode')
                let HlsRequestHandler = new hlsRequestHandler(videoInfo.videoIndex, HlsProcessController)
                handler = HlsRequestHandler.handler
                lastHandler = handler
                logger.debug('handleVideoRequest', 'end transcode',videoInfo)
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