<script setup lang="ts">
import Hls from 'hls.js'
import DPlayer from 'dplayer'
import { reqStopTranscode, VideoSrc } from '@v/api'
const props = defineProps<{ src: VideoSrc }>()
const playerElement = ref()
// console.log(playerElement, playerElement.value)
// console.log(props)

onMounted(() => {
    console.log(props.src)

    if (props.src.type === 'video/mp4') {
        const dp = new DPlayer({
            container: document.getElementById('player'),
            video: {
                url: props.src.url,
                type: 'normal',
            },
        })
    } else {
        const dp = new DPlayer({
            container: document.getElementById('player'),
            video: {
                url: props.src.url,
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
