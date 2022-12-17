<script setup lang="ts">
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
import { useMediaQuery } from '@vueuse/core'
import { computed, ref, watch } from 'vue'

const isPreferredDark = useMediaQuery('(prefers-color-scheme: dark)')
const isLandscape = useMediaQuery('(orientation: landscape)')
const minWidthCheck = useMediaQuery('(min-width: 768px)')
const minHeightCheck = useMediaQuery('(min-height: 769px)')
const isDesktop = computed(() => isLandscape.value || (minWidthCheck.value && minHeightCheck.value))
</script>

<template>
    <ElContainer :class="`base ${isDesktop ? 'desktop' : ''} ${minHeightCheck ? '' : 'short'}`">
        <ElAside class="hidden-xs-only">Aside</ElAside>
        <ElContainer>
            <ElHeader>isDesktop:{{ isDesktop }}~~~isShort:{{ !minHeightCheck }}</ElHeader>
            <ElMain class="col">
                <VanConfigProvider theme="dark">...</VanConfigProvider>
                <VanButton type="primary">dwafdwa</VanButton>
                ElMain
                <div class="test1">
                    test1
                    <div class="test2">test2</div>
                </div>
            </ElMain>
            <ElFooter></ElFooter>
        </ElContainer>
    </ElContainer>
    <VanNumberKeyboard safe-area-inset-bottom />
</template>

<style lang="less">
html {
    margin: 0;
    padding: 0;
    font-size: var(--van-font-size-md);
    @media screen and (orientation: landscape),
        screen and(min-width: 768px) and(min-height: 768px) {
        font-size: 14px;
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
    font-family: Avenir, Helvetica, Arial, sans-serif;
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
        .el-header {
            position: relative;
            background-color: var(--el-color-primary-light-7);
            color: var(--el-text-color-primary);
            height: 3em;
            max-height: 30vh;
        }
        .el-aside {
            color: var(--el-text-color-primary);
            background: var(--el-color-primary-light-8);
            width: 8em;
            max-width: 50vw;
        }
        .el-footer {
            background-color: var(--el-color-primary-light-7);
            height: 3em;
            max-height: 30vh;
        }
        .el-menu {
            border-right: none;
        }
        .el-main {
            font-size: 64px;
            .test1 {
                font-size: 2em;
                .test2 {
                    font-size: 1rem;
                }
            }
        }
        .toolbar {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            right: 20px;
        }
    }

    .desktop {
        font-size: 2rem;
    }
    .short {
        font-size: 1rem;
    }
}
</style>
