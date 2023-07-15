<script setup lang="ts">
// import isDesktop from '@h/useIsDesktop'
import useListenLifecycle from "@v/hooks/useListenLifecycle"
import { useGlobalStore, globalCache } from "@v/stores/global"
import { storeToRefs } from "pinia"
import {
    SquaresPlusIcon,
    HomeIcon,
    AdjustmentsHorizontalIcon,
    Square3Stack3DIcon,
    Bars3Icon,
    MagnifyingGlassIcon,
} from "@heroicons/vue/24/outline"
import { useLibraryStore } from "@v/stores/library"
const globalStore = useGlobalStore()
const { isDesktop, theme } = storeToRefs(globalStore)
const menuOpenned = ref(false)
const monitorOpenned = ref(false)

const router = useRouter()

const libraryStore = useLibraryStore()
const { searchKeywords } = storeToRefs(libraryStore)

// useListenLifecycle('Home')
</script>

<script lang="ts">
export default {
    name: "Home",
}
</script>

<template>
    <ElContainer direction="vertical" :class="`home-base ${isDesktop ? 'desktop' : ''}`">
        <ElHeader class="row">
            <div class="row home-header">
                <div class="row header-left">
                    <Bars3Icon
                        :style="`transform: translatex(${
                            menuOpenned ? '3em' : 0
                        }); transform-origin:center;transition:transform 0.3s`"
                        style="margin: 1em; height: 2em"
                        @click="menuOpenned = !menuOpenned"
                        class="header-menu-icon"
                    ></Bars3Icon>
                    <el-input
                        v-show="!menuOpenned"
                        :style="`transform: translatex(${
                            menuOpenned ? '9em' : 0
                        }); transform-origin:center;transition:transform 0.3s`"
                        v-model="searchKeywords"
                        placeholder="Please input"
                        class="header-search"
                        @keyup.enter="libraryStore.searchLibrary()"
                    >
                        <template #append>
                            <MagnifyingGlassIcon
                                class="svg-icon"
                                @click="libraryStore.searchLibrary()"
                            />
                        </template>
                    </el-input>
                </div>
                <div class="header-center"></div>
                <div class="row header-right">
                    <div class="header-monitor">
                        <div @click="monitorOpenned = !monitorOpenned">
                            <Square3Stack3DIcon class="svg-icon"></Square3Stack3DIcon>
                        </div>
                        <div v-if="monitorOpenned" class="header-monitor-base col">
                            <Monitor></Monitor>
                        </div>
                    </div>
                </div>
            </div>
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
                            <div
                                v-if="false"
                                class="row home-navigation-nav"
                                @click="router.push({ name: 'test' })"
                            >
                                <div class="home-navigation-nav-label">test</div>
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
                <ElScrollbar :min-size="10">
                    <RouterView v-slot="{ Component, route }" class="home-router-view">
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
            // padding: 0 2em;
        }
    }
    .el-header {
        padding: 0;
    }
    .home-header {
        width: 100%;
        height: 4em;
        max-height: 15vh;
        min-height: 2em;
        margin: 0;
        padding: 0;
        justify-content: space-between;
        align-items: center;
        align-content: center;
        flex-grow: 1;
        flex-wrap: nowrap;
        position: relative;
        background-color: var(--el-bg-color-overlay);
        .header-left,
        .header-center {
            display: flex;
            align-items: center;
            flex-grow: 1;
        }
        .header-right {
            min-width: 4em;
        }
        .header-monitor {
            margin: 0 1em;
        }
        .header-search {
            height: 3em;
            max-width: 40em;
            min-width: 6em;
            flex-grow: 1;
            flex-shrink: 1;
            :deep(.el-input-group__append) {
                padding: 0 1em;
            }
        }
        .header-menu-icon {
            background-color: var(--el-bg-color-overlay);
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

// :deep(.el-scrollbar__bar) {
//     width: 4px;
//     height: 4px;
// }
</style>
