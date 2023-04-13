<script setup lang="ts">
import { useDraggable } from '@vueuse/core'
import { useClickAway } from '@vant/use'
import type { Ref } from 'vue'
import useListenLifecycle from '@v/hooks/useListenLifecycle'
interface coordinate {
    x: number
    y: number
}
const props = defineProps<{ coordinate: coordinate; isShow: boolean; clickAway: () => void }>()

const el = ref<HTMLElement | undefined>(undefined)

// `style` will be a helper computed for `left: ?px; top: ?px;`
const { x, y, style } = useDraggable(el, {
    initialValue: { x: 40, y: 40 },
})

const show = ref(false)

useClickAway(el, () => {
    show.value = false
    props.clickAway()
    console.log('useClickAway', show.value)
})

watchEffect(() => {
    console.log('WATCH', '-----', props.coordinate, { x, y }, show.value, props.isShow)

    x.value = props.coordinate.x
    y.value = props.coordinate.y
    show.value = props.isShow
})

// useListenLifecycle('floatMenu')
</script>

<script lang="ts">
export default {
    name: 'FloatMenu',
}
</script>

<template>
    <div v-show="show" ref="el" :style="style" style="position: fixed">
        <slot></slot>
    </div>
</template>

<style lang="less" scoped>
.floatMenu-base {
}
</style>
