
const {logger} = require('../../../utils/logger');
var tempInfo
function selectMethod(videoInfo, subtitleList,params) {
    logger.debug('selectMethod','start',videoInfo,params)
    let { filePath, bitrate, autoBitrate, resolution,SID,method } = params
    videoInfo.filePath = filePath
    if (videoInfo.bitrate<=bitrate*1000000&&method=='direct') {
        videoInfo.method = 'direct'
    } else {
        let targetBitrate = bitrate
        if (autoBitrate) {
            if (videoInfo.bitrate * 1.5 <= bitrate * 1000000) {
                targetBitrate = bitrate * 1000000
            } else if (videoInfo.bitrate >= bitrate * 1000000 * 1.5) {
                targetBitrate = bitrate * 1000000 * 1.5
            } else {
                targetBitrate = videoInfo.bitrate * 1.2
            }
        }
        videoInfo.targetBitrate = targetBitrate
        videoInfo.targetResolution = '1080p'
        videoInfo.method = 'transcode'
        videoInfo.SID = SID
    }
    if (JSON.stringify(videoInfo)==JSON.stringify(tempInfo)) {
        videoInfo.exist = true
    }else {
        tempInfo = JSON.parse(JSON.stringify(videoInfo))
        videoInfo.exist = false
    }
    logger.debug('selectMethod','end+++++++++++++++++++++++++++++++++++++++++',videoInfo.method,videoInfo.exist)
    return videoInfo
}
module.exports = selectMethod