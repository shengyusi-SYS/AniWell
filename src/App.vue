<script setup lang="ts">
import { useMediaQuery, useDraggable } from '@vueuse/core'
import { computed, ref, watch, getCurrentInstance } from 'vue'
import isDesktop from '@h/useIsDesktop'

const isPreferredDark = useMediaQuery('(prefers-color-scheme: dark)')

const router = useRouter()
router.push({
    path: '/welcome',
})

const el = ref<HTMLElement | null>(null)
const { x, y, style } = useDraggable(el, {
    initialValue: { x: 100, y: 440 },
})

const menuOpenned = ref(false)
const test = (val) => {
    console.log(val, '')

    // window.electronAPI.test('www')
    // menuOpenned.value = !menuOpenned.value
}
</script>

<template>
    <ElContainer :class="`base ${isDesktop ? 'desktop' : ''}`">
        <ElHeader class="row">
            <ElRow justify="space-between" align="middle" style="width: 100%">
                <ElCol :span="4" class="headerLeft">
                    <ElRow justify="start">
                        <ElIcon
                            size="2rem"
                            :style="`transform: translatex(${
                                menuOpenned ? '1.5em' : 0
                            }); transform-origin:center;transition:transform 0.3s`"
                            @click="menuOpenned = !menuOpenned"
                        >
                            <IEpExpand v-show="!menuOpenned" />
                            <IEpFold v-show="menuOpenned" />
                        </ElIcon>
                    </ElRow>
                </ElCol>
                <ElCol :span="16" class="headerCenter">
                    <div>isDesktop:{{ isDesktop }}</div>
                </ElCol>
                <ElCol :span="4" class="headerRight">end</ElCol>
            </ElRow>
        </ElHeader>
        <ElContainer direction="horizontal">
            <ElAside :class="!isDesktop ? 'overlay' : ''">
                <ElRow class="menu" style="height: 4em" align="middle">
                    <Transition name="menu-icon">
                        <ElCol v-show="menuOpenned || isDesktop" class="menu-icon" :span="0.1"
                            >图标
                        </ElCol>
                    </Transition>
                    <Transition name="menu-title">
                        <ElCol v-show="menuOpenned" class="menu-title" :span="0.1">有四个字 </ElCol>
                    </Transition>
                </ElRow>
            </ElAside>
            <ElMain class="col">
                <RouterView></RouterView>
            </ElMain>
        </ElContainer>
    </ElContainer>
    <div ref="el" :style="style" style="position: fixed; font-size: 1rem; z-index: 10">
        <div style="font-size: 16px; border: 1px solid black">16PX大小</div>
        <div style="border: 1px solid black">1REM大小</div>
        <div style="font-size: 24px; border: 1px solid black">24PX大小</div>
        <div style="font-size: 2rem; border: 1px solid black">2REM大小</div>
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
    color: #2c3e50;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    .base {
        // font-size: 1rem;
        height: 100%;
        width: 100%;
        position: relative;
        .el-header {
            position: relative;
            background-color: var(--el-color-primary-light-7);
            color: var(--el-text-color-primary);
            height: 4rem;
            max-height: 15vh;
            min-height: 2em;
            padding: 0;
        }
        .el-aside {
            color: var(--el-text-color-primary);
            background: var(--el-color-primary-light-8);
            width: auto;
            // max-width: 30vw;
            .menu {
                overflow: hidden;
                white-space: nowrap;
                .menu-title {
                    width: 6em;
                    // transform: scaleX(1);
                    // transform-origin: left;
                }
                .menu-icon:extend(.menu-title) {
                    width: 4rem;
                }
                .menu-title-enter-active,
                .menu-title-leave-active,
                .menu-icon-enter-active,
                .menu-icon-leave-active {
                    transition:/*  transform 0.3s ease, */ width 0.3s;
                }
                .menu-title-enter-from,
                .menu-title-leave-to,
                .menu-icon-enter-from,
                .menu-icon-leave-to {
                    width: 0;
                    // transform: scaleX(0);
                }
            }
            &.overlay {
                position: absolute;
                z-index: 100;
                height: 100%;
            }
        }
        .el-footer {
            background-color: var(--el-color-primary-light-7);
            height: 3em;
            max-height: 30vh;
        }
        .el-main {
            font-size: 64px;
        }
        .el-icon {
            margin: 0.5em;
        }
        .toolbar {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            right: 20px;
        }

        // .aside-enter-to,
        // .aside-leave-from {
        //     width: 4em;
        // }
    }
}
</style>
