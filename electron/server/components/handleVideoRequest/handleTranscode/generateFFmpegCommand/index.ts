import { logger } from '@s/utils/logger'
import path from 'path'
import init from '@s/utils/init'
const { settings, osPlatform } = init
import { cleanNull } from '@s/utils'

//转码串流的精髓，ffmpeg指令生成系统，自己看着都头大...
const encoders = {
    h265: {
        nvidia: 'hevc_nvenc',
        intel: 'hevc_qsv',
        amd: 'hevc_amf',
    },
    h264: {
        nvidia: 'h264_nvenc',
        intel: 'h264_qsv',
        amd: 'h264_amf',
        vaapi: 'h264_vaapi',
    },
}
const decoders = {
    nvidia: '_cuvid',
    intel: '_qsv',
}
//固定的硬件加速配置
const hwaccels = {
    win: {
        nvidia: {
            hwDevice: 'cuda',
            hwDeviceName: 'cu',
            flHwDevice: 'cuda',
            flHwDeviceName: 'cu',
            hwaccel: 'cuda',
            hwOutput: 'cuda',
            pixFormat: 'yuv420p',
            subFormat: 'yuva420p',
            scaleHw: 'cuda',
            scaleFormat: 'yuv420p',
            hwmap: 'cuda',
            hwmapFormat: 'cuda',
        },
        intel: {
            hwDevice: 'd3d11va',
            hwDeviceName: 'dx11',
            flHwDevice: 'qsv',
            flHwDeviceName: 'qs',
            hwaccel: 'qsv',
            hwOutput: 'qsv',
            pixFormat: 'nv12',
            subFormat: 'bgra',
            scaleHw: 'qsv',
            scaleFormat: 'nv12',
            hwmap: 'qsv',
            hwmapFormat: 'nv12',
        },
        amd: {
            hwDevice: 'd3d11va',
            hwDeviceName: 'dx11',
            flHwDevice: 'opencl',
            flHwDeviceName: 'oc',
            hwaccel: 'd3d11va',
            hwOutput: 'd3d11',
            pixFormat: 'nv12',
            subFormat: 'yuva420p',
            scaleHw: 'opencl',
            scaleFormat: 'nv12',
            hwmap: 'opencl',
            hwmapFormat: 'nv12',
        },
    },
    lin: {
        nvidia: {
            hwDevice: 'cuda',
            hwDeviceName: 'cu',
            flHwDevice: 'cuda',
            flHwDeviceName: 'cu',
            hwaccel: 'cuda',
            hwOutput: 'cuda',
            pixFormat: 'yuv420p',
            subFormat: 'yuva420p',
            scaleHw: 'cuda',
            scaleFormat: 'yuv420p',
            hwmap: 'cuda',
            hwmapFormat: 'cuda',
        },
        intel: {
            hwDevice: 'vaapi',
            hwDeviceName: 'va',
            hwaccel: 'vaapi',
            hwOutput: 'vaapi',
            flHwDevice: 'qsv',
            flHwDeviceName: 'qs',
            scaleHw: 'vaapi',
            scaleFormat: 'nv12',
            hwmap: 'qsv',
            hwmapFormat: 'qsv',
            pixFormat: 'nv12',
            subFormat: 'bgra',
        },
        amd: {
            hwDevice: 'null',
            hwDeviceName: 'null',
            flHwDevice: 'null',
            flHwDeviceName: 'null',
            flFormat: 'null',
            hwaccel: 'null',
            hwOutput: 'null',
            pixFormat: 'yuv420p',
            subFormat: 'yuva420p',
        },
        vaapi: {
            hwDevice: 'vaapi',
            hwDeviceName: 'va',
            hwaccel: 'vaapi',
            hwOutput: 'vaapi',
            flHwDevice: 'vaapi',
            flHwDeviceName: 'va',
            scaleHw: 'vaapi',
            scaleFormat: 'nv12',
            hwmap: 'vaapi',
            hwmapFormat: 'vaapi',
            pixFormat: 'nv12',
            subFormat: 'nv12',
        },
    },
}
function generateFfmpegCommand(videoInfo, subtitleList) {
    try {
        logger.debug('generateFfmpegCommand', 'start')
        const gpus = require('@s/utils/getGPU')
        const videoIndex = videoInfo.videoIndex
        // settings.advAccel = false
        let inputParams = []
        let outputParams = []

        const map = [
            '-map v:0',
            '-map a:0',
            '-map_metadata -1',
            '-map_chapters -1',
            // '-map s:0'
        ]

        let bitrate = [
            `-b:v ${settings.bitrate}M`,
            `-bufsize ${settings.bitrate * 2}M`,
            `-maxrate ${settings.bitrate}M`,
        ]
        const bitrateVal = videoInfo.targetBitrate
        // if (settings.autoBitrate) {
        //     if (videoInfo.bitrate * 1.5 <= settings.bitrate * 1000000) {
        //         bitrateVal = settings.bitrate * 1000000
        //     } else if (videoInfo.bitrate >= settings.bitrate * 1000000 * 1.5) {
        //         bitrateVal = settings.bitrate * 1000000 * 1.5
        //     } else {
        //         bitrateVal = videoInfo.bitrate * 1.2
        //     }
        bitrate = [`-b:v ${bitrateVal}`, `-bufsize ${bitrateVal * 2}`, `-maxrate ${bitrateVal}`]
        // }

        let decoder = ''
        const advAccel = settings.advAccel
        let hwaccelParams = []
        let hwDeviceId = ''

        for (const key in gpus) {
            const reg = new RegExp(settings.platform, 'i')
            if (key.match(reg)) {
                hwDeviceId = gpus[key]
            }
            // logger.debug('debug',hwDeviceId);
        }
        // logger.debug('debug',hwaccels[osPlatform][settings.platform]);
        const {
            hwDevice,
            hwDeviceName,
            flHwDevice,
            flHwDeviceName,
            scaleHw,
            scaleFormat,
            hwmap,
            hwmapFormat,
            hwaccel,
            hwOutput,
            pixFormat,
            subFormat,
        } = hwaccels[osPlatform][settings.platform]
        if (hwaccel == 'cuda') {
            hwaccelParams = [
                `-init_hw_device ${hwDevice}=${hwDeviceName}`,
                `-filter_hw_device ${hwDeviceName}`,
                `-hwaccel ${hwaccel}`,
                `-hwaccel_output_format ${hwOutput}`,
            ]
        } else if (hwaccel == 'qsv' || hwaccel == 'd3d11va' || hwaccel == 'vaapi') {
            hwaccelParams = [
                `-init_hw_device ${hwDevice}=${hwDeviceName}${hwDeviceId}`,
                `${
                    settings.platform != 'vaapi'
                        ? `-init_hw_device ${flHwDevice}=${flHwDeviceName}@${hwDeviceName}`
                        : ''
                }`,
                `-filter_hw_device ${flHwDeviceName}`,
                `-hwaccel ${hwaccel}`,
                `-hwaccel_output_format ${hwOutput}`,
            ]
        }
        const notSupport =
            /yuv\d{3}p\d{0,2}/.exec(videoInfo.pix_fmt)[0].replace(/yuv\d{3}p/, '') >= 10
        if (decoders.hasOwnProperty(settings.platform)) {
            if (!(videoInfo.codec == 'h264' && notSupport)) {
                decoder = `-c:v ${videoInfo.codec}${decoders[settings.platform]}`
            }
        }
        if (hwaccel == 'vaapi') {
            decoder = ''
        } else {
        }

        const threads = '-threads 0'
        const encoder = `-c:v ${encoders[settings.encode][settings.platform]}`
        // let copyVideo = false
        // if ((settings.encode == 'h264'&& videoInfo.codec=='h264')&&(videoInfo.bitrate<=bitrateVal)&&!videoInfo.subtitleStream[0]) {
        //     encoder = '-c:v copy'
        //     copyVideo = true
        // }
        let pix_fmt = ''
        // if (settings.encode == 'h264') {
        //     pix_fmt = `yuv420p`
        // }
        // if (hwaccels[settings.platform] == 'd3d11va') {
        //     pix_fmt = `nv12`
        // }

        let tag = ''
        if (settings.encode == 'h265') {
            tag = '-tag:v hvc1'
        }
        const copyts = '-copyts'

        let filter = []
        let videoFilter = []
        let subtitleFilter = []
        let overlayFilter = []
        const subtitleListIndex = 0
        let overlay = false
        let sub
        let subtitlePath
        const fontsDir = path
            .resolve(settings.tempPath, 'fonts')
            .replace(/\\/gim, '/')
            .replace(':', '\\:')
        if (subtitleList[subtitleListIndex]) {
            overlay = true
            sub = subtitleList[subtitleListIndex]
            subtitlePath = sub.path.replace(/\\/gim, '/').replace(':', '\\:')
            if (sub.source == 'out') {
                if (sub.type == 'text') {
                    subtitleFilter = [
                        `alphasrc=s=${videoInfo.width}x${videoInfo.height}:r=10:start=start`,
                        `format=${subFormat}`,
                        `subtitles=f='${subtitlePath}':charenc=utf-8:alpha=1:sub2video=1:fontsdir='${fontsDir}'`,
                    ]
                } else {
                    subtitleFilter = [, `format=${subFormat}`, `subtitles=f='${subtitlePath}'`]
                }
            } else if (sub.source == 'in') {
                if (sub.type == 'text') {
                    // subtitleFilter = [
                    //     `alphasrc=s=${videoInfo.width}x${videoInfo.height}:r=10:start='${videoIndex[segment].start}'`
                    //     , `format=${subFormat}`
                    // ]
                    // if (hwaccel == 'vaapi') {
                    subtitleFilter = [
                        `alphasrc=s=${videoInfo.width}x${videoInfo.height}:r=10:start=start`,
                        `format=${subFormat}`,
                        `subtitles=f='${subtitlePath}':si=${sub.subStreamIndex}:charenc=utf-8:alpha=1:sub2video=1:fontsdir='${fontsDir}'`,
                    ]
                    // }
                } else {
                    subtitleFilter = [
                        `[0:${sub.details.index}]scale=s=${videoInfo.width}x${videoInfo.height}:flags=fast_bilinear`,
                        `format=${subFormat}`,
                    ]
                }
            }
            subtitleFilter.push(`hwupload=derive_device=${flHwDevice}:extra_hw_frames=64[sub]`)
            subtitleFilter = cleanNull(subtitleFilter).join(',')
        }

        if (hwaccel == 'd3d11va') {
            videoFilter.push(`hwmap=derive_device=${hwmap}`)
        }
        videoFilter.push(`scale_${scaleHw}=format=${scaleFormat}`)
        if ((hwaccel == 'd3d11va' && !overlay) || hwaccel == 'vaapi') {
            // if (flHwDevice != 'vaapi') {
            videoFilter.push(
                `hwmap=derive_device=${hwmap}${
                    hwaccel == 'd3d11va' ? ':reverse=1' : ''
                },format=${hwmapFormat}`,
            )
            // }
        }
        videoFilter = cleanNull(videoFilter).join(',')
        if (overlay) {
            videoFilter = `[0:${videoInfo.index}]${videoFilter}[main]`
        }

        if (overlay) {
            overlayFilter.push(`[main][sub]overlay_${flHwDevice}=eof_action=endall`)
            if (hwaccel == 'd3d11va') {
                overlayFilter = [
                    ...overlayFilter,
                    `hwmap=derive_device=${hwmap}${hwaccel == 'd3d11va' ? ':reverse=1' : ''}`,
                    `format=${hwmapFormat}`,
                ]
            }
        }
        overlayFilter = cleanNull(overlayFilter).join(',')

        filter = cleanNull([subtitleFilter, videoFilter, overlayFilter])
        // if (!overlay) {
        //     filter = `-vf "${filter.join(';')}"`
        // } else {
        filter = `-filter_complex "${filter.join(';')}"`
        if (filter.includes('start=start')) {
            const tempFilter = filter
            filter = (start) => tempFilter.replace('start=start', `start=${start}`)
        }
        if (settings.platform == 'vaapi') {
            filter = `-vf "scale_vaapi=format=nv12${sub ? ',hwmap,format=nv12' : ''}${
                sub
                    ? `,subtitles=f='${subtitlePath}'${
                          sub.source == 'in' ? `:si=${sub.subStreamIndex}` : ''
                      }:fontsdir='${fontsDir}',hwmap,format=vaapi`
                    : ''
            }"`
        }
        if (osPlatform == 'lin' && settings.platform == 'amd') {
            hwaccelParams = []
            filter = `-vf "format=yuv420p${
                sub
                    ? `,subtitles=f='${subtitlePath}'${
                          sub.source == 'in' ? `:si=${sub.subStreamIndex}` : ''
                      }${sub.type == 'text' ? `:fontsdir='${fontsDir}'` : ''}`
                    : ''
            }"`
        }
        // }
        if ((videoInfo.codec == 'h264' && notSupport) || !advAccel) {
            // filter = `-vf "format=yuv420p"`
            filter = ''
            // hwaccelParams=[]
            if (hwaccel == 'vaapi') {
                pix_fmt = ''
            } else pix_fmt = '-pix_fmt yuv420p'

            if (sub) {
                if (sub.source == 'out') {
                    if (sub.type == 'text') {
                        filter = `-vf "format=${subFormat},subtitles=f='${subtitlePath}':alpha=1:fontsdir='${fontsDir}'${
                            settings.platform == 'vaapi' ? ',hwupload_vaapi' : ''
                        }"`
                    } else {
                        filter = `-vf "format=${subFormat},subtitles=f='${subtitlePath}'${
                            settings.platform == 'vaapi' ? ',hwupload_vaapi' : ''
                        }"`
                    }
                } else if (sub.source == 'in') {
                    if (sub.type == 'text') {
                        filter = `-filter_complex "[0:${sub.details.index}]format=${subFormat}${
                            settings.platform == 'vaapi' ? ',hwupload_vaapi' : ''
                        }"`
                    } else {
                        filter = `-filter_complex "[0:${
                            sub.details.index
                        }]format=${subFormat},scale=s=${videoInfo.width}x${
                            videoInfo.height
                        }:flags=fast_bilinear${
                            settings.platform == 'vaapi' ? ',hwupload_vaapi' : ''
                        }"`
                    }
                }
                // pix_fmt = ''
            }
            if (!advAccel) {
                hwaccelParams = []
                if (sub) {
                    filter = `-vf "subtitles=f='${sub.path
                        .replace(/\\/gim, '/')
                        .replace(':', '\\:')}'${
                        sub.source == 'in' ? `:si=${sub.subStreamIndex}` : ''
                    }:fontsdir='${fontsDir}'"`
                }
            }
        }
        if (videoInfo.colorSpace != 'bt709') {
            // filter = ''
            // hwaccelParams = [
            //     `-init_hw_device ${hwDevice}=${hwDeviceName}:,vendor=0x${hwDeviceId}`,
            //     `-hwaccel ${hwaccel}`,
            // ]
            // hwaccelParams=[]
            // threads = ''
            // pix_fmt = '-pix_fmt yuv420p'
            // if (sub) {
            // pix_fmt = ''
            //     let subtitlePath = sub.path
            //     filter = `-vf "subtitles=f='${subtitlePath}':alpha=1:fontsdir='${path.resolve(settings.tempPath, 'fonts').replace(/\\\\/gim, '/').replace(':', '\\:')}'"`
            // }
        }

        const ss = (start) => `-ss ${start}`
        let audio = []
        // if (videoInfo.audioCodec == 'aac') {
        //     audio = ['-c:a copy']
        // } else
        audio = [`-c:a libfdk_aac`, '-ac 2 ', '-ab 192000']
        const segmentParams = [
            '-avoid_negative_ts disabled',
            `-g ${videoInfo.frame_rate * 3}`,
            `-keyint_min ${videoInfo.frame_rate * 3}`,
            '-bf 1',
            '-start_at_zero',
        ]

        let inTest = [
            '-analyzeduration 200M',
            // '-extra_hw_frames 64',
            // '-autorotate 0',
        ]

        let quality = ['-rc cbr']

        let outTest = [
            // '-vsync -1',
            // '-max_muxing_queue_size 2048',
            // '-sc_threshold 0',
            // '-b_strategy 0'
            // '-profile:v:0 high',
            // '-flags +cgop',
            // `-segment_time_delta ${1 / (2 * videoInfo.frame_rate)}`,
            '-quality speed',
            // '-force_key_frames expr:gte(t,n_forced*3)',
            // '-force_key_frames expr:if(isnan(prev_forced_n),eq(n,prev_forced_n+71))'
        ]

        // if (copyVideo) {
        //     filter = []
        //     decoder = []
        //     hwaccel = []
        //     bitrate = []
        // }

        let customInputCommand = []
        let customOutputCommand = []
        customInputCommand = settings.customInputCommand.split('\n')
        customOutputCommand = settings.customOutputCommand.split('\n')

        if (customInputCommand[0].length > 0) {
            inTest = []
            logger.debug(
                'generateFfmpegCommand customInputCommand',
                '~~~~~~~~' + customInputCommand,
            )
        }
        if (customOutputCommand[0].length > 0) {
            outTest = []
            quality = []
            logger.debug(
                'generateFfmpegCommand customOutputCommand',
                '~~~~~~~~' + customOutputCommand,
            )
        }

        const hlsParams = (segment) => [
            '-f hls',
            // , '-max_delay 5000000'
            '-hls_time 3',
            '-hls_segment_type mpegts',
            '-hls_flags temp_file',
            `-start_number ${videoIndex[segment].id}`,
            `-hls_segment_filename "${path.resolve(settings.tempPath, 'output', `index%d.ts`)}"`,
            '-hls_playlist_type event',
            '-hls_list_size 0',
        ]

        inputParams = (start) =>
            cleanNull([
                ss(start),
                ...hwaccelParams,
                decoder,
                ...inTest,
                ...customInputCommand,
                `-i "${videoInfo.filePath}"`,
            ])

        outputParams = (start, segment) =>
            cleanNull([
                ...outTest,
                ...map,
                threads,
                encoder,
                pix_fmt,
                typeof filter == 'string' ? filter : filter(start),
                tag,
                ...audio,
                copyts,
                ...segmentParams,
                ...bitrate,
                ...quality,
                ...customOutputCommand,
                ...hlsParams(segment),
                // '-hide_banner',
                '-y',
                path.resolve(settings.tempPath, 'output', 'tempList', `${segment}.m3u8`),
            ])

        const commandTemplate = (start, segment) => [
            ...inputParams(start),
            ...outputParams(start, segment),
        ]
        // logger.debug('generateFfmpegCommand', 'end', commandTemplate(0, 'index1'))
        return commandTemplate
    } catch (error) {
        logger.error('generateFfmpegCommand', error)
    }
}

export default generateFfmpegCommand
