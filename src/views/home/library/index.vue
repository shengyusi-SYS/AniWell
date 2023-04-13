<script setup lang="ts">
import { reqDeleteLibrary, ReqLibrary, reqLibrary, reqUpdateLibrary } from '@v/api'
import useListenLifecycle from '@v/hooks/useListenLifecycle'
import { sortConfig, useGlobalStore, defaultLibraryConfig } from '@v/stores/global'
import { useItemStore } from '@v/stores/item'
import { libraryData, useLibraryStore } from '@v/stores/library'
import { useDraggable, useElementSize, useWindowSize } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { ComputedRef, Ref } from 'vue'
import {
    ChevronRightIcon,
    ArrowPathIcon,
    EllipsisHorizontalIcon,
    XMarkIcon,
} from '@heroicons/vue/24/outline'
import { ChevronDownIcon, ChevronLeftIcon } from '@heroicons/vue/20/solid'
import { ElMessageBox } from 'element-plus'
// import VideoPlayer from '@v/components/VideoPlayer/index.vue'
// import { useElementSize } from '@v/hooks/useElementSize'
// import isDesktop from '@h/useIsDesktop'

const router = useRouter()
const currentRouter = computed(() => router.currentRoute.value)
const props = defineProps(['category'])

const globalStore = useGlobalStore()
const { theme, libraryConfig, isDesktop } = storeToRefs(globalStore)

const libraryStore = useLibraryStore()
const { libraryData, currentTheme, boxTheme, themeHelper } = storeToRefs(libraryStore)
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
const paginationQuery = (replace = false) => {
    if (openingCard === false && historyBack === false) {
        changePagination = true
        const opt = {
            ...currentRouter.value,
            query: { ...currentRouter.value.query, start: pageStart.value, end: pageEnd.value },
        }
        if (replace) {
            router.replace(opt)
        } else router.push(opt)
    }
}

const sizeChange = watch(pageSize, (newSize, oldSize) => {
    console.log('sizeChange', newSize, oldSize)

    if (oldSize != undefined) {
        paginationQuery(true)
    }
})
const pageChange = watch(currentPage, (newPage, oldPage) => {
    console.log('pageChange', newPage, oldPage)
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
        const targetLibrary =
            libraryData.value.libName === libName
                ? libraryData.value
                : libraryData.value.children?.find((v) => v.libName === libName)
        if (targetLibrary) {
            const cards = targetLibrary.children?.filter((v) => v.display === cardData.display)
            if (cards == undefined) return

            if (typeof index === 'number') cards.push(...cards.splice(0, index))
            await itemStore.setItemList(cards, {
                libName,
                display: cardData.display || 'file',
            })
            openingCard = false
        } else {
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
            result: boxLevel,
            start: 0,
            end: theme.value.library[libName][boxLevel].pageSize || pageSize.value || 20,
        }
        // console.log(query)

        router.push({
            name: 'library',
            query,
        })
    }
}

const floatMenuCoordinate = ref({ x: 0, y: 0 })
const floatMenuOpen = ref(false)
const selectedCard: Ref<libraryData | undefined> = ref(undefined)
async function clickCard(e: PointerEvent, cardData: libraryData) {
    console.log(e.x, e.y, cardData.path)
    selectedCard.value = cardData
    floatMenuCoordinate.value.x = e.x
    floatMenuCoordinate.value.y = e.y
    floatMenuOpen.value = true
}

const queryUpdateDialogOpen = ref(false)
async function queryUpdatePath() {
    if (selectedCard.value) {
        queryUpdateDialogOpen.value = true
    }
}
async function confirmUpdatePath() {
    let targetLibName = selectedCard.value?.libName ?? libraryData.value.libName
    if (selectedCard.value?.path == undefined) {
        return
    }
    await reqUpdateLibrary(targetLibName, selectedCard.value?.path)
    queryUpdateDialogOpen.value = false
}
async function cancelUpdatePath() {
    queryUpdateDialogOpen.value = false
    selectedCard.value = undefined
}

watchEffect(() => {
    if (floatMenuOpen.value === false && queryUpdateDialogOpen.value === false) {
        selectedCard.value = undefined
    }
})

onMounted(() => {
    enterLibrary({ libName: '' })
})

onActivated(() => {
    if (currentRouter.value.query.libName == undefined) {
        enterLibrary({ libName: '' })
    }
})

