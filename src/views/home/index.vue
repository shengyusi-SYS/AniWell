<script setup lang="ts">
// import isDesktop from '@h/useIsDesktop'
import useListenLifecycle from '@v/hooks/useListenLifecycle'
import { useGlobalStore, globalCache } from '@v/stores/global'
import { storeToRefs } from 'pinia'
const globalStore = useGlobalStore()
const { isDesktop, theme } = storeToRefs(globalStore)
const menuOpenned = ref(false)
const monitorOpenned = ref(false)

const router = useRouter()

// const objectToTree = (obj: { [key: string]: unknown }, label = 'tree') => {
//     const res = {
//         label,
//         children: [] as { [key: string]: unknown }[],
//     }
//     for (const key in obj) {
//         const val = obj[key]
//         if (typeof val != 'object') {
//             res.children.push({
//                 label: key,
//                 value: val,
//             })
//         } else {
//             res.children.push(objectToTree(val, key))
//         }
//     }
//     return res
// }
// const themeTree = objectToTree(theme.value)

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
                    <ElRow justify="start">
                        <ElIcon
                            size="2em"
                            :style="`transform: translatex(${
                                menuOpenned ? '1.5em' : 0
                            }); transform-origin:center;transition:transform 0.3s`"
                            @click="menuOpenned = !menuOpenned"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="currentColor"
                                class="svg-icon"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                                />
                            </svg>
                        </ElIcon>
                    </ElRow>
                </ElCol>
                <div class="headerCenter">headerCenter</div>
                <div class="header-monitor">
                    <div @click="monitorOpenned = !monitorOpenned">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="currentColor"
                            class="svg-icon"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3"
                            />
                        </svg>
                    </div>
                    <div v-if="monitorOpenned" class="header-monitor-base col">
                        <Monitor></Monitor>
                    </div>
                </div>
            </ElRow>
        </ElHeader>
        <ElContainer direction="horizontal" class="home-container">
            <ElAside :class="'overlay'">
                <Transition name="home-navigation">
                    <div v-show="menuOpenned" class="col home-navigation">
                        <div class="row home-navigation-nav" @click="router.push({ name: 'home' })">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="currentColor"
                                class="home-navigation-nav-icon"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                                />
                            </svg>

                            <div class="home-navigation-nav-label">主页</div>
                        </div>
                        <div
                            class="row home-navigation-nav"
                            @click="router.push({ name: 'settings' })"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="currentColor"
                                class="home-navigation-nav-icon"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
                                />
                            </svg>
                            <div class="home-navigation-nav-label">设置</div>
                        </div>
                    </div>
                </Transition>
            </ElAside>
            <ElMain class="col">
                <RouterView
                    v-slot="{ Component, route }"
                    class="home-router-view"
                    :style="isDesktop ? 'padding: 2em' : 'padding: 1em'"
                >
                    <KeepAlive include="Library">
                        <Component
                            :is="Component"
                            v-if="route.name === 'library'"
                            :key="route.name || route.path"
                        />
                    </KeepAlive>
                </RouterView>
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
            background: var(--el-bg-color-page);
            width: auto;
            .home-navigation {
                width: 10em;
                overflow: hidden;
                .home-navigation-nav {
                    height: 4em;
                    line-height: 2em;
                    align-items: center;
                    justify-content: center;
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
            .home-navigation-enter-active,
            .home-navigation-leave-active {
                transition:/*  transform 0.3s ease, */ width 0.3s;
            }
            .home-navigation-enter-from,
            .home-navigation-leave-to {
                width: 0;
                // transform: scaleX(0);
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
</style>
