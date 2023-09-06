<script setup lang="ts">
import { useDraggable } from '@vueuse/core'
import { useGlobalStore, globalCache } from '@v/stores/global'
import { storeToRefs } from 'pinia'
import { useDark, useToggle } from '@vueuse/core'
import { proxyGlobalData } from '@v/stores/global'
import useListenLifecycle from './hooks/useListenLifecycle'
import { ArrowLongLeftIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/vue/24/outline'
// import { ElMessage } from 'element-plus'
const isDark = useDark()
const toggleDark = useToggle(isDark)
toggleDark(true)

const app = ref()
const store = useGlobalStore()
const { theme } = storeToRefs(store)

store.$subscribe((mutation, state) => {
    // 每当状态发生变化时，将整个 state 持久化到本地存储。
    localStorage.setItem('global', JSON.stringify(state))
})

//全局错误提示
watch(globalCache.alertMessages, (val) => {
    if (val) {
        ElMessage.error({
            message: val,
            grouping: true,
        })
        globalCache.alertMessages.value = ''
    }
})

onMounted(() => {
    //监听样式修改，借鉴了vueuse的useCssVar
    store.initTheme()
    watch(
        theme.value.base,
        (baseTheme, old) => {
            for (const varName in store.baseThemeMap) {
                const baseThemeName = store.baseThemeMap[varName]
                app.value.style.setProperty(varName, baseTheme[baseThemeName])
            }
        },
        {
            immediate: true,
        },
    )
})

function closeWindow() {
    window.electronAPI.closeWindow()
}

function refreshWindow() {
    window.electronAPI.refreshWindow()
}
</script>

<template>
    <ElConfigProvider :size="'small'" :z-index="300">
        <div ref="app" class="app" :class="globalCache.electronEnv ? 'electron' : ''">
            <div v-if="globalCache.electronEnv" class="titleBar row">
                <div class="back left row">
                    <ArrowLongLeftIcon class="svg-icon" @click="$router.back()"></ArrowLongLeftIcon>
                    <ArrowPathIcon style="width: 1.5em" @click="refreshWindow"></ArrowPathIcon>
                </div>
                <div class="title center"></div>
                <div class="control right flex-center">
                    <XMarkIcon style="width: 2em" @click="closeWindow"></XMarkIcon>
                </div>
            </div>
            <RouterView v-slot="{ Component, route }" class="app-view">
                <KeepAlive include="Home">
                    <Component
                        :is="Component"
                        :key="route.meta.usePathKey ?? route.path ?? route.hash"
                    />
                </KeepAlive>
            </RouterView>

            <VanNumberKeyboard safe-area-inset-bottom />
        </div>
    </ElConfigProvider>
</template>

<style lang="less">
.app {
    --font-size: v-bind('theme.base.fontSize');
    background-color: var(--el-bg-color);
    font-size: var(--font-size);
    color: var(--font-color);
    height: 100vh;
    width: 100vw;
    text-align: center;
    overflow: hidden;
    position: relative;
    .titleBar {
        width: 100%;
        height: 2em;
        background-color: #0a0a0a;
        .left {
            width: 8em;
            min-width: 4em;
            justify-content: space-around;
        }
        .right {
            width: 4em;
            min-width: 4em;
            flex-shrink: 0;
        }
        .center {
            -webkit-app-region: drag;
            flex-grow: 1;
            flex-shrink: 1;
        }
    }
}
.electron .app-view {
    max-height: calc(100vh - 2em);
}
:root {
    --van-overlay-z-index: 9 !important;
}
html {
    margin: 0;
    padding: 0;
    font-size: 10px;
}
body {
    // font-size: 1.6rem;
}
.col {
    display: flex;
    flex-direction: column;
}
.row {
    display: flex;
    flex-direction: row;
}
.flex-center {
    justify-content: center;
    align-items: center;
}
#app {
    // font-family: Avenir, Helvetica, Arial, sans-serif;
    font-family: Microsoft YaHei, Tahoma, Arial, Helvetica, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    position: relative;
}
::-webkit-scrollbar {
    width: 0px;
}
.svg-icon {
    width: 2em;
}
.svg-icon-w1 {
    width: 1em;
}
</style>
