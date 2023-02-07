<script setup lang="ts">
import { encode, decode } from 'js-base64'
import { CardData } from '@v/stores/library'
const props = defineProps<{ data: CardData; aspectRatio?: number; fontSize?: any }>()
const { title, poster, path, itemId } = props.data

const router = useRouter()

const go = () => {
    // console.log('~~~~~~', router.currentRoute.value.path + `?path=${encode(props.data.path)}`)
    if (props.data.path) {
        router.push(router.currentRoute.value.path + `?path=${encode(props.data.path)}`)
    }
}
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
            poster,
        )}')`"
    >
        <div class="overlay" @click="go">
            <div class="info">
                <div class="title van-multi-ellipsis--l2">{{ title }}</div>
                <div class="note van-multi-ellipsis--l2">{{ path }}</div>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
.card-base {
    // aspect-ratio: v-bind(aspectRatio);
    aspect-ratio: var(--card-aspect-ratio);
    width: 100%;
    height: 100%;
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
            margin: 2em 1.5em;
            .title {
                font-family: Lato, Helvetica, Arial, sans-serif;
                font-weight: 700;
                font-size: 2em;
                color: var(--font-color-title);
                // -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3CforeignObject width='100%25' height='100%25'%3E%3Cbody class='wrap' xmlns='http://www.w3.org/1999/xhtml'%3E%3Cstyle%3E.wrap%7Bbox-sizing:border-box;margin:0;height:100%25;padding:10px%7D.shadow%7Bheight:100%25;background:%23000;border-radius:10px;box-shadow:0 0 5px %23000,0 0 10px %23000,0 0 15px %23000%7D%3C/style%3E%3Cdiv class='shadow'/%3E%3C/body%3E%3C/foreignObject%3E%3C/svg%3E");
            }
            .note {
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
