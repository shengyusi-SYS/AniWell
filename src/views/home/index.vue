<script setup lang="ts">
// import isDesktop from '@h/useIsDesktop'
import { useGlobalStore, globalCache } from '@v/stores/global'
import { storeToRefs } from 'pinia'
const globalStore = useGlobalStore()
const { isDesktop } = storeToRefs(globalStore)
const menuOpenned = ref(false)

const router = useRouter()

const navTo = (e) => {
    if (e.name) {
        router.push({ name: e.name, params: { category: 'video' } })
    } else router.push(e.path)
}
const nav = {
    library: {
        path: '',
        icon: '',
        name: 'library',
        label: '库',
    },
    settings: {
        path: '',
        icon: '',
        name: 'settings',
        label: '设置',
    },
}
</script>

<script lang="ts">
export default {
    name: 'Home',
}
</script>

<template>
    <ElContainer direction="vertical" :class="`home-base ${isDesktop ? 'desktop' : ''}`">
        <ElHeader class="row">
            <ElRow justify="space-between" :align="'middle'" style="width: 100%">
                <ElCol :span="4" class="headerLeft">
                    <ElRow justify="start">
                        <ElIcon
                            size="2em"
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
                    <ElRow justify="start">
                        <ElCol :span="8">
                            <div>isDesktop:{{ isDesktop }}</div>
                        </ElCol>
                        <ElCol :span="16" style="height: 4em; overflow-y: scroll">
                            <div v-for="msg in globalCache.serverLog.list">{{ msg }}</div>
                        </ElCol>
                    </ElRow>
                </ElCol>
                <ElCol :span="4" class="headerRight">
                    <ElRow justify="end"> </ElRow>
                </ElCol>
            </ElRow>
        </ElHeader>
        <ElContainer direction="horizontal" class="home-container">
            <ElAside :class="!isDesktop ? 'overlay' : ''">
                <ElRow class="menu" style="" :align="'middle'">
                    <ElCol>
                        <ElRow v-for="route in nav" class="menu-line" :align="'middle'">
                            <Transition name="menu-icon">
                                <ElCol
                                    v-show="menuOpenned || isDesktop"
                                    class="menu-icon"
                                    :span="0.1"
                                >
                                    <ElIcon size="2em" @click="navTo(route)"
                                        ><IMdiHomeOutline
                                    /></ElIcon>
                                </ElCol>
                            </Transition>
                            <Transition name="menu-title">
                                <ElCol v-show="menuOpenned" class="menu-title" :span="0.1"
                                    >{{ route.label }}
                                </ElCol>
                            </Transition>
                        </ElRow>
                    </ElCol>
                </ElRow>
            </ElAside>
            <ElMain class="col">
                <ElScrollbar>
                    <RouterView v-slot="{ Component, route }">
                        <KeepAlive include="Library">
                            <Suspense>
                                <template #default>
                                    <Component
                                        :is="Component"
                                        :key="route.meta.usePathKey ? route.path : undefined"
                                    />
                                </template>
                                <template #fallback> Loading... </template>
                            </Suspense>
                        </KeepAlive>
                    </RouterView>
                </ElScrollbar>
            </ElMain>
        </ElContainer>
    </ElContainer>
</template>

<style lang="less" scoped>
.home-base {
    height: 100%;
    width: 100%;
    position: relative;

    .home-container {
        overflow: hidden;
        position: relative;
        .el-aside {
            // color: var(--el-text-color-primary);
            // position: absolute;
            background: var(--el-bg-color-page);
            width: auto;
            // height: calc(100vh - 2em);
            // z-index: 99;
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
                    width: 4em;
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
        .el-main {
            padding: 0;
            overflow-y: scroll;
            overflow-x: hidden;
        }
    }
    .el-header {
        position: relative;
        background-color: var(--el-bg-color-overlay);
        // color: var(--el-text-color-primary);
        height: 4em;
        max-height: 15vh;
        min-height: 2em;
        padding: 0;
        -webkit-app-region: drag;
    }

    .el-footer {
        // background-color: var(--el-color-primary-light-7);
        height: 3em;
        max-height: 30vh;
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
</style>
