<script setup lang="ts">
import { reqChangeSettings } from '@v/api'
import useListenLifecycle from '@v/hooks/useListenLifecycle'
import { useGlobalStore } from '@v/stores/global'
import { useSettingsStore } from '@v/stores/settings'
import { storeToRefs } from 'pinia'

const globalStore = useGlobalStore()

const store = useSettingsStore()
const { settings } = storeToRefs(store)
store.getSettings()

const changeSettings = async () => {
    try {
        await reqChangeSettings(settings.value)
    } catch (error) {}
    try {
        await store.getSettings()
        ElMessage.success('保存成功')
    } catch (error) {}
}

const settingsTemplate = {
    server: {
        label: '服务器',
        serverPort: {
            checker: () => {},
            type: 'number',
            label: '',
            note: '',
        },
        ffmpegPath: {
            checker: () => {},
            type: 'text',
            placeholder: '',
            label: '',
            note: '',
        },
        tempPath: {
            checker: () => {},
            type: 'text',
            placeholder: '',
            label: '',
            note: '',
        },
        cert: {
            checker: () => {},
            type: 'text',
            placeholder: '',
            label: '',
            note: '',
        },
        key: {
            checker: () => {},
            type: 'text',
            placeholder: '',
            label: '',
            note: '',
        },
        debug: {
            checker: () => {},
            type: 'select',
            label: '',
            note: '',
            selection: [
                { label: '开', value: true },
                { label: '关', value: false },
            ],
        },
    },
    transcode: {
        label: '转码',
        platform: {
            checker: () => {},
            type: 'select',
            label: '',
            note: '',
            selection: [
                { label: 'nvidia', value: 'nvidia' },
                { label: 'intel', value: 'intel' },
                { label: 'amd', value: 'amd' },
                { label: 'vaapi', value: 'vaapi' },
            ],
        },
        bitrate: {
            checker: () => {},
            type: 'number',
            label: '',
            note: '',
        },
        autoBitrate: {
            checker: () => {},
            type: 'select',
            label: '',
            note: '',
            selection: [
                { label: '开', value: true },
                { label: '关', value: false },
            ],
        },
        advAccel: {
            checker: () => {},
            type: 'select',
            label: '',
            note: '',
            selection: [
                { label: '开', value: true },
                { label: '关', value: false },
            ],
        },
        encode: {
            checker: () => {},
            type: 'select',
            label: '',
            note: '',
            selection: [{ label: 'h264', value: 'h264' }],
        },
        customInputCommand: {
            checker: () => {},
            type: 'text',
            placeholder: '',
            label: '',
            note: '',
        },
        customOutputCommand: {
            checker: () => {},
            type: 'text',
            placeholder: '',
            label: '',
            note: '',
        },
    },
}

// useListenLifecycle('Settings')
</script>

<script lang="ts">
export default {
    name: 'Settings',
}
</script>

<template>
    <div class="settings-base">
        <ElTabs
            :tab-position="globalStore.isDesktop ? 'left' : 'top'"
            style="height: auto"
            class="settings-tabs"
        >
            <template v-for="(tpl, tab) in settingsTemplate" :key="tab">
                <ElTabPane
                    :label="tpl.label || tab"
                    class="col settings-tab-pane"
                    :style="globalStore.isDesktop ? 'padding-left: 2em;' : 'padding-left: 0;'"
                >
                    <template v-for="(optTemplate, optName) in tpl" :key="optName">
                        <div
                            v-if="typeof optTemplate === 'object'"
                            class="settings-tab-pane-line"
                            :class="globalStore.isDesktop ? 'row' : 'col'"
                        >
                            <div class="settings-tab-pane-title row">
                                <div>
                                    {{ optName }}
                                </div>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    stroke="currentColor"
                                    style="width: 1.2em; flex-shrink: 0; margin-left: 0.5em"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                                    />
                                </svg>
                            </div>
                            <ElInput
                                v-if="optTemplate.type === 'text' || optTemplate.type === 'number'"
                                v-model="settings[tab][optName]"
                                :type="optTemplate.type"
                                :placeholder="optTemplate.placeholder || '请输入'"
                                class="settings-tab-pane-input"
                            >
                            </ElInput>
                            <ElSelect
                                v-else-if="optTemplate.type === 'select'"
                                :key="optName"
                                v-model="settings[tab][optName]"
                                class="settings-tab-pane-input"
                                :placeholder="optTemplate.selection[0].label || ''"
                                size="large"
                            >
                                <ElOption
                                    v-for="option in optTemplate.selection"
                                    :label="option.label"
                                    :value="option.value"
                                />
                            </ElSelect>
                        </div>
                    </template>
                </ElTabPane>
            </template>
        </ElTabs>
        <ElButton type="primary" class="settings-save" @click="changeSettings">保存</ElButton>
    </div>
</template>

<style lang="less" scoped>
.settings-base {
    .settings-tabs {
    }
}
.settings-save {
    font-size: 1.2em;
    margin: 1em;
    min-height: 2em;
    width: 6em;
}
.settings-tab-pane {
    text-align: left;
    .settings-tab-pane-line {
        min-height: 2em;
        margin: 0.5em 0;
        // width: 60em;
        max-width: 60em;
        .settings-tab-pane-title {
            min-width: 8em;
            font-size: 1.2em;
            font-weight: 400;
            margin: 0.2em 0;
            flex-shrink: 0;
        }
        .settings-tab-pane-input {
            flex-grow: 1;
            font-size: 1em;
            height: 2.5em;
        }
    }
}
:deep(.el-input-group__append) {
    width: 1em;
    padding: 0 0.5em;
}
</style>
