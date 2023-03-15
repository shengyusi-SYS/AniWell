<script setup lang="ts">
import { encode } from 'js-base64'
import { libraryData, useLibraryStore } from '@v/stores/library'
import { storeToRefs } from 'pinia'

const libraryStore = useLibraryStore()
const { libraryData, currentTheme, boxTheme } = storeToRefs(libraryStore)
const props = defineProps<{
    data: libraryData
}>()
const { result } = props.data

const cardTheme = currentTheme.value[result]

const poster: string = props.data.poster
    ? `'/api/v1//library/poster?path=${encodeURIComponent(props.data.poster)}'`
    : ''

//  let poster = URL.createObjectURL(await reqPoster(props.data.poster))
</script>

<script lang="ts">
export default {
    name: 'Card',
}
</script>

<template>
    <div class="card-base col" :style="`background-image:url(${poster})`">
        <div class="card-overlay">
            <div class="card-space"></div>
            <div class="card-info col">
                <div class="card-title van-multi-ellipsis--l2">{{ data.title || data.label }}</div>
                <div
                    class="card-label"
                    :class="result === 'item' ? 'van-ellipsis' : 'van-multi-ellipsis--l2'"
                >
                    {{ data.label }}
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
.card-base {
    aspect-ratio: v-bind('cardTheme.aspectRatio');
    font-size: v-bind('cardTheme.fontSize+"em"');
    width: 100%;
    background-size: cover;
    box-shadow: v-bind('cardTheme.shadow');
    &:hover {
        box-shadow: v-bind('cardTheme.shadowHover');
    }
    .card-overlay {
        max-width: 100%;
        height: 100%;
        word-break: break-all;
        text-align: left;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        font-size: v-bind('cardTheme.fontSize+"em"');
        .card-space {
            flex-grow: 1;
        }
        .card-info {
            padding: 0.5em 0.5em;
            .card-title {
                font-family: Lato, Helvetica, Arial, sans-serif;
                font-weight: 700;
                font-size: v-bind('cardTheme.fontSizeTitle+"em"');
                color: v-bind('cardTheme.fontColorTitle');
                // -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3CforeignObject width='100%25' height='100%25'%3E%3Cbody class='wrap' xmlns='http://www.w3.org/1999/xhtml'%3E%3Cstyle%3E.wrap%7Bbox-sizing:border-box;margin:0;height:100%25;padding:10px%7D.shadow%7Bheight:100%25;background:%23000;border-radius:10px;box-shadow:0 0 5px %23000,0 0 10px %23000,0 0 15px %23000%7D%3C/style%3E%3Cdiv class='shadow'/%3E%3C/body%3E%3C/foreignObject%3E%3C/svg%3E");
            }
            .card-label {
                margin: 0.8em 1em;
                // position: absolute;
                font-size: v-bind('cardTheme.fontSizeLabel+"em"');
                color: v-bind('cardTheme.fontColorLabel');
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
