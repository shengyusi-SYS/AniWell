<script setup lang="ts">
import { reqLibrary } from '@v/api'
import useListenLifecycle from '@v/hooks/useListenLifecycle'
import { useGlobalStore } from '@v/stores/global'
import { CardData } from '@v/stores/library'
import { useElementSize, useWindowSize } from '@vueuse/core'
import { storeToRefs } from 'pinia'
// import VideoPlayer from '@v/components/VideoPlayer/index.vue'
// import { useElementSize } from '@v/hooks/useElementSize'
// import isDesktop from '@h/useIsDesktop'

const router = useRouter()
const props = defineProps(['catagory'])
const globalStore = useGlobalStore()
const { theme } = storeToRefs(globalStore)
const pageSize = toRef(theme.value, 'libraryPageSize')

//字体计算
const library = ref()
const librarySize = useElementSize(library)
theme.value.libraryWidth = librarySize.width
const fontSize = computed(() => {
    const posterWidth = theme.value.libraryWidth / theme.value.libraryColumnNum
    const posterHeight = posterWidth / theme.value.libraryItemAspectRatio
    const reference = posterWidth < posterHeight ? posterWidth : posterHeight
    // console.log(posterWidth)
    const newSize =
        reference / 20 < 16
            ? (reference / 20) *
              theme.value.libraryFontSizePercent *
              theme.value.libraryItemAspectRatio
            : 16
    return newSize * theme.value.libraryFontSizePercent + 'px'
})
//间距计算
const gutter = computed(() => {
    return parseInt(fontSize.value) * 2 * theme.value.libraryGutterPercent + 'px'
})

let cardData: CardData = reactive({ title: '', poster: '', children: [] })
const currentPage = ref(
    router.currentRoute.value.query.page ? Number(router.currentRoute.value.query.page) : 1,
)

//数据查询
const total = ref(20)
const defaultOptions: { catagory?: string; itemId?: string; start?: number } = {
    catagory: props.catagory,
    itemId: '',
    start: 0,
}
const query = async (options = defaultOptions) => {
    const { catagory, itemId, start } = { ...defaultOptions, ...options }
    const newData = await reqLibrary(catagory, itemId, {
        start,
        end: start + pageSize.value,
    })
    total.value = newData.total
    for (const key in newData) {
        if (Object.prototype.hasOwnProperty.call(newData, key)) {
            const element = newData[key]
            cardData[key] = element
        }
    }
    cardData.children?.forEach((v) => {
        if (!v.path) {
            v.path = cardData.path + '\\' + v.label
        }
    })
}

//页面切换
const sizeChange = watch(pageSize, (newSize, oldSize) => {
    //to fix
    query({
        itemId: router.currentRoute.value.query.path,
        start: oldSize * (currentPage.value - 1),
    })
})
let oldPage = 0
const pageChange = watch(currentPage, (newPage, old) => {
    oldPage = old
    if (router.currentRoute.value.query.path === toPath) {
        router.push({
            name: 'library',
            query: { path: router.currentRoute.value.query.path, page: newPage },
            params: router.currentRoute.value.params,
        })
    }
})

//处理错误导航
let clean = false
let replace = () => {
    if (clean) {
        clean = false
        return true
    } else {
        return false
    }
}

let lastPath = router.currentRoute.value.query.path
let toPath = router.currentRoute.value.query.path
onBeforeRouteUpdate(async (to, from, next) => {
    // console.log('1 onBeforeRouteUpdate', from.query.path, '~~~~~~~', to.query.path)
    toPath = to.query.path
    //准确跳转
    if (typeof to.params.catagory === 'string' && typeof to.query.path === 'string') {
        try {
            await query({
                catagory: to.params.catagory,
                itemId: to.query.path,
                start: to.query.page ? (Number(to.query.page) - 1) * pageSize.value : 0,
            })
            // console.log('1')
            currentPage.value = to.query.page ? Number(to.query.page) : 1
        } catch (error) {
            toPath = from.query.path
            clean = true
            next()
            return
        }
    } else {
        //默认跳转
        try {
            await query()
            // console.log('2')
            currentPage.value = to.query.page ? Number(to.query.page) : 1
        } catch (error) {
            toPath = from.query.path
            clean = true
            next()
            return
        }
    }
    lastPath = from.query.path
    library.value.scrollIntoView({
        // behavior: 'smooth',
        block: 'start',
    })
    next()
})

onMounted(() => {})
query({
    catagory: router.currentRoute.value.params.catagory,
    itemId: router.currentRoute.value.query.path,
    start: router.currentRoute.value.query.page
        ? (Number(router.currentRoute.value.query.page) - 1) * pageSize.value
        : 0,
})

onBeforeMount(() => {})

onBeforeUpdate(() => {})

onUnmounted(() => {})

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

        <div class="library-cards">
            <VanGrid :column-num="theme.libraryColumnNum" :gutter="gutter" :border="false">
                <VanGridItem v-for="data in cardData.children">
                    <LazyComponent class="library-lazy">
                        <Card
                            :key="data.title"
                            :data="data"
                            class="library-item"
                            :replace="replace"
                            :root="cardData.path"
                            :font-size="fontSize"
                        />
                    </LazyComponent>
                </VanGridItem>
            </VanGrid>
        </div>
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
