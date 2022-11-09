const {logger} = require('../../utils/logger');
const getVideoInfo = require('./getVideoInfo');
const handleSubtitles = require('./handleSubtitles');
const selectMethod = require('./selectMethod');
const handleHlsRequest = require('./handleHlsRequest');
const handleTranscode = require('./handleTranscode');

var lastHlsProcessController
//处理视频请求，返回一个接收app的handler
async function handleVideoRequest(params) {
    try {
        logger.debug('handleVideoRequest params',params)
        let { filePath, bitrate, autoBitrate, resolution,SID } = params
        let videoInfo = await getVideoInfo(filePath)
        logger.debug('handleVideoRequest videoInfo',videoInfo)
        let subtitleList = await handleSubtitles(filePath,videoInfo)
        logger.debug('handleVideoRequest handleSubtitles',subtitleList)
        videoInfo = selectMethod(videoInfo, subtitleList,params)
        logger.debug('handleVideoRequest selectMethod')
        let handler
        if (videoInfo.method == 'direct') {
        } else if (videoInfo.method == 'transcode') {
            if (videoInfo.exist) {
            } else {
                logger.info('handleVideoRequest','start transcode')
                let HlsProcessController = await handleTranscode(videoInfo, subtitleList)
                if (lastHlsProcessController) {
                    await lastHlsProcessController.killCurrentProcess()
                }
                lastHlsProcessController = HlsProcessController
                await HlsProcessController.generateHlsProcess('index0')
                logger.debug('handleVideoRequest handleTranscode')
                let HandleHlsRequest = new handleHlsRequest(videoInfo.videoIndex,HlsProcessController)
                handler = HandleHlsRequest.handler
                logger.info('handleVideoRequest','end transcode',handler)
                return handler
            }
        } 
    } catch (error) {
        logger.error('handleVideoRequest',error)
    }

}

module.exports = handleVideoRequest