<script setup lang="ts">
import { reqLibrary } from '@v/api'
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

const library = ref()
const librarySize = useElementSize(library)
theme.value.libraryWidth = librarySize.width
const fontSize = computed(() => {
    const posterWidth = theme.value.libraryWidth / theme.value.libraryColumnNum
    console.log(posterWidth)

    const newSize =
        (posterWidth / 20) * theme.value.libraryFontSizePercent < 16
            ? (posterWidth / 20) * theme.value.libraryFontSizePercent
            : 16
    return newSize * theme.value.libraryFontSizePercent + 'px'
})
const gutter = computed(() => {
    return parseInt(fontSize.value) * 2 * theme.value.libraryGutterPercent + 'px'
})

let cardData: CardData = reactive({ title: '', poster: '', children: [] })
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(20)
const defaultOptions: { catagory?: string; itemId?: string; start?: number } = {
    catagory: props.catagory,
    itemId: '',
    start: 0,
}
const query = async (options = defaultOptions) => {
    const { catagory, itemId, start } = { ...defaultOptions, ...options }
    // console.log(catagory, itemId, {
    //     start: (currentPage.value - 1) * pageSize.value,
    //     end: currentPage.value * pageSize.value,
    // })
    const newData = await reqLibrary(catagory, itemId, {
        start: (currentPage.value - 1) * pageSize.value,
        end: currentPage.value * pageSize.value,
    })
    total.value = newData.total
    for (const key in newData) {
        if (Object.prototype.hasOwnProperty.call(newData, key)) {
            const element = newData[key]
            cardData[key] = element
        }
    }
    cardData.children?.sort((a, b) => {
        let result = a.episode - b.episode
        if (result) {
            return result
        }
        if (a.children && b.children) {
            return 0
        }
        if (a.children) {
            return -1
        }
        if (b.children) {
            return 1
        }
    })
}
const onSizeChange = (size: number) => {
    query({ itemId: router.currentRoute.value.query.path })
}
const onPageChange = (page: number) => {
    currentPage.value = page
    // console.log('4', page)
    query({ itemId: router.currentRoute.value.query.path })
}

let clean = false
let replace = () => {
    if (clean) {
        clean = false
        return true
    } else {
        return false
    }
}
onBeforeRouteUpdate(async (to, from, next) => {
    if (typeof to.params.catagory === 'string' && typeof to.query.path === 'string') {
        try {
            // console.log('1')
            await query({ catagory: to.params.catagory, itemId: to.query.path })
        } catch (error) {
            clean = true
            next()
            return
        }
    } else {
        // console.log('2', to.query)
        try {
            await query()
        } catch (error) {
            clean = true
            next()
            return
        }
    }
    next()
})

onMounted(() => {
    // console.log('3')
    query({ itemId: router.currentRoute.value.query.path })
})

onBeforeMount(() => {})

onBeforeUpdate(() => {})

onUnmounted(() => {})

const show = ref(false)
const test = () => {
    console.log('test')

    show.value = true
}
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
        <ElButton @click="test"></ElButton>
        <div>gutter:<input v-model="theme.libraryGutterPercent" /></div>
        <div>{{ fontSize }}</div>
        <div>{{ gutter }}</div>
        <div>
            <VanGrid :column-num="theme.libraryColumnNum" :gutter="gutter" :border="false">
                <VanGridItem v-for="data in cardData.children">
                    <LazyComponent class="library-lazy">
                        <Card
                            :key="data.title"
                            :data="data"
                            class="library-item"
                            :replace="replace"
                        />
                    </LazyComponent>
                </VanGridItem>
            </VanGrid>
        </div>
        <VanOverlay :show="show" @click="show = false">
            <div v-if="show" class="wrapper" @click.stop>
                <VideoPlayer url="/api/v1/video/test.mp4"></VideoPlayer>
            </div>
        </VanOverlay>
        <ElPagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[20, 24, 30, 60]"
            :background="true"
            layout="total, sizes, prev, pager, next, jumper"
            :total="total"
            @size-change="onSizeChange"
            @current-change="onPageChange"
        />
    </div>
</template>

<style lang="less" scoped>
.library-base {
    min-height: 100%;
    width: 100%;
    font-size: v-bind('fontSize');
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
