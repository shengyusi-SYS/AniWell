<script setup lang="ts">
import Hls from 'hls.js'
import DPlayer from 'dplayer'
import { reqStopTranscode, VideoSrc } from '@v/api'
import { useVideoPlayerStore } from '@v/stores/videoPlayer'

const videoPlayerStore = useVideoPlayerStore()

const playerElement = ref()
// console.log(playerElement, playerElement.value)
// console.log(props)

onMounted(() => {
    console.log('aaaaaaaaaaaaa', videoPlayerStore.src)
    const sub = videoPlayerStore.src.subtitleList[0]
    if (videoPlayerStore.src.type === 'video/mp4') {
        const dp = new DPlayer({
            container: document.getElementById('player'),
            video: {
                url: videoPlayerStore.src.url,
                type: 'normal',
            },
            subtitle: {
                url: sub ? sub.url : '',
                type: 'webvtt',
                fontSize: '36px',
            },
        })
    } else {
        const dp = new DPlayer({
            container: document.getElementById('player'),
            video: {
                url: videoPlayerStore.src.url,
                type: 'customHls',
                customType: {
                    customHls: function (video: HTMLMediaElement, player) {
                        console.log(video, player)
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
