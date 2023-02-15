<script setup lang="ts">
import Hls from 'hls.js'
import DPlayer from 'dplayer'
import { reqStopTranscode, VideoSrc } from '@v/api'
import { useVideoPlayerStore } from '@v/stores/videoPlayer'
import SubtitlesOctopus from '@v/lib/ass/subtitles-octopus'
import { useElementSize } from '@vueuse/core'

const videoPlayerStore = useVideoPlayerStore()

const initialPlayer = ref()

let assInstance: unknown
let dp: DPlayer
let videoSize = useElementSize(initialPlayer)
onMounted(() => {
    // console.log('aaaaaaaaaaaaa', initialPlayer.value, videoPlayerStore.src)
    //MP4格式
    if (videoPlayerStore.src.type === 'video/mp4') {
        const dpOptins = {
            container: initialPlayer.value,
            video: {
                url: videoPlayerStore.src.url,
                type: 'normal',
                autoplay: true,
            },
            preventClickToggle: true,
            highlight: videoPlayerStore.src.chapters.map((v) => {
                return { time: v.start, text: v.title }
            }),
        }
        //有字幕
        if (videoPlayerStore.src.subtitleList[0]) {
            const assSub = videoPlayerStore.src.subtitleList.find((v) => v.codec === 'ass')
            //ass字幕
            if (assSub) {
                const fontsList = videoPlayerStore.src.fontsList
                const fontsUrl = []
                const fontsName = []
                for (let index = 0; index < fontsList.length; index++) {
                    const font = fontsList[index]
                    fontsUrl.push(font.url)
                    fontsName.push(font.name)
                }
                dpOptins.video.type = 'customDirect'
                dpOptins.video.customType = {
                    customDirect: function (video: HTMLMediaElement, player) {
                        let options = {
                            video: video, // HTML5 video element
                            subUrl: assSub ? assSub.url : '', // Link to subtitles
                            fonts: fontsUrl[0] ? fontsUrl : ['/方正准圆.TTF', '/微软简标宋.TTF'], // Links to fonts (not required, default font already included in build)
                            workerUrl: '/libassjs-worker.js?type=classic&worker_file', // Link to WebAssembly-based file "libassjs-worker.js"
                            legacyWorkerUrl: '/libassjs-worker-legacy.js?type=classic&worker_file', // Link to non-WebAssembly worker
                            fallbackFonts: '/方正准圆.TTF',
                        }
                        console.log('asssssssssssssssssssss', options, video, player)
                        // video.play()
                        // video.fastSeek(312)
                        assInstance = new SubtitlesOctopus(options)
                    },
                }
            } else {
                //普通字幕
                const sub = videoPlayerStore.src.subtitleList[0]
                dpOptins.subtitle = {
                    url: sub ? sub.url : '',
                    type: 'webvtt',
                    fontSize: '36px',
                }
            }
        } else {
            //无字幕
        }
        dp = new DPlayer(dpOptins)
    } else {
        //hls格式
        dp = new DPlayer({
            container: initialPlayer.value,
            video: {
                url: videoPlayerStore.src.url,
                type: 'customHls',
                customType: {
                    customHls: function (video: HTMLMediaElement, player) {
                        const hls = new Hls()
                        hls.loadSource(video.src)
                        hls.attachMedia(video)
                    },
                },
            },
        })
    }
    dp.play()
    videoSize = useElementSize(dp.video)
})

onBeforeUnmount(() => {
    // reqStopTranscode()
    if (assInstance) {
        assInstance.dispose()
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
        width: v-bind('videoSize.width.value+"px"');
        height: v-bind('videoSize.height.value+"px"');
    }
}
</style>
