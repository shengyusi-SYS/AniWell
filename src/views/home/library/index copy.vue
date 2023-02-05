<script setup lang="ts">
import isDesktop from '@h/useIsDesktop'
import { reqOldLibrary } from '@v/api'
const urls = [
    'https://fuss10.elemecdn.com/a/3f/3302e58f9a181d2509f3dc0fa68b0jpeg.jpeg',
    'https://fuss10.elemecdn.com/1/34/19aa98b1fcb2781c4fba33d850549jpeg.jpeg',
    'https://fuss10.elemecdn.com/0/6f/e35ff375812e6b0020b6b4e8f9583jpeg.jpeg',
    'https://fuss10.elemecdn.com/9/bb/e27858e973f5d7d3904835f46abbdjpeg.jpeg',
    'https://fuss10.elemecdn.com/d/e6/c4d93a3805b3ce3f323f7974e6f78jpeg.jpeg',
    'https://fuss10.elemecdn.com/3/28/bbf893f792f03a54408b3b7a7ebf0jpeg.jpeg',
    'https://fuss10.elemecdn.com/2/11/6535bcfb26e4c79b48ddde44f4b6fjpeg.jpeg',
]
const defaultData = reactive([
    { title: 'a', poster: urls[0] },
    { title: 'b', poster: urls[1] },
    { title: 'c', poster: urls[2] },
    { title: 'ddddddddddddddddddddddddd', poster: urls[3] },
    { title: '测试测试测试测试', poster: urls[4], note: 'dqwfgewdaw' },
    { title: 'e', poster: urls[5] },
    { title: 'e', poster: urls[6] },
    { title: 'e', poster: urls[6] },
    { title: 'e', poster: urls[0] },
    { title: 'e', poster: urls[0] },
    { title: 'e', poster: urls[0] },
    { title: 'f', poster: urls[0] },
])
let newData: Array<object> = reactive([])
const cardData = computed(() => {
    console.log(newData)
    if (newData) {
        return newData
    } else return defaultData
})
const customAspectRatio = reactive({ width: 3, height: 4 })
const aspectRatio = computed(() => customAspectRatio.width / customAspectRatio.height)
const xNum = ref(isDesktop.value ? 5 : 2)
const count = ref(24)
const showNum = computed(() =>
    count.value <= cardData.value.length ? count.value : cardData.value.length,
)
const yNum = computed(
    () => Math.trunc(showNum.value / xNum.value) + (showNum.value % xNum.value === 0 ? 0 : 1),
)
const widthPercent = computed(() => 100 / xNum.value + '%')
console.log(xNum.value, yNum.value, widthPercent.value)
let iid: number

const load = () => {
    console.log('load')

    count.value < cardData.value.length ? (count.value += xNum.value) : null
}

// const library = getCurrentInstance()
// const elWidth = ref(0)
// const cardWidth = ref(108)
// const cardHeight = ref(192)
onMounted(() => {
    //     window.onresize = (a) => {
    //         elWidth.value = library?.refs?.library?.clientWidth
    //         cardWidth.value = Math.trunc(elWidth.value / xNum.value)
    //         cardHeight.value = Math.trunc((elWidth.value * 16) / (xNum.value * 9))
    //         console.log(elWidth.value, cardWidth.value, cardHeight.value)
    //     }
    reqOldLibrary()
        .then((library) => {
            library.children[0].children.forEach((element) => {
                newData.push(element)
            })
            console.log(newData, newData.length, cardData)
        })
        .catch((err) => {})
})
// onUnmounted(() => {
//     window.onresize = null
// })
</script>

<script lang="ts">
export default {
    name: 'Library',
}
</script>

<template>
    <div class="library-base col">
        <div>Library</div>
        <ElSlider v-model="xNum" :max="10" :min="1" style="width: 80%" />
        <ElButton @click="cardData.splice(0, 1)"></ElButton>
        <div>
            <div>width:<input v-model="customAspectRatio.width" /></div>
            <div>height:<input v-model="customAspectRatio.height" /></div>
            <div>{{ aspectRatio }}</div>
        </div>
        <div ref="library">
            <ElRow v-for="y in yNum">
                <!-- <template v-if="">

                </template> -->
                <ElCol v-for="x in xNum" class="item">
                    <template> {{ (iid = x + (y - 1) * xNum) }}</template>
                    <template v-if="iid <= count">
                        <Card
                            :key="cardData[iid - 1].title"
                            :data="cardData[iid - 1]"
                            :aspect-ratio="aspectRatio"
                        />
                        <!-- <div>{{ y }},{{ x }},{{ iid }}</div> -->
                    </template>
                </ElCol>
            </ElRow>
        </div>
    </div>
</template>

<style lang="less" scoped>
.library-base {
    min-height: 100%;
    width: 100%;
}
.item {
    max-width: v-bind(widthPercent);
}
</style>
