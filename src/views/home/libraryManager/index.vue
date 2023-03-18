<script setup lang="ts">
import { reqAddLibrary, reqLibraryList, ScraperConfig } from '@v/api'
import useListenLifecycle from '@v/hooks/useListenLifecycle'
reqLibraryList()
    .then((result) => {
        console.log(result)
    })
    .catch((err) => {})

const defaultScraperConfig: ScraperConfig = {
    rootPath: '',
    name: '',
    category: 'anime',
    mapFile: {
        path: 'baseInfo.path',
        result: 'baseInfo.result',
        display: 'baseInfo.display',
        mime: 'baseInfo.mime',
        poster: 'scraperInfo.extPic.poster',
        title: 'scraperInfo.dandan.title',
        order: 'scraperInfo.dandan.episode',
        parentTitle: 'scraperInfo.dandan.animeTitle',
    },
    mapDir: {
        order: '',
        path: 'baseInfo.path',
        title: 'scraperInfo.children.title',
        result: 'baseInfo.result',
        poster: 'scraperInfo.local.poster',
    },
}

const addLibrary = async () => {
    console.log('addLibrary')

    await reqAddLibrary(defaultScraperConfig)
}
useListenLifecycle('LibraryManager')
</script>

<script lang="ts">
export default {
    name: 'LibraryManager',
}
</script>

<template>
    <div class="libraryManager-base col">
        <div>LibraryManager</div>
        <div @click="addLibrary">tttttttt</div>
    </div>
</template>

<style lang="less" scoped>
.libraryManager-base {
}
</style>
