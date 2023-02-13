import { defineStore } from 'pinia'
import { reqLibrary } from '@v/api'
import { Ref } from 'vue'
import router from '@v/router'

export interface videoSrc {
    url: string
    type: string
    fontsList: Array<fontInfo>
    subtitleList: Array<subInfo>
}
export interface subInfo {
    path: string
    source: string
    codec: string
    id: string
    details?: object
    subStreamIndex?: number
    type?: string
    url?: string
}
export interface fontInfo {
    url: string
    name: string
}
export const useVideoPlayerStore = defineStore('videoPlayer', () => {
    const show = ref(false)
    const src: Ref<videoSrc> = ref({})
    const playSrc = (videoSrc: videoSrc) => {
        console.log('router', router)
        router.push('/videoPlayer')
        // show.value = true
        src.value = videoSrc
    }
    return { show, playSrc, src }
})
