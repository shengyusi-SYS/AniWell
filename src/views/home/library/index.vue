<script setup lang="ts">
import { ReqLibrary, reqLibrary } from '@v/api'
import useListenLifecycle from '@v/hooks/useListenLifecycle'
import { sortConfig, useGlobalStore, defaultLibraryConfig } from '@v/stores/global'
import { useItemStore } from '@v/stores/item'
import { libraryData, useLibraryStore } from '@v/stores/library'
import { useDraggable, useElementSize, useWindowSize } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { ComputedRef } from 'vue'
// import VideoPlayer from '@v/components/VideoPlayer/index.vue'
// import { useElementSize } from '@v/hooks/useElementSize'
// import isDesktop from '@h/useIsDesktop'

const router = useRouter()
const currentRouter = computed(() => router.currentRoute.value)
const props = defineProps(['category'])

const globalStore = useGlobalStore()
const { theme, libraryConfig } = storeToRefs(globalStore)

const libraryStore = useLibraryStore()
const { libraryData, currentTheme, boxTheme } = storeToRefs(libraryStore)
const enterLibrary = libraryStore.enterLibrary

const itemStore = useItemStore()

const library = ref()

const currentPage = ref(Number(router.currentRoute.value.query?.page) || 1)
const total = computed(() => libraryData.value.total || 20)
const pageSize = computed(() => boxTheme.value.pageSize)

//页面切换
let pageStart = ref(0)
let pageEnd = computed(() => pageStart.value + pageSize.value)
let openingCard = false
let changePagination = false
let historyBack = false
const paginationQuery = () => {
    if (openingCard === false && historyBack === false) {
        changePagination = true
        router.push({
            ...currentRouter.value,
            query: { ...currentRouter.value.query, start: pageStart.value, end: pageEnd.value },
        })
    }
}

const sizeChange = watch(pageSize, (newSize, oldSize) => {
    if (oldSize != undefined) {
        paginationQuery()
    }
})
const pageChange = watch(currentPage, (newPage, oldPage) => {
    pageStart.value = (newPage - 1) * pageSize.value || 0
    paginationQuery()
})

let sortConfig: sortConfig = {
    start: 0,
    end: 20,
    sort: ['asc'],
    sortBy: ['title'],
}
let currentLibName: ComputedRef<string> = computed(
    () => libraryData.value.libName || currentLibName.value,
)
async function openCard(libName: string, cardData: libraryData, index?: number) {
    openingCard = true
    if (cardData.result === 'item') {
        if (libraryData.value.children) {
            const cards = libraryData.value.children.filter((v) => v.display === cardData.display)
            if (typeof index === 'number') cards.push(...cards.splice(0, index))
            await itemStore.setItemList(cards, {
                libName: currentLibName.value,
                display: cardData.display || 'file',
            })
        }
    } else {
        let boxLevel = cardData.result
        if (libraryConfig.value[libName] == undefined) {
            libraryConfig.value[libName] = defaultLibraryConfig
        }
        sortConfig = libraryConfig.value[libName]?.[boxLevel]

        const query = {
            libName,
            path: cardData.path,
            ...sortConfig,
            result: cardData.result,
            start: 0,
            end: theme.value.library[libName][cardData.result].pageSize || pageSize.value || 20,
        }
        // console.log(query)

        router.push({
            name: 'library',
            query,
        })
    }
}

onMounted(() => {
    enterLibrary({ libName: '' })
})

onBeforeRouteUpdate(async (to, from, next) => {
    // console.log(to.query)
    try {
        historyBack = !openingCard && !changePagination
        const query = to.query
        if (typeof query.sort === 'string') {
            query.sort = [query.sort]
        }
        if (typeof query.sortBy === 'string') {
            query.sortBy = [query.sortBy]
        }
        if (['box0', 'item'].includes(to.query.result) && openingCard) {
            // pageStart.value = 0
            currentPage.value = 1
        }
        if (historyBack === true) {
            currentPage.value = parseInt(Number(to.query.start) / pageSize.value) + 1 || 1
            if (from.query.result !== 'box0') {
                library.value.scrollIntoView({
                    top: 0,
                    // behavior: 'smooth',
                })
            }
        } else {
            library.value.scrollIntoView({
                top: 0,
                // behavior: 'smooth',
            })
        }
        await enterLibrary(query || { libName: '' })
        // console.log('~~~~~~~~~~~~~', libraryData.value.result)

        next()
    } catch (error) {
        console.log(error)
        next(from)
    }
    openingCard = false
    changePagination = false
    historyBack = false
    // console.log('RouteUpdated', openingCard)
})

// watch(
//     useWindowSize().width,
//     (width) => {
//         console.log(width)
//     },
//     { immediate: true },
// )
useListenLifecycle('Library')
</script>

<script lang="ts">
export default {
    name: 'Library',
}
</script>

