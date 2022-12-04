const {logger} = require('../../../utils/logger');
const {Ffmpeg} = require('../../../utils/init');
const { access } = require('fs/promises');
const {settings} = require('../../../utils/init');
const path = require('path');
function getVideoInfo(filePath) {
    return new Promise((r, j) => {
        Ffmpeg.ffprobe(filePath, async (err, metadata)=>{
            // logger.debug('getVideoInfo metadata',metadata);
            if (err) {
                return j(err)
            }
            // logger.info('getVideoInfo streams[0]', metadata.streams[0]);
            let {
                bit_rate,
                duration
            } = { ...metadata.format }
            let vidoeStream = metadata.streams.find((v) => {
                return v.codec_type == 'video'
            })
            let audioStream = metadata.streams.find((v) => {
                return v.codec_type == 'audio'
            })
            let subtitleStream = []
            metadata.streams.forEach((v) => {
                if (v.codec_type == 'subtitle') {
                    subtitleStream.push(v)
                }
            })
            let {
                codec_name,
                width,
                height,
                pix_fmt,
                r_frame_rate,
                color_space,
                index
            } = { ...vidoeStream }
            let cleared 
            try {
                await access(path.resolve(settings.tempPath, 'output','index.m3u8'))
                cleared = false
            } catch (error) {
                cleared = true
                logger.info('getVideoInfo','~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~cleared',error);
            }
            let videoInfo = {
                index,
                codec: codec_name,
                audioCodec: audioStream.codec_name,
                bitrate: bit_rate,
                duration,
                width,
                height,
                frame_rate: r_frame_rate.split('/')[0] / 1000,
                pix_fmt,
                colorSpace: color_space,
                subtitleStream,
                cleared,
                platform:settings.platform,
                encode:settings.encode
            }
            logger.debug('getVideoInfo','end');
            return r(videoInfo)
        })
    }).catch(e => logger.error('getVideoInfo err', e))
}

module.exports = getVideoInfo