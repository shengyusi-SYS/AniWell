<script setup lang="ts">
interface CardData {
    title: string
    poster: string
    note?: string
    itemId?: string
    type?: string
}
const props = defineProps<{ data: CardData; aspectRatio?: number; fontSize?: any }>()
const { title, poster, note } = props.data
let aspectRatio = computed(() => (props.aspectRatio ? props.aspectRatio : 0.75))
</script>

<script lang="ts">
export default {
    name: 'Card',
}
</script>

<template>
    <div class="card-base col">
        <div class="title-overlay">
            <div class="title van-multi-ellipsis--l2">{{ title }}</div>
            <div class="note">{{ note }}</div>
        </div>
        <div class="poster-overlay"></div>
        <ElImage
            class="poster"
            :src="`/api/v1/library/poster/img.jpg?type=picture&path=${encodeURIComponent(poster)}`"
            fit="cover"
        />
    </div>
</template>

<style lang="less" scoped>
.card-base {
    // width: 100%;
    // height: 100%;
    aspect-ratio: v-bind(aspectRatio);
    position: relative;
    // margin: 4px;
    justify-content: center;
    align-items: center;
    font-size: 1em;
    .poster {
        width: 100%;
        height: 100%;
        z-index: 0;
    }
    .poster-overlay {
        box-shadow: inset 0 -2em 2em 0 rgba(0, 0, 0, 0.2), 0 0 2rem 0.6rem rgba(0, 0, 0, 0.4);
        bottom: -1px;
        position: absolute;
        aspect-ratio: v-bind(aspectRatio);
        height: 100%;
        z-index: 1;
        background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0) 0%,
            rgba(0, 0, 0, 0) 50%,
            rgba(0, 0, 0, 0.8) 100%
        );
        &:hover {
            box-shadow: inset 0 -1em 3em 0 rgba(0, 0, 0, 0.4), 0 0 2rem 0.6rem rgba(0, 0, 0, 0.6);
        }
    }
    .title-overlay {
        z-index: 3;
        max-width: 100%;
        word-break: break-all;
        padding: 0 1em;
        position: absolute;
        bottom: 3em;
        .title {
            font-family: Lato, Helvetica, Arial, sans-serif;
            font-weight: 700;
            font-size: 2em;
            color: white;
            // -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3CforeignObject width='100%25' height='100%25'%3E%3Cbody class='wrap' xmlns='http://www.w3.org/1999/xhtml'%3E%3Cstyle%3E.wrap%7Bbox-sizing:border-box;margin:0;height:100%25;padding:10px%7D.shadow%7Bheight:100%25;background:%23000;border-radius:10px;box-shadow:0 0 5px %23000,0 0 10px %23000,0 0 15px %23000%7D%3C/style%3E%3Cdiv class='shadow'/%3E%3C/body%3E%3C/foreignObject%3E%3C/svg%3E");
        }
        .note {
            color: gray;
        }
    }
}
</style>
