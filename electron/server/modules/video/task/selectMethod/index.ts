import { logger } from '@s/utils/logger'
import { ClientParams } from '@s/api/v1/library/handler/video'
import { VideoInfo } from '@s/modules/video/task/getVideoInfo'

//根据视频信息选择合适的处理方法，以后可能加入客户端信息
let tempInfo
function selectMethod(videoInfo: VideoInfo, params: ClientParams) {
    logger.debug('selectMethod', 'start')
    const { filePath, bitrate, autoBitrate, resolution, user, method } = params
    videoInfo.filePath = filePath
    //直接串流的条件比较苛刻，如果主流设备都能直接播放h265，就没我什么事了...
    if (
        (videoInfo.codec === 'h264' &&
            videoInfo.pix_fmt === 'yuv420p' &&
            videoInfo.bitrate <= bitrate &&
            !(videoInfo.subtitleList.length > 0)) ||
        method === 'direct'
    ) {
        videoInfo.method = 'direct'
    } else {
        let targetBitrate = bitrate
        if (autoBitrate) {
            if (videoInfo.bitrate * 1.5 <= bitrate) {
                targetBitrate = bitrate
            } else if (videoInfo.bitrate >= bitrate * 1.5) {
                targetBitrate = bitrate * 1.5
            } else {
                targetBitrate = videoInfo.bitrate * 1.2
            }
        }
        videoInfo.targetBitrate = targetBitrate
        videoInfo.targetResolution = '1080p'
        videoInfo.method = 'transcode'
    }
    // logger.debug('selectMethod','~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',JSON.stringify(videoInfo),JSON.stringify(tempInfo))
    if (!videoInfo.cleared && tempInfo) {
        delete videoInfo.cleared
        delete tempInfo.cleared
        if (JSON.stringify(videoInfo) == JSON.stringify(tempInfo)) {
            videoInfo.exist = true
        } else {
            tempInfo = JSON.parse(JSON.stringify(videoInfo))
            videoInfo.exist = false
        }
    } else {
        tempInfo = JSON.parse(JSON.stringify(videoInfo))
        videoInfo.exist = false
    }
    logger.debug('selectMethod', 'end+++++++++++++++++++++++++++++++++++++++++', videoInfo)
    return videoInfo
}
export default selectMethod
