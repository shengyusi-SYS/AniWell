<script setup lang="ts">
import { reqLibrary } from '@v/api'
import { useGlobalStore } from '@v/stores/global'
import { CardData } from '@v/stores/library'
import { useElementSize, useWindowSize } from '@vueuse/core'
import { storeToRefs } from 'pinia'
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
    const newSize =
        (posterWidth / 20) * theme.value.libraryFontSizePercent < 16
            ? (posterWidth / 20) * theme.value.libraryFontSizePercent
            : 16
    return newSize * theme.value.libraryFontSizePercent + 'px'
})
const gutter = computed(() => {
    return parseInt(fontSize.value) * theme.value.libraryGutterPercent + 'px'
})

let cardData: CardData = reactive({ title: '', poster: '', children: [] })
const query = async (catagory: string, itemId?: string) => {
    const res = await reqLibrary(catagory, itemId)
    for (const key in res) {
        if (Object.prototype.hasOwnProperty.call(res, key)) {
            const element = res[key]
            cardData[key] = element
        }
    }
}

onBeforeRouteUpdate(async (to, from, next) => {
    // console.log(from.params.catagory, '----->', to.params.catagory)
    // console.log(from.query.path, '====>', to.query.path)
    if (typeof to.query.path !== 'undefined') {
        query(to.params.catagory, to.query.path)
    } else {
        query(props.catagory)
    }
    next()
})

onMounted(() => {
    query(props.catagory, router.currentRoute.value.query.path)
})

onBeforeMount(() => {})

onBeforeUpdate(() => {})

onUnmounted(() => {})
const test = () => {}
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
                    <LazyComponent>
                        <Card :key="data.title" :data="data" class="library-item" />
                    </LazyComponent>
                </VanGridItem>
            </VanGrid>
        </div>
    </div>
</template>

<style lang="less" scoped>
.library-base {
    min-height: 100%;
    width: 100%;
    font-size: v-bind('fontSize');
    :deep(.van-grid-item__content) {
        display: block;
        max-width: 100%;
        padding: 0;
    }
    .library-item {
        width: 100%;
        aspect-ratio: var(--card-aspect-ratio);
    }
}
</style>