<template>
    <div ref="library" class="library-base col">
        <ElScrollbar>
            <!-- <div>{{ fontSize }}</div> -->
            <ElSlider
                v-if="false"
                v-model="boxTheme.column"
                :max="10"
                :min="1"
                style="width: 80%"
            />
            <div v-if="libraryData.libName === 'overview'" class="library-overview col">
                <template v-for="lib in libraryData.children" :key="lib.path">
                    <div>
                        <ElRow>
                            <ElCol
                                :span="4"
                                justify="start"
                                class="library-overview-title"
                                style="
                                    font-size: 2em;
                                    line-height: 2;
                                    text-align: left;
                                    padding-left: 2em;
                                    font-weight: bold;
                                "
                                @click.left="
                                    () => {
                                        openCard(lib.libName, lib)
                                    }
                                "
                            >
                                <ElRow>
                                    <div>
                                        {{ lib.libName }}
                                    </div>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke-width="1.5"
                                        stroke="currentColor"
                                        class="w-6 h-6"
                                        style="width: 1em"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            d="M8.25 4.5l7.5 7.5-7.5 7.5"
                                        />
                                    </svg>
                                </ElRow>
                            </ElCol>
                        </ElRow>
                        <div class="row" style="overflow-x: scroll">
                            <template
                                v-for="(cardData, cardIndex) in lib.children"
                                :key="cardData.path"
                            >
                                <Card
                                    :data="cardData"
                                    class="library-item"
                                    style="width: 16em; margin: 2em; flex-shrink: 0"
                                    @click.left="
                                        () => {
                                            openCard(lib.libName, cardData, cardIndex)
                                        }
                                    "
                                />
                            </template>
                        </div>
                    </div>
                </template>
            </div>

            <div v-else class="library-cards col">
                <div
                    v-show="false"
                    style="flex-grow: 1; margin: 2em 0"
                    :class="globalStore.isDesktop ? 'row' : 'col'"
                >
                    <div class="col">
                        <img
                            v-if="libraryData.poster"
                            :src="`/api/v1//library/poster?path=${encodeURIComponent(
                                libraryData.poster,
                            )}`"
                            style="width: 100%; height: 100%; object-fit: scale-down"
                            alt=""
                        />
                    </div>
                    <div style="flex-grow: 1; margin-left: 2em" class="col">
                        <template v-for="(info, key) in libraryData" :key="key">
                            <div
                                v-if="!['children', 'poster'].includes(key)"
                                style="
                                    text-align: left;
                                    min-height: 2em;
                                    line-height: 1.5;
                                    margin: 0.5em 0;
                                "
                            >
                                {{ key }}: {{ info }}
                            </div>
                        </template>
                    </div>
                </div>
                <div
                    style="display: grid; width: 100%"
                    :style="`grid-template-columns: repeat(${boxTheme.column}, minmax(1em,1fr)); grid-gap:max(8px,${boxTheme.rowGutter}vw)  max(8px,${boxTheme.columnGutter}vw);`"
                >
                    <LazyComponent
                        v-for="(cardData, cardIndex) in libraryData.children"
                        class="library-lazy"
                    >
                        <Card
                            :key="cardData.path"
                            :data="cardData"
                            class="library-item"
                            @click.left="
                                () => {
                                    openCard(currentLibName, cardData, cardIndex)
                                }
                            "
                        />
                    </LazyComponent>
                </div>
                <div class="library-pagination">
                    <ElPagination
                        v-model:current-page="currentPage"
                        v-model:page-size="boxTheme.pageSize"
                        :total="total"
                        :pager-count="5"
                        :page-sizes="[20, 24, 30, 60]"
                        :background="true"
                        layout=" prev, pager, next"
                        class="pagination"
                    />
                    <ElPagination
                        v-model:page-size="boxTheme.pageSize"
                        v-model:current-page="currentPage"
                        :total="total"
                        :page-sizes="[20, 24, 30, 60]"
                        :background="true"
                        layout=" total, sizes, jumper"
                        class="pagination"
                    />
                </div>
            </div>
        </ElScrollbar>
    </div>
</template>

<style lang="less" scoped>
.library-base {
    min-height: 100%;
    font-size: v-bind('boxTheme.fontSizeTitle');
    display: flex;
    flex-direction: column;
    .library-pagination {
        position: fixed;
        bottom: 2em;
        left: 0;
        display: flex;
        flex-wrap: wrap;
        width: 100vw;
        justify-content: center;
        :deep(.el-input__wrapper) {
            background-color: var(--el-pagination-button-bg-color);
        }
        .pagination {
            margin: 0.5em 0;
        }
    }
    .library-lazy {
        display: flex;
        align-items: center;
        // height: 100%;
    }
    :deep(.van-grid-item__content) {
        display: block;
        max-width: 100%;
        padding: 0;
        --van-grid-item-content-background: none;
    }
}
</style>
