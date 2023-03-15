import { reqSettings, settings } from '@v/api'
import { defineStore } from 'pinia'
import { Ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
    const settings: Ref<settings> = ref({})
    async function getSettings() {
        const serverSettings = await reqSettings()
        settings.value = serverSettings
    }
    return { settings, getSettings }
})