onBeforeRouteUpdate(async (to, from, next) => {
    // console.log(to.query)
    try {
        floatMenuOpen.value = false
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

const libraryInfoOpen = ref(false)

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
        <!-- <div>{{ fontSize }}</div> -->
        <div v-if="themeHelper && libraryData.result" class="row library-themeHelper">
            <div class="library-result">
                {{ libraryData.result }}
            </div>
            <ElSlider v-model="boxTheme.column" :max="10" :min="1" style="width: 80%" />
        </div>
        <div v-if="libraryData.libName === 'overview'" class="library-overview col">
            <template v-for="lib in libraryData.children" :key="lib.path">
                <div>
                    <ElRow>
                        <ElCol
                            justify="start"
                            class="library-overview-title"
                            @click.left="() => openCard(lib.libName, lib)"
                        >
                            <ElRow style="flex-wrap: nowrap">
                                <div>
                                    {{ lib.libName }}
                                </div>
                                <ChevronRightIcon style="width: 1em"></ChevronRightIcon>
                            </ElRow>
                        </ElCol>
                    </ElRow>
                    <ElScrollbar noresize>
                        <div class="row" style="">
                            <template
                                v-for="(cardData, cardIndex) in lib.children"
                                :key="cardData.path"
                            >
                                <Card
                                    :data="cardData"
                                    class="library-item"
                                    style="width: 16em; margin: 2em 1em 2em 1em; flex-shrink: 0"
                                    @click.left="() => openCard(lib.libName, cardData, cardIndex)"
                                />
                            </template>
                        </div>
                    </ElScrollbar>
                </div>
            </template>
        </div>

        <div v-else class="library-cards col">
            <div v-show="true" class="library-info col">
                <div class="library-info-head row" @click="libraryInfoOpen = !libraryInfoOpen">
                    <div class="library-info-libName van-ellipsis" style="font-weight: 600">
                        {{ libraryData.title ?? libraryData.path }}
                    </div>
                    <div class="col">
                        <ChevronLeftIcon
                            v-show="!libraryInfoOpen"
                            class="svg-icon"
                            style="font-size: 1em"
                        >
                        </ChevronLeftIcon>
                        <ChevronDownIcon
                            v-show="libraryInfoOpen"
                            class="svg-icon"
                            style="font-size: 1em"
                        ></ChevronDownIcon>
                    </div>
                </div>
                <div
                    v-show="libraryInfoOpen"
                    style="flex-grow: 1; margin-bottom;: 2em"
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
                    <div style="flex-grow: 1" class="col">
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
            </div>
            <div
                class="library-grid"
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
                        @click.right="
                            (e) => {
                                clickCard(e, cardData)
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
                <!-- :pager-count="isDesktop ? 5 : 3" 会有warn，但又有效 -->
                <ElPagination
                    v-model:page-size="boxTheme.pageSize"
                    v-model:current-page="currentPage"
                    :total="total"
                    :page-sizes="[20, 24, 30, 60]"
                    :background="true"
                    :layout="isDesktop ? ' total, sizes, jumper' : 'sizes, jumper'"
                    class="pagination"
                />
            </div>
            <FloatMenu
                :coordinate="floatMenuCoordinate"
                :is-show="floatMenuOpen"
                :click-away="() => (floatMenuOpen = false)"
            >
                <div class="col floatMenu-slot">
                    <div class="row floatMenu-item" @click="queryUpdatePath">
                        <ArrowPathIcon class="svg-icon-w1"></ArrowPathIcon> 更新
                    </div>
                    <!-- <div class="row floatMenu-item">
                        <EllipsisHorizontalIcon class="svg-icon-w1"></EllipsisHorizontalIcon>详情
                    </div> -->
                    <div class="row floatMenu-item" @click="floatMenuOpen = false">
                        <XMarkIcon class="svg-icon-w1"></XMarkIcon> 关闭
                    </div>
                </div>
            </FloatMenu>
            <ElDialog
                v-model="queryUpdateDialogOpen"
                title="请确认"
                :width="isDesktop ? '30em' : '100%'"
                align-center
            >
                <div>
                    确定更新
                    <span style="font-size: 1.5em; margin: 0 0.5em">{{
                        selectedCard?.libName || libraryData.libName
                    }}</span>
                    库内的
                </div>
                <div>{{ selectedCard?.path }} ?</div>
                <template #footer>
                    <span class="dialog-footer">
                        <ElButton @click="cancelUpdatePath">Cancel</ElButton>
                        <ElButton type="primary" @click="confirmUpdatePath"> Confirm </ElButton>
                    </span>
                </template>
            </ElDialog>
        </div>
    </div>
</template>

<style lang="less" scoped>
.library-base {
    min-height: 100%;
    font-size: v-bind('boxTheme.fontSizeTitle');
    display: flex;
    flex-direction: column;
}
.library-cards {
    overflow: visible;
    .library-info {
        // position: sticky;
        // top: 0;
        display: flex;
        // height: 1.5em;
        background-color: v-bind('theme.base.backgroundColor');
        .library-info-head {
            line-height: 2;
            justify-content: space-between;
            align-items: center;
        }
        .library-info-libName {
        }
    }
    .library-grid {
        display: grid;
        width: 100%;
        margin-top: 0em;
    }
    .library-pagination {
        position: sticky;
        bottom: 0;
        display: flex;
        flex-wrap: wrap;
        width: 100%;
        justify-content: center;
        :deep(.el-input__wrapper) {
            background-color: var(--el-pagination-button-bg-color);
        }
        .pagination {
            margin: 0.5em 0;
        }
    }
    .floatMenu-slot {
        min-width: 5em;
        max-width: 8em;
        background-color: v-bind('theme.base.backgroundColorD1');
        align-items: center;
        justify-content: center;
        .floatMenu-item {
            padding: 0.5em 1em;
            flex-shrink: 0;
            &:hover {
                background-color: v-bind('theme.base.backgroundColorL1');
            }
        }
    }
}

.library-overview-title {
    font-size: 2em;
    line-height: 2;
    text-align: left;
    padding-left: 0.5em;
    font-weight: bold;
}
.library-themeHelper {
    height: 4em;
    justify-content: space-evenly;
    align-items: center;
    .library-result {
        height: 1.5em;
        padding: 0.1em 0.3em;
        background-color: var(--el-color-primary);
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
</style>
