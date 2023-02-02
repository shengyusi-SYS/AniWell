<script setup lang="ts">
import { useMediaQuery, useDraggable } from '@vueuse/core'
import { computed, ref, watch, getCurrentInstance } from 'vue'
import { reqLogin } from '@v/api'
const isPreferredDark = useMediaQuery('(prefers-color-scheme: dark)')

const router = useRouter()
//未注册则强制跳转到欢迎页面
try {
    console.log(inject('signUp'))
} catch (error) {}
try {
    if (/* getCurrentInstance()?.proxy.signUp */ inject('signUp')) {
        router.push({
            path: '/welcome',
        })
    }
} catch (error) {}

const el = ref<HTMLElement | null>(null)
const { x, y, style } = useDraggable(el, {
    initialValue: { x: 100, y: 440 },
})
try {
    const test = async (a) => {
        console.log(a)

        console.log(window.electronAPI)

        window.electronAPI.test('testto')

        let res1 = await window.electronAPI.test1()
        console.log(res1)
    }
    window.electronAPI.test2((event, value) => {
        console.log('test2', event, value)

        event.sender.send('test2', 'test2_back')
    })
} catch (error) {}

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

const login = () =>
    reqLogin('admin', 'adminUser')
        .then((result) => {
            console.log(result)
        })
        .catch((err) => {
            console.log(err)
        })
</script>

<template>
    <RouterView></RouterView>
    <div ref="el" :style="style" style="position: fixed; font-size: 1rem; z-index: 10">
        <div style="font-size: 16px; border: 1px solid black">16PX大小</div>
        <div style="border: 1px solid black">1REM大小</div>
        <div style="font-size: 24px; border: 1px solid black">24PX大小</div>
        <div style="font-size: 2rem; border: 1px solid black">2REM大小</div>
        <div style="font-size: 2rem; border: 1px solid black" @click="login">test</div>
    </div>
    <VanNumberKeyboard safe-area-inset-bottom />
</template>

<style lang="less">
html {
    margin: 0;
    padding: 0;
    font-size: var(--van-font-size-md);
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
    text-align: center;
    color: var(--van-text-color);
    height: 100vh;
    width: 100vw;
    overflow: hidden;
}
</style>
