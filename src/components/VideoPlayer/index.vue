<script setup lang="ts">
import Hls from 'hls.js'
import DPlayer from 'dplayer'
const props = defineProps<{ playlist?: Array<string>; url: string }>()
const playerElement = ref()
// console.log(playerElement, playerElement.value)

onMounted(() => {
    const dp = new DPlayer({
        container: document.getElementById('player'),
        video: {
            url: props.url,
            type: 'customHls',
            customType: {
                customHls: function (video, player) {
                    console.log(video, player)

                    const hls = new Hls()
                    hls.loadSource(video.src)
                    hls.attachMedia(video)
                },
            },
        },
    })
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
