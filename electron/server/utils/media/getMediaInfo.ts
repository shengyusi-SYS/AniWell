import { spawnSync, spawn } from 'child_process'
import settings from '@s/store/settings'
import path from 'path'
import init from '@s/utils/init'
import MP4Box from 'mp4box'
import { readChunkSync, toNumberDeep } from '@s/utils'

export function getMediaInfoSync(filePath: string): Promise<MediaInfo> {
    const ffprobePath = settings.get('ffmpegPath')
        ? `"${path.resolve(settings.get('ffmpegPath'), `ffprobe${init.ffmpegSuffix}`)}"`
        : 'ffprobe'
    const process = spawnSync(
        ffprobePath,
        [
            `-i "${path.resolve(filePath)}"`,
            '-show_streams',
            '-show_format',
            '-print_format json',
            '-hide_banner',
        ],
        { shell: true },
    )
    const result = JSON.parse(process.stdout.toString())
    return result
}

export async function getMediaInfo(filePath: string): Promise<MediaInfo> {
    const ffprobePath = settings.get('ffmpegPath')
        ? `"${path.resolve(settings.get('ffmpegPath'), `ffprobe${init.ffmpegSuffix}`)}"`
        : 'ffprobe'
    return new Promise((resolve, reject) => {
        const process = spawn(
            ffprobePath,
            [
                `-i "${path.resolve(filePath)}"`,
                '-show_streams',
                '-show_format',
                '-show_chapters',
                '-print_format json',
                '-hide_banner',
            ],
            { shell: true },
        )
        let info = ''
        process.stdout.on('data', (data) => {
            info += data.toString()
        })
        process.on('exit', (code) => {
            if (code === 0) {
                const result = JSON.parse(info)
                resolve(toNumberDeep(result))
            } else {
                reject()
            }
        })
    })
}

export async function getScreenedMediaInfo(filePath: string): Promise<ScreenedMediaInfo> {
    const metadata = await getMediaInfo(filePath)
    const vidoeStream = metadata.streams.find((v) => {
        return v.codec_type == 'video'
    })
    const audioStreams = metadata.streams.filter((v) => {
        return v.codec_type == 'audio'
    })
    const subtitleStreams = metadata.streams.filter((v) => {
        return v.codec_type == 'subtitle'
    })
    const chapters = metadata.chapters.map((v) => {
        return {
            title: v.tags.title,
            start: v.start_time,
        }
    })
    return {
        format: metadata.format,
        vidoeStream,
        audioStreams,
        subtitleStreams,
        chapters,
    }
}

export async function getVideoMimeType(filePath: string) {
    const readMediaHeader = () => {
        if (path.extname(filePath) === '.mkv') {
            //ffmpeg不能直接获得标准的mime codec，MP4box不能直接解析mkv格式，就很烦
            //解决方案：ffmpeg提取MP4格式的视频头，交给MP4box解析
            return null
        } else {
            return readChunkSync(filePath, { length: 5 * 1024 * 1024 })
        }
    }
    const mp4boxfile = MP4Box.createFile()
    const chunk = readMediaHeader()
    if (!chunk) {
        return Promise.reject()
    }
    const arrayBuffer = new Uint8Array(chunk).buffer
    arrayBuffer.fileStart = 0
    return new Promise<string | Error>((resolve, reject) => {
        mp4boxfile.onReady = (info) => {
            resolve(info?.mime)
        }
        mp4boxfile.onError = function (e) {
            reject(e)
        }
        mp4boxfile.appendBuffer(arrayBuffer)
    })
}

export interface StreamInfo {
    index?: number
    codec_name?: string
    codec_long_name?: string
    profile?: string
    codec_type?: string
    codec_tag_string?: string
    codec_tag?: string
    width?: number
    height?: number
    coded_width?: number
    coded_height?: number
    closed_captions?: number
    film_grain?: number
    has_b_frames?: number
    sample_aspect_ratio?: string
    display_aspect_ratio?: string
    pix_fmt?: string
    level?: number
    color_range?: string
    chroma_location?: string
    refs?: number
    r_frame_rate?: string
    avg_frame_rate?: string
    time_base?: string
    start_pts?: number
    start_time?: string
    nb_frames?: number
    extradata_size?: number
    color_space?: string
    disposition?: Array<{
        default?: number
        dub?: number
        original?: number
        comment?: number
        lyrics?: number
        karaoke?: number
        forced?: number
        hearing_impaired?: number
        visual_impaired?: number
        clean_effects?: number
        attached_pic?: number
        timed_thumbnails?: number
        captions?: number
        descriptions?: number
        metadata?: number
        dependent?: number
        still_image?: number
    }>
    tags: Array<{
        language?: string
        handler_name?: string
        vendor_id?: string
    }>
}

export interface Chapter {
    id: number
    time_base: string
    start: number
    start_time: number
    end: number
    end_time: number
    tags: { title: string }
}

export interface MediaInfo {
    streams: Array<StreamInfo>
    format: {
        filename?: string
        nb_streams?: number
        nb_programs?: number
        format_name?: string
        format_long_name?: string
        start_time?: number
        duration?: number
        size?: number
        bit_rate?: number
        probe_score?: number
        tags: {
            encoder?: string
            creation_time?: string
            major_brand?: string
            minor_version?: number
            compatible_brands?: string
        }
    }
    chapters: Array<Chapter>
}

export interface ScreenedMediaInfo {
    format: MediaInfo['format']
    vidoeStream: StreamInfo
    audioStreams: Array<StreamInfo>
    subtitleStreams: Array<StreamInfo>
    chapters: Array<{
        title: string
        start: number
    }>
}
