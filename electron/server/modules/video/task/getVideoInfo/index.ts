import { logger } from '@s/utils/logger'
import { getScreenedMediaInfo, ScreenedMediaInfo } from '@s/utils/media/getMediaInfo'
import settings from '@s/store/settings'
import { access } from 'fs/promises'
import path from 'path'
import { subInfo } from '../handleSubtitles'
import { fontInfo } from '../handleFonts'

export interface VideoInfo {
    filePath: string
    index: ScreenedMediaInfo['vidoeStream']['index']
    codec: ScreenedMediaInfo['vidoeStream']['codec_name']
    audioCodec: string
    bitrate: number
    duration: number
    width: number
    height: number
    frame_rate: number
    pix_fmt: string
    colorSpace: string
    subtitleStreams: ScreenedMediaInfo['subtitleStreams']
    chapters: ScreenedMediaInfo['chapters']
    // cleared,
    platform: string
    encode: string
    subtitleList?: Array<subInfo>
    fontsList?: Array<fontInfo>
    taskId?: string
    method?: string
    targetBitrate?: number
    targetResolution?: string
    exist?: boolean
}

export default async function getVideoInfo(filePath): Promise<VideoInfo> {
    try {
        logger.debug('getVideoInfo', 'start')
        const metadata = await getScreenedMediaInfo(filePath)

        const { format, vidoeStream, audioStreams, subtitleStreams } = metadata
        const { bit_rate, duration } = format
        const { codec_name, width, height, pix_fmt, r_frame_rate, color_space, index } = vidoeStream
        const videoInfo = {
            filePath: format.filename,
            index,
            codec: codec_name,
            audioCodec: audioStreams[0]?.codec_name,
            bitrate: bit_rate,
            duration,
            width,
            height,
            frame_rate: Number(r_frame_rate.split('/')[0]) / 1000,
            pix_fmt,
            colorSpace: color_space,
            subtitleStreams,
            chapters: metadata.chapters,
            // cleared,
            platform: settings.transcode.platform,
            encode: settings.transcode.encode,
        }
        logger.debug('getVideoInfo', 'end')
        return videoInfo
    } catch (error) {
        logger.error('getVideoInfo err', error)
    }
}
