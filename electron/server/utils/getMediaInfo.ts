import { spawnSync, spawn } from 'child_process'
import settings from '@s/store/settings'
import path from 'path'
import init from '@s/utils/init'

const ffprobePath = settings.get('ffmpegPath')
    ? `"${path.resolve(settings.get('ffmpegPath'), `ffprobe${init.ffmpegSuffix}`)}"`
    : 'ffprobe'
export function getMediaInfoSync(filePath: string) {
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

export async function getMediaInfo(filePath: string) {
    return new Promise((resolve, reject) => {
        const process = spawn(
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
        let info = ''
        process.stdout.on('data', (data) => {
            info += data.toString()
        })
        process.on('exit', (code) => {
            if (code === 0) {
                const result = JSON.parse(info)
                resolve(result)
            } else {
                reject()
            }
        })
    })
}

// export interface
const mediaInfo = {
    streams: [
        {
            index: 0,
            codec_name: 'hevc',
            codec_long_name: 'H.265 / HEVC (High Efficiency Video Coding)',
            profile: 'Main 10',
            codec_type: 'video',
            codec_tag_string: '[0][0][0][0]',
            codec_tag: '0x0000',
            width: 1920,
            height: 1080,
            coded_width: 1920,
            coded_height: 1080,
            closed_captions: 0,
            film_grain: 0,
            has_b_frames: 2,
            sample_aspect_ratio: '1:1',
            display_aspect_ratio: '16:9',
            pix_fmt: 'yuv420p10le',
            level: 150,
            color_range: 'tv',
            chroma_location: 'left',
            refs: 1,
            r_frame_rate: '24000/1001',
            avg_frame_rate: '24000/1001',
            time_base: '1/1000',
            start_pts: 0,
            start_time: '0.000000',
            extradata_size: 1092,
            disposition: [Object],
            tags: [Object],
        },
    ],
    format: {
        filename: '',
        nb_streams: 3,
        nb_programs: 0,
        format_name: 'matroska,webm',
        format_long_name: 'Matroska / WebM',
        start_time: '0.000000',
        duration: '1412.955000',
        size: '1110888879',
        bit_rate: '6289733',
        probe_score: 100,
        tags: {
            encoder: 'libebml v1.3.1 + libmatroska v1.4.2',
            creation_time: '2015-12-05T02:02:35.000000Z',
        },
    },
}
