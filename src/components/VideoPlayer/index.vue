<script setup lang="ts">
import Hls from 'hls.js'
import DPlayer from 'dplayer'
import { reqStopTranscode, VideoSrc } from '@v/api'
import { useVideoPlayerStore } from '@v/stores/videoPlayer'
import SubtitlesOctopus from '@v/lib/ass/subtitles-octopus'
// const worker = new Worker(new URL('/libassjs-worker.js', import.meta.url))
// import init from '@v/../public/libass-worker.wasm?init'
// const worker = new Worker('/libassjs-worker.js')
// console.log('-------------', new URL('/libassjs-worker.js', import.meta.url), worker, init)

const videoPlayerStore = useVideoPlayerStore()

const playerElement = ref()
// console.log(playerElement, playerElement.value)
// console.log(props)
let assInstance: unknown
onMounted(() => {
    console.log('aaaaaaaaaaaaa', videoPlayerStore.src)
    if (videoPlayerStore.src.type === 'video/mp4') {
        const dpOptins = {
            container: document.getElementById('player'),
            video: {
                url: videoPlayerStore.src.url,
                type: 'normal',
                autoplay: true,
            },
        }
        if (videoPlayerStore.src.subtitleList[0]) {
            const assSub = videoPlayerStore.src.subtitleList.find((v) => v.codec === 'ass')
            if (assSub) {
                dpOptins.video.type = 'customDirect'
                dpOptins.video.customType = {
                    customDirect: function (video: HTMLMediaElement, player) {
                        let options = {
                            video: video, // HTML5 video element
                            subUrl: assSub ? assSub.url : '', // Link to subtitles
                            fonts: ['/方正准圆.TTF', '/微软简标宋.TTF'], // Links to fonts (not required, default font already included in build)
                            workerUrl: '/libassjs-worker.js?type=classic&worker_file', // Link to WebAssembly-based file "libassjs-worker.js"
                            legacyWorkerUrl: '/libassjs-worker-legacy.js?type=classic&worker_file', // Link to non-WebAssembly worker
                            fallbackFonts: '/default.woff2',
                            // renderMode: 'js-blend',
                            // worker,
                            debug: true,
                        }
                        console.log('asssssssssssssssssssss', options)

                        assInstance = new SubtitlesOctopus(options)
                    },
                }
            } else {
                const sub = videoPlayerStore.src.subtitleList[0]
                dpOptins.subtitle = {
                    url: sub ? sub.url : '',
                    type: 'webvtt',
                    fontSize: '36px',
                }
            }
            const dp = new DPlayer(dpOptins)
        } else {
        }
    } else {
        const dp = new DPlayer({
            container: document.getElementById('player'),
            video: {
                url: videoPlayerStore.src.url,
                type: 'customHls',
                customType: {
                    customHls: function (video: HTMLMediaElement, player) {
                        // console.log(video, player)
                        const hls = new Hls()
                        hls.loadSource(video.src)
                        hls.attachMedia(video)
                    },
                },
            },
        })
    }
})
// const dp = new DPlayer({
//     container: playerElement.value,
//     video: {
//         url: props.url,
//         type: 'hls',
//     },
//     pluginOptions: {
//         hls: {
//             // hls config
//         },
//     },
// })
onBeforeUnmount(() => {
    reqStopTranscode()
    if (assInstance) {
        assInstance.dispose()
    }
})
</script>

<script lang="ts">
export default {
    name: 'VideoPlayer',
}
</script>

<template>
    <div id="player" ref="player" class="video-player-base">VideoPlayer</div>
</template>

<style lang="less" scoped>
.video-player-base {
}
</style>
