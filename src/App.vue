<script setup lang="ts">
import { useDraggable } from '@vueuse/core'
import { useGlobalStore, globalCache } from '@v/stores/global'
import { storeToRefs } from 'pinia'
import { useDark, useToggle } from '@vueuse/core'
import { proxyGlobalData } from '@v/stores/global'
import useListenLifecycle from './hooks/useListenLifecycle'
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
</script>

<template>
    <div ref="app" class="app">
        <RouterView v-slot="{ Component, route }">
            <KeepAlive include="Home">
                <Component
                    :is="Component"
                    :key="route.meta.usePathKey ?? route.path ?? route.hash"
                />
            </KeepAlive>
        </RouterView>

        <VanNumberKeyboard safe-area-inset-bottom />
    </div>
</template>

<style lang="less">
.app {
    --font-size: v-bind('theme.base.fontSize');
    background-color: var(--el-bg-color);
    font-size: var(--font-size);
    color: var(--font-color);
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    text-align: center;
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
#app {
    // font-family: Avenir, Helvetica, Arial, sans-serif;
    font-family: Microsoft YaHei, Tahoma, Arial, Helvetica, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
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
