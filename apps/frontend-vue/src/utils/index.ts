import type { libraryData } from '@v/stores/library'

export async function loadRemoteModule(name: string) {
    const [remoteName, moduleName] = name.split('/')
    const remotesMap: Record<
        string,
        { url: string; format?: 'esm' | 'cjs'; from?: 'vite' | 'webpack' }
    > = {
        'template-forntend-plugin': { url: 'http://localhost:3333/assets/remotePlugin.js' },
    }

    if (remotesMap[remoteName]?.url == undefined) throw new Error('remote module not found')
    const remote = await import(/* @vite-ignore */ remotesMap[remoteName].url)

    if (!(remote.get instanceof Function)) throw new Error("remote module isn't Function")
    try {
        const module = (await remote.get(moduleName))()
        return module
    } catch (error) {
        console.log(error)
    }
}

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
    const { useSettingsStore } = await import('@v/stores/settings')
    const browser = (await import('video.js')).default.browser
    const settingsStore = useSettingsStore()
    try {
        if (settingsStore.settings.transcode.method === 'direct') {
            return 'direct'
        }
        if (settingsStore.settings.transcode.method === 'transcode') {
            return 'transcode'
        }
        if (typeof item.mime !== 'string') {
            return 'transcode'
        }

        const mimeResult = await testVideoMime(item.mime)
        const pixFmt = (item.pixFmt as string) ?? ''
        const codec = item.mime.match(/codecs="(?<codec>.+)"/)?.groups?.codec.split('.')[0]
        // clientLog(codec, pixFmt, mimeResult)
        if (pixFmt === 'yuv420p') {
        }
        if (browser.IS_IOS) {
            if (codec === 'avc1' && pixFmt.includes('p10')) {
                return 'transcode'
            }
            if (codec !== 'avc1') {
                return 'transcode'
            }
        }
        if (browser.IS_ANDROID) {
            if (codec === 'avc1' && pixFmt.includes('p10')) {
                return 'transcode'
            }
        }
        if (browser.IS_WINDOWS) {
        }
        if (mimeResult) {
            return 'direct'
        } else return 'transcode'
    } catch (error) {
        return 'transcode'
    }
}
