<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
    defineProps<{
        title?: string
        modelValue: string | number
        mode?: 'multiRow' | 'singleRow' | 'stacked'
        justify?: 'center' | 'left' | 'right' | 'between' | 'around' | 'evenly'
        radius?: string
        height?: string
        width?: string
    }>(),
    {
        title: 'title',
        modelValue: 'value',
        mode: 'singleRow',
        justify: 'center',
        height: '2em',
        width: '15em',
    },
)

defineEmits(['update:modelValue'])

const direction = computed(() => {
    switch (props.mode) {
        case 'multiRow':
        case 'stacked':
            return 'column'
        default:
            return 'row'
    }
})

const justify = computed(() => {
    // if (props.mode === 'stacked') return 'left'
    switch (props.justify) {
        case 'between':
            return 'space-between'
        case 'around':
            return 'space-around'
        case 'evenly':
            return 'space-evenly'
        case 'center':
        case 'left':
        case 'right':
            return props.justify
        default:
            return ''
    }
})

const align = computed(() =>
    props.mode === 'stacked' || props.mode === 'multiRow' ? 'flex-start' : 'center',
)
</script>

<script lang="ts">
export default {
    name: 'OInput',
}
</script>

<template>
    <span :class="`oinput-base ${mode}`">
        <div :class="`title `">
            {{ title }}
        </div>
        <div class="oinput-container row">
            <slot name="left"></slot>
            <input
                type="text"
                :value="modelValue"
                @input="$emit('update:modelValue', $event.target.value)"
            />
            <slot name="right"></slot>
        </div>
    </span>
</template>

<style lang="less" scoped>
.oinput-base {
    width: fit-content;
    display: flex;
    flex-direction: v-bind(direction);
    justify-content: v-bind(justify);
    border-radius: v-bind(radius);
    align-items: v-bind(align);
    // box-shadow: var(--el-box-shadow);
    position: relative;
    margin: 0.5em;
    .oinput-container {
        padding: 0.2em 0.6em;
        height: v-bind(height);
        width: v-bind(width);
        border-radius: v-bind(radius);
        border: 1px solid var(--el-border-color);
        background-color: white;
        align-content: center;
        align-items: center;
        input {
            width: 100%;
            height: 100%;
            border: none;
        }
    }
    &.stacked {
        .title {
            font-size: 0.8em;
            position: absolute;
            top: -0.7em;
            left: 1em;
            background-color: rgba(255, 255, 255, 1);
        }
    }
    &.multiRow {
        .title {
            padding-left: 0.5em;
        }
    }
    &.singleRow {
        .title {
            padding: 0.2em 0.6em;
        }
    }
}
</style>
