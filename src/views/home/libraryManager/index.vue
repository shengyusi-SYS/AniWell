<script setup lang="ts">
import {
    clientLog,
    libraryInfo,
    reqAddLibrary,
    reqDeleteLibrary,
    reqEditMapRule,
    reqLibraryList,
    reqReapirLibrary,
    reqUpdateLibrary,
    ScraperConfig,
} from '@v/api'
import useListenLifecycle from '@v/hooks/useListenLifecycle'
import { useGlobalStore } from '@v/stores/global'
import { storeToRefs } from 'pinia'
import { Ref } from 'vue'
const libraryList: Ref<libraryInfo[]> = ref([])

const globalStore = useGlobalStore()
const { isDesktop } = storeToRefs(globalStore)

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
        pixFmt: 'baseInfo.pixFmt',
        poster: 'scraperInfo.extPic.poster',
        title: 'scraperInfo.dandan.title',
        order: 'scraperInfo.dandan.episode',
        parentTitle: 'scraperInfo.dandan.animeTitle',
    },
    mapDir: {
        order: 'scraperInfo.dandan.animeId',
        path: 'baseInfo.path',
        title: ['scraperInfo.dandan.animeTitle', 'scraperInfo.children.title'],
        result: 'baseInfo.result',
        poster: 'scraperInfo.local.poster',
        create: 'baseInfo.birthtime',
        add: 'baseInfo.add',
        update: 'baseInfo.update',
        change: 'baseInfo.mtime',
        air: 'scraperInfo.dandan.startDate',
        rank: 'scraperInfo.dandan.rating',
        like: 'scraperInfo.dandan.isFavorited',
    },
}

const newConfig = ref(JSON.parse(JSON.stringify(defaultScraperConfig)))
const formOpenned = ref(false)
const addLibrary = async () => {
    console.log('addLibrary', newConfig.value)
    try {
        await reqAddLibrary(newConfig.value)
        newConfig.value = JSON.parse(JSON.stringify(defaultScraperConfig))
        formOpenned.value = false
        update()
    } catch (error) {}
}

type manageMethods = 'update' | 'repair' | 'delete'
const dialogOpen = ref(false)
const targetLibrary: Ref<libraryInfo | undefined> = ref(undefined)
const manageMethod: Ref<manageMethods | undefined> = ref(undefined)
const queryManage = (library: libraryInfo, method: manageMethods) => {
    dialogOpen.value = true
    targetLibrary.value = library
    manageMethod.value = method
}
const cleanQueryManage = () => {
    dialogOpen.value = false
    targetLibrary.value = undefined
    manageMethod.value = undefined
    update()
}
const manageLibrary = async () => {
    const method = manageMethod.value
    const target = targetLibrary.value
    if (target == undefined) return
    // console.log(target)

    try {
        if (method === 'update') {
            await reqUpdateLibrary(target.name, target.rootPath)
        } else if (method === 'repair') {
            await reqEditMapRule(
                Object.assign(JSON.parse(JSON.stringify(defaultScraperConfig)), {
                    libName: target.name,
                }),
            )
            await reqReapirLibrary(target.name)
        } else if (method === 'delete') {
            await reqDeleteLibrary(target.name)
        }
    } catch (error) {
        clientLog('manageLibrary error', error)
    }
    cleanQueryManage()
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
        <div class="libraryManager-list row">
            <template v-for="library in libraryList" :key="library.libName">
                <div class="col libraryManager-card">
                    <div class="libraryManager-card-label" style="font-weight: 600">
                        名称： {{ library.name }}
                    </div>
                    <div class="libraryManager-card-label">路径：{{ library.rootPath }}</div>
                    <div class="libraryManager-card-label">类型：{{ library.category }}</div>
                    <div class="row">
                        <ElButton
                            type="primary"
                            class="libraryManager-update"
                            @click="() => queryManage(library, 'update')"
                            >更新</ElButton
                        >
                        <ElButton
                            type="warning"
                            class="libraryManager-repair"
                            @click="() => queryManage(library, 'repair')"
                            >修复</ElButton
                        >
                        <ElButton
                            type="danger"
                            class="libraryManager-delete"
                            @click="() => queryManage(library, 'delete')"
                            >删除</ElButton
                        >
                    </div>
                </div>
            </template>
        </div>
        <ElDialog
            v-model="dialogOpen"
            :title="
                (manageMethod === 'delete' ? '删除' : manageMethod === 'repair' ? '修复' : '更新') +
                '?'
            "
            :width="isDesktop ? '30em' : '100%'"
            align-center
            @closed="cleanQueryManage"
        >
            <div class="col" style="justify-content: center; align-items: center">
                <div class="libraryManager-card-label" style="font-size: 1.5em">
                    {{ targetLibrary?.name }}
                </div>
                <div class="libraryManager-card-label">位于{{ targetLibrary?.rootPath }}</div>
                <ElButton
                    :type="
                        manageMethod === 'delete'
                            ? 'danger'
                            : manageMethod === 'repair'
                            ? 'warning'
                            : 'primary'
                    "
                    class="libraryManager-delete"
                    @click="manageLibrary"
                    >确定</ElButton
                >
            </div>
        </ElDialog>
        <ElDialog
            v-model="formOpenned"
            title="新建资源库"
            :width="isDesktop ? '30em' : '100%'"
            align-center
        >
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
    padding: 0;
    overflow-x: hidden;
    overflow-y: scroll;
    .libraryManager-list {
        flex-wrap: wrap;
    }
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
    .libraryManager-card {
        width: 20em;
        min-height: 10em;
        border: 1px solid var(--el-border-color);
        margin: 1em 1em;
    }

    .libraryManager-save,
    .libraryManager-update,
    .libraryManager-repair,
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
