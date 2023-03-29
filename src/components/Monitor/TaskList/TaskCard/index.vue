<script setup lang="ts">
import type { TaskProgress } from '@v/api'
import type { ComputedRef, Ref } from 'vue'
// import type { TaskProgress } from '@s/modules/scraper'
const props = defineProps<{ task: TaskProgress }>()
const stateColor = computed(() =>
    props.task.state === 'pending'
        ? '--el-color-primary'
        : props.task.state === 'fulfilled'
        ? '--el-color-success'
        : '--el-color-danger',
)
</script>

<script lang="ts">
export default {
    name: 'TaskCard',
}
</script>

<template>
    <div class="taskCard-base col">
        <div class="row taskCard-title taskCard-line">
            <div class="taskCard-taskName van-ellipsis">{{ task.name }}</div>
            <div class="taskCard-state" :style="`color:var(${stateColor})`">
                {{ task.state }}
            </div>
        </div>
        <template v-if="task.state === 'pending'">
            <div v-if="task.stageName || task.stageId" class="taskCard-stage taskCard-line row">
                <div class="taskCard-label">阶段:{{ task.stageId }}</div>
                <div class="taskCard-stageName van-ellipsis">{{ task.stageName }}</div>
            </div>
            <div v-if="task.percentage" class="taskCard-percentage taskCard-line row">
                <div class="taskCard-label">总进度</div>
                <div class="taskCard-progress">
                    <ElProgress :percentage="task.percentage" />
                </div>
            </div>
            <div
                v-if="task.currentName || task.currentId"
                class="taskCard-current taskCard-line row"
            >
                <div class="taskCard-label">当前:{{ task.currentId }}</div>
                <div class="taskCard-currentName van-ellipsis">{{ task.currentName }}</div>
            </div>
            <div v-if="task.stagePercentage" class="taskCard-stagePercentage taskCard-line row">
                <div class="taskCard-label">阶段进度</div>
                <div class="taskCard-progress">
                    <ElProgress :percentage="task.stagePercentage" />
                </div>
            </div>
        </template>
    </div>
</template>

<style lang="less" scoped>
.taskCard-base {
    border: 1px solid var(--el-border-color);
    padding: 0.5em;
    margin: 0.5em 0;
    .taskCard-line {
        height: 1.5em;
        margin: 0.5em 0;
        flex-wrap: nowrap;
    }
    .taskCard-label {
        margin-right: 0.5em;
    }
    .taskCard-title,
    .taskCard-percentage,
    .taskCard-stage,
    .taskCard-stagePercentage,
    .taskCard-current {
        justify-content: space-between;
        align-items: center;
    }
    .taskCard-progress,
    .taskCard-stageId,
    .taskCard-currentId {
        flex-grow: 1;
    }
    .taskCard-stageName,
    .taskCard-currentName {
        flex-grow: 1;
        text-align: right;
    }
    .taskCard-taskName,
    .taskCard-stageName,
    .taskCard-currentName {
        max-width: 80%;
    }
}
</style>
