<script setup lang="ts">
import {
    reqItemSrc,
    reqStopTranscode,
    VideoSrc,
    subInfo,
    fontInfo,
    chaptersInfo,
    clientLog,
} from '@v/api'
import { useVideoPlayerStore } from '@v/stores/videoPlayer'
import { useElementSize } from '@vueuse/core'
import useListenLifecycle from '@v/hooks/useListenLifecycle'
import { libraryData } from '@v/stores/library'
import { testVideoMime } from '@v/utils'

import Hls from 'hls.js'
import DPlayer from 'dplayer'
import libassWorkerUrl from '@v/lib/ass/libassjs-worker.js?url'
import libassLegacyWorkerUrl from '@v/lib/ass/libassjs-worker-legacy.js?url'
import libassWASMUrl from '@v/lib/ass/subtitles-octopus-worker.wasm?url'
import SubtitlesOctopus from '@v/lib/ass/subtitles-octopus'
import { globalCache } from '@v/stores/global'

// const router = useRouter()
// onBeforeRouteUpdate((to, from) => {
//     console.log(to, from)
// })

const videoPlayerStore = useVideoPlayerStore()
// const { videoSize } = storeToRefs(videoPlayerStore)
// const controller = videoPlayerStore.controller

const uuidReg =
    /(?<uuid>[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/
const initialPlayer = ref()
let videoSize = useElementSize(initialPlayer)
const controller = {
    playlist: [] as Array<{ title: string; srcTask: () => Promise<VideoSrc> }>,
    playerOptions: {},
    currentIndex: -1,
    player: {} as DPlayer,
    videoElement: {} as HTMLElement,
    assInstance: {},
    libName: '',
    videoOptions: {
        method: '',
        resolution: '',
        autoBitrate: false,
        bitrate: 5,
    },
    taskId: '' as string | undefined,

    async setPlaylist(itemList: libraryData[], libName?: string) {
        this.playlist.length = 0
        if (libName) {
            this.libName = libName
        } else libName = this.libName
        for (let index = 0; index < itemList.length; index++) {
            const item = itemList[index]
            try {
                const method = (await testVideoMime(item.mime)) ? 'direct' : 'transcode'
                clientLog(item.mime, method, item.title)
                const srcQueryTask = () => {
                    return reqItemSrc({
                        filePath: item.path,
                        libName: libName as string,
                        display: 'video',
                        method,
                    })
                }
                this.playlist.push({ title: item.title, srcTask: srcQueryTask })
            } catch (error) {}
        }
    },
    setVideoElement(el: HTMLElement) {
        this.videoElement = el
        videoSize = useElementSize(el)
    },
    async getSrc(index = 0): Promise<VideoSrc> {
        return await this.playlist[index].srcTask()
    },
    async setPlayerOptions({ index = 0 } = {}) {
        this.currentIndex = index
        const src: VideoSrc = await this.getSrc(index)
        this.taskId = src.url.match(uuidReg)?.groups?.uuid
        //direct
        if (src.type === 'video/mp4') {
            this.playerOptions = {
                container: this.videoElement,
                video: {
                    url: src.url,
                    type: 'normal',
                    autoplay: true,
                },
                preventClickToggle: true,
                highlight: src.chapters.map((v) => {
                    return { time: v.start, text: v.title }
                }),
            }
            //有字幕
            if (src.subtitleList?.[0]) {
                const assSub = src.subtitleList.find((v) => v.codec === 'ass')
                //ass字幕
                if (assSub) {
                    const fontsList = src.fontsList
                    const availableFonts = {}
                    const fontsUrl: string[] = []
                    if (fontsList) {
                        for (let index = 0; index < fontsList.length; index++) {
                            const font = fontsList[index]
                            fontsUrl.push(font.url)
                            availableFonts[font.name] = font.url
                        }
                    }
                    this.playerOptions.video.type = 'customDirect'
                    this.playerOptions.video.customType = {
                        customDirect: function (video: HTMLMediaElement, player) {
                            const playerOptions = {
                                video: video, // HTML5 video element
                                subUrl: assSub.url, // Link to subtitles
                                fonts: ['/方正准圆.TTF', '/微软简标宋.TTF', ...fontsUrl], // Links to fonts (not required, default font already included in build)
                                availableFonts: availableFonts,
                                workerUrl: libassWorkerUrl, // Link to WebAssembly-based file "libassjs-worker.js"
                                legacyWorkerUrl: libassLegacyWorkerUrl, // Link to non-WebAssembly worker
                                fallbackFont: '/方正准圆.TTF',
                                wasmUrl: libassWASMUrl,
                            }
                            // console.log('ass', playerOptions)
                            controller.assInstance = new SubtitlesOctopus(playerOptions)
                        },
                    }
                } else {
                    //普通字幕
                    const sub = src.subtitleList[0]
                    this.playerOptions.subtitle = {
                        url: sub ? sub.url : '',
                        type: 'webvtt',
                        fontSize: '36px',
                    }
                }
            } else {
                //无字幕
            }
        } else {
            //transcode(hls)
            this.playerOptions = {
                container: this.videoElement,
                video: {
                    url: src.url,
                    type: 'customHls',
                    customType: {
                        customHls: function (video: HTMLMediaElement, player) {
                            const hls = new Hls()
                            hls.loadSource(video.src)
                            hls.attachMedia(video)
                        },
                    },
                },
            }
        }
        return this.playerOptions
    },
    async setPlayer() {
        console.log(this.playerOptions)
        this.player = new DPlayer(this.playerOptions)
    },
    bindEvents() {
        console.log('~~~~~~~~~~~~~~bindEvents')
        this.player.on('ended', this.autoPlay.bind(controller))
    },
    async autoPlay() {
        console.log('~~~~~~~~~~~~~~autoplay')
        if (this.assInstance?.dispose) {
            // this.assInstance.dispose()
        }
        await this.setPlayerOptions({ index: this.currentIndex + 1 })
        await this.setPlayer()
        await this.setVideoElement(this.player.container)
        this.bindEvents()
        console.log(this.player)

        this.player.play()
    },
}

useListenLifecycle('videoPlayer')

onMounted(async () => {
    await controller.setPlaylist(videoPlayerStore.itemList)
    controller.setVideoElement(initialPlayer.value)
    await controller.autoPlay()
})

onBeforeUnmount(() => {
    if (controller.taskId) {
        reqStopTranscode(controller.taskId)
    }
    if (controller.assInstance?.dispose) {
        controller.assInstance.dispose()
    }
})

const test = () => {
    console.log(videoSize)
}
</script>

<script lang="ts">
export default {
    name: 'VideoPlayer',
}
</script>

<template>
    <div ref="player" class="video-player-base">
        <!-- {{ videoSize }} -->
        <div ref="initialPlayer"></div>
        <!-- <div class="video-player-overlay" @click="test">fawfewgserge</div> -->
    </div>
</template>

<style lang="less" scoped>
.video-player-base {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
    .video-player-overlay {
        position: absolute;
        width: v-bind('videoSize.width+"px"');
        height: v-bind('videoSize.height+"px"');
    }
}
</style>
