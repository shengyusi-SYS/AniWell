import { reqSettings, settings } from '@v/api'
import { defineStore } from 'pinia'
import { Ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
    const settings: Ref<settings> = ref({
        server: {
            serverPort: 9009,
            ffmpegPath: '',
            tempPath: '',
            cert: '',
            key: '',
            debug: false,
        },
        transcode: {
            platform: 'nvidia',
            bitrate: 5,
            autoBitrate: false,
            advAccel: true,
            encode: 'h264',
            customInputCommand: '',
            customOutputCommand: '',
        },
    })
    async function getSettings() {
        const serverSettings = await reqSettings()
        settings.value = serverSettings
    }
    return { settings, getSettings }
})
