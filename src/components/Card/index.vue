<script setup lang="ts">
import { encode } from 'js-base64'
import { libraryData } from '@v/stores/library'
import { useVideoPlayerStore } from '@v/stores/videoPlayer'
import { useGlobalStore } from '@v/stores/global'
import { storeToRefs } from 'pinia'
import {} from '@v/api'
import { ComputedRef } from 'vue'
import { el } from 'element-plus/es/locale'

const globalStore = useGlobalStore()
const videoPlayerStore = useVideoPlayerStore()
const { theme } = storeToRefs(globalStore)
const props = defineProps<{
    data: libraryData
    fontSize?: string
    replace?: () => boolean
}>()
// const { title, poster, path, itemId, result } = props.data

const aspectRatio = computed(() => {
    return props.data.result === 'item'
        ? theme.value.cardAspectRatio
        : theme.value.libraryItemAspectRatio
})

const cardFontSize = computed(() => {
    const libraryFontSize = parseInt(props.fontSize)
    if (props.data.result === 'item') {
        return libraryFontSize / aspectRatio.value + 'px'
    } else return libraryFontSize + 'px'
})
</script>

<script lang="ts">
export default {
    name: 'Card',
}
</script>

<template>
    <div
        class="card-base col"
        :style="`background-image:url('/api/v1/library/poster/img.jpg?path=${encodeURIComponent(
            data.poster,
        )}')`"
    >
        <div class="overlay">
            <div class="info">
                <div class="title van-multi-ellipsis--l2">{{ data.title }}</div>
                <div class="note van-multi-ellipsis--l2">{{ data.label }}</div>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
.card-base {
    aspect-ratio: v-bind(aspectRatio);
    font-size: v-bind('cardFontSize');
    // aspect-ratio: 2;
    width: 100%;
    // height: 100%;
    background-size: cover;
    box-shadow: var(--card-shadow);
    &:hover {
        box-shadow: var(--card-shadow-hover);
    }
    .overlay {
        max-width: 100%;
        height: 100%;
        word-break: break-all;
        text-align: left;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        box-sizing: border-box;
        .info {
            // position: relative;
            .title {
                margin: 0.5em 0.5em;
                font-family: Lato, Helvetica, Arial, sans-serif;
                font-weight: 700;
                font-size: 2em;
                color: var(--font-color-title);
                // -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3CforeignObject width='100%25' height='100%25'%3E%3Cbody class='wrap' xmlns='http://www.w3.org/1999/xhtml'%3E%3Cstyle%3E.wrap%7Bbox-sizing:border-box;margin:0;height:100%25;padding:10px%7D.shadow%7Bheight:100%25;background:%23000;border-radius:10px;box-shadow:0 0 5px %23000,0 0 10px %23000,0 0 15px %23000%7D%3C/style%3E%3Cdiv class='shadow'/%3E%3C/body%3E%3C/foreignObject%3E%3C/svg%3E");
            }
            .note {
                margin: 1em 1.5em;
                // position: absolute;
                color: var(--font-color-secondary);
            }
        }
        background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0) 0%,
            rgba(0, 0, 0, 0.2) 50%,
            rgba(0, 0, 0, 0.8) 100%
        );
        &:hover {
            // box-shadow: var(--card-shadow-hover);
            background: linear-gradient(
                to bottom,
                rgba(0, 0, 0, 0) 0%,
                rgba(0, 0, 0, 0.3) 50%,
                rgba(0, 0, 0, 0.9) 100%
            );
        }
    }
}
</style>
