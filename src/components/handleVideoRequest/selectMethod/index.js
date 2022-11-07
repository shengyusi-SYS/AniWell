
const {logger} = require('../../../utils/logger');

function selectMethod(videoInfo, subtitleList,params) {
    logger.debug('selectMethod','start')
    let { filePath, bitrate, autoBitrate, resolution,SID } = params
    videoInfo.filePath = filePath
    videoInfo.targetBitrate = 5* 1000000
    videoInfo.targetResolution = '1080p'
    videoInfo.exist = false
    videoInfo.method = 'transcode'
    videoInfo.SID = SID
    logger.debug('selectMethod','end')
    return videoInfo
}
module.exports = selectMethod