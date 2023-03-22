<script setup lang="ts">
import { libraryInfo, reqAddLibrary, reqDeleteLibrary, reqLibraryList, ScraperConfig } from '@v/api'
import useListenLifecycle from '@v/hooks/useListenLifecycle'
import { Ref } from 'vue'

const libraryList: Ref<libraryInfo[]> = ref([])

const update = async () => {
    try {
        libraryList.value = await reqLibraryList()
    } catch (error) {}
}

update()

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

const newConfig = ref(JSON.parse(JSON.stringify(defaultScraperConfig)))

const addLibrary = async () => {
    console.log('addLibrary', newConfig.value)
    try {
        await reqAddLibrary(newConfig.value)
        newConfig.value = JSON.parse(JSON.stringify(defaultScraperConfig))
        formOpenned.value = false
    } catch (error) {}
}

const formOpenned = ref(false)

const warningDelete = ref(false)

const queryDelte: Ref<libraryInfo> = ref({})

const confirmDelete = async (libName: string) => {
    try {
        await reqDeleteLibrary(libName)
        warningDelete.value = false
        update()
    } catch (error) {}
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
        <div class="col">
            <div v-for="library in libraryList">
                <div
                    class="col"
                    style="
                        width: 20em;
                        min-height: 10em;
                        border: 1px solid var(--el-border-color);
                        margin: 1em 0;
                    "
                >
                    <div class="libraryManager-card-label" style="font-weight: 600">
                        名称： {{ library.name }}
                    </div>
                    <div class="libraryManager-card-label">路径：{{ library.rootPath }}</div>
                    <div class="libraryManager-card-label">类型：{{ library.category }}</div>
                    <ElButton
                        type="danger"
                        class="libraryManager-delete"
                        @click="
                            () => {
                                warningDelete = true
                                queryDelte = library
                            }
                        "
                        >删除</ElButton
                    >
                </div>
            </div>
        </div>
        <ElDialog v-model="warningDelete" title="确定删除?" width="30%" align-center>
            <div class="col" style="justify-content: center; align-items: center">
                <div class="libraryManager-card-label" style="font-size: 1.5em">
                    {{ queryDelte.name }}
                </div>
                <div class="libraryManager-card-label">位于{{ queryDelte.rootPath }}</div>
                <ElButton
                    type="danger"
                    class="libraryManager-delete"
                    @click="confirmDelete(queryDelte.name)"
                    >删除</ElButton
                >
            </div>
        </ElDialog>
        <ElDialog v-model="formOpenned" title="新建资源库" width="30%" align-center>
            <div class="col libraryManager-form">
                <ElInput
                    v-model="newConfig.name"
                    type="string"
                    placeholder="名称"
                    class="libraryManager-input"
                />
                <ElInput
                    v-model="newConfig.rootPath"
                    type="string"
                    placeholder="资源库根路径"
                    class="libraryManager-input"
                />

                <ElButton type="primary" class="libraryManager-save" @click="addLibrary"
                    >提交</ElButton
                >
            </div>
        </ElDialog>
        <ElButton type="primary" class="libraryManager-save" @click="formOpenned = true"
            >添加</ElButton
        >
    </div>
</template>

<style lang="less" scoped>
.libraryManager-base {
    .libraryManager-form {
        flex-grow: 1;
        text-align: left;
        justify-content: center;
        align-items: center;
        .libraryManager-input {
            min-height: 2em;
            margin: 0.5em 0;
            // width: 60em;
            max-width: 60em;
            flex-grow: 1;
            font-size: 1em;
            height: 2.5em;
        }
    }
    .libraryManager-save,
    .libraryManager-delete {
        font-size: 1.2em;
        margin: 1em;
        min-height: 2em;
        width: 6em;
    }
    .libraryManager-card-label {
        text-align: left;
        margin: 1em 1em;
    }
    :deep(.el-dialog__header) {
        margin: 0;
    }
}
</style>
