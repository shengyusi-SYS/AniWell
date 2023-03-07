import { defineStore } from 'pinia'
import { reqLibrary } from '@v/api'
import { Ref } from 'vue'
import { libraryData } from '@v/stores/library'
import { testVideoMime } from '@v/utils'
import Hls from 'hls.js'
import DPlayer from 'dplayer'
import { reqItemSrc, reqStopTranscode, VideoSrc, subInfo, fontInfo, chaptersInfo } from '@v/api'
import libassWorkerUrl from '@v/lib/ass/libassjs-worker.js?url'
import libassLegacyWorkerUrl from '@v/lib/ass/libassjs-worker-legacy.js?url'
import libassWASMUrl from '@v/lib/ass/subtitles-octopus-worker.wasm?url'
import SubtitlesOctopus from '@v/lib/ass/subtitles-octopus'
import { useElementSize } from '@vueuse/core'
// import router from '@v/router'

export const useVideoPlayerStore = defineStore('videoPlayer', () => {
    const itemList: libraryData[] = []
    return { itemList }
})
