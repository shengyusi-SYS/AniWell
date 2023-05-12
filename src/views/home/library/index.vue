<script setup lang="ts">
import { reqDeleteLibrary, ReqLibrary, reqLibrary, reqUpdateLibrary } from '@v/api'
import type { sortBy } from '@v/api'
import useListenLifecycle from '@v/hooks/useListenLifecycle'
import {
    sortConfig,
    useGlobalStore,
    defaultLibraryConfig,
    globalCache,
    defaultSort,
} from '@v/stores/global'
import type { sortTuple } from '@v/stores/global'
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
    ArrowsUpDownIcon,
} from '@heroicons/vue/24/outline'
import { ChevronDownIcon, ChevronLeftIcon, PlayIcon } from '@heroicons/vue/24/solid'
import { ElMessageBox } from 'element-plus'
import { type } from 'os'
import { useClickAway } from '@vant/use'
// import VideoPlayer from '@v/components/VideoPlayer/index.vue'
// import { useElementSize } from '@v/hooks/useElementSize'

const router = useRouter()
const currentRouter = computed(() => router.currentRoute.value)
const props = defineProps(['category'])

const globalStore = useGlobalStore()
const { theme, libraryConfig, isDesktop } = storeToRefs(globalStore)

const libraryStore = useLibraryStore()
const { libraryData, currentTheme, boxTheme, themeHelper, boxInfo } = storeToRefs(libraryStore)
const enterLibrary = libraryStore.enterLibrary

const itemStore = useItemStore()

const library = ref()

const currentPage = ref(Number(router.currentRoute.value.query?.page) || 1)
const total = computed(() => libraryData.value.total || 20)
const pageSize = computed(() => boxTheme.value.pageSize)

//分页切换查询
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
//监听分页配置
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

//点击card
const sortConfig: ComputedRef<sortConfig> = computed(
    () => libraryConfig.value?.[currentLibName.value]?.[libraryData.value?.result],
)
const currentLibName: ComputedRef<string> = computed(
    () => libraryData.value.libName || currentLibName.value,
)

