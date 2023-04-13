<script setup lang="ts">
// import isDesktop from '@h/useIsDesktop'
import useListenLifecycle from '@v/hooks/useListenLifecycle'
import { useGlobalStore, globalCache } from '@v/stores/global'
import { storeToRefs } from 'pinia'
import {
    SquaresPlusIcon,
    HomeIcon,
    AdjustmentsHorizontalIcon,
    Square3Stack3DIcon,
    Bars3Icon,
} from '@heroicons/vue/24/outline'
const globalStore = useGlobalStore()
const { isDesktop, theme } = storeToRefs(globalStore)
const menuOpenned = ref(false)
const monitorOpenned = ref(false)

const router = useRouter()

// useListenLifecycle('Home')
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
                    <div class="row">
                        <Bars3Icon
                            :style="`transform: translatex(${
                                menuOpenned ? '3em' : 0
                            }); transform-origin:center;transition:transform 0.3s`"
                            style="margin: 1em; height: 2em"
                            @click="menuOpenned = !menuOpenned"
                        ></Bars3Icon>
                    </div>
                </ElCol>
                <div class="headerCenter"></div>
                <div class="header-monitor">
                    <div @click="monitorOpenned = !monitorOpenned">
                        <Square3Stack3DIcon class="svg-icon"></Square3Stack3DIcon>
                    </div>
                    <div v-if="monitorOpenned" class="header-monitor-base col">
                        <Monitor></Monitor>
                    </div>
                </div>
            </ElRow>
        </ElHeader>
        <ElContainer direction="horizontal" class="home-container">
            <ElAside>
                <div class="row home-aside">
                    <Transition name="aside-fold">
                        <div v-show="menuOpenned" class="col home-navigation">
                            <div
                                class="row home-navigation-nav"
                                @click="router.push({ name: 'home' })"
                            >
                                <HomeIcon class="home-navigation-nav-icon"></HomeIcon>
                                <div class="home-navigation-nav-label">主页</div>
                            </div>
                            <div
                                class="row home-navigation-nav"
                                @click="router.push({ name: 'settings' })"
                            >
                                <AdjustmentsHorizontalIcon
                                    class="home-navigation-nav-icon"
                                ></AdjustmentsHorizontalIcon>
                                <div class="home-navigation-nav-label">设置</div>
                            </div>
                            <div
                                class="row home-navigation-nav"
                                @click="router.push({ name: 'libraryManager' })"
                            >
                                <SquaresPlusIcon class="home-navigation-nav-icon" />
                                <div class="home-navigation-nav-label">资源管理</div>
                            </div>
                        </div>
                    </Transition>
                    <div
                        v-show="menuOpenned"
                        class="home-aside-mask"
                        @click="menuOpenned = false"
                    ></div>
                </div>
            </ElAside>
            <ElMain class="col">
                <ElScrollbar>
                    <RouterView
                        v-slot="{ Component, route }"
                        class="home-router-view"
                        :style="isDesktop ? 'padding: 0 2em' : 'padding:0 1em'"
                    >
                        <KeepAlive include="Library">
                            <Component
                                :is="Component"
                                v-if="/^\/home\//.test(route.path)"
                                :key="route.name || route.path"
                            />
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
            width: auto;
            height: 100%;
            .home-aside {
                position: absolute;
                height: 100%;
            }
            .home-aside-mask {
                position: absolute;
                z-index: 1;
                width: 100vw;
                height: 100%;
                // left: 0;
                background-color: rgba(0, 0, 0, 0.2);
            }
            .home-navigation {
                background: var(--el-bg-color-page);
                width: 10em;
                overflow: hidden;
                z-index: 100;

                .home-navigation-nav {
                    height: 4em;
                    line-height: 2em;
                    align-items: center;
                    justify-content: space-evenly;
                }
                .home-navigation-nav-icon {
                    width: 2em;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .home-navigation-nav-label {
                    width: 4em;
                    overflow: hidden;
                    flex-shrink: 0;
                }
            }
        }
        .el-main {
            padding: 0;
            overflow-y: scroll;
            // overflow-x: hidden;
        }
        .home-router-view {
            padding: 0 2em;
        }
    }
    .el-header {
        position: relative;
        background-color: var(--el-bg-color-overlay);
        height: 4em;
        max-height: 15vh;
        min-height: 2em;
        padding: 0;
        .header-monitor {
            margin: 0 1em;
        }
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
.aside-fold-enter-active,
.aside-fold-leave-active {
    transition: transform 0.3s;
}
.aside-fold-enter-from,
.aside-fold-leave-to {
    transform: scaleX(0);
    transform-origin: left;
    z-index: 100;
}
.aside-fold-enter-to,
.aside-fold-leave-from {
    transform: scaleX(1);
    transform-origin: left;
    z-index: 100;
}
</style>
