import { clientLog } from '@v/api'
import { libraryData } from '@v/stores/library'
import videojs from 'video.js'

export async function testVideoMime(mime: string) {
    const mediaConfig = {
        type: 'file' as const,
        video: {
            /**
             * 视频的Profile
             *
             * Main: `hev1.1.6.L93.B0`
             * Main 10: `hev1.2.4.L93.B0`
             * Main still-picture: `hvc1.3.E.L93.B0`
             * Range extensions: `hvc1.4.10.L93.B0`
             */
            contentType: mime,
            width: 1920,
            height: 1080,
            bitrate: 10000,
            framerate: 30,
        },
    }
    try {
        const result = await navigator.mediaCapabilities.decodingInfo(mediaConfig)
        if (result.supported) {
            return true
        }
        return false
    } catch (error) {
        return false
    }
}

export async function selectVideoMethod(item: libraryData) {
    try {
        if (typeof item.mime !== 'string') {
            return 'transcode'
        }

        const mimeResult = await testVideoMime(item.mime)
        const pixFmt = (item.pixFmt as string) ?? ''
        const codec = item.mime.match(/codecs="(?<codec>.+)"/)?.groups?.codec.split('.')[0]
        // clientLog(codec, pixFmt, mimeResult)

        if (videojs.browser.IS_IOS) {
            if (codec === 'avc1' && pixFmt.includes('p10')) {
                return 'transcode'
            }
            if (codec !== 'avc1') {
                return 'transcode'
            }
        }
        if (videojs.browser.IS_ANDROID) {
            if (codec === 'avc1' && pixFmt.includes('p10')) {
                return 'transcode'
            }
        }
        if (videojs.browser.IS_WINDOWS) {
        }
        if (mimeResult) {
            return 'direct'
        } else return 'transcode'
    } catch (error) {
        return 'transcode'
    }
}
