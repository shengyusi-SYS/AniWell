const logger = require('../../../utils/logger').logger;
const {Ffmpeg} = require('../../../utils/init');
function getVideoInfo(filePath) {
    return new Promise((r, j) => {
        Ffmpeg.ffprobe(filePath, function (err, metadata) {
            logger.debug('getVideoInfo metadata',metadata);
            if (err) {
                return j(err)
            }
            logger.info('getVideoInfo streams[0]', metadata.streams[0]);
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
                subtitleStream
            }
            logger.info('getVideoInfo videoInfo',videoInfo);
            return r(videoInfo)
        })
    }).catch(e => logger.error('getVideoInfo', e))
}

module.exports = getVideoInfo