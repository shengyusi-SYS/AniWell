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
