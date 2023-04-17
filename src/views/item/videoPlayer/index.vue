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
import { isFunction, useElementSize } from '@vueuse/core'
import useListenLifecycle from '@v/hooks/useListenLifecycle'
import { libraryData } from '@v/stores/library'
import { selectVideoMethod, testVideoMime } from '@v/utils'

import Hls from 'hls.js'
import DPlayer from 'dplayer'
import libassWorkerUrl from '@v/lib/ass/libassjs-worker.js?url'
import libassLegacyWorkerUrl from '@v/lib/ass/libassjs-worker-legacy.js?url'
import libassWASMUrl from '@v/lib/ass/subtitles-octopus-worker.wasm?url'
import SubtitlesOctopus from '@v/lib/ass/subtitles-octopus'
import { globalCache } from '@v/stores/global'

const router = useRouter()
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
    assInstance: {} as SubtitlesOctopus,
    libName: '',
    videoOptions: {
        method: '',
        resolution: '',
        autoBitrate: false,
        bitrate: 5,
    },
    taskId: '' as string | undefined,
    hlsInstance: {} as Hls,
    state: 'init' as 'init' | 'play' | 'error',

    async setPlaylist(itemList: libraryData[], libName?: string) {
        this.playlist.length = 0
        if (libName) {
            this.libName = libName
        } else libName = this.libName
        for (let index = 0; index < itemList.length; index++) {
            const item = itemList[index]
            try {
                const method = await selectVideoMethod(item)
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
            } catch (error) {
                clientLog(error)
            }
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
                    // const workerUrl = URL.createObjectURL(
                    //     await (await fetch(libassWorkerUrl)).blob(),
                    // )
                    // let wasmUrl: string
                    // try {
                    //     wasmUrl = URL.createObjectURL(await (await fetch(libassWASMUrl)).blob())
                    // } catch (error) {}
                    // const subUrl = URL.createObjectURL(await (await fetch(assSub.url)).blob())
                    const fontsList = src.fontsList
                    const availableFonts: { [fontName: string]: string }[] = []
                    const fontsUrl: string[] = []
                    if (fontsList) {
                        for (let index = 0; index < fontsList.length; index++) {
                            const font = fontsList[index]
                            fontsUrl.push(font.url)
                            const fontName = font.name.replace(/.\w+$/i, '').toLowerCase()
                            const availableFont = {
                                [fontName]: font.url,
                            }
                            availableFonts.push(availableFont)
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
                            clientLog(
                                'ass',
                                playerOptions,
                                libassWorkerUrl,
                                libassLegacyWorkerUrl,
                                libassWASMUrl,
                            )
                            controller.assInstance = new SubtitlesOctopus(playerOptions)
                        },
                    }
                } else {
                    //普通字幕
                    const sub = src.subtitleList[0]
                    this.playerOptions.subtitle = {
                        url: sub ? sub.url + '&acceptCodec=webvtt' : '',
                        type: 'webvtt',
                        fontSize: '36px',
                    }
                }
            } else {
                //无字幕
            }
        } else {
            const _this = this
            this.playerOptions = {
                container: this.videoElement,
                video: {
                    url: src.url,
                    type: 'customHls',
                    customType: {
                        customHls: function (video: HTMLMediaElement /* , player */) {
                            const hls = new Hls()
                            _this.hlsInstance = hls
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
    },
    async autoPlay(): Promise<Function | void> {
        try {
            console.log('~~~~~~~~~~~~~~autoplay')
            if (this.assInstance?.dispose) {
                try {
                    this.assInstance.dispose()
                } catch (error) {}
            }
            await this.setPlayerOptions({ index: this.currentIndex + 1 })
            await this.setPlayer()
            await this.setVideoElement(this.player.container)
            this.player.play()
            // console.log(this.player)

            //！重要，移动端自动连播需要以尾递归循环
            await new Promise<void>((resolve, reject) => {
                this.player.on('ended', resolve)
            })
            return this.autoPlay()
        } catch (error) {
            this.state = 'error'
            ElMessage.error({
                message: '播放错误',
                grouping: true,
            })
            clientLog('autoPlay error', error)
            return router.back()
        }
    },
}

useListenLifecycle('videoPlayer')

onMounted(async () => {
    // try {

    await controller.setPlaylist(videoPlayerStore.itemList)
    controller.setVideoElement(initialPlayer.value)
    await controller.autoPlay()
    // } catch (error) {
    //     clientLog('videoPlayer onMounted error', error)
    // }
})

onBeforeUnmount(() => {
    // if (controller.taskId) {
    //     reqStopTranscode(controller.taskId)
    // }
    // if (controller.assInstance?.dispose) {
    //     controller.assInstance.dispose()
    // }
})

onBeforeRouteLeave((to, from) => {
    if (controller.taskId || controller.state === 'error') {
        if (controller.taskId) reqStopTranscode(controller.taskId)
    } else return false //！重要，避免用户操作过快漏掉停止转码的请求
    if (controller.assInstance?.dispose) {
        try {
            controller.assInstance.dispose()
        } catch (error) {}
    }
    if (controller.player) {
        try {
            controller.player.destroy()
        } catch (error) {}
    }
    if (isFunction(controller.hlsInstance.destroy)) {
        try {
            controller.hlsInstance.destroy()
        } catch (error) {}
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
