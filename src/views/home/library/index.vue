<script setup lang="ts">
import isDesktop from '@h/useIsDesktop'
import { reqOldLibrary } from '@v/api'
import { useElementSize } from '@v/hooks/useElementSize'

let newData: Array<object> = reactive([])
const cardData = computed(() => {
    // console.log(newData)
    if (newData) {
        return newData
    } else return []
})

const router = useRouter()

const customAspectRatio = reactive({ width: 3, height: 4 })
const aspectRatio = computed(() => customAspectRatio.width / customAspectRatio.height)

const xNum = ref(isDesktop.value ? 5 : 2)
const gutter = ref('6em')

const library = ref()
const elSize = useElementSize(library)
const fontSize = ref('16px')
const fontPercent = ref(1)
const gutterPercent = ref(1)
const watchFontSize = watch(elSize, (v) => {
    const posterWidth = v.elWidth / xNum.value
    const newSize = (posterWidth / 20) * fontPercent.value
    fontSize.value = (newSize < 16 ? newSize : 16) + 'px'
    gutter.value = (newSize < 16 ? newSize : 16) * 2 * gutterPercent.value + 'px'
})

onMounted(() => {
    reqOldLibrary()
        .then((library) => {
            library.children[0].children.forEach((element, i) => {
                i < 200 ? newData.push(element) : null
            })
        })
        .catch((err) => {})
})
onUnmounted(() => {
    watchFontSize()
})
const test = () => {
    console.log(router.currentRoute.value)

    router.push(router.currentRoute.value.fullPath + '/item')
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
        <ElSlider v-model="xNum" :max="10" :min="1" style="width: 80%" />
        <ElButton @click="test"></ElButton>
        <div>{{ elSize }}</div>
        <div>{{ fontSize }}</div>
        <div>
            <div>width:<input v-model="customAspectRatio.width" /></div>
            <div>height:<input v-model="customAspectRatio.height" /></div>
            <div>{{ aspectRatio }}</div>
        </div>
        <div>gutter:<input v-model="gutterPercent" /></div>
        <div>
            <VanGrid :column-num="xNum" :gutter="gutter" :border="false">
                <VanGridItem v-for="data in cardData">
                    <LazyComponent>
                        <Card
                            :key="data.title"
                            :data="data"
                            :aspect-ratio="aspectRatio"
                            class="item-card"
                        />
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
    font-size: v-bind(fontSize);
    :deep(.van-grid-item__content) {
        display: block;
        padding: 0;
    }
    .item-card {
    }
}
</style>