async function openCard(libName: string, cardData: libraryData, index?: number) {
    openingCard = true
    if (cardData.result === 'item') {
        //card为item时，转到item页面
        const targetLibrary =
            libraryData.value.libName === libName
                ? libraryData.value
                : libraryData.value.children?.find((v) => v.libName === libName)
        if (targetLibrary) {
            const cards = targetLibrary.children?.filter((v) => v.display === cardData.display)
            if (cards == undefined) return

            const index = cards.findIndex((v) => v === cardData)
            if (index !== -1) cards.push(...cards.splice(0, index)) //以点击对象为起始，重排item顺序

            await itemStore.setItemList(cards, {
                libName,
                display: cardData.display || 'file',
            })
            openingCard = false
        } else {
        }
    } else {
        //card不为item时，打开对应层
        let boxLevel = cardData.result || 'dir'
        if (libraryConfig.value[libName] == undefined) {
            libraryConfig.value[libName] = defaultLibraryConfig
        }
        // sortConfig.value = libraryConfig.value[libName]?.[boxLevel]

        const query = {
            libName,
            path: cardData.path,
            ...sortConfig.value,
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

//右键菜单
const floatMenuCoordinate = ref({ x: 0, y: 0 })
const floatMenuOpen = ref(false)
const selectedCard: Ref<libraryData | undefined> = ref(undefined)
async function clickCard(e: PointerEvent, cardData: libraryData) {
    // console.log(cardData)
    selectedCard.value = cardData
    if (selectedCard?.value && selectedCard?.value.path == undefined) {
        selectedCard.value.path = libraryData.value.path + '/' + selectedCard?.value?.label
    }
    floatMenuCoordinate.value.x = e.x
    floatMenuCoordinate.value.y = e.y
    floatMenuOpen.value = true
}

//electron本地打开
async function openLocalFolder() {
    if (window.electronAPI?.openLocalFolder) {
        window.electronAPI.openLocalFolder(selectedCard.value?.path)
    }
}

//更新询问弹窗
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

//排序菜单
const sortMenuOpen = ref(false)
const sortMenu = ref()
useClickAway(sortMenu, () => {
    sortMenuOpen.value = false
})
const sortList: Ref<sortTuple[]> = ref(JSON.parse(JSON.stringify(defaultSort)))
watchEffect(() => {
    const newSortBy = sortConfig.value?.sortBy
    if (newSortBy instanceof Array) {
        sortList.value.sort(([sortByA, sortA], [sortByB, sortB]) => {
            return newSortBy.indexOf(sortByA) - newSortBy.indexOf(sortByB)
        })
    }
})
watch(
    sortList,
    (value) => {
        sortConfig.value.sortBy = value.map((v) => v[0])
        sortConfig.value.sort = value.map((v) => v[1])
    },
    { deep: true },
)
//拖动排序
let dragIndex = 0
function dragstart(index: number) {
    dragIndex = index
}
function dragenter(e: DragEvent, index: number) {
    if (dragIndex !== index) {
        const moving = sortList.value[dragIndex]
        sortList.value.splice(dragIndex, 1)
        sortList.value.splice(index, 0, moving)
        dragIndex = index
    }
}
function dragend() {
    console.log(sortConfig.value)

    router.replace({
        name: 'library',
        query: { ...currentRouter.value.query, ...sortConfig.value },
    })
}
function changeOrder(index: number, order: 'asc' | 'desc') {
    sortList.value[index][1] = order === 'asc' ? 'desc' : 'asc'
    nextTick(() => {
        router.replace({
            name: 'library',
            query: { ...currentRouter.value.query, ...sortConfig.value },
        })
    })
}

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
        //query中length为1的数组会被转成string，请求时需要转回数组
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

const padding = computed(() => (isDesktop.value ? '2em' : '1em'))
// useListenLifecycle('Library')
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
            <div v-show="boxInfo" class="library-info col">
                <div class="library-info-head row">
                    <div class="library-info-libName van-ellipsis" style="font-weight: 600">
                        {{ libraryData.title ?? libraryData.path }}
                    </div>
                    <div class="library-info-bar">
                        <div
                            ref="sortMenu"
                            class="col ml1 library-info-sort"
                            style="position: relative"
                        >
                            <ArrowsUpDownIcon
                                class="svg-icon"
                                @click="sortMenuOpen = !sortMenuOpen"
                            ></ArrowsUpDownIcon>
                            <div v-show="sortMenuOpen" class="info-sort-menu">
                                <div class="col info-sort-list">
                                    <div>拖动排序</div>
                                    <TransitionGroup name="order">
                                        <div
                                            v-for="([attr, order], index) in sortList"
                                            :key="attr"
                                            class="row info-sort-item"
                                            :draggable="true"
                                            @dragenter.prevent="dragenter($event, index)"
                                            @dragover.prevent
                                            @dragstart="dragstart(index)"
                                            @dragend="dragend"
                                        >
                                            <div>{{ attr }}</div>
                                            <div class="row">
                                                <!-- {{ order }} -->
                                                <PlayIcon
                                                    class="svg-icon-w1"
                                                    :style="
                                                        order === 'asc'
                                                            ? 'transform: rotate(-90deg)'
                                                            : 'transform: rotate(90deg)'
                                                    "
                                                    @click="changeOrder(index, order)"
                                                ></PlayIcon>
                                            </div>
                                        </div>
                                    </TransitionGroup>
                                </div>
                            </div>
                        </div>
                        <div class="col ml1" @click="libraryInfoOpen = !libraryInfoOpen">
                            <ChevronLeftIcon v-show="!libraryInfoOpen" class="svg-icon">
                            </ChevronLeftIcon>
                            <ChevronDownIcon
                                v-show="libraryInfoOpen"
                                class="svg-icon"
                            ></ChevronDownIcon>
                        </div>
                    </div>
                </div>
                <div
                    v-show="libraryInfoOpen"
                    style="flex-grow: 1; margin-bottom;: 2em"
                    class="library-info-content"
                    :class="globalStore.isDesktop ? 'row' : 'col'"
                >
                    <div class="col library-info-poster">
                        <img
                            v-if="libraryData.poster"
                            :src="`/api/v1//library/poster?path=${encodeURIComponent(
                                libraryData.poster,
                            )}`"
                            style="width: 100%; height: 100%; object-fit: scale-down"
                            alt=""
                        />
                    </div>
                    <div
                        style="flex-grow: 1"
                        :style="globalStore.isDesktop ? 'margin-left:2em' : ''"
                        class="col library-info-text"
                    >
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
                <div class="floatMenu-slot">
                    <div class="row floatMenu-item" @click="queryUpdatePath">
                        <ArrowPathIcon class="svg-icon-w1"></ArrowPathIcon>
                        <div class="floatMenu-text">更新</div>
                    </div>
                    <!-- <div class="row floatMenu-item">
                        <EllipsisHorizontalIcon class="svg-icon-w1"></EllipsisHorizontalIcon>详情
                    </div> -->
                    <div
                        v-if="globalCache.electronEnv"
                        class="row floatMenu-item"
                        @click="openLocalFolder"
                    >
                        <div class="floatMenu-text">本地打开</div>
                    </div>
                    <div class="row floatMenu-item" @click="floatMenuOpen = false">
                        <div class="floatMenu-text">
                            <XMarkIcon class="svg-icon-w1"></XMarkIcon>关闭
                        </div>
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
    padding: v-bind('padding');
}
.library-cards {
    overflow: visible;
    padding: 1rem 0 1rem 0;
    .library-info {
        // position: sticky;
        // top: 0;
        display: flex;
        // height: 1.5em;
        background-color: v-bind('theme.base.backgroundColor');
        .library-info-head {
            line-height: 2;
            margin-bottom: 1em;
            justify-content: space-between;
            align-items: center;
        }
        .library-info-libName {
        }
        .library-info-bar {
            display: flex;
            flex-direction: row;
            flex-grow: 1;
            justify-content: flex-end;
            .ml1 {
                margin-left: 1em;
            }
            .info-sort-menu {
                display: block;
                position: absolute;
                height: 20em;
                width: 10em;
                background-color: v-bind('theme.base.backgroundColorD1');
                top: 2em;
                right: 0;
                overflow-y: scroll;
                user-select: none;
            }
            .info-sort-item {
                padding: 0 1em;
                justify-content: space-between;
            }
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
        display: block;
        .floatMenu-item {
            padding: 0.5em 1em;
            flex-shrink: 0;
            &:hover {
                background-color: v-bind('theme.base.backgroundColorL1');
            }
            .floatMenu-text {
                flex-grow: 1;
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
.order-move,
.order-enter-active,
.order-leave-active {
    transition: all 0.5s ease;
}
.order-enter-from,
.order-leave-to {
    opacity: 0;
    transform: translateX(30px);
}
.order-leave-active {
    position: absolute;
}
</style>
