import { logger } from '@s/utils/logger'
import init from '@s/utils/init'
const { Ffmpeg, settings } = init
import { access } from 'fs/promises'
import path from 'path'
async function getVideoInfo(filePath) {
    try {
        const res: Promise<object | Error> = await new Promise((r, j) => {
            Ffmpeg.ffprobe(filePath, async (err: Error, metadata: object) => {
                // logger.debug('getVideoInfo metadata',metadata);
                if (err) {
                    j(err)
                }
                // logger.info('getVideoInfo streams[0]', metadata.streams[0]);
                const { bit_rate, duration } = { ...metadata.format }
                const vidoeStream = metadata.streams.find((v) => {
                    return v.codec_type == 'video'
                })
                const audioStream = metadata.streams.find((v) => {
                    return v.codec_type == 'audio'
                })
                const subtitleStream = []
                metadata.streams.forEach((v) => {
                    if (v.codec_type == 'subtitle') {
                        subtitleStream.push(v)
                    }
                })
                const { codec_name, width, height, pix_fmt, r_frame_rate, color_space, index } = {
                    ...vidoeStream,
                }
                let cleared
                try {
                    await access(path.resolve(settings.tempPath, 'output', 'index.m3u8'))
                    cleared = false
                } catch (error) {
                    cleared = true
                    logger.info('getVideoInfo', '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~cleared', error)
                }
                const videoInfo = {
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
                    platform: settings.platform,
                    encode: settings.encode,
                }
                logger.debug('getVideoInfo', 'end')
                r(videoInfo)
            })
        })
        return res
    } catch (error) {
        logger.error('getVideoInfo err', error)
    }
}

export default getVideoInfo
