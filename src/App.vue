<script setup lang="ts">
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
import { useMediaQuery, useCssVar } from '@vueuse/core'

const isLargeScreen = useMediaQuery('(min-width: 992px)')
const isPreferredDark = useMediaQuery('(prefers-color-scheme: dark)')
const isLandscape = useMediaQuery('(orientation: landscape)')
</script>

<template>
    <ElContainer
        :class="`base ${isLandscape ? 'landscape' : ''} ${isLargeScreen ? 'largeScreen' : ''}`"
    >
        <ElAside class="hidden-sm-and-down">Aside</ElAside>
        <ElContainer>
            <ElHeader>Header</ElHeader>
            <ElMain
                >Main {{ isLargeScreen }}~{{ isPreferredDark }}~{{ isLandscape }}
                <VanConfigProvider theme="dark">...</VanConfigProvider>
                <VanButton type="primary">dwafdwa</VanButton>
            </ElMain>
            <ElFooter>Footer</ElFooter>
        </ElContainer>
    </ElContainer>
</template>

<style lang="less">
#app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    .landscape {
    }
    .largeScreen {
        font-size: 18px;
    }
    .base {
        // font-size: 1rem;
        height: 100%;
        width: 100%;
        .el-header {
            position: relative;
            background-color: var(--el-color-primary-light-7);
            color: var(--el-text-color-primary);
            height: 3em;
        }
        .el-aside {
            color: var(--el-text-color-primary);
            background: var(--el-color-primary-light-8);
            width: 8em;
        }
        .el-menu {
            border-right: none;
        }
        .el-main {
            padding: 0;
        }
        .toolbar {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            right: 20px;
        }
    }
}
</style>
