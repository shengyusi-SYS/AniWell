import { defineStore } from 'pinia'
import { reqLibrary } from '@v/api'

export const useVideoPlayerStore = defineStore('videoPlayer', () => {
    const show = ref(false)
    const src = ref({})
    const playSrc = (videoSrc) => {
        console.log(videoSrc)

        show.value = true
        src.value = videoSrc
    }
    return { show, playSrc, src }
})
