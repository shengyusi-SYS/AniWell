<script setup lang="ts">
import { useGlobalStore, globalCache } from '@v/stores/global'
import { storeToRefs } from 'pinia'
import { libraryData, useLibraryStore } from '@v/stores/library'

const libraryStore = useLibraryStore()
const { libraryData } = storeToRefs(libraryStore)
const currentTheme = ref({})
onMounted(() => {
    currentTheme.value = theme.value.library[libraryData?.value.libName]
})
const globalStore = useGlobalStore()
const { isDesktop, theme } = storeToRefs(globalStore)
</script>

<script lang="ts">
export default {
    name: 'Monitor',
}
</script>

<template>
    <div class="monitor-base">
        <ElTabs type="border-card" class="header-monitor-tabs">
            <ElTabPane label="样式" class="col header-monitor-tab-pane" style="text-align: left">
                <div>
                    base
                    <template v-for="(item, name) in theme.base" :key="name">
                        <div style="margin-left: 2em">
                            <ElInput
                                v-model="theme.base[name]"
                                :type="typeof item === 'string' ? 'text' : 'number'"
                                :placeholder="item.toString()"
                                class="input-with-select"
                            >
                                <template #prepend> {{ name }}: </template>
                                <template #append> </template>
                            </ElInput>
                        </div>
                    </template>
                </div>
                <div>
                    <template v-for="(item, name) in theme.library[libraryData.libName]" :key="name"
                        >{{ name }}
                        <div style="margin-left: 2em">
                            <template v-for="(i, n) in item" :key="n">
                                <div style="margin-left: 2em">
                                    <ElInput
                                        v-model="theme.library[libraryData?.libName][name][n]"
                                        :type="typeof i === 'string' ? 'text' : 'number'"
                                        :placeholder="i?.toString()"
                                        class="input-with-select"
                                    >
                                        <template #prepend> {{ n }}: </template>
                                        <template #append> </template>
                                    </ElInput>
                                </div>
                            </template>
                        </div>
                    </template>
                </div>
            </ElTabPane>
            <ElTabPane label="日志" class="col header-monitor-tab-pane"
                ><div class="monitor-log col">
                    <div v-for="log in globalCache.serverLog.list">
                        {{ new Date().toTimeString() }}:{{ log }}
                    </div>
                </div></ElTabPane
            >
            <ElTabPane label="消息" class="col header-monitor-tab-pane"><div>消息</div></ElTabPane>
            <ElTabPane label="延迟" class="col header-monitor-tab-pane"><div>延迟</div></ElTabPane>
        </ElTabs>
    </div>
</template>

<style lang="less" scoped>
.monitor-base {
    position: absolute;
    width: 30em;
    max-width: 100vw;
    height: 20em;
    right: 0;
    top: 4em;
    background-color: #000;
    z-index: 9;
    .header-monitor-tabs {
        height: 100%;
        overflow-y: scroll;
        overflow-x: hidden;
        .header-monitor-tab-pane {
            align-items: start;
        }
    }
}
:deep(.el-input-group__prepend) {
    padding: 0 0.5em;
}
:deep(.el-input-group__append) {
    padding: 0 1em;
}
</style>
