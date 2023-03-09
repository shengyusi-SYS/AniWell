<script setup lang="ts">
import { ReqLibrary, reqLibrary } from '@v/api'
import useListenLifecycle from '@v/hooks/useListenLifecycle'
import { sortConfig, useGlobalStore, defaultLibraryConfig } from '@v/stores/global'
import { useItemStore } from '@v/stores/item'
import { libraryData, useLibraryStore } from '@v/stores/library'
import { useDraggable, useElementSize, useWindowSize } from '@vueuse/core'
import { storeToRefs } from 'pinia'
// import VideoPlayer from '@v/components/VideoPlayer/index.vue'
// import { useElementSize } from '@v/hooks/useElementSize'
// import isDesktop from '@h/useIsDesktop'

const router = useRouter()
const currentRouter = computed(() => router.currentRoute.value)
const props = defineProps(['category'])

const globalStore = useGlobalStore()
const { theme, libraryConfig } = storeToRefs(globalStore)

const libraryStore = useLibraryStore()
const { libraryData } = storeToRefs(libraryStore)
const enterLibrary = libraryStore.enterLibrary

const itemStore = useItemStore()

globalStore.setLibraryTheme(router.currentRoute.value.query.libName) //读取样式
const currentTheme = ref(theme.value.current)
const boxTheme = ref(currentTheme.value[libraryData.value.result] || currentTheme.value.dir)

// //字体计算
const library = ref()
const librarySize = useElementSize(library)
currentTheme.value.grid.width = librarySize.width

// const fontSize = computed(() => {
//     const posterWidth = theme.value.libraryWidth / theme.value.libraryColumnNum
//     const posterHeight = posterWidth / theme.value.libraryItemAspectRatio
//     const reference = posterWidth < posterHeight ? posterWidth : posterHeight
//     // console.log(posterWidth)
//     const newSize =
//         reference / 20 < 16
//             ? (reference / 20) *
//               theme.value.libraryFontSizePercent *
//               theme.value.libraryItemAspectRatio
//             : 16
//     return newSize * theme.value.libraryFontSizePercent + 'px'
// })
// //间距计算

const currentPage = ref(Number(router.currentRoute.value.query?.page) || 1)
const total = computed(() => libraryData.value.total || 20)
const pageSize = ref(currentTheme.value.grid.pageSize)

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
    paginationQuery()
})
const pageChange = watch(currentPage, (newPage, oldPage) => {
    pageStart.value = (newPage - 1) * pageSize.value
    paginationQuery()
})

enterLibrary({ libName: '' })

let sortConfig: sortConfig = {
    start: 0,
    end: 20,
    sort: ['asc'],
    sortBy: ['title'],
}
let currentLibName: string
async function openCard(libName: string, cardData: libraryData, index?: number) {
    openingCard = true
    if (cardData.result === 'item') {
        if (libraryData.value.children) {
            const cards = libraryData.value.children.filter((v) => v.display === cardData.display)
            if (typeof index === 'number') cards.push(...cards.splice(0, index))
            router.push({ name: 'item', query: { title: cardData.title, display: 'video' } })
            await itemStore.setItemList(cards, {
                libName: currentLibName,
                display: cardData.display || 'file',
            })
        }
    } else {
        let boxLevel = cardData.result
        if (libraryConfig.value[libName] == undefined) {
            libraryConfig.value[libName] = defaultLibraryConfig
        }
        sortConfig = libraryConfig.value[libName]?.[boxLevel]
        const query = { libName, path: cardData.path, ...sortConfig, result: cardData.result }
        router.push({
            name: 'library',
            query,
        })
    }
}

onBeforeRouteUpdate(async (to, from, next) => {
    console.log(to.query)
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
            currentPage.value = parseInt(Number(to.query.start) / pageSize.value) + 1
        }
        await enterLibrary(query || { libName: '' })
        if (typeof to.query.libName === 'string') {
            currentLibName = to.query.libName
        }
        console.log('~~~~~~~~~~~~~', libraryData.value.result)

        next()
    } catch (error) {
        console.log(error)
        next(from)
    }
    openingCard = false
    changePagination = false
    historyBack = false
    console.log('RouteUpdated', openingCard)
})

