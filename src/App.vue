<script setup lang="ts">
import { useDraggable } from '@vueuse/core'
import { useGlobalStore } from '@v/stores/global'
import { storeToRefs } from 'pinia'

const store = useGlobalStore()
const { theme } = storeToRefs(store)

const el = ref()
const { x, y, style } = useDraggable(el, {
    initialValue: { x: 100, y: 440 },
})

// try {
//     const test = async (a) => {
//         console.log(a)

//         console.log(window.electronAPI)

//         window.electronAPI.test('testto')

//         let res1 = await window.electronAPI.test1()
//         console.log(res1)
//     }
//     window.electronAPI.test2((event, value) => {
//         console.log('test2', event, value)

//         event.sender.send('test2', 'test2_back')
//     })
// } catch (error) {}

const mediaConfig = {
    /**
     * 这里写 `file` 或 `media-source` 都可以, 结果一致,
     * 不要写 `webrtc`, 因为目前 WebRTC 还不支持 HEVC
     */
    type: 'file',
    video: {
        /**
         * 视频的Profile
         *
         * Main: `hev1.1.6.L93.B0`
         * Main 10: `hev1.2.4.L93.B0`
         * Main still-picture: `hvc1.3.E.L93.B0`
         * Range extensions: `hvc1.4.10.L93.B0`
         */
        contentType: 'video/mp4;codecs="hev1.1.6.L120.90"',
        /* 视频的宽度 */
        width: 1920,
        /* 视频的高度 */
        height: 1080,
        /* 随便写 */
        bitrate: 10000,
        /* 随便写 */
        framerate: 30,
    },
}

navigator.mediaCapabilities.decodingInfo(mediaConfig).then((result) => {
    /* 指定的 Profile + 宽高的视频是否可解码 */
    if (result.supported) {
        console.log('Video can play!')
    } else {
        console.log("Video can't play!")
    }
})
</script>

<template>
    <div class="app">
        <RouterView></RouterView>
        <div ref="el" :style="style" style="position: fixed; font-size: 1rem; z-index: 10">
            <div style="font-size: 16px; border: 1px solid black">16PX大小</div>
            <div style="border: 1px solid black">1REM大小</div>
            <div style="font-size: 24px; border: 1px solid black">24PX大小</div>
            <div style="font-size: 2rem; border: 1px solid black">2REM大小</div>
            <div style="font-size: 2rem; border: 1px solid black" @click="">test</div>
            <div
                :style="`background: #ffffffaa;
                    width: 12em;
                    color: black;
                    overflow-y: scroll;
                    height: ${theme.testHeight};`"
            >
                <template v-for="(item, p, i) in theme">
                    {{ p }}
                    <input v-model="theme[p]" type="text" />
                </template>
            </div>
        </div>
        <VanNumberKeyboard safe-area-inset-bottom />
    </div>
</template>

<style lang="less">
.app {
    --background-color: v-bind('theme.backgroundColor');
    --background-color-l1: v-bind('theme.backgroundColorL1');
    --background-color-d1: v-bind('theme.backgroundColorD1');
    --font-size: v-bind('theme.fontSize');
    --font-color: v-bind('theme.fontColor');
    --font-color-title: v-bind('theme.fontColorTitle');
    --font-color-secondary: v-bind('theme.fontColorSecondary');
    --card-shadow: v-bind('theme.cardShadow');
    --card-shadow-hover: v-bind('theme.cardShadowHover');
    --card-aspect-ratio: v-bind('theme.cardAspectRatio');
    background-color: var(--background-color);
    font-size: var(--font-size);
    color: var(--font-color);
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    text-align: center;
}
html {
    margin: 0;
    padding: 0;
    @media screen and(min-width: 426px) and(min-height: 426px) {
        font-size: 16px;
    }
}
.col {
    display: flex;
    flex-direction: column;
}
.row {
    display: flex;
    flex-direction: row;
}
#app {
    // font-family: Avenir, Helvetica, Arial, sans-serif;
    font-family: Microsoft YaHei, Tahoma, Arial, Helvetica, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}
::-webkit-scrollbar {
    width: 0px;
}
</style>
