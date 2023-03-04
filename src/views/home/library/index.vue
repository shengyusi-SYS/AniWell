<script setup lang="ts">
import { reqLibrary } from '@v/api'
import useListenLifecycle from '@v/hooks/useListenLifecycle'
import { useGlobalStore } from '@v/stores/global'
import { libraryData, useLibraryStore } from '@v/stores/library'
import { useElementSize, useWindowSize } from '@vueuse/core'
import { storeToRefs } from 'pinia'
// import VideoPlayer from '@v/components/VideoPlayer/index.vue'
// import { useElementSize } from '@v/hooks/useElementSize'
// import isDesktop from '@h/useIsDesktop'

const router = useRouter()
const props = defineProps(['category'])
const globalStore = useGlobalStore()
const { theme } = storeToRefs(globalStore)
const pageSize = toRef(theme.value, 'libraryPageSize')
const libraryStore = useLibraryStore()
const { libraryData } = storeToRefs(libraryStore)
const query = libraryStore.query

// //字体计算
// const library = ref()
// const librarySize = useElementSize(library)
// theme.value.libraryWidth = librarySize.width
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
// const gutter = computed(() => {
//     return parseInt(fontSize.value) * 2 * theme.value.libraryGutterPercent + 'px'
// })

const currentPage = ref(
    router.currentRoute.value.query.page ? Number(router.currentRoute.value.query.page) : 1,
)

//数据查询
const total = ref(20)

//页面切换
const sizeChange = watch(pageSize, (newSize, oldSize) => {})
let oldPage = 0
const pageChange = watch(currentPage, (newPage, old) => {
    oldPage = old
})
console.log(libraryData.value, '=======')

query({})

useListenLifecycle('Library')
</script>

<script lang="ts">
export default {
    name: 'Library',
}
</script>

<template>
    <div ref="library" class="library-base col">
        <div>Library</div>
        <ElSlider v-model="theme.libraryColumnNum" :max="10" :min="1" style="width: 80%" />
        <div>{{ fontSize }}</div>
        <div>{{ globalStore.qwe }}</div>
        <div>{{ libraryData.title || libraryData.label }}</div>
        <div v-if="libraryData.label === 'overview'" class="library-overview col">
            <div v-for="lib in libraryData.children" :key="lib.path">
                <div>title:{{ lib.label }}</div>
            </div>
        </div>
        <div v-else class="library-cards">
            <VanGrid :column-num="theme.libraryColumnNum" :gutter="gutter" :border="false">
                <VanGridItem v-for="data in libraryData.children">
                    <LazyComponent class="library-lazy">
                        <Card
                            :key="data.title"
                            :data="data"
                            class="library-item"
                            :replace="replace"
                            :root="libraryData.path"
                            :font-size="fontSize"
                        />
                    </LazyComponent>
                </VanGridItem>
            </VanGrid>
            <div class="library-pagination">
                <ElPagination
                    v-model:current-page="currentPage"
                    v-model:page-size="pageSize"
                    :pager-count="5"
                    :page-sizes="[20, 24, 30, 60]"
                    :background="true"
                    layout=" prev, pager, next"
                    :total="total"
                    class="pagination"
                />
                <ElPagination
                    v-model:current-page="currentPage"
                    v-model:page-size="pageSize"
                    :page-sizes="[20, 24, 30, 60]"
                    :background="true"
                    layout=" total, sizes, jumper"
                    :total="total"
                    class="pagination"
                />
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
.library-base {
    min-height: 100%;
    width: 100%;
    font-size: v-bind('fontSize');
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