// useListenLifecycle('Library')
const float = import.meta.env.DEV ? ref(true) : false
const el = ref()
const { x, y, style } = useDraggable(el, {
    initialValue: { x: 100, y: 440 },
})
const test = () => {}
// useListenLifecycle('Library')
</script>

<script lang="ts">
export default {
    name: 'Library',
}
</script>

<template>
    <div ref="library" class="library-base col">
        <ElSlider v-model="currentTheme.grid.column" :max="10" :min="1" style="width: 80%" />

        <!-- <div>{{ fontSize }}</div> -->
        <div v-if="libraryData.label === 'overview'" class="library-overview col">
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
                                    openCard(lib.title, lib)
                                }
                            "
                        >
                            {{ lib.title }}
                        </ElCol>
                    </ElRow>
                    <div class="row" style="margin: 2em 0; overflow-x: scroll">
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
                                        openCard(lib.title, cardData, cardIndex)
                                    }
                                "
                            />
                        </template>
                    </div>
                </div>
            </template>
        </div>

        <div v-else class="library-cards">
            <VanGrid
                :column-num="currentTheme.grid.column"
                :gutter="currentTheme.grid.gutter"
                :border="false"
            >
                <VanGridItem v-for="(cardData, cardIndex) in libraryData.children">
                    <LazyComponent :key="cardData.path" class="library-lazy">
                        <Card
                            :data="cardData"
                            class="library-item"
                            :font-size="'16px'"
                            @click.left="
                                () => {
                                    openCard(currentLibName, cardData, cardIndex)
                                }
                            "
                        />
                    </LazyComponent>
                </VanGridItem>
            </VanGrid>
            <div class="library-pagination">
                <ElPagination
                    v-model:current-page="currentPage"
                    v-model:page-size="pageSize"
                    :total="total"
                    :pager-count="5"
                    :page-sizes="[20, 24, 30, 60]"
                    :background="true"
                    layout=" prev, pager, next"
                    class="pagination"
                />
                <ElPagination
                    v-model:page-size="pageSize"
                    v-model:current-page="currentPage"
                    :total="total"
                    :page-sizes="[20, 24, 30, 60]"
                    :background="true"
                    layout=" total, sizes, jumper"
                    class="pagination"
                />
            </div>
        </div>
        <div
            v-if="float"
            ref="el"
            :key="'float-test'"
            :style="style"
            style="display: block; position: absolute; font-size: 1em; z-index: 10"
        >
            <div @click="float = false">close</div>
            <div style="font-size: 1rem; border: 1px solid black">1REM大小(10px)</div>
            <div style="font-size: 1em; border: 1px solid black">1EM大小</div>
            <div style="font-size: 2rem; border: 1px solid black">2REM大小</div>
            <div style="font-size: 2em; border: 1px solid black">2EM大小</div>
            <div style="font-size: 2em; border: 1px solid black" @click="test">test</div>
            <div
                :style="`background: #ffffffaa;
                            width: 12em;
                            color: black;
                            overflow-y: scroll;
                            height: 20em;`"
            >
                <template v-for="(item, p, i) in theme.base">
                    {{ p }}
                    <input v-model="theme.base[p]" type="text" />
                </template>
                <template v-for="(item, p, i) in currentTheme.grid">
                    {{ p }}
                    <input v-model="currentTheme.grid[p]" type="text" />
                </template>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
.library-base {
    min-height: 100%;
    width: 100%;
    font-size: v-bind('boxTheme.fontSizeTitle');
    display: flex;
    flex-direction: column;
    // align-items: center;
    .library-cards {
        height: 100%;
        flex-grow: 1;
        padding-bottom: 4em;
    }
    .library-pagination {
        position: fixed;
        bottom: 2em;
        display: flex;
        flex-wrap: wrap;
        width: 100%;
        justify-content: center;
        :deep(.el-input__wrapper) {
            background-color: var(--el-pagination-button-bg-color);
        }
    }
    .library-lazy {
        display: flex;
        align-items: center;
        height: 100%;
    }
    :deep(.van-grid-item__content) {
        display: block;
        max-width: 100%;
        padding: 0;
        --van-grid-item-content-background: none;
    }
    // .library-item {
    //     width: 100%;
    //     aspect-ratio: var(--library-item-aspect-ratio);
    // }
}
</style>
