<script setup lang="ts">
import isDesktop from '@h/useIsDesktop'
import { reqLibrary } from '@v/api'
import { useElementSize } from '@v/hooks/useElementSize'
import { CardData } from '@v/stores/library'

const router = useRouter()
const props = defineProps(['catagory'])

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

console.log('dadawfwaf', props.catagory, router.currentRoute.value.query.path)

const xNum = ref(isDesktop.value ? 5 : 2)
const gutter = ref('6em')

const library = ref()
const elSize = useElementSize(library)
const fontSize = ref('16px')
const fontPercent = ref(1)
const gutterPercent = ref(1)
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
onBeforeUpdate(() => {
    const posterWidth = elSize.elWidth / xNum.value
    const newSize = (posterWidth / 20) * fontPercent.value
    fontSize.value = (newSize < 16 ? newSize : 16) + 'px'
    gutter.value = (newSize < 16 ? newSize : 16) * 2 * gutterPercent.value + 'px'
})
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
        <ElSlider v-model="xNum" :max="10" :min="1" style="width: 80%" />
        <ElButton @click="test"></ElButton>
        <div>{{ elSize }}</div>
        <div>{{ fontSize }}</div>
        <div>gutter:<input v-model="gutterPercent" /></div>
        <div>
            <VanGrid :column-num="xNum" :gutter="gutter" :border="false">
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
    font-size: var(--font-size);
    :deep(.van-grid-item__content) {
        display: block;
        padding: 0;
    }
    .library-item {
        max-width: 100%;
        width: 100%;
        aspect-ratio: var(--card-aspect-ratio);
    }
}
</style>
